import * as THREE from 'three';
// Master "turn any item into a 3D object" builder, for showing items POSED on
// house/collector walls (and anywhere we want a real 3D item instead of a flat
// icon). Reuses every existing builder: weapons/shields/bows from equipVisuals,
// armor/helmet/legs/amulet detail meshes from equipDetail, potions/containers
// from itemMeshes. Importing equipVisuals first wires the equipDetail helpers.
import { buildWeaponMesh, buildShieldMesh, buildBowMesh, buildCrossbowMesh } from './equipVisuals.js';
import { HELMET_BUILDERS, ARMOR_BUILDERS, LEGS_BUILDERS, AMULET_BUILDERS } from './equipDetail.js';
import { buildPotionMesh, buildContainerMesh } from './itemMeshes.js';
import { getArmor, getWeapon, getContainer, getPotion } from './data/items.js';

function metalMat(c) { return new THREE.MeshStandardMaterial({ color: c, metalness: 0.8, roughness: 0.4 }); }
function lambert(c) { return new THREE.MeshLambertMaterial({ color: c }); }

// A simple faceted gem (rings, gemstones, raw crystals) — colored by the item.
function buildGemMesh(color) {
  const g = new THREE.Group();
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.13, 0),
    new THREE.MeshStandardMaterial({ color: color || 0x49c7ff, emissive: color || 0x49c7ff, emissiveIntensity: 0.35, roughness: 0.2, metalness: 0.3 }));
  g.add(gem);
  return g;
}

// A ring: a gold band with a gem set on top (slot 'ring').
function buildRingMesh(color) {
  const g = new THREE.Group();
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.025, 10, 22), metalMat(0xd9b73a));
  band.rotation.x = Math.PI / 2; g.add(band);
  const gem = new THREE.Mesh(new THREE.IcosahedronGeometry(0.05, 0),
    new THREE.MeshStandardMaterial({ color: color || 0x49c7ff, emissive: color || 0x2a90c0, emissiveIntensity: 0.4, roughness: 0.2 }));
  gem.position.y = 0.1; g.add(gem);
  return g;
}

// A boots pair (slot 'boots') — two simple boots side by side.
function buildBootsMesh(color) {
  const g = new THREE.Group();
  for (const s of [-1, 1]) {
    const boot = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.18, 10), metalMat(color || 0x7a5230));
    shaft.position.y = 0.09; boot.add(shaft);
    const foot = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), metalMat(color || 0x7a5230));
    foot.scale.set(1, 0.7, 1.7); foot.position.set(0, 0, 0.05); boot.add(foot);
    boot.position.x = s * 0.09;
    g.add(boot);
  }
  return g;
}

// A small STACK OF COINS in the coin's metal colour, so money on a wall reads as
// a little pile of coins rather than a generic gem.
function buildCoinMesh(color) {
  const g = new THREE.Group();
  const c = color || 0xf1c40f;
  const disc = () => new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.025, 18), metalMat(c));
  // a leaning stack of four coins
  const ys = [-0.03, 0.0, 0.03, 0.06];
  const offs = [[0, 0], [0.01, 0.008], [-0.008, 0.012], [0.006, -0.006]];
  ys.forEach((y, i) => {
    const d = disc();
    d.position.set(offs[i][0], y, offs[i][1]);
    d.rotation.set(0.04 * (i - 1.5), 0, 0.03 * (i - 1.5));
    g.add(d);
  });
  // one coin standing on edge, leaning against the stack
  const edge = disc();
  edge.rotation.z = Math.PI / 2 - 0.3;
  edge.position.set(0.12, 0.0, 0.0);
  g.add(edge);
  return g;
}

