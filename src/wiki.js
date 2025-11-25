// Mundum WIKIA — a full, in-game compendium. A full-screen overlay (same shape
// as SkillPanel) that reads LIVE from the data modules, so it never goes stale:
// add a creature/item/city and it shows up here automatically.
//
// Sections: Resumen · Ciudades · Cuevas · Criaturas · Items · Profesiones.
// Everything is derived from the pure-data modules — no Three.js, no game state.

import { t, getLang } from './i18n.js';
import { CREATURES } from './data/creatures.js';
import {
  WEAPONS, ARMORS, CONTAINERS, POTIONS, LIGHTS, COINS,
  LEGENDARY_ABILITIES, LEGENDARY_CHANCE, ELEMENTS, elementMultiplier,
} from './data/items.js';
import {
  PROFESSIONS, skillPower, skillMana, professionStats,
} from './data/professions.js';
import { CITIES, nearestCity } from './cities.js';
import { DUNGEONS } from './dungeons.js';
import { iconFor } from './itemIcons.js';
import { creatureIcon } from './creatureIcons.js';
import { renderCreatureViews } from './portrait.js';

// ---- small helpers --------------------------------------------------------

function el(tag, opts = {}, kids) {
  const n = document.createElement(tag);
  if (opts.class) n.className = opts.class;
  if (opts.text != null) n.textContent = opts.text;
  if (opts.html != null) n.innerHTML = opts.html;
  if (opts.attrs) for (const k in opts.attrs) n.setAttribute(k, opts.attrs[k]);
  if (opts.on) for (const k in opts.on) n.addEventListener(k, opts.on[k]);
  if (kids) for (const c of kids) if (c) n.appendChild(c);
  return n;
}

function hex(c) { return '#' + (c >>> 0).toString(16).padStart(6, '0').slice(-6); }
function pct(p) { return (p * 100 < 1 ? (p * 100).toFixed(1) : Math.round(p * 100)) + '%'; }
function lang() { return getLang(); }
function loc(obj) { return obj ? (obj[lang()] || obj.es || obj.en) : ''; }

const ELEMENT_EMOJI = { none: '◽', fire: '🔥', water: '💧', plant: '🌿' };
const BIOME_LABEL = {
  es: { grass: 'Praderas', beach: 'Playa', forest: 'Bosque', desert: 'Desierto',
        mountain: 'Montaña', snow: 'Nieve', swamp: 'Pantano', water: 'Agua', anywhere: 'En todas partes' },
  en: { grass: 'Grassland', beach: 'Beach', forest: 'Forest', desert: 'Desert',
        mountain: 'Mountain', snow: 'Snow', swamp: 'Swamp', water: 'Water', anywhere: 'Everywhere' },
};
function biomeName(b) { return (BIOME_LABEL[lang()] && BIOME_LABEL[lang()][b]) || b || '—'; }

// Creatures store no weight, only variantScale (~0.6–2.4). Derive a friendly
// size class and an approximate weight (cubic with size) so the wiki can show
// "tamaño" and "peso" the way the user asked.
function sizeClass(scale) {
  const s = scale || 1;
  const M = lang() === 'en'
    ? [[0.8, 'Tiny'], [1.1, 'Small'], [1.5, 'Medium'], [2.0, 'Large'], [Infinity, 'Huge']]
    : [[0.8, 'Diminuto'], [1.1, 'Pequeño'], [1.5, 'Mediano'], [2.0, 'Grande'], [Infinity, 'Enorme']];
  for (const [max, label] of M) if (s < max) return label;
  return M[M.length - 1][1];
}
function approxWeight(scale) {
  // ~40 kg at scale 1, scaling with volume (scale³). Rounded to something readable.
  const kg = 40 * Math.pow(scale || 1, 3);
  return kg >= 1000 ? `${(kg / 1000).toFixed(1)} t` : `${Math.round(kg)} kg`;
}
function heightMeters(scale) {
  // Family base ~1 unit ≈ 1.0 m for a normal creature; scale tweaks it.
  return `${(1.0 * (scale || 1)).toFixed(1)} m`;
}

// A creature's display element with the rock-paper-scissors note.
function elementLine(elem) {
  if (!elem || elem === 'none') return null;
  const beats = ELEMENTS.find((e) => e !== 'none' && elementMultiplier(elem, e) > 1);
  const weak = ELEMENTS.find((e) => e !== 'none' && elementMultiplier(elem, e) < 1 && elementMultiplier(elem, e) > 0);
  const L = lang();
  const elName = elementName(elem);
  if (L === 'en') return `${ELEMENT_EMOJI[elem]} ${elName} — strong vs ${elementName(beats)}, weak vs ${elementName(weak)}`;
  return `${ELEMENT_EMOJI[elem]} ${elName} — fuerte contra ${elementName(beats)}, débil contra ${elementName(weak)}`;
}
function elementName(e) {
  const M = { es: { none: 'Neutro', fire: 'Fuego', water: 'Agua', plant: 'Planta' },
              en: { none: 'Neutral', fire: 'Fire', water: 'Water', plant: 'Plant' } };
  return (M[lang()] && M[lang()][e]) || e;
}

