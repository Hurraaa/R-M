import * as THREE from "three";

// İnteraktif nesneler: yük küpü, basınç butonu, kapı.
// Küp yerçekimliдir, portaldan geçer, butona ağırlık yapar.

const EDGE = () => new THREE.LineBasicMaterial({ color: 0x20140a });

export class Cube {
  constructor(pos, size = 1.2) {
    this.size = size;
    this.half = size / 2;
    this.pos = pos.clone(); // merkez
    this.spawn = pos.clone();
    this.velocity = new THREE.Vector3();
    this.lastCenter = pos.clone();
    this.teleportCooldown = 0;
    this.launchCooldown = 0;
    this.onGround = false;

    const mat = new THREE.MeshStandardMaterial({ color: 0xd1812f, emissive: 0x281204, emissiveIntensity: 0.5, roughness: 0.6, metalness: 0.2 });
    this.mesh = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), mat);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(this.mesh.geometry), EDGE());
    this.mesh.add(edges);
    // kübist vurgu: yüzlerde küçük teal kare
    const decal = new THREE.Mesh(new THREE.PlaneGeometry(size * 0.4, size * 0.4), new THREE.MeshStandardMaterial({ color: 0x3fd0c0, emissive: 0x1c6a64, emissiveIntensity: 0.7 }));
    decal.position.z = this.half + 0.01;
    this.mesh.add(decal);
    this.mesh.position.copy(pos);

    this.collider = { min: new THREE.Vector3(), max: new THREE.Vector3(), portalable: false, dynamic: true, cube: this };
    this._sync();
  }

  get center() { return this.pos.clone(); }
  setCenter(v) { this.pos.copy(v); }
  _sync() {
    this.collider.min.set(this.pos.x - this.half, this.pos.y - this.half, this.pos.z - this.half);
    this.collider.max.set(this.pos.x + this.half, this.pos.y + this.half, this.pos.z + this.half);
  }
  _aabb() {
    return { min: new THREE.Vector3(this.pos.x - this.half, this.pos.y - this.half, this.pos.z - this.half),
             max: new THREE.Vector3(this.pos.x + this.half, this.pos.y + this.half, this.pos.z + this.half) };
  }
  _inHole(c, portals) {
    if (!portals || !portals.a.active || !portals.b.active) return false;
    for (const p of [portals.a, portals.b]) {
      if (p.active && p.open >= 0.4 && p.collider === c) {
        const rel = this.pos.clone().sub(p.position);
        const along = rel.dot(p.normal);
        const planar = rel.addScaledVector(p.normal, -along).length();
        if (planar < p.radius * 0.85 && Math.abs(along) < 2.5) return true;
      }
    }
    return false;
  }
  _collideAxis(axis, colliders, portals) {
    const box = this._aabb();
    for (const c of colliders) {
      if (c === this.collider || c.dynamic || c.disabled) continue;
      if (this._inHole(c, portals)) continue;
      if (box.max.x > c.min.x && box.min.x < c.max.x && box.max.y > c.min.y && box.min.y < c.max.y && box.max.z > c.min.z && box.min.z < c.max.z) {
        const v = this.velocity[axis];
        if (v > 0) this.pos[axis] += c.min[axis] - box.max[axis];
        else if (v < 0) { this.pos[axis] += c.max[axis] - box.min[axis]; if (axis === "y") this.onGround = true; }
        this.velocity[axis] = 0;
        box.min[axis] = this.pos[axis] - this.half;
        box.max[axis] = this.pos[axis] + this.half;
      }
    }
  }
  depenetrateAlong(normal, colliders, portals) {
    for (let it = 0; it < 12; it++) {
      const box = this._aabb();
      let hit = false;
      for (const c of colliders) {
        if (c === this.collider || c.dynamic || c.disabled) continue;
        if (this._inHole(c, portals)) continue;
        if (box.max.x > c.min.x && box.min.x < c.max.x && box.max.y > c.min.y && box.min.y < c.max.y && box.max.z > c.min.z && box.min.z < c.max.z) { hit = true; break; }
      }
      if (!hit) return;
      this.pos.addScaledVector(normal, 0.12);
    }
  }
  update(dt, level, portals) {
    this.teleportCooldown = Math.max(0, this.teleportCooldown - dt);
    this.launchCooldown = Math.max(0, this.launchCooldown - dt);
    // yere değince güçlü sürtünme (tahmin edilebilir iniş), havada hafif
    const fr = this.onGround ? 0.6 : 0.999;
    this.velocity.x *= fr;
    this.velocity.z *= fr;
    this.velocity.y -= 26 * dt;
    this.onGround = false;
    this.pos.x += this.velocity.x * dt; this._collideAxis("x", level.colliders, portals);
    this.pos.z += this.velocity.z * dt; this._collideAxis("z", level.colliders, portals);
    this.pos.y += this.velocity.y * dt; this._collideAxis("y", level.colliders, portals);
    if (this.pos.y < -50) { this.pos.copy(this.spawn); this.velocity.set(0, 0, 0); this.lastCenter.copy(this.pos); }
    this.mesh.position.copy(this.pos);
    this._sync();
  }
}

