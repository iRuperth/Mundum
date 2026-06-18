// Mundum WIKIA — a full, in-game compendium. A full-screen overlay (same shape
// as SkillPanel) that reads LIVE from the data modules, so it never goes stale:
// add a creature/item/city and it shows up here automatically.
//
// Sections: Resumen · Ciudades · Cuevas · Criaturas · Items · Profesiones.
// Everything is derived from the pure-data modules — no Three.js, no game state.

import { t, getLang } from './i18n.js';
import { CREATURES } from './data/creatures.js';
import {
  WEAPONS, ARMORS, CONTAINERS, POTIONS, LIGHTS, COINS, QUIVERS,
  LEGENDARY_ABILITIES, LEGENDARY_CHANCE, ELEMENTS, elementMultiplier, isSecretItem,
} from './data/items.js';
import {
  PROFESSIONS, skillPower, skillMana, professionStats,
} from './data/professions.js';
import { MOUNTS, MOUNT_SPEED_MUL, MOUNT_JUMP_MUL } from './data/mounts.js';
import { CITIES, nearestCity } from './cities.js';
import { DUNGEONS } from './dungeons.js';
import { ZONES } from './zones.js';
import { QUESTS } from './data/quests.js';
import { getMaterial, MATERIALS } from './data/materials.js';
import { getTrophy, TROPHIES } from './data/trophies.js';
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

// A drop chance expressed in WORDS (the user's request: "es común", "es raro",
// "es extremadamente raro"). Tibia-style bands keyed off the percentage, so a
// 0.0001 chance reads "extremadamente raro" instead of a meaningless "0.0%".
//   común (>40%) · bastante común (20-40%) · poco común (5-20%) ·
//   raro (1-5%) · muy raro (0.1-1%) · extremadamente raro (<0.1%)
const RARITY_WORDS = {
  es: ['común', 'bastante común', 'poco común', 'raro', 'muy raro', 'extremadamente raro'],
  en: ['common', 'fairly common', 'uncommon', 'rare', 'very rare', 'extremely rare'],
};
function rarityBand(chance) {
  const p = (chance || 0) * 100;
  if (p >= 40) return 0;
  if (p >= 20) return 1;
  if (p >= 5) return 2;
  if (p >= 1) return 3;
  if (p >= 0.1) return 4;
  return 5;
}
function rarityWord(chance) {
  const w = RARITY_WORDS[lang()] || RARITY_WORDS.es;
  return w[rarityBand(chance)];
}
// CSS class so the wiki can colour the rarity word (green=common → red=extreme).
function rarityClass(chance) { return 'wk-rar-' + rarityBand(chance); }
// "1 de cada N" kill estimate from a chance (for the detailed panel).
function killsFor(chance) {
  const n = chance > 0 ? Math.round(1 / chance) : 0;
  return n > 1 ? n : 1;
}
function lang() { return getLang(); }
function loc(obj) { return obj ? (obj[lang()] || obj.es || obj.en) : ''; }

// Wiki-local strings for the new item-sources panel. Kept here (not in i18n.js)
// so this feature is self-contained; falls back to ES then the key.
const WK_STRINGS = {
  es: {
    wikiClickItemHint: '👆 Toca cualquier objeto para ver de dónde sale (criaturas, rareza, zonas y misiones).',
    wikiBackToItems: 'Volver al catálogo',
    wikiSrcDroppedBy: '🎯 Lo sueltan',
    wikiSrcNoDrop: 'No cae de criaturas.',
    wikiSrcQuests: '📜 Recompensa de misión',
    wikiSrcWhere: '🗺️ Se consigue en',
    wikiSrcShop: '🏪 También se compra en tiendas.',
    wikiSrcOneIn: '≈ 1 de cada',
    wikiSrcSecret: 'Objeto Secreto',
    wikiSrcSecretNote: 'No se compra, no cae de criaturas y no se gana en misiones. Solo lo otorga el Game Master (GM).',
  },
  en: {
    wikiClickItemHint: '👆 Tap any item to see where it comes from (creatures, rarity, zones and quests).',
    wikiBackToItems: 'Back to catalog',
    wikiSrcDroppedBy: '🎯 Dropped by',
    wikiSrcNoDrop: 'Not dropped by creatures.',
    wikiSrcQuests: '📜 Quest reward',
    wikiSrcWhere: '🗺️ Where to find',
    wikiSrcShop: '🏪 Also sold in shops.',
    wikiSrcOneIn: '≈ 1 in every',
    wikiSrcSecret: 'Secret Item',
    wikiSrcSecretNote: 'Not bought, not dropped, not quested. Only the Game Master (GM) can grant it.',
  },
};
function tw(key) { const L = lang(); return (WK_STRINGS[L] && WK_STRINGS[L][key]) || WK_STRINGS.es[key] || key; }

