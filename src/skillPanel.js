import { t, getLang } from './i18n.js';
import { skillsByTier, getProfession, skillPower, skillMana, tierForLevel, JOB_TIER_LEVELS, jobTitle } from './data/professions.js';
import { skillIcon } from './skillIcons.js';
import { USE_SKILLS } from './characterStats.js';

// Character window: two tabs.
//   • Combat skills — Tibia USE skills (sword/axe/club/distance/shielding/magic/
//     fist) that rise as you fight, each with a progress bar to the next level.
//   • Powers — the active SKILL TREE: spend SP (per job tier) to raise unlocked
//     powers toward their max. Built into a full-screen overlay; nothing here
//     touches the 3D scene.

// Display names for the Tibia use-skills.
const USE_SKILL_LABEL = {
  fist: { es: 'Puños', en: 'Fist' }, sword: { es: 'Espada', en: 'Sword' },
  axe: { es: 'Hacha', en: 'Axe' }, club: { es: 'Maza', en: 'Club' },
  distance: { es: 'Distancia', en: 'Distance' }, shielding: { es: 'Escudo', en: 'Shielding' },
  magic: { es: 'Nivel Mágico', en: 'Magic Level' },
};

export class SkillPanel {
  // Now a draggable WINDOW that lives inside a side panel (Tibia-style) rather
  // than a full-screen overlay. `opts.panel` is the right panel's #windows
  // container; `opts.wireWindow` lets the UI hook up collapse/drag. A single
  // panel serves both tabs: 'combat' = Skills (use-skills), 'skills' = Spells
  // (the active power tree). openTab(tab) jumps straight to one.
  constructor(getStats, hooks, opts = {}) {
    this._getStats = getStats;
    this.hooks = hooks;          // { getProfession, getLevel, onChange }
    this.tab = 'combat';
    this._mount = opts.panel || null;       // .windows container to live in
    this._wireWindow = opts.wireWindow || null;
    // The window frame.
    this.win = document.createElement('div');
    this.win.className = 'win hidden';
    this.win.dataset.win = 'skills';
    this.win.innerHTML =
      '<div class="win-head"><span class="win-grip">⠿</span>' +
      '<span class="win-title sp-wtitle"></span>' +
      '<button class="win-collapse" title="">▾</button>' +
      '<button class="win-close" title="">✕</button></div>' +
      '<div class="win-body sp-wbody"></div>';
    this.body = this.win.querySelector('.sp-wbody');
    this.win.querySelector('.win-close').addEventListener('click', () => this.close());
    if (this._mount) this._mount.appendChild(this.win);
    if (this._wireWindow) this._wireWindow(this.win, { closable: true, onClose: () => this.close() });
  }

  get stats() { return this._getStats(); }
  get root() { return this.win; }   // kept for callers that reference .root

  open() { this.win.classList.remove('hidden'); if (this._mount) this._mount.appendChild(this.win); this.render(); }
  openTab(tab) { this.tab = tab; this.open(); }
  close() { this.win.classList.add('hidden'); }
  toggle() { if (this.win.classList.contains('hidden')) this.open(); else this.close(); }
  toggleTab(tab) {
    // If open on this tab, close; otherwise open on it. Lets two buttons share
    // one window (Skills vs Spells).
    if (this.isOpen && this.tab === tab) { this.close(); return; }
    this.openTab(tab);
  }
  get isOpen() { return !this.win.classList.contains('hidden'); }

  render() {
    // Clearing the body (below) destroys any row mid-drag, so its pointerup never
    // fires and the drag ghost / drag-source class would be orphaned. Sweep them
    // up first so a re-render during a drag can't leave a stuck floating icon.
    document.querySelectorAll('.drag-ghost').forEach((g) => g.remove());
    document.querySelectorAll('.spell-draggable.drag-source').forEach((el) => el.classList.remove('drag-source'));
    const lang = getLang();
    const prof = this.hooks.getProfession();
    const charLevel = this.hooks.getLevel();
    const profName = jobTitle(prof, charLevel, lang);

    this.win.querySelector('.sp-wtitle').textContent = `${profName} · ${t('level')} ${charLevel}`;
    this.body.innerHTML = '';
    const card = el('div', { class: 'sp-card' });

    const tabs = el('div', { class: 'sp-tabs' });
    tabs.appendChild(this._tab('combat', `⚔ ${t('tabSkills')}`));
    tabs.appendChild(this._tab('skills', `✨ ${t('tabSpells')}`));
    card.appendChild(tabs);

    card.appendChild(this.tab === 'combat' ? this._useSkillsView(lang) : this._skillsView(prof, lang));
    this.body.appendChild(card);
  }

  _tab(id, label) {
    return el('button', {
      class: 'sp-tab' + (this.tab === id ? ' active' : ''), text: label,
      on: { click: () => { this.tab = id; this.render(); } },
    });
  }