// Fırlatma rampası (faith plate): üstüne gelen oyuncu/küpü sabit hızla fırlatır.
export class LaunchPad {
  constructor(pos, velocity) {
    this.pos = pos.clone();
    this.radius = 1.6;
    this.vel = velocity.clone();
    this.group = new THREE.Group();
    this.group.position.copy(pos);
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(1.6, 1.75, 0.25, 6),
      new THREE.MeshStandardMaterial({ color: 0x2a6f7a, emissive: 0x1aa0b0, emissiveIntensity: 0.7, roughness: 0.4, metalness: 0.3 })
    );
    base.position.y = 0.12;
    const arrow = new THREE.Mesh(
      new THREE.ConeGeometry(0.5, 1.1, 5),
      new THREE.MeshStandardMaterial({ color: 0x9cffe0, emissive: 0x3fd0c0, emissiveIntensity: 1.1 })
    );
    arrow.position.y = 0.7;
    this.group.add(base, arrow);
  }
  tryLaunch(e) {
    if (e.launchCooldown > 0) return;
    const c = e.center;
    if (Math.hypot(c.x - this.pos.x, c.z - this.pos.z) < this.radius && c.y < this.pos.y + 1.9 && c.y > this.pos.y - 0.6 && e.velocity.y <= 3) {
      e.velocity.copy(this.vel);
      e.launchCooldown = 0.7;
      e.onGround = false;
    }
  }
}

// Zipline (iple kaymaca): iki direk arası gerili tel; oyuncu tutunup kayar.
export class Zipline {
  constructor(a, b) {
    this.a = a.clone();
    this.b = b.clone();
    this.dir = new THREE.Vector3().subVectors(b, a);
    this.length = this.dir.length();
    this.dir.normalize();

    this.group = new THREE.Group();
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const cable = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, this.length, 6),
      new THREE.MeshStandardMaterial({ color: 0x2a2a30, roughness: 0.6, metalness: 0.7 })
    );
    cable.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), this.dir);
    cable.position.copy(mid);
    this.group.add(cable);
    // direkler
    const postMat = new THREE.MeshStandardMaterial({ color: 0x5a5f6a, roughness: 0.7, metalness: 0.4 });
    for (const e of [a, b]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, e.y + 0.5, 8), postMat);
      post.position.set(e.x, (e.y + 0.5) / 2 - 0.5, e.z);
      post.castShadow = true;
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 10), new THREE.MeshStandardMaterial({ color: 0x9cffe0, emissive: 0x3fd0c0, emissiveIntensity: 0.9 }));
      knob.position.copy(e);
      this.group.add(post, knob);
    }
  }
  // noktaya en yakın kablo noktası
  closest(point) {
    const ap = new THREE.Vector3().subVectors(point, this.a);
    let t = ap.dot(this.dir);
    t = Math.max(0, Math.min(this.length, t));
    const pos = this.a.clone().addScaledVector(this.dir, t);
    return { t, dist: pos.distanceTo(point), pos };
  }
}

// Trambolin: üstüne düşeni yukarı sektirir (yatay hız korunur -> havada yönlendir).
export class BouncePad {
  constructor(pos, bounceVy = 18) {
    this.pos = pos.clone();
    this.radius = 1.8;
    this.bounceVy = bounceVy;
    this.group = new THREE.Group();
    this.group.position.copy(pos);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.9, 0.2, 24), new THREE.MeshStandardMaterial({ color: 0x4a2f5c, roughness: 0.6, metalness: 0.2 }));
    base.position.y = 0.1;
    const top = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.55, 0.12, 24), new THREE.MeshStandardMaterial({ color: 0xff5ad0, emissive: 0x7d1a64, emissiveIntensity: 0.8, roughness: 0.3 }));
    top.position.y = 0.24;
    this.top = top;
    this.group.add(base, top);
    this.flash = 0;
  }
  tryBounce(e) {
    if (e.launchCooldown > 0) return;
    const c = e.center;
    if (Math.hypot(c.x - this.pos.x, c.z - this.pos.z) < this.radius && c.y < this.pos.y + 1.9 && c.y > this.pos.y - 0.6 && e.velocity.y <= 1) {
      e.velocity.y = this.bounceVy;
      e.launchCooldown = 0.15;
      e.onGround = false;
      this.flash = 1;
    }
  }
  update(dt) {
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 4);
    this.top.scale.y = 1 - this.flash * 0.5;
    this.top.material.emissiveIntensity = 0.8 + this.flash * 1.5;
  }
}

// Enerji topu: yerçekimsiz, sabit hızda uçar, duvarlardan seker, portaldan geçer.
export class Ball {
  constructor(pos, vel) {
    this.r = 0.4;
    this.pos = pos.clone();
    this.velocity = vel.clone();
    this.lastCenter = pos.clone();
    this.teleportCooldown = 0;
    this.life = 8;
    this.dead = false;
    this.mesh = new THREE.Mesh(
      new THREE.SphereGeometry(this.r, 14, 14),
      new THREE.MeshStandardMaterial({ color: 0xaef6ff, emissive: 0x46e6ff, emissiveIntensity: 2.2, roughness: 0.2 })
    );
    this.mesh.position.copy(pos);
    this.light = new THREE.PointLight(0x46e6ff, 2.5, 8, 2);
    this.mesh.add(this.light);
  }
  get center() { return this.pos.clone(); }
  setCenter(v) { this.pos.copy(v); }
  _inHole(c, portals) {
    if (!portals || !portals.a.active || !portals.b.active) return false;
    for (const p of [portals.a, portals.b]) {
      if (p.active && p.open >= 0.4 && p.collider === c) {
        const rel = this.pos.clone().sub(p.position);
        const along = rel.dot(p.normal);
        const planar = rel.addScaledVector(p.normal, -along).length();
        if (planar < p.radius * 0.9 && Math.abs(along) < 2.5) return true;
      }
    }
    return false;
  }
  update(dt, level, portals) {
    this.teleportCooldown = Math.max(0, this.teleportCooldown - dt);
    this.life -= dt;
    if (this.life <= 0) { this.dead = true; return; }
    this.pos.addScaledVector(this.velocity, dt);
    for (const c of level.colliders) {
      if (c.disabled || c.dynamic) continue;
      if (this._inHole(c, portals)) continue;
      const cx = Math.max(c.min.x, Math.min(this.pos.x, c.max.x));
      const cy = Math.max(c.min.y, Math.min(this.pos.y, c.max.y));
      const cz = Math.max(c.min.z, Math.min(this.pos.z, c.max.z));
      const dx = this.pos.x - cx, dy = this.pos.y - cy, dz = this.pos.z - cz;
      const d2 = dx * dx + dy * dy + dz * dz;
      if (d2 < this.r * this.r) {
        if (c.destructible) { c.destructible.hit(); this.dead = true; return; } // sütunu patlat
        let n;
        if (d2 > 1e-8) { const d = Math.sqrt(d2); n = new THREE.Vector3(dx / d, dy / d, dz / d); this.pos.set(cx, cy, cz).addScaledVector(n, this.r); }
        else { n = new THREE.Vector3(0, 1, 0); }
        const vn = this.velocity.dot(n);
        if (vn < 0) this.velocity.addScaledVector(n, -2 * vn); // yansıt
      }
    }
    this.mesh.position.copy(this.pos);
  }
}

