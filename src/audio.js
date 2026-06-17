// Mundum procedural audio: all music and SFX synthesized with Web Audio API.
// No external files, no DOM beyond a one-time user-gesture unlock.

let ctx = null;        // AudioContext, created lazily inside unlock()
let master = null;     // master gain
let musicGain = null;  // music sub-bus
let sfxGain = null;    // sfx sub-bus

let musicVol = 0.25;
let sfxVol = 0.4;
// Sound OFF by default for now (testing). The HUD ♪ button toggles it back on.
let muted = true;
let musicRunning = false;

// Scheduler state
let nextNoteTime = 0;
let stepIndex = 0;
let schedulerTimer = null;

// Music data
// MIDI note numbers; 0 = rest. Each "mood" is a self-contained theme: a 64-step
// lead phrase, a per-bar bass root progression, a pad triad shape, lead timbre,
// and tempo. Moods are crossfaded so entering a dungeon shifts the score.
const LOOKAHEAD = 0.1;     // seconds of audio to schedule ahead
const TICK = 25;           // scheduler poll interval (ms)

// --- Overworld: bright C major pentatonic, the original cheerful theme. ---
const THEME_OVERWORLD = {
  bpm: 120,
  leadType: 'triangle',
  pad: [0, 4, 7],          // major triad
  lead: [
    72, 0, 76, 79, 81, 0, 79, 76, 74, 0, 72, 74, 76, 0, 74, 72,
    72, 0, 76, 79, 84, 0, 81, 79, 76, 0, 74, 76, 79, 0, 76, 72,
    77, 0, 81, 84, 86, 0, 84, 81, 79, 0, 77, 79, 81, 0, 79, 76,
    72, 0, 74, 76, 79, 0, 81, 79, 76, 0, 74, 72, 71, 0, 74, 0,
  ],
  bass: [48, 45, 53, 55, 48, 45, 50, 55], // I vi IV V
};

// --- Dungeon: slower, A natural minor, sparser phrase, darker square lead. ---
const THEME_DUNGEON = {
  bpm: 96,
  leadType: 'square',
  pad: [0, 3, 7],          // minor triad
  lead: [
    69, 0, 0, 72, 71, 0, 69, 0, 67, 0, 69, 0, 0, 67, 65, 0,
    69, 0, 0, 72, 74, 0, 72, 0, 71, 0, 69, 0, 67, 0, 0, 0,
    65, 0, 0, 67, 67, 0, 65, 0, 64, 0, 65, 0, 0, 64, 62, 0,
    69, 0, 72, 0, 71, 0, 69, 67, 0, 65, 64, 0, 65, 0, 0, 0,
  ],
  bass: [33, 33, 41, 40, 36, 36, 41, 40], // a minor, brooding roots
  drone: 0.06, // subtle bed of tension under the sparse phrase
};

// --- Deep dungeon: heavy, low, dissonant phrygian, sawtooth lead, ominous. ---
const THEME_ABYSS = {
  bpm: 84,
  leadType: 'sawtooth',
  pad: [0, 3, 6],          // diminished-ish, tense
  lead: [
    57, 0, 0, 0, 58, 0, 57, 0, 55, 0, 0, 57, 53, 0, 0, 0,
    57, 0, 0, 58, 0, 0, 60, 0, 58, 0, 57, 0, 0, 0, 53, 0,
    50, 0, 0, 0, 50, 0, 50, 0, 48, 0, 0, 50, 0, 0, 0, 0,
    57, 0, 55, 0, 55, 0, 53, 0, 51, 0, 50, 0, 0, 0, 0, 0,
  ],
  // Low A, phrygian b2 (Bb) menace. One octave up from cellar-floor so it still
  // reads on laptop/phone speakers instead of vanishing under ~30 Hz.
  bass: [33, 33, 34, 33, 38, 38, 34, 33],
  drone: 0.085, // heavier, ever-present growl for the deepest dungeons
};

const THEMES = {
  overworld: THEME_OVERWORLD,
  dungeon: THEME_DUNGEON,
  abyss: THEME_ABYSS,
};

let currentMood = 'overworld';
let theme = THEME_OVERWORLD;

const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

// Voices
function lead(freq, t, dur, vel) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = theme.leadType;
  o.frequency.value = freq;
  // Slight detuned variation so it isn't robotic.
  o.detune.value = (Math.random() - 0.5) * 6;
  const peak = 0.22 * vel;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(peak, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(musicGain);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function bass(freq, t, dur) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = "sine";
  o.frequency.value = freq;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.3, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(musicGain);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function pad(root, t, dur) {
  for (const off of theme.pad) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.value = mtof(root + 12 + off);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.05, t + 0.08);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(musicGain);
    o.start(t);
    o.stop(t + dur + 0.02);
  }
}

// A sustained low drone, renewed each bar, that gives dungeon themes a constant
// bed of tension so the sparse phrases never feel like the music dropped out.
// Slightly detuned dual-saw through a lowpass for a warm, ominous growl.
function drone(midi, t, dur, peak) {
  for (const det of [-4, 4]) {
    const o = ctx.createOscillator();
    o.type = "sawtooth";
    o.frequency.value = mtof(midi);
    o.detune.value = det;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 320;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + dur * 0.25);
    g.gain.setValueAtTime(peak, t + dur * 0.6);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(lp).connect(g).connect(musicGain);
    o.start(t);
    o.stop(t + dur + 0.02);
  }
}

// Scheduler. STEP depends on the current theme's tempo, so it is read live.
function stepDur() {
  return 60 / theme.bpm / 2; // eighth notes at the active BPM
}

