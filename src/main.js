import * as THREE from 'three';
import { World, WATER_LEVEL } from './world.js';
import { Player, EYE_HEIGHT } from './player.js';
import { Controls } from './controls.js';
import { DayNight } from './daynight.js';
import { HAIR_STYLES } from './character.js';
import { initLang, getLang, setLang, applyStaticDom, t } from './i18n.js';
import { Inventory, DepotStore, instanceFromContainer, instanceFromArmor } from './inventory.js';
import { EquipVisuals, buildWeaponMesh } from './equipVisuals.js';
import { wandColorForLevel } from './data/items.js';
import { CombatSystem } from './combat.js';
import { buildCities, interactableAt, nearestCity, placeCities } from './cities.js';
import { Minimap } from './minimap.js';
import { UI } from './ui.js';
import { Peers } from './peers.js';
import { Net } from './net.js';
import { audio } from './audio.js';
import { makeStarterWand, getContainer, getWeapon, getArmor, instanceFromPotion, potionRestore } from './data/items.js';
import { professionStats, professionRegen, professionLevelGain, getProfession } from './data/professions.js';
import { xpProgress, eventMultipliers } from './progression.js';
import { QuestLog } from './questlog.js';
import { WorldNpcs } from './worldNpcs.js';
import { questsForNpc } from './data/quests.js';
import { buildDungeonEntrances, dungeonEntranceAt, chestAt, openChestVisual, update as updateDungeons } from './dungeons.js';
import { resolveItem } from './inventory.js';
import { FloatText } from './floatText.js';
import { Auth } from './auth.js';
import { AuthUI } from './authui.js';

const SEED = 20260612;
const PROFILE_KEY = 'mundum.profile';
const SAVE_KEY = 'mundum.save';

const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
if (isTouch) document.body.classList.add('touch');

const canvas = document.getElementById('game');

// requestPointerLock can throw (e.g. WrongDocumentError) under some browser
// policies; never let a failed lock crash the game flow.
function lockPointer() {
  try { canvas.requestPointerLock(); } catch (_) { /* lock unavailable; ignore */ }
}

const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isTouch, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, isTouch ? 1.5 : 2));
renderer.setSize(innerWidth, innerHeight);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(isTouch ? 70 : 75, innerWidth / innerHeight, 0.1, 3000);
camera.rotation.order = 'YXZ';
scene.add(camera);

// First-person weapon viewmodel: held in front of the camera so you see your
// own weapon (wand, sword, bow...) Minecraft-style.
const viewModel = new THREE.Group();
viewModel.position.set(0.32, -0.32, -0.7);
viewModel.rotation.set(0.1, -0.3, 0);
camera.add(viewModel);
let viewModelMesh = null;
let viewSwingT = 0;
const VIEW_REST = new THREE.Euler(0.1, -0.3, 0);
function setViewModel(item, level) {
  if (viewModelMesh) { viewModel.remove(viewModelMesh); viewModelMesh.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); }); viewModelMesh = null; }
  if (!item) return;
  const color = item.type === 'wand' ? wandColorForLevel(level) : (item.color || 0xb0b0b0);
  viewModelMesh = buildWeaponMesh(item.type, color);
  viewModelMesh.scale.setScalar(1.1);
  viewModel.add(viewModelMesh);
}

// Animate the first-person weapon: a quick swing/bob when attacking.
function updateViewModel(dt) {
  if (viewSwingT > 0) {
    viewSwingT = Math.max(0, viewSwingT - dt);
    const k = Math.sin((1 - viewSwingT / 0.3) * Math.PI);
    viewModel.rotation.x = VIEW_REST.x - k * 0.9;
    viewModel.rotation.z = VIEW_REST.z + k * 0.5;
    viewModel.position.y = -0.32 - k * 0.08;
  } else {
    viewModel.rotation.copy(VIEW_REST);
    viewModel.position.y = -0.32;
  }
}

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

initLang();

const world = new World(scene, SEED, isTouch ? 3 : 4);
const daynight = new DayNight(scene);
placeCities(world);
const cityProps = buildCities(scene, world).props;
const dungeonBuild = buildDungeonEntrances(scene, world);
const dungeonEntrances = dungeonBuild.entrances;
const dungeonChests = dungeonBuild.chests;

const DEFAULT_COLORS = { skin: '#f2c79b', shirt: '#3498db', pants: '#34495e', hair: '#4a2f1b' };
let profile = loadProfile();

const homeCity = nearestCity(0, 0);
const player = new Player(scene, world, profile);
spawnInCity(homeCity);
world.update(player.pos.x, player.pos.z, true);

// Spawn just outside the temple pillar ring, facing away from the city center,
// so the third-person camera never clips a pillar on arrival. The -z side is
// clear (shop is at +x, depot at -x, portal at +z).
function spawnInCity(city) {
  player.spawnAt(city.x, city.z - 8);
  player.yaw = Math.PI;
}

player.level = 1;
player.exp = 0;
player.profession = getProfession(profile.profession) ? profile.profession : 'knight';
applyVocationStats(true);
player.defense = 0;
player.weapon = null;
player.speedBonus = 0;
player.gold = 0;
player.alive = true;

// Recompute maxHp/maxMana from the current vocation + level. When `fill` is
// true (creation, level-up, respawn) HP/mana are topped to full; otherwise the
// current values are clamped to the new maxima (e.g. loading a save).
function applyVocationStats(fill) {
  const s = professionStats(player.profession, player.level);
  player.maxHp = s.maxHp;
  player.maxMana = s.maxMana;
  player.attackRange = s.attackRange;
  if (fill || player.hp == null) player.hp = player.maxHp;
  else player.hp = Math.min(player.hp, player.maxHp);
  if (fill || player.mana == null) player.mana = player.maxMana;
  else player.mana = Math.min(player.mana, player.maxMana);
}

// Vocation-based regeneration. Each stat ticks on its own interval (e.g. mage
// gains +3 mana every 2s and +1 hp every 5s). Accumulators carry leftover dt
// so the cadence stays accurate regardless of frame rate.
let regenHpAcc = 0;
let regenManaAcc = 0;
function regenVitals(dt) {
  if (!player.alive) return;
  const r = professionRegen(player.profession);
  regenHpAcc += dt;
  regenManaAcc += dt;
  if (player.hp < player.maxHp && regenHpAcc >= r.hp.every) {
    const ticks = Math.floor(regenHpAcc / r.hp.every);
    player.hp = Math.min(player.maxHp, player.hp + ticks * r.hp.amount);
    regenHpAcc -= ticks * r.hp.every;
  } else if (player.hp >= player.maxHp) {
    regenHpAcc = 0;
  }
  if (player.mana < player.maxMana && regenManaAcc >= r.mana.every) {
    const ticks = Math.floor(regenManaAcc / r.mana.every);
    player.mana = Math.min(player.maxMana, player.mana + ticks * r.mana.amount);
    regenManaAcc -= ticks * r.mana.every;
  } else if (player.mana >= player.maxMana) {
    regenManaAcc = 0;
  }
}