// Item display name: items keep English proper names, but some carry {es,en}.
function itemName(it) {
  if (!it) return '';
  if (typeof it.name === 'object') return loc(it.name);
  return it.name || it.id;
}

// Which dungeon (cave) a creature family lives in, if any.
const FAMILY_TO_DUNGEON = (() => {
  const m = {};
  for (const d of DUNGEONS) for (const f of (d.creatureFamilies || [])) (m[f] ||= []).push(d);
  return m;
})();

// Build a friendly name for any loot itemId, scanning every item table.
const ALL_ITEM_DEFS = (() => {
  const m = new Map();
  for (const w of WEAPONS) m.set(w.id, w);
  for (const a of ARMORS) m.set(a.id, a);
  for (const c of CONTAINERS) m.set(c.id, c);
  for (const p of POTIONS) m.set(p.id, p);
  for (const l of LIGHTS) m.set(l.id, l);
  for (const c of COINS) m.set(c.id, c);
  return m;
})();
function lootName(id) {
  if (id === 'gold') return lang() === 'en' ? 'Gold' : 'Oro';
  const def = ALL_ITEM_DEFS.get(id);
  return def ? itemName(def) : id;
}

// Reverse index: for each item id, which creatures drop it and at what chance.
const DROPPED_BY = (() => {
  const m = new Map();
  for (const c of CREATURES) {
    for (const d of (c.loot || [])) {
      if (!d || !d.itemId || d.itemId === 'gold') continue;
      if (!m.has(d.itemId)) m.set(d.itemId, []);
      m.get(d.itemId).push({ creature: c, chance: d.chance });
    }
  }
  // strongest droppers first
  for (const arr of m.values()) arr.sort((a, b) => (b.chance || 0) - (a.chance || 0));
  return m;
})();

// ---- the panel ------------------------------------------------------------

const TABS = [
  { id: 'overview',    icon: '🌍', key: 'wikiOverview' },
  { id: 'cities',      icon: '🏰', key: 'wikiCities' },
  { id: 'caves',       icon: '🕳️', key: 'wikiCaves' },
  { id: 'creatures',   icon: '🐉', key: 'wikiCreatures' },
  { id: 'items',       icon: '⚔️', key: 'wikiItems' },
  { id: 'professions', icon: '🎓', key: 'wikiProfessions' },
];

export class Wiki {
  constructor() {
    this.tab = 'overview';
    this.creatureQuery = '';
    this.creatureSort = 'level';
    this.itemCategory = 'weapon';
    this.selectedCreature = null; // id of an expanded creature
    this.root = document.getElementById('wiki-panel');
    if (!this.root) {
      this.root = document.createElement('div');
      this.root.id = 'wiki-panel';
      this.root.className = 'hidden';
      this.root.addEventListener('click', (e) => { if (e.target === this.root) this.close(); });
      document.body.appendChild(this.root);
    }
  }

  open(tab) { if (tab) this.tab = tab; this.root.classList.remove('hidden'); this.render(); }
  close() { this.root.classList.add('hidden'); }
  toggle() { if (this.root.classList.contains('hidden')) this.open(); else this.close(); }
  get isOpen() { return !this.root.classList.contains('hidden'); }

  render() {
    this.root.innerHTML = '';
    const card = el('div', { class: 'wk-card' });

    const head = el('div', { class: 'wk-head' });
    head.appendChild(el('div', { class: 'wk-title', html: `📚 <b>${t('wikiTitle')}</b>` }));
    head.appendChild(el('button', { class: 'wk-x', text: '✕', on: { click: () => this.close() } }));
    card.appendChild(head);

    const tabs = el('div', { class: 'wk-tabs' });
    for (const tb of TABS) {
      tabs.appendChild(el('button', {
        class: 'wk-tab' + (this.tab === tb.id ? ' active' : ''),
        html: `${tb.icon}<span>${t(tb.key)}</span>`,
        on: { click: () => { this.tab = tb.id; this.render(); } },
      }));
    }
    card.appendChild(tabs);

    const body = el('div', { class: 'wk-body' });
    body.appendChild(this._view());
    card.appendChild(body);

    this.root.appendChild(card);
  }

  _view() {
    switch (this.tab) {
      case 'cities': return this._cities();
      case 'caves': return this._caves();
      case 'creatures': return this._creatures();
      case 'items': return this._items();
      case 'professions': return this._professions();
      default: return this._overview();
    }
  }