const ELEMENT_EMOJI = { none: '◽', fire: '🔥', water: '💧', plant: '🌿' };
const BIOME_LABEL = {
  es: { grass: 'Praderas', beach: 'Playa', forest: 'Bosque', desert: 'Desierto',
        mountain: 'Montaña', snow: 'Nieve', swamp: 'Pantano', water: 'Agua', cave: 'Cueva', anywhere: 'En todas partes' },
  en: { grass: 'Grassland', beach: 'Beach', forest: 'Forest', desert: 'Desert',
        mountain: 'Mountain', snow: 'Snow', swamp: 'Swamp', water: 'Water', cave: 'Cave', anywhere: 'Everywhere' },
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

// Loot/quest item ids are authored inconsistently (dashes AND underscores:
// 'rat-tail', 'leather_armor', 'leather-armor'…). Normalise to ONE canonical
// key so the same item always resolves the same way, no matter how it was typed.
function canon(id) { return String(id || '').toLowerCase().replace(/-/g, '_'); }

// Build ONE index of every real item definition (gear + consumables + crafting
// materials), keyed by its canonical id. `kind` lets the detail panel show the
// right stats; `slot` groups the catalog. Materials carry an emoji icon instead
// of a procedural one.
const ALL_ITEM_DEFS = (() => {
  const m = new Map();
  const add = (def, kind, slot) => {
    if (!def || !def.id) return;
    const key = canon(def.id);
    if (!m.has(key)) m.set(key, { ...def, _kind: kind, _slot: slot });
  };
  for (const w of WEAPONS) add(w, 'weapon', w.type);          // sword/axe/mace/lance/bow/wand/shield
  for (const a of ARMORS) add(a, 'armor', a.slot);            // helmet/armor/legs/boots/amulet/bag
  for (const q of QUIVERS) add(q, 'quiver', 'quiver');        // archer off-hand quivers (+arrowAtk)
  for (const c of CONTAINERS) add(c, 'container', 'bag');
  for (const p of POTIONS) add(p, 'potion', 'potion');
  for (const l of LIGHTS) add(l, 'light', 'light');
  for (const c of COINS) add(c, 'coin', 'coin');
  // Crafting materials (silk, hides, scales, fangs…) and trophies (one per family)
  // are authored into loot tables but live in their own modules — materials.js /
  // trophies.js own their {es,en} names + emoji icons. Pull them in so dropped
  // loot resolves to a real name/icon instead of a raw id.
  for (const c of CREATURES) {
    for (const d of (c.loot || [])) {
      if (!d || !d.itemId || d.itemId === 'gold') continue;
      const key = canon(d.itemId);
      if (m.has(key)) continue;
      const mat = getMaterial(d.itemId);
      if (mat) { m.set(key, { ...mat, _kind: 'material', _slot: 'material' }); continue; }
      const tr = getTrophy(d.itemId);
      if (tr) m.set(key, { ...tr, _kind: 'material', _slot: 'trophy' });
    }
  }
  return m;
})();
// Resolve any loot/quest id (in any dash/underscore form) to its definition.
function itemDef(id) { return ALL_ITEM_DEFS.get(canon(id)) || null; }
function lootName(id) {
  if (id === 'gold') return lang() === 'en' ? 'Gold' : 'Oro';
  const def = itemDef(id);
  if (def) return itemName(def);
  // Unknown id (e.g. a placeholder legendary name not yet a real item): titleize.
  return String(id).replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// Reverse index: canonical item id -> [{ creature, chance }], strongest first.
// Built ONCE by scanning every creature's loot so clicking an item is instant.
const DROPPED_BY = (() => {
  const m = new Map();
  for (const c of CREATURES) {
    for (const d of (c.loot || [])) {
      if (!d || !d.itemId || d.itemId === 'gold') continue;
      const key = canon(d.itemId);
      if (!m.has(key)) m.set(key, []);
      m.get(key).push({ creature: c, chance: d.chance });
    }
  }
  for (const arr of m.values()) arr.sort((a, b) => (b.chance || 0) - (a.chance || 0));
  return m;
})();
function droppedBy(id) { return DROPPED_BY.get(canon(id)) || []; }

// Which themed ZONE(S) a creature lives in: its family is in zone.families OR
// its id is listed in zone.ids. (zones.js builds pools the same way.)
function zonesForCreature(c) {
  return ZONES.filter((z) =>
    (z.families || []).includes(c.family) || (z.ids || []).includes(c.id));
}
// A short zone label for a creature: its themed zone name(s) if any, else its
// open-world biome. Used in the item "dropped by" rows.
function zoneLabelForCreature(c) {
  const zs = zonesForCreature(c);
  if (zs.length) return zs.map((z) => loc(z.name)).join(', ');
  return biomeName(c.spawnBiome);
}

// Reverse index: canonical item id -> [quest] that rewards it.
const QUEST_REWARD = (() => {
  const m = new Map();
  for (const q of QUESTS) {
    for (const id of (q.rewards && q.rewards.items) || []) {
      const key = canon(id);
      if (!m.has(key)) m.set(key, []);
      m.get(key).push(q);
    }
  }
  return m;
})();
function questsRewarding(id) { return QUEST_REWARD.get(canon(id)) || []; }

// ---- the panel ------------------------------------------------------------

const TABS = [
  { id: 'overview',    icon: '🌍', key: 'wikiOverview' },
  { id: 'cities',      icon: '🏰', key: 'wikiCities' },
  { id: 'caves',       icon: '🕳️', key: 'wikiCaves' },
  { id: 'creatures',   icon: '🐉', key: 'wikiCreatures' },
  { id: 'items',       icon: '⚔️', key: 'wikiItems' },
  { id: 'materials',   icon: '🧵', key: 'wikiMaterials' },
  { id: 'quests',      icon: '📜', key: 'wikiQuests' },
  { id: 'mounts',      icon: '🐎', key: 'wikiMounts' },
  { id: 'professions', icon: '🎓', key: 'wikiProfessions' },
  { id: 'mechanics',   icon: '📖', key: 'wikiMechanics' },
];

export class Wiki {
  constructor() {
    this.tab = 'overview';
    this.creatureQuery = '';
    this.creatureSort = 'level';
    this.itemCategory = 'weapon';
    this.selectedCreature = null; // id of an expanded creature
    this.selectedItem = null;     // canonical id of the item whose "sources" panel is open
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
      case 'materials': return this._materials();
      case 'quests': return this._quests();
      case 'mounts': return this._mounts();
      case 'professions': return this._professions();
      case 'mechanics': return this._mechanics();
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

    // --- Combat & balance (Tibia-7.4 scale) --------------------------------
    // Derived from the live data caps + the combat.js formula constants so the
    // numbers here can never drift from the engine.
    const maxAtk = Math.max(...WEAPONS.filter((w) => w.type !== 'shield').map((w) => w.atkMax));
    const max1H = Math.max(...WEAPONS.filter((w) => w.type !== 'shield' && !w.twoHanded).map((w) => w.atkMax));
    const max2H = Math.max(...WEAPONS.filter((w) => w.type !== 'shield' && w.twoHanded).map((w) => w.atkMax));
    const cap = (slot) => Math.max(...ARMORS.filter((a) => a.slot === slot).map((a) => a.defense || 0));
    const shieldCap = Math.max(...WEAPONS.filter((w) => w.type === 'shield').map((w) => w.defense || 0));
    box.appendChild(el('h3', { text: t('wikiCombat') }));
    const cul = el('ul', { class: 'wk-list' });
    const combatRules = lang() === 'en' ? [
      `Basic-attack damage = 0.055 × weapon-skill × weapon-attack + level/8, then a 50–100% roll, minus 25% of the target's armor. So your weapon, your weapon skill (sword/axe/distance/magic, raised by USING it) and your level all push damage up together — Tibia style.`,
      `Weapon attack is capped low: one-handed weapons reach ${max1H}, two-handed reach ${max2H}. Only the top legendary of each class hits the ceiling — no weapon attacks 100+.`,
      `Armor caps (top legendary): shield ${shieldCap}, body armor ${cap('armor')}, legs ${cap('legs')}, helmet ${cap('helmet')}, boots ${cap('boots')}, amulet ${cap('amulet')}. Normal gear sits a little below.`,
      `Spell damage follows the Tibia formula: F = level×2 + magicLevel×3 (plus the points you put in the spell), times a per-spell factor and a per-class multiplier. Mages nuke hardest (an ultimate climbs past 2,000+, no cap), then archers, then knights. Spells cost mana — raise Magic Level by spending it on spells.`,
      `A same-level normal creature takes ~7–8 basic hits; small/minion creatures die in ~3–4; tanks and bosses take ~13–21 (more health, or they hit harder) — bring potions or a party for the big ones.`,
      `Leveling uses the official Tibia exp curve: reaching level 2 costs 100 exp, level 10 ~9,300, level 20 ~98,800. Kills give fixed exp by creature, so it speeds up gently then gets steep — exactly Tibia's pace.`,
      `Magic Level and weapon skills rise by USING them (casting / hitting), faster than classic Tibia so they climb every session. Archers add a quiver in the off hand: +1 to +5 attack to the bow by tier.`,
    ] : [
      `Daño del ataque básico = 0.055 × skill-del-arma × ataque-del-arma + nivel/8, luego una tirada del 50–100%, menos el 25% de la armadura del objetivo. Así el arma, el skill del arma (espada/hacha/distancia/magia, que sube al USARLO) y tu nivel suben el daño juntos — estilo Tibia.`,
      `El ataque del arma está topado bajo: las de una mano llegan a ${max1H}, las de dos manos a ${max2H}. Solo la legendaria top de cada clase alcanza el techo — ninguna arma ataca 100+.`,
      `Topes de armadura (legendaria top): escudo ${shieldCap}, armadura ${cap('armor')}, pantalón ${cap('legs')}, casco ${cap('helmet')}, botas ${cap('boots')}, amuleto ${cap('amulet')}. El equipo normal queda un poco por debajo.`,
      `El daño de los hechizos sigue la fórmula de Tibia: F = nivel×2 + nivel mágico×3 (más los puntos que pongas en el hechizo), por un factor de cada hechizo y un multiplicador de clase. El mago pega más fuerte (su definitivo pasa de 2.000+, sin tope), luego el arquero, luego el caballero. Los hechizos cuestan maná — el nivel mágico sube gastándolo en hechizos.`,
      `Una criatura normal de tu nivel aguanta ~7–8 golpes básicos; las pequeñas/minion caen en ~3–4; tanques y jefes aguantan ~13–21 (más vida, o pegan más) — lleva pociones o ve en grupo para los grandes.`,
      `Subir de nivel usa la curva de exp oficial de Tibia: llegar a nivel 2 cuesta 100 exp, nivel 10 ~9.300, nivel 20 ~98.800. Las criaturas dan exp fija según su tipo, así que sube suave al principio y luego se empina — el ritmo exacto de Tibia.`,
      `El nivel mágico y los skills de arma suben USÁNDOLOS (lanzar / golpear), más rápido que en el Tibia clásico para que suban cada sesión. Los arqueros añaden un carcaj en la mano libre: +1 a +5 de ataque al arco según el tier.`,
    ];
    for (const r of combatRules) cul.appendChild(el('li', { text: r }));
    box.appendChild(cul);

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

  // Open the item "sources" panel for a given item id (from any dash/underscore
  // form). Switches to the items tab so the panel is visible from anywhere.
  openItem(id) {
    this.tab = 'items';
    this.selectedItem = canon(id);
    this.render();
    setTimeout(() => { const n = this.root.querySelector('.wk-body'); if (n) n.scrollTop = 0; }, 0);
  }

  // -- ITEMS ----------------------------------------------------------------
  _items() {
    // When an item is selected, show its full "where does it come from" panel.
    if (this.selectedItem) {
      const def = ALL_ITEM_DEFS.get(this.selectedItem);
      if (def) return this._itemDetail(def);
      this.selectedItem = null; // unknown id — fall through to the catalog
    }

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

    box.appendChild(el('p', { class: 'wk-hint', text: tw('wikiClickItemHint') }));

    const list = el('div', { class: 'wk-item-list' });
    // One delegated click handler opens the sources panel for any card that
    // carries a data-item id (set by the table builders below).
    list.addEventListener('click', (e) => {
      const card = e.target.closest('.wk-item-click');
      if (card && card.dataset.item) this.openItem(card.dataset.item);
    });
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

  // A catalog card shell that is clickable and opens the item's sources panel.
  // Carries a canonical data-item id picked up by the delegated handler above.
  _catCard(def) {
    return el('div', { class: 'wk-item wk-item-click',
      attrs: { 'data-item': canon(def.id) } });
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
    const TYPE_LABEL = { es: { sword: 'Espadas', axe: 'Hachas', mace: 'Mazas', lance: 'Lanzas', bow: 'Arcos', wand: 'Varitas', shield: 'Escudos' },
                         en: { sword: 'Swords', axe: 'Axes', mace: 'Maces', lance: 'Lances', bow: 'Bows', wand: 'Wands', shield: 'Shields' } };
    for (const type of ['sword', 'axe', 'mace', 'lance', 'bow', 'wand', 'shield']) {
      const arr = byType[type]; if (!arr) continue;
      box.appendChild(el('h4', { text: (TYPE_LABEL[lang()] && TYPE_LABEL[lang()][type]) || type }));
      for (const w of arr.sort((a, b) => a.levelReq - b.levelReq)) {
        const card = this._catCard(w);
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
    for (const q of QUIVERS) (bySlot.quiver ||= []).push(q);
    for (const c of CONTAINERS) (bySlot.bag ||= []).push({ ...c, defense: 0, levelReq: 0 });
    const SLOT_LABEL = { es: { amulet: 'Amuletos', helmet: 'Cascos', armor: 'Armaduras', legs: 'Pantalones', boots: 'Botas', ring: 'Anillos', quiver: 'Carcajes (Arquero)', bag: 'Bolsas / Mochilas' },
                         en: { amulet: 'Amulets', helmet: 'Helmets', armor: 'Body Armor', legs: 'Legs', boots: 'Boots', ring: 'Rings', quiver: 'Quivers (Archer)', bag: 'Bags / Backpacks' } };
    for (const slot of ['amulet', 'helmet', 'armor', 'legs', 'boots', 'ring', 'quiver', 'bag']) {
      const arr = bySlot[slot]; if (!arr) continue;
      box.appendChild(el('h4', { text: (SLOT_LABEL[lang()] && SLOT_LABEL[lang()][slot]) || slot }));
      for (const a of arr.sort((x, y) => x.levelReq - y.levelReq)) {
        const card = this._catCard(a);
        if (slot === 'quiver') {
          const top = el('div', { class: 'wk-item-top' });
          top.appendChild(el('span', { class: 'wk-item-name', html: `${itemIco(a)} ${itemName(a)}` }));
          top.appendChild(this._tierBadge(a.shopTier));
          card.appendChild(top);
          const tags = el('div', { class: 'wk-item-tags' });
          tags.appendChild(tag(`🏹 +${a.arrowAtk} ${t('attack')}`));
          tags.appendChild(tag(`🎚️ Lv ${a.levelReq}`));
          tags.appendChild(tag(`⚖️ ${a.weight}`));
          if (a.value > 0) tags.appendChild(tag(`💰 ${a.value}`));
          card.appendChild(tags);
          const drops = this._dropSource(a.id);
          if (drops) card.appendChild(drops);
          box.appendChild(card);
          continue;
        }
        if (slot === 'bag') {
          const top = el('div', { class: 'wk-item-top' });
          top.appendChild(el('span', { class: 'wk-item-name', html: `${itemIco(a)} ${itemName(a)}` }));
          if (a.shopTier) top.appendChild(this._tierBadge(a.shopTier));
          card.appendChild(top);
          const tags = el('div', { class: 'wk-item-tags' });
          tags.appendChild(tag(`🎒 ${a.capacity} ${lang() === 'en' ? 'slots' : 'huecos'}`));
          tags.appendChild(tag(`⚖️ ${a.weight}`));
          if (a.value > 0) tags.appendChild(tag(`💰 ${a.value}`));
          card.appendChild(tags);
          const drops = this._dropSource(a.id);
          if (drops) card.appendChild(drops);
          box.appendChild(card);
          continue;
        }
        const top = el('div', { class: 'wk-item-top' });
        top.appendChild(el('span', { class: 'wk-item-name', html: `${itemIco(a)} ${itemName(a)}` }));
        top.appendChild(this._tierBadge(a.shopTier));
        card.appendChild(top);
        const tags = el('div', { class: 'wk-item-tags' });
        if (a.defense > 0) tags.appendChild(tag(`🛡️ ${a.defense} def`));
        // Rings/amulets carry skill, magic-level and regen bonuses, not (much)
        // defense — surface those so their value reads clearly.
        if (a.skillBonus) for (const [sk, n] of Object.entries(a.skillBonus)) tags.appendChild(tag(`✨ +${n} ${t(sk) || sk}`));
        if (a.magicLevelBonus) tags.appendChild(tag(`🔮 +${a.magicLevelBonus} ${t('magic')}`));
        if (a.hpRegenPerSec) tags.appendChild(tag(`❤️ +${a.hpRegenPerSec}/s`));
        if (a.manaRegenPerSec) tags.appendChild(tag(`💧 +${a.manaRegenPerSec}/s`));
        if (a.speedBonus) tags.appendChild(tag(`👟 +${Math.round(a.speedBonus * 100)}% ${t('wikiSpeed')}`));
        tags.appendChild(tag(`🎚️ Lv ${a.levelReq}`));
        tags.appendChild(tag(`⚖️ ${a.weight}`));
        if (a.value > 0) tags.appendChild(tag(`💰 ${a.value}`));
        if (a.vocation && a.vocation !== 'any') tags.appendChild(tag(`🎓 ${a.vocation}`));
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
        const card = this._catCard(p);
        card.appendChild(el('div', { class: 'wk-item-top' }, [
          el('span', { class: 'wk-item-name', html: `${itemIco(p)} ${itemName(p)}` }),
        ]));
        const tags = el('div', { class: 'wk-item-tags' });
        const amt = p.restorePct != null ? `${Math.round(p.restorePct * 100)}%` : `+${p.restore}`;
        tags.appendChild(tag(`${t('restores')} ${amt}`));
        tags.appendChild(tag(`🎚️ Lv ${p.levelReq}`));
        if (p.value > 0) tags.appendChild(tag(`💰 ${p.value}`));
        card.appendChild(tags);
        const drops = this._dropSource(p.id);
        if (drops) card.appendChild(drops);
        box.appendChild(card);
      }
    }
  }

  _lightTable(box) {
    for (const l of LIGHTS.sort((a, b) => a.levelReq - b.levelReq)) {
      const card = this._catCard(l);
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

  // Compact "dropped by" teaser on a catalog card (top droppers only). The whole
  // card is clickable, so this is just a preview; the full list lives in the
  // sources panel.
  _dropSource(itemId) {
    const sources = droppedBy(itemId);
    if (!sources.length) return null;
    const wrap = el('div', { class: 'wk-drops' });
    wrap.appendChild(el('span', { class: 'wk-drops-l', text: t('wikiDroppedBy') }));
    for (const s of sources.slice(0, 4)) {
      // Lead with the rarity WORD (coloured), keep the % as a quiet secondary.
      wrap.appendChild(el('span', { class: 'wk-chip wk-dim', html:
        `${s.creature.name} <span class="${rarityClass(s.chance)}">${rarityWord(s.chance)}</span> <span class="wk-dim">(${pct(s.chance || 0)})</span>` }));
    }
    if (sources.length > 4) wrap.appendChild(el('span', { class: 'wk-chip wk-dim',
      text: `+${sources.length - 4}` }));
    return wrap;
  }

  // A chip that jumps to a creature's detail in the Creatures tab.
  _creatureJumpChip(c, label) {
    return el('button', { class: 'wk-chip wk-chip-btn', html:
      `${swatch(c.color)} ${label || c.name} <span class="wk-dim">Lv ${c.level}</span>`,
      on: { click: () => {
        this.tab = 'creatures';
        this.selectedItem = null;
        this.selectedCreature = c.id;
        this.creatureQuery = c.name;
        this.render();
        setTimeout(() => { const n = this.root.querySelector('.wk-cr.open'); if (n) n.scrollIntoView({ block: 'nearest' }); }, 0);
      } } });
  }

  // -- ITEM SOURCES PANEL ---------------------------------------------------
  // "Where does this item come from?" — icon + stats, every creature that drops
  // it (chance + zone), quests that reward it, and the distinct zones to farm.
  _itemDetail(def) {
    const d = el('div', { class: 'wk-section wk-item-detail' });

    // Back to catalog.
    d.appendChild(el('button', { class: 'wk-back',
      text: '← ' + tw('wikiBackToItems'),
      on: { click: () => { this.selectedItem = null; this.render(); } } }));

    // Header: icon + name + type/slot.
    const head = el('div', { class: 'wk-id-head' });
    head.appendChild(el('span', { class: 'wk-id-ico', html: itemIco(def, 56) }));
    const hinfo = el('div', { class: 'wk-id-info' });
    const titleRow = el('div', { class: 'wk-id-title' });
    titleRow.appendChild(el('b', { text: itemName(def) }));
    if (def.shopTier) titleRow.appendChild(this._tierBadge(def.shopTier));
    hinfo.appendChild(titleRow);
    hinfo.appendChild(el('div', { class: 'wk-id-sub', text: this._itemKindLabel(def) }));
    head.appendChild(hinfo);
    d.appendChild(head);

    // Key stats line (only the relevant ones for this kind).
    const tags = el('div', { class: 'wk-item-tags' });
    if (def._kind === 'weapon') {
      if (def.type !== 'shield' && def.atkMax != null) tags.appendChild(tag(`⚔️ ${def.atkMin}–${def.atkMax}`));
      if (def.defense > 0) tags.appendChild(tag(`🛡️ ${def.defense} def`));
      if (def.element && def.element !== 'none') tags.appendChild(tag(`${ELEMENT_EMOJI[def.element]} ${elementName(def.element)}`));
      if (def.twoHanded) tags.appendChild(tag('✋✋ ' + t('wikiTwoHanded')));
    } else if (def._kind === 'armor') {
      if (def.defense > 0) tags.appendChild(tag(`🛡️ ${def.defense} def`));
      if (def.speedBonus) tags.appendChild(tag(`👟 +${Math.round(def.speedBonus * 100)}% ${t('wikiSpeed')}`));
    } else if (def._kind === 'quiver') {
      if (def.arrowAtk) tags.appendChild(tag(`🏹 +${def.arrowAtk} ${t('attack')}`));
    } else if (def._kind === 'container') {
      if (def.capacity) tags.appendChild(tag(`🎒 ${def.capacity} ${lang() === 'en' ? 'slots' : 'huecos'}`));
    } else if (def._kind === 'potion') {
      const amt = def.restorePct != null ? `${Math.round(def.restorePct * 100)}%` : `+${def.restore}`;
      tags.appendChild(tag(`${t('restores')} ${amt}`));
    } else if (def._kind === 'light') {
      if (def.radius) tags.appendChild(tag(`💡 ${def.radius}m`));
    }
    if (def.levelReq) tags.appendChild(tag(`🎚️ Lv ${def.levelReq}`));
    if (def.weight) tags.appendChild(tag(`⚖️ ${def.weight}`));
    if (def.value > 0) tags.appendChild(tag(`💰 ${def.value}`));
    if (tags.childNodes.length) d.appendChild(tags);

    // --- Secret (GM-only) banner -------------------------------------------
    // The most powerful legendary of each type can't be looted/bought/quested —
    // only the Game Master hands it out. Say so plainly and skip the source lists.
    if (def.secret || isSecretItem(def.id)) {
      d.appendChild(el('div', { class: 'wk-secret', html:
        `🔒 <b>${tw('wikiSrcSecret')}</b><br><span class="wk-dim">${tw('wikiSrcSecretNote')}</span>` }));
      return d;
    }

    // --- Dropped by --------------------------------------------------------
    // Each creature shows the rarity in WORDS first (the user's request), then a
    // "1 de cada N muertes" estimate and the raw % as quiet detail. Strongest
    // (most common) sources sort to the top.
    const sources = droppedBy(def.id);
    d.appendChild(el('div', { class: 'wk-sub-t', text: tw('wikiSrcDroppedBy') }));
    if (sources.length) {
      const tbl = el('div', { class: 'wk-src-list' });
      for (const s of sources) {
        const row = el('div', { class: 'wk-src-row' });
        const left = el('div', { class: 'wk-src-cr' });
        left.appendChild(this._creatureJumpChip(s.creature));
        const zone = el('span', { class: 'wk-src-zone',
          text: '🗺️ ' + zoneLabelForCreature(s.creature) });
        left.appendChild(zone);
        row.appendChild(left);
        const chance = el('div', { class: 'wk-src-chance' });
        chance.appendChild(el('span', { class: 'wk-rar ' + rarityClass(s.chance), text: rarityWord(s.chance) }));
        chance.appendChild(el('span', { class: 'wk-dim wk-src-kills',
          text: `${tw('wikiSrcOneIn')} ${killsFor(s.chance)} · ${pct(s.chance || 0)}` }));
        row.appendChild(chance);
        tbl.appendChild(row);
      }
      d.appendChild(tbl);
    } else {
      d.appendChild(el('p', { class: 'wk-dim wk-src-empty', text: tw('wikiSrcNoDrop') }));
    }

    // --- Quest reward ------------------------------------------------------
    const quests = questsRewarding(def.id);
    if (quests.length) {
      d.appendChild(el('div', { class: 'wk-sub-t', text: tw('wikiSrcQuests') }));
      const ql = el('div', { class: 'wk-chip-row' });
      for (const q of quests) {
        const city = q.city ? (CITIES.find((c) => c.id === q.city) || null) : null;
        const where = city ? ` · ${city.name}` : '';
        ql.appendChild(el('span', { class: 'wk-chip',
          html: `📜 ${loc(q.title)} <span class="wk-dim">Lv ${q.minLevel || 1}+${where}</span>` }));
      }
      d.appendChild(ql);
    }

    // --- Where to find (distinct zones) ------------------------------------
    const zoneSet = new Map(); // name -> zone (dedupe)
    for (const s of sources) for (const z of zonesForCreature(s.creature)) zoneSet.set(z.id, z);
    // Quest dungeons/cities give a hint too, but creatures are the primary source.
    if (zoneSet.size) {
      d.appendChild(el('div', { class: 'wk-sub-t', text: tw('wikiSrcWhere') }));
      const zl = el('div', { class: 'wk-chip-row' });
      for (const z of zoneSet.values()) {
        zl.appendChild(el('span', { class: 'wk-chip',
          html: `🗺️ ${loc(z.name)} <span class="wk-dim">Lv ${z.levelMin}–${z.levelMax}</span>` }));
      }
      d.appendChild(zl);
    }

    // --- Shop note ---------------------------------------------------------
    if (def.shopTier === 'shop' && def.value > 0) {
      d.appendChild(el('p', { class: 'wk-dim wk-shop-note', text: tw('wikiSrcShop') }));
    }

    return d;
  }

  // Human label for an item's kind/slot ("Espada · Lv 60", "Material", …).
  _itemKindLabel(def) {
    const KIND = { es: { weapon: 'Arma', armor: 'Armadura', quiver: 'Carcaj', container: 'Contenedor',
      potion: 'Poción', light: 'Luz', coin: 'Moneda', material: 'Material', trophy: 'Trofeo' },
      en: { weapon: 'Weapon', armor: 'Armor', quiver: 'Quiver', container: 'Container',
      potion: 'Potion', light: 'Light', coin: 'Coin', material: 'Material', trophy: 'Trophy' } };
    const WT = { es: { sword: 'Espada', axe: 'Hacha', mace: 'Maza', lance: 'Lanza', bow: 'Arco', wand: 'Varita', shield: 'Escudo' },
      en: { sword: 'Sword', axe: 'Axe', mace: 'Mace', lance: 'Lance', bow: 'Bow', wand: 'Wand', shield: 'Shield' } };
    const SLOT = { es: { amulet: 'Amuleto', helmet: 'Casco', armor: 'Armadura', legs: 'Pantalón', boots: 'Botas', bag: 'Bolsa' },
      en: { amulet: 'Amulet', helmet: 'Helmet', armor: 'Body', legs: 'Legs', boots: 'Boots', bag: 'Bag' } };
    const L = lang();
    if (def._kind === 'weapon') return (WT[L] && WT[L][def.type]) || (KIND[L].weapon);
    if (def._kind === 'armor') return (SLOT[L] && SLOT[L][def._slot]) || KIND[L].armor;
    if (def._slot === 'trophy') return KIND[L].trophy;
    return (KIND[L] && KIND[L][def._kind]) || def._kind || '';
  }

  // -- MOUNTS ---------------------------------------------------------------
  _mounts() {
    const box = el('div', { class: 'wk-section' });
    box.appendChild(el('p', { class: 'wk-lead', text: t('wikiMountsLead',
      `+${Math.round((MOUNT_SPEED_MUL - 1) * 100)}`, `+${Math.round((MOUNT_JUMP_MUL - 1) * 100)}`) }));

    const shop = MOUNTS.filter((m) => m.source === 'shop');
    const quest = MOUNTS.filter((m) => m.source === 'quest')
      .sort((a, b) => (a.levelReq || 0) - (b.levelReq || 0));

    const renderMount = (m) => {
      const card = el('div', { class: 'wk-entry' });
      card.appendChild(el('div', { class: 'wk-entry-head', html:
        `🐎 <b>${loc(m.name)}</b>` }));
      const meta = el('div', { class: 'wk-kv' });
      if (m.source === 'shop') {
        meta.appendChild(kv('🏪', t('wikiMountSource'), t('wikiMountShop')));
        meta.appendChild(kv('💰', t('buy'), `${m.cost}`));
      } else {
        const q = QUESTS.find((x) => x.id === m.questId) || null;
        meta.appendChild(kv('📜', t('wikiMountSource'), t('wikiMountQuest')));
        if (m.levelReq) meta.appendChild(kv('🎚️', t('levelReq'), `${m.levelReq}`));
        if (q) {
          const city = q.city ? (CITIES.find((c) => c.id === q.city) || null) : null;
          meta.appendChild(kv('🗺️', t('questBoard'), loc(q.title) + (city ? ` · ${city.name}` : '')));
        }
      }
      card.appendChild(meta);
      if (m.desc) card.appendChild(el('p', { class: 'wk-dim', text: loc(m.desc) }));
      box.appendChild(card);
    };

    box.appendChild(el('h3', { text: t('wikiMountShop') }));
    for (const m of shop) renderMount(m);
    box.appendChild(el('h3', { text: t('wikiMountQuest') }));
    for (const m of quest) renderMount(m);
    return box;
  }

  // -- MATERIALS & TROPHIES -------------------------------------------------
  // The crafting/loot scraps (silk, hides, scales…) and the one-per-family
  // trophy a "remains buyer" pays for. Both are stackable, sellable drops.
  _materials() {
    const box = el('div', { class: 'wk-section' });
    box.appendChild(el('p', { class: 'wk-lead', text: t('wikiMaterialsLead') }));

    box.appendChild(el('h3', { text: t('wikiMaterials') }));
    const matGrid = el('div', { class: 'wk-matgrid' });
    for (const m of [...MATERIALS].sort((a, b) => (a.value || 0) - (b.value || 0))) {
      matGrid.appendChild(el('div', { class: 'wk-matcard' }, [
        el('span', { class: 'wk-matico', text: m.icon || '📦' }),
        el('span', { class: 'wk-matname', text: loc(m.name) }),
        el('span', { class: 'wk-matval', text: `💰 ${m.value}` }),
      ]));
    }
    box.appendChild(matGrid);

    box.appendChild(el('h3', { text: t('wikiTrophies') }));
    box.appendChild(el('p', { class: 'wk-dim', text: t('wikiTrophiesNote') }));
    const trGrid = el('div', { class: 'wk-matgrid' });
    for (const tr of [...TROPHIES].sort((a, b) => (b.value || 0) - (a.value || 0))) {
      trGrid.appendChild(el('div', { class: 'wk-matcard' }, [
        el('span', { class: 'wk-matico', text: tr.icon || '🏆' }),
        el('span', { class: 'wk-matname', text: loc(tr.name) }),
        el('span', { class: 'wk-matval', text: `💰 ${tr.value}` }),
      ]));
    }
    box.appendChild(trGrid);
    return box;
  }

  // -- QUESTS ---------------------------------------------------------------
  // Every quest, grouped by the city that gives it, with objectives + rewards.
  _quests() {
    const box = el('div', { class: 'wk-section' });
    box.appendChild(el('p', { class: 'wk-lead', text: t('wikiQuestsLead') }));

    // Build a reverse index of chains: which quest's `next` points to a given id
    // (its predecessor) so we can show "comes after …" and how many steps precede
    // it — the deep prerequisite chains the player must climb.
    const prevOf = new Map();
    const byIdQ = new Map();
    for (const q of QUESTS) {
      byIdQ.set(q.id, q);
      if (q.next) prevOf.set(q.next, q.id);
    }
    const stepsBefore = (id) => {
      let n = 0; const seen = new Set(); let cur = prevOf.get(id);
      while (cur && !seen.has(cur)) { seen.add(cur); n++; cur = prevOf.get(cur); }
      return n;
    };
    const L = lang();

    // Group by giving city (keep first-seen order so chains read top-down).
    const byCity = new Map();
    for (const q of QUESTS) {
      const key = q.city || '';
      if (!byCity.has(key)) byCity.set(key, []);
      byCity.get(key).push(q);
    }
    for (const [cityId, quests] of byCity) {
      const city = CITIES.find((c) => c.id === cityId) || null;
      box.appendChild(el('h3', { text: city ? city.name : t('wilderness') }));
      for (const q of quests.sort((a, b) => (a.minLevel || 0) - (b.minLevel || 0))) {
        const card = el('div', { class: 'wk-entry' });

        // Title + gate badges (night/day, key-gated) so special conditions read
        // at a glance.
        const head = el('div', { class: 'wk-entry-head' });
        head.appendChild(el('b', { html: `📜 ${loc(q.title)}` }));
        if (q.nightOnly) head.appendChild(el('span', { class: 'wk-badge wk-gate-night', text: L === 'en' ? '🌙 Night' : '🌙 Noche' }));
        if (q.dayOnly) head.appendChild(el('span', { class: 'wk-badge wk-gate-day', text: L === 'en' ? '☀️ Day' : '☀️ Día' }));
        if (q.requiresItems && q.requiresItems.length) head.appendChild(el('span', { class: 'wk-badge wk-gate-key', text: '🔑' }));
        card.appendChild(head);

        if (q.desc) card.appendChild(el('p', { class: 'wk-dim', text: loc(q.desc) }));

        const meta = el('div', { class: 'wk-kv' });
        if (q.minLevel) meta.appendChild(kv('🎚️', t('wikiMinLevel'), q.minLevel));
        if (q.repeatable) meta.appendChild(kv('🔁', t('wikiRepeatable'), t('wikiYes')));
        // CHAIN: how many quests precede this one, and which one directly does.
        const before = stepsBefore(q.id);
        if (before > 0) {
          const prev = byIdQ.get(prevOf.get(q.id));
          meta.appendChild(kv('🔗', t('wikiQuestChain'),
            t('wikiQuestAfter', before, prev ? loc(prev.title) : '')));
        }
        if (q.next && byIdQ.get(q.next)) {
          meta.appendChild(kv('➡️', t('wikiQuestNext'), loc(byIdQ.get(q.next).title)));
        }
        card.appendChild(meta);

        // REQUIRED KEY(S): the item(s) you must already hold to start it.
        if (q.requiresItems && q.requiresItems.length) {
          const need = q.requiresItems.map((rq) => `${rq.count || 1}× ${lootName(rq.itemId)}`).join(', ');
          card.appendChild(el('div', { class: 'wk-q-needs', html: `🔑 <b>${t('wikiQuestNeeds')}:</b> ${need}` }));
        }

        // Objectives.
        if (q.objectives && q.objectives.length) {
          card.appendChild(el('div', { class: 'wk-qobj-h', text: t('wikiObjectives') }));
          const ul = el('ul', { class: 'wk-qobj' });
          for (const o of q.objectives) ul.appendChild(el('li', { text: loc(o.desc) || `${o.type} ${o.target} ×${o.count}` }));
          card.appendChild(ul);
        }

        // Rewards (gold / exp / items).
        const r = q.rewards || {};
        const tags = el('div', { class: 'wk-item-tags' });
        if (r.exp) tags.appendChild(tag(`⭐ ${r.exp} ${t('xp')}`));
        if (r.gold) tags.appendChild(tag(`💰 ${r.gold}`));
        for (const id of (r.items || [])) tags.appendChild(tag(`🎁 ${this._rewardItemName(id)}`));
        if (tags.children.length) {
          card.appendChild(el('div', { class: 'wk-qobj-h', text: t('wikiRewards') }));
          card.appendChild(tags);
        }
        box.appendChild(card);
      }
    }
    return box;
  }

  // Best-effort display name for a quest reward item id (real item, material or
  // trophy, else a tidied id).
  _rewardItemName(id) {
    const all = [...WEAPONS, ...ARMORS, ...CONTAINERS, ...POTIONS, ...LIGHTS, ...QUIVERS];
    const it = all.find((x) => x.id === id);
    if (it) return itemName(it);
    const m = getMaterial(id); if (m) return loc(m.name);
    const tr = getTrophy(id); if (tr) return loc(tr.name);
    return String(id).replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  // -- MECHANICS / HOW THE GAME WORKS ---------------------------------------
  // Plain-language rules pulled from the live constants so they never drift:
  // elements, day/night, x2 events, how skills rise, the market and houses.
  _mechanics() {
    const box = el('div', { class: 'wk-section' });
    box.appendChild(el('p', { class: 'wk-lead', text: t('wikiMechanicsLead') }));

    const section = (title, lines) => {
      box.appendChild(el('h3', { text: title }));
      for (const ln of lines) box.appendChild(el('p', { class: 'wk-mech', text: ln }));
    };

    section('⚔️ ' + t('wikiCombat'), [
      t('wikiMechElements'),
      t('wikiMechSkills'),
      t('wikiMechMagic'),
    ]);
    section('🌗 ' + t('wikiMechWorldTitle'), [
      t('wikiMechNight'),
      t('wikiMechEvents'),
    ]);
    section('🛒 ' + t('marketTitle'), [
      t('wikiMechMarket'),
      t('wikiMechMarketPay'),
    ]);
    section('🏠 ' + t('wikiMechHouseTitle'), [
      t('wikiMechHouse'),
      t('wikiMechFacade'),
    ]);
    return box;
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
        // Power readout. Damage skills (area/ranged/melee) don't grow their hit by
        // SKILL level — their damage rides the level + magic-level formula at cast
        // time — so skillPower() returns a flat factor and "1→max" would read as a
        // misleading "80→80". For those we show the relative power factor + a note;
        // heals/buffs/summons do scale by skill level, so show their real 1→max.
        const DAMAGE = sk.kind === 'area' || sk.kind === 'ranged' || sk.kind === 'melee';
        let powerText;
        if (sk.kind === 'passive' || sk.kind === 'buff') {
          powerText = '';   // passives/buffs have no power number
        } else if (DAMAGE) {
          powerText = `${verb} ${skillPower(sk, 1)} ${lang() === 'en' ? '(scales with level & magic)' : '(escala con nivel y magia)'}`;
        } else {
          powerText = `${verb} ${skillPower(sk, 1)}→${skillPower(sk, sk.maxLevel)}`;
        }
        info.appendChild(el('div', { class: 'wk-skill-num', text:
          `${powerText}${powerText ? ' · ' : ''}💧 ${skillMana(sk, 1)}→${skillMana(sk, sk.maxLevel)}` +
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
// its distinct icon instead of a flat colour swatch. Materials/trophies carry no
// procedural painter — they ship an emoji `icon`, so render that instead.
function itemIco(def, size = 26) {
  if (def && def.kind === 'material' && def.icon) {
    return `<span class="wk-ico" style="width:${size}px;height:${size}px;font-size:${Math.round(size * 0.62)}px">${def.icon}</span>`;
  }
  if (def && def.kind === 'trophy' && def.icon) {
    return `<span class="wk-ico" style="width:${size}px;height:${size}px;font-size:${Math.round(size * 0.62)}px">${def.icon}</span>`;
  }
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