const inv = new Inventory();
const depot = new DepotStore();
const questLog = new QuestLog();
const worldNpcs = new WorldNpcs(scene, world);
let equipVisuals = new EquipVisuals(player.char);
const peers = new Peers(scene, world);
const net = new Net();
let currentDungeon = null;
let firstQuestHintShown = false;
let shakeAmount = 0;
let lowHpActive = false;
const lowHpVignette = document.getElementById('low-hp-vignette');
const floatText = new FloatText(scene);

let firstPerson = true;
let introCam = 0;   // 1 = front welcome view, decays to 0 (behind) on first move
let introHold = 0;  // seconds the front view is held before it can swing behind
let state = 'create';
let authCharacterId = null;  // the Supabase character row id for cloud saves

const fillLight = new THREE.PointLight(0xffeedd, 9, 9);
scene.add(fillLight);

const ui = {
  hud: document.getElementById('hud'),
  hint: document.getElementById('hint'),
  controlsUi: document.getElementById('controls-ui'),
  stickBase: document.getElementById('stick-base'),
  stickKnob: document.getElementById('stick-knob'),
  btnJump: document.getElementById('btn-jump'),
  btnCam: document.getElementById('btn-cam'),
  btnRange: document.getElementById('btn-range'),
  btnAttack: document.getElementById('btn-attack'),
  btnBag: document.getElementById('btn-bag'),
  creation: document.getElementById('creation'),
  nameInput: document.getElementById('name-input'),
  swatchRows: document.getElementById('swatch-rows'),
  btnPlay: document.getElementById('btn-play'),
  clockIcon: document.getElementById('clock-icon'),
  clockTime: document.getElementById('clock-time'),
  hudEvent: document.getElementById('hud-event'),
};

const panelRefs = {
  sidePanel: document.getElementById('side-panel'),
  panelToggle: document.getElementById('panel-toggle'),
  paperdoll: document.getElementById('paperdoll'),
  backpackGrid: document.getElementById('backpack-grid'),
  capText: document.getElementById('cap-text'),
  hpFill: document.getElementById('hp-fill'),
  hpText: document.getElementById('hp-text'),
  manaFill: document.getElementById('mana-fill'),
  manaText: document.getElementById('mana-text'),
  xpFill: document.getElementById('xp-fill'),
  xpText: document.getElementById('xp-text'),
  levelBadge: document.getElementById('level-badge'),
  hudTitle: document.getElementById('hud-title'),
  toastStack: document.getElementById('toast-stack'),
  contextCard: document.getElementById('context-card'),
  questBox: document.getElementById('quest-box'),
};

const gameUI = new UI(panelRefs, inv, depot, {
  equip: (i) => doEquip(i),
  unequip: (slot) => doUnequip(slot),
  dropItem: (i, bagIndex) => doDropItem(i, bagIndex),
  usePotion: (i) => doUsePotion(i),
  moveIntoBag: (from, bag) => { inv.moveIntoBag(from, bag); recompute(); },
  takeFromBag: (bag, inner) => { if (!inv.takeFromBag(bag, inner)) gameUI.toast(t('full'), 'bad'); recompute(); },
  buy: (def, refresh) => doBuy(def, refresh),
  depositItem: (city, i) => { const it = inv.removeFromBackpack(i); if (it) depot.deposit(city, it); recompute(); },
  withdrawItem: (city, i) => {
    const item = depot.withdraw(city, i);
    if (item && inv.addToBackpack(item, player.level) !== 'ok') depot.deposit(city, item);
    recompute();
  },
});

const minimapCanvas = document.getElementById('minimap');
const mapOverlay = document.getElementById('map-overlay');

// Map markers: shop, depot, temple per city plus dungeon entrances.
const mapPois = [];
for (const p of cityProps) {
  mapPois.push({ x: p.shop.x, z: p.shop.z, icon: '🛒' });
  mapPois.push({ x: p.depot.x, z: p.depot.z, icon: '🏦' });
  mapPois.push({ x: p.temple.x, z: p.temple.z, icon: '🏛️' });
}
for (const d of dungeonEntrances) mapPois.push({ x: d.x, z: d.z, icon: '🕳️' });

const minimap = new Minimap(minimapCanvas, world, document.getElementById('city-name'), {
  coords: document.getElementById('coords'),
  big: document.getElementById('bigmap'),
  bigCoords: document.getElementById('bigmap-coords'),
  overlay: mapOverlay,
  pois: mapPois,
});

// Tap the minimap to open the full-screen map; tap the backdrop or ✕ to close.
minimapCanvas.addEventListener('click', () => minimap.toggle(true));
document.getElementById('bigmap-close').addEventListener('click', () => minimap.toggle(false));
mapOverlay.addEventListener('click', (e) => { if (e.target === mapOverlay) minimap.toggle(false); });
addEventListener('keydown', (e) => { if (e.code === 'Escape' && minimap.expanded) minimap.toggle(false); });

// --- Expanded map: drag to pan, wheel / pinch to zoom, button to recenter ---
const bigmap = document.getElementById('bigmap');
const bigRecenter = document.getElementById('bigmap-recenter');
const mapPtrs = new Map();           // active pointers on the big map
let pinchDist = 0;                    // last two-finger distance, for pinch zoom

bigmap.addEventListener('pointerdown', (e) => {
  bigmap.setPointerCapture(e.pointerId);
  mapPtrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (mapPtrs.size === 2) pinchDist = twoFingerDist();
});
bigmap.addEventListener('pointermove', (e) => {
  const prev = mapPtrs.get(e.pointerId);
  if (!prev) return;
  if (mapPtrs.size === 2) {
    mapPtrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const d = twoFingerDist();
    if (pinchDist > 0 && d > 0) minimap.zoom(pinchDist / d);
    pinchDist = d;
  } else {
    // CSS scales the 600px canvas to its on-screen size; convert px to canvas px.
    const scale = bigmap.width / bigmap.getBoundingClientRect().width;
    minimap.pan((e.clientX - prev.x) * scale, (e.clientY - prev.y) * scale, player);
    mapPtrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  }
});
const endMapPtr = (e) => { mapPtrs.delete(e.pointerId); if (mapPtrs.size < 2) pinchDist = 0; };
bigmap.addEventListener('pointerup', endMapPtr);
bigmap.addEventListener('pointercancel', endMapPtr);
bigmap.addEventListener('wheel', (e) => { e.preventDefault(); minimap.zoom(e.deltaY > 0 ? 1.12 : 0.89); }, { passive: false });
if (bigRecenter) bigRecenter.addEventListener('click', () => minimap.recenter());

function twoFingerDist() {
  const pts = [...mapPtrs.values()];
  if (pts.length < 2) return 0;
  return Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
}

