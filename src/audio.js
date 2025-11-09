// Mundum procedural audio: all music and SFX synthesized with Web Audio API.
// No external files, no DOM beyond a one-time user-gesture unlock.

let ctx = null;        // AudioContext, created lazily inside unlock()
let master = null;     // master gain
let musicGain = null;  // music sub-bus
let sfxGain = null;    // sfx sub-bus

let musicVol = 0.25;
let sfxVol = 0.4;
let muted = false;
let musicRunning = false;

// Scheduler state
let nextNoteTime = 0;
let stepIndex = 0;
let schedulerTimer = null;

// Music data
// C major pentatonic vibe. MIDI note numbers; 0 = rest.
const BPM = 120;
const STEP = 60 / BPM / 2; // eighth notes
const LOOKAHEAD = 0.1;     // seconds of audio to schedule ahead
const TICK = 25;           // scheduler poll interval (ms)

// 16-step lead phrase, repeated/varied over an 8-bar (64-step) loop.
const LEAD = [
  72, 0, 76, 79, 81, 0, 79, 76, 74, 0, 72, 74, 76, 0, 74, 72,
  72, 0, 76, 79, 84, 0, 81, 79, 76, 0, 74, 76, 79, 0, 76, 72,
  77, 0, 81, 84, 86, 0, 84, 81, 79, 0, 77, 79, 81, 0, 79, 76,
  72, 0, 74, 76, 79, 0, 81, 79, 76, 0, 74, 72, 71, 0, 74, 0,
];
// Bass root per bar (one note every 8 steps): I vi IV V over the loop.
const BASS = [48, 45, 53, 55, 48, 45, 50, 55];
// Triad offsets above bass root for a soft pad.
const PAD = [0, 4, 7];

const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

// Voices
function lead(freq, t, dur, vel) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = "triangle";
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
  for (const off of PAD) {
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

// Scheduler
function scheduleStep(step, t) {
  const note = LEAD[step % LEAD.length];
  if (note) {
    // Velocity shaping: accent downbeats, soften offbeats.
    const vel = step % 4 === 0 ? 1 : step % 2 === 0 ? 0.85 : 0.7;
    const dur = step % 2 === 0 ? STEP * 1.7 : STEP * 0.9;
    lead(mtof(note), t, dur, vel);
  }
  if (step % 8 === 0) {
    const root = BASS[(step / 8) % BASS.length];
    bass(mtof(root), t, STEP * 7.5);
    pad(root, t, STEP * 7.5);
  }
}

function scheduler() {
  if (!ctx) return;
  while (nextNoteTime < ctx.currentTime + LOOKAHEAD) {
    scheduleStep(stepIndex, nextNoteTime);
    nextNoteTime += STEP;
    stepIndex = (stepIndex + 1) % LEAD.length; // 64-step loop = seamless
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

  setMusicVolume(v) {
    musicVol = Math.max(0, Math.min(1, v));
    if (musicGain) musicGain.gain.value = musicVol;
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