// Map a trophy `family` to a coarse SHAPE so each creature remain reads as a real
// object (a fang, a horn, a bone, a scale…) instead of one identical diamond.
function trophyShape(family) {
  const f = String(family || '');
  if (/dragon|wyvern|hydra|serpent|lizardman|turtle|crab|beetle|crystal_dragon|golem/.test(f)) return 'scale';
  if (/wolf|tiger|boar|bear|kobold|shark|vampire|snake/.test(f)) return 'fang';
  if (/minotaur|demon|imp|deer|ogre/.test(f)) return 'horn';
  if (/skeleton|zombie|dwarf|troll/.test(f)) return 'bone';
  if (/chicken|harpy|fairy|bat|gargoyle|wasp|bee/.test(f)) return 'feather';
  if (/cyclops|ghost|wraith|elemental|mushroom|mandrake|slime|frog|jellyfish|spore/.test(f)) return 'orb';
  if (/scorpion|spider|elf|goblin|orc|kobold/.test(f)) return 'claw';
  return 'fang';
}

// Map a MATERIAL to a shape from its icon emoji + id — the most reliable signal
// across the 100+ crafting materials. So a hide reads as folded leather, a fang
// as a tooth, an ore as a rough chunk, a vial as a flask, a gem as a crystal —
// instead of every material being the same coloured diamond.
function materialShape(item) {
  const ic = item.icon || '';
  const id = String(item.baseId || item.id || '');
  // cloth / pelts / hides
  if (/🧵|🐑|🟫|🧷|🧶/.test(ic) || /silk|wool|hide|pelt|rags|cloth|fur/.test(id)) return 'cloth';
  // teeth / fangs / tusks / stings (all pointed spikes)
  if (/🦷|🐝|🦂/.test(ic) || /tooth|fang|tusk|tail|sting|stinger/.test(id)) return 'fang';
  // claws / talons
  if (/🐾|🦅/.test(ic) || /claw|talon/.test(id)) return 'claw';
  // horns / antlers
  if (/📯|😈|🦌/.test(ic) || /horn|antler/.test(id)) return 'horn';
  // bones / skulls
  if (/🦴|💀/.test(ic) || /\bbone\b|skull/.test(id)) return 'bone';
  // scales / shells / chitin / wings
  if (/🐉|🐲|🐚|🪲|🦇|🗿/.test(ic) || /scale|shell|chitin|fin|wing/.test(id)) return 'scale';
  // feathers
  if (/🪶/.test(ic) || /feather/.test(id)) return 'feather';
  // vials / potions / honey / jelly liquids
  if (/🧪|🍯/.test(ic) || /vial|gland|antidote|honey|jelly|jalea/.test(id)) return 'vial';
  // crystals / gems / shards
  if (/🔷|💠|💎/.test(ic) || /crystal|gem|shard|soul-gem/.test(id)) return 'gem';
  // glowing dusts / essences / fairy dust
  if (/✨|⚡|💧|🌋|🔥/.test(ic) || /dust|essence|core|magma|shard|spark/.test(id)) return 'orb';
  // ores / stone / rock / wood
  if (/🪨|🪵|🌳/.test(ic) || /ore|stone|rock|wood|bark|fragment/.test(id)) return 'rock';
  // crowns / keys / tomes / eyes / eggs → small distinctive objects
  if (/👑/.test(ic) || /crown/.test(id)) return 'crown';
  if (/🗝️|🔑/.test(ic) || /key/.test(id)) return 'key';
  if (/📕|📗|📘/.test(ic) || /tome|book/.test(id)) return 'tome';
  if (/🥚/.test(ic) || /\begg\b/.test(id)) return 'egg';
  if (/👁️|👁/.test(ic) || /eye/.test(id)) return 'orb';
  if (/🧀/.test(ic) || /cheese/.test(id)) return 'rock';
  if (/🟢|🟩|🍄/.test(ic) || /slime|jelly|spore|mushroom/.test(id)) return 'orb';
  if (/📦|🎁/.test(ic)) return 'crate';   // generic/unknown loot → a crate
  return 'gem';   // last resort — a faceted gem (fine for raw alchemical bits)
}

