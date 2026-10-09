import * as THREE from 'three';
import { BIOME } from '../gfx/palette';
import { colored, merge } from '../mobs/parts';

// What the village works with at a house being built again (story/village.ts,
// `Yard`): a low sawhorse, a saw, a mallet, a ladder. All spirit-sized (one of
// them is under 0.7 m tall).

/** The sawhorse: how high its beam's top is, and where along it (its length is z) a board is cut. */
export const HORSE_TOP = 0.23, CUT_Z = 0.72;

const wood = (g: THREE.BufferGeometry, hex = BIOME.cutWood) => colored(g, hex, 0, false);

/** A sawhorse: a beam along z on four splayed legs, its foot at y = 0 (and a little below, for a slope). */
export function buildSawhorse(): THREE.BufferGeometry {
  const parts = [wood(new THREE.BoxGeometry(0.11, 0.08, 1.2).translate(0, HORSE_TOP - 0.04, 0), BIOME.cabinWall2)];
  for (const z of [-0.45, 0.45]) {
    for (const s of [-1, 1]) parts.push(wood(new THREE.BoxGeometry(0.07, 0.5, 0.07).rotateZ(s * 0.6).translate(s * 0.17, HORSE_TOP - 0.24, z), BIOME.cabinWall2));
    parts.push(wood(new THREE.BoxGeometry(0.44, 0.05, 0.045).translate(0, HORSE_TOP - 0.15, z + 0.055), BIOME.cabinWall2));
  }
  return merge(parts);
}

/** A hand saw: its origin where it's held, the blade along -y, its teeth toward -z (down, when the arm's out in front). */
export function buildSaw(): THREE.BufferGeometry {
  const LEN = 0.46, DEEP = 0.1, TEETH = 9;
  const s = new THREE.Shape();
  s.moveTo(0.03, 0.012);
  s.lineTo(LEN, 0.0);
  s.lineTo(LEN, -DEEP * 0.45);
  for (let i = TEETH; i > 0; i--) {
    const x = 0.03 + ((LEN - 0.03) * i) / TEETH, x0 = 0.03 + ((LEN - 0.03) * (i - 1)) / TEETH, d = DEEP * (1 - 0.5 * (i / TEETH));
    s.lineTo((x + x0) / 2, -d - 0.022);
    s.lineTo(x0, -d + 0.004);
  }
  s.closePath();
  const blade = new THREE.ExtrudeGeometry(s, { depth: 0.014, bevelEnabled: false }).translate(0, 0, -0.007);
  // (The shape's x runs down the blade, its y is across it.)
  blade.applyMatrix4(new THREE.Matrix4().makeBasis(new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(-1, 0, 0)));
  const grip = new THREE.BoxGeometry(0.05, 0.11, 0.13).translate(0, 0.0, -0.045);
  return merge([wood(grip), colored(blade, BIOME.steel, 0, false)]);
}

/** A wooden mallet: its origin where it's held, the handle along -y, the head across it (along z). */
export function buildMallet(): THREE.BufferGeometry {
  const handle = new THREE.CylinderGeometry(0.022, 0.022, 0.34, 8).translate(0, -0.11, 0);
  const head = new THREE.CylinderGeometry(0.075, 0.075, 0.2, 10).rotateX(Math.PI / 2).translate(0, -0.28, 0);
  return merge([wood(handle), wood(head, BIOME.cabinWall2)]);
}

/** A ladder one unit long (up y from its foot at the origin), its rungs along x: scaled to the wall it leans on. */
export function buildLadder(): THREE.BufferGeometry {
  const W = 0.3, parts: THREE.BufferGeometry[] = [];
  for (const s of [-1, 1]) parts.push(wood(new THREE.BoxGeometry(0.035, 1.06, 0.035).translate((s * W) / 2, 0.5, 0)));
  for (let i = 0; i < 6; i++) parts.push(wood(new THREE.BoxGeometry(W, 0.028, 0.028).translate(0, 0.1 + i * 0.16, 0)));
  return merge(parts);
}
