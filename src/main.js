import * as THREE from 'three';
import { World, WATER_LEVEL } from './world.js';
import { Player, EYE_HEIGHT } from './player.js';
import { Controls } from './controls.js';
import { DayNight } from './daynight.js';
import { HAIR_STYLES } from './character.js';
import { initLang, getLang, setLang, applyStaticDom, t } from './i18n.js';
import { Inventory, DepotStore, instanceFromContainer, instanceFromArmor } from './inventory.js';
import { EquipVisuals } from './equipVisuals.js';
import { CombatSystem } from './combat.js';
import { buildCities, interactableAt, nearestCity, placeCities } from './cities.js';
import { Minimap } from './minimap.js';
import { UI } from './ui.js';
import { Peers } from './peers.js';
import { Net } from './net.js';
import { audio } from './audio.js';
import { makeStarterWand, getContainer, getWeapon, getArmor } from './data/items.js';
import { xpProgress, eventMultipliers } from './progression.js';
import { QuestLog } from './questlog.js';
import { WorldNpcs } from './worldNpcs.js';
import { questsForNpc } from './data/quests.js';
import { buildDungeonEntrances, dungeonEntranceAt, chestAt, openChestVisual, update as updateDungeons } from './dungeons.js';
import { resolveItem } from './inventory.js';
import { FloatText } from './floatText.js';

const SEED = 20260612;
const PROFILE_KEY = 'mundum.profile';
const SAVE_KEY = 'mundum.save';

const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
if (isTouch) document.body.classList.add('touch');

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isTouch, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, isTouch ? 1.5 : 2));
renderer.setSize(innerWidth, innerHeight);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(isTouch ? 70 : 75, innerWidth / innerHeight, 0.1, 3000);
camera.rotation.order = 'YXZ';

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
player.spawnAt(homeCity.x, homeCity.z);
world.update(player.pos.x, player.pos.z, true);

player.level = 1;
player.exp = 0;
player.maxHp = 200;
player.hp = player.maxHp;
player.defense = 0;
player.weapon = null;
player.speedBonus = 0;
player.gold = 0;
player.alive = true;

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
let state = 'create';

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
  xpFill: document.getElementById('xp-fill'),
  xpText: document.getElementById('xp-text'),
  levelBadge: document.getElementById('level-badge'),
  toastStack: document.getElementById('toast-stack'),
  contextCard: document.getElementById('context-card'),
  questBox: document.getElementById('quest-box'),
};

const gameUI = new UI(panelRefs, inv, depot, {
  equip: (i) => doEquip(i),
  unequip: (slot) => doUnequip(slot),
  dropItem: (i) => doDropItem(i),
  buy: (def, refresh) => doBuy(def, refresh),
  depositItem: (city, i) => { const it = inv.removeFromBackpack(i); if (it) depot.deposit(city, it); recompute(); },
  withdrawItem: (city, i) => {
    const item = depot.withdraw(city, i);
    if (item && inv.addToBackpack(item, player.level) !== 'ok') depot.deposit(city, item);
    recompute();
  },
});

const minimap = new Minimap(document.getElementById('minimap'), world, document.getElementById('city-name'));