const controls = new Controls(canvas, ui, {
  onToggleCamera: () => { firstPerson = !firstPerson; introCam = 0; },
  onLockChange: (locked) => {
    ui.hint.classList.toggle('hidden', locked);
    document.getElementById('crosshair').classList.toggle('hidden', !locked || state !== 'play');
  },
  onToggleBag: () => {
    // Toggle the floating 20-slot backpack window. Free the cursor while it is
    // open so items are clickable; recapture it on desktop when it closes.
    const card = panelRefs.contextCard;
    const open = card.classList.contains('hidden');
    if (open) {
      gameUI.openBackpack(null);
      if (document.pointerLockElement) document.exitPointerLock();
    } else {
      gameUI.closeContext();
      if (!isTouch && state === 'play' && player.alive) lockPointer();
    }
  },
  onToggleRange: () => toggleRangeRing(),
  onChat: () => openChat(),
});

const combat = new CombatSystem(scene, world, {
  onPlayerHit: (dmg) => {
    if (!player.alive) return;
    player.hp -= dmg;
    audio.sfx.hit();
    shakeAmount = Math.min(0.5, shakeAmount + 0.18);
    if (player.hp <= 0) onPlayerDeath();
  },
  onCreatureHit: (c, dmg, mult) => {
    audio.sfx.creatureHit();
    if (mult > 1) { spawnFloatText(c.pos, `${dmg}!`, '#7bed6f'); shakeAmount = Math.min(0.5, shakeAmount + 0.1); }
    else if (mult === 0) spawnFloatText(c.pos, '0', '#9aa0a6');
    else if (mult < 1) spawnFloatText(c.pos, `${dmg}`, '#74b9ff');
    else spawnFloatText(c.pos, `${dmg}`, '#ffffff');
    if (c.flash) c.flash();
  },
  onKill: (c, xp) => {
    gainXp(xp);
    gameUI.toast(t('gainedXp', xp));
    const changed = questLog.onEvent('kill', c.def.family);
    if (changed.length) onQuestProgress();
  },
  onLoot: (loot) => {
    if (loot.gold) { inv.gold += loot.gold; player.gold = inv.gold; gameUI.toast(`+${loot.gold} ${t('gold')} 💰`, 'loot'); }
  },
});

setupCreation();
setupChat();
setupLangButtons();
applyStaticDom();
ui.hint.textContent = t('hintDesktop');

// An account is required to play: the auth/character-select overlay gates the
// game so progress (position, depot, items, level) is always tied to a login.
const auth = new Auth();
const authUI = new AuthUI(auth, {
  onPlay: (character) => enterWithCharacter(character),
  getProfileDefaults: () => ({ colors: { ...DEFAULT_COLORS }, sex: 'male', hair: 'short', nose: 'small', mouth: 'smile' }),
});
ui.creation.classList.add('hidden');
authUI.show();

// Apply a chosen/created character then start the world. The character object
// carries its appearance, profession, and (for returning players) saved state.
function enterWithCharacter(character) {
  authUI.hide();
  authCharacterId = character && character.id ? character.id : null;
  profile = {
    name: character.name || 'Aventurero',
    colors: { ...DEFAULT_COLORS, ...(character.colors || {}) },
    sex: character.sex || 'male',
    hair: character.hair || 'short',
    nose: character.nose || 'small',
    mouth: character.mouth || 'smile',
    profession: getProfession(character.profession) ? character.profession : 'knight',
  };
  saveProfile();
  player.profession = profile.profession;
  player.rebuildCharacter(profile);
  equipVisuals = new EquipVisuals(player.char);
  // Returning character: hydrate level/exp/gold/equipment/depot/pos from the row.
  if (character.exp != null || character.equipment) applyCharacterRow(character);
  ui.nameInput.value = profile.name;
  startGame();
}

addEventListener('pointerdown', () => audio.unlock(), { once: true });
addEventListener('keydown', () => audio.unlock(), { once: true });
addEventListener('keydown', (e) => { if (state === 'play' && e.code === 'KeyE' && !controls.chatting) tryInteract(); });
addEventListener('beforeunload', () => { saveLocal(); saveToAccount(); net.disconnect(); });
// Periodic save so position is persisted to the account even while just walking.
setInterval(() => { if (state === 'play') { saveLocal(); saveToAccount(); } }, 15000);

document.getElementById('hud-mute').addEventListener('click', (e) => {
  e.stopPropagation();
  const muted = audio.toggleMute();
  e.target.textContent = muted ? '🔇' : '🔊';
});

