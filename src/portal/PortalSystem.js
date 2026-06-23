import * as THREE from "three";
import { makePortalMaterial } from "./portalShader.js";

const RADIUS = 1.4;
const Z_AXIS = new THREE.Vector3(0, 0, 1);
const HALF_H = 0.9; // FPController HEIGHT/2

class Portal {
  constructor(color) {
    this.color = color;
    this.active = false;
    this.open = 0;
    this.position = new THREE.Vector3();
    this.normal = new THREE.Vector3(0, 0, 1);
    this.collider = null;

    this.material = makePortalMaterial(color);
    this.mesh = new THREE.Mesh(new THREE.CircleGeometry(RADIUS, 40), this.material);
    this.mesh.visible = false;
    this.radius = RADIUS;

    this.light = new THREE.PointLight(color, 0, 12, 2);
  }
}

export class PortalSystem {
  constructor(scene) {
    this.scene = scene;
    this.a = new Portal(0x37c95f); // teal-yeşil
    this.b = new Portal(0x9be84f); // lime-yeşil
    scene.add(this.a.mesh, this.a.light, this.b.mesh, this.b.light);
    this.lastCenter = new THREE.Vector3();
  }

  reset() {
    for (const p of [this.a, this.b]) {
      p.active = false;
      p.open = 0;
      p.mesh.visible = false;
      p.light.intensity = 0;
      if (p.collider) p.collider.portal = null;
      p.collider = null;
    }
  }

  // which: "a" | "b"
  place(which, point, normal, collider) {
    const p = which === "a" ? this.a : this.b;
    if (p.collider && p.collider !== collider) p.collider.portal = null;

    p.position.copy(point).addScaledVector(normal, 0.06);
    p.normal.copy(normal).normalize();
    p.mesh.position.copy(p.position);
    p.mesh.quaternion.setFromUnitVectors(Z_AXIS, p.normal);
    p.mesh.visible = true;
    p.open = 0.01;
    p.active = true;
    p.collider = collider;
    p.light.position.copy(p.position).addScaledVector(p.normal, 0.5);
    if (collider) collider.portal = p;
  }

  _matrixOf(p) {
    p.mesh.updateMatrixWorld(true);
    return p.mesh.matrixWorld;
  }

  tryTeleport(controller) {
    if (controller.teleportCooldown > 0 || !this.a.active || !this.b.active) {
      this.lastCenter.copy(controller.center);
      return;
    }
    const cur = controller.center;
    for (const [inP, outP] of [[this.a, this.b], [this.b, this.a]]) {
      const prevD = this.lastCenter.clone().sub(inP.position).dot(inP.normal);
      const curD = cur.clone().sub(inP.position).dot(inP.normal);
      if (prevD > 0 && curD <= 0) {
        // düzlemsel mesafe portal yarıçapında mı?
        const rel = cur.clone().sub(inP.position);
        const planar = rel.addScaledVector(inP.normal, -curD).length();
        if (planar < inP.radius * 0.95) {
          this._teleport(controller, inP, outP);
          return;
        }
      }
    }
    this.lastCenter.copy(cur);
  }

  _teleport(controller, inP, outP) {
    const flip = new THREE.Matrix4().makeRotationY(Math.PI);
    const T = new THREE.Matrix4()
      .copy(this._matrixOf(outP))
      .multiply(flip)
      .multiply(new THREE.Matrix4().copy(this._matrixOf(inP)).invert());

    // konum
    const center = controller.center.applyMatrix4(T);
    center.addScaledVector(outP.normal, 0.6); // çıkıştan biraz öteye it
    controller.position.set(center.x, center.y - HALF_H, center.z);

    // hız (büyüklüğü koru, yönü döndür)
    const speed = controller.velocity.length();
    if (speed > 0.0001) {
      controller.velocity.transformDirection(T).multiplyScalar(speed);
    }

    // bakış yönü
    const f = controller.getForward().transformDirection(T);
    controller.setForward(f);

    controller.teleportCooldown = 0.2;
    this.lastCenter.copy(controller.center);
  }

  update(dt) {
    for (const p of [this.a, this.b]) {
      if (!p.active) continue;
      p.open = Math.min(1, p.open + dt * 3);
      p.material.uniforms.uTime.value += dt;
      p.material.uniforms.uOpen.value = p.open;
      p.light.intensity = 1.0 * p.open;
    }
  }
}
