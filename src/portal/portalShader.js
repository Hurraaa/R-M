import * as THREE from "three";

// Yüzeye yapışık portal. İki portal da aktifse yüzeyde KARŞI tarafın canlı
// görüntüsü (render-to-texture, ekran-uzayı örnekleme) gösterilir; tek portal
// açıkken eski opak girdap görünür (delik değil, katı yüzey). İnce yeşil halka
// her durumda R&M kimliğini korur.

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
  uniform sampler2D uView;
  uniform vec2 uResolution;
  uniform float uHasView; // 1 = canlı görüntü, 0 = girdap
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

  vec3 swirl(vec2 vu, float r){
    vec2 c = vu - 0.5;
    float ang = atan(c.y, c.x);
    float t = uTime;
    float sw = ang + t * 1.4 - r * 3.2;
    vec2 p = vec2(cos(sw), sin(sw)) * (r + 0.15);
    vec2 q = vec2(fbm(p * 2.0 + t * 0.25), fbm(p * 2.0 + vec2(5.2, 1.3) - t * 0.2));
    float n = fbm(p * 3.0 + q * 2.2 + t * 0.35);
    float n2 = fbm(p * 6.5 - q * 1.5 - t * 0.55);
    vec3 dark = vec3(0.02, 0.11, 0.03);
    vec3 mid  = vec3(0.08, 0.40, 0.11);
    vec3 lite = vec3(0.42, 0.80, 0.28);
    vec3 col = mix(dark, mid, n);
    col = mix(col, lite, smoothstep(0.45, 0.9, n2) * 0.7);
    col = mix(col, col * (uColor + 0.2), 0.22);
    col *= mix(0.45, 1.0, smoothstep(0.0, 0.75, r));
    return col;
  }

  void main() {
    vec2 c = vUv - 0.5;
    float r = length(c) * 2.0;

    // OPAK disk + yumuşak kenar + açılma animasyonu
    float mask = smoothstep(uOpen, uOpen - 0.10, r);
    float edge = smoothstep(1.0, 0.9, r);
    float alpha = mask * edge;
    if (alpha < 0.01) discard;

    vec3 col;
    if (uHasView > 0.5) {
      // karşı tarafın canlı görüntüsü (ekran-uzayı örnekleme) — hafif bulanıklık
      // (bakışla aşırı titremeyi/keskin artefaktları yumuşatır)
      vec2 suv = gl_FragCoord.xy / uResolution;
      vec2 px = 1.4 / uResolution;
      vec3 live = texture2D(uView, suv).rgb * 0.36;
      live += texture2D(uView, suv + vec2(px.x, 0.0)).rgb * 0.16;
      live += texture2D(uView, suv - vec2(px.x, 0.0)).rgb * 0.16;
      live += texture2D(uView, suv + vec2(0.0, px.y)).rgb * 0.16;
      live += texture2D(uView, suv - vec2(0.0, px.y)).rgb * 0.16;
      live = mix(live, live * (uColor + 0.35), 0.12);
      // STABİL girdapla harmanla: portal "öteki tarafı" gösterir ama bakışla
      // bu kadar savrulmaz, yukarı bakınca bölünme/artefakt maskelenir.
      vec3 sw = swirl(vUv, r);
      col = mix(sw, live, 0.5);
    } else {
      col = swirl(vUv, r);
    }

    // ince yeşil kenar halkası (her iki durumda da kimlik)
    float ring = smoothstep(0.06, 0.0, abs(r - 0.93));
    col += (uColor * 0.7 + 0.1) * ring;

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
      uView: { value: null },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uHasView: { value: 0 },
    },
  });
}
