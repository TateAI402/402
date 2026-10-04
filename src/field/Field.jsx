// The particle field: one fixed canvas, the logo's grain performing every chapter of the flight. Particles travel
// between formations on staggered arcs, drift on a slow noise, part around the pointer, and carry a faint halo pass
// so dense areas glow like the logo. The parent drives it with a progress value; nothing animates without a frame.
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { buildFormations, loadLogo } from './formations';
import { chromeLayer } from './chrome';

const VERT = /* glsl */ `
attribute vec3 aFrom;
attribute vec3 aTo;
attribute vec4 aRnd;
uniform float uK, uTime, uSize, uDpr, uNoise, uScatter, uHalo, uPar;
uniform vec2 uPointer;
uniform float uPointerOn;
varying float vAlpha;
void main() {
  float k = clamp((uK - aRnd.x * 0.35) / 0.65, 0.0, 1.0);
  k = k * k * (3.0 - 2.0 * k);
  vec3 p = mix(aFrom, aTo, k);
  float travel = sin(3.14159 * k);
  // an arc away from the straight path, and turbulence while travelling
  vec2 side = normalize(vec2(aRnd.y - 0.5, aRnd.z - 0.5) + 0.0001);
  p.xy += side * travel * (60.0 + 220.0 * aRnd.w) * uScatter;
  float t = uTime;
  p.xy += vec2(sin(t * 0.55 + aRnd.z * 40.0 + p.y * 0.012), cos(t * 0.47 + aRnd.w * 40.0 + p.x * 0.011)) * uNoise * (0.6 + 1.6 * aRnd.y);
  // depth parallax with the pointer
  p.xy += p.z * uPar * uPointer * 0.03 * uPointerOn;
  // part around the pointer
  vec2 d = p.xy - uPointer;
  float f = exp(-dot(d, d) / 9000.0) * uPointerOn;
  p.xy += normalize(d + 0.0001) * f * 70.0;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p.xy, 0.0, 1.0);
  float s = uSize * (0.55 + aRnd.z * 1.25) * (1.0 + 0.35 * p.z);
  gl_PointSize = s * uDpr * uHalo;
  vAlpha = (0.42 + 0.58 * aRnd.w) * (0.75 + 0.25 * p.z);
}`;
const FRAG = /* glsl */ `
uniform float uAlpha;
varying float vAlpha;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = dot(c, c);
  float a = exp(-d * 16.0);
  if (a < 0.01) discard;
  gl_FragColor = vec4(vec3(1.0), a * vAlpha * uAlpha);
}`;

export const ORDER = ['tate', 'four', 'ledger', 'gate', 'cloud', 'stream', 'lock', 'chart', 'tate'];

/**
 * drive(): returns { seg, k, scatter, noise } for the current frame; seg indexes ORDER (from seg to seg + 1).
 * onReady(ok): called once with whether WebGL is drawing.
 */
