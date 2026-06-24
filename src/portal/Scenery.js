import * as THREE from "three";

// Ferah, özgün, hafifçe canlı Rick & Morty alien gökyüzü ve uzak dekor.
// Hepsi uzak/çarpışmasız/gölgesiz — sadece atmosfer. update() ile yumuşak hareket.

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
  uniform float uTime;

  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p){
    vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.0-2.0*f);
    return mix(mix(hash(i),hash(i+vec2(1,0)),u.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x), u.y);
  }
  float fbm(vec2 p){ float v=0.0,a=0.5; for(int i=0;i<4;i++){v+=a*noise(p);p*=2.0;a*=0.5;} return v; }

  void main() {
    float h = vDir.y;
    vec3 col = h > 0.0 ? mix(uHorizon, uTop, pow(clamp(h,0.0,1.0),0.55))
                       : mix(uHorizon, uGround, clamp(-h*2.0,0.0,1.0));

    // --- kuzey ışıkları (aurora): dalgalanan akışkan perdeler ---
    float az = atan(vDir.z, vDir.x);
    float wob = fbm(vec2(az * 1.5, uTime * 0.03));
    float h0 = 0.30 + (wob - 0.5) * 0.45;                 // dalgalı perde yüksekliği
    float curtain = smoothstep(0.16, 0.0, abs(vDir.y - h0));
    float streaks = fbm(vec2(az * 9.0 - uTime * 0.05, vDir.y * 4.0)); // dikey çizgiler
    curtain *= 0.45 + 0.55 * streaks;
    curtain *= smoothstep(0.02, 0.22, vDir.y);            // ufkun üstünde
    vec3 aur = mix(vec3(0.15, 0.95, 0.55), vec3(0.45, 0.25, 0.95), smoothstep(0.35, 0.85, streaks));
    col += aur * curtain * 0.5;

    // hafif nebula + ince yıldızlar (kısık, göz almasın)
    float mask = smoothstep(0.05, 0.5, vDir.y);
    col += vec3(0.4, 0.2, 0.45) * pow(fbm(vec2(az * 1.2, vDir.y * 2.5) + 5.0), 2.5) * mask * 0.15;
    float star = step(0.995, hash(floor(vDir.xz * 140.0)));
    col += vec3(0.8) * star * smoothstep(0.1, 0.5, vDir.y) * 0.35;

    gl_FragColor = vec4(col, 1.0);
  }
