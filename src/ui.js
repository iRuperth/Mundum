import { t, elementName, getLang } from './i18n.js';
import { RARITY, mmCoins, getWeapon, getArmor, getContainer } from './data/items.js';
import { getMaterial } from './data/materials.js';

// HTML-escape any value bound for innerHTML. Used on EVERY network- or DB-sourced
// string (player/house owner names, market seller names + item names, ban list
// names) so a crafted name like "<img onerror=…>" can't run script in another
// player's session (stored/DOM XSS). Static i18n strings don't need it.
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Friendly display name for any item id (gear, container or material), in the
// given language, falling back to a title-cased id. Used by the quest "needs"
// hints so a key id like 'demon-bone' reads "Demon Bone" / "Hueso de Demonio".
function itemDisplayName(id, lang = 'es') {
  const gear = getWeapon(id) || getArmor(id) || getContainer(id);
  if (gear) return typeof gear.name === 'object' ? (gear.name[lang] || gear.name.es) : gear.name;
  const mat = getMaterial(id);
  if (mat) return (mat.name && (mat.name[lang] || mat.name.es)) || id;
  return String(id).replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
import { EQUIP_SLOTS, itemWeight } from './inventory.js';
import { shopStock, shopStockFor, vendorBuysItem, sellPrice, buyPrice, collectorPrice, CITIES, cityRecLevel } from './cities.js';
import { iconFor, slotPlaceholderIcon } from './itemIcons.js';
import { housePrice, showcaseWalls, showcaseCapacity, houseSizeKey, HOUSE_PALETTE, FACADE_SLOTS } from './house.js';

const SLOT_ICON = {
  amulet: '📿', helmet: '⛑️', weapon: '⚔️', armor: '🛡️',
  shield: '🔰', legs: '👖', boots: '🥾', bag: '🎒', extra: '🔥', quiver: '🎯',
};
const TYPE_ICON = {
  sword: '🗡️', axe: '🪓', bow: '🏹', wand: '🪄', shield: '🔰',
  armor: '🛡️', container: '🎒',
};

function rarityClass(item) {
  if (!item) return '';
  if (item.rarity === RARITY.LEGENDARY) return 'rar-legendary';
  if (item.rarity === RARITY.ELITE) return 'rar-elite';
  return 'rar-normal';
}

// The display name of an item, localized. For a STACK (count > 1) it prefixes the
// amount — "100 × Crystal Coin", "12 × Mana Potion" — so anywhere a stacked item is
// shown (house/shop/collector walls, market, displays) the amount reads clearly.
// We use "N × name" rather than pluralising, so it's correct in both ES and EN
// (Spanish names like "Moneda de Plata" don't pluralise with a simple +s).
function itemDisplayName(item) {
  if (!item) return '';
  const base = typeof item.name === 'string' ? item.name
    : (item.name && (item.name[getLang()] || item.name.es || item.name.en)) || '';
  const c = item.count || 1;
  return c > 1 ? `${c} × ${base}` : base;
}

// Weapon types that read as "handed" — a blade/bow/staff held in a hand. When
// one sits in the MAIN (weapon) slot it's mirrored so the icon matches the 3D
// model, which mirrors the main hand; the off-hand (shield) slot shows it
// un-mirrored, also matching the model.
const HANDED_WEAPON_TYPES = new Set(['sword', 'axe', 'mace', 'lance', 'bow', 'wand']);

// What a right-click menu may offer for an item:
//  • EQUIPABLE — gear that goes on the paperdoll (weapons, shields, armor pieces,
//    amulets, rings). Bags are NOT listed here: clicking a bag just opens it.
//  • USABLE — consumables/tools fired with "use": potions and lights (the torch).
// Everything always offers Drop + its info; equip/use appear only when valid.
function isEquipable(item) {
  if (!item) return false;
  if (HANDED_WEAPON_TYPES.has(item.type) || item.type === 'weapon' || item.type === 'shield') return true;
  if (item.type === 'armor') return true;   // armor/legs/boots/helmet/amulet/ring carry slot
  return false;
}
function isUsable(item) {
  return !!item && (item.kind === 'potion' || item.kind === 'light');
}

function itemIcon(item, slot) {
  // Procedural pixel-art SVG, unique per item (type/tier/element/rarity/colour).
  // Returns an inline <svg> string; safe to drop into innerHTML like the old
  // emoji glyphs, so drag-drop, count badges and tooltips keep working.
  // A handed weapon in the MAIN (weapon) slot is mirrored to match the 3D model.
  const mirror = slot === 'weapon' && item && HANDED_WEAPON_TYPES.has(item.type);
  return iconFor(item, mirror ? { mirror: true } : undefined);
}

// Plain-text glyph for contexts that can't render SVG (e.g. the drag ghost uses
// a styled clone instead; chat/log lines fall back to a small emoji).
function itemGlyph(item) {
  if ((item.kind === 'coin' || item.kind === 'potion' || item.kind === 'light') && item.icon) return item.icon;
  if (item.type === 'container' || item.slot === 'bag') return item.bagIcon || TYPE_ICON.container;
  if (item.slot && SLOT_ICON[item.slot]) return SLOT_ICON[item.slot];
  return TYPE_ICON[item.type] || '❔';
}

// Inner HTML for a backpack/window cell. The procedural SVG icon (iconFor)
// carries the look for everything, INCLUDING coins — whose icon is the Tibia
// pyramid pile (1–5 facing, 6–15 stacked) with the "mm" stamp. Stacks add a
// count badge.
function cellInner(item) {
  // The SVG icon carries its own colours, so the cell wrapper no longer tints it.
  const icon = `<span class="ico">${itemIcon(item)}</span>`;
  // Coins + stacked consumables/materials/trophies show a count badge.
  const n = item.count || 1;
  if (item.kind === 'coin' || (n > 1 && (item.kind === 'potion' || item.kind === 'material' || item.kind === 'trophy'))) {
    const show = n > 999 ? Math.floor(n / 1000) + 'k' : n;
    return icon + `<span class="cell-count">${show}</span>`;
  }
  return icon;
}

export class UI {
  constructor(refs, inv, depot, hooks) {
    this.refs = refs;
    this.inv = inv;
    this.depot = depot;
    this.hooks = hooks;
    this.collapsed = false;
    this.level = 1;
    // Open container windows (Tibia-style). Key: 'main' for the equipped bag,
    // or a numeric backpack index for a nested bag. Value: its .win element.
    this.containerWins = new Map();

    refs.panelToggle.addEventListener('click', () => this.togglePanel());
    refs.paperdoll.querySelectorAll('.slot').forEach((el) => {
      const slot = el.getAttribute('data-slot');
      // LEFT click = the equipped item's INFO; RIGHT click = its action (unequip,
      // or open the bag / toggle the torch).
      el.addEventListener('click', () => this.onSlotInfo(slot));
      el.addEventListener('contextmenu', (e) => { e.preventDefault(); this.onSlotUse(slot); });
      // Drag an equipped item off into a bag (bound once; the item is read lazily
      // at drag-start so it always reflects what's currently in the slot).
      this._makeSlotDraggable(el, slot);
    });
    // Fixed windows (map, equipment): wire their collapse buttons + reordering.
    if (refs.sidePanel) {
      refs.sidePanel.querySelectorAll('.win[data-win="equip"]').forEach((w) => this._wireWindow(w, { closable: false }));
    }
  }

  // Returns true when the inventory (right) panel is now open (expanded).
  togglePanel() {
    this.collapsed = !this.collapsed;
    this._setPanelCollapsed(this.refs.sidePanel, this.collapsed);
    return !this.collapsed;
  }

  // Public hook so external panels (skills, spells, wiki) can register their
  // own .win as a draggable/collapsible window in a side panel.
  wireWindow(win, opts) { this._wireWindow(win, opts); }

  // Collapse/expand a side panel and point its toggle arrow the right way. The
  // right panel hides toward the right (‹ to reopen), the left toward the left.
  _setPanelCollapsed(panel, collapsed) {
    if (!panel) return;
    panel.classList.toggle('collapsed', collapsed);
    const isLeft = panel.classList.contains('side-left');
    const toggle = panel.querySelector('#panel-toggle, #panel-toggle-left');
    if (toggle) toggle.textContent = collapsed ? (isLeft ? '›' : '‹') : (isLeft ? '‹' : '›');
    if (panel === this.refs.sidePanel) this.collapsed = collapsed;
    // Right panel drives the floating minimap: when it collapses, slide the map
    // over to the edge with it (CSS body.right-collapsed #minimap-box).
    if (!isLeft) document.body.classList.toggle('right-collapsed', collapsed);
  }

  // Reveal a side panel (by a selector like '.side-left'), un-hiding and
  // un-collapsing it so a dragged window can land in it. No-op if absent.
  _revealPanel(sel) {
    const panel = document.querySelector('.side-panel' + sel);
    if (!panel) return;
    if (panel.classList.contains('hidden')) panel.classList.remove('hidden');
    if (panel.classList.contains('collapsed')) this._setPanelCollapsed(panel, false);
  }

  setVitals(hp, maxHp, mana, maxMana, xpInfo) {
    this.level = xpInfo.level;
    this.refs.hpFill.style.width = Math.max(0, (hp / maxHp) * 100) + '%';
    this.refs.hpText.textContent = `${Math.max(0, Math.ceil(hp))}/${maxHp}`;
    if (this.refs.manaFill && maxMana) {
      this.refs.manaFill.style.width = Math.max(0, (mana / maxMana) * 100) + '%';
      this.refs.manaText.textContent = `${Math.max(0, Math.floor(mana))}/${maxMana}`;
    }
    // The XP bar now lives under the hotbar (a thin strip). Show the progress
    // with two decimals (0.01% … 100%) so early levels still tick visibly.
    if (this.refs.xpFill) {
      const pct = Math.min(100, Math.max(0, xpInfo.frac * 100));
      this.refs.xpFill.style.width = pct + '%';
      // Two decimals, but drop a trailing ".00"/".x0" so 100.00→100 and 50.50→50.5.
      let shown = pct.toFixed(2);
      if (shown.includes('.')) shown = shown.replace(/0+$/, '').replace(/\.$/, '');
      this.refs.xpText.textContent = `${t('xp')} ${shown}%`;
    }
    if (this.refs.levelBadge) this.refs.levelBadge.textContent = xpInfo.level;
  }

  // Show the hero's name in the top-left HUD title (replacing "MUNDUM").
  setName(name) {
    if (this.refs.hudTitle) this.refs.hudTitle.textContent = name;
  }

  setCapacity(level) {
    const w = Math.round(this.inv.carriedWeight());
    const cap = this.inv.capacity(level);
    // Tibia-style: show the REMAINING capacity, not used/total.
    const left = Math.max(0, cap - w);
    this.refs.capText.textContent = `${left}`;
    this.refs.capText.classList.toggle('over', w > cap * 0.9);
  }

  renderEquipment() {
    this.refs.paperdoll.querySelectorAll('.slot').forEach((el) => {
      const slot = el.getAttribute('data-slot');
      const item = this.inv.equip[slot];
      el.innerHTML = '';
      el.classList.remove('rar-normal', 'rar-elite', 'rar-legendary', 'filled');
      if (item) {
        el.classList.add('filled', rarityClass(item));
        el.innerHTML = `<span class="ico">${itemIcon(item, slot)}</span>`;
      } else {
        // The empty-slot ghost reflects the player's class for the hand slots
        // (archer's off-hand shows a bow, others a shield).
        el.innerHTML = `<span class="ph">${slotPlaceholderIcon(slot, { profession: this.inv.profession })}</span>`;
      }
    });
  }

  // --- Container windows (Tibia-style) ----------------------------------
  // `ref` is 'main' (the equipped bag = top-level backpack) or a numeric index
  // into the backpack for a nested bag. Opening an already-open container just
  // re-renders it. Windows live stacked inside #windows and can be collapsed,
  // closed, and reordered.
  //
  // A nested bag is identified by its OBJECT, not its index: inserting items at
  // the front of the backpack shifts indices around, so the map is keyed by the
  // bag's live index but each window remembers `win._bag` to recover that index
  // after a reorder (see _refreshContainerWindows).
  openBackpack(ref = 'main') {
    if (ref == null) ref = 'main';
    const bag = ref === 'main' ? null : this.inv.backpack[ref];
    if (ref !== 'main' && (!bag || bag.type !== 'container')) return null;
    // Reuse an open window for this exact bag object (its index may have moved).
    let win = ref === 'main'
      ? this.containerWins.get('main')
      : [...this.containerWins.values()].find((w) => w._bag === bag);
    if (!win) {
      win = document.createElement('div');
      win.className = 'win';
      win.dataset.win = 'bag-' + String(ref);
      win.innerHTML =
        '<div class="win-head"><span class="win-grip">⠿</span>' +
        '<span class="win-title"></span><span class="win-count"></span>' +
        '<button class="win-collapse" title="">▾</button>' +
        '<button class="win-close" title="">✕</button></div>' +
        '<div class="win-body"></div>';
      win._bag = bag; // null for the main backpack
      this.refs.windows.appendChild(win);
      this._wireWindow(win, { closable: true, onClose: () => this._forgetWindow(win) });
      this.containerWins.set(ref === 'main' ? 'main' : String(ref), win);
    }
    this._renderContainerWindow(win, ref);
    return win;
  }

  // Drop a window from the open-windows map (by value, since its index key may
  // be stale after reorders).
  _forgetWindow(win) {
    for (const [k, w] of this.containerWins) if (w === win) { this.containerWins.delete(k); return; }
  }

  // (Re)draw a container window's grid from current inventory state.
  _renderContainerWindow(win, ref) {
    const isNested = ref !== 'main';
    const bag = isNested ? this.inv.backpack[ref] : null;
    if (isNested && (!bag || bag.type !== 'container')) { this.closeContainer(ref); return; }
    const cap = isNested ? bag.capacity : this.inv.bagCapacity;
    const items = isNested ? bag.contents : this.inv.backpack;
    const title = isNested ? bag.name : t('backpack');

    // The container key drag-and-drop uses to address this window: 'main' or the
    // numeric backpack index of a nested bag. A pouch shows a pouch glyph/title.
    const containerKey = isNested ? ref : 'main';
    const headIcon = (isNested && bag.bagIcon) ? bag.bagIcon : '🎒';
    win.dataset.ref = String(containerKey);
    win.querySelector('.win-title').textContent = headIcon + ' ' + title;
    win.querySelector('.win-count').textContent = `${items.length}/${cap}`;
    const body = win.querySelector('.win-body');
    body.innerHTML = '';
    const grid = document.createElement('div');
    grid.className = 'bp-window';
    for (let i = 0; i < cap; i++) {
      const cell = document.createElement('div');
      cell.className = 'bp-cell';
      // Every cell (empty included) is addressable so a drag can target it.
      cell.dataset.ref = String(containerKey);
      cell.dataset.idx = String(i);
      const item = items[i];
      if (item) {
        cell.classList.add('filled', rarityClass(item));
        if (item.type === 'container') cell.classList.add('is-bag');
        if (item.kind === 'coin') cell.classList.add('is-coin');
        cell.innerHTML = cellInner(item);
        // Interaction model (the user's design):
        //   LEFT click  → show the item's INFO (name, stats, weight…).
        //   RIGHT click → the ACTION directly: use food/potion/torch, convert a
        //                 coin (100→1), equip gear, or open a bag. No menu.
        cell.addEventListener('click', (e) => { e.preventDefault(); this.openItemInfo(item); });
        cell.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          this.doItemAction(item, i, isNested ? ref : null);
        });
        this.attachTooltip(cell, item);
        this._makeDraggable(cell, item, { c: containerKey, i });
      }
      grid.appendChild(cell);
    }
    body.appendChild(grid);
  }

  // Close one container window (used by ✕ and when a bag disappears).
  closeContainer(ref) {
    const key = String(ref);
    const win = this.containerWins.get(key);
    if (win) { win.remove(); this._forgetWindow(win); }
  }

  // Close every open container/backpack window. Returns true if any were open
  // (so Escape can consume the keystroke). The pinned map/equip panels stay.
  closeAllWindows() {
    const wins = [...this.containerWins.values()];
    for (const w of wins) { w.remove(); this._forgetWindow(w); }
    return wins.length > 0;
  }

  // Re-render every open container window after an inventory change. Nested-bag
  // windows recover their CURRENT index from their remembered bag object (front-
  // insertion may have shifted it); a bag that's gone gets its window closed. The
  // map is rebuilt under fresh index keys so later lookups stay correct.
  _refreshContainerWindows() {
    const open = [...this.containerWins.values()];
    this.containerWins.clear();
    for (const win of open) {
      if (!win._bag) { // the main backpack
        this.containerWins.set('main', win);
        this._renderContainerWindow(win, 'main');
        continue;
      }
      const idx = this.inv.backpack.indexOf(win._bag);
      if (idx < 0) { win.remove(); continue; } // bag no longer in the backpack
      this.containerWins.set(String(idx), win);
      this._renderContainerWindow(win, idx);
    }
  }

  // Wire a window's title bar: collapse toggle, optional close, and drag-to-
  // reorder within the side panel. Fixed windows (map/equip) pass closable:false.
  _wireWindow(win, { closable, onClose } = {}) {
    const collapseBtn = win.querySelector('.win-collapse');
    if (collapseBtn) {
      collapseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const c = win.classList.toggle('collapsed');
        collapseBtn.textContent = c ? '▸' : '▾';
      });
    }
    const closeBtn = win.querySelector('.win-close');
    if (closeBtn) {
      if (!closable) closeBtn.remove();
      else closeBtn.addEventListener('click', (e) => { e.stopPropagation(); win.remove(); onClose && onClose(); });
    }
    const head = win.querySelector('.win-head');
    if (head) this._makeWindowReorderable(win, head);
    // Every window EXCEPT the map gets a drag-to-resize grip (Tibia-style).
    if (win.dataset.win !== 'map') this._makeWindowResizable(win);
  }

  // Add a bottom-edge grip that resizes the window VERTICALLY only (the width
  // stays fixed, so the backpack keeps its 4 columns). Dragging the grip taller
  // shows more rows; shorter scrolls the body. Pointer-based (mouse + touch).
  _makeWindowResizable(win) {
    if (win.querySelector('.win-resize')) return;   // already wired
    win.classList.add('resizable');
    const grip = document.createElement('div');
    grip.className = 'win-resize';
    grip.title = '';
    win.appendChild(grip);

    grip.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();   // don't start a window-move drag
      if (e.button !== undefined && e.button !== 0) return;
      if (document.pointerLockElement) document.exitPointerLock();
      const r = win.getBoundingClientRect();
      const startY = e.clientY;
      const startH = r.height;
      const head = win.querySelector('.win-head');
      const headH = head ? head.offsetHeight : 24;
      win.classList.add('resizing');
      try { grip.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }

      const onMove = (ev) => {
        // Height only — width is left untouched so columns never change.
        const h = Math.max(headH + 40, Math.min(window.innerHeight * 0.85, startH + (ev.clientY - startY)));
        win.style.setProperty('--win-body-h', (h - headH - 2) + 'px');
      };
      const onUp = () => {
        grip.removeEventListener('pointermove', onMove);
        grip.removeEventListener('pointerup', onUp);
        grip.removeEventListener('pointercancel', onUp);
        try { grip.releasePointerCapture(e.pointerId); } catch (_) { /* ignore */ }
        win.classList.remove('resizing');
      };
      grip.addEventListener('pointermove', onMove);
      grip.addEventListener('pointerup', onUp);
      grip.addEventListener('pointercancel', onUp);
    });
  }

  // Drag a window by its head to reorder it among its sibling windows (vertical
  // only, within #windows). Pointer-based so it works on mouse and touch. Only
  // other `.win` elements count as drop slots, so the reorder never lands a
  // window beside the panel's non-window children.
  _makeWindowReorderable(win, head) {
    head.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button')) return; // let buttons act normally
      if (e.button !== undefined && e.button !== 0) return;
      // Free the look-lock so the cursor is live and the window can follow it.
      if (document.pointerLockElement) document.exitPointerLock();
      const startY = e.clientY;
      const startX = e.clientX;
      let dragging = false;
      let placeholder = null;     // marks where the window will land
      let grabDX = 0, grabDY = 0; // cursor offset within the window
      let lifted = false;
      // NOTE: do NOT setPointerCapture on the head — the window (and its head) gets
      // re-parented to <body> on lift, which drops the capture and strands the
      // window mid-drag (pointerup never fires). Listen on `window` instead so the
      // drag always completes wherever the cursor goes.

      // Lift the window out of flow into a fixed, cursor-following "card", and
      // drop a same-size placeholder in its slot so the layout doesn't jump.
      const lift = () => {
        const r = win.getBoundingClientRect();
        grabDX = startX - r.left; grabDY = startY - r.top;
        placeholder = document.createElement('div');
        placeholder.className = 'win-placeholder';
        placeholder.style.height = r.height + 'px';
        win.parentNode.insertBefore(placeholder, win);
        win.style.width = r.width + 'px';
        win.classList.add('lifting');     // position:fixed via CSS
        document.body.appendChild(win);   // escape the panel's clipping/scroll
        lifted = true;
      };

      // Move the lifted window to the cursor, and slide the placeholder into the
      // slot under the cursor (in whichever panel it's hovering).
      const follow = (clientX, clientY) => {
        win.style.left = (clientX - grabDX) + 'px';
        win.style.top = (clientY - grabDY) + 'px';
        // Dragging into the left/right EDGE reveals that side panel even if it was
        // hidden, so a window can be dropped into the left tab that starts closed.
        const edge = Math.min(160, window.innerWidth * 0.22);
        if (clientX <= edge) this._revealPanel('.side-left');
        else if (clientX >= window.innerWidth - edge) this._revealPanel('.side-right');
        const containers = [...document.querySelectorAll('.windows')];
        let parent = placeholder.parentNode;
        for (const c of containers) {
          const sp = c.closest('.side-panel');
          if (!sp || sp.classList.contains('hidden')) continue;   // skip hidden panels
          const pr = sp.getBoundingClientRect();
          if (pr.width && clientX >= pr.left && clientX <= pr.right) { parent = c; break; }
        }
        const panel = parent.closest('.side-panel');
        if (panel && panel.classList.contains('collapsed')) this._setPanelCollapsed(panel, false);
        const sibs = [...parent.children].filter((c) => c !== placeholder && c.classList.contains('win'));
        let before = null;
        for (const s of sibs) {
          const r = s.getBoundingClientRect();
          if (clientY < r.top + r.height / 2) { before = s; break; }
        }
        if (before) {
          if (placeholder.nextElementSibling !== before) parent.insertBefore(placeholder, before);
        } else if (parent.lastElementChild !== placeholder) {
          parent.appendChild(placeholder);
        }
      };

      const onMove = (ev) => {
        if (!dragging) {
          if (Math.abs(ev.clientY - startY) < 6 && Math.abs(ev.clientX - startX) < 6) return;
          dragging = true; win.classList.add('dragging');
          lift();
        }
        follow(ev.clientX, ev.clientY);
      };
      const onUp = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onUp);
        win.classList.remove('dragging');
        // Drop the window back into the layout where the placeholder sits.
        if (lifted && placeholder) {
          placeholder.parentNode.insertBefore(win, placeholder);
          placeholder.remove();
          win.classList.remove('lifting');
          win.style.left = win.style.top = win.style.width = '';
        }
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onUp);
    });
  }

  // RIGHT click = the item's ACTION, done immediately (no menu): open a bag, use
  // a consumable/torch, convert a coin (100→1 up; if it can't go up, break it
  // 1→100 down), or equip gear. `bagIndex` set = the item lives inside a nested
  // bag (so we take it out / use it via the nested-bag hooks).
  doItemAction(item, index, bagIndex) {
    if (item.type === 'container') { if (bagIndex == null) this.openBackpack(index); return; }
    if (item.kind === 'coin') {
      if ((item.count || 0) >= 100 && (item.tier || 0) < 4) this.hooks.convertCoin(item.baseId);
      else if ((item.tier || 0) > 0) this.hooks.convertCoinDown(item.baseId);   // top tier with <100: break one down
      this.renderAll();
      return;
    }
    if (bagIndex != null) { this.hooks.takeFromBag(bagIndex, index); return; }
    if (isUsable(item)) { if (item.kind === 'light') this.hooks.equip(index); else this.hooks.usePotion(index); return; }
    if (isEquipable(item)) { this.hooks.equip(index); return; }
  }

  renderAll() {
    this.renderEquipment();
    this._refreshContainerWindows();
    this.setCapacity(this.level);
  }

  // LEFT click = show the item's INFO: a small Tibia-style card with the name and
  // its stats/weight (text only, no icons), plus a Drop button. No use/equip.
  openItemInfo(item) {
    if (!item) return;
    // Resolve where this item lives so the action buttons can act on it. It's
    // either a top-level backpack cell, or inside a nested bag (contents). On
    // touch there's no right-click, so these buttons are the ONLY way to equip a
    // weapon, drink a potion, light a torch, or open a bag with a finger.
    const top = this.inv.backpack.indexOf(item);
    let index = top, bagIndex = null;
    if (top < 0) {
      for (let b = 0; b < this.inv.backpack.length; b++) {
        const bag = this.inv.backpack[b];
        if (bag && Array.isArray(bag.contents)) {
          const ci = bag.contents.indexOf(item);
          if (ci >= 0) { index = ci; bagIndex = b; break; }
        }
      }
    }

    const actions = [];
    // Primary action button (Equip / Use / Open) — context-appropriate label.
    if (item.type === 'container' && bagIndex == null) {
      actions.push({ label: '🎒 ' + (t('open') || 'Abrir'), primary: true,
        fn: () => { this.doItemAction(item, index, bagIndex); this.closeContext(); } });
    } else if (bagIndex != null) {
      actions.push({ label: '🎒 ' + (t('takeOut') || 'Sacar'), primary: true,
        fn: () => { this.doItemAction(item, index, bagIndex); this.closeContext(); } });
    } else if (isUsable(item)) {
      const lbl = item.kind === 'light' ? ('🔦 ' + (t('equip') || 'Equipar')) : ('🧪 ' + (t('use') || 'Usar'));
      actions.push({ label: lbl, primary: true,
        fn: () => { this.doItemAction(item, index, bagIndex); this.closeContext(); } });
    } else if (isEquipable(item)) {
      actions.push({ label: '⚔️ ' + (t('equip') || 'Equipar'), primary: true,
        fn: () => { this.doItemAction(item, index, bagIndex); this.closeContext(); } });
    } else if (item.kind === 'coin') {
      actions.push({ label: '🪙 ' + (t('convert') || 'Convertir'),
        fn: () => { this.doItemAction(item, index, bagIndex); } });
    }
    // Drop is always available.
    actions.push({ label: '🗑️ ' + t('drop'), fn: () => {
      const i = (top >= 0) ? top : this.inv.backpack.indexOf(item);
      if (i >= 0) this._dropWithPrompt(item, i);
      else if (bagIndex != null) { this.doItemAction(item, index, bagIndex); }   // out of bag first
    } });

    this.openContext(item, actions, { info: true });
  }

  // Old left-click entry point, kept as an alias so any caller still works: it
  // now shows info rather than acting.
  onBackpackClick(i) {
    const item = this.inv.backpack[i];
    if (item) this.openItemInfo(item);
  }

  // LEFT click on an equip slot = show the item's INFO (no action).
  onSlotInfo(slot) {
    const item = this.inv.equip[slot];
    if (item) this.openItemInfo(item);
  }

  // RIGHT click on an equip slot = its action: open the bag, light/douse the
  // torch in the fire slot, otherwise unequip it.
  onSlotUse(slot) {
    const item = this.inv.equip[slot];
    if (!item) return;
    if (slot === 'bag') { this.openBackpack('main'); return; }
    if (item.kind === 'light' && !item.passive) { this.hooks.toggleTorch?.(); return; }
    this.hooks.unequip(slot);
  }

  attachTooltip(el, item) {
    el.addEventListener('pointerenter', () => this.showTooltip(item, el));
    el.addEventListener('pointerleave', () => this.hideTooltip());
  }

  // Long press on touch fires the same action as right click (coin conversion).
  _bindCoinLongPress(el, fn) {
    let timer = null;
    el.addEventListener('touchstart', () => { timer = setTimeout(fn, 450); }, { passive: true });
    const cancel = () => { if (timer) { clearTimeout(timer); timer = null; } };
    el.addEventListener('touchend', cancel);
    el.addEventListener('touchmove', cancel);
  }

  // Make an item cell draggable. A ghost follows the cursor and the target under
  // it on release decides what happens: a hotbar slot assigns it, another bag
  // cell / window moves it there (Tibia-style), a paperdoll slot equips it,
  // releasing out over the world tosses it on the ground, anything else is a
  // no-op. `from` is the source location { c, i } (c = 'main' | nested bag index
  // | 'equip:<slot>'). Uses pointer events so it works for mouse and touch.
  _makeDraggable(el, item, from) {
    this._bindDrag(el, () => ({ item, from }));
  }

  // Drag an equipped paperdoll slot. The item is read live at drag-start so the
  // one binding survives re-renders; the bag slot itself isn't draggable.
  _makeSlotDraggable(el, slot) {
    if (slot === 'bag') return;
    this._bindDrag(el, () => {
      const item = this.inv.equip[slot];
      return item ? { item, from: { c: 'equip:' + slot, i: 0 } } : null;
    });
  }

  // Make a Spells-window row draggable onto the hotbar. Spells are no longer
  // auto-placed — the player drags the ones they want onto a slot. Reuses the
  // same pointer-drag ghost/hit-test as items, but the payload is a hotbar
  // "skill" entry and the only meaningful drop target is a hotbar slot.
  // `getSpell()` returns the entry to place (read at drag-start) or null.
  makeSpellDraggable(el, getSpell) {
    el.style.touchAction = 'none';
    el.style.userSelect = 'none';
    el.classList.add('spell-draggable');
    el.addEventListener('pointerdown', (e) => {
      if (e.button !== undefined && e.button !== 0) return;
      // Don't start a drag when the press lands on an interactive child (the "+"
      // spend button) — let that button get its own click. Otherwise touch jitter
      // would turn every "+" tap into a drag and the post-drag click-swallow would
      // eat the spend.
      if (e.target.closest('button, input, .sp-plus')) return;
      const spell = getSpell();
      if (!spell) return;
      if (document.pointerLockElement) document.exitPointerLock();
      const startX = e.clientX, startY = e.clientY, pointerId = e.pointerId;
      let ghost = null, dragging = false, gx = e.clientX, gy = e.clientY;
      try { el.setPointerCapture(pointerId); } catch (_) { /* ignore */ }
      const clearHovers = () => document.querySelectorAll('.drop-hover').forEach((s) => s.classList.remove('drop-hover'));
      const placeGhost = () => { if (ghost) ghost.style.transform = `translate3d(${gx}px, ${gy}px, 0) translate(-50%, -50%)`; };
      // Larger threshold on touch (finger jitter) than mouse, so a tap never
      // accidentally becomes a drag.
      const DRAG_PX = (e.pointerType === 'touch') ? 12 : 5;
      const onMove = (ev) => {
        gx = ev.clientX; gy = ev.clientY;
        if (!dragging) {
          if (Math.hypot(ev.clientX - startX, ev.clientY - startY) < DRAG_PX) return;
          dragging = true;
          ghost = document.createElement('div');
          ghost.className = 'drag-ghost';
          ghost.innerHTML = spell.iconHtml || spell.icon || '';
          document.body.appendChild(ghost);
          el.classList.add('drag-source');
          placeGhost();
          requestAnimationFrame(() => ghost && ghost.classList.add('shown'));
        }
        placeGhost();
        clearHovers();
        const tgt = this._dropTargetUnder(document.elementFromPoint(ev.clientX, ev.clientY));
        if (tgt.kind === 'hotbar' && tgt.el) tgt.el.classList.add('drop-hover');
      };
      const onUp = (ev) => {
        el.removeEventListener('pointermove', onMove);
        el.removeEventListener('pointerup', onUp);
        el.removeEventListener('pointercancel', onUp);
        try { el.releasePointerCapture(ev.pointerId); } catch (_) { /* ignore */ }
        clearHovers();
        if (dragging) {
          // Swallow only a click on the row itself (not a child button, which we
          // never started a drag from anyway).
          const swallow = (ce) => { if (!ce.target.closest('button, input, .sp-plus')) { ce.stopPropagation(); ce.preventDefault(); } };
          el.addEventListener('click', swallow, { capture: true, once: true });
          setTimeout(() => el.removeEventListener('click', swallow, { capture: true }), 0);
          const tgt = this._dropTargetUnder(document.elementFromPoint(ev.clientX, ev.clientY));
          if (tgt.kind === 'hotbar' && this.hooks.assignSpellToSlot) this.hooks.assignSpellToSlot(tgt.idx, spell);
        }
        if (ghost) ghost.remove();
        el.classList.remove('drag-source');
      };
      el.addEventListener('pointermove', onMove);
      el.addEventListener('pointerup', onUp);
      el.addEventListener('pointercancel', onUp);
    });
  }

  // Shared pointer-drag machinery. `resolve()` returns { item, from } at
  // drag-start, or null to cancel (e.g. an empty equipment slot).
  _bindDrag(el, resolve) {
    el.style.touchAction = 'none';
    el.style.userSelect = 'none';
    el.addEventListener('pointerdown', (e) => {
      if (e.button !== undefined && e.button !== 0) return;
      const resolved = resolve();
      if (!resolved) return;
      const { item, from } = resolved;
      // On desktop the mouse is pointer-locked to the canvas for look control;
      // while locked there's no free cursor and clientX/Y don't move, so a drag
      // ghost couldn't follow the mouse. Release the lock the moment you grab an
      // item so the cursor is free and the ghost tracks it (Tibia-style).
      if (document.pointerLockElement) document.exitPointerLock();
      const startX = e.clientX, startY = e.clientY;
      const pointerId = e.pointerId;
      let ghost = null, dragging = false;
      // Capture immediately so a fast flick doesn't escape the cell before we
      // cross the drag threshold; we still let the click through unless a real
      // drag happened (see the click-suppressor on pointerup).
      try { el.setPointerCapture(pointerId); } catch (_) { /* ignore */ }

      const clearHovers = () => {
        document.querySelectorAll('.drop-hover').forEach((s) => s.classList.remove('drop-hover'));
      };

      // Reused position so the ghost follows the cursor via a compositor-only
      // transform (no layout thrash) — smooth like Tibia's drag.
      let gx = e.clientX, gy = e.clientY;
      const placeGhost = () => {
        if (ghost) ghost.style.transform = `translate3d(${gx}px, ${gy}px, 0) translate(-50%, -50%)`;
      };
      const onMove = (ev) => {
        gx = ev.clientX; gy = ev.clientY;
        if (!dragging) {
          if (Math.hypot(ev.clientX - startX, ev.clientY - startY) < 5) return;
          dragging = true;
          this.dragItem = item;
          this.hideTooltip();
          ghost = document.createElement('div');
          ghost.className = 'drag-ghost';
          ghost.innerHTML = itemIcon(item);
          document.body.appendChild(ghost);
          // Dim the source cell while it's being carried (Tibia picks the item up).
          el.classList.add('drag-source');
          placeGhost();
          // Pop-in next frame so the CSS transition runs.
          requestAnimationFrame(() => ghost && ghost.classList.add('shown'));
        }
        placeGhost();
        const over = document.elementFromPoint(ev.clientX, ev.clientY);
        clearHovers();
        const tgt = this._dropTargetUnder(over);
        if (tgt.el) tgt.el.classList.add('drop-hover');
        ghost.classList.toggle('to-world', tgt.kind === 'world');
      };

      const onUp = (ev) => {
        el.removeEventListener('pointermove', onMove);
        el.removeEventListener('pointerup', onUp);
        el.removeEventListener('pointercancel', onUp);
        try { el.releasePointerCapture(ev.pointerId); } catch (_) { /* ignore */ }
        clearHovers();
        if (dragging) {
          // Swallow the click the browser fires after a drag, so the drop
          // doesn't also trigger the cell's click handler (e.g. open bag). If no
          // click follows (pointer released off the cell), drop the suppressor
          // next tick so it can't eat a later, legitimate click.
          const swallow = (ce) => { ce.stopPropagation(); ce.preventDefault(); };
          el.addEventListener('click', swallow, { capture: true, once: true });
          setTimeout(() => el.removeEventListener('click', swallow, { capture: true }), 0);
          const over = document.elementFromPoint(ev.clientX, ev.clientY);
          this._handleDrop(item, from, this._dropTargetUnder(over));
        }
        if (ghost) ghost.remove();
        el.classList.remove('drag-source');
        this.dragItem = null;
      };

      el.addEventListener('pointermove', onMove);
      el.addEventListener('pointerup', onUp);
      el.addEventListener('pointercancel', onUp);
    });
  }

  // Classify what's under the cursor into a drop target. Returns { kind, el, ... }
  // kind: 'hotbar' (slot idx), 'cell' (loc {c,i}), 'window' (loc, append), 'equip'
  // (slot), 'none' (a no-op inside the UI), or 'world' (toss on the ground).
  _dropTargetUnder(over) {
    if (!over || !over.closest) return { kind: 'world' };
    const hb = over.closest('.hb-slot');
    if (hb) return { kind: 'hotbar', el: hb, idx: [...hb.parentNode.children].indexOf(hb) };
    const eq = over.closest('#paperdoll .slot');
    if (eq) return { kind: 'equip', el: eq, slot: eq.getAttribute('data-slot') };
    const cell = over.closest('.bp-cell');
    if (cell && cell.dataset.ref != null) {
      const c = cell.dataset.ref === 'main' ? 'main' : Number(cell.dataset.ref);
      return { kind: 'cell', el: cell, loc: { c, i: Number(cell.dataset.idx) } };
    }
    const win = over.closest('.win[data-ref]');
    if (win) {
      const c = win.dataset.ref === 'main' ? 'main' : Number(win.dataset.ref);
      return { kind: 'window', el: win, loc: { c, i: null } }; // append to end
    }
    if (over.closest('.win') || over.closest('#hotbar')) return { kind: 'none' };
    return { kind: 'world' };
  }

  // Carry out a drop. Stack splits prompt for a quantity first; everything else
  // resolves through the matching hook. Source `from` is a { c, i } location.
  _handleDrop(item, from, tgt) {
    if (tgt.kind === 'hotbar' && this.hooks.assignDraggedToSlot) {
      this.hooks.assignDraggedToSlot(tgt.idx, item);
      return;
    }
    if (tgt.kind === 'world' && this.hooks.dropItem) {
      const bagRef = from.c === 'main' ? undefined : from.c;
      this._dropWithPrompt(item, from.i, bagRef);
      return;
    }
    if (tgt.kind === 'equip') {
      this.hooks.moveItem(from, { c: 'equip:' + tgt.slot, i: 0 }, null);
      return;
    }
    if (tgt.kind === 'cell' || tgt.kind === 'window') {
      const to = tgt.loc;
      // Dropping onto its own cell is a no-op.
      if (to.c === from.c && to.i === from.i) return;
      const stackable = item.kind === 'coin' && (item.count || 1) > 1;
      const ontoSameStack = tgt.kind === 'cell' && this._itemAtLoc(to) &&
        this._itemAtLoc(to).baseId === item.baseId && this._itemAtLoc(to) !== item;
      if (stackable && !ontoSameStack) {
        // Offer to split: ask how many to move.
        this._promptSplit(item, (n) => this.hooks.moveItem(from, to, n));
        return;
      }
      this.hooks.moveItem(from, to, null);
    }
  }

  _itemAtLoc(loc) {
    return this.inv.itemAt ? this.inv.itemAt(loc) : null;
  }

  // Ask how many of a stack to move, then call onConfirm(n). A slider + number
  // input default to the whole stack; confirming moves that many.
  _promptSplit(item, onConfirm, title) {
    const max = item.count || 1;
    const card = this.refs.contextCard;
    card.innerHTML = `<div class="ctx-head">${title || t('split') || 'Split'}</div>
      <div class="ctx-body">${item.name} · ${max}</div>`;
    const row = document.createElement('div');
    row.className = 'split-row';
    const range = document.createElement('input');
    range.type = 'range'; range.min = '1'; range.max = String(max); range.value = String(max);
    const num = document.createElement('input');
    num.type = 'number'; num.min = '1'; num.max = String(max); num.value = String(max);
    num.className = 'split-num';
    range.addEventListener('input', () => { num.value = range.value; });
    num.addEventListener('input', () => {
      let v = Math.max(1, Math.min(max, Math.floor(+num.value || 1)));
      num.value = String(v); range.value = String(v);
    });
    row.appendChild(range); row.appendChild(num);
    card.appendChild(row);
    const actions = document.createElement('div');
    actions.className = 'ctx-actions';
    const ok = document.createElement('button');
    ok.textContent = t('confirm') || 'OK';
    ok.addEventListener('click', () => {
      const n = Math.max(1, Math.min(max, Math.floor(+num.value || max)));
      this.closeContext();
      onConfirm(n >= max ? null : n); // moving all => no split
    });
    const cancel = document.createElement('button');
    cancel.textContent = t('close');
    cancel.className = 'ctx-close';
    cancel.addEventListener('click', () => this.closeContext());
    actions.appendChild(ok); actions.appendChild(cancel);
    card.appendChild(actions);
    card.classList.remove('hidden');
  }

  // Drop an item to the ground. For a stack (count > 1) it first asks HOW MANY to
  // throw, so you never accidentally drop the whole pile; a single item drops at
  // once. `bagRef` is undefined for the main backpack, else the nested-bag index.
  _dropWithPrompt(item, i, bagRef) {
    if (!this.hooks.dropItem) return false;
    if ((item.count || 1) > 1) {
      this._promptSplit(item, (n) => this.hooks.dropItem(i, bagRef, n), t('dropHowMany') || '¿Cuántos tirar?');
      return true;   // a quantity dialog is now showing in the context card
    }
    this.hooks.dropItem(i, bagRef);
    return false;
  }

  // True when releasing here should toss the item into the world rather than
  // move it within the UI. Kept for callers that still use it.
  _isWorldTarget(el) {
    return this._dropTargetUnder(el).kind === 'world';
  }

  itemDetails(item) {
    const icon = item.kind === 'potion' && item.icon ? item.icon + ' ' : '';
    const lines = [`<b class="${rarityClass(item)}">${icon}${item.name}</b>`];
    if (item.kind === 'coin') {
      lines.push(`${item.count} × ${t('gold')}`);
      if (item.count >= 100 && (item.tier || 0) < 4) lines.push(`🔼 ${t('convertCoin')}`);
      return lines.join('<br>');
    }
    if (item.kind === 'potion') {
      const tgt = item.restoreType === 'hp' ? t('hp') : item.restoreType === 'mana' ? t('mana') : `${t('hp')} + ${t('mana')}`;
      const amount = item.restorePct ? `${Math.round(item.restorePct * 100)}%` : item.restore;
      lines.push(`✚ ${t('restores')} ${amount} ${tgt}`);
      if ((item.count || 1) > 1) lines.push(`× ${item.count}`);
    }
    if (item.atk != null) lines.push(`${t('attack')}: ${item.atk}`);
    if (item.arrowAtk) lines.push(`${t('attack')}: +${item.arrowAtk}`);
    if (item.defense) lines.push(`${t('defense')}: ${item.defense}`);
    if (item.element && item.element !== 'none') lines.push(`${t('element')}: ${elementName(item.element)}`);
    if (item.speedBonus) lines.push(`+${Math.round(item.speedBonus * 100)}% ${t('boots') || ''}`.trim());
    if (item.ability) lines.push(`✨ ${item.ability.name}`);
    if (item.levelReq > 1) lines.push(`${t('levelReq')}: ${item.levelReq}`);
    // Weight: for a bag, show the full loaded weight (shell + contents) so it's
    // clear what you (or anyone picking it up) must be able to carry.
    const full = itemWeight(item);
    if (full) {
      const base = (item.weight || 0) * (item.count || 1);
      lines.push(full !== base ? `${t('weight')}: ${full} (${base} + ${full - base})` : `${t('weight')}: ${full}`);
    }
    return lines.join('<br>');
  }

  // Plain Tibia-style INFO block for the left-click card: name + stats + weight,
  // text only, NO icons/emoji. Used by openItemInfo.
  infoDetails(item) {
    const L = [];
    const r = (a, b) => (a === b ? `${a}` : `${a}-${b}`);
    const type = item.type === 'armor' ? (t(item.slot) || item.slot)
      : item.type === 'quiver' ? t('quiver')
      : item.type === 'weapon' || ['sword', 'axe', 'mace', 'lance', 'bow', 'wand'].includes(item.type) ? t('weapon')
      : item.type === 'shield' ? t('shield')
      : item.type === 'container' ? t('bag')
      : item.kind === 'potion' ? t('potion')
      : item.kind === 'coin' ? t('gold')
      : item.kind === 'light' ? t('light')
      : '';
    if (type) L.push(type);
    if (item.kind === 'coin') { L.push(`${item.count} × ${t('gold')}`); return L.join('<br>'); }
    if (item.kind === 'potion') {
      const tgt = item.restoreType === 'hp' ? t('hp') : item.restoreType === 'mana' ? t('mana') : `${t('hp')} + ${t('mana')}`;
      L.push(`${t('restores')} ${item.restorePct ? Math.round(item.restorePct * 100) + '%' : item.restore} ${tgt}`);
    }
    if (item.atk != null) L.push(`${t('attack')}: ${item.atk}`);
    if (item.atkMin != null || item.atkMax != null) L.push(`${t('attack')}: ${r(item.atkMin || 0, item.atkMax || item.atkMin || 0)}`);
    if (item.arrowAtk) L.push(`${t('attack')}: +${item.arrowAtk}`);
    if (item.defense) L.push(`${t('defense')}: ${item.defense}`);
    if (item.element && item.element !== 'none') L.push(`${t('element')}: ${elementName(item.element)}`);
    if (item.twoHanded) L.push(t('stTwoH'));
    if (item.speedBonus) L.push(`+${Math.round(item.speedBonus * 100)}% ${t('speed') || ''}`.trim());
    if (item.magicLevelBonus) L.push(`+${item.magicLevelBonus} ${t('magic') || 'magic'}`);
    if (item.skillBonus) for (const k in item.skillBonus) L.push(`+${item.skillBonus[k]} ${t(k) || k}`);
    if (item.hpRegenPerSec) L.push(`+${item.hpRegenPerSec} ${t('hp')}/s`);
    if (item.manaRegenPerSec) L.push(`+${item.manaRegenPerSec} ${t('mana')}/s`);
    if (item.capacity) L.push(`${item.capacity} ${t('stSlots')}`);
    if (item.ability) L.push(esc(item.ability.name));   // ability.name from DB items — escape
    if (item.levelReq > 1) L.push(`${t('levelReq')}: ${item.levelReq}`);
    const full = itemWeight(item);
    if (full) L.push(`${t('weight')}: ${full}`);
    return L.join('<br>');
  }

  showTooltip(item, anchor) {
    let tip = this.refs.tooltip;
    if (!tip) {
      tip = document.createElement('div');
      tip.id = 'tooltip';
      document.body.appendChild(tip);
      this.refs.tooltip = tip;
    }
    tip.innerHTML = this.itemDetails(item);
    const r = anchor.getBoundingClientRect();
    tip.style.left = (r.left - 8) + 'px';
    tip.style.top = (r.top - 8) + 'px';
    tip.classList.add('show');
  }

  hideTooltip() {
    if (this.refs.tooltip) this.refs.tooltip.classList.remove('show');
  }

  openContext(item, actions, opts = {}) {
    const card = this.refs.contextCard;
    const body = opts.info ? this.infoDetails(item) : this.itemDetails(item);
    // item.name may have been crafted on a traded/bought item — escape it.
    card.innerHTML = `<div class="ctx-head ${rarityClass(item)}">${esc(item.name)}</div>
      <div class="ctx-body">${body}</div>`;
    const row = document.createElement('div');
    row.className = 'ctx-actions';
    for (const a of actions) {
      const b = document.createElement('button');
      b.textContent = a.label;
      if (a.primary) b.className = 'ctx-primary';   // highlight the main Equip/Use/Open
      // An action that returns true is opening its OWN dialog in this same card
      // (e.g. "Drop" asking how many) — don't close it out from under itself.
      b.addEventListener('click', () => { if (a.fn() !== true) this.closeContext(); });
      row.appendChild(b);
    }
    card.appendChild(row);
    this.addCloseX(card);
    card.classList.remove('hidden');
  }

  closeContext() {
    this.refs.contextCard.classList.add('hidden');
  }

  // Pin a close "✕" to the top-right corner of a context dialog. Replaces the
  // old full-width "Close" buttons everywhere (shops, vendors, NPC chat, depot,
  // teleport, …) with a single consistent corner control.
  addCloseX(card) {
    const x = document.createElement('button');
    x.className = 'ctx-x';
    x.textContent = '✕';
    x.title = t('close');
    x.setAttribute('aria-label', t('close'));
    x.addEventListener('click', () => this.closeContext());
    card.appendChild(x);
    return x;
  }

  // A short stat line for a shop/vendor item def (weapon attack/element, shield &
  // armor defense, potion restore, container slots). Returns '' when there's
  // nothing meaningful to show. Bilingual via the i18n table.
  itemStatLine(def) {
    const parts = [];
    const r = (a, b) => (a === b ? `${a}` : `${a}–${b}`);
    if (def.atkMin != null || def.atkMax != null) {
      parts.push(`<span class="st">⚔ ${t('stAtk')} ${r(def.atkMin || 0, def.atkMax || def.atkMin || 0)}</span>`);
    }
    if (def.arrowAtk) parts.push(`<span class="st">⚔ ${t('stAtk')} +${def.arrowAtk}</span>`);
    if (def.defense) parts.push(`<span class="st">🛡 ${t('stDef')} ${def.defense}</span>`);
    if (def.element && def.element !== 'none') parts.push(`<span class="st">✦ ${elementName(def.element)}</span>`);
    if (def.twoHanded) parts.push(`<span class="st">✋ ${t('stTwoH')}</span>`);
    if (def.kind === 'potion') {
      const rt = t('rt_' + (def.restoreType || 'hp'));
      if (def.restorePct) parts.push(`<span class="st">✚ +${Math.round(def.restorePct * 100)}% ${rt}</span>`);
      else if (def.restore) parts.push(`<span class="st">✚ +${def.restore} ${rt}</span>`);
    }
    if (def.capacity) parts.push(`<span class="st">🎒 ${def.capacity} ${t('stSlots')}</span>`);
    if (def.speedBonus) parts.push(`<span class="st">👟 +${def.speedBonus}</span>`);
    if (def.levelReq && def.levelReq > 1) parts.push(`<span class="st">★ ${t('stLvl')} ${def.levelReq}</span>`);
    if (def.weight) parts.push(`<span class="st">⚖ ${def.weight}</span>`);
    return parts.length ? `<div class="shop-stats">${parts.join('')}</div>` : '';
  }

  // Sort a shop/vendor stock list by level requirement then price, so cheap
  // low-level goods come first and pricey high-level gear last.
  sortStock(stock, priceOf) {
    return [...stock].sort((a, b) =>
      (a.levelReq || 1) - (b.levelReq || 1) || (priceOf(a) - priceOf(b)));
  }

  // "Are you sure?" confirm dialog before a purchase. Shows the item, its price
  // and stats; Confirm runs `onConfirm`, the X / Cancel returns to `back`.
  confirmBuy(def, label, price, onConfirm, back) {
    const card = this.refs.contextCard;
    card.innerHTML = `<div class="ctx-head">${t('confirmBuyTitle')}</div>
      <div class="ctx-body"><span class="row-ico">${iconFor(def)}</span> ${label}<br>
        <b class="price">${price} 💰</b></div>${this.itemStatLine(def)}`;
    const actions = document.createElement('div');
    actions.className = 'ctx-actions';
    const yes = document.createElement('button');
    yes.textContent = t('confirmBuyYes');
    yes.addEventListener('click', () => { onConfirm(); });
    const no = document.createElement('button');
    no.className = 'ctx-close';
    no.textContent = t('cancel') || 'Cancelar';
    no.addEventListener('click', () => back());
    actions.append(yes, no);
    card.appendChild(actions);
    this.addCloseX(card);
    card.classList.remove('hidden');
  }

  toast(msg, kind) {
    const el = document.createElement('div');
    el.className = 'toast' + (kind ? ' ' + kind : '');
    el.textContent = msg;
    this.refs.toastStack.appendChild(el);
    setTimeout(() => { el.classList.add('fade'); }, 2600);
    setTimeout(() => { el.remove(); }, 3200);
  }

  // Shop dialog: buy basic gear with gold. Stock is sorted by level then price;
  // unaffordable rows are disabled; buying asks for confirmation first.
  openShop(city) {
    const stock = this.sortStock(shopStock(), (d) => d.value);
    const card = this.refs.contextCard;
    card.innerHTML = `<div class="ctx-head">${t('shop')} · ${city.name}</div>
      <div class="ctx-gold">💰 ${t('yourGold')}: <b>${mmCoins(this.inv.gold)}</b></div>`;
    const list = document.createElement('div');
    list.className = 'shop-list';
    const lang = getLang();
    for (const def of stock) {
      const item = document.createElement('div');
      const row = document.createElement('div');
      row.className = 'shop-row';
      // Potions carry a bilingual {es,en} name and an icon; gear uses a string.
      const label = typeof def.name === 'string' ? def.name : (def.name[lang] || def.name.es);
      const afford = this.inv.gold >= def.value;
      row.innerHTML = `<span><span class="row-ico">${iconFor(def)}</span> ${label}</span><span class="price${afford ? '' : ' price-no'}">${def.value} 💰</span>`;
      const buy = document.createElement('button');
      buy.textContent = t('buy');
      buy.disabled = !afford;                       // can't afford → greyed out
      buy.addEventListener('click', () => this.confirmBuy(
        def, label, def.value,
        () => this.hooks.buy(def, () => this.openShop(city)),
        () => this.openShop(city)));
      row.appendChild(buy);
      item.appendChild(row);
      item.insertAdjacentHTML('beforeend', this.itemStatLine(def));
      list.appendChild(item);
    }
    card.appendChild(list);
    this.addCloseX(card);
    card.classList.remove('hidden');
  }

  // Vendor dialog: a specialized merchant NPC with its own stock. Shows a Buy
  // section (the vendor's catalog) and a Sell section (backpack items it accepts).
  openVendor(npc) {
    const shop = npc.shop || {};
    const lang = getLang();
    const card = this.refs.contextCard;
    card.innerHTML = `<div class="ctx-head">${npc.name}</div>
      <div class="ctx-gold">💰 ${t('yourGold')}: <b>${mmCoins(this.inv.gold)}</b></div>`;

    const stock = this.sortStock(shopStockFor(shop), (d) => buyPrice(shop, d));
    if (stock.length) {
      const buyHead = document.createElement('div');
      buyHead.className = 'ctx-sub'; buyHead.textContent = t('buy');
      card.appendChild(buyHead);
      const list = document.createElement('div');
      list.className = 'shop-list';
      for (const def of stock) {
        const item = document.createElement('div');
        const row = document.createElement('div');
        row.className = 'shop-row';
        const label = typeof def.name === 'string' ? def.name : (def.name[lang] || def.name.es);
        const price = buyPrice(shop, def);
        const afford = this.inv.gold >= price;
        row.innerHTML = `<span><span class="row-ico">${iconFor(def)}</span> ${label}</span><span class="price${afford ? '' : ' price-no'}">${price} 💰</span>`;
        const buy = document.createElement('button');
        buy.textContent = t('buy');
        buy.disabled = !afford;
        buy.addEventListener('click', () => this.confirmBuy(
          def, label, price,
          () => this.hooks.buy(def, () => this.openVendor(npc), price),
          () => this.openVendor(npc)));
        row.appendChild(buy);
        item.appendChild(row);
        item.insertAdjacentHTML('beforeend', this.itemStatLine(def));
        list.appendChild(item);
      }
      card.appendChild(list);
    }

    // Sell section: backpack items this vendor is willing to buy.
    const sellable = this.inv.backpack
      .map((it, i) => ({ it, i }))
      .filter(({ it }) => vendorBuysItem(shop, it));
    if (sellable.length) {
      const sellHead = document.createElement('div');
      sellHead.className = 'ctx-sub'; sellHead.textContent = t('sell');
      card.appendChild(sellHead);
      const list = document.createElement('div');
      list.className = 'shop-list';
      for (const { it, i } of sellable) {
        const row = document.createElement('div');
        row.className = 'shop-row';
        const label = itemDisplayName(it);    // shows the count for stacks
        const price = shop.rarity ? collectorPrice(it) : sellPrice(shop, it);
        row.innerHTML = `<span><span class="row-ico">${iconFor(it)}</span> ${label}</span><span class="price">+${mmCoins(price)} 💰</span>`;
        const sell = document.createElement('button');
        sell.textContent = t('sell');
        sell.addEventListener('click', () => this.hooks.sell(i, npc, () => this.openVendor(npc)));
        row.appendChild(sell);
        list.appendChild(row);
      }
      card.appendChild(list);
    }

    if (!stock.length && !sellable.length) {
      const empty = document.createElement('div');
      empty.className = 'ctx-sub';
      empty.textContent = npc.lines ? (npc.lines[lang] || npc.lines.es || [''])[0] : '';
      card.appendChild(empty);
    }

    this.addCloseX(card);
    card.classList.remove('hidden');
  }

  // Mount vendor (stable master): sells the two `source:'shop'` mounts. `mounts`
  // is the MountSystem (to show owned state); hooks.buy(mount) purchases one.
  openMountVendor(npc, stock, mounts, hooks) {
    const lang = getLang();
    const card = this.refs.contextCard;
    card.innerHTML = `<div class="ctx-head">🐎 ${npc.name}</div>
      <div class="ctx-gold">💰 ${t('yourGold')}: <b>${mmCoins(this.inv.gold)}</b></div>
      <div class="ctx-sub">${t('mountStat')}</div>`;
    const list = document.createElement('div');
    list.className = 'shop-list mount-list';
    for (const m of stock) {
      const owned = mounts.has(m.id);
      const afford = this.inv.gold >= m.cost;
      const row = document.createElement('div');
      row.className = 'shop-row mount-row';
      const name = m.name[lang] || m.name.es;
      const desc = (m.desc && (m.desc[lang] || m.desc.es)) || '';
      row.innerHTML = `<div class="mount-info"><b>${name}</b>` +
        `<span class="mount-desc">${desc}</span></div>` +
        `<span class="price${afford || owned ? '' : ' price-no'}">${owned ? '✔' : m.cost + ' 💰'}</span>`;
      const buy = document.createElement('button');
      buy.textContent = owned ? t('active') : t('buy');
      buy.disabled = owned || !afford;
      if (!owned) buy.addEventListener('click', () => hooks.buy(m));
      row.appendChild(buy);
      list.appendChild(row);
    }
    card.appendChild(list);
    this.addCloseX(card);
    card.classList.remove('hidden');
  }

  // Mounts panel: every mount (owned highlighted, locked greyed), pick the active
  // one and mount/dismount. `all` is the full MOUNTS list; `mounts` is the system.
  openMountsPanel(mounts, all, hooks) {
    const lang = getLang();
    const card = this.refs.contextCard;
    card.innerHTML = `<div class="ctx-head">🐎 ${t('mountsTitle')}</div>
      <div class="ctx-sub">${t('mountStat')} · ${t('pressGToMount')}</div>`;
    const ownedCount = mounts.ownedList().length;
    if (!ownedCount) {
      const empty = document.createElement('div');
      empty.className = 'ctx-body';
      empty.textContent = t('noMounts');
      card.appendChild(empty);
    }
    const list = document.createElement('div');
    list.className = 'shop-list mount-list';
    for (const m of all) {
      const owned = mounts.has(m.id);
      const isActive = mounts.activeId === m.id;
      const row = document.createElement('div');
      row.className = 'shop-row mount-row' + (owned ? '' : ' mount-locked') + (isActive ? ' mount-active' : '');
      const name = m.name[lang] || m.name.es;
      const source = m.source === 'shop' ? t('mountFromShop') : t('mountFromQuest', m.levelReq);
      const tag = owned ? (isActive ? `<span class="mount-tag">${t('active')}</span>` : '') : `<span class="mount-tag locked">🔒 ${t('locked')}</span>`;
      row.innerHTML = `<div class="mount-info"><b>${name}</b> ${tag}` +
        `<span class="mount-desc">${owned ? ((m.desc && (m.desc[lang] || m.desc.es)) || '') : source}</span></div>`;
      if (owned) {
        const btn = document.createElement('button');
        if (isActive) {
          btn.textContent = mounts.isMounted() ? t('dismounted') : t('mount');
          btn.addEventListener('click', () => hooks.toggle());
        } else {
          btn.textContent = t('equip');
          btn.addEventListener('click', () => hooks.select(m.id));
        }
        row.appendChild(btn);
      }
      list.appendChild(row);
    }
    card.appendChild(list);
    this.addCloseX(card);
    card.classList.remove('hidden');
  }

  // Teleport portal: pick another city to travel to. Each destination shows its
  // RECOMMENDED level; if the player is under it, the level reads red and a
  // "you're not strong enough yet — go anyway?" confirm appears before travelling
  // (it's a warning, never a hard block — walking is always free).
  openTeleport(city, onTravel) {
    this._renderTeleportList(city, onTravel);
  }

  _renderTeleportList(city, onTravel) {
    const card = this.refs.contextCard;
    card.innerHTML = `<div class="ctx-head">🌀 ${t('teleport')}</div>
      <div class="ctx-sub">${t('teleportHint')}</div>`;
    const list = document.createElement('div');
    list.className = 'shop-list';
    for (const dest of CITIES) {
      if (dest.id === city.id) continue;
      const rec = cityRecLevel(dest);
      const under = this.level < rec;
      const row = document.createElement('div');
      row.className = 'shop-row';
      // City name + a recommended-level tag (red when the player is below it).
      const recTag = rec > 1
        ? `<span class="tele-rec${under ? ' tele-rec-low' : ''}">${t('recLevel', rec)}</span>`
        : '';
      row.innerHTML = `<span>🏛️ ${dest.name} ${recTag}</span>`;
      const go = document.createElement('button');
      go.textContent = t('travel');
      go.addEventListener('click', () => {
        if (under) this._confirmTeleport(city, dest, rec, onTravel);
        else onTravel(dest);
      });
      row.appendChild(go);
      list.appendChild(row);
    }
    card.appendChild(list);
    this.addCloseX(card);
    card.classList.remove('hidden');
  }

  // "Too weak" confirm: warn the player and let them go anyway or back out to the
  // city list. Reuses the same context card.
  _confirmTeleport(city, dest, rec, onTravel) {
    const card = this.refs.contextCard;
    card.innerHTML = `<div class="ctx-head">${t('tooWeakTitle')}</div>
      <div class="ctx-body">${t('tooWeakBody', dest.name, rec, this.level)}</div>`;
    const actions = document.createElement('div');
    actions.className = 'ctx-actions';
    const go = document.createElement('button');
    go.className = 'danger';
    go.textContent = t('travelAnyway');
    go.addEventListener('click', () => onTravel(dest));
    const back = document.createElement('button');
    back.textContent = t('cancelTravel');
    back.addEventListener('click', () => this._renderTeleportList(city, onTravel));
    actions.append(go, back);
    card.appendChild(actions);
    this.addCloseX(card);
    card.classList.remove('hidden');
  }

  // Town Hall residency: the mayor's greeting + a button to settle here. If the
  // player already lives here, the button is shown as already-done.
  openResidency(npc, city, isHome, onSettle) {
    const lang = getLang();
    const card = this.refs.contextCard;
    const greeting = npc.greeting ? (npc.greeting[lang] || npc.greeting.es) : '';
    card.innerHTML = `<div class="ctx-head">🏛️ ${npc.name}</div>
      <div class="ctx-body">${greeting}</div>
      <div class="ctx-sub">${t('residencyHint', city.name)}</div>`;
    const actions = document.createElement('div');
    actions.className = 'ctx-actions';
    const btn = document.createElement('button');
    if (isHome) {
      btn.textContent = t('residencyAlready');
      btn.disabled = true;
      btn.style.opacity = '0.6';
      btn.style.cursor = 'default';
    } else {
      btn.textContent = t('residencySettle');
      btn.addEventListener('click', () => { onSettle(); this.openResidency(npc, city, true, onSettle); });
    }
    actions.appendChild(btn);
    card.appendChild(actions);
    this.addCloseX(card);
    card.classList.remove('hidden');
  }

  // ===================== HOUSES =====================

  // Buy dialog for an unowned lot: size, floors, basement, showcase capacity,
  // price, and a Buy button (greyed if you can't afford or already own a house).
  openHouseBuy(lot, gold, hooks) {
    const card = this.refs.contextCard;
    const price = housePrice(lot);
    const sizeLabel = t(houseSizeKey(lot));
    const floors = (lot.floors || 1) >= 2 ? t('houseFloors', lot.floors) : t('houseFloor1');
    const basement = lot.basement ? ' · ' + t('houseBasement') : '';
    const cap = showcaseCapacity(lot);
    const free = price <= 0;
    const afford = free || gold >= price;
    // Free (testing) houses show a "Free" tag and a plain Buy; otherwise the price.
    // When you can't afford a priced house: red price + an explicit "not enough
    // gold" line and a disabled, greyed-out buy button (the standard look).
    const noGoldLine = afford ? '' : `<div class="ctx-sub price-no">⛔ ${t('noGold')}</div>`;
    const priceLine = free
      ? `<div class="ctx-body"><b class="price">✅ ${t('houseFree')}</b></div>`
      : `<div class="ctx-body"><b class="price${afford ? '' : ' price-no'}">${mmCoins(price)}</b></div>`;
    card.innerHTML = `<div class="ctx-head">🏠 ${t('houseBuyTitle')}</div>
      <div class="ctx-gold">💰 ${t('yourGold')}: <b>${mmCoins(gold)}</b></div>
      <div class="ctx-sub">${t('houseSize')}: <b>${sizeLabel}</b> · ${floors}${basement}</div>
      <div class="ctx-body">🖼️ ${t('houseShowcaseSlots', cap)}</div>
      ${priceLine}
      ${noGoldLine}`;
    const actions = document.createElement('div');
    actions.className = 'ctx-actions';
    const buy = document.createElement('button');
    buy.textContent = free ? t('houseBuyFree') : (afford ? t('houseBuyConfirm', mmCoins(price)) : t('noGold'));
    buy.disabled = !afford;
    buy.addEventListener('click', () => { if (afford) hooks.buy(); });
    actions.appendChild(buy);
    card.appendChild(actions);
    this.addCloseX(card);
    card.classList.remove('hidden');
  }

  // The owner's management menu: Enter, walls (showcase), colours, light, ban
  // list, and Sell house. Opens a tabbed-ish single card.
  openHouseManage(lot, store, hooks) {
    const card = this.refs.contextCard;
    card.innerHTML = `<div class="ctx-head">🏠 ${t('houseYours')}</div>`;
    // Enter button.
    const actions = document.createElement('div');
    actions.className = 'ctx-actions';
    const enter = document.createElement('button');
    enter.textContent = '🚪 ' + t('houseEnter');
    enter.addEventListener('click', () => { hooks.enter(); this.closeContext(); });
    actions.appendChild(enter);
    card.appendChild(actions);

    // Colours (exterior + interior).
    card.appendChild(this._houseColorSection(lot, store, hooks));

    // Facade display (front-wall showcase, visible from outside).
    card.appendChild(this._houseFacadeSection(lot, store, hooks));

    // Light temperature.
    const lightSec = document.createElement('div');
    lightSec.className = 'house-sec';
    lightSec.innerHTML = `<div class="ctx-sub">💡 ${t('houseLight')}</div>`;
    const lrow = document.createElement('div');
    lrow.className = 'house-lightrow';
    for (const temp of ['warm', 'cold']) {
      const b = document.createElement('button');
      b.className = 'house-lightbtn' + (store.light === temp ? ' on' : '');
      b.textContent = (temp === 'warm' ? '🔥 ' : '❄️ ') + t(temp === 'warm' ? 'houseLightWarm' : 'houseLightCold');
      b.addEventListener('click', () => { hooks.setLight(temp); this.openHouseManage(lot, store, hooks); });
      lrow.appendChild(b);
    }
    lightSec.appendChild(lrow);
    card.appendChild(lightSec);

    // Ban list / close-to-all.
    card.appendChild(this._houseBanSection(lot, store, hooks));

    // Sell house.
    const sellSec = document.createElement('div');
    sellSec.className = 'house-sec';
    const sellBtn = document.createElement('button');
    sellBtn.className = 'house-sellbtn';
    sellBtn.textContent = '💰 ' + t('houseSell') + ' (+' + mmCoins(Math.floor(housePrice(lot) / 2)) + ')';
    sellBtn.addEventListener('click', () => {
      this._confirmInline(t('houseSellConfirm', mmCoins(Math.floor(housePrice(lot) / 2))), () => hooks.sellHouse());
    });
    sellSec.appendChild(sellBtn);
    card.appendChild(sellSec);

    this.addCloseX(card);
    card.classList.remove('hidden');
  }

  // Colour swatch grid for one target key.
  _houseColorSection(lot, store, hooks) {
    const sec = document.createElement('div');
    sec.className = 'house-sec';
    sec.innerHTML = `<div class="ctx-sub">🎨 ${t('houseColors')}</div>`;
    const targets = [
      { key: 'wall', label: t('houseColorWalls'), group: 'ext' },
      { key: 'roof', label: t('houseColorRoof'), group: 'ext' },
      { key: 'door', label: t('houseColorDoor'), group: 'ext' },
      { key: 'trim', label: t('houseColorTrim'), group: 'ext' },
      { key: 'inWall', label: t('houseColorWalls'), group: 'int' },
      { key: 'inFloor', label: t('houseColorTrim'), group: 'int' },
    ];
    for (const grp of ['ext', 'int']) {
      const head = document.createElement('div');
      head.className = 'house-colhead';
      head.textContent = grp === 'ext' ? t('houseColorExterior') : t('houseColorInterior');
      sec.appendChild(head);
      for (const tg of targets.filter((x) => x.group === grp)) {
        const row = document.createElement('div');
        row.className = 'house-colrow';
        const lab = document.createElement('span');
        lab.className = 'house-collabel';
        lab.textContent = tg.label;
        row.appendChild(lab);
        const swatches = document.createElement('div');
        swatches.className = 'house-swatches';
        for (const hex of HOUSE_PALETTE) {
          const sw = document.createElement('button');
          sw.className = 'house-swatch' + (store.colors[tg.key] === hex ? ' on' : '');
          sw.style.background = '#' + (hex >>> 0).toString(16).padStart(6, '0');
          sw.title = '#' + (hex >>> 0).toString(16).padStart(6, '0');
          sw.addEventListener('click', () => { hooks.setColor(tg.key, hex); this.openHouseManage(lot, store, hooks); });
          swatches.appendChild(sw);
        }
        row.appendChild(swatches);
        sec.appendChild(row);
      }
    }
    return sec;
  }

  // Facade display: the two front-wall slots. Each shows the chosen item's icon
  // (or an empty "＋" to pick one). Display-only — the item stays in the backpack.
  _houseFacadeSection(lot, store, hooks) {
    const sec = document.createElement('div');
    sec.className = 'house-sec';
    sec.innerHTML = `<div class="ctx-sub">🪟 ${t('houseFacade')}</div>
      <div class="house-facadehint">${t('houseFacadeHint')}</div>`;
    const row = document.createElement('div');
    row.className = 'house-facaderow';
    for (let i = 0; i < FACADE_SLOTS; i++) {
      const item = store.facadeItem(i);
      const cell = document.createElement('button');
      cell.className = 'house-facadecell' + (item ? ' ' + rarityClass(item) : '');
      if (item) {
        cell.innerHTML = `<span class="ico">${iconFor(item)}</span>`;
        cell.title = itemDisplayName(item);    // "100 Crystal Coins" for stacks
        // Click a filled slot to clear it.
        cell.addEventListener('click', () => { hooks.clearFacade(i); this.openHouseManage(lot, store, hooks); });
      } else {
        cell.innerHTML = '<span class="ico">＋</span>';
        cell.title = t('houseFacadePick');
        cell.addEventListener('click', () => this._houseFacadePick(lot, store, hooks, i));
      }
      row.appendChild(cell);
    }
    sec.appendChild(row);
    return sec;
  }

  // Pick a backpack item to show in facade slot `index`.
  _houseFacadePick(lot, store, hooks, index) {
    const card = this.refs.contextCard;
    card.innerHTML = `<div class="ctx-head">🪟 ${t('houseFacadePick')}</div>`;
    const grid = document.createElement('div');
    grid.className = 'house-pickgrid';
    this.inv.backpack.forEach((it, i) => {
      if (it.kind === 'coin') return;   // coins aren't display pieces
      const cell = document.createElement('button');
      cell.className = 'house-pickcell ' + rarityClass(it);
      cell.innerHTML = `<span class="ico">${iconFor(it)}</span>`;
      cell.title = itemDisplayName(it);
      cell.addEventListener('click', () => { hooks.setFacade(index, i); this.openHouseManage(lot, store, hooks); });
      grid.appendChild(cell);
    });
    if (!grid.children.length) grid.innerHTML = `<div class="house-empty">${t('empty')}</div>`;
    card.appendChild(grid);
    this.addCloseX(card);
    card.classList.remove('hidden');
  }

  // Ban list: a "close to everyone" toggle plus an add-by-name field and the
  // current blocked players (each removable).
  _houseBanSection(lot, store, hooks) {
    const sec = document.createElement('div');
    sec.className = 'house-sec';
    sec.innerHTML = `<div class="ctx-sub">🚫 ${t('houseBanList')}</div>`;
    const closeRow = document.createElement('label');
    closeRow.className = 'house-closerow';
    const cb = document.createElement('input');
    cb.type = 'checkbox'; cb.checked = !!store.closed;
    cb.addEventListener('change', () => hooks.toggleClosed(cb.checked));
    closeRow.appendChild(cb);
    closeRow.appendChild(document.createTextNode(' ' + t('houseBanNobody')));
    sec.appendChild(closeRow);

    const addRow = document.createElement('div');
    addRow.className = 'house-banadd';
    const input = document.createElement('input');
    input.type = 'text'; input.placeholder = t('houseBanPlaceholder');
    input.className = 'house-baninput';
    const add = document.createElement('button');
    add.textContent = t('houseBanAdd');
    const doAdd = () => { const n = input.value.trim(); if (n) { hooks.ban(n); this.openHouseManage(lot, store, hooks); } };
    add.addEventListener('click', doAdd);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') doAdd(); });
    addRow.appendChild(input); addRow.appendChild(add);
    sec.appendChild(addRow);

    for (const name of store.bans) {
      const r = document.createElement('div');
      r.className = 'house-banrow';
      r.innerHTML = `<span>${esc(name)}</span>`;   // ban names aren't charset-checked — escape
      const rm = document.createElement('button');
      rm.textContent = '✕';
      rm.addEventListener('click', () => { hooks.unban(name); this.openHouseManage(lot, store, hooks); });
      r.appendChild(rm);
      sec.appendChild(r);
    }
    return sec;
  }

  // Owner clicked a showcase slot inside their house. Empty slot → pick a backpack
  // item to hang; filled slot → take it back, or toggle for-sale + set a price.
  // wallId/index identify the slot; reads live state from this.inv + the house hooks.
  openHouseSlot(wallId, index) {
    const card = this.refs.contextCard;
    const store = this.hooks.houseStore ? this.hooks.houseStore() : null;
    const slot = store ? store.slot(wallId, index) : null;
    card.innerHTML = `<div class="ctx-head">🖼️ ${t('houseWall', Number(wallId) + 1)}</div>`;

    if (!slot) {
      // Empty: show a grid of backpack items to place here.
      const sub = document.createElement('div');
      sub.className = 'ctx-sub'; sub.textContent = t('housePlaceItem');
      card.appendChild(sub);
      const grid = document.createElement('div');
      grid.className = 'house-pickgrid';
      // Every held item — WORN gear, top-level backpack, AND inside nested bags —
      // so the owner can hang anything they have (equipped pieces, trophies,
      // consumables, coins…). Hanging a worn piece unequips it first.
      const held = this.inv.allHeldItems ? this.inv.allHeldItems()
        : this.inv.backpack.map((item) => ({ item, bagIndex: -1, equipSlot: null }));
      held.forEach(({ item: it, equipSlot }) => {
        const cell = document.createElement('button');
        cell.className = 'house-pickcell ' + rarityClass(it) + (equipSlot ? ' worn' : '');
        const label = typeof it.name === 'string' ? it.name : (it.name[getLang()] || it.name.es);
        // A coin/potion stack shows its count; a worn piece shows a "⚔" badge so
        // the owner knows clicking it will take it off the character.
        const badge = it.count > 1 ? `<span class="count">${it.count}</span>`
          : (equipSlot ? `<span class="worn-badge">⚔</span>` : '');
        cell.innerHTML = `<span class="ico">${iconFor(it)}</span>${badge}`;
        cell.title = equipSlot ? `${label} (${t('equipped') || 'equipped'})` : label;
        cell.addEventListener('click', () => {
          this.hooks.houseHangItem(wallId, index, it);
          this.closeContext();
        });
        grid.appendChild(cell);
      });
      if (!grid.children.length) grid.innerHTML = `<div class="house-empty">${t('empty')}</div>`;
      card.appendChild(grid);
    } else {
      // Filled: show the item and let the owner take it back. Houses are
      // display-only now — selling moved to the city free market.
      const it = slot.item;
      const label = itemDisplayName(it);    // "100 Crystal Coins" for stacks
      card.insertAdjacentHTML('beforeend',
        `<div class="ctx-body ${rarityClass(it)}"><span class="row-ico">${iconFor(it)}</span> ${label}</div>`);
      card.insertAdjacentHTML('beforeend', this.itemDetails(it));

      const actions = document.createElement('div');
      actions.className = 'ctx-actions';
      const take = document.createElement('button');
      take.textContent = '🎒 ' + t('houseItemTake');
      take.addEventListener('click', () => { this.hooks.houseTakeItem(wallId, index); this.closeContext(); });
      actions.appendChild(take);
      card.appendChild(actions);
    }
    this.addCloseX(card);
    card.classList.remove('hidden');
  }

  // A visitor clicked a showcase slot. Houses are display-only, so this just
  // shows the item's stats and a note that only the owner may touch it.
  openHouseVisitorSlot(houseInterior, wallId, index) {
    const card = this.refs.contextCard;
    const snapshot = houseInterior.state;
    const arr = (snapshot.walls && snapshot.walls[wallId]) || [];
    const slot = arr[index];
    if (!slot || !slot.item) { this.closeContext(); return; }
    const it = slot.item;
    const label = itemDisplayName(it);    // "100 Crystal Coins" for stacks
    card.innerHTML = `<div class="ctx-head ${rarityClass(it)}">${label}</div>
      <div class="ctx-body"><span class="row-ico">${iconFor(it)}</span></div>`;
    card.insertAdjacentHTML('beforeend', this.itemDetails(it));
    card.insertAdjacentHTML('beforeend', `<div class="ctx-sub">${t('houseOnlyOwner')}</div>`);
    this.addCloseX(card);
    card.classList.remove('hidden');
  }

  // ---- Free market (city stalls) ------------------------------------------
  //
  // The DB is the source of truth (main.js fetches via auth.js, then calls these
  // synchronously with the listings already in hand). `listings` is the array of
  // rows for THIS stall; `isMine` is true when the player owns the stall (their
  // own listings, or the stall is free so they may claim it). `ctx` carries the
  // callbacks main.js wires up: { place, take, buy, refresh, free }.

  openMarketStall(stall, listings, isMine, ctx) {
    const card = this.refs.contextCard;
    const rows = Array.isArray(listings) ? listings : [];
    // seller_name + item.name are stored verbatim from the client placing the
    // listing (RLS only checks seller_id), so treat them as untrusted: escape
    // before innerHTML to stop stored XSS hitting everyone who browses the stall.
    const sellerName = rows.length ? rows[0].seller_name : null;
    const subtitle = ctx.free
      ? t('marketStallFree')
      : (isMine ? t('marketStallMine') : t('marketStallOwned', esc(sellerName || '')));
    card.innerHTML = `<div class="ctx-head">🛒 ${t('marketTitle')} · ${t('marketStall', Number(stall.stallId) + 1)}</div>
      <div class="ctx-sub">${subtitle}</div>
      <div class="ctx-gold">💰 ${t('yourGold')}: <b>${mmCoins(this.inv.gold)}</b></div>`;

    const lang = getLang();
    const list = document.createElement('div');
    list.className = 'shop-list';
    for (const r of rows) {
      const it = r.item || {};
      const label = itemDisplayName(it);
      const row = document.createElement('div');
      row.className = 'shop-row';
      row.innerHTML = `<span><span class="row-ico">${iconFor(it)}</span> ${esc(label)}</span>` +
        `<span class="price">${mmCoins(r.price || 0)}</span>`;
      const btn = document.createElement('button');
      if (isMine) {
        // Owner: pull the item back out of the market.
        btn.textContent = '🎒 ' + t('marketTakeItem');
        btn.addEventListener('click', () => { ctx.take(r.id); this.closeContext(); });
      } else {
        // Visitor: buy it (greyed when they can't afford it).
        const afford = this.inv.gold >= (r.price || 0);
        btn.textContent = t('marketBuy', mmCoins(r.price || 0));
        btn.disabled = !afford;
        btn.addEventListener('click', () => this.confirmBuy(
          it, label, r.price || 0,
          () => ctx.buy(r.id, it, r.price || 0),
          () => ctx.refresh(stall)));
      }
      const cell = document.createElement('div');
      cell.appendChild(row);
      // Show each item's full stats (attack/defense/weight/level req…) so the
      // buyer can decide before buying. Tibia-style text block, no icons.
      cell.insertAdjacentHTML('beforeend', `<div class="market-item-stats">${this.infoDetails(it)}</div>`);
      // Hovering the row also pops the standard item tooltip.
      this.attachTooltip(row, it);
      cell.appendChild(btn);
      list.appendChild(cell);
    }
    if (!rows.length) list.innerHTML = `<div class="house-empty">${t('marketEmpty')}</div>`;
    card.appendChild(list);

    // Owner (or a free, claimable stall): a button to list a new item.
    if (isMine) {
      const actions = document.createElement('div');
      actions.className = 'ctx-actions';
      const place = document.createElement('button');
      place.textContent = '➕ ' + t('marketPlaceItem');
      place.addEventListener('click', () => this.openMarketPlace(stall, ctx));
      actions.appendChild(place);
      card.appendChild(actions);
    }
    this.addCloseX(card);
    card.classList.remove('hidden');
  }

  // Pick a backpack item to put up for sale, then ask for its price.
  openMarketPlace(stall, ctx) {
    const card = this.refs.contextCard;
    card.innerHTML = `<div class="ctx-head">➕ ${t('marketPlaceItem')}</div>`;
    const grid = document.createElement('div');
    grid.className = 'house-pickgrid';
    this.inv.backpack.forEach((it, i) => {
      if (it.kind === 'coin') return;   // can't sell raw coins
      const cell = document.createElement('button');
      cell.className = 'house-pickcell ' + rarityClass(it);
      cell.innerHTML = `<span class="ico">${iconFor(it)}</span>`;
      cell.title = itemDisplayName(it);
      cell.addEventListener('click', () => this._marketSetPrice(stall, i, it, ctx));
      grid.appendChild(cell);
    });
    if (!grid.children.length) grid.innerHTML = `<div class="house-empty">${t('empty')}</div>`;
    card.appendChild(grid);
    this.addCloseX(card);
    card.classList.remove('hidden');
  }

  // Ask the seller for a price, then list the chosen backpack item.
  _marketSetPrice(stall, bpIndex, item, ctx) {
    const card = this.refs.contextCard;
    const label = itemDisplayName(item);    // shows the count for stacks
    card.innerHTML = `<div class="ctx-head">🏷️ ${t('marketSetPriceFor', label)}</div>
      <div class="ctx-body"><span class="row-ico">${iconFor(item)}</span></div>`;
    const input = document.createElement('input');
    input.type = 'number'; input.min = '0'; input.value = String(Math.max(1, item.value || 100));
    input.className = 'house-priceinput';
    card.appendChild(input);
    const actions = document.createElement('div');
    actions.className = 'ctx-actions';
    const ok = document.createElement('button');
    ok.textContent = t('confirm');
    ok.addEventListener('click', () => {
      const price = Math.max(0, parseInt(input.value, 10) || 0);
      ctx.place(stall, bpIndex, price);
      this.closeContext();
    });
    actions.appendChild(ok);
    card.appendChild(actions);
    this.addCloseX(card);
    input.focus();
  }

  // "Do you want to enter X's house?" prompt for a visitor at someone's door.
  // Generic yes/no confirm card (used for the house exit/enter prompts).
  confirmPrompt(title, body, yesLabel, onYes, onNo) {
    const card = this.refs.contextCard;
    card.innerHTML = `<div class="ctx-head">${title}</div>` + (body ? `<div class="ctx-body">${body}</div>` : '');
    const actions = document.createElement('div');
    actions.className = 'ctx-actions';
    const yes = document.createElement('button');
    yes.textContent = yesLabel || t('confirm');
    yes.addEventListener('click', () => { this.closeContext(); onYes && onYes(); });
    const no = document.createElement('button');
    no.textContent = t('cancel');
    no.addEventListener('click', () => { this.closeContext(); onNo && onNo(); });
    actions.appendChild(yes); actions.appendChild(no);
    card.appendChild(actions);
    this.addCloseX(card);
    card.classList.remove('hidden');
  }

  confirmVisitHouse(ownerName, onYes) {
    const card = this.refs.contextCard;
    // ownerName comes from a peer's house_sync broadcast — escape before innerHTML.
    const safeOwner = esc(ownerName || '');
    card.innerHTML = `<div class="ctx-head">🏠 ${t('houseVisitTitle', safeOwner)}</div>
      <div class="ctx-body">${t('houseVisitPrompt', safeOwner)}</div>`;
    const actions = document.createElement('div');
    actions.className = 'ctx-actions';
    const yes = document.createElement('button');
    yes.textContent = '🚪 ' + t('houseEnter');
    yes.addEventListener('click', () => { onYes(); this.closeContext(); });
    const no = document.createElement('button');
    no.textContent = t('cancel');
    no.addEventListener('click', () => this.closeContext());
    actions.appendChild(yes); actions.appendChild(no);
    card.appendChild(actions);
    this.addCloseX(card);
    card.classList.remove('hidden');
  }

  // A small inline yes/no confirm inside the context card (used by sell house).
  _confirmInline(message, onYes) {
    const card = this.refs.contextCard;
    card.innerHTML = `<div class="ctx-head">${t('confirm')}</div>
      <div class="ctx-body">${message}</div>`;
    const actions = document.createElement('div');
    actions.className = 'ctx-actions';
    const yes = document.createElement('button');
    yes.textContent = t('confirm');
    yes.addEventListener('click', () => { onYes(); });
    const no = document.createElement('button');
    no.textContent = t('cancel');
    no.addEventListener('click', () => this.closeContext());
    actions.appendChild(yes); actions.appendChild(no);
    card.appendChild(actions);
    this.addCloseX(card);
    card.classList.remove('hidden');
  }

  // NPC dialog: greeting, flavor lines, and quests to accept or hand in.
  openNpc(npc, questLog, level, hooks) {
    const lang = getLang();
    const card = this.refs.contextCard;
    const greeting = npc.greeting ? (npc.greeting[lang] || npc.greeting.es) : '';
    card.innerHTML = `<div class="ctx-head">${npc.name}</div>
      <div class="ctx-body">${greeting}</div>`;

    const ctx = hooks.questCtx;
    const offered = hooks.questsForNpc(npc.id);
    const acceptable = offered.filter((q) => questLog.canAccept(q.id, level, ctx));
    // Quests the player meets the LEVEL for but is blocked by a world gate (it's
    // daytime for a night-only quest, or they lack the key): show them greyed with
    // a hint, so the imaginative requirement is discoverable, not invisible.
    const blocked = offered.filter((q) =>
      !questLog.isActive(q.id) && !questLog.isDone(q.id) && level >= (q.minLevel || 1) &&
      !questLog.canAccept(q.id, level, ctx));
    const turnIn = offered.filter((q) => questLog.isActive(q.id) && questLog.readyToComplete().includes(q.id));

    const list = document.createElement('div');
    list.className = 'shop-list';
    for (const q of turnIn) {
      const row = document.createElement('div');
      row.className = 'shop-row quest-ready';
      row.innerHTML = `<span>✅ ${q.title[lang] || q.title.es}</span>`;
      const b = document.createElement('button');
      b.textContent = t('accept');
      b.addEventListener('click', () => { hooks.complete(q.id); this.openNpc(npc, questLog, level, hooks); });
      row.appendChild(b);
      list.appendChild(row);
    }
    for (const q of acceptable) {
      const row = document.createElement('div');
      row.className = 'shop-row';
      row.innerHTML = `<span>❗ ${q.title[lang] || q.title.es}<br><small>${q.desc[lang] || q.desc.es}</small></span>`;
      const b = document.createElement('button');
      b.textContent = t('accept');
      b.addEventListener('click', () => { hooks.accept(q.id); this.openNpc(npc, questLog, level, hooks); });
      row.appendChild(b);
      list.appendChild(row);
    }
    // Locked-by-gate quests: shown but not acceptable, with the reason.
    for (const q of blocked) {
      const why = questLog.acceptBlocker(q.id, level, ctx);
      let hint = '';
      if (why === 'night') hint = lang === 'en' ? '🌙 Only at night' : '🌙 Solo de noche';
      else if (why === 'day') hint = lang === 'en' ? '☀️ Only by day' : '☀️ Solo de día';
      else if (why === 'items') {
        const reqs = (q.requiresItems || []).map((r) => `${r.count || 1}× ${itemDisplayName(r.itemId, lang)}`).join(', ');
        hint = (lang === 'en' ? '🔑 Needs: ' : '🔑 Necesitas: ') + reqs;
      }
      if (!hint) continue;
      const row = document.createElement('div');
      row.className = 'shop-row quest-locked';
      row.innerHTML = `<span>🔒 ${q.title[lang] || q.title.es}<br><small>${hint}</small></span>`;
      list.appendChild(row);
    }
    if (!turnIn.length && !acceptable.length && !blocked.length && npc.lines) {
      const line = document.createElement('div');
      line.className = 'ctx-sub';
      const arr = npc.lines[lang] || npc.lines.es || [];
      line.textContent = arr[0] || '';
      card.appendChild(line);
    }
    card.appendChild(list);

    // RUMORS / TIPS: clickable secondary messages. The player taps a question and
    // the NPC reveals a hint (lore + where to look for a quest). Always available
    // — "ask for a tip" — independent of whether this NPC gives a quest.
    const rumors = (npc.rumors && (npc.rumors[lang] || npc.rumors.es)) || [];
    if (rumors.length) {
      const rwrap = document.createElement('div');
      rwrap.className = 'npc-rumors';
      const rhead = document.createElement('div');
      rhead.className = 'npc-rumors-head';
      rhead.textContent = lang === 'en' ? '💬 Ask around…' : '💬 Pregunta por ahí…';
      rwrap.appendChild(rhead);
      const answer = document.createElement('div');
      answer.className = 'npc-rumor-answer hidden';
      // One clickable chip per rumor; clicking reveals it in the answer box.
      const chips = document.createElement('div');
      chips.className = 'npc-rumor-chips';
      rumors.forEach((r, i) => {
        const q = typeof r === 'object' ? (r.q || r.prompt) : (lang === 'en' ? `Rumor ${i + 1}` : `Rumor ${i + 1}`);
        const a = typeof r === 'object' ? (r.a || r.text) : r;
        const b = document.createElement('button');
        b.className = 'npc-rumor-chip';
        b.textContent = '❔ ' + q;
        b.addEventListener('click', () => {
          answer.textContent = a;
          answer.classList.remove('hidden');
          chips.querySelectorAll('.npc-rumor-chip').forEach((c) => c.classList.remove('active'));
          b.classList.add('active');
        });
        chips.appendChild(b);
      });
      rwrap.appendChild(chips);
      rwrap.appendChild(answer);
      card.appendChild(rwrap);
    }

    this.addCloseX(card);
    card.classList.remove('hidden');
  }

  // Compact list of active quests with objective progress.
  renderQuests(questLog) {
    const box = this.refs.questBox;
    if (!box) return;
    const lang = getLang();
    const active = questLog.activeList();
    box.innerHTML = '';
    if (!active.length) { box.classList.add('hidden'); return; }
    box.classList.remove('hidden');
    const head = document.createElement('div');
    head.className = 'quest-head';
    head.textContent = '📜 ' + t('questBoard');
    box.appendChild(head);
    for (const q of active) {
      const item = document.createElement('div');
      item.className = 'quest-item';
      const objs = questLog.objectiveText(q.id, lang)
        .map((o) => `<div class="qobj ${o.done ? 'done' : ''}">${o.done ? '✓' : '•'} ${o.text} ${o.have}/${o.need}</div>`).join('');
      item.innerHTML = `<div class="qtitle">${q.title[lang] || q.title.es}</div>${objs}`;
      box.appendChild(item);
    }
  }

  // Depot dialog: move items between backpack and this city's depot.
  openDepot(city) {
    const card = this.refs.contextCard;
    const store = this.depot.for(city.id);
    card.innerHTML = `<div class="ctx-head">${t('depot')} · ${city.name}</div>
      <div class="ctx-sub">${t('depotHint')} (${store.length}/100)</div>`;
    const cols = document.createElement('div');
    cols.className = 'depot-cols';

    const bpCol = document.createElement('div');
    bpCol.innerHTML = `<div class="col-h">${t('backpack')}</div>`;
    this.inv.backpack.forEach((it, i) => {
      const r = document.createElement('button');
      r.className = 'depot-item ' + rarityClass(it);
      r.innerHTML = `<span class="row-ico">${itemIcon(it)}</span> ${it.name}`;
      r.addEventListener('click', () => { this.hooks.depositItem(city.id, i); this.openDepot(city); });
      bpCol.appendChild(r);
    });

    const dpCol = document.createElement('div');
    dpCol.innerHTML = `<div class="col-h">${t('depot')}</div>`;
    store.forEach((it, i) => {
      const r = document.createElement('button');
      r.className = 'depot-item ' + rarityClass(it);
      r.innerHTML = `<span class="row-ico">${itemIcon(it)}</span> ${it.name}`;
      r.addEventListener('click', () => { this.hooks.withdrawItem(city.id, i); this.openDepot(city); });
      dpCol.appendChild(r);
    });

    cols.append(bpCol, dpCol);
    card.appendChild(cols);
    this.addCloseX(card);
    card.classList.remove('hidden');
  }

  // Player-info panel shown when you left-click another player: their name, a
  // friend toggle and a trade button.
  openPlayerInfo(info) {
    const card = this.refs.contextCard;
    card.innerHTML = `<div class="ctx-head">👤 ${esc(info.name)}</div>
      <div class="ctx-sub">${t('playerInfo') || 'Jugador conectado'}</div>`;
    // Buttons live in a .ctx-actions row so they get the same styled look as the
    // shop / vendor / house dialog buttons (the plain .ctx-action class had no CSS
    // and rendered as bare browser buttons).
    const actions = document.createElement('div');
    actions.className = 'ctx-actions';
    const friendBtn = document.createElement('button');
    friendBtn.textContent = info.isFriend ? ('✓ ' + (t('removeFriend') || 'Quitar amigo')) : ('➕ ' + (t('addFriend') || 'Añadir amigo'));
    friendBtn.addEventListener('click', () => {
      if (info.isFriend) info.onRemoveFriend(); else info.onAddFriend();
      this.closeContext();
    });
    const tradeBtn = document.createElement('button');
    tradeBtn.textContent = '🤝 ' + (t('trade') || 'Intercambiar');
    tradeBtn.addEventListener('click', () => { info.onTrade(); });
    // Follow: walk after the player wherever they go (toggles).
    const followBtn = document.createElement('button');
    followBtn.textContent = (info.isFollowing ? '✓ ' : '👣 ') + (t('follow') || 'Seguir');
    followBtn.addEventListener('click', () => { info.onFollow(); this.closeContext(); });
    // Block: hide this player's chat messages (toggles).
    const blockBtn = document.createElement('button');
    blockBtn.textContent = (info.isBlocked ? '✓ ' : '🚫 ') + (info.isBlocked ? (t('unblockChat') || 'Desbloquear chat') : (t('blockChat') || 'Bloquear chat'));
    blockBtn.addEventListener('click', () => { info.onBlock(); this.closeContext(); });
    actions.append(friendBtn, tradeBtn, followBtn, blockBtn);
    card.appendChild(actions);
    this.addCloseX(card);
    card.classList.remove('hidden');
  }

  // The trade window: your offer (up to 6 items picked from your backpack) on the
  // left, the partner's offer on the right, with confirm/cancel. Hooks drive the
  // networked negotiation; MAX 6 items per side.
  openTrade(state) {
    const MAX = 6;
    const card = this.refs.contextCard;
    card.innerHTML = `<div class="ctx-head">🤝 ${t('trade') || 'Intercambio'} · ${state.partnerName}</div>
      <div class="ctx-sub">${(t('tradeHint') || 'Máximo 6 objetos por lado')}</div>`;
    const cols = document.createElement('div');
    cols.className = 'depot-cols';

    // Left: my backpack (click to add to offer) + my current offer.
    const mine = document.createElement('div');
    mine.innerHTML = `<div class="col-h">${t('yourOffer') || 'Tu oferta'} (${state.myOffer.length}/${MAX})</div>`;
    state.myOffer.forEach((it, i) => {
      const r = document.createElement('button');
      r.className = 'depot-item ' + rarityClass(it);
      r.innerHTML = `<span class="row-ico">${itemIcon(it)}</span> ${it.name} ✕`;
      r.addEventListener('click', () => { state.onRemove(i); });
      mine.appendChild(r);
    });
    const addH = document.createElement('div'); addH.className = 'col-h'; addH.textContent = t('backpack') || 'Mochila';
    mine.appendChild(addH);
    this.inv.backpack.forEach((it, i) => {
      const r = document.createElement('button');
      r.className = 'depot-item ' + rarityClass(it);
      r.disabled = state.myOffer.length >= MAX;
      r.innerHTML = `<span class="row-ico">${itemIcon(it)}</span> ${it.name}`;
      r.addEventListener('click', () => { if (state.myOffer.length < MAX) state.onAdd(i); });
      mine.appendChild(r);
    });

    // Right: the partner's offer (read-only). partnerName + each it.name come
    // straight from the peer's trade payload — untrusted, so escape before HTML.
    const theirs = document.createElement('div');
    theirs.innerHTML = `<div class="col-h">${esc(state.partnerName)}: ${(t('theirOffer') || 'su oferta')} (${state.theirOffer.length}/${MAX})</div>`;
    state.theirOffer.forEach((it) => {
      const r = document.createElement('div');
      r.className = 'depot-item ' + rarityClass(it);
      r.innerHTML = `<span class="row-ico">${itemIcon(it)}</span> ${esc(it.name)}`;
      theirs.appendChild(r);
    });

    cols.append(mine, theirs);
    card.appendChild(cols);

    const status = document.createElement('div');
    status.className = 'ctx-sub';
    status.textContent = state.theirConfirmed ? (t('partnerReady') || 'El otro jugador está listo ✓') : '';
    card.appendChild(status);

    const confirm = document.createElement('button');
    confirm.className = 'ctx-action';
    confirm.textContent = state.iConfirmed ? ('✓ ' + (t('confirmed') || 'Confirmado')) : ('✅ ' + (t('confirmTrade') || 'Confirmar'));
    confirm.disabled = state.iConfirmed;
    confirm.addEventListener('click', () => state.onConfirm());
    const cancel = document.createElement('button');
    cancel.className = 'ctx-close';
    cancel.textContent = t('cancel') || 'Cancelar';
    cancel.addEventListener('click', () => state.onCancel());
    card.append(confirm, cancel);
    card.classList.remove('hidden');
  }
}

export { SLOT_ICON };
