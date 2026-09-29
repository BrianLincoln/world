import * as THREE from 'three';
import { makeSolidMaterial } from '../gfx/materials';
import { Puffs } from '../gfx/puffs';
import { U } from '../gfx/materials';
import { SmokeColumn } from './smoke';
import { siteLocal, siteToLocal, type StorySite } from '../world/storySite';
import { buildRuin, CAB, type CabinParts } from './geometry';
import { bubbleCanvas, slotCanvas, tex, type IconName } from './icons';
import { Billboard, Sketch } from './overlay';
import { glintMat, propMesh } from './props';

// The broken start cabin. Each repairable part goes broken -> sketched (a
// dashed ghost with icon slots) -> built (it snaps in solid with a pop). The
// hearth goes cold -> lit, which warms the interior and lights the windows.
// A dollhouse cutaway hides the roof and the walls between camera and
// explorer when you're inside. Colliders keep you out of the walls.

export type PartId = 'roof' | 'door' | 'chimney';
export type PartState = 'broken' | 'sketch' | 'built';

interface Part {
  id: PartId;
  icon: IconName;
  need: number;
  filled: number;
  state: PartState;
  /** The repaired piece (hidden until built), under a pivot for the pop. */
  pivot: THREE.Group;
  /** What the repair replaces (fallen boards, the hanging door, rubble). */
  broken: THREE.Object3D[];
  sketch: Sketch;
  slots: Billboard[];
  slotPop: number[];
  /** Local anchor for the slot row. */
  slotAt: THREE.Vector3;
  popT: number;
  sketchA: number;
  /** World centre (for effects and flying icons). */
  centre: THREE.Vector3;
}

const PART_ICON: Record<PartId, IconName> = { roof: 'log', door: 'log', chimney: 'stone' };

export class RuinCabin {
  readonly root = new THREE.Group();
  /** Overlay-scene objects (sketches, slots). */
  readonly overlay = new THREE.Group();
  readonly mat = glintMat({ toneVar: 0 });
  readonly hearthMat = glintMat({ toneVar: 0 });
  readonly parts: Record<PartId, Part>;
  private sides: Record<'front' | 'back' | 'left' | 'right' | 'roof' | 'chimney', THREE.Object3D[]>;
  private doorPivot = new THREE.Group();
  private doorOpen = 0;
  doorTarget = 0;
  lit = false;
  private litT = 0;
  private fire = new THREE.Group();
  private flames: THREE.Mesh[] = [];
  private ash: THREE.Mesh;
  readonly embers = new Puffs('#ffb45a', 24, 0.9, 0.9);
  readonly smoke = new Puffs('#f3ebe0', 36, 0, 0.55);
  /** The tall plume from the lit chimney, seen from across the valley. */
  readonly column: SmokeColumn;
  private smokeT = 0;
  private emberT = 0;
  private t = 0;
  /** World positions used by the story. */
  readonly hearthPos = new THREE.Vector3();
  readonly doorPos = new THREE.Vector3();
  readonly chimneyTop = new THREE.Vector3();
  readonly windows: THREE.Vector3[] = [];

