import * as THREE from 'three';
import { World, WATER_LEVEL } from './world.js';
import { Player, EYE_HEIGHT } from './player.js';
import { Controls } from './controls.js';
import { DayNight } from './daynight.js';
import { Weather } from './weather.js';
import { HAIR_STYLES } from './character.js';
import { initLang, getLang, setLang, applyStaticDom, t } from './i18n.js';
import { Inventory, DepotStore, instanceFromContainer, instanceFromArmor, instanceFromQuiver } from './inventory.js';
import { EquipVisuals, buildWeaponMesh, buildArrowMesh } from './equipVisuals.js';
import { wandColorForLevel, coinLootLabel, mmCoins } from './data/items.js';
import { CombatSystem } from './combat.js';
import { PlayerStatus } from './statusEffects.js';
import { buildCities, interactableAt, nearestCity, placeCities, vendorBuysItem, sellPrice, collectorPrice, CITIES, houseLotAt, MARKET_COIN_TIERS } from './cities.js';
import { HouseStore, HouseInterior, housePrice, showcaseWalls, showcaseCapacity, houseSizeKey, buildForSaleSign, buildExteriorSkin, buildFacadeDisplay, buildNameSign, FACADE_SLOTS } from './house.js';
import { MarketStore, MarketDisplay, STALL_CAP } from './market.js';
import { Minimap } from './minimap.js';
import { UI } from './ui.js';
import { Peers } from './peers.js';
import { Bots } from './bots.js';
import { ZONES } from './zones.js';
import { Net } from './net.js';
import { buildGMPanel, showAnnounceBanner } from './gm.js';
import { audio } from './audio.js';
import { makeStarterWand, getContainer, getWeapon, getArmor, getQuiver, rollWeaponInstance, instanceFromPotion, potionRestore, getLight, instanceFromLight } from './data/items.js';
import { professionStats, professionRegen, professionLevelGain, getProfession, skillsForLevel, skillsOf, getSkill, skillMana, weaponAttackSpeed, passiveCombatBonuses, jobTitle, jobAdvancementAt, spellDamageMul, isDamageSkill, allSkills } from './data/professions.js';
import { SkillSystem } from './skills.js';
import { skillIcon } from './skillIcons.js';
import { Hotbar } from './hotbar.js';
import { KeyboardPanel } from './keyboardPanel.js';
import { CharacterStats, weaponTypeToSkill } from './characterStats.js';
import { SkillPanel } from './skillPanel.js';
import { QuestTracker } from './questTracker.js';
import { currentWaypoint, questGiverInfo } from './questGuide.js';
import { Wiki } from './wiki.js';
import { xpProgress, eventMultipliers, levelXpMultiplier } from './progression.js';
import { Party, splitKillXp } from './party.js';
import { QuestLog } from './questlog.js';
import { WorldNpcs } from './worldNpcs.js';
import { questsForNpc, getQuest } from './data/quests.js';
import { MountSystem } from './mountSystem.js';
import { getMount, shopMounts, MOUNTS, mountForQuest } from './data/mounts.js';
import { buildDungeonEntrances, dungeonEntranceAt, dungeonDescendAt, dungeonOutsideAt, chestAt, openChestVisual, update as updateDungeons, DUNGEONS } from './dungeons.js';
import { getCaveFloor } from './caves.js';
import { CaveMap, CAVE_SIGHT } from './caveMap.js';
import { buildRuins, ruinAt } from './ruins.js';
import { SeaFauna } from './seafauna.js';
import { resolveItem } from './inventory.js';
import { FloatText } from './floatText.js';
import { Auth } from './auth.js';
import { AuthUI } from './authui.js';

const SEED = 20260612;
const PROFILE_KEY = 'mundum.profile';
const SAVE_KEY = 'mundum.save';

// Build marker — confirms in the console that the LATEST code is loaded (not a
// stale browser cache). If you don't see this line after a reload, the browser
// served an old cached module: open DevTools → Network → tick "Disable cache".
console.log('%cMundum build 2026-06-18 · free market stalls + house facade display', 'color:#5dd6ff;font-weight:700');

// Whether the device looks touch-driven. The player can override this with a
// manual "mobile mode" toggle (stored in localStorage) so the on-screen
// joystick/buttons can be forced ON in a desktop browser — handy for testing
// the phone layout — or OFF on a touch laptop. `auto` follows the device.
const TOUCH_MODE_KEY = 'mundum.touchMode';
// Auto-detect touch as the PRIMARY input: a coarse pointer (finger) with no fine
// pointer (mouse/trackpad). This keeps phones/tablets in touch mode but does NOT
// false-positive a touchscreen LAPTOP/2-in-1 the user drives with a mouse. The
// `ontouchstart` fallback only kicks in when matchMedia can't decide.
const deviceIsTouch = (() => {
  const coarse = matchMedia('(pointer: coarse)').matches;
  const fine = matchMedia('(pointer: fine)').matches;
  if (coarse && !fine) return true;            // phone / tablet: finger only
  if (!coarse && fine) return false;           // desktop / laptop with a mouse
  // Ambiguous (hybrid reports both, or neither): fall back to touch support, but
  // a real mousemove later flips the auto pref to desktop (see below).
  return ('ontouchstart' in window) && !matchMedia('(any-pointer: fine)').matches;
})();
function touchModePref() {
  try { return localStorage.getItem(TOUCH_MODE_KEY) || 'auto'; } catch (_) { return 'auto'; }
}
function resolveTouch() {
  const pref = touchModePref();
  return pref === 'on' ? true : pref === 'off' ? false : deviceIsTouch;
}
// `isTouch` is the effective mode at load (drives renderer quality + FOV); the
// live value used by controls is kept in sync by applyTouchMode() below.
let isTouch = resolveTouch();
if (isTouch) document.body.classList.add('touch');
let hintFadeTimer = 0;   // fades the on-screen controls reminder after a while

const canvas = document.getElementById('game');

// requestPointerLock can throw (e.g. WrongDocumentError) under some browser
// policies; never let a failed lock crash the game flow.
function lockPointer() {
  try { canvas.requestPointerLock(); } catch (_) { /* lock unavailable; ignore */ }
}

const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isTouch, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, isTouch ? 1.5 : 2));
renderer.setSize(innerWidth, innerHeight);

// --- Perf HUD (toggle with P) ----------------------------------------------
// A tiny on-screen readout of FPS + draw calls + triangles, off by default.
// Lets us confirm optimisations (e.g. the city draw-call count dropping after
// the static-mesh merge) without any external profiler. Costs nothing while
// hidden; while shown it samples once a second.
const _perfHud = (() => {
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;top:6px;left:6px;z-index:9999;display:none;'
    + 'font:11px/1.4 monospace;color:#9fe;background:rgba(0,0,0,.55);'
    + 'padding:4px 7px;border-radius:5px;pointer-events:none;white-space:pre;';
  document.body.appendChild(el);
  let frames = 0, acc = 0, fps = 0;
  return {
    visible: false,
    toggle() { this.visible = !this.visible; el.style.display = this.visible ? 'block' : 'none'; },
    sample(dt) {
      if (!this.visible) return;
      frames++; acc += dt;
      if (acc >= 1) { fps = Math.round(frames / acc); frames = 0; acc = 0; }
      const r = renderer.info.render;
      el.textContent = `FPS ${fps}\ncalls ${r.calls}\ntris ${r.triangles}`;
    },
  };
})();
addEventListener('keydown', (e) => { if (e.key === 'p' || e.key === 'P') _perfHud.toggle(); });

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(isTouch ? 70 : 75, innerWidth / innerHeight, 0.1, 3000);
camera.rotation.order = 'YXZ';
scene.add(camera);

// First-person weapon viewmodel: held in front of the camera so you see your
// own weapon (wand, sword, bow...) Minecraft-style — low in the lower-right of
// the screen, with a skin-toned fist gripping it.
const viewModel = new THREE.Group();
viewModel.position.set(0.34, -0.5, -0.7);
viewModel.rotation.set(0.1, -0.3, 0);
camera.add(viewModel);
let viewModelMesh = null;
let viewModelType = null;      // drives the per-weapon viewmodel pose + motion
let viewModelBow = null;       // the bow mesh, when a bow is held (string draw)
let viewHand = null;           // the first-person fist that grips the held weapon
let isCrossbowVM = false;      // the held bow is actually a crossbow (different aim pose)
let bowLoosed = false;         // arrow already loosed this swing → keep the nocked arrow hidden
let viewSwingT = 0, viewSwingDur = 0.3;
// Off-hand shield viewmodel: a separate group on the LEFT of the screen, with
// its own forearm/fist, shown only when a one-handed weapon + shield are held.
const viewShield = new THREE.Group();
viewShield.position.set(-0.42, -0.5, -0.72);
viewShield.rotation.set(0.12, 0.5, 0.0);
camera.add(viewShield);
let viewShieldMesh = null;     // the shield + forearm group currently shown (or null)
// Resting transform of the held weapon, chosen per weapon type so each sits
// naturally in front of the camera (a bow held sideways, a wand pointed up...).
// All sit low (Minecraft-style) so a hand-and-weapon reads in the lower screen.
const VIEW_REST_POS = new THREE.Vector3(0.34, -0.5, -0.7);
const VIEW_REST_ROT = new THREE.Euler(0.1, -0.3, 0);
// Fully-drawn aiming pose: the bow lifts from its resting spot up toward center
// and straightens so the arrow lines up with the crosshair. The motion lerps
// from VIEW_REST_* to these as draw goes 0→1.
const BOW_AIM_POS = new THREE.Vector3(0.12, -0.24, -0.72);
const BOW_AIM_ROT = new THREE.Euler(0.0, 0.0, 0.0);   // arrow lined up with the crosshair, into the screen
const CROSSBOW_AIM_POS = new THREE.Vector3(0.12, -0.22, -0.7);
const CROSSBOW_AIM_ROT = new THREE.Euler(0.0, 0.0, 0.0);

// A simple low-poly first-person fist (skin-toned), built from a rounded palm
// plus a stubby thumb so it reads as a hand gripping whatever it's parented to.
// Built fresh each time so it picks up the current skin colour. The caller
// positions/rotates it at the weapon's grip.
function buildViewHand() {
  const skin = (player && player.char && player.char.mats && player.char.mats.skin)
    ? player.char.mats.skin.color.getHex()
    : 0xf2c79b;
  const mat = new THREE.MeshLambertMaterial({ color: skin });
  const g = new THREE.Group();
  // The fist: a slightly squashed sphere reads as a closed hand around the grip.
  const palm = new THREE.Mesh(new THREE.SphereGeometry(0.085, 12, 10), mat);
  palm.scale.set(1.0, 0.85, 1.15);
  // A short forearm trailing back toward the camera so the hand isn't floating.
  const wrist = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.16, 6, 10), mat);
  wrist.position.set(0.0, -0.02, 0.13);
  wrist.rotation.x = Math.PI / 2;
  // A stubby thumb wrapping over the top of the grip.
  const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.026, 0.06, 5, 8), mat);
  thumb.position.set(-0.05, 0.05, 0.0);
  thumb.rotation.set(0.4, 0, 0.7);
  g.add(palm, wrist, thumb);
  return g;
}
function setViewModel(item, level) {
  if (viewModelMesh) { viewModel.remove(viewModelMesh); viewModelMesh.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); }); viewModelMesh = null; }
  if (viewHand) { viewModel.remove(viewHand); viewHand.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); }); viewHand = null; }
  viewModelType = item ? item.type : null;
  viewModelBow = null;
  if (!item) return;
  // Wands glow with the vocation's magic color (sorcerer purple, druid green).
  const color = item.type === 'wand' ? (player.spellColor || wandColorForLevel(level)) : (item.color || 0xb0b0b0);
  const isCrossbow = item.type === 'bow' && /crossbow|arbalest|ballista/.test(item.baseId || '');
  isCrossbowVM = isCrossbow;
  // frontFacing: build the bow/crossbow aiming +Z (no in-hand yaw) so the
  // viewmodel can point it cleanly into the screen.
  viewModelMesh = buildWeaponMesh(item.type, color, {
    id: item.baseId, frontFacing: true,
    element: item.element, levelReq: item.levelReq || 1, twoHanded: item.twoHanded,
  });
  // A skin-toned fist gripping the weapon. It's parented to the viewModel group
  // (same as the weapon) so it swings/draws along with it. Positioned per type
  // at roughly where the grip sits once the weapon mesh is oriented below.
  viewHand = buildViewHand();
  if (isCrossbow) {
    // Aimed like a rifle, into the screen. Aim is +Z; rotate 180° about Y so it
    // fires down -Z. Held to the right and low, the way you'd shoulder it.
    viewModelMesh.rotation.set(0, Math.PI, 0);
    viewModelMesh.scale.setScalar(0.95);
    viewModelBow = viewModelMesh; // shares the bow draw branch (short string pull)
    if (viewModelBow.userData.setDraw) viewModelBow.userData.setDraw(0);
    VIEW_REST_POS.set(0.3, -0.46, -0.78);
    VIEW_REST_ROT.set(-0.04, 0, 0);
    // Hand on the stock, gripping from below-behind the crossbow body.
    viewHand.position.set(0.0, -0.08, 0.12);
    viewHand.rotation.set(0.2, 0, 0);
  } else if (item.type === 'bow') {
    // Aim is +Z; rotate 180° about Y so the arrow flies into the screen with the
    // limbs vertical and the string tensioning back toward the player. Held off
    // to the RIGHT and low (Minecraft-style), not centered; it raises up into the
    // hand on attack (see updateViewModel).
    viewModelMesh.rotation.set(0, Math.PI, 0);
    viewModelMesh.scale.setScalar(0.9);
    viewModelBow = viewModelMesh;
    if (viewModelBow.userData.setDraw) viewModelBow.userData.setDraw(0);
    VIEW_REST_POS.set(0.34, -0.52, -0.8);
    VIEW_REST_ROT.set(0.15, -0.25, -0.1); // canted in the hand, tip up-left
    // The bow hand grips the riser at the middle of the limbs.
    viewHand.position.set(0.0, 0.0, 0.06);
    viewHand.rotation.set(0.1, 0, 0.2);
  } else if (item.type === 'wand') {
    viewModelMesh.scale.setScalar(1.1);
    VIEW_REST_POS.set(0.34, -0.5, -0.6);
    VIEW_REST_ROT.set(-0.2, -0.3, 0.1);
    // Wand grips are at the base of the rod, just below the model origin.
    viewHand.position.set(0.0, -0.12, 0.04);
    viewHand.rotation.set(0.3, 0, 0.15);
  } else {
    viewModelMesh.scale.setScalar(1.1);
    VIEW_REST_POS.set(0.32, -0.5, -0.7);
    VIEW_REST_ROT.set(0.1, -0.3, 0);
    // Melee grips (sword/axe/club) sit just below the guard at the model base.
    viewHand.position.set(0.0, -0.1, 0.04);
    viewHand.rotation.set(0.3, 0, 0.12);
  }
  viewModel.position.copy(VIEW_REST_POS);
  viewModel.rotation.copy(VIEW_REST_ROT);
  viewModel.add(viewModelMesh);
  viewModel.add(viewHand);
}

// A minimal first-person heater shield with its own forearm/fist, shown on the
// LEFT of the screen. buildShieldMesh is NOT exported from equipVisuals.js, so a
// compact inline version lives here (boxy heater face + steel rim + boss). It is
// hidden whenever a bow or a two-handed weapon is held (the off-hand is taken).
function setViewShield(shieldItem, weaponItem) {
  if (viewShieldMesh) { viewShield.remove(viewShieldMesh); viewShieldMesh.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); }); viewShieldMesh = null; }
  // Only draw the off-hand SHIELD viewmodel for an actual shield (a dual-wielded
  // off-hand weapon is shown by the third-person model, not here).
  const blocked = !shieldItem || shieldItem.type !== 'shield'
    || (weaponItem && (weaponItem.type === 'bow' || weaponItem.twoHanded));
  if (blocked) return;
  const color = shieldItem.color || 0x8a5a2b;
  const face = new THREE.MeshLambertMaterial({ color });
  const steel = new THREE.MeshStandardMaterial({ color: 0xc4c9cf, metalness: 0.7, roughness: 0.4 });
  const skin = (player && player.char && player.char.mats && player.char.mats.skin)
    ? player.char.mats.skin.color.getHex()
    : 0xf2c79b;
  const skinMat = new THREE.MeshLambertMaterial({ color: skin });
  const g = new THREE.Group();
  // Heater outline, extruded thin, the face turned to point forward-out-left.
  const s = new THREE.Shape();
  s.moveTo(-0.18, 0.2);
  s.lineTo(0.18, 0.2);
  s.lineTo(0.18, -0.02);
  s.quadraticCurveTo(0.18, -0.2, 0, -0.28);
  s.quadraticCurveTo(-0.18, -0.2, -0.18, -0.02);
  s.lineTo(-0.18, 0.2);
  const body = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2 }), face);
  const rim = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.03, bevelEnabled: false }), steel);
  rim.scale.set(1.08, 1.08, 1);
  rim.position.z = -0.012;
  const boss = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 10), steel);
  boss.position.set(0, 0.04, 0.08);
  boss.scale.set(1, 1, 0.6);
  g.add(body, rim, boss);
  // A skin-toned fist + forearm behind the shield so it reads as carried.
  const fist = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 10), skinMat);
  fist.scale.set(1.0, 0.85, 1.15);
  fist.position.set(0.04, -0.02, -0.06);
  const forearm = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.2, 6, 10), skinMat);
  forearm.position.set(0.04, -0.02, 0.06);
  forearm.rotation.x = Math.PI / 2;
  g.add(fist, forearm);
  // Turn the face (built in XY, normal +Z) to look forward and slightly outward
  // to the left, the way you'd brace a shield in front of you.
  g.rotation.set(0.0, -0.2, 0.0);
  viewShieldMesh = g;
  viewShield.add(viewShieldMesh);
}

// Rebuild the first-person hands so they pick up the current skin colour. The
// fists are built once per equip (reading player.char.mats.skin then), so when
// the player recolours their skin in the editor we re-run the builders with the
// equipped weapon/shield to refresh the tone live, without a re-equip.
function refreshViewHands() {
  setViewModel(inv.equip.weapon, player.level);
  setViewShield(inv.equip.shield, inv.equip.weapon);
}

