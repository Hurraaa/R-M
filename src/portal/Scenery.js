import * as THREE from "three";

// Ferah, manzaralı Rick & Morty alien gökyüzü ve uzak dekor.
// Hepsi statik/uzak (çarpışmasız, gölgesiz) — sadece atmosfer için.

const skyVert = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const skyFrag = /* glsl */ `
  precision highp float;
  varying vec3 vDir;
  uniform vec3 uTop;
  uniform vec3 uHorizon;
  uniform vec3 uGround;
  void main() {
    float h = vDir.y;
    vec3 col;
    if (h > 0.0) col = mix(uHorizon, uTop, pow(clamp(h,0.0,1.0), 0.55));
    else col = mix(uHorizon, uGround, clamp(-h*2.0, 0.0, 1.0));
    gl_FragColor = vec4(col, 1.0);
  }
`;

export class Scenery {
  constructor(scene) {
    this.scene = scene;
    this.spinners = [];
    this._sky();
    this._planet();
    this._islands();
    this._farPortals();
    this._clouds();
  }

  _sky() {
    const geo = new THREE.SphereGeometry(280, 32, 16);
    const mat = new THREE.ShaderMaterial({
      vertexShader: skyVert,
      fragmentShader: skyFrag,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        uTop: { value: new THREE.Color(0x2f6fb0) },     // üst: teal-mavi
        uHorizon: { value: new THREE.Color(0xe9d8a8) },  // ufuk: sıcak şeftali
        uGround: { value: new THREE.Color(0x6a5a7a) },   // alt: yumuşak mor
      },
    });
    this.scene.add(new THREE.Mesh(geo, mat));
  }

  _planet() {
    const g = new THREE.Group();
    const planet = new THREE.Mesh(
      new THREE.SphereGeometry(22, 32, 32),
      new THREE.MeshBasicMaterial({ color: 0xd98ad0, fog: false })
    );
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(34, 3.2, 2, 64),
      new THREE.MeshBasicMaterial({ color: 0xffe1a8, fog: false, transparent: true, opacity: 0.85 })
    );
    ring.rotation.x = Math.PI / 2.3;
    g.add(planet, ring);
    g.position.set(-120, 70, -150);
    this.scene.add(g);

    // ikinci küçük ay
    const moon = new THREE.Mesh(
      new THREE.SphereGeometry(9, 24, 24),
      new THREE.MeshBasicMaterial({ color: 0x9fe6c4, fog: false })
    );
    moon.position.set(140, 95, -120);
    this.scene.add(moon);
  }

  _islands() {
    const topMat = new THREE.MeshStandardMaterial({ color: 0x6fcf8f, roughness: 1, flatShading: true });
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x8a6f9c, roughness: 1, flatShading: true });
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + 0.3;
      const r = 75 + Math.random() * 90;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r - 30;
      const y = 8 + Math.random() * 55;
      const s = 6 + Math.random() * 12;

      const g = new THREE.Group();
      const top = new THREE.Mesh(new THREE.CylinderGeometry(s, s * 0.9, s * 0.4, 7), topMat);
      const base = new THREE.Mesh(new THREE.ConeGeometry(s * 0.9, s * 1.6, 7), rockMat);
      base.position.y = -s * 0.9;
      g.add(top, base);
      g.position.set(x, y, z);
      g.rotation.y = Math.random() * Math.PI;
      this.scene.add(g);
    }
  }

  _farPortals() {
    // uzakta yavaşça dönen dev yeşil portallar (R&M imzası)
    for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(10 + i * 3, 0.8, 8, 48),
        new THREE.MeshBasicMaterial({ color: 0x8cff66, fog: false, transparent: true, opacity: 0.9 })
      );
      const disc = new THREE.Mesh(
        new THREE.CircleGeometry(10 + i * 3, 40),
        new THREE.MeshBasicMaterial({ color: 0x3fae4a, fog: false, transparent: true, opacity: 0.5, side: THREE.DoubleSide })
      );
      const g = new THREE.Group();
      g.add(ring, disc);
      const a = i * 2.1;
      g.position.set(Math.cos(a) * 120, 30 + i * 18, -90 - i * 30);
      g.lookAt(0, 20, 0);
      this.scene.add(g);
      this.spinners.push(g);
    }
  }

  _clouds() {
    const mat = new THREE.MeshBasicMaterial({ color: 0xf2e6d0, fog: false, transparent: true, opacity: 0.55 });
    for (let i = 0; i < 7; i++) {
      const cloud = new THREE.Mesh(new THREE.SphereGeometry(10 + Math.random() * 10, 10, 8), mat);
      cloud.scale.set(2.4, 0.5, 1.4);
      const a = Math.random() * Math.PI * 2;
      cloud.position.set(Math.cos(a) * (120 + Math.random() * 80), 40 + Math.random() * 40, Math.sin(a) * (120 + Math.random() * 80));
      this.scene.add(cloud);
    }
  }

  update(dt) {
    for (const s of this.spinners) s.rotation.z += dt * 0.25;
  }
}
