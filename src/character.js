import * as THREE from 'three';

// Rounded character: smoothed capsules and spheres, no cubes.
// The model faces +Z. Hands, body and equip anchors are exposed in `parts`
// so weapons, shield and visible armor can be attached at runtime.
const BOOT_COLOR = 0x4a3526;

const HAIR_STYLES = ['short', 'long', 'spiky', 'bald'];

export function buildCharacter(profile) {
  const colors = profile.colors;
  const sex = profile.sex || 'male';
  const hairStyle = profile.hair || 'short';

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
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), mats.skin);
  nose.position.set(0, 0.03, 0.255);
  head.add(nose);

  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.018, 6, 12, Math.PI), mats.mouth);
  mouth.rotation.x = Math.PI / 2;
  mouth.rotation.z = Math.PI;
  mouth.position.set(0, -0.05, 0.24);
  head.add(mouth);

  // helmet equip anchor
  const helmet = new THREE.Group();
  helmet.position.y = 0.12;
  head.add(helmet);

  model.add(head);

  // arms (shoulder pivot for animation)
  function makeArm(side) {
    const pivot = new THREE.Group();
    pivot.position.set(0.315 * side, 1.18, 0);
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
    const k = Math.sin((1 - swingT / 0.32) * Math.PI);
    armR.pivot.rotation.x = -k * 2.1;
  }

  return {
    group,
    parts: { head, helmet, chestArmor, armL, armR, legL, legR, legBootL: legL.boot, legBootR: legR.boot, body, hips },
    mats,
    setColors,
    animate,
    triggerAttack,
    updateAttack,
  };
}

function buildHair(head, style, mat) {
  if (style === 'bald') return;
  if (style === 'short') {
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(0.288, 22, 18, 0, Math.PI * 2, 0, Math.PI * 0.5), mat);
    cap.scale.set(0.96, 1, 0.98);
    cap.position.set(0, 0.105, -0.01);
    head.add(cap);
  } else if (style === 'long') {
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(0.292, 22, 18, 0, Math.PI * 2, 0, Math.PI * 0.62), mat);
    cap.scale.set(0.98, 1, 1);
    cap.position.set(0, 0.1, -0.01);
    head.add(cap);
    const back = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.24, 6, 12), mat);
    back.scale.set(1.4, 1, 0.55);
    back.position.set(0, -0.04, -0.18);
    head.add(back);
  } else if (style === 'spiky') {
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(0.286, 22, 18, 0, Math.PI * 2, 0, Math.PI * 0.46), mat);
    cap.scale.set(0.96, 1, 0.98);
    cap.position.set(0, 0.115, -0.01);
    head.add(cap);
    const rnd = [[-0.1, 0.32, 0.06], [0.08, 0.34, 0.04], [0, 0.33, -0.08], [-0.14, 0.3, -0.04], [0.14, 0.3, -0.02]];
    for (const [x, y, z] of rnd) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.16, 6), mat);
      spike.position.set(x, y, z);
      head.add(spike);
    }
  }
}

export { HAIR_STYLES };
