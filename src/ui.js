import { t, elementName, getLang } from './i18n.js';
import { RARITY } from './data/items.js';
import { EQUIP_SLOTS } from './inventory.js';
import { shopStock, CITIES } from './cities.js';

const SLOT_ICON = {
  amulet: '📿', helmet: '⛑️', weapon: '⚔️', armor: '🛡️',
  shield: '🔰', legs: '👖', boots: '🥾', bag: '🎒',
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
  if (item.kind === 'potion' && item.icon) return item.icon;
  if (item.slot && SLOT_ICON[item.slot]) return SLOT_ICON[item.slot];
  return TYPE_ICON[item.type] || '❔';
}

export class UI {
  constructor(refs, inv, depot, hooks) {
    this.refs = refs;
    this.inv = inv;
    this.depot = depot;
    this.hooks = hooks;
    this.collapsed = false;
    this.level = 1;

    refs.panelToggle.addEventListener('click', () => this.togglePanel());
    refs.paperdoll.querySelectorAll('.slot').forEach((el) => {
      el.addEventListener('click', () => this.onSlotClick(el.getAttribute('data-slot')));
    });
  }

  // Returns true when the inventory panel is now open (expanded).
  togglePanel() {
    this.collapsed = !this.collapsed;
    this.refs.sidePanel.classList.toggle('collapsed', this.collapsed);
    this.refs.panelToggle.textContent = this.collapsed ? '‹' : '›';
    return !this.collapsed;
  }

  setVitals(hp, maxHp, mana, maxMana, xpInfo) {
    this.level = xpInfo.level;
    this.refs.hpFill.style.width = Math.max(0, (hp / maxHp) * 100) + '%';
    this.refs.hpText.textContent = `${Math.max(0, Math.ceil(hp))}/${maxHp}`;
    if (this.refs.manaFill && maxMana) {
      this.refs.manaFill.style.width = Math.max(0, (mana / maxMana) * 100) + '%';
      this.refs.manaText.textContent = `${Math.max(0, Math.floor(mana))}/${maxMana}`;
    }
    this.refs.xpFill.style.width = (xpInfo.frac * 100) + '%';
    this.refs.xpText.textContent = `${t('xp')} ${Math.floor(xpInfo.frac * 100)}%`;
    this.refs.levelBadge.textContent = xpInfo.level;
  }

  // Show the hero's name in the top-left HUD title (replacing "MUNDUM").
  setName(name) {
    if (this.refs.hudTitle) this.refs.hudTitle.textContent = name;
  }