  // Tibia-style combat skills: a level + a fill bar showing progress toward the
  // next level. These rise by USE (fighting), not by spending points.
  _useSkillsView(lang) {
    const box = el('div', { class: 'sp-stats' });
    // The character LEVEL, shown as the first row here (it used to be a badge by
    // the vitals bars). Highlighted with the XP progress to the next level.
    const lvRow = el('div', { class: 'sp-stat-row sp-level-row' });
    lvRow.appendChild(el('span', { class: 'sp-stat-name', text: t('level') }));
    lvRow.appendChild(el('span', { class: 'sp-stat-val', text: String(this.hooks.getLevel()) }));
    const xp = this.hooks.getXp ? this.hooks.getXp() : null;
    const xbar = el('span', { class: 'sp-skillbar' });
    xbar.appendChild(el('span', { class: 'sp-skillbar-fill' }));
    xbar.firstChild.style.width = (xp ? Math.round(xp.frac * 100) : 0) + '%';
    lvRow.appendChild(xbar);
    box.appendChild(lvRow);
    box.appendChild(el('div', { class: 'sp-points', text: t('skillsByUse') || 'Suben usándolas' }));
    for (const s of USE_SKILLS) {
      const lbl = (USE_SKILL_LABEL[s] && USE_SKILL_LABEL[s][lang]) || s;
      const lvl = this.stats.useSkill(s);
      const prog = Math.round(this.stats.skillProgress(s) * 100);
      const row = el('div', { class: 'sp-stat-row' });
      row.appendChild(el('span', { class: 'sp-stat-name', text: lbl }));
      row.appendChild(el('span', { class: 'sp-stat-val', text: String(lvl) }));
      // Thin progress bar to the next level.
      const bar = el('span', { class: 'sp-skillbar' });
      bar.appendChild(el('span', { class: 'sp-skillbar-fill' }));
      bar.firstChild.style.width = prog + '%';
      row.appendChild(bar);
      box.appendChild(row);
    }
    return box;
  }

  _skillsView(prof, lang) {
    const box = el('div', { class: 'sp-skills' });
    // Tell the player the bar is hand-arranged now: drag a learned spell onto a
    // hotbar slot (and drag it off to remove it).
    box.appendChild(el('div', { class: 'sp-points', text: t('dragSpellHint') || '' }));
    const charLevel = this.hooks.getLevel();
    const charTier = tierForLevel(charLevel);
    const byTier = skillsByTier(prof);          // {1:[],2:[],3:[],4:[]}

    for (const tier of [1, 2, 3, 4]) {
      const skills = byTier[tier];
      if (!skills || !skills.length) continue;
      const reqLevel = JOB_TIER_LEVELS[tier - 1];     // 1 / 30 / 70 / 120
      const tierLocked = charTier < tier;             // not yet advanced to this job tier
      const spLeft = this.stats.spForTier(tier);

      const sec = el('div', { class: 'sp-tier' + (tierLocked ? ' tier-locked' : '') });
      // Header: tier name + per-tier SP counter (or a lock with the unlock level).
      const head = tierLocked
        ? `${t('tier')} ${tier} · 🔒 ${t('level')} ${reqLevel}`
        : `${t('tier')} ${tier} · ${t('skillPoints')}: ${spLeft}`;
      sec.appendChild(el('div', { class: 'sp-tier-head', text: head }));

      for (const sk of skills) sec.appendChild(this._skillRow(sk, lang, charLevel, tierLocked, spLeft));
      box.appendChild(sec);
    }
    return box;
  }

  // One row for a single skill. `tierLocked` means the whole tier is unreached;
  // `spLeft` is that tier's unspent SP (the + button spends from that pool).
  _skillRow(sk, lang, charLevel, tierLocked, spLeft) {
    const cur = this.stats.skillLevel(sk.id);
    const levelLocked = charLevel < sk.reqLevel;      // gated by reqLevel (existing rule)
    const locked = tierLocked || levelLocked;
    const maxed = cur >= sk.maxLevel;

    const row = el('div', { class: 'sp-skill' + (locked ? ' locked' : '') });
    const icon = el('span', { class: 'sp-skill-ico', html: skillIcon(sk) });   // SVG, not emoji
    const info = el('div', { class: 'sp-skill-info' });
    info.appendChild(el('div', { class: 'sp-skill-name',
      text: (sk.name[lang] || sk.name.es) + `  ${cur}/${sk.maxLevel}` }));

    // Passives have no power/mana, so show just their description; active
    // skills append their damage/heal and mana cost at the current level.
    const desc = sk.desc[lang] || sk.desc.es;
    let line;
    if (locked) line = `🔒 ${t('level')} ${sk.reqLevel}`;
    else if (sk.kind === 'passive') {
      // Passives apply automatically — they can't (and don't need to) go on the
      // hotbar, so say so to avoid the "why can't I assign it?" confusion.
      const auto = lang === 'en' ? '✓ Passive (always on)' : '✓ Pasiva (siempre activa)';
      line = `${desc} · ${auto}`;
    } else {
      const effect = cur > 0 ? skillPower(sk, cur) : skillPower(sk, 1);
      const verb = sk.kind === 'heal' ? '💚' : '⚔';
      line = `${desc} · ${verb}${effect} · 💧${skillMana(sk, Math.max(1, cur))}`;
    }
    info.appendChild(el('div', { class: 'sp-skill-desc', text: line }));
    row.append(icon, info);

    if (!locked) {
      const plus = el('button', {
        class: 'sp-plus', text: maxed ? '★' : '+',
        on: { click: () => { if (this.stats.addSkillPoint(sk)) { this.hooks.onChange(); this.render(); } } },
      });
      // Disable when maxed OR this tier's pool is empty (per-tier, not global sp).
      plus.disabled = maxed || spLeft <= 0;
      row.appendChild(plus);

      // Castable, unlocked, ACTIVE (not passive) spells can be dragged onto the
      // hotbar — they're no longer auto-placed. Only spells the player has put a
      // point into (level >= 1) are castable, so only those are draggable.
      if (sk.kind !== 'passive' && cur >= 1 && this.hooks.makeDraggable && this.hooks.spellEntry) {
        row.classList.add('sp-skill-drag');
        row.title = t('dragSpellHint') || '';
        this.hooks.makeDraggable(row, () => this.hooks.spellEntry(sk.id));
      }
    }
    return row;
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
