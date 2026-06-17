import * as THREE from 'three';
import { buildCharacter } from './character.js';
import { buildCreatureModel } from './creatureModels.js';

// Renders a character front-on to a 2D image (data URL) for the creation
// preview and character-select thumbnails. One small offscreen renderer is
// shared and reused; nothing 3D leaks into the game scene.
let renderer = null;
let scene = null;
let camera = null;

function ensure(size) {
  if (renderer) {
    renderer.setSize(size, size);
    return;
  }
  const canvas = document.createElement('canvas');
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(size, size);

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50);

  const key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.position.set(1, 2, 3);
  const fill = new THREE.HemisphereLight(0xcfe8ff, 0x404048, 0.9);
  scene.add(key, fill);
}

// Returns a PNG data URL of the character described by `profile`, facing the
// camera. `size` is the square pixel size of the image.
export function renderPortrait(profile, size = 256) {
  ensure(size);

  const char = buildCharacter(profile);
  // Model faces +Z and the camera sits on +Z, so leave rotation at 0 to show
  // the face toward the camera.
  scene.add(char.group);

  // Frame head-to-knees so the face and torso fill the thumbnail.
  camera.position.set(0, 1.15, 2.6);
  camera.lookAt(0, 0.95, 0);

  renderer.render(scene, camera);
  const url = renderer.domElement.toDataURL('image/png');

  scene.remove(char.group);
  char.group.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) o.material.dispose();
  });
  return url;
}

// ---- Creature wiki previews ----------------------------------------------
// Real 3D snapshots of a creature from the front and the side, for the wiki.
// Frames automatically from the model's bounding box so tiny worms and huge
// dragons both fill their thumbnail. Results are cached by creature id (data
// URLs are heavy to regenerate). Returns { front, side } PNG data URLs, or null
// if WebGL is unavailable.
const creatureCache = new Map();

function snapshotFromAngle(group, box, angleY, size) {
  const center = box.getCenter(new THREE.Vector3());
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  const r = Math.max(0.25, sphere.radius);
  // Distance so the bounding sphere fits the 35° vertical FoV with a little air.
  const dist = (r / Math.sin((35 * Math.PI / 180) / 2)) * 0.62 + r;
  const cx = center.x + Math.sin(angleY) * dist;
  const cz = center.z + Math.cos(angleY) * dist;
  camera.position.set(cx, center.y + r * 0.35, cz);
  camera.lookAt(center.x, center.y, center.z);
  renderer.render(scene, camera);
  return renderer.domElement.toDataURL('image/png');
}

export function renderCreatureViews(creature, size = 180) {
  if (!creature) return null;
  const cached = creatureCache.get(creature.id);
  if (cached) return cached;
  try {
    ensure(size);
    const built = buildCreatureModel(creature.family, {
      color: creature.color,
      scale: creature.variantScale || 1,
      design: creature.design,
    });
    if (!built || !built.group) return null;
    scene.add(built.group);
    // Settle any idle pose to a neutral stance before snapping.
    if (built.update) { try { built.update(0, false); } catch (_) { /* ignore */ } }

    const box = new THREE.Box3().setFromObject(built.group);
    // Front: camera on +Z (model faces +Z). Side: camera on +X (90° around Y).
    const front = snapshotFromAngle(built.group, box, 0, size);
    const side = snapshotFromAngle(built.group, box, Math.PI / 2, size);

    scene.remove(built.group);
    if (built.dispose) { try { built.dispose(); } catch (_) { /* ignore */ } }
    built.group.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
        else o.material.dispose();
      }
    });

    const out = { front, side };
    creatureCache.set(creature.id, out);
    return out;
  } catch (_) {
    return null; // WebGL unavailable or a model build failure — wiki falls back.
  }
}