  setCapacity(level) {
    const w = Math.round(this.inv.carriedWeight());
    const cap = this.inv.capacity(level);
    this.refs.capText.textContent = `${w}/${cap}`;
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
        el.innerHTML = `<span class="ph">${SLOT_ICON[slot]}</span>`;
      }
    });
  }

  renderBackpack() {
    const grid = this.refs.backpackGrid;
    grid.innerHTML = '';
    const cap = this.inv.bagCapacity;
    for (let i = 0; i < cap; i++) {
      const cell = document.createElement('div');
      cell.className = 'bp-cell';
      const item = this.inv.backpack[i];
      if (item) {
        cell.classList.add('filled', rarityClass(item));
        if (item.type === 'container') cell.classList.add('is-bag');
        cell.innerHTML = `<span class="ico" ${item.color ? `style="color:#${(item.color).toString(16).padStart(6, '0')}"` : ''}>${itemIcon(item)}</span>`;
        cell.addEventListener('click', () => this.onBackpackClick(i));
        this.attachTooltip(cell, item);
        // Drag from the side-panel backpack straight onto a hotbar slot too, not
        // just from the floating window — this is the bag the player sees by default.
        this._makeDraggable(cell, item);
      }
      grid.appendChild(cell);
    }
  }

  // Open the backpack as a floating 20-slot window (Tibia style). Clicking a
  // nested bag opens its own window. `bagIndex` null = the main backpack.
  openBackpack(bagIndex = null) {
    const card = this.refs.contextCard;
    const isNested = bagIndex != null;
    const bag = isNested ? this.inv.backpack[bagIndex] : null;
    const cap = isNested ? (bag ? bag.capacity : 0) : this.inv.bagCapacity;
    const items = isNested ? (bag ? bag.contents : []) : this.inv.backpack;
    const title = isNested ? (bag ? bag.name : t('backpack')) : t('backpack');

    card.innerHTML = `<div class="ctx-head">🎒 ${title} <span class="bp-count">${items.length}/${cap}</span></div>`;
    const win = document.createElement('div');
    win.className = 'bp-window';
    for (let i = 0; i < cap; i++) {
      const cell = document.createElement('div');
      cell.className = 'bp-cell';
      const item = items[i];
      if (item) {
        cell.classList.add('filled', rarityClass(item));
        if (item.type === 'container') cell.classList.add('is-bag');
        cell.innerHTML = `<span class="ico" ${item.color ? `style="color:#${(item.color).toString(16).padStart(6, '0')}"` : ''}>${itemIcon(item)}</span>`;
        cell.addEventListener('click', () => {
          if (item.type === 'container' && !isNested) { this.openBackpack(i); return; }
          this.onBackpackItemAction(item, i, bagIndex);
        });
        // Double left click uses the item directly (drink a potion / equip gear).
        cell.addEventListener('dblclick', (e) => {
          e.preventDefault();
          if (bagIndex != null) return;
          if (item.kind === 'potion') { this.hooks.usePotion(i); this.openBackpack(null); }
          else if (item.type !== 'container') { this.hooks.equip(i); this.openBackpack(null); }
        });
        this.attachTooltip(cell, item);
        // Any item can be dragged from the backpack onto a hotbar slot.
        this._makeDraggable(cell, item);
      }
      win.appendChild(cell);
    }
    card.appendChild(win);

    // Coin stacks (Tibia-style): each tier is a slot showing its count. Right
    // click (or long press) converts 100 into 1 of the next tier up.
    if (!isNested) {
      const stacks = this.inv.coinStacks();
      if (stacks.length) {
        const coinRow = document.createElement('div');
        coinRow.className = 'coin-row';
        for (const coin of stacks) {
          const cc = document.createElement('div');
          cc.className = 'coin-cell' + (coin.count >= 100 && coin.tier < 4 ? ' convertible' : '');
          const hex = '#' + coin.color.toString(16).padStart(6, '0');
          const label = coin.name[getLang()] || coin.name.es;
          // A little pile of coins (three stacked discs) in the tier's colour,
          // then the count and the coin's name so it reads at a glance.
          cc.innerHTML =
            `<span class="coin-pile" style="--coin:${hex}"><i></i><i></i><i></i></span>` +
            `<span class="coin-info"><span class="coin-n">${coin.count}</span>` +
            `<span class="coin-name">${label}</span></span>`;
          cc.title = label + (coin.count >= 100 && coin.tier < 4 ? ' · ' + t('convertCoin') : '');
          const convert = () => { if (this.hooks.convertCoin(coin.id)) this.openBackpack(null); };
          cc.addEventListener('contextmenu', (e) => { e.preventDefault(); convert(); });
          this._bindCoinLongPress(cc, convert);
          coinRow.appendChild(cc);
        }
        card.appendChild(coinRow);
      }
    }

    const row = document.createElement('div');
    row.className = 'ctx-actions';
    if (isNested) {
      const backBtn = document.createElement('button');
      backBtn.textContent = '‹ ' + t('backpack');
      backBtn.addEventListener('click', () => this.openBackpack(null));
      row.appendChild(backBtn);
    }
    const close = document.createElement('button');
    close.textContent = t('close');
    close.className = 'ctx-close';
    close.addEventListener('click', () => this.closeContext());
    row.appendChild(close);
    card.appendChild(row);
    card.classList.remove('hidden');
  }

  // Action menu for an item clicked inside the backpack window.
  onBackpackItemAction(item, index, bagIndex) {
    const actions = [];
    if (bagIndex != null) {
      // Inside a nested bag: take it out.
      actions.push({ label: t('unequip'), fn: () => { this.hooks.takeFromBag(bagIndex, index); this.openBackpack(bagIndex); } });
    } else {
      if (item.kind === 'potion') {
        actions.push({ label: t('use'), fn: () => { this.hooks.usePotion(index); this.openBackpack(null); } });
        actions.push({ label: '⌨ ' + t('toHotbar'), fn: () => { this.hooks.assignHotbar(item); this.closeContext(); } });
      } else if (item.type !== 'container') {
        actions.push({ label: t('equip'), fn: () => { this.hooks.equip(index); this.openBackpack(null); } });
      }
      // Offer to stash into the first nested bag, if any.
      const bagIdx = this.inv.backpack.findIndex((it, j) => it && it.type === 'container' && j !== index);
      if (bagIdx >= 0 && item.type !== 'container') {
        actions.push({ label: '🎒 ' + this.inv.backpack[bagIdx].name, fn: () => { this.hooks.moveIntoBag(index, bagIdx); this.openBackpack(null); } });
      }
    }
    actions.push({ label: t('drop'), fn: () => { this.hooks.dropItem(index, bagIndex); this.openBackpack(bagIndex); } });
    this.openContext(item, actions);
  }

  renderAll() {
    this.renderEquipment();
    this.renderBackpack();
    this.setCapacity(this.level);
  }

  onBackpackClick(i) {
    const item = this.inv.backpack[i];
    if (!item) return;
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
    this.openContext(item, [
      { label: t('unequip'), fn: () => this.hooks.unequip(slot) },
    ]);
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

  // Make a backpack cell draggable onto the hotbar. Uses pointer events (works
  // for mouse and touch alike) rather than the flaky native HTML5 drag: a ghost
  // follows the cursor and the slot under it on release receives the item.
  _makeDraggable(el, item) {
    el.style.touchAction = 'none';
    el.style.userSelect = 'none';
    el.addEventListener('pointerdown', (e) => {
      if (e.button !== undefined && e.button !== 0) return;
      e.preventDefault(); // stop text selection / native image drag
      // Capture the pointer so moves keep firing even over the scrollable list.
      try { el.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
      const startX = e.clientX, startY = e.clientY;
      let ghost = null, dragging = false;

      const onMove = (ev) => {
        if (!dragging) {
          if (Math.hypot(ev.clientX - startX, ev.clientY - startY) < 6) return;
          dragging = true;
          this.dragItem = item;
          this.hideTooltip();
          ghost = document.createElement('div');
          ghost.className = 'drag-ghost';
          ghost.textContent = itemIcon(item);
          document.body.appendChild(ghost);
        }
        ghost.style.left = ev.clientX + 'px';
        ghost.style.top = ev.clientY + 'px';
        const over = document.elementFromPoint(ev.clientX, ev.clientY);
        const slotEl = over && over.closest && over.closest('.hb-slot');
        document.querySelectorAll('#hotbar .hb-slot.drop-hover').forEach((s) => s.classList.remove('drop-hover'));
        if (slotEl) slotEl.classList.add('drop-hover');
      };

      const onUp = (ev) => {
        el.removeEventListener('pointermove', onMove);
        el.removeEventListener('pointerup', onUp);
        el.removeEventListener('pointercancel', onUp);
        try { el.releasePointerCapture(ev.pointerId); } catch (_) { /* ignore */ }
        document.querySelectorAll('#hotbar .hb-slot.drop-hover').forEach((s) => s.classList.remove('drop-hover'));
        if (dragging) {
          const over = document.elementFromPoint(ev.clientX, ev.clientY);
          const slotEl = over && over.closest && over.closest('.hb-slot');
          if (slotEl && this.hooks.assignDraggedToSlot) {
            const idx = [...slotEl.parentNode.children].indexOf(slotEl);
            this.hooks.assignDraggedToSlot(idx, item);
          }
        }
        if (ghost) ghost.remove();
        this.dragItem = null;
      };

      // With pointer capture the move/up events fire on the capturing element.
      el.addEventListener('pointermove', onMove);
      el.addEventListener('pointerup', onUp);
      el.addEventListener('pointercancel', onUp);
    });
  }

  itemDetails(item) {
    const icon = item.kind === 'potion' && item.icon ? item.icon + ' ' : '';
    const lines = [`<b class="${rarityClass(item)}">${icon}${item.name}</b>`];
    if (item.kind === 'potion') {
      const tgt = item.restoreType === 'hp' ? t('hp') : item.restoreType === 'mana' ? t('mana') : `${t('hp')} + ${t('mana')}`;
      const amount = item.restorePct ? `${Math.round(item.restorePct * 100)}%` : item.restore;
      lines.push(`✚ ${t('restores')} ${amount} ${tgt}`);
    }
    if (item.atk != null) lines.push(`${t('attack')}: ${item.atk}`);
    if (item.defense) lines.push(`${t('defense')}: ${item.defense}`);
    if (item.element && item.element !== 'none') lines.push(`${t('element')}: ${elementName(item.element)}`);
    if (item.speedBonus) lines.push(`+${Math.round(item.speedBonus * 100)}% ${t('boots') || ''}`.trim());
    if (item.ability) lines.push(`✨ ${item.ability.name}`);
    if (item.levelReq > 1) lines.push(`${t('levelReq')}: ${item.levelReq}`);
    if (item.weight) lines.push(`${t('weight')}: ${item.weight}`);
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
      const icon = def.icon ? def.icon + ' ' : '';
      row.innerHTML = `<span>${icon}${label}</span><span class="price">${def.value} 💰</span>`;
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
      <div class="ctx-sub">${t('depotHint')}</div>`;
    const cols = document.createElement('div');
    cols.className = 'depot-cols';

    const bpCol = document.createElement('div');
    bpCol.innerHTML = `<div class="col-h">${t('backpack')}</div>`;
    this.inv.backpack.forEach((it, i) => {
      const r = document.createElement('button');
      r.className = 'depot-item ' + rarityClass(it);
      r.textContent = `${itemIcon(it)} ${it.name}`;
      r.addEventListener('click', () => { this.hooks.depositItem(city.id, i); this.openDepot(city); });
      bpCol.appendChild(r);
    });

    const dpCol = document.createElement('div');
    dpCol.innerHTML = `<div class="col-h">${t('depot')}</div>`;
    store.forEach((it, i) => {
      const r = document.createElement('button');
      r.className = 'depot-item ' + rarityClass(it);
      r.textContent = `${itemIcon(it)} ${it.name}`;
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
}

export { SLOT_ICON };
