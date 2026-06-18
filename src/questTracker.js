import { t, getLang } from './i18n.js';
import { getQuest } from './data/quests.js';
import { CITIES } from './cities.js';

// QUEST TRACKER — a draggable side-panel WINDOW (same frame as SkillPanel) that
// lists the player's ACTIVE quests: title, current step/objectives with live
// progress bars, and a LOCATION HINT (the giver city + the rumor from the quest
// description) so the player always knows where to go. Pure UI: it reads from
// the QuestLog and quest data, never touches the 3D scene.
//
// Construction mirrors SkillPanel: opts.panel = the right panel's #windows
// container, opts.wireWindow = the UI's drag/collapse/close hooker.

function locName(obj) {
  if (!obj) return '';
  const l = getLang();
  return obj[l] || obj.es || obj.en || '';
}

// A short "where to go" line for a quest. Prefers the giver city's name; the full
// rumor lives in the description, shown beneath. We keep it to a city + direction
// the author already wrote into the desc, so this is just a quick anchor.
function questCity(q) {
  if (!q || !q.city) return null;
  return CITIES.find((c) => c.id === q.city) || null;
}

export class QuestTracker {
  // hooks: { getLevel, isNight, getArrowOn, toggleArrow } — the last two wire the
  // on-screen waypoint arrow toggle into the panel.
  constructor(questLog, hooks = {}, opts = {}) {
    this.questLog = questLog;
    this.hooks = hooks;
    this._mount = opts.panel || null;
    this._wireWindow = opts.wireWindow || null;
    this._highlightId = null;   // a chained quest to flash after a turn-in

    this.win = document.createElement('div');
    this.win.className = 'win hidden';
    this.win.dataset.win = 'quests';
    this.win.innerHTML =
      '<div class="win-head"><span class="win-grip">⠿</span>' +
      '<span class="win-title qt-wtitle"></span>' +
      '<button class="win-collapse" title="">▾</button>' +
      '<button class="win-close" title="">✕</button></div>' +
      '<div class="win-body qt-wbody"></div>';
    this.body = this.win.querySelector('.qt-wbody');
    this.win.querySelector('.win-close').addEventListener('click', () => this.close());
    if (this._mount) this._mount.appendChild(this.win);
    if (this._wireWindow) this._wireWindow(this.win, { closable: true, onClose: () => this.close() });
  }

  // Flash a chained quest (after a turn-in auto-accepted it): mark it and, if the
  // panel is open, re-render so it shows highlighted; clears itself after a beat.
  highlight(id) {
    this._highlightId = id;
    if (this.isOpen) this.render();
    setTimeout(() => { if (this._highlightId === id) { this._highlightId = null; if (this.isOpen) this.render(); } }, 6000);
  }

  get root() { return this.win; }
  get isOpen() { return !this.win.classList.contains('hidden'); }

  open() { this.win.classList.remove('hidden'); if (this._mount) this._mount.appendChild(this.win); this.render(); }
  close() { this.win.classList.add('hidden'); }
  toggle() { if (this.isOpen) this.close(); else this.open(); }

  // Re-render if currently visible (called on quest progress so it stays live).
  refresh() { if (this.isOpen) this.render(); }

  render() {
    const lang = getLang();
    this.win.querySelector('.qt-wtitle').textContent = '📜 ' + t('questTrackerTitle');
    const body = this.body;
    body.innerHTML = '';

    // Waypoint-arrow toggle row (the on-screen pointer). Wired via hooks.
    if (this.hooks.toggleArrow) {
      const on = this.hooks.getArrowOn ? this.hooks.getArrowOn() : true;
      const row = this._el('label', 'qt-arrow-toggle');
      const cb = document.createElement('input');
      cb.type = 'checkbox'; cb.checked = !!on;
      cb.addEventListener('change', () => { this.hooks.toggleArrow(); });
      row.appendChild(cb);
      row.appendChild(this._el('span', null, '➤ ' + t('questArrowToggle')));
      body.appendChild(row);
    }

    const active = this.questLog.activeList();
    const ready = new Set(this.questLog.readyToComplete());

    if (!active.length) {
      body.appendChild(this._el('div', 'qt-empty', t('questTrackerEmpty')));
      return;
    }

    // Sort: ready-to-turn-in first, then by minLevel.
    active.sort((a, b) => {
      const ra = ready.has(a.id) ? 0 : 1, rb = ready.has(b.id) ? 0 : 1;
      return ra - rb || (a.minLevel || 0) - (b.minLevel || 0);
    });

    for (const q of active) {
      body.appendChild(this._questCard(q, ready.has(q.id), lang));
    }
  }

