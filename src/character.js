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
  const armL = makeArm(-1), armR = makeArm(1);

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

  function setColors(c) {
    mats.skin.color.set(c.skin);
    mats.shirt.color.set(c.shirt);
    mats.pants.color.set(c.pants);
    mats.hair.color.set(c.hair);
  }

  function animate(phase, intensity, grounded) {
    const sw = Math.sin(phase) * 0.75 * Math.min(1, intensity);
    if (grounded) {
      armL.pivot.rotation.x = sw;
      armR.pivot.rotation.x = -sw;
      legL.pivot.rotation.x = -sw * 0.95;
      legR.pivot.rotation.x = sw * 0.95;
      armL.pivot.rotation.z = 0.08;
      armR.pivot.rotation.z = -0.08;
    } else {
      // jump pose: arms up, legs tucked, like Minecraft/Roblox
      armL.pivot.rotation.x = -2.3;
      armR.pivot.rotation.x = -2.3;
      armL.pivot.rotation.z = 0.5;
      armR.pivot.rotation.z = -0.5;
      legL.pivot.rotation.x = -0.4;
      legR.pivot.rotation.x = 0.35;
    }
  }

  // brief swing of the right arm for an attack
  let swingT = 0;
  function triggerAttack() { swingT = 0.32; }
  function updateAttack(dt) {
    if (swingT <= 0) return;
    swingT = Math.max(0, swingT - dt);
    const p = 1 - swingT / 0.32;
    const k = Math.sin(p * Math.PI);
    // Overhand swing of the weapon arm: raise back then chop forward.
    armR.pivot.rotation.x = -k * 2.4;
    armR.pivot.rotation.z = -0.08 - k * 0.3;
  }

  // Returns true while a swing is playing (so viewmodels can mirror it).
  function attackProgress() {
    return swingT > 0 ? 1 - swingT / 0.32 : -1;
  }

  return {
    group,
    parts: { head, helmet, chestArmor, armL, armR, legL, legR, legBootL: legL.boot, legBootR: legR.boot, body, hips },
    mats,
    setColors,
    animate,
    triggerAttack,
    updateAttack,
    attackProgress,
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
