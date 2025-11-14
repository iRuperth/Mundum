import * as THREE from 'three';
import { buildCharacter } from './character.js';

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
