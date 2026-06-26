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
import { PerfMonitor } from "./PerfMonitor.js";
import { BouncePad, Echo, makeFigure, walkFigure } from "./Props.js";

export class PortalGame {
  constructor(canvas) {
    this.canvas = canvas;
    this.isMobile = matchMedia("(pointer: coarse)").matches || "ontouchstart" in window;
    this.state = "menu";
    this.chamberIndex = 0;
    this.level = null;
    this.winTimer = 0;
    this._nextPortal = "a"; // mobil tek-buton sırası
    // Yankı (zaman yankısı): kayıt durumu + klonlar
    this.recording = false;
    this.recFrames = [];
    this.recStart = null;
    this.recStartYaw = 0;
    this.echoes = [];
    this.maxRecFrames = 1500; // ~ güvenlik üst sınırı
    // Ayna (mirror): X ekseninde yansıyan, kendi fizikli ikinci karakter
    this.mirror = null;        // FPController
    this.mirrorFig = null;     // görsel avatar
    this.mirrorState = null;   // {yaw, walkPhase, swing}
    this.mirrorPrev = new THREE.Vector3();
    this.heldCube = null;      // taşınan küp (F / ✊ düğmesi)

    this._initRenderer();
    this._initScene();
    this._initPost();

    this.input = new PortalInput(canvas);
    this.controller = new FPController();
    this.portals = new PortalSystem(this.scene);
    this.portals.viewScale = this.isMobile ? 0.6 : 1; // mobilde portal görüntüsü daha düşük çözünürlük
    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = 80;

    this.perf = new PerfMonitor();
    this.renderer.info.autoReset = false; // çoklu render-pass: reset'i biz yönetiriz

    addEventListener("keydown", (e) => {
      if (e.code === "KeyR") this.loadChamber(this.chamberIndex);
      if (e.code === "KeyP") this.perf.toggle();
      if (e.code === "KeyE" || e.code === "KeyQ") this.toggleEcho();
      if (e.code === "KeyF") this.toggleGrab();
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

    this.camera = new THREE.PerspectiveCamera(82, innerWidth / innerHeight, 0.05, 600);

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
    if (this.levelGroup) {
      this.scene.remove(this.levelGroup);
      this._disposeGroup(this.levelGroup); // GPU sızıntısını önle (özellikle R ile yenilemede)
    }
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
    this._gelPatch = null; // jel sıçrama yaması (bölüme özel)
    this._t = 0;
    this._clearEchoes();
    this.recording = false;
    this.recFrames = [];
    this.heldCube = null;
    this._setupMirror();
    this._onHud?.(i + 1, CHAMBER_COUNT, this.level.hint, this.level.objective);
    this._onEcho?.(false, this.level.echoMax ?? 0);
  }

  _setupMirror() {
    if (this.mirrorFig) { this.scene.remove(this.mirrorFig.group); this._disposeGroup(this.mirrorFig.group); }
    this.mirror = null; this.mirrorFig = null; this.mirrorState = null;
    const m = this.level.mirror;
    if (!m) return;
    this.mirror = new FPController();
    this.mirror.gravityScale = this.level.gravityScale ?? 1;
    this.mirror.reset(m.spawn);
    this.mirror.yaw = -this.controller.yaw;
    this.mirrorFig = makeFigure(0xffae54, 0xcc5a12, 0.9); // sıcak turuncu (canlı ayna)
    this.mirrorFig.group.position.copy(m.spawn);
    this.scene.add(this.mirrorFig.group);
    this.mirrorState = { yaw: 0, walkPhase: 0, swing: 0 };
    this.mirrorPrev.copy(m.spawn);
  }

  // Küp tut / bırak (F tuşu / ✊ düğmesi). Tutulan küp kameranın önünde taşınır.
  toggleGrab() {
    if (this.state !== "playing") return;
    if (this.heldCube) {
      // bırak: hafif ileri fırlat (butona/rampaya bırakabilmek için)
      const c = this.heldCube;
      if (c.collider) c.collider.disabled = false;
      c.velocity.copy(this.controller.velocity);
      c.velocity.addScaledVector(this.controller.getForward(), 2.5);
      c.onGround = false;
      c.lastCenter.copy(c.pos);
      this.heldCube = null;
    } else {
      // önümdeki en yakın küpü yakala (erişim ~3 birim)
      const eye = this.controller.eyePosition;
      const f = this.controller.getForward();
      let best = null, bestD = 3.2;
      for (const cube of this.level.cubes) {
        if (!cube.grabbable) continue; // sadece taşınabilir olarak işaretli küpler
        const to = cube.pos.clone().sub(eye);
        const d = to.length();
        if (d > 3.2) continue;
        if (to.multiplyScalar(1 / Math.max(d, 1e-4)).dot(f) < 0.35) continue; // kabaca önümde
        if (d < bestD) { bestD = d; best = cube; }
      }
      if (best) {
        this.heldCube = best;
        if (best.collider) best.collider.disabled = true; // oyuncuyu engellemesin / duvara saplanmasın
      }
    }
  }

  // tutulan küpü her kare kameranın önünde konumla (kinematik)
  _updateHeldCube() {
    const c = this.heldCube;
    if (!c) return;
    const eye = this.controller.eyePosition;
    const f = this.controller.getForward();
    const target = eye.clone().addScaledVector(f, 1.9);
    if (target.y < c.half + 0.05) target.y = c.half + 0.05; // yere gömülmesin
    c.pos.copy(target);
    c.velocity.set(0, 0, 0);
    c.lastCenter.copy(c.pos);
    c._sync();
    c.mesh.position.copy(c.pos);
  }

  _clearEchoes() {
    for (const e of this.echoes) {
      this.scene.remove(e.group);
      this._disposeGroup(e.group); // ~20 mesh/klon -> GPU sızıntısını önle
    }
    this.echoes = [];
  }

  // Yankı kaydını başlat/bitir. Bitince oyuncu kayıt başlangıcına ışınlanır ve
  // klon kaydı oynatır (son karede donup butonu basılı tutar).
  toggleEcho() {
    if (this.state !== "playing") return;
    const echoMax = this.level?.echoMax ?? 0;
    if (echoMax <= 0) return; // bu bölümde yankı yok
    if (!this.recording) {
      if (this.echoes.length >= echoMax) this._clearEchoes(); // sınırı aşınca baştan
      this.recording = true;
      this.recFrames = [];
      this.recStart = this.controller.position.clone();
      this.recStartYaw = this.controller.yaw;
      this._onEcho?.(true, echoMax);
    } else {
      this.recording = false;
      if (this.recFrames.length > 2) {
        const echo = new Echo(this.recFrames);
        this.scene.add(echo.group);
        this.echoes.push(echo);
      }
      // oyuncuyu kayıt başlangıcına geri al (klon senin rotanı oynar, sen yeni iş yaparsın)
      this.controller.position.copy(this.recStart);
      this.controller.velocity.set(0, 0, 0);
      this.controller.yaw = this.recStartYaw;
      this.portals.lastCenter.copy(this.controller.center);
      this._onEcho?.(false, echoMax);
    }
  }

  // bölüm grubundaki geometri/materyal/texture'ları GPU'dan serbest bırak.
  // levelGroup yalnızca bölüme özgü (paylaşılmayan) nesneler içerir -> güvenli.
  _disposeGroup(group) {
    group.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      const mat = obj.material;
      if (!mat) return;
      const mats = Array.isArray(mat) ? mat : [mat];
      for (const m of mats) {
        for (const key in m) {
          const v = m[key];
          if (v && v.isTexture) v.dispose();
        }
        m.dispose();
      }
    });
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
    // lazerler: ışın yolunu hesapla, alıcıları kontrol et
    for (const lz of this.level.lasers) lz.update(dt, this.level, this.portals);
    for (const rc of this.level.laserReceivers) rc.check(this.level.lasers);
    for (const g of this.level.logicGates) g.update();

    // hareketli platformlar: önce hareket et, üstündeki oyuncuyu taşı
    for (const mp of this.level.movers) mp.update(dt);
    for (const mp of this.level.movers) {
      const p = this.controller.position;
      const c = mp.collider;
      if (p.x > c.min.x - 0.35 && p.x < c.max.x + 0.35 && p.z > c.min.z - 0.35 && p.z < c.max.z + 0.35 && Math.abs(p.y - c.max.y) < 0.3) {
        p.add(mp.delta);
      }
    }

    this._mirrorJump = this.input._jump; // ayna için zıplamayı oyuncu tüketmeden yakala
    this.controller.update(dt, this.input, this.level, this.portals);
    this.portals.update(dt);
    const exitNormal = this.portals.tryTeleport(this.controller);
    if (exitNormal) this.controller.depenetrateAlong(exitNormal, this.level.colliders, this.portals);

    // Yankı: kayıttaysa oyuncu ayak konumunu biriktir; klonları oynat
    if (this.recording) {
      this.recFrames.push(this.controller.position.clone());
      if (this.recFrames.length >= this.maxRecFrames) this.toggleEcho(); // otomatik bitir
    }
    for (const echo of this.echoes) echo.update();

    // Ayna: X ekseninde yansıyan girdiyle kendi fiziğini sür + avatarı canlandır
    if (this.mirror) {
      this.mirror.yaw = -this.controller.yaw;
      const mInput = { aimDX: 0, aimDY: 0, moveX: -this.input.moveX, moveY: this.input.moveY, consumeJump: () => { const j = this._mirrorJump; this._mirrorJump = false; return j; } };
      this.mirror.update(dt, mInput, this.level, this.portals);
      if (this.mirror.position.y < -10) { this.mirror.reset(this.level.mirror.spawn); this.mirrorPrev.copy(this.level.mirror.spawn); }
      walkFigure(this.mirrorState, this.mirrorFig, this.mirror.position, this.mirrorPrev);
      this.mirrorFig.group.position.copy(this.mirror.position);
      this.mirrorPrev.copy(this.mirror.position);
    }

    // tutulan küp: kameranın önünde taşınır (fizik yok)
    this._updateHeldCube();

    // interaktif nesneler: yük küpleri, butonlar, kapılar
    for (const cube of this.level.cubes) {
      if (cube === this.heldCube) continue; // tutulan küp kinematik
      cube.update(dt, this.level, this.portals);
      const cn = this.portals.teleportEntity(cube);
      if (cn) cube.depenetrateAlong(cn, this.level.colliders, this.portals);
    }
    // fizzler (şebeke): oyuncu geçince portallar sıfırlanır, küp erir
    for (const fz of this.level.fizzlers) {
      fz.update(dt);
      if (fz.contains(this.controller.center)) this.portals.reset();
      for (const cube of this.level.cubes) {
        if (fz.overlaps(cube.collider.min, cube.collider.max)) {
          cube.pos.copy(cube.spawn); cube.velocity.set(0, 0, 0); cube.lastCenter.copy(cube.pos); cube._sync();
        }
      }
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
      // jel blobu zemine düştü -> tek paylaşılan sıçrama yamasını oraya taşı/oluştur
      if (b.gel && b.splat) {
        if (!this._gelPatch) {
          this._gelPatch = new BouncePad(b.splat.clone(), 18);
          this.scene.add(this._gelPatch.group);
          this.level.bouncePads.push(this._gelPatch);
        } else {
          this._gelPatch.pos.copy(b.splat);
          this._gelPatch.group.position.copy(b.splat);
        }
        b.splat = null;
      }
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

    const pressers = this.mirror ? [...this.echoes, { position: this.mirror.position }] : this.echoes;
    for (const button of this.level.buttons) button.update(this.level.cubes, this.controller, pressers);
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
      let ok = this.controller.center.distanceTo(this.level.exit.pos) < this.level.exit.radius + 0.6;
      // ayna bölümünde ÇIKIŞI tanımlıysa: oyuncu VE ayna kendi çıkışlarında olmalı
      if (ok && this.level.mirror && this.level.mirror.exit && this.mirror) {
        const dm = this.mirror.center.distanceTo(this.level.mirror.exit);
        ok = dm < (this.level.mirror.exitRadius ?? 2.0) + 0.6;
      }
      if (ok) {
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
    this.renderer.info.reset(); // autoReset kapalı: kare başında biz sıfırlarız

    const t0 = performance.now();
    this.scenery?.update(dt);
    this._update(dt);
    const t1 = performance.now();
    // görülebilir portal: karşı tarafı portallara çiz (composer'dan önce)
    if (this.state === "playing") this.portals.renderViews(this.renderer, this.scene, this.camera);
    const t2 = performance.now();
    this.composer.render();
    const t3 = performance.now();

    this.perf.sample(t1 - t0, t2 - t1, t3 - t2, this.renderer, this.portals);
    this.input.endFrame();
  }

  _onResize() {
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(innerWidth, innerHeight);
    this.composer.setSize(innerWidth, innerHeight);
  }
}
