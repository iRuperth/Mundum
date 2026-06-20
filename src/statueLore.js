// City statues — each a unique commemorated hero with its own carved-stone model
// and a plaque of legend you can read by pressing it. The legends are fixed lore
// written to fit Mundum's world (its real cities: Greenhollow, Oakvale, Stonehaven,
// Dragonreach, Westharbor, Frostpeak, Sandport, and the dragons of the deep caves),
// not random gibberish. Many TYPES — warrior, archer, mage, queen, the rotund
// brewer, the healer, the explorer… — so no two statues read the same.
//
// A statue is picked deterministically from its world position (see pickStatue),
// so the same corner always shows the same hero across reloads and for every
// player. buildStatueModel(kind, mats, x, y, z) returns { group, baseY } and the
// data carries name + legend (ES/EN).

import * as THREE from 'three';

// ---------------------------------------------------------------------------
// The roster. Each entry: { kind, name, legend: { es, en } }. `kind` drives the
// carved model (below). Add freely — pickStatue spreads them across the cities.
// ---------------------------------------------------------------------------
export const STATUE_LORE = [
  {
    kind: 'warrior',
    name: 'Sir Garrick the Steadfast',
    legend: {
      es: 'Sir Garrick el Firme — primer capitán de la guardia de Greenhollow. Sostuvo la puerta sur tres días contra los orcos del bosque mientras se alzaban las murallas. No dejó pasar a ninguno.',
      en: 'Sir Garrick the Steadfast — first captain of the Greenhollow guard. He held the south gate for three days against the forest orcs while the walls were raised. Not one got past.',
    },
  },
  {
    kind: 'dragonslayer',
    name: 'Dame Oryn Dragonsbane',
    legend: {
      es: 'Dame Oryn Mataférreo — la primera en abatir un dragón en las cuevas profundas. Trajo su colmillo a Dragonreach, y la ciudad tomó su nombre de aquella hazaña.',
      en: 'Dame Oryn Dragonsbane — the first to fell a dragon in the deep caves. She brought its fang to Dragonreach, and the city took its name from that deed.',
    },
  },
  {
    kind: 'archer',
    name: 'Wynn of the Long Shot',
    legend: {
      es: 'Wynn del Tiro Largo — guardabosques de Oakvale. Dicen que acertó a un cuervo a través de la niebla del valle a trescientos pasos. Enseñó a tirar a toda una generación de arqueros.',
      en: 'Wynn of the Long Shot — ranger of Oakvale. They say she struck a crow through the valley mist at three hundred paces. She taught a whole generation of archers to loose true.',
    },
  },
  {
    kind: 'mage',
    name: 'Archmage Veldros',
    legend: {
      es: 'Archimago Veldros — fundó la Torre Arcana de Greenhollow. Cartografió las corrientes de maná bajo el reino y enseñó a los primeros magos a encender una llama sin yesca.',
      en: 'Archmage Veldros — founded the Arcane Tower of Greenhollow. He mapped the mana currents beneath the realm and taught the first mages to kindle a flame without tinder.',
    },
  },
  {
    kind: 'queen',
    name: 'Queen Mew II of Aelora',
    legend: {
      es: 'La Reina Mew II, de un reino muy lejano llamado Aelora. Cruzó el mar para traer libros y conocimiento, y donó la Gran Biblioteca. Bajo su mano, las ciudades aprendieron a leer.',
      en: 'Queen Mew II, of a far-distant kingdom called Aelora. She crossed the sea to bring books and knowledge, and gave the Great Library. Under her hand, the cities learned to read.',
    },
  },
  {
    kind: 'king',
    name: 'King Aldric the Builder',
    legend: {
      es: 'El Rey Aldric el Constructor — trazó las calles de Greenhollow con su propia mano y unió las siete ciudades bajo una misma calzada. Bajo su reinado nadie pasó hambre en invierno.',
      en: 'King Aldric the Builder — laid out the streets of Greenhollow with his own hand and joined the seven cities under one road. In his reign none went hungry in winter.',
    },
  },
  {
    kind: 'brewer',
    name: 'Big Bram the Brewer',
    legend: {
      es: 'El gran Bram el Cervecero — el hombre más corpulento y de mejor humor que conoció Westharbor. Abrió la primera posada del puerto y, dicen, jamás cobró a un viajero perdido.',
      en: 'Big Bram the Brewer — the largest and merriest man Westharbor ever knew. He opened the harbour\'s first inn and, they say, never once charged a lost traveller.',
    },
  },
  {
    kind: 'healer',
    name: 'Mother Edda the Kind',
    legend: {
      es: 'Madre Edda la Bondadosa — sanadora del templo. Levantó las fuentes de curación de cada puerta para que ningún herido cayera antes de cruzar el umbral de la ciudad.',
      en: 'Mother Edda the Kind — healer of the temple. She raised the healing fountains at every gate, so no wounded soul would fall before crossing into the city.',
    },
  },
  {
    kind: 'explorer',
    name: 'Talvi the Far-Walker',
    legend: {
      es: 'Talvi la Caminante — la primera en alcanzar las cumbres heladas de Frostpeak y volver. Sus mapas de las cuevas profundas guían aún a los aventureros que se atreven a bajar.',
      en: 'Talvi the Far-Walker — first to reach the frozen peaks of Frostpeak and return. Her maps of the deep caves still guide the adventurers who dare to descend.',
    },
  },
  {
    kind: 'paladin',
    name: 'Sir Cedric Dawnshield',
    legend: {
      es: 'Sir Cedric Escudo del Alba — paladín que custodió las caravanas entre Stonehaven y Sandport por el desierto. Su escudo nunca se rompió; su fe, tampoco.',
      en: 'Sir Cedric Dawnshield — the paladin who guarded the caravans between Stonehaven and Sandport across the desert. His shield never broke; nor did his faith.',
    },
  },
  {
    kind: 'merchant',
    name: 'Goss the Coinwise',
    legend: {
      es: 'Goss el Sabio del Oro — fundó el primer banco y el mercado libre. Enseñó a las ciudades a comerciar en paz lo que antes se disputaba con las armas.',
      en: 'Goss the Coinwise — founded the first bank and the free market. He taught the cities to trade in peace what was once fought over with steel.',
    },
  },
  {
    kind: 'sailor',
    name: 'Captain Marra of the Tide',
    legend: {
      es: 'La Capitana Marra de la Marea — abrió la ruta marina a Westharbor y trazó la costa. Trajo la sal, el pescado y las primeras historias de tierras al otro lado del mar.',
      en: 'Captain Marra of the Tide — opened the sea route to Westharbor and charted the coast. She brought salt, fish, and the first tales of lands across the sea.',
    },
  },
  {
    kind: 'druid',
    name: 'Old Fenwick of the Grove',
    legend: {
      es: 'El viejo Fenwick del Bosquecillo — druida que plantó los robles de Oakvale. Hablaba con las bestias y enseñó a los aldeanos a sanar con hierbas en vez de hierro.',
      en: 'Old Fenwick of the Grove — the druid who planted the oaks of Oakvale. He spoke with beasts and taught the villagers to heal with herbs instead of iron.',
    },
  },
  {
    kind: 'warrior',
    name: 'Greta the Unbroken',
    legend: {
      es: 'Greta la Inquebrantable — defendió Frostpeak en la Larga Noche, cuando los lobos de hielo bajaron de las cumbres. Resistió hasta el amanecer con un hacha mellada y un grito.',
      en: 'Greta the Unbroken — defended Frostpeak through the Long Night, when the ice wolves came down from the peaks. She held until dawn with a notched axe and a war-cry.',
    },
  },
  {
    kind: 'mage',
    name: 'Seeress Ilva',
    legend: {
      es: 'La Vidente Ilva — leía las estrellas sobre Sandport. Predijo la tormenta de arena que habría sepultado el oasis y dio tiempo a todos a refugiarse. Ni un alma se perdió.',
      en: 'Seeress Ilva — read the stars above Sandport. She foretold the sandstorm that would have buried the oasis and gave everyone time to shelter. Not one soul was lost.',
    },
  },
];

