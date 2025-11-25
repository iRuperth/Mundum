// Game Master panel for "GM Maple".
//
// A self-contained left-side control panel that only appears for the player
// named "GM Maple". It wires the GM's powers — create items, summon a player
// (or everyone) to the GM, teleport to a player, ban a player, broadcast a
// banner to everyone, and spawn creatures — through the hooks passed in `ctx`,
// so main.js stays mostly untouched.
//
// All UI text is Spanish (the game's default). The panel is plain DOM, styled
// inline so it needs no extra CSS file changes beyond the small block in
// style.css.

import { WEAPONS, ARMORS, CONTAINERS, POTIONS } from './data/items.js';
import { CREATURES } from './data/creatures.js';
import { getLang } from './i18n.js';

// Resolve a catalog entry's display name (items carry either a string name or a
// bilingual {es,en} object).
function itemLabel(def) {
  if (!def) return '';
  if (typeof def.name === 'string') return def.name;
  const lang = getLang();
  return def.name[lang] || def.name.es || def.name.en || def.id;
}

// Build the flat, grouped list of items the GM can create.
function itemCatalog() {
  const groups = [
    ['Weapons', WEAPONS],
    ['Armor', ARMORS],
    ['Bags', CONTAINERS],
    ['Potions & food', POTIONS],
  ];
  const out = [];
  for (const [group, list] of groups) {
    for (const def of list) out.push({ id: def.id, name: itemLabel(def), group });
  }
  return out;
}

// Creatures the GM can summon, sorted by level so the picker reads weak→strong.
function creatureCatalog() {
  return CREATURES
    .filter((c) => !c.supreme || true) // include bosses too; GM can summon anything
    .map((c) => ({ id: c.id, name: c.name, level: c.level }))
    .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
}

// A small modal with a search box and a scrollable, clickable list. `onPick`
// gets the chosen entry's id. Returns nothing; closes itself on pick/escape.
function openPicker(title, entries, onPick, opts = {}) {
  const overlay = document.createElement('div');
  overlay.className = 'gm-modal-overlay';
  const box = document.createElement('div');
  box.className = 'gm-modal';
  box.innerHTML = `
    <div class="gm-modal-head">${title}<button class="gm-modal-close" title="Close">×</button></div>
    <input class="gm-modal-search" placeholder="Search…" />
    <div class="gm-modal-list"></div>
    ${opts.footer || ''}`;
  overlay.appendChild(box);
  document.body.appendChild(overlay);

  const search = box.querySelector('.gm-modal-search');
  const listEl = box.querySelector('.gm-modal-list');

  function close() { overlay.remove(); }
  box.querySelector('.gm-modal-close').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

  function render(filter) {
    const f = (filter || '').toLowerCase();
    listEl.innerHTML = '';
    let lastGroup = null;
    for (const e of entries) {
      const hay = (e.name + ' ' + (e.group || '')).toLowerCase();
      if (f && !hay.includes(f)) continue;
      if (e.group && e.group !== lastGroup) {
        lastGroup = e.group;
        const h = document.createElement('div');
        h.className = 'gm-modal-group';
        h.textContent = e.group;
        listEl.appendChild(h);
      }
      const row = document.createElement('button');
      row.className = 'gm-modal-row';
      row.textContent = e.level != null ? `${e.name}  ·  Nv ${e.level}` : e.name;
      row.addEventListener('click', () => { onPick(e.id, e); if (!opts.keepOpen) close(); });
      listEl.appendChild(row);
    }
    if (!listEl.children.length) {
      const empty = document.createElement('div');
      empty.className = 'gm-modal-empty';
      empty.textContent = 'No results';
      listEl.appendChild(empty);
    }
  }

  search.addEventListener('input', () => render(search.value));
  search.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.code === 'Escape') close();
  });
  render('');
  setTimeout(() => search.focus(), 30);
  return { close, box };
}

// A picker over the currently-connected players. Each entry is { id, name }.
// Used by teleport / summon / ban. Adds an "everyone" row when opts.all is set.
function openPlayerPicker(title, players, onPick, opts = {}) {
  const entries = [];
  if (opts.all) entries.push({ id: '*', name: '⭐ All players' });
  for (const p of players) entries.push({ id: p.id, name: p.name || '(no name)' });
  if (!entries.length) {
    return openPicker(title, [], () => {}, {});
  }
  return openPicker(title, entries, onPick, opts);
}

