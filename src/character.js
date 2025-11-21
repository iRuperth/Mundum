import * as THREE from 'three';

// Rounded character: smoothed capsules and spheres, no cubes.
// The model faces +Z. Hands, body and equip anchors are exposed in `parts`
// so weapons, shield and visible armor can be attached at runtime.
const BOOT_COLOR = 0x4a3526;

const HAIR_STYLES = ['short', 'long', 'spiky', 'bald'];
const NOSE_STYLES = ['small', 'round', 'pointy'];
const MOUTH_STYLES = ['smile', 'neutral', 'open'];

export function buildCharacter(profile) {
  const colors = profile.colors;
  const sex = profile.sex || 'male';
  const hairStyle = profile.hair || 'short';
  const noseStyle = NOSE_STYLES.includes(profile.nose) ? profile.nose : 'small';
  const mouthStyle = MOUTH_STYLES.includes(profile.mouth) ? profile.mouth : 'smile';

  const mats = {
    skin:  new THREE.MeshLambertMaterial({ color: colors.skin }),
    shirt: new THREE.MeshLambertMaterial({ color: colors.shirt }),
    pants: new THREE.MeshLambertMaterial({ color: colors.pants }),
    hair:  new THREE.MeshLambertMaterial({ color: colors.hair }),
    boots: new THREE.MeshLambertMaterial({ color: BOOT_COLOR }),
    eyeW:  new THREE.MeshLambertMaterial({ color: 0xffffff }),
    eyeB:  new THREE.MeshLambertMaterial({ color: 0x26221f }),
    mouth: new THREE.MeshLambertMaterial({ color: 0x9a4b3b }),
  };

  const group = new THREE.Group();
  const model = new THREE.Group();
  model.scale.setScalar(0.92);
  group.add(model);

  const female = sex === 'female';

  // torso
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(female ? 0.215 : 0.24, 0.34, 6, 16), mats.shirt);
  body.position.y = 0.95;
  body.scale.set(female ? 0.95 : 1, 1, female ? 0.92 : 1);
  model.add(body);

  // chest equip anchor (armor overlay shows here)
  const chestArmor = new THREE.Group();
  chestArmor.position.y = 0.95;
  model.add(chestArmor);

  // hips with pants color
  const hips = new THREE.Mesh(new THREE.SphereGeometry(female ? 0.235 : 0.225, 14, 12), mats.pants);
  hips.scale.set(female ? 1.05 : 1, 0.7, 0.9);
  hips.position.y = 0.62;
  model.add(hips);

  // head
  const head = new THREE.Group();
  head.position.y = 1.42;
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.27, 22, 18), mats.skin);
  skull.scale.set(0.92, 1, 0.92);
  skull.position.y = 0.1;
  head.add(skull);

  buildHair(head, hairStyle, mats.hair);

  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), mats.eyeW);
    eye.position.set(0.09 * side, 0.11, 0.215);
    head.add(eye);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), mats.eyeB);
    pupil.position.set(0.09 * side, 0.11, 0.252);
    head.add(pupil);
  }
  buildNose(head, noseStyle, mats.skin);
  buildMouth(head, mouthStyle, mats.mouth);

  // helmet equip anchor
  const helmet = new THREE.Group();
  helmet.position.y = 0.12;
  head.add(helmet);

  model.add(head);

  // arms (shoulder pivot for animation). The shoulder sits closer in for the
  // narrower female torso so the arms don't float away from the body.
  const shoulderX = female ? 0.275 : 0.315;
  function makeArm(side) {
    const pivot = new THREE.Group();
    pivot.position.set(shoulderX * side, 1.18, 0);
    const sleeve = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), mats.shirt);
    sleeve.position.y = -0.02;
    pivot.add(sleeve);
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.26, 5, 12), mats.skin);
    arm.position.y = -0.2;
    pivot.add(arm);
    const hand = new THREE.Group();
    hand.position.y = -0.4;
    const palm = new THREE.Mesh(new THREE.SphereGeometry(0.085, 10, 8), mats.skin);
    hand.add(palm);
    pivot.add(hand);
    model.add(pivot);
    return { pivot, hand };
  }
  // armR holds the weapon (and drives the swing); armL holds the shield. The
  // model faces +Z and the third-person camera views it from behind, so the
  // weapon arm sits on -X to read on the right of the screen — matching the
  // first-person viewmodel, which is also on the right.
  const armL = makeArm(1), armR = makeArm(-1);

  // legs (hip pivot)
  function makeLeg(side) {
    const pivot = new THREE.Group();
    pivot.position.set(0.105 * side, 0.52, 0);
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.088, 0.26, 5, 12), mats.pants);
    leg.position.y = -0.2;
    pivot.add(leg);
    const boot = new THREE.Group();
    boot.position.set(0, -0.42, 0.04);
    const foot = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), mats.boots);
    foot.scale.set(1, 0.6, 1.35);
    boot.add(foot);
    pivot.add(boot);
    model.add(pivot);
    return { pivot, boot };
  }
  const legL = makeLeg(-1), legR = makeLeg(1);

  // Game Master regalia: a unique, floor-length robe/gown (Tibia GameMaster
  // style) — a long flared skirt that covers the legs down to the feet, a robed
  // torso, a gold collar and a gold chest emblem, plus a cape for authority.
  // Only built when the profile is flagged gm.
  let cape = null;
  if (profile.gm) {
    const robeMat = new THREE.MeshLambertMaterial({ color: 0x4a2f86 });   // deep royal purple
    const robeMat2 = new THREE.MeshLambertMaterial({ color: 0x5b39a0 }); // lighter robe accent
    const goldMat = new THREE.MeshLambertMaterial({ color: 0xf4c430 });   // gold trim
    // Recolour the torso/legs to the robe so any sliver of skin/cloth matches.
    mats.shirt.color.set(0x4a2f86);
    mats.pants.color.set(0x3a2168);

    // The GOWN: a long cone flaring from the waist down to the floor, hiding the
    // legs entirely so the GM reads as wearing a single robe, not trousers.
    const skirt = new THREE.Mesh(
      new THREE.CylinderGeometry(0.26, 0.5, 0.95, 20, 1, true), robeMat);
    skirt.position.y = 0.5;
    model.add(skirt);
    // A second, slightly shorter layer gives the robe some depth/folds.
    const skirtInner = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.42, 0.8, 20, 1, true), robeMat2);
    skirtInner.position.y = 0.56;
    model.add(skirtInner);
    // Gold hem ring around the bottom of the gown.
    const skirtHem = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.52, 0.08, 20, 1, true), goldMat);
    skirtHem.position.y = 0.06;
    model.add(skirtHem);
    // A vertical gold trim strip down the front of the gown.
    const placket = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.9, 0.04), goldMat);
    placket.position.set(0, 0.52, 0.43);
    placket.rotation.x = 0.12;
    model.add(placket);

    // Robed torso overlay (a tunic over the chest) so the upper body matches the
    // gown rather than looking like a plain shirt.
    const robeTorso = new THREE.Mesh(new THREE.CapsuleGeometry(0.27, 0.34, 6, 16), robeMat);
    robeTorso.position.y = 0.95;
    robeTorso.scale.set(1.02, 1, 1.02);
    model.add(robeTorso);

    // Gold collar ring at the neck + a round gold emblem on the chest.
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.035, 8, 16), goldMat);
    collar.rotation.x = Math.PI / 2;
    collar.position.y = 1.2;
    model.add(collar);
    const emblem = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.03, 16), goldMat);
    emblem.rotation.x = Math.PI / 2;
    emblem.position.set(0, 1.02, 0.27);
    model.add(emblem);

    // Cape: a shoulder yoke plus a long draping panel, pivoting from the
    // shoulders so it can swing (animated below).
    cape = new THREE.Group();
    cape.position.set(0, 1.28, -0.18);
    const yoke = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.31, 0.12, 16, 1, true), goldMat);
    yoke.position.y = 0;
    cape.add(yoke);
    const panel = new THREE.Mesh(new THREE.BoxGeometry(0.58, 1.2, 0.05), robeMat);
    panel.position.set(0, -0.64, -0.02);
    cape.add(panel);
    const hem = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.08, 0.06), goldMat);
    hem.position.set(0, -1.26, -0.02);
    cape.add(hem);
    model.add(cape);
  }

  function setColors(c) {
    mats.skin.color.set(c.skin);
    mats.shirt.color.set(c.shirt);
    mats.pants.color.set(c.pants);
    mats.hair.color.set(c.hair);
  }

  // Which weapon the hands are posed for. 'bow' and 'wand' hold a fixed ready
  // stance (arms forward / raised) instead of swinging at the side; melee and
  // bare hands swing freely. Set by EquipVisuals on every equip change.
  let weaponType = null;
  let isBow = false;
  let bowMesh = null; // the bow group, exposing userData.setDraw for the string
  function setWeaponPose(type, bow) { weaponType = type; isBow = !!bow; }
  function setBowMesh(mesh) { bowMesh = mesh; if (bowMesh && bowMesh.userData.setDraw) bowMesh.userData.setDraw(0); }

  // Idle breathing: a small, fast rise/fall of the chest and head that only
  // plays when standing still and grounded. It fades out the moment the gait,
  // a jump or an attack takes over so the breath never fights those motions.
  let breathT = 0;
  let breathAmt = 0; // eased 0..1 so the breath ramps in/out instead of popping
  function breathe(dt, active) {
    breathT += dt;
    const target = active ? 1 : 0;
    breathAmt += (target - breathAmt) * Math.min(1, dt * 8);
    const b = Math.sin(breathT * 2.4) * breathAmt;
    body.position.y = 0.95 + b * 0.012;
    body.scale.y = 1 + b * 0.02;
    head.position.y = 1.42 + b * 0.014;
    chestArmor.position.y = 0.95 + b * 0.012;
  }

  function animate(phase, intensity, grounded, dt = 0) {
    const sw = Math.sin(phase) * 0.75 * Math.min(1, intensity);
    // GM cape: drift backward and sway side to side as the hero moves; settle
    // upright when standing still.
    if (cape) {
      const flow = Math.min(1, intensity);
      cape.rotation.x = -0.12 - flow * 0.45 + Math.sin(phase * 1.2) * 0.06 * flow;
      cape.rotation.z = Math.sin(phase) * 0.12 * flow;
    }
    // Breathe only while standing still on the ground and not mid-swing; any of
    // walking, jumping or attacking cuts it off.
    const still = grounded && intensity < 0.05 && swingT <= 0;
    breathe(dt, still);
    if (!grounded) {
      // jump pose: arms up, legs tucked, like Minecraft/Roblox
      armL.pivot.rotation.x = -2.3;
      armR.pivot.rotation.x = -2.3;
      armL.pivot.rotation.z = 0.5;
      armR.pivot.rotation.z = -0.5;
      armL.pivot.rotation.y = 0;
      armR.pivot.rotation.y = 0;
      legL.pivot.rotation.x = -0.4;
      legR.pivot.rotation.x = 0.35;
      return;
    }
    // Legs always march with the walk phase.
    legL.pivot.rotation.x = -sw * 0.95;
    legR.pivot.rotation.x = sw * 0.95;

    if (isBow) {
      // Walking with a bow lowered: arms hang at the sides and swing gently with
      // the gait (the bow is only raised into the draw when attacking). Keeps the
      // weapon arm slightly tucked so the held bow doesn't clip the leg.
      armL.pivot.rotation.set(sw, 0, 0.08);
      armR.pivot.rotation.set(-sw * 0.8, 0, -0.12);
      armL.pivot.rotation.y = 0;
      armR.pivot.rotation.y = 0;
    } else if (weaponType === 'wand') {
      // Caster stance: weapon arm raised, wand up; off-hand relaxed with a sway.
      const wob = sw * 0.2;
      armR.pivot.rotation.set(-1.0 + wob, 0, -0.12);
      armR.pivot.rotation.y = -0.2;
      armL.pivot.rotation.set(sw * 0.6, 0, 0.1);
      armL.pivot.rotation.y = 0;
    } else {
      // Melee / bare hands: arms swing with the gait.
      armL.pivot.rotation.set(sw, 0, 0.08);
      armR.pivot.rotation.set(-sw, 0, -0.08);
      armL.pivot.rotation.y = 0;
      armR.pivot.rotation.y = 0;
    }
  }

  // Attack motion: a typed, timed pose layered over the walk stance. Each weapon
  // gets its own motion — melee chops, the wand thrusts forward, the bow draws
  // the string back then releases. duration scales the feel per weapon.
  let swingT = 0, swingDur = 0.32, swingType = null;
  function triggerAttack(type) {
    swingType = type || weaponType;
    swingDur = swingType === 'bow' ? 0.42 : swingType === 'wand' ? 0.3 : 0.32;
    swingT = swingDur;
  }

  function updateAttack(dt) {
    if (swingT <= 0) {
      // Idle: keep the bow string relaxed so it isn't stuck drawn.
      if (bowMesh && bowMesh.userData.setDraw) bowMesh.userData.setDraw(0);
      return;
    }
    swingT = Math.max(0, swingT - dt);
    const p = 1 - swingT / swingDur; // 0..1 over the motion

    if (swingType === 'bow') {
      // Draw fast (string back to the cheek), hold a beat, then snap to release.
      // draw ramps up over the first 55%, releases sharply after.
      const draw = p < 0.55 ? p / 0.55 : Math.max(0, 1 - (p - 0.55) / 0.18);
      if (bowMesh && bowMesh.userData.setDraw) bowMesh.userData.setDraw(draw);
      // Bow arm (R) RISES from its lowered walking spot up to a forward aim as the
      // draw builds; string hand (L) comes up and pulls back toward the cheek.
      armR.pivot.rotation.set(-draw * 1.45, 0, -0.12 - draw * 0.06);
      armR.pivot.rotation.y = -draw * 0.45;
      armL.pivot.rotation.set(0.08 - draw * 1.25, 0, 0.08 + draw * 0.27);
      armL.pivot.rotation.y = draw * 0.6;
    } else if (swingType === 'wand') {
      // Forward thrust: jab the wand toward the target, then recoil.
      const k = Math.sin(p * Math.PI);
      armR.pivot.rotation.set(-1.0 - k * 0.7, 0, -0.12);
      armR.pivot.rotation.y = -0.2 + k * 0.1;
    } else {
      // Overhand swing of the weapon arm: raise back then chop forward.
      const k = Math.sin(p * Math.PI);
      armR.pivot.rotation.set(-k * 2.4, 0, -0.08 - k * 0.3);
      armR.pivot.rotation.y = 0;
    }
  }

  // Returns { progress: 0..1, type } while a swing plays, else null. Viewmodels
  // mirror this so the first-person weapon moves with the same timing.
  function attackProgress() {
    return swingT > 0 ? { progress: 1 - swingT / swingDur, type: swingType } : null;
  }

  return {
    group,
    // The Game Master wears a fixed robe + cape: EquipVisuals reads this flag and
    // skips drawing any equipped armor/weapon so worn gear never shows on the GM.
    isGM: !!profile.gm,
    parts: { head, helmet, chestArmor, armL, armR, legL, legR, legBootL: legL.boot, legBootR: legR.boot, body, hips, isFemale: female },
    mats,
    setColors,
    animate,
    triggerAttack,
    updateAttack,
    attackProgress,
    setWeaponPose,
    setBowMesh,
  };
}

