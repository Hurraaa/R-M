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

    // görülebilir portal: karşı tarafın canlı görüntüsü (özyinelemesiz RTT)
    this.seeThrough = true;
    this.viewScale = 1; // mobilde düşürülebilir
    const mk = () => new THREE.WebGLRenderTarget(2, 2, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: true });
    this.a.view = mk();
    this.b.view = mk();
    this.a.material.uniforms.uView.value = this.a.view.texture;
    this.b.material.uniforms.uView.value = this.b.view.texture;
    this._vcam = new THREE.PerspectiveCamera();
    this._vcam.matrixAutoUpdate = false;
    this._flip = new THREE.Matrix4().makeRotationY(Math.PI);
    this._tmp = new THREE.Matrix4();
    this._res = new THREE.Vector2(1, 1);
  }

  // karşı tarafın görüntüsünü her portalın yüzeyine RTT olarak çiz.
  // main composer render'ından ÖNCE çağrılır.
  renderViews(renderer, scene, mainCamera) {
    const both = this.a.active && this.b.active && this.seeThrough;
    this.a.material.uniforms.uHasView.value = both ? 1 : 0;
    this.b.material.uniforms.uHasView.value = both ? 1 : 0;
    if (!both) return;

    const size = renderer.getSize(this._res);
    const dpr = renderer.getPixelRatio();
    const w = Math.max(2, Math.floor(size.x * dpr * this.viewScale));
    const h = Math.max(2, Math.floor(size.y * dpr * this.viewScale));
    if (this.a.view.width !== w || this.a.view.height !== h) {
      this.a.view.setSize(w, h); this.b.view.setSize(w, h);
    }
    const resv = new THREE.Vector2(w, h);
    this.a.material.uniforms.uResolution.value.copy(resv);
    this.b.material.uniforms.uResolution.value.copy(resv);

    this._vcam.projectionMatrix.copy(mainCamera.projectionMatrix);
    this._vcam.projectionMatrixInverse.copy(mainCamera.projectionMatrixInverse);

    // portallar kendi görüntülerinde görünmesin (özyineleme/çerçeve artefaktı yok)
    const va = this.a.mesh.visible, vb = this.b.mesh.visible;
    this.a.mesh.visible = false; this.b.mesh.visible = false;
    const prevTarget = renderer.getRenderTarget();

    // Portal A yüzeyi: B'den dışarı bakış  (T = B·flip·A⁻¹)
    this._renderThrough(renderer, scene, mainCamera, this.b, this.a, this.a.view);
    // Portal B yüzeyi: A'dan dışarı bakış  (T = A·flip·B⁻¹)
    this._renderThrough(renderer, scene, mainCamera, this.a, this.b, this.b.view);

    renderer.setRenderTarget(prevTarget);
    this.a.mesh.visible = va; this.b.mesh.visible = vb;
  }

  _renderThrough(renderer, scene, mainCamera, outP, inP, target) {
    // sanal kamera = (outP·flip·inP⁻¹) · anaKamera
    const T = this._tmp.copy(this._matrixOf(outP)).multiply(this._flip).multiply(this._matrixOf(inP).clone().invert());
    this._vcam.matrixWorld.multiplyMatrices(T, mainCamera.matrixWorld);
    this._vcam.matrixWorldInverse.copy(this._vcam.matrixWorld).invert();
    renderer.setRenderTarget(target);
    renderer.clear();
    renderer.render(scene, this._vcam);
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
    // iki portal neredeyse üst üste -> dejenere döngü, teleport etme
    if (this.a.position.distanceTo(this.b.position) < this.a.radius * 0.8) {
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
          return this._teleport(controller, inP, outP);
        }
      }
    }
    this.lastCenter.copy(cur);
    return null;
  }

  _teleport(controller, inP, outP) {
    const flip = new THREE.Matrix4().makeRotationY(Math.PI);
    const T = new THREE.Matrix4()
      .copy(this._matrixOf(outP))
      .multiply(flip)
      .multiply(new THREE.Matrix4().copy(this._matrixOf(inP)).invert());

    // konum
    const center = controller.center.applyMatrix4(T);
    center.addScaledVector(outP.normal, 0.9); // çıkıştan yeterince öteye it (delikten geri düşmeyi önler)
    controller.position.set(center.x, center.y - HALF_H, center.z);

    // hız (büyüklüğü koru, yönü döndür)
    const speed = controller.velocity.length();
    if (speed > 0.0001) {
      controller.velocity.transformDirection(T).multiplyScalar(speed);
    }

    // bakış yönü
    const f = controller.getForward().transformDirection(T);
    controller.setForward(f);

    controller.teleportCooldown = 0.05;
    this.lastCenter.copy(controller.center);
    return outP.normal.clone();
  }

  // genel varlık teleportu (küp gibi center+velocity tabanlı nesneler için)
  teleportEntity(e) {
    if (e.teleportCooldown > 0 || !this.a.active || !this.b.active) { e.lastCenter.copy(e.center); return null; }
    if (this.a.position.distanceTo(this.b.position) < this.a.radius * 0.8) { e.lastCenter.copy(e.center); return null; }
    const cur = e.center;
    for (const [inP, outP] of [[this.a, this.b], [this.b, this.a]]) {
      const prevD = e.lastCenter.clone().sub(inP.position).dot(inP.normal);
      const curD = cur.clone().sub(inP.position).dot(inP.normal);
      if (prevD > 0 && curD <= 0) {
        const rel = cur.clone().sub(inP.position);
        const planar = rel.addScaledVector(inP.normal, -curD).length();
        if (planar < inP.radius * 0.95) {
          const flip = new THREE.Matrix4().makeRotationY(Math.PI);
          const T = new THREE.Matrix4().copy(this._matrixOf(outP)).multiply(flip).multiply(new THREE.Matrix4().copy(this._matrixOf(inP)).invert());
          const nc = cur.clone().applyMatrix4(T);
          nc.addScaledVector(outP.normal, 0.9);
          e.setCenter(nc);
          const sp = e.velocity.length();
          if (sp > 1e-4) e.velocity.transformDirection(T).multiplyScalar(sp);
          e.teleportCooldown = 0.05;
          e.lastCenter.copy(e.center);
          return outP.normal.clone();
        }
      }
    }
    e.lastCenter.copy(cur);
    return null;
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
