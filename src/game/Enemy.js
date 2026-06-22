import * as THREE from "three";

// Boyutlar-arası alien yaratık — stilize blob. Oyuncuya doğru zıplayarak gelir.
export class Enemy {
  constructor(position, waveScale = 1) {
    this.group = new THREE.Group();
    this.group.position.copy(position);
    this.health = 2 + Math.floor(waveScale);
    this.maxHealth = this.health;
    this.speed = 2.5 + Math.random() * 1.5 + waveScale * 0.3;
    this.dead = false;
    this.hopPhase = Math.random() * Math.PI * 2;
    this.radius = 0.7;
    this.hitFlash = 0;

    const hue = 0.78 + Math.random() * 0.12; // mor/pembe tonları
    this.bodyMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(hue, 0.7, 0.5),
      roughness: 0.5,
      emissive: new THREE.Color().setHSL(hue, 0.8, 0.2),
      emissiveIntensity: 0.6,
    });

    const body = new THREE.Mesh(new THREE.SphereGeometry(0.6, 14, 12), this.bodyMat);
    body.scale.y = 0.85;
    body.castShadow = true;
    this.body = body;
    this.group.add(body);

    // Tek büyük göz
    const eyeWhite = new THREE.Mesh(
      new THREE.SphereGeometry(0.26, 14, 14),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 })
    );
    eyeWhite.position.set(0, 0.15, 0.45);
    const pupil = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0x101015 })
    );
    pupil.position.set(0, 0.15, 0.66);
    this.group.add(eyeWhite, pupil);
    this.pupil = pupil;

    // Bacaklar (titreşen tentaküller)
    this.legs = [];
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      const leg = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.07, 0.3, 4, 6),
        this.bodyMat
      );
      leg.position.set(Math.cos(a) * 0.4, -0.4, Math.sin(a) * 0.4);
      this.group.add(leg);
      this.legs.push(leg);
    }
  }

  hit(dmg) {
    this.health -= dmg;
    this.hitFlash = 1;
    if (this.health <= 0) this.dead = true;
    return this.dead;
  }

  update(dt, target) {
    this.hopPhase += dt * 6;

    // hedefe yönel
    const dir = new THREE.Vector3().subVectors(target, this.group.position);
    dir.y = 0;
    const dist = dir.length();
    dir.normalize();
    this.group.position.addScaledVector(dir, this.speed * dt);

    // bakış yönü
    this.group.rotation.y = Math.atan2(dir.x, dir.z);

    // zıplama
    const hop = Math.abs(Math.sin(this.hopPhase)) * 0.25;
    this.group.position.y = hop;
    this.body.scale.set(1 + hop * 0.3, 0.85 - hop * 0.2, 1 + hop * 0.3);
    for (let i = 0; i < this.legs.length; i++) {
      this.legs[i].rotation.x = Math.sin(this.hopPhase + i) * 0.4;
    }

    // hasar flaşı
    if (this.hitFlash > 0) {
      this.hitFlash = Math.max(0, this.hitFlash - dt * 5);
      this.bodyMat.emissiveIntensity = 0.6 + this.hitFlash * 2.5;
      this.bodyMat.emissive.setRGB(0.6 + this.hitFlash, 0.3, 0.4);
    }

    return dist;
  }

  // basit bir kuş bakışı: oyuncuya çarptı mı?
  reaches(target, range) {
    return this.group.position.distanceTo(target) < range;
  }
}
