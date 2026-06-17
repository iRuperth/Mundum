import * as THREE from 'three';

// Day/night cycle driven by the device's real clock.
// isNight() and damageMultiplier() feed phase-2 combat: creatures hit 30% harder at night.
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

    // stars, fixed relative to the player
    const N = 700;
    const pos = new Float32Array(N * 3);
    let s = 123456789;
    const rnd = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
    for (let i = 0; i < N; i++) {
      const a = rnd() * Math.PI * 2;
      const y = rnd() * 0.95 + 0.05; // upper hemisphere
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

    this._buildClouds(scene);
    this._buildBirds(scene);
    this._t = 0;
  }

  // Puffy clouds: a handful of cumulus blobs, each a clump of squashed white
  // spheres, drifting slowly on the wind. They ride high above the player (like
  // the stars/sun) and wrap around when they drift out of range, so the sky is
  // never empty. fog:false keeps them crisp out to the horizon.
  _buildClouds(scene) {
    const mat = new THREE.MeshLambertMaterial({
      color: 0xffffff, transparent: true, opacity: 0.92, fog: false, depthWrite: false,
    });
    this.cloudMat = mat;
    this.clouds = [];
    let s = 0x1234abcd;
    const rnd = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
    const N = 16;
    const SPREAD = 1100;           // how far out clouds roam in x/z
    for (let i = 0; i < N; i++) {
      const cloud = new THREE.Group();
      const puffs = 3 + Math.floor(rnd() * 4);
      const scale = 18 + rnd() * 26;
      for (let p = 0; p < puffs; p++) {
        const r = scale * (0.5 + rnd() * 0.6);
        const puff = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), mat);
        puff.position.set((rnd() - 0.5) * scale * 2.2, (rnd() - 0.5) * scale * 0.4, (rnd() - 0.5) * scale * 1.4);
        puff.scale.y = 0.55;        // flatten into a cloud, not a ball
        cloud.add(puff);
      }
      cloud.position.set((rnd() - 0.5) * SPREAD * 2, 240 + rnd() * 150, (rnd() - 0.5) * SPREAD * 2);
      cloud.userData = { speed: 4 + rnd() * 6, spread: SPREAD };
      scene.add(cloud);
      this.clouds.push(cloud);
    }
  }

  // A small flock of birds that wheel across the sky now and then. Each bird is a
  // simple dark V (two thin wings) that flaps and glides along a slow circular
  // path at its own radius/height, so you catch the odd one drifting overhead.
  _buildBirds(scene) {
    const mat = new THREE.MeshBasicMaterial({ color: 0x2a2a30, fog: false, side: THREE.DoubleSide });
    this.birdMat = mat;
    this.birds = [];
    let s = 0xbeef1234;
    const rnd = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
    const wingGeo = new THREE.PlaneGeometry(2.4, 0.7);
    const N = 7;
    for (let i = 0; i < N; i++) {
      const bird = new THREE.Group();
      const lw = new THREE.Mesh(wingGeo, mat);
      const rw = new THREE.Mesh(wingGeo, mat);
      lw.position.x = -1.2; rw.position.x = 1.2;
      const wings = new THREE.Group();
      wings.add(lw, rw);
      bird.add(wings);
      bird.userData = {
        wings, lw, rw,
        radius: 180 + rnd() * 320,
        height: 120 + rnd() * 130,
        phase: rnd() * Math.PI * 2,
        speed: (0.05 + rnd() * 0.06) * (rnd() < 0.5 ? 1 : -1),
        flap: 5 + rnd() * 4,
      };
      scene.add(bird);
      this.birds.push(bird);
    }
  }

  timeFraction() {
    // forceDay pins the world to midday for now, regardless of real time.
    if (this.forceDay) return 0.5;
    const d = new Date();
    return (d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds()) / 86400;
  }

  elevation() {
    return Math.sin((this.timeFraction() - 0.25) * Math.PI * 2);
  }

  isNight() { return this.elevation() < -0.04; }

  damageMultiplier() { return this.isNight() ? 1.3 : 1; }

  update(playerPos, dt = 0) {
    this._t += dt;
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

    // Clouds: drift east on the wind and tint with the time of day (bright white
    // by day, dim blue-grey at night). They follow the player in x/z and wrap
    // around the roaming box so the sky always has a few overhead.
    this.cloudMat.color.setRGB(0.35 + day * 0.62, 0.36 + day * 0.61, 0.4 + day * 0.6);
    this.cloudMat.opacity = 0.55 + day * 0.4;
    for (const cloud of this.clouds) {
      const u = cloud.userData;
      cloud.position.x += u.speed * dt;
      // Wrap relative to the player so clouds never run off to infinity.
      const rx = cloud.position.x - playerPos.x;
      if (rx > u.spread) cloud.position.x -= u.spread * 2;
      const rz = cloud.position.z - playerPos.z;
      if (rz > u.spread) cloud.position.z -= u.spread * 2;
      else if (rz < -u.spread) cloud.position.z += u.spread * 2;
    }

    // Birds: each glides along its own slow circle high above, wings flapping.
    // They fade out at night (asleep) so they read as a daytime touch.
    for (const bird of this.birds) {
      const u = bird.userData;
      const a = u.phase + this._t * u.speed;
      const bx = playerPos.x + Math.cos(a) * u.radius;
      const bz = playerPos.z + Math.sin(a) * u.radius;
      bird.position.set(bx, u.height, bz);
      bird.rotation.y = -a + (u.speed > 0 ? Math.PI : 0);   // face the way it flies
      const flap = Math.sin(this._t * u.flap + u.phase) * 0.6;
      u.lw.rotation.z = flap; u.rw.rotation.z = -flap;
      bird.visible = day > 0.25;
    }
  }

  // Toggle the whole sky-dressing (clouds + birds) — used when diving into caves
  // so the surface sky doesn't render underground.
  setSkyDressingVisible(v) {
    for (const cloud of this.clouds) cloud.visible = v;
    for (const bird of this.birds) bird.visible = v;
  }
}
