import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { COLUMN_R } from './layout';
import { PIT_HALF, POST_H, type DropLayout } from './dropPlan';
import { buildStone, lathe, tint } from './shell';

// The Drop's own meshes, from its plan (dropPlan.ts), in the plan's local
// frame. Its floor, walls, ceiling and the pit's two faces are shell.ts's
// `buildShell`.

export interface DropRockLook {
  column: string; stone: string; stoneBig: string; made: string; sconce: string; stub: string; spike: string; spikeDown: string; kerb: string; stalk: string;
  /** A pillar's shaft, its flat top, the dark band round the top's edge, and the ring let into it. */
  pillar: string; top: string; band: string; ring: string;
}

/**
 * Everything of rock that stands in the Drop: the well's columns, boulders,
 * stalagmites and stalactites, the pillars and their marked tops, the lips'
 * kerbs, the lanterns' sconces and posts, the light's plinth. One mesh.
 */
export function buildDropRock(L: DropLayout, c: DropRockLook): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const well = L.rooms[0];
  for (const o of L.solids) {
    if (Math.abs(Math.hypot(o.x, o.z) - COLUMN_R) > 0.01 || o.top < 50) continue;
    const H = well.clear + 0.6;
    parts.push(tint(lathe([[o.r * 1.5, -0.4], [o.r * 1.12, 0.5], [o.r * 0.92, 2.2], [o.r * 0.8, H * 0.5], [o.r * 0.9, H - 3.5], [o.r * 1.25, H - 1.2], [o.r * 2.1, H]], 20).translate(o.x, well.floor, o.z), c.column));
  }
  for (const s of L.stones) parts.push(buildStone(s, s.sx > 1.3 ? c.stoneBig : c.stone));

  // The pillars: up out of the pit's floor, waisted, each spreading to a flat top to land on. Its top is
  // marked out as dungeon 1's stepping stones are: pale, a dark border at its very edge and a dark band
  // down the rim under it, and a ring let into the middle to aim at.
  for (const o of L.tops) {
    if (o.ledge) {
      // The ledge: a long slab out of the far face's foot, pale on top with a dark edge as the tops have, a line
      // down its middle to land along, and stone brackets under it into the face.
      const hx = o.hx!, hz = o.hz!;
      parts.push(tint(new THREE.BoxGeometry(hx * 2, 0.9, hz * 2).translate(o.x, o.y - 0.47, o.z), c.band));
      parts.push(tint(new THREE.PlaneGeometry(hx * 2 - 0.6, hz * 2 - 0.6).rotateX(-Math.PI / 2).translate(o.x, o.y, o.z), c.top));
      parts.push(tint(new THREE.PlaneGeometry(0.5, hz * 2 - 5).rotateX(-Math.PI / 2).translate(o.x, o.y + 0.012, o.z), c.ring));
      for (let u = -hz + 3; u <= hz - 3; u += 6.5) parts.push(tint(new THREE.BoxGeometry(hx * 2 - 1, 3.4, 1.1).translate(0, -1.7, 0).rotateZ(0).translate(o.x + 0.5, o.y - 0.9, o.z + u), c.pillar));
      continue;
    }
    // (Up from the pit's unseen floor.)
    const fy = L.floor(o.x, o.z), H = o.y - fy, r = o.r, neck = Math.min(r * 0.62, 3.2);
    parts.push(tint(lathe([[neck * 1.9, -0.6], [neck * 1.25, 1.4], [neck, H * 0.3], [neck * 0.92, H - 9], [neck * 1.1, H - 4.5], [r * 0.8, H - 1.6], [r * 1.02, H - 0.42]], 26).translate(o.x, fy, o.z), c.pillar));
    parts.push(tint(lathe([[r * 1.02, H - 0.42], [r * 1.05, H - 0.36], [r * 1.05, H - 0.04], [r, H]], 32).translate(o.x, fy, o.z), c.band));
    parts.push(tint(new THREE.CircleGeometry(r, 32).rotateX(-Math.PI / 2).translate(o.x, o.y, o.z), c.top));
    parts.push(tint(new THREE.RingGeometry(r - 0.3, r, 32).rotateX(-Math.PI / 2).translate(o.x, o.y + 0.012, o.z), c.band));
    parts.push(tint(new THREE.RingGeometry(r * 0.42, r * 0.52, 32).rotateX(-Math.PI / 2).translate(o.x, o.y + 0.012, o.z), c.ring));
  }

  // A pale kerb along both lips, so an edge reads as an edge in the dark, from above and from below.
  // ((nx, nz) points off the edge, to the low side.)
  const kerb = (x: number, z: number, nx: number, nz: number) => {
    if (L.sdf(x, z) > 0.7) return;
    parts.push(tint(new THREE.BoxGeometry(0.56, 0.34, 0.5).translate(0, -0.1, 0.12).rotateY(Math.atan2(nx, nz)).translate(x, L.ground(x, z), z), c.kerb));
  };
  for (const side of [-1, 1]) for (let u = -L.cavern.r; u <= L.cavern.r; u += 0.5) kerb(L.cavern.x + side * PIT_HALF, L.cavern.z + u, -side, 0);

  for (const o of L.lanterns) {
    const k = o.s ?? 1, bx = o.x + o.nx * 0.5, bz = o.z + o.nz * 0.5;
    // Its bowl; then a stub out of the wall, or (a big one) a post up from what it stands on.
    parts.push(tint(lathe([[0, -0.36], [0.2, -0.34], [0.44, -0.14], [0.52, 0.02], [0.46, 0.04], [0.3, -0.06], [0, -0.08]], 16).scale(k, k, k).translate(bx, o.y, bz), c.sconce));
    // (A big one's post is `POST_H` tall; a middling one's, on the ledge, 1.7.)
    if (o.s) { const h = o.s > 2 ? POST_H : 1.7; parts.push(tint(lathe([[0.62, -h - 0.2], [0.56, -h + 0.14], [0.3, -h + 0.36], [0.2, -h * 0.55], [0.24, -0.7], [0.4, -0.3]], 14).translate(bx, o.y, bz), c.made)); }
    else parts.push(tint(new THREE.CylinderGeometry(0.13, 0.17, 0.9, 8).rotateX(Math.PI / 2).translate(0, -0.2, -0.05).rotateY(Math.atan2(o.nx, o.nz)).translate(o.x, o.y, o.z), c.stub));
  }
  for (const s of L.spikes) {
    const g = lathe([[s.r * 1.5, 0], [s.r, s.h * 0.12], [s.r * 0.62, s.h * 0.5], [s.r * 0.36, s.h * 0.85], [s.r * 0.2, s.h * 0.97], [0, s.h]], 12);
    if (s.down) g.rotateX(Math.PI);
    parts.push(tint(g.translate(s.x, s.y, s.z), s.down ? c.spikeDown : c.spike));
  }
  const e = L.ember, fy = L.floor(e.x, e.z);
  parts.push(tint(lathe([[1.05, -0.3], [1.0, 0.15], [0.84, 0.5], [0.66, 0.74], [0.62, 0.9], [0.7, 1.04], [0.6, 1.1], [0.4, 1.02], [0, 0.98]], 24).translate(e.x, fy, e.z), c.made));
  for (const k of L.caps) {
    const g = lathe([[k.r * 0.34, 0], [k.r * 0.22, k.h * 0.35], [k.r * 0.17, k.h * 0.8], [k.r * 0.2, k.h]], 10);
    parts.push(tint(g.rotateZ(k.lean).rotateY(k.dir).translate(k.x, k.y, k.z), c.stalk));
  }
  return mergeGeometries(parts)!;
}