function setupCreation() {
  const PARTS = [
    { key: 'shirt', label: 'shirt', colors: ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6', '#e67e22', '#1abc9c', '#ecf0f1', '#34495e', '#ff6fa5'] },
    { key: 'pants', label: 'pants', colors: ['#34495e', '#2c3e50', '#5d4037', '#1565c0', '#2e7d32', '#616161', '#8e24aa', '#bf360c'] },
    { key: 'skin', label: 'skin', colors: ['#ffdbac', '#f2c79b', '#e0ac7e', '#c68a5a', '#9c6b43', '#7a4f2e'] },
    { key: 'hair', label: 'hair', colors: ['#1a1a1a', '#2c1b10', '#4a2f1b', '#7a4a21', '#b3823e', '#e8c04a', '#d9b380', '#992222', '#555555', '#ff7043'] },
  ];
  const labels = { es: { shirt: 'Camiseta', pants: 'Pantalón', skin: 'Piel', hair: 'Pelo' }, en: { shirt: 'Shirt', pants: 'Pants', skin: 'Skin', hair: 'Hair' } };

  ui.swatchRows.innerHTML = '';
  for (const part of PARTS) {
    const row = document.createElement('div');
    row.className = 'swatch-row';
    row.innerHTML = `<div class="label">${labels[getLang()][part.label]}</div>`;
    const swatches = document.createElement('div');
    swatches.className = 'swatches';
    for (const color of part.colors) {
      const b = document.createElement('button');
      b.className = 'swatch' + (profile.colors[part.key] === color ? ' selected' : '');
      b.style.background = color;
      b.addEventListener('click', () => {
        profile.colors[part.key] = color;
        player.char.setColors(profile.colors);
        equipVisuals.setBaseColors(profile.colors);
        swatches.querySelectorAll('.swatch').forEach((el) => el.classList.remove('selected'));
        b.classList.add('selected');
        saveProfile();
      });
      swatches.appendChild(b);
    }
    row.appendChild(swatches);
    ui.swatchRows.appendChild(row);
  }

  bindSeg('sex-seg', 'sex', () => rebuildCharacter());
  bindSeg('hair-seg', 'hair', () => rebuildCharacter());
  bindSeg('nose-seg', 'nose', () => rebuildCharacter());
  bindSeg('mouth-seg', 'mouth', () => rebuildCharacter());
  setupProfPicker();

  ui.nameInput.value = profile.name;
  ui.btnPlay.addEventListener('click', startGame);
}

// Vocation picker: maps data-prof buttons onto profile.profession and shows the
// chosen vocation's localized description beneath the row.
function setupProfPicker() {
  const seg = document.getElementById('prof-seg');
  const descEl = document.getElementById('prof-desc');
  if (!seg) return;
  const showDesc = (id) => {
    const p = getProfession(id);
    descEl.textContent = p ? (p.desc[getLang()] || p.desc.es) : '';
  };
  seg.querySelectorAll('button').forEach((b) => {
    const id = b.dataset.prof;
    b.classList.toggle('selected', id === profile.profession);
    b.addEventListener('click', () => {
      profile.profession = id;
      seg.querySelectorAll('button').forEach((x) => x.classList.remove('selected'));
      b.classList.add('selected');
      saveProfile();
      showDesc(id);
      audio.sfx.click();
    });
  });
  showDesc(profile.profession);
}

function bindSeg(id, key, onChange) {
  const seg = document.getElementById(id);
  seg.querySelectorAll('button').forEach((b) => {
    const val = b.dataset[key];
    b.classList.toggle('selected', val === profile[key]);
    b.addEventListener('click', () => {
      profile[key] = val;
      seg.querySelectorAll('button').forEach((x) => x.classList.remove('selected'));
      b.classList.add('selected');
      onChange();
    });
  });
}

function rebuildCharacter() {
  saveProfile();
  player.rebuildCharacter(profile);
  equipVisuals = new EquipVisuals(player.char);
  equipVisuals.refresh(inv.equip, player.level);
}

function setupLangButtons() {
  document.querySelectorAll('.lang-btn').forEach((b) => {
    b.classList.toggle('selected', b.dataset.lang === getLang());
    b.addEventListener('click', () => {
      setLang(b.dataset.lang);
      document.querySelectorAll('.lang-btn').forEach((x) => x.classList.toggle('selected', x === b));
      applyStaticDom();
      ui.hint.textContent = t('hintDesktop');
      setupCreation();
      audio.sfx.click();
    });
  });
}

async function startGame() {
  profile.name = ui.nameInput.value.trim() || t('namePlaceholder');
  // Lock in the chosen vocation and (re)derive maxHp/maxMana from it.
  player.profession = getProfession(profile.profession) ? profile.profession : 'knight';
  applyVocationStats(true);
  saveProfile();
  loadSave();

  if (!inv.equip.bag) inv.equip.bag = instanceFromContainer(getContainer('backpack'));
  if (!inv.equip.weapon) inv.equip.weapon = makeStarterWand(() => 0.5);
  recompute();
  gameUI.setName(profile.name);
  onQuestProgress();

  state = 'play';
  controls.enabled = true;
  // Reset the head pose set during creation so the hero looks ahead in-game.
  const head = player.char.parts.head;
  if (head) { head.rotation.set(0, 0, 0); }
  // Start in a third-person front view so you see your hero, then swing behind
  // the moment you move (or to first person if that camera is chosen).
  firstPerson = false;
  introCam = 1;
  introHold = 2.5;
  scene.remove(fillLight);
  ui.creation.classList.add('hidden');
  ui.hud.classList.remove('hidden');
  ui.controlsUi.classList.remove('hidden');
  panelRefs.sidePanel.classList.remove('hidden');
  document.getElementById('chat').classList.remove('hidden');
  if (isTouch) document.getElementById('crosshair').classList.remove('hidden');
  audio.unlock();
  audio.startMusic();
  if (!isTouch) lockPointer();

  if (!localStorage.getItem('mundum.onboarded')) {
    localStorage.setItem('mundum.onboarded', '1');
    setTimeout(() => gameUI.toast('👉 ' + t('onboard1')), 1500);
    setTimeout(() => gameUI.toast('⚔️ ' + t('onboard2')), 7000);
    setTimeout(() => gameUI.toast('🏛️ ' + t('onboard3')), 12500);
  }

  connectOnline();
}

async function connectOnline() {
  const res = await net.connect({
    name: profile.name, sex: profile.sex, hair: profile.hair,
    colors: profile.colors, level: player.level,
  });
  if (!res.online) { gameUI.toast(t('offline')); return; }

  net.onPeerUpdate((id, s) => peers.update(id, s));
  net.onPeerLeave((id) => peers.remove(id));
  net.onPeerJoin((id, meta) => { if (meta && meta.name) gameUI.toast(t('connected', meta.name)); });
  net.onChat((m) => addChatLine(m.name, m.text));

  const cloud = await net.loadCharacter();
  if (cloud) applyCloudSave(cloud);
}

function setupChat() {
  const input = document.getElementById('chat-input');
  input.placeholder = t('chatPlaceholder');
  input.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.code === 'Enter') {
      const text = input.value.trim();
      if (text) { net.sendChat(text); addChatLine(profile.name, text); }
      input.value = '';
      input.classList.add('hidden');
      controls.chatting = false;
      if (!isTouch) lockPointer();
    } else if (e.code === 'Escape') {
      input.value = '';
      input.classList.add('hidden');
      controls.chatting = false;
    }
  });
}

function openChat() {
  const input = document.getElementById('chat-input');
  input.classList.remove('hidden');
  controls.chatting = true;
  if (document.pointerLockElement) document.exitPointerLock();
  input.focus();
}

function addChatLine(name, text) {
  const log = document.getElementById('chat-log');
  const line = document.createElement('div');
  line.className = 'chat-line';
  line.innerHTML = `<span class="who">${escapeHtml(name)}:</span> ${escapeHtml(text)}`;
  log.appendChild(line);
  while (log.children.length > 6) log.removeChild(log.firstChild);
  setTimeout(() => line.remove(), 12000);
}

function doEquip(i) {
  const res = inv.equipFromBackpack(i, player.level);
  if (!res.ok) {
    if (res.reason === 'level') gameUI.toast(t('needLevel', res.need), 'bad');
    else if (res.reason === 'full') gameUI.toast(t('full'), 'bad');
    return;
  }
  audio.sfx.click();
  recompute();
}

function doUnequip(slot) {
  if (inv.unequip(slot)) { audio.sfx.click(); recompute(); }
  else gameUI.toast(t('full'), 'bad');
}

function doDropItem(i, bagIndex) {
  let item;
  if (bagIndex != null) {
    const bag = inv.backpack[bagIndex];
    item = bag && bag.contents ? bag.contents.splice(i, 1)[0] : null;
  } else {
    item = inv.removeFromBackpack(i);
  }
  if (item) { combat.spawnDrop(player.pos, item); recompute(); }
}

