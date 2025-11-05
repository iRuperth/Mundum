import * as THREE from 'three';

// Personaje redondeado: cápsulas y esferas suavizadas, nada de cubos.
// El modelo mira hacia +Z; las manos quedan expuestas en `parts` para
// poder colgar armas y escudo en la fase 2.
const BOOT_COLOR = 0x4a3526;

export function buildCharacter(colors) {
  const mats = {
    skin:  new THREE.MeshLambertMaterial({ color: colors.skin }),
    shirt: new THREE.MeshLambertMaterial({ color: colors.shirt }),
    pants: new THREE.MeshLambertMaterial({ color: colors.pants }),
    hair:  new THREE.MeshLambertMaterial({ color: colors.hair }),
    boots: new THREE.MeshLambertMaterial({ color: BOOT_COLOR }),
    eyeW:  new THREE.MeshLambertMaterial({ color: 0xffffff }),
    eyeB:  new THREE.MeshLambertMaterial({ color: 0x26221f }),
  };

  const group = new THREE.Group();
  const model = new THREE.Group();
  model.scale.setScalar(0.92);
  group.add(model);

  // torso
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.34, 6, 16), mats.shirt);
  body.position.y = 0.95;
  model.add(body);

  // cintura/cadera con color de pantalón
  const hips = new THREE.Mesh(new THREE.SphereGeometry(0.225, 14, 12), mats.pants);
  hips.scale.set(1, 0.7, 0.9);
  hips.position.y = 0.62;
  model.add(hips);

  // cabeza
  const head = new THREE.Group();
  head.position.y = 1.42;
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.27, 22, 18), mats.skin);
  skull.scale.set(0.92, 1, 0.92);
  skull.position.y = 0.12;
  head.add(skull);

  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(0.288, 22, 18, 0, Math.PI * 2, 0, Math.PI * 0.55), mats.hair);
  hair.scale.set(0.94, 1, 0.96);
  hair.position.set(0, 0.125, -0.02);
  head.add(hair);

  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), mats.eyeW);
    eye.position.set(0.09 * side, 0.13, 0.215);
    head.add(eye);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), mats.eyeB);
    pupil.position.set(0.09 * side, 0.13, 0.252);
    head.add(pupil);
  }
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.032, 8, 6), mats.skin);
  nose.position.set(0, 0.05, 0.245);
  head.add(nose);
  model.add(head);

  // brazos (pivote en el hombro para la animación)
  function makeArm(side) {
    const pivot = new THREE.Group();
    pivot.position.set(0.315 * side, 1.18, 0);
    const sleeve = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), mats.shirt);
    sleeve.position.y = -0.02;
    pivot.add(sleeve);
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.26, 5, 12), mats.skin);
    arm.position.y = -0.2;
    pivot.add(arm);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.085, 10, 8), mats.skin);
    hand.position.y = -0.4;
    pivot.add(hand);
    model.add(pivot);
    return { pivot, hand };
  }
  const armL = makeArm(-1), armR = makeArm(1);

  // piernas (pivote en la cadera)
  function makeLeg(side) {
    const pivot = new THREE.Group();
    pivot.position.set(0.105 * side, 0.52, 0);
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.088, 0.26, 5, 12), mats.pants);
    leg.position.y = -0.2;
    pivot.add(leg);
    const foot = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), mats.boots);
    foot.scale.set(1, 0.6, 1.35);
    foot.position.set(0, -0.42, 0.04);
    pivot.add(foot);
    model.add(pivot);
    return pivot;
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
      legL.rotation.x = -sw * 0.95;
      legR.rotation.x = sw * 0.95;
      armL.pivot.rotation.z = 0.08;
      armR.pivot.rotation.z = -0.08;
    } else {
      // pose de salto: brazos hacia atrás, piernas recogidas
      armL.pivot.rotation.x = 0.55;
      armR.pivot.rotation.x = 0.55;
      armL.pivot.rotation.z = 0.45;
      armR.pivot.rotation.z = -0.45;
      legL.rotation.x = -0.35;
      legR.rotation.x = 0.3;
    }
  }

  return {
    group,
    parts: { head, armL, armR, legL, legR, body },
    setColors,
    animate,
  };
}
