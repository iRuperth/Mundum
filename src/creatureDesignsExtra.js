// Hand-authored creature designs (Tibia 7.4 overhaul) — the vermin & dragon
// batches that the design workflow didn't reach. Same format as the auto-generated
// creatureDesigns.js: { base, optionsFn(API), decorate(root, parts, o, tint, API), scale, color }.
// Each one adds bespoke geometry so its silhouette is unique, not a recolor.
import { registerDesigns } from './creatureModels.js';

const DESIGNS = {
  // ===================== VERMIN & CRITTERS =====================
  worm: {
    base: 'worm', scale: 0.8, color: 0xd98a8a,
    optionsFn() { return { segments: 7, bodyR: 0.09 }; },
  },

  rotworm: {
    base: 'worm', scale: 1.0, color: 0xa98a5a,
    optionsFn() { return { segments: 8, bodyR: 0.13 }; },
    // Big decay-spotted worm with a gaping ringed maw and dark rot blotches.
    decorate(root, parts, o, tint, API) {
      const { mesh, lambert, shade, G } = API;
      const head = parts.segs[0].m;
      // gaping mouth: a dark ring at the front segment
      const maw = mesh(G.torus, lambert(0x3a1a14));
      maw.scale.set(0.7, 0.7, 0.5);
      maw.rotation.y = Math.PI / 2;
      maw.position.z = 0.8;
      head.add(maw);
      // decay blotches down the body
      for (const sg of parts.segs) {
        if (sg.i % 2) continue;
        const spot = mesh(G.lowSphere, lambert(shade(tint, 0.6)));
        spot.scale.set(0.5, 0.3, 0.5);
        spot.position.set(0.4, 0.5, 0);
        sg.m.add(spot);
      }
    },
  },

  larva: {
    base: 'worm', scale: 0.7, color: 0xe8d8a8,
    optionsFn() { return { segments: 6, bodyR: 0.08 }; },
    // Cream maggot: dark band stripes + tiny mandibles.
    decorate(root, parts, o, tint, API) {
      const { mesh, lambert, shade, G } = API;
      for (const sg of parts.segs) {
        const band = mesh(G.torus, lambert(shade(tint, 0.75)));
        band.scale.set(1.05, 1.05, 0.4);
        band.rotation.y = Math.PI / 2;
        sg.m.add(band);
      }
      const head = parts.segs[0].m;
      for (const s of [-1, 1]) {
        const mand = mesh(G.cone, lambert(0x8a6a3a));
        mand.scale.set(0.25, 0.5, 0.25);
        mand.position.set(s * 0.4, -0.2, 0.7);
        mand.rotation.x = -0.6;
        head.add(mand);
      }
    },
  },

  rat: {
    base: 'quadruped', scale: 0.7, color: 0x8a7a6a,
    optionsFn() { return { height: 0.6, len: 0.36, bodyR: 0.12, legLen: 0.14, ears: true, tail: true, snout: true }; },
    // Pink nose, long bald tail, buck teeth.
    decorate(root, parts, o, tint, API) {
      const { mesh, lambert, G } = API;
      const head = parts.head;
      const nose = mesh(G.lowSphere, lambert(0xdd8899));
      nose.scale.setScalar(0.05);
      nose.position.set(0, 0.0, 0.18);
      head.add(nose);
      for (const s of [-1, 1]) {
        const tooth = mesh(G.cone, lambert(0xf4eecc));
        tooth.scale.set(0.012, 0.035, 0.012);
        tooth.position.set(s * 0.02, -0.06, 0.16);
        tooth.rotation.x = Math.PI;
        head.add(tooth);
      }
    },
  },

  cave_rat: {
    base: 'quadruped', scale: 0.85, color: 0x5a4f47,
    optionsFn() { return { height: 0.65, len: 0.4, bodyR: 0.14, legLen: 0.14, ears: true, tail: true, snout: true }; },
    // Stockier, darker, with red eyes and bigger fangs.
    decorate(root, parts, o, tint, API) {
      const { mesh, lambert, G } = API;
      const head = parts.head;
      for (const s of [-1, 1]) {
        const eye = mesh(G.lowSphere, lambert(0xcc2222));
        eye.scale.setScalar(0.03);
        eye.position.set(s * 0.06, 0.05, 0.14);
        head.add(eye);
        const fang = mesh(G.cone, lambert(0xeee6cc));
        fang.scale.set(0.014, 0.045, 0.014);
        fang.position.set(s * 0.03, -0.07, 0.16);
        fang.rotation.x = Math.PI;
        head.add(fang);
      }
    },
  },

  snake: {
    base: 'serpent', scale: 1.0, color: 0x6aaa4a,
    optionsFn() { return { segments: 9, bodyR: 0.13, frill: true }; },
    // Forked tongue + a diamond scale pattern of darker spots.
    decorate(root, parts, o, tint, API) {
      const { mesh, lambert, shade, G } = API;
      const head = parts.segs[0].m;
      const tongue = mesh(G.cone, lambert(0xcc3344));
      tongue.scale.set(0.1, 0.4, 0.1);
      tongue.position.set(0, 0, 1.0);
      tongue.rotation.x = Math.PI / 2;
      head.add(tongue);
      for (const sg of parts.segs) {
        if (sg.i % 2) continue;
        const di = mesh(G.lowSphere, lambert(shade(tint, 0.6)));
        di.scale.set(0.5, 0.2, 0.5);
        di.position.y = 0.8;
        sg.m.add(di);
      }
    },
  },

  spider: {
    base: 'bug', scale: 0.9, color: 0x2a2a2a,
    optionsFn() { return { legs: 8, bodyR: 0.2 }; },
    // Glossy black: clustered red eyes + fangs.
    decorate(root, parts, o, tint, API) {
      const { mesh, lambert, G } = API;
      const r = 0.2;
      for (let i = 0; i < 4; i++) {
        const eye = mesh(G.lowSphere, lambert(0xaa1111));
        eye.scale.setScalar(r * 0.1);
        eye.position.set((i - 1.5) * r * 0.18, r * 0.45, r * 1.05);
        root.add(eye);
      }
      for (const s of [-1, 1]) {
        const fang = mesh(G.cone, lambert(0x111111));
        fang.scale.set(r * 0.08, r * 0.2, r * 0.08);
        fang.position.set(s * r * 0.2, r * 0.2, r * 1.05);
        fang.rotation.x = 2.4;
        root.add(fang);
      }
    },
  },

  poison_spider: {
    base: 'bug', scale: 1.0, color: 0x2a2a1a,
    optionsFn() { return { legs: 8, bodyR: 0.22 }; },
    // Yellow venom stripes on the abdomen + dripping green fangs.
    decorate(root, parts, o, tint, API) {
      const { mesh, lambert, G } = API;
      const r = 0.22;
      for (let i = 0; i < 3; i++) {
        const stripe = mesh(G.torus, lambert(0xccdd33));
        stripe.scale.set(r * (0.8 - i * 0.18), r * 0.5, r * 0.12);
        stripe.rotation.x = Math.PI / 2;
        stripe.position.set(0, r * 0.55, -r * 0.3 - i * r * 0.2);
        root.add(stripe);
      }
      for (const s of [-1, 1]) {
        const fang = mesh(G.cone, lambert(0x66cc44));
        fang.scale.set(r * 0.09, r * 0.24, r * 0.09);
        fang.position.set(s * r * 0.22, r * 0.15, r * 1.05);
        fang.rotation.x = 2.4;
        root.add(fang);
      }
    },
  },

  tarantula: {
    base: 'bug', scale: 1.1, color: 0x5a3a2a,
    optionsFn() { return { legs: 8, bodyR: 0.24 }; },
    // Hairy: fur tufts over the abdomen and along the legs.
    decorate(root, parts, o, tint, API) {
      const { addFur, mesh, lambert, G } = API;
      const r = 0.24;
      // abdomen is the first big sphere child; fur it.
      addFur(root, r * 0.9, tint, 2, 10, 0.8);
      for (const s of [-1, 1]) {
        const fang = mesh(G.cone, lambert(0x2a1a12));
        fang.scale.set(r * 0.1, r * 0.26, r * 0.1);
        fang.position.set(s * r * 0.22, r * 0.2, r * 1.05);
        fang.rotation.x = 2.4;
        root.add(fang);
      }
    },
  },

  scorpion: {
    base: 'bug', scale: 1.0, color: 0x886622,
    optionsFn() { return { legs: 8, bodyR: 0.18, claws: true, sting: true }; },
    // Already has claws + sting; darken segments + glossy carapace highlight.
    decorate(root, parts, o, tint, API) {
      const { mesh, lambert, shade, G } = API;
      const shell = mesh(G.dome, lambert(shade(tint, 0.8)));
      shell.scale.set(0.2, 0.16, 0.24);
      shell.position.set(0, 0.18, -0.06);
      root.add(shell);
    },
  },

  beetle: {
    base: 'bug', scale: 0.9, color: 0x3a5a3a,
    optionsFn() { return { legs: 6, bodyR: 0.18, shell: true, flat: 0.6 }; },
    // Iridescent split wing-case (a center seam) + small horn.
    decorate(root, parts, o, tint, API) {
      const { mesh, lambert, shade, G } = API;
      const seam = mesh(G.cyl, lambert(shade(tint, 0.5)));
      seam.scale.set(0.008, 0.22, 0.008);
      seam.rotation.x = Math.PI / 2;
      seam.position.set(0, 0.3, -0.3);
      root.add(seam);
      const horn = mesh(G.cone, lambert(shade(tint, 0.6)));
      horn.scale.set(0.03, 0.12, 0.03);
      horn.position.set(0, 0.28, 0.7);
      horn.rotation.x = -0.5;
      root.add(horn);
    },
  },

  crab: {
    base: 'bug', scale: 1.0, color: 0xcc6644,
    optionsFn() { return { legs: 6, bodyR: 0.2, claws: true, flat: 0.5, shell: true }; },
    // Eyestalks on top of the shell.
    decorate(root, parts, o, tint, API) {
      const { mesh, lambert, EYE_W, EYE_B, G } = API;
      for (const s of [-1, 1]) {
        const stalk = mesh(G.cyl, lambert(tint));
        stalk.scale.set(0.012, 0.08, 0.012);
        stalk.position.set(s * 0.06, 0.42, 0.5);
        root.add(stalk);
        const eye = mesh(G.lowSphere, EYE_W);
        eye.scale.setScalar(0.03);
        eye.position.set(s * 0.06, 0.5, 0.5);
        root.add(eye);
        const pup = mesh(G.lowSphere, EYE_B);
        pup.scale.setScalar(0.018);
        pup.position.set(s * 0.06, 0.5, 0.52);
        root.add(pup);
      }
    },
  },

  wasp: {
    base: 'flyer', scale: 0.8, color: 0xddaa22,
    optionsFn() { return { bodyR: 0.12, sting: true, stripes: true, hover: 0.6 }; },
    // Black abdomen stripes.
    decorate(root, parts, o, tint, API) {
      const { mesh, lambert, G } = API;
      for (let i = 0; i < 3; i++) {
        const band = mesh(G.torus, lambert(0x222222));
        band.scale.set(0.13, 0.13, 0.04);
        band.rotation.x = Math.PI / 2;
        band.position.set(0, parts.hover - 0.02 - i * 0.04, -0.02 - i * 0.03);
        root.add(band);
      }
    },
  },

  bat: {
    base: 'flyer', scale: 0.85, color: 0x443344,
    optionsFn(API) { return { bodyR: 0.13, hover: 0.6, wingMat: API.lambert(API.shade(0x443344, 0.7)) }; },
    // Pointy ears + fangs.
    decorate(root, parts, o, tint, API) {
      const { mesh, lambert, G } = API;
      const r = 0.13;
      for (const s of [-1, 1]) {
        const ear = mesh(G.cone, lambert(tint));
        ear.scale.set(r * 0.3, r * 0.6, r * 0.3);
        ear.position.set(s * r * 0.4, parts.hover + r * 0.7, r * 0.2);
        root.add(ear);
      }
      const fang = mesh(G.cone, lambert(0xffffff));
      fang.scale.set(r * 0.12, r * 0.2, r * 0.12);
      fang.position.set(0, parts.hover - r * 0.1, r * 0.6);
      fang.rotation.x = Math.PI;
      root.add(fang);
    },
  },

  slime: {
    base: 'blob', scale: 1.0, color: 0x55cc99,
    optionsFn() { return { bodyR: 0.32 }; },
    // Inner darker core + a couple of drip droplets.
    decorate(root, parts, o, tint, API) {
      const { mesh, lambert, shade, G } = API;
      const core = mesh(G.sphere, lambert(shade(tint, 0.7)));
      core.scale.setScalar(0.14);
      core.position.set(0, 0.16, 0);
      root.add(core);
      for (const s of [-1, 1]) {
        const drip = mesh(G.sphere, lambert(tint));
        drip.scale.setScalar(0.05);
        drip.position.set(s * 0.22, 0.04, s * 0.1);
        root.add(drip);
      }
    },
  },

  toad: {
    base: 'frog', scale: 0.9, color: 0x8a8a4a,
    optionsFn() { return {}; },
    // Warts: small bumps over the dome.
    decorate(root, parts, o, tint, API) {
      const { mesh, lambert, shade, G } = API;
      const wart = lambert(shade(tint, 0.7));
      const dome = parts.dome;
      for (let i = 0; i < 7; i++) {
        const a = i * 2.39996;
        const w = mesh(G.lowSphere, wart);
        w.scale.setScalar(0.06);
        w.position.set(Math.cos(a) * 0.7, 0.5, Math.sin(a) * 0.7);
        dome.add(w);
      }
    },
  },

  // ===================== DRAGONS & WYVERNS =====================
  dragon: {
    base: 'dragon', scale: 1.4, color: 0xcc2211,
    optionsFn() { return { bodyR: 0.3, standY: 0.58 }; },
    // Classic red drake: dorsal spine ridge + extra brow horns.
    decorate(root, parts, o, tint, API) { addDorsalSpine(root, parts, tint, API, 0.5); },
  },

  green_dragon: {
    base: 'dragon', scale: 1.4, color: 0x338822,
    optionsFn() { return { bodyR: 0.3, standY: 0.58 }; },
    decorate(root, parts, o, tint, API) {
      addDorsalSpine(root, parts, tint, API, 0.5);
      // poison drool from the maw
      const { mesh, lambert, G } = API;
      const drool = mesh(G.cone, lambert(0x88dd33));
      drool.scale.set(0.04, 0.12, 0.04);
      drool.position.set(0, -0.04, 0.2);
      drool.rotation.x = Math.PI;
      parts.head.add(drool);
    },
  },

  black_dragon: {
    base: 'dragon', scale: 1.6, color: 0x222226,
    optionsFn() { return { bodyR: 0.34, standY: 0.62 }; },
    // Bigger, jagged; molten cracks (orange spots) along the body.
    decorate(root, parts, o, tint, API) {
      addDorsalSpine(root, parts, tint, API, 0.7);
      const { mesh, lambert, G } = API;
      for (let i = 0; i < 5; i++) {
        const crack = mesh(G.lowSphere, lambert(0xff5522));
        crack.scale.set(0.05, 0.02, 0.05);
        crack.position.set((i % 2 ? 0.18 : -0.18), 0.5 + (i % 3) * 0.05, -0.2 + i * 0.12);
        root.add(crack);
      }
    },
  },

  frost_dragon: {
    base: 'dragon', scale: 1.55, color: 0x9fd6ff,
    optionsFn() { return { bodyR: 0.32, standY: 0.6 }; },
    // ICE: shard ridge of pale-blue cones + frost rime patches + frozen breath.
    decorate(root, parts, o, tint, API) {
      const { mesh, lambert, G } = API;
      const ice = lambert(0xbfe6ff);
      // jagged ice shards instead of a soft spine
      const tail = parts.tail;
      for (let i = 0; i < 7; i++) {
        const sh = mesh(G.cone, ice);
        const sc = 0.14 - i * 0.012;
        sh.scale.set(0.03, sc, 0.03);
        sh.position.set(0, 0.6 + Math.sin(i) * 0.04, -0.2 + i * 0.12);
        root.add(sh);
      }
      // shoulder ice spikes
      for (const s of [-1, 1]) {
        for (let i = 0; i < 2; i++) {
          const sp = mesh(G.cone, ice);
          sp.scale.set(0.03, 0.14, 0.03);
          sp.position.set(s * (0.24 + i * 0.04), 0.62, -0.1 + i * 0.08);
          sp.rotation.z = -s * 0.5;
          root.add(sp);
        }
      }
      // frozen breath puff at the maw
      const breath = mesh(G.lowSphere, lambert(0xe8f6ff));
      breath.scale.setScalar(0.09);
      breath.position.set(0, 0, 0.3);
      parts.head.add(breath);
    },
  },

  dragon_lord: {
    base: 'dragon', scale: 1.95, color: 0x991111,
    optionsFn() { return { bodyR: 0.4, standY: 0.72 }; },
    // BOSS: huge crimson, big horn crown + spine + fire glow at the maw.
    decorate(root, parts, o, tint, API) {
      addDorsalSpine(root, parts, tint, API, 0.85);
      const { mesh, lambert, shade, G } = API;
      // a crown of extra horns
      for (const s of [-1, 1]) {
        for (let i = 0; i < 2; i++) {
          const horn = mesh(G.cone, lambert(shade(tint, 0.45)));
          horn.scale.set(0.04, 0.22, 0.04);
          horn.position.set(s * (0.12 + i * 0.06), 0.55, -0.35 - i * 0.06);
          horn.rotation.x = -0.5;
          horn.rotation.z = -s * (0.2 + i * 0.2);
          parts.head.add(horn);
        }
      }
      // fire glow in the mouth
      const fire = mesh(G.cone, lambert(0xff8833));
      fire.scale.set(0.1, 0.18, 0.1);
      fire.position.set(0, -0.02, 0.34);
      fire.rotation.x = Math.PI / 2;
      parts.head.add(fire);
    },
  },

  undead_dragon: {
    base: 'dragon', scale: 1.8, color: 0x7a8470,
    optionsFn() { return { bodyR: 0.36, standY: 0.66 }; },
    // BOSS: skeletal — exposed rib arcs, tattered wing gaps, sickly glow eyes.
    decorate(root, parts, o, tint, API) {
      const { mesh, lambert, shade, G } = API;
      const bone = lambert(0xd8d2bc);
      // exposed ribs along the trunk
      for (let i = 0; i < 5; i++) {
        const rib = mesh(G.torus, bone);
        rib.scale.set(0.3 - i * 0.02, 0.18, 0.03);
        rib.rotation.y = Math.PI / 2;
        rib.position.set(0, 0.6, -0.25 + i * 0.14);
        root.add(rib);
      }
      // spine of bone shards
      for (let i = 0; i < 6; i++) {
        const sp = mesh(G.cone, bone);
        sp.scale.set(0.025, 0.12, 0.025);
        sp.position.set(0, 0.78, -0.25 + i * 0.13);
        root.add(sp);
      }
      // glowing necrotic eyes
      for (const s of [-1, 1]) {
        const eye = mesh(G.lowSphere, lambert(0x88ff66));
        eye.scale.setScalar(0.04);
        eye.position.set(s * 0.12, 0.32, 0.42);
        parts.head.add(eye);
      }
    },
  },

  wyvern: {
    base: 'dragon', scale: 1.3, color: 0x66aa44,
    optionsFn() { return { bodyR: 0.24, standY: 0.5 }; },
    // Leaner flying dragon: longer tail with a poison barb, smaller body.
    decorate(root, parts, o, tint, API) {
      const { mesh, lambert, shade, G } = API;
      const barb = mesh(G.cone, lambert(shade(tint, 0.5)));
      barb.scale.set(0.05, 0.2, 0.05);
      barb.position.set(0, 0, -0.7);
      barb.rotation.x = -2.2;
      parts.tail.add(barb);
      // poison drip
      const drip = mesh(G.lowSphere, lambert(0x99ee44));
      drip.scale.setScalar(0.03);
      drip.position.set(0, -0.1, -0.78);
      parts.tail.add(drip);
    },
  },

  // ===================== LEGACY SPELLCASTERS (big staff) =====================
  mage: {
    base: 'humanoid', scale: 1.05, color: 0x4455aa,
    optionsFn() { return { height: 1.0, girth: 0.9, hood: true, weapon: 'staff', weaponOpts: { orb: 0x66ccff, scale: 1.4 } }; },
    // Long robe skirt + a tall staff (the giveWeapon staff, enlarged).
    decorate(root, parts, o, tint, API) {
      const { mesh, lambert, shade, G } = API;
      const robe = lambert(shade(tint, 0.7));
      const skirt = mesh(G.cone, robe);
      skirt.scale.set(0.26, 0.5, 0.22);
      skirt.position.y = 0.26;
      root.add(skirt);
      for (const leg of parts.legs) leg.visible = false;
    },
  },

  cultist: {
    base: 'humanoid', scale: 1.0, color: 0x553366,
    optionsFn() { return { height: 1.0, girth: 0.95, hood: true, weapon: 'staff', weaponOpts: { orb: 0xaa55cc, scale: 1.2 } }; },
    decorate(root, parts, o, tint, API) {
      const { mesh, lambert, shade, G } = API;
      const robe = lambert(shade(tint, 0.7));
      const skirt = mesh(G.cone, robe);
      skirt.scale.set(0.25, 0.46, 0.21);
      skirt.position.y = 0.24;
      root.add(skirt);
      for (const leg of parts.legs) leg.visible = false;
    },
  },
};

// Shared helper: a ridge of cones running down a dragon's back (dorsal spine).
function addDorsalSpine(root, parts, tint, API, mag) {
  const { mesh, lambert, shade, G } = API;
  const m = lambert(shade(tint, 0.55));
  for (let i = 0; i < 7; i++) {
    const sp = mesh(G.cone, m);
    const sc = (0.1 + Math.sin((i / 6) * Math.PI) * 0.06) * mag * 2;
    sp.scale.set(0.025 * mag * 2, sc, 0.025 * mag * 2);
    sp.position.set(0, 0.6 + Math.sin((i / 6) * Math.PI) * 0.05, -0.25 + i * 0.13);
    root.add(sp);
  }
}

registerDesigns(DESIGNS);
export default DESIGNS;
