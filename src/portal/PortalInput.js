// Birinci-şahıs birleşik girdi: masaüstü (pointer-lock fare + tıklama) ve mobil
// (sol joystick hareket, sağ sürükle bakış, dokunmatik butonlar).
export class PortalInput {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.aimDX = 0;
    this.aimDY = 0;
    this.locked = false;
    this.isTouch = matchMedia("(pointer: coarse)").matches || "ontouchstart" in window;

    // kenar-tetikli olaylar
    this._jump = false;
    this._portalA = false;
    this._portalB = false;

    // --- masaüstü ---
    addEventListener("keydown", (e) => {
      this.keys.add(e.code);
      if (e.code === "Space") this._jump = true;
    });
    addEventListener("keyup", (e) => this.keys.delete(e.code));
    document.addEventListener("pointerlockchange", () => {
      this.locked = document.pointerLockElement === canvas;
    });
    addEventListener("mousemove", (e) => {
      if (this.locked) {
        this.aimDX += e.movementX;
        this.aimDY += e.movementY;
      }
    });
    addEventListener("mousedown", (e) => {
      if (!this.locked) return;
      if (e.button === 0) this._portalA = true;
      if (e.button === 2) this._portalB = true;
    });
    addEventListener("contextmenu", (e) => e.preventDefault());

    // --- mobil ---
    this.joy = { active: false, id: null, baseX: 0, baseY: 0, dx: 0, dy: 0 };
    this.look = { active: false, id: null, lastX: 0, lastY: 0 };
    if (this.isTouch) this._initTouch();
  }

  _initTouch() {
    const joyEl = document.getElementById("joystick");
    const knobEl = document.getElementById("joy-knob");
    const RADIUS = 55;
    // sağ taraftaki dokunma butonları
    const bind = (id, setter) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener("touchstart", (e) => {
        e.preventDefault();
        e.stopPropagation();
        setter();
      }, { passive: false });
    };
    bind("btn-jump", () => (this._jump = true));
    bind("btn-portal-a", () => (this._portalA = true));
    bind("btn-portal-b", () => (this._portalB = true));

    const inButton = (t) => {
      const el = document.elementFromPoint(t.clientX, t.clientY);
      return el && el.classList && el.classList.contains("touch-btn");
    };

    const onStart = (e) => {
      for (const t of e.changedTouches) {
        if (inButton(t)) continue;
        const leftHalf = t.clientX < innerWidth * 0.5;
        if (leftHalf && !this.joy.active) {
          this.joy.active = true;
          this.joy.id = t.identifier;
          this.joy.baseX = t.clientX;
          this.joy.baseY = t.clientY;
          joyEl.style.left = t.clientX + "px";
          joyEl.style.top = t.clientY + "px";
          joyEl.classList.add("visible");
        } else if (!leftHalf && !this.look.active) {
          this.look.active = true;
          this.look.id = t.identifier;
          this.look.lastX = t.clientX;
          this.look.lastY = t.clientY;
        }
      }
    };
    const onMove = (e) => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        if (t.identifier === this.joy.id) {
          let dx = t.clientX - this.joy.baseX;
          let dy = t.clientY - this.joy.baseY;
          const len = Math.hypot(dx, dy);
          if (len > RADIUS) {
            dx = (dx / len) * RADIUS;
            dy = (dy / len) * RADIUS;
          }
          this.joy.dx = dx / RADIUS;
          this.joy.dy = dy / RADIUS;
          knobEl.style.transform = `translate(${dx}px, ${dy}px)`;
        } else if (t.identifier === this.look.id) {
          this.aimDX += (t.clientX - this.look.lastX) * 1.6;
          this.aimDY += (t.clientY - this.look.lastY) * 1.6;
          this.look.lastX = t.clientX;
          this.look.lastY = t.clientY;
        }
      }
    };
    const onEnd = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === this.joy.id) {
          this.joy.active = false;
          this.joy.id = null;
          this.joy.dx = this.joy.dy = 0;
          knobEl.style.transform = "translate(0,0)";
          joyEl.classList.remove("visible");
        } else if (t.identifier === this.look.id) {
          this.look.active = false;
          this.look.id = null;
        }
      }
    };
    const opts = { passive: false };
    this.canvas.addEventListener("touchstart", onStart, opts);
    this.canvas.addEventListener("touchmove", onMove, opts);
    this.canvas.addEventListener("touchend", onEnd, opts);
    this.canvas.addEventListener("touchcancel", onEnd, opts);
  }

  lock() {
    if (!this.isTouch) this.canvas.requestPointerLock?.();
  }
  endFrame() {
    this.aimDX = 0;
    this.aimDY = 0;
  }
  isDown(c) {
    return this.keys.has(c);
  }

  consumeJump() {
    const v = this._jump;
    this._jump = false;
    return v;
  }
  consumePortalA() {
    const v = this._portalA;
    this._portalA = false;
    return v;
  }
  consumePortalB() {
    const v = this._portalB;
    this._portalB = false;
    return v;
  }

  get moveX() {
    if (this.joy.active) return this.joy.dx;
    let x = 0;
    if (this.isDown("KeyD") || this.isDown("ArrowRight")) x += 1;
    if (this.isDown("KeyA") || this.isDown("ArrowLeft")) x -= 1;
    return x;
  }
  get moveY() {
    if (this.joy.active) return -this.joy.dy;
    let y = 0;
    if (this.isDown("KeyW") || this.isDown("ArrowUp")) y += 1;
    if (this.isDown("KeyS") || this.isDown("ArrowDown")) y -= 1;
    return y;
  }
}
