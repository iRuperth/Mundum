import { t } from './i18n.js';
import { iconFor } from './itemIcons.js';

// MapleStory-style KEYBOARD SETTINGS panel. A full on-screen keyboard you drag
// skills and potions onto: drop a skill/potion icon on a key and pressing that
// key in-game casts/uses it. Each key holds at most one action; reserved keys
// (movement, UI, Esc/Enter/Tab…) can't be bound so the game stays playable.
//
// State lives in `this.binds`: a Map<KeyboardEvent.code, entry>, where entry is a
// hotbar-style { kind:'skill'|'potion', id, baseId, name, icon, iconHtml, ... }.
// main.js fires the entry via hooks.activate(entry) on a matching keydown, and
// persists the map via serialize()/load().

// The visual rows of the keyboard, by KeyboardEvent.code. Each item is
// [code, label, widthUnits]. Reserved keys are greyed and not droppable.
const ROWS = [
  [['Backquote', '`', 1], ['Digit1', '1', 1], ['Digit2', '2', 1], ['Digit3', '3', 1], ['Digit4', '4', 1], ['Digit5', '5', 1], ['Digit6', '6', 1], ['Digit7', '7', 1], ['Digit8', '8', 1], ['Digit9', '9', 1], ['Digit0', '0', 1], ['Minus', '-', 1], ['Equal', '=', 1]],
  [['KeyQ', 'Q', 1], ['KeyW', 'W', 1], ['KeyE', 'E', 1], ['KeyR', 'R', 1], ['KeyT', 'T', 1], ['KeyY', 'Y', 1], ['KeyU', 'U', 1], ['KeyI', 'I', 1], ['KeyO', 'O', 1], ['KeyP', 'P', 1], ['BracketLeft', '[', 1], ['BracketRight', ']', 1]],
  [['KeyA', 'A', 1], ['KeyS', 'S', 1], ['KeyD', 'D', 1], ['KeyF', 'F', 1], ['KeyG', 'G', 1], ['KeyH', 'H', 1], ['KeyJ', 'J', 1], ['KeyK', 'K', 1], ['KeyL', 'L', 1], ['Semicolon', ';', 1], ['Quote', "'", 1]],
  [['KeyZ', 'Z', 1], ['KeyX', 'X', 1], ['KeyC', 'C', 1], ['KeyV', 'V', 1], ['KeyB', 'B', 1], ['KeyN', 'N', 1], ['KeyM', 'M', 1], ['Comma', ',', 1], ['Period', '.', 1], ['Slash', '/', 1]],
  [['Space', 'ESPACIO', 6]],
];

// Keys the game already needs (movement, jump, camera, map, chat, interaction,
// mount, mouse-free, wiki). They show on the keyboard but can't hold an action.
const RESERVED = new Set([
  'KeyW', 'KeyA', 'KeyS', 'KeyD',     // movement
  'Space',                             // jump
  'KeyC', 'KeyR', 'KeyF', 'KeyG',     // camera / range / torch / mount
  'KeyM', 'KeyK', 'KeyE', 'KeyY',     // map / skills / interact / wiki
  'Enter', 'Tab', 'Escape', 'Backspace',
]);

function entryIcon(entry) {
  if (!entry) return '';
  if (entry.iconHtml) return entry.iconHtml;
  if (entry.kind === 'potion' || entry.kind === 'light') return iconFor(entry);
  return entry.icon || '';
}

export class KeyboardPanel {
  // hooks: { getOptions(), activate(entry), getCooldown(entry), getMana(), onChange() }
  constructor(hooks) {
    this.hooks = hooks;
    this.binds = new Map();        // code -> entry
    this.keyEls = new Map();       // code -> the rendered key element
    this._drag = null;             // active drag { entry, ghost }
    this._build();
  }

