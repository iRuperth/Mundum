import * as THREE from 'three';

// Rounded low-poly NPCs in the same friendly style as the player:
// smoothed capsules and spheres, MeshLambertMaterial, no textures.
// Each model faces +Z, feet at y=0, and stands ~1 unit tall.
// buildNpcModel(modelKey, opts) returns { group, update(dt), dispose() }.

const SKIN = 0xe0a87e;
const HAIR_DARK = 0x3a2a1c;
const BOOT = 0x4a3526;

// Darken/lighten a hex colour by a factor (for freckles, shading).
function shadeHex(hex, f) {
  const r = Math.min(255, ((hex >> 16) & 255) * f) | 0;
  const g = Math.min(255, ((hex >> 8) & 255) * f) | 0;
  const b = Math.min(255, (hex & 255) * f) | 0;
  return (r << 16) | (g << 8) | b;
}

// Per-key palette and build flags. color tint (opts.color) overrides the body.
const PRESETS = {
  man:    { body: 0x4f6d8f, legs: 0x35506b, hair: HAIR_DARK, build: 'broad', hair_style: 'short' },
  woman:  { body: 0x9c5a86, legs: 0x6e3e60, hair: 0x5a3a22, build: 'slim',  hair_style: 'long' },
  priest: { body: 0xe8e4da, legs: 0xe8e4da, hair: 0x6a6a6a, build: 'robe',  trim: 0xb89a3a },
  guard:  { body: 0x6b6f78, legs: 0x4a4d54, hair: HAIR_DARK, build: 'broad', metal: 0x9aa0ab },
  king:   { body: 0x7a2030, legs: 0x4a1420, hair: 0x6a5a3a, build: 'broad', gold: 0xe7c84a },
  wizard: { body: 0x3a3f7a, legs: 0x3a3f7a, hair: 0xb0b0b0, build: 'robe',  trim: 0x8a7adf },
  merchant:  { body: 0x3f8a6a, legs: 0x2f5a48, hair: 0x4a3320, build: 'broad', hair_style: 'short', trim: 0xd8c060 },
  smith:     { body: 0x6a4a30, legs: 0x3a2a1c, hair: 0x2a1a10, build: 'broad', hair_style: 'short', metal: 0x8a8f96 },
  apothecary:{ body: 0x6aa05a, legs: 0x6aa05a, hair: 0x7a6a4a, build: 'robe',  trim: 0xcfe08a },
};

// A few palettes so NPCs aren't all the same skin/hair tone.
const SKIN_TONES = [0xf2c79b, 0xe0a87e, 0xc68a5a, 0x9c6b43, 0x7a4f2e, 0xffdbac];
const HAIR_TONES = [0x2a1a10, 0x3a2a1c, 0x4a2f1b, 0x6a4a2a, 0xb0b0b0, 0xe8e4dc, 0x992222, 0x555555];

// buildNpcModel(modelKey, opts) — opts.look is a rich appearance descriptor so
// every NPC can look distinct. All fields optional:
//   look: {
//     skin, hair,                // hex overrides (else preset/random-by-seed)
//     build: 'broad'|'slim'|'fat'|'dwarf'|'robe',   // body shape
//     beard: 'none'|'short'|'full'|'long'|'goatee'|'wild',
//     bald: bool, balding: bool, // no hair / receding
//     hat: 'none'|'cap'|'hood'|'straw'|'feather'|'bandana'|'wizard'|'helmet'|'crown',
//     eyepatch: -1|1,            // patch over left/right eye
//     glasses: bool, monocle: bool,
//     scar: bool, bushyBrows: bool, big_nose: bool,
//   }
export function buildNpcModel(modelKey, opts = {}) {
  const preset = PRESETS[modelKey] || null;
  return preset ? buildFromPreset(modelKey, preset, opts) : buildFallback(opts);
}

