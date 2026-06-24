import * as THREE from "three";

// Ferah Rick & Morty gökyüzü + KÜBİST (Picasso tarzı) gök figürleri:
// keskin geometrik fasetler, cesur düz renkler, siyah konturlar.
// Hepsi uzak/çarpışmasız/gölgesiz. update() ile yumuşak hareket.

const skyVert = /* glsl */ `
  varying vec3 vDir;
  void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const skyFrag = /* glsl */ `
  precision highp float;
  varying vec3 vDir;
  uniform vec3 uTop, uHorizon, uGround;
  uniform float uTime;
  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.0-2.0*f);
    return mix(mix(hash(i),hash(i+vec2(1,0)),u.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x), u.y); }
  float fbm(vec2 p){ float v=0.0,a=0.5; for(int i=0;i<4;i++){v+=a*noise(p);p*=2.0;a*=0.5;} return v; }
  void main(){
    float h = vDir.y;
    vec3 col = h>0.0 ? mix(uHorizon,uTop,pow(clamp(h,0.0,1.0),0.55)) : mix(uHorizon,uGround,clamp(-h*2.0,0.0,1.0));
    float az = atan(vDir.z, vDir.x);
    float wob = fbm(vec2(az*1.5, uTime*0.03));
    float h0 = 0.30 + (wob-0.5)*0.45;
    float curtain = smoothstep(0.16,0.0,abs(vDir.y-h0));
    float streaks = fbm(vec2(az*9.0 - uTime*0.05, vDir.y*4.0));
    curtain *= 0.45 + 0.55*streaks;
    curtain *= smoothstep(0.02,0.22,vDir.y);
    vec3 aur = mix(vec3(0.15,0.95,0.55), vec3(0.45,0.25,0.95), smoothstep(0.35,0.85,streaks));
    col += aur*curtain*0.5;
    float mask = smoothstep(0.05,0.5,vDir.y);
    col += vec3(0.4,0.2,0.45)*pow(fbm(vec2(az*1.2,vDir.y*2.5)+5.0),2.5)*mask*0.15;
    float star = step(0.995, hash(floor(vDir.xz*140.0)));
    col += vec3(0.8)*star*smoothstep(0.1,0.5,vDir.y)*0.35;
    gl_FragColor = vec4(col,1.0);
  }
