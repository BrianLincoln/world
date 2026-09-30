import * as THREE from 'three';
import { PASTURE_D, PASTURE_W, pasturePlane, siteLocal, siteToLocal, type Pasture, type StorySite } from '../world/storySite';
import { fillPart, makePart, setPartBuilt, setPartFilled, tickPart, type Buildable, type Part, type PartId, type StablePartId } from './build';
import type { IconName } from './icons';
import { glintMat, propMesh } from './props';
import { buildFence, buildStable, GATE_HW, gateSketch, STB, TALLY, TALLY_VERTS } from './stableGeometry';

// Phase 3's stable and its pasture: the stone footing and trough, the
// timber frame (walls, stalls, hay racks, the tally board), the turf roof
// and the split-rail fence with its gate. Each is a buildable part (see
// build.ts). Before the fence goes up, marker stakes show where it will run.
// The gate swings open as you come up to it. The tally board on the stable's
// gate-side wall gets a painted mark for every creature living here.

const PART_ICON: Record<StablePartId, IconName> = { footing: 'stone', frame: 'log', sroof: 'log', fence: 'log' };

/** A solid box in some frame: centre, half extents, top above the ground there. */
type Box = [cx: number, cz: number, hx: number, hz: number, top: number];

export class Stable implements Buildable {
  readonly root = new THREE.Group();
  /** Overlay-scene objects (sketches, slots). */
  readonly overlay = new THREE.Group();
  readonly mat = glintMat({ toneVar: 0 });
  readonly parts: Record<StablePartId, Part>;
  readonly p: Pasture;
  /** The stable's own frame (world): its centre and yaw. */
  readonly frame: { x: number; z: number; rot: number; y: number };
  private house = new THREE.Group();
  private fenceGroup = new THREE.Group();
  private gatePivot = new THREE.Group();
  private gateOpen = 0;
  private tallyPaint: THREE.Mesh;
  private tallyN = 0;
  private stakes: THREE.Mesh;
  private posts: THREE.Vector3[];
  private camRight = new THREE.Vector3(1, 0, 0);
  private t = 0;
  /** World positions the story uses. */
  readonly gate = new THREE.Vector3();
  readonly gateOut = new THREE.Vector3();
  readonly gateIn = new THREE.Vector3();
  readonly front = new THREE.Vector3();
  readonly tallyPos = new THREE.Vector3();