  // -- OVERVIEW -------------------------------------------------------------
  _overview() {
    const box = el('div', { class: 'wk-section' });
    box.appendChild(el('p', { class: 'wk-lead', text: t('wikiLead') }));

    const stats = el('div', { class: 'wk-stat-grid' });
    const cards = [
      ['🏰', CITIES.length, t('wikiCities')],
      ['🕳️', DUNGEONS.length, t('wikiCaves')],
      ['🐉', CREATURES.length, t('wikiCreatures')],
      ['⚔️', WEAPONS.length + ARMORS.length, t('wikiEquipment')],
      ['🧪', POTIONS.length, t('wikiPotions')],
      ['🎓', PROFESSIONS.length, t('wikiProfessions')],
    ];
    for (const [ico, n, label] of cards) {
      stats.appendChild(el('div', { class: 'wk-stat' }, [
        el('div', { class: 'wk-stat-n', text: `${ico} ${n}` }),
        el('div', { class: 'wk-stat-l', text: label }),
      ]));
    }
    box.appendChild(stats);

    // Rules / mechanics digest, all derived from data where possible.
    box.appendChild(el('h3', { text: t('wikiMechanics') }));
    const ul = el('ul', { class: 'wk-list' });
    const rules = lang() === 'en' ? [
      `Elements — fire beats plant, plant beats water, water beats fire. Same element does 0 damage; ±20% on advantage.`,
      `Rarity — a max roll is Elite; ${pct(LEGENDARY_CHANCE)} of drops are Legendary (max attack + a bonus ability).`,
      `Night — creatures deal +30% damage after dark (your device clock).`,
      `Events — one random daily ×2 EXP or ×2 drop; weekends 15:00–22:00 give ×2 EXP.`,
      `Gold stacks as bronze→silver→gold→platinum→diamond, 100 of one = 1 of the next.`,
      `Carry weight is limited; bags hold 8, backpacks 20.`,
    ] : [
      `Elementos — fuego vence a planta, planta a agua, agua a fuego. Mismo elemento hace 0 daño; ±20% por ventaja.`,
      `Rareza — la tirada máxima es Élite; el ${pct(LEGENDARY_CHANCE)} de los drops es Legendario (ataque máximo + habilidad extra).`,
      `Noche — las criaturas hacen +30% de daño de noche (reloj de tu dispositivo).`,
      `Eventos — cada día ×2 EXP o ×2 botín al azar; fines de semana 15:00–22:00 dan ×2 EXP.`,
      `El oro se apila bronce→plata→oro→platino→diamante, 100 de uno = 1 del siguiente.`,
      `El peso de carga es limitado; las bolsas llevan 8, las mochilas 20.`,
    ];
    for (const r of rules) ul.appendChild(el('li', { text: r }));
    box.appendChild(ul);

    // Difficulty curve from the actual cave minLevels.
    box.appendChild(el('h3', { text: t('wikiCurve') }));
    const curve = el('div', { class: 'wk-curve' });
    const sorted = [...DUNGEONS].sort((a, b) => a.minLevel - b.minLevel);
    for (const d of sorted) {
      curve.appendChild(el('div', { class: 'wk-curve-step', html:
        `<b>Lv ${d.minLevel}+</b><span>${loc(d.name)}</span>` }));
    }
    box.appendChild(curve);
    return box;
  }

  // -- CITIES ---------------------------------------------------------------
  _cities() {
    const box = el('div', { class: 'wk-section' });
    box.appendChild(el('p', { class: 'wk-lead', text: t('wikiCitiesLead', CITIES.length) }));
    for (const c of CITIES) {
      const card = el('div', { class: 'wk-entry' });
      card.appendChild(el('div', { class: 'wk-entry-head', html:
        `🏰 <b>${c.name}</b> <span class="wk-coord">(${c.x}, ${c.z})</span>` }));

      const meta = el('div', { class: 'wk-kv' });
      meta.appendChild(kv('📍', t('wikiCoords'), `${c.x}, ${c.z}`));
      meta.appendChild(kv('⛪', t('wikiTemple'), t('wikiTempleNote')));
      meta.appendChild(kv('🏪', t('wikiShop'), t('wikiShopNote')));
      meta.appendChild(kv('📦', t('wikiDepot'), t('wikiDepotNote')));
      meta.appendChild(kv('🌀', t('wikiPortal'), t('wikiPortalNote')));
      card.appendChild(meta);

      // Nearby caves (closest 3) so players know where to grind from this city.
      const near = DUNGEONS
        .map((d) => ({ d, dist: Math.round(Math.hypot(d.x - c.x, d.z - c.z)) }))
        .sort((a, b) => a.dist - b.dist)
        .slice(0, 3);
      const nearBox = el('div', { class: 'wk-sub' });
      nearBox.appendChild(el('div', { class: 'wk-sub-t', text: t('wikiNearbyCaves') }));
      for (const { d, dist } of near) {
        nearBox.appendChild(el('div', { class: 'wk-chip', html:
          `🕳️ ${loc(d.name)} · Lv ${d.minLevel}+ · ${dist}m` }));
      }
      card.appendChild(nearBox);
      box.appendChild(card);
    }
    return box;
  }

