import * as THREE from 'three';

// Things drawn over the finished frame (after grade, outlines and fog, before
// FXAA): the ghosted "to be built" sketches, icon slots, flying icons and the
// spirit's thought bubble. They need real transparency, which the G-buffer
// doesn't have, so they live in their own scene. Each shader reads the
// scene's linear depth (G-buffer normal+depth texture) and fades wherever
// something solid stands in front, so a sketch still reads through a wall
// but clearly as "behind".

export const OVERLAY_U = {
  tND: { value: null as THREE.Texture | null },
  uRes: { value: new THREE.Vector2(1, 1) },
  uTime: { value: 0 },
};

const OCCLUDE = /* glsl */ `
uniform sampler2D tND;
uniform vec2 uRes;
uniform float uThrough;
float occlusion(float depth) {
  float scene = texture(tND, gl_FragCoord.xy / uRes).w;
  return depth > scene * 1.015 + 0.08 ? uThrough : 1.0;
}
`;

const LINE_VERT = /* glsl */ `
in vec3 aA;
in vec3 aB;
uniform vec2 uRes;
uniform float uWidth;
out float vAlong;
out float vSide;
out float vDepth;
void main() {
  mat4 mvp = projectionMatrix * modelViewMatrix;
  vec4 ca = mvp * vec4(aA, 1.0);
  vec4 cb = mvp * vec4(aB, 1.0);
  vec2 sa = ca.xy / max(ca.w, 1e-3) * uRes;
  vec2 sb = cb.xy / max(cb.w, 1e-3) * uRes;
  vec2 dir = normalize(sb - sa + vec2(1e-5, 0.0));
  vec2 nrm = vec2(-dir.y, dir.x);
  vec4 c = mix(ca, cb, position.x);
  // Width in pixels (x2 because NDC spans 2), a touch past each end so
  // corners meet.
  c.xy += (nrm * position.y + dir * (position.x * 2.0 - 1.0) * 0.6) * uWidth / uRes * c.w;
  vAlong = position.x * length(aB - aA);
  vSide = position.y;
  vDepth = -(modelViewMatrix * vec4(mix(aA, aB, position.x), 1.0)).z;
  gl_Position = c;
}
`;

const LINE_FRAG = /* glsl */ `
precision highp float;
${OCCLUDE}
uniform vec3 uColor;
uniform float uAlpha;
uniform float uTime;
uniform float uDash;
in float vAlong;
in float vSide;
in float vDepth;
out vec4 fragColor;
void main() {
  // Dashes crawl slowly along each edge, like marching pencil marks.
  float d = fract((vAlong - uTime * 0.22) / uDash);
  if (d > 0.58) discard;
  float aa = 1.0 - smoothstep(0.55, 1.0, abs(vSide));
  fragColor = vec4(uColor, uAlpha * aa * occlusion(vDepth));
}
`;

const FILL_VERT = /* glsl */ `
out float vDepth;
void main() {
  vec4 vp = modelViewMatrix * vec4(position, 1.0);
  vDepth = -vp.z;
  gl_Position = projectionMatrix * vp;
}
`;

const FILL_FRAG = /* glsl */ `
precision highp float;
${OCCLUDE}
uniform vec3 uColor;
uniform float uAlpha;
uniform float uTime;
in float vDepth;
out vec4 fragColor;
void main() {
  // A pale wash with pencil hatching in screen space.
  float h = fract((gl_FragCoord.x + gl_FragCoord.y) / 6.0);
  float hatch = step(h, 0.3);
  float breathe = 0.82 + 0.18 * sin(uTime * 2.2);
  fragColor = vec4(uColor, uAlpha * (0.34 + 0.4 * hatch) * breathe * occlusion(vDepth));
}
`;

const BB_VERT = /* glsl */ `
uniform vec3 uCenter;
uniform float uSize;
uniform float uMinPx;
uniform vec2 uRes;
uniform float uScale;
out vec2 vUv;
out float vDepth;
void main() {
  vec4 vc = viewMatrix * vec4(uCenter, 1.0);
  vDepth = -vc.z;
  vec4 c = projectionMatrix * vc;
  // World size, but never smaller than uMinPx on screen.
  float px = uSize * projectionMatrix[1][1] / max(vDepth, 1e-3) * uRes.y * 0.5;
  float s = max(px, uMinPx) * uScale;
  c.xy += position.xy * s / uRes * 2.0 * c.w;
  vUv = position.xy + 0.5;
  gl_Position = c;
}
`;