// Drink a potion from the backpack: restore hp/mana, then consume it. Refuses if
// it would heal nothing (already full), so the player doesn't waste it.
function doUsePotion(i) {
  const item = inv.backpack[i];
  if (!item || item.kind !== 'potion') return;
  const r = potionRestore(item, player);
  const hpRoom = player.maxHp - player.hp;
  const manaRoom = player.maxMana - player.mana;
  const willHeal = (r.hp > 0 && hpRoom > 0) || (r.mana > 0 && manaRoom > 0);
  if (!willHeal) { gameUI.toast(t('alreadyFull'), 'bad'); return; }

  if (r.hp) player.hp = Math.min(player.maxHp, player.hp + r.hp);
  if (r.mana) player.mana = Math.min(player.maxMana, player.mana + r.mana);
  inv.removeFromBackpack(i);
  audio.sfx.pickup();
  const parts = [];
  if (r.hp && hpRoom > 0) parts.push(`+${Math.min(r.hp, hpRoom)} HP`);
  if (r.mana && manaRoom > 0) parts.push(`+${Math.min(r.mana, manaRoom)} ${t('mana')}`);
  gameUI.toast(`${item.icon || '🧪'} ${parts.join(' · ')}`, 'loot');
  recompute();
  gameUI.setVitals(player.hp, player.maxHp, player.mana, player.maxMana, xpProgress(player.exp));
}

function doBuy(def, refresh) {
  if (inv.gold < def.value) { gameUI.toast(t('full'), 'bad'); return; }
  let item;
  if (getWeapon(def.id)) item = rollShopWeapon(def.id);
  else if (getArmor(def.id)) item = instanceFromArmor(getArmor(def.id));
  else if (getContainer(def.id)) item = instanceFromContainer(def);
  else if (def.kind === 'potion') item = instanceFromPotion(def, getLang());
  if (!item) return;
  const r = inv.addToBackpack(item, player.level);
  if (r !== 'ok') { gameUI.toast(t(r === 'heavy' ? 'tooHeavy' : 'full'), 'bad'); return; }
  inv.gold -= def.value;
  player.gold = inv.gold;
  audio.sfx.pickup();
  recompute();
  refresh && refresh();
}

function rollShopWeapon(id) {
  const w = getWeapon(id);
  if (!w) return null;
  return {
    baseId: w.id, name: w.name, type: w.type, twoHanded: w.twoHanded,
    element: w.element, atk: Math.round((w.atkMin + w.atkMax) / 2), rarity: 'normal',
    weight: w.weight, levelReq: w.levelReq, color: w.color, defense: w.defense || 0, ability: null,
  };
}

function recompute() {
  player.defense = inv.totalDefense();
  player.weapon = inv.weapon();
  player.speedBonus = inv.speedBonus();
  equipVisuals.refresh(inv.equip, player.level);
  setViewModel(inv.equip.weapon, player.level);
  gameUI.renderAll();
  gameUI.setCapacity(player.level);
  saveLocal();
  saveToAccount();
}

function gainXp(xp) {
  player.exp += xp;
  const before = player.level;
  const info = xpProgress(player.exp);
  player.level = info.level;
  if (player.level > before) {
    // Vocation-driven growth: recompute maxHp/maxMana and top both to full.
    const gain = professionLevelGain(player.profession);
    applyVocationStats(true);
    audio.sfx.levelUp();
    gameUI.toast(t('levelUp', player.level), 'levelup');
    gameUI.toast(`+${gain.hp * (player.level - before)} HP · +${gain.mana * (player.level - before)} ${t('mana')}`, 'levelup');
    equipVisuals.refresh(inv.equip, player.level);
  }
  gameUI.setVitals(player.hp, player.maxHp, player.mana, player.maxMana, info);
}

function onPlayerDeath() {
  player.alive = false;
  player.hp = 0;
  audio.sfx.death();
  let lostMsg = t('keptItems');

  if (player.level >= 21 && combat.rngFloat() < 0.2) {
    const slots = ['amulet', 'helmet', 'weapon', 'armor', 'shield', 'legs', 'boots', 'bag'];
    const filled = slots.filter((s) => inv.equip[s]);
    if (filled.length) {
      const slot = filled[Math.floor(combat.rngFloat() * filled.length)];
      const item = inv.equip[slot];
      inv.equip[slot] = null;
      combat.spawnLootBag(player.pos, item);
      lostMsg = t('lostItem') + item.name;
    }
  }
  showDeathScreen(lostMsg);
  recompute();
}

function showDeathScreen(msg) {
  let el = document.getElementById('death-screen');
  if (!el) { el = document.createElement('div'); el.id = 'death-screen'; document.body.appendChild(el); }
  el.innerHTML = `<h1>${t('youDied')}</h1><p>${msg}</p><button>${t('respawn')}</button>`;
  el.classList.remove('hidden');
  el.querySelector('button').addEventListener('click', () => { el.classList.add('hidden'); respawn(); });
}

function respawn() {
  spawnInCity(homeCity);
  player.hp = player.maxHp;
  player.mana = player.maxMana;
  player.alive = true;
  combat.clear();
  if (!isTouch) lockPointer();
}

function spawnFloatText(pos, text, color) {
  floatText.spawn(pos, text, color);
}

function tryInteract() {
  const npc = worldNpcs.npcAt(player.pos.x, player.pos.z);
  if (npc) { openNpcDialog(npc); return; }

  const chest = chestAt(dungeonChests, player.pos.x, player.pos.z);
  if (chest && !chest.opened) { openDungeonChest(chest); return; }

  const node = interactableAt(cityProps, player.pos.x, player.pos.z);
  if (!node) return;
  if (document.pointerLockElement) document.exitPointerLock();
  if (node.kind === 'shop') gameUI.openShop(node.city);
  else if (node.kind === 'depot') gameUI.openDepot(node.city);
  else if (node.kind === 'portal') gameUI.openTeleport(node.city, (dest) => teleportTo(dest));
}

function openNpcDialog(npc) {
  if (document.pointerLockElement) document.exitPointerLock();
  questLog.onEvent('talk', npc.id);
  if (npc.role === 'priest' && (player.hp < player.maxHp || player.mana < player.maxMana)) {
    player.hp = player.maxHp;
    player.mana = player.maxMana;
    audio.sfx.levelUp();
    gameUI.toast('✨ ' + t('healed'), 'levelup');
    gameUI.setVitals(player.hp, player.maxHp, player.mana, player.maxMana, xpProgress(player.exp));
  }
  gameUI.openNpc(npc, questLog, player.level, {
    questsForNpc: (id) => questsForNpc(id),
    accept: (qid) => { if (questLog.accept(qid)) { audio.sfx.click(); onQuestProgress(); maybeFirstQuestHint(); } },
    complete: (qid) => completeQuest(qid),
  });
  onQuestProgress();
}

// One-time hint the first time a quest is accepted, pointing to the quest box.
function maybeFirstQuestHint() {
  if (questLog.activeList().length === 1 && !firstQuestHintShown) {
    firstQuestHintShown = true;
    gameUI.toast('📜 ' + t('firstQuestHint'));
  }
}

