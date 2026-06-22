import * as THREE from "three";

// Portal silahı mermisi — parlayan yeşil enerji topu + iz ışığı.
const sharedGeo = new THREE.SphereGeometry(0.18, 10, 10);
const sharedMat = new THREE.MeshStandardMaterial({
  color: 0xaaff7a,
  emissive: 0x9cff6a,
  emissiveIntensity: 3,
  roughness: 0.3,
});

export class Projectile {
  constructor(origin, dir) {
    this.mesh = new THREE.Mesh(sharedGeo, sharedMat);
    this.mesh.position.copy(origin);
    this.velocity = dir.clone().multiplyScalar(45);
    this.life = 1.6;
    this.dead = false;
    this.damage = 1;
    this.radius = 0.18;
    // Ayrı ışık yok — yüksek emissive + bloom parlamayı sağlıyor (mobil performans).
  }

  update(dt) {
    this.mesh.position.addScaledVector(this.velocity, dt);
    this.life -= dt;
    if (this.life <= 0) this.dead = true;
  }
}
