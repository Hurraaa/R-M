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
    for(int i=0;i<5;i++){ v += a*noise(p); p*=2.0; a*=0.5; }
    return v;
  }

  void main() {
    vec2 c = vUv - 0.5;
    float r = length(c) * 2.0;
    float ang = atan(c.y, c.x);

    float swirl = ang + uTime * 1.8 - r * 4.0;
    vec2 sp = vec2(cos(swirl), sin(swirl)) * r;
    float n = fbm(sp * 3.0 + uTime * 0.5);

    vec3 deep = uColor * 0.15;
    vec3 col = mix(deep, uColor, n);
    col += uColor * pow(1.0 - r, 2.0) * 1.2;       // merkez parlaması

    float ring = smoothstep(0.05, 0.0, abs(r - 0.9));
    col += (uColor + 0.3) * ring * 2.0;             // parlak dış halka

    float radius = uOpen;
    float mask = smoothstep(radius, radius - 0.14, r);
    float edge = smoothstep(1.0, 0.85, r);
    float alpha = clamp(mask * edge + ring, 0.0, 1.0);

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
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uOpen: { value: 0 },
      uColor: { value: new THREE.Color(color) },
    },
  });
}
