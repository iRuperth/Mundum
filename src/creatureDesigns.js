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
      // little pink nose with a soft cheek pad
      const nose = mesh(G.lowSphere, lambert(0xdd8899));
      nose.scale.setScalar(r * 0.12);
      nose.position.set(0, r * 0.15, r * 0.75);
      head.add(nose);
      const cheek = mesh(G.sphere, lambert(shade(tint, 1.25)));
      cheek.scale.set(r * 0.4, r * 0.3, r * 0.28);
      cheek.position.set(0, r * 0.0, r * 0.55);
      head.add(cheek);
      // fine whiskers fanning from the snout
      for (const s of [-1, 1]) {
        for (let i = 0; i < 2; i++) {
          const wh = mesh(G.cyl, lambert(0xf2eadf));
          wh.scale.set(r * 0.012, r * 0.22, r * 0.012);
          wh.rotation.z = Math.PI / 2;
          wh.rotation.y = s * (0.5 + i * 0.25);
          wh.position.set(s * r * 0.22, r * 0.12 - i * r * 0.08, r * 0.7);
          head.add(wh);
        }
      }
      // big round fluffy cotton tail
      const tail = mesh(G.sphere, lambert(shade(tint, 1.5)));
      tail.scale.setScalar(r * 0.55);
      const bodyY = (o.legLen || 0.14) + r * 0.6;
      tail.position.set(0, bodyY, -(o.len || 0.34) * 0.45 - r * 0.4);
      root.add(tail);
      // little splayed hind feet poking out the back
      for (const s of [-1, 1]) {
        const foot = mesh(G.sphere, lambert(shade(tint, 1.1)));
        foot.scale.set(r * 0.16, r * 0.1, r * 0.34);
        foot.position.set(s * r * 0.32, (o.legLen || 0.14) * 0.4, -(o.len || 0.34) * 0.32);
        root.add(foot);
      }
      // delicate paw pads on front feet
      for (const l of parts.legs.slice(0, 2)) {
        const pad = mesh(G.lowSphere, lambert(0xf2c9b8));
        pad.scale.set(r * 0.08, r * 0.06, r * 0.08);
        pad.position.y = -(o.legLen || 0.14) + r * 0.08;
        l.pivot.add(pad);
      }
      // soft fluffy fur tufts on the chest
      for (const s of [-1, 0.4]) {
        const tuft = mesh(G.sphere, lambert(shade(tint, 1.2)));
        tuft.scale.set(r * 0.28, r * 0.24, r * 0.22);
        tuft.position.set(s * r * 0.15, bodyY - r * 0.15, (o.len || 0.34) * 0.15);
        root.add(tuft);
      }
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
      // dark split hooves on each leg
      for (const l of parts.legs) {
        const hoof = mesh(G.sphere, lambert(0x2a221c));
        hoof.scale.set(r * 0.2, r * 0.14, r * 0.22);
        hoof.position.y = -(o.legLen || 0.32) + r * 0.04;
        l.pivot.add(hoof);
      }
      // tufted tail switch at the back
      if (parts.tail) {
        const switchTuft = mesh(G.sphere, lambert(shade(tint, 0.5)));
        switchTuft.scale.setScalar(r * 0.16);
        switchTuft.position.y = -0.1;
        parts.tail.add(switchTuft);
      }
      // ridge of spine studs down the back (bodyY already computed above)
      for (let i = 0; i < 5; i++) {
        const stud = mesh(G.lowSphere, lambert(shade(tint, 0.7)));
        stud.scale.setScalar(r * 0.11);
        stud.position.set(0, bodyY + r * 0.3, (o.len || 0.6) * (0.4 - i * 0.12));
        root.add(stud);
      }
      // barrel segmentation rings (muscle ridges)
      for (let i = 0; i < 3; i++) {
        const ring = mesh(G.torus, lambert(shade(tint, 0.8)));
        ring.scale.set(r * 0.65, r * 0.65, r * 0.08);
        ring.rotation.x = Math.PI / 2;
        ring.position.set(0, bodyY, (o.len || 0.6) * (0.25 - i * 0.2));
        root.add(ring);
      }
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
      // tiny dark nose + pale inner-ear tufts
      const nose = mesh(G.lowSphere, lambert(0x332222));
      nose.scale.setScalar(r * 0.14);
      nose.position.set(0, r * 0.1, r * 0.8);
      head.add(nose);
      for (const s of [-1, 1]) {
        const tuft = mesh(G.cone, lambert(shade(tint, 1.4)));
        tuft.scale.set(r * 0.1, r * 0.22, r * 0.08);
        tuft.position.set(s * r * 0.45, r * 0.8, 0);
        head.add(tuft);
      }
      // pale belly patch
      const belly = mesh(G.sphere, lambert(shade(tint, 1.35)));
      const bodyY = (o.legLen || 0.14) + r * 0.6;
      belly.scale.set(r * 0.55, r * 0.5, r * 0.6);
      belly.position.set(0, bodyY - r * 0.2, (o.len || 0.3) * 0.25);
      root.add(belly);
      // little clasped front paws under the chin
      for (const s of [-1, 1]) {
        const paw = mesh(G.lowSphere, lambert(shade(tint, 0.85)));
        paw.scale.setScalar(r * 0.14);
        paw.position.set(s * r * 0.2, bodyY - r * 0.1, (o.len || 0.3) * 0.4 + r * 0.1);
        root.add(paw);
      }
      // huge bushy tail arcing up over the back (cluster of fluff spheres)
      const tailMat = lambert(shade(tint, 1.15));
      const len = o.len || 0.3;
      for (let i = 0; i < 4; i++) {
        const puff = mesh(G.sphere, tailMat);
        const sr = r * (0.7 - i * 0.06);
        puff.scale.setScalar(sr);
        puff.position.set(0, bodyY + i * r * 0.7, -len * 0.5 - r * 0.2 + i * r * 0.15);
        root.add(puff);
      }
      // tiny sharp claws on hind feet
      for (const l of parts.legs.slice(2)) addClaws(l.pivot, -(o.legLen || 0.14) + 0.01, r * 0.16, 0.008, r * 0.1, 3);
      // bushy cheek fur puffs
      for (const s of [-1, 1]) {
        const cheekPuff = mesh(G.sphere, lambert(shade(tint, 1.25)));
        cheekPuff.scale.set(r * 0.22, r * 0.18, r * 0.25);
        cheekPuff.position.set(s * r * 0.38, bodyY + r * 0.15, (len) * 0.3);
        root.add(cheekPuff);
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
      // fan tail sticking out the back, split into individual feathers
      for (let i = -1; i <= 1; i++) {
        const tf = mesh(G.sphere, lambert(shade(tint, 0.8 + Math.abs(i) * 0.06)));
        tf.scale.set(r * 0.22, r * 0.1, r * 0.7);
        tf.rotation.x = -0.5;
        tf.rotation.y = i * 0.25;
        tf.position.set(i * r * 0.22, legY + r * 0.8, -r * 1.1);
        root.add(tf);
      }
      // pale beak cere at the base of the beak
      const cere = mesh(G.lowSphere, lambert(0xe8e2d4));
      cere.scale.set(r * 0.12, r * 0.1, r * 0.12);
      cere.position.set(0, legY + r * 1.85, r * 0.55);
      root.add(cere);
      // iridescent head sheen (darker plumage on crown)
      const crown = mesh(G.dome, lambert(shade(tint, 0.75)));
      crown.scale.setScalar(r * 0.45);
      crown.position.set(0, legY + r * 2.1, r * 0.15);
      root.add(crown);
      // feather texture ridges on wings
      for (const s of [-1, 1]) {
        for (let i = 0; i < 2; i++) {
          const featherRidge = mesh(G.cone, lambert(shade(tint, 0.88)));
          featherRidge.scale.set(r * 0.08, r * 0.3, r * 0.04);
          featherRidge.rotation.z = 0.3;
          featherRidge.position.set(s * r * 0.88, legY + r * (0.7 - i * 0.25), -r * (0.15 + i * 0.1));
          root.add(featherRidge);
        }
      }
      // pink feet detail (legs)
      for (const s of [-1, 1]) {
        const toeRidge = mesh(G.lowSphere, lambert(0xe8b8a0));
        toeRidge.scale.set(r * 0.08, r * 0.04, r * 0.06);
        toeRidge.position.set(s * r * 0.25, legY - r * 0.05, 0);
        root.add(toeRidge);
      }
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
      // red gonys spot on the lower beak (the gull's signature mark)
      const spot = mesh(G.lowSphere, lambert(0xcc3322));
      spot.scale.setScalar(r * 0.08);
      spot.position.set(0, legY + r * 1.72, r * 0.85);
      root.add(spot);
      // orange webbed feet hint
      for (const s of [-1, 1]) {
        const web = mesh(G.sphere, lambert(0xddaa33));
        web.scale.set(r * 0.18, r * 0.05, r * 0.22);
        web.position.set(s * r * 0.4, 0.02, r * 0.1);
        root.add(web);
      }
      // feather texture on wings (primary feather splits)
      for (const s of [-1, 1]) {
        for (let i = 0; i < 2; i++) {
          const primaryFeather = mesh(G.cone, lambert(shade(0x9aa2aa, 0.85)));
          primaryFeather.scale.set(r * 0.1, r * 0.35, r * 0.05);
          primaryFeather.rotation.z = 0.4 * s;
          primaryFeather.position.set(s * r * 0.9, legY + r * (0.8 - i * 0.2), -r * (0.3 + i * 0.2));
          root.add(primaryFeather);
        }
      }
      // chest detail (white breast striation)
      const chest = mesh(G.sphere, lambert(0xf5f5f0));
      chest.scale.set(r * 0.55, r * 0.5, r * 0.35);
      chest.position.set(0, legY + r * 1.1, r * 0.2);
      root.add(chest);
      // dark eye ring detail
      const eyeRing = mesh(G.lowSphere, lambert(0x555555));
      eyeRing.scale.setScalar(r * 0.12);
      eyeRing.position.set(0, legY + r * 2.0, r * 0.35);
      root.add(eyeRing);
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
      // little folded wings with a darker primary-feather edge
      for (const s of [-1, 1]) {
        const wing = mesh(G.sphere, lambert(shade(tint, 0.9)));
        wing.scale.set(r * 0.25, r * 0.45, r * 0.6);
        wing.position.set(s * r * 0.85, legY + r, 0);
        root.add(wing);
        const tipFeather = mesh(G.sphere, lambert(shade(tint, 0.7)));
        tipFeather.scale.set(r * 0.18, r * 0.2, r * 0.3);
        tipFeather.position.set(s * r * 0.9, legY + r * 0.75, -r * 0.4);
        root.add(tipFeather);
      }
      // fluffy feathered thighs above the legs
      for (const s of [-1, 1]) {
        const thigh = mesh(G.sphere, lambert(shade(tint, 1.05)));
        thigh.scale.set(r * 0.32, r * 0.34, r * 0.32);
        thigh.position.set(s * r * 0.4, legY + r * 0.35, 0);
        root.add(thigh);
      }
      // small wattle pair under the beak
      const wattle2 = mesh(G.sphere, lambert(0xcc3322));
      wattle2.scale.set(r * 0.18, r * 0.1, r * 0.1);
      wattle2.position.set(0, legY + r * 1.65, r * 0.55);
      root.add(wattle2);
      // yellow comb ridge detail (more defined)
      const combRidge = mesh(G.cone, lambert(0xee8833));
      combRidge.scale.set(r * 0.15, r * 0.35, r * 0.08);
      combRidge.position.set(0, legY + r * 2.15, r * 0.1);
      root.add(combRidge);
      // scaly feather plate texture on body
      for (let i = 0; i < 3; i++) {
        const featherPlate = mesh(G.sphere, lambert(shade(tint, 0.95)));
        featherPlate.scale.set(r * 0.3, r * 0.25, r * 0.12);
        featherPlate.position.set(0, legY + r * (0.6 - i * 0.25), -r * (0.3 + i * 0.15));
        root.add(featherPlate);
      }
      // yellow clawed feet (toe detail)
      for (let i = 0; i < 3; i++) {
        const toe = mesh(G.cone, lambert(0xddaa33));
        toe.scale.set(r * 0.06, r * 0.14, r * 0.06);
        toe.rotation.x = Math.PI / 3;
        toe.position.set((i - 1) * r * 0.08, legY - r * 0.08, r * 0.08 - i * r * 0.05);
        root.add(toe);
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
      // floppy dark ears framing the face
      for (const s of [-1, 1]) {
        const ear = mesh(G.sphere, lambert(0x2c2a27));
        ear.scale.set(r * 0.12, r * 0.08, r * 0.2);
        ear.position.set(s * r * 0.42, r * 0.1, r * 0.28);
        ear.rotation.z = s * 0.5;
        parts.head.add(ear);
      }
      // dark split hooves on each leg
      for (const l of parts.legs) {
        const hoof = mesh(G.sphere, lambert(0x1f1d1a));
        hoof.scale.set(r * 0.14, r * 0.12, r * 0.16);
        hoof.position.y = -(o.legLen || 0.22) + r * 0.04;
        l.pivot.add(hoof);
      }
      // wool curls (additional bulky puffs for texture)
      for (let i = 0; i < 4; i++) {
        const curly = mesh(G.sphere, woolMat);
        curly.scale.setScalar(r * 0.38);
        curly.position.set((i % 2) * r * 0.5 - r * 0.25, bodyY + r * 0.4, -r * (0.3 + (i >> 1) * 0.35));
        root.add(curly);
      }
      // darker face definition (eyes area shading)
      const eyeShade = mesh(G.lowSphere, lambert(0x1f1d1a));
      eyeShade.scale.set(r * 0.35, r * 0.25, r * 0.15);
      eyeShade.position.set(0, -r * 0.05, r * 0.55);
      parts.head.add(eyeShade);
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
      // shiny black nose pad on the muzzle tip
      const nose = mesh(G.lowSphere, lambert(0x14110e));
      nose.scale.set(r * 0.22, r * 0.18, r * 0.16);
      nose.position.set(0, r * 0.0, r * 0.9);
      head.add(nose);
      // slim dark hooves on the long legs
      for (const l of parts.legs) {
        const hoof = mesh(G.sphere, lambert(0x16130f));
        hoof.scale.set(r * 0.16, r * 0.16, r * 0.2);
        hoof.position.y = -(o.legLen || 0.38) + r * 0.05;
        l.pivot.add(hoof);
      }
      // white tail tuft at rear
      const tailTuft = mesh(G.sphere, lambert(0xffffff));
      tailTuft.scale.setScalar(r * 0.22);
      const bodyY = (o.legLen || 0.38) + r * 0.6;
      tailTuft.position.set(0, bodyY - r * 0.1, -(o.len || 0.5) * 0.45);
      root.add(tailTuft);
      // nostril details (darker nose interior)
      for (const s of [-1, 1]) {
        const nostril = mesh(G.lowSphere, lambert(0x0a0804));
        nostril.scale.setScalar(r * 0.08);
        nostril.position.set(s * r * 0.08, r * 0.05, r * 1.0);
        head.add(nostril);
      }
      // jaw line shading
      const jawShade = mesh(G.sphere, lambert(shade(tint, 0.9)));
      jawShade.scale.set(r * 0.38, r * 0.18, r * 0.32);
      jawShade.position.set(0, -r * 0.35, r * 0.6);
      head.add(jawShade);
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
      // dark snout disc on the nose with two nostril dots
      const snoutDisc = mesh(G.lowSphere, lambert(shade(tint, 0.5)));
      snoutDisc.scale.set(r * 0.3, r * 0.3, r * 0.1);
      snoutDisc.position.set(0, -r * 0.1, r * 0.85);
      head.add(snoutDisc);
      for (const s of [-1, 1]) {
        const nostril = mesh(G.lowSphere, lambert(0x140f0a));
        nostril.scale.setScalar(r * 0.06);
        nostril.position.set(s * r * 0.1, -r * 0.1, r * 0.92);
        head.add(nostril);
      }
      // small upright ears
      for (const s of [-1, 1]) {
        const ear = mesh(G.cone, lambert(shade(tint, 0.85)));
        ear.scale.set(r * 0.12, r * 0.18, r * 0.1);
        ear.position.set(s * r * 0.4, r * 0.55, -r * 0.1);
        head.add(ear);
      }
      // blunt cloven hooves on each leg
      for (const l of parts.legs) {
        const hoof = mesh(G.sphere, lambert(0x1c1611));
        hoof.scale.set(r * 0.18, r * 0.14, r * 0.2);
        hoof.position.y = -(o.legLen || 0.24) + r * 0.04;
        l.pivot.add(hoof);
      }
      // wiry fur ridge on the back (darker bristles)
      const bodyY = (o.legLen || 0.24) + r * 0.6;
      for (let i = 0; i < 4; i++) {
        const bristle = mesh(G.cone, lambert(shade(tint, 0.4)));
        bristle.scale.set(r * 0.08, r * 0.24, r * 0.06);
        bristle.position.set(0, bodyY + r * 0.35, (o.len || 0.5) * (0.35 - i * 0.18));
        bristle.rotation.z = Math.sin(i) * 0.2;
        root.add(bristle);
      }
      // mud-caked hide texture (darker dapples)
      for (let i = 0; i < 5; i++) {
        const mudSpot = mesh(G.lowSphere, lambert(shade(tint, 0.5)));
        mudSpot.scale.setScalar(r * (0.12 - i * 0.015));
        mudSpot.position.set((Math.random() - 0.5) * r * 0.8, bodyY + (Math.random() - 0.5) * r * 0.3, (Math.random() - 0.5) * (o.len || 0.5));
        root.add(mudSpot);
      }
      // shoulder hump (muscular build)
      const shoulder = mesh(G.sphere, lambert(shade(tint, 0.8)));
      shoulder.scale.set(r * 0.55, r * 0.45, r * 0.5);
      shoulder.position.set(0, bodyY + r * 0.25, (o.len || 0.5) * 0.25);
      root.add(shoulder);
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
      // bared white fangs under the snout
      for (const s of [-1, 1]) {
        const fang = mesh(G.cone, lambert(0xf2eedf));
        fang.scale.set(r * 0.07, r * 0.16, r * 0.07);
        fang.rotation.x = Math.PI;
        fang.position.set(s * r * 0.12, -r * 0.22, r * 0.85);
        head.add(fang);
      }
      // amber glint in the eyes
      for (const s of [-1, 1]) {
        const glint = mesh(G.lowSphere, lambert(0xd9a23a));
        glint.scale.setScalar(r * 0.08);
        glint.position.set(s * r * 0.35, r * 0.2, r * 0.62);
        head.add(glint);
      }
      // claws on each paw
      for (const l of parts.legs) addClaws(l.pivot, -(o.legLen || 0.3) + 0.02, r * 0.28, 0.018, r * 0.14, 3);
      // bushy down-hanging tail
      const len = o.len || 0.55;
      const bodyY = (o.legLen || 0.3) + r * 0.6;
      const tail = mesh(G.capsule, lambert(shade(tint, 0.9)));
      tail.scale.set(r * 0.5, r * 0.7, r * 0.5);
      tail.rotation.x = 1.1;
      tail.position.set(0, bodyY - r * 0.1, -len * 0.5 - r * 0.4);
      root.add(tail);
      // muscular shoulder ridge
      const shoulder = mesh(G.sphere, lambert(shade(tint, 0.75)));
      shoulder.scale.set(r * 0.6, r * 0.5, r * 0.5);
      shoulder.position.set(0, bodyY + r * 0.2, len * 0.25);
      root.add(shoulder);
      // darker fur stripe down spine
      for (let i = 0; i < 3; i++) {
        const stripe = mesh(G.cone, lambert(shade(tint, 0.5)));
        stripe.scale.set(r * 0.16, r * 0.3, r * 0.08);
        stripe.position.set(0, bodyY + r * 0.22, len * (0.3 - i * 0.2));
        root.add(stripe);
      }
      // haunches muscle detail
      for (const s of [-1, 1]) {
        const haunch = mesh(G.sphere, lambert(shade(tint, 0.85)));
        haunch.scale.set(r * 0.4, r * 0.38, r * 0.35);
        haunch.position.set(s * r * 0.3, bodyY - r * 0.1, -len * 0.2);
        root.add(haunch);
      }
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
      // muscular shoulder hump over the front legs
      const bodyY = (o.legLen || 0.3) + r * 0.6;
      const hump = mesh(G.sphere, lambert(shade(tint, 0.9)));
      hump.scale.set(r * 0.8, r * 0.7, r * 0.7);
      hump.position.set(0, bodyY + r * 0.5, (o.len || 0.55) * 0.3);
      root.add(hump);
      addFur(hump, r * 0.8, shade(tint, 0.8), 1, 7, 0.85);
      // dark eyes glint
      for (const s of [-1, 1]) {
        const glint = mesh(G.lowSphere, lambert(0x3a2a18));
        glint.scale.setScalar(r * 0.08);
        glint.position.set(s * r * 0.28, r * 0.22, r * 0.55);
        head.add(glint);
      }
      // brow ridge (fierce brow shaping)
      const brow = mesh(G.sphere, lambert(shade(tint, 0.7)));
      brow.scale.set(r * 0.7, r * 0.25, r * 0.35);
      brow.position.set(0, r * 0.6, r * 0.4);
      head.add(brow);
      // additional back fur bulks (massive silhouette)
      for (let i = 0; i < 3; i++) {
        const backBulk = mesh(G.sphere, lambert(shade(tint, 0.8)));
        backBulk.scale.setScalar(r * (0.6 - i * 0.08));
        backBulk.position.set((i % 2) * r * 0.4 - r * 0.2, bodyY + r * (0.3 - i * 0.15), (o.len || 0.55) * (0.1 - i * 0.15));
        root.add(backBulk);
      }
      // defined claw ridges on toes
      for (const l of parts.legs) {
        for (let i = 0; i < 2; i++) {
          const clawRidge = mesh(G.cone, lambert(0x0d0905));
          clawRidge.scale.set(r * 0.06, r * 0.12, r * 0.04);
          clawRidge.position.set((i - 0.5) * r * 0.1, -(o.legLen || 0.3) + r * 0.15, r * 0.1);
          l.pivot.add(clawRidge);
        }
      }
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
      // diagonal leather strap across the torso, with two rivets
      const strap = mesh(G.cyl, lambert(0x4a3522));
      strap.scale.set(0.018, 0.2, 0.05);
      strap.rotation.z = 0.6;
      strap.position.set(0, (parts.baseY || 0.65), 0.21);
      root.add(strap);
      for (let i = 0; i < 2; i++) {
        const rivet = mesh(G.lowSphere, lambert(0x8a7a55));
        rivet.scale.setScalar(0.012);
        rivet.position.set(-0.04 + i * 0.08, (parts.baseY || 0.65) - 0.04 + i * 0.08, 0.23);
        root.add(rivet);
      }
      // matted shoulder pelt of dark fur across the back of the neck
      addMane(parts.head, hs, o.maneColor || 0x222018, 5);
      // lower jutting tusks emphasised over the default uppers
      for (const s of [-1, 1]) {
        const lower = mesh(G.cone, lambert(o.hornColor || 0xf0ece0));
        lower.scale.set(0.016, 0.06, 0.016);
        lower.position.set(s * hs * 0.3, -hs * 0.62, hs * 0.62);
        lower.rotation.z = s * 0.15;
        parts.head.add(lower);
      }
      // bone arm-band trophy on the off arm
      if (parts.arms[0]) {
        const band = mesh(G.torus, lambert(0xe2dac4));
        band.scale.set(0.05, 0.05, 0.02);
        band.rotation.x = Math.PI / 2;
        band.position.y = -0.12;
        parts.arms[0].add(band);
      }
      // jaw ridge detail (vertical sculpting)
      const jawRidge = mesh(G.cyl, lambert(shade(tint, 0.8)));
      jawRidge.scale.set(0.01, hs * 0.25, 0.008);
      jawRidge.position.set(0, -hs * 0.62, hs * 0.75);
      parts.head.add(jawRidge);
      // knotted brow creases (pair of small ridges)
      for (const s of [-1, 1]) {
        const crease = mesh(G.cyl, lambert(shade(tint, 0.65)));
        crease.scale.set(0.008, hs * 0.15, 0.006);
        crease.position.set(s * hs * 0.25, hs * 0.52, hs * 0.78);
        crease.rotation.z = s * 0.3;
        parts.head.add(crease);
      }
      // scalp tribal scarring (diagonal scratches on crown)
      for (let i = 0; i < 3; i++) {
        const scar = mesh(G.cyl, lambert(shade(tint, 0.5)));
        scar.scale.set(0.006, hs * 0.35, 0.004);
        scar.position.set(-hs * 0.3 + i * hs * 0.3, hs * 0.65, -hs * 0.2 + i * 0.02);
        scar.rotation.z = 0.5;
        parts.head.add(scar);
      }
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
      // horizontal armor plating bands across the chest for scale-mail texture
      const plateMat = lambert(0x7a8a92);
      for (let i = 0; i < 3; i++) {
        const plate = mesh(G.sphere, plateMat);
        plate.scale.set(torsoR * 0.8, torsoR * 0.15, torsoR * 0.6);
        plate.position.set(0, by + 0.05 - i * 0.08, torsoR * 0.3);
        root.add(plate);
      }
      // reinforcing vertical ridge down the sternum
      const ridge = mesh(G.cyl, lambert(0x8a9aaa));
      ridge.scale.set(0.012, torsoR * 0.5, 0.01);
      ridge.position.set(0, by + 0.02, torsoR * 0.5);
      root.add(ridge);
      // leather belt buckle (gold accent)
      const buckle = mesh(G.lowSphere, lambert(0xc9a341));
      buckle.scale.setScalar(torsoR * 0.12);
      buckle.position.set(0, by - 0.18, torsoR * 0.7);
      root.add(buckle);
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
        // leather buckler strap across the arm
        const buckStrap = mesh(G.cyl, lambert(0x4a3522));
        buckStrap.scale.set(0.008, 0.12, 0.03);
        buckStrap.rotation.z = 0.3;
        buckStrap.position.set(-0.04, -0.08, 0.05);
        parts.arms[0].add(buckStrap);
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
      // plume retention ring (decorative band on feather base)
      const plumeRing = mesh(G.torus, lambert(0x8a7a55));
      plumeRing.scale.set(hs * 0.2, hs * 0.2, hs * 0.08);
      plumeRing.rotation.x = Math.PI / 2;
      plumeRing.position.y = hs * 1.25;
      parts.head.add(plumeRing);
      // tribal face paint: vertical stripes on cheeks
      for (const s of [-1, 1]) {
        const stripe = mesh(G.cyl, lambert(0xaa2020));
        stripe.scale.set(0.008, hs * 0.25, 0.006);
        stripe.position.set(s * hs * 0.35, 0, hs * 0.6);
        parts.head.add(stripe);
      }
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
      // pale ritual scars on the shoulders (ridged battle wounds)
      for (const s of [-1, 1]) {
        for (let i = 0; i < 2; i++) {
          const scar = mesh(G.cyl, lambert(shade(tint, 1.3)));
          scar.scale.set(0.008, torsoR * 0.25, 0.006);
          scar.position.set(s * (torsoR + 0.01), by + 0.15 * h - i * 0.04, -0.02);
          scar.rotation.z = s * 0.4;
          root.add(scar);
        }
      }
      // forehead war-paint stripe
      const foreStrike = mesh(G.cyl, lambert(0xaa2020));
      foreStrike.scale.set(hs * 0.08, hs * 0.2, 0.01);
      foreStrike.position.set(0, hs * 0.35, hs * 0.85);
      parts.head.add(foreStrike);
      // battle-hardened jaw definition (dark shadow at jawline)
      const jawDef = mesh(G.sphere, lambert(shade(tint, 0.6)));
      jawDef.scale.set(hs * 0.7, hs * 0.18, hs * 0.55);
      jawDef.position.set(0, -hs * 0.48, hs * 0.58);
      parts.head.add(jawDef);
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
      // totem eye sockets (dark detail)
      for (const s of [-1, 1]) {
        const socket = mesh(G.lowSphere, lambert(0x2a1a0a));
        socket.scale.setScalar(hs * 0.12);
        socket.position.set(s * hs * 0.15, hs * 1.72, hs * 0.25);
        parts.head.add(socket);
      }
      // robe hood trim detail (bone edge accent)
      const trim = mesh(G.torus, lambert(0xd8d0c0));
      trim.scale.set(hs * 0.75, hs * 0.75, hs * 0.15);
      trim.rotation.x = Math.PI / 2;
      trim.position.set(0, hs * 0.6, hs * 0.05);
      parts.head.add(trim);
      // spiritual aura rings on arms (stacked torii-like bands)
      for (const arm of parts.arms) {
        const aura = mesh(G.torus, lambert(0x7fff7a));
        aura.scale.set(0.04, 0.04, 0.012);
        aura.rotation.x = Math.PI / 2;
        aura.position.y = -0.16;
        arm.add(aura);
      }
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
      // wolf fur tuft detail on the mane
      addFur(whead, r * 0.4, shade(0x55504a, 0.7), 1, 5, 0.9);
      // saddle cloth under the rider
      const saddleCloth = mesh(G.sphere, lambert(0x6a5a42));
      saddleCloth.scale.set(r * 1.2, r * 0.35, r * 1.1);
      saddleCloth.position.set(0, bodyY + r * 0.3, -len * 0.1);
      root.add(saddleCloth);
      // reins (thin straps from rider hands to wolf head)
      const rein = mesh(G.cyl, lambert(0x5a4a30));
      rein.scale.set(0.006, 0.35, 0.008);
      rein.rotation.z = 0.25;
      rein.position.set(-0.1, 0.25, len * 0.15);
      root.add(rein);
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
      // helm face-guard grille (horizontal bars)
      for (let i = 0; i < 3; i++) {
        const bar = mesh(G.cyl, lambert(0x6a6f78));
        bar.scale.set(hs * 0.4, 0.012, 0.008);
        bar.position.set(0, hs * 0.1 - i * 0.08, hs * 0.68);
        parts.head.add(bar);
      }
      // face-guard side rivets
      for (const s of [-1, 1]) {
        for (let i = 0; i < 2; i++) {
          const rivet = mesh(G.lowSphere, lambert(0x8a8f96));
          rivet.scale.setScalar(0.01);
          rivet.position.set(s * hs * 0.4, 0.04 - i * 0.08, hs * 0.7);
          parts.head.add(rivet);
        }
      }
      // noseguard ridge down the helm
      const nose = mesh(G.cyl, lambert(0x5a5f68));
      nose.scale.set(0.01, hs * 0.35, 0.008);
      nose.position.set(0, hs * 0.05, hs * 0.75);
      parts.head.add(nose);
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
      // mask eye sockets (dark hollow threat)
      for (const s of [-1, 1]) {
        const socket = mesh(G.lowSphere, lambert(0x1a1a1a));
        socket.scale.setScalar(hs * 0.14);
        socket.position.set(s * hs * 0.25, hs * 0.2, hs * 0.82);
        parts.head.add(socket);
      }
      // skull-mask nasal ridge detail
      const noseRidge = mesh(G.cyl, lambert(0xd8d0c0));
      noseRidge.scale.set(0.008, hs * 0.4, 0.006);
      noseRidge.position.set(0, -hs * 0.15, hs * 0.9);
      parts.head.add(noseRidge);
      // temple plating (horizontal ridges on mask sides)
      for (const s of [-1, 1]) {
        for (let i = 0; i < 2; i++) {
          const plate = mesh(G.sphere, lambert(0x7a7f88));
          plate.scale.set(hs * 0.12, hs * 0.08, hs * 0.1);
          plate.position.set(s * hs * 0.45, hs * 0.05 - i * 0.12, hs * 0.65);
          parts.head.add(plate);
        }
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
      // warty bumps on the nose and face
      for (let i = 0; i < 3; i++) {
        const wart = mesh(G.lowSphere, lambert(shade(tint, 0.7)));
        wart.scale.setScalar(hs * 0.06);
        wart.position.set(-hs * 0.12 + i * hs * 0.12, -hs * 0.15 + i * hs * 0.04, hs * 0.95);
        parts.head.add(wart);
      }
      // ear inner passages (dark detail)
      for (const s of [-1, 1]) {
        const earInner = mesh(G.cone, lambert(0x4a3a2a));
        earInner.scale.set(0.012, 0.08, 0.01);
        earInner.position.set(s * hs * 0.95, hs * 0.25, 0.01);
        earInner.rotation.z = -s * 0.9;
        parts.head.add(earInner);
      }
      // loincloth frayed edges (irregular tufts)
      for (let i = 0; i < 4; i++) {
        const fray = mesh(G.sphere, lambert(shade(0x7a5a30, 0.8)));
        fray.scale.set(0.025, 0.035, 0.015);
        fray.position.set(Math.cos(i * Math.PI / 2) * 0.08, by - 0.22, Math.sin(i * Math.PI / 2) * 0.08);
        root.add(fray);
      }
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
      // dents on the helm (protruding bumps)
      for (let i = 0; i < 3; i++) {
        const dent = mesh(G.lowSphere, lambert(0x9a9f8a));
        dent.scale.setScalar(hs * 0.08);
        dent.position.set((i - 1) * hs * 0.3, hs * 0.4 - Math.abs(i - 1) * 0.03, -hs * 0.15);
        parts.head.add(dent);
      }
      // helm rivets (junk craftsmanship)
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        const rivet = mesh(G.lowSphere, lambert(0x6a6f5a));
        rivet.scale.setScalar(0.01);
        rivet.position.set(Math.cos(a) * hs * 0.5, hs * 0.3 + Math.sin(a) * hs * 0.2, -hs * 0.05);
        parts.head.add(rivet);
      }
      // shoulder pad strap buckle
      const buckle = mesh(G.lowSphere, lambert(0x7a7f6a));
      buckle.scale.setScalar(torsoR * 0.08);
      buckle.position.set(torsoR + 0.01, by + torsoR * 0.65, 0.02);
      root.add(buckle);
      // bag hanging trinkets (small dangling junk)
      for (let i = 0; i < 2; i++) {
        const trinket = mesh(G.lowSphere, lambert(0x8a6a3a));
        trinket.scale.setScalar(0.015);
        trinket.position.set(-0.06 - i * 0.02, by - 0.1, -torsoR * 0.8);
        root.add(trinket);
      }
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
      // hood edge trim (layered fabric look)
      const hoodTrim = mesh(G.torus, lambert(0x0f1318));
      hoodTrim.scale.set(hs * 0.85, hs * 0.85, hs * 0.2);
      hoodTrim.rotation.x = Math.PI / 2;
      hoodTrim.position.set(0, hs * 0.3, hs * 0.05);
      parts.head.add(hoodTrim);
      // mask stitching detail (vertical seam)
      const stitch = mesh(G.cyl, lambert(0x0a0a0a));
      stitch.scale.set(0.006, hs * 0.35, 0.004);
      stitch.position.set(0, -hs * 0.15, hs * 0.68);
      parts.head.add(stitch);
      // eye-slit hood shadows (deepening the mystery)
      for (const s of [-1, 1]) {
        const shadow = mesh(G.sphere, lambert(0x0a0d12));
        shadow.scale.set(hs * 0.15, hs * 0.1, hs * 0.08);
        shadow.position.set(s * hs * 0.25, hs * 0.1, hs * 0.88);
        parts.head.add(shadow);
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
      // crown spikes with bone variations
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const spike = mesh(G.cone, boneMat);
        spike.scale.set(0.018, 0.07 + (i % 2) * 0.03, 0.018);
        spike.position.set(Math.cos(a) * hs * 0.85, hs * 0.85, Math.sin(a) * hs * 0.85);
        spike.rotation.z = -Math.cos(a) * 0.3;
        spike.rotation.x = Math.sin(a) * 0.3;
        parts.head.add(spike);
        // darker base band on each spike
        const band = mesh(G.lowSphere, lambert(shade(0xe4ddc8, 0.7)));
        band.scale.setScalar(0.012);
        band.position.set(Math.cos(a) * hs * 0.85, hs * 0.75, Math.sin(a) * hs * 0.85);
        parts.head.add(band);
      }
      // facial bone trinkets hung from a cord
      const cord = mesh(G.cyl, lambert(0x4a3522));
      cord.scale.set(0.008, hs * 0.4, 0.006);
      cord.position.set(0, -hs * 0.3, hs * 0.75);
      parts.head.add(cord);
      for (let i = 0; i < 3; i++) {
        const trinket = mesh(G.sphere, boneMat);
        trinket.scale.setScalar(hs * 0.08);
        trinket.position.set(-hs * 0.15 + i * hs * 0.15, -hs * 0.5, hs * 0.75);
        parts.head.add(trinket);
      }
      // boss eye glow (if built as supreme/boss, eyes should glow)
      if (API.isBoss) {
        for (const s of [-1, 1]) {
          const eyeGlow = mesh(G.lowSphere, API.EYE_BOSS || lambert(0xff4444));
          eyeGlow.scale.setScalar(hs * 0.1);
          eyeGlow.position.set(s * hs * 0.25, hs * 0.15, hs * 0.85);
          parts.head.add(eyeGlow);
        }
      }
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
      // heavy brow ridge
      if (parts.head) {
        const brow = mesh(G.sphere, lambert(shade(tint, 0.7)));
        brow.scale.set(0.15, 0.08, 0.12);
        brow.position.set(0, 0.12, 0.18);
        parts.head.add(brow);
      }
      const hump = mesh(G.sphere, lambert(shade(tint, 0.85)));
      hump.scale.set(0.22, 0.18, 0.2);
      hump.position.set(0, hb + 0.16, -0.16);
      root.add(hump);
      // long dangling forearms (extra capsule under each hand) to read as ape-armed.
      for (const arm of parts.arms) { addClaws(arm, -0.3 * (o.height||1.3), 0.03, 0.02, 0.035, 3); }
      // a few warts (small bumps) on the shoulders.
      for (const s of [-1,1]) { const wart = mesh(G.lowSphere, lambert(shade(tint,0.6))); wart.scale.setScalar(0.04); wart.position.set(s*0.18, hb+0.22, -0.02); root.add(wart); }
      // rough hide texture
      addSpots(root, 0.2, tint, 7, 0.6);
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
      // icy brow ridge
      if (parts.head) {
        const iceBrow = mesh(G.sphere, ice);
        iceBrow.scale.set(0.14, 0.06, 0.1);
        iceBrow.position.set(0, 0.12, 0.16);
        parts.head.add(iceBrow);
      }
      // shoulder shard clusters.
      for (const s of [-1,1]) { for (let i=0;i<3;i++){ const sh = mesh(G.cone, ice); const sc = 0.12 + i*0.04; sh.scale.set(0.028, sc, 0.028); sh.position.set(s*(0.2+i*0.015), hb+0.24, -0.05 + i*0.05); sh.rotation.z = -s*(0.4 - i*0.2); sh.rotation.x = -0.2; root.add(sh); } }
      // frosty rime patches (pale flattened spots) on the chest.
      addSpots(root.children[0], 0.22, 0xeaf6ff, 5, 1.0);
      // glowing frost accents on shoulders
      for (const s of [-1, 1]) {
        const frostAcc = mesh(G.lowSphere, lambert(0xd8f0ff));
        frostAcc.scale.setScalar(0.04);
        frostAcc.position.set(s * 0.22, hb + 0.2, 0.02);
        root.add(frostAcc);
      }
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
      // mossy brow ridge
      if (parts.head) {
        const mossBrow = mesh(G.sphere, lambert(shade(moss, 1.1)));
        mossBrow.scale.set(0.14, 0.07, 0.11);
        mossBrow.position.set(0, 0.1, 0.15);
        parts.head.add(mossBrow);
      }
      // dangling mud/vine strands down the arms.
      for (const arm of parts.arms) { const vine = mesh(G.capsule, lambert(shade(moss,0.8))); vine.scale.set(0.012, 0.1, 0.012); vine.position.set(0.04, -0.34*(o.height||1.3), 0.02); arm.add(vine); }
      // a wet mud lump on the belly/back.
      const mud = mesh(G.sphere, lambert(0x4a3a26)); mud.scale.set(0.14,0.1,0.12); mud.position.set(0.08, hb+0.02, 0.18); root.add(mud);
      for (const s of [-1,1]){ const m = mesh(G.lowSphere, lambert(0x3a2e1c)); m.scale.setScalar(0.05); m.position.set(s*0.16, hb-0.12, 0.12); root.add(m); }
      // slimy drips down the torso
      for (let i = 0; i < 3; i++) {
        const slime = mesh(G.lowSphere, lambert(shade(moss, 0.75)));
        slime.scale.set(0.08, 0.12, 0.04);
        slime.position.set(0, hb + 0.12 - i * 0.1, 0.2);
        root.add(slime);
      }
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
      // craggy stone brow ridge
      if (parts.head) {
        const stoneBrow = mesh(G.sphere, rock);
        stoneBrow.scale.set(0.16, 0.09, 0.13);
        stoneBrow.position.set(0, 0.13, 0.17);
        parts.head.add(stoneBrow);
      }
      // stony back plates (cones flattened, deterministic placement).
      for (let i=0;i<5;i++){ const a = i*1.4; const p = mesh(G.cone, i%2?rock:lite); p.scale.set(0.06,0.09,0.04); p.position.set(Math.cos(a)*0.14, hb+0.05+i*0.05, -0.16 - (i%2)*0.02); p.rotation.x = -1.0; root.add(p); }
      // blocky shoulder boulders.
      for (const s of [-1,1]){ const b = mesh(G.sphere, rock); b.scale.set(0.13,0.1,0.12); b.position.set(s*0.22, hb+0.24, -0.02); root.add(b); }
      // craggy rock texture bumps
      for (let i = 0; i < 4; i++) {
        const bump = mesh(G.lowSphere, lite);
        bump.scale.set(0.06, 0.05, 0.05);
        bump.position.set(-0.12 + i * 0.08, hb + 0.08, 0.15);
        root.add(bump);
      }
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
      // scarred brow ridge
      if (parts.head) {
        const scarBrow = mesh(G.sphere, lambert(shade(tint, 0.65)));
        scarBrow.scale.set(0.16, 0.08, 0.12);
        scarBrow.position.set(0, 0.11, 0.16);
        parts.head.add(scarBrow);
      }
      // scar stripes (thin dark cylinders) across chest.
      for (let i=0;i<3;i++){ const sc = mesh(G.cyl, lambert(shade(tint,0.45))); sc.scale.set(0.006, 0.09, 0.006); sc.rotation.z = 0.5; sc.position.set(-0.05+i*0.05, hb+0.18-i*0.04, 0.2); root.add(sc); }
      // more battle scars on the face and neck
      for (let i = 0; i < 2; i++) {
        const scar = mesh(G.cyl, lambert(shade(tint, 0.35)));
        scar.scale.set(0.008, 0.1, 0.008);
        scar.position.set(-0.06 + i * 0.12, -0.1 - i * 0.05, 0.18);
        scar.rotation.z = 0.4 - i * 0.5;
        if (parts.head) parts.head.add(scar);
      }
      // bone trophy necklace: ring of little white cones at the throat.
      if (parts.head){ for (let i=0;i<5;i++){ const a=(i/4-0.5)*1.8; const bone = mesh(G.cone, lambert(0xede5cf)); bone.scale.set(0.014,0.05,0.014); bone.position.set(Math.sin(a)*0.18, -0.26, Math.cos(a)*0.16+0.04); bone.rotation.x = Math.PI; parts.head.add(bone); } }
      // war-paint face mark (red stripe under eyes).
      if (parts.head){ const paint = mesh(G.sphere, lambert(0xaa2a22)); paint.scale.set(0.16,0.02,0.04); paint.position.set(0,0.0,0.2); parts.head.add(paint); }
      // battle scars on the arms for elite warrior look
      for (const arm of parts.arms) {
        const armScar = mesh(G.cyl, lambert(shade(tint, 0.3)));
        armScar.scale.set(0.007, 0.14, 0.007);
        armScar.position.set(0.04, -0.2, 0);
        armScar.rotation.z = 0.6;
        arm.add(armScar);
      }
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
      // massive angry brow ridge with rage glow
      if (parts.head) {
        const rageBrow = mesh(G.sphere, lambert(shade(tint, 0.68)));
        rageBrow.scale.set(0.18, 0.1, 0.14);
        rageBrow.position.set(0, 0.14, 0.18);
        parts.head.add(rageBrow);
        // brow glow accents
        for (const s of [-1, 1]) {
          const glow = mesh(G.lowSphere, lambert(0xff5522));
          glow.scale.setScalar(0.035);
          const hs = 0.2 * (o.headScale || 1.15);
          glow.position.set(s * hs * 0.35, 0.16, hs * 0.7);
          parts.head.add(glow);
        }
      }
      // glowing rage eyes: extra bright pupils.
      if (parts.head){ for (const s of [-1,1]){ const g = mesh(G.lowSphere, lambert(0xff5522)); g.scale.setScalar(0.05); const hs = 0.2*(o.headScale||1.15); g.position.set(s*hs*0.45, 0.06, hs*0.98); parts.head.add(g); } }
      // bulging muscle lumps on arms and shoulders.
      for (const arm of parts.arms){ const bicep = mesh(G.sphere, lambert(shade(tint,1.05))); bicep.scale.set(0.09,0.1,0.09); bicep.position.set(0,-0.16*(o.height||1.6),0.02); arm.add(bicep); }
      for (const s of [-1,1]){ const tr = mesh(G.sphere, lambert(shade(tint,0.85))); tr.scale.set(0.16,0.14,0.14); tr.position.set(s*0.26, hb+0.3, -0.02); root.add(tr); }
      // jagged rage spikes down the spine.
      for (let i=0;i<6;i++){ const sp = mesh(G.cone, lambert(shade(tint,0.55))); sp.scale.set(0.03,0.1+ (i===2||i===3?0.05:0),0.03); sp.position.set(0, hb-0.05+i*0.07, -0.2); sp.rotation.x=-1.1; root.add(sp); }
      // glowing rage accents on chest and shoulders
      for (let i = 0; i < 3; i++) {
        const rageGlow = mesh(G.lowSphere, lambert(0xff5522));
        rageGlow.scale.setScalar(0.032);
        rageGlow.position.set(-0.1 + i * 0.1, hb + 0.1 - i * 0.03, 0.2);
        root.add(rageGlow);
      }
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
        // helm rivets for durable construction.
        for (let i=0;i<4;i++){ const riv = mesh(G.lowSphere, lambert(0x6a6f78)); riv.scale.setScalar(hs*0.06); riv.position.set(Math.cos(i/4*Math.PI*2)*hs*0.5, hs*0.2, Math.sin(i/4*Math.PI*2)*hs*0.5); parts.head.add(riv); }
      }
      const hb = parts.baseY || 0.45;
      // sturdy chest plate with center seam.
      const plate = mesh(G.sphere, lambert(0x7a7f88)); plate.scale.set(0.15, 0.14, 0.11); plate.position.set(0, hb+0.15, 0.18); root.add(plate);
      const seam = mesh(G.cyl, lambert(0x5a5f68)); seam.scale.set(0.01, 0.16, 0.01); seam.position.set(0, hb+0.12, 0.2); root.add(seam);
      // thick leather belt with a gold buckle.
      const belt = mesh(G.torus, lambert(0x4a2e18)); belt.scale.set(0.2,0.2,0.06); belt.rotation.x=Math.PI/2; belt.position.y = hb-0.02; root.add(belt);
      const buckle = mesh(G.sphere, GOLD); buckle.scale.set(0.04,0.05,0.03); buckle.position.set(0,hb-0.02,0.22); root.add(buckle);
      // belt studs for reinforcement.
      for (let i=0;i<3;i++){ const stud = mesh(G.lowSphere, lambert(0xb8a888)); stud.scale.setScalar(0.016); stud.position.set(-0.1+i*0.1, hb-0.02, 0.06); root.add(stud); }
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
        // helm reinforcement band around the base.
        const helmBand = mesh(G.torus, lambert(0x7a808a)); helmBand.scale.set(hs*0.6, hs*0.6, hs*0.06); helmBand.rotation.x = Math.PI/2; helmBand.position.y = -hs*0.15; parts.head.add(helmBand);
      }
      const hb = parts.baseY || 0.45;
      // plate chest seam + rivets.
      const seam = mesh(G.cyl, lambert(0x6a6f78)); seam.scale.set(0.01,0.18,0.01); seam.position.set(0,hb+0.18,0.22); root.add(seam);
      for (let i=0;i<3;i++){ const r = mesh(G.lowSphere, lambert(0xb8c0cc)); r.scale.setScalar(0.018); r.position.set(0.08, hb+0.1+i*0.07, 0.2); root.add(r); }
      // side plate armor for protection.
      for (const s of [-1,1]){ const sideplate = mesh(G.dome, lambert(0x8a8f98)); sideplate.scale.set(0.12, 0.12, 0.08); sideplate.position.set(s*0.2, hb+0.08, 0.12); root.add(sideplate); }
      // shin guards on legs.
      const shinL = mesh(G.cyl, lambert(0x7a808a)); shinL.scale.set(0.05, 0.1, 0.045); shinL.position.set(0, hb-0.35, 0.08); root.add(shinL);
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
        // reinforcement bands on helm for tower-like durability.
        for (let i=0;i<2;i++){ const band = mesh(G.torus, lambert(0x7a808a)); band.scale.set(hs*0.55, hs*0.55, hs*0.08); band.rotation.x = Math.PI/2; band.position.y = hs*(0.15 + i*0.4); parts.head.add(band); }
      }
      const hb = parts.baseY || 0.46;
      // segmented chest plate for tower-like protection.
      for (let i=0;i<3;i++){ const plate = mesh(G.sphere, lambert(shade(0x8a8f98, 0.85 + i*0.05))); plate.scale.set(0.16, 0.1 - i*0.02, 0.13); plate.position.set(0, hb+0.18 - i*0.1, 0.16); root.add(plate); }
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
        // mystical brow gem for earth-mage prestige.
        const browGem = mesh(G.lowSphere, lambert(0x44ddaa)); browGem.scale.setScalar(hs*0.1); browGem.position.set(0, hs*0.35, hs*0.72); parts.head.add(browGem);
      }
      const hb = parts.baseY || 0.45;
      // long robe skirt (cone) covering the legs.
      const robe = mesh(G.cone, lambert(o.hoodColor || 0x3a2e5a)); robe.scale.set(0.26,0.4,0.22); robe.position.y = hb-0.16; root.add(robe);
      // runic glow band on the hem.
      for (let i=0;i<6;i++){ const a=(i/6)*Math.PI*2; const rune = mesh(G.lowSphere, lambert(0x44ddaa)); rune.scale.setScalar(0.022); rune.position.set(Math.cos(a)*0.2, hb-0.32, Math.sin(a)*0.2); root.add(rune); }
      // earth-element side inlays on robe for geomancer nature.
      for (let i=0;i<2;i++){ const inlay = mesh(G.cone, lambert(0x88cc66)); inlay.scale.set(0.08, 0.16, 0.06); inlay.rotation.z = (i === 0 ? -0.5 : 0.5); inlay.position.set((i === 0 ? -0.18 : 0.18), hb+0.05, 0); root.add(inlay); }
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
        // subtle brow ridge for noble grace.
        const brow = mesh(G.sphere, lambert(shade(tint, 0.85))); brow.scale.set(hs*0.5, hs*0.14, hs*0.25); brow.position.set(0, hs*0.3, hs*0.7); parts.head.add(brow);
      }
      const hb = parts.baseY || 0.5;
      // short shoulder cloak (dome) draping the back, green leaf-tint.
      const cloak = mesh(G.dome, lambert(0x3a6a3a)); cloak.scale.set(0.2,0.26,0.16); cloak.rotation.x = Math.PI*0.1; cloak.position.set(0, hb+0.26, -0.1); root.add(cloak);
      // leaf details on cloak edge.
      for (let i=0;i<3;i++){ const leafDetail = mesh(G.cone, lambert(shade(0x2a5a2a, 1.2))); leafDetail.scale.set(0.08, 0.06, 0.04); leafDetail.rotation.z = i*0.6-0.6; leafDetail.position.set((i-1)*0.1, hb+0.12, -0.18); root.add(leafDetail); }
      // quiver of arrows across the back.
      const quiver = mesh(G.cyl, lambert(0x5a3a1e)); quiver.scale.set(0.04,0.16,0.04); quiver.rotation.z=0.4; quiver.position.set(0.12, hb+0.3, -0.15); root.add(quiver);
      for (let i=0;i<3;i++){ const arr = mesh(G.cone, lambert(0xddccaa)); arr.scale.set(0.012,0.05,0.012); arr.position.set(0.1+i*0.02, hb+0.5, -0.16); root.add(arr); }
      // golden wrist rings on both arms for nobility.
      for (const s of [-1,1]){ const ring = mesh(G.torus, lambert(GOLD)); ring.scale.set(0.065, 0.065, 0.02); ring.rotation.x = Math.PI/2; ring.position.set(s*0.08, -0.22, 0.05); parts.arms[s>0?1:0].add(ring); }
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
        // fur trim on hood edge for warmth.
        for (let i=0;i<3;i++){ const fur = mesh(G.lowSphere, lambert(shade(o.hoodColor||0x4a5a3a, 0.75))); fur.scale.set(hs*0.12, hs*0.08, hs*0.1); fur.position.set((i-1)*hs*0.4, hs*0.65, hs*0.55); parts.head.add(fur); }
      }
      const hb = parts.baseY || 0.5;
      // crossed leather straps over the chest.
      for (const s of [-1,1]){ const strap = mesh(G.cyl, lambert(0x5a3a22)); strap.scale.set(0.012, 0.2, 0.012); strap.rotation.z = s*0.6; strap.position.set(0, hb+0.16, 0.2); root.add(strap); }
      // strap buckles for detail.
      for (const s of [-1,1]){ const buckle = mesh(G.lowSphere, lambert(0x8a7a5a)); buckle.scale.setScalar(0.014); buckle.position.set(s*0.012, hb+0.16, 0.25); root.add(buckle); }
      // belt pouch + dagger.
      const pouch = mesh(G.sphere, lambert(0x4a2e18)); pouch.scale.set(0.05,0.05,0.04); pouch.position.set(-0.1, hb-0.04, 0.18); root.add(pouch);
      const dagger = mesh(G.cone, STEEL); dagger.scale.set(0.012,0.08,0.012); dagger.position.set(0.12, hb-0.06, 0.16); dagger.rotation.x = 0.3; root.add(dagger);
      // wrapped leg guards for ranger practicality.
      const legWrap = mesh(G.cyl, lambert(0x5a4a2a)); legWrap.scale.set(0.04, 0.12, 0.04); legWrap.position.set(0, hb-0.35, 0.06); root.add(legWrap);
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
        // mystical brow glow with arcane marking.
        const brow = mesh(G.sphere, lambert(0x6a7aff)); brow.scale.set(hs*0.5, hs*0.15, hs*0.25); brow.position.set(0, hs*0.35, hs*0.7); parts.head.add(brow);
      }
      const hb = parts.baseY || 0.52;
      // long flowing robe (cone) over the legs in deep blue.
      const robe = mesh(G.cone, lambert(o.hoodColor||0x2a2a6a)); robe.scale.set(0.24,0.46,0.2); robe.position.y = hb-0.2; root.add(robe);
      // tall mage collar behind the neck.
      const collar = mesh(G.dome, lambert(shade(o.hoodColor||0x2a2a6a, 1.3))); collar.scale.set(0.16,0.18,0.1); collar.rotation.x=-0.4; collar.position.set(0, hb+0.3, -0.1); root.add(collar);
      // horizontal arcane energy RING orbiting the torso.
      const ring = mesh(G.torus, lambert(0x99aaff)); ring.scale.set(0.3,0.3,0.04); ring.rotation.x = Math.PI/2; ring.position.y = hb+0.2; root.add(ring);
      // robe hem glyphs for arcane scripting.
      for (let i=0;i<5;i++){ const a=(i/5)*Math.PI*2; const glyph = mesh(G.lowSphere, lambert(0x99aaff)); glyph.scale.setScalar(0.018); glyph.position.set(Math.cos(a)*0.18, hb-0.38, Math.sin(a)*0.18); root.add(glyph); }
      // star motes scattered above one hand.
      for (let i=0;i<4;i++){ const a=(i/4)*Math.PI*2; const star = mesh(G.lowSphere, lambert(0xccddff)); star.scale.setScalar(0.02); star.position.set(Math.cos(a)*0.16, hb+0.5+Math.sin(a)*0.05, Math.sin(a)*0.16+0.14); root.add(star); }
      // arcane marks on hands for spellcasting power.
      for (const s of [-1,1]){ const handMark = mesh(G.lowSphere, lambert(0x7788ff)); handMark.scale.setScalar(0.016); handMark.position.set(s*0.1, -0.15, 0.06); parts.arms[s>0?1:0].add(handMark); }
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
        // strong brow ridge for warrior intensity.
        const brow = mesh(G.sphere, lambert(shade(tint, 0.75))); brow.scale.set(hs*0.6, hs*0.18, hs*0.3); brow.position.set(0, hs*0.4, hs*0.7); parts.head.add(brow);
      }
      const hb = parts.baseY || 0.5;
      // muscle definition: shoulder caps and arm bands.
      for (const s of [-1,1]){ const shoulderCap = mesh(G.sphere, lambert(shade(tint, 0.9))); shoulderCap.scale.set(0.12,0.11,0.12); shoulderCap.position.set(s*0.25, hb+0.32, 0.08); root.add(shoulderCap); }
      // chest indicates a feminine silhouette (slightly tapered torso already via girth) + a single leather pauldron on right.
      const pad = mesh(G.dome, lambert(0x6a3a1e)); pad.scale.set(0.1,0.09,0.1); pad.position.set(0.22, hb+0.3, 0); root.add(pad);
      // armor strap detail on pauldron.
      const padStrap = mesh(G.cyl, lambert(0x4a2210)); padStrap.scale.set(0.018, 0.15, 0.018); padStrap.rotation.z = 0.4; padStrap.position.set(0.22, hb+0.22, -0.08); root.add(padStrap);
      // waist cincher.
      const belt = mesh(G.torus, lambert(0x4a2a14)); belt.scale.set(0.17,0.17,0.05); belt.rotation.x=Math.PI/2; belt.position.y = hb+0.02; root.add(belt);
      // belt studs for reinforcement.
      for (let i=0;i<4;i++){ const stud = mesh(G.lowSphere, lambert(0xb8a888)); stud.scale.setScalar(0.018); stud.position.set(Math.cos(i/4*Math.PI*2)*0.17, hb+0.02, Math.sin(i/4*Math.PI*2)*0.05); root.add(stud); }
      // bandolier of throwing knives across the chest.
      for (let i=0;i<3;i++){ const kn = mesh(G.cone, STEEL); kn.scale.set(0.01,0.05,0.01); kn.position.set(-0.08+i*0.05, hb+0.12, 0.2); kn.rotation.z=0.3; root.add(kn); }
      // arm bracers on both forearms.
      for (const s of [-1,1]){ const bracer = mesh(G.cyl, lambert(0x5a4a2a)); bracer.scale.set(0.035, 0.08, 0.035); bracer.position.set(s*0.1, -0.12, 0.05); parts.arms[s>0?1:0].add(bracer); }
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
        // golden crown circlet above the helm with a central gem.
        const circlet = mesh(G.torus, lambert(GOLD)); circlet.scale.set(hs*0.6, hs*0.6, hs*0.08); circlet.rotation.x = Math.PI/2; circlet.position.y = hs*0.8; parts.head.add(circlet);
        const centerGem = mesh(G.lowSphere, lambert(0xffdd44)); centerGem.scale.setScalar(hs*0.1); centerGem.position.set(0, hs*0.95, hs*0.5); parts.head.add(centerGem);
      }
      const hb = parts.baseY || 0.55;
      // large white FEATHERED back-wings (two fans of cones each side).
      for (const s of [-1,1]){ for (let i=0;i<5;i++){ const t=i/4; const feat = mesh(G.cone, lambert(0xf6f8ff)); feat.scale.set(0.04, 0.22 - t*0.06, 0.02); feat.position.set(s*(0.1+t*0.28), hb+0.34 - t*0.14, -0.16 - t*0.04); feat.rotation.z = s*(1.0 + t*0.5); feat.rotation.x = -0.3; root.add(feat); } }
      // gleaming plate breast + faulds (skirt of plates).
      const breast = mesh(G.sphere, lambert(0xe2e6ee)); breast.scale.set(0.16,0.14,0.12); breast.position.set(0, hb+0.2, 0.16); root.add(breast);
      // chest plate seams and rivets for structure.
      const seam = mesh(G.cyl, lambert(0xaab0bb)); seam.scale.set(0.012, 0.14, 0.012); seam.position.set(0, hb+0.18, 0.22); root.add(seam);
      for (let i=0;i<3;i++){ const riv = mesh(G.lowSphere, lambert(shade(0xd8dde6, 0.7))); riv.scale.setScalar(0.016); riv.position.set(0.08, hb+0.08+i*0.08, 0.2); root.add(riv); }
      const fauld = mesh(G.cone, lambert(0xc8cdd6)); fauld.scale.set(0.18,0.16,0.16); fauld.position.y = hb-0.06; root.add(fauld);
      // plate segments on fauld for segmented look.
      for (let i=0;i<4;i++){ const plate = mesh(G.sphere, lambert(shade(0xc8cdd6, 0.85))); plate.scale.set(0.14, 0.08, 0.12); plate.position.set(0, hb-0.12 - i*0.08, 0.04); root.add(plate); }
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
      // strong brow ridge over the eyes
      const brow = mesh(G.sphere, lambert(shade(tint, 0.75)));
      brow.scale.set(hs * 0.65, hs * 0.18, hs * 0.35);
      brow.position.set(0, hs * 0.38, hs * 0.65);
      head.add(brow);
      // heavy jaw definition
      const jaw = mesh(G.sphere, lambert(shade(tint, 0.88)));
      jaw.scale.set(hs * 0.58, hs * 0.24, hs * 0.5);
      jaw.position.set(0, -hs * 0.42, hs * 0.55);
      head.add(jaw);
      // nostril flare accents on the nose pad
      for (const s of [-1, 1]) {
        const nostril = mesh(G.lowSphere, lambert(shade(tint, 0.45)));
        nostril.scale.set(hs * 0.08, hs * 0.06, hs * 0.1);
        nostril.position.set(s * hs * 0.16, -hs * 0.26, hs * 1.35);
        head.add(nostril);
      }
      // shaggy mane crest down the back of the neck/head
      addMane(head, hs, shade(tint, 0.55), 6);
      // fur ruff around the chest/shoulders for a beefy bovine bulk
      addFur(parts.head.parent ? root : root, 0.3, tint, 1, 9, 0.8);
      // muscled shoulder plates
      for (const s of [-1, 1]) {
        const plate = mesh(G.sphere, lambert(shade(tint, 0.92)));
        plate.scale.set(0.18, 0.16, 0.14);
        plate.position.set(s * 0.26, (parts.baseY || 0.65) + 0.15, 0.08);
        root.add(plate);
      }
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
      // sculpted brow and jaw for defined look
      const brow = mesh(G.sphere, lambert(shade(tint, 0.75)));
      brow.scale.set(hs * 0.6, hs * 0.16, hs * 0.3);
      brow.position.set(0, hs * 0.35, hs * 0.62);
      head.add(brow);
      const jaw = mesh(G.sphere, lambert(shade(tint, 0.85)));
      jaw.scale.set(hs * 0.52, hs * 0.22, hs * 0.48);
      jaw.position.set(0, -hs * 0.38, hs * 0.5);
      head.add(jaw);
      // nostril accents
      for (const s of [-1, 1]) {
        const nostril = mesh(G.lowSphere, lambert(shade(tint, 0.4)));
        nostril.scale.set(hs * 0.07, hs * 0.05, hs * 0.08);
        nostril.position.set(s * hs * 0.14, -hs * 0.24, hs * 1.2);
        head.add(nostril);
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
      // lean muscle definition on chest
      const pec = mesh(G.sphere, lambert(shade(tint, 0.95)));
      pec.scale.set(0.12, 0.1, 0.08);
      pec.position.set(0, (parts.baseY || 0.6) + 0.08, 0.18);
      root.add(pec);
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
      // strong brow ridge under the helm
      const brow = mesh(G.sphere, lambert(shade(tint, 0.72)));
      brow.scale.set(hs * 0.62, hs * 0.15, hs * 0.32);
      brow.position.set(0, hs * 0.36, hs * 0.6);
      head.add(brow);
      // heavy jaw with flared nostrils
      const jaw = mesh(G.sphere, lambert(shade(tint, 0.88)));
      jaw.scale.set(hs * 0.54, hs * 0.24, hs * 0.5);
      jaw.position.set(0, -hs * 0.4, hs * 0.5);
      head.add(jaw);
      for (const s of [-1, 1]) {
        const nostril = mesh(G.lowSphere, lambert(shade(tint, 0.35)));
        nostril.scale.set(hs * 0.08, hs * 0.06, hs * 0.1);
        nostril.position.set(s * hs * 0.15, -hs * 0.22, hs * 1.3);
        head.add(nostril);
      }
      // heavy iron breastplate slab on the torso
      const bp = mesh(G.sphere, plate);
      bp.scale.set(0.26, 0.24, 0.18);
      bp.position.set(0, (parts.baseY || 0.6) + 0.02, 0.18);
      root.add(bp);
      // plate rivet detail on breastplate
      for (let i = 0; i < 3; i++) {
        const rivet = mesh(G.lowSphere, lambert(0x6a6e78));
        rivet.scale.setScalar(0.016);
        rivet.position.set(-0.08 + i * 0.08, (parts.baseY || 0.6) + 0.08, 0.26);
        root.add(rivet);
      }
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
      // mystical brow ridge and strong jaw
      const brow = mesh(G.sphere, lambert(shade(tint, 0.68)));
      brow.scale.set(hs * 0.58, hs * 0.14, hs * 0.3);
      brow.position.set(0, hs * 0.34, hs * 0.58);
      head.add(brow);
      const jaw = mesh(G.sphere, lambert(shade(tint, 0.82)));
      jaw.scale.set(hs * 0.5, hs * 0.2, hs * 0.46);
      jaw.position.set(0, -hs * 0.36, hs * 0.48);
      head.add(jaw);
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
      // secondary energy accents on shoulders
      for (const s of [-1, 1]) {
        const spark = mesh(G.lowSphere, energy);
        spark.scale.setScalar(0.035);
        spark.position.set(s * 0.2, (parts.baseY || 0.6) + 0.18, 0.04);
        root.add(spark);
      }
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
      // nostril flares
      for (const s of [-1, 1]) {
        const nostril = mesh(G.lowSphere, lambert(shade(tint, 0.5)));
        nostril.scale.set(hs * 0.07, hs * 0.06, hs * 0.09);
        nostril.position.set(s * hs * 0.1, -hs * 0.32, hs * 0.95);
        head.add(nostril);
      }
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
      // scar marks on the face
      for (let i = 0; i < 2; i++) {
        const scar = mesh(G.cyl, lambert(shade(tint, 0.4)));
        scar.scale.set(0.006, 0.12, 0.006);
        scar.position.set(-0.08 + i * 0.16, hs * 0.1, hs * 0.9);
        scar.rotation.z = 0.4 - i * 0.8;
        head.add(scar);
      }
      // loincloth wrap and claws on the big hands
      const loin = mesh(G.cone, lambert(0x4a3018));
      loin.scale.set(0.34, 0.2, 0.3);
      loin.position.y = 0.42;
      root.add(loin);
      // hide texture (rough bumps)
      addSpots(root, 0.26, tint, 6, 0.65);
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
      // burn scars on the face and neck
      for (let i = 0; i < 3; i++) {
        const scar = mesh(G.lowSphere, lambert(shade(tint, 0.35)));
        scar.scale.set(hs * 0.06, hs * 0.04, hs * 0.08);
        scar.position.set(-0.1 + i * 0.1, hs * 0.08 - i * 0.04, hs * 0.85);
        head.add(scar);
      }
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
      // tool marks and soot marks
      addSpots(root, 0.24, 0x3a2a20, 5, 0.7);
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
      // glowing rage pupil accent
      const pupilGlow = mesh(G.lowSphere, lambert(0xff5522));
      pupilGlow.scale.setScalar(hs * 0.06);
      pupilGlow.position.set(0, hs * 0.08, hs * 1.28);
      head.add(pupilGlow);
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
      // scarring ridges across the torso
      for (let i = 0; i < 4; i++) {
        const scar = mesh(G.cyl, lambert(shade(tint, 0.35)));
        scar.scale.set(0.008, 0.1, 0.008);
        scar.position.set(-0.1 + i * 0.07, (parts.baseY || 0.6) + 0.1 - i * 0.04, 0.2);
        scar.rotation.z = 0.3;
        root.add(scar);
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
      // Brow ridge of heavy bone above the eyes.
      const brow = mesh(G.sphere, bone); brow.scale.set(0.18, 0.055, 0.1); brow.position.set(0, 0.08, 0.16); parts.head.add(brow);
      // Exposed spine + rib cage hoops floating around the torso (the signature bare-bone look).
      for (let i = 0; i < 4; i++) { const rib = mesh(G.torus, bone); const rr = 0.13 - i * 0.012; rib.scale.set(rr, rr * 0.8, 0.02); rib.rotation.x = Math.PI / 2; rib.position.set(0, torsoY + 0.12 - i * 0.07, 0.0); root.add(rib); }
      const spine = mesh(G.cyl, bone); spine.scale.set(0.022, 0.16, 0.022); spine.position.set(0, torsoY, -0.05); root.add(spine);
      // Collar/clavicle bar across the shoulders.
      const collar = mesh(G.cyl, bone); collar.scale.set(0.018, 0.12, 0.018); collar.rotation.z = Math.PI / 2; collar.position.set(0, torsoY + 0.16, 0.02); root.add(collar);
      // Pelvis ring.
      const pelvis = mesh(G.torus, bone); pelvis.scale.set(0.1, 0.07, 0.02); pelvis.rotation.x = Math.PI / 2; pelvis.position.set(0, torsoY - 0.28, 0); root.add(pelvis);
      // Vertebral studs: small bony nodules along the spine for segmentation relief.
      for (let i = 0; i < 5; i++) { const vert = mesh(G.lowSphere, bone); vert.scale.setScalar(0.015); vert.position.set(0, torsoY + 0.08 - i * 0.05, -0.08); root.add(vert); }
      // Knobbly knee/elbow joint balls so the limbs read as articulated bone, not tubes.
      for (const arm of parts.arms) { const elbow = mesh(G.lowSphere, bone); elbow.scale.setScalar(0.028); elbow.position.y = -0.12; arm.add(elbow); for (let i = -1; i <= 1; i++) { const finger = mesh(G.cone, bone); finger.scale.set(0.008, 0.035, 0.008); finger.rotation.x = Math.PI; finger.position.set(i * 0.018, -0.26, 0.01); arm.add(finger); } }
      for (const leg of parts.legs) { const knee = mesh(G.lowSphere, bone); knee.scale.setScalar(0.03); knee.position.y = -0.14; leg.add(knee); }
      // A scrap of rusted iron pauldron lashed to one shoulder.
      const pauld = mesh(G.dome, lambert(0x6a655a)); pauld.scale.set(0.07, 0.05, 0.07); pauld.position.set(-0.16, torsoY + 0.16, 0); root.add(pauld);
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
      // Bony ridged cheekbones for angular warrior look.
      for (const s of [-1, 1]) { const cheek = mesh(G.sphere, bone); cheek.scale.set(0.04, 0.025, 0.05); cheek.position.set(s * 0.11, 0.0, 0.18); parts.head.add(cheek); }
      // Rib hoops + spine.
      for (let i = 0; i < 4; i++) { const rib = mesh(G.torus, bone); const rr = 0.12 - i * 0.011; rib.scale.set(rr, rr * 0.8, 0.02); rib.rotation.x = Math.PI / 2; rib.position.set(0, torsoY + 0.1 - i * 0.07, 0); root.add(rib); }
      const spine = mesh(G.cyl, bone); spine.scale.set(0.02, 0.15, 0.02); spine.position.set(0, torsoY, -0.05); root.add(spine);
      // Bone studs down the forearms for armored archer appeal.
      for (const arm of parts.arms) { for (let i = 0; i < 3; i++) { const stud = mesh(G.lowSphere, bone); stud.scale.setScalar(0.012); stud.position.set(0, -0.08 - i * 0.06, 0.03); arm.add(stud); } }
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
      // Tattered shirt rags hanging in uneven lobes around the waist.
      const ragMat = lambert(0x4a4438);
      for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; const rag = mesh(G.cone, ragMat); rag.scale.set(0.04, 0.1 + (i % 2) * 0.05, 0.04); rag.rotation.x = Math.PI; rag.position.set(Math.cos(a) * 0.14, torsoY - 0.18, Math.sin(a) * 0.12 + 0.02); root.add(rag); }
      // A jagged bone splinter punching out through the forearm of the slack arm.
      if (parts.arms[0]) { const splinter = mesh(G.cone, bone); splinter.scale.set(0.012, 0.07, 0.012); splinter.rotation.z = 0.6; splinter.position.set(0.05, -0.2, 0.04); parts.arms[0].add(splinter); }
      // Sunken second eye socket (dark hollow) so the face reads lopsided + dead.
      const socket = mesh(G.lowSphere, lambert(0x14110c)); socket.scale.set(0.035, 0.045, 0.025); socket.position.set(0.08, 0.04, 0.18); parts.head.add(socket);
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
      // Frayed bandage edges hanging off limbs for worn pharonic look.
      for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2; const fray = mesh(G.capsule, wrapDk); fray.scale.set(0.008, 0.05, 0.008); fray.position.set(Math.cos(a) * 0.12, torsoY - 0.35, Math.sin(a) * 0.12); root.add(fray); }
      // Bone-ridge nose accent below the bandages.
      const noseBone = mesh(G.cone, lambert(0xd8d2c0)); noseBone.scale.set(0.018, 0.04, 0.015); noseBone.rotation.x = 0.3; noseBone.position.set(0, 0.04, 0.22); parts.head.add(noseBone);
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
      for (const s of [-1, 1]) { const slit = mesh(G.lowSphere, lambert(0x100b06)); slit.scale.set(0.05, 0.022, 0.03); slit.position.set(s * 0.08, 0.02, 0.18); parts.head.add(slit); const kohl = mesh(G.torus, GOLD); kohl.scale.set(0.055, 0.055, 0.008); kohl.rotation.x = Math.PI / 2; kohl.position.set(s * 0.08, 0.02, 0.19); parts.head.add(kohl); }
      // Broad gold ceremonial collar (usekh) across the shoulders/chest.
      const collar = mesh(G.dome, GOLD); collar.scale.set(0.24, 0.12, 0.18); collar.rotation.x = -0.3; collar.position.set(0, torsoY + 0.16, 0.06); root.add(collar);
      for (let i = -2; i <= 2; i++) { const bead = mesh(G.lowSphere, blue); bead.scale.setScalar(0.018); bead.position.set(i * 0.05, torsoY + 0.1, 0.2); root.add(bead); }
      // Row of golden studs down the robe front for royal regalia.
      for (let i = 0; i < 5; i++) { const stud = mesh(G.lowSphere, GOLD); stud.scale.setScalar(0.012); stud.position.set(0, torsoY + 0.2 - i * 0.08, 0.2); root.add(stud); }
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
      // Spectral eye sockets: two glowing pale orbs for eerie presence.
      for (const s of [-1, 1]) { const eye = mesh(G.lowSphere, ghostMat); eye.scale.set(0.038, 0.05, 0.025); eye.position.set(s * 0.07, hover + 0.04, 0.2); root.add(eye); const pupil = mesh(G.lowSphere, lambert(0x0a1220)); pupil.material.transparent = true; pupil.material.opacity = 0.7; pupil.scale.setScalar(0.015); pupil.position.set(s * 0.07, hover + 0.04, 0.22); root.add(pupil); }
      // Wispy strands trailing from the crown (flowing spirit wisps).
      for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2; const strand = mesh(G.capsule, ghostMat); strand.scale.set(0.015, 0.18, 0.015); strand.position.set(Math.cos(a) * 0.1, hover + 0.18 + i * 0.03, Math.sin(a) * 0.1); root.add(strand); }
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
      for (const s of [-1, 1]) { const sock = mesh(G.lowSphere, lambert(0x1a3a1a)); sock.material.transparent = true; sock.material.opacity = 0.6; sock.scale.set(0.035, 0.045, 0.025); sock.position.set(s * 0.08, hover + 0.05, 0.19); root.add(sock); const glow = mesh(G.lowSphere, lambert(0xd6ff7a)); glow.scale.setScalar(0.025); glow.position.set(s * 0.08, hover + 0.05, 0.22); root.add(glow); }
      // Toxic vapor tendrils curling upward from the dome.
      for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; const tendril = mesh(G.capsule, sick); tendril.scale.set(0.012, 0.16, 0.012); tendril.position.set(Math.cos(a) * 0.12, hover + 0.12, Math.sin(a) * 0.12); root.add(tendril); }
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
      // Bone-like jaw ridge below the screaming mouth.
      const jawLine = mesh(G.capsule, lambert(0x9aa37e)); jawLine.material.transparent = true; jawLine.material.opacity = 0.5; jawLine.scale.set(0.08, 0.015, 0.04); jawLine.position.set(0, hover - 0.13, 0.19); root.add(jawLine);
      // Long flowing spectral HAIR streaming back and down (the signature wailing woman look).
      for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI - Math.PI / 2; const strand = mesh(G.capsule, spectral); const ln = 0.22 + (i % 3) * 0.06; strand.scale.set(0.022, ln, 0.018); strand.rotation.set(0.5, 0, Math.sin(a) * 0.5); strand.position.set(Math.sin(a) * 0.18, hover - 0.05 - ln * 0.4, -0.1 - Math.cos(a) * 0.05); root.add(strand); }
      // Tattered gown lobes trailing below.
      for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; const lobe = mesh(G.cone, spectral); lobe.scale.set(0.05, 0.2, 0.05); lobe.rotation.x = Math.PI; lobe.position.set(Math.cos(a) * 0.14, hover - 0.26, Math.sin(a) * 0.14); root.add(lobe); }
      // Outstretched ghostly arms reaching forward with fingerbones visible.
      for (const s of [-1, 1]) { const arm = mesh(G.capsule, spectral); arm.scale.set(0.025, 0.13, 0.025); arm.rotation.set(1.0, 0, s * 0.3); arm.position.set(s * 0.18, hover - 0.04, 0.12); root.add(arm); for (let i = 0; i < 3; i++) { const finger = mesh(G.cone, lambert(0xd0c8b0)); finger.material.transparent = true; finger.material.opacity = 0.7; finger.scale.set(0.006, 0.04, 0.006); finger.rotation.x = Math.PI - 0.2; finger.position.set(s * (0.1 + i * 0.01), hover - 0.16, 0.16); root.add(finger); } }
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
      // Tattered hood edges for worn spectral garment.
      for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2; const tear = mesh(G.cone, cloak); tear.material.transparent = true; tear.material.opacity = 0.6; tear.scale.set(0.025, 0.06 + (i % 2) * 0.03, 0.025); tear.position.set(Math.cos(a) * 0.28, hover + 0.04, Math.sin(a) * 0.28); root.add(tear); }
      // Void inside the hood with two cold pinpoint eyes.
      const voidF = mesh(G.lowSphere, lambert(0x05070a)); voidF.scale.set(0.1, 0.13, 0.06); voidF.position.set(0, hover, 0.16); root.add(voidF);
      for (const s of [-1, 1]) { const eye = mesh(G.lowSphere, lambert(0x66d0ff)); eye.scale.setScalar(0.018); eye.position.set(s * 0.05, hover + 0.02, 0.2); root.add(eye); }
      // Flowing dark cloak skirts replacing the tendrils with ragged trailing cloth.
      for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; const rag = mesh(G.cone, cloak); rag.material.transparent = true; rag.material.opacity = 0.7; const ln = 0.22 + (i % 2) * 0.1; rag.scale.set(0.06, ln, 0.06); rag.rotation.set(Math.PI - Math.sin(a) * 0.3, 0, Math.cos(a) * 0.3); rag.position.set(Math.cos(a) * 0.16, hover - 0.2 - ln * 0.3, Math.sin(a) * 0.16); root.add(rag); }
      // Skeletal claw hands emerging from sleeves (both sides now).
      for (const s of [-1, 1]) { for (let i = -1; i <= 1; i++) { const f = mesh(G.cone, lambert(0xcfc8b0)); f.scale.set(0.012, 0.05, 0.012); f.rotation.x = 1.4; f.position.set(s * 0.18 + i * 0.02, hover - 0.06, 0.16); root.add(f); } }
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
      const wingMat = lambert(shade(tint, 0.45)); parts.wings = []; const wy = (parts.baseY || 0.85) + 0.12; for (const s of [-1, 1]) { const pivot = new THREE.Group(); pivot.position.set(s * 0.22, wy, -0.12); const arm = mesh(G.capsule, wingMat); arm.scale.set(0.42, 0.05, 0.05); arm.rotation.z = s * 0.2; arm.position.x = s * 0.34; pivot.add(arm); const membrane = mesh(G.sphere, wingMat); membrane.scale.set(0.4, 0.05, 0.34); membrane.position.set(s * 0.34, -0.08, -0.04); pivot.add(membrane); for (let f = 0; f < 3; f++) { const finger = mesh(G.cone, wingMat); finger.scale.set(0.02, 0.18, 0.02); finger.position.set(s * (0.18 + f * 0.18), -0.18 - f * 0.04, -0.05); finger.rotation.x = -2.4; pivot.add(finger); } root.add(pivot); parts.wings.push({ pivot, side: s }); } const tail = new THREE.Group(); tail.position.set(0, parts.baseY * 0.7, -0.18); for (let i = 0; i < 4; i++) { const seg = mesh(G.sphere, lambert(tint)); seg.scale.setScalar(0.06 - i * 0.01); seg.position.set(0, -i * 0.08, -i * 0.05); tail.add(seg); } const barb = mesh(G.cone, lambert(shade(tint, 0.5))); barb.scale.set(0.05, 0.1, 0.02); barb.position.set(0, -0.32, -0.2); barb.rotation.x = -2.6; tail.add(barb); root.add(tail); const goat = mesh(G.cone, lambert(shade(tint, 0.55))); goat.scale.set(0.04, 0.09, 0.04); goat.position.set(0, -0.2, 0.16); goat.rotation.x = 0.3; parts.head.add(goat); for (const s of [-1, 1]) { const ember = mesh(G.lowSphere, lambert(0xff7722)); ember.scale.setScalar(0.05); ember.position.set(s * 0.2, parts.baseY + 0.4, 0.1); root.add(ember); } const w = giveWeapon(parts, 'trident', { mat: lambert(shade(tint, 0.4)), scale: 0.7, grab: 0.5, armLen: parts.armLen }); if (w) { const fire = mesh(G.cone, lambert(0xff8833)); fire.scale.set(0.08, 0.2, 0.08); fire.position.y = 1.2; w.grip.children[0].add(fire); }
      // Big back-swept ram horns sprouting beyond the small default pair + glowing eyes + fanged maw.
      // NOTE: these attach to parts.head, whose origin already sits at head height,
      // so their Y is LOCAL to the head (small offsets around 0), NOT parts.baseY
      // (which is the torso height in ROOT space — using it flung them into the sky).
      const hornMat = lambert(0x140808); for (const s of [-1, 1]) { const horn = mesh(G.cone, hornMat); horn.scale.set(0.045, 0.34, 0.045); horn.position.set(s * 0.11, 0.18, -0.04); horn.rotation.z = -s * 0.6; horn.rotation.x = -0.5; parts.head.add(horn); const tip = mesh(G.cone, hornMat); tip.scale.set(0.03, 0.2, 0.03); tip.position.set(s * 0.2, 0.3, -0.12); tip.rotation.z = -s * 1.1; parts.head.add(tip); }
      // Replace cute eyes with glowing molten slits.
      for (const c of parts.head.children) { if (c.material === EYE_W) c.visible = false; if (c.material === EYE_B) c.visible = false; }
      for (const s of [-1, 1]) { const eye = mesh(G.lowSphere, lambert(0xffcc33)); eye.scale.set(0.05, 0.025, 0.03); eye.position.set(s * 0.075, 0.02, 0.18); parts.head.add(eye); }
      // Jagged fanged maw under the muzzle.
      for (let i = -1; i <= 1; i++) { const fang = mesh(G.cone, lambert(0xe8dccc)); fang.scale.set(0.012, 0.045, 0.012); fang.rotation.x = Math.PI; fang.position.set(i * 0.03, -0.14, 0.19); parts.head.add(fang); }
      // Chest brand: glowing infernal rune.
      const rune = mesh(G.torus, lambert(0xff5511)); rune.scale.set(0.07, 0.07, 0.03); rune.position.set(0, parts.baseY + 0.04, 0.26); root.add(rune);
      // Ridged brow for menace + scaled torso plates for hellish relief.
      for (let i = -1; i <= 1; i++) { const ridge = mesh(G.cone, lambert(shade(tint, 0.6))); ridge.scale.set(0.025, 0.05, 0.025); ridge.position.set(i * 0.04, 0.08, 0.14); ridge.rotation.x = -0.3; parts.head.add(ridge); }
      for (let i = 0; i < 4; i++) { const a = (i * 1.57); const scale = mesh(G.lowSphere, lambert(shade(tint, 0.55))); scale.scale.set(0.05, 0.03, 0.06); scale.position.set(Math.cos(a) * 0.12, parts.baseY + 0.1, 0.25); scale.rotation.z = a; root.add(scale); }
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
      const wingMat = lambert(shade(tint, 0.5)); parts.wings = []; const wy = (parts.baseY || 0.7) + 0.08; for (const s of [-1, 1]) { const pivot = new THREE.Group(); pivot.position.set(s * 0.18, wy, -0.1); const membrane = mesh(G.sphere, wingMat); membrane.scale.set(0.3, 0.04, 0.24); membrane.position.set(s * 0.26, -0.04, -0.03); pivot.add(membrane); for (let f = 0; f < 2; f++) { const finger = mesh(G.cone, wingMat); finger.scale.set(0.018, 0.13, 0.018); finger.position.set(s * (0.16 + f * 0.16), -0.14, -0.04); finger.rotation.x = -2.4; pivot.add(finger); } root.add(pivot); parts.wings.push({ pivot, side: s }); } const tail = new THREE.Group(); tail.position.set(0, parts.baseY * 0.7, -0.14); for (let i = 0; i < 3; i++) { const seg = mesh(G.sphere, lambert(tint)); seg.scale.setScalar(0.05 - i * 0.01); seg.position.set(0, -i * 0.06, -i * 0.04); tail.add(seg); } const barb = mesh(G.cone, lambert(shade(tint, 0.5))); barb.scale.set(0.04, 0.08, 0.02); barb.position.set(0, -0.22, -0.16); barb.rotation.x = -2.6; tail.add(barb); root.add(tail); const w = giveWeapon(parts, 'trident', { mat: lambert(shade(tint, 0.45)), scale: 0.6, grab: 0.5, armLen: parts.armLen });
      // Curved horns + glowing slit eyes + little fangs to read clearly as a small devil.
      // NOTE: horns/eyes/fangs attach to parts.head (origin already at head height),
      // so their Y is head-LOCAL (horns on the brow ~0.18, eyes mid-face ~0.02,
      // fangs below the muzzle ~-0.14) — NOT parts.baseY.
      const lhorn = lambert(0x2a0a0a); for (const s of [-1, 1]) { const horn = mesh(G.cone, lhorn); horn.scale.set(0.03, 0.18, 0.03); horn.position.set(s * 0.09, 0.18, -0.03); horn.rotation.z = -s * 0.7; horn.rotation.x = -0.3; parts.head.add(horn); }
      for (const c of parts.head.children) { if (c.material === EYE_W || c.material === EYE_B) c.visible = false; }
      for (const s of [-1, 1]) { const eye = mesh(G.lowSphere, lambert(0xffaa22)); eye.scale.set(0.04, 0.022, 0.025); eye.position.set(s * 0.065, 0.02, 0.18); parts.head.add(eye); }
      for (const s of [-1, 1]) { const fang = mesh(G.cone, lambert(0xe8dccc)); fang.scale.set(0.01, 0.035, 0.01); fang.rotation.x = Math.PI; fang.position.set(s * 0.03, -0.14, 0.18); parts.head.add(fang); }
      // Studded shoulder plates + scaled belly stripe for demonic texture.
      for (let i = 0; i < 3; i++) { const stud = mesh(G.lowSphere, lambert(0xff4422)); stud.scale.setScalar(0.02); stud.position.set((i - 1) * 0.05, parts.baseY + 0.12, 0.18); root.add(stud); }
      for (let i = 0; i < 3; i++) { const scale = mesh(G.cone, lambert(shade(tint, 0.5))); scale.scale.set(0.03, 0.04, 0.03); scale.position.set(0, parts.baseY - 0.02 - i * 0.08, 0.2); scale.rotation.x = -0.2; root.add(scale); }
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
      // NOTE: horns/crown attach to parts.head (origin already at head height), so
      // their Y is head-LOCAL (small offsets ~0) — NOT parts.baseY, which is the
      // torso height in ROOT space and would fling them into the sky.
      const dark = lambert(shade(tint, 0.6)); const glow = lambert(0xff5511); for (const s of [-1, 1]) { const horn = mesh(G.cone, lambert(0x120606)); horn.scale.set(0.05, 0.34, 0.05); horn.position.set(s * 0.13, 0.2, -0.04); horn.rotation.z = -s * 0.55; horn.rotation.x = -0.3; parts.head.add(horn); const horn2 = mesh(G.cone, lambert(0x120606)); horn2.scale.set(0.035, 0.18, 0.035); horn2.position.set(s * 0.22, 0.1, 0); horn2.rotation.z = -s * 1.1; parts.head.add(horn2); } const crown = mesh(G.torus, lambert(0x120606)); crown.scale.set(0.16, 0.16, 0.07); crown.rotation.x = Math.PI / 2; crown.position.set(0, 0.06, 0); parts.head.add(crown); const wingMat = lambert(shade(tint, 0.8)); parts.wings = []; const wy = (parts.baseY || 1.0) + 0.18; for (const s of [-1, 1]) { const pivot = new THREE.Group(); pivot.position.set(s * 0.28, wy, -0.16); const arm = mesh(G.capsule, lambert(0x1a0606)); arm.scale.set(0.55, 0.06, 0.06); arm.position.x = s * 0.46; arm.rotation.z = s * 0.25; pivot.add(arm); const membrane = mesh(G.sphere, wingMat); membrane.scale.set(0.55, 0.06, 0.46); membrane.position.set(s * 0.46, -0.12, -0.05); pivot.add(membrane); for (let f = 0; f < 4; f++) { const finger = mesh(G.cone, lambert(0x1a0606)); finger.scale.set(0.025, 0.24, 0.025); finger.position.set(s * (0.2 + f * 0.22), -0.24 - f * 0.05, -0.06); finger.rotation.x = -2.4; pivot.add(finger); } root.add(pivot); parts.wings.push({ pivot, side: s }); } const tail = new THREE.Group(); tail.position.set(0, parts.baseY * 0.75, -0.24); for (let i = 0; i < 5; i++) { const seg = mesh(G.sphere, lambert(tint)); seg.scale.setScalar(0.08 - i * 0.012); seg.position.set(0, -i * 0.1, -i * 0.06); tail.add(seg); } const barb = mesh(G.cone, lambert(0x120606)); barb.scale.set(0.07, 0.16, 0.03); barb.position.set(0, -0.46, -0.28); barb.rotation.x = -2.6; tail.add(barb); root.add(tail); addSpots(root.children[0] || parts.head, 0.3, 0xff4400, 8, 1.0); for (let i = 0; i < 7; i++) { const a = (i * 2.39996); const ember = mesh(G.lowSphere, glow); ember.scale.setScalar(0.05 + (i % 3) * 0.015); ember.position.set(Math.cos(a) * 0.28, parts.baseY + 0.2 + Math.sin(a) * 0.3, Math.sin(a) * 0.18); root.add(ember); } const w = giveWeapon(parts, 'trident', { mat: lambert(0x120606), scale: 0.95, grab: 0.5, armLen: parts.armLen }); if (w) { const fire = mesh(G.cone, lambert(0xff5511)); fire.scale.set(0.12, 0.3, 0.12); fire.position.y = 1.25; w.grip.children[0].add(fire); }
      // Apex menace: blazing eyes, a wide fanged maw, and a glowing molten chest sigil.
      for (const c of parts.head.children) { if (c.material === EYE_W || c.material === EYE_B) c.visible = false; }
      // Eyes & fangs attach to parts.head: head-LOCAL Y (eyes mid-face ~0.02,
      // fangs below the muzzle ~-0.14), z forward — NOT parts.baseY.
      for (const s of [-1, 1]) { const eye = mesh(G.lowSphere, lambert(0xffdd55)); eye.scale.set(0.06, 0.03, 0.035); eye.position.set(s * 0.09, 0.02, 0.22); parts.head.add(eye); const hot = mesh(G.lowSphere, lambert(0xff7722)); hot.scale.setScalar(0.02); hot.position.set(s * 0.09, 0.02, 0.25); parts.head.add(hot); }
      for (let i = -2; i <= 2; i++) { const fang = mesh(G.cone, lambert(0xe6d8c4)); fang.scale.set(0.014, 0.06, 0.014); fang.rotation.x = Math.PI; fang.position.set(i * 0.035, -0.14, 0.22); parts.head.add(fang); }
      const sigil = mesh(G.torus, lambert(0xff5511)); sigil.scale.set(0.12, 0.12, 0.05); sigil.position.set(0, parts.baseY + 0.02, 0.32); root.add(sigil); const core = mesh(G.lowSphere, lambert(0xffbb44)); core.scale.setScalar(0.05); core.position.set(0, parts.baseY + 0.02, 0.34); root.add(core);
      // Scaled brow ridge + molten cracks radiating from core.
      for (let i = -2; i <= 2; i++) { const ridge = mesh(G.cone, lambert(shade(tint, 0.4))); ridge.scale.set(0.02, 0.06, 0.02); ridge.position.set(i * 0.05, 0.12, 0.16); ridge.rotation.x = -0.3; parts.head.add(ridge); }
      for (let i = 0; i < 6; i++) { const a = (i * 1.047); const crack = mesh(G.cone, lambert(0xff6611)); crack.scale.set(0.04, 0.08, 0.02); crack.position.set(Math.cos(a) * 0.18, parts.baseY + 0.02 + Math.sin(a) * 0.15, 0.28); crack.rotation.z = a; root.add(crack); }
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
      const flame = lambert(0xffaa33); const hot = lambert(0xffe066); for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2; const lick = mesh(G.cone, i % 2 ? flame : hot); lick.scale.set(0.04, 0.14, 0.04); lick.position.set(Math.cos(a) * 0.1, 0.28, Math.sin(a) * 0.05 - 0.02); lick.rotation.x = -0.2; parts.head.add(lick); } const tailFlame = mesh(G.cone, flame); tailFlame.scale.set(0.05, 0.18, 0.05); tailFlame.position.set(0, parts.baseY * 0.6, -0.14); tailFlame.rotation.x = 0.4; root.add(tailFlame); parts.wings = []; const wingMat = lambert(0xcc3311); const wy = parts.baseY + 0.05; for (const s of [-1, 1]) { const pivot = new THREE.Group(); pivot.position.set(s * 0.12, wy, -0.08); const membrane = mesh(G.sphere, wingMat); membrane.scale.set(0.18, 0.03, 0.15); membrane.position.set(s * 0.16, -0.02, -0.02); pivot.add(membrane); root.add(pivot); parts.wings.push({ pivot, side: s }); } addSpots(root.children[0], 0.18, 0xffcc33, 4, 1.2); const pitch = giveWeapon(parts, 'spear', { mat: lambert(0x551100), scale: 0.5, grab: 0.5, armLen: parts.armLen }); if (pitch) { const tip = mesh(G.cone, hot); tip.scale.set(0.05, 0.12, 0.05); tip.position.y = 1.05; pitch.grip.children[0].add(tip); }
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
      const rock = lambert(shade(tint, 0.82)); const rockL = lambert(shade(tint, 1.12)); const plates = [[0, parts.baseY + 0.05, 0.28, 0.3], [-0.18, parts.baseY + 0.15, 0.24, -0.4], [0.2, parts.baseY - 0.1, 0.22, 0.5], [0, parts.baseY + 0.34, 0.2, 0.1]]; for (const [x, y, sc, rot] of plates) { const block = mesh(G.lowSphere, x < 0 ? rock : rockL); block.scale.set(sc * 0.5, sc * 0.4, sc * 0.4); block.position.set(x, y, 0.18); block.rotation.z = rot; block.rotation.y = rot * 0.5; root.add(block); } for (const arm of parts.arms) { const fist = mesh(G.lowSphere, rock); fist.scale.set(0.13, 0.13, 0.13); fist.position.y = -0.36 * (o.height || 1.2); arm.add(fist); } for (const s of [-1, 1]) { const shoulder = mesh(G.lowSphere, rockL); shoulder.scale.set(0.16, 0.13, 0.16); shoulder.position.set(s * 0.38, parts.baseY + 0.18, 0); shoulder.rotation.z = s * 0.4; root.add(shoulder); } const brow = mesh(G.lowSphere, rock); brow.scale.set(0.2, 0.06, 0.12); brow.position.set(0, 0.06, 0.12); parts.head.add(brow);
      // NOTE: the brow attaches to parts.head (origin already at head height), so
      // its Y is head-LOCAL (a ridge just above the eyes ~0.06) — NOT parts.baseY.
      // Blocky boulder feet so the legs don't read as smooth pillars.
      for (const leg of parts.legs) { const foot = mesh(G.lowSphere, rock); foot.scale.set(0.13, 0.09, 0.16); foot.position.y = -0.3 * (o.height || 1.2); foot.rotation.y = 0.4; leg.add(foot); }
      // Mossy/glowing crack down the chest core.
      for (let i = 0; i < 3; i++) { const seam = mesh(G.lowSphere, rockL); seam.scale.set(0.05, 0.03, 0.03); seam.position.set((i - 1) * 0.05, parts.baseY + 0.1 - i * 0.08, 0.31); root.add(seam); }
      // Rock nodules on limbs + grooved back for blocky texture.
      for (const leg of parts.legs) { for (let i = 0; i < 2; i++) { const nod = mesh(G.lowSphere, rock); nod.scale.set(0.08, 0.06, 0.08); nod.position.set((i - 0.5) * 0.12, -0.15 * (o.height || 1.2), 0.06); leg.add(nod); } }
      for (let i = 0; i < 3; i++) { const groove = mesh(G.cyl, lambert(shade(tint, 0.7))); groove.scale.set(0.015, 0.16, 0.015); groove.position.set((i - 1) * 0.08, parts.baseY + 0.1, -0.2); groove.rotation.z = (i - 1) * 0.3; root.add(groove); }
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
      const iron = lambert(shade(tint, 0.85)); const rivet = lambert(0x3a4250); const plate = mesh(G.cyl, iron); plate.scale.set(0.34, 0.18, 0.28); plate.position.set(0, parts.baseY + 0.02, 0.04); root.add(plate); for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; const r = mesh(G.lowSphere, rivet); r.scale.setScalar(0.025); r.position.set(Math.cos(a) * 0.3, parts.baseY + 0.02 + Math.sin(a) * 0.16, 0.3); root.add(r); } const collar = mesh(G.torus, iron); collar.scale.set(0.17, 0.17, 0.06); collar.rotation.x = Math.PI / 2; collar.position.set(0, parts.baseY + 0.3, 0); root.add(collar); for (const arm of parts.arms) { const fist = mesh(G.cyl, iron); fist.scale.set(0.12, 0.1, 0.12); fist.position.y = -0.38 * (o.height || 1.25); arm.add(fist); } for (const s of [-1, 1]) { const pauldron = mesh(G.cyl, iron); pauldron.scale.set(0.13, 0.08, 0.14); pauldron.position.set(s * 0.4, parts.baseY + 0.2, 0); pauldron.rotation.z = s * 0.5; root.add(pauldron); } const visor = mesh(G.cyl, rivet); visor.scale.set(0.16, 0.04, 0.1); visor.rotation.x = Math.PI / 2; visor.position.set(0, 0.02, 0.14); parts.head.add(visor);
      // NOTE: the visor attaches to parts.head (origin already at head height),
      // so its Y is LOCAL to the head (small offset ~0), NOT parts.baseY.
      // Riveted chest plate detail + segmented joints for mechanical relief.
      for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; const bolt = mesh(G.lowSphere, lambert(0x5a6a7a)); bolt.scale.setScalar(0.015); bolt.position.set(Math.cos(a) * 0.28, parts.baseY + Math.sin(a) * 0.12, 0.2); root.add(bolt); }
      for (const arm of parts.arms) { for (let i = 0; i < 2; i++) { const band = mesh(G.torus, lambert(shade(tint, 0.75))); band.scale.set(0.11, 0.11, 0.05); band.rotation.x = Math.PI / 2; band.position.y = -0.2 * (o.height || 1.25) - i * 0.1; arm.add(band); } }
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
      const magma = lambert(0xff5500); const hot = lambert(0xffaa22); const rock = lambert(shade(tint, 1.2)); const torsoBody = root.children.find(c => c.isMesh); if (torsoBody) addSpots(torsoBody, 0.32, 0xff5500, 9, 1.4); for (let i = 0; i < 6; i++) { const a = (i * 2.39996); const crack = mesh(G.lowSphere, i % 2 ? magma : hot); crack.scale.set(0.06, 0.02, 0.04); crack.position.set(Math.cos(a) * 0.28, parts.baseY + Math.sin(a) * 0.3, 0.3); crack.rotation.z = a; root.add(crack); } for (const arm of parts.arms) { const fist = mesh(G.lowSphere, rock); fist.scale.set(0.12, 0.12, 0.12); fist.position.y = -0.36 * (o.height || 1.2); arm.add(fist); const seam = mesh(G.lowSphere, magma); seam.scale.set(0.13, 0.02, 0.04); seam.position.y = -0.36 * (o.height || 1.2); arm.add(seam); } const coreGlow = mesh(G.sphere, hot); coreGlow.scale.set(0.1, 0.12, 0.06); coreGlow.position.set(0, parts.baseY, 0.26); root.add(coreGlow); for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2; const vent = mesh(G.cone, magma); vent.scale.set(0.04, 0.12, 0.04); vent.position.set(Math.cos(a) * 0.15, 0.14, Math.sin(a) * 0.1); parts.head.add(vent); } addEyes(parts.head, 0.0, 0.17, 0.07, 0.05, false); for (const s of [-1, 1]) { const eye = mesh(G.lowSphere, hot); eye.scale.setScalar(0.05); eye.position.set(s * 0.07, 0.0, 0.17); parts.head.add(eye); }
      // NOTE: vents/eyes attach to parts.head (origin already at head height),
      // so their Y is head-LOCAL (vents on the crown ~0.14, eyes on the face ~0,
      // and addEyes' 2nd arg is a head-local y) — NOT parts.baseY.
      // Molten scale ridge + glowing cracks for flowing lava texture.
      for (let i = 0; i < 4; i++) { const scale = mesh(G.cone, magma); scale.scale.set(0.05, 0.08, 0.04); scale.position.set(0, parts.baseY + 0.2 - i * 0.1, 0.28); scale.rotation.x = -0.25; root.add(scale); }
      for (let i = 0; i < 5; i++) { const a = (i * 1.257); const fissure = mesh(G.lowSphere, hot); fissure.scale.set(0.04, 0.02, 0.06); fissure.position.set(Math.cos(a) * 0.15, parts.baseY, 0.2); fissure.rotation.z = a; root.add(fissure); }
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
      const ice = lambert(shade(tint, 1.1)); const deep = lambert(shade(tint, 0.8)); for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; const shard = mesh(G.cone, ice); shard.scale.set(0.05, 0.22 + (i % 2) * 0.08, 0.05); shard.position.set(Math.cos(a) * 0.16, parts.baseY + 0.28, Math.sin(a) * 0.12 - 0.08); shard.rotation.x = -0.5 + Math.sin(a) * 0.3; shard.rotation.z = Math.cos(a) * 0.3; root.add(shard); } for (const s of [-1, 1]) { const spike = mesh(G.cone, deep); spike.scale.set(0.05, 0.26, 0.05); spike.position.set(s * 0.36, parts.baseY + 0.18, 0); spike.rotation.z = -s * 1.0; root.add(spike); } for (const arm of parts.arms) { const fist = mesh(G.cone, ice); fist.scale.set(0.11, 0.16, 0.11); fist.position.y = -0.4 * (o.height || 1.2); fist.rotation.x = Math.PI; arm.add(fist); } const torsoBody = root.children.find(c => c.isMesh); if (torsoBody) addSpots(torsoBody, 0.3, 0xffffff, 5, 1.5); for (let i = 0; i < 3; i++) { const crystal = mesh(G.cone, ice); crystal.scale.set(0.04, 0.14, 0.04); crystal.position.set((i - 1) * 0.1, 0.12, 0); crystal.rotation.z = (i - 1) * 0.4; parts.head.add(crystal); }
      // NOTE: crystals attach to parts.head (origin already at head height), so
      // their Y is head-LOCAL — a crown of shards sits at ~0.12, NOT parts.baseY.
      // Chunky frozen feet + glowing frost eyes for a colder, more relieved silhouette.
      for (const leg of parts.legs) { const foot = mesh(G.cone, deep); foot.scale.set(0.12, 0.1, 0.15); foot.rotation.x = -0.3; foot.position.y = -0.3 * (o.height || 1.2); leg.add(foot); }
      for (const c of parts.head.children) { if (c.material === EYE_B) c.material = lambert(0x66ccff); }
      // Icy ridge spikes down the back + arm frost gauntlets.
      for (let i = 0; i < 4; i++) { const icicle = mesh(G.cone, ice); icicle.scale.set(0.045, 0.18, 0.045); icicle.position.set(0, parts.baseY + 0.25 - i * 0.12, -0.18); icicle.rotation.x = -0.5; root.add(icicle); }
      for (const arm of parts.arms) { const gauntlet = mesh(G.cyl, ice); gauntlet.scale.set(0.1, 0.08, 0.1); gauntlet.position.y = -0.32 * (o.height || 1.2); arm.add(gauntlet); const spike = mesh(G.cone, deep); spike.scale.set(0.04, 0.1, 0.04); spike.position.set(0, -0.4 * (o.height || 1.2), 0.06); arm.add(spike); }
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
      const stone = lambert(shade(tint, 0.85)); const stoneL = lambert(shade(tint, 1.12)); parts.wings = []; const wy = (parts.baseY || 0.6) + 0.1; for (const s of [-1, 1]) { const pivot = new THREE.Group(); pivot.position.set(s * 0.2, wy, -0.12); const arm = mesh(G.capsule, stone); arm.scale.set(0.4, 0.06, 0.06); arm.position.x = s * 0.32; arm.rotation.z = s * 0.2; pivot.add(arm); const membrane = mesh(G.sphere, stoneL); membrane.scale.set(0.36, 0.06, 0.3); membrane.position.set(s * 0.32, -0.06, -0.04); pivot.add(membrane); for (let f = 0; f < 3; f++) { const spar = mesh(G.cone, stone); spar.scale.set(0.025, 0.16, 0.025); spar.position.set(s * (0.18 + f * 0.16), -0.14 - f * 0.03, -0.05); spar.rotation.x = -2.4; pivot.add(spar); } root.add(pivot); parts.wings.push({ pivot, side: s }); } for (let i = 0; i < 4; i++) { const ridge = mesh(G.cone, stone); ridge.scale.set(0.04, 0.12 - i * 0.015, 0.04); ridge.position.set(0, parts.baseY + 0.2, -0.14 - i * 0.08); ridge.rotation.x = 0.4; root.add(ridge); } const jaw = mesh(G.sphere, stoneL); jaw.scale.set(0.1, 0.06, 0.1); jaw.position.set(0, -0.1, 0.18); parts.head.add(jaw); for (let i = -1; i <= 1; i++) { const fang = mesh(G.cone, lambert(0xe8e4d8)); fang.scale.set(0.012, 0.04, 0.012); fang.position.set(i * 0.05, -0.13, 0.22); fang.rotation.x = Math.PI; parts.head.add(fang); } const tail = mesh(G.capsule, lambert(tint)); tail.scale.set(0.04, 0.14, 0.04); tail.rotation.x = 1.0; tail.position.set(0, parts.baseY * 0.6, -0.18); root.add(tail);
      // Carved blank stone eyes that catch a cold glow (replace the cute eyes).
      for (const c of parts.head.children) { if (c.material === EYE_W || c.material === EYE_B) c.visible = false; }
      // NOTE: jaw/fangs/sockets/horns attach to parts.head (origin already at head
      // height), so their Y is head-LOCAL — jaw & fangs below the face (~-0.1..-0.13),
      // eye sockets mid-face (~-0.04), horns on the brow (~0.08) — NOT parts.baseY.
      for (const s of [-1, 1]) { const socket = mesh(G.lowSphere, lambert(shade(tint, 0.6))); socket.scale.set(0.045, 0.05, 0.03); socket.position.set(s * 0.07, -0.04, 0.18); parts.head.add(socket); const glow = mesh(G.lowSphere, lambert(0xa8e0ff)); glow.scale.setScalar(0.02); glow.position.set(s * 0.07, -0.04, 0.21); parts.head.add(glow); }
      // Cracked stone seams over the chest (lighter chiselled lines).
      for (let i = 0; i < 3; i++) { const crack = mesh(G.cyl, lambert(shade(tint, 1.2))); crack.scale.set(0.006, 0.08, 0.006); crack.rotation.z = (i - 1) * 0.5; crack.position.set((i - 1) * 0.06, parts.baseY + 0.06, 0.2); root.add(crack); }
      // Curled stone ram-horns over the brow.
      for (const s of [-1, 1]) { const horn = mesh(G.cone, lambert(shade(tint, 0.85))); horn.scale.set(0.03, 0.13, 0.03); horn.position.set(s * 0.1, 0.08, -0.02); horn.rotation.z = -s * 0.9; horn.rotation.x = -0.3; parts.head.add(horn); }
      // Grooved stone face texture + shoulder protrusions.
      for (let i = -1; i <= 1; i++) { const groove = mesh(G.cyl, lambert(shade(tint, 0.7))); groove.scale.set(0.012, 0.06, 0.012); groove.rotation.z = i * 0.4; groove.position.set(i * 0.06, -0.02, 0.16); parts.head.add(groove); }
      for (const s of [-1, 1]) { const knob = mesh(G.lowSphere, stone); knob.scale.set(0.08, 0.1, 0.06); knob.position.set(s * 0.42, parts.baseY + 0.1, 0.08); knob.rotation.z = s * 0.3; root.add(knob); }
      // Claw detail on wing spines.
      for (const wing of parts.wings) { for (let i = 0; i < 2; i++) { const talon = mesh(G.cone, lambert(shade(tint, 0.7))); talon.scale.set(0.018, 0.06, 0.018); talon.position.set((i - 0.5) * 0.04, -0.12, -0.04); wing.pivot.add(talon); } }
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
      const dirt = lambert(shade(tint, 0.85)); const moss = lambert(0x4a6a2a); const torsoBody = root.children.find(c => c.isMesh); if (torsoBody) addSpots(torsoBody, 0.34, tint, 8, 0.7); for (let i = 0; i < 7; i++) { const a = (i * 2.39996); const boulder = mesh(G.lowSphere, dirt); const sr = 0.08 + (i % 3) * 0.03; boulder.scale.set(sr, sr * 0.8, sr); boulder.position.set(Math.cos(a) * 0.3, parts.baseY + Math.sin(a) * 0.35, Math.sin(a * 1.3) * 0.2 + 0.12); boulder.rotation.set(a, a * 0.5, a); root.add(boulder); } for (const arm of parts.arms) { const fist = mesh(G.lowSphere, dirt); fist.scale.set(0.15, 0.13, 0.15); fist.position.y = -0.36 * (o.height || 1.1); arm.add(fist); } for (let i = 0; i < 4; i++) { const patch = mesh(G.lowSphere, moss); patch.scale.set(0.06, 0.02, 0.06); patch.position.set((i - 1.5) * 0.12, 0.02, 0.16); parts.head.add(patch); } const crystal = mesh(G.cone, lambert(0x88cc66)); crystal.scale.set(0.04, 0.12, 0.04); crystal.position.set(0, 0.12, 0); parts.head.add(crystal);
      // NOTE: moss patches + crystal attach to parts.head (origin already at head
      // height), so their Y is head-LOCAL (moss on the face ~0.02, crystal on the
      // crown ~0.12) — NOT parts.baseY.
      // Earthy ridges + root detail for natural texture.
      for (let i = 0; i < 3; i++) { const ridge = mesh(G.cone, dirt); ridge.scale.set(0.04, 0.1, 0.04); ridge.position.set((i - 1) * 0.08, parts.baseY + 0.15, -0.15); ridge.rotation.x = 0.3; root.add(ridge); }
      for (const leg of parts.legs) { const rootTuft = mesh(G.cone, dirt); rootTuft.scale.set(0.06, 0.12, 0.06); rootTuft.position.set(0, -0.25 * (o.height || 1.1), -0.08); rootTuft.rotation.x = -1.2; leg.add(rootTuft); const knot = mesh(G.lowSphere, moss); knot.scale.setScalar(0.05); knot.position.set(0, -0.28 * (o.height || 1.1), 0.04); leg.add(knot); }
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
      const venom = lambert(0x88dd44); const dark = lambert(shade(tint, 0.7)); for (const nk of parts.necks) { const headMesh = nk.neck.children[nk.neck.children.length - 1]; for (let i = -1; i <= 1; i++) { const frill = mesh(G.cone, venom); frill.scale.set(0.03, 0.1, 0.03); frill.position.set(i * 0.06, headMesh.position.y + 0.08, headMesh.position.z - 0.06); frill.rotation.x = -0.6; nk.neck.add(frill); } const drip = mesh(G.cone, venom); drip.scale.set(0.025, 0.07, 0.025); drip.position.set(0, headMesh.position.y - 0.05, headMesh.position.z + 0.14); drip.rotation.x = Math.PI; nk.neck.add(drip);
        // Bared fangs and a glowing slit eye on each head.
        for (let i = -1; i <= 1; i += 2) { const fang = mesh(G.cone, lambert(0xe8e0c8)); fang.scale.set(0.014, 0.05, 0.014); fang.rotation.x = Math.PI; fang.position.set(i * 0.04, headMesh.position.y - 0.06, headMesh.position.z + 0.16); nk.neck.add(fang); }
        for (const s of [-1, 1]) { const eye = mesh(G.lowSphere, lambert(0xd6ff66)); eye.scale.set(0.03, 0.018, 0.02); eye.position.set(s * 0.06, headMesh.position.y + 0.06, headMesh.position.z + 0.12); nk.neck.add(eye); }
        // Scale ridge running up the back of each neck.
        for (let i = 0; i < 3; i++) { const ridge = mesh(G.cone, dark); ridge.scale.set(0.02, 0.05, 0.02); ridge.position.set(0, headMesh.position.y - 0.25 + i * 0.16, headMesh.position.z - 0.1 - i * 0.02); ridge.rotation.x = -0.4; nk.neck.add(ridge); } } for (let i = 0; i < 6; i++) { const a = (i * 2.39996); const scale = mesh(G.cone, dark); scale.scale.set(0.04, 0.08, 0.04); scale.position.set(Math.cos(a) * 0.2, 0.4 + Math.sin(a) * 0.15, Math.sin(a) * 0.2 - 0.1); scale.rotation.x = -0.3; root.add(scale); } const tail = new THREE.Group(); tail.position.set(0, 0.36, -0.4); for (let i = 0; i < 4; i++) { const seg = mesh(G.sphere, lambert(tint)); seg.scale.setScalar(0.12 - i * 0.02); seg.position.set(0, 0, -i * 0.18); tail.add(seg); } root.add(tail);
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
      // Anchor everything to the bug base's ACTUAL geometry, or eyes/fangs float
      // off the body. The bug builder uses: legY = r*0.5; abdomen at z=-r*0.3 and
      // head segment at (0, legY+r*0.3, r*0.6) scaled (r*0.7, r*0.55, r*0.7).
      const r = o.bodyR || 0.34;
      const legY = r * 0.5;
      const bodyY = legY + r * 0.3;             // abdomen/head centre height
      const headZ = r * 0.6;                    // head segment centre Z (front)
      const faceZ = headZ + r * 0.62;           // just proud of the head's front face
      const mark = lambert(0xaa1133);
      const fangMat = lambert(0xddccaa);
      const venom = lambert(0x88dd44);
      const eyeMat = API.isBoss ? API.EYE_BOSS : lambert(0xcc2244);

      // dark blotches + a red hourglass on the abdomen (rear)
      const abdomen = root.children.find((c) => c.isMesh && c.position.z < -0.1);
      if (abdomen) addSpots(abdomen, r, 0x551122, 5, 1.0);
      const hour = mesh(G.lowSphere, mark);
      hour.scale.set(r * 0.24, r * 0.36, r * 0.12);
      hour.position.set(0, bodyY + r * 0.55, -r * 0.3 - r * 0.5);
      root.add(hour);

      // EIGHT glowing eyes clustered on the FRONT FACE of the head segment (a row
      // of 4 + a 2+2 cluster), sitting just proud of it so none float.
      for (let i = 0; i < 4; i++) {
        const e = mesh(G.lowSphere, eyeMat);
        e.scale.setScalar(r * 0.11);
        e.position.set((i - 1.5) * r * 0.22, bodyY + r * 0.22, faceZ - Math.abs(i - 1.5) * r * 0.06);
        root.add(e);
      }
      for (const s of [-1, 1]) {
        for (let j = 0; j < 2; j++) {
          const e = mesh(G.lowSphere, eyeMat);
          e.scale.setScalar(r * 0.13);
          e.position.set(s * r * (0.18 + j * 0.2), bodyY + r * 0.02, faceZ - r * 0.06 - j * r * 0.05);
          root.add(e);
        }
      }

      // chelicerae fangs hanging DOWN from the front underside of the head
      for (const s of [-1, 1]) {
        const chel = mesh(G.cone, lambert(0x110a14));
        chel.scale.set(r * 0.14, r * 0.4, r * 0.14);
        chel.position.set(s * r * 0.2, bodyY - r * 0.35, headZ + r * 0.5);
        chel.rotation.x = 2.6;
        root.add(chel);
        const ft = mesh(G.cone, fangMat);
        ft.scale.set(r * 0.06, r * 0.22, r * 0.06);
        ft.position.set(s * r * 0.2, bodyY - r * 0.62, headZ + r * 0.55);
        ft.rotation.x = Math.PI;
        root.add(ft);
        const drip = mesh(G.lowSphere, venom);
        drip.scale.setScalar(r * 0.07);
        drip.position.set(s * r * 0.2, bodyY - r * 0.78, headZ + r * 0.55);
        root.add(drip);
      }

      // pointed claw tips at the end of each leg
      for (const l of parts.legs) {
        const tip = mesh(G.cone, lambert(0x110a14));
        tip.scale.set(r * 0.06, r * 0.22, r * 0.06);
        tip.position.y = -r * 1.05;
        tip.rotation.x = 0.6;
        l.pivot.add(tip);
      }
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
      const skin = lambert(tint); const leaf = lambert(0x4f8038); const root2 = lambert(shade(tint, 0.8)); const bodyY = 0.26; const body = mesh(G.sphere, skin); body.scale.set(0.2, 0.26, 0.18); body.position.y = bodyY; root.add(body); const face = mesh(G.sphere, lambert(shade(tint, 1.1))); face.scale.set(0.14, 0.16, 0.08); face.position.set(0, bodyY + 0.02, 0.16); root.add(face); addEyes(root, bodyY + 0.06, 0.2, 0.07, 0.045); const mouth = mesh(G.sphere, lambert(0x3a2a1a)); mouth.scale.set(0.05, 0.07, 0.03); mouth.position.set(0, bodyY - 0.06, 0.2); root.add(mouth); parts.legs = []; for (const s of [-1, 1]) { const tap = mesh(G.cone, root2); tap.scale.set(0.05, 0.18, 0.05); tap.position.set(s * 0.07, 0.08, 0); tap.rotation.x = Math.PI; tap.rotation.z = s * 0.3; root.add(tap); const rootBulb = mesh(G.sphere, lambert(shade(tint, 0.6))); rootBulb.scale.setScalar(0.06); rootBulb.position.set(s * 0.07, 0.02, 0.02); root.add(rootBulb); parts.legs.push(tap); } parts.arms = []; for (const s of [-1, 1]) { const armpiv = new THREE.Group(); armpiv.position.set(s * 0.18, bodyY + 0.05, 0); const arm = mesh(G.capsule, root2); arm.scale.set(0.025, 0.08, 0.025); arm.position.y = -0.06; armpiv.add(arm); root.add(armpiv); parts.arms.push(armpiv); } parts.head = root; for (let i = 0; i < 5; i++) { const t = i / 4; const lf = mesh(G.cone, leaf); lf.scale.set(0.04, 0.22 - t * 0.04, 0.02); lf.position.set((i - 2) * 0.04, bodyY + 0.3, 0); lf.rotation.z = (i - 2) * 0.35; root.add(lf); } parts.type = 'biped'; parts.baseY = bodyY;
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
      // A few raised warty bumps on the cap for relief (deterministic placement).
      for (let i = 0; i < 4; i++) { const a = (i * 1.9) + 0.7; const bump = mesh(G.lowSphere, lambert(shade(tint, 1.12))); bump.scale.set(0.05, 0.04, 0.05); bump.position.set(Math.cos(a) * 0.12, 0.12, Math.sin(a) * 0.12); cap.add(bump); }
      // Additional perimeter warts for fungal texture detail.
      for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; const wart = mesh(G.lowSphere, lambert(shade(tint, 1.08))); wart.scale.set(0.032, 0.025, 0.032); wart.position.set(Math.cos(a) * 0.18, -0.05, Math.sin(a) * 0.18); cap.add(wart); }
      // Stalk ribbed texture for organic fungal look.
      for (let i = 0; i < 5; i++) { const rib = mesh(G.cyl, lambert(shade(0xeeddcc, 0.9))); rib.scale.set(0.025, 0.08, 0.025); rib.rotation.z = (i / 5) * Math.PI * 2 * 0.4; rib.position.set(Math.cos(i/5*Math.PI*2)*0.04, 0.16 - i*0.06, Math.sin(i/5*Math.PI*2)*0.04); root.add(rib); }
      // Rosy cheeks and a little smile so the sentient mushroom reads friendly.
      for (const s of [-1, 1]) { const cheek = mesh(G.lowSphere, lambert(0xffb0a0)); cheek.scale.setScalar(0.02); cheek.position.set(s * 0.06, 0.26, 0.09); root.add(cheek); }
    },
  },
};

registerDesigns(DESIGNS);
export default DESIGNS;