// Show a big banner to everyone (used both when the GM sends one and when a
// player receives one). Auto-fades.
export function showAnnounceBanner(name, text) {
  let banner = document.getElementById('gm-banner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'gm-banner';
    document.body.appendChild(banner);
  }
  banner.innerHTML = `<span class="gm-banner-who">📢 ${escapeHtml(name)}</span>${escapeHtml(text)}`;
  banner.classList.remove('hide');
  banner.classList.add('show');
  clearTimeout(banner._t);
  banner._t = setTimeout(() => { banner.classList.remove('show'); banner.classList.add('hide'); }, 6000);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

// Build and mount the GM panel into #windows-left, and return a small handle.
// `ctx` supplies the live game hooks:
//   players()          -> [{ id, name }] currently connected peers
//   createItem(id)     -> give the GM an item by catalog id
//   spawnCreature(id)  -> summon a creature in front of the GM
//   teleportTo(id)     -> move the GM to that player's position
//   summon(id)         -> bring that player (or '*' = all) to the GM
//   ban(id, name)      -> ban that player
//   announce(text)     -> broadcast a banner to everyone
//   toast(msg, kind)   -> small feedback toast
export function buildGMPanel(ctx) {
  const mount = document.getElementById('windows-left');
  // Make sure the left panel is visible and expanded so the GM sees the tools.
  const leftPanel = document.getElementById('side-panel-left');
  if (leftPanel) { leftPanel.classList.remove('hidden', 'collapsed'); }

  const win = document.createElement('div');
  win.className = 'win gm-win';
  win.id = 'win-gm';
  win.innerHTML = `
    <div class="win-head">
      <span class="win-grip">⠿</span>
      <span class="win-title">👑 GM Maple</span>
      <button class="win-collapse" title="Collapse">▾</button>
    </div>
    <div class="win-body gm-body">
      <button class="gm-btn" data-act="item">🎁 Create item</button>
      <button class="gm-btn" data-act="creature">🐉 Summon creature</button>
      <button class="gm-btn" data-act="goto">🗺️ Teleport to place</button>
      <button class="gm-btn" data-act="summon">🧲 Bring player here</button>
      <button class="gm-btn" data-act="summonAll">🌍 Bring everyone here</button>
      <button class="gm-btn" data-act="teleport">✨ Go to player</button>
      <button class="gm-btn" data-act="announce">📢 Message everyone</button>
      <button class="gm-btn gm-danger" data-act="ban">⛔ Ban player</button>
    </div>`;
  mount.appendChild(win);

  // Collapse toggle (mirrors the right-panel windows' behaviour minimally).
  const collapseBtn = win.querySelector('.win-collapse');
  collapseBtn.addEventListener('click', () => {
    win.classList.toggle('collapsed');
    collapseBtn.textContent = win.classList.contains('collapsed') ? '▸' : '▾';
  });

  const ITEMS = itemCatalog();
  const CREAT = creatureCatalog();

  function act(name) {
    if (name === 'item') {
      openPicker('Create item', ITEMS, (id, e) => {
        const ok = ctx.createItem(id);
        ctx.toast(ok ? `Created: ${e.name}` : 'Could not create', ok ? 'loot' : 'bad');
      }, { keepOpen: true });
    } else if (name === 'creature') {
      openPicker('Summon creature', CREAT, (id, e) => {
        const ok = ctx.spawnCreature(id);
        ctx.toast(ok ? `Summoned: ${e.name}` : 'Could not summon', ok ? 'loot' : 'bad');
      }, { keepOpen: true });
    } else if (name === 'goto') {
      // Warp to any city / cave / ruin — also the GM's escape hatch from a cave.
      const places = ctx.places ? ctx.places() : [];
      openPicker('Teleport to place', places, (id, e) => {
        const ok = ctx.goToPlace(id);
        ctx.toast(ok ? `Teleported to ${e.name}` : 'Could not teleport', ok ? null : 'bad');
      });
    } else if (name === 'summon') {
      const players = ctx.players();
      if (!players.length) return ctx.toast('No players connected', 'bad');
      openPlayerPicker('Bring a player to you', players, (id, e) => {
        ctx.summon(id);
        ctx.toast(`Summoning ${e.name}…`);
      });
    } else if (name === 'summonAll') {
      const players = ctx.players();
      if (!players.length) return ctx.toast('No players connected', 'bad');
      ctx.summon('*');
      ctx.toast('Bringing everyone to you…');
    } else if (name === 'teleport') {
      const players = ctx.players();
      if (!players.length) return ctx.toast('No players connected', 'bad');
      openPlayerPicker('Go to a player', players, (id, e) => {
        const ok = ctx.teleportTo(id);
        ctx.toast(ok ? `Teleported to ${e.name}` : 'Player unavailable', ok ? null : 'bad');
      });
    } else if (name === 'announce') {
      const text = prompt('Message for all players:');
      if (text && text.trim()) { ctx.announce(text.trim()); }
    } else if (name === 'ban') {
      const players = ctx.players();
      if (!players.length) return ctx.toast('No players connected', 'bad');
      openPlayerPicker('Ban player', players, (id, e) => {
        if (confirm(`Ban "${e.name}"? They won't be able to reconnect.`)) {
          ctx.ban(id, e.name);
        }
      });
    }
  }

  win.querySelectorAll('.gm-btn').forEach((b) => {
    b.addEventListener('click', () => act(b.dataset.act));
  });

  return { win };
}