export class BallEmitter {
  constructor(pos, dir, speed = 12) {
    this.pos = pos.clone();
    this.dir = dir.clone().normalize();
    this.speed = speed;
    this.timer = 0.5;
    const g = new THREE.Group();
    g.position.copy(pos);
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 0.6, 12), new THREE.MeshStandardMaterial({ color: 0x3a3f4a, metalness: 0.6, roughness: 0.4 })));
    this.group = g;
  }
  spawn() { return new Ball(this.pos.clone().addScaledVector(this.dir, 0.8), this.dir.clone().multiplyScalar(this.speed)); }
}

export class Receptacle {
  constructor(pos, door, emitter = null) {
    this.pos = pos.clone();
    this.radius = 1.0;
    this.door = door;
    this.emitter = emitter; // doldurulunca bu yayıcıyı durdurur (engel barajını kapat)
    this.active = false;
    this.group = new THREE.Group();
    this.group.position.copy(pos);
    this.ring = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.16, 10, 24), new THREE.MeshStandardMaterial({ color: 0x886a3a, emissive: 0x3a2a10, emissiveIntensity: 0.5, roughness: 0.5, metalness: 0.4 }));
    this.group.add(this.ring);
  }
  check(balls) {
    if (this.active) return;
    for (const b of balls) {
      if (!b.dead && b.pos.distanceTo(this.pos) < this.radius + b.r) {
        this.active = true;
        b.dead = true;
        if (this.door) this.door.setOpen(true);
        if (this.emitter) this.emitter.disabled = true; // barajı kapat
        this.ring.material.color.setHex(0x6ee84f);
        this.ring.material.emissive.setHex(0x2f9a3e);
        this.ring.material.emissiveIntensity = 1.4;
        break;
      }
    }
  }
}

// Hareketli platform (Harry Potter merdiveni tarzı): bir eksende gidip gelir,
// üstündeki oyuncuyu taşır.
export class MovingPlatform {
  constructor(min, max, axis, amp, speed, phase = 0) {
    this.half = new THREE.Vector3().subVectors(max, min).multiplyScalar(0.5);
    this.center0 = new THREE.Vector3().addVectors(min, max).multiplyScalar(0.5);
    this.axis = axis.clone().normalize();
    this.amp = amp;
    this.speed = speed;
    this.t = phase;
    const size = new THREE.Vector3().subVectors(max, min);
    this.mesh = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), new THREE.MeshStandardMaterial({ color: 0x6a6f7a, roughness: 0.6, metalness: 0.3, flatShading: true }));
    this.mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(this.mesh.geometry), new THREE.LineBasicMaterial({ color: 0x20242c })));
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.collider = { min: new THREE.Vector3(), max: new THREE.Vector3(), portalable: false };
    this.delta = new THREE.Vector3();
    this.prev = this.center0.clone();
    this._apply();
  }
  _apply() {
    const c = this.center0.clone().addScaledVector(this.axis, Math.sin(this.t) * this.amp);
    this.delta.subVectors(c, this.prev);
    this.prev.copy(c);
    this.mesh.position.copy(c);
    this.collider.min.set(c.x - this.half.x, c.y - this.half.y, c.z - this.half.z);
    this.collider.max.set(c.x + this.half.x, c.y + this.half.y, c.z + this.half.z);
  }
  update(dt) {
    this.t += dt * this.speed;
    this._apply();
  }
}

// Tuş takımı: numaralı basınç plakaları; doğru sırada basılınca kapı açılır.
function numTexture(n) {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const x = c.getContext("2d");
  x.fillStyle = "#0c1016";
  x.fillRect(0, 0, 128, 128);
  x.fillStyle = "#bfe8ff";
  x.font = "bold 96px sans-serif";
  x.textAlign = "center";
  x.textBaseline = "middle";
  x.fillText(String(n), 64, 70);
  return new THREE.CanvasTexture(c);
}

export class Keypad {
  constructor(code, door) {
    this.code = code.slice();
    this.door = door;
    this.seq = [];
    this.plates = [];
    this.solved = false;
  }
  addPlate(value, pos) {
    const g = new THREE.Group();
    g.position.copy(pos);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.85, 0.2, 18), new THREE.MeshStandardMaterial({ color: 0x3a3f4a, metalness: 0.4, roughness: 0.5 }));
    base.position.y = 0.1;
    let label;
    if (typeof document !== "undefined") {
      label = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.0), new THREE.MeshBasicMaterial({ map: numTexture(value), transparent: true }));
    } else {
      label = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0x6688aa }));
    }
    label.rotation.x = -Math.PI / 2;
    label.position.y = 0.22;
    g.add(base, label);
    this.plates.push({ value, pos: pos.clone(), radius: 0.85, on: false, base });
    return g;
  }
  update(player) {
    if (this.solved) return;
    for (const p of this.plates) {
      const on = Math.hypot(player.position.x - p.pos.x, player.position.z - p.pos.z) < p.radius && Math.abs(player.position.y - p.pos.y) < 1.3;
      if (on && !p.on) {
        this.seq.push(p.value);
        if (this.seq.length > this.code.length) this.seq.shift();
        p.base.material.emissive = new THREE.Color(0x2f9a3e);
        p.base.material.emissiveIntensity = 1.0;
        if (this.seq.length === this.code.length && this.code.every((v, i) => v === this.seq[i])) {
          this.solved = true;
          if (this.door) this.door.setOpen(true);
        }
      }
      p.on = on;
    }
  }
}