// One shape, built and tinted. Shared by trophies and materials so any remain or
// crafting scrap reads as a real little object on the wall.
function buildShapeMesh(shape, color) {
  const g = new THREE.Group();
  const c = color != null ? color : 0xcfc0a0;
  const m = lambert(c);
  const dark = lambert(shade(c, 0.7));
  switch (shape) {
    case 'fang': {            // a curved tooth/fang
      const fang = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.26, 10), m);
      fang.rotation.x = 0.25; g.add(fang);
      const root = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), dark);
      root.scale.set(1, 0.6, 1); root.position.y = -0.11; g.add(root);
      break;
    }
    case 'claw': {            // a hooked claw
      const claw = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.28, 8), m);
      claw.rotation.z = 0.5; claw.position.x = 0.02; g.add(claw);
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.1, 8), m);
      tip.rotation.z = 1.2; tip.position.set(0.1, 0.11, 0); g.add(tip);
      break;
    }
    case 'horn': {            // a sweeping horn
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.3, 10), m);
      horn.rotation.z = -0.4; g.add(horn);
      for (let i = 0; i < 3; i++) {       // ridge rings
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.05 - i * 0.012, 0.008, 6, 12), dark);
        ring.rotation.x = Math.PI / 2; ring.position.y = -0.08 + i * 0.07; ring.position.x = i * 0.02;
        g.add(ring);
      }
      break;
    }
    case 'bone': {            // a dog-bone
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.26, 10), m);
      g.add(shaft);
      for (const e of [-1, 1]) for (const s of [-1, 1]) {
        const knob = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), m);
        knob.position.set(s * 0.04, e * 0.13, 0); g.add(knob);
      }
      break;
    }
    case 'scale': {           // overlapping scales/plates
      for (let i = 0; i < 3; i++) {
        const sc = new THREE.Mesh(new THREE.SphereGeometry(0.1 - i * 0.018, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
          lambert(shade(c, 1 - i * 0.08)));
        sc.scale.set(1, 0.5, 1); sc.position.y = i * 0.05; g.add(sc);
      }
      break;
    }
    case 'feather': {         // a single feather/wing
      const quill = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.012, 0.3, 6), dark);
      g.add(quill);
      for (const s of [-1, 1]) {
        const vane = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), m);
        vane.scale.set(0.35, 1.2, 0.12); vane.position.set(s * 0.04, 0.02, 0);
        vane.rotation.z = s * 0.2; g.add(vane);
      }
      break;
    }
    case 'cloth': {           // a folded bolt of cloth / pelt
      const fold = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, 0.1), m);
      fold.rotation.z = 0.05; g.add(fold);
      const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.24, 12), lambert(shade(c, 1.1)));
      roll.rotation.z = Math.PI / 2; roll.position.y = 0.09; g.add(roll);
      const seam = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.01, 0.11), dark);
      seam.position.y = -0.03; g.add(seam);
      break;
    }
    case 'vial': {            // a little stoppered flask of liquid
      const glassMat = new THREE.MeshStandardMaterial({ color: shade(c, 1.4), transparent: true, opacity: 0.45, roughness: 0.1 });
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 12), glassMat);
      body.position.y = 0.08; g.add(body);
      const fill = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 10),
        new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.4, roughness: 0.3 }));
      fill.scale.set(1, 0.8, 1); fill.position.y = 0.07; g.add(fill);
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.1, 10), glassMat);
      neck.position.y = 0.2; g.add(neck);
      const cork = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.038, 0.05, 8), lambert(0x8a5a2a));
      cork.position.y = 0.26; g.add(cork);
      break;
    }
    case 'rock': {            // a rough ore/stone chunk (a low-poly nugget)
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.13, 0), lambert(c));
      rock.scale.set(1, 0.85, 0.9); g.add(rock);
      // a couple of ore veins / smaller nuggets
      for (let i = 0; i < 3; i++) {
        const a = i * 2.1;
        const v = new THREE.Mesh(new THREE.TetrahedronGeometry(0.04, 0), lambert(shade(c, 1.3)));
        v.position.set(Math.cos(a) * 0.09, Math.sin(a) * 0.06, 0.05); g.add(v);
      }
      break;
    }
    case 'gem': {             // a faceted crystal cluster
      const main = new THREE.Mesh(new THREE.OctahedronGeometry(0.12, 0),
        new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.3, roughness: 0.2, metalness: 0.3 }));
      g.add(main);
      for (const s of [-1, 1]) {
        const shard = new THREE.Mesh(new THREE.OctahedronGeometry(0.06, 0),
          new THREE.MeshStandardMaterial({ color: shade(c, 1.1), emissive: c, emissiveIntensity: 0.25, roughness: 0.2 }));
        shard.position.set(s * 0.1, -0.04, 0.02); shard.rotation.z = s * 0.4; g.add(shard);
      }
      break;
    }
    case 'crown': {           // a tiny crown
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.06, 14, 1, true), metalMat(shade(c, 1.1)));
      band.position.y = 0.04; g.add(band);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.07, 6), metalMat(shade(c, 1.1)));
        spike.position.set(Math.cos(a) * 0.1, 0.1, Math.sin(a) * 0.1); g.add(spike);
      }
      break;
    }
    case 'key': {             // a treasure key
      const bow = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.018, 8, 16), metalMat(c));
      bow.position.y = 0.1; g.add(bow);
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.22, 8), metalMat(c));
      shaft.position.y = -0.04; g.add(shaft);
      for (const y of [-0.12, -0.15]) {
        const bit = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.02, 0.02), metalMat(c));
        bit.position.set(0.03, y, 0); g.add(bit);
      }
      break;
    }
    case 'tome': {            // a closed book
      const cover = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.24, 0.05), lambert(c));
      g.add(cover);
      const pages = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.21, 0.045), lambert(0xefe6cf));
      pages.position.z = 0.004; g.add(pages);
      const spine = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.24, 0.06), lambert(shade(c, 0.7)));
      spine.position.x = -0.09; g.add(spine);
      break;
    }
    case 'egg': {             // a smooth egg
      const egg = new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 12), lambert(c));
      egg.scale.set(1, 1.3, 1); egg.position.y = 0.04; g.add(egg);
      break;
    }
    case 'crate': {           // a small wooden crate (generic/unknown loot)
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), lambert(c));
      g.add(box);
      for (const ax of ['x', 'y']) for (const s of [-1, 1]) {
        const slat = new THREE.Mesh(new THREE.BoxGeometry(ax === 'x' ? 0.21 : 0.03, ax === 'y' ? 0.21 : 0.03, 0.21), lambert(shade(c, 0.7)));
        slat.position[ax] = s * 0.08; g.add(slat);
      }
      break;
    }
    default: {                // 'orb' — a glowing essence/jelly blob
      const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.12, 0),
        new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.45, roughness: 0.3, metalness: 0.2 }));
      g.add(orb);
    }
  }
  return g;
}

