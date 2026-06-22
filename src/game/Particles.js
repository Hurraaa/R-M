import * as THREE from "three";

// Patlama parçacık sistemi (havuzlanmış). Düşman ölümü ve isabet efektleri.
export class Particles {
  constructor(scene, max = 600) {
    this.max = max;
    this.scene = scene;
    this.positions = new Float32Array(max * 3);
    this.velocities = new Float32Array(max * 3);
    this.life = new Float32Array(max);
    this.colors = new Float32Array(max * 3);
    this.cursor = 0;

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(this.positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(this.colors, 3));
    this.geo = geo;

    const mat = new THREE.PointsMaterial({
      size: 0.28,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    scene.add(this.points);
  }

  burst(pos, color, count = 24, power = 6) {
    const c = new THREE.Color(color);
    for (let i = 0; i < count; i++) {
      const idx = this.cursor;
      this.cursor = (this.cursor + 1) % this.max;
      this.positions[idx * 3] = pos.x;
      this.positions[idx * 3 + 1] = pos.y + 0.5;
      this.positions[idx * 3 + 2] = pos.z;
      const dir = new THREE.Vector3(
        Math.random() - 0.5,
        Math.random() * 0.8 + 0.1,
        Math.random() - 0.5
      ).normalize().multiplyScalar(power * (0.4 + Math.random() * 0.6));
      this.velocities[idx * 3] = dir.x;
      this.velocities[idx * 3 + 1] = dir.y;
      this.velocities[idx * 3 + 2] = dir.z;
      this.life[idx] = 0.6 + Math.random() * 0.5;
      this.colors[idx * 3] = c.r;
      this.colors[idx * 3 + 1] = c.g;
      this.colors[idx * 3 + 2] = c.b;
    }
  }

  update(dt) {
    for (let i = 0; i < this.max; i++) {
      if (this.life[i] <= 0) {
        // ölü parçacığı kameradan uzağa it
        this.positions[i * 3 + 1] = -999;
        continue;
      }
      this.life[i] -= dt;
      this.velocities[i * 3 + 1] -= 9 * dt; // yerçekimi
      this.positions[i * 3] += this.velocities[i * 3] * dt;
      this.positions[i * 3 + 1] += this.velocities[i * 3 + 1] * dt;
      this.positions[i * 3 + 2] += this.velocities[i * 3 + 2] * dt;
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.color.needsUpdate = true;
  }
}