// Su asansörü: güç verilince (çarklar döner) su yükselir, platform da yükselir.
export class WaterLift {
  constructor(min, max, topY, speed = 1.3) {
    this.half = new THREE.Vector3().subVectors(max, min).multiplyScalar(0.5);
    this.cx = (min.x + max.x) / 2;
    this.cz = (min.z + max.z) / 2;
    this.baseY = (min.y + max.y) / 2;
    this.topY = topY;
    this.y = this.baseY;
    this.waterY = this.baseY; // su seviyesi (görsel, güçle hemen yükselir)
    this.powered = false;
    this.speed = speed;
    const size = new THREE.Vector3().subVectors(max, min);

    this.group = new THREE.Group();
    this.platform = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), new THREE.MeshStandardMaterial({ color: 0x6a6f7a, roughness: 0.6, metalness: 0.3, flatShading: true }));
    this.platform.castShadow = true;
    this.platform.receiveShadow = true;
    // su (yarı saydam mavi), tabandan platforma kadar yükselir
    this.water = new THREE.Mesh(new THREE.BoxGeometry(size.x * 1.6, 1, size.z * 1.6), new THREE.MeshStandardMaterial({ color: 0x2f8fd0, transparent: true, opacity: 0.55, roughness: 0.2 }));
    this.group.add(this.platform, this.water);

    // çarklar (yan duvarda dönen tekerlekler)
    this.gears = [];
    for (let i = 0; i < 2; i++) {
      const gear = new THREE.Group();
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.18, 8, 16), new THREE.MeshStandardMaterial({ color: 0x8a7a4a, metalness: 0.6, roughness: 0.5 }));
      gear.add(rim);
      for (let s = 0; s < 6; s++) {
        const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.6, 0.12), new THREE.MeshStandardMaterial({ color: 0x6a5f3a }));
        spoke.rotation.z = (s / 6) * Math.PI;
        gear.add(spoke);
      }
      gear.position.set(this.cx + (i ? 2.4 : -2.4), this.topY + 1.5, this.cz - this.half.z - 0.3);
      this.group.add(gear);
      this.gears.push(gear);
    }

    this.collider = { min: new THREE.Vector3(), max: new THREE.Vector3(), portalable: false };
    this._apply();
  }
  setOpen(p) { this.powered = p; } // Button bunu çağırır
  _apply() {
    this.platform.position.set(this.cx, this.y, this.cz);
    this.collider.min.set(this.cx - this.half.x, this.y - this.half.y, this.cz - this.half.z);
    this.collider.max.set(this.cx + this.half.x, this.y + this.half.y, this.cz + this.half.z);
    const wh = (this.waterY - this.baseY) + 1; // su seviyesine göre
    this.water.scale.y = wh;
    this.water.position.set(this.cx, this.baseY - 0.5 + wh / 2, this.cz);
  }
  update(dt, occupied) {
    // SU: güç gelince hemen yükselir (görsel geri bildirim)
    const wt = this.powered ? this.topY : this.baseY;
    this.waterY += Math.sign(wt - this.waterY) * Math.min(Math.abs(wt - this.waterY), 1.6 * dt);
    // PLATFORM: güç + üstünde biri varsa yükselir (binince taşır, kaçırmazsın)
    const pt = this.powered && occupied ? this.topY : this.baseY;
    if (this.y < pt) this.y = Math.min(pt, this.y + this.speed * dt);
    else this.y = Math.max(pt, this.y - this.speed * dt);
    this._apply();
    if (this.powered) for (const g of this.gears) g.rotation.z += dt * 3;
  }
}

// Yerçekimi-ters pad'i: üstüne gelince yerçekimini ters çevirir (tavana düşersin).
export class FlipPad {
  constructor(pos) {
    this.pos = pos.clone();
    this.radius = 1.7;
    this.group = new THREE.Group();
    this.group.position.copy(pos);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.7, 0.18, 20), new THREE.MeshStandardMaterial({ color: 0x4a2f6a, emissive: 0x6a2fae, emissiveIntensity: 0.7, roughness: 0.4 }));
    const arrow = new THREE.Mesh(new THREE.OctahedronGeometry(0.6, 0), new THREE.MeshStandardMaterial({ color: 0xc89cff, emissive: 0x9c5cff, emissiveIntensity: 1.0 }));
    arrow.position.y = 0.5;
    this.group.add(base, arrow);
  }
  tryFlip(ctrl) {
    if (ctrl.flipCooldown > 0) return;
    const p = ctrl.position;
    if (Math.hypot(p.x - this.pos.x, p.z - this.pos.z) < this.radius && Math.abs(p.y - this.pos.y) < 2.4) {
      ctrl.gravityDir *= -1;
      ctrl.flipCooldown = 0.8;
      ctrl.onGround = false;
    }
  }
}