  // -- CAVES ----------------------------------------------------------------
  _caves() {
    const box = el('div', { class: 'wk-section' });
    box.appendChild(el('p', { class: 'wk-lead', text: t('wikiCavesLead', DUNGEONS.length) }));
    const sorted = [...DUNGEONS].sort((a, b) => a.minLevel - b.minLevel);
    for (const d of sorted) {
      const card = el('div', { class: 'wk-entry' });
      const city = nearestCity(d.x, d.z);
      const dist = Math.round(Math.hypot(d.x - city.x, d.z - city.z));
      card.appendChild(el('div', { class: 'wk-entry-head', html:
        `🕳️ <b>${loc(d.name)}</b> <span class="wk-badge">Lv ${d.minLevel}+</span>` }));

      const meta = el('div', { class: 'wk-kv' });
      meta.appendChild(kv('📍', t('wikiCoords'), `${d.x}, ${d.z}`));
      meta.appendChild(kv('🏰', t('wikiNearestCity'), `${city.name} (${dist}m)`));
      meta.appendChild(kv('🎚️', t('wikiMinLevel'), `${d.minLevel}`));
      if (d.chest) meta.appendChild(kv('🎁', t('wikiChest'), lootName(d.chest.itemId)));
      card.appendChild(meta);

      // Families that spawn inside (and on the surface nearby).
      const fam = el('div', { class: 'wk-sub' });
      fam.appendChild(el('div', { class: 'wk-sub-t', text: t('wikiInhabitants') }));
      const inside = CREATURES
        .filter((c) => (d.creatureFamilies || []).includes(c.family))
        .sort((a, b) => a.level - b.level);
      const chipRow = el('div', { class: 'wk-chip-row' });
      for (const c of inside) {
        chipRow.appendChild(el('button', { class: 'wk-chip wk-chip-btn', html:
          `${swatch(c.color)} ${c.name} <span class="wk-dim">Lv ${c.level}</span>`,
          on: { click: () => { this.tab = 'creatures'; this.selectedCreature = c.id;
            this.creatureQuery = c.name; this.render(); } } }));
      }
      fam.appendChild(chipRow);
      card.appendChild(fam);
      box.appendChild(card);
    }
    return box;
  }

  // -- CREATURES ------------------------------------------------------------
  _creatures() {
    const box = el('div', { class: 'wk-section' });

    const controls = el('div', { class: 'wk-controls' });
    const search = el('input', { class: 'wk-search', attrs: {
      type: 'search', placeholder: t('wikiSearchCreature'), value: this.creatureQuery } });
    search.addEventListener('input', (e) => {
      this.creatureQuery = e.target.value;
      this._renderCreatureList(listBox);
    });
    controls.appendChild(search);

    const sortSel = el('select', { class: 'wk-select' });
    for (const [val, key] of [['level', 'wikiSortLevel'], ['name', 'wikiSortName'],
                              ['hp', 'wikiSortHp'], ['exp', 'wikiSortExp']]) {
      const o = el('option', { text: t(key), attrs: { value: val } });
      if (this.creatureSort === val) o.selected = true;
      sortSel.appendChild(o);
    }
    sortSel.addEventListener('change', (e) => {
      this.creatureSort = e.target.value;
      this._renderCreatureList(listBox);
    });
    controls.appendChild(sortSel);
    box.appendChild(controls);

    const listBox = el('div', { class: 'wk-creature-list' });
    box.appendChild(listBox);
    this._renderCreatureList(listBox);

    // keep focus / caret position when typing
    setTimeout(() => { if (this.creatureQuery) { search.focus(); search.selectionStart = search.value.length; } }, 0);
    return box;
  }

  _filteredCreatures() {
    const q = this.creatureQuery.trim().toLowerCase();
    let list = CREATURES.filter((c) => !q || c.name.toLowerCase().includes(q) || c.family.includes(q));
    const s = this.creatureSort;
    list = list.slice().sort((a, b) => {
      if (s === 'name') return a.name.localeCompare(b.name);
      if (s === 'hp') return b.hp - a.hp;
      if (s === 'exp') return b.exp - a.exp;
      return a.level - b.level || a.name.localeCompare(b.name);
    });
    return list;
  }

  _renderCreatureList(container) {
    container.innerHTML = '';
    const list = this._filteredCreatures();
    container.appendChild(el('div', { class: 'wk-count', text:
      t('wikiShowing', list.length, CREATURES.length) }));
    const MAX = 200; // keep the DOM light; search narrows the rest
    for (const c of list.slice(0, MAX)) container.appendChild(this._creatureRow(c));
    if (list.length > MAX) container.appendChild(el('div', { class: 'wk-more', text:
      t('wikiMore', list.length - MAX) }));
  }

