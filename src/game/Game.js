import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";

import { Input } from "./Input.js";
import { World } from "./World.js";
import { Player } from "./Player.js";
import { Portal } from "./Portal.js";
import { Enemy } from "./Enemy.js";
import { Projectile } from "./Projectile.js";
import { Particles } from "./Particles.js";

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.state = "menu"; // menu | playing | dead
    this.score = 0;
    this.wave = 1;
    this.spawnTimer = 0;
    this.fireCooldown = 0;

    this.enemies = [];
    this.projectiles = [];
    this.portals = [];

    this._initRenderer();
    this._initScene();
    this._initPost();
    this.input = new Input(canvas);

    addEventListener("resize", () => this._onResize());

    this.clock = new THREE.Clock();
    this._loop = this._loop.bind(this);
    requestAnimationFrame(this._loop);
  }

  _initRenderer() {
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
  }

  _initScene() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.1, 400);

    this.world = new World(this.scene);
    this.player = new Player();
    this.scene.add(this.player.group);
    this.particles = new Particles(this.scene);

    this.camera.position.set(0, 6, -8);
  }

  _initPost() {
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));

    const bloom = new UnrealBloomPass(
      new THREE.Vector2(innerWidth, innerHeight),
      0.85, // güç
      0.5, // yarıçap
      0.12 // eşik
    );
    this.bloom = bloom;
    this.composer.addPass(bloom);
    this.composer.addPass(new OutputPass());
  }

  // ---------------- Oyun akışı ----------------
  start() {
    this.state = "playing";
    this.score = 0;
    this.wave = 1;
    this.spawnTimer = 1;
    this.player.health = 100;
    this.player.position.set(0, 0, 0);
    this.player.yaw = 0;

    // var olan düşman/portal/mermi temizle
    for (const e of this.enemies) this.scene.remove(e.group);
    for (const p of this.projectiles) this.scene.remove(p.mesh);
    for (const pt of this.portals) pt.removeFrom(this.scene);
    this.enemies = [];
    this.projectiles = [];
    this.portals = [];

    this.input.lock();
    this._onHud?.();
  }

  gameOver() {
    this.state = "dead";
    document.exitPointerLock?.();
    this._onGameOver?.(this.score);
  }

  spawnPortalWithEnemies() {
    const a = Math.random() * Math.PI * 2;
    const r = 18 + Math.random() * 12;
    const pos = new THREE.Vector3(Math.cos(a) * r, 2.2, Math.sin(a) * r);
    const portal = new Portal(pos);
    portal.addTo(this.scene);
    this.portals.push(portal);

    const count = 2 + Math.floor(this.wave * 0.7);
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        if (this.state !== "playing") return;
        const ep = pos.clone();
        ep.x += (Math.random() - 0.5) * 2;
        ep.z += (Math.random() - 0.5) * 2;
        ep.y = 0;
        const enemy = new Enemy(ep, this.wave);
        this.scene.add(enemy.group);
        this.enemies.push(enemy);
      }, 600 + i * 350);
    }

    // portal bir süre sonra kapanır
    setTimeout(() => {
      const idx = this.portals.indexOf(portal);
      if (idx >= 0) {
        portal.removeFrom(this.scene);
        this.portals.splice(idx, 1);
      }
    }, 3500);
  }

  fire() {
    const { origin, dir } = this.player.getMuzzle();
    const p = new Projectile(origin, dir);
    this.scene.add(p.mesh);
    this.projectiles.push(p);
    this.player.triggerMuzzleFlash();
  }

  // ---------------- Güncelleme ----------------
  _update(dt) {
    if (this.state !== "playing") return;

    this.player.update(dt, this.input);

    // ateş
    this.fireCooldown -= dt;
    if (this.input.firing && this.fireCooldown <= 0) {
      this.fire();
      this.fireCooldown = 0.16;
    }

    // dalga / spawn yönetimi
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnPortalWithEnemies();
      this.spawnTimer = Math.max(2.2, 5 - this.wave * 0.25);
    }

    // portallar
    for (const pt of this.portals) pt.update(dt, this.camera);

    // mermiler
    for (const p of this.projectiles) p.update(dt);

    // düşmanlar + çarpışma
    const target = this.player.position;
    for (const e of this.enemies) {
      e.update(dt, target);

      // mermi çarpışması
      for (const p of this.projectiles) {
        if (p.dead) continue;
        if (p.mesh.position.distanceTo(e.group.position) < e.radius + p.radius + 0.2) {
          p.dead = true;
          const killed = e.hit(p.damage);
          this.particles.burst(e.group.position, 0xaaff7a, 10, 5);
          if (killed) {
            this.particles.burst(e.group.position, 0xff4fd8, 28, 8);
            this.score += 10 * this.wave;
            this._onHud?.();
          }
        }
      }

      // oyuncuya temas — saniyede ~18 hasar
      if (!e.dead && e.reaches(target, e.radius + 1.1)) {
        this.player.health -= 18 * dt;
        this._onHud?.();
        if (this.player.health <= 0) {
          this.gameOver();
        }
      }
    }

    // ölüleri temizle
    this.enemies = this.enemies.filter((e) => {
      if (e.dead) {
        this.scene.remove(e.group);
        return false;
      }
      return true;
    });
    this.projectiles = this.projectiles.filter((p) => {
      if (p.dead) {
        this.scene.remove(p.mesh);
        return false;
      }
      return true;
    });

    // skora göre dalga ilerlet
    const newWave = 1 + Math.floor(this.score / 150);
    if (newWave > this.wave) {
      this.wave = newWave;
      this._onWave?.(this.wave);
    }

    this.particles.update(dt);
    this._updateCamera(dt);
  }

  _updateCamera(dt) {
    // oyuncunun arkasında yumuşak takip
    const yaw = this.player.yaw;
    const back = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
    const desired = this.player.position
      .clone()
      .addScaledVector(back, 8)
      .add(new THREE.Vector3(0, 6.5, 0));
    this.camera.position.lerp(desired, Math.min(1, dt * 6));

    const look = this.player.position.clone().add(new THREE.Vector3(0, 2.2, 0));
    look.addScaledVector(new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)), 6);
    this.camera.lookAt(look);
  }

  _loop() {
    requestAnimationFrame(this._loop);
    const dt = Math.min(0.05, this.clock.getDelta());
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