// Yıkılabilir sütun: enerji topu çarpınca patlar (parçalara ayrılıp kaybolur).
export class Destructible {
  constructor(min, max, color = 0xff6a4a) {
    const size = new THREE.Vector3().subVectors(max, min);
    this.center = new THREE.Vector3().addVectors(min, max).multiplyScalar(0.5);
    this.mat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.35, roughness: 0.4, metalness: 0.2 });
    this.mesh = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), this.mat);
    this.mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(this.mesh.geometry), new THREE.LineBasicMaterial({ color: 0x3a1208 })));
    this.mesh.position.copy(this.center);
    this.mesh.castShadow = true;
    this.group = new THREE.Group();
    this.group.add(this.mesh);
    this.collider = { min: min.clone(), max: max.clone(), portalable: false, destructible: this };
    this.size = size;
    this.fragments = [];
    this.breaking = false;
    this.t = 0;
    this.dead = false;
  }
  hit() {
    if (this.dead) return;
    this.dead = true;
    this.collider.disabled = true;
    this.mesh.visible = false;
    this.breaking = true;
    if (this.door) this.door.setOpen(true);
    for (let i = 0; i < 16; i++) {
      const m = this.mat.clone();
      m.transparent = true;
      const f = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), m);
      f.position.copy(this.center).add(new THREE.Vector3((Math.random() - 0.5) * this.size.x, (Math.random() - 0.5) * this.size.y, (Math.random() - 0.5) * this.size.z));
      f.userData.vel = new THREE.Vector3((Math.random() - 0.5) * 8, Math.random() * 7 + 1, (Math.random() - 0.5) * 8);
      this.group.add(f);
      this.fragments.push(f);
    }
  }
  update(dt) {
    if (!this.breaking) return;
    this.t += dt;
    for (const f of this.fragments) {
      f.userData.vel.y -= 22 * dt;
      f.position.addScaledVector(f.userData.vel, dt);
      f.rotation.x += dt * 5;
      f.rotation.y += dt * 4;
      f.material.opacity = Math.max(0, 1 - this.t * 1.1);
    }
    if (this.t > 1.0) {
      for (const f of this.fragments) this.group.remove(f);
      this.fragments = [];
      this.breaking = false;
    }
  }
}

// Hareket-sensörlü füze: oyuncuyu takip eder, portaldan geçer; çekirdeğe
// çarparsa onu patlatır, oyuncuya çarparsa oyuncu başa döner.
export class Missile {
  constructor(pos, dir, speed = 8) {
    this.r = 0.35;
    this.pos = pos.clone();
    this.speed = speed;
    this.velocity = dir.clone().normalize().multiplyScalar(speed);
    this.lastCenter = pos.clone();
    this.teleportCooldown = 0;
    this.life = 8;
    this.dead = false;
    this.hitPlayer = false;
    this.mesh = new THREE.Mesh(
      new THREE.ConeGeometry(0.22, 0.9, 10),
      new THREE.MeshStandardMaterial({ color: 0xff5a4a, emissive: 0xff3a2a, emissiveIntensity: 1.6, roughness: 0.4 })
    );
    this.mesh.position.copy(pos);
    this.light = new THREE.PointLight(0xff5a3a, 2, 6, 2);
    this.mesh.add(this.light);
  }
  get center() { return this.pos.clone(); }
  setCenter(v) { this.pos.copy(v); }
  _inHole(c, portals) {
    if (!portals || !portals.a.active || !portals.b.active) return false;
    for (const p of [portals.a, portals.b]) {
      if (p.active && p.open >= 0.4 && p.collider === c) {
        const rel = this.pos.clone().sub(p.position);
        const along = rel.dot(p.normal);
        const planar = rel.addScaledVector(p.normal, -along).length();
        if (planar < p.radius * 0.9 && Math.abs(along) < 2.5) return true;
      }
    }
    return false;
  }
  update(dt, level, portals, target) {
    this.teleportCooldown = Math.max(0, this.teleportCooldown - dt);
    this.life -= dt;
    if (this.life <= 0) { this.dead = true; return; }
    // takip: yönü oyuncuya doğru sınırlı dönüş hızıyla çevir
    const desired = new THREE.Vector3().subVectors(target, this.pos).normalize();
    const cur = this.velocity.clone().normalize();
    cur.lerp(desired, Math.min(1, (this._turnRate ?? 0.7) * dt)).normalize(); // yumuşak takip: keskin kaçışı izleyemez
    this.velocity.copy(cur).multiplyScalar(this.speed);
    this.pos.addScaledVector(this.velocity, dt);
    this.mesh.position.copy(this.pos);
    this.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), cur);
    // çekirdek / duvar çarpışması
    for (const c of level.colliders) {
      if (c.disabled || c.dynamic) continue;
      if (this._inHole(c, portals)) continue;
      const cx = Math.max(c.min.x, Math.min(this.pos.x, c.max.x));
      const cy = Math.max(c.min.y, Math.min(this.pos.y, c.max.y));
      const cz = Math.max(c.min.z, Math.min(this.pos.z, c.max.z));
      const dx = this.pos.x - cx, dy = this.pos.y - cy, dz = this.pos.z - cz;
      if (dx * dx + dy * dy + dz * dz < this.r * this.r) {
        if (c.destructible) c.destructible.hit();
        this.dead = true;
        return;
      }
    }
    // oyuncuya çarpma
    if (this.pos.distanceTo(target) < 0.9) { this.dead = true; this.hitPlayer = true; }
  }
}

