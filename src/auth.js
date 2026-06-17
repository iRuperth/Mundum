// Authentication and character-roster layer for Mundum.
//
// Self-contained wrapper around Supabase email/password auth plus the
// multi-character `characters` table (up to 3 per user). It mirrors net.js:
// reads the same credentials from ./config.js, treats placeholder/missing creds
// as "offline" (isAvailable() === false) so the game can fall back to a local
// guest flow, and NEVER throws at import time. Every async method resolves to a
// sensible value rather than rejecting, so callers can stay simple.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_KEY } from './config.js';

const MAX_CHARACTERS = 3;

// Same placeholder detection as net.js: empty or example creds mean "no backend".
function credsLookReal(url, key) {
  if (!url || !key) return false;
  if (url.includes('YOUR-PROJECT') || url.includes('your-project')) return false;
  if (key.includes('xxx') || key === 'sb_publishable_xxx') return false;
  return /^https?:\/\//.test(url);
}

// Shape used to insert/update a character row. Defaults keep the row valid even
// when the caller passes a partial state.
function characterRow(userId, slot, fields) {
  const f = fields || {};
  return {
    user_id: userId,
    slot: clampSlot(slot),
    name: f.name != null ? String(f.name).slice(0, 24) : null,
    sex: f.sex || 'male',
    hair: f.hair || 'short',
    colors: f.colors || {},
    profession: f.profession || null,
    level: f.level != null ? f.level : 1,
    exp: f.exp != null ? f.exp : 0,
    gold: f.gold != null ? f.gold : 0,
    equipment: f.equipment || {},
    backpack: f.backpack || [],
    depot: f.depot || [],
    pos: f.pos || {},
    updated_at: new Date().toISOString(),
  };
}

function clampSlot(slot) {
  const n = Number(slot);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(MAX_CHARACTERS - 1, Math.floor(n)));
}

// Extended appearance (nose/mouth/eyes/brows/ears) is stored inside the colors
// jsonb under `_look` (the table only has sex/hair/colors appearance columns).
// On read, lift those fields to the top level and strip `_look` from colors so
// the rest of the game sees a flat character object.
function unpackLook(row) {
  if (!row || typeof row !== 'object') return row;
  const colors = row.colors && typeof row.colors === 'object' ? { ...row.colors } : {};
  const look = colors._look && typeof colors._look === 'object' ? colors._look : null;
  if (look) {
    for (const k of ['nose', 'mouth', 'eyes', 'brows', 'ears']) {
      if (row[k] == null && look[k] != null) row[k] = look[k];
    }
    delete colors._look;
    row.colors = colors;
  }
  return row;
}

export class Auth {
  constructor() {
    this.client = null;
    this._available = credsLookReal(SUPABASE_URL, SUPABASE_KEY);

    if (this._available) {
      try {
        this.client = createClient(SUPABASE_URL, SUPABASE_KEY, {
          auth: { persistSession: true, autoRefreshToken: true },
        });
      } catch (err) {
        // If client creation fails for any reason, degrade to offline.
        console.warn('[auth] disabled:', err && err.message ? err.message : err);
        this.client = null;
        this._available = false;
      }
    }
  }

  // True only when real Supabase credentials are configured.
  isAvailable() {
    return this._available && !!this.client;
  }

  // account

  // Create an account. Email confirmation is disabled server-side, so a session
  // is usually established immediately. Returns { ok, error?, user? }.
  async signUp(email, password) {
    if (!this.isAvailable()) return { ok: false, error: 'offline' };
    try {
      const { data, error } = await this.client.auth.signUp({ email, password });
      if (error) return { ok: false, error: error.message };
      return { ok: true, user: data.user || null };
    } catch (err) {
      return { ok: false, error: errMsg(err) };
    }
  }

  // Sign in with an existing account. Returns { ok, error?, user? }.
  async signIn(email, password) {
    if (!this.isAvailable()) return { ok: false, error: 'offline' };
    try {
      const { data, error } = await this.client.auth.signInWithPassword({ email, password });
      if (error) return { ok: false, error: error.message };
      return { ok: true, user: data.user || null };
    } catch (err) {
      return { ok: false, error: errMsg(err) };
    }
  }

  async signOut() {
    if (!this.isAvailable()) return { ok: true };
    try {
      const { error } = await this.client.auth.signOut();
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    } catch (err) {
      return { ok: false, error: errMsg(err) };
    }
  }