function scheduleStep(step, t, step1) {
  const lead2 = theme.lead;
  const note = lead2[step % lead2.length];
  if (note) {
    // Velocity shaping: accent downbeats, soften offbeats.
    const vel = step % 4 === 0 ? 1 : step % 2 === 0 ? 0.85 : 0.7;
    const dur = step % 2 === 0 ? step1 * 1.7 : step1 * 0.9;
    lead(mtof(note), t, dur, vel);
  }
  if (step % 8 === 0) {
    const root = theme.bass[(step / 8) % theme.bass.length];
    bass(mtof(root), t, step1 * 7.5);
    pad(root, t, step1 * 7.5);
    // Optional per-theme drone: one octave below the bar's bass root.
    if (theme.drone) drone(root - 12, t, step1 * 8, theme.drone);
  }
}

function scheduler() {
  if (!ctx) return;
  while (nextNoteTime < ctx.currentTime + LOOKAHEAD) {
    const step1 = stepDur();
    scheduleStep(stepIndex, nextNoteTime, step1);
    nextNoteTime += step1;
    stepIndex = (stepIndex + 1) % theme.lead.length; // 64-step loop = seamless
  }
}

function startScheduler() {
  if (schedulerTimer || !ctx) return;
  nextNoteTime = ctx.currentTime + 0.08;
  schedulerTimer = setInterval(scheduler, TICK);
}

function stopScheduler() {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
  }
}

// SFX helpers
function blip(type, f0, f1, dur, peak) {
  if (!ctx) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, ctx.currentTime);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, ctx.currentTime + dur);
  g.gain.setValueAtTime(peak, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
  o.connect(g).connect(sfxGain);
  o.start();
  o.stop(ctx.currentTime + dur + 0.02);
}

function noise(dur, peak, freq, q) {
  if (!ctx) return;
  const n = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, n, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = freq;
  bp.Q.value = q;
  const g = ctx.createGain();
  g.gain.value = peak;
  src.connect(bp).connect(g).connect(sfxGain);
  src.start();
}

function arpeggio(notes, step, type, peak) {
  if (!ctx) return;
  notes.forEach((m, i) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = mtof(m);
    const t = ctx.currentTime + i * step;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + step * 1.8);
    o.connect(g).connect(sfxGain);
    o.start(t);
    o.stop(t + step * 1.8 + 0.02);
  });
}

const sfx = {
  jump: () => blip("square", 330, 740, 0.16, 0.3),
  attack: () => noise(0.18, 0.35, 1400, 0.8),
  // Bow loose: a soft string twang plus an airy whoosh as the arrow flies off.
  bow: () => { blip("triangle", 520, 180, 0.12, 0.22); noise(0.22, 0.22, 2600, 1.4); },
  hit: () => { blip("square", 200, 70, 0.14, 0.35); noise(0.1, 0.25, 500, 1); },
  creatureHit: () => blip("sawtooth", 420, 120, 0.18, 0.3),
  levelUp: () => arpeggio([60, 64, 67, 72, 76], 0.09, "triangle", 0.3),
  questComplete: () => { arpeggio([60, 64, 67, 72, 76, 79, 84], 0.08, "triangle", 0.32); blip("triangle", 523, 784, 0.45, 0.22); },
  pickup: () => { blip("square", 880, 880, 0.06, 0.3); blip("square", 1320, 1320, 0.09, 0.25); },
  click: () => blip("square", 660, 660, 0.04, 0.2),
  death: () => blip("sawtooth", 300, 60, 0.7, 0.35),
};

// Public API
export const audio = {
  // Resume context (must run from a user gesture) and start music.
  unlock() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 1;
      master.connect(ctx.destination);
      musicGain = ctx.createGain();
      musicGain.gain.value = musicVol;
      musicGain.connect(master);
      sfxGain = ctx.createGain();
      sfxGain.gain.value = sfxVol;
      sfxGain.connect(master);
    }
    if (ctx.state === "suspended") ctx.resume();
    this.startMusic();
  },

  startMusic() {
    if (!ctx || muted || musicRunning) return;
    musicRunning = true;
    startScheduler();
  },

  stopMusic() {
    musicRunning = false;
    stopScheduler();
  },

  // Switch the active musical theme by mood, with a short duck-and-swap so the
  // transition reads as a new track rather than a hard cut. Moods:
  //   'overworld' | 'dungeon' | 'abyss'  (unknown names fall back to overworld)
  setMood(mood) {
    if (!THEMES[mood]) mood = 'overworld';
    if (mood === currentMood) return;
    currentMood = mood;

    // If audio isn't live yet, just stage the theme for when music starts.
    if (!ctx || !musicGain) { theme = THEMES[mood]; return; }

    const now = ctx.currentTime;
    const g = musicGain.gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    // Duck down over 0.35s, swap the theme at the trough, swell back over 0.7s.
    g.linearRampToValueAtTime(0.0001, now + 0.35);
    g.linearRampToValueAtTime(musicVol, now + 1.05);
    setTimeout(() => { theme = THEMES[currentMood]; }, 360);
  },

  getMood() {
    return currentMood;
  },

  setMusicVolume(v) {
    musicVol = Math.max(0, Math.min(1, v));
    // Don't stomp an in-flight crossfade ramp; only set when not transitioning.
    if (musicGain && theme === THEMES[currentMood]) musicGain.gain.value = musicVol;
  },

  setSfxVolume(v) {
    sfxVol = Math.max(0, Math.min(1, v));
    if (sfxGain) sfxGain.gain.value = sfxVol;
  },

  toggleMute() {
    muted = !muted;
    if (master) master.gain.value = muted ? 0 : 1;
    if (muted) this.stopMusic();
    else this.startMusic();
    return muted;
  },

  isMuted() {
    return muted;
  },

  sfx,
};
