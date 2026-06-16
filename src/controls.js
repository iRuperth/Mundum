// Unified input: keyboard, pointer-lock mouse, and touch (left half = virtual
// joystick, right half = drag to look).
import { Keymap } from './keymap.js';

const LOOK_MOUSE = 0.0024;
const LOOK_TOUCH = 0.005;
const STICK_RADIUS = 52;
// Below this fraction of the stick radius we treat the joystick as centred, so a
// resting thumb doesn't make the character creep (a common "feels stuck/drifty"
// complaint on phones).
const STICK_DEADZONE = 0.16;

export class Controls {
  constructor(canvas, ui, opts) {
    this.canvas = canvas;
    this.ui = ui;
    // Touch as the PRIMARY input: coarse pointer with no fine pointer (a finger,
    // not a mouse). Avoids forcing the joystick on a touchscreen laptop. main.js
    // overrides at runtime via setTouch() (the mobile-mode toggle / resolveTouch).
    this.isTouch = matchMedia('(pointer: coarse)').matches && !matchMedia('(pointer: fine)').matches;
    this.opts = opts;
    this.enabled = false;

    // Player-rebindable game-action keys (movement, jump, camera, …). Defaults
    // match the classic layout; the keyboard panel can reassign them and main.js
    // persists keymap.serialize() per character.
    this.keymap = new Keymap();

    this.keys = new Set();
    this.move = { x: 0, z: 0 };
    this.sprint = false;
    this.jumpHeld = false;
    this.chatting = false;
    this._jumpQueued = false;
    this._attackQueued = false;
    this._leftQueued = false;
    this._rightQueued = false;
    this._lightToggleQueued = false;
    this._lookDX = 0;
    this._lookDY = 0;

    this._stick = { id: null, ox: 0, oy: 0, x: 0, y: 0 };
    this._lookPtr = { id: null, lx: 0, ly: 0 };

    addEventListener('keydown', (e) => {
      if (!this.enabled) return;
      if (this.chatting) return;
      if (e.code === 'Enter') { opts.onChat?.(); return; }
      const km = this.keymap;
      if (km.isAction('jump', e.code)) {
        e.preventDefault();
        if (!e.repeat) this._jumpQueued = true;
        this.jumpHeld = true;
      }
      if (km.isAction('camera', e.code) && !e.repeat) opts.onToggleCamera();
      if (km.isAction('range', e.code) && !e.repeat) opts.onToggleRange?.();
      if (km.isAction('torch', e.code) && !e.repeat) this._lightToggleQueued = true;
      // Mount / dismount the active mount.
      if (km.isAction('mount', e.code) && !e.repeat) opts.onToggleMount?.();
      // Tab (or the map key) frees / re-grabs the mouse, like Escape but without
      // the browser's "press Esc to exit" overlay — a clearer way to reach the UI.
      if ((e.code === 'Tab' || km.isAction('map', e.code)) && !e.repeat) {
        e.preventDefault();
        opts.onToggleMouse?.();
      }
      // Hotbar: forward the raw key code so the bar can fire whichever slot the
      // player bound to it (keys are configurable now, not just 1-0). The hotbar
      // also captures the next key when rebinding a slot.
      if (!e.repeat && opts.onHotbarKeyCode) opts.onHotbarKeyCode(e.code);
      this.keys.add(e.code);
    });
    addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
      if (this.keymap.isAction('jump', e.code)) this.jumpHeld = false;
    });
    addEventListener('blur', () => { this.keys.clear(); this.jumpHeld = false; });

    canvas.addEventListener('mousedown', (e) => {
      if (!this.enabled || this.isTouch) return;
      if (document.pointerLockElement === canvas) {
        // Left click attacks in both camera modes. Right click is reserved for a
        // future action; the torch is now lit from its equipment slot, not here.
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
      // In touch mode, route ANY pointer (real touch, or a mouse when mobile
      // mode is forced on a desktop browser) through the joystick / look-drag.
      if (!this.enabled || !this.isTouch) return;
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
    if (ui.btnRange) ui.btnRange.addEventListener('click', (e) => {
      e.stopPropagation();
      opts.onToggleRange?.();
    });
  }

  // Switch input routing between touch and desktop at runtime (the "mobile mode"
  // toggle). Clears any half-finished joystick/look gesture so nothing stays
  // pinned to a finger that is no longer down.
  setTouch(on) {
    this.isTouch = on;
    this._stick.id = null; this._stick.x = 0; this._stick.y = 0;
    this._lookPtr.id = null;
    if (this.ui.stickBase) this.ui.stickBase.style.display = 'none';
  }

  // The on-screen touch attack button always attacks, regardless of the
  // camera-mode mouse mapping. Kept separate from the raw mouse buttons.
  consumeAttack() {
    const a = this._attackQueued;
    this._attackQueued = false;
    return a;
  }

  // Raw left mouse button press (consumed once).
  consumeLeftClick() {
    const a = this._leftQueued;
    this._leftQueued = false;
    return a;
  }

  // Raw right mouse button press (consumed once).
  consumeRightClick() {
    const r = this._rightQueued;
    this._rightQueued = false;
    return r;
  }

  // The F key is a quick keyboard shortcut for the torch (the main way is to
  // double-click it in the fire equip slot). Independent of the mouse buttons.
  consumeToggleLight() {
    const v = this._lightToggleQueued;
    this._lightToggleQueued = false;
    return v;
  }

  _moveKnob(dx, dy) {
    this.ui.stickKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  }

  updateMove() {
    let x = 0, z = 0;
    const k = this.chatting ? new Set() : this.keys;
    const km = this.keymap;
    // A movement key counts if any held key maps to that action (primary or the
    // fixed arrow-key fallback).
    const held = (action) => { for (const c of k) if (km.isAction(action, c)) return true; return false; };
    if (held('forward')) z += 1;
    if (held('back')) z -= 1;
    if (held('left')) x -= 1;
    if (held('right')) x += 1;
    // Apply a deadzone + rescale so the joystick gives smooth full-range control
    // past the deadzone instead of an abrupt jump, and never drifts near centre.
    let sx = this._stick.x, sy = this._stick.y;
    const sm = Math.hypot(sx, sy);
    if (sm < STICK_DEADZONE) { sx = 0; sy = 0; }
    else {
      const scaled = (sm - STICK_DEADZONE) / (1 - STICK_DEADZONE) / sm;
      sx *= scaled; sy *= scaled;
    }
    x += sx;
    z += sy;
    const len = Math.hypot(x, z);
    if (len > 1) { x /= len; z /= len; }
    this.move.x = x;
    this.move.z = z;
    // on touch, pushing the joystick to its edge means sprint
    const stickMag = Math.hypot(sx, sy);
    this.sprint = k.has('ShiftLeft') || k.has('ShiftRight') || stickMag > 0.92;
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
