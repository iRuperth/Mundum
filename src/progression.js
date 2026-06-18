// Level curve and date-derived global events. Events are derived from the
// date so every player gets the same one without a server.

// Total accumulated xp required to reach a level. Level 1 starts at 0.
// This is the OFFICIAL Tibia experience curve — XP = (50/3)(L³ − 6L² + 17L − 12)
// — so leveling follows Tibia's roadmap exactly: gentle at the very start, then
// steeply cubic (e.g. reaching level 20 costs ~98,800 total, like Tibia). Kept
// in step with the creatures' fixed per-level exp so the kills-per-level pace
// matches Tibia rather than the old, far flatter curve.
export function xpForLevel(level) {
  if (level <= 1) return 0;
  const L = level;
  return Math.round((50 / 3) * (L * L * L - 6 * L * L + 17 * L - 12));
}

export function levelForXp(xp) {
  let lvl = 1;
  while (xp >= xpForLevel(lvl + 1)) lvl++;
  return lvl;
}

// --- Level-banded XP boost ------------------------------------------------
// Early levels grant BONUS experience so a new player races up, with the bonus
// tapering as they grow (Tibia's own "low-level rapid xp" idea, but stronger and
// explicit). The multiplier is chosen by the PLAYER'S level when a kill is
// scored. Flip LEVEL_XP_SCALE_ENABLED to false to play on plain ×1 exp.
export const LEVEL_XP_SCALE_ENABLED = true;

// [maxLevel, multiplier] bands, low → high. The last band (×1) covers everything
// above it. A player of level L uses the first band whose maxLevel ≥ L.
const LEVEL_XP_BANDS = [
  [10, 10],   // levels 1–10  : ×10
  [20, 9],    // levels 11–20 : ×9
  [50, 8],    // levels 21–50 : ×8
  [70, 6],    // levels 51–70 : ×6
  [100, 5],   // levels 71–100: ×5
  [120, 4],   // levels 101–120: ×4
  [Infinity, 1], // level 121+  : ×1 (normal)
];

// The XP multiplier for a player at `level`. Returns 1 when the scale is off.
export function levelXpMultiplier(level) {
  if (!LEVEL_XP_SCALE_ENABLED) return 1;
  const L = Math.max(1, level || 1);
  for (const [maxLv, mul] of LEVEL_XP_BANDS) if (L <= maxLv) return mul;
  return 1;
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