export class MissileLauncher {
  constructor(pos, speed = 8) {
    this.pos = pos.clone();
    this.speed = speed;
    this.timer = 1.0;
    const g = new THREE.Group();
    g.position.copy(pos);
    g.add(new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.0, 1.0), new THREE.MeshStandardMaterial({ color: 0x33373f, metalness: 0.6, roughness: 0.4 })));
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 1.2, 10), new THREE.MeshStandardMaterial({ color: 0x55202a, emissive: 0x5a1010, emissiveIntensity: 0.5 })));
    this.group = g;
  }
  spawn(target) {
    const dir = new THREE.Vector3().subVectors(target, this.pos).normalize();
    const m = new Missile(this.pos.clone().addScaledVector(dir, 0.9), dir, this.speed);
    if (this._turn != null) m._turnRate = this._turn;
    return m;
  }
}

export class Button {
  constructor(pos, door) {
    this.pos = pos.clone();
    this.radius = 1.5;
    this.door = door;
    this.pressed = false;
    this.group = new THREE.Group();
    this.group.position.copy(pos);
    this.base = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.35, 0.18, 22), new THREE.MeshStandardMaterial({ color: 0x4a4f5c, roughness: 0.6, metalness: 0.3 }));
    this.cap = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.22, 22), new THREE.MeshStandardMaterial({ color: 0xff5a4a, emissive: 0x5a1408, emissiveIntensity: 0.5, roughness: 0.4 }));
    this.cap.position.y = 0.2;
    this.group.add(this.base, this.cap);
  }
  update(cubes, player) {
    let on = false;
    for (const cu of cubes) {
      if (Math.hypot(cu.pos.x - this.pos.x, cu.pos.z - this.pos.z) < this.radius && cu.pos.y < this.pos.y + 1.5) { on = true; break; }
    }
    if (!on && player) {
      const p = player.position;
      if (Math.hypot(p.x - this.pos.x, p.z - this.pos.z) < this.radius && Math.abs(p.y - this.pos.y) < 1.2) on = true;
    }
    if (on !== this.pressed) {
      this.pressed = on;
      if (this.door) this.door.setOpen(on);
    }
    this.cap.position.y = this.pressed ? 0.06 : 0.2;
    this.cap.material.emissiveIntensity = this.pressed ? 1.3 : 0.4;
    this.cap.material.color.setHex(this.pressed ? 0x6ee84f : 0xff5a4a);
  }
}

export class Door {
  constructor(min, max) {
    const size = new THREE.Vector3().subVectors(max, min);
    const center = new THREE.Vector3().addVectors(min, max).multiplyScalar(0.5);
    this.openOffset = size.y + 0.3;
    this.mesh = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), new THREE.MeshStandardMaterial({ color: 0x3a4a6a, emissive: 0x0e1730, emissiveIntensity: 0.5, roughness: 0.5, metalness: 0.4 }));
    this.mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(this.mesh.geometry), new THREE.LineBasicMaterial({ color: 0x141d33 })));
    this.mesh.castShadow = true;
    this.mesh.position.copy(center);
    this.baseY = center.y;
    this.collider = { min: min.clone(), max: max.clone(), portalable: false };
    this.open = 0;
    this.target = 0;
    this.requires = null; // çoklu kilit: [buton, buton] hepsi basılıysa açılır
    this.openSpeed = 4; // saniyede (hızlı açılır)
    this.closeSpeed = 0.5; // saniyede (yavaş kapanır -> adil zamanlama penceresi)
  }
  setOpen(o) { this.target = o ? 1 : 0; }
  update(dt) {
    if (this.requires) this.target = this.requires.every((b) => b.pressed) ? 1 : 0;
    const sp = this.target > this.open ? this.openSpeed : this.closeSpeed;
    if (this.target > this.open) this.open = Math.min(this.target, this.open + sp * dt);
    else this.open = Math.max(this.target, this.open - sp * dt);
    this.mesh.position.y = this.baseY + this.open * this.openOffset;
    this.collider.disabled = this.open > 0.5;
  }
}