function buildFromPreset(key, preset, opts) {
  const look = opts.look || {};
  const scale = opts.scale || 1;
  const bodyColor = opts.color != null ? opts.color : preset.body;
  const skinColor = look.skin != null ? look.skin : SKIN;
  const hairColor = look.hair != null ? look.hair : preset.hair;

  const mats = {
    skin:  new THREE.MeshLambertMaterial({ color: skinColor }),
    body:  new THREE.MeshLambertMaterial({ color: bodyColor }),
    legs:  new THREE.MeshLambertMaterial({ color: preset.legs }),
    hair:  new THREE.MeshLambertMaterial({ color: hairColor }),
    boots: new THREE.MeshLambertMaterial({ color: BOOT }),
    eyeW:  new THREE.MeshLambertMaterial({ color: 0xffffff }),
    eyeB:  new THREE.MeshLambertMaterial({ color: 0x26221f }),
    metal: new THREE.MeshLambertMaterial({ color: preset.metal || 0x9aa0ab }),
    gold:  new THREE.MeshLambertMaterial({ color: preset.gold || 0xe7c84a }),
    trim:  new THREE.MeshLambertMaterial({ color: preset.trim || 0xc0a040 }),
    dark:  new THREE.MeshLambertMaterial({ color: 0x1a1410 }),
  };

  const group = new THREE.Group();
  // NPCs share the player's build, so match the player's scale (0.92) to stand
  // the same height. A `dwarf` build stands shorter; opts.scale still tweaks it.
  const build = look.build || preset.build || 'broad';
  const dwarf = build === 'dwarf';
  const model = new THREE.Group();
  model.scale.setScalar(0.92 * scale * (dwarf ? 0.72 : 1));
  group.add(model);

  const robe = build === 'robe';
  const slim = build === 'slim';
  const fat = build === 'fat';

  // torso: robe uses a tapered cylinder (cone-like), others a capsule
  if (robe) {
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.34, 0.8, 16, 1), mats.body);
    skirt.position.y = 0.78;
    model.add(skirt);
    const chest = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), mats.body);
    chest.position.y = 1.08;
    chest.scale.set(1, 0.85, 0.9);
    model.add(chest);
    // robe trim band
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.025, 8, 18), mats.trim);
    band.rotation.x = Math.PI / 2;
    band.position.y = 0.44;
    model.add(band);
  } else {
    // Build width by body type: slim (thin vendor), broad (default), fat (the big
    // weapon buyer — a round belly), dwarf (short + stocky).
    const r = fat ? 0.3 : (dwarf ? 0.27 : (slim ? 0.2 : 0.235));
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(r, fat ? 0.28 : 0.32, 6, 16), mats.body);
    body.position.y = 0.95;
    body.scale.set(slim ? 0.92 : (fat ? 1.05 : 1), 1, slim ? 0.9 : (fat ? 1.05 : 1));
    model.add(body);
    if (fat) {
      // a pot belly hanging over the belt
      const belly = new THREE.Mesh(new THREE.SphereGeometry(0.27, 16, 14), mats.body);
      belly.scale.set(1.05, 0.85, 0.95);
      belly.position.set(0, 0.78, 0.05);
      model.add(belly);
    }
    const hips = new THREE.Mesh(new THREE.SphereGeometry(fat ? 0.27 : (slim ? 0.21 : 0.22), 14, 12), mats.legs);
    hips.scale.set(slim ? 0.98 : (fat ? 1.1 : 1), 0.7, 0.9);
    hips.position.y = 0.62;
    model.add(hips);
  }

  // a leather apron over the front for tradesfolk — a thin curved panel that hugs
  // the chest/belly (was a flat box jutting out like a yellow tablet).
  if (key === 'merchant' || key === 'smith') {
    const apron = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.27, 0.55, 16, 1, true, -0.7, 1.4), mats.trim);
    apron.position.set(0, 0.74, 0.0);
    apron.scale.set(1, 1, 0.92);
    model.add(apron);
  }

  // king cape over the shoulders
  if (key === 'king') {
    const cape = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.34, 0.7, 16, 1, true), mats.gold);
    cape.position.set(0, 0.78, -0.12);
    cape.scale.set(1, 1, 0.6);
    model.add(cape);
  }

  // head
  const head = new THREE.Group();
  head.position.y = dwarf ? 1.32 : 1.42;
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.27, 22, 18), mats.skin);
  skull.scale.set(0.92, 1, 0.92);
  skull.position.y = 0.1;
  head.add(skull);

  // What hat is on (explicit look.hat wins, else the role default). A full helmet
  // or wizard hat or hood hides the hair.
  const hat = look.hat || (key === 'guard' ? 'helmet' : key === 'wizard' ? 'wizard' : key === 'king' ? 'crown' : 'none');
  const hidesHair = hat === 'helmet' || hat === 'wizard' || hat === 'hood';

  // HAIR — bald skips it; balding shows a receding ring; else the role/look style.
  if (!hidesHair && !look.bald) {
    if (look.balding) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.05, 8, 18), mats.hair);
      ring.rotation.x = Math.PI / 2; ring.position.set(0, 0.12, -0.02); ring.scale.set(1, 1, 0.95);
      head.add(ring);
    } else {
      buildNpcHair(head, look.hairStyle || preset.hair_style || 'short', mats.hair);
    }
  }

  // EYES — an eyepatch replaces one eye with a dark patch + strap.
  for (const side of [-1, 1]) {
    if (look.eyepatch === side) {
      const patch = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), mats.dark);
      patch.rotation.x = -1.4; patch.position.set(0.09 * side, 0.11, 0.235);
      head.add(patch);
      const strap = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.012, 6, 20, Math.PI), mats.dark);
      strap.rotation.set(Math.PI / 2, 0, side > 0 ? -0.5 : 0.5); strap.position.set(0, 0.12, 0);
      head.add(strap);
      continue;
    }
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), mats.eyeW);
    eye.position.set(0.09 * side, 0.11, 0.215);
    head.add(eye);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), mats.eyeB);
    pupil.position.set(0.09 * side, 0.11, 0.252);
    head.add(pupil);
  }
  // bushy eyebrows (the wild old man / stern smith)
  if (look.bushyBrows) {
    for (const side of [-1, 1]) {
      const brow = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.03, 0.04), mats.hair);
      brow.position.set(0.09 * side, 0.19, 0.235); brow.rotation.z = side * 0.15;
      head.add(brow);
    }
  }
  const nose = new THREE.Mesh(new THREE.SphereGeometry(look.big_nose ? 0.045 : 0.03, 8, 6), mats.skin);
  nose.position.set(0, 0.03, look.big_nose ? 0.265 : 0.255);
  head.add(nose);
  // glasses / monocle
  if (look.glasses) {
    for (const side of [-1, 1]) {
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.008, 6, 14), mats.dark);
      rim.position.set(0.09 * side, 0.11, 0.255);
      head.add(rim);
    }
  } else if (look.monocle) {
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.009, 6, 16), mats.gold);
    rim.position.set(0.09, 0.11, 0.255);
    head.add(rim);
  }
  // a diagonal facial scar
  if (look.scar) {
    const scar = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.13, 0.01), mats.dark);
    scar.position.set(-0.1, 0.1, 0.25); scar.rotation.z = 0.5;
    head.add(scar);
  }
  // a beauty mark / mole on the cheek
  if (look.mole) {
    const mole = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 5), mats.dark);
    mole.position.set(0.11, -0.02, 0.235);
    head.add(mole);
  }
  // freckles dusted across the cheeks/nose
  if (look.freckles) {
    const frMat = new THREE.MeshLambertMaterial({ color: shadeHex(skinColor, 0.7) });
    const spots = [[-0.09, 0.02], [-0.05, 0.04], [-0.02, 0.0], [0.04, 0.01], [0.08, 0.03], [0.06, -0.02]];
    for (const [sx, sy] of spots) {
      const fr = new THREE.Mesh(new THREE.SphereGeometry(0.008, 5, 4), frMat);
      fr.position.set(sx, sy, 0.255);
      head.add(fr);
    }
  }

  // Orc heritage: little tusks jutting up from the lower jaw + heavier brow. The
  // half-orc NPC keeps a HUMAN skin tone but shows these orcish features.
  if (look.tusks) {
    for (const side of [-1, 1]) {
      const tusk = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.08, 5), mats.eyeW);
      tusk.position.set(0.07 * side, -0.06, 0.22);
      head.add(tusk);
    }
  }
  // pointed ears (elf / half-orc)
  if (look.pointed_ears) {
    for (const side of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.12, 5), mats.skin);
      ear.position.set(0.25 * side, 0.12, 0); ear.rotation.z = -side * 0.7;
      head.add(ear);
    }
  }

  // BEARD — explicit look.beard wins; else priest/king/wizard read as elders.
  const beardStyle = look.beard != null ? look.beard
    : (key === 'priest' || key === 'king' || key === 'wizard') ? 'full' : 'none';
  buildNpcBeard(head, beardStyle, mats.hair);

  // HEADGEAR
  if (hat === 'helmet') buildHelmet(head, mats.metal);
  else if (hat === 'crown') buildCrown(head, mats.gold);
  else if (hat === 'wizard') buildWizardHat(head, mats.body, mats.trim);
  else if (hat === 'cap') buildCap(head, mats.trim);
  else if (hat === 'hood') buildHood(head, mats.body);
  else if (hat === 'straw') buildStrawHat(head, new THREE.MeshLambertMaterial({ color: 0xd9b65c }));
  else if (hat === 'feather') buildFeatherHat(head, mats.dark, mats.trim);
  else if (hat === 'bandana') buildBandana(head, mats.trim);

  model.add(head);

  // arms (shoulder pivot for idle sway)
  const armL = makeArm(model, -1, mats, robe, slim);
  const armR = makeArm(model, 1, mats, robe, slim);
  // Where the RIGHT hand is in model space, so a staff/scepter sits IN the fist.
  const handX = armR.userData.shoulderX;       // ~0.22-0.25
  const handY = 1.18 + armR.userData.handY;    // ~0.80

  // EVERYONE gets legs now (the player asked for it). A robe just hides the upper
  // thigh under the skirt; the lower leg + boot still show, so no one floats on
  // stray feet.
  const legL = makeLeg(model, -1, mats, robe);
  const legR = makeLeg(model, 1, mats, robe);

  // staff in the right hand — wizards always, or any NPC with look.staff. The rod
  // is HELD: it passes through the fist and runs down to the ground beside the
  // body (a walking staff), not floating off to the side.
  let staff = null;
  if (key === 'wizard' || look.staff) {
    staff = new THREE.Group();
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.028, 1.35, 8), new THREE.MeshLambertMaterial({ color: 0x6b4a2a }));
    rod.position.y = 0.0;
    staff.add(rod);
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 10), mats.trim);
    orb.position.y = 0.7;
    staff.add(orb);
    // Seat the grip at the right hand; the rod's centre sits at the fist so it
    // reaches up (orb above the head) and down (foot to the floor).
    staff.position.set(handX + 0.04, handY + 0.2, 0.1);
    model.add(staff);
  }

  // king scepter in the right hand (a short rod held at the fist).
  let scepter = null;
  if (key === 'king') {
    scepter = new THREE.Group();
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.55, 8), mats.gold);
    rod.position.y = 0.1;
    scepter.add(rod);
    const top = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), mats.gold);
    top.position.y = 0.4;
    scepter.add(top);
    scepter.position.set(handX + 0.04, handY, 0.12);
    model.add(scepter);
  }

  // Idle = a short breath + gentle sway that fades out while walking; walking =
  // leg/arm swing. Both run off a time accumulator (no Math.random). `moving` is
  // passed in by the world each frame; `breath` eases 0..1 so it ramps in/out.
  let t = 0, breathA = 0;
  function update(dt, moving) {
    t += dt;
    breathA += ((moving ? 0 : 1) - breathA) * Math.min(1, dt * 8);
    const breath = Math.sin(t * 2.4) * breathA;
    head.position.y = 1.42 + breath * 0.014;
    head.rotation.z = Math.sin(t * 0.8) * 0.03 * breathA;
    model.rotation.z = breath * 0.006;
    if (moving) {
      const sw = Math.sin(t * 9) * 0.5;
      if (legL) legL.rotation.x = sw;
      if (legR) legR.rotation.x = -sw;
      if (armL) armL.rotation.x = -sw * 0.7;
      if (armR) armR.rotation.x = sw * 0.7;
    } else {
      if (legL) legL.rotation.x = 0;
      if (legR) legR.rotation.x = 0;
      const arm = breath * 0.06;
      if (armL) armL.rotation.x = arm;
      if (armR) armR.rotation.x = -arm;
    }
  }

  function dispose() {
    group.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    for (const m of Object.values(mats)) m.dispose();
  }

  return { group, update, dispose };
}

