import * as THREE from 'three';

// Rounded character: smoothed capsules and spheres, no cubes.
// The model faces +Z. Hands, body and equip anchors are exposed in `parts`
// so weapons, shield and visible armor can be attached at runtime.
const BOOT_COLOR = 0x4a3526;

const HAIR_STYLES = ['short', 'long', 'spiky', 'buzz', 'curly', 'mohawk', 'bun', 'ponytail', 'pigtails', 'afro', 'emo', 'bald'];
const NOSE_STYLES = ['small', 'round', 'pointy', 'button', 'wide'];
const MOUTH_STYLES = ['smile', 'neutral', 'open', 'grin', 'frown', 'smirk'];
const EYE_STYLES  = ['normal', 'happy', 'bored', 'wink', 'sleepy', 'angry', 'cute'];
const BROW_STYLES = ['normal', 'raised', 'angry', 'sad', 'none'];
const EAR_STYLES  = ['normal', 'big', 'elf', 'small'];

const inSet = (set, v, fb) => set.includes(v) ? v : fb;

export function buildCharacter(profile) {
  const colors = profile.colors;
  const sex = profile.sex || 'male';
  const hairStyle = inSet(HAIR_STYLES, profile.hair, 'short');
  const noseStyle = inSet(NOSE_STYLES, profile.nose, 'small');
  const mouthStyle = inSet(MOUTH_STYLES, profile.mouth, 'smile');
  const eyeStyle = inSet(EYE_STYLES, profile.eyes, 'normal');
  const browStyle = inSet(BROW_STYLES, profile.brows, 'normal');
  const earStyle = inSet(EAR_STYLES, profile.ears, 'normal');

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

  // TORSO — ONE long tapered capsule from the shoulders down past the waist, so
  // the trunk is a single continuous shape with NO stacked spheres (those crossed
  // each other and read as segmented rings/"parts"). The capsule's own rounded
  // ends give the chest and waist; a gentle scale makes it a touch wider/deeper at
  // chest height than at the waist for a natural taper. `body` is the named anchor
  // (breathe() + the bag attach here); it reaches LOW so the pelvis below overlaps
  // it with no skin gap. Worn armor still overlays cleanly on chestArmor.
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(female ? 0.19 : 0.215, 0.42, 10, 20), mats.shirt);
  body.position.y = 1.0;
  body.scale.set(female ? 0.96 : 1, 1, female ? 0.9 : 0.94);
  model.add(body);
  // A soft chest swell high on the trunk: not a separate ball, just a low-profile
  // cap blended onto the capsule's front-upper so the shoulders read broader than
  // the waist. Kept shallow and well inside the capsule radius so no seam shows.
  const chest = new THREE.Mesh(new THREE.SphereGeometry(female ? 0.2 : 0.225, 16, 14), mats.shirt);
  chest.scale.set(1, 0.62, female ? 0.92 : 0.9);
  chest.position.y = 0.16;
  body.add(chest);
  // Shirt HEM — a short flared skirt of the shirt that hangs over the waistband,
  // covering the top of the pants so there's NO bare-skin gap and no "two stacked
  // blocks" look: the shirt visibly tucks over the hip. Slightly wider than the
  // capsule's base so it drapes past it. Child of `body` so it breathes with it.
  const hem = new THREE.Mesh(new THREE.CylinderGeometry(female ? 0.205 : 0.225, female ? 0.225 : 0.245, 0.16, 20), mats.shirt);
  hem.scale.set(1, 1, female ? 0.92 : 0.94);
  hem.position.y = -0.32;
  body.add(hem);

  // NECK — a short tapered column bridging the torso and the head so the head
  // doesn't float above a gap.
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.11, 0.12, 14), mats.skin);
  neck.position.y = 1.27;
  model.add(neck);

  // chest equip anchor (armor overlay shows here)
  const chestArmor = new THREE.Group();
  chestArmor.position.y = 0.95;
  model.add(chestArmor);

  // PELVIS / lower body — ONE tapered hip block in the pants colour that reaches
  // UP INTO the bottom of the shirt-torso (so there's no bare-skin gap and no
  // separate "diaper" ball) and flows DOWN into both thighs. Built from a single
  // truncated cone: wide at the top where it meets the waist, narrowing to the
  // crotch, slim front-to-back so it's a hip — not a round bulge between the legs.
  const hips = new THREE.Group();
  hips.position.y = 0.72;
  model.add(hips);
  // Hip cone: its WIDE top reaches up inside the shirt-torso (radius ≈ the torso's
  // lower half) so the pants and shirt overlap with NO skin gap and no seam — they
  // just blend at the waistline. It narrows downward toward where the thighs meet,
  // slim front-to-back so it's a hip, not a bulge.
  const pelvis = new THREE.Mesh(new THREE.CylinderGeometry(female ? 0.205 : 0.215, female ? 0.155 : 0.16, 0.26, 18), mats.pants);
  pelvis.scale.set(1, 1, 0.82);
  pelvis.position.y = -0.1;
  hips.add(pelvis);
  // Rounded seat: a low dome capping the underside so the bottom of the pelvis is
  // soft (a butt/lap), not a flat cylinder edge, and it overlaps the thigh tops.
  const seat = new THREE.Mesh(new THREE.SphereGeometry(female ? 0.185 : 0.19, 16, 12), mats.pants);
  seat.scale.set(1, 0.72, 0.82);
  seat.position.y = -0.2;
  hips.add(seat);
  // The pelvis meshes, exposed so worn LEG armor can hide them and cover the hip
  // with its own layer (so no bare pants show between the chest armor and greaves).
  hips.userData.pantsMeshes = [pelvis, seat];

  // head
  const head = new THREE.Group();
  head.position.y = 1.42;
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.27, 22, 18), mats.skin);
  skull.scale.set(0.92, 1, 0.92);
  skull.position.y = 0.1;
  head.add(skull);

  buildEars(head, earStyle, mats.skin);
  const hairGroup = buildHair(head, hairStyle, mats.hair);
  buildEyes(head, eyeStyle, mats);
  buildBrows(head, browStyle, mats.hair);
  buildNose(head, noseStyle, mats.skin);
  buildMouth(head, mouthStyle, mats.mouth, mats.eyeW);

  // helmet equip anchor
  const helmet = new THREE.Group();
  helmet.position.y = 0.12;
  head.add(helmet);

  model.add(head);

  // arms (shoulder pivot for animation). The shoulder sits closer in for the
  // narrower female torso so the arms don't float away from the body.
  const shoulderX = female ? 0.265 : 0.3;
  function makeArm(side) {
    const pivot = new THREE.Group();
    pivot.position.set(shoulderX * side, 1.18, 0);
    // Shoulder cap: a rounded deltoid that sits proud of the pivot and overlaps the
    // torso, so the arm grows from a soft shoulder instead of a hard socket. Pushed
    // a touch inward (toward the body) so it tucks against the chest.
    const sleeve = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 12), mats.shirt);
    sleeve.scale.set(1, 0.95, 1);
    sleeve.position.set(-0.02 * side, 0.0, 0);
    pivot.add(sleeve);
    // Upper arm sleeve overlapping the deltoid — keeps the shirt flowing onto the
    // arm rather than stopping at a seam.
    const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.078, 0.1, 6, 12), mats.shirt);
    upper.position.y = -0.1;
    pivot.add(upper);
    // Forearm (skin) capsule, overlapping the sleeve above; rounded ends read as a
    // soft elbow→wrist, not a stacked cylinder.
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.068, 0.24, 6, 12), mats.skin);
    arm.position.y = -0.22;
    pivot.add(arm);
    const hand = new THREE.Group();
    hand.position.y = -0.4;
    const palm = new THREE.Mesh(new THREE.SphereGeometry(0.085, 12, 10), mats.skin);
    palm.scale.set(1, 0.95, 0.85);
    hand.add(palm);
    pivot.add(hand);
    model.add(pivot);
    // `sleeve` + `upper` are the SHIRT on the shoulder/upper arm — exposed so worn
    // plate armor can hide them (otherwise the shirt peeks out past the pauldrons).
    return { pivot, hand, sleeve, upper };
  }
  // armR holds the weapon (and drives the swing); armL holds the shield. The
  // model faces +Z and the third-person camera views it from behind, so the
  // weapon arm sits on -X to read on the right of the screen — matching the
  // first-person viewmodel, which is also on the right.
  const armL = makeArm(1), armR = makeArm(-1);

  // LEGS (hip pivot) — the two legs stand a natural shoulder-ish width apart with
  // a small gap between them (proportional to the body), so the lower body reads
  // as a standing person's legs, not two tubes fused into one. Each leg is centred
  // on its own pivot's local X so the X-centred greave/boot overlays (equipDetail)
  // still line up per leg. Pivot stays at world y=0.52 and the knee/shin/boot Y
  // bands are unchanged so every leg overlay keeps its position.
  function makeLeg(side) {
    const pivot = new THREE.Group();
    // X = thigh radius (0.092) + a small gap, so the inner edges nearly meet at
    // the hip but there's a visible parting between the legs below.
    pivot.position.set((female ? 0.10 : 0.108) * side, 0.52, 0);
    // Thigh: a capsule whose rounded TOP overlaps the pelvis above (no gap at the
    // hip) and tapers down to the knee. A touch fatter at the top than the shin.
    const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.092, 0.14, 6, 12), mats.pants);
    thigh.position.y = -0.13;
    pivot.add(thigh);
    // Knee: a small rounded mass bridging thigh and shin so the joint is soft, not
    // two cylinders abutting. Sits in the same band the greave knee-cops expect.
    const knee = new THREE.Mesh(new THREE.SphereGeometry(0.082, 12, 10), mats.pants);
    knee.scale.set(1, 0.9, 1);
    knee.position.y = -0.27;
    pivot.add(knee);
    // Shin: a capsule from the knee down toward the boot, overlapping both so the
    // whole limb reads as one continuous leg.
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.082, 0.14, 6, 12), mats.pants);
    leg.position.y = -0.36;
    pivot.add(leg);
    // The pants meshes on this leg, exposed so worn leg armor can HIDE them and
    // cover with its own layer (instead of just recolouring the pants).
    pivot.userData.pantsMeshes = [thigh, knee, leg];
    // A proper BOOT silhouette (Tibia-style) instead of one squashed blob: an
    // ankle SHAFT rising up the leg, a FOOT running forward, a rounded TOE cap and
    // a thin SOLE. All share the boots material so a worn boot recolours the whole
    // thing; overlays (wings, cuffs…) still attach to the `boot` group.
    const boot = new THREE.Group();
    boot.position.set(0, -0.42, 0.0);
    // Shaft: the vertical cuff that wraps the ankle/lower shin. It is a hair WIDER
    // than the pants shin (0.082) so it sits OVER the trouser leg, and its TOP
    // reaches into the LOWER shin — a low boot, dropped well below mid-calf.
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.09, 0.14, 12), mats.boots);
    shaft.position.set(0, -0.02, 0.0);
    boot.add(shaft);
    // Foot: the horizontal body of the boot, stretched forward toward the toe.
    // Its rounded underside is the sole now — no separate flat slab (that read as
    // a "board" sticking out under the shoe).
    const foot = new THREE.Mesh(new THREE.SphereGeometry(0.082, 10, 8), mats.boots);
    foot.scale.set(1.0, 0.85, 1.75);
    foot.position.set(0, -0.05, 0.08);
    boot.add(foot);
    // Toe: a rounded cap so the front reads as a boot tip, not a stub.
    const toe = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), mats.boots);
    toe.scale.set(0.92, 0.85, 1.0);
    toe.position.set(0, -0.055, 0.18);
    boot.add(toe);
    pivot.add(boot);
    model.add(pivot);
    return { pivot, boot, foot };
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
  let heldArrow = null; // a nocked arrow carried in the off (left) hand while walking
  // A small arrow held in the bow-user's off hand. Hidden while drawing (it
  // "loads" into the bow), shown while walking/idle so the archer always reads as
  // carrying ammo.
  function buildHeldArrow() {
    const g = new THREE.Group();
    const shaftMat = new THREE.MeshLambertMaterial({ color: 0x8a5a2b });
    const headMat = new THREE.MeshStandardMaterial({ color: 0xc4c9cf, metalness: 0.6, roughness: 0.4 });
    const fletchMat = new THREE.MeshLambertMaterial({ color: 0xe23b3b });
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.4, 5), shaftMat);
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.06, 5), headMat);
    head.position.y = 0.23;
    const fletch = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.06, 0.03), fletchMat);
    fletch.position.set(0, -0.15, 0.018);
    g.add(shaft, head, fletch);
    // Lie the arrow roughly horizontal, pointing forward, pinched IN the hand. The
    // hand group's origin is the palm, so sit the arrow right there (was y=-0.42,
    // which dropped it down by the foot).
    g.rotation.x = Math.PI / 2;
    g.position.set(0, 0.0, 0.04);
    return g;
  }
  function setWeaponPose(type, bow) {
    weaponType = type; isBow = !!bow;
    if (isBow && !heldArrow) { heldArrow = buildHeldArrow(); armL.hand.add(heldArrow); }
    else if (!isBow && heldArrow) { armL.hand.remove(heldArrow); heldArrow = null; }
  }
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
    // Breathe the WHOLE upper body as one rigid unit — torso, neck, head, both
    // shoulders, the chest-armor overlay and the helmet all rise/fall by the SAME
    // amount. Moving them together (and NOT scaling the armor) keeps the neck,
    // shoulder pads and collar locked to the chest, and stops the cuirass lifting
    // off to reveal the shirt/pants underneath as it did when only some parts moved.
    const lift = b * 0.012;
    body.position.y = 0.95 + lift;
    neck.position.y = 1.27 + lift;
    head.position.y = 1.42 + lift;
    chestArmor.position.y = 0.95 + lift;
    armL.pivot.position.y = 1.18 + lift;
    armR.pivot.position.y = 1.18 + lift;
  }

  // While mounted, the hero sits on the saddle instead of walking. Set by the
  // player when the mount system reports it's riding (see player.update).
  let seated = false;
  function setSeated(on) { seated = !!on; }

  // SLEEPING: the hero lies flat on a bed. We tip the whole model onto its back
  // (rotate the model group −90° about X so +Y becomes the bed surface), relax the
  // limbs, and let it breathe slowly. The caller positions the group on the bed.
  let sleeping = false;
  let blanket = null;   // a cover pulled over the sleeping body, "tucked in"
  function setSleeping(on) {
    sleeping = !!on;
    if (sleeping) {
      model.rotation.x = -Math.PI / 2;   // lie on the back
      // relax: arms slightly out, legs straight
      armL.pivot.rotation.set(0, 0, 0.25);
      armR.pivot.rotation.set(0, 0, -0.25);
      legL.pivot.rotation.set(0, 0, 0.04);
      legR.pivot.rotation.set(0, 0, -0.04);
      // "Arropado": a soft blanket pulled up over the legs and waist to the chest,
      // so a visitor sees the body tucked in, not just lying flat. Built once and
      // parented to the model so it lies + breathes with the body.
      if (!blanket) {
        blanket = new THREE.Mesh(
          new THREE.BoxGeometry(0.78, 1.15, 0.34),
          new THREE.MeshLambertMaterial({ color: 0x8a3b4b }));   // burgundy bedsheet
        // Cover from the feet up to mid-chest (model space: y is body height,
        // z lifts it off the mattress a touch so it reads as a raised cover).
        blanket.position.set(0, 0.62, 0.16);
        model.add(blanket);
      }
      blanket.visible = true;
    } else {
      model.rotation.x = 0;
      if (blanket) blanket.visible = false;
    }
  }

  function animate(phase, intensity, grounded, dt = 0) {
    // SLEEPING wins over everything: keep lying flat, breathe slowly, no gait.
    if (sleeping) {
      breathe(dt, true);
      return;
    }
    // SEATED (mounted) pose wins over everything: a static straddle, no gait. The
    // model faces +Z; legL sits at -X, legR at +X. rotation.x<0 swings a leg
    // FORWARD (+Z), so a small negative lifts the thighs; rotation.z splays the
    // feet OUTWARD down the mount's flanks (legL needs -z, legR needs +z). Arms
    // come forward as if holding the reins.
    if (seated) {
      breathe(dt, true);
      legL.pivot.rotation.set(-0.95, 0, -0.42);
      legR.pivot.rotation.set(-0.95, 0, 0.42);
      armL.pivot.rotation.set(-0.7, 0, 0.18);
      armR.pivot.rotation.set(-0.7, 0, -0.18);
      armL.pivot.rotation.y = 0;
      armR.pivot.rotation.y = 0;
      if (cape) { cape.rotation.x = -0.2; cape.rotation.z = 0; }
      return;
    }
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
    } else if (weaponType) {
      // Holding a melee weapon (sword/axe/mace/lance): the weapon arm rests in a
      // READY pose — bent forward and tucked in a touch so the blade is carried in
      // front of the body, not hanging flat against the leg. Off-hand swings.
      armL.pivot.rotation.set(sw, 0, 0.08);
      armR.pivot.rotation.set(-0.55 - sw * 0.25, 0, -0.18);
      armL.pivot.rotation.y = 0;
      armR.pivot.rotation.y = -0.15;
    } else {
      // Bare hands: arms swing freely with the gait.
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
      // Idle: keep the bow string relaxed so it isn't stuck drawn, and show the
      // arrow held in the off hand (it only hides while actually drawing).
      if (bowMesh && bowMesh.userData.setDraw) bowMesh.userData.setDraw(0);
      if (heldArrow) heldArrow.visible = true;
      return;
    }
    swingT = Math.max(0, swingT - dt);
    const p = 1 - swingT / swingDur; // 0..1 over the motion

    if (swingType === 'bow') {
      // Draw fast (string back to the cheek), hold a beat, then snap to release.
      // draw ramps up over the first 55%, releases sharply after.
      const draw = p < 0.55 ? p / 0.55 : Math.max(0, 1 - (p - 0.55) / 0.18);
      if (bowMesh && bowMesh.userData.setDraw) bowMesh.userData.setDraw(draw);
      // The hand-held arrow "loads" into the bow as the draw builds, so hide it
      // once the draw is underway; it reappears when the shot is released/idle.
      if (heldArrow) heldArrow.visible = draw < 0.15;
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

  // The SHIRT meshes — the ENTIRE shirt: the main torso capsule, the chest swell,
  // the hem, and both shoulder/upper-arm sleeves. Worn armor hides ALL of them so
  // its own covering layer is the only thing seen (no shirt neck/edges peeking out
  // past the cuirass). Removing armor restores them. The neck (skin) stays.
  const shirtMeshes = [body, chest, hem, armL.sleeve, armL.upper, armR.sleeve, armR.upper];
  function setBodyClothesHidden(hidden) {
    for (const m of shirtMeshes) if (m) m.visible = !hidden;
  }

  return {
    group,
    // The Game Master wears a fixed robe + cape: EquipVisuals reads this flag and
    // skips drawing any equipped armor/weapon so worn gear never shows on the GM.
    isGM: !!profile.gm,
    parts: { head, helmet, hairGroup, chestArmor, armL, armR, legL, legR, legBootL: legL.boot, legBootR: legR.boot, body, hips, isFemale: female, setBodyClothesHidden },
    mats,
    setColors,
    animate,
    setSeated,
    setSleeping,
    triggerAttack,
    updateAttack,
    attackProgress,
    setWeaponPose,
    setBowMesh,
  };
}

