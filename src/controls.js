// Unified input: keyboard, pointer-lock mouse, and touch (left half = virtual
// joystick, right half = drag to look).
const LOOK_MOUSE = 0.0024;
const LOOK_TOUCH = 0.005;
const STICK_RADIUS = 48;

export class Controls {
  constructor(canvas, ui, opts) {
    this.canvas = canvas;
    this.ui = ui;
    this.isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
    this.enabled = false;

    this.keys = new Set();
    this.move = { x: 0, z: 0 };
    this.sprint = false;
    this.jumpHeld = false;
    this.chatting = false;
    this._jumpQueued = false;
    this._attackQueued = false;
    this._leftQueued = false;
    this._rightQueued = false;
    this._lookDX = 0;
    this._lookDY = 0;

    this._stick = { id: null, ox: 0, oy: 0, x: 0, y: 0 };
    this._lookPtr = { id: null, lx: 0, ly: 0 };

    addEventListener('keydown', (e) => {
      if (!this.enabled) return;
      if (this.chatting) return;
      if (e.code === 'Enter') { opts.onChat?.(); return; }
      if (e.code === 'Space') {
        e.preventDefault();
        if (!e.repeat) this._jumpQueued = true;
        this.jumpHeld = true;
      }
      if (e.code === 'KeyC' && !e.repeat) opts.onToggleCamera();
      if (e.code === 'KeyI' && !e.repeat) opts.onToggleBag?.();
      this.keys.add(e.code);
    });
    addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
      if (e.code === 'Space') this.jumpHeld = false;
    });
    addEventListener('blur', () => { this.keys.clear(); this.jumpHeld = false; });

    canvas.addEventListener('mousedown', (e) => {
      if (!this.enabled || this.isTouch) return;
      if (document.pointerLockElement === canvas) {
        if (e.button === 0) this._leftQueued = true;
        if (e.button === 2) this._rightQueued = true;
      } else {
        // Pointer lock can throw under some browser policies; ignore failures.
        try { canvas.requestPointerLock(); } catch (_) { /* ignore */ }
      }
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('mousemove', (e) => {
      if (document.pointerLockElement === canvas) {
        this._lookDX += e.movementX * LOOK_MOUSE;
        this._lookDY += e.movementY * LOOK_MOUSE;
      }
    });
    document.addEventListener('pointerlockchange', () => {
      opts.onLockChange?.(document.pointerLockElement === canvas);
    });

    canvas.addEventListener('pointerdown', (e) => {
      if (!this.enabled || e.pointerType !== 'touch') return;
      if (e.clientX < innerWidth * 0.45 && this._stick.id === null) {
        this._stick.id = e.pointerId;
        this._stick.ox = e.clientX;
        this._stick.oy = e.clientY;
        this._stick.x = 0;
        this._stick.y = 0;
        ui.stickBase.style.display = 'block';
        ui.stickBase.style.left = e.clientX + 'px';
        ui.stickBase.style.top = e.clientY + 'px';
        this._moveKnob(0, 0);
      } else if (this._lookPtr.id === null) {
        this._lookPtr.id = e.pointerId;
        this._lookPtr.lx = e.clientX;
        this._lookPtr.ly = e.clientY;
      }
    });
    addEventListener('pointermove', (e) => {
      if (e.pointerId === this._stick.id) {
        let dx = e.clientX - this._stick.ox;
        let dy = e.clientY - this._stick.oy;
        const d = Math.hypot(dx, dy);
        if (d > STICK_RADIUS) { dx = dx / d * STICK_RADIUS; dy = dy / d * STICK_RADIUS; }
        this._stick.x = dx / STICK_RADIUS;
        this._stick.y = -dy / STICK_RADIUS; // up = forward
        this._moveKnob(dx, dy);
      } else if (e.pointerId === this._lookPtr.id) {
        this._lookDX += (e.clientX - this._lookPtr.lx) * LOOK_TOUCH;
        this._lookDY += (e.clientY - this._lookPtr.ly) * LOOK_TOUCH;
        this._lookPtr.lx = e.clientX;
        this._lookPtr.ly = e.clientY;
      }
    });
    const release = (e) => {
      if (e.pointerId === this._stick.id) {
        this._stick.id = null;
        this._stick.x = 0;
        this._stick.y = 0;
        ui.stickBase.style.display = 'none';
      }
      if (e.pointerId === this._lookPtr.id) this._lookPtr.id = null;
    };
    addEventListener('pointerup', release);
    addEventListener('pointercancel', release);

    ui.btnJump.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this._jumpQueued = true;
      this.jumpHeld = true;
    });
    const jumpOff = () => { this.jumpHeld = false; };
    ui.btnJump.addEventListener('pointerup', jumpOff);
    ui.btnJump.addEventListener('pointerleave', jumpOff);
    ui.btnCam.addEventListener('click', (e) => {
      e.stopPropagation();
      opts.onToggleCamera();
    });
    if (ui.btnAttack) ui.btnAttack.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this._attackQueued = true;
    });
    if (ui.btnBag) ui.btnBag.addEventListener('click', (e) => {
      e.stopPropagation();
      opts.onToggleBag?.();
    });
  }

  // Attack fires on the left button in third person and the right button in
  // first person. The touch button and the spacebar-free attack button always
  // count. main.js passes which mouse button is active for the current camera.
  consumeAttack(useLeft) {
    const mouse = useLeft ? this._leftQueued : this._rightQueued;
    const a = this._attackQueued || mouse;
    this._attackQueued = false;
    this._leftQueued = false;
    this._rightQueued = false;
    return a;
  }

  _moveKnob(dx, dy) {
    this.ui.stickKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  }

  updateMove() {
    let x = 0, z = 0;
    const k = this.chatting ? new Set() : this.keys;
    if (k.has('KeyW') || k.has('ArrowUp')) z += 1;
    if (k.has('KeyS') || k.has('ArrowDown')) z -= 1;
    if (k.has('KeyA') || k.has('ArrowLeft')) x -= 1;
    if (k.has('KeyD') || k.has('ArrowRight')) x += 1;
    x += this._stick.x;
    z += this._stick.y;
    const len = Math.hypot(x, z);
    if (len > 1) { x /= len; z /= len; }
    this.move.x = x;
    this.move.z = z;
    // on touch, pushing the joystick to its edge means sprint
    const stickMag = Math.hypot(this._stick.x, this._stick.y);
    this.sprint = k.has('ShiftLeft') || k.has('ShiftRight') || stickMag > 0.94;
  }

  consumeLook() {
    const r = { x: this._lookDX, y: this._lookDY };
    this._lookDX = 0;
    this._lookDY = 0;
    return r;
  }

  consumeJump() {
    const j = this._jumpQueued;
    this._jumpQueued = false;
    return j;
  }
}