function makeArm(model, side, mats, robe, slim) {
  const pivot = new THREE.Group();
  // Shoulder sits just OUTSIDE the torso so the arm hugs the body — was 0.315,
  // which floated the arms out to the sides (worst on the slim/woman build).
  const sx = robe ? 0.22 : (slim ? 0.225 : 0.25);
  pivot.position.set(sx * side, 1.18, 0);
  // A shoulder cap that overlaps the torso so the arm grows from the body, not a
  // gap. Pushed inward (−x toward the centre) to tuck against the chest.
  const sleeve = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), mats.body);
  sleeve.position.set(-0.02 * side, -0.01, 0);
  pivot.add(sleeve);
  const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.062, 0.24, 5, 12), robe ? mats.body : mats.skin);
  arm.position.y = -0.2;
  pivot.add(arm);
  const palm = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), mats.skin);
  palm.position.y = -0.38;
  pivot.add(palm);
  pivot.userData.handY = -0.38;       // where a held prop should sit
  pivot.userData.shoulderX = sx;
  model.add(pivot);
  return pivot;
}

function makeLeg(model, side, mats, robe) {
  const pivot = new THREE.Group();
  pivot.position.set(0.105 * side, 0.52, 0);
  // Under a robe the upper thigh is hidden by the skirt, so only the lower shin +
  // boot show below the hem (the NPC still has real legs, not floating feet). A
  // non-robe NPC shows the full leg.
  if (!robe) {
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.24, 5, 12), mats.legs);
    leg.position.y = -0.19;
    pivot.add(leg);
  } else {
    const shin = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.1, 5, 10), mats.legs);
    shin.position.y = -0.32;
    pivot.add(shin);
  }
  const foot = new THREE.Mesh(new THREE.SphereGeometry(0.095, 10, 8), mats.boots);
  foot.scale.set(1, 0.6, 1.35);
  foot.position.set(0, -0.4, 0.04);
  pivot.add(foot);
  model.add(pivot);
  return pivot;
}