`;

const V = (x, y, z) => new THREE.Vector3(x, y, z);

export class Scenery {
  constructor(scene) {
    this.scene = scene;
    this.t = 0;
    this.spinners = [];
    this.clouds = [];
    this.islands = [];
    this.crystals = [];
    this.creatures = [];
    this._sky();
    this._planet();
    this._islands();
    this._farPortals();
    this._clouds();
    this._crystals();
    this._creatures();
  }

  _sky() {
    this.skyMat = new THREE.ShaderMaterial({
      vertexShader: skyVert,
      fragmentShader: skyFrag,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
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
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(ringR, radius * 0.14, 2, 64),
      new THREE.MeshBasicMaterial({ color: ringColor, fog: false, transparent: true, opacity: 0.85 })
    );
    ring.rotation.x = Math.PI / 2.3;
    g.add(ring);
    g.position.copy(pos);
    this.scene.add(g);
    return g;
  }

  _planet() {
    // uzaklarda birkaç ayrı gök cismi (sade, çeşitli)
    this.planet = this._ringedPlanet(0xd98ad0, 22, 34, 0xffe1a8, V(-120, 70, -150));
    this._ball(0x9fe6c4, 9, V(140, 95, -120)); // ay
    this._ball(0xff8f6b, 14, V(95, 55, -195)); // turuncu gezegen
    this._ball(0x7aa0ff, 7, V(-55, 115, -160)); // küçük mavi
    this._ringedPlanet(0xc0d860, 10, 16, 0xeff0c8, V(175, 45, -70)); // küçük halkalı
  }

  _islands() {
    const palette = [0x6fcf8f, 0x7fc0a8, 0x9bbf6a, 0xb98ac4, 0x6f9ccf, 0xd0a070];
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x7d6a92, roughness: 1, flatShading: true });
    const mk = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 1, flatShading: true });

    for (let i = 0; i < 11; i++) {
      const a = (i / 11) * Math.PI * 2 + 0.3;
      const r = 70 + Math.random() * 95;
      const s = 5 + Math.random() * 10;
      const top = mk(palette[i % palette.length]);
      const g = new THREE.Group();
      const type = i % 5;

      if (type === 0) {
        // plato + tepesinde kaya
        const plat = new THREE.Mesh(new THREE.CylinderGeometry(s, s * 0.8, s * 0.5, 6), top);
        const base = new THREE.Mesh(new THREE.ConeGeometry(s * 0.8, s * 1.4, 6), rockMat);
        base.position.y = -s * 0.85;
        const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(s * 0.32, 0), rockMat);
        rock.position.set(s * 0.25, s * 0.45, 0);
        g.add(plat, base, rock);
      } else if (type === 1) {
        // yuvarlak kaya yığını
        g.add(new THREE.Mesh(new THREE.IcosahedronGeometry(s * 0.9, 0), top));
        const r2 = new THREE.Mesh(new THREE.IcosahedronGeometry(s * 0.5, 0), rockMat);
        r2.position.set(s * 0.6, -s * 0.4, s * 0.2);
        g.add(r2);
      } else if (type === 2) {
        // ince yüksek kule
        const spire = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.18, s * 0.5, s * 2.2, 6), top);
        const cap = new THREE.Mesh(new THREE.ConeGeometry(s * 0.28, s * 0.6, 6), top);
        cap.position.y = s * 1.4;
        g.add(spire, cap);
      } else if (type === 3) {
        // eğik düz tabaka
        const slab = new THREE.Mesh(new THREE.BoxGeometry(s * 1.6, s * 0.4, s * 1.2), top);
        slab.rotation.z = (Math.random() - 0.5) * 0.4;
        const base = new THREE.Mesh(new THREE.ConeGeometry(s * 0.5, s, 5), rockMat);
        base.position.y = -s * 0.6;
        g.add(slab, base);
      } else {
        // küçük kaya kümesi
        for (let k = 0; k < 4; k++) {
          const rk = new THREE.Mesh(new THREE.DodecahedronGeometry(s * (0.3 + Math.random() * 0.3), 0), k % 2 ? rockMat : top);
          rk.position.set((Math.random() - 0.5) * s, (Math.random() - 0.5) * s * 0.6, (Math.random() - 0.5) * s);
          g.add(rk);
        }
      }

      g.position.set(Math.cos(a) * r, 8 + Math.random() * 55, Math.sin(a) * r - 30);
      g.rotation.y = Math.random() * Math.PI;
      this.scene.add(g);
      this.islands.push({ mesh: g, baseY: g.position.y, phase: Math.random() * 6.28, amp: 1 + Math.random() * 2 });
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
    const mat = new THREE.MeshBasicMaterial({ color: 0xf2e6d0, fog: false, transparent: true, opacity: 0.5 });
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
    // havada süzülen, dönen kristaller — renk ve şekil çeşitli
    const cols = [
      [0x5ad6e6, 0x1c7d8c], // teal
      [0xb98ae6, 0x4a2c7d], // mor
      [0xff8fd0, 0x7d2c5a], // pembe
      [0x8fe6a0, 0x2c7d3c], // yeşil
    ];
    for (let i = 0; i < 8; i++) {
      const h = 2 + Math.random() * 4;
      const [c0, c1] = cols[i % cols.length];
      const mat = new THREE.MeshStandardMaterial({
        color: c0, emissive: c1, emissiveIntensity: 0.8, roughness: 0.2, flatShading: true,
        transparent: true, opacity: 0.92,
      });
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

  _creatures() {
    // süzülen "uzay vatozları" — basit chevron siluetleri
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array([
      0, 0, 1.0, -1.0, 0, -0.6, 0, 0.1, -0.2,
      0, 0, 1.0, 0, 0.1, -0.2, 1.0, 0, -0.6,
    ]), 3));
    geo.computeVertexNormals();
    for (let i = 0; i < 5; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: 0x33223f, transparent: true, opacity: 0.85, side: THREE.DoubleSide });
      const m = new THREE.Mesh(geo, mat);
      const s = 2.5 + Math.random() * 3;
      m.scale.setScalar(s);
      this.scene.add(m);
      this.creatures.push({
        mesh: m,
        r: 55 + Math.random() * 70,
        h: 22 + Math.random() * 45,
        angle: Math.random() * 6.28,
        speed: (0.05 + Math.random() * 0.08) * (Math.random() < 0.5 ? -1 : 1),
        phase: Math.random() * 6.28,
      });
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
    for (const is of this.islands) is.mesh.position.y = is.baseY + Math.sin(t * 0.4 + is.phase) * is.amp;
    for (const cr of this.crystals) {
      cr.mesh.rotation.y += dt * cr.spin;
      cr.mesh.position.y = cr.baseY + Math.sin(t * 0.6 + cr.phase) * 1.5;
    }
    for (const cre of this.creatures) {
      cre.angle += dt * cre.speed;
      const x = Math.cos(cre.angle) * cre.r;
      const z = Math.sin(cre.angle) * cre.r - 20;
      cre.mesh.position.set(x, cre.h + Math.sin(t * 0.5 + cre.phase) * 3, z);
      cre.mesh.rotation.y = -cre.angle + (cre.speed > 0 ? Math.PI : 0);
      cre.mesh.rotation.z = Math.sin(t * 3 + cre.phase) * 0.35; // kanat çırpma hissi
    }
  }
}