  // Returns the current user object or null (from the cached session).
  async currentUser() {
    if (!this.isAvailable()) return null;
    try {
      const { data, error } = await this.client.auth.getSession();
      if (error) return null;
      const session = data && data.session;
      return session ? session.user : null;
    } catch (_) {
      return null;
    }
  }

  // Subscribe to auth state changes. cb receives (event, session). Returns an
  // unsubscribe function (a no-op when offline).
  onAuthChange(cb) {
    if (!this.isAvailable() || typeof cb !== 'function') return () => {};
    try {
      const { data } = this.client.auth.onAuthStateChange((event, session) => cb(event, session));
      return () => {
        try { data.subscription.unsubscribe(); } catch (_) { /* ignore */ }
      };
    } catch (_) {
      return () => {};
    }
  }

  // characters

  // Up to MAX_CHARACTERS rows for the current user, ordered by slot.
  async listCharacters() {
    if (!this.isAvailable()) return [];
    try {
      const user = await this.currentUser();
      if (!user) return [];
      const { data, error } = await this.client
        .from('characters')
        .select('*')
        .eq('user_id', user.id)
        .order('slot', { ascending: true })
        .limit(MAX_CHARACTERS);
      if (error) { console.warn("[auth] listCharacters:", error.message); return []; }
      return (data || []).map(unpackLook);
    } catch (err) {
      console.warn('[auth] listCharacters:', errMsg(err));
      return [];
    }
  }

  // Whether a character name is free (case-insensitive). Returns true when the
  // backend is offline so the UI doesn't block; the DB unique index is the real
  // guard at insert time.
  async nameAvailable(name) {
    if (!this.isAvailable() || !name) return true;
    try {
      const { data, error } = await this.client
        .from('characters')
        .select('id')
        .ilike('name', name.trim())
        .limit(1);
      if (error) { console.warn('[auth] nameAvailable:', error.message); return true; }
      return !(data && data.length);
    } catch (err) {
      console.warn('[auth] nameAvailable:', errMsg(err));
      return true;
    }
  }

  // Insert a new character for the current user. Enforces the 3-character cap
  // client-side (the DB also has a unique(user_id, slot) guard) and rejects a
  // name already taken by anyone (DB unique index on lower(name)).
  // Returns { ok, error?, character? }.
  async createCharacter(fields) {
    if (!this.isAvailable()) return { ok: false, error: 'offline' };
    try {
      const user = await this.currentUser();
      if (!user) return { ok: false, error: 'not signed in' };

      const existing = await this.listCharacters();
      if (existing.length >= MAX_CHARACTERS) {
        return { ok: false, error: 'character limit reached' };
      }

      const f = fields || {};
      if (!(await this.nameAvailable(f.name))) {
        return { ok: false, error: 'name taken' };
      }

      const slot = f.slot != null ? clampSlot(f.slot) : firstFreeSlot(existing);
      if (slot == null) return { ok: false, error: 'no free slot' };

      // Insert, dropping any optional column the DB doesn't have (same resilience
      // as saveCharacter) so a schema lagging behind the code can't block account
      // creation outright.
      let attempt = characterRow(user.id, slot, f);
      for (let i = 0; i < 8; i++) {
        const { data, error } = await this.client
          .from('characters')
          .insert(attempt)
          .select()
          .single();
        if (!error) return { ok: true, character: unpackLook(data) };
        const missing = columnNotFound(error);
        if (missing && missing in attempt) { delete attempt[missing]; continue; }
        // A unique-violation on the name index means someone took it concurrently.
        const taken = /duplicate key|unique/i.test(error.message || '');
        return { ok: false, error: taken ? 'name taken' : error.message };
      }
      return { ok: false, error: 'too many missing columns' };
    } catch (err) {
      return { ok: false, error: errMsg(err) };
    }
  }

  // Delete one of the current user's characters by id. Returns { ok, error? }.
  async deleteCharacter(id) {
    if (!this.isAvailable()) return { ok: false, error: 'offline' };
    if (!id) return { ok: false, error: 'missing id' };
    try {
      const user = await this.currentUser();
      if (!user) return { ok: false, error: 'not signed in' };
      const { error } = await this.client
        .from('characters')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    } catch (err) {
      return { ok: false, error: errMsg(err) };
    }
  }