  _build() {
    const root = document.createElement('div');
    root.id = 'kb-overlay';
    root.className = 'hidden';
    root.innerHTML =
      '<div id="kb-window">' +
      '  <div class="kb-head"><span class="kb-title"></span><button class="kb-close" title="">✕</button></div>' +
      '  <div class="kb-hint"></div>' +
      '  <div class="kb-body">' +
      '    <div class="kb-keys"></div>' +
      '    <div class="kb-tray"><div class="kb-tray-title"></div><div class="kb-tray-items"></div></div>' +
      '  </div>' +
      '</div>';
    document.body.appendChild(root);
    this.root = root;
    this.win = root.querySelector('#kb-window');
    this.keysWrap = root.querySelector('.kb-keys');
    this.tray = root.querySelector('.kb-tray-items');
    root.querySelector('.kb-close').addEventListener('click', () => this.close());
    // Click the dim backdrop (not the window) to close.
    root.addEventListener('pointerdown', (e) => { if (e.target === root) this.close(); });

    // Build the key grid once; contents (assigned icons) refresh on open.
    for (const row of ROWS) {
      const r = document.createElement('div');
      r.className = 'kb-row';
      for (const [code, label, w] of row) {
        const key = document.createElement('div');
        key.className = 'kb-key' + (RESERVED.has(code) ? ' kb-reserved' : '');
        key.style.flexGrow = String(w);
        key.dataset.code = code;
        key.innerHTML = `<span class="kb-key-label">${label}</span><span class="kb-key-ico"></span>`;
        if (!RESERVED.has(code)) {
          // Drop target for the HTML5-ish pointer drag from the tray.
          key.addEventListener('pointerenter', () => { if (this._drag) key.classList.add('kb-drop'); });
          key.addEventListener('pointerleave', () => key.classList.remove('kb-drop'));
          // Click a bound key to clear it.
          key.addEventListener('click', () => { if (this.binds.has(code)) { this.binds.delete(code); this._refreshKey(code); this._changed(); } });
        }
        r.appendChild(key);
        this.keyEls.set(code, key);
      }
      this.keysWrap.appendChild(r);
    }
  }

  get isOpen() { return !this.root.classList.contains('hidden'); }

  open() {
    this.root.querySelector('.kb-title').textContent = t('keyboardTitle') || 'Teclado — arrastra poderes a las teclas';
    this.root.querySelector('.kb-hint').textContent = t('keyboardHint') || 'Arrastra un poder o poción a una tecla. Toca una tecla asignada para quitarla.';
    this.root.querySelector('.kb-tray-title').textContent = t('keyboardTray') || 'Poderes y pociones';
    if (document.pointerLockElement) document.exitPointerLock();
    this._renderTray();
    for (const code of this.keyEls.keys()) this._refreshKey(code);
    this.root.classList.remove('hidden');
  }
  close() { this.root.classList.add('hidden'); }
  toggle() { if (this.isOpen) this.close(); else this.open(); }

  // The draggable source list: every castable skill + every carried potion.
  _renderTray() {
    const opts = this.hooks.getOptions();
    this.tray.innerHTML = '';
    const add = (entry) => {
      const el = document.createElement('div');
      el.className = 'kb-tray-item';
      el.title = entry.name || '';
      el.innerHTML = `<span class="kb-tray-ico">${entryIcon(entry)}</span><span class="kb-tray-name">${entry.name || ''}</span>`;
      this._makeDraggable(el, entry);
      this.tray.appendChild(el);
    };
    for (const sk of opts.skills) add({ ...sk, skillKind: sk.kind, kind: 'skill' });
    // Consumables: potions, fruit (kind 'potion') and a torch (kind 'light') —
    // keep each entry's own kind so 'light' still routes to the torch toggle.
    for (const po of opts.potions) { const e = { ...po, kind: po.kind || 'potion' }; e.iconHtml = iconFor(e); add(e); }
    if (!opts.skills.length && !opts.potions.length) {
      this.tray.innerHTML = `<div class="kb-tray-empty">${t('keyboardEmpty') || 'Aprende poderes o consigue pociones para asignarlos.'}</div>`;
    }
  }