const BB_FRAG = /* glsl */ `
precision highp float;
${OCCLUDE}
uniform sampler2D tIcon;
uniform float uAlpha;
in vec2 vUv;
in float vDepth;
out vec4 fragColor;
void main() {
  vec4 t = texture(tIcon, vUv);
  float a = t.a * uAlpha * occlusion(vDepth);
  if (a < 0.01) discard;
  fragColor = vec4(t.rgb, a);
}
`;

function overlayMat(vert: string, frag: string, uniforms: Record<string, THREE.IUniform>) {
  return new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3, vertexShader: vert, fragmentShader: frag,
    uniforms: { ...OVERLAY_U, uThrough: { value: 0.05 }, ...uniforms },
    transparent: true, depthTest: false, depthWrite: false, blending: THREE.NormalBlending,
  });
}

const QUAD = (() => {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([0, -1, 0, 1, -1, 0, 1, 1, 0, 0, 1, 0], 3));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  return g;
})();

/**
 * A ghosted part: dashed ink outlines of every hard edge plus a hatched pale
 * wash. `set(alpha)` fades the whole sketch.
 */
export class Sketch {
  readonly group = new THREE.Group();
  private lineMat: THREE.ShaderMaterial;
  private fillMat: THREE.ShaderMaterial;
  alpha = 0;

  constructor(solid: THREE.BufferGeometry, edgesFrom: THREE.BufferGeometry, opts: { color?: string; width?: number; dash?: number; threshold?: number } = {}) {
    const edges = new THREE.EdgesGeometry(edgesFrom, opts.threshold ?? 30);
    const p = edges.attributes.position.array as Float32Array;
    const n = p.length / 6;
    const a = new Float32Array(n * 3), b = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      a.set(p.subarray(i * 6, i * 6 + 3), i * 3);
      b.set(p.subarray(i * 6 + 3, i * 6 + 6), i * 3);
    }
    const ig = new THREE.InstancedBufferGeometry();
    ig.index = QUAD.index;
    ig.setAttribute('position', QUAD.attributes.position);
    ig.setAttribute('aA', new THREE.InstancedBufferAttribute(a, 3));
    ig.setAttribute('aB', new THREE.InstancedBufferAttribute(b, 3));
    ig.instanceCount = n;
    this.lineMat = overlayMat(LINE_VERT, LINE_FRAG, {
      uColor: { value: new THREE.Color(opts.color ?? '#4c2a38') }, uAlpha: { value: 0 },
      uWidth: { value: opts.width ?? 2.7 }, uDash: { value: opts.dash ?? 0.26 },
    });
    const lines = new THREE.Mesh(ig, this.lineMat);
    lines.frustumCulled = false;
    lines.renderOrder = 2;
    const fillGeo = new THREE.BufferGeometry();
    fillGeo.setAttribute('position', solid.attributes.position);
    this.fillMat = overlayMat(FILL_VERT, FILL_FRAG, { uColor: { value: new THREE.Color('#fff6e4') }, uAlpha: { value: 0 } });
    const fill = new THREE.Mesh(fillGeo, this.fillMat);
    fill.frustumCulled = false;
    fill.renderOrder = 1;
    this.group.add(fill, lines);
    this.group.visible = false;
  }

  set(alpha: number) {
    this.alpha = alpha;
    this.group.visible = alpha > 0.005;
    this.lineMat.uniforms.uAlpha.value = alpha;
    this.fillMat.uniforms.uAlpha.value = alpha * 0.85;
  }
}

/** A camera-facing icon with a world size and a minimum on-screen size. */
export class Billboard {
  readonly mesh: THREE.Mesh;
  readonly mat: THREE.ShaderMaterial;
  readonly pos = new THREE.Vector3();

  constructor(texture: THREE.Texture, size: number, minPx = 22) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0], 3));
    g.setIndex([0, 1, 2, 0, 2, 3]);
    this.mat = overlayMat(BB_VERT, BB_FRAG, {
      tIcon: { value: texture }, uCenter: { value: this.pos }, uSize: { value: size }, uMinPx: { value: minPx },
      uScale: { value: 1 }, uAlpha: { value: 1 },
      // Icons stay readable behind things (a bubble inside the cabin), just dimmer.
      uThrough: { value: 0.45 },
    });
    this.mesh = new THREE.Mesh(g, this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 5;
  }

  set texture(t: THREE.Texture) { this.mat.uniforms.tIcon.value = t; }
  set alpha(a: number) { this.mat.uniforms.uAlpha.value = a; this.mesh.visible = a > 0.01; }
  get alpha() { return this.mat.uniforms.uAlpha.value; }
  set scale(s: number) { this.mat.uniforms.uScale.value = s; }
  get scale() { return this.mat.uniforms.uScale.value; }
}
