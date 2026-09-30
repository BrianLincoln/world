import * as THREE from 'three';
import { slotCanvas, tex, type IconName } from './icons';
import { Billboard, Sketch } from './overlay';

// Buildable parts, shared by the cabin repairs and the stable. Each goes
// broken (or not yet there) -> sketched (a dashed ghost with icon slots) ->
// built (it snaps in solid with a pop). The owner makes the solid piece and
// decides where the slots hang; this holds the part's state and its sketch.

export type CabinPartId = 'roof' | 'door' | 'chimney';
export type StablePartId = 'footing' | 'frame' | 'sroof' | 'fence';
export type PartId = CabinPartId | StablePartId;
export type PartState = 'broken' | 'sketch' | 'built';

export interface Part {
  id: PartId;
  icon: IconName;
  need: number;
  filled: number;
  state: PartState;
  /** The finished piece (hidden until built), under a pivot for the pop. */
  pivot: THREE.Object3D;
  /** What building it replaces (fallen boards, the hanging door, rubble, marker stakes). */
  broken: THREE.Object3D[];
  sketch: Sketch;
  slots: Billboard[];
  slotPop: number[];
  /** Owner-local anchor for the slot row. */
  slotAt: THREE.Vector3;
  popT: number;
  sketchA: number;
  /** World centre (for effects and flying icons). */
  centre: THREE.Vector3;
}

/** Something with parts to build (the director deposits into these). */
export interface Buildable {
  readonly parts: Partial<Record<PartId, Part>>;
  remaining(id: PartId): number;
  showSketch(id: PartId): void;
  fill(id: PartId): boolean;
  slotPos(p: Part, i: number, out: THREE.Vector3): THREE.Vector3;
  setBuilt(id: PartId): void;
  setFilled(id: PartId, n: number): void;
  /** Close enough to where these parts go to hand material over. */
  near(parts: PartId[], p: THREE.Vector3): boolean;
}

/**
 * A part's sketch and slots. The sketch lives in the overlay scene under a
 * holder carrying `matrix` (the owner's world transform, plus the pivot's
 * offset for pieces that swing).
 */
export function makePart(
  id: PartId, icon: IconName, need: number, pivot: THREE.Object3D, broken: THREE.Object3D[],
  fill: THREE.BufferGeometry, edges: THREE.BufferGeometry, matrix: THREE.Matrix4, overlay: THREE.Object3D,
  slotAt: THREE.Vector3, centre: THREE.Vector3, threshold = 20,
): Part {
  pivot.visible = false;
  const sketch = new Sketch(fill, edges, { threshold });
  const holder = new THREE.Group();
  holder.matrixAutoUpdate = false;
  holder.matrix.copy(matrix);
  holder.add(sketch.group);
  overlay.add(holder);
  const slots: Billboard[] = [];
  for (let i = 0; i < need; i++) {
    const b = new Billboard(tex(slotCanvas(icon, false)), 0.62, 36);
    b.alpha = 0;
    slots.push(b);
    overlay.add(b.mesh);
  }
  return { id, icon, need, filled: 0, state: 'broken', pivot, broken, sketch, slots, slotPop: slots.map(() => 0), slotAt, popT: -1, sketchA: 0, centre };
}

/** Fill one slot; returns true when the part completes. */
export function fillPart(p: Part): boolean {
  if (p.state !== 'sketch' || p.filled >= p.need) return false;
  p.slotPop[p.filled] = 1;
  p.slots[p.filled].texture = tex(slotCanvas(p.icon, true));
  p.filled++;
  if (p.filled >= p.need) {
    p.popT = 0;
    return true;
  }
  return false;
}

/** Straight to built (restoring a save). */
export function setPartBuilt(p: Part) {
  p.filled = p.need;
  p.state = 'built';
  p.pivot.visible = true;
  p.pivot.scale.setScalar(1);
  for (const o of p.broken) o.visible = false;
  p.sketch.set(0);
  for (const s of p.slots) s.alpha = 0;
}

/** Some slots already filled (restoring a save); never the last one. */
export function setPartFilled(p: Part, n: number) {
  for (let i = 0; i < n && p.filled < p.need - 1; i++) {
    p.slots[p.filled].texture = tex(slotCanvas(p.icon, true));
    p.filled++;
  }
}

/**
 * One frame of a part: the sketch fades in and out, the slots bob and pop,
 * and a finished part snaps in with a squash-and-settle. Returns true on
 * the frame it snaps in (the owner hides what it replaces and bursts).
 */
export function tickPart(p: Part, dt: number, t: number, slotPos: (i: number, out: THREE.Vector3) => THREE.Vector3): boolean {
  const e = (k: number) => 1 - Math.exp(-k * dt);
  const want = p.state === 'sketch' ? 1 : 0;
  p.sketchA += (want - p.sketchA) * e(p.state === 'built' ? 7 : 3);
  p.sketch.set(p.sketchA);
  for (let i = 0; i < p.need; i++) {
    const s = p.slots[i];
    slotPos(i, s.pos);
    s.pos.y += Math.sin(t * 2 + i * 0.7) * 0.04;
    p.slotPop[i] = Math.max(0, p.slotPop[i] - dt * 3);
    s.scale = 1 + Math.sin(p.slotPop[i] * Math.PI) * 0.45;
    s.alpha = p.sketchA;
  }
  let snapped = false;
  if (p.popT >= 0) {
    p.popT += dt;
    if (p.popT > 0.18 && p.state === 'sketch') {
      p.state = 'built';
      p.pivot.visible = true;
      for (const o of p.broken) o.visible = false;
      snapped = true;
    }
    if (p.state === 'built') {
      const k = p.popT - 0.18;
      const s = k < 0.12 ? 0.82 + (k / 0.12) * 0.3 : 1 + 0.12 * Math.exp(-k * 7) * Math.cos(k * 22);
      p.pivot.scale.setScalar(s);
      if (k > 2) { p.pivot.scale.setScalar(1); p.popT = -1; }
    }
  }
  return snapped;
}