// Animate the first-person weapon. Each weapon gets its own motion: melee/wand
// swing-and-bob, the bow draws its string back then snaps forward on release.
function updateViewModel(dt) {
  if (viewSwingT <= 0) {
    viewModel.rotation.copy(VIEW_REST_ROT);
    viewModel.position.copy(VIEW_REST_POS);
    if (viewModelBow && viewModelBow.userData.setDraw) viewModelBow.userData.setDraw(0);
    return;
  }
  viewSwingT = Math.max(0, viewSwingT - dt);
  const p = 1 - viewSwingT / viewSwingDur;

  if (viewModelType === 'bow') {
    // Tension the string then release; as you draw, the bow RAISES from its
    // resting spot off to the right up into a centered aiming pose (like nocking
    // and lifting it into your sightline), then drops back on release.
    const draw = p < 0.55 ? p / 0.55 : Math.max(0, 1 - (p - 0.55) / 0.18);
    // Once the arrow is loosed, the nock is empty — show the string still
    // recoiling forward, but with no arrow on it (the real one is now flying).
    if (viewModelBow && viewModelBow.userData.setDraw) {
      viewModelBow.userData.setDraw(draw);
      if (bowLoosed && viewModelBow.userData.arrow) viewModelBow.userData.arrow.visible = false;
    }
    // Aiming pose: pulled toward center, lifted, untilted, drawn toward the eye.
    const AIM_POS = isCrossbowVM ? CROSSBOW_AIM_POS : BOW_AIM_POS;
    const AIM_ROT = isCrossbowVM ? CROSSBOW_AIM_ROT : BOW_AIM_ROT;
    viewModel.position.set(
      VIEW_REST_POS.x + (AIM_POS.x - VIEW_REST_POS.x) * draw,
      VIEW_REST_POS.y + (AIM_POS.y - VIEW_REST_POS.y) * draw,
      VIEW_REST_POS.z + (AIM_POS.z - VIEW_REST_POS.z) * draw);
    viewModel.rotation.set(
      VIEW_REST_ROT.x + (AIM_ROT.x - VIEW_REST_ROT.x) * draw,
      VIEW_REST_ROT.y + (AIM_ROT.y - VIEW_REST_ROT.y) * draw,
      VIEW_REST_ROT.z + (AIM_ROT.z - VIEW_REST_ROT.z) * draw);
  } else if (viewModelType === 'wand') {
    // A forward jab: push the wand into the scene, dip, recoil.
    const k = Math.sin(p * Math.PI);
    viewModel.rotation.set(VIEW_REST_ROT.x - k * 0.5, VIEW_REST_ROT.y, VIEW_REST_ROT.z);
    viewModel.position.set(VIEW_REST_POS.x, VIEW_REST_POS.y - k * 0.04, VIEW_REST_POS.z - k * 0.12);
  } else {
    const k = Math.sin(p * Math.PI);
    viewModel.rotation.set(VIEW_REST_ROT.x - k * 0.9, VIEW_REST_ROT.y, VIEW_REST_ROT.z + k * 0.5);
    viewModel.position.set(VIEW_REST_POS.x, VIEW_REST_POS.y - k * 0.08, VIEW_REST_POS.z);
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
// Day/night follows the device's real clock now: night when it's night, day when
// it's day. (Was pinned to midday via forceDay.)
const weather = new Weather(scene, world);
window.weather = weather;   // handy for testing from the console: weather.setState('storm')
placeCities(world);
const citiesBuild = buildCities(scene, world);
const cityProps = citiesBuild.props;
const citiesGroup = citiesBuild.group;
// Temple healing auras (tagged in cities.js), collected once so the tick can
// gently pulse them without traversing the whole city group every frame.
const templeAuras = [];
citiesGroup.traverse((o) => { if (o.userData && o.userData.templeAura) templeAuras.push(o); });
// Market-square coins (the spinning mm-coin on each market statue), collected once
// so the tick can spin them + cycle their colour through the currency tiers.
const marketCoins = [];
citiesGroup.traverse((o) => { if (o.userData && o.userData.marketCoin) marketCoins.push(o.userData.marketCoin); });
// City statues (tagged in statueLore.js): each carries its hero's legend + a glow
// base/light. Collected once so the tick can ramp the night glow, and so pressing
// near one shows its legend. { name, legend, kind, x, z, glow:{base,light} }.
const cityStatues = [];
citiesGroup.traverse((o) => {
  if (o.userData && o.userData.statue) {
    cityStatues.push({ ...o.userData.statue, glow: o.userData.statueGlow });
  }
});
// Buyable house lots in the round towns (cities.js owns the shells; house.js
// owns ownership, interiors and decoration). The player owns at most one.
const houseLots = citiesBuild.houses || [];
const houseLotById = new Map(houseLots.map((h) => [h.id, h]));
const houseStore = new HouseStore();
// Per-character CAVE EXPLORATION memory (fog of war) — the underground map fills
// in as you walk and is saved, so each player keeps their own map history.
const caveMap = new CaveMap();
// Player-placed NAMED MAP MARKS (Tibia-style "I was here, I'll come back"). Each:
// { id, name, place:'surface'|'cave', x, z, dungeonId?, floor? }. Saved per char.
let mapMarks = [];
let _markSeq = 1;
// Free market: cache each city's stall ring (positions built in cities.js) so
// interacting can find the stall the player stands at. The stall CONTENTS live
// in Supabase (auth.js market_* methods), never here.
const marketStore = new MarketStore();
for (const p of cityProps) marketStore.setLayout(p.city.id, p.stalls || []);
// The 3D goods shown ON the stall counters (rebuilt per city as listings load).
const marketDisplay = new MarketDisplay(scene, marketStore);
// Ground height per city, so stall goods stand at the right level.
const cityGroundY = new Map();
for (const c of CITIES) cityGroundY.set(c.id, c.groundY != null ? c.groundY : world.heightAt(c.x, c.z));
const dungeonBuild = buildDungeonEntrances(scene, world);
const dungeonEntrances = dungeonBuild.entrances;
const dungeonChests = dungeonBuild.chests;
// Open-air ruins (ghost town, ruined towers, fallen temple, frozen keep): surface
// hunting grounds whose haunting creature families spawn within their radius.
const ruinsBuild = buildRuins(scene, world);

const DEFAULT_COLORS = { skin: '#f2c79b', shirt: '#3498db', pants: '#34495e', hair: '#4a2f1b' };
let profile = loadProfile();

// The Game Master is the single hero whose name is exactly "gm". Players CANNOT
// create that name (the creation screen rejects it — see validateCharName), so
// the GM character is provisioned only via the database (see the Supabase SQL).
// The flag drives the robe/cape (built in Player's constructor), 5x speed,
// creature invisibility and the GM control panel.
//
// Quick toggle: set FORCE_GM to true to make ANY character a Game Master,
// regardless of its name (handy for local testing). Leave it false for play.
const FORCE_GM = false;
const GM_NAME = 'gm';
function isGMName(name) { return FORCE_GM || String(name || '').trim().toLowerCase() === GM_NAME; }
profile.gm = isGMName(profile.name);

// Home city: where the player spawns and respawns. Defaults to the nearest city
// at the origin (the capital); a player can change it at a Town Hall (residency).
let homeCity = CITIES.find((c) => c.id === profile.homeCityId) || nearestCity(0, 0);
const player = new Player(scene, world, profile);
// The inventory must exist before applyVocationStats()/recomputeCombatStats()
// run during boot (they read equipped-ring bonuses via inv.skillBonus/equipBonus).
const inv = new Inventory();
spawnInCity(homeCity);
world.update(player.pos.x, player.pos.z, true);

// Spawn just outside the temple pillar ring, facing away from the city center,
// so the third-person camera never clips a pillar on arrival. The -z side is
// clear (shop is at +x, depot at -x, portal at +z).
function spawnInCity(city) {
  // Default spawn is just inside the south gate, facing in. If that exact spot
  // sits inside a prop/wall collision (a plaza statue, a fountain, etc.), nudge
  // outward in a ring until a clear, walkable spot is found — so the player is
  // never wedged against a solid and unable to walk on spawn.
  let sx = city.x, sz = city.z - 8;
  if (world.solidAt(sx, sz, 0.4)) {
    let found = false;
    for (let r = 2; r <= 16 && !found; r += 2) {
      for (let i = 0; i < 12 && !found; i++) {
        const a = (i / 12) * Math.PI * 2;
        const x = city.x + Math.cos(a) * r, z = (city.z - 8) + Math.sin(a) * r;
        if (!world.solidAt(x, z, 0.4) && world.heightAt(x, z) > 0.6) { sx = x; sz = z; found = true; }
      }
    }
  }
  player.spawnAt(sx, sz);
  player.yaw = Math.PI;
}

player.level = 1;
player.exp = 0;
player.profession = getProfession(profile.profession) ? profile.profession : 'knight';
let charStats = new CharacterStats(player.profession);
applyVocationStats(true);
// The party the local player belongs to (just themselves until they group up).
// Drives the shared-kill XP split and the group XP bonus (see party.js).
const party = new Party('self', player.profession);
player.defense = 0;
player.weapon = null;
player.speedBonus = 0;
player.gold = 0;
player.alive = true;
player.gm = !!profile.gm; // 5x speed + creature invisibility (read in player.js/combat.js)
player.mounted = false;   // true while riding (drives the seated pose)
player.mountBonus = 0;    // +0.3 while mounted (read in player.js)
player.mountJumpMul = 1;  // ×1.3 jump while mounted
player.mountRiderY = 0;   // saddle lift for the rider while mounted

// Rideable mounts: +30% speed / +30% jump. Owns the active beast model and the
// owned-mount set; persisted with the character (serialize/load below).
const mounts = new MountSystem(scene, player);

// Recompute maxHp/maxMana from the current vocation + level. When `fill` is
// true (creation, level-up, respawn) HP/mana are topped to full; otherwise the
// current values are clamped to the new maxima (e.g. loading a save).
function applyVocationStats(fill) {
  // Keep the inventory's vocation in sync so equip gating knows the class. The
  // very first call happens before `inv` is constructed (module init order), so
  // guard against the temporal-dead-zone reference.
  try { if (inv && inv.setProfession) inv.setProfession(player.profession); } catch (_) {}
  // Keep the party's record of MY profession current (drives the diversity bonus).
  try { if (typeof party !== 'undefined' && party) party.setSelf(party.selfId, 'You', player.profession); } catch (_) {}
  const s = professionStats(player.profession, player.level);
  const sb = charStats ? charStats.bonusHp() : 0;
  const mb = charStats ? charStats.bonusMana() : 0;
  // Passive skills can raise max HP/mana (Iron Body, Mana Font, Blessing).
  const passives = charStats
    ? passiveCombatBonuses(player.profession, charStats.skillLevels)
    : { maxHpMul: 1, maxManaMul: 1 };
  player.maxHp = Math.round((s.maxHp + sb) * (passives.maxHpMul || 1));
  player.maxMana = Math.round((s.maxMana + mb) * (passives.maxManaMul || 1));
  player.spellColor = s.spellColor;
  // Stash the vocation's base reach/damage; recomputeCombatStats() folds in the
  // held weapon, DEX, and any passive skills to get the values combat reads.
  player.baseAttackRange = s.attackRange;
  player.baseDamageMul = s.damageMul;
  recomputeCombatStats();
  if (fill || player.hp == null) player.hp = player.maxHp;
  else player.hp = Math.min(player.hp, player.maxHp);
  if (fill || player.mana == null) player.mana = player.maxMana;
  else player.mana = Math.min(player.mana, player.maxMana);
}

// Fold the held weapon, DEX, and passive skills into the combat stats that the
// game loop and CombatSystem read each frame:
//   • attackRange / damageMul — vocation base × passive multipliers
//   • attackSpeed — seconds between basic attacks (the left-click cooldown):
//       weapon base ÷ (DEX speed × passive speed). Lower = faster.
// Called whenever the weapon, level, or spent skill points change.
function recomputeCombatStats() {
  const passives = charStats
    ? passiveCombatBonuses(player.profession, charStats.skillLevels)
    : { attackSpeedMul: 1, rangeMul: 1, damageMul: 1 };
  player.attackRange = (player.baseAttackRange || 0) * passives.rangeMul;
  // Keep the buff-free product so updateBuffs() can fold the live attack buff
  // (Battle Focus / Battle Roar / Iron Avatar) into player.damageMul each frame —
  // that's what makes a knight's buff raise its PHYSICAL (basic) attack, not just
  // its spells.
  player.passiveDamageMul = (player.baseDamageMul || 1) * passives.damageMul;
  // Re-fold any live attack buff. activeBuffs may be in its temporal-dead-zone
  // during the very first setup call, so reach for it defensively; applyBuff()
  // and updateBuffs() keep player.damageMul in sync once buffs actually exist.
  let buffDmg = 1;
  try { buffDmg = buffMods().damageMul; } catch (_) { buffDmg = 1; }
  player.damageMul = player.passiveDamageMul * buffDmg;
  const weaponType = player.weapon ? player.weapon.type : null;
  // The Tibia use-skill for the held weapon drives basic-attack damage + miss
  // (read by CombatSystem.attack).
  player.weaponSkill = (charStats ? charStats.weaponSkillLevel(weaponType) : 10)
    + (inv.skillBonus ? inv.skillBonus(weaponTypeToSkill(weaponType)) : 0);   // ring/amulet skill rings
  // Archer quiver: its flat arrowAtk adds to the bow's effective attack
  // (combat.js _resolveHit folds player.arrowAtk in for bows only).
  player.arrowAtk = (weaponType === 'bow' && inv.equipBonus) ? inv.equipBonus('arrowAtk') : 0;
  const base = weaponAttackSpeed(weaponType);
  const dexMul = charStats ? charStats.attackSpeedMul() : 1;
  const speedMul = dexMul * passives.attackSpeedMul;
  // Clamp the floor so even a fully-boosted build can't trivialise the cooldown.
  player.attackSpeed = Math.max(0.18, base / speedMul);
}

// Vocation-based regeneration. Each stat ticks on its own interval (e.g. mage
// gains +3 mana every 2s and +1 hp every 5s). Accumulators carry leftover dt
// so the cadence stays accurate regardless of frame rate.
let regenHpAcc = 0;
let regenManaAcc = 0;
// How much faster HP regenerates while at a temple, and how close counts as "at"
// the temple (a hair beyond the ~4.2m marble floor so standing on it always
// qualifies). The temple's green aura signals this healing zone in the world.
const TEMPLE_HEAL_MUL = 10;
const TEMPLE_HEAL_RADIUS = 6;
// True when the player is standing on/by a city temple (surface only). Temples
// sit at the city centre (cityProps[].temple).
function atTemple() {
  if (place !== 'surface') return false;
  for (const p of cityProps) {
    const tp = p.temple;
    if (tp && Math.hypot(tp.x - player.pos.x, tp.z - player.pos.z) < TEMPLE_HEAL_RADIUS) return true;
  }
  return false;
}
function regenVitals(dt) {
  if (!player.alive) return;
  const r = professionRegen(player.profession);
  regenHpAcc += dt;
  regenManaAcc += dt;
  // Standing on/by a temple heals HP 10× faster — a clear sanctuary that mends
  // you while you rest there.
  const hpEvery = atTemple() ? r.hp.every / TEMPLE_HEAL_MUL : r.hp.every;
  if (player.hp < player.maxHp && regenHpAcc >= hpEvery) {
    const ticks = Math.floor(regenHpAcc / hpEvery);
    player.hp = Math.min(player.maxHp, player.hp + ticks * r.hp.amount);
    regenHpAcc -= ticks * hpEvery;
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
  // Ring/amulet flat per-second regen (Life Ring +N hp/s, Mana Ring +N mana/s).
  const hpr = inv.equipBonus ? inv.equipBonus('hpRegenPerSec') : 0;
  const mpr = inv.equipBonus ? inv.equipBonus('manaRegenPerSec') : 0;
  if (hpr || mpr) {
    ringRegenAcc += dt;
    if (ringRegenAcc >= 1) {
      const secs = Math.floor(ringRegenAcc);
      if (hpr && player.hp < player.maxHp) player.hp = Math.min(player.maxHp, player.hp + secs * hpr);
      if (mpr && player.mana < player.maxMana) player.mana = Math.min(player.maxMana, player.mana + secs * mpr);
      ringRegenAcc -= secs;
    }
  } else { ringRegenAcc = 0; }

  // Mount regen: some mounts heal HP (scorpion) or mana (stag) every few seconds
  // WHILE ridden. Each uses its own accumulator + interval from the mount's bonus.
  const mHp = player.mounted ? player.mountHpRegen : null;
  const mMana = player.mounted ? player.mountManaRegen : null;
  if (mHp) {
    mountHpAcc += dt;
    if (mountHpAcc >= mHp.every) {
      const ticks = Math.floor(mountHpAcc / mHp.every);
      if (player.hp < player.maxHp) player.hp = Math.min(player.maxHp, player.hp + ticks * mHp.amount);
      mountHpAcc -= ticks * mHp.every;
    }
  } else { mountHpAcc = 0; }
  if (mMana) {
    mountManaAcc += dt;
    if (mountManaAcc >= mMana.every) {
      const ticks = Math.floor(mountManaAcc / mMana.every);
      if (player.mana < player.maxMana) player.mana = Math.min(player.maxMana, player.mana + ticks * mMana.amount);
      mountManaAcc -= ticks * mMana.every;
    }
  } else { mountManaAcc = 0; }
}
let ringRegenAcc = 0;
let mountHpAcc = 0, mountManaAcc = 0;

const depot = new DepotStore();
const questLog = new QuestLog();
const worldNpcs = new WorldNpcs(scene, world, citiesBuild.interiors);
let equipVisuals = new EquipVisuals(player.char);
const peers = new Peers(scene, world);
const bots = new Bots(scene, world);
const net = new Net();
// Last-known level per connected peer, so we can fire bot congratulations only
// when a real player's level actually rises (see net.onPeerUpdate).
const peerLevels = new Map();
let currentDungeon = null;
let lastRuinId = null;           // the surface ruin the player was last inside
let firstQuestHintShown = false;
let shakeAmount = 0;
let lowHpActive = false;
const lowHpVignette = document.getElementById('low-hp-vignette');
const floatText = new FloatText(scene);
const seaFauna = new SeaFauna(scene, world);
const skillSystem = new SkillSystem(scene, world);
const cooldowns = {}; // skill id -> { until, total } absolute cooldown timing
// Active timed self-buffs from buff skills (Sharp Eyes, Battle Roar, shields…).
// Each: { id, until, damageMul, defenseMul, critAdd, regenPerSec }. Their effects
// are folded into combat by buffMods()/buffRegenTick() and expire on their own.
const activeBuffs = [];
let nowSec = 0;       // running game clock in seconds, advanced each frame
let nextBasicAttackAt = 0; // game clock at which the next basic attack may fire
let lastFullWarn = -99;    // game clock of the last "can't carry" toast (throttles it)

let firstPerson = true;
let introCam = 0;   // 1 = front welcome view, decays to 0 (behind) on first move
let _evClock = 0, _evCached = null;   // cached daily event multipliers (refreshed every 30s)
let _frame = 0;   // running frame counter, used to throttle work that needn't run at 60Hz
let _camHitDist = Infinity;   // cached camera-wall march result (recomputed every few frames)
const _crosshairEl = document.getElementById('crosshair');   // cached (looked up every frame otherwise)

// Quest waypoint arrow on/off (persisted). Toggled from the Quests panel.
const QUEST_ARROW_KEY = 'mundum.questArrow';
let showQuestArrow = (() => { try { return localStorage.getItem(QUEST_ARROW_KEY) !== 'off'; } catch (_) { return true; } })();
function toggleQuestArrow() {
  showQuestArrow = !showQuestArrow;
  try { localStorage.setItem(QUEST_ARROW_KEY, showQuestArrow ? 'on' : 'off'); } catch (_) {}
  if (!showQuestArrow) { const a = document.getElementById('quest-arrow'); if (a) a.classList.add('hidden'); }
  return showQuestArrow;
}
// Cached current waypoint (recomputed on quest progress, not every frame).
let _waypoint = null;
let _questPoi = null;   // the live minimap POI object for the quest destination
function refreshWaypoint() {
  _waypoint = currentWaypoint(questLog, questLog.activeList());
  // Mirror it onto the minimap as a single quest POI. Remove the old one, add the
  // new (minimap.pois is the array the minimap renders each frame).
  if (typeof minimap !== 'undefined' && minimap && Array.isArray(minimap.pois)) {
    if (_questPoi) { const i = minimap.pois.indexOf(_questPoi); if (i >= 0) minimap.pois.splice(i, 1); }
    _questPoi = null;
    if (_waypoint) { _questPoi = { x: _waypoint.x, z: _waypoint.z, icon: '📍' }; minimap.pois.push(_questPoi); }
  }
}
let introHold = 0;  // seconds the front view is held before it can swing behind
let state = 'create';
let authCharacterId = null;  // the Supabase character row id for cloud saves
let _cloudSavedAt = 0;       // updated_at (ms) of the cloud row applied this session

// Cave/underground state (see caves.js). 'surface' or 'cave'.
// NB: named `place`, not `location`, so it never shadows window.location.
// 'surface', 'cave', or 'house' (inside an instanced house interior).
let place = 'surface';
let activeCave = null;
let caveTransitioning = false;
// House interior state. activeHouse is the HouseInterior the player is inside;
// houseReturn is where they spawn back outside; activeHouseLot is its lot.
let activeHouse = null;
let activeHouseLot = null;
let houseTransitioning = false;
const houseReturn = new THREE.Vector3();
let _camBeforeHouse = false;   // outdoor camera mode, restored when leaving a house
// Remote visitors' house snapshots: lotId -> { owner, colors, light, walls, bans }.
const visitedHouses = new Map();
// The exterior dressing (for-sale signs + the owner's recolour skin) added to the
// surface, rebuilt whenever ownership / colours change.
let houseExteriorGroup = null;
// Which floor the cave minimap is currently SHOWING (lets you peek up/down a
// floor on the map without moving). Reset to the player's floor on each descent.
let caveViewFloor = 0;
const surfaceReturn = new THREE.Vector3();

const fillLight = new THREE.PointLight(0xffeedd, 9, 9);
scene.add(fillLight);

// --- Player light: a torch you light by double-clicking it in the fire (extra)
// equip slot, plus any passive glow gem carried in the backpack. The brighter of
// the two drives a point light that follows the player, with a warm flicker.
// It matters most at night and in caves.
let torchOn = false;
let torchItem = null;     // the carried torch instance, if any
let gemItem = null;       // the strongest passive glow gem carried, if any
const playerLight = new THREE.PointLight(0xffb24d, 0, 9, 1.6);
playerLight.position.set(0, 1.4, 0);
scene.add(playerLight);
let lightPhase = 0;

// Scan the inventory for a torch and the best passive gem; refresh which light
// the player can use. Called whenever the inventory changes (recompute()).
function recomputeLight() {
  torchItem = null; gemItem = null;
  // The TORCH only lights when it sits in the fire (extra) equip slot — its own
  // pocket. A torch buried in the backpack gives NO light (you have to put it in
  // the antorcha slot to use it). Passive glow GEMS still shine from anywhere in
  // the bag, since they're an always-on aura, not a held light source.
  const e = inv.equip.extra;
  if (e && e.kind === 'light' && !e.passive) torchItem = e;
  const scanGem = (it) => {
    if (!it || it.kind !== 'light' || !it.passive) return;
    if (!gemItem || (it.intensity || 0) > (gemItem.intensity || 0)) gemItem = it;
  };
  scanGem(e);
  for (const it of inv.backpack) {
    scanGem(it);
    if (it && it.contents) for (const inner of it.contents) scanGem(inner);
  }
  if (!torchItem) torchOn = false; // can't keep a torch lit you no longer carry
}

function toggleTorch() {
  if (!torchItem) { gameUI.toast(t('noTorch') || 'No torch'); return; }
  torchOn = !torchOn;
  audio.sfx.click?.();
  gameUI.toast((torchOn ? '🔥 ' : '🕯️ ') + torchItem.name);
}

// Per-frame: position the light on the player and blend torch + gem with a soft
// flicker. Underground/at night it reads strongest; by day it's barely visible.
function updatePlayerLight(dt) {
  lightPhase += dt * 9;
  const flicker = 0.85 + Math.sin(lightPhase) * 0.08 + Math.sin(lightPhase * 2.3) * 0.05;
  let radius = 0, intensity = 0, color = 0xffb24d;
  if (torchOn && torchItem) { radius = torchItem.radius; intensity = torchItem.intensity; color = torchItem.glowColor; }
  if (gemItem) {
    // The gem aura stacks: take the larger reach, add some intensity, tint toward the gem.
    radius = Math.max(radius, gemItem.radius);
    intensity += gemItem.intensity * 0.9;
    if (!torchOn) color = gemItem.glowColor;
  }
  // Daylight on the surface washes the aura out so it's mainly a night/cave aid.
  const dayFactor = place === 'cave' ? 0 : Math.max(0, daynight.elevation());
  intensity *= 1 - dayFactor * 0.7;

  playerLight.color.setHex(color);
  playerLight.distance = radius;
  playerLight.intensity = intensity * flicker;
  playerLight.position.set(player.pos.x, player.pos.y + 1.4, player.pos.z);
  playerLight.visible = intensity > 0.01;
}

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
  btnInteract: document.getElementById('btn-interact'),
  btnChat: document.getElementById('btn-chat'),
  creation: document.getElementById('creation'),
  nameInput: document.getElementById('name-input'),
  swatchRows: document.getElementById('swatch-rows'),
  btnPlay: document.getElementById('btn-play'),
  clockIcon: document.getElementById('clock-icon'),
  clockTime: document.getElementById('clock-time'),
  hudEvent: document.getElementById('hud-event'),
  interactHint: document.getElementById('interact-hint'),
};

const panelRefs = {
  sidePanel: document.getElementById('side-panel'),
  panelToggle: document.getElementById('panel-toggle'),
  paperdoll: document.getElementById('paperdoll'),
  windows: document.getElementById('windows'),
  capText: document.getElementById('cap-text'),
  hpFill: document.getElementById('hp-fill'),
  hpText: document.getElementById('hp-text'),
  manaFill: document.getElementById('mana-fill'),
  manaText: document.getElementById('mana-text'),
  xpFill: document.getElementById('hotbar-xp-fill'),
  xpText: document.getElementById('hotbar-xp-text'),
  levelBadge: document.getElementById('level-badge'),
  hudTitle: document.getElementById('hud-title'),
  toastStack: document.getElementById('toast-stack'),
  contextCard: document.getElementById('context-card'),
  questBox: document.getElementById('quest-box'),
};

const gameUI = new UI(panelRefs, inv, depot, {
  equip: (i) => doEquip(i),
  unequip: (slot) => doUnequip(slot),
  dropItem: (i, bagIndex, count) => doDropItem(i, bagIndex, count),
  usePotion: (i) => doUsePotion(i),
  toggleTorch: () => toggleTorch(),
  moveIntoBag: (from, bag) => { inv.moveIntoBag(from, bag); recompute(); },
  takeFromBag: (bag, inner) => { if (!inv.takeFromBag(bag, inner)) gameUI.toast(t('full'), 'bad'); recompute(); },
  // Unified drag-and-drop move between bags / paperdoll. `count` splits a stack.
  moveItem: (from, to, count) => {
    const r = inv.moveItem(from, to, count, player.level);
    if (r.ok) { audio.sfx.click(); recompute(); }
    else if (r.reason === 'level') gameUI.toast(t('needLevel', r.need), 'bad');
    else if (r.reason === 'vocation') gameUI.toast(vocationToast(r.need), 'bad');
    else if (r.reason === 'full') gameUI.toast(t('full'), 'bad');
    else if (r.reason === 'nobag') gameUI.toast(t('noBagInBag'), 'bad');
    // 'noslot'/'none' are silent: a meaningless drop (wrong equip slot, etc.).
  },
  assignHotbar: (item) => assignPotionToHotbar(item),
  assignDraggedToSlot: (slotIndex, item) => hotbar.assignItem(slotIndex, item),
  // Drop a spell dragged from the Spells window onto a hotbar slot.
  assignSpellToSlot: (slotIndex, spell) => {
    hotbar.setSlot(slotIndex, { ...spell, skillKind: spell.kind, kind: 'skill' });
    audio.sfx.click?.();
  },
  convertCoin: (id) => { const ok = inv.convertCoin(id); if (ok) { audio.sfx.pickup(); recompute(); } return ok; },
  convertCoinDown: (id) => { const ok = inv.convertCoinDown(id); if (ok) { audio.sfx.pickup(); recompute(); } return ok; },
  buy: (def, refresh, price) => doBuy(def, refresh, price),
  sell: (i, npc, refresh) => doSell(i, npc, refresh),
  depositItem: (city, i) => {
    // Don't pull the item out of the bag unless the vault has room (max 100).
    if (depot.isFull(city)) { gameUI.toast(t('depotFull') || 'Depot full (100)', 'bad'); return; }
    const it = inv.removeFromBackpack(i);
    if (it && !depot.deposit(city, it)) inv.addToBackpack(it, player.level);  // safety: put back if it failed
    recompute();
  },
  withdrawItem: (city, i) => {
    const item = depot.withdraw(city, i);
    if (item && inv.addToBackpack(item, player.level) !== 'ok') depot.deposit(city, item);
    recompute();
  },
  // --- House hooks (display-only showcase items; selling moved to the market) ---
  houseStore: () => houseStore,
  houseHangItem: (wallId, index, bpIndex) => houseHangItem(wallId, index, bpIndex),
  houseTakeItem: (wallId, index) => houseTakeItem(wallId, index),
  // --- Free-market hooks (place item, take it back, buy from a stall) ---
  marketPlace: (stall, bpIndex, price) => marketPlace(stall, bpIndex, price),
  marketTake: (listingId, stall) => marketTake(listingId, stall),
  marketBuy: (listingId, item, price, stall) => marketBuy(listingId, item, price, stall),
});

const minimapCanvas = document.getElementById('minimap');
const mapOverlay = document.getElementById('map-overlay');

// Map markers. The grid capital exposes a marker per named building (bank, shops,
// town hall...); round towns fall back to the generic shop/depot/temple trio.
const mapPois = [];
for (const p of cityProps) {
  if (p.pois && p.pois.length) {
    for (const poi of p.pois) mapPois.push({ x: poi.x, z: poi.z, icon: poi.icon, label: poi.label });
    mapPois.push({ x: p.temple.x, z: p.temple.z, icon: '🏛️', label: 'Temple' });
  } else {
    mapPois.push({ x: p.shop.x, z: p.shop.z, icon: '🛒' });
    mapPois.push({ x: p.depot.x, z: p.depot.z, icon: '🏦' });
    mapPois.push({ x: p.temple.x, z: p.temple.z, icon: '🏛️' });
  }
}
for (const d of dungeonEntrances) mapPois.push({ x: d.x, z: d.z, icon: '🕳️' });
// Ruins on the map: a broken-tower marker per surface hunting ruin.
for (const r of ruinsBuild.ruins) mapPois.push({ x: r.x, z: r.z, icon: '🏚️', label: (r.label && (r.label.es || r.label.en)) || r.id });

const minimap = new Minimap(minimapCanvas, world, document.getElementById('city-name'), {
  coords: document.getElementById('coords'),
  big: document.getElementById('bigmap'),
  bigCoords: document.getElementById('bigmap-coords'),
  overlay: mapOverlay,
  legend: document.getElementById('map-legend'),
  pois: mapPois,
});

// Tap the minimap to open the full-screen map; tap the backdrop or ✕ to close.
minimapCanvas.addEventListener('click', () => { minimap.toggle(true); renderMapMarksList(); });
// Mouse wheel over the corner minimap zooms it (down = out, up = in), so you can
// pull back for the lay of the land or zoom in to read a city's streets/houses.
minimapCanvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  minimap.zoomCorner(e.deltaY > 0 ? 1.15 : 0.87);
}, { passive: false });
document.getElementById('bigmap-close').addEventListener('click', () => minimap.toggle(false));
mapOverlay.addEventListener('click', (e) => { if (e.target === mapOverlay) minimap.toggle(false); });

// --- Named map marks (Tibia-style "I was here") -----------------------------
// The 🚩 button drops a named mark at the player's current spot; the right-side
// list lets you jump back to one or delete it. The list rebuilds when the map
// opens and whenever marks change.
const mapMarksEl = document.getElementById('map-marks');
document.getElementById('bigmap-mark').addEventListener('click', () => {
  let name = '';
  try { name = window.prompt(t('mapMarkPrompt'), t('mapMarkDefault')) ?? ''; }
  catch (_) { name = t('mapMarkDefault'); }
  if (name === null) return;                 // cancelled
  addMapMark(name);
  renderMapMarksList();
});
function renderMapMarksList() {
  if (!mapMarksEl) return;
  mapMarksEl.innerHTML = '';
  // Show the marks relevant to where you are: in a cave, this dungeon's marks;
  // on the surface, the surface marks.
  const here = place === 'cave' && currentDungeon
    ? mapMarks.filter((m) => m.place === 'cave' && m.dungeonId === currentDungeon.id)
    : mapMarks.filter((m) => m.place === 'surface');
  for (const m of here) {
    const row = document.createElement('div');
    row.className = 'mark-row';
    const flag = document.createElement('span'); flag.textContent = '🚩';
    const nm = document.createElement('span'); nm.className = 'mark-name';
    nm.textContent = m.floor != null ? `${m.name} · ${t('floor')} ${m.floor + 1}` : m.name;
    const del = document.createElement('span'); del.className = 'mark-del'; del.textContent = '✕';
    row.appendChild(flag); row.appendChild(nm); row.appendChild(del);
    // Click a row → center the big map on that mark (surface only; cave map always
    // follows the player). Click ✕ → delete.
    row.addEventListener('click', (e) => {
      if (e.target === del) { removeMapMark(m.id); renderMapMarksList(); return; }
      if (m.place === 'surface') { minimap.bigCenter = { x: m.x, z: m.z }; }
    });
    mapMarksEl.appendChild(row);
  }
}
// Unified Escape handler: close whichever overlay is open (most-recent intent
// first). Keeps every menu closable with Escape, not just the map.
addEventListener('keydown', (e) => {
  if (e.code !== 'Escape' || controls.chatting) return;
  if (typeof skillPanel !== 'undefined' && skillPanel && skillPanel.isOpen) { skillPanel.close(); return; }
  if (typeof wiki !== 'undefined' && wiki && wiki.isOpen) { wiki.close(); return; }
  // Backpack/bag windows are intentionally NOT closed by Escape — they stay open
  // (close them with their own ✕). Only overlays/panels below are Escape-closable.
  if (minimap.expanded) { minimap.toggle(false); return; }
});
// M toggles the full-screen map (open if closed, close if open).
addEventListener('keydown', (e) => {
  if (state === 'play' && e.code === 'KeyM' && !controls.chatting) { minimap.toggle(); if (minimap.expanded) renderMapMarksList(); }
});

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
// +/- buttons zoom the big map (so you don't need a wheel or two fingers).
const bigZoomIn = document.getElementById('bigmap-zoomin');
const bigZoomOut = document.getElementById('bigmap-zoomout');
if (bigZoomIn) bigZoomIn.addEventListener('click', () => minimap.zoom(0.7));
if (bigZoomOut) bigZoomOut.addEventListener('click', () => minimap.zoom(1.43));
// Double-tap / double-click on the map zooms IN at that point (and recenters
// there), the familiar "tap to zoom" gesture on a single-finger touch screen.
bigmap.addEventListener('dblclick', (e) => {
  e.preventDefault();
  const r = bigmap.getBoundingClientRect();
  const scale = bigmap.width / r.width;
  // Convert the tapped screen point to a world point so we zoom toward it.
  const mx = (e.clientX - r.left) * scale, my = (e.clientY - r.top) * scale;
  const c = minimap.bigCenter || { x: player.pos.x, z: player.pos.z };
  const perPx = (minimap.bigRange * 2) / bigmap.width;
  minimap.bigCenter = { x: c.x + (mx - bigmap.width / 2) * perPx, z: c.z + (my - bigmap.height / 2) * perPx };
  minimap.zoom(0.7);
});

function twoFingerDist() {
  const pts = [...mapPtrs.values()];
  if (pts.length < 2) return 0;
  return Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
}

const hotbar = new Hotbar(document.getElementById('hotbar'), {
  getOptions: () => hotbarOptions(),
  getCooldown: (entry) => cooldownState(entry),
  getMana: () => player.mana,
  getDragItem: () => gameUI.dragItem,
  itemName: (item) => potionName(item),
  activate: (entry) => {
    if (entry.kind === 'skill') castSkill(entry);
    else if (entry.kind === 'potion') useHotbarPotion(entry);
    else if (entry.kind === 'light') toggleTorch();
  },
});