  _creatureRow(c) {
    const open = this.selectedCreature === c.id;
    const row = el('div', { class: 'wk-cr' + (open ? ' open' : '') });
    const head = el('button', { class: 'wk-cr-head', on: { click: () => {
      this.selectedCreature = open ? null : c.id;
      this.render();
      setTimeout(() => { const node = this.root.querySelector('.wk-cr.open'); if (node) node.scrollIntoView({ block: 'nearest' }); }, 0);
    } } });
    head.appendChild(el('span', { class: 'wk-cr-ico', attrs: { style: 'width:22px;height:22px' }, html: creatureIcon(c) }));
    head.appendChild(el('span', { class: 'wk-cr-name', text: c.name }));
    const tags = el('span', { class: 'wk-cr-tags' });
    tags.appendChild(el('span', { class: 'wk-tag', text: `Lv ${c.level}` }));
    tags.appendChild(el('span', { class: 'wk-tag ' + (c.aggressive ? 'wk-aggro' : 'wk-calm'),
      text: c.aggressive ? t('wikiAggressive') : t('wikiPassive') }));
    if (c.element && c.element !== 'none') tags.appendChild(el('span', { class: 'wk-tag', text: ELEMENT_EMOJI[c.element] }));
    head.appendChild(tags);
    row.appendChild(head);

    if (open) row.appendChild(this._creatureDetail(c));
    return row;
  }

  _creatureDetail(c) {
    const d = el('div', { class: 'wk-cr-detail' });

    // Real 3D front + side snapshots so you can see how the creature looks.
    // Guarded: if WebGL is unavailable renderCreatureViews returns null and we
    // fall back to a colour swatch so the panel still reads.
    const views = renderCreatureViews(c);
    const gallery = el('div', { class: 'wk-cr-views' });
    if (views) {
      gallery.appendChild(el('figure', { class: 'wk-cr-view' }, [
        el('img', { attrs: { src: views.front, alt: c.name, width: 150, height: 150 } }),
        el('figcaption', { text: lang() === 'en' ? 'Front' : 'Frente' }),
      ]));
      gallery.appendChild(el('figure', { class: 'wk-cr-view' }, [
        el('img', { attrs: { src: views.side, alt: c.name, width: 150, height: 150 } }),
        el('figcaption', { text: lang() === 'en' ? 'Side' : 'Lado' }),
      ]));
    } else {
      gallery.appendChild(el('div', { class: 'wk-cr-view-fallback', html: swatch(c.color, 64) }));
    }
    d.appendChild(gallery);

    const stats = el('div', { class: 'wk-statline' });
    stats.appendChild(stat('❤️', t('hp'), c.hp));
    stats.appendChild(stat('⚔️', t('wikiAttack'), c.attack));
    stats.appendChild(stat('🛡️', t('wikiDefense'), c.defense));
    stats.appendChild(stat('✨', t('xp'), c.exp));
    d.appendChild(stats);

    const meta = el('div', { class: 'wk-kv' });
    meta.appendChild(kv('📏', lang() === 'en' ? 'Size' : 'Tamaño',
      `${sizeClass(c.variantScale)} · ${heightMeters(c.variantScale)}`));
    meta.appendChild(kv('⚖️', lang() === 'en' ? 'Weight' : 'Peso', approxWeight(c.variantScale)));
    meta.appendChild(kv('🌿', t('wikiBiome'), biomeName(c.spawnBiome)));
    meta.appendChild(kv(c.aggressive ? '😡' : '😌', t('wikiBehavior'),
      c.aggressive ? `${t('wikiAggressive')} (${t('wikiAggroRange')} ${c.aggroRange}m)` : t('wikiPassive')));
    const eline = elementLine(c.element);
    if (eline) meta.appendChild(kv('🧪', t('wikiElement'), eline));

    // Where it lives — which cave(s).
    const caves = FAMILY_TO_DUNGEON[c.family] || [];
    if (caves.length) {
      meta.appendChild(kv('🕳️', t('wikiFoundIn'),
        caves.map((cv) => `${loc(cv.name)} (Lv ${cv.minLevel}+)`).join(', ')));
    } else {
      meta.appendChild(kv('🗺️', t('wikiFoundIn'), `${biomeName(c.spawnBiome)} (${t('wikiOverworld')})`));
    }
    d.appendChild(meta);

    // Loot table with chances.
    d.appendChild(el('div', { class: 'wk-sub-t', text: t('wikiLoot') }));
    const loot = el('div', { class: 'wk-loot' });
    for (const drop of (c.loot || [])) {
      if (drop.itemId === 'gold') {
        loot.appendChild(el('div', { class: 'wk-loot-row' }, [
          el('span', { class: 'wk-loot-name', text: `🪙 ${lootName('gold')}` }),
          el('span', { class: 'wk-loot-chance', text: `${drop.min}–${drop.max}` }),
        ]));
      } else {
        loot.appendChild(el('div', { class: 'wk-loot-row' }, [
          el('span', { class: 'wk-loot-name', text: lootName(drop.itemId) +
            (drop.potion ? ' 🧪' : '') }),
          el('span', { class: 'wk-loot-chance', text: pct(drop.chance || 0) }),
        ]));
      }
    }
    d.appendChild(loot);
    return d;
  }

