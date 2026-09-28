import * as THREE from 'three';
import { mulberry32 } from '../core/rng';
import { makeCloudMaterial, makeSkyMaterial, SKY_U } from './materials';

// Banded sky (fullscreen triangle, drawn first) + flat-bottomed billboard
// clouds on a camera-centred dome. Neither writes depth, so terrain drawn
// afterwards always sits in front of them.

export class Sky {
  readonly group = new THREE.Group();
  private clouds: THREE.Mesh;

  constructor(seed: number) {
    const tri = new THREE.BufferGeometry();
    tri.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
    const sky = new THREE.Mesh(tri, makeSkyMaterial());
    sky.frustumCulled = false;
    sky.renderOrder = -1000;
    this.group.add(sky);

    const quad = new THREE.BufferGeometry();
    quad.setAttribute('position', new THREE.Float32BufferAttribute([-1, -0.02, 0, 1, -0.02, 0, 1, 1, 0, -1, 1, 0], 3));
    quad.setIndex([0, 1, 2, 0, 2, 3]);
    const ig = new THREE.InstancedBufferGeometry();
    ig.index = quad.index;
    ig.setAttribute('position', quad.attributes.position);
    ig.setAttribute('aC0', new THREE.InstancedBufferAttribute(new Float32Array(4 * 40), 4));
    this.clouds = new THREE.Mesh(ig, makeCloudMaterial());
    this.clouds.frustumCulled = false;
    this.clouds.renderOrder = -999;
    this.group.add(this.clouds);
    this.setSeed(seed);
  }

  setSeed(seed: number) {
    const rnd = mulberry32(seed ^ 0x5bd1e995);
    const ig = this.clouds.geometry as THREE.InstancedBufferGeometry;
    const a = ig.getAttribute('aC0') as THREE.InstancedBufferAttribute;
    const n = 34;
    // Draw far/small clouds first so nearer, bigger ones overlap them.
    const list: number[][] = [];
    for (let i = 0; i < n; i++) {
      const el = 0.025 + Math.pow(rnd(), 2.2) * 0.3;
      const w = (0.9 + rnd() * 1.4) * (0.6 + el * 2.2) * 900;
      list.push([rnd() * Math.PI * 2, el, w, rnd() * 100]);
    }
    list.sort((p, q) => p[1] - q[1]);
    list.forEach((c, i) => a.setXYZW(i, c[0], c[1], c[2], c[3]));
    a.needsUpdate = true;
    ig.instanceCount = n;
  }

  update(camera: THREE.PerspectiveCamera, time: number) {
    SKY_U.uInvProj.value.copy(camera.projectionMatrixInverse);
    SKY_U.uCamWorld.value.copy(camera.matrixWorld);
    SKY_U.uCloudDrift.value = time * 0.0012;
  }
}
