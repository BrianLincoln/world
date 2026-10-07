import * as THREE from 'three';
import { makeSolidMaterial } from '../gfx/materials';

/**
 * What a dungeon keeps, and what the giant is fed: a dark light. The ring's
 * own colours (an ink heart, the violet of its field round it), so it is
 * never taken for a spirit's light, which is orange.
 */
export const DARK_LIGHT = { core: '#1c1230', rim: '#a45cff' };

/** A dark light of radius `r`: the mesh to place and scale, and its rim's material (`uEmissive`: how far it carries). */
export function makeDarkLight(r = 1) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(r * 0.8, 20, 14), makeSolidMaterial(DARK_LIGHT.core, 0, { keep: 1, flat: 0.5 }));
  const glow = makeSolidMaterial(DARK_LIGHT.rim, 0.95, { keep: 1 });
  // (The rim is a shell drawn from inside, behind the heart: a ring of light round a dark ball from anywhere.)
  glow.side = THREE.BackSide;
  const rim = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), glow);
  mesh.frustumCulled = rim.frustumCulled = false;
  mesh.add(rim);
  return { mesh, glow };
}