// Deterministic pick: same (rounded) world position → same hero, every time and
// for every player. A simple integer hash of x,z spreads the roster evenly.
export function pickStatueLore(x, z) {
  const hx = Math.round(x) | 0, hz = Math.round(z) | 0;
  let h = (hx * 73856093) ^ (hz * 19349663);
  h = (h >>> 0) % STATUE_LORE.length;
  return STATUE_LORE[h];
}

// ---------------------------------------------------------------------------
// Carved-stone models, one per `kind`. Each returns nothing — it adds meshes to
// `group` at (x,y,z) — and the caller builds the shared plinth + glow base. The
// figure sits on a plinth whose top is at y + 1.3, so model parts are placed
// relative to that. `M` is the city material set (stone/stoneDark/metal/gold…).
// All carved of stone, so we lean on stone/stoneDark with the odd metal/gold trim.
// ---------------------------------------------------------------------------
function carveFigure(kind, group, M, x, y, z) {
  const stone = M.stone, dark = M.stoneDark, metal = M.metal || M.stoneDark, gold = M.gold || M.stone;
  const top = y + 1.3;   // plinth top
  const add = (mesh) => { group.add(mesh); return mesh; };
  const box = (w, h, d, mat) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  const cyl = (rt, rb, h, mat, seg = 10) => new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
  const sph = (r, mat, seg = 12) => new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.max(6, seg - 2)), mat);
  const dome = (r, mat) => new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.6), mat);
  // A stone helmet (open dome) placed at the head; add() it in one call.
  const addHelm = () => { const h = dome(0.3, stone); h.position.set(x, top + 1.82, z); add(h); };

  // Body width/shape varies by kind (the "fat" brewer is broad; the queen slim).
  const broad = kind === 'brewer';
  const slim = kind === 'queen' || kind === 'mage' || kind === 'seeress';
  const bodyTopR = broad ? 0.5 : slim ? 0.26 : 0.34;
  const bodyBotR = broad ? 0.62 : slim ? 0.4 : 0.5;
  const body = cyl(bodyTopR, bodyBotR, 1.5, dark);
  body.position.set(x, top + 0.75, z); add(body);
  // Shoulders.
  for (const s of [-1, 1]) {
    const pa = sph(broad ? 0.26 : 0.22, dark, 10);
    pa.position.set(x + s * (broad ? 0.5 : 0.42), top + 1.25, z); add(pa);
  }
  // Head.
  const head = sph(0.28, dark); head.position.set(x, top + 1.75, z); add(head);

  // Per-kind headgear + held items.
  switch (kind) {
    case 'warrior': {
      addHelm();   // helmeted head
      const sword = box(0.1, 1.6, 0.05, metal); sword.position.set(x + 0.5, top + 1.6, z); add(sword);
      const hilt = box(0.34, 0.1, 0.08, dark); hilt.position.set(x + 0.5, top + 0.85, z); add(hilt);
      const shield = box(0.5, 0.75, 0.08, stone); shield.position.set(x - 0.46, top + 0.8, z + 0.12); add(shield);
      break;
    }
    case 'dragonslayer': {
      addHelm();
      // A great two-handed sword raised overhead + a dragon-fang trophy at the belt.
      const blade = box(0.12, 2.0, 0.06, metal); blade.position.set(x, top + 2.6, z); add(blade);
      const cross = box(0.5, 0.1, 0.1, gold); cross.position.set(x, top + 1.7, z); add(cross);
      const fang = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.4, 6), stone); fang.position.set(x + 0.34, top + 0.5, z + 0.3); fang.rotation.x = Math.PI; add(fang);
      break;
    }
    case 'archer': {
      // A drawn longbow held to the side.
      const bow = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.05, 6, 16, Math.PI * 1.2), metal);
      bow.position.set(x - 0.5, top + 1.0, z); bow.rotation.z = Math.PI / 2; add(bow);
      const arrow = box(0.04, 0.04, 1.0, metal); arrow.position.set(x - 0.5, top + 1.0, z); arrow.rotation.x = Math.PI / 2; add(arrow);
      const hood = dome(0.3, dark); hood.position.set(x, top + 1.82, z); add(hood);
      break;
    }
    case 'mage':
    case 'seeress': {
      // A pointed hood/hat + a staff with a glowing orb.
      const hat = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.7, 10), dark); hat.position.set(x, top + 2.05, z); add(hat);
      const staff = cyl(0.05, 0.05, 2.0, M.wood || dark, 6); staff.position.set(x + 0.46, top + 1.0, z); add(staff);
      const orb = sph(0.16, gold, 10); orb.position.set(x + 0.46, top + 2.05, z); orb.userData.statueOrb = true; add(orb);
      // long robe widening to the base
      const robe = cyl(0.4, 0.7, 0.6, dark); robe.position.set(x, top + 0.3, z); add(robe);
      break;
    }
    case 'queen':
    case 'king': {
      // A crown of stone with gold points, and a long flowing robe.
      const crownBand = cyl(0.3, 0.3, 0.16, gold, 12); crownBand.position.set(x, top + 1.95, z); add(crownBand);
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        const pt = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.2, 5), gold);
        pt.position.set(x + Math.cos(a) * 0.26, top + 2.12, z + Math.sin(a) * 0.26); add(pt);
      }
      const robe = cyl(0.42, 0.8, 1.0, stone); robe.position.set(x, top + 0.5, z); add(robe);
      if (kind === 'king') { const scepter = cyl(0.04, 0.04, 1.4, gold, 6); scepter.position.set(x + 0.5, top + 1.2, z); add(scepter); }
      break;
    }
    case 'brewer': {
      // A round belly (already broad), a flat cap, a tankard raised.
      const cap = cyl(0.34, 0.36, 0.14, dark, 12); cap.position.set(x, top + 1.92, z); add(cap);
      const belly = sph(0.46, dark, 12); belly.position.set(x, top + 0.7, z + 0.18); belly.scale.set(1, 0.9, 0.9); add(belly);
      const mug = cyl(0.16, 0.16, 0.3, M.wood || dark, 8); mug.position.set(x + 0.5, top + 1.5, z); add(mug);
      break;
    }
    case 'healer': {
      // A hood + a cross/staff of mercy.
      const hood = dome(0.32, stone); hood.position.set(x, top + 1.82, z); add(hood);
      const staff = cyl(0.05, 0.05, 1.8, M.wood || dark, 6); staff.position.set(x + 0.46, top + 1.0, z); add(staff);
      const crossV = box(0.1, 0.4, 0.06, gold); crossV.position.set(x + 0.46, top + 2.0, z); add(crossV);
      const crossH = box(0.3, 0.1, 0.06, gold); crossH.position.set(x + 0.46, top + 2.0, z); add(crossH);
      const robe = cyl(0.4, 0.72, 0.8, stone); robe.position.set(x, top + 0.4, z); add(robe);
      break;
    }
    case 'paladin': {
      const helm = dome(0.3, stone); helm.position.set(x, top + 1.82, z); add(helm);
      const plume = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.4, 6), gold); plume.position.set(x, top + 2.1, z); add(plume);
      const shield = box(0.55, 0.85, 0.08, stone); shield.position.set(x - 0.48, top + 0.8, z + 0.12); add(shield);
      const sword = box(0.1, 1.4, 0.05, metal); sword.position.set(x + 0.48, top + 0.9, z); add(sword);
      break;
    }
    case 'explorer': {
      const hat = cyl(0.34, 0.4, 0.12, dark, 12); hat.position.set(x, top + 1.9, z); add(hat);
      const brim = cyl(0.5, 0.5, 0.04, dark, 14); brim.position.set(x, top + 1.84, z); add(brim);
      const staff = cyl(0.05, 0.05, 1.9, M.wood || dark, 6); staff.position.set(x + 0.46, top + 1.0, z); add(staff);
      const pack = box(0.4, 0.5, 0.25, M.wood || dark); pack.position.set(x, top + 0.9, z - 0.4); add(pack);
      break;
    }
    case 'merchant': {
      const cap = cyl(0.3, 0.34, 0.16, gold, 12); cap.position.set(x, top + 1.92, z); add(cap);
      const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.06, 16), gold);
      coin.position.set(x + 0.5, top + 1.4, z); coin.rotation.x = Math.PI / 2; coin.userData.statueOrb = true; add(coin);
      const robe = cyl(0.4, 0.66, 0.7, stone); robe.position.set(x, top + 0.4, z); add(robe);
      break;
    }
    case 'sailor': {
      const cap = cyl(0.3, 0.32, 0.18, dark, 12); cap.position.set(x, top + 1.92, z); add(cap);
      // A ship's wheel held at the side.
      const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.05, 6, 16), M.wood || dark);
      wheel.position.set(x + 0.55, top + 1.0, z); wheel.rotation.y = Math.PI / 2; add(wheel);
      for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; const sp = box(0.04, 0.5, 0.04, M.wood || dark); sp.position.set(x + 0.55, top + 1.0 + Math.sin(a) * 0.2, z + Math.cos(a) * 0.2); sp.rotation.x = a; add(sp); }
      break;
    }
    case 'druid': {
      // Antlers + a gnarled staff with leaves.
      for (const s of [-1, 1]) {
        const horn = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.5, 5), stone);
        horn.position.set(x + s * 0.14, top + 2.05, z); horn.rotation.z = s * 0.5; add(horn);
      }
      const staff = cyl(0.05, 0.06, 1.9, M.wood || dark, 6); staff.position.set(x + 0.46, top + 1.0, z); add(staff);
      const leaf = sph(0.18, M.leaf || stone, 8); leaf.position.set(x + 0.46, top + 2.0, z); add(leaf);
      break;
    }
    default: {
      addHelm();
    }
  }
}