function buildNpcHair(head, style, mat) {
  if (style === 'long') {
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(0.292, 22, 18, 0, Math.PI * 2, 0, Math.PI * 0.62), mat);
    cap.scale.set(0.98, 1, 1);
    cap.position.set(0, 0.1, -0.01);
    head.add(cap);
    const back = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.24, 6, 12), mat);
    back.scale.set(1.4, 1, 0.55);
    back.position.set(0, -0.04, -0.18);
    head.add(back);
  } else {
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(0.288, 22, 18, 0, Math.PI * 2, 0, Math.PI * 0.5), mat);
    cap.scale.set(0.96, 1, 0.98);
    cap.position.set(0, 0.105, -0.01);
    head.add(cap);
  }
}

// Beard styles. 'none' adds nothing. The wild one fans out for the madman.
function buildNpcBeard(head, style, mat) {
  if (!style || style === 'none') return;
  if (style === 'goatee') {
    const g = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.16, 8), mat);
    g.rotation.x = Math.PI; g.position.set(0, -0.18, 0.18);
    head.add(g);
    return;
  }
  if (style === 'short') {
    const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.08, 6, 12), mat);
    b.scale.set(1, 1, 0.55); b.position.set(0, -0.1, 0.17);
    head.add(b);
    return;
  }
  if (style === 'long') {
    const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.3, 6, 12), mat);
    b.scale.set(1, 1, 0.55); b.position.set(0, -0.24, 0.14);
    head.add(b);
    return;
  }
  if (style === 'wild') {
    // a big unkempt fan of tufts — the crazy old prophet
    const base = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), mat);
    base.scale.set(1.1, 1.3, 0.7); base.position.set(0, -0.18, 0.12);
    head.add(base);
    for (let i = 0; i < 7; i++) {
      const a = (i / 7 - 0.5) * 1.6;
      const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.16, 5), mat);
      tuft.position.set(Math.sin(a) * 0.18, -0.34 - Math.cos(a) * 0.04, 0.12);
      tuft.rotation.z = -Math.sin(a) * 0.8; tuft.rotation.x = Math.PI;
      head.add(tuft);
    }
    return;
  }
  // 'full'
  const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.18, 6, 12), mat);
  b.scale.set(1, 1, 0.6); b.position.set(0, -0.16, 0.16);
  head.add(b);
}