`;

const V = (x, y, z) => new THREE.Vector3(x, y, z);

// Picasso esinli palet
const ART = {
  blue: 0x2b4a7a, teal: 0x2f8f8f, ochre: 0xd99a3c, terra: 0xc75b3f,
  cream: 0xe8dcc0, rose: 0xb56a7a, green: 0x6fae5a, plum: 0x6a4a86, charcoal: 0x20202a,
};

export class Scenery {
  constructor(scene) {
    this.scene = scene;
    this.t = 0;
    this.spinners = [];
    this.clouds = [];
    this.figures = []; // kübist ağaç/figürler
    this.birds = [];
    this.crystals = [];
    this._edgeMat = new THREE.LineBasicMaterial({ color: 0x171019 });

    this._sky();
    this._planet();
    this._cubistFigures();
    this._cubistBirds();
    this._farPortals();
    this._clouds();
    this._crystals();
  }

  // ---- kübist yardımcılar ----
  _facet(group, pts, color, z = 0) {
    const shape = new THREE.Shape();
    shape.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i][0], pts[i][1]);
    shape.closePath();
    const geo = new THREE.ShapeGeometry(shape);
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }));
    mesh.position.z = z;
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), this._edgeMat);
    edges.position.z = z + 0.02;
    group.add(mesh, edges);
  }
  _disc(group, x, y, r, color, z = 0) {
    const geo = new THREE.CircleGeometry(r, 18);
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }));
    mesh.position.set(x, y, z);
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), this._edgeMat);
    edges.position.set(x, y, z + 0.02);
    group.add(mesh, edges);
  }

  _sky() {
    this.skyMat = new THREE.ShaderMaterial({
      vertexShader: skyVert, fragmentShader: skyFrag, side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: {
        uTop: { value: new THREE.Color(0x274f7a) },
        uHorizon: { value: new THREE.Color(0x8f7e86) },
        uGround: { value: new THREE.Color(0x352f48) },
        uTime: { value: 0 },
      },
    });
    this.scene.add(new THREE.Mesh(new THREE.SphereGeometry(290, 32, 16), this.skyMat));
  }

  _ball(color, radius, pos) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(radius, 24, 24), new THREE.MeshBasicMaterial({ color, fog: false }));
    m.position.copy(pos);
    this.scene.add(m);
    return m;
  }
  _ringedPlanet(color, radius, ringR, ringColor, pos) {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.SphereGeometry(radius, 32, 32), new THREE.MeshBasicMaterial({ color, fog: false })));
    const ring = new THREE.Mesh(new THREE.TorusGeometry(ringR, radius * 0.14, 2, 64),
      new THREE.MeshBasicMaterial({ color: ringColor, fog: false, transparent: true, opacity: 0.85 }));
    ring.rotation.x = Math.PI / 2.3;
    g.add(ring);
    g.position.copy(pos);
    this.scene.add(g);
    return g;
  }
  _planet() {
    this.planet = this._ringedPlanet(0xd98ad0, 22, 34, 0xffe1a8, V(-120, 70, -150));
    this._ball(0x9fe6c4, 9, V(140, 95, -120));
    this._ball(0xff8f6b, 14, V(95, 55, -195));
    this._ball(0x7aa0ff, 7, V(-55, 115, -160));
    this._ringedPlanet(0xc0d860, 10, 16, 0xeff0c8, V(175, 45, -70));
  }

  // ---- kübist gök figürleri (soyut ağaç/natürmort) ----
  _cubistFigures() {
    const A = ART;
    for (let i = 0; i < 11; i++) {
      const g = new THREE.Group();
      const v = i % 4;

      if (v === 0) {
        // yapraklı ağaç — üst üste fasetli taç
        this._facet(g, [[-0.18, -1.2], [0.18, -1.2], [0.12, 0.3], [-0.12, 0.3]], A.charcoal, 0);
        this._facet(g, [[-1.0, 0.0], [0.9, 0.25], [0.0, 1.5]], A.teal, 0.05);
        this._facet(g, [[-0.85, 0.35], [0.7, 0.1], [1.05, 1.05], [0.0, 1.7], [-1.05, 0.95]], A.green, 0.1);
        this._facet(g, [[0.0, 0.5], [1.2, 0.8], [0.35, 1.6]], A.blue, 0.15);
        this._facet(g, [[-0.55, 0.8], [0.05, 0.7], [-0.25, 1.35]], A.ochre, 0.2);
      } else if (v === 1) {
        // soyut natürmort shardları + güneş
        this._facet(g, [[-1.0, -1.0], [0.6, -0.8], [0.25, 0.6], [-1.0, 0.4]], A.terra, 0);
        this._facet(g, [[-0.3, -0.6], [1.1, -0.4], [0.9, 0.9], [-0.1, 0.7]], A.ochre, 0.06);
        this._facet(g, [[0.0, 0.2], [0.95, 0.55], [0.3, 1.3]], A.blue, 0.12);
        this._disc(g, 0.2, 1.2, 0.45, A.cream, 0.18);
      } else if (v === 2) {
        // uzun kübist servi
        this._facet(g, [[-0.32, -1.3], [0.32, -1.3], [0.16, 1.6], [-0.16, 1.6]], A.teal, 0);
        this._facet(g, [[-0.55, -0.2], [0.55, 0.1], [0.0, 1.95]], A.green, 0.06);
        this._facet(g, [[-0.28, 0.5], [0.38, 0.4], [0.0, 1.55]], A.cream, 0.12);
        this._facet(g, [[-0.4, -1.0], [0.4, -1.0], [0.2, -0.3], [-0.2, -0.3]], A.charcoal, 0.04);
      } else {
        // tepe + güneş + uçan kuş silüeti (tek figürde kompozisyon)
        this._facet(g, [[-1.3, -0.5], [1.3, -0.3], [0.3, 0.7], [-1.1, 0.5]], A.green, 0);
        this._facet(g, [[-1.3, -1.1], [1.3, -1.1], [1.3, -0.4], [-1.3, -0.55]], A.plum, -0.04);
        this._disc(g, 0.5, 1.0, 0.5, A.ochre, 0.1);
        this._facet(g, [[-0.9, 0.9], [-0.4, 1.05], [-0.65, 1.25]], A.charcoal, 0.16);
      }

      const s = 4 + Math.random() * 7;
      g.scale.setScalar(s);
      const a = (i / 11) * Math.PI * 2 + 0.3;
      const r = 72 + Math.random() * 95;
      g.position.set(Math.cos(a) * r, 12 + Math.random() * 46, Math.sin(a) * r - 30);
      g.rotation.y = Math.atan2(-g.position.x, -g.position.z); // +z'yi merkeze çevir
      this.scene.add(g);
      this.figures.push({ mesh: g, baseY: g.position.y, baseYaw: g.rotation.y, phase: Math.random() * 6.28, amp: 1 + Math.random() * 2 });
    }
  }

  // ---- kübist kuşlar ----
  _cubistBirds() {
    const A = ART;
    const wingCols = [A.teal, A.blue, A.rose, A.ochre];
    for (let i = 0; i < 6; i++) {
      const g = new THREE.Group();
      const body = new THREE.Group();
      this._facet(body, [[-0.7, 0], [0.7, 0.12], [0.15, -0.45]], A.terra, 0); // gövde shard
      this._facet(body, [[0.5, 0.06], [1.05, 0.2], [0.55, -0.14]], A.ochre, 0.02); // baş/gaga
      const wL = new THREE.Group();
      this._facet(wL, [[0, 0], [-1.15, 0.95], [0.25, 0.28]], wingCols[i % wingCols.length], 0);
      const wR = new THREE.Group();
      this._facet(wR, [[0, 0], [-1.15, -0.95], [0.25, -0.28]], wingCols[(i + 2) % wingCols.length], 0);
      g.add(body, wL, wR);
      g.scale.setScalar(2.6 + Math.random() * 2.4);
      this.scene.add(g);
      this.birds.push({
        mesh: g, wL, wR,
        r: 55 + Math.random() * 72, h: 24 + Math.random() * 42,
        angle: Math.random() * 6.28, speed: (0.05 + Math.random() * 0.08) * (Math.random() < 0.5 ? -1 : 1),
        phase: Math.random() * 6.28,
      });
    }
  }

  _farPortals() {
    for (let i = 0; i < 3; i++) {
      const rad = 10 + i * 3;
      const g = new THREE.Group();
      g.add(new THREE.Mesh(new THREE.TorusGeometry(rad, 0.8, 8, 48), new THREE.MeshBasicMaterial({ color: 0x8cff66, fog: false, transparent: true, opacity: 0.9 })));
      g.add(new THREE.Mesh(new THREE.TorusGeometry(rad + 1.4, 0.3, 8, 48), new THREE.MeshBasicMaterial({ color: 0xd8ffc0, fog: false, transparent: true, opacity: 0.4 })));
      g.add(new THREE.Mesh(new THREE.CircleGeometry(rad, 40), new THREE.MeshBasicMaterial({ color: 0x2f9a3e, fog: false, transparent: true, opacity: 0.45, side: THREE.DoubleSide })));
      const a = i * 2.1;
      g.position.set(Math.cos(a) * 120, 30 + i * 18, -90 - i * 30);
      g.lookAt(0, 20, 0);
      this.scene.add(g);
      this.spinners.push(g);
    }
  }

  _clouds() {
    const mat = new THREE.MeshBasicMaterial({ color: 0xece0cc, fog: false, transparent: true, opacity: 0.45 });
    for (let i = 0; i < 7; i++) {
      const c = new THREE.Mesh(new THREE.SphereGeometry(10 + Math.random() * 10, 10, 8), mat);
      c.scale.set(2.4, 0.5, 1.4);
      const a = Math.random() * Math.PI * 2;
      const r = 120 + Math.random() * 80;
      c.position.set(Math.cos(a) * r, 40 + Math.random() * 40, Math.sin(a) * r);
      this.scene.add(c);
      this.clouds.push({ mesh: c, speed: 0.6 + Math.random() * 0.8, r });
    }
  }

  _crystals() {
    const cols = [[0x5ad6e6, 0x1c7d8c], [0xb98ae6, 0x4a2c7d], [0xff8fd0, 0x7d2c5a], [0x8fe6a0, 0x2c7d3c]];
    for (let i = 0; i < 8; i++) {
      const h = 2 + Math.random() * 4;
      const [c0, c1] = cols[i % cols.length];
      const mat = new THREE.MeshStandardMaterial({ color: c0, emissive: c1, emissiveIntensity: 0.8, roughness: 0.2, flatShading: true, transparent: true, opacity: 0.92 });
      const geo = i % 3 === 0 ? new THREE.OctahedronGeometry(h * 0.5, 0) : new THREE.ConeGeometry(h * 0.4, h, 5);
      const c = new THREE.Mesh(geo, mat);
      const a = Math.random() * Math.PI * 2;
      const r = 45 + Math.random() * 60;
      c.position.set(Math.cos(a) * r, 14 + Math.random() * 40, Math.sin(a) * r - 20);
      c.rotation.z = Math.random() * Math.PI;
      this.scene.add(c);
      this.crystals.push({ mesh: c, baseY: c.position.y, phase: Math.random() * 6.28, spin: 0.2 + Math.random() * 0.4 });
    }
  }

  update(dt) {
    this.t += dt;
    const t = this.t;
    if (this.skyMat) this.skyMat.uniforms.uTime.value = t;
    for (const s of this.spinners) s.rotation.z += dt * 0.25;
    if (this.planet) this.planet.rotation.y += dt * 0.03;

    for (const c of this.clouds) {
      c.mesh.position.x += dt * c.speed;
      if (c.mesh.position.x > c.r + 60) c.mesh.position.x = -c.r - 60;
    }
    for (const f of this.figures) {
      f.mesh.position.y = f.baseY + Math.sin(t * 0.4 + f.phase) * f.amp;
      f.mesh.rotation.y = f.baseYaw + Math.sin(t * 0.3 + f.phase) * 0.12; // hafif salınım
    }
    for (const cr of this.crystals) {
      cr.mesh.rotation.y += dt * cr.spin;
      cr.mesh.position.y = cr.baseY + Math.sin(t * 0.6 + cr.phase) * 1.5;
    }
    for (const b of this.birds) {
      b.angle += dt * b.speed;
      b.mesh.position.set(Math.cos(b.angle) * b.r, b.h + Math.sin(t * 0.5 + b.phase) * 3, Math.sin(b.angle) * b.r - 20);
      b.mesh.rotation.y = -b.angle + (b.speed > 0 ? Math.PI : 0);
      const flap = Math.sin(t * 4 + b.phase) * 0.6;
      b.wL.rotation.x = flap;
      b.wR.rotation.x = -flap;
    }
  }
}
