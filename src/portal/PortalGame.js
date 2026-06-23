import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";

import { PortalInput } from "./PortalInput.js";
import { FPController } from "./FPController.js";
import { PortalSystem } from "./PortalSystem.js";
import { buildChamber, CHAMBER_COUNT } from "./Level.js";
import { Scenery } from "./Scenery.js";

export class PortalGame {
  constructor(canvas) {
    this.canvas = canvas;
    this.isMobile = matchMedia("(pointer: coarse)").matches || "ontouchstart" in window;
    this.state = "menu";
    this.chamberIndex = 0;
    this.level = null;
    this.winTimer = 0;
    this._nextPortal = "a"; // mobil tek-buton sırası

    this._initRenderer();
    this._initScene();
    this._initPost();

    this.input = new PortalInput(canvas);
    this.controller = new FPController();
    this.portals = new PortalSystem(this.scene);
    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = 80;

    addEventListener("keydown", (e) => {
      if (e.code === "KeyR") this.loadChamber(this.chamberIndex);
    });
    addEventListener("resize", () => this._onResize());

    this.clock = new THREE.Clock();
    this._loop = this._loop.bind(this);
    requestAnimationFrame(this._loop);
  }

  _initRenderer() {
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: !this.isMobile });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, this.isMobile ? 1.25 : 2));
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
  }

  _initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xe9d8a8);
    // ferah: hafif, ufuk renginde sis — uzak dekoru yumuşatır, yakını berrak bırakır
    this.scene.fog = new THREE.Fog(0xdcd2bb, 60, 260);

    this.camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.05, 600);

    // yumuşak, dengeli aydınlatma
    this.scene.add(new THREE.HemisphereLight(0xcfe6ff, 0x8a7a66, 1.05));
    this.scene.add(new THREE.AmbientLight(0xb8c4d6, 0.35));
    const sun = new THREE.DirectionalLight(0xfff2d6, 0.8);
    sun.position.set(18, 30, 14);
    sun.castShadow = true;
    sun.shadow.mapSize.set(this.isMobile ? 1024 : 2048, this.isMobile ? 1024 : 2048);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 140;
    sun.shadow.bias = -0.0004;
    const s = 44;
    Object.assign(sun.shadow.camera, { left: -s, right: s, top: s, bottom: -s });
    this.scene.add(sun);

    this.scenery = new Scenery(this.scene);
    this.levelGroup = null;
  }

  _initPost() {
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.composer.addPass(
      new UnrealBloomPass(
        new THREE.Vector2(innerWidth, innerHeight),
        this.isMobile ? 0.32 : 0.45, // yumuşak parlama
        0.45,
        this.isMobile ? 0.6 : 0.55 // yüksek eşik: yalnızca portallar parlar
      )
    );
    this.composer.addPass(new OutputPass());
  }

  start() {
    this.state = "playing";
    this.chamberIndex = 0;
    this.loadChamber(0);
    this.input.lock();
  }

  loadChamber(i) {
    if (this.levelGroup) this.scene.remove(this.levelGroup);
    this.chamberIndex = i;
    this.level = buildChamber(i);
    this.levelGroup = this.level.group;
    this.scene.add(this.levelGroup);
    this.controller.reset(this.level.spawn);
    this.portals.reset();
    this.portals.lastCenter.copy(this.controller.center);
    this.winTimer = 0;
    this._nextPortal = "a";
    this._onHud?.(i + 1, CHAMBER_COUNT, this.level.hint);
  }

  firePortal(which) {
    const f = this.controller.getForward();
    this.raycaster.set(this.controller.eyePosition, f);
    const hits = this.raycaster.intersectObjects(this.level.raycast, false);
    if (!hits.length) return false;
    const hit = hits[0];
    const mesh = hit.object;
    if (!mesh.userData.portalable) {
      this._onDeny?.();
      return false;
    }
    const normal = hit.face.normal.clone().transformDirection(mesh.matrixWorld).normalize();
    this.portals.place(which, hit.point, normal, mesh.userData.collider);
    return true;
  }

  _update(dt) {
    if (this.state !== "playing") return;

    if (this.input.consumePortalA()) this.firePortal("a"); // masaüstü sol tık
    if (this.input.consumePortalB()) this.firePortal("b"); // masaüstü sağ tık
    if (this.input.consumePortalNext()) {
      // mobil tek buton: sırayla giriş/çıkış portalı
      if (this.firePortal(this._nextPortal)) {
        this._nextPortal = this._nextPortal === "a" ? "b" : "a";
      }
    }

    this.controller.update(dt, this.input, this.level, this.portals);
    this.portals.update(dt);
    this.portals.tryTeleport(this.controller);

    // kamera
    const eye = this.controller.eyePosition;
    this.camera.position.copy(eye);
    this.camera.lookAt(eye.clone().add(this.controller.getForward()));

    // çıkışa ulaşma
    if (this.level.exit) {
      const d = this.controller.center.distanceTo(this.level.exit.pos);
      if (d < this.level.exit.radius + 0.6) {
        this.winTimer += dt;
        if (this.winTimer > 0.25) this._reachExit();
      } else {
        this.winTimer = 0;
      }
    }
  }

  _reachExit() {
    if (this.chamberIndex + 1 < CHAMBER_COUNT) {
      this._onChamberClear?.(this.chamberIndex + 1);
      this.loadChamber(this.chamberIndex + 1);
    } else {
      this.state = "won";
      document.exitPointerLock?.();
      this._onWin?.();
    }
  }

  _loop() {
    requestAnimationFrame(this._loop);
    const dt = Math.min(0.05, this.clock.getDelta());
    this.scenery?.update(dt);
    this._update(dt);
    this.composer.render();
    this.input.endFrame();
  }

  _onResize() {
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(innerWidth, innerHeight);
    this.composer.setSize(innerWidth, innerHeight);
  }
}
