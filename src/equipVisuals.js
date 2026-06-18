import * as THREE from 'three';
import { wandColorForLevel } from './data/items.js';
import { HELMET_BUILDERS, ARMOR_BUILDERS, LEGS_BUILDERS, AMULET_BUILDERS, setEquipHelpers } from './equipDetail.js';

// Weapon types that, when placed in the OFF-HAND (shield) slot, render as a
// weapon held in the left hand (mirrored) instead of a shield.
const OFFHAND_WEAPON_TYPES = new Set(['sword', 'axe', 'mace', 'lance', 'bow', 'wand']);

// Builds and attaches visible weapons, shield and worn armor onto a character.
// Anchors come from character.parts (armR.hand, helmet, chestArmor, body...).
export class EquipVisuals {
  constructor(char) {
    this.char = char;
    this.weaponMesh = null;
    this.shieldMesh = null;
    this.helmetMesh = null;
    this.bagMesh = null;
    this.armorMesh = null;   // worn chest/shoulder overlay (plate-tier armor)
    this.amuletMesh = null;  // pendant on the neck
    this.weaponType = null; // drives the per-weapon hold pose and attack motion
    this.armorTintActive = false;
    this._origColors = {
      shirt: char.mats.shirt.color.clone(),
      pants: char.mats.pants.color.clone(),
    };
  }

  refresh(equip, level) {
    // The Game Master always wears its fixed robe + cape. Strip any worn gear so
    // equipping items never changes how the GM looks (just the stats apply).
    if (this.char.isGM) { this._clearAll(); return; }
    this.setWeapon(equip.weapon, level);
    // Off-hand: an archer holds a quiver of arrows (no shield); everyone else
    // shows the equipped shield, if any. The quiver's look scales with its tier
    // (equipped quiver item drives colour/arrow count); fall back to a plain
    // quiver when a bow is held with no quiver equipped.
    const isBow = equip.weapon && equip.weapon.type === 'bow';
    const quiver = equip.quiver
      ? { arrows: true, color: equip.quiver.color, levelReq: equip.quiver.levelReq || 1 }
      : { arrows: true };
    this.setOffhand(isBow ? quiver : equip.shield, level);
    this.setHelmet(equip.helmet);
    this.setArmor(equip.armor);
    this.setLegs(equip.legs);
    this.setBoots(equip.boots);
    this.setBag(equip.bag);
    this.setAmulet(equip.amulet);
    // Tell the character which weapon it's holding so its idle/attack poses fit.
    if (this.char.setWeaponPose) this.char.setWeaponPose(this.weaponType, !!isBow);
  }

  // A bag or backpack worn on the back, so it shows in third person. A small bag
  // (low capacity) reads as a soft pouch; a backpack is the full framed pack.
  // The colour always matches the equipped container (purple backpack -> purple
  // pack on the back, brown bag -> brown pouch).
  setBag(item) {
    if (this.bagMesh) { this.char.parts.body.remove(this.bagMesh); disposeTree(this.bagMesh); this.bagMesh = null; }
    if (!item) return;
    const color = item.color || 0x8a5a2b;
    const id = item.baseId || '';
    const isBackpack = /backpack|pack_/.test(id) || (item.capacity || 0) > 8;
    // A "star" bag (special/event container) gets a glowing star decal on the
    // flap; detected by id or an explicit flag from the data layer.
    const star = item.star || /star/.test(id);
    this.bagMesh = isBackpack ? buildBackpackMesh(color, { star }) : buildBagMesh(color, { star });
    this.char.parts.body.add(this.bagMesh);
  }

  // A pendant hung at the base of the neck, tinted to the amulet's gem colour.
  setAmulet(item) {
    if (this.amuletMesh) { this.char.parts.chestArmor.remove(this.amuletMesh); disposeTree(this.amuletMesh); this.amuletMesh = null; }
    if (!item) return;
    const detail = AMULET_BUILDERS[item.baseId];
    this.amuletMesh = detail ? detail(item.color || 0xf1c40f) : buildAmuletMesh(item.color || 0xf1c40f);
    this.char.parts.chestArmor.add(this.amuletMesh);
  }

  setWeapon(item, level) {
    if (this.weaponMesh) { this.char.parts.armR.hand.remove(this.weaponMesh); disposeTree(this.weaponMesh); this.weaponMesh = null; }
    this.weaponType = item ? item.type : null;
    if (!item) { if (this.char.setBowMesh) this.char.setBowMesh(null); return; }
    // A SHIELD may be carried in the main (right) hand too — render it as a shield
    // here instead of a weapon, mirrored so its face reads correctly on the right.
    if (item.type === 'shield') {
      this.weaponMesh = buildShieldMesh(item.color || 0x8a5a2b, item.baseId || '', { element: item.element, levelReq: item.levelReq || 1 });
      this.weaponMesh.scale.x *= -1;
      this.char.parts.armR.hand.add(this.weaponMesh);
      if (this.char.setBowMesh) this.char.setBowMesh(null);
      return;
    }
    const color = item.type === 'wand' ? wandColorForLevel(level) : (item.color || 0xb0b0b0);
    this.weaponMesh = buildWeaponMesh(item.type, color, {
      id: item.baseId, element: item.element, levelReq: item.levelReq || 1, twoHanded: item.twoHanded,
    });
    // Seat the grip in the palm and tilt the weapon so it reads as held in the
    // fist (blade/head leading up-and-forward), not impaling the forearm.
    applyHoldTransform(this.weaponMesh, item.type, item.baseId || '');
    // The MAIN (right) hand mirrors across X so a diagonal blade leads outward
    // naturally; the OFF-hand (left) keeps the un-mirrored pose. A straight,
    // X-symmetric weapon (wand/spear/bow) is unaffected by the flip.
    this.weaponMesh.scale.x *= -1;
    this.char.parts.armR.hand.add(this.weaponMesh);
    // Hand the bow's string/arrow control to the character so the draw animation
    // can tension the string and slide the loaded arrow in third person.
    if (this.char.setBowMesh) this.char.setBowMesh(item.type === 'bow' ? this.weaponMesh : null);
  }

  // The left hand: a shield, a held WEAPON (off-hand blade/wand/etc.), a bunch of
  // arrows (for archers), or nothing.
  setOffhand(item, level) {
    if (this.shieldMesh) { this.char.parts.armL.hand.remove(this.shieldMesh); disposeTree(this.shieldMesh); this.shieldMesh = null; }
    if (!item) return;
    const isWeapon = item.type === 'weapon' || OFFHAND_WEAPON_TYPES.has(item.type);
    if (item.arrows) {
      this.shieldMesh = buildArrowsMesh(item.color, item.levelReq || 1);
    } else if (isWeapon) {
      // A weapon held in the LEFT (off) hand — same build + hold pose as the main
      // hand but NOT mirrored, so the blade leads outward to the left. The mirror
      // lives on the main hand now (see setWeapon), so off-hand stays un-flipped.
      const color = item.type === 'wand' ? wandColorForLevel(level) : (item.color || 0xb0b0b0);
      this.shieldMesh = buildWeaponMesh(item.type, color, {
        id: item.baseId, element: item.element, levelReq: item.levelReq || 1, twoHanded: item.twoHanded,
      });
      applyHoldTransform(this.shieldMesh, item.type, item.baseId || '');
    } else {
      this.shieldMesh = buildShieldMesh(item.color || 0x8a5a2b, item.baseId || '', { element: item.element, levelReq: item.levelReq || 1 });
    }
    this.char.parts.armL.hand.add(this.shieldMesh);
  }

  // Kept for callers that still set a shield directly.
  setShield(item) { this.setOffhand(item); }

  setHelmet(item) {
    if (this.helmetMesh) { this.char.parts.helmet.remove(this.helmetMesh); disposeTree(this.helmetMesh); this.helmetMesh = null; }
    // A worn helmet hides the hair (covered by the casco); removing it shows it.
    if (this.char.parts.hairGroup) this.char.parts.hairGroup.visible = !item;
    if (!item) return;
    // Prefer the detailed per-item helmet (real cascos with crests/visors/horns);
    // fall back to the generic style builder for any id without a bespoke design.
    const detail = HELMET_BUILDERS[item.baseId];
    this.helmetMesh = detail ? detail(item.color || 0x9aa0a6)
      : buildHelmetMesh(item.color || 0x9aa0a6, headgearStyle(item));
    this.char.parts.helmet.add(this.helmetMesh);
  }

  // Armor changes the shirt colour so the body reads as wearing it, and — for
  // metal/plate-tier pieces — adds a worn overlay (pauldrons + breastplate) so
  // heavy armor visibly changes the silhouette, not just the tint. Soft armor
  // (cloth, leather, robes) stays as a recolour to keep the rounded look light.
  setArmor(item) {
    if (this.armorMesh) { this.char.parts.chestArmor.remove(this.armorMesh); disposeTree(this.armorMesh); this.armorMesh = null; }
    if (!item) {
      this.char.mats.shirt.color.copy(this._origColors.shirt);
      return;
    }
    const color = item.color || 0x9aa0a6;
    this.char.mats.shirt.color.set(color);
    // Prefer the detailed per-item breastplate; fall back to the generic plate
    // overlay for plate-tier items, and nothing (tint only) for soft cloth.
    const detail = ARMOR_BUILDERS[item.baseId];
    const female = !!this.char.parts.isFemale;
    if (detail) {
      this.armorMesh = detail(color);
      // The detailed builders are authored for the male torso/shoulder width.
      // The female trunk is narrower (body scale ~0.95x, shoulders pulled in),
      // so squeeze the whole overlay slightly in X/Z and drop it a touch so the
      // breastplate hugs the chest and the pauldrons sit on the shoulders rather
      // than floating off them. Y is left alone so collars/halos stay placed.
      if (female) { this.armorMesh.scale.set(0.9, 0.97, 0.94); this.armorMesh.position.y = -0.01; }
      this.char.parts.chestArmor.add(this.armorMesh);
    } else if (isPlateArmor(item)) {
      this.armorMesh = buildArmorMesh(color, female);
      this.char.parts.chestArmor.add(this.armorMesh);
    }
  }

  setLegs(item) {
    // Clear any previous leg overlays from both thighs.
    for (const lg of [this.char.parts.legL, this.char.parts.legR]) {
      if (lg.pivot.userData.overlay) { lg.pivot.remove(lg.pivot.userData.overlay); disposeTree(lg.pivot.userData.overlay); lg.pivot.userData.overlay = null; }
    }
    if (item) this.char.mats.pants.color.set(item.color || 0x6a6f74);
    else { this.char.mats.pants.color.copy(this._origColors.pants); return; }
    // Detailed greaves/knee-cops per item, mirrored onto both thighs.
    const detail = LEGS_BUILDERS[item.baseId];
    if (detail) {
      for (const lg of [this.char.parts.legL, this.char.parts.legR]) {
        const ov = detail(item.color || 0x6a6f74);
        lg.pivot.add(ov); lg.pivot.userData.overlay = ov;
      }
    }
  }

  setBoots(item) {
    // Clear any previous boot overlays from both feet.
    for (const b of [this.char.parts.legBootL, this.char.parts.legBootR]) {
      if (b.userData.overlay) { b.remove(b.userData.overlay); disposeTree(b.userData.overlay); b.userData.overlay = null; }
    }
    const c = item ? (item.color || 0x4a3526) : 0x4a3526;
    this.char.mats.boots.color.set(c);
    if (!item) return;
    // Detailed boots (wings, plate cuffs, dragon scales…) get a per-foot overlay
    // so e.g. winged boots actually show wings. Left foot mirrors the right.
    for (const side of [-1, 1]) {
      const foot = side < 0 ? this.char.parts.legBootL : this.char.parts.legBootR;
      const ov = buildBootOverlay(item.baseId || '', c, side);
      if (ov) { foot.add(ov); foot.userData.overlay = ov; }
    }
  }

  // Call when the player changes their base clothing colors in creation.
  setBaseColors(colors) {
    this._origColors.shirt.set(colors.shirt);
    this._origColors.pants.set(colors.pants);
  }

  // Remove every worn mesh (weapon, off-hand, helmet, armor overlay, bag,
  // amulet) without touching the character's base clothing colors. Used for the
  // Game Master, whose fixed robe/cape must never change when gear is equipped.
  _clearAll() {
    if (this.weaponMesh) { this.char.parts.armR.hand.remove(this.weaponMesh); disposeTree(this.weaponMesh); this.weaponMesh = null; }
    if (this.shieldMesh) { this.char.parts.armL.hand.remove(this.shieldMesh); disposeTree(this.shieldMesh); this.shieldMesh = null; }
    if (this.helmetMesh) { this.char.parts.helmet.remove(this.helmetMesh); disposeTree(this.helmetMesh); this.helmetMesh = null; }
    if (this.armorMesh) { this.char.parts.chestArmor.remove(this.armorMesh); disposeTree(this.armorMesh); this.armorMesh = null; }
    if (this.bagMesh) { this.char.parts.body.remove(this.bagMesh); disposeTree(this.bagMesh); this.bagMesh = null; }
    if (this.amuletMesh) { this.char.parts.chestArmor.remove(this.amuletMesh); disposeTree(this.amuletMesh); this.amuletMesh = null; }
    this.weaponType = null;
    if (this.char.setWeaponPose) this.char.setWeaponPose(null, false);
    if (this.char.setBowMesh) this.char.setBowMesh(null);
  }

  triggerSwing() { this.char.triggerAttack(this.weaponType); }
}

function mat(color) { return new THREE.MeshLambertMaterial({ color }); }
function metalMat(color) { return new THREE.MeshStandardMaterial({ color, metalness: 0.85, roughness: 0.35 }); }
// Hand the shared material helpers to the detailed equipment builders.
setEquipHelpers({ mat, metalMat, shade });

// A single arrow lying along +Y, nocked end at the bottom. Reused by the bow's
// loaded arrow and by the flying projectile. Origin sits at the shaft center.
export function buildArrowMesh(len = 0.72) {
  const g = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, len, 6), mat(0x7a4a22));
  g.add(shaft);
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.1, 6), metalMat(0xcfd4da));
  head.position.y = len / 2 + 0.045;
  g.add(head);
  // Three fletches around the nock end, splayed like real feathers.
  for (let i = 0; i < 3; i++) {
    const f = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.1, 0.05), mat(0xe23b3b));
    f.position.set(0, -len / 2 + 0.07, 0);
    f.rotation.y = (i / 3) * Math.PI * 2;
    f.translateZ(0.028);
    g.add(f);
  }
  const nock = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.02, 6), mat(0x3a2414));
  nock.position.y = -len / 2;
  g.add(nock);
  return g;
}