// Hair sits as a cap on TOP of the head and is pushed back so it never falls
// over the eyes or the face. The crown is a shallow dome; longer styles add
// hair only on the back and sides, leaving the face clear.
function buildHair(head, style, mat) {
  if (style === 'bald') return;

  // Shallow top dome (phi ~0.34) lifted above the eyes so the forehead shows.
  const cap = new THREE.Mesh(
    new THREE.SphereGeometry(0.29, 22, 18, 0, Math.PI * 2, 0, Math.PI * 0.4), mat);
  cap.scale.set(0.97, 0.9, 1);
  cap.position.set(0, 0.16, -0.02);
  head.add(cap);

  if (style === 'long') {
    // A single sheet of hair down the BACK of the head only, never over the face.
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.42, 0.1), mat);
    back.position.set(0, -0.08, -0.22);
    head.add(back);
    const tip = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.08), mat);
    tip.position.set(0, -0.3, -0.21);
    head.add(tip);
  } else if (style === 'spiky') {
    const spikes = [[-0.1, 0.34, 0.04], [0.09, 0.36, 0.02], [0, 0.37, -0.06], [-0.15, 0.33, -0.03], [0.15, 0.33, -0.02]];
    for (const [x, y, z] of spikes) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.16, 6), mat);
      spike.position.set(x, y, z);
      head.add(spike);
    }
  }
}

function buildNose(head, style, mat) {
  let geo;
  if (style === 'round') geo = new THREE.SphereGeometry(0.042, 8, 6);
  else if (style === 'pointy') geo = new THREE.ConeGeometry(0.03, 0.08, 6);
  else geo = new THREE.SphereGeometry(0.03, 8, 6);
  const nose = new THREE.Mesh(geo, mat);
  if (style === 'pointy') nose.rotation.x = Math.PI / 2;
  nose.position.set(0, 0.03, 0.255);
  head.add(nose);
}

function buildMouth(head, style, mat) {
  let mouth;
  if (style === 'neutral') {
    mouth = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.016, 0.02), mat);
  } else if (style === 'open') {
    mouth = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), mat);
    mouth.scale.set(1, 0.7, 0.5);
  } else {
    mouth = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.018, 6, 12, Math.PI), mat);
    mouth.rotation.x = Math.PI / 2;
    mouth.rotation.z = Math.PI;
  }
  mouth.position.set(0, -0.05, 0.24);
  head.add(mouth);
}

export { HAIR_STYLES, NOSE_STYLES, MOUTH_STYLES };
