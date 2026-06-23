import * as THREE from "three";

// Yüzeye yapışık (billboard DEĞİL) portal görünümü için ortak GLSL.
// Yerel +Z = yüzey normali. Dairesel maske + dönen ye-şil girdap + parlak halka.
// Portal A (cyan) ve Portal B (yeşil) renk uniform'u ile ayrışır.

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
  uniform float uOpen;
  uniform vec3 uColor;
  varying vec2 vUv;

  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p){
    vec2 i = floor(p), f = fract(p);
    vec2 u = f*f*(3.0-2.0*f);
    return mix(mix(hash(i), hash(i+vec2(1,0)), u.x),
               mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), u.x), u.y);
  }
  float fbm(vec2 p){
    float v = 0.0, a = 0.5;
    for(int i=0;i<5;i++){ v += a*noise(p); p = p*2.02 + 3.1; a*=0.5; }
    return v;
  }

  void main() {
    vec2 c = vUv - 0.5;
    float r = length(c) * 2.0;
    float ang = atan(c.y, c.x);
    float t = uTime;

    // merkeze doğru sıkışan dönen girdap koordinatı
    float swirl = ang + t * 1.4 - r * 3.2;
    vec2 p = vec2(cos(swirl), sin(swirl)) * (r + 0.15);

    // domain warping ile kaotik akış (R&M "spin-art" hissi)
    vec2 q = vec2(fbm(p * 2.0 + t * 0.25), fbm(p * 2.0 + vec2(5.2, 1.3) - t * 0.2));
    float n = fbm(p * 3.0 + q * 2.2 + t * 0.35);
    float n2 = fbm(p * 6.5 - q * 1.5 - t * 0.55);

    // sade, biraz mat yeşil paleti
    vec3 dark = vec3(0.02, 0.11, 0.03);
    vec3 mid  = vec3(0.08, 0.40, 0.11);
    vec3 lite = vec3(0.42, 0.80, 0.28);
    vec3 col = mix(dark, mid, n);
    col = mix(col, lite, smoothstep(0.45, 0.9, n2) * 0.7);

    // A/B ayrımı için hafif tint (çok az renk)
    col = mix(col, col * (uColor + 0.2), 0.22);

    // merkeze doğru kararsın -> içi belli olmasın (delik değil, dolu kaos)
    col *= mix(0.45, 1.0, smoothstep(0.0, 0.75, r));

    // ince kenar halkası (sadece tanım için, hafif)
    float ring = smoothstep(0.05, 0.0, abs(r - 0.93));
    col += (uColor * 0.6 + 0.1) * ring;

    // OPAK disk + yumuşak kenar + açılma animasyonu
    float mask = smoothstep(uOpen, uOpen - 0.10, r);
    float edge = smoothstep(1.0, 0.9, r);
    float alpha = mask * edge;
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(col, alpha);
  }
`;

export function makePortalMaterial(color) {
  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending,
    uniforms: {
      uTime: { value: 0 },
      uOpen: { value: 0 },
      uColor: { value: new THREE.Color(color) },
    },
  });
}