function completeQuest(qid) {
  const res = questLog.complete(qid);
  if (!res) return;
  const r = res.rewards;
  if (r.gold) { inv.gold += r.gold; player.gold = inv.gold; }
  if (r.exp) gainXp(r.exp);
  if (Array.isArray(r.items)) {
    for (const itemId of r.items) {
      const item = resolveItem(itemId, () => combat.rngFloat(), player.level);
      if (item) inv.addToBackpack(item, player.level);
    }
  }
  audio.sfx.questComplete();
  gameUI.toast('🎉 ' + t('questDone'), 'levelup');
  onQuestProgress();
  recompute();
}

function openDungeonChest(chest) {
  openChestVisual(chest);
  audio.sfx.pickup();
  const item = resolveItem(chest.itemId || 'gold', () => combat.rngFloat(), player.level);
  if (item) {
    if (inv.addToBackpack(item, player.level) === 'ok') gameUI.toast(t('looted', item.name), 'loot');
    else combat.spawnDrop(player.pos, item);
  }
  if (chest.questId) { questLog.onEvent('collect', chest.questId); onQuestProgress(); }
  recompute();
}

function onQuestProgress() {
  gameUI.renderQuests(questLog);
  worldNpcs.refreshMarkers((npc) => {
    const qs = questsForNpc(npc.id);
    return qs.some((q) => questLog.canAccept(q.id, player.level) || (questLog.isActive(q.id) && questLog.readyToComplete().includes(q.id)));
  });
}

function checkDungeon() {
  const d = dungeonEntranceAt(dungeonEntrances, player.pos.x, player.pos.z);
  const id = d ? d.id : null;
  if (id !== (currentDungeon ? currentDungeon.id : null)) {
    currentDungeon = d;
    combat.setDungeon(d);
    // Shift the score by danger: deeper dungeons get the ominous abyss theme,
    // shallower ones a darker dungeon theme, and the open world its bright one.
    if (!d) audio.setMood('overworld');
    else if ((d.minLevel || 1) >= 22) audio.setMood('abyss');
    else audio.setMood('dungeon');
    if (d) {
      gameUI.toast('🕳️ ' + (d.name ? (d.name[getLang()] || d.name.es) : d.id));
      if (questLog.onEvent('reach', d.id).length) onQuestProgress();
    }
  }
}

function teleportTo(city) {
  spawnInCity(city);
  world.update(player.pos.x, player.pos.z, true);
  combat.clear();
  gameUI.closeContext();
  audio.sfx.pickup();
  if (!isTouch) lockPointer();
}

function updateClock() {
  const d = new Date();
  ui.clockTime.textContent = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  const e = daynight.elevation();
  ui.clockIcon.textContent = e > 0.12 ? '☀️' : e > -0.12 ? '🌅' : '🌙';
  const ev = eventMultipliers(d);
  let label = '';
  if (ev.event.active && ev.event.kind === 'xp') label = t('event2xp');
  else if (ev.event.active && ev.event.kind === 'drop') label = t('event2drop');
  const weekend = ev.xp >= 2 && !(ev.event.active && ev.event.kind === 'xp');
  if (weekend) label = t('weekendXp');
  ui.hudEvent.textContent = label;
  ui.hudEvent.classList.toggle('hidden', !label);
}
updateClock();
setInterval(updateClock, 10000);

function updateCamera() {
  const eyeY = player.pos.y + EYE_HEIGHT;
  if (firstPerson) {
    camera.position.set(player.pos.x, eyeY, player.pos.z);
    camera.rotation.x = player.pitch;
    camera.rotation.y = player.yaw;
  } else {
    const d = 4.4;
    const cp = Math.cos(player.pitch), sp = Math.sin(player.pitch);
    // introCam swings the camera from in front of the hero (welcome view, you
    // see your face) to behind as you start moving.
    const side = 1 - 2 * introCam; // +1 behind, -1 front
    const cx = player.pos.x + Math.sin(player.yaw) * cp * d * side;
    const cz = player.pos.z + Math.cos(player.yaw) * cp * d * side;
    let cy = eyeY - sp * d + 0.35 + introCam * 0.4;
    cy = Math.max(cy, world.heightAt(cx, cz) + 0.35, WATER_LEVEL + 0.25);
    camera.position.set(cx, cy, cz);
    camera.lookAt(player.pos.x, eyeY - 0.15, player.pos.z);
  }
  if (shakeAmount > 0.001) {
    camera.position.x += (combat.rngFloat() - 0.5) * shakeAmount;
    camera.position.y += (combat.rngFloat() - 0.5) * shakeAmount;
    shakeAmount *= 0.82;
  }
  player.char.group.visible = !firstPerson;
  player.shadow.visible = !firstPerson;
  viewModel.visible = firstPerson && player.alive;
}

// Arrow keys aim the hero's head during creation (left/right/up/down), so you
// can pose the face before starting. Captured here because Controls is disabled
// until the game begins.
let createT = 0.6;
let headYaw = 0, headPitch = 0;
let createSpin = 0;        // body rotation set by dragging in the creation screen
let createZoom = 0;        // camera distance offset set by the scroll wheel
let dragging = false, dragLastX = 0;
const arrowKeys = new Set();
addEventListener('keydown', (e) => {
  if (state !== 'create') return;
  if (e.code.startsWith('Arrow')) { arrowKeys.add(e.code); e.preventDefault(); }
});
addEventListener('keyup', (e) => arrowKeys.delete(e.code));

// Drag on the 3D view to turn the hero while creating it.
canvas.addEventListener('pointerdown', (e) => {
  if (state !== 'create') return;
  dragging = true; dragLastX = e.clientX;
});
addEventListener('pointermove', (e) => {
  if (!dragging || state !== 'create') return;
  createSpin -= (e.clientX - dragLastX) * 0.01;
  dragLastX = e.clientX;
});
addEventListener('pointerup', () => { dragging = false; });

// Scroll wheel zooms the creation camera in and out to inspect details.
canvas.addEventListener('wheel', (e) => {
  if (state !== 'create') return;
  e.preventDefault();
  createZoom = THREE.MathUtils.clamp(createZoom + Math.sign(e.deltaY) * 0.25, -1.4, 1.6);
}, { passive: false });

