// Online/multiplayer layer for Mundum.
//
// Degrades gracefully: if Supabase credentials are missing/placeholder or the
// network fails, isOnline() stays false and every method is a safe no-op so the
// single-player game keeps running. This module never throws at import time.
//
// Realtime budget is tiny on the free tier, so player position goes over
// ephemeral Realtime broadcast (throttled), never a DB write per frame. Only the
// durable character save and the atomic trade commit touch the database.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_KEY } from './config.js';

const CHANNEL = 'world';
const STATE_HZ = 8; // max position broadcasts per second
const STATE_MIN_INTERVAL = 1000 / STATE_HZ;

// Treat empty / example placeholder credentials as "no backend configured".
function credsLookReal(url, key) {
  if (!url || !key) return false;
  if (url.includes('YOUR-PROJECT') || url.includes('your-project')) return false;
  if (key.includes('xxx') || key === 'sb_publishable_xxx') return false;
  return /^https?:\/\//.test(url);
}

export class Net {
  constructor() {
    this.client = null;
    this.channel = null;
    this.user = null;
    this.profile = null;
    this._online = false;

    // peerId -> last known state, used to de-dupe / for late join queries
    this.peers = new Map();

    // callbacks
    this._cb = {
      peerUpdate: null,
      peerJoin: null,
      peerLeave: null,
      chat: null,
      tradeRequest: null,
      tradeUpdate: null,
      // Game Master broadcasts (received by every connected player).
      gmAnnounce: null,  // a banner message shown to everyone
      gmSummon: null,    // teleport me to a world position
      gmKick: null,      // I have been banned: leave the world
      disconnect: null,  // the realtime channel dropped after connecting
      houseSync: null,   // a player published their house state (colours/items)
      houseInside: null, // a player entered/left their own house
    };

    // outgoing position throttle
    this._lastSentAt = 0;
    this._lastSent = null;
  }

  // lifecycle

  // Authenticate anonymously, upsert the character row, join the 'world' channel.
  // Returns { online }. Any failure leaves the game in offline single-player mode.
  async connect(profile) {
    this.profile = profile;
    if (!credsLookReal(SUPABASE_URL, SUPABASE_KEY)) return { online: false };

    try {
      this.client = createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: { persistSession: true, autoRefreshToken: true },
        realtime: { params: { eventsPerSecond: STATE_HZ + 4 } },
      });

      // Reuse an existing anon session if one is cached, else sign in anonymously.
      let { data: sess } = await this.client.auth.getSession();
      if (!sess || !sess.session) {
        const { data, error } = await this.client.auth.signInAnonymously();
        if (error) throw error;
        sess = data;
      }
      this.user = sess.session ? sess.session.user : sess.user;
      if (!this.user) throw new Error('no anon user');

      // Presence/identity for other players travels over the realtime channel
      // (track + broadcast), NOT a DB row. We must NOT upsert into the account
      // `characters` table from this ANONYMOUS session — that wrote a bogus row
      // keyed by the anon id (and on the multi-character schema it fails the
      // user_id NOT NULL constraint, disabling online entirely). Persistence of
      // gold/exp/items is handled exclusively by the account system (auth.js).
      await this._joinChannel();

