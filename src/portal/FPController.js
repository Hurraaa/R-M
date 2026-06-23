import * as THREE from "three";

const GRAVITY = 26;
const MOVE_ACCEL = 60;
const MAX_SPEED = 7;
const AIR_ACCEL = 12;
const JUMP_V = 9;
const FRICTION = 10;
const SENS = 0.0024;

const HX = 0.35; // yarı genişlik
const HEIGHT = 1.8;
const EYE = 1.6;

export class FPController {
  constructor() {
    this.position = new THREE.Vector3(); // ayak konumu
    this.velocity = new THREE.Vector3();
    this.yaw = 0;
    this.pitch = 0;
    this.onGround = false;
    this.teleportCooldown = 0;
  }

  reset(spawn) {
    this.position.copy(spawn);
    this.velocity.set(0, 0, 0);
    this.yaw = 0;
    this.pitch = 0;
    this.onGround = false;
    this.teleportCooldown = 0;
  }

  get eyePosition() {
    return new THREE.Vector3(this.position.x, this.position.y + EYE, this.position.z);
  }
  get center() {
    return new THREE.Vector3(this.position.x, this.position.y + HEIGHT * 0.5, this.position.z);
  }

  getForward() {
    const cp = Math.cos(this.pitch);
    return new THREE.Vector3(Math.sin(this.yaw) * cp, Math.sin(this.pitch), Math.cos(this.yaw) * cp);
  }

  setForward(f) {
    f = f.clone().normalize();
    this.yaw = Math.atan2(f.x, f.z);
    this.pitch = Math.asin(THREE.MathUtils.clamp(f.y, -1, 1));
  }

  _aabb(pos) {
    return {
      min: new THREE.Vector3(pos.x - HX, pos.y, pos.z - HX),
      max: new THREE.Vector3(pos.x + HX, pos.y + HEIGHT, pos.z + HX),
    };
  }

  // bu portalın deliğinde mi?
  _holeTest(p) {
    const c = this.center;
    const rel = new THREE.Vector3().subVectors(c, p.position);
    const along = rel.dot(p.normal);
    const planar = rel.clone().addScaledVector(p.normal, -along).length();
    return planar < p.radius * 0.95 && Math.abs(along) < 2.5;
  }

  // bu yüzeyde, oyuncunun içinde olduğu AKTİF bir portal var mı?
  // (aynı yüzeye iki portal da açılabilir — ikisini de kontrol et)
  _inPortalHole(collider, portals) {
    if (!portals) return false;
    for (const p of [portals.a, portals.b]) {
      if (p && p.active && p.open >= 0.4 && p.collider === collider && this._holeTest(p)) return true;
    }
    return false;
  }

  _collideAxis(axis, colliders, portals) {
    const box = this._aabb(this.position);
    for (const c of colliders) {
      if (this._inPortalHole(c, portals)) continue;
      if (
        box.max.x > c.min.x && box.min.x < c.max.x &&
        box.max.y > c.min.y && box.min.y < c.max.y &&
        box.max.z > c.min.z && box.min.z < c.max.z
      ) {
        const v = this.velocity[axis];
        if (v > 0) {
          const push = c.min[axis] - box.max[axis];
          this.position[axis] += push;
        } else if (v < 0) {
          const push = c.max[axis] - box.min[axis];
          this.position[axis] += push;
          if (axis === "y") this.onGround = true;
        }
        this.velocity[axis] = 0;
        // kutuyu güncelle
        box.min[axis] = this.position[axis] + (axis === "y" ? 0 : -HX);
        box.max[axis] = this.position[axis] + (axis === "y" ? HEIGHT : HX);
      }
    }
  }

  update(dt, input, level, portals) {
    this.teleportCooldown = Math.max(0, this.teleportCooldown - dt);

    // bakış
    this.yaw -= input.aimDX * SENS;
    this.pitch -= input.aimDY * SENS;
    this.pitch = THREE.MathUtils.clamp(this.pitch, -1.45, 1.45);

    // istenen yatay yön
    const fwd = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    const right = new THREE.Vector3(-Math.cos(this.yaw), 0, Math.sin(this.yaw));
    const wish = new THREE.Vector3();
    wish.addScaledVector(fwd, input.moveY);
    wish.addScaledVector(right, input.moveX);
    if (wish.lengthSq() > 1) wish.normalize();

    // yatay hızlanma / sürtünme
    const accel = this.onGround ? MOVE_ACCEL : AIR_ACCEL;
    const hv = new THREE.Vector3(this.velocity.x, 0, this.velocity.z);
    if (wish.lengthSq() > 0.001) {
      hv.addScaledVector(wish, accel * dt);
      if (hv.length() > MAX_SPEED && this.onGround) hv.setLength(MAX_SPEED);
    } else if (this.onGround) {
      const drop = FRICTION * dt;
      const sp = hv.length();
      if (sp > 0) hv.multiplyScalar(Math.max(0, sp - drop) / sp);
    }
    this.velocity.x = hv.x;
    this.velocity.z = hv.z;

    // zıplama
    if (this.onGround && input.consumeJump()) {
      this.velocity.y = JUMP_V;
      this.onGround = false;
    }

    // yerçekimi
    this.velocity.y -= GRAVITY * dt;

    // eksen-eksen entegrasyon + çarpışma
    this.onGround = false;
    this.position.x += this.velocity.x * dt;
    this._collideAxis("x", level.colliders, portals);
    this.position.z += this.velocity.z * dt;
    this._collideAxis("z", level.colliders, portals);
    this.position.y += this.velocity.y * dt;
    this._collideAxis("y", level.colliders, portals);

    // boşluğa düşersek spawn'a dön
    if (this.position.y < -40) this.reset(level.spawn);
  }
}