  constructor(readonly site: StorySite, puffs: (at: THREE.Vector3, n: number, size: number, spread: number) => void) {
    this.puffs = puffs;
    this.root.position.set(site.x, site.y, site.z);
    this.root.rotation.y = site.rot;
    this.root.updateMatrixWorld();
    const g: CabinParts = buildRuin();
    const add = (geo: THREE.BufferGeometry, parent: THREE.Object3D = this.root, mat = this.mat) => {
      const m = propMesh(geo, mat);
      parent.add(m);
      return m;
    };
    const front = add(g.front), back = add(g.back), left = add(g.left), right = add(g.right);
    add(g.floor);
    const roof = add(g.roof);
    const chimneyBase = add(g.chimneyBase);
    add(g.hearth, this.root, this.hearthMat);
    this.ash = add(g.coldAsh);
    const debris = add(g.debris);
    const rubble = add(g.rubble);

    // Hanging door (broken): swung out and dropped off its lower hinge.
    const dr = CAB.door;
    const dh = dr.y1 - dr.y0 - 0.02;
    const hang = new THREE.Group();
    hang.position.set(dr.x0 + 0.02, dr.y1 - 0.02, CAB.D / 2 + 0.06);
    hang.rotation.set(0, -0.62, -0.4);
    const hangMesh = add(g.door, hang);
    hangMesh.position.y = -dh;
    this.root.add(hang);
    // Repaired door hinge.
    this.doorPivot.position.set(dr.x0 + 0.01, dr.y0 + 0.01, CAB.D / 2 - 0.03);
    add(g.door, this.doorPivot);

    const mkPart = (id: PartId, need: number, solid: THREE.BufferGeometry, sketchGeo: THREE.BufferGeometry, centre: THREE.Vector3, slotAt: THREE.Vector3, broken: THREE.Object3D[], pivot?: THREE.Group): Part => {
      const pv = pivot ?? new THREE.Group();
      if (!pivot) {
        pv.position.copy(centre);
        const m = add(solid, pv);
        m.position.copy(centre).negate();
        this.root.add(pv);
      } else this.root.add(pv);
      pv.visible = false;
      const sk = new Sketch(solid, sketchGeo, { threshold: 20 });
      // Sketches live in the overlay scene; give them the cabin's transform.
      const holder = new THREE.Group();
      holder.matrixAutoUpdate = false;
      if (pivot) {
        holder.matrix.copy(this.root.matrixWorld).multiply(new THREE.Matrix4().makeTranslation(pv.position.x, pv.position.y, pv.position.z));
      } else holder.matrix.copy(this.root.matrixWorld);
      holder.add(sk.group);
      this.overlay.add(holder);
      const slots: Billboard[] = [];
      for (let i = 0; i < need; i++) {
        const b = new Billboard(tex(slotCanvas(PART_ICON[id], false)), 0.62, 36);
        b.alpha = 0;
        slots.push(b);
        this.overlay.add(b.mesh);
      }
      return {
        id, icon: PART_ICON[id], need, filled: 0, state: 'broken', pivot: pv, broken, sketch: sk, slots, slotPop: slots.map(() => 0), slotAt,
        popT: -1, sketchA: 0, centre: this.toWorld(centre.clone()),
      };
    };

    const doorCentre = new THREE.Vector3((dr.x0 + dr.x1) / 2, (dr.y0 + dr.y1) / 2, CAB.D / 2);
    const ch = CAB.chimney;
    this.parts = {
      roof: mkPart('roof', 4, g.roofPatch, g.roofSketch, new THREE.Vector3(-0.7, CAB.wallTop + 1.1, 1.3), new THREE.Vector3(-0.6, CAB.wallTop + 2.0, 2.35), [debris]),
      door: mkPart('door', 2, g.door, g.doorSketch, doorCentre, new THREE.Vector3(-0.9, dr.y1 - 0.9, CAB.D / 2 + 1.0), [hang], this.doorPivot),
      chimney: mkPart('chimney', 3, g.chimneyTop, g.chimneySketch, new THREE.Vector3(ch.x, 3.6, ch.z), new THREE.Vector3(ch.x + 1.1, 3.2, ch.z + 0.2), [rubble]),
    };
    this.sides = {
      front: [front, hang], back: [back], left: [left], right: [right],
      roof: [roof, this.parts.roof.pivot], chimney: [chimneyBase, this.parts.chimney.pivot, rubble],
    };

    // Hearth fire: three nested flame tongues, unlit (emissive) so they bloom.
    const flameGeo = new THREE.LatheGeometry([
      [0.001, 0], [0.09, 0.03], [0.13, 0.1], [0.12, 0.2], [0.08, 0.3], [0.03, 0.4], [0.001, 0.46],
    ].map(([r, y]) => new THREE.Vector2(r, y)), 18);
    for (const [hex, s, em, dx] of [['#e8683c', 1.25, 0.85, 0], ['#ff9d45', 1.0, 0.95, 0.05], ['#ffdc84', 0.62, 1.0, -0.03], ['#ff9d45', 0.7, 0.95, 0.16], ['#ff9d45', 0.6, 0.95, -0.17]] as const) {
      const m = new THREE.Mesh(flameGeo, makeSolidMaterial(hex, em));
      m.scale.setScalar(s);
      m.position.z = dx;
      m.userData.s = s;
      this.fire.add(m);
      this.flames.push(m);
    }
    this.fire.position.set(CAB.hearth.x - 0.38, CAB.floor + 0.02, CAB.hearth.z);
    this.fire.visible = false;
    this.root.add(this.fire);

    this.toWorld(this.hearthPos.set(CAB.hearth.x - 0.38, CAB.floor + 0.25, CAB.hearth.z));
    this.toWorld(this.doorPos.set((dr.x0 + dr.x1) / 2, 0, CAB.D / 2 + 0.9));
    this.toWorld(this.chimneyTop.set(ch.x, ch.top + 0.25, ch.z));
    this.column = new SmokeColumn(this.chimneyTop.clone().setY(this.chimneyTop.y + 0.3));
    for (const w of [[1.7, 1.6, CAB.D / 2 + 0.1], [-1.6, 1.6, -CAB.D / 2 - 0.1], [1.4, 1.6, -CAB.D / 2 - 0.1], [-CAB.W / 2 - 0.1, 1.6, 0]]) {
      this.windows.push(this.toWorld(new THREE.Vector3(...w)));
    }
    this.root.traverse((o) => { o.matrixWorldAutoUpdate = true; });
  }