// baseId → bow profile. Crossbow ids are split off earlier via CROSSBOW_IDS, so
// only hand-drawn bows reach here.
const BOW_PROFILES = {
  training_bow: 'shortbow', wooden_bow: 'shortbow', short_bow: 'shortbow',
  long_bow: 'longbow', hunter_bow: 'longbow', recurve_bow: 'recurve',
  composite_bow: 'composite', elven_bow: 'elven', frost_bow: 'recurve',
  flame_bow: 'recurve', storm_bow: 'recurve', dragon_bow: 'composite',
  phoenix_bow: 'composite', hardened_bow: 'composite', recon_bow: 'longbow',
  venom_bow: 'elven', eternal_bow: 'recurve', genesis_bow: 'elven',
};

// Per-profile limb shape. Each returns the half-height H (string runs to ±H),
// the limb belly (forward bulge), and the CatmullRom control points for ONE
// limb (the +Y side; the -Y limb mirrors it). The tips MUST land at (0,±H,0.01)
// so the string built from topTip/botTip stays on the wood — the setDraw
// contract only depends on topTip.z and the nock point and is unchanged.
function bowProfileShape(profile) {
  if (profile === 'shortbow') {
    return { H: 0.34, belly: 0.10, thickness: 0.015, pts: (s, H, b) => [
      new THREE.Vector3(0, s * 0.04, 0),
      new THREE.Vector3(0, s * 0.16, b * 0.85),
      new THREE.Vector3(0, s * 0.28, b),
      new THREE.Vector3(0, s * (H - 0.02), 0.04),
      new THREE.Vector3(0, s * H, 0.01),
    ] };
  }
  if (profile === 'recurve') {
    // The tip flicks back toward the belly for a recurved silhouette.
    return { H: 0.44, belly: 0.13, thickness: 0.016, horns: true, pts: (s, H, b) => [
      new THREE.Vector3(0, s * 0.04, 0),
      new THREE.Vector3(0, s * 0.22, b * 0.85),
      new THREE.Vector3(0, s * 0.38, b),
      new THREE.Vector3(0, s * (H - 0.04), 0.05),
      new THREE.Vector3(0, s * (H - 0.01), 0.0),    // curls forward
      new THREE.Vector3(0, s * H, 0.01),            // tip (nock kicks back to belly side)
    ] };
  }
  if (profile === 'composite') {
    return { H: 0.45, belly: 0.12, thickness: 0.022, siyah: true, pts: (s, H, b) => [
      new THREE.Vector3(0, s * 0.04, 0),
      new THREE.Vector3(0, s * 0.22, b * 0.85),
      new THREE.Vector3(0, s * 0.40, b),
      new THREE.Vector3(0, s * (H - 0.02), 0.05),
      new THREE.Vector3(0, s * H, 0.01),
    ] };
  }
  if (profile === 'elven') {
    return { H: 0.5, belly: 0.10, thickness: 0.011, leaf: true, pts: (s, H, b) => [
      new THREE.Vector3(0, s * 0.04, 0),
      new THREE.Vector3(0, s * 0.24, b * 0.85),
      new THREE.Vector3(0, s * 0.42, b),
      new THREE.Vector3(0, s * (H - 0.02), 0.05),
      new THREE.Vector3(0, s * H, 0.01),
    ] };
  }
  // DEFAULT 'longbow' — the original smooth single-curve limb.
  return { H: 0.46, belly: 0.12, thickness: 0.016, pts: (s, H, b) => [
    new THREE.Vector3(0, s * 0.04, 0),
    new THREE.Vector3(0, s * 0.22, b * 0.85),
    new THREE.Vector3(0, s * 0.40, b),
    new THREE.Vector3(0, s * (H - 0.02), 0.05),
    new THREE.Vector3(0, s * H, 0.01),
  ] };
}

// A vertical bow standing in the X/Y plane with the limbs bowing FORWARD (+Z,
// the aim side); the grip sits at the origin so it attaches naturally to the
// hand. The limbs and the string anchors are built from the SAME tip vectors so
// the string always lands on the wood. Returns the group with userData.setDraw
// (string + loaded arrow) and userData.arrow for the draw animation.
export function buildBowMesh(color, frontFacing = false) {
  return buildBowProfile('longbow', color, frontFacing, elementStyle('none'), 'plain');
}

// Build a bow for the given profile. The string/draw/arrow/frontFacing contract
// is identical across profiles — only the limb curve, height and ornament vary.
function buildBowProfile(profile, color, frontFacing, style, tier) {
  const g = new THREE.Group();
  const wood = mat(color || 0x7a5230);
  const shape = bowProfileShape(profile);

  // The limb tips: top and bottom ends of the bow, pushed forward (+Z) so the
  // bow bellies toward the aim side. The grip plane sits at z=0; the belly of
  // each limb bulges out before recurving back in toward the tip. The string
  // runs flat between the tips on the archer's side.
  const H = shape.H;                           // half height (grip to tip along Y)
  const belly = shape.belly;                   // how far the limb bows forward (+Z)
  const topTip = new THREE.Vector3(0, H, 0.01);
  const botTip = new THREE.Vector3(0, -H, 0.01);

  // Each limb is a smooth tube: grip -> forward belly -> back to the tip. Built
  // per side so the two limbs are exact mirror images meeting at the grip.
  for (const s of [1, -1]) {
    const curve = new THREE.CatmullRomCurve3(shape.pts(s, H, belly));
    const limb = new THREE.Mesh(new THREE.TubeGeometry(curve, 18, shape.thickness, 6, false), wood);
    g.add(limb);
    if (style.element !== 'none' && limb.material.emissive) {
      limb.material.emissive.setHex(style.emissive); limb.material.emissiveIntensity = 0.2;
    }
    // A small horn/nock at each tip the string seats into.
    const horn = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 5), mat(0x2a1a10));
    horn.position.copy(s > 0 ? topTip : botTip);
    g.add(horn);
    // Composite bows get a reinforced siyah box at each tip.
    if (shape.siyah) {
      const siyah = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.08, 0.02), mat(shade(color || 0x7a5230, 0.7)));
      siyah.position.copy(s > 0 ? topTip : botTip); siyah.position.y -= s * 0.04;
      g.add(siyah);
      // A thin two-tone overlay laminate strip down the limb.
      const lam = new THREE.Mesh(new THREE.TubeGeometry(curve, 18, shape.thickness * 0.6, 6, false), mat(shade(color || 0x7a5230, 0.7)));
      lam.position.z = 0.004;
      g.add(lam);
    }
    // Elven bows get a small leaf-shaped tip cap.
    if (shape.leaf) {
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.06, 4), mat(shade(color || 0x8fdc7a, 1.1)));
      leaf.position.copy(s > 0 ? topTip : botTip); leaf.rotation.x = s > 0 ? 0 : Math.PI;
      g.add(leaf);
    }
  }

  // Thick leather-wrapped grip in the middle. Elven bows get a slim filigree ring.
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.2, 8), mat(0x3a2414));
  g.add(grip);
  if (shape.leaf) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.008, 6, 14), metalMat(0xd9c46a));
    ring.rotation.y = Math.PI / 2; ring.position.set(0, 0.05, 0);
    g.add(ring);
  }
  // Riser shelf (where the arrow rests) sticking toward the archer side a touch.
  const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.028, 0.05), mat(0x2a1a10));
  shelf.position.set(0.03, 0, 0.0);
  g.add(shelf);

  // Bowstring: two segments meeting at the nock point so it can be drawn back.
  // Water bows glow with a pale-blue string.
  const strMat = new THREE.MeshBasicMaterial({ color: style.element === 'water' ? 0x8fe3ff : 0xf0ece0 });
  const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 1, 3), strMat);
  const lower = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 1, 3), strMat);
  const nockPoint = new THREE.Group(); // moves toward -Z (toward archer) when drawing
  g.add(upper, lower, nockPoint);

  // A loaded arrow, rendered only while aiming/drawing; rests on the shelf
  // pointing forward (+Z is the bow's aim direction within its own space).
  const arrow = buildArrowMesh(0.7);
  arrow.rotation.x = Math.PI / 2;       // head (+Y) → +Z so it points down the aim, away from the archer
  arrow.visible = false;
  g.add(arrow);

  function setDraw(draw) {
    // draw: 0 = relaxed (string resting on the tips' plane), 1 = fully pulled.
    const restZ = topTip.z;             // string sits just on the archer side of the tips
    const nz = restZ - draw * 0.4;      // nock pulled toward the archer (-Z)
    nockPoint.position.set(0, 0, nz);
    placeString(upper, topTip, nockPoint.position);
    placeString(lower, botTip, nockPoint.position);
    if (draw > 0.01) {
      arrow.visible = true;
      // The arrow's center is offset so its nock sits at the string; it slides
      // back with the string as you draw (arrow length 0.7, center at +0.35).
      arrow.position.set(0.03, 0, nz + 0.35);
    } else {
      arrow.visible = false;
    }
  }
  setDraw(0);
  g.userData.setDraw = setDraw;
  g.userData.arrow = arrow;
  // Element accent: a small flame/frost/leaf cluster at the upper tip and a faint
  // coloured glow, so an elemental bow reads at a glance (built BEFORE the yaw so
  // it sits with the limbs; the yaw carries it along).
  if (style.element !== 'none') {
    const accentMat = new THREE.MeshStandardMaterial({ color: style.accent, emissive: style.emissive, emissiveIntensity: 0.6, roughness: 0.3 });
    const geo = style.element === 'water' ? new THREE.TetrahedronGeometry(0.025) : new THREE.ConeGeometry(0.018, 0.07, 4);
    for (const tipY of [H, -H]) {
      const a = new THREE.Mesh(geo, accentMat);
      a.position.set(0, tipY, 0.02);
      g.add(a);
    }
    if (style.glow > 0) {
      const light = new THREE.PointLight(style.emissive, 0.6, 1.0);
      g.add(light);
    }
  }
  // Third person: yaw so the bow's aim (+Z) points down the hand's reach. First
  // person: leave aim along +Z so the viewmodel can point it into the screen.
  if (!frontFacing) g.rotation.y = -Math.PI / 2;
  return g;
}

// A crossbow: a horizontal stock/tiller running along the aim axis (+Z) with a
// short bow (prod) mounted ACROSS the front, a string, a loaded bolt in the
// groove and a trigger/grip below. Same +Z = aim convention and the same
// userData.setDraw contract as the bow, but with a SHORT power stroke and a
// short bolt (crossbow bolts are stubby). The grip sits near the origin so it
// attaches naturally to the hand.
export function buildCrossbowMesh(color, frontFacing = false) {
  const g = new THREE.Group();
  const woodC = 0x5c3d22;
  const wood = mat(woodC);
  const steel = metalMat(color || 0xb0b4ba);

  // Stock/tiller: a long box from the grip (-Z, archer side) forward to the prod.
  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.62), wood);
  stock.position.set(0, 0, 0.16);
  g.add(stock);
  // Groove rail on top where the bolt lies.
  const rail = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.022, 0.5), mat(0x3a2414));
  rail.position.set(0, 0.035, 0.2);
  g.add(rail);

  // The prod (bow limbs) mounted across the front, spanning X. A flattened arc.
  const proW = 0.34;                     // half span of the prod along X
  const proZ = 0.42;                     // how far forward the prod sits
  const leftTip = new THREE.Vector3(-proW, 0.02, proZ);
  const rightTip = new THREE.Vector3(proW, 0.02, proZ);
  const prodCurve = new THREE.CatmullRomCurve3([
    leftTip,
    new THREE.Vector3(-proW * 0.5, 0.02, proZ - 0.05),
    new THREE.Vector3(0, 0.02, proZ - 0.07),    // center, swept slightly back
    new THREE.Vector3(proW * 0.5, 0.02, proZ - 0.05),
    rightTip,
  ]);
  const prod = new THREE.Mesh(new THREE.TubeGeometry(prodCurve, 18, 0.016, 6, false), steel);
  g.add(prod);
  // Little cap where the prod bolts onto the stock.
  const lath = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.06, 0.06), wood);
  lath.position.set(0, 0.01, proZ - 0.05);
  g.add(lath);

  // Trigger guard / grip hanging below the stock near the archer end.
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.024, 0.16, 8), mat(0x3a2414));
  grip.rotation.x = 0.35;
  grip.position.set(0, -0.1, -0.04);
  g.add(grip);
  const trigger = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.05, 0.014), metalMat(0x9aa0a6));
  trigger.position.set(0, -0.04, 0.02);
  g.add(trigger);

  // Bowstring across the prod tips, meeting at a nock that latches by the trigger
  // when spanned. Short power stroke: it only pulls back a little.
  const strMat = new THREE.MeshBasicMaterial({ color: 0xf0ece0 });
  const left = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 1, 3), strMat);
  const right = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 1, 3), strMat);
  const nockPoint = new THREE.Group();
  g.add(left, right, nockPoint);

  // A stubby bolt sitting in the groove, pointing forward (+Z).
  const bolt = buildArrowMesh(0.34);
  bolt.rotation.x = Math.PI / 2;         // head (+Y) → +Z so it points down the aim, away from the archer
  bolt.visible = false;
  g.add(bolt);

  function setDraw(draw) {
    // Crossbows have a SHORT power stroke: the string only travels a little, and
    // the bolt is already spanned. draw 0 = string forward at the prod's rest,
    // 1 = string latched back at the trigger (a few cm).
    const restZ = proZ - 0.07;           // string rests near the prod center
    const back = restZ - draw * 0.14;    // short pull toward the archer (-Z)
    nockPoint.position.set(0, 0.02, back);
    placeString(left, leftTip, nockPoint.position);
    placeString(right, rightTip, nockPoint.position);
    if (draw > 0.01) {
      bolt.visible = true;
      // Bolt rides the groove; its nock sits at the string (bolt center at +0.17).
      bolt.position.set(0, 0.045, back + 0.17);
    } else {
      bolt.visible = false;
    }
  }
  setDraw(0);
  g.userData.setDraw = setDraw;
  g.userData.arrow = bolt;
  if (!frontFacing) g.rotation.y = -Math.PI / 2; // third person presents aim down the reach; FP keeps +Z
  return g;
}

// Ids that should render as a crossbow rather than a hand-drawn bow. They all
// share item.type === 'bow', so the visual is chosen by id instead.
const CROSSBOW_IDS = /crossbow|arbalest|ballista/;