  constructor(site: StorySite, private puffs: (at: THREE.Vector3, n: number, size: number, spread: number) => void) {
    const p = (this.p = site.pasture!);
    this.root.position.set(p.x, p.y, p.z);
    this.root.rotation.y = p.rot;
    const ground = (lx: number, lz: number) => pasturePlane(p, lx, lz) - p.y;
    // The stable across one end, its back wall on the fence line, open to the pasture.
    const sx = p.end * (PASTURE_W / 2 - STB.D / 2);
    this.house.position.set(sx, ground(sx, 0), 0);
    this.house.rotation.y = -p.end * Math.PI / 2;
    this.root.add(this.house, this.fenceGroup);
    this.root.updateMatrixWorld(true);
    const hc = siteLocal(p, sx, 0);
    this.frame = { x: hc.x, z: hc.z, rot: p.rot - p.end * Math.PI / 2, y: p.y + this.house.position.y };

    const g = buildStable(p.end);
    const f = buildFence(ground, p.end);
    const piece = (geo: THREE.BufferGeometry, parent: THREE.Object3D, centre: THREE.Vector3) => {
      const pv = new THREE.Group();
      pv.position.copy(centre);
      const m = propMesh(geo, this.mat);
      m.position.copy(centre).negate();
      pv.add(m);
      parent.add(pv);
      return pv;
    };
    const hd = STB.D / 2;
    const cFoot = new THREE.Vector3(0, 0.1, 0), cFrame = new THREE.Vector3(0, 1.4, 0), cRoof = new THREE.Vector3(0, STB.eave + 0.9, 0);
    const footing = piece(g.footing, this.house, cFoot);
    const frame = piece(g.frame, this.house, cFrame);
    const roof = piece(g.roof, this.house, cRoof);
    // The tally board's marks go with the frame.
    const carved = propMesh(g.tallyCarved, this.mat);
    carved.position.copy(cFrame).negate();
    this.tallyPaint = propMesh(g.tallyPaint, this.mat);
    this.tallyPaint.position.copy(cFrame).negate();
    this.tallyPaint.geometry.setDrawRange(0, 0);
    frame.add(carved, this.tallyPaint);
    this.house.localToWorld(this.tallyPos.set(p.end * (STB.W / 2 + 0.1), 1.55, 0));

    // The fence rises out of the ground as it's built (a stand-in pivot
    // carries the pop; the fence itself only stretches up).
    const fm = propMesh(f.fence, this.mat);
    this.fenceGroup.add(fm);
    this.gatePivot.position.copy(f.hinge);
    this.gatePivot.add(propMesh(f.gate, this.mat));
    this.fenceGroup.add(this.gatePivot);
    this.fenceGroup.visible = false;
    this.stakes = propMesh(f.stakes, this.mat);
    this.stakes.visible = false;
    this.root.add(this.stakes);
    this.posts = f.posts;
    const fencePivot = new THREE.Group();

    const houseM = this.house.matrixWorld;
    const rootM = this.root.matrixWorld;
    const hw = (v: THREE.Vector3) => this.house.localToWorld(v.clone());
    const gateSk = gateSketch();
    gateSk.translate(f.hinge.x, f.hinge.y, f.hinge.z);
    const fenceFill = f.sketch.clone();
    this.parts = {
      footing: makePart('footing', PART_ICON.footing, 6, footing, [], g.footing, g.footingSketch, houseM.clone(), this.overlay, new THREE.Vector3(0, 1.3, hd + 2.4), hw(new THREE.Vector3(0, 0.3, 0.5))),
      frame: makePart('frame', PART_ICON.frame, 8, frame, [], g.frame, g.frameSketch, houseM.clone(), this.overlay, new THREE.Vector3(0, 3.4, hd + 2.2), hw(cFrame)),
      sroof: makePart('sroof', PART_ICON.sroof, 4, roof, [], g.roof, g.roofSketch, houseM.clone(), this.overlay, new THREE.Vector3(0, STB.eave + STB.rise + 1.3, 1.2), hw(cRoof)),
      fence: makePart('fence', PART_ICON.fence, 8, fencePivot, [this.stakes], fenceFill, mergeSketch(f.sketch, gateSk), rootM.clone(), this.overlay, new THREE.Vector3(0, 2.3, PASTURE_D / 2 + 1.4), new THREE.Vector3()),
    };
    this.parts.fence.centre.copy(this.local(0, PASTURE_D / 2, 1));
    this.gate.copy(this.local(0, PASTURE_D / 2, 0));
    this.gateOut.copy(this.local(0, PASTURE_D / 2 + 2.2, 0));
    this.gateIn.copy(this.local(0, PASTURE_D / 2 - 2.2, 0));
    this.front.copy(hw(new THREE.Vector3(0, 0, hd + 2.6)));
    this.front.y = this.groundAt(this.front.x, this.front.z);
    this.root.traverse((o) => { o.matrixWorldAutoUpdate = true; });
  }

  /** Pasture-local (lx, lz) -> world, `up` m above its ground. */
  local(lx: number, lz: number, up = 0) {
    const w = siteLocal(this.p, lx, lz);
    return new THREE.Vector3(w.x, pasturePlane(this.p, lx, lz) + up, w.z);
  }

  private groundAt(x: number, z: number) {
    const l = siteToLocal(this.p, x, z);
    return pasturePlane(this.p, l.x, l.z);
  }

  /** Which owner frame a part's slots hang in. */
  private owner(p: Part) { return p.id === 'fence' ? this.root : this.house; }

  slotPos(p: Part, i: number, out: THREE.Vector3) {
    const off = (i - (p.need - 1) / 2) * 0.72;
    this.owner(p).localToWorld(out.copy(p.slotAt));
    return out.addScaledVector(this.camRight, off);
  }

  showSketch(id: PartId) {
    const p = this.parts[id as StablePartId];
    if (p.state === 'broken') p.state = 'sketch';
    // The stakes go in as soon as there's anything to build.
    if (this.parts.fence.state !== 'built') this.stakes.visible = true;
  }

  fill(id: PartId) { return fillPart(this.parts[id as StablePartId]); }

  setBuilt(id: PartId) {
    setPartBuilt(this.parts[id as StablePartId]);
    if (id === 'fence') this.fenceGroup.visible = true;
  }

  setFilled(id: PartId, n: number) { setPartFilled(this.parts[id as StablePartId], n); }

  remaining(id: PartId) {
    const p = this.parts[id as StablePartId];
    return p.state === 'built' ? 0 : p.need - p.filled;
  }

  /** The marker stakes: out from the start of the phase until the fence replaces them. */
  showStakes() { if (this.parts.fence.state !== 'built') this.stakes.visible = true; }

  get built() { return Object.values(this.parts).every((p) => p.state === 'built'); }