function buildCap(head, mat) {
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.29, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), mat);
  cap.position.set(0, 0.1, 0); head.add(cap);
  const brim = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.03, 0.18), mat);
  brim.position.set(0, 0.1, 0.24); head.add(brim);
}

function buildHood(head, mat) {
  const hood = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 14, 0, Math.PI * 2, 0, Math.PI * 0.66), mat);
  hood.scale.set(1.04, 1.05, 1.08); hood.position.set(0, 0.06, -0.01); head.add(hood);
  const point = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.22, 8), mat);
  point.position.set(0, 0.14, -0.2); point.rotation.x = -0.5; head.add(point);
}

function buildStrawHat(head, mat) {
  const crown = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), mat);
  crown.position.set(0, 0.18, 0); head.add(crown);
  const brim = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.08, 18, 1, true), mat);
  brim.position.set(0, 0.18, 0); head.add(brim);
}

function buildFeatherHat(head, mat, accent) {
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.04, 16), mat);
  brim.position.set(0, 0.26, 0); head.add(brim);
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.18, 14), mat);
  crown.position.set(0, 0.35, 0); head.add(crown);
  const feather = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.3, 5), accent);
  feather.position.set(0.18, 0.45, -0.04); feather.rotation.z = -0.5; head.add(feather);
}