// ---- Işık Köprüsü ----
// Yayıcıdan eksen yönünde katı, üstünde yürünen ışık plakası fırlatır.
// Yol aktif bir portal çiftinin içinden geçerse köprü diğer portaldan
// devam eder (tek yönlendirme). Segmentler her kare yeniden hesaplanır;
// çarpışma kutuları level.colliders'a eklenir, oyuncu üstünde yürür.
export class LightBridge {
  constructor(pos, dir, maxLen = 40) {
    this.origin = pos.clone();
    this.y = pos.y;
    this.dir = this._snap(dir);
    this.maxLen = maxLen;
    this.width = 2.4;
    this.thick = 0.24;
    this.group = new THREE.Group();
    const housing = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 1.1, 1.1),
      new THREE.MeshStandardMaterial({ color: 0x2a3a44, metalness: 0.6, roughness: 0.4, emissive: 0x0c2b34, emissiveIntensity: 0.6 })
    );
    housing.position.copy(pos);
    this.group.add(housing);
    const lens = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.42, 0.2, 18),
      new THREE.MeshStandardMaterial({ color: 0x9ff0ff, emissive: 0x46d6f0, emissiveIntensity: 2.0 })
    );
    lens.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), this.dir);
    lens.position.copy(pos).addScaledVector(this.dir, 0.6);
    this.group.add(lens);
    this.seg = [this._mkSeg(), this._mkSeg()];
    for (const s of this.seg) this.group.add(s.mesh);
  }
  _snap(d) {
    return Math.abs(d.x) >= Math.abs(d.z)
      ? new THREE.Vector3(Math.sign(d.x) || 1, 0, 0)
      : new THREE.Vector3(0, 0, Math.sign(d.z) || 1);
  }
  _mkSeg() {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({ color: 0x8fecff, emissive: 0x35c6ea, emissiveIntensity: 1.7, transparent: true, opacity: 0.52, roughness: 0.25 })
    );
    mesh.visible = false;
    const collider = { min: new THREE.Vector3(), max: new THREE.Vector3(), disabled: true, portalable: false, bridge: true };
    return { mesh, collider };
  }
  get colliders() { return [this.seg[0].collider, this.seg[1].collider]; }

  _march(P, D, level, portals, ignore) {
    let tWall = this.maxLen;
    for (const c of level.colliders) {
      if (c.disabled || c.bridge || c.dynamic) continue;
      const t = rayAABB(P, D, c.min, c.max);
      if (t != null && t > 0.02 && t < tWall) tWall = t;
    }
    let best = null;
    if (portals.a.active && portals.b.active) {
      for (const p of [portals.a, portals.b]) {
        if (p === ignore) continue;
        const denom = D.dot(p.normal);
        if (denom > -0.1) continue; // portalın ön yüzüne girmiyor
        const t = p.position.clone().sub(P).dot(p.normal) / denom;
        if (t > 0.02 && t < tWall) {
          const rel = P.clone().addScaledVector(D, t).sub(p.position);
          const along = rel.dot(p.normal);
          const planar = rel.addScaledVector(p.normal, -along).length();
          if (planar < p.radius * 0.92) { best = { t, portal: p }; tWall = t; }
        }
      }
    }
    const point = P.clone().addScaledVector(D, tWall);
    return best ? { point, portal: best.portal } : { point, portal: null };
  }

  update(dt, level, portals) {
    const h1 = this._march(this.origin, this.dir, level, portals, null);
    this._setSeg(0, this.origin, h1.point, this.dir);
    if (h1.portal) {
      const exit = h1.portal === portals.a ? portals.b : portals.a;
      const d2 = this._snap(exit.normal);
      const start2 = exit.position.clone();
      const h2 = this._march(start2, d2, level, portals, exit);
      this._setSeg(1, start2, h2.point, d2);
    } else {
      this._setSeg(1, null);
    }
  }

  _setSeg(i, start, end, dir) {
    const s = this.seg[i];
    if (!start) { s.collider.disabled = true; s.mesh.visible = false; return; }
    const min = new THREE.Vector3(), max = new THREE.Vector3();
    min.y = this.y - this.thick / 2; max.y = this.y + this.thick / 2;
    if (Math.abs(dir.x) > 0.5) {
      min.x = Math.min(start.x, end.x); max.x = Math.max(start.x, end.x);
      min.z = start.z - this.width / 2; max.z = start.z + this.width / 2;
    } else {
      min.z = Math.min(start.z, end.z); max.z = Math.max(start.z, end.z);
      min.x = start.x - this.width / 2; max.x = start.x + this.width / 2;
    }
    const len = Math.abs(dir.x) > 0.5 ? max.x - min.x : max.z - min.z;
    if (len < 0.15) { s.collider.disabled = true; s.mesh.visible = false; return; }
    s.collider.min.copy(min); s.collider.max.copy(max); s.collider.disabled = false;
    s.mesh.position.set((min.x + max.x) / 2, (min.y + max.y) / 2, (min.z + max.z) / 2);
    s.mesh.scale.set(Math.max(0.02, max.x - min.x), Math.max(0.02, max.y - min.y), Math.max(0.02, max.z - min.z));
    s.mesh.visible = true;
  }
}

// ışın-AABB giriş mesafesi (slab yöntemi); ışın kutuya girmiyorsa null
function rayAABB(P, D, min, max) {
  let tmin = -Infinity, tmax = Infinity;
  for (const a of ["x", "y", "z"]) {
    if (Math.abs(D[a]) < 1e-8) { if (P[a] < min[a] || P[a] > max[a]) return null; }
    else {
      let t1 = (min[a] - P[a]) / D[a], t2 = (max[a] - P[a]) / D[a];
      if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
      if (t1 > tmin) tmin = t1;
      if (t2 < tmax) tmax = t2;
    }
  }
  if (tmax < tmin || tmax < 0) return null;
  return tmin > 1e-4 ? tmin : null;
}

