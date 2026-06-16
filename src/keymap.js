// Rebindable game-action keymap. The movement and action keys (jump, camera,
// torch, mount, map, interact, range) used to be hardcoded KeyboardEvent.codes
// in controls.js. This module turns them into named ACTIONS the player can
// reassign from the keyboard panel, persisted per character.
//
// An action's bound code is a KeyboardEvent.code (e.g. 'KeyW', 'Space'). Each
// action also keeps a fixed FALLBACK code that always works too (e.g. the arrow
// keys for movement), so a player can never strand themselves with no way to
// move even after a weird rebind.
//
// PURE data + a tiny class. No DOM, no Three.js.

// [id, defaultCode, i18nLabelKey, fallbackCode|null]
// Order is the display order in the keyboard panel.
export const KEY_ACTIONS = [
  ['forward',  'KeyW',  'actForward',  'ArrowUp'],
  ['back',     'KeyS',  'actBack',     'ArrowDown'],
  ['left',     'KeyA',  'actLeft',     'ArrowLeft'],
  ['right',    'KeyD',  'actRight',    'ArrowRight'],
  ['jump',     'Space', 'actJump',     null],
  ['camera',   'KeyC',  'actCamera',   null],
  ['torch',    'KeyF',  'actTorch',    null],
  ['mount',    'KeyG',  'actMount',    null],
  ['map',      'KeyM',  'actMap',      null],
  ['interact', 'KeyE',  'actInteract', null],
  ['range',    'KeyR',  'actRange',    null],
];

// A human label for any KeyboardEvent.code, for the panel ("Espacio", "↑", "A").
const CODE_LABEL = {
  Space: 'Espacio', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→',
  Backquote: '`', Minus: '-', Equal: '=', BracketLeft: '[', BracketRight: ']',
  Semicolon: ';', Quote: "'", Comma: ',', Period: '.', Slash: '/', Backslash: '\\',
};
export function codeLabel(code) {
  if (!code) return '—';
  if (CODE_LABEL[code]) return CODE_LABEL[code];
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  return code;
}

export class Keymap {
  constructor() {
    this.codeForAction = new Map();   // actionId -> code
    this.fallback = new Map();        // actionId -> fixed extra code (or absent)
    this.reset();
  }

  // Restore the default binding for every action.
  reset() {
    this.codeForAction.clear();
    this.fallback.clear();
    for (const [id, code, , fb] of KEY_ACTIONS) {
      this.codeForAction.set(id, code);
      if (fb) this.fallback.set(id, fb);
    }
  }

  code(actionId) { return this.codeForAction.get(actionId) || null; }

  // The action a pressed code triggers, or null. Checks the primary binding and
  // the fixed fallback (arrows still move even after rebinding WASD).
  actionForCode(code) {
    for (const [id, c] of this.codeForAction) if (c === code) return id;
    for (const [id, c] of this.fallback) if (c === code) return id;
    return null;
  }

  // True when `code` triggers `actionId` (primary or fallback).
  isAction(actionId, code) {
    return this.codeForAction.get(actionId) === code || this.fallback.get(actionId) === code;
  }

  // Rebind `actionId` to `code`. If another action already used that code, the
  // other action is cleared (one code drives one action), then given the
  // displaced action's... nothing — it simply becomes unbound until reassigned.
  // Returns the code that was displaced (or null).
  rebind(actionId, code) {
    if (!actionId || !code || !this.codeForAction.has(actionId)) return null;
    let displaced = null;
    for (const [id, c] of this.codeForAction) {
      if (id !== actionId && c === code) { this.codeForAction.set(id, null); displaced = id; }
    }
    this.codeForAction.set(actionId, code);
    return displaced;
  }

  // Codes currently claimed by a game action (so the skill/potion keyboard knows
  // they're taken and greys them). Includes fallbacks.
  reservedCodes() {
    const s = new Set();
    for (const [, c] of this.codeForAction) if (c) s.add(c);
    for (const [, c] of this.fallback) if (c) s.add(c);
    return s;
  }

  serialize() {
    const out = {};
    for (const [id, c] of this.codeForAction) out[id] = c;
    return out;
  }

  load(data) {
    this.reset();
    if (data && typeof data === 'object') {
      for (const [id] of KEY_ACTIONS) {
        if (typeof data[id] === 'string' || data[id] === null) this.codeForAction.set(id, data[id]);
      }
    }
  }
}

export default Keymap;