// ===========================================================================
// HEAD / FACE helpers. The skull is a sphere r=0.27 centred at head-local
// (0, 0.10, 0), scaled (0.92,1,0.92). surfaceZ(y)/surfaceX(y) give the front /
// side surface at a height so face features SIT on the skin (never float).
// ===========================================================================
const SK = { cy: 0.10, r: 0.27, s: 0.92 };
function surfaceZ(y, inset = 0) { const dy = y - SK.cy, k = SK.r * SK.r - dy * dy; return k > 0 ? SK.s * Math.sqrt(k) - inset : 0; }
function surfaceX(y, inset = 0) { const dy = y - SK.cy, k = SK.r * SK.r - dy * dy; return k > 0 ? SK.s * Math.sqrt(k) - inset : 0; }

// Hair HUGS the skull (part of the head, never a floating hat). The base cap is
// a sphere shell sharing the skull centre/scale, cut to a LEVEL rim high on the
// forehead so the face stays clear all the way around. Longer styles add pieces
// strictly behind the head. Everything goes in ONE group (returned) so a helmet
// can hide it with .visible = false.
function buildHair(head, style, mat) {
  const G = new THREE.Group();
  head.add(G);
  if (style === 'bald') return G;
  const CY = SK.cy;
  const add = (m) => { G.add(m); return m; };

  function cap(rimY, r = 0.285) {
    const shell = new THREE.Group();
    shell.position.set(0, CY, 0);
    shell.scale.set(0.94, 1.02, 0.94);
    const theta = Math.acos(Math.max(-1, Math.min(1, (rimY - CY) / r)));
    shell.add(new THREE.Mesh(new THREE.SphereGeometry(r, 26, 18, 0, Math.PI * 2, 0, theta), mat));
    G.add(shell);
    return shell;
  }
  const surf = (y) => surfaceZ(y);

  switch (style) {
    case 'buzz': cap(0.20, 0.278); break;
    case 'short': cap(0.20); break;
    case 'spiky': {
      cap(0.21);
      for (const [x, y, z] of [[-0.1, 0.36, 0.04], [0.1, 0.38, 0.02], [0, 0.39, -0.05], [-0.16, 0.34, -0.03], [0.16, 0.34, -0.02], [-0.05, 0.39, 0.12], [0.06, 0.38, 0.12]]) {
        const s = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.2, 6), mat);
        s.position.set(x, y, z); s.rotation.x = -z * 1.3; s.rotation.z = -x * 1.3; add(s);
      }
      break;
    }
    case 'mohawk': {
      cap(0.30, 0.278); // mostly shaved sides
      for (let i = 0; i < 7; i++) {
        const fin = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.3 - Math.abs(i - 3) * 0.03, 5), mat);
        fin.position.set(0, 0.42, 0.16 - i * 0.06); add(fin);
      }
      break;
    }
    case 'curly': {
      cap(0.16);
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        const c = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), mat);
        c.position.set(Math.cos(a) * 0.2, 0.30 + (i % 2) * 0.025, Math.sin(a) * 0.2 - 0.02); add(c);
      }
      add(new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), mat)).position.set(0, 0.36, -0.02);
      break;
    }
    case 'afro': {
      cap(0.18);
      const poof = new THREE.Mesh(new THREE.SphereGeometry(0.27, 16, 14), mat);
      poof.position.set(0, 0.30, -0.01); add(poof);
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        const c = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), mat);
        c.position.set(Math.cos(a) * 0.22, 0.29 + Math.sin(i) * 0.03, Math.sin(a) * 0.22 - 0.01); add(c);
      }
      break;
    }
    case 'emo': {
      cap(0.16);
      // A side-swept fringe lying along the forehead (above the eyes).
      const fringe = new THREE.Mesh(new THREE.SphereGeometry(0.18, 14, 12), mat);
      fringe.scale.set(1.15, 0.5, 0.55);
      fringe.position.set(0.05, 0.24, surf(0.24) - 0.02); fringe.rotation.z = 0.35; add(fringe);
      // back length to the nape
      const back = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.18, 6, 12), mat);
      back.scale.set(1, 1, 0.55); back.position.set(0, -0.02, -0.18); add(back);
      break;
    }
    case 'bun': {
      cap(0.16);
      const bun = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), mat);
      bun.position.set(0, 0.34, -0.08); add(bun);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.025, 8, 14), mat);
      ring.rotation.x = Math.PI / 2; ring.position.set(0, 0.34, -0.08); add(ring);
      break;
    }
    case 'ponytail': {
      cap(0.16);
      // Gather at the BACK of the crown, on the skull surface, then let the tail
      // hang straight DOWN the back (slightly behind the head) so it reads as one
      // connected ponytail, never a stick poking out to the side.
      const tieY = 0.24, tieZ = -surf(tieY) - 0.01;
      add(new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), mat)).position.set(0, tieY, tieZ);
      const Z = -0.22;                       // the tail falls in a plane behind the head
      // Three stacked segments flowing from the nape down the back.
      const seg = [[0.07, tieY - 0.06], [0.075, tieY - 0.2], [0.065, tieY - 0.34]];
      for (const [r, y] of seg) {
        const s = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), mat);
        s.scale.set(1, 1.25, 0.85); s.position.set(0, y, Z);
        add(s);
      }
      // Tapered tip (cone pointing down).
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.13, 8), mat);
      tip.rotation.x = Math.PI; tip.position.set(0, tieY - 0.47, Z); add(tip);
      break;
    }
    case 'pigtails': {
      cap(0.16);
      for (const side of [-1, 1]) {
        const tieY = 0.2, tx = surfaceX(tieY) * side;
        add(new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), mat)).position.set(tx, tieY, -0.03);
        const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.28, 6, 10), mat);
        tail.position.set(tx + 0.05 * side, tieY - 0.2, -0.05); tail.rotation.z = side * 0.35; add(tail);
        add(new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), mat)).position.set(tx + 0.1 * side, tieY - 0.36, -0.05);
      }
      break;
    }
    case 'long': {
      cap(0.16);
      const back = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.42, 6, 14), mat);
      back.scale.set(1, 1, 0.55); back.position.set(0, -0.06, -0.18); add(back);
      const collar = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), mat);
      collar.scale.set(1.0, 0.8, 0.7); collar.position.set(0, 0.16, -0.12); add(collar);
      break;
    }
    default: cap(0.20);
  }
  return G;
}