  // Pointer-drag a tray item; drop it on a key to bind it. Works mouse + touch.
  _makeDraggable(el, entry) {
    el.addEventListener('pointerdown', (e) => {
      if (e.button !== undefined && e.button !== 0) return;
      e.preventDefault();
      const pointerId = e.pointerId;
      const startX = e.clientX, startY = e.clientY;
      let ghost = null, dragging = false;
      const onMove = (ev) => {
        if (!dragging) {
          if (Math.hypot(ev.clientX - startX, ev.clientY - startY) < 6) return;
          dragging = true;
          try { el.setPointerCapture(pointerId); } catch (_) { /* ignore */ }
          ghost = document.createElement('div');
          ghost.className = 'kb-ghost';
          ghost.innerHTML = entryIcon(entry);
          document.body.appendChild(ghost);
          this._drag = { entry, ghost };
          el.classList.add('dragging');
        }
        if (ghost) ghost.style.transform = `translate3d(${ev.clientX}px, ${ev.clientY}px, 0) translate(-50%, -50%)`;
        // Highlight the key under the cursor.
        const under = document.elementFromPoint(ev.clientX, ev.clientY);
        const keyEl = under && under.closest && under.closest('.kb-key');
        for (const k of this.keyEls.values()) k.classList.remove('kb-drop');
        if (keyEl && !keyEl.classList.contains('kb-reserved')) keyEl.classList.add('kb-drop');
      };
      const onUp = (ev) => {
        el.removeEventListener('pointermove', onMove);
        el.removeEventListener('pointerup', onUp);
        el.removeEventListener('pointercancel', onUp);
        try { el.releasePointerCapture(pointerId); } catch (_) { /* ignore */ }
        el.classList.remove('dragging');
        if (ghost) ghost.remove();
        for (const k of this.keyEls.values()) k.classList.remove('kb-drop');
        this._drag = null;
        if (!dragging) return;
        const under = document.elementFromPoint(ev.clientX, ev.clientY);
        const keyEl = under && under.closest && under.closest('.kb-key');
        if (keyEl && !keyEl.classList.contains('kb-reserved')) {
          this.bind(keyEl.dataset.code, entry);
        }
      };
      el.addEventListener('pointermove', onMove);
      el.addEventListener('pointerup', onUp);
      el.addEventListener('pointercancel', onUp);
    });
  }

  // Assign an entry to a key (one action per key). Persists via onChange.
  bind(code, entry) {
    if (!code || RESERVED.has(code)) return;
    this.binds.set(code, entry);
    this._refreshKey(code);
    this._changed();
  }

  _refreshKey(code) {
    const el = this.keyEls.get(code);
    if (!el) return;
    const ico = el.querySelector('.kb-key-ico');
    const entry = this.binds.get(code);
    ico.innerHTML = entry ? entryIcon(entry) : '';
    el.classList.toggle('kb-bound', !!entry);
    el.title = entry ? entry.name : '';
  }

  _changed() { if (this.hooks.onChange) this.hooks.onChange(); }

  // Fire the action bound to a pressed key code. Returns true if one fired.
  handleKey(code) {
    const entry = this.binds.get(code);
    if (!entry) return false;
    this.hooks.activate(entry);
    return true;
  }

  // True if a non-reserved key currently has an action (so main.js knows the key
  // is "claimed" and shouldn't double-handle it).
  hasBind(code) { return this.binds.has(code); }

  serialize() {
    const out = {};
    for (const [code, e] of this.binds) out[code] = { kind: e.kind, id: e.id, baseId: e.baseId };
    return out;
  }

  // resolve(saved) -> full entry (or null). Skips reserved/unknown safely.
  load(data, resolve) {
    this.binds.clear();
    if (data && typeof data === 'object') {
      for (const code of Object.keys(data)) {
        if (RESERVED.has(code)) continue;
        const e = resolve(data[code]);
        if (e) this.binds.set(code, e);
      }
    }
    if (this.isOpen) for (const code of this.keyEls.keys()) this._refreshKey(code);
  }
}