  _questCard(q, isReady, lang) {
    const hot = this._highlightId === q.id;
    const card = this._el('div', 'qt-card' + (isReady ? ' qt-ready' : '') + (hot ? ' qt-hot' : ''));

    // Title row + (ready ✓ / stage chip).
    const head = this._el('div', 'qt-card-head');
    head.appendChild(this._el('span', 'qt-card-title', locName(q.title)));
    if (isReady) head.appendChild(this._el('span', 'qt-badge qt-badge-done', '✓ ' + t('questTrackerReady')));
    else if (q.minLevel) head.appendChild(this._el('span', 'qt-badge', 'Lv ' + q.minLevel + '+'));
    card.appendChild(head);

    // Location hint: giver city + the rumor (description). This is the "where /
    // how" the user asked for — no coordinates, just the authored hint.
    const city = questCity(q);
    const where = this._el('div', 'qt-where');
    const cityTxt = city ? city.name : t('wilderness');
    where.innerHTML = `🗺️ <b>${cityTxt}</b>`;
    card.appendChild(where);
    if (q.desc) card.appendChild(this._el('div', 'qt-rumor', locName(q.desc)));

    // Gate hints (night/day/key) so a stalled player knows the special condition.
    const isNight = this.hooks.isNight ? this.hooks.isNight() : false;
    if (q.nightOnly) card.appendChild(this._el('div', 'qt-gate', (lang === 'en' ? '🌙 Only at night' : '🌙 Solo de noche')));
    if (q.dayOnly) card.appendChild(this._el('div', 'qt-gate', (lang === 'en' ? '☀️ Only by day' : '☀️ Solo de día')));

    // Objectives with live progress bars (the "what stage am I at" tracking).
    const objs = this.questLog.objectiveText(q.id, lang);
    const list = this._el('div', 'qt-objs');
    for (const o of objs) {
      const row = this._el('div', 'qt-obj' + (o.done ? ' done' : ''));
      const top = this._el('div', 'qt-obj-top');
      top.appendChild(this._el('span', 'qt-obj-text', (o.done ? '✓ ' : '• ') + o.text));
      top.appendChild(this._el('span', 'qt-obj-count', `${Math.min(o.have, o.need)}/${o.need}`));
      row.appendChild(top);
      // progress bar
      const bar = this._el('div', 'qt-bar');
      const fill = this._el('div', 'qt-bar-fill');
      fill.style.width = Math.round(100 * Math.min(1, (o.have || 0) / (o.need || 1))) + '%';
      bar.appendChild(fill);
      row.appendChild(bar);
      list.appendChild(row);
    }
    card.appendChild(list);

    // Reward preview.
    const r = q.rewards || {};
    const rew = this._el('div', 'qt-rewards');
    if (r.exp) rew.appendChild(this._el('span', 'qt-rew', `⭐ ${r.exp}`));
    if (r.gold) rew.appendChild(this._el('span', 'qt-rew', `💰 ${r.gold}`));
    const items = (r.items || []).length;
    if (items) rew.appendChild(this._el('span', 'qt-rew', `🎁 ${items}`));
    if (r.mount) rew.appendChild(this._el('span', 'qt-rew', '🐎'));
    if (rew.childNodes.length) card.appendChild(rew);

    // Turn-in pointer: where to report. Chained/standalone quests turn in at the
    // giver; we show that as a final hint when ready.
    if (isReady && city) {
      card.appendChild(this._el('div', 'qt-turnin', '➡️ ' + t('questTrackerTurnIn', city.name)));
    }
    return card;
  }

  _el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
}