// MapleStory-style on-screen KEYBOARD: drag skills/potions onto any key, then
// press that key to use it. Shares the same options + activation as the hotbar.
const activateEntry = (entry) => {
  if (!entry) return;
  if (entry.kind === 'skill') castSkill(entry);
  else if (entry.kind === 'potion') useHotbarPotion(entry);
  else if (entry.kind === 'light') toggleTorch();
};
const controls = new Controls(canvas, ui, {
  onToggleCamera: () => { firstPerson = !firstPerson; introCam = 0; },
  onHotbarKeyCode: (code) => {
    if (state !== 'play' || !player.alive) return;
    // A custom Keyboard-panel bind wins; else fall back to the number-row hotbar.
    if (keyboardPanel.handleKey(code)) return;
    hotbar.handleKey(code);
  },
  onLockChange: (locked) => {
    ui.hint.classList.toggle('hidden', locked);
    // Freeing the mouse re-shows the reminder (and restarts its fade); grabbing
    // it again just hides it.
    if (!locked) {
      ui.hint.classList.remove('faded');
      clearTimeout(hintFadeTimer);
      hintFadeTimer = setTimeout(() => ui.hint.classList.add('faded'), 9000);
    }
    document.getElementById('crosshair').classList.toggle('hidden', !locked || state !== 'play');
  },
  onToggleBag: () => {
    // Touch bag button: open the main backpack window, or close it if already
    // open. (Windows live in the side panel now, Tibia-style.)
    if (gameUI.containerWins.has('main')) gameUI.closeContainer('main');
    else { gameUI.openBackpack('main'); if (document.pointerLockElement) document.exitPointerLock(); }
  },
  onToggleRange: () => toggleRangeRing(),
  onToggleMount: () => toggleMount(),
  onChat: () => openChat(),
  // Tab / M frees or re-grabs the mouse (desktop only — touch never locks).
  onToggleMouse: () => {
    if (isTouch) return;
    if (document.pointerLockElement) document.exitPointerLock();
    else if (state === 'play') lockPointer();
  },
});

// Built after `controls` so the keyboard panel shares its keymap (the rebindable
// game-action keys). onHotbarKeyCode (above) references keyboardPanel lazily.
const keyboardPanel = new KeyboardPanel({
  getOptions: () => hotbarOptions(),
  activate: (entry) => activateEntry(entry),
  onChange: () => { saveLocal(); saveToAccount(); },
  keymap: controls.keymap,
});

// Apply the effective touch mode (auto/on/off) live: flips the body.touch class
// the CSS keys off of, keeps controls.isTouch in sync so input routing matches,
// and tidies the crosshair / pointer lock so switching never leaves a stuck
// pointer lock or an orphaned joystick on screen.
function applyTouchMode() {
  isTouch = resolveTouch();
  document.body.classList.toggle('touch', isTouch);
  controls.setTouch(isTouch);
  // Keep the camera's field of view matched to the mode (touch uses a slightly
  // wider 70°) so a runtime toggle doesn't leave the view at the load-time value.
  const fov = isTouch ? 70 : 75;
  if (camera.fov !== fov) { camera.fov = fov; camera.updateProjectionMatrix(); }
  const btn = document.getElementById('btn-touch');
  if (btn) btn.classList.toggle('active', isTouch);
  if (isTouch) {
    // Touch never uses pointer lock — release it so the camera-look drag works.
    if (document.pointerLockElement) document.exitPointerLock();
    ui.hint.classList.add('hidden');
  }
  // Show the crosshair while playing whenever we're aiming: in touch mode, or on
  // desktop once the pointer is locked.
  const showCrosshair = (isTouch || document.pointerLockElement != null) && state === 'play';
  document.getElementById('crosshair').classList.toggle('hidden', !showCrosshair);
}
function cycleTouchMode() {
  // Cycle auto → on → off → auto so a quick tap forces the layout and another
  // restores device default.
  const next = { auto: 'on', on: 'off', off: 'auto' };
  const pref = next[touchModePref()] || 'auto';
  try { localStorage.setItem(TOUCH_MODE_KEY, pref); } catch (_) { /* storage blocked; session-only */ }
  applyTouchMode();
  gameUI.toast?.(pref === 'on' ? t('touchOn') : pref === 'off' ? t('touchOff') : t('touchAuto'));
}
{
  const btnTouch = document.getElementById('btn-touch');
  if (btnTouch) btnTouch.addEventListener('click', (e) => { e.stopPropagation(); cycleTouchMode(); });
  // Reflect the saved preference (and its active highlight) on load.
  applyTouchMode();
}

// Burn / poison / slow afflicting the player. Damage-over-time drains HP through
// this hook and shows a coloured floating number; the slow is read in the loop.
const playerStatus = new PlayerStatus((amount, kind) => {
  if (!player.alive) return;
  player.hp -= amount;
  spawnFloatText(player.pos, `-${amount}`, kind === 'burn' ? '#ff7a33' : '#8fdd4a');
  if (player.hp <= 0) onPlayerDeath();
});

const combat = new CombatSystem(scene, world, {
  onPlayerHit: (dmg, src) => {
    if (!player.alive) return;
    // The hitting creature may afflict a status (fire→burn, poison→poison,
    // ice/water→slow). statusForCreature decides from its element/family.
    if (src && src.def) {
      const kind = src.areaKind || (src.def.areaAttack && src.def.areaAttack.kind);
      const applied = playerStatus.applyFromCreature(src.def, kind);
      if (applied === 'slow') playerStatus.refreshSlowCombat();
    }
    // Shielding (Tibia use-skill) blocks part of the blow — but only when you
    // actually carry a shield (a two-handed weapon means no shield, no block and
    // no training). Defensive buffs reduce damage further.
    // A shield can sit in EITHER hand now, so look in both hand slots for it.
    const shield = inv.equip && ((inv.equip.shield && inv.equip.shield.type === 'shield' && inv.equip.shield)
      || (inv.equip.weapon && inv.equip.weapon.type === 'shield' && inv.equip.weapon));
    const twoHanded = player.weapon && player.weapon.twoHanded;
    let dmgIn = dmg;
    if (shield && !twoHanded && charStats) {
      const shieldSkill = charStats.useSkill('shielding');
      const def = shield.defense || 0;
      // Re-tuned for the compressed shield defense scale (<=41): keeps a shield a
      // ~20-35% mitigator without granting full immunity.
      const block = shieldSkill * def * 0.02 + def * 0.25;
      dmgIn = Math.max(0, dmgIn - block);
      // Taking a hit while shielded trains Shielding.
      maybeAdvanceSkill(charStats.trainSkill('shielding', 1), 'shielding');
    }
    const taken = Math.max(1, Math.round(dmgIn * buffMods().defenseMul));
    player.hp -= taken;
    audio.sfx.hit();
    shakeAmount = Math.min(0.5, shakeAmount + 0.18);
    if (player.hp <= 0) onPlayerDeath();
  },
  onCreatureHit: (c, dmg, mult, miss, statusKind) => {
    if (miss) { spawnFloatText(c.pos, 'MISS', '#cfd3d8'); return; }
    // DOT ticks (burn/poison from a sorcerer's fire or druid's venom) float in
    // their element colour and don't replay the hit sound — they're a bleed.
    if (statusKind === 'burn') { spawnFloatText(c.pos, `${dmg}`, '#ff7a33'); return; }
    if (statusKind === 'poison') { spawnFloatText(c.pos, `${dmg}`, '#7bd33a'); return; }
    audio.sfx.creatureHit();
    if (mult > 1) { spawnFloatText(c.pos, `${dmg}!`, '#7bed6f'); shakeAmount = Math.min(0.5, shakeAmount + 0.1); }
    else if (mult === 0) spawnFloatText(c.pos, '0', '#9aa0a6');
    else if (mult < 1) spawnFloatText(c.pos, `${dmg}`, '#74b9ff');
    else spawnFloatText(c.pos, `${dmg}`, '#ffffff');
    if (c.flash) c.flash();
  },
  onKill: (c, xp) => {
    // The kill's XP is SPLIT among everyone who damaged the creature (party play),
    // then the local player's share gets the party bonus (+10% grouped, +30% for a
    // full 4-of-different-professions party). Single-player: 'self' dealt all the
    // damage, so the player gets the whole base XP × the party bonus (×1 solo).
    const shares = c._dmgBy || { self: 1 };
    const split = splitKillXp(xp, shares);
    let myXp = split.self != null ? split.self : xp;   // my damage share of the base XP
    const partyMult = party ? party.xpMultiplier() : 1;
    // Apply the level-banded XP boost and the party bonus on my share.
    const gained = Math.round(myXp * levelXpMultiplier(player.level) * partyMult);
    gainXp(gained);
    const tag = (party && party.inParty() && partyMult > 1) ? `  (${party.bonusLabel()})` : '';
    gameUI.toast(t('gainedXp', gained) + tag);
    const changed = questLog.onEvent('kill', c.def.family);
    if (changed.length) onQuestProgress();
  },
  onLoot: (loot) => {
    if (loot.gold) {
      inv.addGold(loot.gold); player.gold = inv.gold;
      // Show the haul as a single mm-coins total ("+5 mm coins"), not by denomination.
      gameUI.toast(`+${coinLootLabel(loot.gold)} 💰`, 'loot');
      persistProgress();
    }
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
  getProfileDefaults: () => ({ colors: { ...DEFAULT_COLORS }, sex: 'male', hair: 'short', nose: 'small', mouth: 'smile', eyes: 'normal', brows: 'normal', ears: 'normal' }),
});
ui.creation.classList.add('hidden');
authUI.show();

// QA/test entry (only with ?debug): skip the login overlay with a throwaway
// guest character so automated checks can reach the running world. Normal play
// is unaffected — the overlay still gates everyone without ?debug.
if (new URLSearchParams(location.search).has('debug')) {
  // Accepts either a profession string (legacy) or a full character override so
  // tests can enter as a specific hero — e.g. __mundumStart({ name: 'GM Maple' }).
  window.__mundumStart = (arg = 'knight') => {
    const base = { name: 'Tester', profession: 'knight', sex: 'male', hair: 'short' };
    const character = typeof arg === 'string' ? { ...base, profession: arg } : { ...base, ...arg };
    enterWithCharacter(character);
  };
}

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
    eyes: character.eyes || 'normal',
    brows: character.brows || 'normal',
    ears: character.ears || 'normal',
    profession: getProfession(character.profession) ? character.profession : 'knight',
  };
  // The DB-packing key must never leak into the material colors.
  if (profile.colors && profile.colors._look) { profile.colors = { ...profile.colors }; delete profile.colors._look; }
  saveProfile();
  player.profession = profile.profession;
  // Fresh stats for this character's vocation. A returning character loads its
  // saved stats below; a new one gets a few levels' worth of starter points.
  charStats = new CharacterStats(player.profession);
  if (!character.stats) {
    charStats.grantForLevels(1, 4);
    // Learn the job's first castable skill so the player has a spell to drag onto
    // the hotbar from the Spells window (passives apply on their own and can't go
    // on the bar).
    const first = skillsOf(player.profession).find((sk) => sk.reqLevel <= 1 && sk.kind !== 'passive');
    if (first) charStats.addSkillPoint(first);
  }
  player.rebuildCharacter(profile);
  equipVisuals = new EquipVisuals(player.char);
  // Returning character: hydrate level/exp/gold/equipment/depot/pos from the row.
  if (character.exp != null || character.equipment) applyCharacterRow(character);
  ui.nameInput.value = profile.name;
  startGame();
}

addEventListener('pointerdown', () => audio.unlock(), { once: true });
addEventListener('keydown', () => audio.unlock(), { once: true });
addEventListener('keydown', (e) => { if (state === 'play' && controls.keymap.isAction('interact', e.code) && !controls.chatting) tryInteract(); });
// Touch interact + chat buttons (no E / Enter key on a phone). The interact
// button is shown only when something is in range (see updateInteractHint).
if (ui.btnInteract) ui.btnInteract.addEventListener('click', (e) => { e.stopPropagation(); if (state === 'play') tryInteract(); });
if (ui.btnChat) ui.btnChat.addEventListener('click', (e) => { e.stopPropagation(); if (state === 'play') openChat(); });
addEventListener('keydown', (e) => { if (state === 'play' && e.code === 'KeyK' && !controls.chatting) skillPanel.toggle(); });
// Underground: page the minimap up/down a floor to peek at what's above/below
// (PageUp/PageDown, or the bracket keys). Other floors never reveal creatures.
addEventListener('keydown', (e) => {
  if (state !== 'play' || place !== 'cave' || controls.chatting) return;
  if (e.code === 'PageUp' || e.code === 'BracketLeft') pageCaveMap(-1);
  else if (e.code === 'PageDown' || e.code === 'BracketRight') pageCaveMap(+1);
});
addEventListener('beforeunload', () => { saveLocal(); saveToAccount(); net.disconnect(); });
// Periodic save so position is persisted to the account even while just walking.
setInterval(() => { if (state === 'play') { saveLocal(); saveToAccount(); } }, 15000);

// Skills + Spells live in ONE window with two tabs, mounted in the right panel.
// The 📖 button opens the Skills tab, the ✨ button the Spells (power tree) tab.
const skillPanel = new SkillPanel(() => charStats, {
  getProfession: () => player.profession,
  getLevel: () => player.level,
  getXp: () => xpProgress(player.exp),
  onChange: () => { applyVocationStats(false); prefillHotbar(); recompute(); saveToAccount(); },
  // The castable hotbar entry for a skill id (or null if not castable yet), used
  // when a spell row is dragged onto the bar.
  spellEntry: (id) => hotbarOptions().skills.find((s) => s.id === id) || null,
  // Wire a Spells row up to drag onto the hotbar (mouse + touch).
  makeDraggable: (el, getSpell) => gameUI.makeSpellDraggable(el, getSpell),
}, { panel: document.getElementById('windows'), wireWindow: (w, o) => gameUI.wireWindow(w, o) });
// One button opens the skills panel; the player switches between its two tabs
// (combat skills / spells) inside the window.
const btnSkills = document.getElementById('btn-skills');
if (btnSkills) btnSkills.addEventListener('click', (e) => { e.stopPropagation(); skillPanel.toggle(); });

// Quest tracker: a side-panel window listing active quests, their stage/progress
// and where to go. Opened by the 📜 button or the 'J' key; refreshed whenever
// quest progress changes (see onQuestProgress).
const questTracker = new QuestTracker(questLog, {
  getLevel: () => player.level,
  isNight: () => daynight.isNight(),
  getArrowOn: () => showQuestArrow,
  toggleArrow: () => toggleQuestArrow(),
}, { panel: document.getElementById('windows'), wireWindow: (w, o) => gameUI.wireWindow(w, o) });
const btnQuests = document.getElementById('btn-quests');
if (btnQuests) btnQuests.addEventListener('click', (e) => { e.stopPropagation(); questTracker.toggle(); });
addEventListener('keydown', (e) => { if (state === 'play' && e.code === 'KeyJ' && !controls.chatting) questTracker.toggle(); });

// The Wiki: an in-game compendium built live from the data modules. It stays a
// full-screen overlay (its creature/item tables need the width); the small 📚
// button in the right panel opens it.
const wiki = new Wiki();
function toggleWiki() {
  if (document.pointerLockElement) document.exitPointerLock();
  wiki.toggle();
}
const btnWiki = document.getElementById('btn-wiki');
if (btnWiki) btnWiki.addEventListener('click', (e) => { e.stopPropagation(); toggleWiki(); });
addEventListener('keydown', (e) => { if (state === 'play' && e.code === 'KeyY' && !controls.chatting) toggleWiki(); });
const btnMounts = document.getElementById('btn-mounts');
if (btnMounts) btnMounts.addEventListener('click', (e) => { e.stopPropagation(); openMountsPanel(); });
// Hotkeys: open the MapleStory-style on-screen Keyboard panel — drag powers and
// potions onto keys. Opens from the ⌨ button or the '\' key.
const btnHotkeys = document.getElementById('btn-hotkeys');
if (btnHotkeys) btnHotkeys.addEventListener('click', (e) => { e.stopPropagation(); keyboardPanel.toggle(); });
addEventListener('keydown', (e) => {
  if (state === 'play' && e.code === 'Backslash' && !controls.chatting) { e.preventDefault(); keyboardPanel.toggle(); }
});
// (Escape-to-close for wiki is handled by the unified Escape handler above.)

document.getElementById('hud-mute').addEventListener('click', (e) => {
  e.stopPropagation();
  const muted = audio.toggleMute();
  e.target.textContent = muted ? '♪̸' : '♪';   // simple symbol, no emoji
});

// Button box: header toggles minimize/expand (starts minimized); the bottom
// handle drags to resize the visible rows; the grid scrolls with the wheel.
(() => {
  const box = document.getElementById('panel-btns');
  const toggle = document.getElementById('panel-btns-toggle');
  const grid = document.getElementById('panel-btns-grid');
  const handle = document.getElementById('panel-btns-resize');
  if (!box || !toggle || !grid || !handle) return;
  toggle.addEventListener('click', (e) => { e.stopPropagation(); box.classList.toggle('collapsed'); });
  // Drag the handle to set the grid's visible height (clamped to 2…all rows).
  let dragY = 0, startH = 0, dragging = false;
  const onMove = (ev) => {
    if (!dragging) return;
    const h = Math.max(76, Math.min(grid.scrollHeight, startH + (ev.clientY - dragY)));
    grid.style.maxHeight = h + 'px';
  };
  const onUp = () => { dragging = false; window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); };
  handle.addEventListener('pointerdown', (ev) => {
    ev.preventDefault(); ev.stopPropagation();
    dragging = true; dragY = ev.clientY; startH = grid.getBoundingClientRect().height;
    window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp);
  });
})();

