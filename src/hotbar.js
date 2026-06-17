import { t } from './i18n.js';
import { iconFor } from './itemIcons.js';

// Icon markup for a hotbar entry: prefer a stored pixel-art SVG (potions/lights),
// fall back to a small painted SVG for item-shaped entries, else the emoji glyph.
function entryIcon(entry) {
  if (!entry) return '';
  if (entry.iconHtml) return entry.iconHtml;
  if (entry.kind === 'potion' || entry.kind === 'light') return iconFor(entry);
  return entry.icon || '';
}

// A 10-slot action bar for skills and potions. Slots are assigned via a menu
// (right click on desktop, long press on touch) and triggered by their bound
// KEY (configurable, MapleStory-style) or by tapping the slot. Cooldowns are
// tracked per skill id.
const SLOTS = 10;
const LONG_PRESS_MS = 450;

// Default key bound to each slot: 1..9 then 0 (the classic layout). Each slot's
// key can be rebound to any keyboard key via the keybind config mode.
const DEFAULT_KEYS = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0'];

// A short human label for a KeyboardEvent.code, for the little key badge on each
// slot. Falls back to the raw code so nothing is ever blank.
export function keyLabel(code) {
  if (!code) return '';
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Numpad')) return code.slice(6) || 'Num';
  if (code.startsWith('Key')) return code.slice(3);
  const map = {
    Space: '␣', Enter: '⏎', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→',
    Minus: '-', Equal: '=', BracketLeft: '[', BracketRight: ']', Semicolon: ';', Quote: "'",
    Comma: ',', Period: '.', Slash: '/', Backslash: '\\', Backquote: '`',
    ShiftLeft: '⇧', ShiftRight: '⇧', ControlLeft: '⌃', ControlRight: '⌃', AltLeft: '⌥', AltRight: '⌥',
    Tab: '⇥', Backspace: '⌫',
  };
  return map[code] || code;
}

export class Hotbar {
  constructor(root, hooks) {
    this.root = root;
    this.hooks = hooks; // { getOptions(), activate(entry), getCooldown(entry), getMana() }
    this.slots = new Array(SLOTS).fill(null); // each: { kind:'skill'|'potion', ...data }
    this.keys = DEFAULT_KEYS.slice();          // number-row key per slot (1..0)
    this.cells = [];
    this._build();
  }

  _build() {
    this.root.innerHTML = '';
    for (let i = 0; i < SLOTS; i++) {
      const cell = document.createElement('div');
      cell.className = 'hb-slot empty';
      cell.style.touchAction = 'none'; // let the drag-out gesture own the pointer
      const key = document.createElement('span');
      key.className = 'hb-key';
      key.textContent = keyLabel(this.keys[i]);
      const cd = document.createElement('div'); cd.className = 'hb-cd';
      const cdText = document.createElement('div'); cdText.className = 'hb-cd-text';
      const icon = document.createElement('span'); icon.className = 'hb-ico';
      cell.append(cd, cdText, icon, key);

      cell.addEventListener('click', () => this.activate(i));
      cell.addEventListener('contextmenu', (e) => { e.preventDefault(); this.openAssign(i, e); });
      this._bindLongPress(cell, i);
      this._bindDragOut(cell, i);

      // Accept items dragged from the backpack (desktop HTML5 drag).
      cell.addEventListener('dragover', (e) => { e.preventDefault(); cell.classList.add('drop-hover'); });
      cell.addEventListener('dragleave', () => cell.classList.remove('drop-hover'));
      cell.addEventListener('drop', (e) => {
        e.preventDefault();
        cell.classList.remove('drop-hover');
        const item = this.hooks.getDragItem && this.hooks.getDragItem();
        if (item) this.assignItem(i, item);
      });

      this.root.appendChild(cell);
      this.cells.push({ cell, cd, cdText, icon });
    }
  }

