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
const SAVE_DEBOUNCE = 4000; // ms between cloud saves

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
    };

    // outgoing position throttle
    this._lastSentAt = 0;
    this._lastSent = null;

    // debounced cloud save
    this._saveTimer = null;
    this._pendingSave = null;
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

      await this._upsertCharacter(profile);
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
    this._flushSave();
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
  async _upsertCharacter(profile) {
    const row = {
      id: this.user.id,
      name: (profile.name || 'Adventurer').slice(0, 24),
      sex: profile.sex || 'male',
      hair: profile.hair || 'short',
      colors: profile.colors || {},
      level: profile.level || 1,
      updated_at: new Date().toISOString(),
    };
    const { error } = await this.client.from('characters').upsert(row);
    if (error) throw error;
  }

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
      const timer = setTimeout(() => reject(new Error('channel timeout')), 10000);
      this.channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          clearTimeout(timer);
          this.channel.track({
            id,
            name: (this.profile && this.profile.name) || 'Adventurer',
            level: (this.profile && this.profile.level) || 1,
          }).then(resolve, resolve);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          clearTimeout(timer);
          reject(new Error('channel ' + status));
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

  // chat

  sendChat(text) {
    if (!this._online || !this.channel) return;
    const clean = String(text || '').slice(0, 200).trim();
    if (!clean) return;
    const payload = {
      from: this.user.id,
      name: (this.profile && this.profile.name) || 'Adventurer',
      text: clean,
    };
    this.channel.send({ type: 'broadcast', event: 'chat', payload });
    // Echo locally since broadcast self is off.
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

  // cloud save

  // Debounced durable write of the full character row.
  saveCharacter(state) {
    if (!this._online) return;
    this._pendingSave = state;
    if (this._saveTimer) return;
    this._saveTimer = setTimeout(() => {
      this._saveTimer = null;
      this._flushSave();
    }, SAVE_DEBOUNCE);
  }

  async _flushSave() {
    if (this._saveTimer) { clearTimeout(this._saveTimer); this._saveTimer = null; }
    const state = this._pendingSave;
    this._pendingSave = null;
    if (!this._online || !state) return;

    const row = {
      id: this.user.id,
      level: state.level,
      exp: state.exp,
      gold: state.gold,
      equipment: state.equipment || {},
      backpack: state.backpack || [],
      depot: state.depot || [],
      pos: state.pos || (state.x != null ? { x: state.x, y: state.y, z: state.z } : {}),
      updated_at: new Date().toISOString(),
    };
    if (state.name != null) row.name = String(state.name).slice(0, 24);
    if (state.colors != null) row.colors = state.colors;

    const { error } = await this.client.from('characters').update(row).eq('id', this.user.id);
    if (error) console.warn('[net] saveCharacter:', error.message);
  }

  async loadCharacter() {
    if (!this._online) return null;
    const { data, error } = await this.client
      .from('characters')
      .select('*')
      .eq('id', this.user.id)
      .maybeSingle();
    if (error) { console.warn('[net] loadCharacter:', error.message); return null; }
    return data || null;
  }
}

// Factory mirror of the class for callers that prefer it.
export function createNet() {
  return new Net();
}

export default Net;
