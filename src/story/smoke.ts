import * as THREE from 'three';
import { colored, PartBatch } from '../mobs/parts';

// Chimney smoke you can steer by: a column of soft toon puffs that climbs
// ~120 m, swelling as it rises and leaning off with the wind, so a lit
// hearth can be found from across the valley. Drawn as creature parts (one
// instanced draw): same toon bands, and outlines that ease off with distance
// the way a creature's do, so the column reads as soft, not inked.

interface Puff { pos: THREE.Vector3; vel: THREE.Vector3; age: number; life: number; size: number; spin: number; seed: number }

const MAX = 90;
const tmpM = new THREE.Matrix4();
const tmpQ = new THREE.Quaternion();
const tmpS = new THREE.Vector3();
const tmpE = new THREE.Euler();

export class SmokeColumn {
  readonly batch: PartBatch;
  private puffs: Puff[] = [];
  private emitT = 0;
  private t = 0;
  /** 0 = off .. 1 = full plume (eases, so lighting the fire builds it up). */
  strength = 0;
  target = 0;
  /** Wind drift, m/s (leans the column). */
  readonly wind = new THREE.Vector3(0.9, 0, 0.35);
  private tint = new THREE.Color();

  constructor(readonly from: THREE.Vector3) {
    const g = colored(new THREE.IcosahedronGeometry(1, 3), '#ffffff');
    this.batch = new PartBatch(g, { keep: 0.35 }, MAX);
  }

  update(dt: number, night: number) {
    this.t += dt;
    this.strength += (this.target - this.strength) * (1 - Math.exp(-0.5 * dt));
    if (this.strength > 0.05) {
      this.emitT -= dt;
      if (this.emitT <= 0 && this.puffs.length < MAX) {
        this.emitT = 0.32 / Math.max(0.3, this.strength);
        this.puffs.push({
          pos: this.from.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.2, 0, (Math.random() - 0.5) * 0.2)),
          vel: new THREE.Vector3((Math.random() - 0.5) * 0.3, 3.4 + Math.random() * 0.8, (Math.random() - 0.5) * 0.3),
          age: 0, life: 24 + Math.random() * 6, size: 0.32 + Math.random() * 0.12, spin: Math.random() * 6, seed: Math.random() * 10,
        });
      }
    }
    // Pale by day, a soft blue-grey against the night.
    this.tint.set('#f4ede4').lerp(new THREE.Color('#aeb6cf'), night * 0.6);
    this.batch.begin();
    for (const p of this.puffs) {
      p.age += dt;
      const k = p.age / p.life;
      // Rising slows as it spreads; the wind takes over with height.
      p.vel.y += (Math.max(0.9, 3.6 * (1 - k * 1.4)) - p.vel.y) * (1 - Math.exp(-0.6 * dt));
      const lean = Math.min(1, p.age / 6);
      p.pos.x += (p.vel.x + this.wind.x * lean + Math.sin(this.t * 0.3 + p.seed) * 0.25 * lean) * dt;
      p.pos.z += (p.vel.z + this.wind.z * lean) * dt;
      p.pos.y += p.vel.y * dt;
      // Swell from a wisp to a big soft cloud; pop in, shrink away at the end.
      const grow = p.size + 7.5 * Math.pow(k, 0.85);
      const s = grow * Math.min(1, p.age / 0.4) * (k > 0.85 ? Math.max(0, 1 - (k - 0.85) / 0.15) : 1);
      tmpE.set(0, p.spin + p.age * 0.05, 0);
      tmpQ.setFromEuler(tmpE);
      tmpS.set(s, s * 0.82, s);
      tmpM.compose(p.pos, tmpQ, tmpS);
      this.batch.push(tmpM, this.tint);
    }
    this.batch.end();
    this.puffs = this.puffs.filter((p) => p.age < p.life);
  }
}
