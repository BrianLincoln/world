import * as THREE from 'three';
import { makeSolidMaterial } from './materials';

// Storybook dust: opaque toon blobs that swell then shrink away, with no
// alpha (the G-buffer has none), so they get outlines like everything else.
// A small fixed pool; dead puffs are hidden so they cost no draw calls.

interface Puff {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  age: number;
  life: number;
  size: number;
  /** Upward drift (m/s^2) and velocity damping; dust settles, smoke rises. */
  rise: number;
  drag: number;
}

/** Optional overrides for longer-lived puffs (chimney smoke, wood chips, sparkles). */
export interface PuffOpts { life?: number; rise?: number; drag?: number; up?: number }

export class Puffs {
  readonly group = new THREE.Group();
  private pool: Puff[] = [];
  private next = 0;

  /** `flat` = flat-bottomed, like the clouds (the giant's breath). */
  constructor(hex = '#efe4d2', private readonly POOL = 40, emissive = 0, keep = 0.35, flat = false) {
    const geo = new THREE.IcosahedronGeometry(1, 3);
    if (flat) {
      const p = geo.getAttribute('position');
      for (let i = 0; i < p.count; i++) if (p.getY(i) < -0.3) p.setY(i, -0.3);
      geo.computeVertexNormals();
    }
    const mat = makeSolidMaterial(hex, emissive, { keep });
    for (let i = 0; i < POOL; i++) {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      mesh.frustumCulled = false;
      this.group.add(mesh);
      this.pool.push({ mesh, vel: new THREE.Vector3(), age: 0, life: 1, size: 1, rise: 0.6, drag: 4 });
    }
  }

  /**
   * A ring of `count` puffs around `at`. `spread` is outward speed (m/s),
   * `dir` (optional) biases them backwards along a direction.
   */
  emit(at: THREE.Vector3, count: number, size: number, spread: number, dir?: THREE.Vector3, o?: PuffOpts) {
    const POOL = this.POOL;
    const a0 = Math.random() * Math.PI * 2; // presentation only, not world gen
    for (let i = 0; i < count; i++) {
      const p = this.pool[this.next];
      this.next = (this.next + 1) % POOL;
      const a = a0 + (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.6;
      p.vel.set(Math.cos(a) * spread, (o?.up ?? 0.9) + Math.random() * 0.7, Math.sin(a) * spread);
      if (dir) p.vel.addScaledVector(dir, -0.35);
      p.mesh.position.set(at.x + Math.cos(a) * 0.12, at.y + 0.15, at.z + Math.sin(a) * 0.12);
      p.age = 0;
      p.life = (o?.life ?? 0.35) + Math.random() * 0.25 * (o?.life ? o.life / 0.35 * 0.5 : 1);
      p.rise = o?.rise ?? 0.6;
      p.drag = o?.drag ?? 4;
      p.size = size * (0.7 + Math.random() * 0.5);
      p.mesh.visible = true;
      p.mesh.scale.setScalar(0.001);
    }
  }

  update(dt: number) {
    for (const p of this.pool) {
      if (!p.mesh.visible) continue;
      p.age += dt;
      const t = p.age / p.life;
      if (t >= 1) {
        p.mesh.visible = false;
        continue;
      }
      // Pop in fast, shrink out slowly.
      const s = t < 0.15 ? t / 0.15 : Math.pow(1 - (t - 0.15) / 0.85, 0.8);
      p.mesh.scale.set(p.size * s, p.size * s * 0.85, p.size * s);
      p.mesh.position.addScaledVector(p.vel, dt);
      p.vel.multiplyScalar(Math.exp(-p.drag * dt));
      p.vel.y += p.rise * dt;
    }
  }
}