// Stretch a thin cylinder between two local points (used for bowstring halves).
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _mid = new THREE.Vector3();
function placeString(mesh, from, to) {
  _a.copy(from); _b.copy(to);
  _mid.addVectors(_a, _b).multiplyScalar(0.5);
  mesh.position.copy(_mid);
  const dir = _b.clone().sub(_a);
  const len = dir.length() || 0.0001;
  mesh.scale.set(1, len, 1);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
}

// ---------------------------------------------------------------------------
// Element + tier styling. Every weapon/shield carries an `element`
// ('none'|'fire'|'water'|'plant') and a `levelReq`. Element drives an emissive
// blade/head tint + a small accent decoration + a faint glow; level drives how
// much ornamentation (gold trim, gems, wings) gets layered on as a post-pass.
// ---------------------------------------------------------------------------
const ELEMENT_TINT = {
  none:  { emissive: 0x000000, accent: 0xc8a24a, glow: 0 },   // gold trim, no glow
  fire:  { emissive: 0xff4015, accent: 0xff7a2a, glow: 0.9 },
  water: { emissive: 0x2aa6ff, accent: 0x8fe3ff, glow: 0.8 },
  plant: { emissive: 0x39d35a, accent: 0x7cc24a, glow: 0.7 },
};
function elementStyle(element) {
  const s = ELEMENT_TINT[element] || ELEMENT_TINT.none;
  return { ...s, element: ELEMENT_TINT[element] ? element : 'none' };
}

function tierLevel(levelReq) {
  if (levelReq >= 90) return 'legendary'; // demon/celestial/excalibur/worldsplitter
  if (levelReq >= 35) return 'epic';      // elemental & up
  if (levelReq >= 20) return 'fine';      // broadsword/knight/great_axe
  return 'plain';
}

// Tint a metal material's emissive to the element colour. Applied to blade/head
// meshes so an elemental weapon glows along its edge.
function tintEmissive(mesh, style, intensity = 0.35) {
  if (style.element === 'none') return mesh;
  const m = mesh.material;
  if (m && m.emissive) { m.emissive.setHex(style.emissive); m.emissiveIntensity = intensity; }
  return mesh;
}

// A small element flourish near the business end of the weapon. `anchor` is the
// y around which to fan the accent (blade spine for swords, the head/bit for
// axes, the gem for wands). Pure Three.js primitives, kept cheap.
function applyElementAccent(g, style, anchor = 0.4) {
  if (style.element === 'none') return;
  const accentMat = () => new THREE.MeshStandardMaterial({
    color: style.accent, emissive: style.emissive, emissiveIntensity: 0.6, roughness: 0.3,
  });
  if (style.element === 'fire') {
    // Flame fins licking up the spine.
    for (let i = 0; i < 3; i++) {
      const fin = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.08, 4), accentMat());
      fin.position.set(0.012, anchor - 0.12 + i * 0.12, 0.012);
      fin.rotation.z = -0.25;
      g.add(fin);
    }
  } else if (style.element === 'water') {
    // Angular frost shards clustered near the guard end of the blade.
    for (let i = 0; i < 2; i++) {
      const shard = new THREE.Mesh(new THREE.TetrahedronGeometry(0.03), accentMat());
      shard.position.set(i === 0 ? 0.04 : -0.04, anchor - 0.16, 0.01);
      shard.rotation.set(0.5, i, 0.3);
      g.add(shard);
    }
  } else if (style.element === 'plant') {
    // A vine wrap with a couple of tiny leaves.
    const vine = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.008, 6, 12), accentMat());
    vine.rotation.x = Math.PI / 2;
    vine.position.y = anchor - 0.2;
    g.add(vine);
    for (let i = 0; i < 2; i++) {
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.05, 4), accentMat());
      leaf.position.set(i === 0 ? 0.035 : -0.035, anchor - 0.2, 0.01);
      leaf.rotation.z = i === 0 ? -0.9 : 0.9;
      g.add(leaf);
    }
  }
  // A faint coloured light near the working end for elemental weapons.
  if (style.glow > 0) {
    const light = new THREE.PointLight(style.emissive, 0.6, 0.9);
    light.position.y = anchor;
    g.add(light);
  }
}

// Post-pass that layers tier ornamentation onto a finished profile. `gripTop`
// marks where the grip meets the guard (gem-pommel placement reference).
function addTierTrim(g, tier, style, opts = {}) {
  const gold = () => metalMat(style.element === 'none' ? style.accent : 0xc8a24a);
  if (tier === 'plain') return;
  // fine+: a small pommel gem and gold guard accent.
  if (opts.pommelY != null) {
    const gem = new THREE.Mesh(new THREE.IcosahedronGeometry(0.024, 0),
      new THREE.MeshStandardMaterial({ color: style.accent, emissive: style.emissive, emissiveIntensity: style.element === 'none' ? 0.15 : 0.5, roughness: 0.3 }));
    gem.position.y = opts.pommelY;
    gem.position.z = 0.012;
    g.add(gem);
  }
  if (tier === 'legendary') {
    // Winged ornament + a brighter glow for the very top tier.
    if (opts.guardY != null) {
      for (const s of [-1, 1]) {
        const wing = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.1, 4), gold());
        wing.position.set(s * (opts.guardHalf || 0.13), opts.guardY + 0.03, 0);
        wing.rotation.z = s > 0 ? -0.7 : 0.7;
        g.add(wing);
      }
    }
    // Floating energy runes drifting up alongside the blade (the "wow" detail).
    const runeCol = style.element === 'none' ? 0xb8a0ff : style.emissive;
    const runeMat = new THREE.MeshStandardMaterial({ color: runeCol, emissive: runeCol, emissiveIntensity: 0.9, roughness: 0.2 });
    const baseY = opts.glowY != null ? opts.glowY : 0.4;
    const runes = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      const s = i % 2 ? 1 : -1;
      const rune = new THREE.Mesh(new THREE.OctahedronGeometry(0.014, 0), runeMat);
      rune.position.set(s * 0.07, baseY - 0.1 + i * 0.12, 0.02);
      runes.add(rune);
    }
    g.add(runes);
    g.userData.runes = runes;   // can be animated to bob/orbit in previews
    // a brighter pommel gem on top of the fine-tier one
    if (opts.pommelY != null) {
      const big = new THREE.Mesh(new THREE.IcosahedronGeometry(0.03, 0),
        new THREE.MeshStandardMaterial({ color: style.accent, emissive: style.element === 'none' ? runeCol : style.emissive, emissiveIntensity: 0.8, roughness: 0.2 }));
      big.position.set(0, opts.pommelY, 0.014);
      g.add(big);
    }
    const glow = new THREE.PointLight(style.element === 'none' ? 0xfff0c0 : style.emissive, 1.3, 1.3);
    glow.position.y = baseY;
    g.add(glow);
  }
}

// opts.id (the item's baseId) selects a per-weapon profile so a dagger, rapier,
// sabre, broadsword, katana and greatsword read as distinct shapes. opts.element
// and opts.levelReq drive tint + ornamentation. All other callers can omit opts
// safely — an unknown/absent id falls back to the type's default profile, which
// reproduces the original arming-sword / single-bit-axe / longbow / wand look.
export function buildWeaponMesh(type, color, opts = {}) {
  const id = opts.id || '';
  const style = elementStyle(opts.element || 'none');
  const tier = tierLevel(opts.levelReq || 1);

  if (type === 'bow') {
    if (opts.crossbow || CROSSBOW_IDS.test(id)) return buildCrossbowMesh(color, opts.frontFacing);
    const profile = BOW_PROFILES[id] || 'longbow';
    return buildBowProfile(profile, color, opts.frontFacing, style, tier);
  }
  if (type === 'wand') return buildWandMesh(id, color, style, tier);
  if (type === 'axe')  return buildAxeMesh(id, color, style, tier, !!opts.twoHanded);
  if (type === 'mace') return buildMaceMesh(id, color, style, tier);
  if (type === 'lance') return buildLanceMesh(id, color, style, tier);
  if (type === 'shield') return buildShieldMesh(color, id, { element: opts.element, levelReq: opts.levelReq });
  return buildSwordMesh(id, color, style, tier);
}

// baseId → mace profile. Hammers get a BLOCKY anvil head; flails a chained ball;
// morningstars a spiked ball; default is a flanged mace. Keeps the haft/grip the
// same so applyHoldTransform('mace') stays correct.
const MACE_PROFILES = {
  club: 'club', spiked_club: 'morningstar', mace: 'flanged', iron_mace: 'flanged',
  war_hammer: 'hammer', warhammer: 'hammer', battle_hammer: 'hammer',
  great_hammer: 'hammer', maul: 'hammer', sledgehammer: 'hammer',
  morningstar: 'morningstar', morning_star: 'morningstar', flail: 'flail',
  meteor_hammer: 'flail', heavy_mace: 'flanged', thunder_hammer: 'hammer',
};

// A MACE / war hammer: a wooden haft with a heavy metal head. The head shape
// varies by profile — a BLOCKY anvil-faced hammer, a flanged mace, a spiked
// morningstar ball, a chained flail, or a knotted wooden club. Fire/legendary
// trim comes from the shared helpers so flame maces glow.
function buildMaceMesh(id, color, style, tier) {
  const profile = MACE_PROFILES[id] || (/hammer|maul/.test(id) ? 'hammer' : 'flanged');
  const g = new THREE.Group();
  const haft = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.026, 0.62, 8), mat(0x5a3a22));
  haft.position.y = 0.18;
  g.add(haft);
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.12, 8), mat(0x2a1a10));
  grip.position.y = 0.02;
  g.add(grip);
  const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.026, 8, 6), metalMat(style.accent || 0xb8980f));
  pommel.position.y = -0.1;
  g.add(pommel);
  const headY = 0.5;
  const steel = metalMat(color);
  const dark = metalMat(shade(color, 0.78));

  if (profile === 'hammer') {
    // BLOCKY war-hammer head: a heavy rectangular block across the haft with a
    // broad striking face on one side and a back spike on the other — distinctly
    // a hammer, not a ball. Reinforcing collar where it meets the haft.
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.06, 10), dark);
    collar.position.y = headY - 0.04; g.add(collar);
    const block = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.14, 0.14), steel);
    block.position.y = headY; g.add(block);
    // Bevelled striking face on the +X end.
    const face = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.16, 0.16), dark);
    face.position.set(0.13, headY, 0); g.add(face);
    // Back spike/pein on the −X end.
    const pein = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.12, 4), dark);
    pein.rotation.z = Math.PI / 2; pein.position.set(-0.15, headY, 0); g.add(pein);
    // Corner rivets so the block reads as forged.
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const rv = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 5), dark);
      rv.position.set(sx * 0.09, headY, sz * 0.06); g.add(rv);
    }
  } else if (profile === 'morningstar') {
    // A spiked ball: a metal sphere bristling with cone spikes in all directions.
    const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(0.075, 0), steel);
    ball.position.y = headY; g.add(ball);
    const dirs = [[0,1,0],[0,-1,0],[1,0,0],[-1,0,0],[0,0,1],[0,0,-1],[0.7,0.7,0],[-0.7,0.7,0],[0.7,-0.7,0],[-0.7,-0.7,0]];
    for (const [dx, dy, dz] of dirs) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.07, 5), dark);
      spike.position.set(dx * 0.1, headY + dy * 0.1, dz * 0.1);
      // Point the cone (+Y) outward along the spike direction.
      spike.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(dx, dy, dz).normalize());
      g.add(spike);
    }
  } else if (profile === 'flail') {
    // A flail: a short chain from the haft top to a spiked ball that hangs out
    // front so it reads as articulated, not rigid.
    const top = headY - 0.12;
    for (let i = 0; i < 3; i++) {
      const link = new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.006, 5, 10), dark);
      link.position.set(0, top + i * 0.03, 0.02 + i * 0.03);
      link.rotation.x = i % 2 ? Math.PI / 2 : 0;
      g.add(link);
    }
    const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(0.07, 0), steel);
    ball.position.set(0, top + 0.02, 0.14); g.add(ball);
    for (const [dx, dy, dz] of [[0,1,0],[0,-1,0],[1,0,0],[-1,0,0],[0,0,1],[0,0,-1]]) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.016, 0.06, 5), dark);
      spike.position.set(dx * 0.09, top + 0.02 + dy * 0.09, 0.14 + dz * 0.09);
      spike.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(dx, dy, dz).normalize());
      g.add(spike);
    }
  } else if (profile === 'club') {
    // A knotty wooden club: a fat tapered head with a couple of knot bumps.
    const headMat = mat(shade(color, 0.9));
    const club = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.045, 0.26, 10), headMat);
    club.position.y = headY - 0.04; g.add(club);
    for (let i = 0; i < 3; i++) {
      const knot = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), mat(shade(color, 0.75)));
      const a = (i / 3) * Math.PI * 2;
      knot.position.set(Math.cos(a) * 0.05, headY - 0.04 + (i - 1) * 0.06, Math.sin(a) * 0.05);
      g.add(knot);
    }
  } else {
    // DEFAULT 'flanged' mace: a chunky core with four blade-like flanges and a
    // crowning stud — the classic flanged mace head, beefier than the old ball.
    const core = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.13, 10), steel);
    core.position.y = headY; g.add(core);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), steel);
    cap.position.y = headY + 0.08; g.add(cap);
    const stud = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.05, 6), dark);
    stud.position.y = headY + 0.12; g.add(stud);
    for (let i = 0; i < 6; i++) {
      // Tapered triangular flanges fanning out around the core.
      const flange = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.11, 0.06), dark);
      flange.position.y = headY;
      flange.rotation.y = (i / 6) * Math.PI * 2;
      flange.translateZ(0.06);
      g.add(flange);
    }
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.04, 10), dark);
    collar.position.y = headY - 0.08; g.add(collar);
  }
  applyElementAccent(g, style, headY);
  addTierTrim(g, tier, style, { pommelY: -0.1, guardY: headY });
  return g;
}