export default function Field({ drive, onReady, count }) {
  const host = useRef(null);
  useEffect(() => {
    const el = host.current;
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: 'high-performance' }); }
    catch { onReady?.(false); return; }
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const n = count ?? (innerWidth < 700 ? 20000 : 38000);
    const dpr = Math.min(devicePixelRatio || 1, 2);
    renderer.setPixelRatio(dpr); renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -10, 10);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    const rndArr = new Float32Array(n * 4); for (let i = 0; i < rndArr.length; i++) rndArr[i] = Math.random();
    geo.setAttribute('aRnd', new THREE.BufferAttribute(rndArr, 4));
    const uniforms = { uK: { value: 0 }, uTime: { value: 0 }, uSize: { value: innerWidth < 700 ? 2.6 : 3.0 }, uDpr: { value: dpr }, uNoise: { value: 6 }, uScatter: { value: 0 }, uHalo: { value: 1 }, uAlpha: { value: 0.9 }, uPar: { value: 1 }, uPointer: { value: new THREE.Vector2(9999, 9999) }, uPointerOn: { value: 0 } };
    const mat = (halo) => new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { ...uniforms, uHalo: { value: halo ? 5.5 : 1 }, uAlpha: { value: halo ? 0.05 : 0.9 } } });
    const core = new THREE.Points(geo, mat(false)), halo = new THREE.Points(geo, mat(true));
    // halo and core share every uniform except size and alpha
    for (const m of [core.material, halo.material]) for (const key of Object.keys(uniforms)) if (key !== 'uHalo' && key !== 'uAlpha') m.uniforms[key] = uniforms[key];
    core.frustumCulled = halo.frustumCulled = false;
    const chrome = chromeLayer(innerWidth, innerHeight, dpr);
    scene.add(chrome.mesh, halo, core);

    let forms = null, attrs = null, seg = -1, raf = 0, alive = true, W = 0, H = 0;
    const pointer = { x: 9999, y: 9999, on: 0, target: 0 };
    const size = async () => {
      W = innerWidth; H = innerHeight;
      renderer.setSize(W, H, false); chrome.resize(W, H, dpr); renderer.domElement.style.width = W + 'px'; renderer.domElement.style.height = H + 'px';
      camera.left = -W / 2; camera.right = W / 2; camera.top = H / 2; camera.bottom = -H / 2; camera.updateProjectionMatrix();
      const logo = await loadLogo();
      if (!alive) return;
      forms = buildFormations(n, W, H, logo);
      attrs = ORDER.map((name) => new THREE.BufferAttribute(forms[name], 3));
      seg = -1;
    };
    const move = (e) => { pointer.x = e.clientX - W / 2; pointer.y = H / 2 - e.clientY; pointer.target = 1; };
    const leave = () => { pointer.target = 0; };
    addEventListener('pointermove', move, { passive: true }); document.addEventListener('pointerleave', leave);
    let resizeT = 0; const onResize = () => { clearTimeout(resizeT); resizeT = setTimeout(size, 180); };
    addEventListener('resize', onResize);

    const t0 = performance.now();
    const frame = () => {
      if (!alive) return;
      raf = requestAnimationFrame(frame);
      try {
        if (!attrs) return;
        const st = drive();
        const s = Math.max(0, Math.min(ORDER.length - 2, st.seg));
        if (s !== seg) { geo.setAttribute('aFrom', attrs[s]); geo.setAttribute('aTo', attrs[s + 1]); seg = s; }
        uniforms.uK.value = st.k;
        uniforms.uScatter.value = st.scatter ?? 1;
        uniforms.uNoise.value = reduce ? 0 : (st.noise ?? 6);
        uniforms.uTime.value = (performance.now() - t0) / 1000;
        chrome.uniforms.uTime.value = reduce ? 4 : uniforms.uTime.value;
        chrome.uniforms.uLevel.value = st.chrome ?? 1;
        chrome.mesh.visible = chrome.uniforms.uLevel.value > 0.005;
        pointer.on += (pointer.target - pointer.on) * 0.08;
        uniforms.uPointer.value.set(pointer.x, pointer.y); uniforms.uPointerOn.value = reduce ? 0 : pointer.on;
        renderer.render(scene, camera);
      } catch (err) { console.error('field frame', err); }
    };
    size().then(() => { if (alive) { onReady?.(true); frame(); } }).catch(() => onReady?.(false));
    return () => {
      alive = false; cancelAnimationFrame(raf); clearTimeout(resizeT);
      removeEventListener('pointermove', move); document.removeEventListener('pointerleave', leave); removeEventListener('resize', onResize);
      geo.dispose(); chrome.mesh.geometry.dispose(); chrome.mesh.material.dispose(); core.material.dispose(); halo.material.dispose(); renderer.dispose(); renderer.domElement.remove();
    };
  }, [drive, onReady, count]);
  return <div className="field" ref={host} aria-hidden="true" />;
}
