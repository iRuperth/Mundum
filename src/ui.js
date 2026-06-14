import { t, elementName, getLang } from './i18n.js';
import { RARITY } from './data/items.js';
import { EQUIP_SLOTS, itemWeight } from './inventory.js';
import { shopStock, shopStockFor, vendorBuysItem, sellPrice, buyPrice, CITIES } from './cities.js';
import { iconFor, slotPlaceholderIcon } from './itemIcons.js';

const SLOT_ICON = {
  amulet: '📿', helmet: '⛑️', weapon: '⚔️', armor: '🛡️',
  shield: '🔰', legs: '👖', boots: '🥾', bag: '🎒', extra: '🔥',
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

function itemIcon(item) {
  // Procedural pixel-art SVG, unique per item (type/tier/element/rarity/colour).
  // Returns an inline <svg> string; safe to drop into innerHTML like the old
  // emoji glyphs, so drag-drop, count badges and tooltips keep working.
  return iconFor(item);
}

// Plain-text glyph for contexts that can't render SVG (e.g. the drag ghost uses
// a styled clone instead; chat/log lines fall back to a small emoji).
function itemGlyph(item) {
  if ((item.kind === 'coin' || item.kind === 'potion' || item.kind === 'light') && item.icon) return item.icon;
  if (item.type === 'container' || item.slot === 'bag') return item.bagIcon || TYPE_ICON.container;
  if (item.slot && SLOT_ICON[item.slot]) return SLOT_ICON[item.slot];
  return TYPE_ICON[item.type] || '❔';
}

// Inner HTML for a backpack/window cell. Coins render as a little pile of discs
// tinted by tier with a count badge; everything else uses its icon glyph.
function cellInner(item) {
  if (item.kind === 'coin') {
    const hex = '#' + (item.color || 0xcd7f32).toString(16).padStart(6, '0');
    const n = item.count || 1;
    const show = n > 999 ? Math.floor(n / 1000) + 'k' : n;
    return `<span class="coin-pile cell" style="--coin:${hex}"><i></i><i></i><i></i></span>` +
           `<span class="cell-count">${show}</span>`;
  }
  // The SVG icon carries its own colours, so the cell wrapper no longer tints it.
  const icon = `<span class="ico">${itemIcon(item)}</span>`;
  // Stacked consumables (potions/fruit) show a count badge, like coins.
  const n = item.count || 1;
  if (item.kind === 'potion' && n > 1) {
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
      el.addEventListener('click', () => this.onSlotClick(slot));
      el.addEventListener('contextmenu', (e) => { e.preventDefault(); this.onSlotClick(slot); });
      // Double-clicking a slot "uses" what's in it: the fire slot lights/puts out
      // the equipped torch; the bag slot opens the backpack window.
      el.addEventListener('dblclick', (e) => { e.preventDefault(); this.onSlotUse(slot); });
      // Drag an equipped item off into a bag (bound once; the item is read lazily
      // at drag-start so it always reflects what's currently in the slot).
      this._makeSlotDraggable(el, slot);
    });
    // Fixed windows (map, equipment): wire their collapse buttons + reordering.
    if (refs.sidePanel) {
      refs.sidePanel.querySelectorAll('.win[data-win="map"], .win[data-win="equip"]').forEach((w) => this._wireWindow(w, { closable: false }));
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
        el.innerHTML = `<span class="ico">${itemIcon(item)}</span>`;
      } else {
        el.innerHTML = `<span class="ph">${slotPlaceholderIcon(slot)}</span>`;
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
        // Tibia-style: LEFT click opens a bag; RIGHT click is the action menu;
        // double click uses/equips quickly.
        cell.addEventListener('click', () => {
          if (item.type === 'container' && !isNested) { this.openBackpack(i); return; }
        });
        cell.addEventListener('contextmenu', (e) => { e.preventDefault(); this.onBackpackItemAction(item, i, isNested ? ref : null); });
        cell.addEventListener('dblclick', (e) => {
          e.preventDefault();
          // A bag opens on double click too (matching single click); nested-bag
          // cells only support opening, not the use/equip actions below.
          if (item.type === 'container') { if (!isNested) this.openBackpack(i); return; }
          if (isNested) return;
          if (item.kind === 'potion') { this.hooks.usePotion(i); }
          else if (item.kind !== 'coin') { this.hooks.equip(i); } // torch → fire slot
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
      try { head.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }

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
        const containers = [...document.querySelectorAll('.windows')];
        let parent = placeholder.parentNode;
        for (const c of containers) {
          const pr = c.closest('.side-panel')?.getBoundingClientRect();
          if (pr && clientX >= pr.left && clientX <= pr.right) { parent = c; break; }
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
      const onUp = (ev) => {
        head.removeEventListener('pointermove', onMove);
        head.removeEventListener('pointerup', onUp);
        head.removeEventListener('pointercancel', onUp);
        try { head.releasePointerCapture(ev.pointerId); } catch (_) { /* ignore */ }
        win.classList.remove('dragging');
        // Drop the window back into the layout where the placeholder sits.
        if (lifted && placeholder) {
          placeholder.parentNode.insertBefore(win, placeholder);
          placeholder.remove();
          win.classList.remove('lifting');
          win.style.left = win.style.top = win.style.width = '';
        }
      };
      head.addEventListener('pointermove', onMove);
      head.addEventListener('pointerup', onUp);
      head.addEventListener('pointercancel', onUp);
    });
  }

  // Action menu for an item clicked inside the backpack window.
  onBackpackItemAction(item, index, bagIndex) {
    // A bag has no useful menu — just open it so you see what's inside, instead
    // of a card that only offers drop/close. (Drag it to the world to drop it.)
    if (item.type === 'container' && bagIndex == null) { this.openBackpack(index); return; }
    const actions = [];
    // Each action runs its hook, which calls recompute() → renderAll() and
    // re-renders every open window by bag identity, so we don't reopen by a
    // (now-stale) numeric index here.
    if (bagIndex != null) {
      // Inside a nested bag: take it out.
      actions.push({ label: t('unequip'), fn: () => this.hooks.takeFromBag(bagIndex, index) });
    } else {
      if (item.kind === 'potion') {
        actions.push({ label: t('use'), fn: () => this.hooks.usePotion(index) });
        actions.push({ label: '⌨ ' + t('toHotbar'), fn: () => { this.hooks.assignHotbar(item); this.closeContext(); } });
      } else if (item.type !== 'container') {
        actions.push({ label: t('equip'), fn: () => this.hooks.equip(index) });
      }
      // Offer to stash into the first nested bag, if any.
      const bagIdx = this.inv.backpack.findIndex((it, j) => it && it.type === 'container' && j !== index);
      if (bagIdx >= 0 && item.type !== 'container') {
        actions.push({ label: '🎒 ' + this.inv.backpack[bagIdx].name, fn: () => this.hooks.moveIntoBag(index, bagIdx) });
      }
    }
    actions.push({ label: t('drop'), fn: () => this.hooks.dropItem(index, bagIndex) });
    this.openContext(item, actions);
  }

  renderAll() {
    this.renderEquipment();
    this._refreshContainerWindows();
    this.setCapacity(this.level);
  }

  onBackpackClick(i) {
    const item = this.inv.backpack[i];
    if (!item) return;
    // Coins: offer "convert 100 → 1 of next tier" (and nothing to equip/use).
    if (item.kind === 'coin') {
      const actions = [];
      if (item.count >= 100 && (item.tier || 0) < 4) {
        actions.push({ label: '🔼 ' + t('convertCoin'), fn: () => { this.hooks.convertCoin(item.baseId); this.renderAll(); } });
      }
      actions.push({ label: t('drop'), fn: () => this.hooks.dropItem(i) });
      this.openContext(item, actions);
      return;
    }
    // Potions get a "Use" action instead of "Equip".
    const primary = item.kind === 'potion'
      ? { label: t('use'), fn: () => this.hooks.usePotion(i) }
      : { label: t('equip'), fn: () => this.hooks.equip(i) };
    const actions = [primary];
    if (item.kind === 'potion') actions.push({ label: '⌨ ' + t('toHotbar'), fn: () => this.hooks.assignHotbar(item) });
    actions.push({ label: t('drop'), fn: () => this.hooks.dropItem(i) });
    this.openContext(item, actions);
  }

  onSlotClick(slot) {
    const item = this.inv.equip[slot];
    if (!item) return;
    // Left-clicking the equipped bag opens (or re-focuses) the main backpack
    // window, Tibia-style. Other slots show the unequip menu.
    if (slot === 'bag') { this.openBackpack('main'); return; }
    this.openContext(item, [
      { label: t('unequip'), fn: () => this.hooks.unequip(slot) },
    ]);
  }

  // Double-clicking an equip slot uses what's in it. The fire slot toggles the
  // equipped torch (light on/off); the bag slot opens the backpack. Other slots
  // have no "use" action.
  onSlotUse(slot) {
    const item = this.inv.equip[slot];
    if (!item) return;
    if (slot === 'bag') { this.openBackpack('main'); return; }
    if (item.kind === 'light' && !item.passive) this.hooks.toggleTorch?.();
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
      this.hooks.dropItem(from.i, bagRef);
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
  _promptSplit(item, onConfirm) {
    const max = item.count || 1;
    const card = this.refs.contextCard;
    card.innerHTML = `<div class="ctx-head">${t('split') || 'Split'}</div>
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

  openContext(item, actions) {
    const card = this.refs.contextCard;
    card.innerHTML = `<div class="ctx-head ${rarityClass(item)}">${item.name}</div>
      <div class="ctx-body">${this.itemDetails(item)}</div>`;
    const row = document.createElement('div');
    row.className = 'ctx-actions';
    for (const a of actions) {
      const b = document.createElement('button');
      b.textContent = a.label;
      b.addEventListener('click', () => { a.fn(); this.closeContext(); });
      row.appendChild(b);
    }
    const close = document.createElement('button');
    close.textContent = t('close');
    close.className = 'ctx-close';
    close.addEventListener('click', () => this.closeContext());
    row.appendChild(close);
    card.appendChild(row);
    card.classList.remove('hidden');
  }

  closeContext() {
    this.refs.contextCard.classList.add('hidden');
  }

  toast(msg, kind) {
    const el = document.createElement('div');
    el.className = 'toast' + (kind ? ' ' + kind : '');
    el.textContent = msg;
    this.refs.toastStack.appendChild(el);
    setTimeout(() => { el.classList.add('fade'); }, 2600);
    setTimeout(() => { el.remove(); }, 3200);
  }

  // Shop dialog: buy basic gear with gold.
  openShop(city) {
    const stock = shopStock();
    const card = this.refs.contextCard;
    card.innerHTML = `<div class="ctx-head">${t('shop')} · ${city.name}</div>
      <div class="ctx-gold">💰 ${this.inv.gold}</div>`;
    const list = document.createElement('div');
    list.className = 'shop-list';
    const lang = getLang();
    for (const def of stock) {
      const row = document.createElement('div');
      row.className = 'shop-row';
      // Potions carry a bilingual {es,en} name and an icon; gear uses a string.
      const label = typeof def.name === 'string' ? def.name : (def.name[lang] || def.name.es);
      row.innerHTML = `<span><span class="row-ico">${iconFor(def)}</span> ${label}</span><span class="price">${def.value} 💰</span>`;
      const buy = document.createElement('button');
      buy.textContent = t('buy');
      buy.addEventListener('click', () => this.hooks.buy(def, () => this.openShop(city)));
      row.appendChild(buy);
      list.appendChild(row);
    }
    card.appendChild(list);
    const close = document.createElement('button');
    close.textContent = t('close');
    close.className = 'ctx-close';
    close.addEventListener('click', () => this.closeContext());
    card.appendChild(close);
    card.classList.remove('hidden');
  }

  // Vendor dialog: a specialized merchant NPC with its own stock. Shows a Buy
  // section (the vendor's catalog) and a Sell section (backpack items it accepts).
  openVendor(npc) {
    const shop = npc.shop || {};
    const lang = getLang();
    const card = this.refs.contextCard;
    card.innerHTML = `<div class="ctx-head">${npc.name}</div>
      <div class="ctx-gold">💰 ${this.inv.gold}</div>`;

    const stock = shopStockFor(shop);
    if (stock.length) {
      const buyHead = document.createElement('div');
      buyHead.className = 'ctx-sub'; buyHead.textContent = t('buy');
      card.appendChild(buyHead);
      const list = document.createElement('div');
      list.className = 'shop-list';
      for (const def of stock) {
        const row = document.createElement('div');
        row.className = 'shop-row';
        const label = typeof def.name === 'string' ? def.name : (def.name[lang] || def.name.es);
        const price = buyPrice(shop, def);
        row.innerHTML = `<span><span class="row-ico">${iconFor(def)}</span> ${label}</span><span class="price">${price} 💰</span>`;
        const buy = document.createElement('button');
        buy.textContent = t('buy');
        buy.addEventListener('click', () => this.hooks.buy(def, () => this.openVendor(npc), price));
        row.appendChild(buy);
        list.appendChild(row);
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
        const label = typeof it.name === 'string' ? it.name : (it.name[lang] || it.name.es);
        const price = sellPrice(shop, it);
        row.innerHTML = `<span><span class="row-ico">${iconFor(it)}</span> ${label}</span><span class="price">+${price} 💰</span>`;
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

    const close = document.createElement('button');
    close.textContent = t('close');
    close.className = 'ctx-close';
    close.addEventListener('click', () => this.closeContext());
    card.appendChild(close);
    card.classList.remove('hidden');
  }

  // Teleport portal: pick another city to travel to.
  openTeleport(city, onTravel) {
    const card = this.refs.contextCard;
    card.innerHTML = `<div class="ctx-head">🌀 ${t('teleport')}</div>
      <div class="ctx-sub">${t('teleportHint')}</div>`;
    const list = document.createElement('div');
    list.className = 'shop-list';
    for (const dest of CITIES) {
      if (dest.id === city.id) continue;
      const row = document.createElement('div');
      row.className = 'shop-row';
      row.innerHTML = `<span>🏛️ ${dest.name}</span>`;
      const go = document.createElement('button');
      go.textContent = t('travel');
      go.addEventListener('click', () => onTravel(dest));
      row.appendChild(go);
      list.appendChild(row);
    }
    card.appendChild(list);
    const close = document.createElement('button');
    close.textContent = t('close');
    close.className = 'ctx-close';
    close.addEventListener('click', () => this.closeContext());
    card.appendChild(close);
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
    const close = document.createElement('button');
    close.textContent = t('close');
    close.className = 'ctx-close';
    close.addEventListener('click', () => this.closeContext());
    actions.appendChild(btn);
    actions.appendChild(close);
    card.appendChild(actions);
    card.classList.remove('hidden');
  }

  // NPC dialog: greeting, flavor lines, and quests to accept or hand in.
  openNpc(npc, questLog, level, hooks) {
    const lang = getLang();
    const card = this.refs.contextCard;
    const greeting = npc.greeting ? (npc.greeting[lang] || npc.greeting.es) : '';
    card.innerHTML = `<div class="ctx-head">${npc.name}</div>
      <div class="ctx-body">${greeting}</div>`;

    const acceptable = hooks.questsForNpc(npc.id).filter((q) => questLog.canAccept(q.id, level));
    const turnIn = hooks.questsForNpc(npc.id).filter((q) => questLog.isActive(q.id) && questLog.readyToComplete().includes(q.id));

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
    if (!turnIn.length && !acceptable.length && npc.lines) {
      const line = document.createElement('div');
      line.className = 'ctx-sub';
      const arr = npc.lines[lang] || npc.lines.es || [];
      line.textContent = arr[0] || '';
      card.appendChild(line);
    }
    card.appendChild(list);
    const close = document.createElement('button');
    close.textContent = t('close');
    close.className = 'ctx-close';
    close.addEventListener('click', () => this.closeContext());
    card.appendChild(close);
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
    const close = document.createElement('button');
    close.textContent = t('close');
    close.className = 'ctx-close';
    close.addEventListener('click', () => this.closeContext());
    card.appendChild(close);
    card.classList.remove('hidden');
  }

  // Player-info panel shown when you left-click another player: their name, a
  // friend toggle and a trade button.
  openPlayerInfo(info) {
    const card = this.refs.contextCard;
    card.innerHTML = `<div class="ctx-head">👤 ${info.name}</div>
      <div class="ctx-sub">${t('playerInfo') || 'Jugador conectado'}</div>`;
    const friendBtn = document.createElement('button');
    friendBtn.className = 'ctx-action';
    friendBtn.textContent = info.isFriend ? ('✓ ' + (t('removeFriend') || 'Quitar amigo')) : ('➕ ' + (t('addFriend') || 'Añadir amigo'));
    friendBtn.addEventListener('click', () => {
      if (info.isFriend) info.onRemoveFriend(); else info.onAddFriend();
      this.closeContext();
    });
    const tradeBtn = document.createElement('button');
    tradeBtn.className = 'ctx-action';
    tradeBtn.textContent = '🤝 ' + (t('trade') || 'Intercambiar');
    tradeBtn.addEventListener('click', () => { info.onTrade(); });
    card.append(friendBtn, tradeBtn);
    const close = document.createElement('button');
    close.textContent = t('close'); close.className = 'ctx-close';
    close.addEventListener('click', () => this.closeContext());
    card.appendChild(close);
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

    // Right: the partner's offer (read-only).
    const theirs = document.createElement('div');
    theirs.innerHTML = `<div class="col-h">${state.partnerName}: ${(t('theirOffer') || 'su oferta')} (${state.theirOffer.length}/${MAX})</div>`;
    state.theirOffer.forEach((it) => {
      const r = document.createElement('div');
      r.className = 'depot-item ' + rarityClass(it);
      r.innerHTML = `<span class="row-ico">${itemIcon(it)}</span> ${it.name}`;
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
