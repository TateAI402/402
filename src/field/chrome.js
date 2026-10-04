// The chrome behind the grain: black rounded loops whose edges split into a spectrum (blue, violet, orange, yellow)
// with a white sheen on the upper side, drifting slowly, with film grain. Drawn on a full-screen quad before the
// particles; uLevel dims it in the middle chapters so the words and the grain stay readable.
import * as THREE from 'three';

const FRAG = /* glsl */ `
precision highp float;
uniform vec2 uRes;
uniform float uTime, uLevel, uNarrow;
varying vec2 vUv;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y); }
// distance to the outline of a rounded box: a tube of thickness th
float loopTube(vec2 p, vec2 b, float r, float th) { vec2 q = abs(p) - b + r; float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; return abs(d) - th; }

float field(vec2 p, float t) {
  p += 0.03 * vec2(noise(p * 1.4 + t * 0.06) - 0.5, noise(p * 1.4 - t * 0.05 + 7.0) - 0.5) * 2.0;
  float d = 1e3;
  bool narrow = uNarrow > 0.5;
  // a stack of thick loops off the right edge, and one rising from the bottom left: the words keep the middle
  vec2 o = narrow ? vec2(0.55, 0.0) : vec2(1.02, 0.0);
  d = min(d, loopTube(p - o - vec2(0.0, 0.56 + 0.015 * sin(t * 0.21)), vec2(0.62, 0.16), 0.16, 0.03));
  d = min(d, loopTube(p - o - vec2(-0.06, 0.12 + 0.015 * sin(t * 0.17 + 1.0)), vec2(0.58, 0.15), 0.15, 0.03));
  d = min(d, loopTube(p - o - vec2(0.04, -0.33 + 0.015 * sin(t * 0.19 + 2.0)), vec2(0.66, 0.17), 0.17, 0.03));
  vec2 l = narrow ? vec2(-0.5, -0.62) : vec2(-1.02, -0.5);
  d = min(d, loopTube(p - l - vec2(0.0, 0.02 * sin(t * 0.13)), vec2(0.52, 0.2), 0.2, 0.028));
  return d;
}

vec3 spectrum(float x) { // blue, violet, red-orange, yellow, white
  x = clamp(x, 0.0, 1.0);
  vec3 a = vec3(0.12, 0.32, 1.0), b = vec3(0.55, 0.22, 1.0), c = vec3(1.0, 0.32, 0.12), dd = vec3(1.0, 0.82, 0.28), e = vec3(1.0);
  if (x < 0.25) return mix(a, b, x / 0.25);
  if (x < 0.5) return mix(b, c, (x - 0.25) / 0.25);
  if (x < 0.75) return mix(c, dd, (x - 0.5) / 0.25);
  return mix(dd, e, (x - 0.75) / 0.25);
}

void main() {
  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  float t = uTime;
  float e = 1.5 / uRes.y;
  float d = field(p, t);
  vec2 g = vec2(field(p + vec2(e, 0.0), t) - d, field(p + vec2(0.0, e), t) - d) / e;
  vec2 n = normalize(g + 1e-5);
  vec2 L = normalize(vec2(-0.45, 0.9 + 0.1 * sin(t * 0.2)));
  float face = smoothstep(-0.15, 0.95, dot(n, L));
  // a prism fringe just outside the tube: seven samples across the edge, each its own colour
  vec3 fringe = vec3(0.0);
  for (int i = 0; i < 7; i++) {
    float f = float(i) / 6.0;
    float off = (0.5 - f) * 0.03;
    float shift = 0.12 * sin(p.x * 3.0 + p.y * 2.0 + t * 0.25);
    fringe += spectrum(clamp(f + shift, 0.0, 1.0)) * exp(-abs(d - 0.006 - off) / 0.0024);
  }
  vec3 col = fringe * (0.15 + 1.15 * face) * 0.62;
  // the white sheen where the light hits, a dim second rim on the shadow side
  col += vec3(1.0) * exp(-abs(d) / 0.003) * pow(face, 2.0) * 1.1;
  col += vec3(0.75, 0.8, 1.0) * exp(-abs(d) / 0.004) * (1.0 - face) * 0.12;
  // black glass inside the tube, with a faint reflection
  float inside = smoothstep(0.002, -0.004, d);
  col = mix(col, vec3(0.02) + vec3(0.06) * smoothstep(-0.03, 0.0, d) * face, inside);
  col += vec3(0.85, 0.9, 1.0) * exp(-max(d, 0.0) / 0.08) * 0.035 * face;
  col *= uLevel;
  col += (hash(gl_FragCoord.xy + fract(t * 7.0) * 100.0) - 0.5) * 0.06 * (0.4 + uLevel);
  gl_FragColor = vec4(max(col, 0.0), 1.0);
}`;

export function chromeLayer(W, H, dpr) {
  const uniforms = { uRes: { value: new THREE.Vector2(W * dpr, H * dpr) }, uTime: { value: 0 }, uLevel: { value: 1 }, uNarrow: { value: W < 700 ? 1 : 0 } };
  const mat = new THREE.ShaderMaterial({ vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }', fragmentShader: FRAG, uniforms, depthWrite: false, depthTest: false });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  mesh.frustumCulled = false; mesh.renderOrder = -1;
  return { mesh, uniforms, resize(w, h, d) { uniforms.uRes.value.set(w * d, h * d); uniforms.uNarrow.value = w < 700 ? 1 : 0; } };
}