  _bindLongPress(cell, i) {
    let timer = null;
    const start = (e) => {
      timer = setTimeout(() => { timer = null; this.openAssign(i, e.touches ? e.touches[0] : e); }, LONG_PRESS_MS);
    };
    const cancel = () => { if (timer) { clearTimeout(timer); timer = null; } };
    cell.addEventListener('touchstart', start, { passive: true });
    cell.addEventListener('touchend', cancel);
    cell.addEventListener('touchmove', cancel);
  }

  // Drag a filled slot OFF the bar to remove it (mouse + touch). A small ghost
  // follows the pointer; releasing anywhere outside #hotbar clears the slot. A
  // tap that never crosses the drag threshold still activates the slot (the
  // click handler is left untouched). This is the drag counterpart to the
  // assign menu's "empty" option, so spells can be removed by dragging too.
  _bindDragOut(cell, i) {
    cell.addEventListener('pointerdown', (e) => {
      if ((e.button !== undefined && e.button !== 0) || !this.slots[i]) return;
      const startX = e.clientX, startY = e.clientY, pointerId = e.pointerId;
      let ghost = null, dragging = false;
      const onMove = (ev) => {
        if (!dragging) {
          if (Math.hypot(ev.clientX - startX, ev.clientY - startY) < 8) return;
          dragging = true;
          try { cell.setPointerCapture(pointerId); } catch (_) { /* ignore */ }
          ghost = document.createElement('div');
          ghost.className = 'drag-ghost shown';
          ghost.innerHTML = entryIcon(this.slots[i]);
          document.body.appendChild(ghost);
          cell.classList.add('drag-source');
        }
        if (ghost) ghost.style.transform = `translate3d(${ev.clientX}px, ${ev.clientY}px, 0) translate(-50%, -50%)`;
      };
      const onUp = (ev) => {
        cell.removeEventListener('pointermove', onMove);
        cell.removeEventListener('pointerup', onUp);
        cell.removeEventListener('pointercancel', onUp);
        try { cell.releasePointerCapture(pointerId); } catch (_) { /* ignore */ }
        if (ghost) ghost.remove();
        cell.classList.remove('drag-source');
        if (!dragging) return;
        // Suppress the click that follows a real drag so removal doesn't also fire the slot.
        const swallow = (ce) => { ce.stopPropagation(); ce.preventDefault(); };
        cell.addEventListener('click', swallow, { capture: true, once: true });
        setTimeout(() => cell.removeEventListener('click', swallow, { capture: true }), 0);
        const over = document.elementFromPoint(ev.clientX, ev.clientY);
        // Dropped back on the bar (any slot) → keep; dropped off the bar → remove.
        if (!over || !over.closest || !over.closest('#hotbar')) this.setSlot(i, null);
      };
      cell.addEventListener('pointermove', onMove);
      cell.addEventListener('pointerup', onUp);
      cell.addEventListener('pointercancel', onUp);
    });
  }

  setSlot(i, entry) { this.slots[i] = entry; this.render(); }

  // Put a dragged item into slot i. The action bar holds usable items: potions/
  // food and light sources (torches). Equipment is used from the inventory.
  assignItem(i, item) {
    if (!item || (item.kind !== 'potion' && item.kind !== 'light')) return false;
    this.setSlot(i, {
      kind: item.kind, id: item.baseId, baseId: item.baseId,
      name: this.hooks.itemName ? this.hooks.itemName(item) : (item.baseId || ''),
      icon: item.icon || (item.kind === 'light' ? '🔥' : '🧪'),
      // Pixel-art SVG icon, matching the inventory. Skills keep their emoji.
      iconHtml: iconFor(item),
    });
    return true;
  }

  activate(i) {
    const entry = this.slots[i];
    if (!entry) return;
    this.hooks.activate(entry);
  }

  // Trigger a slot from a number key (0 maps to slot index 9). Kept for any
  // legacy caller; the main path is handleKey(code) below.
  activateKey(digit) {
    const i = digit === 0 ? 9 : digit - 1;
    if (i >= 0 && i < SLOTS) this.activate(i);
  }

