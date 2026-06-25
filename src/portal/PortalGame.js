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
    this.renderer.toneMappingExposure = 0.98;
  }

  _initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x8f7e86);
    // ferah: hafif, ufuk renginde sis — uzak dekoru yumuşatır, yakını berrak bırakır
    this.scene.fog = new THREE.Fog(0x8a7e84, 60, 260);

    this.camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.05, 600);

    // yumuşak, dengeli aydınlatma
    this.scene.add(new THREE.HemisphereLight(0xbcd2ee, 0x6a5f55, 0.9));
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

  start(index = 0) {
    this.state = "playing";
    this.chamberIndex = index;
    this.loadChamber(index);
    this.input.lock();
  }

  loadChamber(i) {
    if (this.levelGroup) this.scene.remove(this.levelGroup);
    this.chamberIndex = i;
    this.level = buildChamber(i);
    this.levelGroup = this.level.group;
    this.scene.add(this.levelGroup);
    this.controller.reset(this.level.spawn);
    this.controller.gravityScale = this.level.gravityScale ?? 1; // bölüm yerçekimi (ay yürüyüşü vb.)
    this.portals.reset();
    this.portals.lastCenter.copy(this.controller.center);
    this.winTimer = 0;
    this._nextPortal = "a";
    this._t = 0;
    this._onHud?.(i + 1, CHAMBER_COUNT, this.level.hint, this.level.objective);
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
    const col = mesh.userData.collider;
    // portal tam nişangahın geldiği noktada (ortalı) açılır.
    // yalnızca disk merkezi yüzey dışına taşacaksa kenara hafifçe çekilir
    // (yüzey portaldan darsa ortaya) — normal eksende kaydırma yok.
    const r = this.portals.a.radius;
    const m = r * 0.15; // çok küçük güvenlik payı: nişangahtan kayma neredeyse yok
    const p = hit.point.clone();
    for (const ax of ["x", "y", "z"]) {
      if (Math.abs(normal[ax]) > 0.5) continue; // normal ekseni atla
      const lo = col.min[ax] + m, hi = col.max[ax] - m;
      p[ax] = lo <= hi ? Math.min(hi, Math.max(lo, p[ax])) : (col.min[ax] + col.max[ax]) / 2;
    }
    this.portals.place(which, p, normal, col);
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

    // ışık köprüleri: portal/yön değişince segmentleri yeniden hesapla
    for (const lb of this.level.lightBridges) lb.update(dt, this.level, this.portals);

    // hareketli platformlar: önce hareket et, üstündeki oyuncuyu taşı
    for (const mp of this.level.movers) mp.update(dt);
    for (const mp of this.level.movers) {
      const p = this.controller.position;
      const c = mp.collider;
      if (p.x > c.min.x - 0.35 && p.x < c.max.x + 0.35 && p.z > c.min.z - 0.35 && p.z < c.max.z + 0.35 && Math.abs(p.y - c.max.y) < 0.3) {
        p.add(mp.delta);
      }
    }

    this.controller.update(dt, this.input, this.level, this.portals);
    this.portals.update(dt);
    const exitNormal = this.portals.tryTeleport(this.controller);
    if (exitNormal) this.controller.depenetrateAlong(exitNormal, this.level.colliders, this.portals);

    // interaktif nesneler: yük küpleri, butonlar, kapılar
    for (const cube of this.level.cubes) {
      cube.update(dt, this.level, this.portals);
      const cn = this.portals.teleportEntity(cube);
      if (cn) cube.depenetrateAlong(cn, this.level.colliders, this.portals);
    }
    for (const pad of this.level.launchPads) {
      pad.tryLaunch(this.controller);
      for (const cube of this.level.cubes) pad.tryLaunch(cube);
    }
    for (const bp of this.level.bouncePads) {
      bp.tryBounce(this.controller);
      for (const cube of this.level.cubes) bp.tryBounce(cube);
      bp.update(dt);
    }
    // enerji topları: yayıcı + uçuş + portal + alıcı
    for (const em of this.level.emitters) {
      if (em.disabled) continue;
      em.timer -= dt;
      const live = this.level.balls.some((b) => !b.dead);
      if (!live && em.timer <= 0) {
        const b = em.spawn();
        this.scene.add(b.mesh);
        this.level.balls.push(b);
        em.timer = 1.0;
      }
    }
    for (const b of this.level.balls) {
      if (b.dead) continue;
      b.update(dt, this.level, this.portals);
      this.portals.teleportEntity(b);
      // zararlı engel topu: oyuncuya değerse spawn'a döndür
      if (this.level.ballsHarmful && b.pos.distanceTo(this.controller.center) < b.r + 0.5) {
        this.controller.reset(this.level.spawn);
        this._onDeny?.();
      }
    }
    for (const r of this.level.receptacles) r.check(this.level.balls);

    // hareket-sensörlü füzeler
    for (const ml of this.level.missileLaunchers) {
      ml.timer -= dt;
      const live = this.level.missiles.some((m) => !m.dead);
      if (!live && ml.timer <= 0) {
        const m = ml.spawn(this.controller.center);
        this.scene.add(m.mesh);
        this.level.missiles.push(m);
        ml.timer = 2.5;
      }
    }
    for (const m of this.level.missiles) {
      if (m.dead) continue;
      m.update(dt, this.level, this.portals, this.controller.center);
      this.portals.teleportEntity(m);
      if (m.hitPlayer) { this.controller.reset(this.level.spawn); this._onDeny?.(); }
    }
    this.level.missiles = this.level.missiles.filter((m) => {
      if (m.dead) { this.scene.remove(m.mesh); return false; }
      return true;
    });
    this.level.balls = this.level.balls.filter((b) => {
      if (b.dead) { this.scene.remove(b.mesh); return false; }
      return true;
    });

    for (const button of this.level.buttons) button.update(this.level.cubes, this.controller);
    for (const kp of this.level.keypads) kp.update(this.controller);
    for (const lift of this.level.waterLifts) {
      const c = lift.collider;
      const p = this.controller.position;
      const occ = p.x > c.min.x - 0.4 && p.x < c.max.x + 0.4 && p.z > c.min.z - 0.4 && p.z < c.max.z + 0.4 && Math.abs(p.y - c.max.y) < 0.5;
      lift.update(dt, occ);
    }
    for (const fp of this.level.flipPads) fp.tryFlip(this.controller);
    for (const d of this.level.destructibles) d.update(dt);
    for (const door of this.level.doors) door.update(dt);

    // kamera
    const eye = this.controller.eyePosition;
    this.camera.position.copy(eye);
    this.camera.lookAt(eye.clone().add(this.controller.getForward()));

    // amaç-nesnesi animasyonu (dönme + süzülme)
    if (this.level.exitSpin) {
      this._t += dt;
      this.level.exitSpin.rotation.y = this._t;
      this.level.exitSpin.position.y = 1.3 + Math.sin(this._t * 2) * 0.12;
    }

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
    const story = this.level.story;
    if (this.chamberIndex + 1 < CHAMBER_COUNT) {
      this._onChamberClear?.(this.chamberIndex + 1, story);
      this.loadChamber(this.chamberIndex + 1);
    } else {
      this.state = "won";
      document.exitPointerLock?.();
      this._onWin?.(story);
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