function buildBandana(head, mat) {
  const wrap = new THREE.Mesh(new THREE.CylinderGeometry(0.285, 0.285, 0.12, 18, 1, true), mat);
  wrap.position.set(0, 0.18, 0); head.add(wrap);
  for (const s of [-1, 1]) {
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.16, 5), mat);
    tail.position.set(-0.22, 0.14 + s * 0.04, -0.12); tail.rotation.z = 0.9 + s * 0.2;
    head.add(tail);
  }
}

// An OPEN helmet: a skull cap that sits high on the head with a brow rim, so the
// FACE stays clear (the old one had a low dome + nose guard that covered the face).
function buildHelmet(head, mat) {
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(0.285, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.42), mat);
  dome.position.set(0, 0.12, 0);
  head.add(dome);
  // a brow rim around the cap (cheek guards stay BEHIND the ears so the face shows)
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.275, 0.025, 6, 20), mat);
  rim.rotation.x = Math.PI / 2; rim.position.set(0, 0.12, 0);
  head.add(rim);
  // small spike on top
  const spike = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.12, 8), mat);
  spike.position.set(0, 0.4, 0);
  head.add(spike);
}

function buildCrown(head, mat) {
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.1, 18, 1, true), mat);
  band.position.set(0, 0.32, 0);
  head.add(band);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const point = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.12, 6), mat);
    point.position.set(Math.sin(a) * 0.26, 0.42, Math.cos(a) * 0.26);
    head.add(point);
  }
}