// EARS — small, flush to the temple, tucked back so hair covers their top.
function buildEars(head, style, mat) {
  if (style === undefined) style = 'normal';
  for (const side of [-1, 1]) {
    const y = 0.06, x = surfaceX(y) * side;
    if (style === 'elf') {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.16, 6), mat);
      ear.scale.set(0.45, 1, 0.5); ear.position.set(x - 0.01 * side, y + 0.05, -0.04); ear.rotation.z = side * -0.6;
      head.add(ear);
    } else {
      const r = style === 'big' ? 0.058 : style === 'small' ? 0.034 : 0.046;
      const ear = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), mat);
      ear.scale.set(0.45, 1, 0.62); ear.position.set(x - 0.005 * side, y, -0.02);
      head.add(ear);
    }
  }
}

// EYES — a white + dark pupil seated on the face, with per-style shaping
// (happy arcs, half-lids, wink, cute big pupils, angry slant).
function buildEyes(head, style, mats) {
  const ey = 0.115;
  for (const side of [-1, 1]) {
    const ex = 0.09 * side;
    const ez = surfaceZ(ey, 0.055) - Math.abs(ex) * Math.abs(ex) * 0.9;

    if (style === 'happy') {
      const arc = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.012, 6, 12, Math.PI), mats.eyeB);
      arc.position.set(ex, ey, ez + 0.05); arc.rotation.z = Math.PI; head.add(arc);
      continue;
    }
    if (style === 'wink' && side === 1) {
      const line = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.012, 6, 12, Math.PI), mats.eyeB);
      line.position.set(ex, ey, ez + 0.05); line.rotation.z = Math.PI; head.add(line);
      continue;
    }

    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 10), mats.eyeW);
    eye.position.set(ex, ey, ez); head.add(eye);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.024, 10, 8), mats.eyeB);
    pupil.position.set(ex, ey, ez + 0.036); head.add(pupil);

    if (style === 'cute') {
      pupil.scale.setScalar(1.3);
      const hi = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 6), mats.eyeW);
      hi.position.set(ex - 0.012 * side, ey + 0.013, ez + 0.05); head.add(hi);
    }
    if (style === 'bored' || style === 'sleepy' || style === 'angry') {
      const lid = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), mats.skin);
      lid.position.set(ex, ey + (style === 'sleepy' ? 0.012 : 0.02), ez + 0.005);
      lid.rotation.x = Math.PI;
      if (style === 'angry') lid.rotation.z = side * 0.5;
      lid.scale.set(1, style === 'bored' ? 0.6 : 0.5, 1);
      head.add(lid);
    }
  }
}