function updateCreationCamera(dt) {
  createT += dt * 0.5;

  // Steer the head with the arrow keys; spring back toward center when released.
  const rate = 1.8 * dt;
  if (arrowKeys.has('ArrowLeft')) headYaw += rate;
  if (arrowKeys.has('ArrowRight')) headYaw -= rate;
  if (arrowKeys.has('ArrowUp')) headPitch -= rate;
  if (arrowKeys.has('ArrowDown')) headPitch += rate;
  if (!arrowKeys.size) { headYaw *= 0.9; headPitch *= 0.9; }
  headYaw = THREE.MathUtils.clamp(headYaw, -1.1, 1.1);
  headPitch = THREE.MathUtils.clamp(headPitch, -0.7, 0.7);
  const head = player.char.parts.head;
  if (head) { head.rotation.y = headYaw; head.rotation.x = headPitch; }

  // Model faces +Z and the camera sits on +Z, so the hero faces the camera by
  // default (Math.PI). Dragging adds createSpin to turn the whole body.
  player.char.group.rotation.y = Math.PI + createSpin;
  player.char.animate(0, 0, true);
  const px = player.pos.x, pz = player.pos.z;
  const portrait = camera.aspect < 0.85;
  // Stay inside the temple pillar ring (radius ~3.4) so no pillar blocks the
  // hero. Wide screens have a narrow vertical fov, so back off a bit more and
  // aim low so feet and head both fit. createZoom moves the camera nearer to
  // inspect the face (negative) or farther for the full body (positive).
  const cz = pz + (portrait ? 3.2 : 3.3) + createZoom;
  const cy = player.pos.y + 1.05 - createZoom * 0.18;
  // Aim toward the face as you zoom in, toward the body when zoomed out.
  const lookY = player.pos.y + 0.55 - Math.min(0, createZoom) * 0.42;
  camera.position.set(px, cy, cz);
  camera.lookAt(px, lookY, pz);
  fillLight.position.set(px, player.pos.y + 3.2, cz - 0.3);
}

const camDir = new THREE.Vector3();
const clock = new THREE.Clock();

function tick() {
  requestAnimationFrame(tick);
  const dt = Math.min(clock.getDelta(), 0.05);

  daynight.update(player.pos);
  world.update(player.pos.x, player.pos.z);

  if (state === 'play') {
    const look = controls.consumeLook();
    player.applyLook(look.x, look.y);
    controls.updateMove();

    if (player.alive) {
      const wasGrounded = player.grounded;
      player.update(dt, controls);
      if (wasGrounded && !player.grounded && player.vel.y > 1) audio.sfx.jump();

      // The welcome front-view holds, then swings behind only once you actually
      // walk (looking around with the mouse does not cancel it).
      if (introCam > 0) {
        introHold = Math.max(0, introHold - dt);
        const moving = Math.hypot(player.vel.x, player.vel.z) > 0.5;
        if (introHold <= 0 || moving) introCam = Math.max(0, introCam - dt * 1.6);
      }

      if (controls.consumeAttack(!firstPerson)) doAttack();

      const isNight = daynight.isNight();
      const ev = eventMultipliers(new Date());
      combat.update(dt, player, isNight, ev);

      const picked = combat.tryPickup(player);
      if (picked) {
        const r = inv.addToBackpack(picked, player.level);
        if (r === 'ok') {
          audio.sfx.pickup();
          gameUI.toast(t('looted', picked.name), 'loot');
          if (questLog.onEvent('collect', picked.baseId).length) onQuestProgress();
          recompute();
        } else {
          combat.spawnDrop(player.pos, picked);
          gameUI.toast(t(r === 'heavy' ? 'tooHeavy' : 'full'), 'bad');
        }
      }

      checkDungeon();
      regenVitals(dt);
    }

    peers.tick(dt);
    worldNpcs.tick(dt);
    updateDungeons(dt, dungeonChests);
    floatText.update(dt);
    updateWandBolt(dt);
    updateRangeRing(dt);
    updateViewModel(dt);
    sendNetState();

    updateCamera();
    minimap.draw(player, peers.list(), combat.creatures);
    gameUI.setVitals(player.hp, player.maxHp, player.mana, player.maxMana, xpProgress(player.exp));

    const danger = player.alive && player.hp / player.maxHp < 0.3;
    if (danger !== lowHpActive) {
      lowHpActive = danger;
      lowHpVignette.classList.toggle('active', danger);
    }
  } else {
    updateCreationCamera(dt);
  }

  renderer.render(scene, camera);
}
tick();

const WAND_MANA_COST = 5; // mana spent per wand bolt
let lastNoManaToast = 0;
function doAttack() {
  if (!player.weapon) return;
  const isWand = player.weapon.type === 'wand';
  // Wands cost mana; melee/bow are free. No mana → no shot, with a throttled hint.
  if (isWand && (player.mana || 0) < WAND_MANA_COST) {
    const now = performance.now();
    if (now - lastNoManaToast > 1200) { gameUI.toast('💧 ' + t('noMana'), 'bad'); lastNoManaToast = now; }
    return;
  }
  equipVisuals.triggerSwing();
  viewSwingT = 0.3;
  audio.sfx.attack();
  flashRangeRing(); // show the reach briefly on every swing
  // Aim where you're actually looking: full camera direction (yaw + pitch), not
  // just the horizontal heading. combat.attack picks the creature in that cone.
  camera.getWorldDirection(camDir);
  const result = combat.attack(player, camDir);
  if (isWand) {
    player.mana = Math.max(0, (player.mana || 0) - WAND_MANA_COST);
    castWandBolt(camDir, result && result.creature);
  }
}

// --- Attack-range ring ----------------------------------------------------
// A flat ground ring of radius = the vocation's attackRange, so the player can
// see whether a creature is within reach. Shown two ways: a brief flash on each
// swing, and a pinned toggle (R / on-screen button). Turns green when at least
// one live creature sits inside the radius, grey otherwise.
const rangeRing = (() => {
  const geo = new THREE.RingGeometry(0.94, 1, 48); // unit ring, scaled to range
  const mat = new THREE.MeshBasicMaterial({
    color: 0x9aa0a6, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2; // lay flat on the ground
  mesh.renderOrder = 2;
  mesh.visible = false;
  scene.add(mesh);
  return mesh;
})();
let rangeRingPinned = false; // toggled by button / R key
let rangeRingFlash = 0;      // seconds of remaining auto-flash from a swing

function flashRangeRing() { rangeRingFlash = 0.6; }
function toggleRangeRing() {
  rangeRingPinned = !rangeRingPinned;
  audio.sfx.click();
}

function updateRangeRing(dt) {
  if (rangeRingFlash > 0) rangeRingFlash = Math.max(0, rangeRingFlash - dt);
  const showing = rangeRingPinned || rangeRingFlash > 0;
  rangeRing.visible = showing && state === 'play';
  if (!rangeRing.visible) return;

  const range = player.attackRange || 3;
  rangeRing.scale.set(range, range, range);
  rangeRing.position.set(player.pos.x, world.heightAt(player.pos.x, player.pos.z) + 0.06, player.pos.z);

  // Green when a live creature is within reach, grey otherwise.
  let inRange = false;
  for (const c of combat.creatures) {
    if (c.dead || c.dying) continue;
    if (Math.hypot(c.pos.x - player.pos.x, c.pos.z - player.pos.z) <= range) { inRange = true; break; }
  }
  rangeRing.material.color.setHex(inRange ? 0x6ee06e : 0x9aa0a6);
  // Pinned: steady; flash: fade out over its lifetime.
  rangeRing.material.opacity = rangeRingPinned ? 0.5 : Math.min(0.6, rangeRingFlash / 0.6 * 0.7);
}

const BOLT_SPEED = 26;
const wandBolt = (() => {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 10, 8),
    new THREE.MeshBasicMaterial({ color: 0xb89bff, transparent: true }));
  const light = new THREE.PointLight(0xb89bff, 10, 4);
  mesh.add(light);
  mesh.visible = false;
  scene.add(mesh);
  return {
    mesh, light, t: 0, active: false, target: null,
    pos: new THREE.Vector3(), vel: new THREE.Vector3(), _hand: new THREE.Vector3(),
  };
})();