// Left panel toggle (empty by default; drag windows here from the right).
const leftToggle = document.getElementById('panel-toggle-left');
if (leftToggle) leftToggle.addEventListener('click', () => {
  const panel = document.getElementById('side-panel-left');
  gameUI._setPanelCollapsed(panel, !panel.classList.contains('collapsed'));
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
        // Skin tone drives the first-person hands too — rebuild them so the
        // fists holding the weapon/shield match the new skin instantly.
        if (part.key === 'skin') refreshViewHands();
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
  // The name may have been (un)set to "GM Maple" on the creation screen. If the
  // GM status changed, flip the flag and rebuild the model so the robe/cape
  // appears or disappears to match.
  const gmNow = isGMName(profile.name);
  if (gmNow !== !!profile.gm) {
    profile.gm = gmNow;
    player.gm = gmNow;
    player.rebuildCharacter(profile);
    // The model was replaced, so rebind the equip visuals to the new char (it
    // carries the isGM flag that makes refresh() hide worn gear).
    equipVisuals = new EquipVisuals(player.char);
  }
  // Lock in the chosen vocation and (re)derive maxHp/maxMana from it.
  player.profession = getProfession(profile.profession) ? profile.profession : 'knight';
  applyVocationStats(true);
  saveProfile();
  loadSave();

  giveStarterGear();
  if (player.level >= 20) upgradeTorchToBright();   // already past 20 on load → bright torch
  recompute();
  refreshHouseExteriors();   // FOR SALE signs + the owner's recolour skin
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
  // Left panel: open by default too (same as the right panel). Its pull-out tab
  // still collapses/expands it, and windows can be dragged over to it.
  const leftPanel = document.getElementById('side-panel-left');
  leftPanel.classList.remove('hidden');
  gameUI._setPanelCollapsed(leftPanel, false);
  // The floating circular minimap (top-right, outside the panels).
  document.getElementById('minimap-box').classList.remove('hidden');
  gameUI.openBackpack('main'); // backpack window open by default, Tibia-style
  document.getElementById('chat').classList.remove('hidden');
  if (isTouch) document.getElementById('crosshair').classList.remove('hidden');
  prefillHotbar();
  audio.unlock();
  audio.startMusic();
  if (!isTouch) lockPointer();
  // The controls reminder is helpful at first, then just clutter — fade it out
  // after a few seconds (it reappears whenever the mouse is freed; see
  // onLockChange, which clears the faded state). Skipped on touch, where the
  // hint is display:none anyway.
  if (!isTouch) {
    ui.hint.classList.remove('faded');
    clearTimeout(hintFadeTimer);
    hintFadeTimer = setTimeout(() => ui.hint.classList.add('faded'), 9000);
  }

  if (!localStorage.getItem('mundum.onboarded')) {
    localStorage.setItem('mundum.onboarded', '1');
    setTimeout(() => gameUI.toast('👉 ' + t('onboard1')), 1500);
    setTimeout(() => gameUI.toast('⚔️ ' + t('onboard2')), 7000);
    setTimeout(() => gameUI.toast('🏛️ ' + t('onboard3')), 12500);
  }

  // Game Master tools: build the left-side control panel for GM Maple. Works
  // offline too (the net-backed actions degrade to toasts when not connected).
  if (player.gm) setupGM();

  // Logged off ASLEEP? Walk into the owned house and lie back down in the centre
  // (Tibia-style). Done after the world is built and before going online so the
  // sleeping presence is broadcast from inside the house.
  resumeSleepIfNeeded();

  connectOnline();

  // Free market: claim any sales made while we were offline (credits gold to the
  // character row, then shows a "X bought your item" toast for each). Uses the
  // account session (auth), independent of the realtime net session above.
  claimMarketPayouts();

  // Ambient bots: fake players that populate the cities and zones. Built once;
  // they have no HP and live entirely client-side.
  if (place === 'surface' && !bots.bots.length) bots.spawn(CITIES, ZONES, { lang: getLang() });

  // Debug handle (only with ?debug): lets QA/tests give items, drop them, and
  // inspect live drop positions without touching gameplay otherwise.
  if (new URLSearchParams(location.search).has('debug')) {
    window.__mundum = {
      player, inv, combat, hotbar, charStats, skillPanel, ui: gameUI, worldNpcs, world, cityProps, seaFauna, bots,
      toss: (id) => { const it = resolveItem(id, () => 0.5, player.level, getLang()); if (it) tossItemForward(it); return it; },
      castSkill: (s) => castSkill(s), toggleSkillPanel: () => skillPanel.toggle(),
      give: (id) => { const it = resolveItem(id, () => 0.5, player.level, getLang()); if (it) inv.addToBackpack(it, player.level); recompute(); return it; },
      drops: () => combat.drops.map((d) => ({ id: d.item.baseId, x: +d.pos.x.toFixed(2), z: +d.pos.z.toFixed(2), y: +d.pos.y.toFixed(2), flying: d.flying, locked: d.pickupAt > performance.now() })),
      // QA hooks for headless checks (no pointer lock needed).
      attack: () => doAttack(),
      setCamera: (fp) => { firstPerson = !!fp; introCam = 0; },
      // Equip an item by id into its natural slot (weapon/shield) and refresh visuals.
      equip: (id) => {
        const it = resolveItem(id, () => 0.5, player.level, getLang());
        if (!it) return null;
        if (it.type === 'shield') inv.equip.shield = it; else inv.equip.weapon = it;
        recompute();
        return it;
      },
    };
  }
}

async function connectOnline() {
  const res = await net.connect({
    name: profile.name, sex: profile.sex, hair: profile.hair,
    colors: profile.colors, level: player.level,
  });
  if (!res.online) { gameUI.toast(t('offline')); return; }

  // Banned players are bounced the moment they connect.
  if (!player.gm && await net.isBanned(net.userId())) {
    await net.disconnect();
    showBanScreen();
    return;
  }

  net.onPeerUpdate((id, s) => {
    peers.update(id, s);
    // When another real player's level rises, the ambient bots cheer them too —
    // staggered, same as for the local player. Track each peer's last level so we
    // only fire on the increase (and not on their first sighting).
    if (s && typeof s.level === 'number') {
      const prev = peerLevels.get(id);
      if (prev != null && s.level > prev && place === 'surface') {
        bots.congratulate(s.name || '', getLang());
      }
      peerLevels.set(id, s.level);
    }
  });
  net.onPeerLeave((id) => {
    peers.remove(id);
    peerLevels.delete(id);
    if (trade && trade.peerId === id) { gameUI.toast(t('partnerLeft') || 'Partner left', 'bad'); endTrade(false); }
  });
  net.onPeerJoin((id, meta) => { if (meta && meta.name) gameUI.toast(t('connected', meta.name)); });
  net.onChat((m) => { if (chatBlocked.has(m.name)) return; addChatLine(m.name, m.text); });

  // Incoming trade request: a peer wants to trade. Auto-open the window if I'm
  // free (a friendly kid game; no spam guard needed beyond one trade at a time).
  net.onTradeRequest((fromId, payload) => {
    if (trade) { net.respondTrade(fromId, false); return; }   // busy
    trade = { peerId: fromId, peerName: (payload && payload.name) || 'Player', myOffer: [], theirOffer: [], iConfirmed: false, theirConfirmed: false };
    net.respondTrade(fromId, true);
    renderTrade();
  });

  // Live trade updates from the partner (offer changed / they confirmed / cancel).
  net.onTradeUpdate((fromId, payload) => {
    if (!trade || trade.peerId !== fromId || !payload) return;
    if (payload.kind === 'offer') {
      trade.theirOffer = Array.isArray(payload.items) ? payload.items.slice(0, MAX_TRADE_ITEMS) : [];
      trade.iConfirmed = trade.theirConfirmed = false;   // their change resets both
      renderTrade();
    } else if (payload.kind === 'confirm') {
      trade.theirConfirmed = true; renderTrade();
    } else if (payload.kind === 'respond' && !payload.accept) {
      gameUI.toast(t('tradeDeclined') || 'Trade declined', 'bad'); endTrade(false);
    } else if (payload.kind === 'result') {
      // Credit the received items exactly once per session: if both sides
      // confirmed, this side may also have added them in onConfirm, so the
      // `credited` flag stops a double-add (item duplication).
      if (payload.ok && !trade.credited) {
        trade.credited = true;
        for (const it of trade.theirOffer) returnItemToPlayer(it);
        gameUI.toast(t('tradeDone') || 'Trade complete', 'good');
        endTrade(true);
      }
    }
  });

  // GM broadcasts reach everyone: a banner message, a summon (teleport me to a
  // point), or a kick (I've been banned — bounce me out).
  net.onGmAnnounce((m) => { showAnnounceBanner(m.name || 'GM', m.text); addChatLine(m.name || 'GM', m.text); });
  net.onGmSummon((m) => {
    if (player.gm) return; // the GM never teleports itself via its own summon
    player.spawnAt(m.x, m.z);
    world.update(player.pos.x, player.pos.z, true);
    gameUI.toast('✨ The GM summoned you');
  });
  net.onGmKick(async () => { await net.disconnect(); showBanScreen(); });

  // Houses: a peer published their house → remember its public snapshot so the
  // local player can walk to that lot's door and visit. ownerId is carried so a
  // visitor's purchase can route back to the owner.
  net.onHouseSync((fromId, snap) => {
    if (!snap || !snap.lotId) {
      // The owner gave up / sold: drop any snapshot they previously published.
      for (const [lotId, s] of visitedHouses) if (s.ownerId === fromId) visitedHouses.delete(lotId);
      refreshHouseExteriors();
      return;
    }
    visitedHouses.set(snap.lotId, { ...snap, ownerId: fromId });
    // If we're currently visiting this very house, refresh the live room.
    if (place === 'house' && activeHouseLot && activeHouseLot.id === snap.lotId && activeHouse && activeHouse.readOnly) {
      activeHouse.state = visitedHouses.get(snap.lotId);
      activeHouse.rebuild();
    }
    refreshHouseExteriors();
  });
  net.onHouseInside((fromId, payload) => {
    // Purely informational for now (could show "X is home"); snapshot already
    // tells us the house exists. Kept as a hook for future presence polish.
    void fromId; void payload;
  });
  // Someone visited MY house — log it so I see it when I wake up / log back in.
  net.onHouseVisit((payload) => recordHouseVisit(payload));

  // On connect, publish our own house so already-online peers can see it.
  broadcastHouse();

  // NOTE: the authoritative cloud copy of this character (exp/gold/items) is the
  // ACCOUNT row, already fetched at character-select via auth.listCharacters and
  // applied in applyCharacterRow — local vs cloud is reconciled in loadSave().
  // We deliberately do NOT read the character row through net here: net uses a
  // separate ANONYMOUS realtime session, so net.loadCharacter would query the
  // wrong row and could clobber real progress. Multiplayer presence rides the
  // realtime channel, not the characters table.
}

// ===== Players: click to inspect, friends, trade =====

// The player's FRIENDS list (names). Persisted with the character save so it
// survives logout. A Set keeps it unique; serialized as a plain array.
const friends = new Set();
function isFriend(name) { return friends.has(name); }
function addFriend(name) {
  if (!name) return;
  friends.add(name);
  gameUI.toast(t('friendAdded') ? t('friendAdded', name) : `${name} added to friends`, 'good');
  saveToAccount();
}
function removeFriend(name) {
  if (friends.delete(name)) { gameUI.toast(`${name} removed`, 'info'); saveToAccount(); }
}

// Chat block list (names whose messages are hidden) and a follow target (a peer
// id the player auto-walks after). Both toggle from the player-info panel.
const chatBlocked = new Set();
function isBlocked(name) { return chatBlocked.has(name); }
function toggleBlock(name) {
  if (!name) return;
  if (chatBlocked.delete(name)) gameUI.toast(`${name}: ${t('unblockChat') || 'chat unblocked'}`, 'info');
  else { chatBlocked.add(name); gameUI.toast(`${name}: ${t('blockChat') || 'chat blocked'}`, 'info'); }
}
let followingPeerId = null;
function toggleFollow(id) {
  followingPeerId = (followingPeerId === id) ? null : id;
  gameUI.toast(followingPeerId ? (t('following') || 'Following') : (t('stopFollow') || 'Stopped following'), 'info');
}
// When following a peer, steer the player toward them by writing controls.move
// (camera-relative), so the normal movement + collision path carries it. Manual
// WASD input wins (cancels follow for that frame); follow ends if the peer is
// gone or you arrive within ~2m.
function applyFollow(controls) {
  if (!followingPeerId) return;
  const peer = peers && peers.peers.get(followingPeerId);
  if (!peer) { followingPeerId = null; return; }
  // Don't fight the player: if they're pressing a direction, let them drive.
  if (controls.move && (Math.abs(controls.move.x) > 0.01 || Math.abs(controls.move.z) > 0.01)) return;
  const dx = peer.pos.x - player.pos.x, dz = peer.pos.z - player.pos.z;
  const dist = Math.hypot(dx, dz);
  if (dist < 2.0) { if (controls.move) { controls.move.x = 0; controls.move.z = 0; } return; } // close enough
  // Convert the world-space direction to camera-relative move (the inverse of the
  // forward/right basis player.update uses), so steering matches the camera yaw.
  const fx = -Math.sin(player.yaw), fz = -Math.cos(player.yaw);
  const ux = dx / dist, uz = dz / dist;
  if (controls.move) {
    controls.move.z = ux * fx + uz * fz;      // forward component
    controls.move.x = ux * (-fz) + uz * fx;   // right component
  }
}

// Left-click reach for selecting another player (metres). A reusable raycaster
// fires from the crosshair (screen centre) since the game is pointer-locked.
const _peerRay = new THREE.Raycaster();
const _peerCenter = new THREE.Vector2(0, 0);
function tryClickPeer() {
  if (!peers || peers.peers.size === 0) return false;
  _peerRay.setFromCamera(_peerCenter, camera);
  const hit = peers.raycast(_peerRay);
  if (!hit) return false;
  // Only inspect peers within a sensible reach (don't open someone across the map).
  const d = Math.hypot(hit.peer.pos.x - player.pos.x, hit.peer.pos.z - player.pos.z);
  if (d > 14) return false;
  openPlayerInfo(hit.id, hit.peer);
  return true;
}

// Open the player-info panel for a clicked peer: name, friend toggle, trade.
function openPlayerInfo(id, peer) {
  const name = peer.name || 'Player';
  gameUI.openPlayerInfo({
    id, name,
    isFriend: isFriend(name),
    isBlocked: isBlocked(name),
    isFollowing: followingPeerId === id,
    onAddFriend: () => { addFriend(name); },
    onRemoveFriend: () => { removeFriend(name); },
    onTrade: () => { startTradeWith(id, name); },
    onBlock: () => { toggleBlock(name); },
    onFollow: () => { toggleFollow(id); },
  });
}

// ----- Player-to-player TRADE (max 6 items per side) -----
const MAX_TRADE_ITEMS = 6;
let trade = null;   // active trade session or null

// Return a traded item to the player. The bag may be full/over-weight (the item
// was already pulled out of it), so fall back to dropping it at the feet rather
// than silently destroying it — never lose a player's items.
function returnItemToPlayer(item) {
  if (!item) return;
  if (inv.addToBackpack(item, player.level) !== 'ok') combat.spawnDrop(player.pos, item);
}

function startTradeWith(peerId, peerName) {
  if (trade) return;
  trade = { peerId, peerName, myOffer: [], theirOffer: [], iConfirmed: false, theirConfirmed: false };
  net.requestTrade(peerId);
  renderTrade();
}

function renderTrade() {
  if (!trade) { gameUI.closeContext(); return; }
  gameUI.openTrade({
    partnerName: trade.peerName,
    myOffer: trade.myOffer, theirOffer: trade.theirOffer,
    iConfirmed: trade.iConfirmed, theirConfirmed: trade.theirConfirmed,
    onAdd: (i) => {
      if (trade.myOffer.length >= MAX_TRADE_ITEMS) return;
      const it = inv.backpack[i];
      if (!it) return;
      // Move the item out of the bag into the offer (so it can't be in two places).
      inv.backpack.splice(i, 1);
      trade.myOffer.push(it);
      trade.iConfirmed = trade.theirConfirmed = false;  // changing the offer resets confirmations
      net.setTradeOffer(trade.peerId, trade.myOffer);
      recompute(); renderTrade();
    },
    onRemove: (i) => {
      const it = trade.myOffer.splice(i, 1)[0];
      returnItemToPlayer(it);
      trade.iConfirmed = trade.theirConfirmed = false;
      net.setTradeOffer(trade.peerId, trade.myOffer);
      recompute(); renderTrade();
    },
    onConfirm: async () => {
      trade.iConfirmed = true;
      renderTrade();
      const res = await net.confirmTrade(trade.peerId, trade.myOffer, trade.theirOffer);
      if (res && res.ok && trade && !trade.credited) {
        // Items I gave are already out of the bag; add what I received. The
        // `credited` flag ensures the partner's `result` echo can't add them again.
        trade.credited = true;
        for (const it of trade.theirOffer) returnItemToPlayer(it);
        gameUI.toast(t('tradeDone') || 'Trade complete', 'good');
        endTrade(true);
      } else if (res && res.reason !== 'offline') {
        gameUI.toast(t('tradeFailed') || 'Trade failed', 'bad');
      }
    },
    onCancel: () => { net.respondTrade(trade.peerId, false); endTrade(false); },
  });
}

// Close the trade. On a non-completed cancel, return my offered items to the bag.
function endTrade(completed) {
  if (trade && !completed) {
    for (const it of trade.myOffer) returnItemToPlayer(it);
  }
  trade = null;
  recompute();
  gameUI.closeContext();
}

// The connected players the GM can act on: each peer keyed by its network id,
// with the latest name. Excludes the GM itself.
function connectedPlayers() {
  const out = [];
  for (const [id, peer] of peers.peers) out.push({ id, name: peer.name || '' });
  return out;
}

// Drop a creature a few metres in front of the GM (on the side it's facing).
function gmSpawnCreatureInFront(creatureId) {
  const fx = -Math.sin(player.yaw), fz = -Math.cos(player.yaw);
  const x = player.pos.x + fx * 4;
  const z = player.pos.z + fz * 4;
  return !!combat.gmSpawn(creatureId, x, z);
}

// Move the GM to a connected player's last known position.
function gmTeleportToPlayer(id) {
  const peer = peers.peers.get(id);
  if (!peer) return false;
  player.spawnAt(peer.pos.x, peer.pos.z);
  world.update(player.pos.x, player.pos.z, true);
  return true;
}

// The list of fixed places the GM can warp to: every city, then every dungeon
// (its surface mouth). Grouped so the picker reads cleanly. This is the GM's way
// out of a cave too — picking any place first surfaces them.
function gmPlaceList() {
  const out = [];
  for (const c of CITIES) out.push({ id: 'city:' + c.id, name: c.name, group: 'Cities' });
  for (const d of DUNGEONS) {
    const nm = d.name ? (d.name[getLang()] || d.name.es) : d.id;
    out.push({ id: 'dungeon:' + d.id, name: nm, group: 'Caves' });
  }
  for (const r of ruinsBuild.ruins) {
    const nm = r.label ? (r.label[getLang()] || r.label.es) : r.id;
    out.push({ id: 'ruin:' + r.id, name: nm, group: 'Ruins' });
  }
  return out;
}

// Warp the GM to a chosen place id ("city:<id>" | "dungeon:<id>" | "ruin:<id>").
// Always returns to the surface first (this is how a GM escapes a cave), then
// drops them at the target's surface coordinates.
function gmGoToPlace(placeId) {
  const [kind, id] = String(placeId).split(':');
  let target = null;
  if (kind === 'city') { const c = CITIES.find((x) => x.id === id); if (c) target = { x: c.x, z: c.z }; }
  else if (kind === 'dungeon') { const d = DUNGEONS.find((x) => x.id === id); if (d) target = { x: d.x, z: d.z + 9 }; }
  else if (kind === 'ruin') { const r = ruinsBuild.ruins.find((x) => x.id === id); if (r) target = { x: r.x, z: r.z }; }
  if (!target) return false;
  // If currently underground, snap back to the surface world first.
  if (place === 'cave') {
    if (activeCave) activeCave.setVisible(false);
    setSurfaceVisible(true);
    if (savedFog) scene.fog = savedFog;
    if (savedBg) scene.background = savedBg;
    player.world = world; combat.world = world;
    place = 'surface'; activeCave = null; currentDungeon = null;
    combat.setDungeon(null); combat.setSurfaceSite(null);
    audio.setMood('overworld');
  }
  combat.clear();
  player.spawnAt(target.x, target.z);
  world.update(player.pos.x, player.pos.z, true);
  return true;
}

function setupGM() {
  if (document.getElementById('win-gm')) return; // already built
  buildGMPanel({
    players: connectedPlayers,
    toast: (msg, kind) => gameUI.toast(msg, kind),
    createItem: (id) => {
      const it = resolveItem(id, () => 0.5, player.level, getLang());
      if (!it) return false;
      if (inv.addToBackpack(it, player.level) !== 'ok') { gameUI.toast(t('full'), 'bad'); return false; }
      recompute();
      return true;
    },
    spawnCreature: (id) => gmSpawnCreatureInFront(id),
    teleportTo: (id) => gmTeleportToPlayer(id),
    places: () => gmPlaceList(),
    goToPlace: (id) => gmGoToPlace(id),
    summon: (id) => net.gmSummon(id, player.pos.x, player.pos.z),
    announce: (text) => net.gmAnnounce(text),
    ban: async (id, name) => {
      const ok = await net.gmBan(id, name);
      gameUI.toast(ok ? `⛔ ${name} banned` : 'Could not ban', ok ? null : 'bad');
      if (ok) peers.remove(id);
    },
  });
}

// Shown to a player who is (or has just been) banned: a full-screen block.
function showBanScreen() {
  state = 'banned';
  controls.enabled = false;
  if (document.pointerLockElement) document.exitPointerLock();
  let el = document.getElementById('ban-screen');
  if (!el) {
    el = document.createElement('div');
    el.id = 'ban-screen';
    el.innerHTML = '<div class="ban-card"><div class="ban-emoji">⛔</div>'
      + '<div class="ban-title">You have been banned</div>'
      + '<div class="ban-sub">The Game Master removed you from the world.</div></div>';
    document.body.appendChild(el);
  }
  el.classList.remove('hidden');
}

function setupChat() {
  const input = document.getElementById('chat-input');
  input.placeholder = t('chatPlaceholder');
  input.addEventListener('keydown', (e) => {
    e.stopPropagation();
    // Tab would move focus out of the chat field (and our global Tab handler
    // frees the mouse) — keep focus in the input while chatting. Don't blanket-
    // preventDefault, or normal typing breaks.
    if (e.code === 'Tab') e.preventDefault();
    if (e.code === 'Enter') {
      const text = input.value.trim();
      // sendChat echoes the line locally (online or offline), so do NOT addChatLine
      // here too — that printed every message twice.
      if (text) net.sendChat(text);
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

// Localized "only a <class> can equip this" toast for the vocation gate.
const VOC_NAME = {
  knight: { es: 'Caballero', en: 'Knight' }, archer: { es: 'Arquero', en: 'Archer' },
  mage: { es: 'Mago', en: 'Mage' }, druid: { es: 'Druida', en: 'Druid' },
};
function vocationToast(voc) {
  const lang = getLang();
  const name = (VOC_NAME[voc] && VOC_NAME[voc][lang]) || voc;
  return lang === 'en' ? `🔒 Only a ${name} can use this` : `🔒 Solo un ${name} puede usar esto`;
}

function doEquip(i) {
  const res = inv.equipFromBackpack(i, player.level);
  if (!res.ok) {
    if (res.reason === 'level') gameUI.toast(t('needLevel', res.need), 'bad');
    else if (res.reason === 'vocation') gameUI.toast(vocationToast(res.need), 'bad');
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

// Drop an item to the ground. `count` (optional) drops just that many off a
// stack and leaves the rest in the bag; omitted/whole-stack drops the lot.
function doDropItem(i, bagIndex, count) {
  const arr = bagIndex != null
    ? (inv.backpack[bagIndex] && inv.backpack[bagIndex].contents)
    : inv.backpack;
  if (!arr) return;
  const src = arr[i];
  if (!src) return;
  let item;
  const have = src.count || 1;
  if (count != null && count > 0 && count < have) {
    // Peel a partial stack off; the original keeps the remainder.
    src.count = have - count;
    item = { ...src, count };
  } else {
    item = arr.splice(i, 1)[0];
  }
  if (item) { tossItemForward(item); recompute(); }
}

// Throw a dropped item in an arc in front of the player so it lands a couple of
// metres ahead instead of underfoot, with a short grace period before it can be
// picked back up. Forward is derived from yaw (char faces yaw + PI).
function tossItemForward(item) {
  const fx = -Math.sin(player.yaw);
  const fz = -Math.cos(player.yaw);
  const SPEED = 6;           // horizontal launch speed
  const vel = { x: fx * SPEED, y: 4.5, z: fz * SPEED }; // up + forward = nice arc
  // Spawn slightly in front and at chest height so it visibly leaves the hand.
  const from = { x: player.pos.x + fx * 0.6, z: player.pos.z + fz * 0.6 };
  combat.spawnDrop(from, item, { vel, pickupDelay: 1.1 });
  audio.sfx.pickup();
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
  // Potions stack: drink one off the stack, only freeing the cell when it's empty.
  if ((item.count || 1) > 1) item.count -= 1;
  else inv.removeFromBackpack(i);
  audio.sfx.pickup();
  const parts = [];
  if (r.hp && hpRoom > 0) parts.push(`+${Math.min(r.hp, hpRoom)} HP`);
  if (r.mana && manaRoom > 0) parts.push(`+${Math.min(r.mana, manaRoom)} ${t('mana')}`);
  gameUI.toast(`${item.icon || '🧪'} ${parts.join(' · ')}`, 'loot');
  recompute();
  gameUI.setVitals(player.hp, player.maxHp, player.mana, player.maxMana, xpProgress(player.exp));
}

// Cooldown state for a hotbar entry: { frac (1..0), remain (seconds) }.
function cooldownState(entry) {
  if (entry.kind === 'skill') {
    const c = cooldowns[entry.id];
    if (!c || nowSec >= c.until) return { frac: 0, remain: 0 };
    const remain = c.until - nowSec;
    return { frac: Math.max(0, Math.min(1, remain / c.total)), remain };
  }
  return { frac: 0, remain: 0 };
}

// Cast a profession skill from a hotbar entry, checking mana and cooldown.
function castSkill(skill) {
  const def = getSkill(skill.id) || skill;
  // Passives apply automatically (attack speed/range) and are never cast — guard
  // against a stale hotbar entry from an older save.
  if (def.kind === 'passive') return;
  // The GM may cast ANY power without learning it (and at an effective skill
  // level of 1 for scaling); normal players must have spent a point in it.
  const skillLv = player.gm ? Math.max(1, charStats.skillLevel(def.id)) : charStats.skillLevel(def.id);
  // You must have spent at least one skill point in it (MapleStory-style).
  if (!player.gm && skillLv < 1) { gameUI.toast(t('skillLocked'), 'bad'); return; }
  const cd = cooldowns[def.id];
  if (cd && nowSec < cd.until) return; // still cooling down
  // SUMMONS share ONE 60-second cooldown across every summon skill, so a druid
  // can't chain Imp + Wolf + Bear instantly — only one new pet per minute, of
  // whichever kind. (The pet cap of 2 and the replace-the-strongest rule live in
  // combat.spawnAlly.)
  const SUMMON_COOLDOWN = 60;
  if (def.kind === 'summon') {
    const sc = cooldowns.__summon;
    if (sc && nowSec < sc.until) return;
  }
  // The GM casts for free — no mana cost, no mana check (cast with or without
  // mana, at any level). Normal players pay and must have enough.
  const manaCost = player.gm ? 0 : skillMana(def, skillLv);
  if (!player.gm && manaCost > player.mana) { gameUI.toast(t('noMana'), 'bad'); return; }

  player.mana -= manaCost;
  // Spending mana on a spell trains Magic Level (Tibia-style).
  maybeAdvanceSkill(charStats.trainMagic(manaCost), 'magic');
  // A summon stamps the shared 60s gate (and a matching per-skill cooldown so the
  // hotbar slot shows the sweep); other skills use their own cooldown.
  if (def.kind === 'summon') {
    cooldowns.__summon = { until: nowSec + SUMMON_COOLDOWN, total: SUMMON_COOLDOWN };
    cooldowns[def.id] = { until: nowSec + SUMMON_COOLDOWN, total: SUMMON_COOLDOWN };
  } else {
    cooldowns[def.id] = { until: nowSec + (def.cooldown || 1), total: def.cooldown || 1 };
  }
  audio.sfx.attack();

  // Buff skills (Sharp Eyes, Battle Roar, Mana/Holy Shield, Rejuvenation…) grant
  // a timed self-buff instead of dealing damage. Still play the fx so it reads.
  if (def.kind === 'buff' && def.buff) {
    applyBuff(def);
    skillSystem.cast(def, player.pos, player.yaw, skillLv, {});
    gameUI.setVitals(player.hp, player.maxHp, player.mana, player.maxMana, xpProgress(player.exp));
    return;
  }

  // Spell DAMAGE follows the Tibia formula F = level*2 + magicLevel*3 (+ the skill
  // points you put in the spell), scaled by a per-class multiplier — so a mage's
  // ultimate climbs past 2000 with no cap while a knight's strongest strike stays
  // a few hundred. Magic level (the 'magic' use-skill, plus any ring bonus) feeds
  // F directly. Heals/buffs/summons keep their literal value (no damage scaling).
  // TAUNT (knight Challenge): force every nearby creature to aggro the player.
  // No damage — pure threat control. Still plays its fx (a roar) so it reads.
  if (def.taunt) {
    combat.tauntArea(player.pos, def.radius || 6);
    skillSystem.cast(def, player.pos, player.yaw, skillLv, {});
    gameUI.setVitals(player.hp, player.maxHp, player.mana, player.maxMana, xpProgress(player.exp));
    return;
  }

  const mlRing = inv.equipBonus ? inv.equipBonus('magicLevelBonus') : 0;
  const magicLevel = charStats.useSkill('magic') + mlRing;
  const dmgMul = spellDamageMul(player.level, magicLevel, skillLv, player.profession) * buffMods().damageMul;
  const statMul = isDamageSkill(def) ? dmgMul : 1;   // non-damage skills: raw value
  // The status a damage spell leaves behind (sorcerer fire → burn; druid ice/
  // poison → slow / poison / both). Read straight off the skill definition.
  const inflict = def.inflicts || null;
  skillSystem.cast(def, player.pos, player.yaw, skillLv, {
    damageArea: (center, radius, amount) => {
      const hits = combat.damageArea(center, radius, Math.round(amount * statMul), inflict);
      if (hits) shakeAmount = Math.min(0.5, shakeAmount + 0.12);
    },
    healPlayer: (amount) => {
      player.hp = Math.min(player.maxHp, player.hp + amount);
      spawnFloatText(player.pos, `+${amount}`, '#7bed6f');
    },
    spawnSummon: (family, pos) => {
      const pet = combat.spawnAlly(family, pos, skillLv);
      // If the druid already has a foe locked, the fresh pet runs at it at once.
      if (pet && combat.currentTarget) pet.focus = combat.currentTarget;
    },
  });
  gameUI.setVitals(player.hp, player.maxHp, player.mana, player.maxMana, xpProgress(player.exp));
}

// Start (or refresh) a timed self-buff from a buff skill. Re-casting refreshes
// the duration rather than stacking, so a buff is always at most one instance.
function applyBuff(def) {
  const b = def.buff || {};
  const until = nowSec + (b.duration || 15);
  const existing = activeBuffs.find((x) => x.id === def.id);
  const rec = existing || { id: def.id };
  rec.until = until;
  rec.damageMul = b.damageMul || 1;
  rec.defenseMul = b.defenseMul || 1; // <1 reduces damage taken
  rec.critAdd = b.critAdd || 0;
  rec.regenPerSec = b.regenPerSec || 0; // fraction of maxHp per second
  if (!existing) activeBuffs.push(rec);
  // Fold the (new) attack buff into player.damageMul right away so the knight's
  // basic PHYSICAL swings hit harder, not just its spells.
  player.damageMul = (player.passiveDamageMul || 1) * buffMods().damageMul;
  const name = (def.name && (def.name[getLang()] || def.name.es)) || def.id;
  gameUI.toast(`✦ ${name}`, 'levelup');
}

// Aggregate the currently-active buff modifiers. damageMul multiplies, defenseMul
// multiplies incoming damage (lower = tougher), critAdd adds flat crit chance.
function buffMods() {
  const out = { damageMul: 1, defenseMul: 1, critAdd: 0 };
  for (const b of activeBuffs) {
    out.damageMul *= b.damageMul || 1;
    out.defenseMul *= b.defenseMul || 1;
    out.critAdd += b.critAdd || 0;
  }
  return out;
}

// Per-frame: expire finished buffs and apply any regen-over-time buffs.
let buffRegenAcc = 0;
function updateBuffs(dt) {
  const hadBuffs = activeBuffs.length;
  for (let i = activeBuffs.length - 1; i >= 0; i--) {
    if (nowSec >= activeBuffs[i].until) activeBuffs.splice(i, 1);
  }
  // When a damage buff expired, drop player.damageMul back to its passive value so
  // basic attacks stop benefiting (applyBuff raises it; this lowers it again).
  if (hadBuffs && activeBuffs.length !== hadBuffs) {
    player.damageMul = (player.passiveDamageMul || 1) * buffMods().damageMul;
  }
  // Regen buffs heal once a second so the number ticks cleanly.
  buffRegenAcc += dt;
  if (buffRegenAcc >= 1 && player.alive) {
    buffRegenAcc -= 1;
    let frac = 0;
    for (const b of activeBuffs) frac += b.regenPerSec || 0;
    if (frac > 0 && player.hp < player.maxHp) {
      const amount = Math.max(1, Math.round(player.maxHp * frac));
      player.hp = Math.min(player.maxHp, player.hp + amount);
      spawnFloatText(player.pos, `+${amount}`, '#7bed6f');
    }
  }
}

// Use a potion referenced by a hotbar entry: find a matching one in the backpack.
function useHotbarPotion(entry) {
  const idx = inv.backpack.findIndex((it) => it && it.kind === 'potion' && it.baseId === entry.baseId);
  if (idx < 0) { gameUI.toast(t('full'), 'bad'); return; }
  doUsePotion(idx);
}

// What the player can put on the hotbar right now: LEARNED skills (≥1 point) +
// held consumables (potions/fruit) + a carried torch.
function hotbarOptions() {
  // The GM wields EVERY power in the game (all professions), with no level or
  // learned-point gate — so the spell list shows the full book. Normal players
  // see only their own profession's skills that they've reached AND learned.
  const source = player.gm
    ? allSkills().filter((s) => s.kind !== 'passive')
    : skillsForLevel(player.profession, player.level)
        .filter((s) => s.kind !== 'passive') // passives apply automatically, never cast
        // Only skills the player has actually LEARNED (spent a point on) are
        // castable, so an unlearned power like Energy Bolt never shows up.
        .filter((s) => charStats && charStats.skillLevel(s.id) >= 1);
  const skills = source
    .map((s) => ({
      id: s.id, name: (s.name && (s.name[getLang()] || s.name.es)) || s.id,
      icon: SKILL_ICON[s.kind] || '✨', iconHtml: skillIcon(s), manaCost: s.manaCost || 0,
      cooldown: s.cooldown || 1, minLevel: s.minLevel || 1, kind: s.kind,
      power: s.power, powerPerLevel: s.powerPerLevel, radius: s.radius,
      summonFamily: s.summonFamily, summonCount: s.summonCount,
    }));
  const seen = new Set();
  const potions = [];
  // Consumables: potions AND fruit/food both stack here (anything you "use up").
  const addPotion = (it) => {
    if (it && it.kind === 'potion' && !seen.has(it.baseId)) {
      seen.add(it.baseId);
      potions.push({ id: it.baseId, baseId: it.baseId, name: potionName(it), icon: it.icon || '🧪' });
    }
  };
  // A carried TORCH can sit on the bar too, to light/snuff it fast. One entry.
  let torchEntry = null;
  const addTorch = (it) => {
    if (it && it.kind === 'light' && !it.passive && !torchEntry) {
      torchEntry = { id: it.baseId, baseId: it.baseId, name: (typeof it.name === 'string' ? it.name : potionName(it)), icon: it.icon || '🔥', kind: 'light' };
    }
  };
  // Scan the extra (fire) slot for the torch, then the whole backpack.
  addTorch(inv.equip && inv.equip.extra);
  for (const it of inv.backpack) {
    addPotion(it);
    addTorch(it);
    if (it && it.contents) for (const inner of it.contents) { addPotion(inner); addTorch(inner); }
  }
  // The torch rides in the consumables list so the keyboard panel and hotbar menu
  // both offer it without special-casing; its 'light' kind routes to toggleTorch.
  if (torchEntry) potions.push(torchEntry);
  return { skills, potions };
}

// Rebuild a saved hotbar entry ({kind,id,baseId}) into a full live entry so it
// shows its icon and fires correctly after a reload. Skills resolve from the
// profession tree; potions/lights from the item tables (icon painted lazily).
function resolveHotbarEntry(saved) {
  if (!saved) return null;
  if (saved.kind === 'skill') {
    const sk = getSkill(saved.id);
    if (!sk) return null;
    return {
      id: sk.id, name: (sk.name && (sk.name[getLang()] || sk.name.es)) || sk.id,
      icon: SKILL_ICON[sk.kind] || '✨', iconHtml: skillIcon(sk),
      manaCost: sk.manaCost || 0, cooldown: sk.cooldown || 1, kind: 'skill', skillKind: sk.kind,
    };
  }
  // potion / light: resolve a fresh instance just for its name + icon. The
  // hotbar's entryIcon() paints potions/lights via iconFor() from kind+baseId, so
  // no iconHtml is needed here.
  const item = resolveItem(saved.baseId || saved.id, () => 0.5, player.level, getLang());
  if (!item) return { kind: saved.kind, id: saved.id, baseId: saved.baseId, name: saved.baseId || '', icon: '🧪' };
  return {
    kind: saved.kind, id: item.baseId, baseId: item.baseId,
    name: potionName(item), icon: item.icon || (saved.kind === 'light' ? '🔥' : '🧪'),
  };
}

// A potion's display name handles both string and {es,en} shapes.
function potionName(it) {
  if (!it) return '';
  if (typeof it.name === 'string') return it.name;
  return (it.name && (it.name[getLang()] || it.name.es)) || it.baseId || '';
}

// Assign a potion item to the first empty hotbar slot (used from the item menu).
function assignPotionToHotbar(item) {
  let slot = hotbar.slots.findIndex((e) => !e);
  if (slot < 0) slot = 9; // all full: replace the last slot
  hotbar.setSlot(slot, { kind: 'potion', id: item.baseId, baseId: item.baseId, name: potionName(item), icon: item.icon || '🧪' });
  gameUI.toast(`${item.icon || '🧪'} → ${slot === 9 ? 0 : slot + 1}`, 'loot');
}

const SKILL_ICON = { area: '🔥', melee: '💥', ranged: '🎯', heal: '💚', summon: '🐾', passive: '🌀' };

// The hotbar is now player-arranged: spells are DRAGGED onto it from the Spells
// window (and removed by dragging them off), they no longer auto-populate. This
// only keeps the saved bar honest — it drops entries for skills the character
// can no longer cast (an old save, or a skill above the current level) so a
// stale slot never tries to fire something the player doesn't have. It
// deliberately does NOT add anything. Called on entering the game and whenever
// a skill point is spent.
function prefillHotbar() {
  const castable = new Set(hotbarOptions().skills.map((s) => s.id));
  let changed = false;
  for (let i = 0; i < hotbar.slots.length; i++) {
    const e = hotbar.slots[i];
    if (e && e.kind === 'skill' && !castable.has(e.id)) { hotbar.slots[i] = null; changed = true; }
  }
  if (changed) hotbar.render();
}

function doBuy(def, refresh, price) {
  const cost = price != null ? price : def.value;
  if (inv.gold < cost) { gameUI.toast(t('noGold'), 'bad'); return; }
  let item;
  if (getWeapon(def.id)) item = rollShopWeapon(def.id);
  else if (getArmor(def.id)) item = instanceFromArmor(getArmor(def.id));
  else if (getQuiver(def.id)) item = instanceFromQuiver(getQuiver(def.id));
  else if (getContainer(def.id)) item = instanceFromContainer(def);
  else if (def.kind === 'potion') item = instanceFromPotion(def, getLang());
  if (!item) return;
  const r = inv.addToBackpack(item, player.level);
  if (r !== 'ok') { gameUI.toast(t(r === 'heavy' ? 'tooHeavy' : 'full'), 'bad'); return; }
  inv.spendGold(cost);
  player.gold = inv.gold;
  audio.sfx.pickup();
  recompute();
  refresh && refresh();
}

// Sell a backpack item to a vendor NPC for its sell price in coins. A stack
// (potions/fruit) sells one unit per click, peeling it off the stack.
function doSell(index, npc, refresh) {
  const item = inv.backpack[index];
  if (!item || !npc.shop || !vendorBuysItem(npc.shop, item)) return;
  // The rarity collector pays by item level (levelReq × 100); everyone else pays
  // the standard 10% buy-back. Coins auto-consolidate to silver/gold on payout.
  const price = npc.shop.rarity ? collectorPrice(item) : sellPrice(npc.shop, item);
  if ((item.count || 1) > 1) item.count -= 1;
  else inv.removeFromBackpack(index);
  inv.addGold(price);
  player.gold = inv.gold;
  audio.sfx.pickup();
  gameUI.toast(`+${price} 💰`, 'loot');
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

// The level-1 starter weapon for each vocation.
const STARTER_WEAPON = { knight: 'wooden_sword', paladin: 'wooden_bow', mage: 'apprentice_wand', druid: 'apprentice_wand' };

// Equip a fresh character: a level-1 weapon for their vocation and a brown
// BACKPACK (20 slots) with a brown BAG (8 slots) tucked inside it — the classic
// Tibia starter so the player has real room from minute one plus a spare
// container to sort loot into.
function giveStarterGear() {
  if (!inv.equip.weapon) {
    const wid = STARTER_WEAPON[player.profession] || 'wooden_sword';
    inv.equip.weapon = rollWeaponInstance(wid, () => 0.5) || rollShopWeapon(wid);
  }
  if (!inv.equip.bag) {
    inv.equip.bag = instanceFromContainer(getContainer('backpack'));
    const innerBag = instanceFromContainer(getContainer('bag'));
    inv.backpack.push(innerBag);
  }
  // Everyone starts with a basic torch worn in the fire (extra) slot — double-
  // click it there to light it. Only hand one out if the player has none yet
  // (slot or bag), so reloading a save doesn't keep adding torches.
  const hasTorch = (inv.equip.extra && inv.equip.extra.baseId === 'torch')
    || inv.backpack.some((it) => it && it.kind === 'light' && it.baseId === 'torch');
  if (!hasTorch) {
    const torch = resolveItem('torch', () => 0.5, player.level, getLang());
    if (torch) {
      if (!inv.equip.extra) inv.equip.extra = torch;
      else inv.backpack.push(torch);
    }
  }
}

// At level 20 the plain Torch becomes a Bright Torch. Swap every 'torch' the
// player holds (the lit fire slot + the backpack + nested bags) for a bright one,
// keeping it in the same place. Preserves the lit state of the equipped torch.
function upgradeTorchToBright() {
  const brightDef = getLight('bright_torch');
  if (!brightDef) return;
  let changed = false;
  const swap = (it) => {
    if (it && it.kind === 'light' && it.baseId === 'torch') { Object.assign(it, instanceFromLight(brightDef, getLang())); changed = true; return true; }
    return false;
  };
  swap(inv.equip.extra);
  for (const it of inv.backpack) { swap(it); if (it && it.contents) for (const inner of it.contents) swap(inner); }
  if (changed) {
    recomputeLight();
    gameUI.toast(getLang() === 'en' ? '🔥 Your torch flares into a Bright Torch!' : '🔥 ¡Tu antorcha se vuelve una Antorcha Brillante!', 'levelup');
  }
}

function recompute() {
  player.defense = inv.totalDefense();
  player.weapon = inv.weapon();
  player.speedBonus = inv.speedBonus();
  recomputeCombatStats(); // weapon may have changed: refresh attack speed/range

  recomputeLight();
  equipVisuals.refresh(inv.equip, player.level);
  // Either hand may hold the weapon now. The first-person viewmodel always shows
  // the weapon you actually fight with (player.weapon), and the off-hand view
  // shows whatever sits in the OTHER hand (a shield, or nothing).
  const heldWeapon = player.weapon;
  const offHandItem = (inv.equip.weapon && inv.equip.weapon === heldWeapon) ? inv.equip.shield : inv.equip.weapon;
  setViewModel(heldWeapon, player.level);
  setViewShield(offHandItem, heldWeapon);
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
    // MapleStory-style: each level grants AP (stat points) and SP (skill points).
    charStats.grantForLevels(before, player.level);
    applyVocationStats(true);
    audio.sfx.levelUp();
    gameUI.toast(t('levelUp', player.level), 'levelup');
    gameUI.toast(`+${gain.hp * (player.level - before)} HP · +${gain.mana * (player.level - before)} ${t('mana')}`, 'levelup');
    // Job advancement: crossing 30/70/120 promotes the vocation to its next
    // named job (Archer → Golden Archer → …) and unlocks that tier's skills.
    for (let lv = before + 1; lv <= player.level; lv++) {
      const adv = jobAdvancementAt(player.profession, lv);
      if (adv) {
        const name = adv.name[getLang()] || adv.name.es;
        gameUI.toast(`★ ${t('jobAdvance')} ${name}!`, 'levelup');
        audio.sfx.levelUp();
      }
    }
    // At level 20 your humble torch flares into a BRIGHT TORCH — upgrade any
    // plain torch the player carries (equipped fire slot or in the bag).
    if (before < 20 && player.level >= 20) upgradeTorchToBright();
    equipVisuals.refresh(inv.equip, player.level);
    // The ambient bots cheer you on — a trickle of "gratz!" over the next few
    // seconds (bots.congratulate staggers them; only on the surface where bots live).
    if (place === 'surface') bots.congratulate(profile.name, getLang());
  }
  gameUI.setVitals(player.hp, player.maxHp, player.mana, player.maxMana, info);
  // Save the XP gain promptly so a reload right after a kill keeps it.
  persistProgress();
}

function onPlayerDeath() {
  player.alive = false;
  player.hp = 0;
  mounts.dismount();   // you fall off your mount when you die
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

// The nearest city statue within reach (to read its legend), or null. Statues are
// ~2m wide on their step; 3.5m gives a comfortable "stand near it and press" range.
const STATUE_RADIUS = 3.5;
function statueNear(px, pz) {
  if (place !== 'surface') return null;
  let best = null, bestD2 = STATUE_RADIUS * STATUE_RADIUS;
  for (const s of cityStatues) {
    const dx = s.x - px, dz = s.z - pz;
    const d2 = dx * dx + dz * dz;
    if (d2 < bestD2) { bestD2 = d2; best = s; }
  }
  return best;
}

function tryInteract() {
  // Inside a house, E acts on the nearest showcase slot (place / take / buy).
  if (place === 'house' && activeHouse) { interactHouseSlot(); return; }

  const npc = worldNpcs.npcAt(player.pos.x, player.pos.z);
  if (npc) { openNpcDialog(npc); return; }

  const chest = chestAt(dungeonChests, player.pos.x, player.pos.z);
  if (chest && !chest.opened) { openDungeonChest(chest); return; }

  // At a house door: buy it, manage your own, or visit someone else's.
  const lot = houseAtPlayer();
  if (lot) { houseDoorAction(lot); return; }

  // A city statue: read the hero's legend.
  const statue = statueNear(player.pos.x, player.pos.z);
  if (statue) { if (document.pointerLockElement) document.exitPointerLock(); gameUI.openStatueLegend(statue, getLang()); return; }

  const node = interactableAt(cityProps, player.pos.x, player.pos.z);
  if (!node) return;
  if (document.pointerLockElement) document.exitPointerLock();
  if (node.kind === 'shop') gameUI.openShop(node.city);
  else if (node.kind === 'depot') gameUI.openDepot(node.city);
  else if (node.kind === 'portal') gameUI.openTeleport(node.city, (dest) => teleportTo(dest));
  else if (node.kind === 'stall') openMarketStall({ stallId: node.stallId, city: node.city.id, market: node.market });
  else if (node.kind === 'healStatue') useHealStatue();
}

// Talk to a gate healing statue: tops HP up to HEAL_STATUE_HP_PCT and mana up to
// HEAL_STATUE_MANA_PCT of the maximum (never lowers them), unlimited times — but
// only for low-level travellers (level <= HEAL_STATUE_MAX_LEVEL). Higher levels
// are gently turned away.
const HEAL_STATUE_MAX_LEVEL = 20;
const HEAL_STATUE_HP_PCT = 0.80;
const HEAL_STATUE_MANA_PCT = 0.50;
function useHealStatue() {
  if (!player.alive) return;
  if (player.level > HEAL_STATUE_MAX_LEVEL) {
    gameUI.toast(t('healStatueTooHigh', HEAL_STATUE_MAX_LEVEL), 'bad');
    return;
  }
  const hpTarget = Math.round(player.maxHp * HEAL_STATUE_HP_PCT);
  const manaTarget = Math.round(player.maxMana * HEAL_STATUE_MANA_PCT);
  const before = { hp: player.hp, mana: player.mana };
  player.hp = Math.max(player.hp, Math.min(player.maxHp, hpTarget));
  player.mana = Math.max(player.mana, Math.min(player.maxMana, manaTarget));
  if (player.hp === before.hp && player.mana === before.mana) {
    gameUI.toast(t('healStatueFull'), 'info');
    return;
  }
  audio.sfx.levelUp?.();
  gameUI.setVitals(player.hp, player.maxHp, player.mana, player.maxMana, xpProgress(player.exp));
  gameUI.toast('✨ ' + t('healStatueHealed'), 'levelup');
}

// Doorstep action: your own house → manage menu; an unowned lot → buy dialog;
// a lot someone else owns (online) → ask to enter their house.
function houseDoorAction(lot) {
  if (document.pointerLockElement) document.exitPointerLock();
  if (houseStore.ownsLot(lot.id)) { openHouseManage(lot); return; }
  const visited = visitedHouses.get(lot.id);
  if (visited && visited.owner) { askVisitHouse(lot, visited); return; }
  if (houseStore.ownsAny()) { gameUI.toast(t('houseAlreadyOwn'), 'info'); return; }
  openHouseBuy(lot);
}

// E on a showcase slot inside a house. Owner: place from backpack onto an empty
// slot, or open the slot's options (sell-flag / take). Visitor: buy if for sale.
function interactHouseSlot() {
  // Pick the wall slot the player is AIMING at (crosshair = screen centre), so the
  // item lands exactly where they point — not at a slot chosen by proximity.
  _peerRay.setFromCamera(_peerCenter, camera);
  const hit = activeHouse.slotAtAim
    ? activeHouse.slotAtAim(_peerRay, player.pos.x, player.pos.z)
    : activeHouse.nearestSlot(player.pos.x, player.pos.z, 2.4);
  if (!hit) return;
  if (document.pointerLockElement) document.exitPointerLock();
  const owner = activeHouseLot && houseStore.ownsLot(activeHouseLot.id);
  // A door-wall FACADE niche: the owner edits what shows OUTSIDE (place / swap /
  // clear), straight from inside. Visitors just see it (no editing).
  if (hit.facadeSlot != null) {
    if (owner) gameUI.openHouseFacadeSlot(activeHouseLot, houseStore, houseHooks(activeHouseLot), hit.facadeSlot);
    return;
  }
  if (owner) gameUI.openHouseSlot(hit.wallId, hit.index);
  else gameUI.openHouseVisitorSlot(activeHouse, hit.wallId, hit.index);
}

// The buy dialog for an unowned lot.
function openHouseBuy(lot) {
  gameUI.openHouseBuy(lot, inv.gold, { buy: () => buyHouse(lot) });
}

// The owner's management menu (colours, light, ban list, walls, sell house).
// The owner-only callbacks for managing a house (colours, light, bans, facade,
// name sign…). Extracted so both the Manage-house panel AND the in-house facade
// niche editor can share the exact same logic. onHouseChanged rebuilds the live
// interior + exterior, saves, and syncs to visitors.
function houseHooks(lot) {
  return {
    enter: () => enterHouse(lot, houseStore, { readOnly: false }),
    setColor: (key, hex) => { houseStore.setColor(key, hex); onHouseChanged(); },
    setLight: (temp) => { houseStore.setLight(temp); onHouseChanged(); },
    ban: (name) => { houseStore.ban(name); onHouseChanged(); gameUI.toast(t('houseBanned', name)); },
    unban: (name) => { houseStore.unban(name); onHouseChanged(); gameUI.toast(t('houseUnbanned', name)); },
    toggleClosed: (v) => { houseStore.closed = !!v; onHouseChanged(); },
    sellHouse: () => sellHouse(lot),
    // Facade display: show / clear a front-wall slot. Display-only (the item is
    // copied for show, never removed from the backpack).
    setFacade: (index, bpIndex) => {
      const item = inv.backpack[bpIndex];
      if (item && item.kind !== 'coin') houseStore.setFacade(index, item);
      onHouseChanged();
    },
    clearFacade: (index) => { houseStore.clearFacade(index); onHouseChanged(); },
    // House name sign over the door, and its background colour.
    setHouseName: (text) => { houseStore.setName(text); onHouseChanged(); },
    setHouseColor: (hex) => { houseStore.setNameColor(hex); onHouseChanged(); },
  };
}

function openHouseManage(lot) {
  gameUI.openHouseManage(lot, houseStore, houseHooks(lot));
}

// Ask a visitor whether to enter someone's house, honouring the ban list.
function askVisitHouse(lot, snapshot) {
  const myName = (profile && profile.name) || 'Adventurer';
  if (snapshot.closed || (Array.isArray(snapshot.bans) && snapshot.bans.includes(myName.toLowerCase()))) {
    gameUI.toast(t(snapshot.closed ? 'houseClosedToVisitors' : 'houseBannedYou'), 'bad');
    return;
  }
  gameUI.confirmVisitHouse(snapshot.owner, () => {
    enterHouse(lot, snapshot, { readOnly: true });
    // Tell the owner someone looked around their house (for their wake-up report).
    try {
      const at = (() => { try { return Date.now(); } catch (_) { return 0; } })();
      if (net && net.houseVisit && snapshot.ownerId) net.houseVisit(snapshot.ownerId, lot.id, myName, at);
    } catch (_) {}
  });
}

// Visits to MY house, received over the network while I'm away/asleep. Kept in a
// rolling list (most recent first), persisted with the character so the report
// survives a re-login. Only recorded if the visitor was allowed in.
const houseVisitors = [];
function recordHouseVisit(payload) {
  if (!payload || !houseStore.owned) return;
  if (payload.ownerId !== (net.userId && net.userId())) return;   // not my house
  // honour the ban/closed list — a banned visitor couldn't really get in
  const vname = (payload.visitorName || 'Alguien');
  const banned = houseStore.closed ||
    (Array.isArray(houseStore.bans) && houseStore.bans.includes(vname.toLowerCase()));
  if (banned) return;
  houseVisitors.unshift({ name: vname, at: payload.at || 0 });
  if (houseVisitors.length > 20) houseVisitors.length = 20;
}

// Show "who visited your house" — called on waking and on login if asleep.
function reportVisitors() {
  if (!houseVisitors.length) return;
  const names = houseVisitors.slice(0, 8).map((v) => v.name);
  const uniq = [...new Set(names)];
  const lead = uniq.length === 1
    ? `🏠 ${uniq[0]} ${t('visitedYourHouseOne') || 'pasó por tu casa'}`
    : `🏠 ${uniq.join(', ')} ${t('visitedYourHouseMany') || 'pasaron por tu casa'}`;
  gameUI.toast(lead, 'info');
  houseVisitors.length = 0;
}

// Sell the owned house: refund half, drop the displayed items, clear ownership.
function sellHouse(lot) {
  const refund = Math.floor(housePrice(lot) / 2);
  houseStore.sell();
  inv.addGold(refund); player.gold = inv.gold;
  audio.sfx.pickup();
  gameUI.toast(t('houseSold', mmCoins(refund)), 'levelup');
  recompute();
  refreshHouseExteriors();
  persistProgress();
  broadcastHouse();
  gameUI.closeContext();
}

// Called after any house edit (colour, light, item, ban): repaint the live
// interior, the surface skin, save and sync.
function onHouseChanged() {
  refreshActiveHouse();
  refreshHouseExteriors();
  persistProgress();
  broadcastHouse();
}

// --- Showcase item operations (owner) -------------------------------------

// Hang a held item onto wall `wallId` at slot `index`. `ref` is the item OBJECT
// (it may live top-level in the backpack or inside a nested bag). For a stack
// (coins/potions/trophies) we peel ONE unit off for display and leave the rest;
// a single item is removed whole. Returns true on success.
function houseHangItem(wallId, index, ref) {
  const item = (ref && typeof ref === 'object') ? ref : inv.backpack[ref];
  if (!item) return false;
  // The piece that actually goes on the wall: a shallow copy of one unit if it's
  // a counted stack, else the item itself.
  const stacked = item.count > 1;
  const display = stacked ? { ...item, count: 1 } : item;
  const used = houseStore.place(wallId, display, index);
  if (used < 0) { gameUI.toast(t('houseWallFull'), 'bad'); return false; }
  if (stacked) item.count -= 1;          // leave the rest of the stack in the bag
  else inv.removeItemRef(item);          // remove the whole single item
  audio.sfx.click();
  recompute();
  onHouseChanged();
  return true;
}

// Take an item off the wall back into the backpack (owner only).
function houseTakeItem(wallId, index) {
  const item = houseStore.slot(wallId, index);
  if (!item) return false;
  const r = inv.addToBackpack(item.item, player.level);
  if (r !== 'ok') { gameUI.toast(t(r === 'heavy' ? 'tooHeavy' : 'full'), 'bad'); return false; }
  houseStore.take(wallId, index);
  audio.sfx.pickup();
  recompute();
  onHouseChanged();
  return true;
}

// ---- Free market (city stalls) --------------------------------------------
//
// The DB (auth.js market_* methods, backed by ADD_market.sql) is the single
// source of truth for stall contents. The buy/claim RPCs mutate the character's
// gold COLUMN and backpack jsonb server-side; the local inv.gold is derived from
// coin stacks, so after any DB-side gold change we re-read the character row and
// re-hydrate gold + backpack (reconcileFromCloud). The seller may be offline at
// sale time — the gold + "sold" message wait in market_payouts and are claimed
// on the seller's next login (claimMarketPayouts).

// Cached owning auth user id (whose uid owns the character row). Avoids awaiting
// currentUser() on every stall open / ownership test.
let _marketUid = null;
async function marketMyUid() {
  if (_marketUid) return _marketUid;
  const u = await auth.currentUser();
  _marketUid = u ? u.id : null;
  return _marketUid;
}

// Re-read the signed-in character and re-apply ONLY the gold + backpack (never
// the position — a buy must not teleport the buyer). The single reconciliation
// point after any DB-side gold/item mutation (buy + payout claim).
async function reconcileFromCloud() {
  if (!authCharacterId || !auth.isAvailable()) return;
  const row = await auth.loadCharacter(authCharacterId);
  if (!row) return;
  inv.gold = row.gold || 0;
  if (Array.isArray(row.backpack)) inv.backpack = row.backpack;
  recompute();
}

// Fetch a city's listings and rebuild the 3D goods on its stall counters, so
// every occupied stall shows its items from a distance. Returns the listings so
// callers (openMarketStall) can reuse the same fetch. No-op offline.
async function refreshMarketDisplay(cityId) {
  if (!cityId || !auth.isAvailable()) return [];
  const all = await auth.listListings(cityId);
  // Sign label per stall, e.g. "Tienda de Mara" / "Mara's shop".
  marketDisplay.refreshCity(cityId, all, cityGroundY.get(cityId) || 0,
    (sellerName) => (sellerName ? t('marketShopSign', sellerName) : ''),
    t('marketFreeSign'));
  return all;
}

// Open a stall: fetch the city's listings (also refreshing the 3D goods), decide
// whether this stall is mine / free, show the browse window. Online-only; offline
// shows a toast and never throws.
async function openMarketStall(stall) {
  if (!auth.isAvailable()) { gameUI.toast(t('marketOffline'), 'bad'); return; }
  if (document.pointerLockElement) document.exitPointerLock();
  const all = await refreshMarketDisplay(stall.city);
  const here = all.filter((r) => r.stall_id === stall.stallId);
  const myUid = await marketMyUid();
  // This stall is "mine" when it's empty (I can claim it) or every listing is mine.
  const free = here.length === 0;
  const mine = free || here.every((r) => r.seller_id === myUid);
  const cityName = (CITIES.find((c) => c.id === stall.city) || {}).name || '';
  gameUI.openMarketStall(stall, here, mine, {
    free,
    cityName,
    market: stall.market || 'mini',
    place: (s, bp, price) => marketPlace(s, bp, price),
    take: (id) => marketTake(id, stall),
    buy: (id, item, price) => marketBuy(id, item, price, stall),
    refresh: (s) => openMarketStall(s),
  });
}

// Put one backpack item on sale at a stall (next free slot). A seller may run
// only ONE stall at a time, so this rejects placing in a stall held by someone
// else AND placing while the seller already has listings in a different stall.
// Caps at STALL_CAP per stall.
async function marketPlace(stall, bpIndex, price) {
  const item = inv.backpack[bpIndex];
  if (!item || item.kind === 'coin') return;
  const myUid = await marketMyUid();
  const all = await auth.listListings(stall.city);
  const here = all.filter((r) => r.stall_id === stall.stallId);
  if (here.length && here.some((r) => r.seller_id !== myUid)) { gameUI.toast(t('marketStallTaken'), 'bad'); return; }
  if (here.length >= STALL_CAP) { gameUI.toast(t('marketStallFull'), 'bad'); return; }
  // One stall per seller: refuse if I already sell in a different stall (this
  // city or any other — listMyStall spans cities).
  const mine = await auth.listMyStall();
  if (mine.some((r) => !(r.city === stall.city && r.stall_id === stall.stallId))) {
    gameUI.toast(t('marketOneStall'), 'bad'); return;
  }
  const r = await auth.placeListing(stall.stallId, stall.city, here.length, item, price, profile.name);
  if (!r.ok) { gameUI.toast(t('marketOffline'), 'bad'); return; }
  inv.removeFromBackpack(bpIndex);   // the item now lives in the DB listing
  audio.sfx.click();
  recompute();                       // persists the now-shorter backpack
  openMarketStall(stall);            // re-opens the window AND refreshes the 3D goods
}

// Unsell: pull the item back out of the DB listing and into the backpack. If the
// bag is full the item is re-listed so nothing is ever lost.
async function marketTake(listingId, stall) {
  const r = await auth.takeListing(listingId);
  if (!r.ok || !r.item) { gameUI.toast(t('marketOffline'), 'bad'); return; }
  const add = inv.addToBackpack(r.item, player.level);
  if (add !== 'ok') {
    await auth.placeListing(stall.stallId, stall.city, 0, r.item, r.item.value || 0, profile.name);
    gameUI.toast(t(add === 'heavy' ? 'tooHeavy' : 'full'), 'bad');
    openMarketStall(stall);
    return;
  }
  audio.sfx.pickup();
  recompute();
  gameUI.toast(t('marketTaken'), 'info');
  openMarketStall(stall);
}

// Buy a listing through the atomic RPC, then reconcile gold + backpack from the
// DB (the RPC mutated them server-side, bypassing the local coin pile).
async function marketBuy(listingId, item, price, stall) {
  const r = await auth.buyListing(listingId);
  if (!r.ok) {
    const key = ({ gold: 'marketNotEnoughGold', gone: 'marketGone', self: 'marketNoSelf',
                   nochar: 'marketOffline', offline: 'marketOffline', 'no-market': 'marketOffline' })[r.reason] || 'marketOffline';
    gameUI.toast(t(key), 'bad');
    if (r.reason === 'gone') openMarketStall(stall);   // refresh: the item left
    return;
  }
  await reconcileFromCloud();        // re-hydrate the authoritative gold + bag
  audio.sfx.pickup();
  const name = (item && item.name) ? (typeof item.name === 'string' ? item.name : (item.name[getLang()] || item.name.es)) : '';
  gameUI.toast(t('marketBought', name), 'loot');
  openMarketStall(stall);
}

// On login: credit any sales made while we were away and toast each one. The
// claim RPC already added the gold to the character row, so reconcile the local
// pile from the DB rather than adding coins twice.
async function claimMarketPayouts() {
  if (!auth.isAvailable() || !authCharacterId) return;
  const rows = await auth.claimPayouts();
  if (!rows.length) return;
  await reconcileFromCloud();
  for (const r of rows) {
    gameUI.toast(t('marketItemSold', r.item_name, r.buyer_name) + ' (+' + mmCoins(r.gold) + ')', 'loot');
  }
}

// --- House networking bridges ---------------------------------------------
// These are no-ops offline. Implemented against net.js (broadcast house state,
// who's inside, and item purchases) so other connected players see the room.

function broadcastHouse() {
  if (!net.isOnline()) return;
  const lot = houseStore.owned ? houseLotById.get(houseStore.owned.lotId) : null;
  net.houseSync(houseStore.owned ? houseStore.publicState(lot, (profile && profile.name) || 'Adventurer') : { lotId: null });
}

function broadcastHouseInside(lotId, inside) {
  if (!net.isOnline()) return;
  net.houseInside(lotId, inside);
}

// The centred "Press E to…" hint shown near a house door or showcase slot.
let _lastHint = '';
function updateInteractHint() {
  let hint = '';
  if (state === 'play' && player.alive) {
    if (place === 'house' && activeHouse) {
      if (activeHouse.nearestSlot(player.pos.x, player.pos.z, 2.4)) {
        const owner = activeHouseLot && houseStore.ownsLot(activeHouseLot.id);
        // Houses are display-only: the owner places items, a visitor just looks.
        hint = owner ? '🖼️ ' + t('housePlaceItem') : '🖼️ ' + t('houseOnlyOwner');
      }
    } else if (place === 'surface') {
      const lot = houseAtPlayer();
      if (lot) {
        if (houseStore.ownsLot(lot.id)) hint = '🏠 ' + t('houseManage');
        else {
          const visited = visitedHouses.get(lot.id);
          if (visited && visited.owner) hint = '🚪 ' + t('houseEnterPrompt', visited.owner);
          else if (!houseStore.ownsAny()) hint = '🏠 ' + t('houseBuyPrompt');
        }
      } else if (statueNear(player.pos.x, player.pos.z)) {
        hint = '📜 ' + (t('statueReadHint') || 'Leer la leyenda');
      } else {
        const node = interactableAt(cityProps, player.pos.x, player.pos.z);
        if (node && node.kind === 'stall') hint = '🛒 ' + t('marketStallHint');
        else if (node && node.kind === 'healStatue') hint = '✨ ' + t('healStatueHint');
      }
    }
  }
  if (hint !== _lastHint) {
    _lastHint = hint;
    ui.interactHint.textContent = hint;
    ui.interactHint.classList.toggle('hidden', !hint);
  }
  // Show the touch INTERACT button whenever anything is in range (NPCs, doors,
  // shops, depot, portals, stalls, chests, house slots) — touch players have no E.
  if (ui.btnInteract) {
    const near = controls.isTouch && state === 'play' && player.alive && interactableNearby();
    ui.btnInteract.classList.toggle('hidden', !near);
  }
}

// True if tryInteract() would do something right now (mirrors its checks). Drives
// the touch interact button's visibility so it only appears when it's useful.
function interactableNearby() {
  if (place === 'house' && activeHouse) return !!activeHouse.nearestSlot(player.pos.x, player.pos.z, 2.4);
  if (worldNpcs.npcAt(player.pos.x, player.pos.z)) return true;
  const chest = chestAt(dungeonChests, player.pos.x, player.pos.z);
  if (chest && !chest.opened) return true;
  if (houseAtPlayer()) return true;
  if (statueNear(player.pos.x, player.pos.z)) return true;
  return !!interactableAt(cityProps, player.pos.x, player.pos.z);
}

// Quest WAYPOINT ARROW: a screen-space pointer toward the current quest
// destination (_waypoint, set by refreshWaypoint). It hugs the screen edge,
// rotates to point at the target, and shows the place name + distance. Hidden
// when the toggle is off, when there's no quest target, when off the surface, or
// when the player is basically on top of the destination.
const _qArrowEl = document.getElementById('quest-arrow');
const _qArrowGlyph = _qArrowEl ? _qArrowEl.querySelector('.qa-arrow') : null;
const _qArrowLabel = _qArrowEl ? _qArrowEl.querySelector('.qa-label') : null;
function updateQuestArrow() {
  if (!_qArrowEl) return;
  const off = !showQuestArrow || state !== 'play' || place !== 'surface' || !_waypoint || !player.alive;
  if (off) { if (!_qArrowEl.classList.contains('hidden')) _qArrowEl.classList.add('hidden'); return; }

  const dx = _waypoint.x - player.pos.x, dz = _waypoint.z - player.pos.z;
  const dist = Math.hypot(dx, dz);
  // Arrived: within ~14m, don't clutter — you can see the place/NPC.
  if (dist < 14) { if (!_qArrowEl.classList.contains('hidden')) _qArrowEl.classList.add('hidden'); return; }

  const W = innerWidth, H = innerHeight, cx = W / 2, cy = H / 2;
  // Direction in WORLD space, rotated into camera/screen space by the camera's
  // yaw. This is robust whether the target is in front or behind (the old
  // screen-projection mirror jittered when the target sat near the center while
  // behind, because the mirror loses sign there). atan2(forward, right) gives a
  // screen angle where straight-ahead = up.
  camera.getWorldDirection(camDir);
  const camYaw = Math.atan2(camDir.x, camDir.z);      // heading the camera faces
  const tgtYaw = Math.atan2(dx, dz);                  // heading to the target
  let rel = tgtYaw - camYaw;                          // 0 = dead ahead
  while (rel > Math.PI) rel -= Math.PI * 2;
  while (rel < -Math.PI) rel += Math.PI * 2;
  // Screen unit vector: ahead → up (-y), right of view → +x.
  let ax = Math.sin(rel), ay = -Math.cos(rel);
  const margin = 64;
  // Scale the unit direction out to the viewport box (whichever edge it hits first).
  const tx = (cx - margin) / (Math.abs(ax) || 1e-3);
  const ty = (cy - margin) / (Math.abs(ay) || 1e-3);
  const t = Math.min(tx, ty);
  const ex = cx + ax * t, ey = cy + ay * t;

  _qArrowEl.style.left = ex + 'px';
  _qArrowEl.style.top = ey + 'px';
  if (_qArrowGlyph) _qArrowGlyph.style.transform = `rotate(${Math.atan2(ay, ax)}rad)`;
  if (_qArrowLabel) {
    const name = _waypoint.name || '';
    const verb = _waypoint.turnIn ? (getLang() === 'en' ? 'Turn in' : 'Entregar') : '';
    _qArrowLabel.textContent = `${verb ? verb + ' · ' : ''}${name} · ${Math.round(dist)}m`;
  }
  _qArrowEl.classList.toggle('qa-turnin', !!_waypoint.turnIn);
  if (_qArrowEl.classList.contains('hidden')) _qArrowEl.classList.remove('hidden');
}

// Keep the 3D stall goods in sync with the DB as the player moves around: when
// they come within MARKET_VIEW_R of a city's market, (re)fetch that city's
// listings and rebuild the counter plaques. Refreshes once on arrival, then at
// most every MARKET_REFRESH_MS so newly-listed items by other players appear
// without re-walking. Throttled hard so it never spams the network per frame.
const MARKET_VIEW_R = 60;        // how near a city before we render its goods
const MARKET_REFRESH_MS = 20000; // re-poll the visible city's listings this often
let _marketCityId = null;
let _marketNextPoll = 0;
function updateMarketProximity() {
  if (place !== 'surface' || !auth.isAvailable()) return;
  const c = nearestCity(player.pos.x, player.pos.z);
  const near = c && Math.hypot(c.x - player.pos.x, c.z - player.pos.z) < MARKET_VIEW_R;
  if (!near) { _marketCityId = null; return; }
  const now = performance.now();
  if (c.id !== _marketCityId) {
    _marketCityId = c.id;
    _marketNextPoll = now + MARKET_REFRESH_MS;
    refreshMarketDisplay(c.id);     // fire-and-forget; rebuilds the counter goods
  } else if (now >= _marketNextPoll) {
    _marketNextPoll = now + MARKET_REFRESH_MS;
    refreshMarketDisplay(c.id);
  }
}

// Gently breathe the temple healing auras (opacity pulse on the translucent disc
// + dome) and slowly turn the whole aura so the motes drift — a living "this is
// healing you" glow. Cheap: only the few aura groups, only on the surface.
function updateTempleAuras() {
  if (place !== 'surface' || !templeAuras.length) return;
  const pulse = 0.78 + 0.22 * Math.sin(nowSec * 2.0);   // 0.56..1.0
  for (const aura of templeAuras) {
    aura.rotation.y = nowSec * 0.25;
    for (const child of aura.children) {
      const m = child.material;
      if (m && m.transparent && m._baseOpacity == null) m._baseOpacity = m.opacity;
      if (m && m.transparent) m.opacity = m._baseOpacity * pulse;
    }
  }
}

// City statues glow softly from their base UPWARD at night and go dark by day.
// The night factor ramps with the sun's elevation (full at deep night, fading
// through dusk/dawn), with a faint flicker so the glow reads as living light, not
// a flat tint. Cheap: only a handful of statues, only on the surface.
function updateStatueGlows() {
  if (place !== 'surface' || !cityStatues.length) return;
  // elevation: +1 noon → -1 midnight. Map the dark half to 0..1.
  const e = daynight.elevation();
  const night = Math.max(0, Math.min(1, (-e - 0.04) / 0.6));
  const flicker = 0.9 + 0.1 * Math.sin(nowSec * 3.1);
  const emissive = night * 0.9 * flicker;     // base slab glow
  const lightI = night * 1.4 * flicker;       // upward point light
  for (const s of cityStatues) {
    const g = s.glow;
    if (!g) continue;
    if (g.base && g.base.material) g.base.material.emissiveIntensity = emissive;
    if (g.light) g.light.intensity = lightI;
  }
}

// Spin each market-square coin and cycle its colour through the currency tiers —
// bronze → silver → gold → platinum → diamond — holding each for 5 seconds and
// blending smoothly between them. Diamond glows the brightest (a blue shimmer).
// Cheap: only the few coin objects, only on the surface.
const COIN_TIER_SECONDS = 5;
function updateMarketCoins() {
  if (place !== 'surface' || !marketCoins.length || !MARKET_COIN_TIERS.length) return;
  const N = MARKET_COIN_TIERS.length;
  const phase = nowSec / COIN_TIER_SECONDS;
  const i = Math.floor(phase) % N;
  const next = (i + 1) % N;
  const f = phase - Math.floor(phase);                  // 0..1 blend into the next tier
  const a = MARKET_COIN_TIERS[i], b = MARKET_COIN_TIERS[next];
  // Blend the two tier colours + glow so the change reads as a smooth shimmer.
  const lerp = (x, y) => x + (y - x) * f;
  const ar = (a.color >> 16) & 0xff, ag = (a.color >> 8) & 0xff, ab = a.color & 0xff;
  const br = (b.color >> 16) & 0xff, bg = (b.color >> 8) & 0xff, bb = b.color & 0xff;
  const r = lerp(ar, br) / 255, g = lerp(ag, bg) / 255, bl = lerp(ab, bb) / 255;
  const glow = lerp(a.glow, b.glow);
  const spin = nowSec * 1.4;
  for (const mc of marketCoins) {
    if (mc.pivot) mc.pivot.rotation.y = spin;
    if (mc.mat) {
      mc.mat.color.setRGB(r, g, bl);
      mc.mat.emissive.setRGB(r, g, bl);
      mc.mat.emissiveIntensity = glow;
    }
    if (mc.light) { mc.light.color.setRGB(r, g, bl); mc.light.intensity = glow; }
  }
}

function openNpcDialog(npc) {
  if (document.pointerLockElement) document.exitPointerLock();
  worldNpcs.facePlayer(npc.id, player.pos.x, player.pos.z);
  questLog.onEvent('talk', npc.id);
  if (npc.role === 'priest' && (player.hp < player.maxHp || player.mana < player.maxMana)) {
    player.hp = player.maxHp;
    player.mana = player.maxMana;
    audio.sfx.levelUp();
    gameUI.toast('✨ ' + t('healed'), 'levelup');
    gameUI.setVitals(player.hp, player.maxHp, player.mana, player.maxMana, xpProgress(player.exp));
  }
  // Vendor NPCs open a buy/sell shop; quest/flavor NPCs open the dialog.
  if (npc.shop) { gameUI.openVendor(npc); return; }
  // The banker opens the city vault (the depot); the mayor offers residency.
  const npcCity = CITIES.find((c) => c.id === npc.city);
  if (npc.role === 'banker' && npcCity) { gameUI.openDepot(npcCity); return; }
  if (npc.role === 'mayor' && npcCity) { openResidency(npc, npcCity); return; }
  // The stable master sells the two starter mounts.
  if (npc.role === 'stable') { openMountVendor(npc); return; }
  gameUI.openNpc(npc, questLog, player.level, {
    questsForNpc: (id) => questsForNpc(id),
    accept: (qid) => { if (questLog.accept(qid)) { audio.sfx.click(); onQuestProgress(); maybeFirstQuestHint(); } },
    complete: (qid) => completeQuest(qid),
    // World gates for imaginative quests: night-only and "must hold this key/barter".
    questCtx: { isNight: daynight.isNight(), hasItems: (id, n) => inv.hasItems(id, n) },
  });
  onQuestProgress();
}

// Town Hall: let the player register this city as home, so they respawn here.
function openResidency(npc, city) {
  gameUI.openResidency(npc, city, homeCity.id === city.id, () => {
    homeCity = city;
    profile.homeCityId = city.id;
    saveProfile();
    audio.sfx.levelUp();
    gameUI.toast('🏛️ ' + t('residencyDone', city.name), 'levelup');
  });
}

// One-time hint the first time a quest is accepted, pointing to the quest box.
function maybeFirstQuestHint() {
  if (questLog.activeList().length === 1 && !firstQuestHintShown) {
    firstQuestHintShown = true;
    gameUI.toast('📜 ' + t('firstQuestHint'));
  }
}

function completeQuest(qid) {
  // Spend any `collect` items the quest asked the player to BRING (dusts, fangs,
  // etc.) — handing them over on turn-in, the imaginative "barter" step. The KEY
  // gate (requiresItems) is deliberately NOT consumed: you brandish it to pass,
  // and keep it. Read the quest before complete() clears it from the log.
  const qdef = getQuest(qid);
  if (qdef && questLog.readyToComplete().includes(qid)) {
    for (const o of (qdef.objectives || [])) {
      if (o.type === 'collect' && o.target) inv.removeById(o.target, o.count || 1);
    }
  }
  const res = questLog.complete(qid);
  if (!res) return;
  const r = res.rewards;
  if (r.gold) { inv.addGold(r.gold); player.gold = inv.gold; }
  if (r.exp) gainXp(r.exp);
  if (Array.isArray(r.items)) {
    for (const itemId of r.items) {
      const item = resolveItem(itemId, () => combat.rngFloat(), player.level);
      if (item) inv.addToBackpack(item, player.level);
    }
  }
  // Mount reward: either an explicit r.mount, or the quest→mount mapping.
  const mountId = r.mount || mountForQuest(qid);
  if (mountId) grantMount(mountId);
  audio.sfx.questComplete();
  gameUI.toast('🎉 ' + t('questDone'), 'levelup');
  // CHAIN ADVANCE: complete() auto-accepted the `next` quest. Tell the player
  // where to pick the trail back up ("Nueva misión: habla con X en Y") and flag
  // the tracker to highlight it.
  if (res.next) {
    const nq = getQuest(res.next);
    if (nq) {
      const info = questGiverInfo(nq, getLang());
      const title = (nq.title && (nq.title[getLang()] || nq.title.es)) || res.next;
      let where = '';
      if (info && info.npcName && info.cityName) where = ` — ${t('questTalkTo', info.npcName, info.cityName)}`;
      else if (info && info.cityName) where = ` — ${info.cityName}`;
      gameUI.toast('📜 ' + t('questNew', title) + where, 'levelup');
      if (questTracker.highlight) questTracker.highlight(res.next);
    }
  }
  onQuestProgress();
  recompute();
}

// Unlock a mount (quest reward or shop purchase). Toasts + persists.
function grantMount(mountId) {
  const def = getMount(mountId);
  if (!def) return false;
  if (!mounts.unlock(mountId)) return false;   // already owned
  audio.sfx.levelUp();
  gameUI.toast('🐎 ' + t('mountUnlocked', def.name[getLang()] || def.name.es), 'levelup');
  persistProgress();
  return true;
}

// Mount vendor (the stable master): sells the two `source:'shop'` mounts.
function openMountVendor(npc) {
  if (document.pointerLockElement) document.exitPointerLock();
  gameUI.openMountVendor(npc, shopMounts(), mounts, {
    buy: (mount) => buyMount(mount, npc),
  });
}

function buyMount(mount, npc) {
  if (!mount || mount.source !== 'shop') return;
  if (mounts.has(mount.id)) { gameUI.toast(t('alreadyOwned'), 'info'); return; }
  if (inv.gold < mount.cost) { gameUI.toast(t('notEnoughGold'), 'bad'); return; }
  inv.gold -= mount.cost;
  player.gold = inv.gold;
  grantMount(mount.id);
  recompute();
  openMountVendor(npc);   // refresh the dialog (now showing it as owned)
}

// The mounts panel: list every owned mount, pick the active one, mount/dismount.
function openMountsPanel() {
  if (document.pointerLockElement) document.exitPointerLock();
  gameUI.openMountsPanel(mounts, MOUNTS, {
    select: (id) => { mounts.select(id); openMountsPanel(); persistProgress(); },
    toggle: () => { toggleMount(); openMountsPanel(); },
  });
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
  // questTracker is constructed during init; every caller of onQuestProgress runs
  // after that (combat hooks, UI handlers, post-init setup), so it's always set.
  questTracker.refresh();
  refreshWaypoint();
  worldNpcs.refreshMarkers((npc) => {
    const qs = questsForNpc(npc.id);
    return qs.some((q) => questLog.canAccept(q.id, player.level) || (questLog.isActive(q.id) && questLog.readyToComplete().includes(q.id)));
  });
}

function checkDungeon() {
  // Cave creatures spawn on the surface within the wider outside radius, so e.g.
  // spiders roam outside the Spider Nest. Music/toast use the tighter mouth zone.
  const outside = dungeonOutsideAt(dungeonEntrances, player.pos.x, player.pos.z);
  const atMouth = dungeonEntranceAt(dungeonEntrances, player.pos.x, player.pos.z);
  combat.setDungeon(outside);
  // Open-air ruins: when not at a cave mouth, a ruin's families take over surface
  // spawning within its radius. (Caves/setDungeon take precedence when present.)
  const ruin = outside ? null : ruinAt(player.pos.x, player.pos.z);
  combat.setSurfaceSite(ruin);
  // Entering a ruin fires a 'reach' quest event (ruins are quest targets too) and
  // a one-time toast, tracked so it doesn't repeat every frame inside the ruin.
  const ruinId = ruin ? ruin.id : null;
  if (ruinId !== lastRuinId) {
    lastRuinId = ruinId;
    if (ruin) {
      gameUI.toast('🏚️ ' + (ruin.label ? (ruin.label[getLang()] || ruin.label.es) : ruin.id));
      if (questLog.onEvent('reach', ruin.id).length) onQuestProgress();
    }
  }

  const id = atMouth ? atMouth.id : null;
  if (id !== (currentDungeon ? currentDungeon.id : null)) {
    currentDungeon = atMouth;
    // Shift the score by danger: deeper dungeons get the ominous abyss theme,
    // shallower ones a darker dungeon theme, and the open world its bright one.
    if (!atMouth) audio.setMood('overworld');
    else if ((atMouth.minLevel || 1) >= 22) audio.setMood('abyss');
    else audio.setMood('dungeon');
    if (atMouth) {
      gameUI.toast('🕳️ ' + (atMouth.name ? (atMouth.name[getLang()] || atMouth.name.es) : atMouth.id));
      if (questLog.onEvent('reach', atMouth.id).length) onQuestProgress();
    }
  }
}

// --- Cave descend / ascend ------------------------------------------------

const fadeOverlay = document.getElementById('fade-overlay');
function screenFade(toBlack) {
  return new Promise((resolve) => {
    fadeOverlay.classList.toggle('active', toBlack);
    setTimeout(resolve, 370);
  });
}

// The active world provider for height/camera math (surface, cave or house).
function activeWorld() {
  if (place === 'cave') return activeCave;
  if (place === 'house') return activeHouse;
  return world;
}

// The minimap's underground context, or null on the surface. Carries the floor
// the player is on, the floor the map is currently SHOWING (caveViewFloor, which
// the player can page up/down), the stair markers for that shown floor, and the
// cave's name — so the minimap can render the floor schematic + stair pips and
// gate creature visibility to the player's own floor.
function caveMinimapContext() {
  if (place !== 'cave' || !activeCave) return null;
  const fi = activeCave.activeFloorIndex;
  const vf = Math.max(0, Math.min(activeCave.floorCount - 1, caveViewFloor));
  const dungeonId = currentDungeon ? currentDungeon.id : '?';
  // Marks placed on the floor being VIEWED (so they show on the right schematic).
  const marks = mapMarks.filter((m) => m.place === 'cave' && m.dungeonId === dungeonId && m.floor === vf);
  return {
    floorIndex: fi,
    floorCount: activeCave.floorCount,
    viewFloor: vf,
    stairs: activeCave.stairMarkersForFloor(vf),
    // The real cave shape for the VIEWED floor + the fog-of-war reveal mask, so
    // the minimap draws structure (rock vs floor) only where the player has been.
    structure: activeCave.floorStructure(vf),
    revealed: (x, z) => caveMap.isRevealed(dungeonId, vf, x, z),
    marks,
    label: currentDungeon && currentDungeon.name ? (currentDungeon.name[getLang()] || currentDungeon.name.es) : '',
  };
}

// Restore the saved cave-exploration map + named waypoints from a save/cloud row.
function loadMapMemory(src) {
  if (!src) return;
  if (src.caveMap) caveMap.load(src.caveMap);
  if (Array.isArray(src.mapMarks)) {
    mapMarks = src.mapMarks.filter((m) => m && typeof m.x === 'number' && typeof m.z === 'number');
    // Keep the id sequence ahead of anything loaded so new marks never collide.
    _markSeq = mapMarks.reduce((mx, m) => Math.max(mx, (m.id | 0) + 1), 1);
  }
  refreshSurfaceMarkPois();
}

// Drop a NAMED map mark at the player's current spot (Tibia-style "I was here").
// On the surface it's a world point; in a cave it's tied to the dungeon + floor
// so it only shows on that floor's schematic. Saves immediately.
function addMapMark(name) {
  const label = String(name || '').trim().slice(0, 40) || t('mapMarkDefault');
  const mark = { id: _markSeq++, name: label, place: place === 'cave' ? 'cave' : 'surface',
    x: Math.round(player.pos.x), z: Math.round(player.pos.z) };
  if (place === 'cave' && currentDungeon && activeCave) {
    mark.dungeonId = currentDungeon.id;
    mark.floor = activeCave.activeFloorIndex;
  }
  mapMarks.push(mark);
  refreshSurfaceMarkPois();
  saveLocal(); saveToAccount();
  gameUI.toast('📍 ' + t('mapMarkSaved', label), 'info');
  return mark;
}

// Remove a mark by id and re-sync the surface POI mirror.
function removeMapMark(id) {
  const i = mapMarks.findIndex((m) => m.id === id);
  if (i < 0) return;
  mapMarks.splice(i, 1);
  refreshSurfaceMarkPois();
  saveLocal(); saveToAccount();
}

// Mirror SURFACE marks onto the minimap's POI list as little flag icons, so they
// show on the overworld map the same way cities/dungeons do. (Cave marks are
// drawn inside _renderCave from the cave context, not via this list.)
let _markPois = [];
function refreshSurfaceMarkPois() {
  if (!minimap || !Array.isArray(minimap.pois)) return;
  for (const p of _markPois) { const i = minimap.pois.indexOf(p); if (i >= 0) minimap.pois.splice(i, 1); }
  _markPois = [];
  for (const m of mapMarks) {
    if (m.place !== 'surface') continue;
    const poi = { x: m.x, z: m.z, icon: '🚩', label: m.name };
    _markPois.push(poi); minimap.pois.push(poi);
  }
}

// Page the cave minimap up/down a floor (only underground). Bound to the floor
// range; resets to the player's floor whenever they actually change floors.
function pageCaveMap(dir) {
  if (place !== 'cave' || !activeCave) return;
  caveViewFloor = Math.max(0, Math.min(activeCave.floorCount - 1, caveViewFloor + dir));
}

// --- Houses: buy, enter, exit, decorate -----------------------------------

// Rebuild the surface exterior dressing: a FOR SALE sign over every unowned lot
// the local player could buy, and the owner's recolour skin over their own house.
// Cheap enough to rebuild whenever ownership or colours change.
function refreshHouseExteriors() {
  if (houseExteriorGroup) { scene.remove(houseExteriorGroup); houseExteriorGroup = null; }
  const g = new THREE.Group();
  for (const lot of houseLots) {
    if (houseStore.ownsLot(lot.id)) {
      g.add(buildExteriorSkin(lot, houseStore.colors));
      // The owner's facade: two shelves of three display items under the windows,
      // plus the optional name sign over the door.
      g.add(buildFacadeDisplay(lot, houseStore.facade));
      g.add(buildNameSign(lot, houseStore.name, houseStore.nameColor));
    } else if (visitedHouses.has(lot.id)) {
      // A neighbour's house we've seen over the network: show their facade items
      // so passers-by see the best pieces without entering. Display-only.
      const snap = visitedHouses.get(lot.id);
      if (snap && Array.isArray(snap.facade)) g.add(buildFacadeDisplay(lot, snap.facade));
      if (snap && snap.name) g.add(buildNameSign(lot, snap.name, snap.nameColor));
    } else if (!houseStore.ownsAny()) {
      // Only advertise FOR SALE while the player owns nothing (one house each).
      // The board just says "En venta"/"For sale"; the price + buy shows when you
      // walk to the door and press E (openHouseBuy).
      g.add(buildForSaleSign(lot, t('houseForSale')));
    }
  }
  houseExteriorGroup = g;
  scene.add(g);
  g.visible = place === 'surface';
  refreshHousePoi();
}

// Looking at a facade display item shows its name + stats (display-only: you can
// look but never take). Raycast from the crosshair against the exterior group and,
// if the hit mesh carries userData.facadeItem within reach, show the read-only
// tooltip. Cheap + throttled (every few frames) since it only matters on the
// surface near a house. Called from the tick loop.
const _facadeRay = new THREE.Raycaster();
const _facadeCenter = new THREE.Vector2(0, 0);
function updateFacadeHover() {
  if (state !== 'play' || place !== 'surface' || !houseExteriorGroup) { gameUI.showFacadeTooltip(null); return; }
  _facadeRay.setFromCamera(_facadeCenter, camera);
  const hits = _facadeRay.intersectObjects(houseExteriorGroup.children, true);
  let item = null;
  for (const h of hits) {
    if (h.distance > 8) break;                          // only when you're close
    let o = h.object;
    while (o && !item) { if (o.userData && o.userData.facadeItem) item = o.userData.facadeItem; o = o.parent; }
    if (item) break;
  }
  gameUI.showFacadeTooltip(item);
}

// Mirror the player's owned house onto the minimap as a single 🏠 marker, so it's
// easy to find your way home. Mirrors refreshWaypoint's quest-POI pattern: drop
// the old marker, add a fresh one at the owned lot. Called from
// refreshHouseExteriors so it stays in sync on buy / sell / load.
let _housePoi = null;
function refreshHousePoi() {
  if (typeof minimap === 'undefined' || !minimap || !Array.isArray(minimap.pois)) return;
  if (_housePoi) { const i = minimap.pois.indexOf(_housePoi); if (i >= 0) minimap.pois.splice(i, 1); }
  _housePoi = null;
  const lot = houseStore.owned ? houseLotById.get(houseStore.owned.lotId) : null;
  if (lot) {
    _housePoi = { x: lot.x, z: lot.z, icon: '🏠', label: t('houseYours') };
    minimap.pois.push(_housePoi);
  }
}

// The lot the player is standing at the doorstep of, or null.
function houseAtPlayer() {
  // 3.2m doorstep radius: the house's own solid (footprint circle) stops the
  // player ~0.3m short of a normal door and further for wide mansions, so the
  // detection radius has to be generous enough to fire while you're pressed up
  // against the front wall by the door. Houses are ring-spaced several metres
  // apart, so this never picks the wrong house.
  return houseLotAt(houseLots, player.pos.x, player.pos.z, 3.2);
}

// Buy the lot the player is at. One house per player; deduct gold by size.
function buyHouse(lot) {
  if (houseStore.ownsAny()) { gameUI.toast(t('houseAlreadyOwn'), 'bad'); return; }
  const price = housePrice(lot);
  if (inv.gold < price) { gameUI.toast(t('noGold'), 'bad'); return; }
  inv.spendGold(price);
  player.gold = inv.gold;
  houseStore.buy(lot);
  audio.sfx.levelUp();
  const cityName = (CITIES.find((c) => c.id === lot.city) || {}).name || '';
  gameUI.toast(t('houseBought', cityName), 'levelup');
  recompute();
  refreshHouseExteriors();
  persistProgress();
  broadcastHouse();
  gameUI.closeContext();
}

// Enter a house interior (your own, or a visit to someone else's snapshot).
async function enterHouse(lot, state, opts = {}) {
  if (houseTransitioning || place !== 'surface') return;
  houseTransitioning = true;
  await screenFade(true);
  // Spawn back just outside the door on exit. The house footprint is now FULLY
  // solid (buildHouse tiles the whole box with collision circles, reaching to
  // ~max(w,d)/2 + ~0.5 along the front axis), so spawning AT the doorstep
  // (lot.doorX/doorZ) drops the player against/inside that solid and they get
  // stuck. Push the return point OUT along the door's outward normal — the front
  // face direction (fx, fz), same axis buildHouse uses to place the door — far
  // enough to clear the footprint plus the player's body radius, and nudge it
  // further out if that landing spot still reports solid.
  {
    const rot = lot.rot || 0;
    const fx = Math.sin(rot), fz = Math.cos(rot);          // outward door normal
    const clear = Math.max(lot.w || 5, lot.d || 5) / 2 + 1.5; // footprint half + body
    let rx = lot.doorX + fx * clear;
    let rz = lot.doorZ + fz * clear;
    // If we'd still land in a solid (a neighbouring wall, a fence, a slope), keep
    // stepping outward along the normal until we find clear ground.
    for (let extra = 0; extra < 8 && world.solidAt(rx, rz, 0.4); extra++) {
      rx += fx * 0.6; rz += fz * 0.6;
    }
    houseReturn.set(rx, world.heightAt(rx, rz) + 0.2, rz);
  }
  combat.clear();
  mounts.dismount();

  if (activeHouse) activeHouse.dispose();
  activeHouse = new HouseInterior(scene, lot, state, { readOnly: !!opts.readOnly });
  activeHouseLot = lot;
  setSurfaceVisible(false);
  if (houseExteriorGroup) houseExteriorGroup.visible = false;
  activeHouse.setVisible(true);
  savedFog = scene.fog; savedBg = scene.background;
  scene.fog = null;
  scene.background = new THREE.Color(0x14110d);

  player.world = activeHouse;
  combat.world = activeHouse;
  // Normally you appear just inside the door; on a wake-from-sleep re-login you
  // appear in the MIDDLE of the room instead (Tibia-style).
  const entry = (opts.center && activeHouse.centerPoint) ? activeHouse.centerPoint() : activeHouse.entryPoint();
  player.spawnAt(entry.x, entry.z);
  player.yaw = entry.yaw;
  place = 'house';
  // The room is small; a third-person pull-back fights the walls and shows the
  // black void outside. Force FIRST person indoors so you always see the lit
  // room, and remember the outdoor camera mode to restore it on the way out.
  _camBeforeHouse = firstPerson;
  firstPerson = true; introCam = 0;
  audio.setMood('overworld');
  const title = opts.readOnly
    ? t('houseOwnerOf', state.owner || t('houseName'))
    : t('houseYours');
  gameUI.toast('🏠 ' + title);
  if (!opts.readOnly) broadcastHouseInside(lot.id, true);
  await screenFade(false);
  houseTransitioning = false;
}

// Walk-out check: at the interior door → leave; on the basement stair → swap floor.
async function maybeLeaveHouse() {
  if (houseTransitioning || place !== 'house' || !activeHouse) return;
  // Basement stair.
  const stair = activeHouse.stairTrigger();
  if (stair && activeHouse.activeFloor === 0
      && Math.hypot(player.pos.x - stair.x, player.pos.z - stair.z) < stair.r) {
    houseTransitioning = true;
    await screenFade(true);
    const land = activeHouse.enterBasement();
    player.spawnAt(land.x, land.z); player.yaw = land.yaw;
    await screenFade(false);
    houseTransitioning = false;
    return;
  }
  // From the basement, the same stair goes back up.
  if (stair && activeHouse.activeFloor === 1
      && Math.hypot(player.pos.x - stair.x, player.pos.z - stair.z) < stair.r) {
    houseTransitioning = true;
    await screenFade(true);
    const land = activeHouse.enterGround();
    player.spawnAt(land.x, land.z); player.yaw = land.yaw;
    await screenFade(false);
    houseTransitioning = false;
    return;
  }
  // BED (your own house, ground floor): step beside it → ask "sleep?". On Yes,
  // the hero lies down asleep and the character goes offline (sleeping).
  if (activeHouse.activeFloor === 0 && !activeHouse.readOnly && activeHouse.bedTrigger) {
    const bed = activeHouse.bedTrigger();
    const atBed = bed && Math.hypot(player.pos.x - bed.x, player.pos.z - bed.z) < bed.r;
    if (atBed && !_sleepPromptShown && !houseTransitioning && !player.sleeping) {
      _sleepPromptShown = true;
      gameUI.confirmPrompt('🛏️ ' + (t('houseSleepTitle') || 'Dormir'),
        t('houseSleepPrompt') || '¿Quieres dormir aquí? Tu personaje quedará durmiendo.',
        t('houseSleep') || 'Dormir',
        () => goToSleep());
    } else if (!atBed) {
      _sleepPromptShown = false;
    }
  }
  // Exit door (ground floor only). Instead of auto-firing when you brush the
  // doorway (which felt buggy and could re-trigger), ask "leave?" once while
  // you're at the door; on Yes, teleport OUTSIDE. The prompt is shown once per
  // approach (cleared when you step away) so it never spams.
  if (activeHouse.activeFloor !== 0) { _exitPromptShown = false; return; }
  const ex = activeHouse.exitTrigger();
  const atDoor = Math.hypot(player.pos.x - ex.x, player.pos.z - ex.z) < ex.r;
  if (atDoor && !_exitPromptShown && !houseTransitioning) {
    _exitPromptShown = true;
    gameUI.confirmPrompt('🚪 ' + (t('houseLeaveTitle') || 'Salir de la casa'),
      t('houseLeavePrompt') || '¿Quieres salir?',
      t('houseLeave') || 'Salir',
      async () => { if (houseTransitioning) return; houseTransitioning = true; await exitHouse(); houseTransitioning = false; });
  } else if (!atDoor) {
    _exitPromptShown = false;   // stepped away from the door: allow the prompt again next time
  }
}
let _exitPromptShown = false;
let _sleepPromptShown = false;

// Put the hero to sleep in their bed, Tibia-style: lay the model on the mattress,
// mark the character asleep + remember the house, SAVE, then log out to the
// character-select screen. A visitor can still walk in and see the sleeping body
// (presence carries sleeping:true). On the next login the character resumes asleep
// in the middle of the house (resumeSleepIfNeeded).
async function goToSleep() {
  if (!activeHouse || player.sleeping) return;
  const spot = activeHouse.bedSleepSpot && activeHouse.bedSleepSpot();
  if (!spot) return;
  player.sleeping = true;
  player.sleepHouse = activeHouseLot ? activeHouseLot.id : null;
  // Persist the sleep INSIDE houseStore so it rides the existing `house` cloud
  // column (no schema change) and survives a re-login on any device.
  houseStore.sleeping = true;
  if (player.char && player.char.setSleeping) player.char.setSleeping(true);
  // Lay the hero on the bed.
  player.spawnAt(spot.x, spot.z);
  player.pos.y = spot.y;
  player.yaw = spot.yaw || 0;
  // Tell the network/presence the player is asleep (visitors see a sleeping body),
  // then persist the sleeping flag + house so the next login resumes the sleep.
  try { if (net && net.setStatus) net.setStatus({ sleeping: true, house: player.sleepHouse }); } catch (_) {}
  saveLocal();
  saveToAccount();
  gameUI.toast(t('nowSleeping') || '😴 Durmiendo…', 'info');
  // Tibia-style: sleeping logs you out to character selection.
  await returnToCharacterSelect();
}

// Tear the running game down and return to the character-select screen WITHOUT
// signing out of the account (the session stays, so AuthUI.show() jumps straight
// to the character list). Used by sleep (logout-to-select). Disconnects realtime
// so peers see us leave, and hides the in-game HUD/panels.
async function returnToCharacterSelect() {
  state = 'create';                       // not 'play' — freezes the game loop's play branch
  controls.enabled = false;
  if (document.pointerLockElement) document.exitPointerLock();
  try { await net.disconnect(); } catch (_) {}
  // Drop the in-house instance + restore the surface so a later re-entry is clean.
  if (activeHouse) { try { activeHouse.dispose(); } catch (_) {} activeHouse = null; activeHouseLot = null; }
  // Hide the gameplay UI (mirror of what startGame() reveals).
  ui.hud.classList.add('hidden');
  ui.controlsUi.classList.add('hidden');
  panelRefs.sidePanel.classList.add('hidden');
  const leftPanel = document.getElementById('side-panel-left');
  if (leftPanel) leftPanel.classList.add('hidden');
  const mmBox = document.getElementById('minimap-box'); if (mmBox) mmBox.classList.add('hidden');
  const chat = document.getElementById('chat'); if (chat) chat.classList.add('hidden');
  gameUI.showFacadeTooltip(null);
  // Back to the account's character list.
  authUI.show();
}

function wakeUp() {
  if (!player.sleeping) return;
  player.sleeping = false;
  player.sleepHouse = null;
  houseStore.sleeping = false;   // clear the persisted sleep flag too
  if (player.char && player.char.setSleeping) player.char.setSleeping(false);
  player.pos.y = activeHouse ? activeHouse.floorY() : player.pos.y;
  try { if (net && net.setStatus) net.setStatus({ sleeping: false }); } catch (_) {}
  _sleepPromptShown = false;
  // On waking, report who visited the house while you slept (Phase 5c).
  reportVisitors();
}

// On login, if the character logged off ASLEEP, enter their owned house and WAKE
// UP standing in the middle of the room (Tibia-style: you reappear inside your
// own home). We deliberately do NOT resume the lying-down pose: in a small room
// the only sensible camera is first-person, but a body lying flat on the floor
// puts the first-person eye at ground level staring into a wall (you'd see the
// "place item on this wall" slot prompt and the edge of your own model), which
// is the login-glitch this replaces. Standing + awake is unambiguous and safe.
async function resumeSleepIfNeeded() {
  // The cloud-backed truth lives in houseStore.sleeping (rides the `house` column).
  if (!houseStore.sleeping) return;
  // The player owns exactly one house, so the owned lot IS the bed they slept in.
  const lot = houseLots.find((l) => houseStore.ownsLot(l.id));
  if (!lot) { houseStore.sleeping = false; player.sleeping = false; player.sleepHouse = null; return; }   // house gone → wake
  player.sleeping = true;
  player.sleepHouse = lot.id;
  // enterHouse needs to start from the surface; it teleports us inside, centred.
  await enterHouse(lot, houseStore, { readOnly: false, center: true });
  // Wake immediately: clears the persisted sleep flag, drops the lie-down pose,
  // restores a normal upright camera, broadcasts awake, and reports who visited
  // while we slept. enterHouse already spawned us standing in the centre.
  wakeUp();
}

async function exitHouse() {
  await screenFade(true);
  const wasOwn = activeHouseLot && houseStore.ownsLot(activeHouseLot.id);
  const leftId = activeHouseLot ? activeHouseLot.id : null;
  if (activeHouse) { activeHouse.dispose(); activeHouse = null; }
  setSurfaceVisible(true);
  if (houseExteriorGroup) houseExteriorGroup.visible = true;
  if (savedFog !== null) scene.fog = savedFog;
  if (savedBg) scene.background = savedBg;
  player.world = world;
  combat.world = world;
  place = 'surface';
  firstPerson = _camBeforeHouse; introCam = 0;   // restore the outdoor camera mode
  player.spawnAt(houseReturn.x, houseReturn.z);
  player.yaw = 0;
  world.update(player.pos.x, player.pos.z, true);
  audio.setMood('overworld');
  activeHouseLot = null;
  if (wasOwn && leftId) broadcastHouseInside(leftId, false);
  await screenFade(false);
}

// Re-hang / repaint the live interior after the owner changes colours, light or
// items, so edits show immediately without leaving the house.
function refreshActiveHouse() {
  if (place === 'house' && activeHouse && !activeHouse.readOnly) {
    activeHouse.state = houseStore;
    activeHouse.rebuild();
  }
}

// Toggle visibility of every surface root so only the cave renders underground.
function setSurfaceVisible(v) {
  world.setVisible(v);
  weather.setActive(v);          // pause rain/snow/fog underground & indoors
  if (dungeonBuild.group) dungeonBuild.group.visible = v;
  if (ruinsBuild.group) ruinsBuild.group.visible = v;
  citiesGroup.visible = v;
  marketDisplay.setVisible(v);   // the 3D goods on the stall counters
  worldNpcs.setVisible?.(v);
  seaFauna.setVisible?.(v);
  bots.setVisible?.(v);
  daynight.sun.visible = v;
  daynight.hemi.visible = v;
  if (daynight.moonMesh) daynight.moonMesh.visible = v;
  if (daynight.sunMesh) daynight.sunMesh.visible = v;
  if (daynight.stars) daynight.stars.visible = v;
  daynight.setSkyDressingVisible?.(v);   // clouds + birds: surface only
}

let savedFog = null, savedBg = null;

async function maybeDescend() {
  if (caveTransitioning) return;
  const d = dungeonDescendAt(dungeonEntrances, player.pos.x, player.pos.z);
  if (!d) return;
  caveTransitioning = true;
  await descendInto(d);
  caveTransitioning = false;
}

async function descendInto(dungeon) {
  await screenFade(true);
  // Where to spit the player out on the way back up: a fixed point ~9m IN FRONT
  // of (south of) the cave mouth — past the steps and the descend trigger (which
  // sits at z+4, radius 2.4) and clear of the solid mound, so ascending never
  // drops you back onto the trigger and re-descends you. Derived from the
  // dungeon's own anchor, NOT the player's descend position.
  surfaceReturn.set(dungeon.x, world.heightAt(dungeon.x, dungeon.z + 9) + 0.2, dungeon.z + 9);
  combat.clear();
  mounts.dismount();   // mounts stay topside — caves are too cramped to ride

  activeCave = getCaveFloor(scene, dungeon);   // a CaveSystem, reset to top floor
  setSurfaceVisible(false);
  activeCave.setVisible(true);
  savedFog = scene.fog; savedBg = scene.background;
  scene.fog = activeCave.fog; scene.background = activeCave.background;

  player.world = activeCave;
  combat.world = activeCave;
  player.spawnAt(activeCave.upStairs.x, activeCave.upStairs.z - 5);
  player.yaw = Math.PI; // face into the room, away from the exit wall
  combat.setDungeon(dungeon, 0);               // depth 0 = top floor
  if ((dungeon.minLevel || 1) >= 22) audio.setMood('abyss'); else audio.setMood('dungeon');
  place = 'cave';
  caveViewFloor = 0;                           // map shows the floor you're on
  currentDungeon = dungeon;
  const fl = activeCave.floorCount > 1 ? `  (${t('floor') || 'Floor'} 1/${activeCave.floorCount})` : '';
  gameUI.toast('🕳️ ' + (dungeon.name ? (dungeon.name[getLang()] || dungeon.name.es) : dungeon.id) + fl);
  await screenFade(false);
}

// In a cave: check whether the player is standing on an UP or DOWN internal
// stair and move them between floors, or exit to the surface from the top floor.
async function maybeAscend() {
  if (caveTransitioning || !activeCave) return;
  // Down-stair first (going deeper).
  const down = activeCave.downStairAt(player.pos.x, player.pos.z);
  if (down) { caveTransitioning = true; await changeFloor(down, +1); caveTransitioning = false; return; }
  const up = activeCave.upStairAt(player.pos.x, player.pos.z);
  if (!up) return;
  caveTransitioning = true;
  if (up.surface) await ascendToSurface();
  else await changeFloor(up, -1);
  caveTransitioning = false;
}

// Move between two floors of the active cave. `arrive` carries the landing point
// the CaveSystem already switched the active floor to; `dir` is +1 deeper, -1 up.
async function changeFloor(arrive, dir) {
  await screenFade(true);
  combat.clear();
  // The CaveSystem already flipped which floor is visible inside downStairAt /
  // upStairAt; just reposition the player and rescale spawn difficulty.
  player.spawnAt(arrive.x, arrive.z);
  player.yaw = dir > 0 ? 0 : Math.PI;   // face into the room away from the stair
  combat.setDungeon(currentDungeon, activeCave.activeFloorIndex);
  caveViewFloor = activeCave.activeFloorIndex;   // snap the map back to your floor
  const n = activeCave.activeFloorIndex + 1;
  gameUI.toast((dir > 0 ? '⬇️ ' : '⬆️ ') + `${t('floor') || 'Floor'} ${n}/${activeCave.floorCount}`);
  if (n >= Math.ceil(activeCave.floorCount * 0.7)) audio.setMood('abyss');
  await screenFade(false);
}

async function ascendToSurface() {
  await screenFade(true);
  combat.clear();
  activeCave.setVisible(false);
  setSurfaceVisible(true);
  if (savedFog) scene.fog = savedFog;
  if (savedBg) scene.background = savedBg;

  player.world = world;
  combat.world = world;
  place = 'surface';
  player.spawnAt(surfaceReturn.x, surfaceReturn.z);
  player.yaw = 0;   // face south, AWAY from the entrance, so you walk off it
  world.update(player.pos.x, player.pos.z, true);
  combat.setDungeon(null);
  currentDungeon = null;
  audio.setMood('overworld');
  activeCave = null;
  await screenFade(false);
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
    // Indoors the room is small, so a full third-person pull-back would shove the
    // camera through a wall (or out the door gap) and show the black void. Start
    // closer inside a house so it stays in the room.
    let d = (place === 'house') ? 2.4 : 4.4;
    const cp = Math.cos(player.pitch), sp = Math.sin(player.pitch);
    // introCam swings the camera from in front of the hero (welcome view, you
    // see your face) to behind as you start moving.
    const side = 1 - 2 * introCam; // +1 behind, -1 front
    // Camera-wall collision: march from the hero out to the desired camera spot
    // and pull the camera IN if a wall/building solid blocks the line, so backing
    // into a wall and turning the mouse can't push the camera through it (which
    // let you see the void/sky beyond). March in small steps; stop just short of
    // the first solid, keeping a small skin so the near plane never pokes through.
    const dirX = Math.sin(player.yaw) * cp * side;
    const dirZ = Math.cos(player.yaw) * cp * side;
    const w = activeWorld();
    if (w && w.solidAt) {
      // March the camera ray against world solids only every 2nd frame and reuse
      // the cached pull-in distance in between — the camera eases smoothly so one
      // frame of lag on the wall pull-in is imperceptible, and this halves the
      // per-frame raycast cost. Recompute immediately if we have no cached value.
      if (_frame % 2 === 0 || _camHitDist === Infinity) {
        const SKIN = 0.45;          // keep the camera this far in front of a wall
        const step = 0.3;
        let hit = d;
        for (let dist = step; dist <= d; dist += step) {
          const sx = player.pos.x + dirX * dist;
          const sz = player.pos.z + dirZ * dist;
          if (w.solidAt(sx, sz, 0.2)) { hit = Math.max(0.6, dist - SKIN); break; }
        }
        _camHitDist = hit;
      }
      d = Math.min(d, _camHitDist);
    }
    let cx = player.pos.x + dirX * d;
    let cz = player.pos.z + dirZ * d;
    // Inside a house, keep the camera INSIDE the room box (the wall-march can slip
    // out through the door gap, and looking up/down can push it through the
    // ceiling/floor — which is what "broke" the view while walking). Clamp X/Z
    // here and Y below (after cy is computed).
    let houseBounds = null;
    if (place === 'house' && activeHouse && activeHouse.cameraBounds) {
      houseBounds = activeHouse.cameraBounds();
      cx = Math.min(Math.max(cx, houseBounds.minX), houseBounds.maxX);
      cz = Math.min(Math.max(cz, houseBounds.minZ), houseBounds.maxZ);
    }
    // Minecraft-style: raise the camera and aim past the hero's shoulder so the
    // body sits low in frame and the crosshair points at clear ground ahead,
    // not at the character's head.
    let cy = eyeY - sp * d + 0.9 + introCam * 0.4;
    // Floor the camera just above the ground so it never dips below the terrain.
    // ROOT CAUSE of the "third-person house is all black" bug: the old code also
    // floored cy at WATER_LEVEL + 0.25 (WATER_LEVEL = 0) to keep the camera above
    // the ocean — but a house interior lives at y = -400, so that surface-only
    // floor yanked the indoor camera up to y ~= 0.25, roughly 400 m ABOVE the
    // room, pointing at empty void → black screen. The waterline floor only makes
    // sense on the surface, so apply it only there.
    cy = Math.max(cy, activeWorld().heightAt(cx, cz) + 0.35);
    if (place === 'surface') cy = Math.max(cy, WATER_LEVEL + 0.25);
    // Keep the indoor camera between the floor and ceiling so it never pokes out
    // the top/bottom of the room while you walk and look around.
    if (houseBounds) cy = Math.min(Math.max(cy, houseBounds.minY), houseBounds.maxY);
    camera.position.set(cx, cy, cz);
    const fwd = introCam > 0.5 ? 0 : 2.2; // look ahead once we're behind the hero
    const lookX = player.pos.x - Math.sin(player.yaw) * fwd;
    const lookZ = player.pos.z - Math.cos(player.yaw) * fwd;
    // Aim well above the hero's head so the body sits LOW in frame and the
    // crosshair points at clear space ahead, not at the character's face. The
    // welcome (intro) view still frames the face, so ease this lift in only as
    // the camera settles behind the hero.
    const headClear = 0.8 * (1 - introCam);
    camera.lookAt(lookX, eyeY + player.pitch * 2 - 0.2 + headClear, lookZ);
  }
  if (shakeAmount > 0.001) {
    camera.position.x += (combat.rngFloat() - 0.5) * shakeAmount;
    camera.position.y += (combat.rngFloat() - 0.5) * shakeAmount;
    shakeAmount *= 0.82;
  }
  player.char.group.visible = !firstPerson;
  player.shadow.visible = !firstPerson;
  viewModel.visible = firstPerson && player.alive;
  // The off-hand shield only shows itself when one is actually equipped (a held
  // shield mesh exists); otherwise it stays hidden even in first person.
  viewShield.visible = firstPerson && player.alive && !!viewShieldMesh;
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
  player.char.animate(0, 0, true, dt);
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
  _frame++;

  // Underground, the surface day/night must not run (it would overwrite the
  // cave fog, background and lights every frame) and surface chunks needn't stream.
  if (place === 'surface') {
    daynight.update(player.pos, dt);
    weather.update(player.pos, dt, daynight);   // rain/storm/snow/fog, after day-night
    world.update(player.pos.x, player.pos.z);
  } else if (place === 'house' && activeHouse) {
    activeHouse.update();
  } else if (activeCave) {
    activeCave.update(player.pos.x, player.pos.z);
    // Reveal the cave map around the player as they explore (fog of war). The
    // periodic autosave (every 15s) + beforeunload persist the revealed cells.
    if (currentDungeon) {
      caveMap.reveal(currentDungeon.id, activeCave.activeFloorIndex, player.pos.x, player.pos.z, CAVE_SIGHT);
    }
  }

  if (state === 'play') {
    const look = controls.consumeLook();
    player.applyLook(look.x, look.y);
    controls.updateMove();

    // SLEEPING: the hero lies still in bed. Any movement input wakes them; until
    // then we skip the normal update so they don't slide off the mattress.
    if (player.sleeping) {
      const m = controls.move || { x: 0, z: 0 };
      const moved = Math.abs(m.x) > 0.01 || Math.abs(m.z) > 0.01 || controls.consumeJump();
      if (moved) wakeUp();
      else { player.char.animate(0, 0, true, dt); }
    }
    if (player.alive && !player.sleeping) {
      const wasGrounded = player.grounded;
      applyFollow(controls);                 // auto-walk after a followed peer
      player.update(dt, controls);
      mounts.update(dt);   // place + animate the ridden beast under the player
      if (wasGrounded && !player.grounded && player.vel.y > 1) audio.sfx.jump();

      // The welcome front-view holds, then swings behind only once you actually
      // walk (looking around with the mouse does not cancel it).
      if (introCam > 0) {
        introHold = Math.max(0, introHold - dt);
        const moving = Math.hypot(player.vel.x, player.vel.z) > 0.5;
        if (introHold <= 0 || moving) introCam = Math.max(0, introCam - dt * 1.6);
      }

      // Left click (and the touch attack button) attacks in both camera modes.
      // The right button is consumed but reserved for a future action. The torch
      // is lit by double-clicking it in the fire equip slot; F stays as a quick
      // keyboard shortcut for the same toggle.
      controls.consumeRightClick();
      if (controls.consumeLeftClick() || controls.consumeAttack()) {
        // Left-click on another PLAYER opens their info panel (add friend / trade)
        // instead of attacking. Cast from the crosshair (screen centre, since the
        // game is pointer-locked) and only catch peers within a short reach.
        if (!tryClickPeer()) doAttack();
      }
      if (controls.consumeToggleLight()) toggleTorch();

      const isNight = daynight.isNight();
      // Event multipliers (×2 EXP days etc.) change at most once per day, so don't
      // allocate a Date + multiplier objects every frame — refresh on a timer.
      _evClock -= dt;
      if (_evClock <= 0 || !_evCached) { _evCached = eventMultipliers(new Date()); _evClock = 30; }
      const ev = _evCached;
      // camera.position is the eye for nameplate line-of-sight (last frame's, which
      // is fine — one frame of lag is imperceptible). Works in 1st and 3rd person.
      combat.update(dt, player, isNight, ev, camera.position);

      // Lock onto and red-highlight whoever the crosshair is aiming at, so the
      // player can see their next hit/shot's victim (even up a slope or in a pit).
      // When a target is locked the CROSSHAIR itself goes red — that's the player's
      // promise that the next attack will connect (see _resolveHit's locked path).
      camera.getWorldDirection(camDir);
      const aimed = combat.acquireTarget(player, camDir, camera.position);
      if (_crosshairEl) _crosshairEl.classList.toggle('on-target', !!aimed);

      // Only grab a drop the backpack can actually take; otherwise it stays put
      // on the ground (don't re-spawn it underfoot) and we warn at most once a
      // few seconds so standing on a too-heavy item doesn't spam the toast.
      const got = combat.tryPickup(player, (item) => inv.wouldAccept(item, player.level));
      if (got && got.item) {
        // tryPickup only lifts the item off the ground — actually PUT it in the
        // bag here (this add was missing, so loot vanished on pickup). wouldAccept
        // already cleared it, so a full/heavy result should be rare; if it does
        // happen, drop it back so the loot is never lost.
        const r = inv.addToBackpack(got.item, player.level);
        if (r !== 'ok') {
          combat.spawnDrop(player.pos, got.item, { pickupDelay: 1.2 });
          if (nowSec - lastFullWarn > 3) { lastFullWarn = nowSec; gameUI.toast(t(r === 'heavy' ? 'tooHeavy' : 'full'), 'bad'); }
        } else {
          audio.sfx.pickup();
          gameUI.toast(t('looted', got.item.name), 'loot');
          if (questLog.onEvent('collect', got.item.baseId).length) onQuestProgress();
          recompute();
        }
      } else if (got && nowSec - lastFullWarn > 3) {
        lastFullWarn = nowSec;
        gameUI.toast(t(got.reason === 'heavy' ? 'tooHeavy' : 'full'), 'bad');
      }

      if (place === 'surface') { checkDungeon(); maybeDescend(); }
      else if (place === 'house') maybeLeaveHouse();
      else maybeAscend();
      regenVitals(dt);
      // Burn/poison drain + ice slow. The slow factor feeds player movement.
      playerStatus.tick(dt);
      player.slowFactor = playerStatus.speedMultiplier();
    }

    peers.tick(dt);
    worldNpcs.tick(dt, player.pos);
    if (place === 'surface') {
      bots.tick(dt, { playerPos: player.pos, creatures: combat.creatures, place, addChat: addChatLine, lang: getLang() });
    }
    updateDungeons(dt, dungeonChests);
    floatText.update(dt);
    if (place === 'surface') seaFauna.tick(dt, player);
    updateWandBolt(dt);
    updateArrows(dt);
    updatePlayerLight(dt);
    updateRangeRing(dt);
    updateViewModel(dt);
    nowSec += dt;
    updateBuffs(dt);
    skillSystem.update(dt);
    hotbar.update();
    sendNetState();

    updateCamera();
    updateInteractHint();
    if (_frame % 3 === 0) updateFacadeHover();   // hover a house's display item → its info
    updateQuestArrow();
    updateMarketProximity();
    updateTempleAuras();
    updateMarketCoins();
    updateStatueGlows();
    // The minimap needn't redraw at 60Hz — ~20Hz looks just as live and saves a
    // full canvas repaint (plus the blip-list allocation) on the other frames.
    if (_frame % 3 === 0) {
      const mapBlips = place === 'surface' ? { ...peers.list(), ...bots.list() } : peers.list();
      minimap.draw(player, mapBlips, combat.creatures, caveMinimapContext());
    }
    gameUI.setVitals(player.hp, player.maxHp, player.mana, player.maxMana, xpProgress(player.exp));

    const danger = player.alive && player.hp / player.maxHp < 0.3;
    if (danger !== lowHpActive) {
      lowHpActive = danger;
      lowHpVignette.classList.toggle('active', danger);
    }
  } else if (state === 'create') {
    updateCreationCamera(dt);
  }
  // state === 'banned' just keeps rendering the frozen scene under the overlay.

  renderer.render(scene, camera);
  _perfHud.sample(dt);
}
tick();

let lastNoManaToast = 0;
// Mana a wand bolt costs: scales with the wand's tier (via its levelReq) so a
// stronger wand drains more — but stronger wands need a higher level where you
// have a big mana pool. A level-4 starter wand costs ~2; a level-50 wand ~12.
function wandManaCost(weapon) {
  if (!weapon || weapon.type !== 'wand') return 0;
  const req = weapon.levelReq || 1;
  return Math.max(2, Math.round(2 + req * 0.2));
}
// Display names for use-skill level-up toasts ("You advanced to ...").
const SKILL_LABEL = {
  sword: { es: 'Espada', en: 'Sword' }, axe: { es: 'Hacha', en: 'Axe' },
  club: { es: 'Maza', en: 'Club' }, distance: { es: 'Distancia', en: 'Distance' },
  shielding: { es: 'Escudo', en: 'Shielding' }, magic: { es: 'Magia', en: 'Magic Level' },
  fist: { es: 'Puños', en: 'Fist' },
};
// When trainSkill reports levels gained, toast it (Tibia "advanced" feel) and
// recompute combat stats so the new skill feeds damage immediately.
function maybeAdvanceSkill(gained, skillName) {
  if (!gained) return;
  const lang = (getLang && getLang()) || 'es';
  const label = (SKILL_LABEL[skillName] && SKILL_LABEL[skillName][lang]) || skillName;
  const lvl = charStats.useSkill(skillName);
  gameUI.toast(`⬆ ${label} ${lvl}`, 'good');
  recomputeCombatStats();
}

function doAttack() {
  if (!player.weapon) return;
  // Attack-speed gate: clicks during the cooldown are ignored (Minecraft/Tibia
  // style — mashing the mouse does NOT attack faster). The cooldown length is
  // player.attackSpeed, set by weapon + DEX + passive skills. Bail before any
  // animation/sound so a too-early click is fully inert.
  if (nowSec < nextBasicAttackAt) return;

  const type = player.weapon.type;
  const isWand = type === 'wand';
  const isBow = type === 'bow';
  const wandCost = wandManaCost(player.weapon);
  // Wands cost mana (scaled by tier); melee/bow are free. No mana → no shot (and
  // no cooldown spent), with a throttled hint.
  if (isWand && (player.mana || 0) < wandCost) {
    const now = performance.now();
    if (now - lastNoManaToast > 1200) { gameUI.toast('💧 ' + t('noMana'), 'bad'); lastNoManaToast = now; }
    return;
  }
  // The attack is going through: start the cooldown for the next one.
  nextBasicAttackAt = nowSec + (player.attackSpeed || 0.6);
  equipVisuals.triggerSwing();
  // Match the viewmodel motion length to the weapon (the bow draws longer).
  viewSwingDur = isBow ? 0.42 : isWand ? 0.3 : 0.3;
  viewSwingT = viewSwingDur;
  bowLoosed = false; // fresh draw: a new arrow is nocked
  // Melee/wand swoosh on the swing; the bow gets its twang on release (fireArrow).
  if (!isBow) audio.sfx.attack();
  flashRangeRing(); // show the reach briefly on every swing
  // Raycast from the crosshair (camera center) so you hit exactly what you aim at.
  camera.getWorldDirection(camDir);
  const result = combat.attack(player, camDir, camera.position);
  // Send the druid's loyal pets to pile onto whatever the druid just attacked
  // ("si el druida ataca a una criatura, su criatura va enseguida a atacarla").
  if (result && result.creature) combat.focusPetsOn(result.creature);
  // Train the weapon's Tibia use-skill on a connecting (non-miss) hit. Wands
  // train Magic Level via mana spent instead (below).
  if (result && result.creature && !result.miss && !isWand && charStats) {
    const skillName = weaponTypeToSkill(type);
    maybeAdvanceSkill(charStats.trainSkill(skillName, 1), skillName);
  }
  // Exact aim point under the crosshair: the hit creature's torso, else a point
  // far down the camera ray. Projectiles fly from the hand TOWARD this point so
  // they land precisely where you're aiming, not parallel-but-offset.
  const tgt = result && result.creature;
  aimPointFor(tgt);
  if (isWand) {
    player.mana = Math.max(0, (player.mana || 0) - wandCost);
    if (charStats) maybeAdvanceSkill(charStats.trainMagic(wandCost), 'magic');
    castWandBolt(aimPoint, tgt);
  } else if (isBow) {
    // Loose the arrow on the release beat (when the string snaps forward), not
    // the instant of the click, so the draw animation reads before it flies.
    setTimeout(() => fireArrow(aimPoint, tgt), 230);
  }
}

// Resolves the world point the crosshair is aiming at into `aimPoint`. With a
// locked target it's the torso; otherwise it's a point far along the camera ray
// (clamped to terrain) so the shot tracks the crosshair exactly.
const aimPoint = new THREE.Vector3();
function aimPointFor(target) {
  if (target && !target.dead && !target.dying) {
    // Aim at the EXACT spot on the target's body the crosshair is on (head,
    // torso or feet) — the point on its feet→head capsule closest to the camera
    // ray — so the shot lands precisely where you aim, even up a slope or
    // overhead, instead of always at a fixed torso height.
    const s = target.def.variantScale || 1;
    const y0 = target.pos.y + 0.15 * s, y1 = target.pos.y + 1.45 * s;
    const ox = camera.position.x, oy = camera.position.y, oz = camera.position.z;
    const dl = Math.hypot(camDir.x, camDir.y, camDir.z) || 1;
    const dx = camDir.x / dl, dy = camDir.y / dl, dz = camDir.z / dl;
    // Closest height on the vertical body segment to the ray (10 samples).
    let bestD2 = Infinity, bestY = (y0 + y1) / 2;
    for (let i = 0; i <= 10; i++) {
      const sy = y0 + (y1 - y0) * (i / 10);
      let t = (target.pos.x - ox) * dx + (sy - oy) * dy + (target.pos.z - oz) * dz;
      if (t < 0) t = 0;
      const gx = ox + dx * t - target.pos.x, gy = oy + dy * t - sy, gz = oz + dz * t - target.pos.z;
      const d2 = gx * gx + gy * gy + gz * gz;
      if (d2 < bestD2) { bestD2 = d2; bestY = sy; }
    }
    aimPoint.set(target.pos.x, bestY, target.pos.z);
    return;
  }
  // March down the ray; stop at terrain so a downward shot hits the ground where
  // the crosshair points instead of sailing through it.
  const reach = (player.attackRange || 14) + 6;
  aimPoint.copy(camera.position).addScaledVector(camDir, reach);
  const groundY = activeWorld().heightAt(aimPoint.x, aimPoint.z);
  if (aimPoint.y < groundY && Math.abs(camDir.y) > 1e-4) {
    // Find where the ray crosses the ground between the camera and `reach`.
    const tGround = (groundY - camera.position.y) / camDir.y;
    if (tGround > 0) aimPoint.copy(camera.position).addScaledVector(camDir, tGround);
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

// Briefly show the range ring on a swing — but ONLY when the player has the
// range view turned on. With it off, attacking shows nothing.
function flashRangeRing() { if (rangeRingPinned) rangeRingFlash = 0.6; }
function toggleRangeRing() {
  rangeRingPinned = !rangeRingPinned;
  audio.sfx.click();
}

// Mount / dismount the active mount (G key, and the mounts panel button). You
// can't mount underground (caves are too cramped) or while in water.
function toggleMount() {
  if (state !== 'play' || !player.alive) return;
  if (!mounts.activeId || !mounts.ownedList().length) {
    gameUI.toast('🐴 ' + t('noMounts'), 'info');
    return;
  }
  if (mounts.isMounted()) {
    mounts.dismount();
    audio.sfx.click();
    gameUI.toast('🐾 ' + t('dismounted'), 'info');
    return;
  }
  if (place !== 'surface') { gameUI.toast('🚫 ' + t('cantMountHere'), 'bad'); return; }
  if (player.inWater) { gameUI.toast('🚫 ' + t('cantMountHere'), 'bad'); return; }
  mounts.mount();
  audio.sfx.levelUp();
  const def = getMount(mounts.activeId);
  gameUI.toast('🐎 ' + t('mountedOn', def ? (def.name[getLang()] || def.name.es) : ''), 'levelup');
}

function updateRangeRing(dt) {
  if (rangeRingFlash > 0) rangeRingFlash = Math.max(0, rangeRingFlash - dt);
  const showing = rangeRingPinned || rangeRingFlash > 0;
  rangeRing.visible = showing && state === 'play';
  if (!rangeRing.visible) return;

  const range = player.attackRange || 3;
  rangeRing.scale.set(range, range, range);
  rangeRing.position.set(player.pos.x, activeWorld().heightAt(player.pos.x, player.pos.z) + 0.06, player.pos.z);

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

// Fire the bolt from the right hand straight toward `aimAt` — the exact point
// under the crosshair (or the locked target's torso, which it then homes onto).
function castWandBolt(aimAt, target) {
  const color = player.spellColor || player.weapon.color || 0xb89bff;
  wandBolt.mesh.material.color.setHex(color);
  wandBolt.light.color.setHex(color);

  // Origin: the actual right-hand position, falling back to chest height.
  const hand = player.char.parts.armR.hand;
  if (hand) hand.getWorldPosition(wandBolt._hand);
  else wandBolt._hand.set(player.pos.x, player.pos.y + 1.3, player.pos.z);
  wandBolt.pos.copy(wandBolt._hand);

  // Aim from the hand to the exact crosshair point so it tracks where you aim.
  wandBolt.vel.set(aimAt.x - wandBolt.pos.x, aimAt.y - wandBolt.pos.y, aimAt.z - wandBolt.pos.z);
  if (wandBolt.vel.lengthSq() < 1e-4) camera.getWorldDirection(wandBolt.vel);
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
    // Home toward the target's true body centre (scaled to its size), so the
    // homing stays accurate for tall and short creatures alike.
    const cy = tgt.pos.y + 0.8 * (tgt.def.variantScale || 1);
    const want = wandBolt._hand.set(tgt.pos.x - wandBolt.pos.x, cy - wandBolt.pos.y, tgt.pos.z - wandBolt.pos.z);
    if (want.lengthSq() > 1e-4) {
      want.normalize().multiplyScalar(BOLT_SPEED);
      wandBolt.vel.lerp(want, Math.min(1, dt * 8));
    }
    if (wandBolt.pos.distanceTo(tgt.pos) < 0.8) {
      // Reached the target: pop with a flash + sparks so even the basic wand
      // shot reads as an impact, not a ball blinking out.
      skillSystem.impactBurst(wandBolt.pos, wandBolt.mesh.material.color.getHex());
      wandBolt.active = false; wandBolt.mesh.visible = false; return;
    }
  }

  wandBolt.pos.addScaledVector(wandBolt.vel, dt);
  wandBolt.mesh.position.copy(wandBolt.pos);
  wandBolt.mesh.material.opacity = Math.min(1, wandBolt.t / 0.35);
}

// --- Flying arrows --------------------------------------------------------
// A small pool of arrow meshes so the archer can loose several in quick
// succession. Each flies in a straight line with a touch of gravity, orients
// itself along its velocity, and fades out on impact or after a short life.
const ARROW_SPEED = 42;
const ARROW_UP = new THREE.Vector3(0, 1, 0);
const arrowPool = [];
function getArrow() {
  for (const a of arrowPool) if (!a.active) return a;
  const mesh = buildArrowMesh(0.62);
  mesh.visible = false;
  scene.add(mesh);
  const a = { mesh, active: false, t: 0, target: null, pos: new THREE.Vector3(), vel: new THREE.Vector3(), _q: new THREE.Quaternion(), _d: new THREE.Vector3() };
  arrowPool.push(a);
  return a;
}

// Loose an arrow from the bow hand straight toward `aimAt` — the exact world
// point under the crosshair (or the locked target's torso). The arrow is purely
// cosmetic; it just needs to fly to where the shot landed, so it goes dead
// straight (no gravity) to line up with the crosshair.
function fireArrow(aimAt, target) {
  const a = getArrow();
  // The nocked arrow is now gone — it has become this flying one. Hide the bow's
  // loaded arrow so the player never sees two arrows at once.
  bowLoosed = true;
  if (viewModelBow && viewModelBow.userData.arrow) viewModelBow.userData.arrow.visible = false;
  // Origin: the bow hand, a touch forward so it doesn't clip the body.
  const hand = player.char.parts.armR.hand;
  if (hand) hand.getWorldPosition(a.pos);
  else a.pos.set(player.pos.x, player.pos.y + 1.3, player.pos.z);

  // Aim from the hand to the exact crosshair point so it tracks where you aim.
  a.vel.set(aimAt.x - a.pos.x, aimAt.y - a.pos.y, aimAt.z - a.pos.z);
  if (a.vel.lengthSq() < 1e-4) camera.getWorldDirection(a.vel);
  a.vel.normalize().multiplyScalar(ARROW_SPEED);

  a.target = (target && !target.dead && !target.dying) ? target : null;
  a.t = 0.9;
  a.active = true;
  a.mesh.visible = true;
  a.mesh.position.copy(a.pos);
  audio.sfx.bow();
}

function updateArrows(dt) {
  for (const a of arrowPool) {
    if (!a.active) continue;
    a.t -= dt;
    // Reached a live target, or expired: retire the arrow.
    if (a.t <= 0) { a.active = false; a.mesh.visible = false; continue; }
    if (a.target && !a.target.dead && !a.target.dying) {
      if (a.pos.distanceTo(a.target.pos) < 0.9) { a.active = false; a.mesh.visible = false; continue; }
    }
    // No gravity: fly dead straight so the arrow lands exactly on the crosshair.
    a.pos.addScaledVector(a.vel, dt);
    a.mesh.position.copy(a.pos);
    // Point the arrow (modeled along +Y) along its travel direction.
    a._d.copy(a.vel).normalize();
    a._q.setFromUnitVectors(ARROW_UP, a._d);
    a.mesh.quaternion.copy(a._q);
    // Stop if it hits the ground.
    if (a.pos.y <= activeWorld().heightAt(a.pos.x, a.pos.z)) { a.active = false; a.mesh.visible = false; }
  }
}

let lastNetSend = 0;
let _lastEquipSig = '';
function sendNetState() {
  if (!net.isOnline()) return;
  const now = performance.now();
  if (now - lastNetSend < 120) return;
  lastNetSend = now;
  // Worn gear, so other players see your set (and your sleeping body shows it).
  // Equipment rarely changes, so only attach it when it changed since last send
  // (or while asleep, so a visitor who arrives mid-sleep still gets it).
  const equip = inv.equip || {};
  const sig = JSON.stringify(['weapon', 'shield', 'helmet', 'armor', 'legs', 'boots', 'bag', 'amulet', 'quiver']
    .map((s) => (equip[s] ? equip[s].baseId || equip[s].id || equip[s].type : 0)));
  const sendEquip = sig !== _lastEquipSig || player.sleeping;
  if (sig !== _lastEquipSig) _lastEquipSig = sig;
  net.sendState({
    x: player.pos.x, y: player.pos.y, z: player.pos.z, yaw: player.yaw,
    level: player.level, name: profile.name, sex: profile.sex, hair: profile.hair, colors: profile.colors,
    nose: profile.nose, mouth: profile.mouth, eyes: profile.eyes, brows: profile.brows, ears: profile.ears,
    profession: player.profession,
    sleeping: !!player.sleeping,
    equip: sendEquip ? equip : undefined,
  });
}

function serializeSave() {
  return {
    level: player.level, exp: player.exp, gold: inv.gold,
    equipment: inv.serialize(), depot: depot.serialize(), quests: questLog.serialize(), stats: charStats.serialize(),
    mounts: mounts.serialize(),
    house: houseStore.serialize(),    // owned house: walls, colours, light, bans
    caveMap: caveMap.serialize(),     // explored cave cells (fog of war), per dungeon+floor
    mapMarks,                         // player-placed named map waypoints
    hotbar: hotbar.serialize(),       // quickslot bar contents (number row)
    keyboard: keyboardPanel.serialize(), // MapleStory-style key→action binds
    keymap: controls.keymap.serialize(), // rebound game-action keys (per character)
    pos: { x: player.pos.x, y: player.pos.y, z: player.pos.z },
    // (The logged-off-asleep flag lives inside house.serialize() above, so it
    // rides the same `house` blob to the cloud — no separate field needed.)
    // Stamp every local save so, on reload, we can tell whether the (async, often
    // lagging) cloud row is actually fresher than what we last wrote locally.
    savedAt: Date.now(),
  };
}

function applyCloudSave(data) {
  if (!data) return;
  if (data.exp != null) player.exp = data.exp;
  player.level = xpProgress(player.exp).level;
  if (data.equipment) inv.load(data.equipment);
  // Restore gold AFTER inv.load so the explicit saved value always wins over the
  // coin-migration fallback inside inv.load. Without this line a reload dropped
  // all gold — both the localStorage and the cloud load paths run through here,
  // so omitting it was the "gold/exp lost on refresh" bug.
  if (data.gold != null) inv.gold = data.gold;
  if (data.depot) depot.load(data.depot);
  if (data.quests) questLog.load(data.quests);
  if (data.stats) charStats.load(data.stats);
  if (data.mounts) mounts.load(data.mounts);
  if (data.house) { houseStore.load(data.house); refreshHouseExteriors(); }
  loadMapMemory(data);
  if (data.hotbar) hotbar.load(data.hotbar, resolveHotbarEntry);
  // Rebound game-action keys load BEFORE the skill/potion binds so reserved-key
  // filtering reflects the player's actual movement/jump layout.
  if (data.keymap) controls.keymap.load(data.keymap);
  if (data.keyboard) keyboardPanel.load(data.keyboard, resolveHotbarEntry);
  // (The asleep flag was restored by houseStore.load(data.house) above; startGame
  // reads houseStore.sleeping to resume the sleep.)
  applyVocationStats(true);
  recompute();
}

// Hydrate a returning character from its Supabase row: level/exp, gold, gear,
// per-city depot and last position (so you resume where you logged off).
function applyCharacterRow(row) {
  // Remember how fresh this cloud row is so loadSave() only lets the local copy
  // win when localStorage is actually newer (e.g. progress made since this row
  // was written), not stale (e.g. older device).
  _cloudSavedAt = row && row.updated_at ? (Date.parse(row.updated_at) || 0) : 0;
  player.exp = row.exp || 0;
  player.level = xpProgress(player.exp).level;
  inv.gold = row.gold || 0;
  if (row.equipment) inv.load(row.equipment);
  if (row.backpack && Array.isArray(row.backpack)) inv.backpack = row.backpack;
  if (row.depot) depot.load(row.depot);
  if (row.stats) charStats.load(row.stats);
  if (row.quests) questLog.load(row.quests);
  if (row.mounts) mounts.load(row.mounts);
  if (row.house) { houseStore.load(row.house); refreshHouseExteriors(); }
  loadMapMemory(row);
  if (row.hotbar) hotbar.load(row.hotbar, resolveHotbarEntry);
  if (row.keymap) controls.keymap.load(row.keymap);   // rebound game-action keys
  if (row.keyboard) keyboardPanel.load(row.keyboard, resolveHotbarEntry);
  if (Array.isArray(row.friends)) { friends.clear(); for (const f of row.friends) friends.add(f); }
  applyVocationStats(true);
  if (row.pos && typeof row.pos.x === 'number') {
    player.spawnAt(row.pos.x, row.pos.z);
  }
  // The logged-off-asleep flag was restored by houseStore.load(row.house) above;
  // startGame() reads houseStore.sleeping to resume the sleep in the house centre.
  recompute();
}

// Persist the current character to the signed-in account (position, depot,
// items, level, gold). Debounced by the caller (recompute / periodic save).
function saveToAccount() {
  if (!authCharacterId || !auth.isAvailable()) return;
  auth.saveCharacter(authCharacterId, {
    level: player.level, exp: player.exp, gold: inv.gold,
    equipment: inv.serialize(), backpack: inv.backpack,
    depot: depot.serialize(), stats: charStats.serialize(),
    quests: questLog.serialize(), friends: [...friends],
    mounts: mounts.serialize(),
    house: houseStore.serialize(),
    caveMap: caveMap.serialize(),    // explored cave map (fog of war)
    mapMarks,                        // named map waypoints
    // Rebound game-action keys, per character. OPTIONAL column (ADD_keymap_column
    // .sql); auth.saveCharacter strips it if the DB lacks it, and the local save
    // keeps it regardless.
    keymap: controls.keymap.serialize(),
    pos: { x: player.pos.x, y: player.pos.y, z: player.pos.z },
    // (The asleep flag travels inside `house` — houseStore.serialize() — so the
    // existing `house` jsonb column carries it; no extra column needed.)
  });
}

function loadProfile() {
  try {
    const p = JSON.parse(localStorage.getItem(PROFILE_KEY));
    if (p && p.colors) { const colors = { ...DEFAULT_COLORS, ...p.colors }; delete colors._look; return { name: p.name || '', colors, sex: p.sex === 'female' ? 'female' : 'male', hair: HAIR_STYLES.includes(p.hair) ? p.hair : 'short', nose: p.nose || 'small', mouth: p.mouth || 'smile', eyes: p.eyes || 'normal', brows: p.brows || 'normal', ears: p.ears || 'normal', profession: getProfession(p.profession) ? p.profession : 'knight', homeCityId: p.homeCityId || null }; }
  } catch (_) { /* corrupt profile is regenerated */ }
  return { name: '', colors: { ...DEFAULT_COLORS }, sex: 'male', hair: 'short', nose: 'small', mouth: 'smile', profession: 'knight', homeCityId: null };
}

function saveProfile() { localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)); }
function saveLocal() { localStorage.setItem(SAVE_KEY, JSON.stringify(serializeSave())); }

// Persist progress the moment it changes (gold/XP earned in combat used to only
// hit the 15s interval, so a quick reload after a kill lost that loot). The
// localStorage write is synchronous and always lands; the cloud write is
// debounced so a burst of kills doesn't spam Supabase.
let _cloudSaveTimer = 0;
function persistProgress() {
  if (state !== 'play') return;
  saveLocal();
  clearTimeout(_cloudSaveTimer);
  _cloudSaveTimer = setTimeout(() => { if (state === 'play') saveToAccount(); }, 2500);
}

function loadSave() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (!s) return;
    // The cloud character row was already applied at character-select
    // (applyCharacterRow). Only let the LOCAL save override it when local is at
    // least as fresh — otherwise an older local copy (e.g. after playing on
    // another device) would clobber newer cloud progress. Saves written before
    // we stamped savedAt have savedAt=0 and still apply when there's no cloud row.
    const localAt = s.savedAt || 0;
    if (localAt >= _cloudSavedAt) applyCloudSave(s);
  } catch (_) { /* corrupt save ignored */ }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
