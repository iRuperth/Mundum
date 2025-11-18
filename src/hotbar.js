import { t } from './i18n.js';

// A 10-slot action bar for skills and potions. Slots are assigned via a menu
// (right click on desktop, long press on touch) and triggered by the number
// keys 1-9, 0 or by tapping the slot. Cooldowns are tracked per skill id.
const SLOTS = 10;
const LONG_PRESS_MS = 450;

export class Hotbar {
  constructor(root, hooks) {
    this.root = root;
    this.hooks = hooks; // { getOptions(), activate(entry), getCooldown(entry), getMana() }
    this.slots = new Array(SLOTS).fill(null); // each: { kind:'skill'|'potion', ...data }
    this.cells = [];
    this._build();
  }

  _build() {
    this.root.innerHTML = '';
    for (let i = 0; i < SLOTS; i++) {
      const cell = document.createElement('div');
      cell.className = 'hb-slot empty';
      const key = document.createElement('span');
      key.className = 'hb-key';
      key.textContent = i === 9 ? '0' : String(i + 1);
      const cd = document.createElement('div'); cd.className = 'hb-cd';
      const cdText = document.createElement('div'); cdText.className = 'hb-cd-text';
      const icon = document.createElement('span'); icon.className = 'hb-ico';
      cell.append(cd, cdText, icon, key);

      cell.addEventListener('click', () => this.activate(i));
      cell.addEventListener('contextmenu', (e) => { e.preventDefault(); this.openAssign(i, e); });
      this._bindLongPress(cell, i);

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

  setSlot(i, entry) { this.slots[i] = entry; this.render(); }

  // Put a dragged item into slot i. The action bar holds usable items: only
  // potions/food go here (equipment is used from the inventory, not a hotkey).
  assignItem(i, item) {
    if (!item || item.kind !== 'potion') return false;
    this.setSlot(i, {
      kind: 'potion', id: item.baseId, baseId: item.baseId,
      name: this.hooks.itemName ? this.hooks.itemName(item) : (item.baseId || ''),
      icon: item.icon || '🧪',
    });
    return true;
  }

  activate(i) {
    const entry = this.slots[i];
    if (!entry) return;
    this.hooks.activate(entry);
  }

  // Trigger a slot from a number key (0 maps to slot index 9).
  activateKey(digit) {
    const i = digit === 0 ? 9 : digit - 1;
    if (i >= 0 && i < SLOTS) this.activate(i);
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
      b.innerHTML = `<span class="hb-menu-ico">${entry ? entry.icon : '✖'}</span> ${label}`;
      b.addEventListener('click', () => { this.setSlot(i, entry); close(); });
      menu.appendChild(b);
    };
    add(t('empty') || '—', null);
    for (const sk of opts.skills) add(sk.name, { ...sk, skillKind: sk.kind, kind: 'skill' });
    for (const po of opts.potions) add(po.name, { ...po, kind: 'potion' });

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
      icon.textContent = entry ? entry.icon : '';
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

  serialize() {
    return this.slots.map((e) => e ? { kind: e.kind, id: e.id, baseId: e.baseId } : null);
  }

  load(data, resolve) {
    if (!Array.isArray(data)) return;
    for (let i = 0; i < SLOTS && i < data.length; i++) {
      this.slots[i] = data[i] ? resolve(data[i]) : null;
    }
    this.render();
  }
}