// Fire the bolt from the right hand, heading toward `target` if the swing locked
// onto one (so it curves to the enemy), otherwise straight along the aim ray.
function castWandBolt(aimDir, target) {
  const color = player.weapon.color || 0xb89bff;
  wandBolt.mesh.material.color.setHex(color);
  wandBolt.light.color.setHex(color);

  // Origin: the actual right-hand position, falling back to chest height.
  const hand = player.char.parts.armR.hand;
  if (hand) hand.getWorldPosition(wandBolt._hand);
  else wandBolt._hand.set(player.pos.x, player.pos.y + 1.3, player.pos.z);
  wandBolt.pos.copy(wandBolt._hand);

  // Initial velocity: toward the target's torso, else along the look direction.
  if (target) {
    wandBolt.vel.set(target.pos.x - wandBolt.pos.x, (target.pos.y + 0.8) - wandBolt.pos.y, target.pos.z - wandBolt.pos.z);
  } else {
    wandBolt.vel.copy(aimDir);
  }
  if (wandBolt.vel.lengthSq() < 1e-4) wandBolt.vel.set(aimDir.x, aimDir.y, aimDir.z);
  wandBolt.vel.normalize().multiplyScalar(BOLT_SPEED);

  wandBolt.target = target || null;
  wandBolt.mesh.position.copy(wandBolt.pos);
  wandBolt.t = 0.6;
  wandBolt.active = true;
  wandBolt.mesh.visible = true;
}

function updateWandBolt(dt) {
  if (!wandBolt.active) return;
  wandBolt.t -= dt;
  const tgt = wandBolt.target;
  const alive = tgt && !tgt.dead && !tgt.dying;
  if (wandBolt.t <= 0 || (tgt && !alive)) { wandBolt.active = false; wandBolt.mesh.visible = false; return; }

  // Gently steer toward a live target so the path reads as "homing in", not a
  // straight line that misses once the enemy has moved.
  if (alive) {
    const want = wandBolt._hand.set(tgt.pos.x - wandBolt.pos.x, (tgt.pos.y + 0.8) - wandBolt.pos.y, tgt.pos.z - wandBolt.pos.z);
    if (want.lengthSq() > 1e-4) {
      want.normalize().multiplyScalar(BOLT_SPEED);
      wandBolt.vel.lerp(want, Math.min(1, dt * 8));
    }
    if (wandBolt.pos.distanceTo(tgt.pos) < 0.8) { wandBolt.active = false; wandBolt.mesh.visible = false; return; }
  }

  wandBolt.pos.addScaledVector(wandBolt.vel, dt);
  wandBolt.mesh.position.copy(wandBolt.pos);
  wandBolt.mesh.material.opacity = Math.min(1, wandBolt.t / 0.35);
}

let lastNetSend = 0;
function sendNetState() {
  if (!net.isOnline()) return;
  const now = performance.now();
  if (now - lastNetSend < 120) return;
  lastNetSend = now;
  net.sendState({
    x: player.pos.x, y: player.pos.y, z: player.pos.z, yaw: player.yaw,
    level: player.level, name: profile.name, sex: profile.sex, hair: profile.hair, colors: profile.colors,
    profession: player.profession,
  });
}

function serializeSave() {
  return {
    level: player.level, exp: player.exp, gold: inv.gold,
    equipment: inv.serialize(), depot: depot.serialize(), quests: questLog.serialize(),
    pos: { x: player.pos.x, y: player.pos.y, z: player.pos.z },
  };
}

function applyCloudSave(data) {
  if (!data) return;
  player.exp = data.exp || player.exp;
  player.level = xpProgress(player.exp).level;
  if (data.equipment) inv.load(data.equipment);
  if (data.depot) depot.load(data.depot);
  if (data.quests) questLog.load(data.quests);
  applyVocationStats(true);
  recompute();
}

// Hydrate a returning character from its Supabase row: level/exp, gold, gear,
// per-city depot and last position (so you resume where you logged off).
function applyCharacterRow(row) {
  player.exp = row.exp || 0;
  player.level = xpProgress(player.exp).level;
  inv.gold = row.gold || 0;
  if (row.equipment) inv.load(row.equipment);
  if (row.backpack && Array.isArray(row.backpack)) inv.backpack = row.backpack;
  if (row.depot) depot.load(row.depot);
  applyVocationStats(true);
  if (row.pos && typeof row.pos.x === 'number') {
    player.spawnAt(row.pos.x, row.pos.z);
  }
  recompute();
}

// Persist the current character to the signed-in account (position, depot,
// items, level, gold). Debounced by the caller (recompute / periodic save).
function saveToAccount() {
  if (!authCharacterId || !auth.isAvailable()) return;
  auth.saveCharacter(authCharacterId, {
    level: player.level, exp: player.exp, gold: inv.gold,
    equipment: inv.serialize(), backpack: inv.backpack,
    depot: depot.serialize(),
    pos: { x: player.pos.x, y: player.pos.y, z: player.pos.z },
  });
}

function loadProfile() {
  try {
    const p = JSON.parse(localStorage.getItem(PROFILE_KEY));
    if (p && p.colors) return { name: p.name || '', colors: { ...DEFAULT_COLORS, ...p.colors }, sex: p.sex === 'female' ? 'female' : 'male', hair: HAIR_STYLES.includes(p.hair) ? p.hair : 'short', nose: p.nose || 'small', mouth: p.mouth || 'smile', profession: getProfession(p.profession) ? p.profession : 'knight' };
  } catch (_) { /* corrupt profile is regenerated */ }
  return { name: '', colors: { ...DEFAULT_COLORS }, sex: 'male', hair: 'short', nose: 'small', mouth: 'smile', profession: 'knight' };
}

function saveProfile() { localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)); }
function saveLocal() { localStorage.setItem(SAVE_KEY, JSON.stringify(serializeSave())); }

function loadSave() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (s) applyCloudSave(s);
  } catch (_) { /* corrupt save ignored */ }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
