// Level curve and date-derived global events. Events are derived from the
// date so every player gets the same one without a server.

// Total accumulated xp required to reach a level. Level 1 starts at 0.
// A gentle exponent keeps two kids of different levels roughly in sync.
export function xpForLevel(level) {
  if (level <= 1) return 0;
  return Math.floor(45 * Math.pow(level - 1, 2.35));
}

export function levelForXp(xp) {
  let lvl = 1;
  while (xp >= xpForLevel(lvl + 1)) lvl++;
  return lvl;
}

export function xpProgress(xp) {
  const lvl = levelForXp(xp);
  const cur = xpForLevel(lvl);
  const next = xpForLevel(lvl + 1);
  return { level: lvl, into: xp - cur, span: next - cur, frac: (xp - cur) / (next - cur) };
}

function dayNumber(d) {
  return Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 86400000);
}

function hashDay(n) {
  let h = Math.imul(n ^ 0x9e3779b9, 2654435761) >>> 0;
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

// The daily random event window: derived from the date so it is the same for
// everyone. Returns { kind: 'xp'|'drop', active, startHour, endHour }.
export function dailyEvent(now) {
  const d = now || new Date();
  const day = dayNumber(d);
  const r = hashDay(day);
  const kind = hashDay(day + 7777) < 0.5 ? 'xp' : 'drop';
  const startHour = 8 + Math.floor(r * 12);
  const endHour = startHour + 2;
  const h = d.getHours() + d.getMinutes() / 60;
  return { kind, active: h >= startHour && h < endHour, startHour, endHour };
}

// Weekend xp x2 from 15:00 to 22:00 (Saturday and Sunday).
export function weekendXp(now) {
  const d = now || new Date();
  const day = d.getDay();
  const h = d.getHours() + d.getMinutes() / 60;
  return (day === 0 || day === 6) && h >= 15 && h < 22;
}

// Combined multipliers applied at kill time.
export function eventMultipliers(now) {
  const ev = dailyEvent(now);
  let xp = 1, drop = 1;
  if (ev.active && ev.kind === 'xp') xp *= 2;
  if (ev.active && ev.kind === 'drop') drop *= 2;
  if (weekendXp(now)) xp *= 2;
  return { xp, drop, event: ev };
}