      this._online = true;
      return { online: true };
    } catch (err) {
      console.warn('[net] online disabled:', err && err.message ? err.message : err);
      await this._teardown();
      this._online = false;
      return { online: false };
    }
  }

  isOnline() {
    return this._online;
  }

  async disconnect() {
    await this._teardown();
    this._online = false;
  }

  async _teardown() {
    try {
      if (this.channel) await this.client.removeChannel(this.channel);
    } catch (_) { /* ignore */ }
    this.channel = null;
    this.peers.clear();
  }

  // Write the minimal character row so the player's name shows up for others.
  async _joinChannel() {
    const id = this.user.id;
    this.channel = this.client.channel(CHANNEL, {
      config: { broadcast: { self: false }, presence: { key: id } },
    });

    this.channel
      .on('broadcast', { event: 'state' }, ({ payload }) => this._onState(payload))
      .on('broadcast', { event: 'chat' }, ({ payload }) => this._onChat(payload))
      .on('broadcast', { event: 'trade_req' }, ({ payload }) => this._onTradeReq(payload))
      .on('broadcast', { event: 'trade_upd' }, ({ payload }) => this._onTradeUpd(payload))
      .on('broadcast', { event: 'gm_announce' }, ({ payload }) => this._onGmAnnounce(payload))
      .on('broadcast', { event: 'gm_summon' }, ({ payload }) => this._onGmSummon(payload))
      .on('broadcast', { event: 'gm_kick' }, ({ payload }) => this._onGmKick(payload))
      .on('broadcast', { event: 'house_sync' }, ({ payload }) => this._onHouseSync(payload))
      .on('broadcast', { event: 'house_inside' }, ({ payload }) => this._onHouseInside(payload))
      .on('broadcast', { event: 'house_visit' }, ({ payload }) => { if (this._cb.houseVisit) this._cb.houseVisit(payload); })
      .on('broadcast', { event: 'status' }, ({ payload }) => { if (this._cb.status) this._cb.status(payload); })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        if (key === id) return;
        const meta = (newPresences && newPresences[0]) || {};
        if (this._cb.peerJoin) this._cb.peerJoin(key, meta);
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        if (key === id) return;
        this.peers.delete(key);
        if (this._cb.peerLeave) this._cb.peerLeave(key);
      });

    await new Promise((resolve, reject) => {
      // The status callback fires repeatedly over the channel's lifetime (a later
      // CHANNEL_ERROR on a network blip, a re-SUBSCRIBED after auto-rejoin...).
      // Latch it so the connect promise settles exactly once — otherwise a second
      // settle after we've already resolved becomes an unhandled rejection.
      let settled = false;
      const timer = setTimeout(() => { if (!settled) { settled = true; reject(new Error('channel timeout')); } }, 10000);
      this.channel.subscribe((status) => {
        // A channel error / timeout / close matters for the WHOLE lifetime, not
        // just the connect handshake: if it arrives after we're subscribed, the
        // socket is dead, so flip _online off (and notify) — otherwise the game
        // keeps thinking it's connected while messages silently drop.
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          if (settled) {
            if (this._online) { this._online = false; if (this._cb.disconnect) this._cb.disconnect(status); }
            return;
          }
          settled = true;
          clearTimeout(timer);
          reject(new Error('channel ' + status));
          return;
        }
        if (settled) return;
        if (status === 'SUBSCRIBED') {
          settled = true;
          clearTimeout(timer);
          this.channel.track({
            id,
            name: (this.profile && this.profile.name) || 'Adventurer',
            level: (this.profile && this.profile.level) || 1,
          }).then(resolve, resolve);
        }
      });
    });
  }

  // inbound dispatch

  _onState(payload) {
    if (!payload || !payload.id || payload.id === this.user.id) return;
    this.peers.set(payload.id, payload);
    if (this._cb.peerUpdate) this._cb.peerUpdate(payload.id, payload);
  }

  _onChat(payload) {
    if (!payload || payload.from === this.user.id) return;
    if (this._cb.chat) this._cb.chat(payload);
  }

  _onTradeReq(payload) {
    if (!payload || payload.to !== this.user.id) return;
    if (this._cb.tradeRequest) this._cb.tradeRequest(payload.from, payload);
  }

  _onTradeUpd(payload) {
    if (!payload || payload.to !== this.user.id) return;
    if (this._cb.tradeUpdate) this._cb.tradeUpdate(payload.from, payload);
  }

  // Game Master broadcasts. announce reaches everyone; summon/kick may target a
  // single id or all players when `to` is '*'.
  _onGmAnnounce(payload) {
    if (!payload) return;
    if (this._cb.gmAnnounce) this._cb.gmAnnounce(payload);
  }

  _onGmSummon(payload) {
    if (!payload) return;
    if (payload.to !== '*' && payload.to !== this.user.id) return;
    if (this._cb.gmSummon) this._cb.gmSummon(payload);
  }

  _onGmKick(payload) {
    if (!payload || payload.to !== this.user.id) return;
    if (this._cb.gmKick) this._cb.gmKick(payload);
  }

  // House broadcasts. house_sync carries a player's public house snapshot so
  // others can render a visit; house_inside flags when an owner is home. Houses
  // are display-only now — selling moved to the city free market.
  _onHouseSync(payload) {
    if (!payload || payload.from === this.user.id) return;
    if (this._cb.houseSync) this._cb.houseSync(payload.from, payload);
  }
  _onHouseInside(payload) {
    if (!payload || payload.from === this.user.id) return;
    if (this._cb.houseInside) this._cb.houseInside(payload.from, payload);
  }

  // The local player's own auth id (used to map peers / identify self). Null
  // while offline.
  userId() {
    return this.user ? this.user.id : null;
  }

  // presence / position

  // Throttled to STATE_HZ. Skips sending while idle (same pose as last frame).
  sendState(state) {
    if (!this._online || !this.channel) return;
    const now = Date.now();
    if (now - this._lastSentAt < STATE_MIN_INTERVAL) return;

    if (this._lastSent && this._isSamePose(this._lastSent, state)) return;
    this._lastSentAt = now;
    this._lastSent = { x: state.x, y: state.y, z: state.z, yaw: state.yaw };

    const payload = { id: this.user.id, ...state };
    this.channel.send({ type: 'broadcast', event: 'state', payload });
  }

  _isSamePose(a, b) {
    return (
      Math.abs(a.x - b.x) < 0.02 &&
      Math.abs(a.y - b.y) < 0.02 &&
      Math.abs(a.z - b.z) < 0.02 &&
      Math.abs(a.yaw - b.yaw) < 0.03
    );
  }

  onPeerUpdate(cb) { this._cb.peerUpdate = cb; }
  onPeerJoin(cb) { this._cb.peerJoin = cb; }
  onPeerLeave(cb) { this._cb.peerLeave = cb; }
  onDisconnect(cb) { this._cb.disconnect = cb; }

  // chat

  sendChat(text) {
    const clean = String(text || '').slice(0, 200).trim();
    if (!clean) return;
    const payload = {
      from: this.user ? this.user.id : 'local',
      name: (this.profile && this.profile.name) || 'Adventurer',
      text: clean,
    };
    // Broadcast to others when online (self-broadcast is off in the channel
    // config), then ALWAYS echo locally here — online or offline — so the caller
    // must NOT echo again (that was the double-message bug).
    if (this._online && this.channel) {
      this.channel.send({ type: 'broadcast', event: 'chat', payload });
    }
    if (this._cb.chat) this._cb.chat(payload);
  }

  onChat(cb) { this._cb.chat = cb; }

  // Game Master actions (only ever called from GM Maple's client).

  // Broadcast a banner message to everyone connected (and echo locally).
  gmAnnounce(text) {
    if (!this._online || !this.channel) return;
    const clean = String(text || '').slice(0, 200).trim();
    if (!clean) return;
    const payload = { from: this.user.id, name: (this.profile && this.profile.name) || 'GM', text: clean };
    this.channel.send({ type: 'broadcast', event: 'gm_announce', payload });
    if (this._cb.gmAnnounce) this._cb.gmAnnounce(payload); // echo to the GM too
  }

  // Ask one player (or all, when targetId === '*') to teleport to (x, z).
  gmSummon(targetId, x, z) {
    if (!this._online || !this.channel) return;
    this.channel.send({
      type: 'broadcast', event: 'gm_summon',
      payload: { to: targetId, x, z, name: (this.profile && this.profile.name) || 'GM' },
    });
  }

  // Persistently ban a player and tell their client to leave. Writes the ban row
  // (read back by everyone on connect) then broadcasts the kick.
  async gmBan(targetId, name, reason) {
    if (!this._online || !this.channel) return false;
    const { error } = await this.client.from('bans').upsert({
      id: targetId,
      name: name || null,
      reason: reason || null,
      banned_by: (this.profile && this.profile.name) || 'GM',
    });
    if (error) { console.warn('[net] gmBan:', error.message); return false; }
    this.channel.send({ type: 'broadcast', event: 'gm_kick', payload: { to: targetId } });
    return true;
  }

  // Lift a ban (delete the row). Used by the GM's unban action.
  async gmUnban(targetId) {
    if (!this._online) return false;
    const { error } = await this.client.from('bans').delete().eq('id', targetId);
    if (error) { console.warn('[net] gmUnban:', error.message); return false; }
    return true;
  }

  // Is `id` on the ban list? Checked on connect so a banned player is bounced.
  async isBanned(id) {
    if (!this._online) return false;
    const { data, error } = await this.client.from('bans').select('id').eq('id', id).maybeSingle();
    if (error) { console.warn('[net] isBanned:', error.message); return false; }
    return !!data;
  }

  onGmAnnounce(cb) { this._cb.gmAnnounce = cb; }
  onGmSummon(cb) { this._cb.gmSummon = cb; }
  onGmKick(cb) { this._cb.gmKick = cb; }

  // friends

  async addFriend(name) {
    if (!this._online) return false;
    const friend = String(name || '').slice(0, 24).trim();
    if (!friend) return false;
    const { error } = await this.client
      .from('friends')
      .upsert({ user_id: this.user.id, friend_name: friend }, { onConflict: 'user_id,friend_name' });
    if (error) { console.warn('[net] addFriend:', error.message); return false; }
    return true;
  }

  // Returns [{ name, online }]. Online flag is best-effort from current presence.
  async listFriends() {
    if (!this._online) return [];
    const { data, error } = await this.client
      .from('friends')
      .select('friend_name')
      .eq('user_id', this.user.id);
    if (error) { console.warn('[net] listFriends:', error.message); return []; }

    const onlineNames = this._presentNames();
    return (data || []).map((r) => ({
      name: r.friend_name,
      online: onlineNames.has(r.friend_name),
    }));
  }

  _presentNames() {
    const names = new Set();
    if (!this.channel) return names;
    const state = this.channel.presenceState();
    for (const key of Object.keys(state)) {
      const metas = state[key];
      if (metas && metas[0] && metas[0].name) names.add(metas[0].name);
    }
    return names;
  }

  // houses
  //
  // A player's house (colours, light, the items on display and the ban list) is
  // broadcast so others can walk to the door and visit the real room. Houses are
  // display-only — selling moved to the city free market (see auth.js market_*
  // methods). All ephemeral over Realtime — durable persistence is the owner's
  // own account save.

  // Publish my house's public state to everyone (call on edit / item changes).
  houseSync(state) {
    if (!this._online || !this.channel) return;
    const last = this._lastHouseSync;
    // Keep the latest snapshot so a late-joining peer can be answered on join.
    this._lastHouseSync = state;
    this.channel.send({ type: 'broadcast', event: 'house_sync', payload: { from: this.user.id, ...state } });
    void last;
  }

  // Flag that I just entered / left my own house (so visitors know it's occupied).
  houseInside(lotId, inside) {
    if (!this._online || !this.channel) return;
    this.channel.send({ type: 'broadcast', event: 'house_inside', payload: { from: this.user.id, lotId, inside: !!inside } });
  }

  // Tell the OWNER of `ownerId`'s house that I just visited it, so they can show
  // "X visited your house" when they next wake/log in. Carries my name + a stamp.
  houseVisit(ownerId, lotId, visitorName, at) {
    if (!this._online || !this.channel || !ownerId) return;
    this.channel.send({ type: 'broadcast', event: 'house_visit',
      payload: { from: this.user.id, ownerId, lotId, visitorName, at } });
  }

  // Broadcast a coarse status (e.g. {sleeping:true}) so peers can render it.
  setStatus(status) {
    if (!this._online || !this.channel) return;
    this.channel.send({ type: 'broadcast', event: 'status', payload: { from: this.user.id, status } });
  }

  // My own user id (or null offline) — used to filter house-visit broadcasts.
  userId() { return this.user ? this.user.id : null; }

  onHouseSync(cb) { this._cb.houseSync = cb; }
  onHouseInside(cb) { this._cb.houseInside = cb; }
  onHouseVisit(cb) { this._cb.houseVisit = cb; }

  // trade
  //
  // Negotiation (who offers what) is ephemeral over broadcast between the two
  // players. The FINAL commit is the only authoritative step and goes through the
  // execute_trade RPC, a SECURITY DEFINER Postgres function that re-validates
  // ownership and swaps items in a single locked transaction. The client never
  // edits item rows directly.

  requestTrade(peerId) {
    if (!this._online || !this.channel) return;
    this.channel.send({
      type: 'broadcast',
      event: 'trade_req',
      payload: {
        from: this.user.id,
        to: peerId,
        name: (this.profile && this.profile.name) || 'Adventurer',
      },
    });
  }

  onTradeRequest(cb) { this._cb.tradeRequest = cb; }

  respondTrade(peerId, accept) {
    if (!this._online || !this.channel) return;
    this._sendTradeUpdate(peerId, { kind: 'respond', accept: !!accept });
  }

  // Share the local player's current offer with the partner.
  setTradeOffer(peerId, items) {
    if (!this._online || !this.channel) return;
    this._sendTradeUpdate(peerId, { kind: 'offer', items: items || [] });
  }

  // Both sides call confirmTrade; one side then triggers the atomic RPC.
  // p_give = items this player gives, p_receive = items expected from partner.
  async confirmTrade(peerId, give, receive) {
    if (!this._online || !this.channel) return { ok: false, reason: 'offline' };
    // Signal confirmation to the partner first (so their UI updates).
    this._sendTradeUpdate(peerId, { kind: 'confirm' });

    const { data, error } = await this.client.rpc('execute_trade', {
      p_partner: peerId,
      p_give: give || [],
      p_receive: receive || [],
    });
    if (error) {
      console.warn('[net] execute_trade:', error.message);
      this._sendTradeUpdate(peerId, { kind: 'result', ok: false });
      return { ok: false, reason: error.message };
    }
    this._sendTradeUpdate(peerId, { kind: 'result', ok: true });
    return { ok: true, data };
  }

  onTradeUpdate(cb) { this._cb.tradeUpdate = cb; }

  _sendTradeUpdate(peerId, body) {
    this.channel.send({
      type: 'broadcast',
      event: 'trade_upd',
      payload: { from: this.user.id, to: peerId, ...body },
    });
  }

  // Persistence (gold/exp/items) is owned entirely by the account system in
  // auth.js, keyed by the character row id under the logged-in user. The old
  // net-side saveCharacter/loadCharacter wrote/read the `characters` table from
  // this ANONYMOUS realtime session keyed by the anon id — the wrong row — so
  // they were removed to stop them corrupting real progress.
}

// Factory mirror of the class for callers that prefer it.
export function createNet() {
  return new Net();
}

export default Net;