// EYEBROWS — a small bar above each eye, tinted with the hair colour.
function buildBrows(head, style, mat) {
  if (style === 'none') return;
  for (const side of [-1, 1]) {
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.017, 0.02), mat);
    let y = 0.2, rot = 0;
    if (style === 'raised') y = 0.22;
    if (style === 'angry') { rot = side * 0.45; y = 0.185; }
    if (style === 'sad') { rot = side * -0.45; y = 0.19; }
    const x = 0.085 * side;
    brow.position.set(x, y, surfaceZ(y, 0.01) - Math.abs(x) * Math.abs(x) * 0.8);
    brow.rotation.z = rot; head.add(brow);
  }
}

function buildNose(head, style, mat) {
  const y = 0.03, z = surfaceZ(y, 0);
  let geo, sx = 1, sy = 1, sz = 1, out = 0.0;
  if (style === 'round') { geo = new THREE.SphereGeometry(0.04, 8, 6); out = 0.012; }
  else if (style === 'button') { geo = new THREE.SphereGeometry(0.032, 8, 6); out = 0.01; }
  else if (style === 'wide') { geo = new THREE.SphereGeometry(0.038, 8, 6); sx = 1.4; sy = 0.7; out = 0.008; }
  else if (style === 'pointy') { geo = new THREE.ConeGeometry(0.028, 0.08, 6); out = 0.03; }
  else { geo = new THREE.SphereGeometry(0.028, 8, 6); out = 0.008; }
  const nose = new THREE.Mesh(geo, mat);
  if (style === 'pointy') nose.rotation.x = Math.PI / 2;
  nose.scale.set(sx, sy, sz);
  nose.position.set(0, y, z + out);
  head.add(nose);
}