// A LANCE: a long, clean shaft with a tall leaf point and a small pennant near
// the grip — the Jarvan-IV-style ceremonial knight lance.
function buildLanceMesh(id, color, style, tier) {
  const g = new THREE.Group();
  const H = 1.3;
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, H, 8), mat(0x6a4a2a));
  shaft.position.y = (H / 2) - 0.16;
  g.add(shaft);
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.14, 8), mat(0x2a1a10));
  grip.position.y = -0.02;
  g.add(grip);
  // Long spear point at the top.
  const tipY = H - 0.16;
  const point = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.26, 8), metalMat(color));
  point.position.y = tipY + 0.1;
  g.add(point);
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.012, 6, 12), metalMat(style.accent || 0xb8980f));
  collar.position.y = tipY - 0.04; collar.rotation.x = Math.PI / 2;
  g.add(collar);
  // Pennant banner just below the point.
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.1),
    new THREE.MeshStandardMaterial({ color: style.element === 'none' ? 0xc0392b : style.emissive, side: THREE.DoubleSide, metalness: 0.1, roughness: 0.8 }));
  flag.position.set(0.09, tipY - 0.22, 0);
  g.add(flag);
  applyElementAccent(g, style, tipY * 0.6);
  addTierTrim(g, tier, style, { pommelY: -0.02, guardY: tipY - 0.04 });
  return g;
}

// ===========================================================================
// SWORDS
// ===========================================================================
const SWORD_PROFILES = {
  training_sword: 'short', wooden_sword: 'short', short_sword: 'short',
  copper_sword: 'arming', dagger: 'dagger', rapier: 'rapier',
  iron_sword: 'arming', sabre: 'sabre', steel_sword: 'arming',
  broadsword: 'broad', knight_sword: 'broad', crystal_sword: 'crystal',
  fire_sword: 'arming', water_sword: 'arming', plant_sword: 'arming',
  serpent_sword: 'katana', frost_blade: 'katana', dragon_sword: 'broad',
  hellforged_blade: 'broad', demon_sword: 'greatsword', soul_reaver: 'katana',
  celestial_sword: 'greatsword', excalibur: 'greatsword',
};

// The shared grip stack used by the straight swords. Grip center stays at
// y≈0.02 and the round pommel at y≈-0.06 so applyHoldTransform('sword') is
// unchanged. `len` lets long two-handers stretch the grip downward.
function swordGrip(g, len = 0.15, pommel = true) {
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.024, len, 8), mat(0x3a2414));
  grip.position.y = 0.02;
  g.add(grip);
  if (pommel) {
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.034, 10, 8), metalMat(0xc8a24a));
    p.position.y = -0.06;
    g.add(p);
  }
}

function buildSwordMesh(id, color, style, tier) {
  const profile = SWORD_PROFILES[id] || 'arming';
  const g = new THREE.Group();
  let trim = { pommelY: -0.06, guardY: 0.11, guardHalf: 0.13, glowY: 0.4 };

  if (profile === 'short') {
    const blade = tintEmissive(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.34, 0.013), metalMat(color)), style);
    blade.position.y = 0.27;
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.07, 4), metalMat(color));
    tip.rotation.y = Math.PI / 4; tip.position.y = 0.47;
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.034, 0.05), metalMat(0xc8a24a));
    guard.position.y = 0.11;
    g.add(blade, tip, guard);
    swordGrip(g);
    applyElementAccent(g, style, 0.3);
  } else if (profile === 'dagger') {
    const blade = tintEmissive(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.2, 0.016), metalMat(color)), style);
    blade.position.y = 0.18;
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.026, 0.07, 4), metalMat(color));
    tip.rotation.y = Math.PI / 4; tip.position.y = 0.31;
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.03, 0.045), metalMat(0xc8a24a));
    guard.position.y = 0.10;
    g.add(blade, tip, guard);
    swordGrip(g, 0.11);
    trim.guardY = 0.10; trim.glowY = 0.2;
    applyElementAccent(g, style, 0.2);
  } else if (profile === 'rapier') {
    // A needle blade and a swept cup guard — thin and elegant.
    const blade = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.006, 0.6, 6), metalMat(color));
    blade.scale.x = 1.4; blade.position.y = 0.40; tintEmissive(blade, style);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.06, 6), metalMat(color));
    tip.position.y = 0.73;
    // Cup guard: a small lathed half-cup opening toward the blade.
    const cupPts = [
      new THREE.Vector2(0.018, 0), new THREE.Vector2(0.03, 0.015),
      new THREE.Vector2(0.05, 0.04), new THREE.Vector2(0.06, 0.06),
    ];
    const cup = new THREE.Mesh(new THREE.LatheGeometry(cupPts, 14), metalMat(0xc8a24a));
    cup.position.y = 0.11;
    const quillon = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.008, 6, 12, Math.PI), metalMat(0xc8a24a));
    quillon.rotation.x = Math.PI / 2; quillon.position.y = 0.08;
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.018, 0.17, 8), mat(0x3a2414));
    grip.position.y = 0.01;
    const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.026, 10, 8), metalMat(0xc8a24a));
    pommel.position.y = -0.08;
    g.add(blade, tip, cup, quillon, grip, pommel);
    trim.pommelY = -0.08; trim.glowY = 0.5;
    applyElementAccent(g, style, 0.4);
  } else if (profile === 'sabre') {
    // A curved single-edge blade with a knuckle guard.
    const crescent = new THREE.Shape();
    crescent.moveTo(0, 0);
    crescent.quadraticCurveTo(0.14, 0.26, 0.1, 0.52);     // bowed belly (cutting edge)
    crescent.lineTo(0.07, 0.52);
    crescent.quadraticCurveTo(0.09, 0.26, 0.0, 0.0);      // straighter back edge
    const sabre = tintEmissive(new THREE.Mesh(
      new THREE.ExtrudeGeometry(crescent, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 1 }),
      metalMat(color)), style);
    sabre.position.set(0, 0.10, -0.006);
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.03, 0.05), metalMat(0xc8a24a));
    guard.position.y = 0.11;
    const knuckle = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.01, 6, 12, Math.PI * 1.2), metalMat(0xc8a24a));
    knuckle.rotation.z = -Math.PI / 2; knuckle.position.set(-0.02, 0.03, 0);
    g.add(sabre, guard, knuckle);
    swordGrip(g);
    trim.glowY = 0.4;
    applyElementAccent(g, style, 0.4);
  } else if (profile === 'broad') {
    // A heavy wide straight chopping blade.
    const blade = tintEmissive(new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.5, 0.016), metalMat(color)), style);
    blade.position.y = 0.37;
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.043, 0.1, 4), metalMat(color));
    tip.rotation.y = Math.PI / 4; tip.position.y = 0.66;
    const fuller = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.42, 0.02), metalMat(shade(color, 0.7)));
    fuller.position.y = 0.36;
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.045, 0.07), metalMat(0xc8a24a));
    guard.position.y = 0.11;
    g.add(blade, tip, fuller, guard);
    swordGrip(g);
    trim.guardHalf = 0.15; trim.glowY = 0.4;
    applyElementAccent(g, style, 0.42);
  } else if (profile === 'katana') {
    // A long gently curved single-edge blade with a disc tsuba and long grip.
    const crescent = new THREE.Shape();
    crescent.moveTo(0, 0);
    crescent.quadraticCurveTo(0.06, 0.3, 0.045, 0.6);     // belly bows out +X
    crescent.lineTo(0.02, 0.6);
    crescent.quadraticCurveTo(0.035, 0.3, 0.0, 0.0);
    const blade = tintEmissive(new THREE.Mesh(
      new THREE.ExtrudeGeometry(crescent, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 1 }),
      metalMat(color)), style);
    blade.position.set(0, 0.10, -0.006);
    // Chisel tip: an angled box cap at the top of the belly.
    const ctip = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.06, 0.014), metalMat(color));
    ctip.position.set(0.05, 0.71, 0); ctip.rotation.z = -0.5;
    // Tsuba: a flat disc guard lying in X/Z.
    const tsuba = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.014, 16), metalMat(0x2a2a2a));
    tsuba.position.y = 0.10;
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.022, 0.2, 8), mat(0x2a1a10));
    grip.position.y = 0.0;
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.03), metalMat(0x3a2414));
    cap.position.y = -0.1;
    g.add(blade, ctip, tsuba, grip, cap);
    trim.pommelY = null; trim.guardY = 0.10; trim.glowY = 0.45; // square cap, no round pommel gem
    applyElementAccent(g, style, 0.4);
  } else if (profile === 'crystal') {
    // A faceted translucent gem prism blade that glows.
    const gemMat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.5, roughness: 0.2, transparent: true, opacity: 0.85 });
    const blade = new THREE.Mesh(new THREE.OctahedronGeometry(0.06, 0), gemMat);
    blade.scale.set(0.9, 4.4, 0.45); blade.position.y = 0.4;
    const shard1 = new THREE.Mesh(new THREE.TetrahedronGeometry(0.03), gemMat);
    shard1.position.set(0.05, 0.62, 0.02); shard1.rotation.set(0.4, 0.5, 0);
    const shard2 = new THREE.Mesh(new THREE.TetrahedronGeometry(0.025), gemMat);
    shard2.position.set(-0.05, 0.56, -0.02); shard2.rotation.set(0.7, 1.0, 0.3);
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.03, 0.05), metalMat(0xc8a24a));
    guard.position.y = 0.11;
    const glow = new THREE.PointLight(color, 0.8, 1.0);
    glow.position.y = 0.4;
    g.add(blade, shard1, shard2, guard, glow);
    swordGrip(g);
    trim.glowY = 0.4;
  } else if (profile === 'greatsword') {
    // A huge ornate two-hander with a winged crossguard.
    const blade = tintEmissive(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.66, 0.02), metalMat(color)), style);
    blade.position.y = 0.46;
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.14, 4), metalMat(color));
    tip.rotation.y = Math.PI / 4; tip.position.y = 0.86;
    const fuller = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.56, 0.024), metalMat(shade(color, 0.7)));
    fuller.position.y = 0.45;
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.05, 0.08), metalMat(0xc8a24a));
    bar.position.y = 0.12;
    // Two swept wings rising from the bar.
    for (const s of [-1, 1]) {
      const wingShape = new THREE.Shape();
      wingShape.moveTo(0, 0);
      wingShape.quadraticCurveTo(0.06, 0.04, 0.12, 0.12);
      wingShape.quadraticCurveTo(0.07, 0.06, 0.0, 0.03);
      const wing = new THREE.Mesh(
        new THREE.ExtrudeGeometry(wingShape, { depth: 0.04, bevelEnabled: false }), metalMat(0xc8a24a));
      wing.position.set(s * 0.13, 0.12, -0.02); wing.scale.x = s;
      g.add(wing);
    }
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.026, 0.22, 8), mat(0x2a1a10));
    grip.position.y = 0.0;
    const pommel = new THREE.Mesh(new THREE.IcosahedronGeometry(0.045, 0), metalMat(0xc8a24a));
    pommel.position.y = -0.1;
    g.add(blade, tip, fuller, bar, grip, pommel);
    trim.pommelY = -0.1; trim.guardY = 0.12; trim.guardHalf = 0.16; trim.glowY = 0.5;
    applyElementAccent(g, style, 0.5);
  } else {
    // DEFAULT 'arming' — the original knightly arming sword, unchanged.
    const blade = tintEmissive(new THREE.Mesh(new THREE.BoxGeometry(0.058, 0.52, 0.014), metalMat(color)), style);
    blade.position.y = 0.38;
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.029, 0.1, 4), metalMat(color));
    tip.rotation.y = Math.PI / 4; tip.position.y = 0.69;
    const fuller = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.46, 0.018), metalMat(shade(color, 0.7)));
    fuller.position.y = 0.37;
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.038, 0.06), metalMat(0xc8a24a));
    guard.position.y = 0.11;
    g.add(blade, tip, fuller, guard);
    swordGrip(g);
    trim.guardHalf = 0.13; trim.glowY = 0.42;
    applyElementAccent(g, style, 0.42);
  }
  addTierTrim(g, tier, style, trim);
  return g;
}

// ===========================================================================
// AXES
// ===========================================================================
const AXE_PROFILES = {
  hand_axe: 'hatchet', hatchet: 'hatchet', copper_axe: 'hatchet', tomahawk: 'hatchet',
  iron_axe: 'single', double_axe: 'double', halberd: 'polearm', battle_axe: 'double',
  great_axe: 'bearded', guardian_axe: 'polearm', war_axe: 'bearded',
  beast_cleaver: 'bearded', glacial_axe: 'bearded', magma_axe: 'bearded',
  titan_axe: 'bearded', demon_axe: 'bearded', apocalypse_axe: 'bearded',
  worldsplitter: 'bearded', rusty_axe: 'single', mining_pick: 'pick',
  reaper_scythe: 'scythe',
};

// The shared haft + wrap + pommel. Wrap stays at y≈0.04 so the hold transform is
// unchanged; 2H profiles pass a longer haft so the head rides higher.
function axeHaft(g, headY = 0.46, long = false) {
  const H = long ? 0.95 : 0.66;
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.024, H, 8), mat(0x5a3a22));
  handle.position.y = (H / 2) - 0.13;     // butt near y≈-0.13, top rises with H
  g.add(handle);
  const wrap = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.12, 8), mat(0x2a1a10));
  wrap.position.y = 0.04;
  g.add(wrap);
  const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.026, 8, 6), metalMat(0xb8980f));
  pommel.position.y = -0.13;
  g.add(pommel);
}

// A flat extruded axe bit fanning from the socket out to a curved cutting edge.
// `scale` shrinks/grows the whole bit, `beard` drops the lower edge below the
// socket for a hooked bearded read.
function axeBit(color, { scale = 1, beard = 0, mirror = false } = {}) {
  const s = new THREE.Shape();
  s.moveTo(0.0, 0.07 * scale);
  s.lineTo(0.06 * scale, 0.085 * scale);
  s.quadraticCurveTo(0.2 * scale, 0.06 * scale, 0.21 * scale, 0);
  s.quadraticCurveTo(0.2 * scale, -0.06 * scale, 0.06 * scale, -0.085 * scale - beard);
  s.lineTo(0.0, -0.07 * scale - beard);
  s.lineTo(0.0, 0.07 * scale);
  const bit = new THREE.Mesh(
    new THREE.ExtrudeGeometry(s, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 1 }),
    metalMat(color));
  bit.position.z = -0.025;
  if (mirror) bit.scale.x = -1;
  return bit;
}