// A 3D trophy keyed by its family shape, tinted to the trophy colour.
function buildTrophyMesh(color, family) {
  return buildShapeMesh(trophyShape(family), color != null ? color : 0xcfc0a0);
}

// A 3D crafting material keyed by its icon/id shape.
function buildMaterialMesh(item) {
  return buildShapeMesh(materialShape(item), item.color != null ? item.color : 0x9a8a6a);
}

// Darken/lighten a hex colour by `f` (×channel), clamped. Local copy so this
// module doesn't depend on equipVisuals' private helper.
function shade(hex, f) {
  const r = Math.min(255, Math.round(((hex >> 16) & 0xff) * f));
  const g = Math.min(255, Math.round(((hex >> 8) & 0xff) * f));
  const b = Math.min(255, Math.round((hex & 0xff) * f));
  return (r << 16) | (g << 8) | b;
}

// Resolve an item (a backpack instance OR a base def) into the data we need.
function resolve(item) {
  if (!item) return null;
  const baseId = item.baseId || item.id;
  const type = item.type || (item.slot ? null : null);
  const color = item.color != null ? item.color : 0x9aa0a6;
  return { baseId, type, color, slot: item.slot, kind: item.kind, item };
}

// Build a 3D THREE.Object3D for ANY item. Returns a Group, or null if the item
// has no sensible 3D form (it should always return something for real items).
export function buildItemMesh(item) {
  const r = resolve(item);
  if (!r) return null;
  const { baseId, type, color, slot, kind } = r;

  // Weapons (held types) — reuse the viewmodel builders.
  if (type === 'bow') return buildBowMesh(color, true);
  if (type === 'crossbow') return buildCrossbowMesh(color, true);
  if (type && ['sword', 'axe', 'mace', 'club', 'lance', 'wand'].includes(type)) {
    return buildWeaponMesh(type, color, { id: baseId, element: item.element, levelReq: item.levelReq || 1, twoHanded: item.twoHanded });
  }
  if (type === 'shield' || slot === 'shield') {
    return buildShieldMesh(color, baseId || '', { element: item.element, levelReq: item.levelReq || 1 });
  }

  // Armor pieces — the detailed equip breastplates/helms/greaves.
  if (slot === 'armor') return (ARMOR_BUILDERS[baseId] || ARMOR_BUILDERS.steel_armor || (() => fallbackArmor(color)))(color);
  if (slot === 'helmet') return (HELMET_BUILDERS[baseId] || (() => fallbackHelm(color)))(color);
  if (slot === 'legs') return (LEGS_BUILDERS[baseId] || (() => fallbackLegs(color)))(color);
  if (slot === 'amulet') return (AMULET_BUILDERS[baseId] || (() => buildGemMesh(color)))(color);
  if (slot === 'ring') return buildRingMesh(color);
  if (slot === 'boots') return buildBootsMesh(color);

  // Consumables & containers.
  if (kind === 'potion' || type === 'potion') {
    const def = getPotion(baseId) || item;
    return buildPotionMesh(def);
  }
  if (kind === 'container' || slot === 'bag' || type === 'container') {
    const def = getContainer(baseId) || item;
    return buildContainerMesh(def);
  }

  // Money — a little stack of coins in the coin's metal colour.
  if (kind === 'coin' || type === 'coin') return buildCoinMesh(color);

  // Creature trophies/remains — a fang / horn / bone / scale… by family.
  if (kind === 'trophy' || type === 'trophy') return buildTrophyMesh(color, item.family);

  // Crafting materials — a shape per kind (cloth, ore, fang, vial, gem…) keyed
  // off the icon/id, so they're not all the same coloured diamond.
  if (kind === 'material' || kind === 'gem' || type === 'gem' || type === 'material') {
    return buildMaterialMesh(item);
  }

  // Anything else → a small gem placeholder so the wall slot still shows
  // SOMETHING in 3D rather than being empty.
  return buildGemMesh(color);
}

