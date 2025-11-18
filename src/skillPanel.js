import { t, getLang } from './i18n.js';
import { skillsOf, getProfession, skillPower, skillMana } from './data/professions.js';
import { STATS } from './characterStats.js';

// MapleStory-style character window: two tabs, Stats (spend AP on STR/DEX/INT/
// LUK) and Skills (spend SP to raise each unlocked skill toward its max). Built
// into a full-screen overlay; nothing here touches the 3D scene.
const KIND_ICON = { area: '🔥', melee: '💥', ranged: '🎯', heal: '💚', summon: '🐾' };

export class SkillPanel {
  constructor(getStats, hooks) {
    // getStats() returns the CURRENT CharacterStats (it is replaced when a
    // character is chosen, so we must not hold a stale reference).
    this._getStats = getStats;
    this.hooks = hooks;          // { getProfession, getLevel, onChange }
    this.tab = 'skills';
    this.root = document.getElementById('skill-panel');
    if (!this.root) {
      this.root = document.createElement('div');
      this.root.id = 'skill-panel';
      this.root.className = 'hidden';
      document.body.appendChild(this.root);
    }
  }

  get stats() { return this._getStats(); }

  open() { this.root.classList.remove('hidden'); this.render(); }
  close() { this.root.classList.add('hidden'); }
  toggle() { if (this.root.classList.contains('hidden')) this.open(); else this.close(); }
  get isOpen() { return !this.root.classList.contains('hidden'); }

  render() {
    const lang = getLang();
    const prof = this.hooks.getProfession();
    const profDef = getProfession(prof);
    const profName = profDef ? (profDef.name[lang] || profDef.name.es) : prof;

    this.root.innerHTML = '';
    const card = el('div', { class: 'sp-card' });
    card.appendChild(el('div', { class: 'sp-head', html: `<b>${profName}</b> · ${t('level')} ${this.hooks.getLevel()}` }));

    const tabs = el('div', { class: 'sp-tabs' });
    tabs.appendChild(this._tab('stats', `🎯 ${t('stats')}`));
    tabs.appendChild(this._tab('skills', `📖 ${t('skills')}`));
    card.appendChild(tabs);

    card.appendChild(this.tab === 'stats' ? this._statsView() : this._skillsView(prof, lang));

    const close = el('button', { class: 'sp-close', text: t('close'), on: { click: () => this.close() } });
    card.appendChild(close);
    this.root.appendChild(card);
  }

  _tab(id, label) {
    return el('button', {
      class: 'sp-tab' + (this.tab === id ? ' active' : ''), text: label,
      on: { click: () => { this.tab = id; this.render(); } },
    });
  }

  _statsView() {
    const box = el('div', { class: 'sp-stats' });
    box.appendChild(el('div', { class: 'sp-points', text: `${t('statPoints')}: ${this.stats.ap}` }));
    const labels = { str: 'STR', dex: 'DEX', int: 'INT', luk: 'LUK' };
    for (const s of STATS) {
      const row = el('div', { class: 'sp-stat-row' });
      row.appendChild(el('span', { class: 'sp-stat-name', text: labels[s] }));
      row.appendChild(el('span', { class: 'sp-stat-val', text: String(this.stats[s]) }));
      const plus = el('button', {
        class: 'sp-plus', text: '+',
        on: { click: () => { if (this.stats.addStat(s)) { this.hooks.onChange(); this.render(); } } },
      });
      plus.disabled = this.stats.ap <= 0;
      row.appendChild(plus);
      box.appendChild(row);
    }
    return box;
  }

  _skillsView(prof, lang) {
    const box = el('div', { class: 'sp-skills' });
    box.appendChild(el('div', { class: 'sp-points', text: `${t('skillPoints')}: ${this.stats.sp}` }));
    const charLevel = this.hooks.getLevel();
    for (const sk of skillsOf(prof)) {
      const cur = this.stats.skillLevel(sk.id);
      const locked = charLevel < sk.reqLevel;
      const maxed = cur >= sk.maxLevel;
      const row = el('div', { class: 'sp-skill' + (locked ? ' locked' : '') });
      const icon = el('span', { class: 'sp-skill-ico', text: KIND_ICON[sk.kind] || '✨' });
      const info = el('div', { class: 'sp-skill-info' });
      info.appendChild(el('div', { class: 'sp-skill-name', text: (sk.name[lang] || sk.name.es) + `  ${cur}/${sk.maxLevel}` }));
      const effect = cur > 0 ? skillPower(sk, cur) : skillPower(sk, 1);
      const verb = sk.kind === 'heal' ? '💚' : '⚔';
      info.appendChild(el('div', {
        class: 'sp-skill-desc',
        text: locked
          ? `🔒 ${t('level')} ${sk.reqLevel}`
          : `${sk.desc[lang] || sk.desc.es} · ${verb}${effect} · 💧${skillMana(sk, Math.max(1, cur))}`,
      }));
      row.append(icon, info);
      if (!locked) {
        const plus = el('button', {
          class: 'sp-plus', text: maxed ? '★' : '+',
          on: { click: () => { if (this.stats.addSkillPoint(sk)) { this.hooks.onChange(); this.render(); } } },
        });
        plus.disabled = maxed || this.stats.sp <= 0;
        row.appendChild(plus);
      }
      box.appendChild(row);
    }
    return box;
  }
}

function el(tag, opts = {}, kids) {
  const n = document.createElement(tag);
  if (opts.class) n.className = opts.class;
  if (opts.text != null) n.textContent = opts.text;
  if (opts.html != null) n.innerHTML = opts.html;
  if (opts.on) for (const k in opts.on) n.addEventListener(k, opts.on[k]);
  if (kids) for (const c of kids) if (c) n.appendChild(c);
  return n;
}