function buildAxeMesh(id, color, style, tier, twoHanded) {
  const profile = AXE_PROFILES[id] || 'single';
  const g = new THREE.Group();

  if (profile === 'scythe') {
    // A SCYTHE, not an axe: a curved snath with a long blade across the top.
    // Lower straight snath section.
    const lower = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.024, 0.7, 8), mat(0x5a3a22));
    lower.position.y = 0.22;                 // butt near y≈-0.13
    g.add(lower);
    const wrap = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.12, 8), mat(0x2a1a10));
    wrap.position.y = 0.04;
    g.add(wrap);
    const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.026, 8, 6), metalMat(0xb8980f));
    pommel.position.y = -0.13;
    g.add(pommel);
    // Upper bent section of the snath.
    const upper = new THREE.Group();
    upper.position.y = 0.57;
    const upperRod = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.02, 0.42, 8), mat(0x5a3a22));
    upperRod.position.y = 0.21;
    upper.add(upperRod);
    upper.rotation.z = -0.26;                 // ~15° bend
    g.add(upper);
    // Long curved blade mounted perpendicular at the top, sweeping forward (+Z).
    const bladeShape = new THREE.Shape();
    bladeShape.moveTo(0, 0);
    bladeShape.quadraticCurveTo(0.3, 0.05, 0.5, -0.12);
    bladeShape.quadraticCurveTo(0.32, 0.0, 0.0, -0.05);
    const bladeMat = new THREE.MeshStandardMaterial({ color, emissive: style.element === 'none' ? 0x39d35a : style.emissive, emissiveIntensity: 0.4, metalness: 0.8, roughness: 0.35 });
    const blade = new THREE.Mesh(
      new THREE.ExtrudeGeometry(bladeShape, { depth: 0.014, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 1 }),
      bladeMat);
    blade.rotation.x = -Math.PI / 2;          // lay the blade roughly horizontal
    blade.position.set(0, 0.46, 0);
    upper.add(blade);
    // Vine wrap at the blade join.
    const vine = new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.008, 6, 12), metalMat(style.accent));
    vine.position.y = 0.42; vine.rotation.x = Math.PI / 2;
    upper.add(vine);
    applyElementAccent(g, style, 0.46);
    return g;
  }

  if (profile === 'polearm') {
    // A POLEARM: a long haft, a forward axe bit, a back hook and a spear point.
    const H = 1.2;
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.024, H, 8), mat(0x5a3a22));
    handle.position.y = (H / 2) - 0.13;
    g.add(handle);
    const wrap = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.12, 8), mat(0x2a1a10));
    wrap.position.y = 0.04;
    g.add(wrap);
    const headY = 0.95;
    const bit = tintEmissive(axeBit(color, { scale: 0.85 }), style);
    bit.position.set(0.03, headY, -0.025);
    g.add(bit);
    const socket = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.16, 8), metalMat(shade(color, 0.85)));
    socket.position.y = headY;
    g.add(socket);
    const hook = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.12, 6), metalMat(shade(color, 0.8)));
    hook.rotation.z = Math.PI / 2; hook.position.set(-0.08, headY, 0);
    g.add(hook);
    // Spear point standing at the very top.
    const spear = tintEmissive(new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.18, 6), metalMat(color)), style);
    spear.position.y = headY + 0.17;
    g.add(spear);
    const pommel = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.05, 8), metalMat(0xb8980f));
    pommel.position.y = -0.13;
    g.add(pommel);
    applyElementAccent(g, style, headY);
    return g;
  }

  if (profile === 'pick') {
    // A narrow double-pointed pick head across X — no flat bit.
    axeHaft(g, 0.46, false);
    const headY = 0.46;
    const sharp = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.2, 6), metalMat(color));
    sharp.rotation.z = -Math.PI / 2; sharp.position.set(0.13, headY, 0); sharp.rotation.x = 0.15;
    const blunt = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.12, 6), metalMat(shade(color, 0.8)));
    blunt.rotation.z = Math.PI / 2; blunt.position.set(-0.08, headY, 0);
    const socket = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.12, 8), metalMat(shade(color, 0.85)));
    socket.position.y = headY;
    g.add(sharp, blunt, socket);
    return g;
  }

  // single / double / hatchet / bearded all share the haft + a bit head.
  const long = twoHanded || profile === 'bearded';
  axeHaft(g, undefined, long);
  const headY = long ? 0.6 : 0.46;

  if (profile === 'hatchet') {
    const bit = tintEmissive(axeBit(color, { scale: 0.6 }), style);
    bit.position.set(0.02, headY, -0.025);
    const socket = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.1, 8), metalMat(shade(color, 0.85)));
    socket.position.y = headY;
    g.add(bit, socket);
  } else if (profile === 'double') {
    const front = tintEmissive(axeBit(color, { scale: 0.9 }), style);
    front.position.set(0.02, headY, -0.025);
    const back = tintEmissive(axeBit(color, { scale: 0.9, mirror: true }), style);
    back.position.set(-0.02, headY, -0.025);
    const socket = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.14, 8), metalMat(shade(color, 0.85)));
    socket.position.y = headY;
    g.add(front, back, socket);
  } else if (profile === 'bearded') {
    const bit = tintEmissive(axeBit(color, { scale: 1.2, beard: 0.18 }), style);
    bit.position.set(0.03, headY, -0.025);
    const socket = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.18, 8), metalMat(shade(color, 0.85)));
    socket.position.y = headY;
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.026, 0.08, 6), metalMat(shade(color, 0.8)));
    spike.rotation.z = -Math.PI / 2; spike.position.set(-0.08, headY, 0);
    g.add(bit, socket, spike);
  } else {
    // DEFAULT 'single' — the original single-bit war axe, unchanged geometry.
    const bit = tintEmissive(axeBit(color, { scale: 1 }), style);
    bit.position.set(0.03, headY, -0.025);
    const socket = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.12, 8), metalMat(shade(color, 0.85)));
    socket.position.y = headY;
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.09, 6), metalMat(shade(color, 0.8)));
    spike.rotation.z = -Math.PI / 2; spike.position.set(-0.07, headY, 0);
    g.add(bit, socket, spike);
  }
  applyElementAccent(g, style, headY);
  if (tier === 'legendary') {
    const glow = new THREE.PointLight(style.element === 'none' ? 0xfff0c0 : style.emissive, 1.1, 1.1);
    glow.position.y = headY;
    g.add(glow);
  }
  return g;
}

// ===========================================================================
// WANDS
// ===========================================================================
const WAND_PROFILES = {
  twig_wand: ['wand', 'claw'], apprentice_wand: ['wand', 'claw'],
  snakebite_rod: ['rod', 'claw'], moonlight_rod: ['rod', 'orb'],
  fire_wand: ['wand', 'claw'], water_wand: ['wand', 'claw'], plant_wand: ['wand', 'claw'],
  wand_of_decay: ['wand', 'claw'], wand_of_inferno: ['wand', 'crystal'],
  mystic_staff: ['staff', 'orb'], arcane_wand: ['wand', 'crystal'],
  glacial_staff: ['staff', 'crystal'], staff_of_blight: ['staff', 'claw'],
  staff_of_flames: ['staff', 'crystal'], void_wand: ['wand', 'orb'],
  staff_of_chaos: ['staff', 'orb'], cosmic_staff: ['staff', 'orb'],
  aqua_wand: ['wand', 'orb'], spellbinder_rod: ['rod', 'crystal'],
  genesis_staff: ['staff', 'crystal'],
};

// The gem material glows with the element when one is present, else the wand's
// own colour (so the existing wandColorForLevel pulse code still drives it).
function wandGemMat(color, style) {
  const emissive = style.element === 'none' ? color : style.emissive;
  return new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: 0.5, roughness: 0.25 });
}

function buildWandMesh(id, color, style, tier) {
  const [profile, setting] = WAND_PROFILES[id] || ['wand', 'claw'];
  const g = new THREE.Group();
  let gemY = 0.42;

  if (profile === 'staff') {
    // Legendary staves get a dark runed shaft with metal bands + glowing inlays;
    // lesser staves keep the plain wooden pole.
    const legendary = tier === 'legendary';
    const shaftMat = legendary ? metalMat(0x2a2030) : mat(0x4a2f1b);
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.028, 0.74, 8), shaftMat);
    shaft.position.y = 0.33;
    g.add(shaft);
    if (legendary) {
      const inlayMat = new THREE.MeshStandardMaterial({ color: style.element === 'none' ? color : style.accent, emissive: style.element === 'none' ? color : style.emissive, emissiveIntensity: 0.7 });
      for (const by of [0.18, 0.36, 0.54]) {
        const band = new THREE.Mesh(new THREE.TorusGeometry(0.026, 0.008, 6, 12), metalMat(0xc8a24a));
        band.position.y = by; band.rotation.x = Math.PI / 2; g.add(band);
        const rune = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 5), inlayMat);
        rune.position.set(0, by, 0.028); g.add(rune);
      }
    }
    gemY = 0.72;
  } else if (profile === 'rod') {
    // A knobbly organic rod via a slightly wavy tube.
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, -0.04, 0), new THREE.Vector3(0.01, 0.08, 0.005),
      new THREE.Vector3(-0.008, 0.2, 0), new THREE.Vector3(0.006, 0.3, -0.004),
      new THREE.Vector3(0, 0.36, 0),
    ]);
    const shaft = new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.02, 6, false), mat(0x4a2f1b));
    g.add(shaft);
    gemY = 0.38;
    if (id === 'snakebite_rod') {
      for (const s of [-1, 1]) {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 5),
          new THREE.MeshStandardMaterial({ color: 0xffcc00, emissive: 0xaa6600, emissiveIntensity: 0.5 }));
        eye.position.set(s * 0.018, gemY - 0.04, 0.02);
        g.add(eye);
      }
    }
  } else {
    // DEFAULT 'wand' — the original tapered shaft.
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.024, 0.4, 8), mat(0x4a2f1b));
    shaft.position.y = 0.16;
    g.add(shaft);
  }
  // Wrapped grip at the palm reference (unchanged across profiles).
  const wrap = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.1, 8), mat(0x2a1a10));
  wrap.position.y = 0.04;
  g.add(wrap);

  // The setting + gem at the head.
  let gem;
  if (setting === 'orb') {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.012, 6, 14), metalMat(0xd9c46a));
    ring.position.y = gemY - 0.03; ring.rotation.x = Math.PI / 2;
    g.add(ring);
    gem = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 12), wandGemMat(color, style));
    gem.position.y = gemY;
  } else if (setting === 'crystal') {
    for (let i = 0; i < 4; i++) {
      const prong = new THREE.Mesh(new THREE.ConeGeometry(0.01, 0.06, 4), metalMat(0xd9c46a));
      prong.position.set(Math.cos(i / 4 * Math.PI * 2) * 0.025, gemY - 0.05, Math.sin(i / 4 * Math.PI * 2) * 0.025);
      g.add(prong);
    }
    gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.05, 0), wandGemMat(color, style));
    gem.scale.y = 1.5; gem.position.y = gemY;
  } else {
    // 'claw' — the original three gold prongs cradling the gem.
    for (let i = 0; i < 3; i++) {
      const prong = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.07, 4), metalMat(0xd9c46a));
      prong.position.set(Math.cos(i / 3 * Math.PI * 2) * 0.03, gemY - 0.06, Math.sin(i / 3 * Math.PI * 2) * 0.03);
      prong.rotation.x = Math.PI;
      g.add(prong);
    }
    gem = new THREE.Mesh(new THREE.IcosahedronGeometry(0.052, 0), wandGemMat(color, style));
    gem.position.y = gemY;
  }
  // A gentle glow; staves cast a larger one.
  const glowColor = style.element === 'none' ? color : style.emissive;
  const glow = profile === 'staff'
    ? new THREE.PointLight(glowColor, 1.3, 1.8)
    : new THREE.PointLight(glowColor, 1.1, 1.4);
  glow.position.y = gemY;
  g.add(gem, glow);
  g.userData.gem = gem;
  applyElementAccent(g, style, gemY);

  // LEGENDARY focus: a ring of small motes orbiting the head, plus extra satellite
  // crystals — the "floating bits" that make high-end staves read as powerful.
  if (tier === 'legendary') {
    const moteCol = style.element === 'none' ? color : style.emissive;
    const moteMat = new THREE.MeshStandardMaterial({ color: moteCol, emissive: moteCol, emissiveIntensity: 0.9, roughness: 0.2 });
    const orbit = new THREE.Group();
    orbit.position.y = gemY;
    const n = 6;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const mote = new THREE.Mesh(new THREE.OctahedronGeometry(0.014 + (i % 2) * 0.008, 0), moteMat);
      mote.position.set(Math.cos(a) * 0.1, (i % 3 - 1) * 0.04, Math.sin(a) * 0.1);
      orbit.add(mote);
    }
    g.add(orbit);
    g.userData.orbit = orbit;   // animated to spin in the loop where supported
    // a faint halo ring around the gem
    const halo = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.006, 6, 20), moteMat);
    halo.position.y = gemY; halo.rotation.x = 1.2;
    g.add(halo);
  }

  // GENESIS STAFF (lv145): a unique crown of three rainbow crystals + a bright core.
  if (id === 'genesis_staff') {
    const cols = [0x66ff88, 0x66aaff, 0xff66cc];
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      const cm = new THREE.MeshStandardMaterial({ color: cols[i], emissive: cols[i], emissiveIntensity: 0.8, roughness: 0.2 });
      const shard = new THREE.Mesh(new THREE.OctahedronGeometry(0.04, 0), cm);
      shard.scale.y = 1.8;
      shard.position.set(Math.cos(a) * 0.07, gemY + 0.06, Math.sin(a) * 0.07);
      g.add(shard);
    }
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.05, 1),
      new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xaaccff, emissiveIntensity: 1.0, roughness: 0.1 }));
    core.position.y = gemY; g.add(core);
  }
  return g;
}