  // -- ITEMS ----------------------------------------------------------------
  _items() {
    const box = el('div', { class: 'wk-section' });
    const cats = [
      ['weapon', '⚔️', t('wikiCatWeapons')],
      ['armor', '🛡️', t('wikiCatArmor')],
      ['potion', '🧪', t('wikiCatPotions')],
      ['light', '🔦', t('wikiCatLights')],
      ['coin', '🪙', t('wikiCatCoins')],
      ['legendary', '🌟', t('wikiCatLegendary')],
    ];
    const tabs = el('div', { class: 'wk-subtabs' });
    for (const [id, ico, label] of cats) {
      tabs.appendChild(el('button', {
        class: 'wk-subtab' + (this.itemCategory === id ? ' active' : ''),
        html: `${ico} ${label}`,
        on: { click: () => { this.itemCategory = id; this.render(); } },
      }));
    }
    box.appendChild(tabs);

    const list = el('div', { class: 'wk-item-list' });
    switch (this.itemCategory) {
      case 'armor': this._armorTable(list); break;
      case 'potion': this._potionTable(list); break;
      case 'light': this._lightTable(list); break;
      case 'coin': this._coinTable(list); break;
      case 'legendary': this._legendaryInfo(list); break;
      default: this._weaponTable(list);
    }
    box.appendChild(list);
    return box;
  }

  _tierBadge(tier) {
    const M = { es: { shop: 'Tienda', epic: 'Épico', 'legendary-tier': 'Legendario' },
                en: { shop: 'Shop', epic: 'Epic', 'legendary-tier': 'Legendary' } };
    const cls = { shop: 'wk-t-shop', epic: 'wk-t-epic', 'legendary-tier': 'wk-t-leg' }[tier] || '';
    return el('span', { class: 'wk-badge ' + cls, text: (M[lang()] && M[lang()][tier]) || tier });
  }

  _weaponTable(box) {
    const byType = {};
    for (const w of WEAPONS) (byType[w.type] ||= []).push(w);
    const TYPE_LABEL = { es: { sword: 'Espadas', axe: 'Hachas', bow: 'Arcos', wand: 'Varitas', shield: 'Escudos' },
                         en: { sword: 'Swords', axe: 'Axes', bow: 'Bows', wand: 'Wands', shield: 'Shields' } };
    for (const type of ['sword', 'axe', 'bow', 'wand', 'shield']) {
      const arr = byType[type]; if (!arr) continue;
      box.appendChild(el('h4', { text: (TYPE_LABEL[lang()] && TYPE_LABEL[lang()][type]) || type }));
      for (const w of arr.sort((a, b) => a.levelReq - b.levelReq)) {
        const card = el('div', { class: 'wk-item' });
        const top = el('div', { class: 'wk-item-top' });
        top.appendChild(el('span', { class: 'wk-item-name', html:
          `${itemIco(w)} ${itemName(w)}` }));
        top.appendChild(this._tierBadge(w.shopTier));
        card.appendChild(top);
        const tags = el('div', { class: 'wk-item-tags' });
        const atk = w.type === 'shield' ? `🛡️ ${w.defense} def` : `⚔️ ${w.atkMin}–${w.atkMax}`;
        tags.appendChild(tag(atk));
        if (w.type === 'shield' && (w.atkMax || 0) > 0) tags.appendChild(tag(`⚔️ ${w.atkMin}–${w.atkMax}`));
        if (w.element && w.element !== 'none') tags.appendChild(tag(`${ELEMENT_EMOJI[w.element]} ${elementName(w.element)}`));
        if (w.twoHanded) tags.appendChild(tag('✋✋ ' + t('wikiTwoHanded')));
        tags.appendChild(tag(`🎚️ Lv ${w.levelReq}`));
        tags.appendChild(tag(`⚖️ ${w.weight}`));
        if (w.value > 0) tags.appendChild(tag(`💰 ${w.value}`));
        card.appendChild(tags);
        const drops = this._dropSource(w.id);
        if (drops) card.appendChild(drops);
        box.appendChild(card);
      }
    }
  }

  _armorTable(box) {
    const bySlot = {};
    for (const a of ARMORS) (bySlot[a.slot] ||= []).push(a);
    const SLOT_LABEL = { es: { amulet: 'Amuletos', helmet: 'Cascos', armor: 'Armaduras', legs: 'Pantalones', boots: 'Botas' },
                         en: { amulet: 'Amulets', helmet: 'Helmets', armor: 'Body Armor', legs: 'Legs', boots: 'Boots' } };
    for (const slot of ['amulet', 'helmet', 'armor', 'legs', 'boots']) {
      const arr = bySlot[slot]; if (!arr) continue;
      box.appendChild(el('h4', { text: (SLOT_LABEL[lang()] && SLOT_LABEL[lang()][slot]) || slot }));
      for (const a of arr.sort((x, y) => x.levelReq - y.levelReq)) {
        const card = el('div', { class: 'wk-item' });
        const top = el('div', { class: 'wk-item-top' });
        top.appendChild(el('span', { class: 'wk-item-name', html: `${itemIco(a)} ${itemName(a)}` }));
        top.appendChild(this._tierBadge(a.shopTier));
        card.appendChild(top);
        const tags = el('div', { class: 'wk-item-tags' });
        tags.appendChild(tag(`🛡️ ${a.defense} def`));
        if (a.speedBonus) tags.appendChild(tag(`👟 +${Math.round(a.speedBonus * 100)}% ${t('wikiSpeed')}`));
        tags.appendChild(tag(`🎚️ Lv ${a.levelReq}`));
        tags.appendChild(tag(`⚖️ ${a.weight}`));
        if (a.value > 0) tags.appendChild(tag(`💰 ${a.value}`));
        card.appendChild(tags);
        const drops = this._dropSource(a.id);
        if (drops) card.appendChild(drops);
        box.appendChild(card);
      }
    }
  }