// Build a full statue (plinth + figure + a glow base for night) for `lore.kind`.
// Returns { glowBase, glowLight } so the caller can collect them for the night
// glow, and tags the top group with userData.statue = descriptor for interaction.
export function buildStatue(group, world, x, y, z, mats, lore) {
  const M = mats;
  // Tiered pedestal (same as the old statue base) + a dedication panel.
  const step = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.3, 2.1), M.stoneDark);
  step.position.set(x, y + 0.15, z); group.add(step);
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.0, 1.6), M.stone);
  plinth.position.set(x, y + 0.8, z); group.add(plinth);
  const panel = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.6, 0.06), M.stoneDark);
  panel.position.set(x, y + 0.85, z + 0.82); group.add(panel);

  // The carved hero.
  carveFigure(lore.kind, group, M, x, y, z);

  // Night glow: a thin emissive slab hugging the plinth base + a warm point light
  // low at the foot, so the statue lights from the BOTTOM upward after dark. Both
  // start dark (day) and are ramped up at night by main.js.
  const glowMat = new THREE.MeshStandardMaterial({
    color: 0x223044, emissive: 0x7ec9ff, emissiveIntensity: 0, roughness: 1, metalness: 0,
  });
  const glowBase = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.5, 1.7), glowMat);
  glowBase.position.set(x, y + 0.45, z);
  group.add(glowBase);
  const glowLight = new THREE.PointLight(0x9fd0ff, 0, 6, 2);
  glowLight.position.set(x, y + 0.5, z);
  group.add(glowLight);

  // Tag the plinth as the statue's interaction handle (carries the lore + a world
  // position). main.js collects these to detect "press" and show the legend.
  plinth.userData.statue = { name: lore.name, legend: lore.legend, kind: lore.kind, x, z };
  plinth.userData.statueGlow = { base: glowBase, light: glowLight };

  if (world && world.addSolid) world.addSolid(x, z, 1.0);
  return { glowBase, glowLight };
}