// Seat a weapon mesh in the hand so the GRIP sits in the palm (the hand group's
// origin) and the weapon points the right way out of the fist. The melee weapons
// are built along +Y with their origin near the TOP of the grip, so added raw
// their middle lands at the palm and the blade/head impales the arm. Here we
// translate each so its grip CENTER lands at the palm, then tilt so the blade
// leads up-and-forward — the way a hand grips a sword resting at the side. The
// same hand-local transform stays correct through the overhand swing arc (the
// hand frame rotates with armR.pivot), so the blade keeps leading the chop.
//
// Mesh-space grip references (origin = y0):
//   sword: grip cylinder centered at y=0.02 (runs y≈-0.06..0.10), blade up to 0.69
//   axe:   grip wrap at y=0.04 near the butt, head at 0.46, pommel at -0.13
//   wand:  grip wrap at y=0.04, gem at 0.42
//   bow/crossbow: grip already at the origin; the build fn yaws aim down the reach
function applyHoldTransform(mesh, type, id = '') {
  // The hand group's origin IS the palm (a ~0.085 sphere). A weapon is built with
  // its grip near the bottom running up +Y. To read as truly HELD — not stuck to
  // the forearm — the grip must sit in the palm and the shaft must pitch FORWARD
  // (+X rotation tips +Y toward +Z) well past vertical so the blade/head leads
  // out ahead of the fist, plus a small forward (+Z) and outward (−X, the right
  // hand is on −X) nudge so the haft clears the wrist/forearm.
  if (type === 'bow') {
    // Bows already place the grip at the origin and yaw the aim down the reach.
    mesh.position.set(0, -0.02, 0.02);
    return;
  }
  if (type === 'wand') {
    // A focus rod canted up-and-forward out of a casting fist.
    mesh.position.set(-0.02, -0.05, 0.06);
    mesh.rotation.set(0.95, 0, 0.05);
    return;
  }
  if (type === 'axe') {
    // Gripped near the butt; haft pitched forward so the head rides out front.
    mesh.position.set(-0.02, -0.05, 0.07);
    mesh.rotation.set(1.05, 0, 0.12);
    return;
  }
  if (type === 'mace') {
    mesh.position.set(-0.02, -0.04, 0.07);
    mesh.rotation.set(1.0, 0, 0.1);
    return;
  }
  if (type === 'lance') {
    // Couched almost level, pointing forward ahead of the hand.
    mesh.position.set(-0.02, -0.02, 0.08);
    mesh.rotation.set(1.35, 0, 0.04);
    return;
  }
  // Sword: grip center to the palm, blade pitched forward-and-up out of the fist.
  if (LOW_GRIP_SWORDS.has(id)) {
    mesh.position.set(-0.02, 0.0, 0.07);
  } else {
    mesh.position.set(-0.02, -0.03, 0.07);
  }
  mesh.rotation.set(0.95, 0, 0.1);
}

// Sword ids whose grip is centered at y≈0.0 (katana + greatswords), so the hold
// transform must NOT drop them the extra 0.02 the arming-sword grip needs.
const LOW_GRIP_SWORDS = new Set([
  'serpent_sword', 'frost_blade', 'soul_reaver',     // katana
  'demon_sword', 'celestial_sword', 'excalibur',     // greatsword
]);

// baseId → shield profile. Varied silhouettes so shields don't all look alike:
// buckler (tiny round), round, heater (rounded triangle), kite (tapered point),
// tower (tall wall), hex (six-sided), spiked (jagged). Default 'heater'.
const SHIELD_PROFILES = {
  buckler: 'buckler', wooden_shield: 'round', studded_shield: 'heater',
  brass_shield: 'round', iron_shield: 'heater', copper_shield: 'buckler',
  steel_shield: 'kite', battle_shield: 'kite', tower_shield: 'tower',
  crown_shield: 'hex', guardian_shield: 'tower', dragon_shield: 'kite',
  frozen_shield: 'hex', vine_shield: 'round', demon_shield: 'spiked',
  aegis_shield: 'round', celestial_shield: 'hex', plate_shield: 'heater',
  mastermind_shield: 'round', phoenix_shield: 'spiked',
};

// baseId → thematic emblem drawn on the shield face. Each is a small builder
// returning a Group placed at the boss; gives marquee shields real identity.
const SHIELD_EMBLEMS = {
  demon_shield: 'demonFace',
  dragon_shield: 'dragonFace',
  mastermind_shield: 'rose',
  phoenix_shield: 'phoenix',
  celestial_shield: 'star',
  crown_shield: 'crown',
};

// Build the named emblem as a small Group sitting just proud of the face (+Z).
function buildShieldEmblem(name, accentMat) {
  const g = new THREE.Group();
  const dark = mat(0x2a2a2e);
  const bone = mat(0xd8d2c0);
  if (name === 'demonFace') {
    // The Tibia DEMON SHIELD: a big red demon face SCREAMING — a wide gaping black
    // maw lined with white fangs, glowing yellow eyes, a heavy brow, fills the face.
    const red = new THREE.MeshStandardMaterial({ color: 0xc62828, roughness: 0.5, metalness: 0.1 });
    const redD = new THREE.MeshStandardMaterial({ color: 0x7a1414, roughness: 0.6 });
    const faceM = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 14), red);
    faceM.scale.set(1, 1.25, 0.45); faceM.position.z = -0.01; g.add(faceM);
    // sunken cheeks / jowls framing the mouth
    for (const s of [-1, 1]) {
      const jowl = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), redD);
      jowl.scale.set(0.8, 1, 0.4); jowl.position.set(s * 0.1, -0.05, 0.04); g.add(jowl);
    }
    // GAPING screaming mouth: a black cavity
    const maw = new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 10), mat(0x140404));
    maw.scale.set(1, 1.15, 0.4); maw.position.set(0, -0.06, 0.06); g.add(maw);
    // top + bottom rows of fangs ringing the maw
    for (let i = -3; i <= 3; i++) {
      const top = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.05, 5), bone);
      top.position.set(i * 0.025, 0.02, 0.1); top.rotation.x = Math.PI; g.add(top);
      const bot = new THREE.Mesh(new THREE.ConeGeometry(0.013, 0.045, 5), bone);
      bot.position.set(i * 0.026, -0.15, 0.1); g.add(bot);
    }
    // big glowing eyes under a furrowed brow
    for (const s of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8),
        new THREE.MeshStandardMaterial({ color: 0xffdd44, emissive: 0xffaa00, emissiveIntensity: 1.0 }));
      eye.scale.set(1.2, 0.8, 1); eye.position.set(s * 0.07, 0.12, 0.08); g.add(eye);
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), mat(0x200800));
      pupil.position.set(s * 0.07, 0.12, 0.11); g.add(pupil);
      // angry angled brow
      const brow = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.022, 0.03), redD);
      brow.position.set(s * 0.07, 0.18, 0.09); brow.rotation.z = s * 0.45; g.add(brow);
    }
  } else if (name === 'dragonFace') {
    // The Tibia DRAGON SHIELD: a serpentine red-orange dragon coiled in an "S"
    // running diagonally across a dark face — body segments + a small head + tail.
    g.add(new THREE.Mesh(new THREE.CircleGeometry(0.2, 24), mat(0x2a1810)));   // dark backing
    const scaleMat = new THREE.MeshStandardMaterial({ color: 0xe04a1a, emissive: 0xcc3300, emissiveIntensity: 0.35, roughness: 0.45 });
    const scaleHot = new THREE.MeshStandardMaterial({ color: 0xff8a33, emissive: 0xff5500, emissiveIntensity: 0.4, roughness: 0.4 });
    // S-curve path of the serpent body, lower-left to upper-right
    const pts = [
      [-0.11, -0.16], [-0.05, -0.1], [0.02, -0.02], [0.0, 0.05],
      [-0.06, 0.09], [-0.04, 0.15], [0.04, 0.16], [0.1, 0.12],
    ];
    for (let i = 0; i < pts.length; i++) {
      const seg = new THREE.Mesh(new THREE.SphereGeometry(0.045 - i * 0.003, 10, 8), i % 2 ? scaleHot : scaleMat);
      seg.scale.set(1, 1, 0.5); seg.position.set(pts[i][0], pts[i][1], 0.05); g.add(seg);
    }
    // dragon head at the top end with a snout + glowing eye + little horn
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), scaleMat);
    head.scale.set(1, 0.9, 0.6); head.position.set(0.12, 0.13, 0.07); g.add(head);
    const snout = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.06, 6), scaleHot);
    snout.position.set(0.17, 0.12, 0.07); snout.rotation.z = -Math.PI / 2; g.add(snout);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6),
      new THREE.MeshStandardMaterial({ color: 0xffee66, emissive: 0xffaa00, emissiveIntensity: 0.9 }));
    eye.position.set(0.13, 0.15, 0.1); g.add(eye);
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.05, 5), mat(0x3a1a0a));
    horn.position.set(0.1, 0.17, 0.07); horn.rotation.z = 0.4; g.add(horn);
    // forked tail flick at the bottom end
    for (const s of [-1, 1]) {
      const fork = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.06, 5), scaleHot);
      fork.position.set(-0.13 + s * 0.02, -0.2, 0.05); fork.rotation.z = s * 0.5; g.add(fork);
    }
    return g;   // dragon emblem is self-contained (no extra dragon-head block)
  } else if (name === 'rose') {
    // A grey rose sigil: layered petals + a stem, all in cold steel grey.
    const grey = new THREE.MeshStandardMaterial({ color: 0xb8bcc4, metalness: 0.6, roughness: 0.4 });
    const greyD = new THREE.MeshStandardMaterial({ color: 0x8a8e96, metalness: 0.6, roughness: 0.45 });
    for (let ring = 0; ring < 2; ring++) {
      const n = ring === 0 ? 5 : 6;
      const rr = ring === 0 ? 0.05 : 0.085;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + ring * 0.5;
        const petal = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), ring ? greyD : grey);
        petal.scale.set(0.7, 1.1, 0.4);
        petal.position.set(Math.cos(a) * rr, Math.sin(a) * rr, 0.04 - ring * 0.01);
        petal.rotation.z = a; g.add(petal);
      }
    }
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), grey);
    core.position.z = 0.06; g.add(core);
    const stem = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.12, 0.012), greyD);
    stem.position.set(0, -0.12, 0.04); g.add(stem);
  } else if (name === 'phoenix') {
    // Spread fiery wings + a small head.
    const fire = new THREE.MeshStandardMaterial({ color: 0xff7722, emissive: 0xcc3300, emissiveIntensity: 0.7 });
    for (const s of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const feather = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.1 - i * 0.015, 5), fire);
        feather.position.set(s * (0.04 + i * 0.04), 0.02 + i * 0.02, 0.05);
        feather.rotation.z = s * (1.2 - i * 0.3); g.add(feather);
      }
    }
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), fire);
    body.scale.set(0.6, 1, 0.4); body.position.z = 0.05; g.add(body);
  } else if (name === 'star') {
    // A radiant celestial star burst.
    const glow = new THREE.MeshStandardMaterial({ color: 0xfff0a0, emissive: 0xffcc44, emissiveIntensity: 0.8 });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const ray = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.1, 4), glow);
      ray.position.set(Math.cos(a) * 0.06, Math.sin(a) * 0.06, 0.05);
      ray.rotation.z = a - Math.PI / 2; g.add(ray);
    }
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.04, 0), glow);
    core.position.z = 0.07; g.add(core);
  } else if (name === 'crown') {
    const gold = new THREE.MeshStandardMaterial({ color: 0xe8c04a, metalness: 0.8, roughness: 0.3 });
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.03, 0.03), gold);
    band.position.set(0, -0.03, 0.05); g.add(band);
    for (let i = -2; i <= 2; i++) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.07, 5), gold);
      spike.position.set(i * 0.04, 0.03, 0.05); g.add(spike);
      const gem = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6),
        new THREE.MeshStandardMaterial({ color: 0xcc3344, emissive: 0x661122, emissiveIntensity: 0.5 }));
      gem.position.set(i * 0.04, 0.06, 0.07); g.add(gem);
    }
  }
  return g;
}