function buildMouth(head, style, mat, eyeW) {
  const y = -0.05, z = surfaceZ(y, 0.005);
  if (style === 'neutral') {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.016, 0.02), mat); m.position.set(0, y, z); head.add(m);
  } else if (style === 'open') {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), mat); m.scale.set(1, 0.7, 0.5); m.position.set(0, y, z); head.add(m);
  } else if (style === 'grin') {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 10), mat); m.scale.set(1.3, 0.7, 0.4); m.position.set(0, y, z); head.add(m);
    const teeth = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.022, 0.02), eyeW); teeth.position.set(0, y + 0.022, z + 0.015); head.add(teeth);
  } else if (style === 'frown') {
    const m = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.017, 6, 12, Math.PI), mat); m.rotation.x = Math.PI / 2; m.position.set(0, y - 0.015, z); head.add(m);
  } else if (style === 'smirk') {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.016, 0.02), mat); m.rotation.z = 0.32; m.position.set(0, y, z); head.add(m);
  } else {
    // Smile: a half-ring facing the camera (in the X-Y plane) opening UPWARD, so
    // it reads as a clear upturned curve. Thicker and a touch wider than before.
    const m = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.014, 8, 20, Math.PI), mat);
    m.rotation.z = Math.PI;            // half-ring opens upward (smile)
    m.position.set(0, y + 0.012, surfaceZ(y, -0.005));
    head.add(m);
  }
}

export { HAIR_STYLES, NOSE_STYLES, MOUTH_STYLES, EYE_STYLES, BROW_STYLES, EAR_STYLES };
