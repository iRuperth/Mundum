// Auth + character roster UI for Mundum.
//
// Owns a single full-screen overlay (id 'auth-root') hosting three screens:
//   login -> character select -> character create.
// It collects credentials and a character choice, then hands the chosen
// character to opts.onPlay(character). It never starts the 3D world itself.
//
// Dependency-light: only Auth, the profession data and i18n. Visible strings go
// through tt(): t() when the key exists in i18n.js, otherwise a local fallback
// table so the screens work before the keys are merged into i18n.js.

import { getLang, setLang, t } from './i18n.js';
import { PROFESSIONS } from './data/professions.js';

const MAX_CHARACTERS = 3;

// Color palettes mirror the in-game creation screen (main.js).
const COLOR_PARTS = [
  { key: 'shirt', colors: ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6', '#e67e22', '#1abc9c', '#ecf0f1', '#34495e', '#ff6fa5'] },
  { key: 'pants', colors: ['#34495e', '#2c3e50', '#5d4037', '#1565c0', '#2e7d32', '#616161', '#8e24aa', '#bf360c'] },
  { key: 'skin', colors: ['#ffdbac', '#f2c79b', '#e0ac7e', '#c68a5a', '#9c6b43', '#7a4f2e'] },
  { key: 'hair', colors: ['#1a1a1a', '#2c1b10', '#4a2f1b', '#7a4a21', '#b3823e', '#e8c04a', '#d9b380', '#992222', '#555555', '#ff7043'] },
];

const DEFAULT_COLORS = { skin: '#f2c79b', shirt: '#3498db', pants: '#34495e', hair: '#4a2f1b' };

// Choice sets that drive the segmented pickers on the create screen.
const SEX_OPTS = [
  { id: 'male', key: 'male' },
  { id: 'female', key: 'female' },
];
const HAIR_OPTS = [
  { id: 'short', key: 'hairShort' },
  { id: 'long', key: 'hairLong' },
  { id: 'spiky', key: 'hairSpiky' },
  { id: 'bald', key: 'hairBald' },
];
const NOSE_OPTS = [
  { id: 'small', key: 'noseSmall' },
  { id: 'round', key: 'noseRound' },
  { id: 'pointy', key: 'nosePointy' },
];
const MOUTH_OPTS = [
  { id: 'smile', key: 'mouthSmile' },
  { id: 'neutral', key: 'mouthNeutral' },
  { id: 'open', key: 'mouthOpen' },
];

// Local fallback strings for keys not yet in i18n.js. tt() prefers t().
const FALLBACK = {
  es: {
    signIn: 'Entrar',
    register: 'Registrarse',
    username: 'Usuario',
    email: 'Correo',
    password: 'Contraseña',
    confirmPassword: 'Repite la contraseña',
    playOffline: 'Jugar sin conexión',
    chooseProfession: 'Elige profesión',
    createCharacter: 'Crear personaje',
    selectCharacter: 'Elige tu personaje',
    deleteCharacter: 'Borrar personaje',
    confirmDelete: '¿Borrar este personaje?',
    emptySlot: 'Vacío',
    createSlot: '+ Crear',
    back: 'Volver',
    confirm: 'Confirmar',
    play: 'Jugar',
    logout: 'Salir',
    profession: 'Profesión',
    usernameTooShort: 'El usuario debe tener entre 3 y 16 caracteres',
    invalidEmail: 'Correo no válido',
    passwordTooShort: 'La contraseña debe tener al menos 6 caracteres',
    passwordsDoNotMatch: 'Las contraseñas no coinciden',
    nameRequired: 'Escribe un nombre',
    pickProfession: 'Elige una profesión',
    working: 'Un momento…',
    authFailed: 'No se pudo completar. Inténtalo de nuevo',
    slotFull: 'No hay espacio para más personajes',
    nameTaken: 'Ese nombre ya está en uso, elige otro',
    needAccount: 'Necesitas una cuenta para jugar y guardar tu progreso',
    reconnect: 'Sin conexión con el servidor. Reconéctate para jugar',
  },
  en: {
    signIn: 'Sign in',
    register: 'Register',
    username: 'Username',
    email: 'Email',
    password: 'Password',
    confirmPassword: 'Confirm password',
    playOffline: 'Play offline',
    chooseProfession: 'Choose profession',
    createCharacter: 'Create character',
    selectCharacter: 'Select your character',
    deleteCharacter: 'Delete character',
    confirmDelete: 'Delete this character?',
    emptySlot: 'Empty',
    createSlot: '+ Create',
    back: 'Back',
    confirm: 'Confirm',
    play: 'Play',
    logout: 'Log out',
    profession: 'Profession',
    usernameTooShort: 'Username must be 3 to 16 characters',
    invalidEmail: 'Invalid email',
    passwordTooShort: 'Password must be at least 6 characters',
    passwordsDoNotMatch: 'Passwords do not match',
    nameRequired: 'Enter a name',
    pickProfession: 'Pick a profession',
    working: 'One moment…',
    authFailed: 'Could not complete. Please try again',
    slotFull: 'No room for more characters',
    nameTaken: 'That name is already taken, pick another',
    needAccount: 'You need an account to play and save your progress',
    reconnect: 'No connection to the server. Reconnect to play',
  },
};

// Translate: i18n.js if it knows the key, else the local fallback, else the key.
function tt(key, ...args) {
  const lang = getLang();
  const fb = (FALLBACK[lang] && FALLBACK[lang][key]) || FALLBACK.en[key];
  let s = t(key, ...args);
  // t() returns the key itself when missing; fall back to our table in that case.
  if (s === key && fb != null) {
    s = fb;
    args.forEach((a, i) => { s = s.replace('{' + i + '}', a); });
  }
  return s;
}

// Pick the localized field from a {es,en} object.
function loc(obj) {
  if (!obj) return '';
  const lang = getLang();
  return obj[lang] || obj.es || obj.en || '';
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Small DOM helpers.
function el(tag, opts, children) {
  const node = document.createElement(tag);
  const o = opts || {};
  if (o.class) node.className = o.class;
  if (o.text != null) node.textContent = o.text;
  if (o.html != null) node.innerHTML = o.html;
  if (o.type) node.type = o.type;
  if (o.placeholder != null) node.placeholder = o.placeholder;
  if (o.value != null) node.value = o.value;
  if (o.maxLength != null) node.maxLength = o.maxLength;
  if (o.title != null) node.title = o.title;
  if (o.attrs) for (const k in o.attrs) node.setAttribute(k, o.attrs[k]);
  if (o.on) for (const ev in o.on) node.addEventListener(ev, o.on[ev]);
  if (children) for (const c of children) if (c) node.appendChild(c);
  return node;
}

export class AuthUI {
  constructor(auth, opts) {
    this.auth = auth;
    this.opts = opts || {};
    this.root = null;
    this.busy = false;
    // Username chosen at register time, used as the default character name.
    this.suggestedName = '';
    this._ensureRoot();
  }

  _ensureRoot() {
    let root = document.getElementById('auth-root');
    if (!root) {
      root = document.createElement('div');
      root.id = 'auth-root';
      document.body.appendChild(root);
    }
    root.classList.add('hidden');
    this.root = root;
  }

  // Public API

  async show() {
    this.root.classList.remove('hidden');
    // Jump straight to character select when a session is already active.
    if (this.auth && this.auth.isAvailable()) {
      const user = await this.auth.currentUser();
      if (user) { await this._renderSelect(); return; }
    }
    this._renderLogin();
  }

  hide() {
    this.root.classList.add('hidden');
    this.root.innerHTML = '';
  }

  // Screen: login (sign in / register tabs, or offline play).

  _renderLogin(tab) {
    const offline = !this.auth || !this.auth.isAvailable();
    const card = this._card();

    card.appendChild(el('h1', { text: 'MUNDUM' }));

    if (offline) {
      // An account is required to play, so without a backend we cannot proceed.
      // Show a reconnect notice and a retry button instead of an offline mode.
      card.appendChild(el('p', { class: 'auth-sub', text: tt('reconnect') }));
      card.appendChild(el('button', {
        class: 'auth-primary', text: tt('signIn'),
        on: { click: () => this._renderLogin('signin') },
      }));
      card.appendChild(this._langRow());
      this._mount(card);
      return;
    }

    const active = tab === 'register' ? 'register' : 'signin';
    const tabs = el('div', { class: 'auth-tabs' }, [
      el('button', {
        class: 'auth-tab' + (active === 'signin' ? ' active' : ''), text: tt('signIn'),
        on: { click: () => this._renderLogin('signin') },
      }),
      el('button', {
        class: 'auth-tab' + (active === 'register' ? ' active' : ''), text: tt('register'),
        on: { click: () => this._renderLogin('register') },
      }),
    ]);
    card.appendChild(tabs);

    const err = el('p', { class: 'auth-error' });

    if (active === 'register') {
      const uName = this._input('text', tt('username'), 16);
      const uEmail = this._input('email', tt('email'));
      const uPass = this._input('password', tt('password'));
      const uPass2 = this._input('password', tt('confirmPassword'));
      card.appendChild(this._labeled(tt('username'), uName));
      card.appendChild(this._labeled(tt('email'), uEmail));
      card.appendChild(this._labeled(tt('password'), uPass));
      card.appendChild(this._labeled(tt('confirmPassword'), uPass2));
      card.appendChild(err);
      const submit = el('button', {
        class: 'auth-primary', text: tt('register'),
        on: { click: () => this._doRegister(uName.value, uEmail.value, uPass.value, uPass2.value, err, submit) },
      });
      card.appendChild(submit);
    } else {
      const sEmail = this._input('email', tt('email'));
      const sPass = this._input('password', tt('password'));
      card.appendChild(this._labeled(tt('email'), sEmail));
      card.appendChild(this._labeled(tt('password'), sPass));
      card.appendChild(err);
      const submit = el('button', {
        class: 'auth-primary', text: tt('signIn'),
        on: { click: () => this._doSignIn(sEmail.value, sPass.value, err, submit) },
      });
      card.appendChild(submit);
    }

    card.appendChild(this._langRow(() => this._renderLogin(active)));
    this._mount(card);
  }

  async _doRegister(username, email, password, confirm, err, btn) {
    if (this.busy) return;
    const name = (username || '').trim();
    if (name.length < 3 || name.length > 16) { err.textContent = tt('usernameTooShort'); return; }
    if (!EMAIL_RE.test((email || '').trim())) { err.textContent = tt('invalidEmail'); return; }
    if ((password || '').length < 6) { err.textContent = tt('passwordTooShort'); return; }
    if (password !== confirm) { err.textContent = tt('passwordsDoNotMatch'); return; }

    err.textContent = '';
    this._setBusy(btn, true);
    const res = await this.auth.signUp(email.trim(), password);
    this._setBusy(btn, false);
    if (!res || !res.ok) { err.textContent = this._authError(res); return; }
    this.suggestedName = name;
    await this._renderSelect();
  }

  async _doSignIn(email, password, err, btn) {
    if (this.busy) return;
    if (!EMAIL_RE.test((email || '').trim())) { err.textContent = tt('invalidEmail'); return; }
    if ((password || '').length < 1) { err.textContent = tt('passwordTooShort'); return; }

    err.textContent = '';
    this._setBusy(btn, true);
    const res = await this.auth.signIn(email.trim(), password);
    this._setBusy(btn, false);
    if (!res || !res.ok) { err.textContent = this._authError(res); return; }
    await this._renderSelect();
  }

  // Screen: character select (up to 3 slots).

  async _renderSelect() {
    const card = this._card();
    card.appendChild(el('h1', { text: 'MUNDUM' }));
    card.appendChild(el('p', { class: 'auth-sub', text: tt('selectCharacter') }));

    let characters = [];
    try { characters = await this.auth.listCharacters(); } catch (_) { characters = []; }
    const bySlot = new Map();
    for (const c of characters) bySlot.set(c.slot != null ? c.slot : -1, c);

    const list = el('div', { class: 'auth-slots' });
    for (let slot = 0; slot < MAX_CHARACTERS; slot++) {
      const c = bySlot.get(slot);
      list.appendChild(c ? this._filledSlot(c) : this._emptySlot(slot));
    }
    card.appendChild(list);

    const footer = el('div', { class: 'auth-footer' }, [
      el('button', {
        class: 'auth-ghost', text: tt('logout'),
        on: { click: async () => { try { await this.auth.signOut(); } catch (_) { /* ignore */ } this._renderLogin(); } },
      }),
    ]);
    card.appendChild(footer);
    card.appendChild(this._langRow(() => this._renderSelect()));
    this._mount(card);
  }

  _filledSlot(c) {
    const prof = PROFESSIONS.find((p) => p.id === c.profession);
    const profName = prof ? loc(prof.name) : (c.profession || '');
    const meta = `${profName} · ${tt('level')} ${c.level != null ? c.level : 1}`;
    return el('div', { class: 'auth-slot filled' }, [
      el('div', { class: 'auth-slot-main', on: { click: () => this._play(c) } }, [
        el('div', { class: 'auth-slot-name', text: c.name || '?' }),
        el('div', { class: 'auth-slot-meta', text: meta }),
      ]),
      el('button', {
        class: 'auth-del', text: '🗑', title: tt('deleteCharacter'),
        on: { click: (e) => { e.stopPropagation(); this._deleteCharacter(c); } },
      }),
    ]);
  }

  _emptySlot(slot) {
    return el('div', {
      class: 'auth-slot empty', on: { click: () => this._renderCreate(slot) },
    }, [
      el('div', { class: 'auth-slot-empty-label', text: tt('emptySlot') }),
      el('div', { class: 'auth-slot-create', text: tt('createSlot') }),
    ]);
  }

  async _deleteCharacter(c) {
    if (!window.confirm(tt('confirmDelete'))) return;
    if (this.auth && this.auth.isAvailable() && c.id != null) {
      try { await this.auth.deleteCharacter(c.id); } catch (_) { /* ignore */ }
    }
    await this._renderSelect();
  }

  // Screen: character create (look + profession).

  _renderCreate(slot) {
    const defaults = (typeof this.opts.getProfileDefaults === 'function' && this.opts.getProfileDefaults()) || {};
    const state = {
      slot,
      name: this.suggestedName || defaults.name || '',
      sex: defaults.sex || 'male',
      hair: defaults.hair || 'short',
      nose: defaults.nose || 'small',
      mouth: defaults.mouth || 'smile',
      colors: { ...DEFAULT_COLORS, ...(defaults.colors || {}) },
      profession: defaults.profession || null,
    };

    const card = this._card();
    card.appendChild(el('h1', { text: 'MUNDUM' }));
    card.appendChild(el('p', { class: 'auth-sub', text: tt('createCharacter') }));

    const nameInput = this._input('text', tt('name'), 16);
    nameInput.value = state.name;
    nameInput.addEventListener('input', () => { state.name = nameInput.value; });
    card.appendChild(this._labeled(tt('name'), nameInput));

    card.appendChild(this._seg(SEX_OPTS, state.sex, (id) => { state.sex = id; }));
    card.appendChild(this._seg(HAIR_OPTS, state.hair, (id) => { state.hair = id; }));
    card.appendChild(this._seg(NOSE_OPTS, state.nose, (id) => { state.nose = id; }));
    card.appendChild(this._seg(MOUTH_OPTS, state.mouth, (id) => { state.mouth = id; }));

    for (const part of COLOR_PARTS) {
      card.appendChild(this._swatchRow(part, state.colors[part.key], (color) => { state.colors[part.key] = color; }));
    }

    card.appendChild(el('div', { class: 'auth-section', text: tt('chooseProfession') }));
    const profErr = el('p', { class: 'auth-error' });
    card.appendChild(this._professionPicker(state, () => { profErr.textContent = ''; }));

    const err = el('p', { class: 'auth-error' });
    card.appendChild(err);

    const confirm = el('button', {
      class: 'auth-primary', text: tt('confirm'),
      on: { click: () => this._doCreate(state, err, confirm) },
    });
    card.appendChild(confirm);

    const offline = !this.auth || !this.auth.isAvailable();
    card.appendChild(el('button', {
      class: 'auth-ghost', text: tt('back'),
      on: { click: () => (offline ? this._renderLogin() : this._renderSelect()) },
    }));
    card.appendChild(this._langRow(() => this._renderCreate(slot)));
    this._mount(card);
  }

  _professionPicker(state, onPick) {
    const wrap = el('div', { class: 'auth-profs' });
    const select = (id, node) => {
      state.profession = id;
      wrap.querySelectorAll('.auth-prof').forEach((n) => n.classList.remove('selected'));
      node.classList.add('selected');
      onPick();
    };
    for (const p of PROFESSIONS) {
      const node = el('button', { class: 'auth-prof' + (state.profession === p.id ? ' selected' : '') }, [
        el('span', { class: 'auth-prof-dot', attrs: { style: `background:${profColor(p.color)}` } }),
        el('div', { class: 'auth-prof-text' }, [
          el('div', { class: 'auth-prof-name', text: loc(p.name) }),
          el('div', { class: 'auth-prof-desc', text: loc(p.desc) }),
        ]),
      ]);
      node.addEventListener('click', () => select(p.id, node));
      wrap.appendChild(node);
    }
    return wrap;
  }

  async _doCreate(state, err, btn) {
    if (this.busy) return;
    const name = (state.name || '').trim();
    if (!name) { err.textContent = tt('nameRequired'); return; }
    if (!state.profession) { err.textContent = tt('pickProfession'); return; }
    err.textContent = '';

    const fields = {
      slot: state.slot,
      name,
      sex: state.sex,
      hair: state.hair,
      nose: state.nose,
      mouth: state.mouth,
      colors: state.colors,
      profession: state.profession,
    };

    // Offline / guest: no backend, just build a fresh profile object.
    if (!this.auth || !this.auth.isAvailable()) {
      this._play({ ...fields, level: 1, exp: 0 });
      return;
    }

    this._setBusy(btn, true);
    const res = await this.auth.createCharacter(fields);
    this._setBusy(btn, false);
    if (!res || !res.ok) {
      if (res && res.error === 'character limit reached') err.textContent = tt('slotFull');
      else if (res && res.error === 'name taken') err.textContent = tt('nameTaken');
      else err.textContent = tt('authFailed');
      return;
    }
    this._play(res.character || { ...fields, level: 1, exp: 0 });
  }

  // Hand the chosen character to the host and close the overlay.
  _play(character) {
    if (typeof this.opts.onPlay === 'function') this.opts.onPlay(character);
  }

  // Shared widgets

  _card() {
    return el('div', { class: 'auth-card' });
  }

  _mount(card) {
    this.root.innerHTML = '';
    this.root.appendChild(card);
  }

  _input(type, placeholder, maxLength) {
    return el('input', { type, placeholder, maxLength, attrs: { autocomplete: 'off' } });
  }

  _labeled(label, input) {
    return el('label', { class: 'auth-field' }, [
      el('span', { class: 'auth-field-label', text: label }),
      input,
    ]);
  }

  // Segmented option row; opts are {id,key}, calls onPick(id) on change.
  _seg(opts, selectedId, onPick) {
    const row = el('div', { class: 'auth-seg-row' });
    const seg = el('div', { class: 'auth-seg' });
    for (const o of opts) {
      const b = el('button', {
        class: o.id === selectedId ? 'selected' : '', text: tt(o.key),
      });
      b.addEventListener('click', () => {
        seg.querySelectorAll('button').forEach((n) => n.classList.remove('selected'));
        b.classList.add('selected');
        onPick(o.id);
      });
      seg.appendChild(b);
    }
    row.appendChild(seg);
    return row;
  }

  // One color swatch row for a body part.
  _swatchRow(part, selected, onPick) {
    const row = el('div', { class: 'auth-swatch-row' });
    const swatches = el('div', { class: 'auth-swatches' });
    for (const color of part.colors) {
      const b = el('button', {
        class: 'auth-swatch' + (selected === color ? ' selected' : ''),
        attrs: { style: `background:${color}` },
      });
      b.addEventListener('click', () => {
        swatches.querySelectorAll('.auth-swatch').forEach((n) => n.classList.remove('selected'));
        b.classList.add('selected');
        onPick(color);
      });
      swatches.appendChild(b);
    }
    row.appendChild(swatches);
    return row;
  }

  // Language toggle; re-renders the current screen so labels update.
  _langRow(rerender) {
    const lang = getLang();
    const make = (code) => el('button', {
      class: 'auth-lang' + (lang === code ? ' selected' : ''), text: code.toUpperCase(),
      on: { click: () => { setLang(code); rerender(); } },
    });
    return el('div', { class: 'auth-lang-row' }, [make('es'), make('en')]);
  }

  _setBusy(btn, on) {
    this.busy = on;
    if (!btn) return;
    btn.disabled = on;
    if (on) { btn._label = btn.textContent; btn.textContent = tt('working'); }
    else if (btn._label != null) { btn.textContent = btn._label; }
  }

  _authError(res) {
    return (res && res.error && res.error !== 'offline') ? res.error : tt('authFailed');
  }
}

// Hex profession color (number) -> CSS string.
function profColor(color) {
  if (typeof color === 'number') return '#' + color.toString(16).padStart(6, '0');
  return color || '#888';
}

// Factory mirror for callers that prefer it.
export function createAuthUI(auth, opts) {
  return new AuthUI(auth, opts);
}

export default AuthUI;

/*
INTEGRATION NOTES

(1) CSS to add to style.css (scoped under #auth-root):

#auth-root {
  position: fixed; inset: 0; z-index: 50;
  display: flex; align-items: center; justify-content: center;
  padding: 16px;
  background: radial-gradient(120% 120% at 50% 0%, #16205a 0%, #0b1030 60%, #070a1e 100%);
  overflow-y: auto;
}
#auth-root.hidden { display: none !important; }

#auth-root .auth-card {
  width: min(360px, 94vw);
  max-height: 94vh; overflow-y: auto;
  background: rgba(10, 16, 40, .72);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,.18);
  border-radius: 18px;
  padding: 22px 22px 16px;
  color: #fff;
  box-shadow: 0 12px 40px rgba(0,0,0,.45);
}
#auth-root h1 {
  font-size: 32px; letter-spacing: 6px; font-weight: 900; text-align: center;
  background: linear-gradient(180deg, #fff, #9fd1ff);
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 6px;
}
#auth-root .auth-sub { text-align: center; opacity: .85; margin: 0 0 14px; font-size: 14px; }
#auth-root .auth-section { font-size: 13px; opacity: .9; margin: 14px 0 8px; font-weight: 700; }

#auth-root .auth-tabs { display: flex; gap: 6px; margin-bottom: 14px; }
#auth-root .auth-tab {
  flex: 1; padding: 9px; border-radius: 10px; cursor: pointer; font-size: 14px;
  border: 1px solid rgba(255,255,255,.18); background: rgba(255,255,255,.06); color: #fff;
}
#auth-root .auth-tab.active { background: #2f86c9; border-color: #fff; font-weight: 700; }

#auth-root .auth-field { display: block; font-size: 13px; opacity: .95; margin-bottom: 10px; }
#auth-root .auth-field-label { display: block; margin-bottom: 5px; opacity: .9; }
#auth-root .auth-field input,
#auth-root input[type="text"],
#auth-root input[type="email"],
#auth-root input[type="password"] {
  display: block; width: 100%;
  padding: 9px 12px; border-radius: 10px;
  border: 1px solid rgba(255,255,255,.25);
  background: rgba(255,255,255,.1);
  color: #fff; font-size: 15px; outline: none;
}
#auth-root input:focus { border-color: #7ec9ff; }

#auth-root .auth-primary {
  width: 100%; margin-top: 8px;
  padding: 13px; border: none; border-radius: 12px;
  background: linear-gradient(180deg, #54b04a, #3d8a36);
  color: #fff; font-size: 18px; font-weight: 800; letter-spacing: 1px; cursor: pointer;
}
#auth-root .auth-primary:active { transform: scale(.98); }
#auth-root .auth-primary:disabled { opacity: .6; cursor: default; }

#auth-root .auth-ghost {
  width: 100%; margin-top: 8px;
  padding: 10px; border-radius: 10px; cursor: pointer; font-size: 14px;
  border: 1px solid rgba(255,255,255,.2); background: rgba(255,255,255,.06); color: #fff;
}

#auth-root .auth-error { color: #ff9a8b; font-size: 13px; min-height: 18px; margin: 2px 0 4px; text-align: center; }

#auth-root .auth-footer { margin-top: 6px; }

#auth-root .auth-seg-row { margin-bottom: 10px; }
#auth-root .auth-seg { display: flex; gap: 4px; flex-wrap: wrap; }
#auth-root .auth-seg button {
  flex: 1; min-width: 0; padding: 7px 6px; font-size: 12px;
  border: 1px solid rgba(255,255,255,.22); border-radius: 8px;
  background: rgba(255,255,255,.08); color: #fff; cursor: pointer;
}
#auth-root .auth-seg button.selected { background: #3d8a36; border-color: #7ec9ff; font-weight: 700; }

#auth-root .auth-swatch-row { margin-bottom: 8px; }
#auth-root .auth-swatches { display: flex; flex-wrap: wrap; gap: 6px; }
#auth-root .auth-swatch {
  width: 30px; height: 30px; border-radius: 50%; padding: 0; cursor: pointer;
  border: 2px solid rgba(255,255,255,.25);
  -webkit-tap-highlight-color: transparent;
}
#auth-root .auth-swatch.selected { border-color: #fff; box-shadow: 0 0 0 2px #7ec9ff; }

#auth-root .auth-slots { display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; }
#auth-root .auth-slot {
  display: flex; align-items: center; gap: 8px;
  border: 1px solid rgba(255,255,255,.16); border-radius: 12px;
  background: rgba(255,255,255,.06); padding: 12px 14px; min-height: 58px;
}
#auth-root .auth-slot.empty {
  justify-content: center; flex-direction: column; gap: 2px; cursor: pointer;
  border-style: dashed; opacity: .85;
}
#auth-root .auth-slot.empty:hover { opacity: 1; border-color: #7ec9ff; }
#auth-root .auth-slot-empty-label { font-size: 12px; opacity: .6; }
#auth-root .auth-slot-create { font-size: 15px; font-weight: 700; color: #9fd1ff; }
#auth-root .auth-slot-main { flex: 1; cursor: pointer; }
#auth-root .auth-slot-name { font-size: 16px; font-weight: 800; }
#auth-root .auth-slot-meta { font-size: 12px; opacity: .8; margin-top: 2px; }
#auth-root .auth-del {
  width: 36px; height: 36px; border-radius: 9px; cursor: pointer; font-size: 16px;
  border: 1px solid rgba(255,255,255,.18); background: rgba(60,10,10,.4); color: #fff;
}
#auth-root .auth-del:hover { background: rgba(120,20,20,.6); border-color: #e74c3c; }

#auth-root .auth-profs { display: flex; flex-direction: column; gap: 6px; }
#auth-root .auth-prof {
  display: flex; align-items: flex-start; gap: 10px; text-align: left;
  border: 1px solid rgba(255,255,255,.16); border-radius: 12px;
  background: rgba(255,255,255,.06); padding: 10px 12px; cursor: pointer; color: #fff;
}
#auth-root .auth-prof.selected { border-color: #7ec9ff; box-shadow: 0 0 0 1px #7ec9ff inset; background: rgba(47,134,201,.18); }
#auth-root .auth-prof-dot { flex: 0 0 14px; width: 14px; height: 14px; border-radius: 50%; margin-top: 3px; border: 1px solid rgba(255,255,255,.4); }
#auth-root .auth-prof-name { font-size: 14px; font-weight: 800; }
#auth-root .auth-prof-desc { font-size: 11px; opacity: .8; line-height: 1.35; margin-top: 2px; }

#auth-root .auth-lang-row { display: flex; gap: 6px; justify-content: center; margin-top: 12px; }
#auth-root .auth-lang {
  padding: 4px 14px; border-radius: 8px; cursor: pointer; font-size: 12px;
  border: 1px solid rgba(255,255,255,.2); background: rgba(255,255,255,.08); color: #fff;
}
#auth-root .auth-lang.selected { background: #2f86c9; border-color: #fff; }

@media (max-width: 520px) {
  #auth-root .auth-card { padding: 16px; }
  #auth-root h1 { font-size: 24px; letter-spacing: 4px; }
  #auth-root .auth-swatch { width: 26px; height: 26px; }
  #auth-root .auth-prof-desc { display: none; }
}

(2) HTML line to add to index.html (an empty container; the UI builds itself):

<div id="auth-root" class="hidden"></div>

(3) i18n keys used (add to STRINGS in i18n.js; reused existing: name, male, female,
    hairShort, hairLong, hairSpiky, hairBald, noseSmall, noseRound, nosePointy,
    mouthSmile, mouthNeutral, mouthOpen, play, level, offline).
    NEW keys (fallbacks already defined locally in this file under FALLBACK):
      signIn, register, username, email, password, confirmPassword, playOffline,
      chooseProfession, createCharacter, selectCharacter, deleteCharacter,
      confirmDelete, emptySlot, createSlot, back, confirm, logout, profession,
      usernameTooShort, invalidEmail, passwordTooShort, passwordsDoNotMatch,
      nameRequired, pickProfession, working, authFailed, slotFull
*/