  // Fire the slot bound to a raw KeyboardEvent.code (the number row by default).
  // Returns true if the key matched a slot. Custom key→action binds live in the
  // Keyboard panel, not here.
  handleKey(code) {
    const i = this.keys.indexOf(code);
    if (i >= 0) { this.activate(i); return true; }
    return false;
  }

  // Build the assignment menu listing the player's skills and potions.
  openAssign(i, anchor) {
    const opts = this.hooks.getOptions();
    const menu = document.createElement('div');
    menu.className = 'hb-menu';
    const title = document.createElement('div');
    title.className = 'hb-menu-title';
    title.textContent = t('assignSlot');
    menu.appendChild(title);

    const add = (label, entry) => {
      const b = document.createElement('button');
      b.className = 'hb-menu-item';
      b.innerHTML = `<span class="hb-menu-ico">${entry ? entryIcon(entry) : '✖'}</span> ${label}`;
      b.addEventListener('click', () => { this.setSlot(i, entry); close(); });
      menu.appendChild(b);
    };
    add(t('empty') || '—', null);
    for (const sk of opts.skills) add(sk.name, { ...sk, skillKind: sk.kind, kind: 'skill' });
    for (const po of opts.potions) {
      // Preserve the entry's own kind so a torch ('light') still toggles instead
      // of being treated as a potion.
      const entry = { ...po, kind: po.kind || 'potion' };
      entry.iconHtml = iconFor(entry);
      add(po.name, entry);
    }

    document.body.appendChild(menu);
    const x = Math.min(anchor.clientX || innerWidth / 2, innerWidth - 180);
    const y = Math.min(anchor.clientY || innerHeight / 2, innerHeight - 220);
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
    const close = () => { menu.remove(); document.removeEventListener('pointerdown', onOut, true); };
    const onOut = (e) => { if (!menu.contains(e.target)) close(); };
    setTimeout(() => document.addEventListener('pointerdown', onOut, true), 0);
  }

  render() {
    for (let i = 0; i < SLOTS; i++) {
      const { cell, icon } = this.cells[i];
      const entry = this.slots[i];
      cell.classList.toggle('empty', !entry);
      icon.innerHTML = entry ? entryIcon(entry) : '';
      cell.title = entry ? entry.name : '';
    }
  }

  // Per-frame: update cooldown overlays and out-of-mana state.
  update() {
    const mana = this.hooks.getMana ? this.hooks.getMana() : Infinity;
    for (let i = 0; i < SLOTS; i++) {
      const entry = this.slots[i];
      const { cell, cd, cdText } = this.cells[i];
      if (!entry) { cd.style.transform = 'scaleY(0)'; cdText.textContent = ''; cell.classList.remove('no-mana'); continue; }
      const cool = this.hooks.getCooldown ? this.hooks.getCooldown(entry) : { frac: 0, remain: 0 };
      cd.style.transform = `scaleY(${cool.frac})`;
      cdText.textContent = cool.remain > 0 ? Math.ceil(cool.remain) : '';
      cell.classList.toggle('ready', cool.frac <= 0);
      const lacksMana = entry.kind === 'skill' && entry.manaCost > mana;
      cell.classList.toggle('no-mana', lacksMana);
    }
  }

  // Save both the slot contents AND the per-slot keybinds so each player's custom
  // layout (what's in each slot + which key fires it) survives a reload.
  serialize() {
    return {
      slots: this.slots.map((e) => e ? { kind: e.kind, id: e.id, baseId: e.baseId } : null),
      keys: this.keys.slice(),
    };
  }

  // Accepts the new {slots,keys} shape, or a legacy bare slots array.
  load(data, resolve) {
    const slots = Array.isArray(data) ? data : (data && data.slots);
    const keys = (data && !Array.isArray(data) && Array.isArray(data.keys)) ? data.keys : null;
    if (Array.isArray(slots)) {
      for (let i = 0; i < SLOTS && i < slots.length; i++) {
        this.slots[i] = slots[i] ? resolve(slots[i]) : null;
      }
    }
    if (keys) for (let i = 0; i < SLOTS && i < keys.length; i++) this.keys[i] = keys[i] || this.keys[i];
    this.render();
  }
}
