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

  togglePanel() {
    this.collapsed = !this.collapsed;
    this.refs.sidePanel.classList.toggle('collapsed', this.collapsed);
    this.refs.panelToggle.textContent = this.collapsed ? '‹' : '›';
  }

  setVitals(hp, maxHp, xpInfo) {
    this.level = xpInfo.level;
    this.refs.hpFill.style.width = Math.max(0, (hp / maxHp) * 100) + '%';
    this.refs.hpText.textContent = `${Math.max(0, Math.ceil(hp))}/${maxHp}`;
    this.refs.xpFill.style.width = (xpInfo.frac * 100) + '%';
    this.refs.xpText.textContent = `${t('xp')} ${Math.floor(xpInfo.frac * 100)}%`;
    this.refs.levelBadge.textContent = xpInfo.level;
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
        cell.innerHTML = `<span class="ico">${itemIcon(item)}</span>`;
        cell.addEventListener('click', () => this.onBackpackClick(i));
        this.attachTooltip(cell, item);
      }
      grid.appendChild(cell);
    }
  }

  renderAll() {
    this.renderEquipment();
    this.renderBackpack();
    this.setCapacity(this.level);
  }

  onBackpackClick(i) {
    const item = this.inv.backpack[i];
    if (!item) return;
    this.openContext(item, [
      { label: t('equip'), fn: () => this.hooks.equip(i) },
      { label: t('drop'), fn: () => this.hooks.dropItem(i) },
    ]);
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

  itemDetails(item) {
    const lines = [`<b class="${rarityClass(item)}">${item.name}</b>`];
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
    for (const def of stock) {
      const row = document.createElement('div');
      row.className = 'shop-row';
      row.innerHTML = `<span>${def.name}</span><span class="price">${def.value} 💰</span>`;
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
