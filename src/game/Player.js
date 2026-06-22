import * as THREE from "three";

// Stilize "çılgın bilim insanı" — telifsiz, kod içinde temel şekillerden inşa.
// Lab önlüğü, mavi dikenli saç, portal silahı. Procedural yürüme animasyonu.

export class Player {
  constructor() {
    this.group = new THREE.Group();
    this.yaw = 0;
    this.velocity = new THREE.Vector3();
    this.walkPhase = 0;
    this.speed = 7;
    this.runSpeed = 12;
    this.health = 100;
    this.muzzleFlash = 0;

    this._build();
  }

  _build() {
    const skin = new THREE.MeshStandardMaterial({ color: 0xf0c9a0, roughness: 0.8 });
    const coat = new THREE.MeshStandardMaterial({ color: 0xeef2f5, roughness: 0.7 });
    const hair = new THREE.MeshStandardMaterial({ color: 0x8fd6ff, roughness: 0.6 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x2a2f3a, roughness: 0.9 });

    // Önlük gövde
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.5, 0.7, 4, 12), coat);
    torso.position.y = 1.25;
    torso.castShadow = true;
    this.group.add(torso);

    // Bacaklar
    const legGeo = new THREE.CapsuleGeometry(0.18, 0.6, 4, 8);
    this.legL = new THREE.Mesh(legGeo, dark);
    this.legR = new THREE.Mesh(legGeo, dark);
    this.legL.position.set(-0.22, 0.5, 0);
    this.legR.position.set(0.22, 0.5, 0);
    this.legL.castShadow = this.legR.castShadow = true;
    this.group.add(this.legL, this.legR);

    // Kollar (silah taşıyan sağ kol ileride)
    const armGeo = new THREE.CapsuleGeometry(0.13, 0.5, 4, 8);
    this.armL = new THREE.Mesh(armGeo, coat);
    this.armR = new THREE.Mesh(armGeo, coat);
    this.armL.position.set(-0.6, 1.35, 0);
    this.armR.position.set(0.55, 1.3, 0.1);
    this.armR.rotation.x = -1.1; // ileri uzanır
    this.group.add(this.armL, this.armR);

    // Kafa
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.36, 16, 16), skin);
    head.position.y = 2.05;
    head.castShadow = true;
    this.group.add(head);

    // Dikenli saç — birkaç koni
    for (let i = 0; i < 9; i++) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.32, 6), hair);
      const a = (i / 9) * Math.PI * 2;
      spike.position.set(Math.cos(a) * 0.22, 2.32 + Math.random() * 0.06, Math.sin(a) * 0.22 - 0.05);
      spike.rotation.z = Math.cos(a) * -0.5;
      spike.rotation.x = Math.sin(a) * 0.5;
      this.group.add(spike);
    }
    const topSpike = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.4, 6), hair);
    topSpike.position.set(0, 2.45, 0);
    this.group.add(topSpike);

    // Gözler
    const eyeGeo = new THREE.SphereGeometry(0.08, 10, 10);
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
    const pupilMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
    for (const sx of [-0.13, 0.13]) {
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(sx, 2.08, 0.3);
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), pupilMat);
      pupil.position.set(sx, 2.08, 0.37);
      this.group.add(eye, pupil);
    }

    // Portal silahı (sağ elde)
    this.gun = new THREE.Group();
    const gunBody = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.22, 0.5), dark);
    const gunGlow = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 12, 12),
      new THREE.MeshStandardMaterial({
        color: 0x6ee84f,
        emissive: 0x6ee84f,
        emissiveIntensity: 2.5,
        roughness: 0.4,
      })
    );
    gunGlow.position.z = 0.32;
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.28, 0.12), dark);
    grip.position.set(0, -0.2, -0.1);
    this.gun.add(gunBody, gunGlow, grip);
    this.gun.position.set(0.55, 1.15, 0.55);
    this.gunGlow = gunGlow;
    this.group.add(this.gun);

    // Namlu ışığı (ateş ederken parlar)
    this.muzzleLight = new THREE.PointLight(0x9cff6a, 0, 6, 2);
    this.gun.add(this.muzzleLight);
  }

  get position() {
    return this.group.position;
  }

  // namlu ucunun dünya koordinatı ve ileri yönü
  getMuzzle() {
    const origin = new THREE.Vector3(0, 0, 0.4);
    this.gun.localToWorld(origin);
    const dir = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw)).normalize();
    return { origin, dir };
  }

  triggerMuzzleFlash() {
    this.muzzleFlash = 1;
  }

  update(dt, input) {
    // fare/dokunmatik ile dönüş
    this.yaw -= input.aimDX * 0.0025;
    this.group.rotation.y = this.yaw;

    // analog hareket (yaw'a göre) — rightV ekran-sağı ile hizalı
    const fwd = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    const rightV = new THREE.Vector3(-Math.cos(this.yaw), 0, Math.sin(this.yaw));
    const move = new THREE.Vector3();
    move.addScaledVector(fwd, input.moveY);
    move.addScaledVector(rightV, input.moveX);

    const moving = move.lengthSq() > 0.01;
    const spd = input.running ? this.runSpeed : this.speed;
    if (moving) {
      // analog büyüklüğü koru (joystick), ama 1'i aşma
      if (move.length() > 1) move.normalize();
      move.multiplyScalar(spd);
      this.walkPhase += dt * (input.running ? 16 : 11);
    } else {
      this.walkPhase *= 0.8;
    }
    this.velocity.lerp(move, Math.min(1, dt * 12));
    this.group.position.addScaledVector(this.velocity, dt);

    // arena sınırı
    const limit = 38;
    this.group.position.x = THREE.MathUtils.clamp(this.group.position.x, -limit, limit);
    this.group.position.z = THREE.MathUtils.clamp(this.group.position.z, -limit, limit);

    // yürüme animasyonu
    const swing = Math.sin(this.walkPhase) * 0.5 * (moving ? 1 : 0);
    this.legL.rotation.x = swing;
    this.legR.rotation.x = -swing;
    this.armL.rotation.x = -swing * 0.6;
    // idle nefes
    this.group.position.y = Math.sin(this.walkPhase * 0.5) * 0.04;

    // namlu flaşı sönümlenir
    this.muzzleFlash = Math.max(0, this.muzzleFlash - dt * 6);
    this.muzzleLight.intensity = this.muzzleFlash * 5;
    this.gunGlow.material.emissiveIntensity = 2.0 + this.muzzleFlash * 4;
  }
}