  private puffs: (at: THREE.Vector3, n: number, size: number, spread: number) => void;

  toWorld(v: THREE.Vector3) {
    return v.applyMatrix4(this.root.matrixWorld);
  }

  /** Where a part's slot `i` hangs, world space. */
  slotPos(p: Part, i: number, out: THREE.Vector3) {
    const off = (i - (p.need - 1) / 2) * 0.72;
    // Rows spread across the screen (so they never stack up seen side-on);
    // the chimney's hangs beside the stack, vertically.
    this.toWorld(out.copy(p.slotAt));
    if (p.id === 'chimney') out.y -= off;
    else out.addScaledVector(this.camRight, off);
    return out;
  }

  /** Show a part's sketch and slots (it becomes a build target). */
  showSketch(id: PartId) {
    const p = this.parts[id];
    if (p.state === 'broken') p.state = 'sketch';
  }

  /** Fill one slot; returns true when the part completes. */
  fill(id: PartId): boolean {
    const p = this.parts[id];
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

  /** Jump a part straight to built (restoring a save). */
  setBuilt(id: PartId) {
    const p = this.parts[id];
    p.filled = p.need;
    p.state = 'built';
    p.pivot.visible = true;
    p.pivot.scale.setScalar(1);
    for (const o of p.broken) o.visible = false;
    p.sketch.set(0);
    for (const s of p.slots) s.alpha = 0;
    if (id === 'door') this.doorOpen = this.doorTarget = 1;
  }

  setFilled(id: PartId, n: number) {
    const p = this.parts[id];
    for (let i = 0; i < n && p.filled < p.need - 1; i++) {
      p.slots[p.filled].texture = tex(slotCanvas(p.icon, true));
      p.filled++;
    }
  }

  light(instant = false) {
    this.lit = true;
    // Restored saves come back with the plume already up.
    if (instant) this.column.strength = this.column.target = 1;
    this.litT = instant ? 10 : 0;
    this.fire.visible = true;
    this.ash.visible = false;
  }

  remaining(id: PartId) {
    const p = this.parts[id];
    return p.state === 'built' ? 0 : p.need - p.filled;
  }

  /** Is a world point inside the cabin's floor footprint? */
  inside(x: number, z: number, margin = 0) {
    const l = siteToLocal(this.site, x, z);
    return Math.abs(l.x) < CAB.W / 2 - CAB.thick - margin && Math.abs(l.z) < CAB.D / 2 - CAB.thick - margin;
  }

  /** Horizontal camera right vector (slot rows face the viewer). */
  private camRight = new THREE.Vector3(1, 0, 0);

  update(dt: number, cam: THREE.Vector3, player: THREE.Vector3) {
    this.t += dt;
    const cx = cam.x - this.site.x, cz = cam.z - this.site.z;
    const cl = Math.hypot(cx, cz) || 1;
    this.camRight.set(cz / cl, 0, -cx / cl);
    const e = (k: number) => 1 - Math.exp(-k * dt);
    // Parts: sketch fade, slot pops, build pop.
    for (const p of Object.values(this.parts)) {
      const want = p.state === 'sketch' ? 1 : 0;
      p.sketchA += (want - p.sketchA) * e(p.state === 'built' ? 7 : 3);
      p.sketch.set(p.sketchA);
      const tmp = new THREE.Vector3();
      for (let i = 0; i < p.need; i++) {
        const s = p.slots[i];
        this.slotPos(p, i, s.pos);
        s.pos.y += Math.sin(this.t * 2 + i * 0.7) * 0.04;
        p.slotPop[i] = Math.max(0, p.slotPop[i] - dt * 3);
        s.scale = 1 + Math.sin(p.slotPop[i] * Math.PI) * 0.45;
        s.alpha = p.sketchA;
        void tmp;
      }
      if (p.popT >= 0) {
        p.popT += dt;
        if (p.popT > 0.18 && p.state === 'sketch') {
          // Snap: the solid piece appears with a squash-and-settle pop.
          p.state = 'built';
          p.pivot.visible = true;
          for (const o of p.broken) o.visible = false;
          this.burst(p);
        }
        if (p.state === 'built') {
          const t = p.popT - 0.18;
          const s = t < 0.12 ? 0.82 + (t / 0.12) * 0.3 : 1 + 0.12 * Math.exp(-t * 7) * Math.cos(t * 22);
          p.pivot.scale.setScalar(s);
          if (p.id === 'door' && t > 1.3) this.doorTarget = 1;
          if (t > 2) { p.pivot.scale.setScalar(1); p.popT = -1; }
        }
      }
    }
    this.doorOpen += (this.doorTarget - this.doorOpen) * e(2.2);
    this.doorPivot.rotation.y = -1.85 * this.doorOpen;

    // Fire.
    if (this.lit) {
      this.litT += dt;
      const grow = Math.min(1, this.litT / 0.6);
      const k = grow < 1 ? grow * (1 + 0.4 * Math.sin(grow * Math.PI)) : 1;
      for (const [i, f] of this.flames.entries()) {
        const s = f.userData.s as number;
        const fl = 1 + 0.16 * Math.sin(this.t * (9 + i * 2.3) + i) * Math.sin(this.t * (5.7 + i));
        f.scale.set(s * k * (1 - (fl - 1) * 0.5), s * k * fl, s * k * (1 - (fl - 1) * 0.5));
        f.rotation.z = Math.sin(this.t * (3.1 + i) + i * 2) * 0.12;
        f.rotation.x = Math.sin(this.t * (2.7 + i * 0.6)) * 0.1;
      }
      this.mat.uniforms.uFire.value = Math.min(1, this.litT / 1.2);
      this.hearthMat.uniforms.uFire.value = this.mat.uniforms.uFire.value;
      // Embers drift up out of the firebox; smoke curls from the chimney.
      this.emberT -= dt;
      if (this.emberT <= 0) {
        this.emberT = 0.18 + Math.random() * 0.3;
        this.embers.emit(this.hearthPos, 1, 0.022, 0.15, undefined, { life: 1.0, rise: 1.2, drag: 1.5, up: 0.6 });
      }
      this.column.target = this.parts.chimney.state === 'built' ? 1 : 0;
      if (this.parts.chimney.state === 'built') {
        this.smokeT -= dt;
        if (this.smokeT <= 0) {
          this.smokeT = 0.42 + Math.random() * 0.2;
          this.smoke.emit(this.chimneyTop, 1, 0.26 + Math.random() * 0.12, 0.2, undefined, { life: 3.2, rise: 0.18, drag: 0.35, up: 0.8 });
        }
      }
    }
    const win = this.lit ? THREE.MathUtils.clamp(0.55 + 0.45 * (this.mat.uniforms.uFire.value), 0, 1) * Math.min(1, this.litT / 1.5) : 0;
    this.mat.uniforms.uWin.value = win;
    this.embers.update(dt);
    this.smoke.update(dt);
    this.column.update(dt, U.uNight.value as number);

    this.cutaway(cam, player);
  }

  /** Dust ring and a sparkle where a finished part snaps in. */
  private burst(p: Part) {
    const c = p.centre;
    this.puffs(c, 10, 0.28, 3.2);
    const v = new THREE.Vector3();
    for (let i = 0; i < 6; i++) {
      v.copy(c).add(new THREE.Vector3((Math.random() - 0.5) * 2.5, (Math.random() - 0.5) * 1.2, (Math.random() - 0.5) * 2.5));
      this.puffs(v, 3, 0.16, 1.6);
    }
  }

  private cutaway(cam: THREE.Vector3, player: THREE.Vector3) {
    const c = siteToLocal(this.site, cam.x, cam.z);
    const p = siteToLocal(this.site, player.x, player.z);
    const camY = cam.y - this.site.y, plY = player.y - this.site.y;
    const hw = CAB.W / 2, hd = CAB.D / 2;
    // Underside of the gable over a point (ridge along x), not a flat lid at
    // ridge height: someone standing on a roof slope is below the ridge.
    const roofY = (z: number) => CAB.wallTop + CAB.rise * Math.max(0, 1 - Math.abs(z) / hd);
    const plIn = Math.abs(p.x) < hw + 0.1 && Math.abs(p.z) < hd + 0.1 && plY < roofY(p.z) - 0.25;
    const onRoof = !plIn && plY > CAB.wallTop - 0.2 && Math.abs(p.x) < hw + 0.6 && Math.abs(p.z) < hd + CAB.over + 0.6;
    // A camera inside the shell counts as inside; one pressed up against the
    // walls does too, unless the explorer is up on the roof (the roof stays).
    const camUnder = camY < roofY(c.z);
    const camInside = Math.abs(c.x) < hw && Math.abs(c.z) < hd && camUnder;
    const camNear = Math.abs(c.x) < hw + 1.0 && Math.abs(c.z) < hd + 1.0 && camUnder;
    const camIn = camInside || (camNear && !onRoof);
    // A wall hides when the sightline from camera to explorer crosses it.
    const crosses = (axis: 'x' | 'z', plane: number, span: number) => {
      const a = c[axis] - plane, b = p[axis] - plane;
      if (a * b >= 0) return false;
      const t = a / (a - b);
      const o = axis === 'x' ? 'z' : 'x';
      const at = c[o] + (p[o] - c[o]) * t;
      const y = camY + (plY + 1.2 - camY) * t;
      return Math.abs(at) < span + 0.4 && y < CAB.wallTop + CAB.rise * (1 - Math.abs(axis === 'x' ? at : 0) / hd) + 0.3;
    };
    const hideFront = (plIn || camIn) && crosses('z', hd, hw);
    const hideBack = (plIn || camIn) && crosses('z', -hd, hw);
    const hideLeft = (plIn || camIn) && crosses('x', -hw, hd);
    const hideRight = (plIn || camIn) && crosses('x', hw, hd);
    const set = (arr: THREE.Object3D[], hide: boolean) => { for (const o of arr) o.userData.cut = hide; };
    set(this.sides.front, hideFront);
    set(this.sides.back, hideBack);
    set(this.sides.left, hideLeft);
    set(this.sides.right, hideRight);
    set(this.sides.chimney, hideRight);
    set(this.sides.roof, plIn || camIn);
    for (const arr of Object.values(this.sides)) for (const o of arr) {
      const base = o.userData.baseVisible ?? true;
      if (o === this.parts.roof.pivot || o === this.parts.chimney.pivot) {
        const part = o === this.parts.roof.pivot ? this.parts.roof : this.parts.chimney;
        o.visible = part.state === 'built' && !o.userData.cut;
      } else if (this.parts.door.broken.includes(o)) {
        o.visible = this.parts.door.state !== 'built' && !o.userData.cut;
      } else if (this.parts.chimney.broken.includes(o)) {
        o.visible = this.parts.chimney.state !== 'built' && !o.userData.cut;
      } else o.visible = base && !o.userData.cut;
    }
  }

  // ------------------------------------------------------------ collision

  /** Solid boxes in cabin-local space: [cx, cz, halfX, halfZ, top]. */
  private boxes(): number[][] {
    const { W, D, wallTop } = CAB;
    const t = 0.15;
    const dr = CAB.door;
    const ch = CAB.chimney;
    return [
      [(-W / 2 + dr.x0) / 2, D / 2, (dr.x0 + W / 2) / 2, t, wallTop],
      [(dr.x1 + W / 2) / 2, D / 2, (W / 2 - dr.x1) / 2, t, wallTop],
      [0, -D / 2, W / 2, t, wallTop],
      [-W / 2, 0, t, D / 2, wallTop],
      [W / 2, 0, t, D / 2, wallTop],
      [ch.x, ch.z, ch.size / 2, ch.size / 2, this.parts?.chimney.state === 'built' ? ch.top : 1.4],
      [CAB.hearth.x - 0.36, CAB.hearth.z, 0.4, 0.75, 1.3],
    ];
  }

  /** Floor (inside) or roof surface under a foot circle, at most `step` above the feet. */
  surface(x: number, z: number, feetY: number, r: number, step: number): number {
    const l = siteToLocal(this.site, x, z);
    const y0 = this.site.y;
    const { W, D, wallTop, rise, over } = CAB;
    let best = -Infinity;
    if (Math.abs(l.x) < W / 2 && Math.abs(l.z) < D / 2) best = y0 + CAB.floor;
    // Roof you can land on (ignoring the holes: it's a storybook).
    if (Math.abs(l.x) < W / 2 + 0.3 + r && Math.abs(l.z) < D / 2 + over + r && feetY > y0 + wallTop - 0.2) {
      const nz = Math.min(D / 2 + over, Math.max(0, Math.abs(l.z) - r));
      const h = y0 + wallTop + rise * (1 - nz / (D / 2)) + 0.12;
      if (h > best) best = h;
    }
    // The stone step and hearth-slab-height props are low; walk onto them.
    return best <= feetY + step ? best : -Infinity;
  }

  /** Push a body circle out of the walls, chimney and hearth. */
  push(pos: THREE.Vector3, vel: THREE.Vector3, r: number) {
    const l = siteToLocal(this.site, pos.x, pos.z);
    if (Math.abs(l.x) > CAB.W / 2 + 3 || Math.abs(l.z) > CAB.D / 2 + 3) return;
    const feet = pos.y - this.site.y;
    const co = Math.cos(this.site.rot), si = Math.sin(this.site.rot);
    for (const [cx, cz, hx, hz, top] of this.boxes()) {
      if (feet > top - 0.05) continue;
      const lx = l.x - cx, lz = l.z - cz;
      const qx = Math.max(-hx, Math.min(hx, lx)), qz = Math.max(-hz, Math.min(hz, lz));
      let nx = lx - qx, nz = lz - qz;
      const d = Math.hypot(nx, nz);
      let depth: number;
      if (d > 1e-4) {
        if (d >= r) continue;
        nx /= d; nz /= d;
        depth = r - d;
      } else {
        const px = hx - Math.abs(lx), pz = hz - Math.abs(lz);
        if (px < pz) { nx = Math.sign(lx) || 1; nz = 0; depth = px + r; } else { nx = 0; nz = Math.sign(lz) || 1; depth = pz + r; }
      }
      l.x += nx * depth;
      l.z += nz * depth;
      // Local -> world normal (siteLocal's rotation).
      const wx = co * nx + si * nz, wz = -si * nx + co * nz;
      const w = siteLocal(this.site, l.x, l.z);
      pos.x = w.x;
      pos.z = w.z;
      const vn = vel.x * wx + vel.z * wz;
      if (vn < 0) { vel.x -= wx * vn; vel.z -= wz * vn; }
    }
  }

  /** Bubble texture helper (re-exported for the spirit). */
  static bubble(icon: IconName) { return tex(bubbleCanvas(icon)); }
}
