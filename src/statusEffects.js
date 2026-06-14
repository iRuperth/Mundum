// Player status effects: BURN, POISON and SLOW (ice). Pure logic — no Three.js,
// no DOM. The game loop creates one PlayerStatus, calls applyFromCreature() when
// a foe hits the player, and tick(dt) each frame to drain damage-over-time and
// expire the slow. Damage is reported back through an onTick(amount, kind) hook
// so the caller can subtract HP and show floating numbers.
//
// Design (per game rules):
//   BURN   — 100 HP total, 5 HP every 5s  (fire-bodied foes, fire dragons, fire elementals)
//   POISON — 100 HP total, 3 HP every 5s  (poison/earth foes); slower but same total
//   SLOW   — 15% while in combat; after combat ends, 5% for 60s (ice/water foes)

export const BURN_TOTAL = 100;
export const BURN_STEP = 5;       // hp per tick
export const POISON_TOTAL = 100;
export const POISON_STEP = 3;     // hp per tick
export const DOT_INTERVAL = 5;    // seconds between burn/poison ticks
export const SLOW_IN_COMBAT = 0.15;   // 15% slow while a slowing fight is active
export const SLOW_AFTER = 0.05;       // 5% lingering slow once out of combat
export const SLOW_AFTER_DUR = 60;     // seconds the lingering slow lasts
export const COMBAT_LINGER = 4;       // seconds since last slow-hit that still counts as "in combat"

// Which status a creature's hit inflicts. Burn is reserved for foes that visibly
// burn: fire element AND (a fire dragon / fire elemental / demon-tier) or any
// creature flagged burns. Poison for poison/earth element. Slow for water (ice).
export function statusForCreature(def, areaKind) {
  if (!def) return null;
  const kind = areaKind || def.element;
  // explicit flags win
  if (def.burns) return 'burn';
  if (def.slows) return 'slow';
  if (kind === 'fire') {
    // only the genuinely fiery foes burn (not every fire-tinted mob)
    const fam = def.family || '';
    const fiery = /dragon|demon|elemental|devil|hellhound|imp|efreet|magma|lava/.test(fam)
      || /fire|flame|magma|lava|inferno|hell/.test(def.id || '');
    return fiery ? 'burn' : null;
  }
  if (kind === 'water') return 'slow';                 // ice/frost foes slow you
  if (kind === 'poison' || kind === 'plant' || kind === 'earth') return 'poison';
  return null;
}

export class PlayerStatus {
  constructor(onTick) {
    this.onTick = onTick || (() => {});
    this.reset();
  }

  reset() {
    this.burnLeft = 0; this.burnAcc = 0;
    this.poisonLeft = 0; this.poisonAcc = 0;
    this.slowCombatLeft = 0;   // seconds the in-combat 15% slow persists since last slow hit
    this.slowAfterLeft = 0;    // seconds the lingering 5% slow remains
  }

  // Apply the effect a creature's blow carries. Re-applying refreshes the pool
  // up to its cap (a fresh burn re-tops the 100 total; it doesn't stack to 200).
  applyFromCreature(def, areaKind) {
    const s = statusForCreature(def, areaKind);
    if (s === 'burn') this.burnLeft = BURN_TOTAL;
    else if (s === 'poison') this.poisonLeft = POISON_TOTAL;
    else if (s === 'slow') this.slowCombatLeft = COMBAT_LINGER;
    return s;
  }

  // Directly apply a named effect (used by area bursts / explicit triggers).
  apply(kind) {
    if (kind === 'burn') this.burnLeft = BURN_TOTAL;
    else if (kind === 'poison') this.poisonLeft = POISON_TOTAL;
    else if (kind === 'slow') this.slowCombatLeft = COMBAT_LINGER;
  }

  // True while a slowing fight is active.
  get inSlowCombat() { return this.slowCombatLeft > 0; }

  // The movement multiplier to apply right now (1 = normal, <1 = slowed).
  speedMultiplier() {
    if (this.slowCombatLeft > 0) return 1 - SLOW_IN_COMBAT;
    if (this.slowAfterLeft > 0) return 1 - SLOW_AFTER;
    return 1;
  }

  // Advance time: drain burn/poison on their interval, decay the slow timers.
  // When the in-combat slow runs out it converts to the 60s lingering 5% slow.
  tick(dt) {
    if (this.burnLeft > 0) {
      this.burnAcc += dt;
      while (this.burnAcc >= DOT_INTERVAL && this.burnLeft > 0) {
        this.burnAcc -= DOT_INTERVAL;
        const amt = Math.min(BURN_STEP, this.burnLeft);
        this.burnLeft -= amt;
        this.onTick(amt, 'burn');
      }
    } else this.burnAcc = 0;

    if (this.poisonLeft > 0) {
      this.poisonAcc += dt;
      while (this.poisonAcc >= DOT_INTERVAL && this.poisonLeft > 0) {
        this.poisonAcc -= DOT_INTERVAL;
        const amt = Math.min(POISON_STEP, this.poisonLeft);
        this.poisonLeft -= amt;
        this.onTick(amt, 'poison');
      }
    } else this.poisonAcc = 0;

    if (this.slowCombatLeft > 0) {
      this.slowCombatLeft -= dt;
      if (this.slowCombatLeft <= 0) {
        this.slowCombatLeft = 0;
        this.slowAfterLeft = SLOW_AFTER_DUR;   // convert to lingering slow
      }
    } else if (this.slowAfterLeft > 0) {
      this.slowAfterLeft -= dt;
      if (this.slowAfterLeft < 0) this.slowAfterLeft = 0;
    }
  }

  // Refresh the in-combat slow window (call when a slowing foe hits again).
  refreshSlowCombat() { if (this.slowCombatLeft > 0) this.slowCombatLeft = COMBAT_LINGER; }
}