const controls = new Controls(canvas, ui, {
  onToggleCamera: () => { firstPerson = !firstPerson; },
  onLockChange: (locked) => { ui.hint.classList.toggle('hidden', locked); },
  onToggleBag: () => gameUI.togglePanel(),
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

addEventListener('pointerdown', () => audio.unlock(), { once: true });
addEventListener('keydown', () => audio.unlock(), { once: true });
addEventListener('keydown', (e) => { if (state === 'play' && e.code === 'KeyE' && !controls.chatting) tryInteract(); });
addEventListener('beforeunload', () => { saveLocal(); net.disconnect(); });

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

  ui.nameInput.value = profile.name;
  ui.btnPlay.addEventListener('click', startGame);
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
  saveProfile();
  loadSave();

  if (!inv.equip.bag) inv.equip.bag = instanceFromContainer(getContainer('backpack'));
  if (!inv.equip.weapon) inv.equip.weapon = makeStarterWand(() => 0.5);
  recompute();
  onQuestProgress();

  state = 'play';
  controls.enabled = true;
  scene.remove(fillLight);
  ui.creation.classList.add('hidden');
  ui.hud.classList.remove('hidden');
  ui.controlsUi.classList.remove('hidden');
  panelRefs.sidePanel.classList.remove('hidden');
  document.getElementById('chat').classList.remove('hidden');
  audio.unlock();
  audio.startMusic();
  if (!isTouch) canvas.requestPointerLock();

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
      if (!isTouch) canvas.requestPointerLock();
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

function doDropItem(i) {
  const item = inv.removeFromBackpack(i);
  if (item) { combat.spawnDrop(player.pos, item); recompute(); }
}

function doBuy(def, refresh) {
  if (inv.gold < def.value) { gameUI.toast(t('full'), 'bad'); return; }
  let item;
  if (getWeapon(def.id)) item = rollShopWeapon(def.id);
  else if (getArmor(def.id)) item = instanceFromArmor(getArmor(def.id));
  else if (getContainer(def.id)) item = instanceFromContainer(def);
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
  gameUI.renderAll();
  gameUI.setCapacity(player.level);
  saveLocal();
  net.saveCharacter(serializeSave());
}

function gainXp(xp) {
  player.exp += xp;
  const before = player.level;
  const info = xpProgress(player.exp);
  player.level = info.level;
  if (player.level > before) {
    player.maxHp = 200 + (player.level - 1) * 40;
    player.hp = player.maxHp;
    audio.sfx.levelUp();
    gameUI.toast(t('levelUp', player.level), 'levelup');
    equipVisuals.refresh(inv.equip, player.level);
  }
  gameUI.setVitals(player.hp, player.maxHp, info);
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
  player.spawnAt(homeCity.x, homeCity.z);
  player.hp = player.maxHp;
  player.alive = true;
  combat.clear();
  if (!isTouch) canvas.requestPointerLock();
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
  if (npc.role === 'priest' && player.hp < player.maxHp) {
    player.hp = player.maxHp;
    audio.sfx.levelUp();
    gameUI.toast('✨ ' + t('healed'), 'levelup');
    gameUI.setVitals(player.hp, player.maxHp, xpProgress(player.exp));
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
    if (d) {
      gameUI.toast('🕳️ ' + (d.name ? (d.name[getLang()] || d.name.es) : d.id));
      if (questLog.onEvent('reach', d.id).length) onQuestProgress();
    }
  }
}

function teleportTo(city) {
  player.spawnAt(city.x, city.z);
  world.update(player.pos.x, player.pos.z, true);
  combat.clear();
  gameUI.closeContext();
  audio.sfx.pickup();
  if (!isTouch) canvas.requestPointerLock();
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
    const cx = player.pos.x + Math.sin(player.yaw) * cp * d;
    const cz = player.pos.z + Math.cos(player.yaw) * cp * d;
    let cy = eyeY - sp * d + 0.35;
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
}

let createT = 0.6;
function updateCreationCamera(dt) {
  createT += dt * 0.5;
  // Model faces +Z; the camera sits on +Z, so face the hero toward it.
  player.char.group.rotation.y = Math.PI + Math.sin(createT) * 0.6;
  player.char.animate(0, 0, true);
  const px = player.pos.x, pz = player.pos.z;
  const portrait = camera.aspect < 0.85;
  // Stay inside the temple pillar ring (radius ~3.4) so no pillar blocks the
  // hero. Wide screens have a narrow vertical fov, so back off a bit more and
  // aim low so feet and head both fit.
  const cz = pz + (portrait ? 3.2 : 3.3);
  const cy = player.pos.y + 1.05;
  camera.position.set(px, cy, cz);
  camera.lookAt(px, player.pos.y + 0.55, pz);
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

      if (controls.consumeAttack()) doAttack();

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
        } else combat.spawnDrop(player.pos, picked);
      }

      checkDungeon();

      if (player.hp < player.maxHp) {
        player.hp = Math.min(player.maxHp, player.hp + dt * (4 + player.level * 0.5));
      }
    }

    peers.tick(dt);
    worldNpcs.tick(dt);
    updateDungeons(dt, dungeonChests);
    floatText.update(dt);
    updateWandBolt(dt);
    sendNetState();

    updateCamera();
    minimap.draw(player, peers.list(), combat.creatures);
    gameUI.setVitals(player.hp, player.maxHp, xpProgress(player.exp));

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

function doAttack() {
  if (!player.weapon) return;
  equipVisuals.triggerSwing();
  audio.sfx.attack();
  camDir.set(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
  combat.attack(player, camDir);
  if (player.weapon.type === 'wand') castWandBolt();
}

const wandBolt = (() => {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 10, 8),
    new THREE.MeshBasicMaterial({ color: 0xb89bff, transparent: true }));
  const light = new THREE.PointLight(0xb89bff, 10, 4);
  mesh.add(light);
  mesh.visible = false;
  scene.add(mesh);
  return { mesh, light, t: 0, active: false };
})();

function castWandBolt() {
  const color = player.weapon.color || 0xb89bff;
  wandBolt.mesh.material.color.setHex(color);
  wandBolt.light.color.setHex(color);
  wandBolt.mesh.position.set(player.pos.x, player.pos.y + 1.3, player.pos.z);
  wandBolt.dir = { x: camDir.x, z: camDir.z };
  wandBolt.t = 0.35;
  wandBolt.active = true;
  wandBolt.mesh.visible = true;
}

function updateWandBolt(dt) {
  if (!wandBolt.active) return;
  wandBolt.t -= dt;
  if (wandBolt.t <= 0) { wandBolt.active = false; wandBolt.mesh.visible = false; return; }
  wandBolt.mesh.position.x += wandBolt.dir.x * dt * 22;
  wandBolt.mesh.position.z += wandBolt.dir.z * dt * 22;
  wandBolt.mesh.material.opacity = wandBolt.t / 0.35;
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
  player.maxHp = 200 + (player.level - 1) * 40;
  player.hp = player.maxHp;
  recompute();
}

function loadProfile() {
  try {
    const p = JSON.parse(localStorage.getItem(PROFILE_KEY));
    if (p && p.colors) return { name: p.name || '', colors: { ...DEFAULT_COLORS, ...p.colors }, sex: p.sex === 'female' ? 'female' : 'male', hair: HAIR_STYLES.includes(p.hair) ? p.hair : 'short' };
  } catch (_) { /* corrupt profile is regenerated */ }
  return { name: '', colors: { ...DEFAULT_COLORS }, sex: 'male', hair: 'short' };
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