  near(parts: PartId[], pos: THREE.Vector3) {
    if (parts.includes('fence')) {
      const l = siteToLocal(this.p, pos.x, pos.z);
      const hw = PASTURE_W / 2, hd = PASTURE_D / 2;
      return Math.abs(l.x) < hw + 4 && Math.abs(l.z) < hd + 4 && !(Math.abs(l.x) < hw - 4 && Math.abs(l.z) < hd - 4);
    }
    const l = siteToLocal(this.frame, pos.x, pos.z);
    return Math.abs(l.x) < STB.W / 2 + 3.5 && l.z > -STB.D / 2 - 2 && l.z < STB.D / 2 + 6;
  }

  /** Inside the fenced pasture (`m` m in from the fence; negative = out past it). */
  inside(x: number, z: number, m = 0) {
    const l = siteToLocal(this.p, x, z);
    return Math.abs(l.x) < PASTURE_W / 2 - m && Math.abs(l.z) < PASTURE_D / 2 - m;
  }

  /** Inside the stable's footprint (its stalls), `m` m of slack. */
  inHouse(x: number, z: number, m = 0) {
    const l = siteToLocal(this.frame, x, z);
    return Math.abs(l.x) < STB.W / 2 + m && Math.abs(l.z) < STB.D / 2 + m;
  }

  /**
   * A spot for a creature to wander to: out on the grass (clear of the
   * stable and its trough) or, sometimes, in one of the stalls.
   */
  spot(rnd: () => number, radius: number, stall = false): THREE.Vector3 {
    if (stall) {
      const bay = Math.floor(rnd() * 3);
      const w = siteLocal(this.frame, (bay - 1) * 3 + (rnd() - 0.5) * 1.2, -STB.D / 2 + 1.6 + rnd() * 1.6);
      return new THREE.Vector3(w.x, this.groundAt(w.x, w.z), w.z);
    }
    for (let k = 0; k < 20; k++) {
      const m = radius + 1.2;
      const lx = (rnd() - 0.5) * (PASTURE_W - m * 2), lz = (rnd() - 0.5) * (PASTURE_D - m * 2);
      const w = siteLocal(this.p, lx, lz);
      if (this.inHouse(w.x, w.z, radius + 1.5)) continue;
      const tl = siteToLocal(this.frame, w.x, w.z);
      if (Math.hypot(tl.x - STB.trough.x, tl.z - STB.trough.z) < radius + 1.4) continue;
      return new THREE.Vector3(w.x, pasturePlane(this.p, lx, lz), w.z);
    }
    return this.local(-this.p.end * PASTURE_W / 4, 0);
  }

  /** Pull a point back inside the fence (`m` m in), for creatures that live here. */
  keepIn(pos: THREE.Vector3, vel: THREE.Vector3, m: number) {
    const l = siteToLocal(this.p, pos.x, pos.z);
    const hx = PASTURE_W / 2 - m, hz = PASTURE_D / 2 - m;
    const cx = Math.max(-hx, Math.min(hx, l.x)), cz = Math.max(-hz, Math.min(hz, l.z));
    if (cx === l.x && cz === l.z) return;
    const w = siteLocal(this.p, cx, cz);
    const nx = w.x - pos.x, nz = w.z - pos.z, nl = Math.hypot(nx, nz) || 1;
    pos.x = w.x;
    pos.z = w.z;
    const vn = (vel.x * nx + vel.z * nz) / nl;
    if (vn < 0) { vel.x -= (nx / nl) * vn; vel.z -= (nz / nl) * vn; }
  }

  /** How many creatures live here (painted marks on the tally board). */
  setTally(n: number) {
    this.tallyN = Math.min(TALLY, n);
    this.tallyPaint.geometry.setDrawRange(0, this.tallyN * TALLY_VERTS);
  }
  get tally() { return this.tallyN; }

  // ------------------------------------------------------------ frame

  update(dt: number, cam: THREE.Vector3, openFor: THREE.Vector3[]) {
    this.t += dt;
    const cx = cam.x - this.p.x, cz = cam.z - this.p.z;
    const cl = Math.hypot(cx, cz) || 1;
    this.camRight.set(cz / cl, 0, -cx / cl);
    for (const p of Object.values(this.parts)) {
      if (tickPart(p, dt, this.t, (i, out) => this.slotPos(p, i, out))) this.burst(p);
    }
    // The fence stretches up out of the ground with its part's pop.
    const fp = this.parts.fence.pivot;
    this.fenceGroup.visible = fp.visible;
    this.fenceGroup.scale.set(1, fp.scale.x, 1);
    // The gate swings in when someone comes up to it, and back after.
    const g = this.gate;
    const open = this.fenceGroup.visible && openFor.some((q) => Math.hypot(q.x - g.x, q.z - g.z) < 4.5);
    this.gateOpen += ((open ? 1 : 0) - this.gateOpen) * (1 - Math.exp(-(open ? 4 : 1.6) * dt));
    this.gatePivot.rotation.y = 1.75 * this.gateOpen * (1 - 0.04 * Math.sin(this.t * 3) * this.gateOpen);
  }