  // Load a single character row by id, or null.
  async loadCharacter(id) {
    if (!this.isAvailable() || !id) return null;
    try {
      const { data, error } = await this.client
        .from('characters')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) { console.warn('[auth] loadCharacter:', error.message); return null; }
      return data ? unpackLook(data) : null;
    } catch (err) {
      console.warn('[auth] loadCharacter:', errMsg(err));
      return null;
    }
  }

  // Persist mutable character state by id. Only known columns are written; the
  // row's identity (id, user_id, slot) is never changed here. Returns { ok }.
  async saveCharacter(id, state) {
    if (!this.isAvailable()) return { ok: false, error: 'offline' };
    if (!id) return { ok: false, error: 'missing id' };
    try {
      const user = await this.currentUser();
      if (!user) return { ok: false, error: 'not signed in' };

      const s = state || {};
      const row = { updated_at: new Date().toISOString() };
      if (s.name != null) row.name = String(s.name).slice(0, 24);
      if (s.sex != null) row.sex = s.sex;
      if (s.hair != null) row.hair = s.hair;
      if (s.colors != null) row.colors = s.colors;
      if (s.profession != null) row.profession = s.profession;
      if (s.level != null) row.level = s.level;
      if (s.exp != null) row.exp = s.exp;
      if (s.gold != null) row.gold = s.gold;
      if (s.equipment != null) row.equipment = s.equipment;
      if (s.backpack != null) row.backpack = s.backpack;
      if (s.depot != null) row.depot = s.depot;
      // Character progression: use-skill levels/tries, spent skill points and
      // skill-tree levels all live in `stats`. Without this the skill bars and
      // spent points reset on reload.
      if (s.stats != null) row.stats = s.stats;
      if (s.quests != null) row.quests = s.quests;
      if (s.friends != null) row.friends = s.friends;
      // Owned/active mounts. Like `friends`, this is an OPTIONAL column (schema_v4);
      // if the DB lacks it the resilient retry below strips it and the rest still
      // saves. Local storage keeps it regardless. See supabase/ADD_mounts_column.sql.
      if (s.mounts != null) row.mounts = s.mounts;
      if (s.pos != null) row.pos = s.pos;
      else if (s.x != null) row.pos = { x: s.x, y: s.y, z: s.z };

      // Resilient write: if the project's DB is missing an OPTIONAL column (e.g.
      // `friends`, added by schema_v3), PostgREST rejects the WHOLE update with
      // PGRST204 ("Could not find the 'X' column"). That silently dropped every
      // cloud save — gold/exp/items never persisted across sessions. So when a
      // column-not-found error names a column, strip it and retry, instead of
      // losing the entire save over one missing column.
      let attempt = { ...row };
      for (let i = 0; i < 8; i++) {
        const { error } = await this.client
          .from('characters')
          .update(attempt)
          .eq('id', id)
          .eq('user_id', user.id);
        if (!error) return { ok: true };
        const missing = columnNotFound(error);
        if (missing && missing in attempt) { delete attempt[missing]; continue; }
        return { ok: false, error: error.message };
      }
      return { ok: false, error: 'too many missing columns' };
    } catch (err) {
      return { ok: false, error: errMsg(err) };
    }
  }
}

// If a Supabase/PostgREST error means "this column doesn't exist", return the
// column name so the caller can drop it and retry. Matches both the schema-cache
// message ("Could not find the 'friends' column of 'characters'") and the raw
// Postgres 42703 ("column characters.friends does not exist").
function columnNotFound(error) {
  if (!error) return null;
  const code = error.code || '';
  const msg = error.message || '';
  if (code !== 'PGRST204' && code !== '42703' && !/find the '.*' column|column .* does not exist/i.test(msg)) return null;
  let m = msg.match(/find the '([^']+)' column/i);
  if (!m) m = msg.match(/column (?:[\w.]*\.)?["']?([a-z_][a-z0-9_]*)["']?\s+does not exist/i);
  return m ? m[1] : null;
}

// Lowest slot index in 0..MAX-1 not yet taken, or null when full.
function firstFreeSlot(existing) {
  const used = new Set((existing || []).map((c) => c.slot));
  for (let i = 0; i < MAX_CHARACTERS; i++) {
    if (!used.has(i)) return i;
  }
  return null;
}

function errMsg(err) {
  return err && err.message ? err.message : String(err);
}

// Factory mirror for callers that prefer it.
export function createAuth() {
  return new Auth();
}

export default Auth;
