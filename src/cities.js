import * as THREE from 'three';
import { WEAPONS, ARMORS, CONTAINERS } from './data/items.js';
import { WATER_LEVEL } from './world.js';

// A prop counts as "on dry land" only this far above the waterline, so nothing
// sits in the shallows.
const DRY_MARGIN = 0.8;

// Fixed city layout. Nominal positions are deterministic; each is then snapped
// to the nearest flat grassland so cities never sit underwater. Every city has
// a temple (spawn and respawn point), a shop, a depot and a teleport portal.
export const CITIES = [
  { id: 'rivertown', name: 'Rivertown', x: 0, z: 0 },
  { id: 'oakvale', name: 'Oakvale', x: 360, z: 200 },
  { id: 'stonehaven', name: 'Stonehaven', x: -300, z: 340 },
  { id: 'dragonreach', name: 'Dragonreach', x: 180, z: -420 },
];

const CITY_RADIUS = 26;
const TEMPLE_RADIUS = 5;
const SHOP_RADIUS = 4;
const DEPOT_RADIUS = 4;
const PORTAL_RADIUS = 3.5;

let citiesPlaced = false;

export function placeCities(world) {
  if (citiesPlaced) return;
  citiesPlaced = true;
  for (const c of CITIES) {
    const spot = findLand(world, c.x, c.z);
    c.x = spot.x; c.z = spot.z;
  }
}

function findLand(world, ox, oz) {
  for (let r = 0; r < 2000; r += 24) {
    const steps = Math.max(1, Math.floor(r / 24) * 6);
    for (let i = 0; i < steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      const x = Math.round(ox + Math.cos(a) * r);
      const z = Math.round(oz + Math.sin(a) * r);
      const h = world.heightAt(x, z);
      if (h < 1.5 || h > 12) continue;
      const slope = Math.abs(world.heightAt(x + 3, z) - h) + Math.abs(world.heightAt(x, z + 3) - h);
      if (slope < 1.2) return { x, z };
    }
  }
  return { x: ox, z: oz };
}

// Pull a prop position toward the city center until it sits on dry land, so a
// house/shop/portal that nominally lands in the water gets nudged back ashore.
function liftToLand(world, cx, cz, x, z) {
  let px = x, pz = z;
  for (let i = 0; i < 12; i++) {
    if (world.heightAt(px, pz) >= WATER_LEVEL + DRY_MARGIN) break;
    px += (cx - px) * 0.2;
    pz += (cz - pz) * 0.2;
  }
  return { x: px, z: pz };
}

export function shopStock() {
  const weapons = WEAPONS.filter((w) => w.shopTier === 'shop');
  const armors = ARMORS.filter((a) => a.shopTier === 'shop');
  return [...weapons, ...armors, ...CONTAINERS];
}

export function cityAt(x, z) {
  for (const c of CITIES) {
    if (Math.hypot(c.x - x, c.z - z) < CITY_RADIUS) return c;
  }
  return null;
}

export function nearestCity(x, z) {
  let best = CITIES[0], bd = Infinity;
  for (const c of CITIES) {
    const d = Math.hypot(c.x - x, c.z - z);
    if (d < bd) { bd = d; best = c; }
  }
  return best;
}

// The temple is the city center: it is where players spawn and respawn.
export function templePos(city) {
  return { x: city.x, z: city.z };
}