// A shield strapped to the forearm. The face is built in XY (normal +Z) and
// extruded thin; per-profile silhouettes (buckler/heater/tower/kite/round) keep
// the SAME final orientation so it still hangs on the forearm.
export function buildShieldMesh(color, id = '', opts = {}) {
  const profile = SHIELD_PROFILES[id] || 'heater';
  const style = elementStyle(opts.element || 'none');
  const tier = tierLevel(opts.levelReq || 1);
  const g = new THREE.Group();
  const face = mat(color);
  const steel = metalMat(0xc4c9cf);
  const goldRim = tier === 'plain' ? steel : metalMat(0xc8a24a);
  // Boss glows with the element on epic+ shields; else plain steel.
  const bossMat = (style.element !== 'none' || tier !== 'plain')
    ? new THREE.MeshStandardMaterial({ color: style.element === 'none' ? 0xc8a24a : style.accent, emissive: style.emissive, emissiveIntensity: style.element === 'none' ? 0.1 : 0.5, metalness: 0.7, roughness: 0.35 })
    : steel;
  let drop = -0.18;                          // forearm hang offset (buckler sits higher)

  if (profile === 'buckler') {
    // A small round shield with a domed center boss.
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.05, 24), face);
    disc.rotation.x = Math.PI / 2;
    g.add(disc);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.02, 8, 24), goldRim);
    rim.position.z = 0.025;
    g.add(rim);
    const center = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 10), bossMat);
    center.scale.set(1, 1, 0.6); center.position.z = 0.05;
    g.add(center);
    drop = -0.12;                            // smaller shield drops less
  } else if (profile === 'tower') {
    // A tall rectangular wall shield.
    const s = roundedRect(0.2, 0.31, 0.05);
    const body = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.06, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2 }), face);
    g.add(body);
    const rim = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.03, bevelEnabled: false }), goldRim);
    rim.scale.set(1.05, 1.04, 1); rim.position.z = -0.01;
    g.add(rim);
    const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.6, 0.03), steel);
    ridge.position.set(0, 0, 0.07);
    g.add(ridge);
    for (const by of [0.18, -0.18]) {
      const band = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.04, 0.03), steel);
      band.position.set(0, by, 0.07);
      g.add(band);
    }
    const boss = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 10), bossMat);
    boss.scale.set(1, 1, 0.6); boss.position.set(0, 0, 0.09);
    g.add(boss);
  } else if (profile === 'kite') {
    // A knightly kite: straight top, sides tapering to a long bottom point.
    const s = new THREE.Shape();
    s.moveTo(-0.18, 0.28);
    s.lineTo(0.18, 0.28);
    s.lineTo(0.2, 0.0);
    s.quadraticCurveTo(0.16, -0.26, 0, -0.42);
    s.quadraticCurveTo(-0.16, -0.26, -0.2, 0.0);
    s.lineTo(-0.18, 0.28);
    const body = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2 }), face);
    g.add(body);
    const rim = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.03, bevelEnabled: false }), goldRim);
    rim.scale.set(1.06, 1.05, 1); rim.position.z = -0.01;
    g.add(rim);
    const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.5, 0.02), steel);
    ridge.position.set(0, -0.02, 0.07);
    g.add(ridge);
    const boss = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 10), bossMat);
    boss.scale.set(1, 1, 0.6); boss.position.set(0, 0.08, 0.08);
    g.add(boss);
  } else if (profile === 'round') {
    // An ornate round disc with concentric rings and a faceted boss.
    const s = circleShape(0.26, 28);
    const body = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.025, bevelSegments: 3 }), face);
    g.add(body);
    const outer = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.022, 8, 28), goldRim);
    outer.position.z = 0.03;
    const inner = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.016, 8, 24), goldRim);
    inner.position.z = 0.05;
    const boss = new THREE.Mesh(new THREE.IcosahedronGeometry(0.06, 0), bossMat);
    boss.position.z = 0.07;
    g.add(outer, inner, boss);
  } else if (profile === 'hex') {
    // A six-sided heraldic shield with a beveled face and double rim.
    const s = new THREE.Shape();
    s.moveTo(0, 0.3);
    s.lineTo(0.22, 0.15);
    s.lineTo(0.22, -0.12);
    s.lineTo(0, -0.34);
    s.lineTo(-0.22, -0.12);
    s.lineTo(-0.22, 0.15);
    s.lineTo(0, 0.3);
    const body = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.025, bevelSegments: 2 }), face);
    g.add(body);
    const rim = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.03, bevelEnabled: false }), goldRim);
    rim.scale.set(1.07, 1.06, 1); rim.position.z = -0.01;
    g.add(rim);
    // inset panel line + studs at the corners
    for (const [sx, sy] of [[0.16, 0.1], [-0.16, 0.1], [0.16, -0.1], [-0.16, -0.1]]) {
      const stud = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), steel);
      stud.position.set(sx, sy, 0.07); g.add(stud);
    }
    const boss = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 10), bossMat);
    boss.scale.set(1, 1, 0.6); boss.position.set(0, 0.0, 0.08); g.add(boss);
  } else if (profile === 'spiked') {
    // A menacing heater bristling with rim spikes (demon/phoenix shields).
    const s = new THREE.Shape();
    s.moveTo(-0.22, 0.26);
    s.lineTo(0.22, 0.26);
    s.lineTo(0.22, -0.02);
    s.quadraticCurveTo(0.22, -0.22, 0, -0.34);
    s.quadraticCurveTo(-0.22, -0.22, -0.22, -0.02);
    s.lineTo(-0.22, 0.26);
    const body = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.06, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.025, bevelSegments: 2 }), face);
    g.add(body);
    const rim = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.03, bevelEnabled: false }), goldRim);
    rim.scale.set(1.08, 1.07, 1); rim.position.z = -0.01;
    g.add(rim);
    // spikes around the upper rim
    const spikeMat = metalMat(0xd0d4da);
    const spots = [[-0.22, 0.1], [-0.2, 0.27], [0, 0.32], [0.2, 0.27], [0.22, 0.1], [-0.15, -0.28], [0.15, -0.28]];
    for (const [sx, sy] of spots) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.1, 5), spikeMat);
      spike.position.set(sx, sy, 0.04);
      spike.rotation.z = -Math.atan2(sx, sy);   // point outward from center
      g.add(spike);
    }
    const boss = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 10), bossMat);
    boss.scale.set(1, 1, 0.6); boss.position.set(0, 0.04, 0.09); g.add(boss);
  } else {
    // DEFAULT 'heater' — the original rounded-triangle heater, unchanged.
    const s = new THREE.Shape();
    s.moveTo(-0.22, 0.26);
    s.lineTo(0.22, 0.26);
    s.lineTo(0.22, -0.02);
    s.quadraticCurveTo(0.22, -0.22, 0, -0.32);
    s.quadraticCurveTo(-0.22, -0.22, -0.22, -0.02);
    s.lineTo(-0.22, 0.26);
    const body = new THREE.Mesh(
      new THREE.ExtrudeGeometry(s, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2 }),
      face);
    g.add(body);
    const rim = new THREE.Mesh(
      new THREE.ExtrudeGeometry(s, { depth: 0.03, bevelEnabled: false }), goldRim);
    rim.scale.set(1.06, 1.06, 1);
    rim.position.z = -0.01;
    g.add(rim);
    const vbar = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.34, 0.02), steel);
    vbar.position.set(0, 0.0, 0.07);
    const hbar = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.05, 0.02), steel);
    hbar.position.set(0, 0.06, 0.07);
    const boss = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 10), bossMat);
    boss.position.set(0, 0.06, 0.08);
    boss.scale.set(1, 1, 0.6);
    g.add(vbar, hbar, boss);
  }

  // Thematic emblem for marquee shields (demon face, dragon face, grey rose…).
  const emblemName = SHIELD_EMBLEMS[id];
  if (emblemName) {
    const emblem = buildShieldEmblem(emblemName, bossMat);
    emblem.position.z = 0.06;
    g.add(emblem);
  }

  // Element accent on the face: fire flame cones at the top, frost shards, or a
  // vine + leaves, plus a faint glow for elemental shields.
  if (style.element === 'fire') {
    for (let i = -1; i <= 1; i++) {
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.08, 4),
        new THREE.MeshStandardMaterial({ color: style.accent, emissive: style.emissive, emissiveIntensity: 0.6, roughness: 0.3 }));
      flame.position.set(i * 0.1, 0.27, 0.06);
      g.add(flame);
    }
  } else if (style.element === 'water') {
    for (let i = 0; i < 3; i++) {
      const shard = new THREE.Mesh(new THREE.TetrahedronGeometry(0.035),
        new THREE.MeshStandardMaterial({ color: style.accent, emissive: style.emissive, emissiveIntensity: 0.5, roughness: 0.25 }));
      shard.position.set((i - 1) * 0.12, 0.18, 0.06); shard.rotation.set(0.5, i, 0.3);
      g.add(shard);
    }
  } else if (style.element === 'plant') {
    const vine = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.012, 6, 18),
      new THREE.MeshStandardMaterial({ color: style.accent, emissive: style.emissive, emissiveIntensity: 0.4, roughness: 0.4 }));
    vine.position.z = 0.06;
    g.add(vine);
    for (let i = 0; i < 3; i++) {
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.06, 4),
        new THREE.MeshStandardMaterial({ color: style.accent, emissive: style.emissive, emissiveIntensity: 0.4, roughness: 0.4 }));
      const a = i / 3 * Math.PI * 2;
      leaf.position.set(Math.cos(a) * 0.18, Math.sin(a) * 0.18, 0.07);
      leaf.rotation.z = a;
      g.add(leaf);
    }
  }
  if (style.glow > 0) {
    const light = new THREE.PointLight(style.emissive, 0.6, 0.9);
    light.position.z = 0.1;
    g.add(light);
  }

  // The shield face (built in XY, normal +Z) should look forward, away from the
  // body, strapped to the forearm which hangs down from the left hand. Tilt it
  // slightly outward so it reads as carried, not flat against the chest.
  g.rotation.set(0, 0.35, 0);
  g.position.set(0.02, drop, 0.12);
  return g;
}

// A rounded rectangle Shape, half-width hw, half-height hh, corner radius r.
function roundedRect(hw, hh, r) {
  const s = new THREE.Shape();
  s.moveTo(-hw, -hh);
  s.lineTo(hw, -hh);
  s.lineTo(hw, hh - r);
  s.quadraticCurveTo(hw, hh, hw - r, hh);
  s.lineTo(-hw + r, hh);
  s.quadraticCurveTo(-hw, hh, -hw, hh - r);
  s.lineTo(-hw, -hh);
  return s;
}

// A circle Shape of radius r approximated by `seg` segments.
function circleShape(r, seg) {
  const s = new THREE.Shape();
  s.moveTo(r, 0);
  for (let i = 1; i <= seg; i++) {
    const a = (i / seg) * Math.PI * 2;
    s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  return s;
}

// A quiver of arrows worn at the hand for archers (replaces the shield slot).
// Arrows fan upward and slightly back so they read clearly behind the bow hand.
// `tubeColor` tints the quiver to match the equipped item; `levelReq` drives the
// tier read — higher tiers carry more arrows and a metallic band/rim, and the two
// legendary quivers (levelReq >= 90) get a golden band and golden arrowheads.
function buildArrowsMesh(tubeColor, levelReq = 1) {
  const g = new THREE.Group();
  const tier = levelReq >= 125 ? 5 : levelReq >= 90 ? 4 : levelReq >= 50 ? 3 : levelReq >= 25 ? 2 : levelReq >= 10 ? 1 : 0;
  const legendary = levelReq >= 90;
  const tubeCol = tubeColor != null ? tubeColor : 0x5a3a22;
  const bandCol = legendary ? 0xf0d878 : (tier >= 3 ? 0x8a8f96 : 0x3a2414);
  const headCol = legendary ? 0xf0d878 : 0xc4c9cf;
  // The quiver tube itself.
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.34, 10), mat(tubeCol));
  tube.position.y = -0.05;
  g.add(tube);
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.012, 6, 12), legendary || tier >= 3 ? metalMat(bandCol) : mat(bandCol));
  band.rotation.x = Math.PI / 2;
  band.position.y = 0.06;
  g.add(band);
  // Higher-tier quivers carry more arrows fanned in the tube.
  const allOffsets = [[-0.025, 0, 0.015], [0.025, 0, 0.015], [0, 0, -0.025], [0, 0, 0.03], [-0.03, 0, -0.01], [0.03, 0, -0.005]];
  const count = Math.min(allOffsets.length, 4 + Math.floor(tier / 2));   // 4..6 arrows
  for (let i = 0; i < count; i++) {
    const [ox, , oz] = allOffsets[i];
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.34, 5), mat(0x8a5a2b));
    shaft.position.set(ox, 0.16, oz);
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.06, 5), metalMat(headCol));
    head.position.set(ox, 0.36, oz);
    const fletch = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.06, 0.03), mat(0xe23b3b));
    fletch.position.set(ox, 0.27, oz + 0.02);
    g.add(shaft, head, fletch);
  }
  g.rotation.z = 0.18; // tilt the quiver slightly in the hand
  return g;
}

// Maps an equipped helmet item to a visual style. Special hats get their own
// silhouette by id; otherwise the data's `coverage` decides: 'closed' great
// helms cover the face, everything else is an open cap that leaves the face
// clear. A handful of mid helms carry a nose guard for a knightly read.
const NOSE_GUARD_IDS = new Set(['chain_helmet', 'studded_helmet']);
function headgearStyle(item) {
  const id = item.baseId || '';
  if (id === 'wizard_hat') return 'wizard';
  if (id === 'straw_hat') return 'straw';
  if (id === 'cloth_hood') return 'hood';
  if (id.includes('horned')) return 'horned';
  if (id.includes('crown')) return 'crown';
  if ((item.coverage || 'open') === 'closed') return 'closed';
  if (NOSE_GUARD_IDS.has(id)) return 'half';
  return 'open';
}

// style: 'open' (cap on top, face clear), 'half' (open + nose guard),
// 'closed' (a great helm covering the face), plus the special hats below.
function buildHelmetMesh(color, style = 'open') {
  const g = new THREE.Group();
  const steel = mat(0xb8bcc0);

  if (style === 'wizard') {
    // Tall pointed cone with a soft brim — the classic mage hat.
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.5, 16), mat(color));
    cone.position.y = 0.34;
    cone.rotation.z = 0.12; // a slight lean gives it character
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.03, 18), mat(shade(color, 0.85)));
    brim.position.y = 0.12;
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.235, 0.022, 6, 16), mat(0xf1c40f));
    band.rotation.x = Math.PI / 2;
    band.position.y = 0.15;
    g.add(cone, brim, band);
    return g;
  }
  if (style === 'straw') {
    // Wide conical sun hat: a tall rounded crown and a broad drooping brim.
    const crown = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.26, 16), mat(color));
    crown.position.y = 0.24;
    const brim = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.12, 20, 1, true), mat(shade(color, 0.92)));
    brim.position.y = 0.14;
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.165, 0.02, 6, 16), mat(shade(color, 0.7)));
    band.rotation.x = Math.PI / 2;
    band.position.y = 0.16;
    g.add(crown, brim, band);
    return g;
  }
  if (style === 'hood') {
    // A soft cloth hood: a dome that wraps a little lower around the head.
    const hood = new THREE.Mesh(
      new THREE.SphereGeometry(0.31, 16, 14, 0, Math.PI * 2, 0, Math.PI * 0.62), mat(color));
    hood.scale.set(1.02, 1, 1.05);
    hood.position.y = 0.06;
    g.add(hood);
    return g;
  }
  if (style === 'closed') {
    // Closed great helm: a full dome over the head with a raised comb ridge, a
    // cruciform vision/breath sight and a riveted brow band so it reads as a
    // proper enclosed knight's helm, not a plain ball.
    const steelM = mat(shade(color, 0.85));
    const helm = new THREE.Mesh(new THREE.SphereGeometry(0.305, 16, 14), mat(color));
    helm.scale.set(1, 1.05, 1.02);
    helm.position.y = 0.0;
    g.add(helm);
    // raised comb running front-to-back over the crown
    const comb = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.07, 0.5), steelM);
    comb.position.set(0, 0.22, 0); g.add(comb);
    // horizontal vision slit + vertical breath slot (cruciform sight)
    const hslit = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.03, 0.05), mat(0x1a1a1a));
    hslit.position.set(0, 0.02, 0.27); g.add(hslit);
    const vslit = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.18, 0.05), mat(0x1a1a1a));
    vslit.position.set(0, -0.08, 0.27); g.add(vslit);
    // riveted brow band
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.022, 6, 20), steelM);
    band.rotation.x = Math.PI / 2; band.position.y = 0.08; g.add(band);
    return g;
  }
  if (style === 'crown') {
    // An open cap crowned with a golden circlet of points + gems.
    buildOpenDome(g, color, steel);
    const gold = metalMat(0xf1c40f);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.292, 0.302, 0.06, 18, 1, true), gold);
    band.position.y = 0.13; g.add(band);
    const gemMat = new THREE.MeshStandardMaterial({ color: 0xe23b6b, emissive: 0xe23b6b, emissiveIntensity: 0.4, roughness: 0.3 });
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const pt = new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.1, 5), gold);
      pt.position.set(Math.sin(a) * 0.29, 0.21, Math.cos(a) * 0.29); g.add(pt);
      const gem = new THREE.Mesh(new THREE.IcosahedronGeometry(0.02, 0), gemMat);
      gem.position.set(Math.sin(a) * 0.29, 0.16, Math.cos(a) * 0.29); g.add(gem);
    }
    return g;
  }
  if (style === 'horned') {
    // Open helm with a pair of curved horns sweeping up and out.
    buildOpenDome(g, color, steel);
    const horn = new THREE.TorusGeometry(0.11, 0.022, 6, 10, Math.PI * 0.8);
    for (const s of [-1, 1]) {
      const h = new THREE.Mesh(horn, mat(0xeae3d6));
      h.position.set(0.18 * s, 0.18, -0.02);
      h.rotation.z = s > 0 ? -0.6 : Math.PI + 0.6;
      g.add(h);
    }
    return g;
  }

  // Open helmet (and 'half'): a dome that rests on top, lifted so it never
  // covers the eyes. 'half' adds a nose guard for a sterner look.
  buildOpenDome(g, color, steel);
  if (style === 'half') {
    const noseGuard = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.18, 0.05), steel);
    noseGuard.position.set(0, 0.0, 0.27);
    g.add(noseGuard);
  }
  return g;
}