  /** Dust where a finished part snaps in: all along the fence for the fence. */
  private burst(p: Part) {
    if (p.id === 'fence') {
      for (let i = 0; i < this.posts.length; i += 2) {
        const q = this.posts[i];
        this.puffs(this.local(q.x, q.z, 0.3), 3, 0.2, 1.4);
      }
      return;
    }
    const c = p.centre;
    this.puffs(c, 10, 0.3, 3.4);
    const v = new THREE.Vector3();
    for (let i = 0; i < 8; i++) {
      v.copy(c).add(new THREE.Vector3((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 1.5, (Math.random() - 0.5) * 3));
      this.puffs(v, 3, 0.18, 1.6);
    }
  }

  // ------------------------------------------------------------ collision

  /**
   * Push a body circle out of the stable's walls, posts and trough, and
   * (unless it's a creature: they're kept in by the pasture itself) the
   * fence, which has a gap at the gate.
   */
  push(pos: THREE.Vector3, vel: THREE.Vector3, r: number, mob = false) {
    const hw = STB.W / 2, hd = STB.D / 2;
    const house: Box[] = [];
    if (this.parts.footing.state === 'built') house.push([STB.trough.x, STB.trough.z, 0.95, 0.39, 0.55]);
    if (this.parts.frame.state === 'built') {
      house.push([0, -hd + 0.12, hw + 0.1, 0.12, 4], [-hw, 0, 0.12, hd, 4], [hw, 0, 0.12, hd, 4]);
      for (const x of STB.posts) house.push([x, hd - 0.12, 0.13, 0.13, 4]);
      const pl = STB.D - 1.35;
      for (const x of STB.posts.slice(1, 3)) house.push([x, -hd + pl / 2 + 0.1, 0.06, pl / 2, 1.5]);
    }
    if (house.length) pushBoxes(this.frame, this.frame.y, house, pos, vel, r);
    if (mob || this.parts.fence.state !== 'built') return;
    const phw = PASTURE_W / 2, phd = PASTURE_D / 2, t = 0.08;
    const top = 1.05;
    const fence: Box[] = [
      [(-phw - GATE_HW) / 2, phd, (phw - GATE_HW) / 2, t, top], [(phw + GATE_HW) / 2, phd, (phw - GATE_HW) / 2, t, top],
      [0, -phd, phw, t, top], [-phw, 0, t, phd, top], [phw, 0, t, phd, top],
    ];
    const l = siteToLocal(this.p, pos.x, pos.z);
    pushBoxes(this.p, pasturePlane(this.p, l.x, l.z), fence, pos, vel, r);
  }

  dispose() {
    this.root.traverse((o) => { if (o instanceof THREE.Mesh) o.geometry.dispose(); });
  }
}

function mergeSketch(a: THREE.BufferGeometry, b: THREE.BufferGeometry) {
  const out = new THREE.BufferGeometry();
  const pa = a.attributes.position.array as Float32Array, pb = b.attributes.position.array as Float32Array;
  const all = new Float32Array(pa.length + pb.length);
  all.set(pa);
  all.set(pb, pa.length);
  out.setAttribute('position', new THREE.BufferAttribute(all, 3));
  return out;
}

/** Push a circle out of boxes given in the frame {x, z, rot}, their tops above `y0`. */
function pushBoxes(f: { x: number; z: number; rot: number }, y0: number, boxes: Box[], pos: THREE.Vector3, vel: THREE.Vector3, r: number) {
  const l = siteToLocal(f, pos.x, pos.z);
  const feet = pos.y - y0;
  const co = Math.cos(f.rot), si = Math.sin(f.rot);
  for (const [cx, cz, hx, hz, top] of boxes) {
    if (feet > top - 0.05) continue;
    const lx = l.x - cx, lz = l.z - cz;
    if (Math.abs(lx) > hx + r + 0.5 || Math.abs(lz) > hz + r + 0.5) continue;
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
    const wx = co * nx + si * nz, wz = -si * nx + co * nz;
    const w = siteLocal(f, l.x, l.z);
    pos.x = w.x;
    pos.z = w.z;
    const vn = vel.x * wx + vel.z * wz;
    if (vn < 0) { vel.x -= wx * vn; vel.z -= wz * vn; }
  }
}