export function buildCities(scene, world) {
  const group = new THREE.Group();
  const matWall = new THREE.MeshLambertMaterial({ color: 0xcdb892 });
  const matRoof = new THREE.MeshLambertMaterial({ color: 0xa0432f });
  const matShop = new THREE.MeshLambertMaterial({ color: 0xe0b441 });
  const matDepot = new THREE.MeshLambertMaterial({ color: 0x6a4a2a });
  const matStone = new THREE.MeshLambertMaterial({ color: 0x9a9488 });
  const matTemple = new THREE.MeshLambertMaterial({ color: 0xe8e2d0 });
  const matPortal = new THREE.MeshBasicMaterial({ color: 0x7e5bef });

  const props = [];
  const portals = [];
  for (const c of CITIES) {
    const flat = world.heightAt(c.x, c.z);

    const plaza = new THREE.Mesh(new THREE.CylinderGeometry(CITY_RADIUS, CITY_RADIUS, 0.3, 24), matStone);
    plaza.position.set(c.x, flat - 0.1, c.z);
    group.add(plaza);

    buildTemple(group, c.x, c.z, flat, matTemple, matStone);

    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const house = liftToLand(world, c.x, c.z, c.x + Math.cos(a) * 18, c.z + Math.sin(a) * 18);
      const hx = house.x, hz = house.z;
      const hy = world.heightAt(hx, hz);
      const wall = new THREE.Mesh(new THREE.BoxGeometry(4, 3, 4), matWall);
      wall.position.set(hx, hy + 1.5, hz);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(3.2, 2, 4), matRoof);
      roof.position.set(hx, hy + 4, hz);
      roof.rotation.y = Math.PI / 4;
      group.add(wall, roof);
    }

    const shopPos = liftToLand(world, c.x, c.z, c.x + 9, c.z);
    const shopY = world.heightAt(shopPos.x, shopPos.z);
    const shopMesh = new THREE.Mesh(new THREE.BoxGeometry(3, 2.4, 3), matShop);
    shopMesh.position.set(shopPos.x, shopY + 1.2, shopPos.z);
    const shopRoof = new THREE.Mesh(new THREE.ConeGeometry(2.6, 1.6, 4), matRoof);
    shopRoof.position.set(shopPos.x, shopY + 3.2, shopPos.z);
    shopRoof.rotation.y = Math.PI / 4;
    group.add(shopMesh, shopRoof);

    const depotPos = liftToLand(world, c.x, c.z, c.x - 9, c.z);
    const depotY = world.heightAt(depotPos.x, depotPos.z);
    const depotMesh = new THREE.Mesh(new THREE.BoxGeometry(2, 1.4, 1.4), matDepot);
    depotMesh.position.set(depotPos.x, depotY + 0.7, depotPos.z);
    group.add(depotMesh);

    const portalPos = liftToLand(world, c.x, c.z, c.x, c.z + 11);
    const portalY = world.heightAt(portalPos.x, portalPos.z);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.3, 8, 18), matPortal);
    ring.position.set(portalPos.x, portalY + 1.6, portalPos.z);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(1.2, 18),
      new THREE.MeshBasicMaterial({ color: 0xb89bff, transparent: true, opacity: 0.6, side: THREE.DoubleSide }));
    disc.position.set(portalPos.x, portalY + 1.6, portalPos.z);
    group.add(ring, disc);
    portals.push({ city: c, mesh: ring });

    props.push({ city: c, temple: templePos(c), shop: shopPos, depot: depotPos, portal: portalPos });
  }
  scene.add(group);
  return { group, props, portals };
}

// A small marble temple at the city center: stepped base, pillars and a roof.
function buildTemple(group, cx, cz, flat, matTemple, matStone) {
  const base = new THREE.Mesh(new THREE.CylinderGeometry(5, 5.5, 0.8, 16), matStone);
  base.position.set(cx, flat + 0.4, cz);
  group.add(base);
  const floor = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.2, 0.4, 16), matTemple);
  floor.position.set(cx, flat + 0.9, cz);
  group.add(floor);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const px = cx + Math.cos(a) * 3.4;
    const pz = cz + Math.sin(a) * 3.4;
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 4, 8), matTemple);
    pillar.position.set(px, flat + 3, pz);
    group.add(pillar);
  }
  const roof = new THREE.Mesh(new THREE.ConeGeometry(5, 2.4, 16), matTemple);
  roof.position.set(cx, flat + 6.2, cz);
  group.add(roof);
}

// Returns the interactable kind the player stands on, or null.
export function interactableAt(props, x, z) {
  for (const p of props) {
    if (Math.hypot(p.shop.x - x, p.shop.z - z) < SHOP_RADIUS) return { kind: 'shop', city: p.city };
    if (Math.hypot(p.depot.x - x, p.depot.z - z) < DEPOT_RADIUS) return { kind: 'depot', city: p.city };
    if (Math.hypot(p.portal.x - x, p.portal.z - z) < PORTAL_RADIUS) return { kind: 'portal', city: p.city };
  }
  return null;
}
