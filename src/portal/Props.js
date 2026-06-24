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
