import * as THREE from 'three';
import { TERRAIN_U } from './materials';

// Cast shadows from trees, rocks, bushes and cabins onto the ground, near the
// camera only. Instead of a depth shadow map, each caster is flattened along
// the key light onto the plane of its own base and drawn from straight above
// into a coverage mask (CASTER_VERT). The terrain samples the mask by world xz
// and drops into the shade band. No depth compare means no acne or bias, and
// the cost is one cheap fill of low-LOD props into an R8 target.
// Caster meshes live on SHADOW_LAYER inside the terrain nodes (terrain.ts).

export const SHADOW_LAYER = 1;

export const groundShadowSettings = {
  enabled: true,
  /** 0..1: how far a shadow drops toward the shade band. */
  strength: 1,
};

export class GroundShadow {
  /** Half-width of the square the mask covers (m). */
  readonly half = 90;
  readonly size = 2048;
  /** Set by adaptive quality on slow GPUs (independent of the user toggle). */
  shed = false;
  private rt: THREE.WebGLRenderTarget;
  private cam: THREE.OrthographicCamera;
  private clear = new THREE.Color(0, 0, 0);
  private prevClear = new THREE.Color();

  constructor() {
    this.rt = new THREE.WebGLRenderTarget(this.size, this.size, {
      format: THREE.RedFormat,
      type: THREE.UnsignedByteType,
      depthBuffer: false,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      generateMipmaps: false,
    });
    const h = this.half;
    // Looking straight down with up = -z; top/bottom are swapped so texture
    // u runs along +x and v along +z (the terrain's uv = (xz - min) / size).
    this.cam = new THREE.OrthographicCamera(-h, h, -h, h, -2000, 2000);
    this.cam.up.set(0, 0, -1);
    this.cam.layers.set(SHADOW_LAYER);
    TERRAIN_U.uGroundShadow.value = this.rt.texture;
  }

  /** Redraws the mask around `center` (usually the camera). */
  update(r: THREE.WebGLRenderer, casters: THREE.Object3D, center: THREE.Vector3) {
    const U = TERRAIN_U.uShadowRect.value;
    const s = groundShadowSettings;
    if (!s.enabled || this.shed || s.strength <= 0) {
      U.w = 0;
      return;
    }
    // Snap to whole texels so edges don't crawl as the camera moves.
    const texel = (this.half * 2) / this.size;
    const cx = Math.round(center.x / texel) * texel;
    const cz = Math.round(center.z / texel) * texel;
    this.cam.position.set(cx, 1000, cz);
    this.cam.lookAt(cx, 0, cz);
    this.cam.updateMatrixWorld();

    const prevTarget = r.getRenderTarget();
    r.getClearColor(this.prevClear);
    const prevAlpha = r.getClearAlpha();
    r.setClearColor(this.clear, 1);
    r.setRenderTarget(this.rt);
    r.clear(true, false, false);
    r.render(casters, this.cam);
    r.setRenderTarget(prevTarget);
    r.setClearColor(this.prevClear, prevAlpha);

    U.set(cx - this.half, cz - this.half, 1 / (this.half * 2), s.strength);
  }
}