// Minimal fallbacks if an item lacks a detailed builder (keeps walls populated).
function fallbackArmor(color) {
  const g = new THREE.Group();
  const chest = new THREE.Mesh(new THREE.SphereGeometry(0.26, 16, 14), metalMat(color));
  chest.scale.set(1, 0.66, 0.8); chest.position.y = 0.06; g.add(chest);
  return g;
}
function fallbackHelm(color) {
  const g = new THREE.Group();
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), metalMat(color));
  g.add(dome);
  return g;
}
function fallbackLegs(color) {
  const g = new THREE.Group();
  const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.4, 10), metalMat(color));
  g.add(leg);
  return g;
}

// Frame a built item mesh to fit nicely in a wall slot of half-size `half`
// (world units). Measures the mesh, centers it, and scales it to fit. Returns a
// wrapper group you can position/rotate on the wall.
export function fitItemToSlot(mesh, half = 0.34) {
  const wrap = new THREE.Group();
  if (!mesh) return wrap;
  const box = new THREE.Box3().setFromObject(mesh);
  const size = new THREE.Vector3(); box.getSize(size);
  const center = new THREE.Vector3(); box.getCenter(center);
  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  const s = (half * 2 * 0.82) / maxDim;
  mesh.position.sub(center);          // center it on the origin
  const inner = new THREE.Group();
  inner.add(mesh);
  inner.scale.setScalar(s);
  wrap.add(inner);
  return wrap;
}
