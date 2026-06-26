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
    this.launchCooldown = 0;
    this.zip = null;
    this.zipT = 0;
    this.zipSpeed = 0;
    this.zipCooldown = 0;
    this.gravityScale = 1; // bölüm başına (ay yürüyüşü vb.)
    this.gravityDir = 1; // +1 aşağı, -1 yukarı (ters çekim)
    this.flipCooldown = 0;
    // bakış hassasiyeti çarpanları (Ayarlar menüsünden ayarlanır, reset'te korunur)
    this.sensXMul = 1;
    this.sensYMul = 1;
    this.invertY = false;
  }

  reset(spawn) {
    this.position.copy(spawn);
    this.velocity.set(0, 0, 0);
    this.yaw = 0;
    this.pitch = 0;
    this.onGround = false;
    this.teleportCooldown = 0;
    this.zip = null;
    this.zipCooldown = 0;
    this.gravityDir = 1; // respawn'da yön sıfırlanır (gravityScale bölümden korunur)
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
    // delik yalnızca İKİ portal da açıkken geçilebilir (tek portal katı kalır)
    if (!portals.a.active || !portals.b.active) return false;
    for (const p of [portals.a, portals.b]) {
      if (p && p.active && p.open >= 0.4 && p.collider === collider && this._holeTest(p)) return true;
    }
    return false;
  }

  _aabbOverlap(box, c) {
    return (
      box.max.x > c.min.x && box.min.x < c.max.x &&
      box.max.y > c.min.y && box.min.y < c.max.y &&
      box.max.z > c.min.z && box.min.z < c.max.z
    );
  }

  // teleport sonrası: oyuncu çıkış yüzeyine gömülüyse onu çıkış normali
  // boyunca dışarı it (yukarı pop'layıp duvarın üstünde kalmayı önler)
  depenetrateAlong(normal, colliders, portals) {
    for (let it = 0; it < 12; it++) {
      const box = this._aabb(this.position);
      let hit = false;
      for (const c of colliders) {
        if (this._inPortalHole(c, portals)) continue;
        if (this._aabbOverlap(box, c)) { hit = true; break; }
      }
      if (!hit) return;
      this.position.addScaledVector(normal, 0.12);
    }
  }

  _collideAxis(axis, colliders, portals) {
    const box = this._aabb(this.position);
    for (const c of colliders) {
      if (c.disabled) continue;
      if (this._inPortalHole(c, portals)) continue;
      if (
        box.max.x > c.min.x && box.min.x < c.max.x &&
        box.max.y > c.min.y && box.min.y < c.max.y &&
        box.max.z > c.min.z && box.min.z < c.max.z
      ) {
        // küçük basamak çıkma: yatay eksende, normal çekimde, yalnızca DÜŞMÜYORKEN
        // (gerçek boşluğa düşerken çalışmaz -> hassas zıplama bozulmaz)
        if (axis !== "y" && this.gravityDir > 0 && this.velocity.y > -1.5) {
          const rise = c.max.y - this.position.y;
          if (rise > 0.001 && rise <= 0.45) {
            this.position.y = c.max.y + 0.001;
            this.onGround = true;
            box.min.y = this.position.y;
            box.max.y = this.position.y + HEIGHT;
            continue;
          }
        }
        const v = this.velocity[axis];
        if (v > 0) {
          const push = c.min[axis] - box.max[axis];
          this.position[axis] += push;
          if (axis === "y" && this.gravityDir < 0) this.onGround = true; // tavana indi (ters çekim)
        } else if (v < 0) {
          const push = c.max[axis] - box.min[axis];
          this.position[axis] += push;
          if (axis === "y" && this.gravityDir > 0) this.onGround = true; // zemine indi
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
    this.launchCooldown = Math.max(0, this.launchCooldown - dt);
    this.zipCooldown = Math.max(0, this.zipCooldown - dt);
    this.flipCooldown = Math.max(0, this.flipCooldown - dt);

    // bakış (hassasiyet ayarları uygulanır)
    this.yaw -= input.aimDX * SENS * this.sensXMul;
    this.pitch -= input.aimDY * SENS * this.sensYMul * (this.invertY ? -1 : 1);
    this.pitch = THREE.MathUtils.clamp(this.pitch, -1.45, 1.45);

    // zipline (iple kaymaca): tutunup kayma
    if (this.zip) {
      this.zipSpeed = Math.min(9, this.zipSpeed + 8 * dt);
      this.zipT += this.zipSpeed * dt;
      const t = Math.min(this.zipT, this.zip.length);
      const p = this.zip.a.clone().addScaledVector(this.zip.dir, t);
      this.position.set(p.x, p.y - 1.7, p.z); // teelden aşağı sarkar
      this.velocity.copy(this.zip.dir).multiplyScalar(this.zipSpeed);
      if (this.zipT >= this.zip.length || input.consumeJump()) {
        this.zip = null;
        this.zipCooldown = 0.6; // bırakınca hızla tekrar tutunmasın
      }
      return;
    }
    if (this.zipCooldown <= 0 && level.ziplines) {
      for (const z of level.ziplines) {
        const cl = z.closest(this.center);
        if (cl.dist < 1.4) {
          this.zip = z;
          this.zipT = cl.t;
          this.zipSpeed = Math.max(3, this.velocity.length());
          input.consumeJump();
          break;
        }
      }
    }

    // istenen yatay yön
    const fwd = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    const right = new THREE.Vector3(-Math.cos(this.yaw), 0, Math.sin(this.yaw));
    const wish = new THREE.Vector3();
    wish.addScaledVector(fwd, input.moveY);
    wish.addScaledVector(right, input.moveX);
    if (wish.lengthSq() > 1) wish.normalize();

    // yatay hızlanma / sürtünme
    const hv = new THREE.Vector3(this.velocity.x, 0, this.velocity.z);
    if (wish.lengthSq() > 0.001) {
      if (this.onGround) {
        hv.addScaledVector(wish, MOVE_ACCEL * dt);
        if (hv.length() > MAX_SPEED) hv.setLength(MAX_SPEED);
      } else {
        // HAVADA: girişle kazanılan hızı MAX_SPEED ile sınırla (Quake tarzı hava
        // kontrolü). Mevcut hız (fırlatma/portal momentumu) KORUNUR — yalnızca
        // wish yönünde MAX_SPEED'in ÜSTÜNE girişle çıkılamaz. Böylece havada
        // ileri tutarak sınırsız hızlanma (trambolin aşırı-uçuş) önlenir ama
        // fırlatma rampası / şaft momentumu bozulmaz.
        const cur = hv.dot(wish); // wish birim vektör
        const add = MAX_SPEED - cur;
        if (add > 0) hv.addScaledVector(wish, Math.min(AIR_ACCEL * dt, add));
      }
    } else if (this.onGround) {
      const drop = FRICTION * dt;
      const sp = hv.length();
      if (sp > 0) hv.multiplyScalar(Math.max(0, sp - drop) / sp);
    }
    this.velocity.x = hv.x;
    this.velocity.z = hv.z;

    // zıplama (yerçekimi yönüne ters)
    if (this.onGround && input.consumeJump()) {
      this.velocity.y = JUMP_V * this.gravityDir;
      this.onGround = false;
    }

    // yerçekimi (ölçek + yön)
    this.velocity.y -= GRAVITY * this.gravityScale * this.gravityDir * dt;

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
