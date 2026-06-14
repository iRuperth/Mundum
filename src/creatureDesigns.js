// AUTO-GENERATED creature designs (Tibia 7.4 overhaul).
import { registerDesigns } from "./creatureModels.js";

const DESIGNS = {
  rabbit: {
    base: "quadruped",
    scale: 0.55,
    color: 13616304,
    optionsFn(API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      return { height: 0.6, len: 0.34, bodyR: 0.12, legLen: 0.14, snout: true };
    },
    decorate(root, parts, o, tint, API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      const r = o.bodyR || 0.12;
      const head = parts.head;
      // long upright ears (capsules) with a lighter inner channel
      for (const s of [-1, 1]) {
        const ear = mesh(G.capsule, lambert(tint));
        ear.scale.set(r * 0.18, r * 1.1, r * 0.1);
        ear.position.set(s * r * 0.3, r * 1.2, -r * 0.1);
        ear.rotation.z = s * 0.18;
        head.add(ear);
        const inner = mesh(G.capsule, lambert(shade(tint, 1.4)));
        inner.scale.set(r * 0.1, r * 0.85, r * 0.06);
        inner.position.set(s * r * 0.3, r * 1.2, -r * 0.02);
        inner.rotation.z = s * 0.18;
        head.add(inner);
      }
      // little pink nose
      const nose = mesh(G.lowSphere, lambert(0xdd8899));
      nose.scale.setScalar(r * 0.12);
      nose.position.set(0, r * 0.15, r * 0.75);
      head.add(nose);
      // big round fluffy cotton tail
      const tail = mesh(G.sphere, lambert(shade(tint, 1.5)));
      tail.scale.setScalar(r * 0.55);
      const bodyY = (o.legLen || 0.14) + r * 0.6;
      tail.position.set(0, bodyY, -(o.len || 0.34) * 0.45 - r * 0.4);
      root.add(tail);
    },
  },
  cow: {
    base: "quadruped",
    scale: 1.35,
    color: 15921640,
    optionsFn(API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      return { height: 1.1, len: 0.6, bodyR: 0.26, legLen: 0.32, snout: true, tail: true };
    },
    decorate(root, parts, o, tint, API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      const r = o.bodyR || 0.26;
      const head = parts.head;
      // wide curved cattle horns
      for (const s of [-1, 1]) {
        const horn = mesh(G.cone, lambert(0xe8e0cc));
        horn.scale.set(r * 0.12, r * 0.45, r * 0.12);
        horn.position.set(s * r * 0.5, r * 0.7, -r * 0.05);
        horn.rotation.z = -s * 1.1;
        head.add(horn);
      }
      // floppy sideways ears
      for (const s of [-1, 1]) {
        const ear = mesh(G.sphere, lambert(tint));
        ear.scale.set(r * 0.22, r * 0.12, r * 0.28);
        ear.position.set(s * r * 0.7, r * 0.45, 0);
        head.add(ear);
      }
      // big pink muzzle
      const muzzle = mesh(G.sphere, lambert(0xddaa99));
      muzzle.scale.set(r * 0.4, r * 0.3, r * 0.3);
      muzzle.position.set(0, -r * 0.05, r * 0.75);
      head.add(muzzle);
      // dark blotchy hide spots over the barrel
      addSpots(root, r, tint, 7, 0.35);
      // pink udder under the belly
      const udder = mesh(G.sphere, lambert(0xddaa99));
      const bodyY = (o.legLen || 0.32) + r * 0.6;
      udder.scale.set(r * 0.35, r * 0.3, r * 0.35);
      udder.position.set(0, bodyY - r * 0.7, -(o.len || 0.6) * 0.2);
      root.add(udder);
    },
  },
  squirrel: {
    base: "quadruped",
    scale: 0.45,
    color: 11102767,
    optionsFn(API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      return { height: 0.6, len: 0.3, bodyR: 0.1, legLen: 0.14, snout: true };
    },
    decorate(root, parts, o, tint, API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      const r = o.bodyR || 0.1;
      const head = parts.head;
      // big tufted ears
      for (const s of [-1, 1]) {
        const ear = mesh(G.cone, lambert(tint));
        ear.scale.set(r * 0.2, r * 0.4, r * 0.15);
        ear.position.set(s * r * 0.45, r * 0.75, 0);
        head.add(ear);
      }
      // tiny dark nose
      const nose = mesh(G.lowSphere, lambert(0x332222));
      nose.scale.setScalar(r * 0.14);
      nose.position.set(0, r * 0.1, r * 0.8);
      head.add(nose);
      // huge bushy tail arcing up over the back (cluster of fluff spheres)
      const tailMat = lambert(shade(tint, 1.15));
      const len = o.len || 0.3;
      const bodyY = (o.legLen || 0.14) + r * 0.6;
      for (let i = 0; i < 4; i++) {
        const puff = mesh(G.sphere, tailMat);
        const sr = r * (0.7 - i * 0.06);
        puff.scale.setScalar(sr);
        puff.position.set(0, bodyY + i * r * 0.7, -len * 0.5 - r * 0.2 + i * r * 0.15);
        root.add(puff);
      }
    },
  },
  pigeon: {
    base: "bird",
    scale: 0.5,
    color: 9080986,
    optionsFn(API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      return { combColor: 0x666666 };
    },
    decorate(root, parts, o, tint, API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      const r = 0.16;
      const legY = 0.18;
      // iridescent green neck ring
      const ring = mesh(G.torus, lambert(0x6a8f7a));
      ring.scale.set(r * 0.55, r * 0.55, r * 0.4);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(0, legY + r * 1.5, r * 0.2);
      root.add(ring);
      // folded wing bumps on the sides
      for (const s of [-1, 1]) {
        const wing = mesh(G.sphere, lambert(shade(tint, 0.85)));
        wing.scale.set(r * 0.3, r * 0.55, r * 0.85);
        wing.position.set(s * r * 0.85, legY + r, -r * 0.1);
        root.add(wing);
      }
      // fan tail sticking out the back
      const tail = mesh(G.sphere, lambert(shade(tint, 0.8)));
      tail.scale.set(r * 0.7, r * 0.12, r * 0.7);
      tail.rotation.x = -0.5;
      tail.position.set(0, legY + r * 0.8, -r * 1.1);
      root.add(tail);
    },
  },
  seagull: {
    base: "bird",
    scale: 0.6,
    color: 16185074,
    optionsFn(API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      return { combColor: 0xddaa33 };
    },
    decorate(root, parts, o, tint, API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      const r = 0.16;
      const legY = 0.18;
      const grey = lambert(0x9aa2aa);
      // grey folded wings over a white body, with black wingtips
      for (const s of [-1, 1]) {
        const wing = mesh(G.sphere, grey);
        wing.scale.set(r * 0.32, r * 0.5, r * 0.95);
        wing.position.set(s * r * 0.85, legY + r * 1.05, -r * 0.1);
        root.add(wing);
        const tip = mesh(G.sphere, lambert(0x222222));
        tip.scale.set(r * 0.18, r * 0.18, r * 0.3);
        tip.position.set(s * r * 0.85, legY + r * 0.8, -r * 0.85);
        root.add(tip);
      }
      // grey cap over the crown, leaving a white face
      const cap = mesh(G.dome, grey);
      cap.scale.setScalar(r * 0.5);
      cap.position.set(0, legY + r * 1.95, r * 0.3);
      root.add(cap);
      // pointed swept-back tail
      const tail = mesh(G.cone, grey);
      tail.scale.set(r * 0.4, r * 0.5, r * 0.15);
      tail.rotation.x = -1.4;
      tail.position.set(0, legY + r * 0.9, -r * 1.1);
      root.add(tail);
    },
  },
  chicken: {
    base: "bird",
    scale: 0.6,
    color: 15259568,
    optionsFn(API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      return { combColor: 0xcc3322 };
    },
    decorate(root, parts, o, tint, API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      const r = 0.16;
      const legY = 0.18;
      // red wattle dangling under the beak
      const wattle = mesh(G.sphere, lambert(0xcc3322));
      wattle.scale.set(r * 0.1, r * 0.18, r * 0.1);
      wattle.position.set(0, legY + r * 1.55, r * 0.6);
      root.add(wattle);
      // upright fan of tail feathers
      for (let i = 0; i < 3; i++) {
        const f = mesh(G.cone, lambert(shade(tint, 0.8)));
        f.scale.set(r * 0.12, r * 0.6, r * 0.06);
        f.position.set((i - 1) * r * 0.2, legY + r * 1.2, -r * 0.9);
        f.rotation.x = -1.2 - (i - 1) * 0.2;
        root.add(f);
      }
      // little folded wings
      for (const s of [-1, 1]) {
        const wing = mesh(G.sphere, lambert(shade(tint, 0.9)));
        wing.scale.set(r * 0.25, r * 0.45, r * 0.6);
        wing.position.set(s * r * 0.85, legY + r, 0);
        root.add(wing);
      }
    },
  },
  sheep: {
    base: "quadruped",
    scale: 0.75,
    color: 15657178,
    optionsFn(API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      return { height: 0.9, len: 0.42, bodyR: 0.2, legLen: 0.22, ears: true, legMat: lambert(0x33312e) };
    },
    decorate(root, parts, o, tint, API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      const r = o.bodyR || 0.2;
      const bodyY = (o.legLen || 0.22) + r * 0.6;
      const woolMat = lambert(shade(tint, 1.05));
      // dense cloud of wool puffs blanketing the barrel
      const positions = [[-0.5,0.3],[0.5,0.3],[-0.5,-0.3],[0.5,-0.3],[0,0.6],[0,-0.6],[0,0],[-0.6,0],[0.6,0]];
      for (const [px, pz] of positions) {
        const puff = mesh(G.sphere, woolMat);
        puff.scale.setScalar(r * 0.55);
        puff.position.set(px * r, bodyY + Math.abs(px) * r * 0.1, pz * (o.len || 0.42));
        root.add(puff);
      }
      // dark face peeking out of the wool
      const face = mesh(G.sphere, lambert(0x33312e));
      face.scale.set(r * 0.45, r * 0.5, r * 0.4);
      face.position.set(0, 0, r * 0.45);
      parts.head.add(face);
    },
  },
  deer: {
    base: "quadruped",
    scale: 1.05,
    color: 11565637,
    optionsFn(API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      return { height: 1.1, len: 0.5, bodyR: 0.15, legLen: 0.38, ears: true, tail: true };
    },
    decorate(root, parts, o, tint, API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      const r = o.bodyR || 0.15;
      const head = parts.head;
      // branching antlers: a main beam plus two upward forked tines per side
      for (const s of [-1, 1]) {
        const beam = mesh(G.cone, lambert(0x8a6a3a));
        beam.scale.set(r * 0.1, r * 1.3, r * 0.1);
        beam.position.set(s * r * 0.4, r * 1.1, -r * 0.1);
        beam.rotation.z = -s * 0.35;
        head.add(beam);
        for (let i = 0; i < 2; i++) {
          const tine = mesh(G.cone, lambert(0x8a6a3a));
          tine.scale.set(r * 0.07, r * 0.5, r * 0.07);
          tine.position.set(s * (r * 0.55 + i * r * 0.2), r * (1.3 + i * 0.35), -r * 0.1);
          tine.rotation.z = -s * 0.9;
          head.add(tine);
        }
      }
      // white dappled spots on the back (fawn look)
      addSpots(root, r, 0xffffff, 5, 1.6);
      // white throat patch
      const throat = mesh(G.sphere, lambert(shade(tint, 1.5)));
      throat.scale.set(r * 0.4, r * 0.4, r * 0.3);
      throat.position.set(0, -r * 0.2, r * 0.5);
      head.add(throat);
    },
  },
  boar: {
    base: "quadruped",
    scale: 1.05,
    color: 5916214,
    optionsFn(API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      return { height: 1, len: 0.5, bodyR: 0.2, legLen: 0.24, snout: true, tail: true };
    },
    decorate(root, parts, o, tint, API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      const r = o.bodyR || 0.2;
      const head = parts.head;
      // large upturned tusks jutting from the snout
      for (const s of [-1, 1]) {
        const tusk = mesh(G.cone, lambert(0xeae0cc));
        tusk.scale.set(r * 0.08, r * 0.4, r * 0.08);
        tusk.position.set(s * r * 0.35, -r * 0.05, r * 0.6);
        tusk.rotation.x = -2.4;
        tusk.rotation.z = s * 0.2;
        head.add(tusk);
      }
      // bristly mane ridge down the spine
      addMane(root, r * 1.1, shade(tint, 0.6), 6);
      // dark snout disc on the nose
      const snoutDisc = mesh(G.lowSphere, lambert(shade(tint, 0.5)));
      snoutDisc.scale.set(r * 0.3, r * 0.3, r * 0.1);
      snoutDisc.position.set(0, -r * 0.1, r * 0.85);
      head.add(snoutDisc);
    },
  },
  wolf: {
    base: "quadruped",
    scale: 0.95,
    color: 9080726,
    optionsFn(API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      return { height: 1, len: 0.55, bodyR: 0.16, legLen: 0.3, ears: true };
    },
    decorate(root, parts, o, tint, API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      const r = o.bodyR || 0.16;
      const head = parts.head;
      // shaggy neck ruff / mane
      addFur(head, r * 1.1, shade(tint, 0.8), 2, 8, 0.8);
      // long pointed snout
      const snout = mesh(G.capsule, lambert(tint));
      snout.rotation.x = Math.PI / 2;
      snout.scale.set(r * 0.32, r * 0.4, r * 0.32);
      snout.position.set(0, -r * 0.1, r * 0.75);
      head.add(snout);
      // black nose tip
      const nose = mesh(G.lowSphere, lambert(0x1a1a1a));
      nose.scale.setScalar(r * 0.16);
      nose.position.set(0, -r * 0.05, r * 1.0);
      head.add(nose);
      // bushy down-hanging tail
      const len = o.len || 0.55;
      const bodyY = (o.legLen || 0.3) + r * 0.6;
      const tail = mesh(G.capsule, lambert(shade(tint, 0.9)));
      tail.scale.set(r * 0.5, r * 0.7, r * 0.5);
      tail.rotation.x = 1.1;
      tail.position.set(0, bodyY - r * 0.1, -len * 0.5 - r * 0.4);
      root.add(tail);
    },
  },
  bear: {
    base: "quadruped",
    scale: 1.55,
    color: 7035439,
    optionsFn(API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      return { height: 1.1, len: 0.55, bodyR: 0.24, legLen: 0.3, snout: true };
    },
    decorate(root, parts, o, tint, API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      const r = o.bodyR || 0.24;
      const head = parts.head;
      // big shaggy body fur all over the barrel
      addFur(root, r * 1.15, shade(tint, 0.85), 3, 10, 0.85);
      // small round ears
      for (const s of [-1, 1]) {
        const ear = mesh(G.sphere, lambert(tint));
        ear.scale.setScalar(r * 0.22);
        ear.position.set(s * r * 0.5, r * 0.7, 0);
        head.add(ear);
      }
      // tan muzzle and black nose
      const muzzle = mesh(G.capsule, lambert(shade(tint, 1.25)));
      muzzle.rotation.x = Math.PI / 2;
      muzzle.scale.set(r * 0.3, r * 0.35, r * 0.3);
      muzzle.position.set(0, -r * 0.1, r * 0.7);
      head.add(muzzle);
      const nose = mesh(G.lowSphere, lambert(0x1a1a1a));
      nose.scale.setScalar(r * 0.16);
      nose.position.set(0, -r * 0.02, r * 0.95);
      head.add(nose);
      // big claws on every paw
      for (const l of parts.legs) addClaws(l.pivot, -(o.legLen || 0.3) + 0.02, r * 0.3, 0.02, r * 0.18, 3);
    },
  },
  orc: {
    base: "humanoid",
    scale: 1,
    color: 5275194,
    optionsFn(API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      return { height: 1.05, girth: 1.25, tusks: true, ears: true, spots: true, spotFactor: 0.65, spotCount: 5, claws: true, shoulders: true, armorColor: 0x4a3522, belly: true, bellyColor: 0x6f8a4a, weapon: 'axe', maneColor: 0x222018, hornColor: 0xf0ece0 };
    },
    decorate(root, parts, o, tint, API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      // Hunched brute jaw + leather chest strap. Underbite jaw juts the lower face
      // forward so the silhouette reads thug, not generic green man.
      const hs = 0.2 * (o.headScale || 1);
      const jaw = mesh(G.sphere, lambert(shade(tint, 0.95)));
      jaw.scale.set(hs * 0.7, hs * 0.42, hs * 0.6);
      jaw.position.set(0, -hs * 0.55, hs * 0.55);
      parts.head.add(jaw);
      // brow ridge
      const brow = mesh(G.sphere, lambert(shade(tint, 0.7)));
      brow.scale.set(hs * 0.85, hs * 0.22, hs * 0.4);
      brow.position.set(0, hs * 0.45, hs * 0.7);
      parts.head.add(brow);
      // diagonal leather strap across the torso
      const strap = mesh(G.cyl, lambert(0x4a3522));
      strap.scale.set(0.018, 0.2, 0.05);
      strap.rotation.z = 0.6;
      strap.position.set(0, (parts.baseY || 0.65), 0.21);
      root.add(strap);
    },
  },
  orc_warrior: {
    base: "humanoid",
    scale: 1,
    color: 5929530,
    optionsFn(API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      return { height: 1.12, girth: 1.2, tusks: true, ears: true, claws: true, shoulders: true, armorColor: 0x6a6f78, belly: true, bellyColor: 0x5a6a3a, weapon: 'sword', weaponCurve: true, weaponOpts: { mat: undefined } };
    },
    decorate(root, parts, o, tint, API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      // Studded iron pauldron rivets + a banded skirt of leather tassets, marking the
      // disciplined warrior over the wild grunt. Curved sabre supplied by weaponCurve.
      const by = parts.baseY || 0.72;
      const torsoR = 0.24 * (o.girth || 1);
      // rivets on each shoulder pad
      for (const s of [-1, 1]) {
        for (let i = 0; i < 3; i++) {
          const a = -0.5 + i * 0.5;
          const rivet = mesh(G.lowSphere, lambert(0xc8ccd2));
          rivet.scale.setScalar(0.012);
          rivet.position.set(s * (torsoR + 0.04), by + torsoR * 0.5, Math.sin(a) * torsoR * 0.4);
          root.add(rivet);
        }
      }
      // banded waist tassets
      const beltMat = lambert(0x4a3522);
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        const tas = mesh(G.sphere, beltMat);
        tas.scale.set(0.035, 0.06, 0.02);
        tas.position.set(Math.cos(a) * torsoR * 0.9, by - 0.18, Math.sin(a) * torsoR * 0.7 + 0.02);
        root.add(tas);
      }
    },
  },
  orc_spearman: {
    base: "humanoid",
    scale: 1,
    color: 8035418,
    optionsFn(API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      return { height: 1.15, girth: 0.95, tusks: true, ears: true, claws: true, weapon: 'spear', maneColor: 0x2a2418 };
    },
    decorate(root, parts, o, tint, API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      // Lean skirmisher: a small round buckler strapped to the off (left) arm and a
      // feather plume topknot so it reads taller and lighter than the bruisers.
      const by = parts.baseY || 0.72;
      // buckler on the LEFT arm pivot (arms[0])
      if (parts.arms[0]) {
        const buck = mesh(G.dome, lambert(0x5a4a30));
        buck.scale.set(0.1, 0.05, 0.1);
        buck.rotation.x = Math.PI / 2;
        buck.position.set(0, -0.14, 0.08);
        parts.arms[0].add(buck);
        const boss = mesh(G.lowSphere, lambert(0x8a8f96));
        boss.scale.setScalar(0.025);
        boss.position.set(0, -0.14, 0.13);
        parts.arms[0].add(boss);
      }
      // topknot bound plume on the head
      const hs = 0.2 * (o.headScale || 1);
      const band = mesh(G.cyl, lambert(0x4a3522));
      band.scale.set(hs * 0.5, hs * 0.12, hs * 0.5);
      band.position.y = hs * 0.95;
      parts.head.add(band);
      const plume = mesh(G.cone, lambert(0xb03030));
      plume.scale.set(hs * 0.18, hs * 0.6, hs * 0.18);
      plume.position.y = hs * 1.4;
      plume.rotation.x = -0.2;
      parts.head.add(plume);
    },
  },
  orc_berserker: {
    base: "humanoid",
    scale: 1,
    color: 4877354,
    optionsFn(API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      return { height: 1.35, girth: 1.55, tusks: true, ears: true, spots: true, spotFactor: 1.4, spotCount: 9, claws: true, belly: true, bellyColor: 0x4a6a2a, weapon: 'battleaxe', mane: true, maneColor: 0x1a160e, maneCount: 7 };
    },
    decorate(root, parts, o, tint, API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      // Hulking shirtless rager: pale battle SCARS (light spots already), bulging
      // shoulder muscles and a war-paint chevron across the face. Two-hand battleaxe.
      const by = parts.baseY || 0.85;
      const torsoR = 0.24 * (o.girth || 1);
      const h = o.height || 1.35;
      // huge deltoid bulges on each shoulder
      for (const s of [-1, 1]) {
        const delt = mesh(G.sphere, lambert(tint));
        delt.scale.set(torsoR * 0.5, torsoR * 0.5, torsoR * 0.5);
        delt.position.set(s * (torsoR + 0.02), by + 0.13 * h, 0);
        root.add(delt);
      }
      // red war-paint chevron under the eyes
      const hs = 0.2 * (o.headScale || 1);
      for (const s of [-1, 1]) {
        const paint = mesh(G.sphere, lambert(0xaa2020));
        paint.scale.set(hs * 0.5, hs * 0.08, hs * 0.06);
        paint.position.set(s * hs * 0.25, -hs * 0.1, hs * 0.92);
        paint.rotation.z = s * 0.5;
        parts.head.add(paint);
      }
      // jagged lower tusks scaled up
      for (const s of [-1, 1]) {
        const t = mesh(G.cone, lambert(0xf0ece0));
        t.scale.set(0.028, 0.1, 0.028);
        t.position.set(s * hs * 0.45, -hs * 0.5, hs * 0.7);
        t.rotation.x = Math.PI;
        t.rotation.z = s * 0.2;
        parts.head.add(t);
      }
    },
  },
  orc_shaman: {
    base: "humanoid",
    scale: 1,
    color: 5929066,
    optionsFn(API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      return { height: 1.1, girth: 1.05, tusks: true, ears: true, hood: true, hoodColor: 0x3a4a30, weapon: 'staff', weaponOpts: { orb: 0x7fe66a } };
    },
    decorate(root, parts, o, tint, API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      // Robed mystic: a draping cloak skirt hides the legs, bone fetishes hang at the
      // belt, and glowing tattoo dots crawl up the arms. Staff with a green orb.
      const by = parts.baseY || 0.7;
      const torsoR = 0.24 * (o.girth || 1);
      const robeMat = lambert(0x3a4a30);
      // conical robe skirt from the waist to the floor
      const robe = mesh(G.cone, robeMat);
      robe.scale.set(torsoR * 1.5, by * 0.62, torsoR * 1.5);
      robe.position.y = by * 0.55;
      robe.rotation.x = Math.PI;
      // flip so wide end is at the bottom
      robe.position.y = by * 0.55;
      robe.scale.y = by * 0.62;
      robe.rotation.x = 0;
      robe.geometry = G.cone;
      const robe2 = mesh(G.cone, robeMat);
      robe2.scale.set(torsoR * 1.6, by * 0.6, torsoR * 1.6);
      robe2.rotation.x = Math.PI;
      robe2.position.y = by * 0.55;
      root.add(robe2);
      // hanging bone fetishes around the belt
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 1.2 - 0.6;
        const bone = mesh(G.capsule, lambert(0xe8e4d6));
        bone.scale.set(0.012, 0.04, 0.012);
        bone.position.set(Math.sin(a) * torsoR * 1.1, by * 0.78, Math.cos(a) * torsoR * 0.9 + 0.02);
        root.add(bone);
      }
      // glowing green tattoo dots up both arms
      for (const arm of parts.arms) {
        for (let i = 0; i < 3; i++) {
          const dot = mesh(G.lowSphere, lambert(0x9fff7a));
          dot.scale.setScalar(0.012);
          dot.position.set(0, -0.05 - i * 0.06, 0.06);
          arm.add(dot);
        }
      }
      // skull totem fixed atop the hood
      const hs = 0.2 * (o.headScale || 1);
      const totem = mesh(G.sphere, lambert(0xe8e4d6));
      totem.scale.set(hs * 0.4, hs * 0.42, hs * 0.4);
      totem.position.set(0, hs * 1.7, 0);
      parts.head.add(totem);
    },
  },
  orc_rider: {
    base: "humanoid",
    scale: 1.15,
    color: 6982730,
    optionsFn(API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      return { tint: 0x6a8a4a };
    },
    decorate(root, parts, o, tint, API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      // COMPOSITE: a wolf mount built under root, with a small orc rider seated on its
      // back brandishing a sabre. The wolf uses quad geometry inline; the orc is a
      // compact biped grafted on top. Animator is reused via parts.type='quad' (legs
      // trot, head bobs) and the rider is parented so it rides along.
      const wolfMat = lambert(0x55504a);
      const r = 0.18, len = 0.62, legLen = 0.34;
      const bodyY = legLen + r * 0.6;
      // wolf barrel
      const trunk = mesh(G.capsule, wolfMat);
      trunk.rotation.x = Math.PI / 2;
      trunk.scale.set(r, len * 0.5, r * 0.9);
      trunk.position.y = bodyY;
      root.add(trunk);
      // four wolf legs (wired into parts.legs so the quad animator trots them)
      const legX = r * 0.7, legZ = len * 0.42;
      for (const [sx, sz] of [[-1,1],[1,1],[-1,-1],[1,-1]]) {
        const pivot = new (trunk.constructor === Object ? Object : Object)();
      }
      parts.type = 'quad';
      parts.legs = [];
      for (const [sx, sz] of [[-1,1],[1,1],[-1,-1],[1,-1]]) {
        const pivot = new THREE.Group();
        pivot.position.set(sx * legX, bodyY - r * 0.4, sz * legZ);
        const leg = mesh(G.capsule, wolfMat);
        leg.scale.set(0.045, legLen * 0.45, 0.045);
        leg.position.y = -legLen * 0.5;
        pivot.add(leg);
        root.add(pivot);
        parts.legs.push({ pivot, dir: sz });
      }
      // wolf head + snout + ears at the front
      const whead = new THREE.Group();
      whead.position.set(0, bodyY + r * 0.4, legZ + r * 0.6);
      const wskull = mesh(G.sphere, wolfMat);
      wskull.scale.set(r * 0.6, r * 0.6, r * 0.7);
      whead.add(wskull);
      const snout = mesh(G.capsule, wolfMat);
      snout.rotation.x = Math.PI / 2;
      snout.scale.set(r * 0.3, r * 0.3, r * 0.4);
      snout.position.z = r * 0.55;
      whead.add(snout);
      addEyes(whead, r * 0.25, r * 0.55, r * 0.3, r * 0.15);
      for (const s of [-1, 1]) {
        const ear = mesh(G.cone, wolfMat);
        ear.scale.set(0.025, 0.07, 0.025);
        ear.position.set(s * r * 0.4, r * 0.7, 0);
        whead.add(ear);
      }
      root.add(whead);
      parts.head = whead;
      // wolf tail
      const tail = mesh(G.capsule, wolfMat);
      tail.scale.set(0.035, 0.13, 0.035);
      tail.rotation.x = 0.9;
      tail.position.set(0, bodyY + r * 0.25, -legZ - r * 0.35);
      root.add(tail);
      parts.tail = tail;
      // ---- ORC RIDER seated on the back ----
      const rider = new THREE.Group();
      rider.position.set(0, bodyY + r * 0.45, -len * 0.05);
      const skin = lambert(tint);
      // rider hips/torso
      const rtorso = mesh(G.capsule, skin);
      rtorso.scale.set(0.13, 0.16, 0.11);
      rtorso.position.y = 0.2;
      rider.add(rtorso);
      // straddling legs hang down each flank
      for (const s of [-1, 1]) {
        const rleg = mesh(G.capsule, skin);
        rleg.scale.set(0.05, 0.1, 0.05);
        rleg.rotation.x = 1.1;
        rleg.position.set(s * r * 0.7, 0.06, r * 0.1);
        rider.add(rleg);
      }
      // arms: left grips reins, right (weapon) raised
      const larm = new THREE.Group();
      larm.position.set(-0.13, 0.3, 0);
      const la = mesh(G.capsule, skin);
      la.scale.set(0.045, 0.1, 0.045);
      la.position.y = -0.1;
      la.rotation.x = -0.8;
      larm.add(la);
      rider.add(larm);
      const rarm = new THREE.Group();
      rarm.position.set(0.13, 0.3, 0);
      rarm.rotation.z = 0.12;
      const ra = mesh(G.capsule, skin);
      ra.scale.set(0.05, 0.1, 0.05);
      ra.position.y = -0.1;
      rarm.add(ra);
      rider.add(rarm);
      // rider head with tusks + helmet
      const rhead = new THREE.Group();
      rhead.position.y = 0.45;
      const rskull = mesh(G.sphere, skin);
      rskull.scale.setScalar(0.1);
      rhead.add(rskull);
      addEyes(rhead, 0.02, 0.095, 0.045, 0.03);
      for (const s of [-1, 1]) {
        const tu = mesh(G.cone, lambert(0xf0ece0));
        tu.scale.set(0.012, 0.035, 0.012);
        tu.position.set(s * 0.04, -0.04, 0.07);
        tu.rotation.x = Math.PI;
        rhead.add(tu);
        const ear = mesh(G.cone, skin);
        ear.scale.set(0.012, 0.04, 0.012);
        ear.position.set(s * 0.09, 0.04, 0);
        ear.rotation.z = -s * 0.6;
        rhead.add(ear);
      }
      const helm = mesh(G.dome, lambert(0x6a6f78));
      helm.scale.setScalar(0.11);
      helm.position.y = 0.02;
      rhead.add(helm);
      rider.add(rhead);
      root.add(rider);
      // give the raised right arm a sabre
      parts.arms = [larm, rarm];
      parts.handY = -0.2; parts.handR = 0.05; parts.armLen = 1;
      giveWeapon(parts, 'sword', { curve: true, handY: -0.2, handR: 0.05, rest: -0.9 });
      // restore parts.head to the wolf so the quad bite anim uses the mount's head
      parts.head = whead;
    },
  },
  orc_leader: {
    base: "humanoid",
    scale: 1,
    color: 4874810,
    optionsFn(API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      return { height: 1.3, girth: 1.4, tusks: true, ears: true, claws: true, shoulders: true, armorColor: 0x7a7f88, belly: true, bellyColor: 0x6a6f78, weapon: 'sword', weaponBig: true };
    },
    decorate(root, parts, o, tint, API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      // Armored captain in full plate: a breastplate slab, spiked pauldron crests and
      // a horned iron helm. Hefts a two-handed great sword (weaponBig).
      const by = parts.baseY || 0.85;
      const torsoR = 0.24 * (o.girth || 1);
      const plateMat = lambert(0x7a7f88);
      // breastplate slab over the chest
      const breast = mesh(G.sphere, plateMat);
      breast.scale.set(torsoR * 0.95, torsoR * 1.0, torsoR * 0.7);
      breast.position.set(0, by + 0.02, torsoR * 0.45);
      root.add(breast);
      // gold trim ridge down the center
      const ridge = mesh(G.cyl, lambert(0xd9b341));
      ridge.scale.set(0.012, torsoR * 0.8, 0.012);
      ridge.position.set(0, by, torsoR * 0.85);
      root.add(ridge);
      // spikes erupting from each pauldron
      for (const s of [-1, 1]) {
        for (let i = 0; i < 2; i++) {
          const sp = mesh(G.cone, lambert(0x9a9fa8));
          sp.scale.set(0.022, 0.07, 0.022);
          sp.position.set(s * (torsoR + 0.03), by + torsoR * 0.55 + i * 0.02, -0.03 + i * 0.04);
          sp.rotation.z = s * 0.4;
          sp.rotation.x = -0.3;
          root.add(sp);
        }
      }
      // horned iron helm
      const hs = 0.2 * (o.headScale || 1);
      const helm = mesh(G.dome, plateMat);
      helm.scale.set(hs * 1.25, hs * 1.3, hs * 1.25);
      helm.position.y = hs * 0.15;
      parts.head.add(helm);
      for (const s of [-1, 1]) {
        const horn = mesh(G.cone, lambert(0x4a4f56));
        horn.scale.set(0.025, 0.13, 0.025);
        horn.position.set(s * hs * 0.85, hs * 0.85, 0);
        horn.rotation.z = -s * 0.9;
        parts.head.add(horn);
      }
    },
  },
  orc_warlord: {
    base: "humanoid",
    scale: 1.25,
    color: 3824682,
    optionsFn(API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      return { height: 1.7, girth: 1.7, tusks: true, ears: true, spots: true, spotFactor: 0.6, spotCount: 6, claws: true, shoulders: true, armorColor: 0x8a8f98, belly: true, bellyColor: 0x5a6a3a, weapon: 'mace', weaponBig: true, weaponOpts: { spikes: true } };
    },
    decorate(root, parts, o, tint, API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      // BOSS: an eight-foot ornate tyrant. Towering spiked shoulder crests, a fanged
      // skull-mask helm, gold-trimmed plate gorget and a fur-trimmed cape. Carries a
      // huge spiked war-hammer (mace big + spikes). Make the silhouette unmistakable.
      const by = parts.baseY || 1.1;
      const torsoR = 0.24 * (o.girth || 1);
      const h = o.height || 1.7;
      const plate = lambert(0x8a8f98);
      const goldMat = lambert(0xd9b341);
      // massive curved horn-crests on each shoulder
      for (const s of [-1, 1]) {
        const crest = mesh(G.cone, lambert(0x4a4f56));
        crest.scale.set(0.05, 0.3, 0.05);
        crest.position.set(s * (torsoR + 0.08), by + torsoR * 0.6, -0.02);
        crest.rotation.z = s * 1.0;
        crest.rotation.x = -0.2;
        root.add(crest);
        // smaller secondary spikes
        const sp2 = mesh(G.cone, lambert(0x6a6f78));
        sp2.scale.set(0.03, 0.14, 0.03);
        sp2.position.set(s * (torsoR + 0.05), by + torsoR * 0.5, 0.05);
        sp2.rotation.z = s * 0.6;
        root.add(sp2);
      }
      // gold gorget collar
      const gorget = mesh(G.torus, goldMat);
      gorget.scale.set(torsoR * 0.7, torsoR * 0.7, torsoR * 0.5);
      gorget.rotation.x = Math.PI / 2;
      gorget.position.set(0, by + torsoR * 0.85, 0);
      root.add(gorget);
      // breastplate with gold rune boss
      const breast = mesh(G.sphere, plate);
      breast.scale.set(torsoR * 1.0, torsoR * 1.05, torsoR * 0.7);
      breast.position.set(0, by, torsoR * 0.45);
      root.add(breast);
      const boss = mesh(G.lowSphere, goldMat);
      boss.scale.setScalar(torsoR * 0.25);
      boss.position.set(0, by, torsoR * 0.95);
      root.add(boss);
      // dark fur-trimmed cape hanging off the back
      const cape = mesh(G.cone, lambert(0x2a2620));
      cape.scale.set(torsoR * 1.3, by * 0.7, torsoR * 0.5);
      cape.rotation.x = Math.PI;
      cape.position.set(0, by * 0.75, -torsoR * 0.7);
      root.add(cape);
      // fur collar at the cape top
      const hs = 0.2 * (o.headScale || 1);
      addFur(parts.head, hs * 0.9, 0x3a3026, 1, 8, 0.7);
      // fanged skull-mask helm with great horns
      const helm = mesh(G.dome, plate);
      helm.scale.set(hs * 1.3, hs * 1.4, hs * 1.3);
      helm.position.y = hs * 0.15;
      parts.head.add(helm);
      const maskJaw = mesh(G.sphere, lambert(0xe8e4d6));
      maskJaw.scale.set(hs * 0.55, hs * 0.35, hs * 0.4);
      maskJaw.position.set(0, -hs * 0.45, hs * 0.7);
      parts.head.add(maskJaw);
      for (let i = -2; i <= 2; i++) {
        const fang = mesh(G.cone, lambert(0xffffff));
        fang.scale.set(0.01, 0.04, 0.01);
        fang.position.set(i * hs * 0.18, -hs * 0.55, hs * 0.95);
        fang.rotation.x = Math.PI;
        parts.head.add(fang);
      }
      for (const s of [-1, 1]) {
        const horn = mesh(G.cone, lambert(0xd9b341));
        horn.scale.set(0.035, 0.22, 0.035);
        horn.position.set(s * hs * 0.9, hs * 0.95, -hs * 0.1);
        horn.rotation.z = -s * 1.1;
        parts.head.add(horn);
      }
    },
  },
  goblin: {
    base: "humanoid",
    scale: 0.85,
    color: 8961356,
    optionsFn(API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      return { height: 0.8, girth: 1.0, ears: true, headScale: 1.25, belly: true, bellyColor: 0x9fcf6a, claws: true, weapon: 'club' };
    },
    decorate(root, parts, o, tint, API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      // Classic potbelly goblin: a big round gut, a hooked nose and oversized droopy
      // ears overriding the small default ones. Whacks a wooden club.
      const hs = 0.2 * (o.headScale || 1);
      // big hooked nose
      const nose = mesh(G.cone, lambert(shade(tint, 1.1)));
      nose.scale.set(hs * 0.22, hs * 0.45, hs * 0.22);
      nose.rotation.x = Math.PI / 2 + 0.5;
      nose.position.set(0, -hs * 0.05, hs * 1.0);
      parts.head.add(nose);
      // extra-large droopy ears layered over the defaults
      for (const s of [-1, 1]) {
        const ear = mesh(G.cone, lambert(tint));
        ear.scale.set(0.025, 0.13, 0.02);
        ear.position.set(s * hs * 0.95, hs * 0.3, 0);
        ear.rotation.z = -s * 1.1;
        ear.rotation.x = 0.2;
        parts.head.add(ear);
      }
      // loincloth wrap at the waist
      const by = parts.baseY || 0.5;
      const cloth = mesh(G.sphere, lambert(0x7a5a30));
      cloth.scale.set(0.16, 0.09, 0.13);
      cloth.position.set(0, by - 0.16, 0.04);
      root.add(cloth);
    },
  },
  goblin_scavenger: {
    base: "humanoid",
    scale: 0.85,
    color: 7842901,
    optionsFn(API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      return { height: 0.78, girth: 0.95, ears: true, headScale: 1.2, claws: true, weapon: 'sword' };
    },
    decorate(root, parts, o, tint, API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      // Scrappy looter in a dented pot-helmet, a junk shoulder pad of scrap and a
      // loot satchel slung across the back. Jabs a crude dagger (small sword).
      const hs = 0.2 * (o.headScale || 1);
      const by = parts.baseY || 0.5;
      const torsoR = 0.24 * (o.girth || 1);
      // dented metal pot-helm with a brim
      const helm = mesh(G.dome, lambert(0x8a8f78));
      helm.scale.set(hs * 1.15, hs * 1.1, hs * 1.15);
      helm.position.y = hs * 0.2;
      parts.head.add(helm);
      const brim = mesh(G.torus, lambert(0x6a6f5a));
      brim.scale.set(hs * 0.9, hs * 0.9, hs * 0.3);
      brim.rotation.x = Math.PI / 2;
      brim.position.y = hs * 0.2;
      parts.head.add(brim);
      // scrap-metal pad on the right shoulder only
      const pad = mesh(G.lowSphere, lambert(0x9a8f6a));
      pad.scale.set(torsoR * 0.5, torsoR * 0.35, torsoR * 0.5);
      pad.position.set(torsoR + 0.02, by + torsoR * 0.5, 0);
      root.add(pad);
      // loot satchel on the back
      const bag = mesh(G.sphere, lambert(0x6a4a2a));
      bag.scale.set(torsoR * 0.55, torsoR * 0.6, torsoR * 0.4);
      bag.position.set(-0.06, by, -torsoR * 0.7);
      root.add(bag);
      const strap = mesh(G.cyl, lambert(0x4a3522));
      strap.scale.set(0.012, 0.18, 0.04);
      strap.rotation.z = 0.5;
      strap.position.set(0, by + 0.02, 0);
      root.add(strap);
    },
  },
  goblin_assassin: {
    base: "humanoid",
    scale: 0.85,
    color: 4750405,
    optionsFn(API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      return { height: 0.85, girth: 0.75, ears: true, headScale: 1.1, hood: true, hoodColor: 0x222630, claws: true, weapon: 'sword' };
    },
    decorate(root, parts, o, tint, API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      // Lean killer: a hooded cowl shadowing the face, a face-wrap mask and a SECOND
      // dagger in the off (left) hand for dual-wielding. Crouched, slender build.
      const hs = 0.2 * (o.headScale || 1);
      // dark face-wrap covering the lower face under the hood
      const mask = mesh(G.sphere, lambert(0x161a22));
      mask.scale.set(hs * 0.65, hs * 0.45, hs * 0.5);
      mask.position.set(0, -hs * 0.25, hs * 0.6);
      parts.head.add(mask);
      // glinting narrowed eyes (small bright slits over the mask)
      for (const s of [-1, 1]) {
        const glint = mesh(G.lowSphere, lambert(0xc9f54a));
        glint.scale.set(hs * 0.12, hs * 0.05, hs * 0.05);
        glint.position.set(s * hs * 0.28, hs * 0.05, hs * 0.92);
        parts.head.add(glint);
      }
      // second dagger in the LEFT hand (arms[0]) — point-down reverse grip
      if (parts.arms[0]) {
        const dg = new THREE.Group();
        dg.position.set(-0.05, parts.handY || -0.2, 0.05);
        const blade = mesh(G.cone, lambert(0xb8c0cc));
        blade.scale.set(0.02, 0.13, 0.012);
        blade.rotation.x = Math.PI;
        blade.position.y = -0.08;
        dg.add(blade);
        const grip = mesh(G.cyl, lambert(0x3a3a3a));
        grip.scale.set(0.014, 0.03, 0.014);
        dg.add(grip);
        parts.arms[0].add(dg);
      }
    },
  },
  goblin_leader: {
    base: "humanoid",
    scale: 0.95,
    color: 6732612,
    optionsFn(API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      return { height: 1.0, girth: 1.2, ears: true, headScale: 1.25, belly: true, bellyColor: 0x8fbf5a, claws: true, weapon: 'club', weaponOpts: { spikes: false } };
    },
    decorate(root, parts, o, tint, API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      // BOSS: a bigger potbellied chief clad in bone armor — a ribcage breastplate of
      // curved bones, skull pauldrons and a jagged bone crown. Studded bone club.
      const hs = 0.2 * (o.headScale || 1);
      const by = parts.baseY || 0.62;
      const torsoR = 0.24 * (o.girth || 1);
      const boneMat = lambert(0xe4ddc8);
      // curved rib bones arcing across the chest
      for (let i = 0; i < 4; i++) {
        const ya = by - 0.06 + i * 0.05;
        const rib = mesh(G.torus, boneMat);
        rib.scale.set(torsoR * (0.7 - i * 0.05), torsoR * 0.18, 0.02);
        rib.rotation.x = Math.PI / 2;
        rib.position.set(0, ya, torsoR * 0.55);
        root.add(rib);
      }
      // skull pauldrons on both shoulders
      for (const s of [-1, 1]) {
        const skull = mesh(G.sphere, boneMat);
        skull.scale.set(torsoR * 0.45, torsoR * 0.48, torsoR * 0.5);
        skull.position.set(s * (torsoR + 0.04), by + torsoR * 0.55, 0.02);
        root.add(skull);
        // eye sockets
        for (const e of [-1, 1]) {
          const sock = mesh(G.lowSphere, lambert(0x1a1a1a));
          sock.scale.setScalar(torsoR * 0.1);
          sock.position.set(s * (torsoR + 0.04) + e * torsoR * 0.15, by + torsoR * 0.58, 0.02 + torsoR * 0.4);
          root.add(sock);
        }
      }
      // jagged bone crown ringing the head
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const spike = mesh(G.cone, boneMat);
        spike.scale.set(0.018, 0.07 + (i % 2) * 0.03, 0.018);
        spike.position.set(Math.cos(a) * hs * 0.85, hs * 0.85, Math.sin(a) * hs * 0.85);
        spike.rotation.z = -Math.cos(a) * 0.3;
        spike.rotation.x = Math.sin(a) * 0.3;
        parts.head.add(spike);
      }
      // hooked chief nose
      const nose = mesh(G.cone, lambert(shade(tint, 1.1)));
      nose.scale.set(hs * 0.24, hs * 0.5, hs * 0.24);
      nose.rotation.x = Math.PI / 2 + 0.5;
      nose.position.set(0, -hs * 0.05, hs * 1.0);
      parts.head.add(nose);
    },
  },
  troll: {
    base: "humanoid",
    scale: 1,
    color: 7372637,
    optionsFn(API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      return { height: 1.3, girth: 1.45, ears: true, headScale: 1.15, tusks: true, spots: true, spotFactor: 0.7, spotCount: 7, belly: true, claws: true, weapon: 'club' };
    },
    decorate(root, parts, o, tint, API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      // Hunched brute: pull the head down-and-forward and round the back into a hump.
      if (parts.head) { parts.head.position.y -= 0.18 * (o.height||1.3); parts.head.position.z += 0.14; parts.head.rotation.x = 0.25; }
      const hb = parts.baseY || 0.7;
      const hump = mesh(G.sphere, lambert(shade(tint, 0.85)));
      hump.scale.set(0.22, 0.18, 0.2);
      hump.position.set(0, hb + 0.16, -0.16);
      root.add(hump);
      // long dangling forearms (extra capsule under each hand) to read as ape-armed.
      for (const arm of parts.arms) { addClaws(arm, -0.3 * (o.height||1.3), 0.03, 0.02, 0.035, 3); }
      // a few warts (small bumps) on the shoulders.
      for (const s of [-1,1]) { const wart = mesh(G.lowSphere, lambert(shade(tint,0.6))); wart.scale.setScalar(0.04); wart.position.set(s*0.18, hb+0.22, -0.02); root.add(wart); }
    },
  },
  frost_troll: {
    base: "humanoid",
    scale: 1,
    color: 11393254,
    optionsFn(API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      return { height: 1.32, girth: 1.4, ears: true, headScale: 1.1, tusks: true, belly: true, bellyColor: 0xdfeefc, claws: true, weapon: 'club', weaponOpts: { mat: undefined } };
    },
    decorate(root, parts, o, tint, API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      // Hunched like a troll but blue-white, with ICE SHARDS jutting from shoulders and crown.
      if (parts.head) { parts.head.position.y -= 0.15 * (o.height||1.3); parts.head.position.z += 0.12; parts.head.rotation.x = 0.2; }
      const ice = lambert(0xbfe6ff);
      const hb = parts.baseY || 0.7;
      // crown of three head shards (added to head so they sway with it).
      if (parts.head) { for (let i=-1;i<=1;i++){ const sh = mesh(G.cone, ice); sh.scale.set(0.03, 0.16 + Math.abs(i?0:0.06), 0.03); sh.position.set(i*0.12, 0.24, -0.04); sh.rotation.z = -i*0.25; parts.head.add(sh); } }
      // shoulder shard clusters.
      for (const s of [-1,1]) { for (let i=0;i<3;i++){ const sh = mesh(G.cone, ice); const sc = 0.12 + i*0.04; sh.scale.set(0.028, sc, 0.028); sh.position.set(s*(0.2+i*0.015), hb+0.24, -0.05 + i*0.05); sh.rotation.z = -s*(0.4 - i*0.2); sh.rotation.x = -0.2; root.add(sh); } }
      // frosty rime patches (pale flattened spots) on the chest.
      addSpots(root.children[0], 0.22, 0xeaf6ff, 5, 1.0);
    },
  },
  swamp_troll: {
    base: "humanoid",
    scale: 1,
    color: 5925450,
    optionsFn(API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      return { height: 1.28, girth: 1.45, ears: true, headScale: 1.1, tusks: true, belly: true, bellyColor: 0x6a7a3a, claws: true, weapon: 'club' };
    },
    decorate(root, parts, o, tint, API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      // Mossy, drippy bog troll: hunch + clumps of moss (fur tufts) and mud blobs.
      if (parts.head) { parts.head.position.y -= 0.16 * (o.height||1.3); parts.head.position.z += 0.12; parts.head.rotation.x = 0.22; }
      const hb = parts.baseY || 0.7;
      const moss = 0x4a6a2a;
      // moss clumps on shoulders and head.
      addFur(root.children[0], 0.22, moss, 1, 7, 1.0);
      if (parts.head) addFur(parts.head, 0.2, moss, 1, 6, 1.05);
      // dangling mud/vine strands down the arms.
      for (const arm of parts.arms) { const vine = mesh(G.capsule, lambert(shade(moss,0.8))); vine.scale.set(0.012, 0.1, 0.012); vine.position.set(0.04, -0.34*(o.height||1.3), 0.02); arm.add(vine); }
      // a wet mud lump on the belly/back.
      const mud = mesh(G.sphere, lambert(0x4a3a26)); mud.scale.set(0.14,0.1,0.12); mud.position.set(0.08, hb+0.02, 0.18); root.add(mud);
      for (const s of [-1,1]){ const m = mesh(G.lowSphere, lambert(0x3a2e1c)); m.scale.setScalar(0.05); m.position.set(s*0.16, hb-0.12, 0.12); root.add(m); }
    },
  },
  mountain_troll: {
    base: "humanoid",
    scale: 1.05,
    color: 8421504,
    optionsFn(API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      return { height: 1.38, girth: 1.55, ears: true, headScale: 1.1, tusks: true, belly: true, claws: true, weapon: 'battleaxe', weaponOpts: { mat: undefined } };
    },
    decorate(root, parts, o, tint, API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      // Rocky grey troll: angular stone plates on back/shoulders and a huge stone axe (battleaxe retinted via decorate).
      if (parts.head) { parts.head.position.y -= 0.14 * (o.height||1.4); parts.head.position.z += 0.1; parts.head.rotation.x = 0.18; }
      const hb = parts.baseY || 0.75;
      const rock = lambert(shade(tint, 0.7));
      const lite = lambert(shade(tint, 1.15));
      // stony back plates (cones flattened, deterministic placement).
      for (let i=0;i<5;i++){ const a = i*1.4; const p = mesh(G.cone, i%2?rock:lite); p.scale.set(0.06,0.09,0.04); p.position.set(Math.cos(a)*0.14, hb+0.05+i*0.05, -0.16 - (i%2)*0.02); p.rotation.x = -1.0; root.add(p); }
      // blocky shoulder boulders.
      for (const s of [-1,1]){ const b = mesh(G.sphere, rock); b.scale.set(0.13,0.1,0.12); b.position.set(s*0.22, hb+0.24, -0.02); root.add(b); }
      // retint the stone axe head if a weapon was given.
      if (parts.weapon) parts.weapon.grip.traverse(m=>{ if(m.isMesh && m.geometry===G.cone){ m.material = rock; } });
    },
  },
  troll_champion: {
    base: "humanoid",
    scale: 1.05,
    color: 6982195,
    optionsFn(API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      return { height: 1.42, girth: 1.55, ears: true, headScale: 1.1, tusks: true, belly: true, claws: true, shoulders: true, armorColor: 0x6b4a2a, weapon: 'mace', weaponOpts: { spikes: true } };
    },
    decorate(root, parts, o, tint, API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      // Scarred elite: bone-studded ornate club, war-paint stripes, a trophy necklace.
      if (parts.head) { parts.head.position.y -= 0.12 * (o.height||1.4); parts.head.position.z += 0.08; parts.head.rotation.x = 0.15; }
      const hb = parts.baseY || 0.78;
      // scar stripes (thin dark cylinders) across chest.
      for (let i=0;i<3;i++){ const sc = mesh(G.cyl, lambert(shade(tint,0.45))); sc.scale.set(0.006, 0.09, 0.006); sc.rotation.z = 0.5; sc.position.set(-0.05+i*0.05, hb+0.18-i*0.04, 0.2); root.add(sc); }
      // bone trophy necklace: ring of little white cones at the throat.
      if (parts.head){ for (let i=0;i<5;i++){ const a=(i/4-0.5)*1.8; const bone = mesh(G.cone, lambert(0xede5cf)); bone.scale.set(0.014,0.05,0.014); bone.position.set(Math.sin(a)*0.18, -0.26, Math.cos(a)*0.16+0.04); bone.rotation.x = Math.PI; parts.head.add(bone); } }
      // war-paint face mark (red stripe under eyes).
      if (parts.head){ const paint = mesh(G.sphere, lambert(0xaa2a22)); paint.scale.set(0.16,0.02,0.04); paint.position.set(0,0.0,0.2); parts.head.add(paint); }
    },
  },
  furious_troll: {
    base: "humanoid",
    scale: 1.25,
    color: 11015714,
    optionsFn(API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      return { height: 1.6, girth: 1.85, ears: true, headScale: 1.15, tusks: true, belly: true, bellyColor: 0xaa3322, claws: true, weapon: 'battleaxe', weaponOpts: { mat: undefined }, weaponBig: true };
    },
    decorate(root, parts, o, tint, API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      // BOSS: crimson, bulging-muscled, two-hand iron maul, rage spikes & glowing eyes.
      if (parts.head) { parts.head.position.y -= 0.1 * (o.height||1.6); parts.head.position.z += 0.06; parts.head.rotation.x = 0.12; }
      const hb = parts.baseY || 0.9;
      // glowing rage eyes: extra bright pupils.
      if (parts.head){ for (const s of [-1,1]){ const g = mesh(G.lowSphere, lambert(0xff5522)); g.scale.setScalar(0.05); const hs = 0.2*(o.headScale||1.15); g.position.set(s*hs*0.45, 0.06, hs*0.98); parts.head.add(g); } }
      // bulging muscle lumps on arms and shoulders.
      for (const arm of parts.arms){ const bicep = mesh(G.sphere, lambert(shade(tint,1.05))); bicep.scale.set(0.09,0.1,0.09); bicep.position.set(0,-0.16*(o.height||1.6),0.02); arm.add(bicep); }
      for (const s of [-1,1]){ const tr = mesh(G.sphere, lambert(shade(tint,0.85))); tr.scale.set(0.16,0.14,0.14); tr.position.set(s*0.26, hb+0.3, -0.02); root.add(tr); }
      // jagged rage spikes down the spine.
      for (let i=0;i<6;i++){ const sp = mesh(G.cone, lambert(shade(tint,0.55))); sp.scale.set(0.03,0.1+ (i===2||i===3?0.05:0),0.03); sp.position.set(0, hb-0.05+i*0.07, -0.2); sp.rotation.x=-1.1; root.add(sp); }
      // convert the battleaxe to a heavy iron maul look: fatten the head.
      if (parts.weapon) parts.weapon.grip.traverse(m=>{ if(m.isMesh && m.geometry===G.cone){ m.scale.multiplyScalar(1.3); } });
    },
  },
  dwarf: {
    base: "humanoid",
    scale: 0.95,
    color: 9069090,
    optionsFn(API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      return { height: 0.78, girth: 1.2, hair: true, hairColor: 0x8a4a22, weapon: 'axe' };
    },
    decorate(root, parts, o, tint, API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      // Stocky miner: huge braided BEARD (mane on the FRONT of the head), broad helmet, belt.
      const hs = 0.2 * (o.headScale||1);
      if (parts.head){
        // forked beard: a wedge of cones hanging from the chin, splayed.
        const beardC = lambert(o.hairColor || 0x8a4a22);
        for (let i=0;i<6;i++){ const t=i/5; const b = mesh(G.cone, beardC); b.scale.set(hs*0.16, hs*(0.7-t*0.25), hs*0.16); b.position.set((t-0.5)*hs*0.9*0.6, -hs*(0.55+t*0.15), hs*(0.6 - Math.abs(t-0.5)*0.3)); b.rotation.x = Math.PI; b.rotation.z = (t-0.5)*0.5; parts.head.add(b); }
        // mustache lumps.
        for (const s of [-1,1]){ const mu = mesh(G.sphere, beardC); mu.scale.set(hs*0.18,hs*0.1,hs*0.12); mu.position.set(s*hs*0.25,-hs*0.2,hs*0.85); parts.head.add(mu); }
        // iron helmet (dome) with a center ridge.
        const helm = mesh(G.dome, lambert(0x8a8f98)); helm.scale.setScalar(hs*1.16); helm.position.y = hs*0.12; parts.head.add(helm);
        const ridge = mesh(G.sphere, lambert(0x6a6f78)); ridge.scale.set(hs*0.08, hs*0.9, hs*0.3); ridge.position.set(0, hs*0.3, 0); parts.head.add(ridge);
      }
      // thick leather belt with a gold buckle.
      const hb = parts.baseY || 0.45;
      const belt = mesh(G.torus, lambert(0x4a2e18)); belt.scale.set(0.2,0.2,0.06); belt.rotation.x=Math.PI/2; belt.position.y = hb-0.02; root.add(belt);
      const buckle = mesh(G.sphere, GOLD); buckle.scale.set(0.04,0.05,0.03); buckle.position.set(0,hb-0.02,0.22); root.add(buckle);
    },
  },
  dwarf_soldier: {
    base: "humanoid",
    scale: 0.95,
    color: 9081002,
    optionsFn(API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      return { height: 0.8, girth: 1.2, shoulders: true, armorColor: 0x8a8f98, weapon: 'bow' };
    },
    decorate(root, parts, o, tint, API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      // Crossbow (bow prop) trooper in plate: angular pauldrons, helm with nasal, beard.
      const hs = 0.2 * (o.headScale||1);
      if (parts.head){
        const beardC = lambert(0x5a3a1e);
        for (let i=0;i<5;i++){ const t=i/4; const b = mesh(G.cone, beardC); b.scale.set(hs*0.15, hs*(0.6-t*0.2), hs*0.15); b.position.set((t-0.5)*hs*0.5, -hs*(0.55+t*0.12), hs*0.6); b.rotation.x = Math.PI; parts.head.add(b); }
        const helm = mesh(G.dome, lambert(0x9aa0aa)); helm.scale.setScalar(hs*1.18); helm.position.y = hs*0.1; parts.head.add(helm);
        const nasal = mesh(G.cyl, lambert(0x7a808a)); nasal.scale.set(hs*0.06, hs*0.5, hs*0.06); nasal.position.set(0, 0, hs*1.05); parts.head.add(nasal);
      }
      const hb = parts.baseY || 0.45;
      // plate chest seam + rivets.
      const seam = mesh(G.cyl, lambert(0x6a6f78)); seam.scale.set(0.01,0.18,0.01); seam.position.set(0,hb+0.18,0.22); root.add(seam);
      for (let i=0;i<3;i++){ const r = mesh(G.lowSphere, lambert(0xb8c0cc)); r.scale.setScalar(0.018); r.position.set(0.08, hb+0.1+i*0.07, 0.2); root.add(r); }
      // convert bow look toward crossbow: add a horizontal stock across the held bow.
      if (parts.weapon){ const stock = mesh(G.cyl, WOOD); stock.scale.set(0.012,0.14,0.012); stock.rotation.x = Math.PI/2; stock.position.set(0,0.22,0.06); parts.weapon.grip.children[0].add(stock); }
    },
  },
  dwarf_guard: {
    base: "humanoid",
    scale: 0.98,
    color: 8030346,
    optionsFn(API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      return { height: 0.82, girth: 1.3, shoulders: true, armorColor: 0x7a808a, weapon: 'battleaxe' };
    },
    decorate(root, parts, o, tint, API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      // Heavy-plate guardian: oversized pauldrons, a tower of a helm, big two-bit axe.
      const hs = 0.2 * (o.headScale||1);
      if (parts.head){
        const beardC = lambert(0x3a3a3a);
        for (let i=0;i<6;i++){ const t=i/5; const b = mesh(G.cone, beardC); b.scale.set(hs*0.16, hs*(0.7-t*0.2), hs*0.16); b.position.set((t-0.5)*hs*0.5, -hs*(0.55+t*0.12), hs*0.6); b.rotation.x = Math.PI; parts.head.add(b); }
        const helm = mesh(G.cyl, lambert(0x868c96)); helm.scale.set(hs*1.05, hs*0.7, hs*1.05); helm.position.y = hs*0.4; parts.head.add(helm);
        const top = mesh(G.dome, lambert(0x9aa0aa)); top.scale.setScalar(hs*1.06); top.position.y = hs*0.7; parts.head.add(top);
        // horn-like helm wings.
        for (const s of [-1,1]){ const w = mesh(G.cone, lambert(0xb8c0cc)); w.scale.set(hs*0.1,hs*0.4,hs*0.06); w.position.set(s*hs*0.9, hs*0.5,0); w.rotation.z = s*1.4; parts.head.add(w); }
      }
      const hb = parts.baseY || 0.46;
      // big spiked pauldrons over the existing shoulder domes.
      for (const s of [-1,1]){ const pa = mesh(G.dome, lambert(0x9aa0aa)); pa.scale.set(0.16,0.14,0.16); pa.position.set(s*0.28, hb+0.34, 0); root.add(pa); const sp = mesh(G.cone, lambert(0xd8dde4)); sp.scale.set(0.03,0.1,0.03); sp.position.set(s*0.3, hb+0.46,0); sp.rotation.z=-s*0.3; root.add(sp); }
    },
  },
  dwarf_geomancer: {
    base: "humanoid",
    scale: 0.95,
    color: 3812954,
    optionsFn(API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      return { height: 0.8, girth: 1.15, hood: true, hoodColor: 0x3a2e5a, weapon: 'staff', weaponOpts: { orb: 0x44ddaa } };
    },
    decorate(root, parts, o, tint, API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      // Earth-mage dwarf: crystal-studded beard, runic robe hem, floating gem motes, gem-tipped staff.
      const hs = 0.2 * (o.headScale||1);
      if (parts.head){
        // gemstone beard: cones interleaved with little glowing crystals.
        for (let i=0;i<6;i++){ const t=i/5; const b = mesh(G.cone, lambert(0x9a9aa0)); b.scale.set(hs*0.15, hs*(0.65-t*0.2), hs*0.15); b.position.set((t-0.5)*hs*0.6, -hs*(0.55+t*0.12), hs*0.55); b.rotation.x = Math.PI; parts.head.add(b); }
        for (let i=0;i<3;i++){ const gem = mesh(G.lowSphere, lambert([0x44ddaa,0xff66aa,0x66aaff][i])); gem.scale.setScalar(hs*0.08); gem.position.set((i-1)*hs*0.3, -hs*0.7, hs*0.62); parts.head.add(gem); }
      }
      const hb = parts.baseY || 0.45;
      // long robe skirt (cone) covering the legs.
      const robe = mesh(G.cone, lambert(o.hoodColor || 0x3a2e5a)); robe.scale.set(0.26,0.4,0.22); robe.position.y = hb-0.16; root.add(robe);
      // runic glow band on the hem.
      for (let i=0;i<6;i++){ const a=(i/6)*Math.PI*2; const rune = mesh(G.lowSphere, lambert(0x44ddaa)); rune.scale.setScalar(0.022); rune.position.set(Math.cos(a)*0.2, hb-0.32, Math.sin(a)*0.2); root.add(rune); }
      // three orbiting earth gems above the staff hand.
      for (let i=0;i<3;i++){ const a=(i/3)*Math.PI*2; const mote = mesh(G.lowSphere, lambert(0x88ffcc)); mote.scale.setScalar(0.025); mote.position.set(Math.cos(a)*0.18, hb+0.45, Math.sin(a)*0.18+0.12); root.add(mote); }
    },
  },
  elf: {
    base: "humanoid",
    scale: 1,
    color: 13877876,
    optionsFn(API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      return { height: 1.05, girth: 0.82, ears: true, hair: true, hairColor: 0xe6d79a, weapon: 'bow' };
    },
    decorate(root, parts, o, tint, API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      // Slim graceful archer: very long pointed ears, flowing hair, leaf cloak, quiver of arrows.
      const hs = 0.2 * (o.headScale||1);
      if (parts.head){
        // exaggerate the ears: replace stubby with long swept-back cones.
        for (const s of [-1,1]){ const ear = mesh(G.cone, parts.head.children[0].material); ear.scale.set(hs*0.1, hs*0.55, hs*0.1); ear.position.set(s*hs*0.9, hs*0.45, -hs*0.1); ear.rotation.z = -s*0.9; ear.rotation.x = 0.4; parts.head.add(ear); }
        // long hair falling behind.
        for (let i=0;i<3;i++){ const lock = mesh(G.capsule, lambert(o.hairColor||0xe6d79a)); lock.scale.set(hs*0.12, hs*0.5, hs*0.1); lock.position.set((i-1)*hs*0.4, -hs*0.2, -hs*0.7); parts.head.add(lock); }
      }
      const hb = parts.baseY || 0.5;
      // short shoulder cloak (dome) draping the back, green leaf-tint.
      const cloak = mesh(G.dome, lambert(0x3a6a3a)); cloak.scale.set(0.2,0.26,0.16); cloak.rotation.x = Math.PI*0.1; cloak.position.set(0, hb+0.26, -0.1); root.add(cloak);
      // quiver of arrows across the back.
      const quiver = mesh(G.cyl, lambert(0x5a3a1e)); quiver.scale.set(0.04,0.16,0.04); quiver.rotation.z=0.4; quiver.position.set(0.12, hb+0.3, -0.15); root.add(quiver);
      for (let i=0;i<3;i++){ const arr = mesh(G.cone, lambert(0xddccaa)); arr.scale.set(0.012,0.05,0.012); arr.position.set(0.1+i*0.02, hb+0.5, -0.16); root.add(arr); }
    },
  },
  elf_scout: {
    base: "humanoid",
    scale: 1,
    color: 5070394,
    optionsFn(API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      return { height: 1.03, girth: 0.85, ears: true, hood: true, hoodColor: 0x4a5a3a, weapon: 'bow' };
    },
    decorate(root, parts, o, tint, API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      // Leather-clad ranger: deep hood, leather chest straps, dagger on hip, longbow.
      const hs = 0.2 * (o.headScale||1);
      if (parts.head){
        for (const s of [-1,1]){ const ear = mesh(G.cone, parts.head.children[0].material); ear.scale.set(hs*0.08, hs*0.4, hs*0.08); ear.position.set(s*hs*0.85, hs*0.4, -hs*0.05); ear.rotation.z = -s*0.8; parts.head.add(ear); }
        // hood brim (a flattened cone over the brow) to look stealthy.
        const brim = mesh(G.cone, lambert(o.hoodColor||0x4a5a3a)); brim.scale.set(hs*1.0, hs*0.4, hs*1.0); brim.position.set(0, hs*0.5, hs*0.4); brim.rotation.x = 1.1; parts.head.add(brim);
      }
      const hb = parts.baseY || 0.5;
      // crossed leather straps over the chest.
      for (const s of [-1,1]){ const strap = mesh(G.cyl, lambert(0x5a3a22)); strap.scale.set(0.012, 0.2, 0.012); strap.rotation.z = s*0.6; strap.position.set(0, hb+0.16, 0.2); root.add(strap); }
      // belt pouch + dagger.
      const pouch = mesh(G.sphere, lambert(0x4a2e18)); pouch.scale.set(0.05,0.05,0.04); pouch.position.set(-0.1, hb-0.04, 0.18); root.add(pouch);
      const dagger = mesh(G.cone, STEEL); dagger.scale.set(0.012,0.08,0.012); dagger.position.set(0.12, hb-0.06, 0.16); dagger.rotation.x = 0.3; root.add(dagger);
    },
  },
  elf_arcanist: {
    base: "humanoid",
    scale: 1.02,
    color: 2763370,
    optionsFn(API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      return { height: 1.08, girth: 0.8, ears: true, hood: true, hoodColor: 0x2a2a6a, weapon: 'staff', weaponOpts: { orb: 0x99aaff } };
    },
    decorate(root, parts, o, tint, API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      // High-elf spellcaster: tall collar, trailing star-robe, energy ring + orbiting motes, glowing staff.
      const hs = 0.2 * (o.headScale||1);
      if (parts.head){
        for (const s of [-1,1]){ const ear = mesh(G.cone, parts.head.children[0].material); ear.scale.set(hs*0.08, hs*0.5, hs*0.08); ear.position.set(s*hs*0.85, hs*0.45, -hs*0.08); ear.rotation.z = -s*0.95; parts.head.add(ear); }
      }
      const hb = parts.baseY || 0.52;
      // long flowing robe (cone) over the legs in deep blue.
      const robe = mesh(G.cone, lambert(o.hoodColor||0x2a2a6a)); robe.scale.set(0.24,0.46,0.2); robe.position.y = hb-0.2; root.add(robe);
      // tall mage collar behind the neck.
      const collar = mesh(G.dome, lambert(shade(o.hoodColor||0x2a2a6a, 1.3))); collar.scale.set(0.16,0.18,0.1); collar.rotation.x=-0.4; collar.position.set(0, hb+0.3, -0.1); root.add(collar);
      // horizontal arcane energy RING orbiting the torso.
      const ring = mesh(G.torus, lambert(0x99aaff)); ring.scale.set(0.3,0.3,0.04); ring.rotation.x = Math.PI/2; ring.position.y = hb+0.2; root.add(ring);
      // star motes scattered above one hand.
      for (let i=0;i<4;i++){ const a=(i/4)*Math.PI*2; const star = mesh(G.lowSphere, lambert(0xccddff)); star.scale.setScalar(0.02); star.position.set(Math.cos(a)*0.16, hb+0.5+Math.sin(a)*0.05, Math.sin(a)*0.16+0.14); root.add(star); }
    },
  },
  amazon: {
    base: "humanoid",
    scale: 1,
    color: 13395558,
    optionsFn(API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      return { height: 1.06, girth: 0.82, hair: true, hairColor: 0x2a1a10, weapon: 'sword' };
    },
    decorate(root, parts, o, tint, API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      // Warrior woman: ponytail, single leather pauldron, cinched waist, throwing-knife bandolier, round buckler on the off-arm.
      const hs = 0.2 * (o.headScale||1);
      if (parts.head){
        // high ponytail bobbing behind.
        const tie = mesh(G.sphere, lambert(0x6a4a2a)); tie.scale.setScalar(hs*0.18); tie.position.set(0, hs*0.7, -hs*0.5); parts.head.add(tie);
        const tail = mesh(G.capsule, lambert(o.hairColor||0x2a1a10)); tail.scale.set(hs*0.14, hs*0.55, hs*0.12); tail.position.set(0, hs*0.3, -hs*0.7); tail.rotation.x = 0.5; parts.head.add(tail);
      }
      const hb = parts.baseY || 0.5;
      // chest indicates a feminine silhouette (slightly tapered torso already via girth) + a single leather pauldron on right.
      const pad = mesh(G.dome, lambert(0x6a3a1e)); pad.scale.set(0.1,0.09,0.1); pad.position.set(0.22, hb+0.3, 0); root.add(pad);
      // waist cincher.
      const belt = mesh(G.torus, lambert(0x4a2a14)); belt.scale.set(0.17,0.17,0.05); belt.rotation.x=Math.PI/2; belt.position.y = hb+0.02; root.add(belt);
      // bandolier of throwing knives across the chest.
      for (let i=0;i<3;i++){ const kn = mesh(G.cone, STEEL); kn.scale.set(0.01,0.05,0.01); kn.position.set(-0.08+i*0.05, hb+0.12, 0.2); kn.rotation.z=0.3; root.add(kn); }
      // small round buckler on the LEFT (off) forearm.
      const buckler = mesh(G.dome, lambert(0x8a7a4a)); buckler.scale.set(0.08,0.04,0.08); buckler.rotation.x = Math.PI/2; buckler.position.set(0.07,-0.2,0.06); parts.arms[0].add(buckler);
    },
  },
  valkyrie: {
    base: "humanoid",
    scale: 1.12,
    color: 13160422,
    optionsFn(API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      return { height: 1.18, girth: 0.85, hair: true, hairColor: 0xf0e2a0, shoulders: true, armorColor: 0xc8cdd6, weapon: 'spear' };
    },
    decorate(root, parts, o, tint, API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      // BOSS: elite winged shieldmaiden. Winged helm, white feathered back-wings, gleaming plate, flowing cape, spear.
      const hs = 0.2 * (o.headScale||1);
      if (parts.head){
        // gleaming helm with sweptback WINGS at the temples.
        const helm = mesh(G.dome, lambert(0xd8dde6)); helm.scale.setScalar(hs*1.12); helm.position.y = hs*0.12; parts.head.add(helm);
        for (const s of [-1,1]){ for (let i=0;i<3;i++){ const f = mesh(G.cone, lambert(0xffffff)); f.scale.set(hs*0.07, hs*(0.4-i*0.08), hs*0.04); f.position.set(s*hs*0.7, hs*0.55+i*0.04, -hs*0.1 - i*hs*0.18); f.rotation.z = s*(1.2+i*0.2); f.rotation.x = -0.2; parts.head.add(f); } }
        // long braided golden hair.
        const braid = mesh(G.capsule, lambert(o.hairColor||0xf0e2a0)); braid.scale.set(hs*0.12, hs*0.6, hs*0.1); braid.position.set(0,-hs*0.1,-hs*0.7); parts.head.add(braid);
      }
      const hb = parts.baseY || 0.55;
      // large white FEATHERED back-wings (two fans of cones each side).
      for (const s of [-1,1]){ for (let i=0;i<5;i++){ const t=i/4; const feat = mesh(G.cone, lambert(0xf6f8ff)); feat.scale.set(0.04, 0.22 - t*0.06, 0.02); feat.position.set(s*(0.1+t*0.28), hb+0.34 - t*0.14, -0.16 - t*0.04); feat.rotation.z = s*(1.0 + t*0.5); feat.rotation.x = -0.3; root.add(feat); } }
      // gleaming plate breast + faulds (skirt of plates).
      const breast = mesh(G.sphere, lambert(0xe2e6ee)); breast.scale.set(0.16,0.14,0.12); breast.position.set(0, hb+0.2, 0.16); root.add(breast);
      const fauld = mesh(G.cone, lambert(0xc8cdd6)); fauld.scale.set(0.18,0.16,0.16); fauld.position.y = hb-0.06; root.add(fauld);
      // flowing crimson cape behind.
      const cape = mesh(G.cone, lambert(0xaa2233)); cape.scale.set(0.18,0.4,0.04); cape.position.set(0, hb+0.05, -0.18); root.add(cape);
    },
  },
  minotaur: {
    base: "humanoid",
    scale: 1.05,
    color: 8014378,
    optionsFn(API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      return { height: 1.3, girth: 1.45, headScale: 1.15, ears: false, shoulders: true, armorColor: 0x4a2c18, belly: true, bellyColor: 0x8a5a38, weapon: 'club', weaponOpts: { scale: 1.4 } };
    },
    decorate(root, parts, o, tint, API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      const hs = 0.2 * (o.headScale || 1);
      const head = parts.head;
      const snoutMat = lambert(shade(tint, 1.15));
      // elongated bull muzzle pushed out the front of the skull
      const muzzle = mesh(G.capsule, snoutMat);
      muzzle.rotation.x = Math.PI / 2;
      muzzle.scale.set(hs * 0.5, hs * 0.5, hs * 0.5);
      muzzle.position.set(0, -hs * 0.18, hs * 0.85);
      head.add(muzzle);
      // flat nose pad with two dark nostrils
      const pad = mesh(G.sphere, lambert(shade(tint, 0.55)));
      pad.scale.set(hs * 0.34, hs * 0.24, hs * 0.16);
      pad.position.set(0, -hs * 0.22, hs * 1.32);
      head.add(pad);
      for (const s of [-1, 1]) {
        const nos = mesh(G.lowSphere, EYE_B);
        nos.scale.setScalar(hs * 0.07);
        nos.position.set(s * hs * 0.12, -hs * 0.22, hs * 1.42);
        head.add(nos);
      }
      // big curved bull horns sweeping out and up from the temples
      const hornMat = lambert(0xe8e0cc);
      for (const s of [-1, 1]) {
        const base = mesh(G.cone, hornMat);
        base.scale.set(hs * 0.16, hs * 0.5, hs * 0.16);
        base.position.set(s * hs * 0.72, hs * 0.62, 0);
        base.rotation.z = s * 1.15;
        head.add(base);
        const tip = mesh(G.cone, hornMat);
        tip.scale.set(hs * 0.1, hs * 0.42, hs * 0.1);
        tip.position.set(s * hs * 1.18, hs * 0.92, 0);
        tip.rotation.z = s * 0.35;
        head.add(tip);
      }
      // bull ears tucked below the horns
      for (const s of [-1, 1]) {
        const ear = mesh(G.sphere, snoutMat);
        ear.scale.set(hs * 0.22, hs * 0.12, hs * 0.08);
        ear.position.set(s * hs * 0.78, hs * 0.32, -hs * 0.05);
        ear.rotation.z = s * 0.5;
        head.add(ear);
      }
      // shaggy mane crest down the back of the neck/head
      addMane(head, hs, shade(tint, 0.55), 6);
      // fur ruff around the chest/shoulders for a beefy bovine bulk
      addFur(parts.head.parent ? root : root, 0.3, tint, 1, 9, 0.8);
    },
  },
  minotaur_archer: {
    base: "humanoid",
    scale: 1,
    color: 9067066,
    optionsFn(API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      return { height: 1.25, girth: 1.3, headScale: 1.1, shoulders: true, armorColor: 0x5a3a22, weapon: 'bow' };
    },
    decorate(root, parts, o, tint, API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      const hs = 0.2 * (o.headScale || 1);
      const head = parts.head;
      const snoutMat = lambert(shade(tint, 1.12));
      // bull muzzle
      const muzzle = mesh(G.capsule, snoutMat);
      muzzle.rotation.x = Math.PI / 2;
      muzzle.scale.set(hs * 0.46, hs * 0.46, hs * 0.46);
      muzzle.position.set(0, -hs * 0.18, hs * 0.82);
      head.add(muzzle);
      const pad = mesh(G.sphere, lambert(shade(tint, 0.55)));
      pad.scale.set(hs * 0.3, hs * 0.22, hs * 0.15);
      pad.position.set(0, -hs * 0.22, hs * 1.26);
      head.add(pad);
      // leaner, shorter swept horns than the brute
      const hornMat = lambert(0xddd2bb);
      for (const s of [-1, 1]) {
        const horn = mesh(G.cone, hornMat);
        horn.scale.set(hs * 0.13, hs * 0.5, hs * 0.13);
        horn.position.set(s * hs * 0.66, hs * 0.66, 0);
        horn.rotation.z = s * 0.95;
        head.add(horn);
        const ear = mesh(G.sphere, snoutMat);
        ear.scale.set(hs * 0.2, hs * 0.11, hs * 0.07);
        ear.position.set(s * hs * 0.74, hs * 0.34, -hs * 0.05);
        ear.rotation.z = s * 0.5;
        head.add(ear);
      }
      addMane(head, hs, shade(tint, 0.6), 5);
      // leather quiver strapped diagonally across the back
      const quiver = mesh(G.cyl, lambert(0x4a3018));
      quiver.scale.set(0.05, 0.18, 0.05);
      quiver.position.set(-0.12, (parts.baseY || 0.6) + 0.05, -0.22);
      quiver.rotation.z = 0.5;
      quiver.rotation.x = -0.3;
      root.add(quiver);
      for (let i = -1; i <= 1; i++) {
        const arrow = mesh(G.cone, lambert(0xe8e0c8));
        arrow.scale.set(0.012, 0.05, 0.012);
        arrow.position.set(-0.12 + i * 0.03, (parts.baseY || 0.6) + 0.2, -0.27);
        arrow.rotation.x = -0.3;
        root.add(arrow);
      }
    },
  },
  minotaur_guard: {
    base: "humanoid",
    scale: 1.05,
    color: 6962458,
    optionsFn(API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      return { height: 1.3, girth: 1.5, headScale: 1.15, shoulders: true, armorColor: 0x4a4e58, weapon: 'mace', weaponOpts: { mat: null } };
    },
    decorate(root, parts, o, tint, API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      const hs = 0.2 * (o.headScale || 1);
      const head = parts.head;
      const plate = lambert(shade(tint, 0.7));
      const steelMat = lambert(0x9aa2ae);
      const snoutMat = lambert(shade(tint, 1.1));
      // bull muzzle
      const muzzle = mesh(G.capsule, snoutMat);
      muzzle.rotation.x = Math.PI / 2;
      muzzle.scale.set(hs * 0.48, hs * 0.48, hs * 0.48);
      muzzle.position.set(0, -hs * 0.18, hs * 0.82);
      head.add(muzzle);
      // thick forward-curving horns capped in steel
      for (const s of [-1, 1]) {
        const horn = mesh(G.cone, lambert(0xe0d6c0));
        horn.scale.set(hs * 0.17, hs * 0.46, hs * 0.17);
        horn.position.set(s * hs * 0.7, hs * 0.6, 0);
        horn.rotation.z = s * 1.1;
        head.add(horn);
        const cap = mesh(G.sphere, steelMat);
        cap.scale.setScalar(hs * 0.11);
        cap.position.set(s * hs * 1.08, hs * 0.84, 0);
        head.add(cap);
        const ear = mesh(G.sphere, snoutMat);
        ear.scale.set(hs * 0.2, hs * 0.11, hs * 0.07);
        ear.position.set(s * hs * 0.76, hs * 0.32, -hs * 0.05);
        ear.rotation.z = s * 0.5;
        head.add(ear);
      }
      // riveted helm brow band across the forehead
      const band = mesh(G.torus, steelMat);
      band.scale.set(hs * 0.95, hs * 0.95, hs * 0.5);
      band.rotation.x = Math.PI / 2;
      band.position.y = hs * 0.5;
      head.add(band);
      // heavy iron breastplate slab on the torso
      const bp = mesh(G.sphere, plate);
      bp.scale.set(0.26, 0.24, 0.18);
      bp.position.set(0, (parts.baseY || 0.6) + 0.02, 0.18);
      root.add(bp);
      // big round shield strapped on the LEFT forearm (arms[0])
      const shield = new THREE.Group();
      const face = mesh(G.dome, steelMat);
      face.scale.set(0.2, 0.2, 0.1);
      face.rotation.x = Math.PI / 2;
      shield.add(face);
      const boss = mesh(G.sphere, lambert(0x6a6e78));
      boss.scale.setScalar(0.06);
      boss.position.z = 0.06;
      shield.add(boss);
      shield.position.set(0, parts.handY || -0.28, (parts.handR || 0.07) * 2.4);
      shield.rotation.x = -0.2;
      parts.arms[0].add(shield);
    },
  },
  minotaur_mage: {
    base: "humanoid",
    scale: 1.1,
    color: 10120266,
    optionsFn(API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      return { height: 1.35, girth: 1.35, headScale: 1.2, hood: false, weapon: 'staff', weaponOpts: { orb: 0xb066ff } };
    },
    decorate(root, parts, o, tint, API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      const hs = 0.2 * (o.headScale || 1);
      const head = parts.head;
      const snoutMat = lambert(shade(tint, 1.1));
      const energy = lambert(0xb066ff);
      // bull muzzle
      const muzzle = mesh(G.capsule, snoutMat);
      muzzle.rotation.x = Math.PI / 2;
      muzzle.scale.set(hs * 0.48, hs * 0.48, hs * 0.48);
      muzzle.position.set(0, -hs * 0.18, hs * 0.82);
      head.add(muzzle);
      // long elegant rune-tipped horns spiralling up
      for (const s of [-1, 1]) {
        const horn = mesh(G.cone, lambert(0xe6dcc6));
        horn.scale.set(hs * 0.14, hs * 0.7, hs * 0.14);
        horn.position.set(s * hs * 0.6, hs * 0.85, -hs * 0.05);
        horn.rotation.z = s * 0.55;
        head.add(horn);
        // glowing energy bead orbiting each horn tip
        const bead = mesh(G.lowSphere, energy);
        bead.scale.setScalar(hs * 0.16);
        bead.position.set(s * hs * 0.95, hs * 1.45, -hs * 0.05);
        head.add(bead);
        const ear = mesh(G.sphere, snoutMat);
        ear.scale.set(hs * 0.18, hs * 0.1, hs * 0.06);
        ear.position.set(s * hs * 0.74, hs * 0.34, -hs * 0.05);
        ear.rotation.z = s * 0.5;
        head.add(ear);
      }
      // floating ring of energy motes haloing the head (boss aura)
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const mote = mesh(G.lowSphere, energy);
        mote.scale.setScalar(hs * 0.1);
        mote.position.set(Math.cos(a) * hs * 1.5, hs * 0.2, Math.sin(a) * hs * 1.5);
        head.add(mote);
      }
      // long ceremonial robe skirt flaring from the hips
      const robe = mesh(G.cone, lambert(shade(tint, 0.7)));
      robe.scale.set(0.3, 0.42, 0.3);
      robe.position.y = 0.22;
      root.add(robe);
      // energy sigil glowing on the chest
      const sigil = mesh(G.torus, energy);
      sigil.scale.set(0.09, 0.09, 0.04);
      sigil.position.set(0, (parts.baseY || 0.6) + 0.02, 0.2);
      root.add(sigil);
    },
  },
  cyclops: {
    base: "humanoid",
    scale: 2,
    color: 10123866,
    optionsFn(API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      return { height: 1.55, girth: 1.7, headScale: 1.5, ears: true, shoulders: true, armorColor: 0x5a3a22, belly: true, bellyColor: 0xb08a5a, weapon: 'club', weaponOpts: { scale: 1.8 } };
    },
    decorate(root, parts, o, tint, API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      const hs = 0.2 * (o.headScale || 1);
      const head = parts.head;
      // HIDE the default two-eye pair (they are the first white/black sphere meshes
      // added to the head group) by collapsing any pure-white or pure-black eye spheres.
      for (const c of head.children) {
        if (c.material === EYE_W || c.material === EYE_B) c.visible = false;
      }
      // ONE big central eye: white ball, amber iris, black pupil, heavy brow
      const eyeWhite = mesh(G.sphere, EYE_W);
      eyeWhite.scale.setScalar(hs * 0.42);
      eyeWhite.position.set(0, hs * 0.08, hs * 0.85);
      head.add(eyeWhite);
      const iris = mesh(G.lowSphere, lambert(0xcc8822));
      iris.scale.setScalar(hs * 0.26);
      iris.position.set(0, hs * 0.08, hs * 1.1);
      head.add(iris);
      const pupil = mesh(G.lowSphere, EYE_B);
      pupil.scale.setScalar(hs * 0.13);
      pupil.position.set(0, hs * 0.08, hs * 1.22);
      head.add(pupil);
      // single jutting brow ridge over the eye
      const brow = mesh(G.sphere, lambert(shade(tint, 0.75)));
      brow.scale.set(hs * 0.55, hs * 0.16, hs * 0.3);
      brow.position.set(0, hs * 0.42, hs * 0.78);
      head.add(brow);
      // wide flat nose under the eye and a heavy lower jaw
      const nose = mesh(G.sphere, lambert(shade(tint, 0.95)));
      nose.scale.set(hs * 0.22, hs * 0.26, hs * 0.3);
      nose.position.set(0, -hs * 0.28, hs * 0.9);
      head.add(nose);
      const jaw = mesh(G.sphere, lambert(shade(tint, 0.92)));
      jaw.scale.set(hs * 0.7, hs * 0.4, hs * 0.6);
      jaw.position.set(0, -hs * 0.6, hs * 0.35);
      head.add(jaw);
      // a couple of crooked lower tusks/teeth
      for (const s of [-1, 1]) {
        const tooth = mesh(G.cone, lambert(0xeae2cc));
        tooth.scale.set(hs * 0.08, hs * 0.2, hs * 0.08);
        tooth.position.set(s * hs * 0.28, -hs * 0.55, hs * 0.7);
        head.add(tooth);
      }
      // scrubby topknot of hair
      const hair = mesh(G.sphere, lambert(0x3a2a1a));
      hair.scale.set(hs * 0.7, hs * 0.45, hs * 0.7);
      hair.position.y = hs * 0.7;
      head.add(hair);
      // loincloth wrap and claws on the big hands
      const loin = mesh(G.cone, lambert(0x4a3018));
      loin.scale.set(0.34, 0.2, 0.3);
      loin.position.y = 0.42;
      root.add(loin);
      for (const arm of parts.arms) addClaws(arm, parts.handY || -0.3, 0.04, 0.03, 0.05, 4);
    },
  },
  cyclops_smith: {
    base: "humanoid",
    scale: 1.9,
    color: 9067594,
    optionsFn(API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      return { height: 1.5, girth: 1.75, headScale: 1.45, ears: true, shoulders: true, armorColor: 0x3a2a1a, belly: true, bellyColor: 0xa07a4a, weapon: 'mace', weaponOpts: { mat: null, scale: 1.6 } };
    },
    decorate(root, parts, o, tint, API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      const hs = 0.2 * (o.headScale || 1);
      const head = parts.head;
      for (const c of head.children) {
        if (c.material === EYE_W || c.material === EYE_B) c.visible = false;
      }
      // single central eye (squinting smith — slightly smaller, ash-stained)
      const eyeWhite = mesh(G.sphere, EYE_W);
      eyeWhite.scale.setScalar(hs * 0.4);
      eyeWhite.position.set(0, hs * 0.06, hs * 0.85);
      head.add(eyeWhite);
      const iris = mesh(G.lowSphere, lambert(0xb87722));
      iris.scale.setScalar(hs * 0.24);
      iris.position.set(0, hs * 0.06, hs * 1.08);
      head.add(iris);
      const pupil = mesh(G.lowSphere, EYE_B);
      pupil.scale.setScalar(hs * 0.12);
      pupil.position.set(0, hs * 0.06, hs * 1.2);
      head.add(pupil);
      const brow = mesh(G.sphere, lambert(shade(tint, 0.7)));
      brow.scale.set(hs * 0.55, hs * 0.18, hs * 0.3);
      brow.position.set(0, hs * 0.42, hs * 0.78);
      head.add(brow);
      const jaw = mesh(G.sphere, lambert(shade(tint, 0.92)));
      jaw.scale.set(hs * 0.68, hs * 0.4, hs * 0.58);
      jaw.position.set(0, -hs * 0.58, hs * 0.35);
      head.add(jaw);
      // soot-blackened beard
      const beard = mesh(G.sphere, lambert(0x2a2422));
      beard.scale.set(hs * 0.55, hs * 0.35, hs * 0.4);
      beard.position.set(0, -hs * 0.62, hs * 0.55);
      head.add(beard);
      // leather blacksmith APRON slung over the chest down to the thighs
      const apron = mesh(G.capsule, lambert(0x5a3a22));
      apron.scale.set(0.24, 0.26, 0.08);
      apron.position.set(0, (parts.baseY || 0.6) - 0.12, 0.2);
      root.add(apron);
      // apron neck strap
      const strap = mesh(G.cyl, lambert(0x4a3018));
      strap.scale.set(0.02, 0.14, 0.02);
      strap.position.set(0, (parts.baseY || 0.6) + 0.12, 0.16);
      strap.rotation.x = 0.3;
      root.add(strap);
      // glowing forge-ember on the chest of the apron
      const ember = mesh(G.lowSphere, lambert(0xff7722));
      ember.scale.setScalar(0.04);
      ember.position.set(0.06, (parts.baseY || 0.6) - 0.05, 0.27);
      root.add(ember);
    },
  },
  cyclops_drone: {
    base: "humanoid",
    scale: 1.7,
    color: 8018266,
    optionsFn(API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      return { height: 1.75, girth: 1.95, headScale: 1.6, ears: true, shoulders: true, armorColor: 0x4a3018, belly: true, bellyColor: 0xb08a5a, weapon: 'club', weaponOpts: { scale: 2.1 } };
    },
    decorate(root, parts, o, tint, API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      const hs = 0.2 * (o.headScale || 1);
      const head = parts.head;
      for (const c of head.children) {
        if (c.material === EYE_W || c.material === EYE_B) c.visible = false;
      }
      // huge bloodshot central eye on the biggest cyclops of all
      const eyeWhite = mesh(G.sphere, lambert(0xffe8e0));
      eyeWhite.scale.setScalar(hs * 0.46);
      eyeWhite.position.set(0, hs * 0.08, hs * 0.85);
      head.add(eyeWhite);
      const iris = mesh(G.lowSphere, lambert(0xcc3322));
      iris.scale.setScalar(hs * 0.28);
      iris.position.set(0, hs * 0.08, hs * 1.12);
      head.add(iris);
      const pupil = mesh(G.lowSphere, EYE_B);
      pupil.scale.setScalar(hs * 0.14);
      pupil.position.set(0, hs * 0.08, hs * 1.24);
      head.add(pupil);
      // massive scowling brow and underbite jaw with big tusks
      const brow = mesh(G.sphere, lambert(shade(tint, 0.7)));
      brow.scale.set(hs * 0.62, hs * 0.2, hs * 0.34);
      brow.position.set(0, hs * 0.44, hs * 0.78);
      head.add(brow);
      const jaw = mesh(G.sphere, lambert(shade(tint, 0.92)));
      jaw.scale.set(hs * 0.78, hs * 0.46, hs * 0.66);
      jaw.position.set(0, -hs * 0.6, hs * 0.35);
      head.add(jaw);
      for (const s of [-1, 1]) {
        const tusk = mesh(G.cone, lambert(0xeae2cc));
        tusk.scale.set(hs * 0.11, hs * 0.3, hs * 0.11);
        tusk.position.set(s * hs * 0.32, -hs * 0.48, hs * 0.72);
        head.add(tusk);
      }
      // crude bone/stone shoulder spikes — a brutish overgrown look
      for (const s of [-1, 1]) {
        for (let i = 0; i < 2; i++) {
          const spike = mesh(G.cone, lambert(0xddd0b8));
          spike.scale.set(0.04, 0.12, 0.04);
          spike.position.set(s * 0.34, (parts.baseY || 0.6) + 0.18 - i * 0.06, -0.04 + i * 0.06);
          spike.rotation.z = s * 0.9;
          root.add(spike);
        }
      }
      // thick warpaint band and claws — bigger, meaner than the base cyclops
      addSpots(root, 0.32, tint, 5, 0.6);
      for (const arm of parts.arms) addClaws(arm, parts.handY || -0.34, 0.04, 0.035, 0.06, 4);
    },
  },
  behemoth: {
    base: "humanoid",
    scale: 1.75,
    color: 2956340,
    optionsFn(API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      return { height: 1.9, girth: 2.1, headScale: 1.4, tusks: false, shoulders: true, armorColor: 0x1a1418, belly: true, bellyColor: 0x3a2a30 };
    },
    decorate(root, parts, o, tint, API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      const hs = 0.2 * (o.headScale || 1);
      const head = parts.head;
      const hide = lambert(shade(tint, 1.1));
      const darkHorn = lambert(0x2a2226);
      // 12-foot bull-human hybrid: a broad bovine muzzle
      const muzzle = mesh(G.capsule, hide);
      muzzle.rotation.x = Math.PI / 2;
      muzzle.scale.set(hs * 0.6, hs * 0.55, hs * 0.55);
      muzzle.position.set(0, -hs * 0.2, hs * 0.85);
      head.add(muzzle);
      const pad = mesh(G.sphere, lambert(shade(tint, 0.55)));
      pad.scale.set(hs * 0.4, hs * 0.26, hs * 0.18);
      pad.position.set(0, -hs * 0.24, hs * 1.35);
      head.add(pad);
      for (const s of [-1, 1]) {
        const nos = mesh(G.lowSphere, EYE_B);
        nos.scale.setScalar(hs * 0.08);
        nos.position.set(s * hs * 0.14, -hs * 0.24, hs * 1.45);
        head.add(nos);
      }
      // glowing menacing eyes (override default whites with dark-glow red)
      for (const c of head.children) { if (c.material === EYE_B) c.material = lambert(0xff3322); }
      // MASSIVE black horns: wide bull horns AND a second pair of upward demon horns
      for (const s of [-1, 1]) {
        const bull = mesh(G.cone, darkHorn);
        bull.scale.set(hs * 0.22, hs * 0.7, hs * 0.22);
        bull.position.set(s * hs * 0.78, hs * 0.55, 0);
        bull.rotation.z = s * 1.3;
        head.add(bull);
        const bullTip = mesh(G.cone, darkHorn);
        bullTip.scale.set(hs * 0.13, hs * 0.5, hs * 0.13);
        bullTip.position.set(s * hs * 1.4, hs * 0.95, 0);
        bullTip.rotation.z = s * 0.4;
        head.add(bullTip);
        const up = mesh(G.cone, darkHorn);
        up.scale.set(hs * 0.16, hs * 0.6, hs * 0.16);
        up.position.set(s * hs * 0.4, hs * 0.95, -hs * 0.1);
        up.rotation.z = s * 0.3;
        head.add(up);
      }
      // upward-jutting tusks from the lower jaw
      for (const s of [-1, 1]) {
        const tusk = mesh(G.cone, lambert(0xe8dcc4));
        tusk.scale.set(hs * 0.13, hs * 0.34, hs * 0.13);
        tusk.position.set(s * hs * 0.3, -hs * 0.35, hs * 1.0);
        tusk.rotation.x = -0.3;
        head.add(tusk);
      }
      addMane(head, hs, 0x140e12, 7);
      // dark hulking bulk: chest plates of muscle, fur ruff and back ridge spikes
      const chest = mesh(G.sphere, lambert(shade(tint, 0.85)));
      chest.scale.set(0.42, 0.34, 0.3);
      chest.position.set(0, (parts.baseY || 0.6) + 0.05, 0.16);
      root.add(chest);
      addFur(root, 0.42, shade(tint, 0.8), 1, 11, 0.7);
      for (let i = 0; i < 4; i++) {
        const ridge = mesh(G.cone, darkHorn);
        ridge.scale.set(0.05, 0.14 - i * 0.02, 0.05);
        ridge.position.set(0, (parts.baseY || 0.6) + 0.18 - i * 0.12, -0.22);
        ridge.rotation.x = -0.5;
        root.add(ridge);
      }
      // a big throwing stone clutched in the right fist (no weapon prop used)
      const stone = mesh(G.lowSphere, lambert(0x55504a));
      stone.scale.setScalar(0.13);
      stone.position.set((parts.handR || 0.1) * 1.2, parts.handY || -0.36, (parts.handR || 0.1) * 1.6);
      addSpots(stone, 1, 0x55504a, 5, 0.7);
      parts.arms[parts.arms.length - 1].add(stone);
      // hooved cloven feet hint: dark shins
      for (const leg of parts.legs) {
        const hoof = mesh(G.sphere, lambert(0x16100e));
        hoof.scale.set(0.1, 0.07, 0.12);
        hoof.position.y = -0.34 * (o.height || 1);
        leg.add(hoof);
      }
    },
  },
  skeleton: {
    base: "humanoid",
    scale: 1,
    color: 14935258,
    optionsFn(API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      return { height: 1.0, girth: 0.62, skinMat: lambert(0xe8e6da), weapon: 'sword', hornColor: 0xcfcbb8 };
    },
    decorate(root, parts, o, tint, API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      const bone = lambert(0xe8e6da); const dark = lambert(0x33312c); const headY = parts.head.position.y; const torsoY = parts.baseY; 
      // Hollow eye sockets: dark recessed spheres replacing the cute eyes look.
      for (const s of [-1, 1]) { const sock = mesh(G.lowSphere, dark); sock.scale.set(0.05, 0.06, 0.04); sock.position.set(s * 0.09, 0.03, 0.17); parts.head.add(sock); const glow = mesh(G.lowSphere, lambert(0x9fe6ff)); glow.scale.setScalar(0.022); glow.position.set(s * 0.09, 0.03, 0.2); parts.head.add(glow); }
      // Jaw / teeth row under the skull.
      const jaw = mesh(G.dome, bone); jaw.scale.set(0.13, 0.07, 0.12); jaw.rotation.x = Math.PI; jaw.position.set(0, -0.1, 0.1); parts.head.add(jaw);
      for (let i = -2; i <= 2; i++) { const tooth = mesh(G.cone, bone); tooth.scale.set(0.012, 0.03, 0.012); tooth.position.set(i * 0.03, -0.06, 0.17); parts.head.add(tooth); }
      // Exposed spine + rib cage hoops floating around the torso (the signature bare-bone look).
      for (let i = 0; i < 4; i++) { const rib = mesh(G.torus, bone); const rr = 0.13 - i * 0.012; rib.scale.set(rr, rr * 0.8, 0.02); rib.rotation.x = Math.PI / 2; rib.position.set(0, torsoY + 0.12 - i * 0.07, 0.0); root.add(rib); }
      const spine = mesh(G.cyl, bone); spine.scale.set(0.022, 0.16, 0.022); spine.position.set(0, torsoY, -0.05); root.add(spine);
      // Collar/clavicle bar across the shoulders.
      const collar = mesh(G.cyl, bone); collar.scale.set(0.018, 0.12, 0.018); collar.rotation.z = Math.PI / 2; collar.position.set(0, torsoY + 0.16, 0.02); root.add(collar);
      // Pelvis ring.
      const pelvis = mesh(G.torus, bone); pelvis.scale.set(0.1, 0.07, 0.02); pelvis.rotation.x = Math.PI / 2; pelvis.position.set(0, torsoY - 0.28, 0); root.add(pelvis);
    },
  },
  skeleton_archer: {
    base: "humanoid",
    scale: 1,
    color: 14868432,
    optionsFn(API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      return { height: 1.0, girth: 0.6, skinMat: lambert(0xe2dfd0), weapon: 'bow' };
    },
    decorate(root, parts, o, tint, API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      const bone = lambert(0xe2dfd0); const dark = lambert(0x33312c); const torsoY = parts.baseY; const headY = parts.head.position.y;
      // Eye sockets with a faint ember glow.
      for (const s of [-1, 1]) { const sock = mesh(G.lowSphere, dark); sock.scale.set(0.05, 0.06, 0.04); sock.position.set(s * 0.09, 0.03, 0.17); parts.head.add(sock); const glow = mesh(G.lowSphere, lambert(0xff9a3c)); glow.scale.setScalar(0.02); glow.position.set(s * 0.09, 0.03, 0.2); parts.head.add(glow); }
      const jaw = mesh(G.dome, bone); jaw.scale.set(0.12, 0.06, 0.11); jaw.rotation.x = Math.PI; jaw.position.set(0, -0.09, 0.1); parts.head.add(jaw);
      // Rib hoops + spine.
      for (let i = 0; i < 4; i++) { const rib = mesh(G.torus, bone); const rr = 0.12 - i * 0.011; rib.scale.set(rr, rr * 0.8, 0.02); rib.rotation.x = Math.PI / 2; rib.position.set(0, torsoY + 0.1 - i * 0.07, 0); root.add(rib); }
      const spine = mesh(G.cyl, bone); spine.scale.set(0.02, 0.15, 0.02); spine.position.set(0, torsoY, -0.05); root.add(spine);
      // Quiver slung diagonally across the back with fletched arrow tips poking out.
      const quiver = mesh(G.cyl, lambert(0x5a3c22)); quiver.scale.set(0.04, 0.16, 0.04); quiver.rotation.set(0.4, 0, -0.5); quiver.position.set(-0.12, torsoY + 0.02, -0.13); root.add(quiver);
      for (let i = 0; i < 3; i++) { const fl = mesh(G.cone, lambert(0xcc4433)); fl.scale.set(0.018, 0.05, 0.018); fl.rotation.set(0.4, 0, -0.5); fl.position.set(-0.18 + i * 0.025, torsoY + 0.18, -0.18); root.add(fl); }
    },
  },
  demon_skeleton: {
    base: "humanoid",
    scale: 1.05,
    color: 2843170,
    optionsFn(API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      return { height: 1.15, girth: 0.8, skinMat: lambert(0x2b2622), horns: true, hornColor: 0x171310, weapon: 'sword', weaponBig: true };
    },
    decorate(root, parts, o, tint, API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      const char = lambert(0x2b2622); const ember = lambert(0xff2a1a); const torsoY = parts.baseY;
      // Burning red eye sockets sunk into the charred skull.
      for (const s of [-1, 1]) { const sock = mesh(G.lowSphere, lambert(0x110c0a)); sock.scale.set(0.06, 0.07, 0.05); sock.position.set(s * 0.1, 0.03, 0.17); parts.head.add(sock); const glow = mesh(G.lowSphere, ember); glow.scale.setScalar(0.035); glow.position.set(s * 0.1, 0.03, 0.21); parts.head.add(glow); }
      // Sharp fanged jaw.
      const jaw = mesh(G.dome, char); jaw.scale.set(0.14, 0.08, 0.13); jaw.rotation.x = Math.PI; jaw.position.set(0, -0.11, 0.1); parts.head.add(jaw);
      for (let i = -2; i <= 2; i++) { const t = mesh(G.cone, lambert(0xbcae9a)); t.scale.set(0.014, 0.04, 0.014); t.position.set(i * 0.035, -0.06, 0.18); parts.head.add(t); }
      // Charred rib cage with smoldering cracks (ember dots between ribs).
      for (let i = 0; i < 4; i++) { const rib = mesh(G.torus, char); const rr = 0.15 - i * 0.012; rib.scale.set(rr, rr * 0.8, 0.025); rib.rotation.x = Math.PI / 2; rib.position.set(0, torsoY + 0.12 - i * 0.07, 0); root.add(rib); const crack = mesh(G.lowSphere, ember); crack.scale.setScalar(0.018); crack.position.set(0, torsoY + 0.08 - i * 0.07, 0.13); root.add(crack); }
      const spine = mesh(G.cyl, char); spine.scale.set(0.024, 0.17, 0.024); spine.position.set(0, torsoY, -0.06); root.add(spine);
      // Back blades/spikes erupting from the spine.
      for (let i = 0; i < 3; i++) { const sp = mesh(G.cone, lambert(0x171310)); sp.scale.set(0.03, 0.1 - i * 0.02, 0.03); sp.rotation.x = -2.4; sp.position.set(0, torsoY + 0.14 - i * 0.09, -0.12); root.add(sp); }
    },
  },
  zombie: {
    base: "humanoid",
    scale: 1,
    color: 6982746,
    optionsFn(API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      return { height: 1.0, girth: 1.05, spots: true, spotFactor: 0.55, spotCount: 8, claws: true };
    },
    decorate(root, parts, o, tint, API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      const flesh = lambert(shade(tint, 0.9)); const bone = lambert(0xd8d2c0); const wound = lambert(shade(tint, 0.45)); const torsoY = parts.baseY;
      // Lopsided slack posture: tilt head and one arm so it shambles crookedly.
      parts.head.rotation.z = 0.25; parts.head.position.x += 0.02;
      if (parts.arms[0]) parts.arms[0].rotation.z += 0.35; if (parts.arms[1]) parts.arms[1].rotation.z += 0.1;
      // Hanging open jaw with one dangling tooth.
      const jaw = mesh(G.dome, flesh); jaw.scale.set(0.12, 0.09, 0.1); jaw.rotation.x = Math.PI; jaw.position.set(0, -0.13, 0.09); parts.head.add(jaw);
      const eyeL = mesh(G.lowSphere, lambert(0xeae2c0)); eyeL.scale.setScalar(0.03); eyeL.position.set(-0.08, 0.04, 0.18); parts.head.add(eyeL);
      // Exposed wound: a dark gash on the torso with a poking rib bone.
      const gash = mesh(G.lowSphere, wound); gash.scale.set(0.09, 0.12, 0.05); gash.position.set(0.06, torsoY + 0.02, 0.18); root.add(gash);
      const rib = mesh(G.torus, bone); rib.scale.set(0.06, 0.04, 0.015); rib.rotation.set(Math.PI / 2, 0, 0.3); rib.position.set(0.06, torsoY + 0.03, 0.2); root.add(rib);
      // Decay blotches already on torso via spots; add a few drips down a leg.
      for (let i = 0; i < 2; i++) { const drip = mesh(G.capsule, wound); drip.scale.set(0.02, 0.04, 0.02); drip.position.set(-0.05, torsoY - 0.2 - i * 0.08, 0.12); root.add(drip); }
    },
  },
  ghoul: {
    base: "humanoid",
    scale: 1,
    color: 10133374,
    optionsFn(API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      return { height: 1.05, girth: 0.6, claws: true, skinMat: lambert(0x9aa37e) };
    },
    decorate(root, parts, o, tint, API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      const skin = lambert(0x9aa37e); const bone = lambert(0xcfc8b0); const torsoY = parts.baseY;
      // Gaunt hunched stoop: lean torso forward, head jutting on a long neck.
      root.rotation.x = 0.15; parts.head.position.z += 0.08; parts.head.position.y -= 0.04;
      // Long neck spine connecting hunched head.
      const neck = mesh(G.cyl, skin); neck.scale.set(0.03, 0.08, 0.03); neck.rotation.x = 0.6; neck.position.set(0, torsoY + 0.2, 0.05); root.add(neck);
      // Sunken eyes (big dark hollows) and a wide gaping mouth full of needle teeth.
      for (const s of [-1, 1]) { const sock = mesh(G.lowSphere, lambert(0x1d201a)); sock.scale.set(0.06, 0.07, 0.04); sock.position.set(s * 0.09, 0.04, 0.16); parts.head.add(sock); const pup = mesh(G.lowSphere, lambert(0xf0e87a)); pup.scale.setScalar(0.018); pup.position.set(s * 0.09, 0.04, 0.19); parts.head.add(pup); }
      const maw = mesh(G.lowSphere, lambert(0x2a1410)); maw.scale.set(0.08, 0.06, 0.05); maw.position.set(0, -0.06, 0.16); parts.head.add(maw);
      for (let i = -2; i <= 2; i++) { const t = mesh(G.cone, lambert(0xeae0c8)); t.scale.set(0.01, 0.035, 0.01); t.position.set(i * 0.028, -0.02, 0.2); t.rotation.x = 0.2; parts.head.add(t); const bt = mesh(G.cone, lambert(0xeae0c8)); bt.scale.set(0.01, 0.03, 0.01); bt.rotation.x = Math.PI - 0.2; bt.position.set(i * 0.028, -0.1, 0.2); parts.head.add(bt); }
      // Gaunt protruding ribs poking through tight skin.
      for (let i = 0; i < 3; i++) { for (const s of [-1, 1]) { const rib = mesh(G.capsule, bone); rib.scale.set(0.012, 0.06, 0.012); rib.rotation.z = s * 1.4; rib.position.set(s * 0.08, torsoY + 0.05 - i * 0.06, 0.14); root.add(rib); } }
      // Extra-long clawed fingers hanging from the hands.
      for (const arm of parts.arms) { for (let i = -1; i <= 1; i++) { const f = mesh(G.cone, lambert(0xe8ddc0)); f.scale.set(0.01, 0.06, 0.01); f.rotation.x = Math.PI - 0.2; f.position.set(i * 0.02, -0.3, 0.02); arm.add(f); } }
    },
  },
  mummy: {
    base: "humanoid",
    scale: 1,
    color: 13286294,
    optionsFn(API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      return { height: 1.0, girth: 0.95, skinMat: lambert(0xcabd96) };
    },
    decorate(root, parts, o, tint, API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      const wrap = lambert(0xcabd96); const wrapDk = lambert(shade(0xcabd96, 0.78)); const torsoY = parts.baseY; const h = o.height || 1.0;
      // Stiff outstretched arms (classic mummy pose).
      for (const arm of parts.arms) { arm.rotation.x = -1.1; }
      parts.mummyStiff = true;
      // Horizontal bandage bands wrapping the torso (alternating tints = overlapping cloth).
      for (let i = 0; i < 6; i++) { const band = mesh(G.torus, i % 2 ? wrapDk : wrap); const rr = 0.2 - Math.abs(i - 2.5) * 0.012; band.scale.set(rr, rr * 0.9, 0.03); band.rotation.x = Math.PI / 2; band.rotation.z = (i % 2 ? 0.08 : -0.06); band.position.set(0, torsoY + 0.16 - i * 0.07, 0); root.add(band); }
      // Bands wrapping each arm and leg.
      for (const arm of parts.arms) { for (let i = 0; i < 3; i++) { const b = mesh(G.torus, i % 2 ? wrapDk : wrap); b.scale.set(0.06, 0.055, 0.02); b.rotation.x = Math.PI / 2; b.position.set(0, -0.08 - i * 0.08, 0); arm.add(b); } }
      for (const leg of parts.legs) { for (let i = 0; i < 3; i++) { const b = mesh(G.torus, i % 2 ? wrapDk : wrap); b.scale.set(0.085, 0.08, 0.02); b.rotation.x = Math.PI / 2; b.position.set(0, -0.08 - i * 0.08, 0); leg.add(b); } }
      // Bandaged head with one dangling loose end and dark eye slits.
      for (let i = 0; i < 3; i++) { const hb = mesh(G.torus, i % 2 ? wrapDk : wrap); hb.scale.set(0.2 - i * 0.01, 0.2 - i * 0.01, 0.025); hb.rotation.x = Math.PI / 2 + 0.15; hb.position.set(0, 0.08 - i * 0.07, 0); parts.head.add(hb); }
      for (const s of [-1, 1]) { const slit = mesh(G.lowSphere, lambert(0x140f08)); slit.scale.set(0.04, 0.02, 0.03); slit.position.set(s * 0.08, 0.02, 0.18); parts.head.add(slit); }
      const loose = mesh(G.capsule, wrapDk); loose.scale.set(0.02, 0.06, 0.012); loose.rotation.x = 0.3; loose.position.set(0.12, -0.08, 0.12); parts.head.add(loose);
      // Golden amulet hanging on the chest.
      const chain = mesh(G.torus, GOLD); chain.scale.set(0.06, 0.06, 0.012); chain.position.set(0, torsoY + 0.16, 0.14); root.add(chain); const amu = mesh(G.lowSphere, GOLD); amu.scale.set(0.04, 0.05, 0.02); amu.position.set(0, torsoY + 0.08, 0.18); root.add(amu); const gem = mesh(G.lowSphere, lambert(0x33bbcc)); gem.scale.setScalar(0.018); gem.position.set(0, torsoY + 0.08, 0.2); root.add(gem);
    },
  },
  pharaoh_mummy: {
    base: "humanoid",
    scale: 1.3,
    color: 13023368,
    optionsFn(API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      return { height: 1.35, girth: 1.0, skinMat: lambert(0xc6b888), weapon: 'mace', weaponOpts: { mat: GOLD } };
    },
    decorate(root, parts, o, tint, API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      const wrap = lambert(0xc6b888); const wrapDk = lambert(shade(0xc6b888, 0.78)); const blue = lambert(0x1f6fb0); const torsoY = parts.baseY; const hs = 0.2 * 1.0;
      // Bandage bands on torso and limbs (regal mummy under the regalia).
      for (let i = 0; i < 6; i++) { const band = mesh(G.torus, i % 2 ? wrapDk : wrap); const rr = 0.22 - Math.abs(i - 2.5) * 0.012; band.scale.set(rr, rr * 0.9, 0.03); band.rotation.x = Math.PI / 2; band.position.set(0, torsoY + 0.18 - i * 0.075, 0); root.add(band); }
      for (const leg of parts.legs) { for (let i = 0; i < 3; i++) { const b = mesh(G.torus, i % 2 ? wrapDk : wrap); b.scale.set(0.09, 0.085, 0.02); b.rotation.x = Math.PI / 2; b.position.set(0, -0.1 - i * 0.09, 0); leg.add(b); } }
      // NEMES HEADDRESS: striped gold-and-blue cloth flaring out behind the skull.
      const nemes = mesh(G.dome, GOLD); nemes.scale.set(hs * 1.5, hs * 1.6, hs * 1.5); nemes.position.y = hs * 0.15; parts.head.add(nemes);
      for (let i = 0; i < 4; i++) { const stripe = mesh(G.torus, blue); stripe.scale.set(hs * (1.5 - i * 0.18), hs * (1.5 - i * 0.18), 0.012); stripe.rotation.x = Math.PI / 2 + 0.2; stripe.position.y = hs * (0.5 - i * 0.28); parts.head.add(stripe); }
      // Side lappets framing the face (the iconic shoulder-length flaps).
      for (const s of [-1, 1]) { const lap = mesh(G.sphere, GOLD); lap.scale.set(hs * 0.35, hs * 0.9, hs * 0.25); lap.position.set(s * hs * 1.0, -hs * 0.3, hs * 0.4); parts.head.add(lap); const ls = mesh(G.sphere, blue); ls.scale.set(hs * 0.36, hs * 0.3, hs * 0.26); ls.position.set(s * hs * 1.0, -hs * 0.55, hs * 0.4); parts.head.add(ls); }
      // URAEUS: a rearing cobra on the brow.
      const cobraBase = mesh(G.capsule, GOLD); cobraBase.scale.set(0.018, 0.05, 0.018); cobraBase.rotation.x = -0.4; cobraBase.position.set(0, hs * 0.7, hs * 0.95); parts.head.add(cobraBase); const hood = mesh(G.dome, blue); hood.scale.set(0.04, 0.04, 0.02); hood.position.set(0, hs * 0.95, hs * 1.0); parts.head.add(hood);
      // FALSE BEARD: a braided gold cone hanging from the chin.
      const beard = mesh(G.cone, GOLD); beard.scale.set(0.025, 0.1, 0.02); beard.rotation.x = Math.PI - 0.1; beard.position.set(0, -hs * 0.7, hs * 0.6); parts.head.add(beard);
      // Dark eye slits with kohl gold edges.
      for (const s of [-1, 1]) { const slit = mesh(G.lowSphere, lambert(0x100b06)); slit.scale.set(0.05, 0.022, 0.03); slit.position.set(s * 0.08, 0.02, 0.18); parts.head.add(slit); }
      // Broad gold ceremonial collar (usekh) across the shoulders/chest.
      const collar = mesh(G.dome, GOLD); collar.scale.set(0.24, 0.12, 0.18); collar.rotation.x = -0.3; collar.position.set(0, torsoY + 0.16, 0.06); root.add(collar);
      for (let i = -2; i <= 2; i++) { const bead = mesh(G.lowSphere, blue); bead.scale.setScalar(0.018); bead.position.set(i * 0.05, torsoY + 0.1, 0.2); root.add(bead); }
    },
  },
  crypt_shambler: {
    base: "humanoid",
    scale: 1.05,
    color: 8227430,
    optionsFn(API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      return { height: 1.1, girth: 1.3, skinMat: lambert(0x7d8a66) };
    },
    decorate(root, parts, o, tint, API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      const skinA = lambert(0x7d8a66); const skinB = lambert(0x8a7d63); const skinC = lambert(0x6f8470); const stitch = lambert(0x2a241c); const bone = lambert(0xd0c8b0); const torsoY = parts.baseY;
      // A stitched amalgam: mismatched body lumps grafted onto the torso, each a different flesh tone.
      const lumpMats = [skinB, skinC, skinB, skinA];
      const lumpPos = [[0.16, torsoY + 0.1, 0.08], [-0.15, torsoY - 0.04, 0.1], [0.1, torsoY - 0.16, -0.05], [-0.1, torsoY + 0.16, -0.04]];
      for (let i = 0; i < lumpPos.length; i++) { const lump = mesh(G.sphere, lumpMats[i]); const sc = 0.09 + (i % 2) * 0.03; lump.scale.set(sc, sc * 0.85, sc); lump.position.set(...lumpPos[i]); root.add(lump); }
      // Crude stitch seams (rows of tiny dark studs) snaking across the torso.
      for (let i = 0; i < 7; i++) { const knot = mesh(G.lowSphere, stitch); knot.scale.setScalar(0.012); knot.position.set(Math.sin(i * 1.3) * 0.1, torsoY + 0.18 - i * 0.05, 0.18); root.add(knot); }
      // One arm is a bare bone (mismatched limb); recolor a claw bone poking from a shoulder.
      if (parts.arms[0]) { const boneArm = mesh(G.capsule, bone); boneArm.scale.set(0.05, 0.11, 0.05); boneArm.position.y = -0.13; parts.arms[0].add(boneArm); }
      // Two heads-worth: a second small grafted head/skull lolling on the shoulder.
      const skull2 = mesh(G.sphere, bone); skull2.scale.set(0.1, 0.1, 0.11); skull2.position.set(0.16, torsoY + 0.24, 0.04); skull2.rotation.z = 0.5; root.add(skull2); for (const s of [-1, 1]) { const e = mesh(G.lowSphere, lambert(0x1a160f)); e.scale.setScalar(0.022); e.position.set(0.16 + s * 0.03, torsoY + 0.25, 0.13); root.add(e); }
      // Mismatched eyes on the main head (one big, one small) + sewn mouth line.
      for (let i = 0; i < 5; i++) { const m = mesh(G.lowSphere, stitch); m.scale.setScalar(0.01); m.position.set((i - 2) * 0.025, -0.07, 0.18); parts.head.add(m); }
      // Lumpy uneven shoulders.
      const shoulderL = mesh(G.sphere, skinC); shoulderL.scale.set(0.13, 0.1, 0.13); shoulderL.position.set(-0.22, torsoY + 0.2, 0); root.add(shoulderL);
    },
  },
  bonebeast: {
    base: "quadruped",
    scale: 1.15,
    color: 14998472,
    optionsFn(API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      return { height: 1.0, len: 0.62, bodyR: 0.17, legLen: 0.32, snout: true, tail: true, legMat: lambert(0xe4ddc8) };
    },
    decorate(root, parts, o, tint, API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      const bone = lambert(0xe4ddc8); const dark = lambert(0x2a2620); const ember = lambert(0xff5a2a); const r = o.bodyR || 0.17; const len = o.len || 0.62; const bodyY = (o.legLen || 0.32) + r * 0.6;
      // Exposed rib cage hoops along the spine (the body reads as bones, not flesh).
      for (let i = 0; i < 5; i++) { const rib = mesh(G.torus, bone); const rr = r * (1.05 - Math.abs(i - 2) * 0.06); rib.scale.set(rr, rr * 0.95, 0.022); rib.rotation.set(0, 0, Math.PI / 2); rib.position.set(0, bodyY, len * 0.32 - i * (len * 0.16)); root.add(rib); }
      // Spine ridge running front-to-back.
      for (let i = 0; i < 6; i++) { const vert = mesh(G.lowSphere, bone); vert.scale.setScalar(0.03); vert.position.set(0, bodyY + r * 0.9, len * 0.36 - i * (len * 0.14)); root.add(vert); }
      // Jagged bone spikes erupting from the back.
      for (let i = 0; i < 4; i++) { const sp = mesh(G.cone, bone); sp.scale.set(0.025, 0.12 - i * 0.012, 0.025); sp.position.set(0, bodyY + r * 1.1, len * 0.24 - i * (len * 0.18)); root.add(sp); }
      // Skull-ify the head: hollow eye sockets glowing ember + bared fangs on the snout.
      for (const s of [-1, 1]) { const sock = mesh(G.lowSphere, dark); sock.scale.set(0.045, 0.05, 0.035); sock.position.set(s * r * 0.4, r * 0.2, r * 0.55); parts.head.add(sock); const glow = mesh(G.lowSphere, ember); glow.scale.setScalar(0.02); glow.position.set(s * r * 0.4, r * 0.2, r * 0.62); parts.head.add(glow); }
      for (let i = -1; i <= 1; i++) { const fang = mesh(G.cone, bone); fang.scale.set(0.012, 0.04, 0.012); fang.rotation.x = Math.PI; fang.position.set(i * 0.03, -r * 0.2, r * 0.9); parts.head.add(fang); }
      // Bone tail tip spike.
      if (parts.tail) { const spike = mesh(G.cone, bone); spike.scale.set(0.02, 0.06, 0.02); spike.position.y = 0.1; parts.tail.add(spike); }
    },
  },
  ghost: {
    base: "floater",
    scale: 1,
    color: 13426158,
    optionsFn(API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      return { bodyR: 0.24, hover: 0.6, tendrils: 4 };
    },
    decorate(root, parts, o, tint, API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      // Make the whole ghost translucent and pale-blue glowing.
      root.traverse((m) => { if (m.isMesh && m.material && m.material.color) { m.material.transparent = true; m.material.opacity = 0.55; } });
      const dome = parts.dome; const hover = parts.hover; const ghostMat = lambert(shade(tint, 1.15)); ghostMat.transparent = true; ghostMat.opacity = 0.5;
      // A ragged wavy lower hem instead of straight tendrils (sheet-ghost tail look).
      for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; const lobe = mesh(G.cone, ghostMat); lobe.scale.set(0.05, 0.16, 0.05); lobe.rotation.x = Math.PI; lobe.position.set(Math.cos(a) * 0.16, hover - 0.18, Math.sin(a) * 0.16); root.add(lobe); }
      // Hollow mournful mouth — a small dark oval.
      const mouth = mesh(G.lowSphere, lambert(0x1a2230)); mouth.material.transparent = true; mouth.material.opacity = 0.6; mouth.scale.set(0.04, 0.06, 0.03); mouth.position.set(0, hover - 0.02, 0.22); root.add(mouth);
      // Faint outer aura shell.
      const aura = mesh(G.dome, ghostMat); aura.scale.set(0.3, 0.34, 0.3); aura.position.y = hover; aura.material.opacity = 0.18; root.add(aura);
    },
  },
  tarnished_spirit: {
    base: "floater",
    scale: 1,
    color: 8377930,
    optionsFn(API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      return { bodyR: 0.23, hover: 0.6, tendrils: 5 };
    },
    decorate(root, parts, o, tint, API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      // Sickly toxic-green translucent spirit with dripping ectoplasm.
      const sick = lambert(0x7fd24a);
      root.traverse((m) => { if (m.isMesh && m.material && m.material.color) { m.material.color.copy(new THREE.Color(0x6fbf3e)); m.material.transparent = true; m.material.opacity = 0.55; } });
      const hover = parts.hover; sick.transparent = true; sick.opacity = 0.5;
      // Drips of corruption sagging off the lower body.
      for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + 0.4; const drip = mesh(G.capsule, sick); drip.scale.set(0.022, 0.07 + (i % 2) * 0.03, 0.022); drip.position.set(Math.cos(a) * 0.13, hover - 0.22 - (i % 2) * 0.04, Math.sin(a) * 0.13); root.add(drip); const bead = mesh(G.lowSphere, sick); bead.scale.setScalar(0.025); bead.position.set(Math.cos(a) * 0.13, hover - 0.32 - (i % 2) * 0.04, Math.sin(a) * 0.13); root.add(bead); }
      // Sunken sickly glowing eyes (override-y: extra bright pupils).
      for (const s of [-1, 1]) { const glow = mesh(G.lowSphere, lambert(0xd6ff7a)); glow.scale.setScalar(0.025); glow.position.set(s * 0.08, hover + 0.05, 0.2); root.add(glow); }
      // A few pock blotches of darker rot on the dome.
      addSpots(parts.dome, 0.24, 0x4a7a28, 5, 0.6);
    },
  },
  banshee: {
    base: "floater",
    scale: 1,
    color: 11193599,
    optionsFn(API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      return { bodyR: 0.2, hover: 0.65, tendrils: 0, noEyes: true };
    },
    decorate(root, parts, o, tint, API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      const spectral = lambert(shade(tint, 1.1)); spectral.transparent = true; spectral.opacity = 0.6; const hover = parts.hover;
      root.traverse((m) => { if (m.isMesh && m.material && m.material.color) { m.material.transparent = true; m.material.opacity = 0.55; } });
      // A gaunt spectral FACE on the dome: hollow eyes, hollow cheeks, and a wide screaming mouth.
      for (const s of [-1, 1]) { const eye = mesh(G.lowSphere, lambert(0x0e1622)); eye.material.transparent = true; eye.material.opacity = 0.8; eye.scale.set(0.04, 0.06, 0.03); eye.position.set(s * 0.07, hover + 0.04, 0.18); root.add(eye); const cheek = mesh(G.lowSphere, lambert(shade(tint, 0.85))); cheek.material.transparent = true; cheek.material.opacity = 0.4; cheek.scale.set(0.035, 0.05, 0.02); cheek.position.set(s * 0.09, hover - 0.06, 0.16); root.add(cheek); }
      const scream = mesh(G.lowSphere, lambert(0x0a0f18)); scream.material.transparent = true; scream.material.opacity = 0.85; scream.scale.set(0.045, 0.09, 0.03); scream.position.set(0, hover - 0.08, 0.18); root.add(scream);
      // Long flowing spectral HAIR streaming back and down (the signature wailing woman look).
      for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI - Math.PI / 2; const strand = mesh(G.capsule, spectral); const ln = 0.22 + (i % 3) * 0.06; strand.scale.set(0.022, ln, 0.018); strand.rotation.set(0.5, 0, Math.sin(a) * 0.5); strand.position.set(Math.sin(a) * 0.18, hover - 0.05 - ln * 0.4, -0.1 - Math.cos(a) * 0.05); root.add(strand); }
      // Tattered gown lobes trailing below.
      for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; const lobe = mesh(G.cone, spectral); lobe.scale.set(0.05, 0.2, 0.05); lobe.rotation.x = Math.PI; lobe.position.set(Math.cos(a) * 0.14, hover - 0.26, Math.sin(a) * 0.14); root.add(lobe); }
      // Outstretched ghostly arms reaching forward.
      for (const s of [-1, 1]) { const arm = mesh(G.capsule, spectral); arm.scale.set(0.025, 0.13, 0.025); arm.rotation.set(1.0, 0, s * 0.3); arm.position.set(s * 0.18, hover - 0.04, 0.12); root.add(arm); }
    },
  },
  wraith: {
    base: "floater",
    scale: 1,
    color: 4477270,
    optionsFn(API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      return { bodyR: 0.24, hover: 0.65, tendrils: 5, noEyes: true };
    },
    decorate(root, parts, o, tint, API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      const cloak = lambert(shade(tint, 0.7)); const hover = parts.hover; const r = 0.24;
      root.traverse((m) => { if (m.isMesh && m.material && m.material.color) { m.material.transparent = true; m.material.opacity = 0.78; } });
      // A deep dark HOOD: a cone shroud over an empty void where a face should be.
      const hood = mesh(G.cone, cloak); hood.scale.set(0.26, 0.34, 0.26); hood.position.y = hover + 0.04; root.add(hood);
      // Void inside the hood with two cold pinpoint eyes.
      const voidF = mesh(G.lowSphere, lambert(0x05070a)); voidF.scale.set(0.1, 0.13, 0.06); voidF.position.set(0, hover, 0.16); root.add(voidF);
      for (const s of [-1, 1]) { const eye = mesh(G.lowSphere, lambert(0x66d0ff)); eye.scale.setScalar(0.018); eye.position.set(s * 0.05, hover + 0.02, 0.2); root.add(eye); }
      // Flowing dark cloak skirts replacing the tendrils with ragged trailing cloth.
      for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; const rag = mesh(G.cone, cloak); rag.material.transparent = true; rag.material.opacity = 0.7; const ln = 0.22 + (i % 2) * 0.1; rag.scale.set(0.06, ln, 0.06); rag.rotation.set(Math.PI - Math.sin(a) * 0.3, 0, Math.cos(a) * 0.3); rag.position.set(Math.cos(a) * 0.16, hover - 0.2 - ln * 0.3, Math.sin(a) * 0.16); root.add(rag); }
      // Skeletal claw hand emerging from a sleeve.
      for (let i = -1; i <= 1; i++) { const f = mesh(G.cone, lambert(0xcfc8b0)); f.scale.set(0.012, 0.05, 0.012); f.rotation.x = 1.4; f.position.set(0.18 + i * 0.02, hover - 0.06, 0.16); root.add(f); }
    },
  },
  necromancer: {
    base: "humanoid",
    scale: 1.05,
    color: 14013632,
    optionsFn(API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      return { height: 1.05, girth: 0.85, hood: true, hoodColor: 0x2a2438, skinMat: lambert(0xd8d2c0), weapon: 'staff', weaponOpts: { orb: 0x66ff88 } };
    },
    decorate(root, parts, o, tint, API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      const robe = lambert(0x352d4a); const robeDk = lambert(0x231d33); const bone = lambert(0xd8d2c0); const torsoY = parts.baseY; const h = o.height || 1.05;
      // Long flowing dark robe replacing the legs (a draped cone skirt to the floor).
      const skirt = mesh(G.cone, robe); skirt.scale.set(0.26, 0.5, 0.22); skirt.position.y = 0.25; root.add(skirt);
      for (const leg of parts.legs) { leg.visible = false; }
      parts.robedSkirt = skirt;
      // Robe body over the torso.
      const torsoRobe = mesh(G.capsule, robe); torsoRobe.scale.set(0.22, 0.22, 0.19); torsoRobe.position.set(0, torsoY, 0); root.add(torsoRobe);
      // Deep void inside the hood with two green skull-glow eyes.
      const voidF = mesh(G.lowSphere, lambert(0x07090c)); voidF.scale.set(0.11, 0.13, 0.06); voidF.position.set(0, 0, 0.14); parts.head.add(voidF);
      for (const s of [-1, 1]) { const glow = mesh(G.lowSphere, lambert(0x5cff8a)); glow.scale.setScalar(0.022); glow.position.set(s * 0.05, 0.02, 0.19); parts.head.add(glow); }
      // Skeletal jaw peeking from under the hood.
      const jaw = mesh(G.dome, bone); jaw.scale.set(0.08, 0.05, 0.07); jaw.rotation.x = Math.PI; jaw.position.set(0, -0.1, 0.1); parts.head.add(jaw);
      // Bony skeletal hands at the sleeves.
      for (const arm of parts.arms) { const sleeve = mesh(G.cone, robeDk); sleeve.scale.set(0.06, 0.1, 0.06); sleeve.rotation.x = Math.PI; sleeve.position.y = -0.18; arm.add(sleeve); const hand = mesh(G.lowSphere, bone); hand.scale.setScalar(0.035); hand.position.y = -0.26; arm.add(hand); }
      // Floating green soul-wisps orbiting the necromancer (summoning aura).
      for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; const wisp = mesh(G.lowSphere, lambert(0x5cff8a)); wisp.scale.setScalar(0.025); wisp.position.set(Math.cos(a) * 0.3, torsoY + 0.1 + Math.sin(a) * 0.15, Math.sin(a) * 0.3); root.add(wisp); }
    },
  },
  lich: {
    base: "humanoid",
    scale: 1.4,
    color: 13620692,
    optionsFn(API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      return { height: 1.2, girth: 0.8, skinMat: lambert(0xcfd4d0), weapon: 'staff', weaponOpts: { orb: 0x9b4dff }, weaponScale: 1.2 };
    },
    decorate(root, parts, o, tint, API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      const robe = lambert(0x241a33); const robeTrim = lambert(0x6a3fb0); const bone = lambert(0xd6dbd4); const rune = lambert(0x9b4dff); const torsoY = parts.baseY; const hs = 0.2; const headY = parts.head.position.y;
      // Flowing arch-robe: skirt to the floor, legs hidden.
      const skirt = mesh(G.cone, robe); skirt.scale.set(0.28, 0.58, 0.24); skirt.position.y = 0.29; root.add(skirt);
      for (const leg of parts.legs) leg.visible = false;
      const torsoRobe = mesh(G.capsule, robe); torsoRobe.scale.set(0.24, 0.24, 0.2); torsoRobe.position.set(0, torsoY, 0); root.add(torsoRobe);
      // Purple rune sigils carved/glowing down the front of the robe.
      for (let i = 0; i < 4; i++) { const r1 = mesh(G.lowSphere, rune); r1.scale.set(0.02, 0.02, 0.01); r1.position.set(0, torsoY + 0.12 - i * 0.1, 0.21); root.add(r1); for (const s of [-1, 1]) { const r2 = mesh(G.lowSphere, rune); r2.scale.setScalar(0.012); r2.position.set(s * 0.04, torsoY + 0.07 - i * 0.1, 0.21); root.add(r2); } }
      // Bare grinning skull face: hollow sockets with cold purple fire, bony jaw + teeth.
      for (const s of [-1, 1]) { const sock = mesh(G.lowSphere, lambert(0x0c0a12)); sock.scale.set(0.055, 0.065, 0.045); sock.position.set(s * 0.09, 0.04, 0.16); parts.head.add(sock); const fire = mesh(G.lowSphere, rune); fire.scale.setScalar(0.03); fire.position.set(s * 0.09, 0.04, 0.2); parts.head.add(fire); }
      const jaw = mesh(G.dome, bone); jaw.scale.set(0.13, 0.07, 0.12); jaw.rotation.x = Math.PI; jaw.position.set(0, -0.11, 0.09); parts.head.add(jaw); for (let i = -2; i <= 2; i++) { const t = mesh(G.cone, bone); t.scale.set(0.012, 0.03, 0.012); t.position.set(i * 0.03, -0.06, 0.16); parts.head.add(t); }
      // Iron CROWN of jagged spikes on the skull.
      const band = mesh(G.torus, lambert(0x4a4a55)); band.scale.set(hs * 1.05, hs * 1.05, 0.03); band.rotation.x = Math.PI / 2; band.position.y = hs * 0.55; parts.head.add(band); for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI - Math.PI / 2; const spike = mesh(G.cone, lambert(0x4a4a55)); spike.scale.set(0.018, 0.07 - Math.abs(i - 2) * 0.012, 0.018); spike.position.set(Math.sin(a) * hs * 0.95, hs * 0.75, Math.cos(a) * hs * 0.5 + 0.02); parts.head.add(spike); const gem = mesh(G.lowSphere, rune); gem.scale.setScalar(0.012); gem.position.set(Math.sin(a) * hs * 0.95, hs * 0.85 - Math.abs(i - 2) * 0.012, Math.cos(a) * hs * 0.5 + 0.02); parts.head.add(gem); }
      // Energy AURA: a ring of orbiting purple motes around the lich.
      for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; const mote = mesh(G.lowSphere, rune); mote.scale.setScalar(0.02 + (i % 2) * 0.012); mote.position.set(Math.cos(a) * 0.34, torsoY + Math.sin(i * 1.7) * 0.2, Math.sin(a) * 0.34); root.add(mote); }
      // Bony sleeve-hands.
      for (const arm of parts.arms) { const sleeve = mesh(G.cone, robe); sleeve.scale.set(0.06, 0.1, 0.06); sleeve.rotation.x = Math.PI; sleeve.position.y = -0.18; arm.add(sleeve); const hand = mesh(G.lowSphere, bone); hand.scale.setScalar(0.035); hand.position.y = -0.25; arm.add(hand); }
    },
  },
  grim_reaper: {
    base: "humanoid",
    scale: 1.9,
    color: 1310743,
    optionsFn(API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      return { height: 1.3, girth: 0.85, hood: true, hoodColor: 0x141017, skinMat: lambert(0xd8d2c0) };
    },
    decorate(root, parts, o, tint, API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      const robe = lambert(0x141017); const robeDk = lambert(0x0a0810); const bone = lambert(0xd8d2c0); const torsoY = parts.baseY; const h = o.height || 1.3;
      // Floor-length black tattered robe; hide the legs.
      const skirt = mesh(G.cone, robe); skirt.scale.set(0.3, 0.62, 0.26); skirt.position.y = 0.31; root.add(skirt);
      for (const leg of parts.legs) leg.visible = false;
      const torsoRobe = mesh(G.capsule, robe); torsoRobe.scale.set(0.24, 0.26, 0.2); torsoRobe.position.set(0, torsoY, 0); root.add(torsoRobe);
      // Ragged tattered hem lobes.
      for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; const rag = mesh(G.cone, robeDk); rag.scale.set(0.05, 0.16 + (i % 2) * 0.06, 0.05); rag.rotation.x = Math.PI; rag.position.set(Math.cos(a) * 0.18, 0.06, Math.sin(a) * 0.16); root.add(rag); }
      // Empty black void under the hood with two cold-white pinprick eyes.
      const voidF = mesh(G.lowSphere, lambert(0x000000)); voidF.scale.set(0.12, 0.14, 0.06); voidF.position.set(0, 0, 0.14); parts.head.add(voidF);
      for (const s of [-1, 1]) { const eye = mesh(G.lowSphere, lambert(0xeafcff)); eye.scale.setScalar(0.02); eye.position.set(s * 0.05, 0.02, 0.19); parts.head.add(eye); }
      // Skeletal claw hands from the sleeves.
      for (const arm of parts.arms) { const sleeve = mesh(G.cone, robe); sleeve.scale.set(0.07, 0.11, 0.07); sleeve.rotation.x = Math.PI; sleeve.position.y = -0.18; arm.add(sleeve); for (let i = -1; i <= 1; i++) { const f = mesh(G.cone, bone); f.scale.set(0.01, 0.05, 0.01); f.rotation.x = Math.PI - 0.2; f.position.set(i * 0.02, -0.28, 0.02); arm.add(f); } }
      // THE SCYTHE: built into the RIGHT hand pivot so the attack arm-swing reaps it.
      const hand = parts.arms[parts.arms.length - 1]; const scythe = new THREE.Group(); scythe.position.set(parts.handR * 1.1, parts.handY, parts.handR * 1.8); scythe.rotation.x = 0.4;
      const shaft = mesh(G.cyl, lambert(0x2a1d12)); shaft.scale.set(0.018, 0.55, 0.018); shaft.position.y = 0.3; scythe.add(shaft);
      // Curved blade: a quarter-torus arc sweeping off the top of the shaft.
      const blade = mesh(G.torus, STEEL); blade.scale.set(0.22, 0.22, 0.02); blade.rotation.set(Math.PI / 2, 0, 0); blade.position.set(0.18, 0.82, 0); scythe.add(blade);
      // Inner cutting edge highlight + a sharp tip cone.
      const edge = mesh(G.torus, lambert(0xe8eef2)); edge.scale.set(0.2, 0.2, 0.008); edge.rotation.set(Math.PI / 2, 0, 0); edge.position.set(0.18, 0.82, 0.012); scythe.add(edge);
      const tip = mesh(G.cone, STEEL); tip.scale.set(0.02, 0.08, 0.02); tip.rotation.z = 1.6; tip.position.set(0.38, 0.84, 0); scythe.add(tip);
      // Iron collar binding blade to shaft.
      const collar = mesh(G.cyl, lambert(0x4a4a52)); collar.scale.set(0.025, 0.04, 0.025); collar.position.y = 0.58; scythe.add(collar);
      hand.add(scythe);
    },
  },
  vampire: {
    base: "humanoid",
    scale: 1.05,
    color: 15261924,
    optionsFn(API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      return { height: 1.1, girth: 0.85, hair: true, hairColor: 0x0e0e0e, skinMat: lambert(0xe8e0e4) };
    },
    decorate(root, parts, o, tint, API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      const pale = lambert(0xe8e0e4); const cape = lambert(0x2a0510); const capeRed = lambert(0x6a0a1a); const torsoY = parts.baseY; const hs = 0.2;
      // Pale aristocratic skin already set; add slicked-back widow's-peak hair line.
      const peak = mesh(G.cone, lambert(0x0e0e0e)); peak.scale.set(0.03, 0.06, 0.02); peak.rotation.x = 0.2; peak.position.set(0, 0.06, 0.18); parts.head.add(peak);
      // Glowing red eyes.
      for (const s of [-1, 1]) { const eye = mesh(G.lowSphere, lambert(0xff2030)); eye.scale.setScalar(0.022); eye.position.set(s * 0.075, 0.03, 0.19); parts.head.add(eye); }
      // Two white FANGS jutting from the mouth.
      for (const s of [-1, 1]) { const fang = mesh(G.cone, lambert(0xfdfbf4)); fang.scale.set(0.01, 0.035, 0.01); fang.rotation.x = Math.PI; fang.position.set(s * 0.03, -0.08, 0.17); parts.head.add(fang); }
      // HIGH-COLLARED CAPE: a tall flared collar behind the head + a long cloak draping the back.
      const collarL = mesh(G.cone, cape); collarL.scale.set(0.12, 0.16, 0.06); collarL.rotation.set(-0.3, 0, -0.5); collarL.position.set(-0.1, torsoY + 0.28, -0.06); root.add(collarL);
      const collarR = mesh(G.cone, cape); collarR.scale.set(0.12, 0.16, 0.06); collarR.rotation.set(-0.3, 0, 0.5); collarR.position.set(0.1, torsoY + 0.28, -0.06); root.add(collarR);
      // The cloak itself: a broad draped sheet down the back, red inner lining.
      const cloak = mesh(G.sphere, cape); cloak.scale.set(0.26, 0.42, 0.14); cloak.position.set(0, torsoY - 0.08, -0.16); root.add(cloak);
      const lining = mesh(G.sphere, capeRed); lining.scale.set(0.22, 0.4, 0.1); lining.position.set(0, torsoY - 0.06, -0.12); root.add(lining);
      // Cloak flares into two points at the bottom hem.
      for (const s of [-1, 1]) { const point = mesh(G.cone, cape); point.scale.set(0.08, 0.18, 0.05); point.rotation.x = Math.PI; point.position.set(s * 0.12, torsoY - 0.34, -0.14); root.add(point); }
      // A blood-red gem brooch clasping the cape at the throat.
      const brooch = mesh(G.lowSphere, lambert(0xcc1020)); brooch.scale.setScalar(0.025); brooch.position.set(0, torsoY + 0.18, 0.12); root.add(brooch);
    },
  },
  demon: {
    base: "humanoid",
    scale: 1.9,
    color: 11542801,
    optionsFn(API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      return { height: 1.35, girth: 1.35, horns: true, hornColor: 0x1a0a0a, ears: true, claws: true, shoulders: true, armorColor: 0x4a0a0a, tint: 0xaa1111 };
    },
    decorate(root, parts, o, tint, API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      const wingMat = lambert(shade(tint, 0.45)); parts.wings = []; const wy = (parts.baseY || 0.85) + 0.12; for (const s of [-1, 1]) { const pivot = new THREE.Group(); pivot.position.set(s * 0.22, wy, -0.12); const arm = mesh(G.capsule, wingMat); arm.scale.set(0.42, 0.05, 0.05); arm.rotation.z = s * 0.2; arm.position.x = s * 0.34; pivot.add(arm); const membrane = mesh(G.sphere, wingMat); membrane.scale.set(0.4, 0.05, 0.34); membrane.position.set(s * 0.34, -0.08, -0.04); pivot.add(membrane); for (let f = 0; f < 3; f++) { const finger = mesh(G.cone, wingMat); finger.scale.set(0.02, 0.18, 0.02); finger.position.set(s * (0.18 + f * 0.18), -0.18 - f * 0.04, -0.05); finger.rotation.x = -2.4; pivot.add(finger); } root.add(pivot); parts.wings.push({ pivot, side: s }); } const tail = new THREE.Group(); tail.position.set(0, parts.baseY * 0.7, -0.18); for (let i = 0; i < 4; i++) { const seg = mesh(G.sphere, lambert(tint)); seg.scale.setScalar(0.06 - i * 0.01); seg.position.set(0, -i * 0.08, -i * 0.05); tail.add(seg); } const barb = mesh(G.cone, lambert(shade(tint, 0.5))); barb.scale.set(0.05, 0.1, 0.02); barb.position.set(0, -0.32, -0.2); barb.rotation.x = -2.6; tail.add(barb); root.add(tail); const goat = mesh(G.cone, lambert(shade(tint, 0.55))); goat.scale.set(0.04, 0.09, 0.04); goat.position.set(0, parts.baseY + 0.42, 0.18); goat.rotation.x = 0.3; parts.head.add(goat); for (const s of [-1, 1]) { const ember = mesh(G.lowSphere, lambert(0xff7722)); ember.scale.setScalar(0.05); ember.position.set(s * 0.2, parts.baseY + 1.05, 0.1); root.add(ember); } const w = giveWeapon(parts, 'trident', { mat: lambert(shade(tint, 0.4)), scale: 1.1, armLen: parts.armLen }); if (w) { const fire = mesh(G.cone, lambert(0xff8833)); fire.scale.set(0.08, 0.2, 0.08); fire.position.y = 1.2; w.grip.children[0].add(fire); }
    },
  },
  lesser_demon: {
    base: "humanoid",
    scale: 1.4,
    color: 12263441,
    optionsFn(API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      return { height: 1.05, girth: 1.1, horns: true, hornColor: 0x2a0a0a, ears: true, claws: true, tint: 0xbb2211 };
    },
    decorate(root, parts, o, tint, API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      const wingMat = lambert(shade(tint, 0.5)); parts.wings = []; const wy = (parts.baseY || 0.7) + 0.08; for (const s of [-1, 1]) { const pivot = new THREE.Group(); pivot.position.set(s * 0.18, wy, -0.1); const membrane = mesh(G.sphere, wingMat); membrane.scale.set(0.3, 0.04, 0.24); membrane.position.set(s * 0.26, -0.04, -0.03); pivot.add(membrane); for (let f = 0; f < 2; f++) { const finger = mesh(G.cone, wingMat); finger.scale.set(0.018, 0.13, 0.018); finger.position.set(s * (0.16 + f * 0.16), -0.14, -0.04); finger.rotation.x = -2.4; pivot.add(finger); } root.add(pivot); parts.wings.push({ pivot, side: s }); } const tail = new THREE.Group(); tail.position.set(0, parts.baseY * 0.7, -0.14); for (let i = 0; i < 3; i++) { const seg = mesh(G.sphere, lambert(tint)); seg.scale.setScalar(0.05 - i * 0.01); seg.position.set(0, -i * 0.06, -i * 0.04); tail.add(seg); } const barb = mesh(G.cone, lambert(shade(tint, 0.5))); barb.scale.set(0.04, 0.08, 0.02); barb.position.set(0, -0.22, -0.16); barb.rotation.x = -2.6; tail.add(barb); root.add(tail); const w = giveWeapon(parts, 'trident', { mat: lambert(shade(tint, 0.45)), scale: 0.85, armLen: parts.armLen });
    },
  },
  demon_lord: {
    base: "humanoid",
    scale: 2.8,
    color: 5570560,
    optionsFn(API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      return { height: 1.6, girth: 1.7, horns: false, ears: true, claws: true, shoulders: true, armorColor: 0x1a0000, belly: true, bellyColor: 0x3a0808, tint: 0x550000 };
    },
    decorate(root, parts, o, tint, API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      const dark = lambert(shade(tint, 0.6)); const glow = lambert(0xff5511); for (const s of [-1, 1]) { const horn = mesh(G.cone, lambert(0x120606)); horn.scale.set(0.05, 0.34, 0.05); horn.position.set(s * 0.13, parts.baseY + 0.62, -0.04); horn.rotation.z = -s * 0.55; horn.rotation.x = -0.3; parts.head.add(horn); const horn2 = mesh(G.cone, lambert(0x120606)); horn2.scale.set(0.035, 0.18, 0.035); horn2.position.set(s * 0.22, parts.baseY + 0.5, 0); horn2.rotation.z = -s * 1.1; parts.head.add(horn2); } const crown = mesh(G.torus, lambert(0x120606)); crown.scale.set(0.16, 0.16, 0.07); crown.rotation.x = Math.PI / 2; crown.position.set(0, parts.baseY + 0.34, 0); parts.head.add(crown); const wingMat = lambert(shade(tint, 0.8)); parts.wings = []; const wy = (parts.baseY || 1.0) + 0.18; for (const s of [-1, 1]) { const pivot = new THREE.Group(); pivot.position.set(s * 0.28, wy, -0.16); const arm = mesh(G.capsule, lambert(0x1a0606)); arm.scale.set(0.55, 0.06, 0.06); arm.position.x = s * 0.46; arm.rotation.z = s * 0.25; pivot.add(arm); const membrane = mesh(G.sphere, wingMat); membrane.scale.set(0.55, 0.06, 0.46); membrane.position.set(s * 0.46, -0.12, -0.05); pivot.add(membrane); for (let f = 0; f < 4; f++) { const finger = mesh(G.cone, lambert(0x1a0606)); finger.scale.set(0.025, 0.24, 0.025); finger.position.set(s * (0.2 + f * 0.22), -0.24 - f * 0.05, -0.06); finger.rotation.x = -2.4; pivot.add(finger); } root.add(pivot); parts.wings.push({ pivot, side: s }); } const tail = new THREE.Group(); tail.position.set(0, parts.baseY * 0.75, -0.24); for (let i = 0; i < 5; i++) { const seg = mesh(G.sphere, lambert(tint)); seg.scale.setScalar(0.08 - i * 0.012); seg.position.set(0, -i * 0.1, -i * 0.06); tail.add(seg); } const barb = mesh(G.cone, lambert(0x120606)); barb.scale.set(0.07, 0.16, 0.03); barb.position.set(0, -0.46, -0.28); barb.rotation.x = -2.6; tail.add(barb); root.add(tail); addSpots(root.children[0] || parts.head, 0.3, 0xff4400, 8, 1.0); for (let i = 0; i < 7; i++) { const a = (i * 2.39996); const ember = mesh(G.lowSphere, glow); ember.scale.setScalar(0.05 + (i % 3) * 0.015); ember.position.set(Math.cos(a) * 0.28, parts.baseY + 0.2 + Math.sin(a) * 0.3, Math.sin(a) * 0.18); root.add(ember); } const w = giveWeapon(parts, 'trident', { mat: lambert(0x120606), scale: 1.5, armLen: parts.armLen }); if (w) { const fire = mesh(G.cone, lambert(0xff5511)); fire.scale.set(0.12, 0.3, 0.12); fire.position.y = 1.25; w.grip.children[0].add(fire); }
    },
  },
  fire_elemental: {
    base: "floater",
    scale: 1.5,
    color: 16733969,
    optionsFn(API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      return { bodyR: 0.26, hover: 0.5, tendrils: 0, noEyes: true, tint: 0xff5511 };
    },
    decorate(root, parts, o, tint, API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      if (parts.dome) parts.dome.visible = false; const flames = [lambert(0xcc2200), lambert(0xff5500), lambert(0xff9922), lambert(0xffdd44)]; parts.flames = []; const cx = 4; for (let layer = 0; layer < cx; layer++) { const t = layer / (cx - 1); const cone = mesh(G.cone, flames[layer]); const r = 0.26 * (1 - t * 0.55); cone.scale.set(r, 0.32 + t * 0.18, r); cone.position.y = parts.hover - 0.1 + layer * 0.16; root.add(cone); parts.flames.push({ m: cone, base: cone.position.y, phase: layer }); } for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; const lick = mesh(G.cone, flames[1 + (i % 3)]); lick.scale.set(0.05, 0.18, 0.05); lick.position.set(Math.cos(a) * 0.16, parts.hover + 0.05 + (i % 2) * 0.1, Math.sin(a) * 0.16); root.add(lick); parts.flames.push({ m: lick, base: lick.position.y, phase: i + 4 }); } addEyes(root, parts.hover + 0.12, 0.16, 0.07, 0.045);
    },
  },
  fire_devil: {
    base: "humanoid",
    scale: 0.8,
    color: 16737314,
    optionsFn(API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      return { height: 0.6, girth: 0.85, horns: true, hornColor: 0x661100, ears: true, claws: true, tint: 0xff6622 };
    },
    decorate(root, parts, o, tint, API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      const flame = lambert(0xffaa33); const hot = lambert(0xffe066); for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2; const lick = mesh(G.cone, i % 2 ? flame : hot); lick.scale.set(0.04, 0.14, 0.04); lick.position.set(Math.cos(a) * 0.1, parts.baseY + 0.42, Math.sin(a) * 0.05 - 0.02); lick.rotation.x = -0.2; parts.head.add(lick); } const tailFlame = mesh(G.cone, flame); tailFlame.scale.set(0.05, 0.18, 0.05); tailFlame.position.set(0, parts.baseY * 0.6, -0.14); tailFlame.rotation.x = 0.4; root.add(tailFlame); parts.wings = []; const wingMat = lambert(0xcc3311); const wy = parts.baseY + 0.05; for (const s of [-1, 1]) { const pivot = new THREE.Group(); pivot.position.set(s * 0.12, wy, -0.08); const membrane = mesh(G.sphere, wingMat); membrane.scale.set(0.18, 0.03, 0.15); membrane.position.set(s * 0.16, -0.02, -0.02); pivot.add(membrane); root.add(pivot); parts.wings.push({ pivot, side: s }); } addSpots(root.children[0], 0.18, 0xffcc33, 4, 1.2); const pitch = giveWeapon(parts, 'spear', { mat: lambert(0x551100), scale: 0.7, armLen: parts.armLen }); if (pitch) { const tip = mesh(G.cone, hot); tip.scale.set(0.05, 0.12, 0.05); tip.position.y = 1.05; pitch.grip.children[0].add(tip); }
    },
  },
  hellhound: {
    base: "quadruped",
    scale: 1.3,
    color: 3346705,
    optionsFn(API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      return { height: 1.0, len: 0.6, bodyR: 0.18, legLen: 0.3, ears: true, tail: true, snout: true, tint: 0x331111 };
    },
    decorate(root, parts, o, tint, API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      const flame = [lambert(0xcc2200), lambert(0xff6611), lambert(0xffbb33)]; const head = parts.head; const r = 0.18; for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; const tuft = mesh(G.cone, flame[i % 3]); tuft.scale.set(0.04, 0.13, 0.04); tuft.position.set(Math.cos(a) * r * 0.6, r * 0.6, -r * 0.2 + Math.sin(a) * r * 0.4); tuft.rotation.z = -Math.cos(a) * 0.8; tuft.rotation.x = -0.3 + Math.sin(a) * 0.4; head.add(tuft); } for (let i = 0; i < 5; i++) { const t = i / 4; const spine = mesh(G.cone, flame[i % 3]); spine.scale.set(0.04, 0.16 - t * 0.04, 0.04); spine.position.set(0, 0.3 + r * 0.4, 0.1 - i * 0.13); spine.rotation.x = -0.2; root.add(spine); } if (parts.tail) { const tf = mesh(G.cone, flame[1]); tf.scale.set(0.05, 0.16, 0.05); tf.position.copy(parts.tail.position); tf.position.y += 0.06; tf.position.z -= 0.06; tf.rotation.x = -2.4; root.add(tf); } addEyes(head, r * 0.2, r * 0.62, r * 0.32, r * 0.14, false); for (const s of [-1, 1]) { const ember = mesh(G.lowSphere, lambert(0xffaa33)); ember.scale.setScalar(r * 0.14); ember.position.set(s * r * 0.32, r * 0.2, r * 0.62); head.add(ember); }
    },
  },
  stone_golem: {
    base: "bulky",
    scale: 1.25,
    color: 9077368,
    optionsFn(API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      return { height: 1.7, tint: 0x8a8278 };
    },
    decorate(root, parts, o, tint, API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      const rock = lambert(shade(tint, 0.82)); const rockL = lambert(shade(tint, 1.12)); const plates = [[0, parts.baseY + 0.05, 0.28, 0.3], [-0.18, parts.baseY + 0.15, 0.24, -0.4], [0.2, parts.baseY - 0.1, 0.22, 0.5], [0, parts.baseY + 0.34, 0.2, 0.1]]; for (const [x, y, sc, rot] of plates) { const block = mesh(G.lowSphere, x < 0 ? rock : rockL); block.scale.set(sc * 0.5, sc * 0.4, sc * 0.4); block.position.set(x, y, 0.18); block.rotation.z = rot; block.rotation.y = rot * 0.5; root.add(block); } for (const arm of parts.arms) { const fist = mesh(G.lowSphere, rock); fist.scale.set(0.13, 0.13, 0.13); fist.position.y = -0.36 * (o.height || 1.2); arm.add(fist); } for (const s of [-1, 1]) { const shoulder = mesh(G.lowSphere, rockL); shoulder.scale.set(0.16, 0.13, 0.16); shoulder.position.set(s * 0.38, parts.baseY + 0.18, 0); shoulder.rotation.z = s * 0.4; root.add(shoulder); } const brow = mesh(G.lowSphere, rock); brow.scale.set(0.2, 0.06, 0.12); brow.position.set(0, parts.baseY + 0.46, 0.12); parts.head.add(brow);
    },
  },
  iron_golem: {
    base: "bulky",
    scale: 1.3,
    color: 7834265,
    optionsFn(API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      return { height: 1.75, tint: 0x778899 };
    },
    decorate(root, parts, o, tint, API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      const iron = lambert(shade(tint, 0.85)); const rivet = lambert(0x3a4250); const plate = mesh(G.cyl, iron); plate.scale.set(0.34, 0.18, 0.28); plate.position.set(0, parts.baseY + 0.02, 0.04); root.add(plate); for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; const r = mesh(G.lowSphere, rivet); r.scale.setScalar(0.025); r.position.set(Math.cos(a) * 0.3, parts.baseY + 0.02 + Math.sin(a) * 0.16, 0.3); root.add(r); } const collar = mesh(G.torus, iron); collar.scale.set(0.17, 0.17, 0.06); collar.rotation.x = Math.PI / 2; collar.position.set(0, parts.baseY + 0.3, 0); root.add(collar); for (const arm of parts.arms) { const fist = mesh(G.cyl, iron); fist.scale.set(0.12, 0.1, 0.12); fist.position.y = -0.38 * (o.height || 1.25); arm.add(fist); } for (const s of [-1, 1]) { const pauldron = mesh(G.cyl, iron); pauldron.scale.set(0.13, 0.08, 0.14); pauldron.position.set(s * 0.4, parts.baseY + 0.2, 0); pauldron.rotation.z = s * 0.5; root.add(pauldron); } const visor = mesh(G.cyl, rivet); visor.scale.set(0.16, 0.04, 0.1); visor.rotation.x = Math.PI / 2; visor.position.set(0, parts.baseY + 0.44, 0.14); parts.head.add(visor);
    },
  },
  lava_golem: {
    base: "bulky",
    scale: 1.25,
    color: 3806216,
    optionsFn(API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      return { height: 1.7, tint: 0x3a1408 };
    },
    decorate(root, parts, o, tint, API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      const magma = lambert(0xff5500); const hot = lambert(0xffaa22); const rock = lambert(shade(tint, 1.2)); const torsoBody = root.children.find(c => c.isMesh); if (torsoBody) addSpots(torsoBody, 0.32, 0xff5500, 9, 1.4); for (let i = 0; i < 6; i++) { const a = (i * 2.39996); const crack = mesh(G.lowSphere, i % 2 ? magma : hot); crack.scale.set(0.06, 0.02, 0.04); crack.position.set(Math.cos(a) * 0.28, parts.baseY + Math.sin(a) * 0.3, 0.3); crack.rotation.z = a; root.add(crack); } for (const arm of parts.arms) { const fist = mesh(G.lowSphere, rock); fist.scale.set(0.12, 0.12, 0.12); fist.position.y = -0.36 * (o.height || 1.2); arm.add(fist); const seam = mesh(G.lowSphere, magma); seam.scale.set(0.13, 0.02, 0.04); seam.position.y = -0.36 * (o.height || 1.2); arm.add(seam); } const coreGlow = mesh(G.sphere, hot); coreGlow.scale.set(0.1, 0.12, 0.06); coreGlow.position.set(0, parts.baseY, 0.26); root.add(coreGlow); for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2; const vent = mesh(G.cone, magma); vent.scale.set(0.04, 0.12, 0.04); vent.position.set(Math.cos(a) * 0.15, parts.baseY + 0.55, Math.sin(a) * 0.1); parts.head.add(vent); } addEyes(parts.head, parts.baseY + 0.4, 0.17, 0.07, 0.05, false); for (const s of [-1, 1]) { const eye = mesh(G.lowSphere, hot); eye.scale.setScalar(0.05); eye.position.set(s * 0.07, parts.baseY + 0.4, 0.17); parts.head.add(eye); }
    },
  },
  ice_golem: {
    base: "bulky",
    scale: 1.28,
    color: 10475758,
    optionsFn(API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      return { height: 1.7, tint: 0x9fd8ee };
    },
    decorate(root, parts, o, tint, API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      const ice = lambert(shade(tint, 1.1)); const deep = lambert(shade(tint, 0.8)); for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; const shard = mesh(G.cone, ice); shard.scale.set(0.05, 0.22 + (i % 2) * 0.08, 0.05); shard.position.set(Math.cos(a) * 0.16, parts.baseY + 0.28, Math.sin(a) * 0.12 - 0.08); shard.rotation.x = -0.5 + Math.sin(a) * 0.3; shard.rotation.z = Math.cos(a) * 0.3; root.add(shard); } for (const s of [-1, 1]) { const spike = mesh(G.cone, deep); spike.scale.set(0.05, 0.26, 0.05); spike.position.set(s * 0.36, parts.baseY + 0.18, 0); spike.rotation.z = -s * 1.0; root.add(spike); } for (const arm of parts.arms) { const fist = mesh(G.cone, ice); fist.scale.set(0.11, 0.16, 0.11); fist.position.y = -0.4 * (o.height || 1.2); fist.rotation.x = Math.PI; arm.add(fist); } const torsoBody = root.children.find(c => c.isMesh); if (torsoBody) addSpots(torsoBody, 0.3, 0xffffff, 5, 1.5); for (let i = 0; i < 3; i++) { const crystal = mesh(G.cone, ice); crystal.scale.set(0.04, 0.14, 0.04); crystal.position.set((i - 1) * 0.1, parts.baseY + 0.5, 0); crystal.rotation.z = (i - 1) * 0.4; parts.head.add(crystal); }
    },
  },
  gargoyle: {
    base: "humanoid",
    scale: 1.2,
    color: 7038303,
    optionsFn(API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      return { height: 0.95, girth: 1.2, horns: true, hornColor: 0x555049, ears: true, claws: true, tint: 0x6b675f };
    },
    decorate(root, parts, o, tint, API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      const stone = lambert(shade(tint, 0.85)); const stoneL = lambert(shade(tint, 1.12)); parts.wings = []; const wy = (parts.baseY || 0.6) + 0.1; for (const s of [-1, 1]) { const pivot = new THREE.Group(); pivot.position.set(s * 0.2, wy, -0.12); const arm = mesh(G.capsule, stone); arm.scale.set(0.4, 0.06, 0.06); arm.position.x = s * 0.32; arm.rotation.z = s * 0.2; pivot.add(arm); const membrane = mesh(G.sphere, stoneL); membrane.scale.set(0.36, 0.06, 0.3); membrane.position.set(s * 0.32, -0.06, -0.04); pivot.add(membrane); for (let f = 0; f < 3; f++) { const spar = mesh(G.cone, stone); spar.scale.set(0.025, 0.16, 0.025); spar.position.set(s * (0.18 + f * 0.16), -0.14 - f * 0.03, -0.05); spar.rotation.x = -2.4; pivot.add(spar); } root.add(pivot); parts.wings.push({ pivot, side: s }); } for (let i = 0; i < 4; i++) { const ridge = mesh(G.cone, stone); ridge.scale.set(0.04, 0.12 - i * 0.015, 0.04); ridge.position.set(0, parts.baseY + 0.2, -0.14 - i * 0.08); ridge.rotation.x = 0.4; root.add(ridge); } const jaw = mesh(G.sphere, stoneL); jaw.scale.set(0.1, 0.06, 0.1); jaw.position.set(0, parts.baseY + 0.3, 0.18); parts.head.add(jaw); for (let i = -1; i <= 1; i++) { const fang = mesh(G.cone, lambert(0xe8e4d8)); fang.scale.set(0.012, 0.04, 0.012); fang.position.set(i * 0.05, parts.baseY + 0.27, 0.22); fang.rotation.x = Math.PI; parts.head.add(fang); } const tail = mesh(G.capsule, lambert(tint)); tail.scale.set(0.04, 0.14, 0.04); tail.rotation.x = 1.0; tail.position.set(0, parts.baseY * 0.6, -0.18); root.add(tail);
    },
  },
  water_elemental: {
    base: "floater",
    scale: 1.6,
    color: 3047894,
    optionsFn(API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      return { bodyR: 0.3, hover: 0.45, tendrils: 6, noEyes: true, tint: 0x2e7fd6 };
    },
    decorate(root, parts, o, tint, API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      if (parts.dome) { parts.dome.scale.set(0.3, 0.42, 0.3); } const swirl = lambert(shade(tint, 1.25)); const deep = lambert(shade(tint, 0.75)); for (let i = 0; i < 4; i++) { const t = i / 3; const ring = mesh(G.torus, i % 2 ? swirl : deep); ring.scale.set(0.22 - t * 0.05, 0.22 - t * 0.05, 0.04); ring.rotation.x = 1.2 + i * 0.2; ring.position.y = parts.hover - 0.05 + i * 0.14; root.add(ring); } const crest = mesh(G.cone, swirl); crest.scale.set(0.1, 0.22, 0.06); crest.position.y = parts.hover + 0.4; crest.rotation.x = -0.3; root.add(crest); for (let i = 0; i < 5; i++) { const drop = mesh(G.lowSphere, swirl); drop.scale.setScalar(0.03 + (i % 2) * 0.015); drop.position.set(Math.cos(i * 1.7) * 0.2, parts.hover + 0.2 + (i % 3) * 0.08, Math.sin(i * 1.7) * 0.2); root.add(drop); } addEyes(root, parts.hover + 0.18, 0.22, 0.09, 0.05);
    },
  },
  earth_elemental: {
    base: "bulky",
    scale: 1.2,
    color: 7232058,
    optionsFn(API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      return { height: 1.65, tint: 0x6e5a3a };
    },
    decorate(root, parts, o, tint, API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      const dirt = lambert(shade(tint, 0.85)); const moss = lambert(0x4a6a2a); const torsoBody = root.children.find(c => c.isMesh); if (torsoBody) addSpots(torsoBody, 0.34, tint, 8, 0.7); for (let i = 0; i < 7; i++) { const a = (i * 2.39996); const boulder = mesh(G.lowSphere, dirt); const sr = 0.08 + (i % 3) * 0.03; boulder.scale.set(sr, sr * 0.8, sr); boulder.position.set(Math.cos(a) * 0.3, parts.baseY + Math.sin(a) * 0.35, Math.sin(a * 1.3) * 0.2 + 0.12); boulder.rotation.set(a, a * 0.5, a); root.add(boulder); } for (const arm of parts.arms) { const fist = mesh(G.lowSphere, dirt); fist.scale.set(0.15, 0.13, 0.15); fist.position.y = -0.36 * (o.height || 1.1); arm.add(fist); } for (let i = 0; i < 4; i++) { const patch = mesh(G.lowSphere, moss); patch.scale.set(0.06, 0.02, 0.06); patch.position.set((i - 1.5) * 0.12, parts.baseY + 0.4, 0.16); parts.head.add(patch); } const crystal = mesh(G.cone, lambert(0x88cc66)); crystal.scale.set(0.04, 0.12, 0.04); crystal.position.set(0, parts.baseY + 0.5, 0); parts.head.add(crystal);
    },
  },
  storm_elemental: {
    base: "floater",
    scale: 1.7,
    color: 4868198,
    optionsFn(API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      return { bodyR: 0.28, hover: 0.55, tendrils: 0, noEyes: true, tint: 0x4a4a66 };
    },
    decorate(root, parts, o, tint, API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      const cloud = lambert(shade(tint, 1.15)); const dark = lambert(shade(tint, 0.7)); const bolt = lambert(0xffee66); for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2 + i * 0.3; const puff = mesh(G.lowSphere, i % 2 ? cloud : dark); const sr = 0.16 + (i % 3) * 0.04; puff.scale.set(sr, sr * 0.8, sr); puff.position.set(Math.cos(a) * 0.16, parts.hover + 0.05 + Math.sin(i) * 0.1, Math.sin(a) * 0.12); root.add(puff); } parts.tendrils = []; for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2; const zig = new THREE.Group(); zig.position.set(Math.cos(a) * 0.18, parts.hover - 0.12, Math.sin(a) * 0.14); for (let j = 0; j < 3; j++) { const seg = mesh(G.cone, bolt); seg.scale.set(0.025, 0.09, 0.025); seg.position.set((j % 2 ? 0.04 : -0.04), -j * 0.1, 0); seg.rotation.z = (j % 2 ? 0.5 : -0.5); zig.add(seg); } root.add(zig); parts.tendrils.push({ t: zig, phase: i }); } addEyes(root, parts.hover + 0.1, 0.18, 0.09, 0.05);
    },
  },
  elemental: {
    base: "floater",
    scale: 1.5,
    color: 16733969,
    optionsFn(API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      return { bodyR: 0.26, hover: 0.5, tendrils: 0, noEyes: true, tint: 0xff5511 };
    },
    decorate(root, parts, o, tint, API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      if (parts.dome) parts.dome.visible = false; const flames = [lambert(0xcc2200), lambert(0xff5500), lambert(0xff9922), lambert(0xffdd44)]; parts.flames = []; const cx = 4; for (let layer = 0; layer < cx; layer++) { const t = layer / (cx - 1); const cone = mesh(G.cone, flames[layer]); const r = 0.26 * (1 - t * 0.55); cone.scale.set(r, 0.32 + t * 0.18, r); cone.position.y = parts.hover - 0.1 + layer * 0.16; root.add(cone); parts.flames.push({ m: cone, base: cone.position.y, phase: layer }); } for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; const lick = mesh(G.cone, flames[1 + (i % 3)]); lick.scale.set(0.05, 0.18, 0.05); lick.position.set(Math.cos(a) * 0.16, parts.hover + 0.05 + (i % 2) * 0.1, Math.sin(a) * 0.16); root.add(lick); parts.flames.push({ m: lick, base: lick.position.y, phase: i + 4 }); } addEyes(root, parts.hover + 0.12, 0.16, 0.07, 0.045);
    },
  },
  hydra: {
    base: "hydra",
    scale: 3.4,
    color: 3368789,
    optionsFn(API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      return { bodyR: 0.32, heads: 3, tint: 0x336655 };
    },
    decorate(root, parts, o, tint, API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      const venom = lambert(0x88dd44); const dark = lambert(shade(tint, 0.7)); for (const nk of parts.necks) { const headMesh = nk.neck.children[nk.neck.children.length - 1]; for (let i = -1; i <= 1; i++) { const frill = mesh(G.cone, venom); frill.scale.set(0.03, 0.1, 0.03); frill.position.set(i * 0.06, headMesh.position.y + 0.08, headMesh.position.z - 0.06); frill.rotation.x = -0.6; nk.neck.add(frill); } const drip = mesh(G.cone, venom); drip.scale.set(0.025, 0.07, 0.025); drip.position.set(0, headMesh.position.y - 0.05, headMesh.position.z + 0.14); drip.rotation.x = Math.PI; nk.neck.add(drip); } for (let i = 0; i < 6; i++) { const a = (i * 2.39996); const scale = mesh(G.cone, dark); scale.scale.set(0.04, 0.08, 0.04); scale.position.set(Math.cos(a) * 0.2, 0.4 + Math.sin(a) * 0.15, Math.sin(a) * 0.2 - 0.1); scale.rotation.x = -0.3; root.add(scale); } const tail = new THREE.Group(); tail.position.set(0, 0.36, -0.4); for (let i = 0; i < 4; i++) { const seg = mesh(G.sphere, lambert(tint)); seg.scale.setScalar(0.12 - i * 0.02); seg.position.set(0, 0, -i * 0.18); tail.add(seg); } root.add(tail);
    },
  },
  giant_spider: {
    base: "bug",
    scale: 2.4,
    color: 2234918,
    optionsFn(API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      return { legs: 8, bodyR: 0.34, tint: 0x221a26 };
    },
    decorate(root, parts, o, tint, API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      const mark = lambert(0xaa1133); const fang = lambert(0xddccaa); const venom = lambert(0x88dd44); const abdomen = root.children.find(c => c.isMesh && c.position.z < -0.1); if (abdomen) { addSpots(abdomen, 0.34, 0x551122, 5, 1.0); const hour = mesh(G.lowSphere, mark); hour.scale.set(0.08, 0.12, 0.04); hour.position.set(0, 0.5, -0.65); root.add(hour); } for (const s of [-1, 1]) { const chel = mesh(G.cone, lambert(0x110a14)); chel.scale.set(0.05, 0.14, 0.05); chel.position.set(s * 0.08, 0.3, 0.5); chel.rotation.x = 2.4; root.add(chel); const ft = mesh(G.cone, fang); ft.scale.set(0.02, 0.08, 0.02); ft.position.set(s * 0.08, 0.18, 0.58); ft.rotation.x = Math.PI; root.add(ft); const drip = mesh(G.lowSphere, venom); drip.scale.setScalar(0.025); drip.position.set(s * 0.08, 0.1, 0.6); root.add(drip); } for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; const e = mesh(G.lowSphere, lambert(0xcc2244)); e.scale.setScalar(0.03); e.position.set(Math.cos(a) * 0.12, 0.42, 0.62); root.add(e); } for (const l of parts.legs) { const tip = mesh(G.cone, lambert(0x110a14)); tip.scale.set(0.02, 0.08, 0.02); tip.position.y = -0.36; tip.rotation.x = 0.6; l.pivot.add(tip); }
    },
  },
  treant: {
    base: "bulky",
    scale: 1.25,
    color: 7031338,
    optionsFn(API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      return { height: 1.7, canopy: true, canopyMat: null, tint: 0x6b4a2a };
    },
    decorate(root, parts, o, tint, API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      const bark = lambert(shade(tint, 0.8)); const leafA = lambert(0x3a6a2a); const leafB = lambert(0x4f8038); for (let i = 0; i < 6; i++) { const a = (i * 2.39996); const knot = mesh(G.lowSphere, bark); knot.scale.set(0.06, 0.1, 0.04); knot.position.set(Math.cos(a) * 0.3, parts.baseY + Math.sin(a) * 0.35, 0.28); root.add(knot); } for (const arm of parts.arms) { for (let b = 0; b < 3; b++) { const branch = mesh(G.cone, bark); branch.scale.set(0.03, 0.12, 0.03); branch.position.set((b - 1) * 0.05, -0.42 * (o.height || 1.4), 0); branch.rotation.z = (b - 1) * 0.5; branch.rotation.x = -0.3; arm.add(branch); const leaf = mesh(G.lowSphere, b % 2 ? leafA : leafB); leaf.scale.setScalar(0.08); leaf.position.set((b - 1) * 0.1, -0.5 * (o.height || 1.4), 0); arm.add(leaf); } } const head = parts.head; const big = head.children.find(c => c.isMesh && c.material === o.canopyMat); for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; const cl = mesh(G.lowSphere, i % 2 ? leafA : leafB); const sr = 0.18 + (i % 2) * 0.06; cl.scale.set(sr, sr * 0.9, sr); cl.position.set(Math.cos(a) * 0.16, 0.18 + (i % 2) * 0.08, Math.sin(a) * 0.16); head.add(cl); } for (const s of [-1, 1]) { const root2 = mesh(G.cone, bark); root2.scale.set(0.06, 0.2, 0.06); root2.position.set(s * 0.16, 0.05, 0.1); root2.rotation.x = 0.4; root.add(root2); }
    },
  },
  mandrake: {
    base: "humanoid",
    scale: 0.9,
    color: 10070613,
    optionsFn(API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      return { tint: 0x99aa55, bodyR: 0.2 };
    },
    decorate(root, parts, o, tint, API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      const skin = lambert(tint); const leaf = lambert(0x4f8038); const root2 = lambert(shade(tint, 0.8)); const bodyY = 0.26; const body = mesh(G.sphere, skin); body.scale.set(0.2, 0.26, 0.18); body.position.y = bodyY; root.add(body); const face = mesh(G.sphere, lambert(shade(tint, 1.1))); face.scale.set(0.14, 0.16, 0.08); face.position.set(0, bodyY + 0.02, 0.16); root.add(face); addEyes(root, bodyY + 0.06, 0.2, 0.07, 0.045); const mouth = mesh(G.sphere, lambert(0x3a2a1a)); mouth.scale.set(0.05, 0.07, 0.03); mouth.position.set(0, bodyY - 0.06, 0.2); root.add(mouth); parts.legs = []; for (const s of [-1, 1]) { const tap = mesh(G.cone, root2); tap.scale.set(0.05, 0.18, 0.05); tap.position.set(s * 0.07, 0.08, 0); tap.rotation.x = Math.PI; tap.rotation.z = s * 0.3; root.add(tap); parts.legs.push(tap); } parts.arms = []; for (const s of [-1, 1]) { const armpiv = new THREE.Group(); armpiv.position.set(s * 0.18, bodyY + 0.05, 0); const arm = mesh(G.capsule, root2); arm.scale.set(0.025, 0.08, 0.025); arm.position.y = -0.06; armpiv.add(arm); root.add(armpiv); parts.arms.push(armpiv); } parts.head = root; for (let i = 0; i < 5; i++) { const t = i / 4; const lf = mesh(G.cone, leaf); lf.scale.set(0.04, 0.22 - t * 0.04, 0.02); lf.position.set((i - 2) * 0.04, bodyY + 0.3, 0); lf.rotation.z = (i - 2) * 0.35; root.add(lf); } parts.type = 'biped'; parts.baseY = bodyY;
    },
  },
  mushroom: {
    base: "mushroom",
    scale: 0.9,
    color: 13387315,
    optionsFn(API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      return { tint: 0xcc4433, stalkColor: 0xeeddcc };
    },
    decorate(root, parts, o, tint, API) {
      const { THREE, G, mesh, lambert, shade, addEyes, addSpots, addFur, addMane, addClaws, giveWeapon, collectMats, EYE_W, EYE_B, WHITE, DARK, WOOD, STEEL, IRON, GOLD, STRING } = API;
      const spot = lambert(0xfff3e0); const cap = parts.cap; for (let i = 0; i < 7; i++) { const a = (i * 2.39996); const dot = mesh(G.lowSphere, spot); const sr = 0.03 + (i % 3) * 0.012; dot.scale.set(sr, sr * 0.5, sr); dot.position.set(Math.cos(a) * 0.2, 0.04, Math.sin(a) * 0.2); cap.add(dot); } const gillRing = mesh(G.torus, lambert(shade(tint, 0.7))); gillRing.scale.set(0.2, 0.2, 0.03); gillRing.rotation.x = Math.PI / 2; gillRing.position.y = -0.02; cap.add(gillRing); const skirt = mesh(G.torus, lambert(0xeae0cc)); skirt.scale.set(0.11, 0.11, 0.03); skirt.rotation.x = Math.PI / 2; skirt.position.y = 0.33; root.add(skirt);
    },
  },
};

registerDesigns(DESIGNS);
export default DESIGNS;
