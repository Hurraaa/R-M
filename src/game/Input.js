// Birleşik girdi: masaüstü (klavye + fare + pointer-lock) ve mobil (dokunmatik).
// Oyuna analog bir arayüz sunar:
//   moveX / moveY   -> hareket vektörü (-1..1), y ileri
//   aimDX           -> bu kare içindeki yatay nişan değişimi (piksel)
//   firing          -> ateş ediliyor mu
//   running         -> koşuyor mu
export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.aimDX = 0;
    this.firing = false;
    this.locked = false;

    this.isTouch = matchMedia("(pointer: coarse)").matches || "ontouchstart" in window;

    // --- masaüstü ---
    addEventListener("keydown", (e) => this.keys.add(e.code));
    addEventListener("keyup", (e) => this.keys.delete(e.code));

    document.addEventListener("pointerlockchange", () => {
      this.locked = document.pointerLockElement === canvas;
    });
    addEventListener("mousemove", (e) => {
      if (this.locked) this.aimDX += e.movementX;
    });
    addEventListener("mousedown", (e) => {
      if (this.locked && e.button === 0) this.firing = true;
    });
    addEventListener("mouseup", (e) => {
      if (e.button === 0) this.firing = false;
    });

    // --- mobil ---
    this.joy = { active: false, id: null, baseX: 0, baseY: 0, dx: 0, dy: 0 };
    this.aim = { active: false, id: null, lastX: 0 };
    if (this.isTouch) this._initTouch();
  }

  _initTouch() {
    const joyEl = document.getElementById("joystick");
    const knobEl = document.getElementById("joy-knob");
    const RADIUS = 55;

    const onStart = (e) => {
      for (const t of e.changedTouches) {
        const leftHalf = t.clientX < innerWidth * 0.5;
        if (leftHalf && !this.joy.active) {
          this.joy.active = true;
          this.joy.id = t.identifier;
          this.joy.baseX = t.clientX;
          this.joy.baseY = t.clientY;
          this.joy.dx = this.joy.dy = 0;
          joyEl.style.left = t.clientX + "px";
          joyEl.style.top = t.clientY + "px";
          joyEl.classList.add("visible");
        } else if (!leftHalf && !this.aim.active) {
          this.aim.active = true;
          this.aim.id = t.identifier;
          this.aim.lastX = t.clientX;
          this.firing = true; // sağ tarafa dokunmak = ateş
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
        } else if (t.identifier === this.aim.id) {
          this.aimDX += t.clientX - this.aim.lastX;
          this.aim.lastX = t.clientX;
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
        } else if (t.identifier === this.aim.id) {
          this.aim.active = false;
          this.aim.id = null;
          this.firing = false;
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
  }

  isDown(code) {
    return this.keys.has(code);
  }

  // birleşik hareket vektörü
  get moveX() {
    if (this.joy.active) return this.joy.dx;
    let x = 0;
    if (this.isDown("KeyD") || this.isDown("ArrowRight")) x += 1;
    if (this.isDown("KeyA") || this.isDown("ArrowLeft")) x -= 1;
    return x;
  }
  get moveY() {
    if (this.joy.active) return -this.joy.dy; // yukarı = ileri
    let y = 0;
    if (this.isDown("KeyW") || this.isDown("ArrowUp")) y += 1;
    if (this.isDown("KeyS") || this.isDown("ArrowDown")) y -= 1;
    return y;
  }
  get running() {
    if (this.joy.active) return Math.hypot(this.joy.dx, this.joy.dy) > 0.85;
    return this.isDown("ShiftLeft") || this.isDown("ShiftRight");
  }
}
