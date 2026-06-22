import * as THREE from "three";

// İmza yeşil portal — dönen girdap GLSL shader + parlayan halka.
// Düşmanlar bu portalların önünde belirir.

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform float uOpen;     // 0..1 açılma animasyonu
  varying vec2 vUv;

  // basit 2D hash & değer-gürültüsü
  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p){
    vec2 i = floor(p), f = fract(p);
    vec2 u = f*f*(3.0-2.0*f);
    return mix(mix(hash(i), hash(i+vec2(1,0)), u.x),
               mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), u.x), u.y);
  }
  float fbm(vec2 p){
    float v = 0.0, a = 0.5;
    for(int i=0;i<5;i++){ v += a*noise(p); p*=2.0; a*=0.5; }
    return v;
  }

  void main() {
    vec2 c = vUv - 0.5;
    float r = length(c) * 2.0;          // 0 merkez, 1 kenar
    float ang = atan(c.y, c.x);

    // dönen girdap koordinatı
    float swirl = ang + uTime * 1.6 - r * 4.0;
    vec2 sp = vec2(cos(swirl), sin(swirl)) * r;
    float n = fbm(sp * 3.0 + uTime * 0.4);

    // renk: derin yeşilden parlak yeşil-cyan'a
    vec3 deep = vec3(0.04, 0.22, 0.05);
    vec3 bright = vec3(0.55, 1.0, 0.45);
    vec3 col = mix(deep, bright, n);
    col += vec3(0.2, 0.9, 0.5) * pow(1.0 - r, 2.0); // merkez parlaması

    // parlayan dış halka
    float ring = smoothstep(0.04, 0.0, abs(r - 0.92));
    col += vec3(0.7, 1.0, 0.5) * ring * 2.0;

    // açılma maskesi (merkezden dışa büyür) + dairesel kesim
    float radius = uOpen;
    float mask = smoothstep(radius, radius - 0.12, r);
    float edge = smoothstep(1.0, 0.88, r); // dış kenarı yumuşat
    float alpha = mask * edge;
    alpha = clamp(alpha + ring, 0.0, 1.0);

    if (alpha < 0.01) discard;
    gl_FragColor = vec4(col, alpha);
  }
`;

export class Portal {
  constructor(position, radius = 2.2) {
    this.radius = radius;
    this.open = 0;
    this.life = 0;

    const geo = new THREE.PlaneGeometry(radius * 2, radius * 2);
    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uOpen: { value: 0 },
      },
    });

    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.position.copy(position);

    // hafif zemin ışıltısı
    this.light = new THREE.PointLight(0x6ee84f, 0, 14, 2);
    this.light.position.copy(position);
  }

  addTo(scene) {
    scene.add(this.mesh);
    scene.add(this.light);
  }

  removeFrom(scene) {
    scene.remove(this.mesh);
    scene.remove(this.light);
    this.mesh.geometry.dispose();
    this.material.dispose();
  }

  // kameraya doğru bakar (billboard, sadece Y ekseni)
  faceCamera(camera) {
    const dir = new THREE.Vector3(
      camera.position.x - this.mesh.position.x,
      0,
      camera.position.z - this.mesh.position.z
    );
    this.mesh.rotation.y = Math.atan2(dir.x, dir.z);
  }

  update(dt, camera) {
    this.life += dt;
    this.open = Math.min(1, this.open + dt * 1.8);
    this.material.uniforms.uTime.value += dt;
    this.material.uniforms.uOpen.value = this.open;
    this.light.intensity = 2.5 * this.open;
    this.faceCamera(camera);
  }
}