function buildWizardHat(head, brimMat, coneMat) {
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.04, 18), brimMat);
  brim.position.set(0, 0.3, 0);
  head.add(brim);
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.55, 16), brimMat);
  cone.position.set(0, 0.58, 0);
  head.add(cone);
  // tip bauble
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), coneMat);
  tip.position.set(0, 0.86, 0);
  head.add(tip);
}

function buildFallback(opts = {}) {
  const scale = opts.scale || 1;
  const bodyColor = opts.color != null ? opts.color : 0x8a8f99;

  const mats = {
    skin: new THREE.MeshLambertMaterial({ color: SKIN }),
    body: new THREE.MeshLambertMaterial({ color: bodyColor }),
    legs: new THREE.MeshLambertMaterial({ color: 0x444851 }),
    boots: new THREE.MeshLambertMaterial({ color: BOOT }),
    eyeW: new THREE.MeshLambertMaterial({ color: 0xffffff }),
    eyeB: new THREE.MeshLambertMaterial({ color: 0x26221f }),
  };

  const group = new THREE.Group();
  // Match the player's scale (0.92) so the fallback NPC is the same height.
  const model = new THREE.Group();
  model.scale.setScalar(0.92 * scale);
  group.add(model);

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.235, 0.32, 6, 16), mats.body);
  body.position.y = 0.95;
  model.add(body);
  const hips = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 12), mats.legs);
  hips.scale.set(1, 0.7, 0.9);
  hips.position.y = 0.62;
  model.add(hips);

  const head = new THREE.Group();
  head.position.y = 1.42;
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.27, 22, 18), mats.skin);
  skull.scale.set(0.92, 1, 0.92);
  skull.position.y = 0.1;
  head.add(skull);
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), mats.eyeW);
    eye.position.set(0.09 * side, 0.11, 0.215);
    head.add(eye);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), mats.eyeB);
    pupil.position.set(0.09 * side, 0.11, 0.252);
    head.add(pupil);
  }
  model.add(head);

  const armL = makeArm(model, -1, mats, false);
  const armR = makeArm(model, 1, mats, false);
  const legL = makeLeg(model, -1, mats);
  const legR = makeLeg(model, 1, mats);

  let t = 0, breathA = 0;
  function update(dt, moving) {
    t += dt;
    breathA += ((moving ? 0 : 1) - breathA) * Math.min(1, dt * 8);
    const breath = Math.sin(t * 2.4) * breathA;
    head.position.y = 1.42 + breath * 0.014;
    model.rotation.z = breath * 0.006;
    if (moving) {
      const sw = Math.sin(t * 9) * 0.5;
      legL.rotation.x = sw; legR.rotation.x = -sw;
      armL.rotation.x = -sw * 0.7; armR.rotation.x = sw * 0.7;
    } else {
      legL.rotation.x = 0; legR.rotation.x = 0;
      armL.rotation.x = breath * 0.06;
      armR.rotation.x = -breath * 0.06;
    }
  }

  function dispose() {
    group.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    for (const m of Object.values(mats)) m.dispose();
  }

  return { group, update, dispose };
}

export const NPC_MODEL_KEYS = ['man', 'woman', 'priest', 'guard', 'king', 'wizard', 'merchant', 'smith', 'apothecary'];
