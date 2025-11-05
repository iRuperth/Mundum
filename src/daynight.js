import * as THREE from 'three';

// Ciclo día/noche ligado a la hora real del dispositivo.
// expone isNight() y damageMultiplier() para el combate de la fase 2
// (de noche las criaturas pegan un 30% más).
const DAY = new THREE.Color(0x7ec9ff);
const NIGHT = new THREE.Color(0x0b1030);
const DAWN = new THREE.Color(0xff9e6b);
const tmp = new THREE.Color();

export class DayNight {
  constructor(scene) {
    this.scene = scene;

    this.sun = new THREE.DirectionalLight(0xfff3d6, 1);
    scene.add(this.sun);
    scene.add(this.sun.target);
    this.hemi = new THREE.HemisphereLight(0xcfe8ff, 0x59663f, 0.8);
    scene.add(this.hemi);

    this.sunMesh = new THREE.Mesh(
      new THREE.SphereGeometry(30, 16, 12),
      new THREE.MeshBasicMaterial({ color: 0xffe9a0, fog: false }));
    this.moonMesh = new THREE.Mesh(
      new THREE.SphereGeometry(20, 16, 12),
      new THREE.MeshBasicMaterial({ color: 0xdfe8ff, fog: false }));
    scene.add(this.sunMesh, this.moonMesh);

    // estrellas (puntos fijos respecto al jugador)
    const N = 700;
    const pos = new Float32Array(N * 3);
    let s = 123456789;
    const rnd = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
    for (let i = 0; i < N; i++) {
      const a = rnd() * Math.PI * 2;
      const y = rnd() * 0.95 + 0.05; // hemisferio superior
      const r = Math.sqrt(1 - y * y);
      pos[i * 3] = Math.cos(a) * r * 750;
      pos[i * 3 + 1] = y * 750;
      pos[i * 3 + 2] = Math.sin(a) * r * 750;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.stars = new THREE.Points(g, new THREE.PointsMaterial({
      color: 0xffffff, size: 1.7, sizeAttenuation: false,
      transparent: true, opacity: 0, fog: false, depthWrite: false,
    }));
    scene.add(this.stars);

    this.sky = new THREE.Color();
    scene.background = this.sky;

    this._dir = new THREE.Vector3();
  }

  timeFraction() {
    const d = new Date();
    return (d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds()) / 86400;
  }

  elevation() {
    return Math.sin((this.timeFraction() - 0.25) * Math.PI * 2);
  }

  isNight() { return this.elevation() < -0.04; }

  damageMultiplier() { return this.isNight() ? 1.3 : 1; }

  update(playerPos) {
    const ang = (this.timeFraction() - 0.25) * Math.PI * 2;
    const e = Math.sin(ang);
    const dir = this._dir.set(Math.cos(ang) * 0.9, e, 0.42).normalize();

    const day = THREE.MathUtils.clamp((e + 0.12) / 0.34, 0, 1);
    const dawn = Math.max(0, 1 - Math.abs(e) / 0.28);

    this.sky.copy(NIGHT).lerp(DAY, day);
    this.sky.lerp(tmp.copy(DAWN), dawn * 0.5);
    if (this.scene.fog) this.scene.fog.color.copy(this.sky);

    this.sun.position.copy(playerPos).addScaledVector(dir, 140);
    this.sun.target.position.copy(playerPos);
    this.sun.intensity = 0.15 + day * 0.95;
    this.sun.color.setHex(day > 0.05 ? 0xfff3d6 : 0x8fa6ff);
    this.hemi.intensity = 0.22 + day * 0.6;

    this.sunMesh.position.copy(playerPos).addScaledVector(dir, 850);
    this.moonMesh.position.copy(playerPos).addScaledVector(dir, -850);
    this.sunMesh.visible = e > -0.25;
    this.moonMesh.visible = e < 0.25;

    this.stars.material.opacity = 1 - day;
    this.stars.position.set(playerPos.x, 0, playerPos.z);
  }
}
