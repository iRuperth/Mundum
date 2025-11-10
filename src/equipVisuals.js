import * as THREE from 'three';
import { wandColorForLevel } from './data/items.js';

// Builds and attaches visible weapons, shield and worn armor onto a character.
// Anchors come from character.parts (armR.hand, helmet, chestArmor, body...).
export class EquipVisuals {
  constructor(char) {
    this.char = char;
    this.weaponMesh = null;
    this.shieldMesh = null;
    this.helmetMesh = null;
    this.bagMesh = null;
    this.armorTintActive = false;
    this._origColors = {
      shirt: char.mats.shirt.color.clone(),
      pants: char.mats.pants.color.clone(),
    };
  }

  refresh(equip, level) {
    this.setWeapon(equip.weapon, level);
    this.setShield(equip.shield);
    this.setHelmet(equip.helmet);
    this.setArmor(equip.armor);
    this.setLegs(equip.legs);
    this.setBoots(equip.boots);
    this.setBag(equip.bag);
  }

  // A backpack worn on the back, Minecraft-style, so it shows in third person.
  setBag(item) {
    if (this.bagMesh) { this.char.parts.body.remove(this.bagMesh); disposeTree(this.bagMesh); this.bagMesh = null; }
    if (!item) return;
    this.bagMesh = buildBackpackMesh(item.color || 0x8a5a2b);
    this.char.parts.body.add(this.bagMesh);
  }

  setWeapon(item, level) {
    if (this.weaponMesh) { this.char.parts.armR.hand.remove(this.weaponMesh); disposeTree(this.weaponMesh); this.weaponMesh = null; }
    if (!item) return;
    const color = item.type === 'wand' ? wandColorForLevel(level) : (item.color || 0xb0b0b0);
    this.weaponMesh = buildWeaponMesh(item.type, color);
    this.char.parts.armR.hand.add(this.weaponMesh);
  }

  setShield(item) {
    if (this.shieldMesh) { this.char.parts.armL.hand.remove(this.shieldMesh); disposeTree(this.shieldMesh); this.shieldMesh = null; }
    if (!item) return;
    this.shieldMesh = buildShieldMesh(item.color || 0x8a5a2b);
    this.char.parts.armL.hand.add(this.shieldMesh);
  }

  setHelmet(item) {
    if (this.helmetMesh) { this.char.parts.helmet.remove(this.helmetMesh); disposeTree(this.helmetMesh); this.helmetMesh = null; }
    if (!item) return;
    this.helmetMesh = buildHelmetMesh(item.color || 0x9aa0a6);
    this.char.parts.helmet.add(this.helmetMesh);
  }

  setArmor(item) {
    if (item) this.char.mats.shirt.color.set(item.color || 0x9aa0a6);
    else this.char.mats.shirt.color.copy(this._origColors.shirt);
  }

  setLegs(item) {
    if (item) this.char.mats.pants.color.set(item.color || 0x6a6f74);
    else this.char.mats.pants.color.copy(this._origColors.pants);
  }

  setBoots(item) {
    const c = item ? (item.color || 0x4a3526) : 0x4a3526;
    this.char.mats.boots.color.set(c);
  }

  // Call when the player changes their base clothing colors in creation.
  setBaseColors(colors) {
    this._origColors.shirt.set(colors.shirt);
    this._origColors.pants.set(colors.pants);
  }

  triggerSwing() { this.char.triggerAttack(); }
}

function mat(color) { return new THREE.MeshLambertMaterial({ color }); }

export function buildWeaponMesh(type, color) {
  const g = new THREE.Group();
  if (type === 'bow') {
    const arc = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.022, 6, 16, Math.PI * 1.3), mat(0x6a4a2a));
    arc.rotation.z = Math.PI / 2;
    g.add(arc);
    const string = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.46, 4), mat(0xdddddd));
    g.add(string);
    g.rotation.x = Math.PI / 2;
    return g;
  }
  if (type === 'wand') {
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.42, 6), mat(0x5a3a22));
    stick.position.y = 0.18;
    g.add(stick);
    const gem = new THREE.Mesh(new THREE.IcosahedronGeometry(0.055, 0), mat(color));
    gem.position.y = 0.4;
    const glow = new THREE.PointLight(color, 6, 2.2);
    glow.position.y = 0.4;
    g.add(gem, glow);
    return g;
  }
  if (type === 'axe') {
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.62, 6), mat(0x5a3a22));
    handle.position.y = 0.18;
    g.add(handle);
    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.08, 0.05, 12, 1, false, 0, Math.PI), mat(color));
    head.rotation.z = Math.PI / 2;
    head.position.set(0.06, 0.42, 0);
    g.add(head);
    return g;
  }
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.5, 0.012), mat(color));
  blade.position.y = 0.34;
  const guard = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.04, 0.05), mat(0x4a3526));
  guard.position.y = 0.1;
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.14, 6), mat(0x2a1a10));
  grip.position.y = 0.02;
  g.add(blade, guard, grip);
  return g;
}

function buildShieldMesh(color) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.18, 0.04, 12), mat(color));
  body.rotation.x = Math.PI / 2;
  const boss = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), mat(0xdcdcdc));
  boss.position.z = 0.03;
  g.add(body, boss);
  g.rotation.y = Math.PI / 2;
  g.position.set(-0.05, 0, 0);
  return g;
}

function buildHelmetMesh(color) {
  const g = new THREE.Group();
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(0.29, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.62), mat(color));
  dome.scale.set(1, 1, 1.02);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.025, 6, 18), mat(0xb8bcc0));
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.02;
  g.add(dome, rim);
  return g;
}

function buildBackpackMesh(color) {
  const g = new THREE.Group();
  const pack = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.36, 0.16), mat(color));
  pack.position.set(0, -0.04, -0.26);
  const flap = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.14, 0.04), mat(shade(color, 0.8)));
  flap.position.set(0, 0.08, -0.34);
  const strapL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.34, 0.04), mat(shade(color, 0.7)));
  strapL.position.set(-0.12, 0, -0.12);
  const strapR = strapL.clone();
  strapR.position.x = 0.12;
  g.add(pack, flap, strapL, strapR);
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