  _potionTable(box) {
    const groups = { hp: [], mana: [], both: [] };
    for (const p of POTIONS) (groups[p.restoreType] ||= []).push(p);
    const LBL = { es: { hp: 'Vida', mana: 'Maná', both: 'Mixtas / Especiales' },
                  en: { hp: 'Health', mana: 'Mana', both: 'Mixed / Special' } };
    for (const g of ['hp', 'mana', 'both']) {
      const arr = groups[g]; if (!arr || !arr.length) continue;
      box.appendChild(el('h4', { text: (LBL[lang()] && LBL[lang()][g]) || g }));
      for (const p of arr.sort((a, b) => a.levelReq - b.levelReq)) {
        const card = el('div', { class: 'wk-item' });
        card.appendChild(el('div', { class: 'wk-item-top' }, [
          el('span', { class: 'wk-item-name', html: `${itemIco(p)} ${itemName(p)}` }),
        ]));
        const tags = el('div', { class: 'wk-item-tags' });
        const amt = p.restorePct != null ? `${Math.round(p.restorePct * 100)}%` : `+${p.restore}`;
        tags.appendChild(tag(`${t('restores')} ${amt}`));
        tags.appendChild(tag(`🎚️ Lv ${p.levelReq}`));
        if (p.value > 0) tags.appendChild(tag(`💰 ${p.value}`));
        card.appendChild(tags);
        box.appendChild(card);
      }
    }
  }

  _lightTable(box) {
    for (const l of LIGHTS.sort((a, b) => a.levelReq - b.levelReq)) {
      const card = el('div', { class: 'wk-item' });
      card.appendChild(el('div', { class: 'wk-item-top' }, [
        el('span', { class: 'wk-item-name', html: `${itemIco(l)} ${itemName(l)}` }),
      ]));
      const tags = el('div', { class: 'wk-item-tags' });
      tags.appendChild(tag(l.passive ? t('wikiPassiveLight') : t('wikiToggleLight')));
      tags.appendChild(tag(`💡 ${l.radius}m`));
      tags.appendChild(tag(`🎚️ Lv ${l.levelReq}`));
      if (l.value > 0) tags.appendChild(tag(`💰 ${l.value}`));
      card.appendChild(tags);
      box.appendChild(card);
    }
  }

  _coinTable(box) {
    box.appendChild(el('p', { class: 'wk-lead', text: t('wikiCoinsLead') }));
    for (const c of COINS) {
      const card = el('div', { class: 'wk-item' });
      card.appendChild(el('div', { class: 'wk-item-top' }, [
        el('span', { class: 'wk-item-name', html: `${itemIco(c)} ${itemName(c)}` }),
      ]));
      const tags = el('div', { class: 'wk-item-tags' });
      tags.appendChild(tag(`= ${c.value.toLocaleString()} 🟠`));
      card.appendChild(tags);
      box.appendChild(card);
    }
  }

  _legendaryInfo(box) {
    box.appendChild(el('p', { class: 'wk-lead', text: t('wikiLegendaryLead') }));
    const grid = el('div', { class: 'wk-stat-grid' });
    grid.appendChild(el('div', { class: 'wk-stat' }, [
      el('div', { class: 'wk-stat-n', text: t('wikiRarityNormal') }),
      el('div', { class: 'wk-stat-l', text: t('wikiRarityNormalNote') }),
    ]));
    grid.appendChild(el('div', { class: 'wk-stat' }, [
      el('div', { class: 'wk-stat-n', text: '⭐ ' + t('wikiRarityElite') }),
      el('div', { class: 'wk-stat-l', text: t('wikiRarityEliteNote') }),
    ]));
    grid.appendChild(el('div', { class: 'wk-stat' }, [
      el('div', { class: 'wk-stat-n', text: '🌟 ' + t('wikiRarityLegendary') }),
      el('div', { class: 'wk-stat-l', text: t('wikiRarityLegendaryNote', pct(LEGENDARY_CHANCE)) }),
    ]));
    box.appendChild(grid);

    box.appendChild(el('h4', { text: t('wikiAbilities') }));
    for (const ab of LEGENDARY_ABILITIES) {
      const card = el('div', { class: 'wk-item' });
      card.appendChild(el('div', { class: 'wk-item-top' }, [
        el('span', { class: 'wk-item-name', html: `${ELEMENT_EMOJI[ab.element]} ${ab.name}` }),
      ]));
      card.appendChild(el('div', { class: 'wk-item-tags' }, [tag(ab.desc)]));
      box.appendChild(card);
    }
  }