function buildOpenDome(g, color, steel) {
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(0.29, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.42), mat(color));
  dome.scale.set(1, 0.95, 1.02);
  dome.position.y = 0.12;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.275, 0.028, 6, 18), steel);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.12;
  g.add(dome, rim);
  // A low comb ridge over the crown so the open cap has a bit of profile, plus a
  // small finial knob at the peak.
  const comb = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.05, 0.36), steel);
  comb.position.set(0, 0.25, 0);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.028, 10, 8), steel);
  knob.position.set(0, 0.3, -0.1);
  g.add(comb, knob);
}

// Plate-tier armor reads as metal/scale/dragon plate, not soft cloth. Those get
// a worn overlay (pauldrons + breastplate); cloth, leather, studded and robes
// stay a flat recolour so light armor keeps the simple rounded silhouette.
const SOFT_ARMOR = /cloth|leather|studded|robe/;
function isPlateArmor(item) {
  return !SOFT_ARMOR.test(item.baseId || '');
}

// Worn chest armor: rounded pauldrons over each shoulder, a domed breastplate
// and a belt line. Anchored at chestArmor (y≈0.95) which sits over the torso.
// Tinted to the armor's colour so dragon/golden/steel plate all read distinct.
function buildArmorMesh(color, female) {
  const g = new THREE.Group();
  const plate = metalMat(color);
  const trim = metalMat(shade(color, 0.78));
  const gold = metalMat(0xc8a24a);
  // Breastplate: a slightly flattened dome hugging the front of the (tapered)
  // torso. The female chest is narrower, so it's pulled in a touch in X/Z.
  const chest = new THREE.Mesh(new THREE.SphereGeometry(female ? 0.235 : 0.255, 16, 14), plate);
  chest.scale.set(female ? 0.96 : 1, 0.64, 0.78);
  chest.position.set(0, 0.06, 0.04);
  g.add(chest);
  // Defined pectoral swells so the plate reads as fitted, not a smooth shell.
  for (const s of [-1, 1]) {
    const pec = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), plate);
    pec.scale.set(0.9, 0.7, 0.5);
    pec.position.set((female ? 0.06 : 0.08) * s, 0.13, 0.18);
    g.add(pec);
  }
  // A central ridge with a small gem boss for definition.
  const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.34, 0.03), trim);
  ridge.position.set(0, 0.04, 0.2);
  g.add(ridge);
  const boss = new THREE.Mesh(new THREE.IcosahedronGeometry(0.025, 0), gold);
  boss.position.set(0, 0.13, 0.22);
  g.add(boss);
  // Fauld plates (skirt of the cuirass) sweeping under the waist.
  for (let i = 0; i < 2; i++) {
    const f = new THREE.Mesh(new THREE.CylinderGeometry((female ? 0.18 : 0.2) - i * 0.02, (female ? 0.16 : 0.18) - i * 0.02, 0.06, 16, 1, true, -0.6, 1.2), plate);
    f.position.set(0, -0.13 - i * 0.06, 0.05);
    g.add(f);
  }
  // Pauldrons capping each shoulder, with a rounded rim cap. The shoulder pivots
  // were pulled inward in the reshape (char.js: male 0.3, female 0.265), so the
  // pads track those (plus a hair outboard so the cap sits over the deltoid, not
  // inside it) instead of the old wider 0.315/0.275 that now floats off the arm.
  const shoulderX = female ? 0.27 : 0.305;
  for (const s of [-1, 1]) {
    const pad = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), plate);
    pad.scale.set(1, 0.7, 1);
    pad.position.set(shoulderX * s, 0.22, 0);
    g.add(pad);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), trim);
    cap.position.set(shoulderX * s, 0.28, 0);
    g.add(cap);
  }
  // Belt line at the waist.
  const belt = new THREE.Mesh(new THREE.TorusGeometry(female ? 0.225 : 0.235, 0.03, 6, 18), gold);
  belt.rotation.x = Math.PI / 2;
  belt.position.y = -0.26;
  belt.scale.set(1, 1, 0.85);
  g.add(belt);
  return g;
}

// A small soft pouch worn on the back (the "bag" container). Smaller and
// rounder than the framed backpack so the two read differently. Tinted by the
// container's colour; a star bag gets a glowing star decal on the flap.
function buildBagMesh(color, opts = {}) {
  const g = new THREE.Group();
  // Raised so the pouch rides high on the upper back, not the lower spine.
  const pouch = new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 12), mat(color));
  pouch.scale.set(1.05, 1.1, 0.72);
  pouch.position.set(0, 0.13, -0.25);
  g.add(pouch);
  // A cinched neck + drawstring at the top so it reads as a soft sack, not a ball.
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.06, 12), mat(shade(color, 0.88)));
  neck.position.set(0, 0.27, -0.25); neck.scale.z = 0.72; g.add(neck);
  const cinch = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.012, 6, 16), mat(shade(color, 0.6)));
  cinch.rotation.x = Math.PI / 2; cinch.position.set(0, 0.28, -0.25); cinch.scale.z = 0.72; g.add(cinch);
  const flap = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), mat(shade(color, 0.82)));
  flap.scale.set(1.06, 0.72, 0.74);
  flap.position.set(0, 0.22, -0.25);
  g.add(flap);
  // Shoulder straps run up over the top of the back toward the shoulders.
  const strap = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.36, 0.04), mat(shade(color, 0.7)));
  strap.position.set(0.1, 0.18, -0.12);
  const strap2 = strap.clone();
  strap2.position.x = -0.1;
  g.add(strap, strap2);
  if (opts.star) addBagStar(g, 0.13, -0.18);
  return g;
}

// A small glowing five-point star decal sitting just proud of the bag's back
// face (−Z is the outward/back direction). Used to mark a "star bag".
function addBagStar(g, y, z) {
  const starMat = new THREE.MeshStandardMaterial({ color: 0xffe27a, emissive: 0xffcc33, emissiveIntensity: 0.85, roughness: 0.25 });
  const star = new THREE.Group();
  // Five tapered rays fanned around the center make a clean star shape.
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    const ray = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.075, 4), starMat);
    ray.position.set(Math.cos(a) * 0.035, Math.sin(a) * 0.035, 0);
    // Point each ray outward from the centre (the cone's +Y becomes the radial dir).
    ray.rotation.z = a - Math.PI / 2;
    star.add(ray);
  }
  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.012, 5), starMat);
  core.rotation.x = Math.PI / 2;
  star.add(core);
  star.position.set(0, y, z);
  star.rotation.y = Math.PI;       // face the star out the back of the pack (−Z)
  g.add(star);
}

// A pendant: a short chain loop and a gem hanging at the base of the neck.
function buildAmuletMesh(color) {
  const g = new THREE.Group();
  // chestArmor sits at y≈0.95; the neck/collar is around local +0.34. Hang the
  // chain around the neck and let the gem rest just below the collarbone — not
  // floating in the middle of the chest.
  const chain = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.01, 6, 20, Math.PI * 1.5), mat(0xd9c46a));
  chain.rotation.x = Math.PI / 2;
  chain.rotation.z = Math.PI;
  chain.position.set(0, 0.4, 0.12);
  const gem = new THREE.Mesh(new THREE.IcosahedronGeometry(0.045, 0),
    new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.35, roughness: 0.3, metalness: 0.3 }));
  gem.position.set(0, 0.31, 0.2);
  // a little gold bezel around the gem so it reads as a real pendant
  const bezel = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.008, 6, 14), metalMat(0xd9c46a));
  bezel.position.set(0, 0.31, 0.2);
  g.add(chain, gem, bezel);
  return g;
}

// Per-foot boot overlay. The boot group sits at the ankle (foot mesh ~0.07 box
// in front). `side` is -1 (left) / +1 (right) so wings/spurs mirror. Returns a
// Group to add onto the boot, or null for plain boots (just the tint).
function buildBootOverlay(id, color, side) {
  const g = new THREE.Group();
  const accent = metalMat(0xd9c46a);
  // WINGED boots: a pair of feathered wings on the outer ankle (Hermes/winged).
  if (/winged|hermes|swift|fast|soft/.test(id)) {
    const wingMat = new THREE.MeshStandardMaterial({ color: 0xf2f6ff, emissive: 0x88aaff, emissiveIntensity: 0.3, roughness: 0.4 });
    const wing = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const f = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.12 - i * 0.02, 5), wingMat);
      f.position.set(0, 0.04 + i * 0.02, -0.02 - i * 0.03);
      f.rotation.x = -1.4; f.rotation.z = 0.2;
      wing.add(f);
    }
    wing.position.set(side * 0.09, 0.06, 0);
    wing.rotation.y = side < 0 ? 0.4 : -0.4;
    g.add(wing);
    // a small gold ankle band
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.012, 6, 14), accent);
    band.rotation.x = Math.PI / 2; band.position.y = 0.04;
    g.add(band);
    return g;
  }
  // DRAGON / DEMON boots: clawed toes + a scaly cuff in the boot colour.
  if (/dragon|demon/.test(id)) {
    const dark = mat(shade(color, 0.7));
    for (let i = -1; i <= 1; i++) {
      const claw = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.06, 5), mat(0xeae2cc));
      claw.position.set(i * 0.03, -0.02, 0.11); claw.rotation.x = 1.7;
      g.add(claw);
    }
    const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.02, 6, 14), dark);
    cuff.rotation.x = Math.PI / 2; cuff.position.y = 0.06;
    g.add(cuff);
    if (/demon/.test(id)) {  // demon boots get a little spur spike
      const spur = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.07, 5), mat(0x1a0a0a));
      spur.position.set(side * 0.08, 0.05, -0.04); spur.rotation.z = side * 1.3;
      g.add(spur);
    }
    return g;
  }
  // PLATE / KNIGHT / GUARDIAN / CELESTIAL boots: a metal cuff + a toe cap.
  if (/plate|knight|guardian|steel|celestial|frost|glacial/.test(id)) {
    const metalC = metalMat(shade(color, 1.05));
    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.082, 0.09, 0.07, 12), metalC);
    cuff.position.y = 0.06; g.add(cuff);
    const toe = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), metalC);
    toe.scale.set(1, 0.7, 1.3); toe.position.set(0, -0.02, 0.06); g.add(toe);
    return g;
  }
  return null;   // plain boots: tint only
}

// The worn BACKPACK: a full, framed travel pack that occupies most of the back
// (shoulder blades down to the waist) so it reads as a real rucksack, not a
// little box. Tinted to the container colour; a star bag gets a glowing star on
// the flap. The body is built from a couple of stacked rounded slabs so the
// silhouette bulges with packed gear instead of being a flat board.
function buildBackpackMesh(color, opts = {}) {
  const g = new THREE.Group();
  const cloth = mat(color);
  const dark = mat(shade(color, 0.78));
  const darker = mat(shade(color, 0.62));
  // MAIN BODY — taller, wider and a touch deeper than before, so it spans the
  // back. Centered a little lower so the bulk sits between the shoulder blades
  // and the small of the back. The faces are rounded (a fat capsule-ish slab).
  const main = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.46, 0.2), cloth);
  main.position.set(0, 0.1, -0.3);
  g.add(main);
  // A bulging packed-gear roll on top, swelling above the body.
  const bulge = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 12), cloth);
  bulge.scale.set(0.95, 0.62, 0.62); bulge.position.set(0, 0.32, -0.3);
  g.add(bulge);
  // Rounded bottom so the base isn't a hard edge.
  const base = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 12), dark);
  base.scale.set(0.95, 0.5, 0.6); base.position.set(0, -0.12, -0.3);
  g.add(base);
  // TOP FLAP folding over the roll, hanging down the back face (−Z).
  const flap = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.22, 0.05), dark);
  flap.position.set(0, 0.28, -0.41); flap.rotation.x = -0.12;
  g.add(flap);
  // Buckled strap + buckle holding the flap down.
  const flapStrap = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.2, 0.02), darker);
  flapStrap.position.set(0, 0.22, -0.42);
  const buckle = new THREE.Mesh(new THREE.TorusGeometry(0.032, 0.011, 6, 14), metalMat(0xc8a24a));
  buckle.position.set(0, 0.14, -0.42); buckle.rotation.x = Math.PI / 2;
  g.add(flapStrap, buckle);
  // SIDE POCKETS bulging off each flank.
  for (const s of [-1, 1]) {
    const pkt = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.22, 0.13), dark);
    pkt.position.set(s * 0.2, 0.04, -0.3);
    g.add(pkt);
    const pflap = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.07, 0.14), darker);
    pflap.position.set(s * 0.2, 0.16, -0.3);
    g.add(pflap);
  }
  // A rolled bedroll lashed across the bottom of the pack.
  const bedroll = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.34, 12), mat(shade(color, 1.15)));
  bedroll.rotation.z = Math.PI / 2; bedroll.position.set(0, -0.16, -0.42);
  g.add(bedroll);
  // SHOULDER STRAPS running up over the back toward the shoulders.
  for (const s of [-1, 1]) {
    const strap = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.42, 0.04), darker);
    strap.position.set(s * 0.13, 0.18, -0.1);
    g.add(strap);
  }
  // Stitched seam line down the centre of the body.
  for (let i = 0; i < 6; i++) {
    const st = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.018, 0.01), mat(shade(color, 1.35)));
    st.position.set(0, -0.02 + i * 0.05, -0.41);
    g.add(st);
  }
  if (opts.star) addBagStar(g, 0.06, -0.43);
  return g;
}

function shade(hex, f) {
  const c = new THREE.Color(hex);
  return c.multiplyScalar(f).getHex();
}

function disposeTree(obj) {
  obj.traverse((c) => {
    if (c.geometry) c.geometry.dispose();
    if (c.material) c.material.dispose();
  });
}
