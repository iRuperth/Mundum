import * as THREE from 'three';
import { World, WATER_LEVEL } from './world.js';
import { Player, EYE_HEIGHT } from './player.js';
import { Controls } from './controls.js';
import { DayNight } from './daynight.js';

// La semilla es fija: el mundo es el mismo para todos (clave para el online).
const SEED = 20260612;
const PROFILE_KEY = 'mundum.profile';

const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
if (isTouch) document.body.classList.add('touch');

// ---------- renderer / escena ----------
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

// ---------- mundo, jugador, ciclo de día ----------
const world = new World(scene, SEED, isTouch ? 3 : 4);
const daynight = new DayNight(scene);

const DEFAULT_COLORS = { skin: '#f2c79b', shirt: '#3498db', pants: '#34495e', hair: '#4a2f1b' };
let profile = loadProfile();

const spawn = findSpawn(world);
const player = new Player(scene, world, profile);
player.spawnAt(spawn.x, spawn.z);
world.update(player.pos.x, player.pos.z, true);

let firstPerson = true;
let state = 'create'; // 'create' | 'play'

// luz de relleno para que el personaje se vea bien en la pantalla de
// creación aunque en el mundo sea de noche
const fillLight = new THREE.PointLight(0xffeedd, 30, 12);
scene.add(fillLight);

const ui = {
  hud: document.getElementById('hud'),
  hint: document.getElementById('hint'),
  controlsUi: document.getElementById('controls-ui'),
  stickBase: document.getElementById('stick-base'),
  stickKnob: document.getElementById('stick-knob'),
  btnJump: document.getElementById('btn-jump'),
  btnCam: document.getElementById('btn-cam'),
  creation: document.getElementById('creation'),
  nameInput: document.getElementById('name-input'),
  swatchRows: document.getElementById('swatch-rows'),
  btnPlay: document.getElementById('btn-play'),
  clockIcon: document.getElementById('clock-icon'),
  clockTime: document.getElementById('clock-time'),
};

const controls = new Controls(canvas, ui, {
  onToggleCamera: () => { firstPerson = !firstPerson; },
  onLockChange: (locked) => { ui.hint.classList.toggle('hidden', locked); },
});

// ---------- pantalla de creación ----------
const PARTS = [
  { key: 'shirt', label: 'Camiseta', colors: ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6', '#e67e22', '#1abc9c', '#ecf0f1', '#34495e', '#ff6fa5'] },
  { key: 'pants', label: 'Pantalón', colors: ['#34495e', '#2c3e50', '#5d4037', '#1565c0', '#2e7d32', '#616161', '#8e24aa', '#bf360c'] },
  { key: 'skin', label: 'Piel', colors: ['#ffdbac', '#f2c79b', '#e0ac7e', '#c68a5a', '#9c6b43', '#7a4f2e'] },
  { key: 'hair', label: 'Pelo', colors: ['#1a1a1a', '#2c1b10', '#4a2f1b', '#7a4a21', '#b3823e', '#e8c04a', '#d9b380', '#992222', '#555555', '#ff7043'] },
];

for (const part of PARTS) {
  const row = document.createElement('div');
  row.className = 'swatch-row';
  row.innerHTML = `<div class="label">${part.label}</div>`;
  const swatches = document.createElement('div');
  swatches.className = 'swatches';
  for (const color of part.colors) {
    const b = document.createElement('button');
    b.className = 'swatch' + (profile.colors[part.key] === color ? ' selected' : '');
    b.style.background = color;
    b.addEventListener('click', () => {
      profile.colors[part.key] = color;
      player.char.setColors(profile.colors);
      swatches.querySelectorAll('.swatch').forEach((el) => el.classList.remove('selected'));
      b.classList.add('selected');
      saveProfile();
    });
    swatches.appendChild(b);
  }
  row.appendChild(swatches);
  ui.swatchRows.appendChild(row);
}

ui.nameInput.value = profile.name;

ui.btnPlay.addEventListener('click', () => {
  profile.name = ui.nameInput.value.trim() || 'Aventurero';
  saveProfile();
  state = 'play';
  controls.enabled = true;
  scene.remove(fillLight);
  ui.creation.classList.add('hidden');
  ui.hud.classList.remove('hidden');
  ui.controlsUi.classList.remove('hidden');
  if (!isTouch) canvas.requestPointerLock();
});

// ---------- reloj del HUD ----------
function updateClock() {
  const d = new Date();
  ui.clockTime.textContent =
    `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  const e = daynight.elevation();
  ui.clockIcon.textContent = e > 0.12 ? '☀️' : e > -0.12 ? '🌅' : '🌙';
}
updateClock();
setInterval(updateClock, 10000);

// ---------- cámara ----------
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
  player.char.group.visible = !firstPerson;
  player.shadow.visible = !firstPerson;
}

// cámara orbital de la pantalla de creación: el personaje gira despacio
let createT = 0.6;
function updateCreationCamera(dt) {
  createT += dt * 0.5;
  player.char.group.rotation.y = Math.sin(createT) * 0.7 + 0.2;
  player.char.animate(0, 0, true);
  const px = player.pos.x, pz = player.pos.z;
  // en vertical (móvil) la tarjeta ocupa la parte baja: encuadrar más arriba
  const portrait = camera.aspect < 0.85;
  const cx = px + (portrait ? 0 : 0.6), cz = pz + (portrait ? 4.6 : 2.9);
  const cy = Math.max(player.pos.y + 1.35, world.heightAt(cx, cz) + 0.5);
  camera.position.set(cx, cy, cz);
  camera.lookAt(px, player.pos.y + (portrait ? -0.5 : 0.95), pz);
  fillLight.position.set(cx + 0.5, cy + 1.2, cz + 0.5);
}

// ---------- bucle principal ----------
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
    player.update(dt, controls);
    updateCamera();
  } else {
    updateCreationCamera(dt);
  }

  renderer.render(scene, camera);
}
tick();

// ---------- utilidades ----------
function loadProfile() {
  try {
    const p = JSON.parse(localStorage.getItem(PROFILE_KEY));
    if (p && p.colors) return { name: p.name || '', colors: { ...DEFAULT_COLORS, ...p.colors } };
  } catch (_) { /* perfil corrupto: se regenera */ }
  return { name: '', colors: { ...DEFAULT_COLORS } };
}

function saveProfile() {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

// busca un punto de aparición llano, en hierba y cerca del origen
function findSpawn(w) {
  for (let r = 0; r < 6000; r += 20) {
    const steps = Math.max(1, Math.floor(r / 20) * 6);
    for (let i = 0; i < steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      const x = Math.round(Math.cos(a) * r);
      const z = Math.round(Math.sin(a) * r);
      const h = w.heightAt(x, z);
      if (h < 2.5 || h > 9) continue;
      const slope = Math.abs(w.heightAt(x + 2, z) - h) + Math.abs(w.heightAt(x, z + 2) - h);
      if (slope < 0.8) return { x, z };
    }
  }
  return { x: 0, z: 0 };
}