  // Build a "dropped by" line for an item id (creature drops only).
  _dropSource(itemId) {
    const sources = DROPPED_BY.get(itemId);
    if (!sources || !sources.length) return null;
    const wrap = el('div', { class: 'wk-drops' });
    wrap.appendChild(el('span', { class: 'wk-drops-l', text: t('wikiDroppedBy') }));
    for (const s of sources.slice(0, 5)) {
      wrap.appendChild(el('span', { class: 'wk-chip wk-dim', text:
        `${s.creature.name} (${pct(s.chance || 0)})` }));
    }
    return wrap;
  }

  // -- PROFESSIONS ----------------------------------------------------------
  _professions() {
    const box = el('div', { class: 'wk-section' });
    box.appendChild(el('p', { class: 'wk-lead', text: t('wikiProfLead', PROFESSIONS.length) }));
    const WEAPON_LBL = { es: { sword: 'espada', axe: 'hacha', bow: 'arco', wand: 'varita', shield: 'escudo' },
                         en: { sword: 'sword', axe: 'axe', bow: 'bow', wand: 'wand', shield: 'shield' } };
    for (const p of PROFESSIONS) {
      const card = el('div', { class: 'wk-entry' });
      card.appendChild(el('div', { class: 'wk-entry-head', html:
        `${swatch(p.color, 18)} <b>${loc(p.name)}</b>` }));
      card.appendChild(el('p', { class: 'wk-prof-desc', text: loc(p.desc) }));

      // Derived stats at lv 1 / 50 / 100 to show the growth.
      const s1 = professionStats(p.id, 1), s50 = professionStats(p.id, 50), s100 = professionStats(p.id, 100);
      const meta = el('div', { class: 'wk-kv' });
      meta.appendChild(kv('🗡️', t('wikiWeapons'),
        p.allowedWeapons.map((w) => (WEAPON_LBL[lang()] && WEAPON_LBL[lang()][w]) || w).join(', ')));
      meta.appendChild(kv('❤️', t('hp'), `${s1.maxHp} → ${s50.maxHp} → ${s100.maxHp} (Lv 1/50/100)`));
      meta.appendChild(kv('💧', t('mana'), `${s1.maxMana} → ${s50.maxMana} → ${s100.maxMana} (Lv 1/50/100)`));
      meta.appendChild(kv('🎯', t('wikiRange'), `${p.attackRange}m`));
      card.appendChild(meta);

      // Skill tree.
      card.appendChild(el('div', { class: 'wk-sub-t', text: t('wikiSkillTree') }));
      const skills = el('div', { class: 'wk-skills' });
      for (const sk of p.skills) {
        const row = el('div', { class: 'wk-skill' });
        const ico = { area: '🔥', melee: '💥', ranged: '🎯', heal: '💚', summon: '🐾' }[sk.kind] || '✨';
        row.appendChild(el('span', { class: 'wk-skill-ico', text: ico }));
        const info = el('div', { class: 'wk-skill-info' });
        info.appendChild(el('div', { class: 'wk-skill-name', html:
          `<b>${loc(sk.name)}</b> <span class="wk-dim">Lv ${sk.reqLevel}+ · ${sk.maxLevel}⭐</span>` }));
        info.appendChild(el('div', { class: 'wk-skill-desc', text: loc(sk.desc) }));
        const verb = sk.kind === 'heal' ? '💚' : '⚔️';
        // power & mana at skill level 1 → max
        info.appendChild(el('div', { class: 'wk-skill-num', text:
          `${verb} ${skillPower(sk, 1)}→${skillPower(sk, sk.maxLevel)} · 💧 ${skillMana(sk, 1)}→${skillMana(sk, sk.maxLevel)}` +
          (sk.summonFamily ? ` · 🐾 ${sk.summonCount || 1}× ${sk.summonFamily}` : '') }));
        row.appendChild(info);
        skills.appendChild(row);
      }
      card.appendChild(skills);
      box.appendChild(card);
    }
    return box;
  }
}

// ---- tiny presentational helpers -----------------------------------------

function swatch(color, size = 14) {
  return `<span class="wk-swatch" style="background:${hex(color)};width:${size}px;height:${size}px"></span>`;
}
// Real procedural pixel-art item icon at a wiki-list size. Accepts a raw item
// definition (iconFor normalises id->baseId), so each weapon/armor/etc. shows
// its distinct icon instead of a flat colour swatch.
function itemIco(def, size = 26) {
  return `<span class="wk-ico" style="width:${size}px;height:${size}px">${iconFor(def)}</span>`;
}
function kv(ico, k, v) {
  return el('div', { class: 'wk-kv-row' }, [
    el('span', { class: 'wk-kv-k', html: `${ico} ${k}` }),
    el('span', { class: 'wk-kv-v', text: String(v) }),
  ]);
}
function stat(ico, label, val) {
  return el('div', { class: 'wk-stat-cell' }, [
    el('div', { class: 'wk-stat-cell-v', text: `${ico} ${val}` }),
    el('div', { class: 'wk-stat-cell-l', text: label }),
  ]);
}
function tag(text) { return el('span', { class: 'wk-tag', text }); }