// ---- Lazer + Alıcı ----
// Yayıcıdan düz ışın; duvara/alıcıya çarpana kadar gider, aktif portal
// çiftinin içinden geçerse diğer portaldan onun normali yönünde devam eder
// (tek yönlendirme, ışık köprüsüyle aynı mantık). Işın zararsızdır (oyuncu
// çarpışmaz); yalnızca görsel + alıcı tetikleme. Eksene yapışık.
export class Laser {
  constructor(pos, dir, color = 0xff5236) {
    this.origin = pos.clone();
    this.dir = this._snap(dir);
    this.maxLen = 80;
    this.color = color;
    this.ends = [];
    this.group = new THREE.Group();
    const housing = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.9, 0.9),
      new THREE.MeshStandardMaterial({ color: 0x3a2024, metalness: 0.6, roughness: 0.4, emissive: 0x5a1010, emissiveIntensity: 0.5 })
    );
    housing.position.copy(pos);
    this.group.add(housing);
    const lens = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.3, 0.2, 16),
      new THREE.MeshBasicMaterial({ color: 0xff9a7a })
    );
    lens.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), this.dir);
    lens.position.copy(pos).addScaledVector(this.dir, 0.55);
    this.group.add(lens);
    this.seg = [this._mkBeam(), this._mkBeam()];
    for (const s of this.seg) this.group.add(s);
  }
  _snap(d) {
    const ax = Math.abs(d.x), ay = Math.abs(d.y), az = Math.abs(d.z);
    if (ax >= ay && ax >= az) return new THREE.Vector3(Math.sign(d.x) || 1, 0, 0);
    if (az >= ay) return new THREE.Vector3(0, 0, Math.sign(d.z) || 1);
    return new THREE.Vector3(0, Math.sign(d.y) || 1, 0);
  }
  _mkBeam() {
    const m = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 1, 8),
      new THREE.MeshBasicMaterial({ color: this.color, transparent: true, opacity: 0.92 })
    );
    m.visible = false;
    return m;
  }
  _march(P, D, level, portals, ignore) {
    let tWall = this.maxLen;
    for (const c of level.colliders) {
      if (c.disabled || c.bridge || c.dynamic) continue;
      const t = rayAABB(P, D, c.min, c.max);
      if (t != null && t > 0.02 && t < tWall) tWall = t;
    }
    let best = null;
    if (portals.a.active && portals.b.active) {
      for (const p of [portals.a, portals.b]) {
        if (p === ignore) continue;
        const denom = D.dot(p.normal);
        if (denom > -0.1) continue;
        const t = p.position.clone().sub(P).dot(p.normal) / denom;
        if (t > 0.02 && t < tWall) {
          const rel = P.clone().addScaledVector(D, t).sub(p.position);
          const along = rel.dot(p.normal);
          const planar = rel.addScaledVector(p.normal, -along).length();
          if (planar < p.radius * 0.92) { best = { t, portal: p }; tWall = t; }
        }
      }
    }
    const point = P.clone().addScaledVector(D, tWall);
    return best ? { point, portal: best.portal } : { point, portal: null };
  }
  update(dt, level, portals) {
    this.ends = [];
    const h1 = this._march(this.origin, this.dir, level, portals, null);
    this._place(0, this.origin, h1.point);
    this.ends.push({ point: h1.point.clone(), isWall: !h1.portal });
    if (h1.portal) {
      const exit = h1.portal === portals.a ? portals.b : portals.a;
      const d2 = this._snap(exit.normal);
      const start2 = exit.position.clone();
      const h2 = this._march(start2, d2, level, portals, exit);
      this._place(1, start2, h2.point);
      this.ends.push({ point: h2.point.clone(), isWall: !h2.portal });
    } else {
      this.seg[1].visible = false;
    }
  }
  _place(i, a, b) {
    const s = this.seg[i];
    const len = a.distanceTo(b);
    if (len < 0.05) { s.visible = false; return; }
    s.visible = true;
    s.position.copy(a).add(b).multiplyScalar(0.5);
    s.scale.set(1, len, 1);
    s.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  }
}

export class LaserReceiver {
  constructor(pos, door) {
    this.pos = pos.clone();
    this.radius = 1.0;
    this.door = door;
    this.active = false;
    this.group = new THREE.Group();
    this.group.position.copy(pos);
    this.ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.55, 0.14, 10, 22),
      new THREE.MeshStandardMaterial({ color: 0x6a3a3a, emissive: 0x3a1010, emissiveIntensity: 0.5, metalness: 0.4, roughness: 0.5 })
    );
    this.core = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 14, 14),
      new THREE.MeshStandardMaterial({ color: 0x551515, emissive: 0x440808, emissiveIntensity: 0.6 })
    );
    this.group.add(this.ring, this.core);
  }
  check(lasers) {
    let hit = false;
    for (const lz of lasers) {
      for (const e of lz.ends) {
        if (e.isWall && e.point.distanceTo(this.pos) < this.radius) { hit = true; break; }
      }
      if (hit) break;
    }
    if (hit !== this.active) {
      this.active = hit;
      if (this.door) this.door.setOpen(hit); // sürekli: ışın çekilince kapanır
      this.core.material.color.setHex(hit ? 0x6ee84f : 0x551515);
      this.core.material.emissive.setHex(hit ? 0x2f9a3e : 0x440808);
      this.core.material.emissiveIntensity = hit ? 1.5 : 0.6;
      this.ring.material.emissive.setHex(hit ? 0x2f9a3e : 0x3a1010);
    }
  }
}

// ---- Fizzler (Şebeke / Arınma alanı) ----
// Dikey enerji alanı: oyuncu geçince portalları sıfırlanır; küp değince
// başlangıç noktasına döner (erir). "Önce çöz, sonra geç" kısıtı getirir.
export class Fizzler {
  constructor(min, max) {
    this.min = min.clone();
    this.max = max.clone();
    this.group = new THREE.Group();
    const sx = max.x - min.x, sy = max.y - min.y, sz = max.z - min.z;
    const cx = (min.x + max.x) / 2, cy = (min.y + max.y) / 2, cz = (min.z + max.z) / 2;
    const w = Math.max(sx, sz); // kapı genişliği (hangisi büyükse)
    this.mat = new THREE.MeshBasicMaterial({ color: 0xffa030, transparent: true, opacity: 0.26, side: THREE.DoubleSide, depthWrite: false });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(w, sy), this.mat);
    plane.position.set(cx, cy, cz);
    if (sx <= sz) plane.rotation.y = Math.PI / 2; // z-yönlü kapı
    this.group.add(plane);
    const barMat = new THREE.MeshBasicMaterial({ color: 0xffd9a0 });
    const n = Math.max(3, Math.round(w / 0.55));
    for (let i = 0; i < n; i++) {
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, sy, 6), barMat);
      const f = (n === 1 ? 0 : (i / (n - 1) - 0.5)) * w;
      if (sx > sz) bar.position.set(cx + f, cy, cz);
      else bar.position.set(cx, cy, cz + f);
      this.group.add(bar);
    }
    this.t = 0;
  }
  contains(p) {
    return p.x > this.min.x && p.x < this.max.x && p.y > this.min.y && p.y < this.max.y && p.z > this.min.z && p.z < this.max.z;
  }
  overlaps(min, max) {
    return max.x > this.min.x && min.x < this.max.x && max.y > this.min.y && min.y < this.max.y && max.z > this.min.z && min.z < this.max.z;
  }
  update(dt) { this.t += dt; this.mat.opacity = 0.20 + 0.12 * Math.abs(Math.sin(this.t * 3)); }
}
