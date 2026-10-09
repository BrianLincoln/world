import * as THREE from 'three';
import { hash01 } from '../core/rng';
import type { Tower } from '../world/towers';
import { jarCanvas } from './icons';
import { sparkBead, SparkLights } from './sparkLook';

// Sparks (docs/ROADMAP-openworld.md, "The core"): the small thing you always
// want more of in a cold country. They lie about in *warm* land only (cold
// land has nothing to find): each a small light low in the grass (its look
// is story/sparkLook.ts) that wakes as you come by, whirls up round you and
// goes into the jar. A sealed tower takes some to open. So: light a tower, its country wakes, you
// search it, and what you find lights the next.
//
// A first form, to be revised with the owner: where they lie, what a tower
// costs and how they look are all defaults (see docs/NEXT-warmth.md).
//
// Where they lie is a pure function of the seed and the tower network (so a
// save only keeps which were taken), but it is not world generation: nothing
// in `worldgen.ts` or the chunk workers knows of them.

/** A tower costs this, and one more for each tower between it and home, up to `max`. */
export const COST = { base: 3, step: 1, max: 8 };
/** A jarful: what the village gives you at the start, what its well keeps, and what the home tower takes to light again. */
export const JAR = COST.max;
/** A patch holds what its dearest neighbour costs, and this many over: so lighting a tower always leaves you better off. */
const OVER = 2;
/** How many are drawn at once (the nearest), from how far, and how near wakes one (m). */
const DRAWN = 28, SEE = 260, TAKE = 3.6;
/** One lying in wait: how high off the ground its light sits, and how big across its halo is (m). */
const REST = { y: 0.5, size: 1.5 };
/** One that's woken: how long it takes to the jar (s), how wide it whirls round you and how high it climbs on the way (m). */
const FLY = { dur: 1.25, wide: 1.5, lift: 1.7, turns: 1.6 };

export interface Spark { key: string; x: number; y: number; z: number; tower: number }

export interface SparkDeps {
  /** Is it warm there? (Sparks show, and can be taken, only in the warm.) */
  warm(x: number, z: number): boolean;
  ground(x: number, z: number): number;
  /** Where the jar is (what a woken spark flies to). */
  jarAt(out: THREE.Vector3): THREE.Vector3;
  /** One has woken (`at`: where it lay). */
  onWake(at: THREE.Vector3): void;
  /** One has gone into the jar. */
  onTake(at: THREE.Vector3): void;
}

/** How many towers stand between this one and home (0 = home). */
export function depths(towers: Tower[]): number[] {
  const d = towers.map(() => 0);
  // (Parents are always added before their children: the network is grown outward.)
  for (const t of towers) d[t.id] = t.parent >= 0 ? d[t.parent] + 1 : 0;
  return d;
}

/** What each tower costs to open (home costs nothing: it's the journey's). */
export function costs(towers: Tower[]): number[] {
  const d = depths(towers);
  return towers.map((t) => (t.home ? 0 : Math.min(COST.max, COST.base + COST.step * (d[t.id] - 1))));
}

/** Each tower's neighbours: those it sees, and the six nearest. */
export function neighbours(towers: Tower[]): number[][] {
  return towers.map((t) => {
    const near = towers.filter((o) => o !== t).sort((a, b) => Math.hypot(a.x - t.x, a.z - t.z) - Math.hypot(b.x - t.x, b.z - t.z)).slice(0, 6).map((o) => o.id);
    return [...new Set([...t.links, ...near])];
  });
}

/** Where every spark lies: per tower, what its dearest neighbour costs and `OVER` more, scattered over the middle of its patch. */
export function placeSparks(seed: number, towers: Tower[], ground: (x: number, z: number) => number): Spark[] {
  const c = costs(towers), nb = neighbours(towers), out: Spark[] = [];
  for (const t of towers) {
    const n = Math.max(...nb[t.id].map((i) => c[i]), COST.base) + OVER;
    // Well inside its own patch: nearer it than half way to any other tower.
    let room = Infinity;
    for (const o of towers) if (o !== t) room = Math.min(room, Math.hypot(o.x - t.x, o.z - t.z));
    const rMax = Math.max(120, Math.min(room * 0.42, 420));
    for (let k = 0, tries = 0; k < n && tries < n * 14; tries++) {
      const a = hash01(t.id, tries, seed, 4411) * Math.PI * 2, r = 45 + (rMax - 45) * Math.sqrt(hash01(t.id, tries, seed, 4412));
      const x = t.x + Math.cos(a) * r, z = t.z + Math.sin(a) * r, y = ground(x, z);
      // On dry land you can walk on, and not on top of another.
      if (y < 1.5 || Math.abs(ground(x + 4, z) - y) > 3 || Math.abs(ground(x, z + 4) - y) > 3) continue;
      if (out.some((s) => s.tower === t.id && Math.hypot(s.x - x, s.z - z) < 30)) continue;
      out.push({ key: `${t.id}.${tries}`, x, y, z, tower: t.id });
      k++;
    }
  }
  return out;
}

interface Flying { from: THREE.Vector3; t: number; ph: number; bead: THREE.Mesh }

export class Sparks {
  readonly group = new THREE.Group();
  /** Their light, drawn over the frame: its `mesh` goes in the overlay scene. */
  readonly lights = new SparkLights();
  /** How many you hold. */
  count = 0;
  /** You have the jar (the story says): what's in it shows whether or not there are sparks about to find. */
  jar = false;
  private all: Spark[] = [];
  private taken = new Set<string>();
  private cost: number[] = [];
  private saveKey = '';
  private pool: THREE.Mesh[] = [];
  private t = 0;
  private scanT = 0;
  private near: Spark[] = [];
  /** Woken, and on their way to the jar (they're yours already: the HUD counts each as it lands). */
  private flying: Flying[] = [];
  private v = new THREE.Vector3();
  private to = new THREE.Vector3();
  private el: HTMLDivElement;
  private elN: HTMLSpanElement;
  private elJar: HTMLImageElement;
  private shown = '';
  private shownN = -1;

  constructor(private d: SparkDeps) {
    for (let i = 0; i < DRAWN; i++) { const m = sparkBead(); this.pool.push(m); this.group.add(m); }
    // The jar, and how many are in it (by a sealed tower: of how many it wants). It fills with light as you find them.
    this.el = document.createElement('div');
    this.el.style.cssText = 'position:fixed;left:12px;bottom:112px;display:none;align-items:center;gap:3px;padding:4px 18px 4px 5px;border-radius:34px;background:rgba(250,244,232,0.92);border:2px solid #5a3f33;font:700 23px system-ui,sans-serif;color:#5a3f33;z-index:20;pointer-events:none';
    this.elJar = document.createElement('img');
    this.elJar.alt = '';
    this.elJar.style.cssText = 'width:60px;height:60px;margin:-10px 0 -6px -6px;transform-origin:50% 80%';
    this.elN = document.createElement('span');
    this.el.append(this.elJar, this.elN);
    document.body.appendChild(this.el);
  }

  setWorld(seed: number, towers: Tower[], saveKey: string) {
    this.all = placeSparks(seed, towers, this.d.ground);
    this.cost = costs(towers);
    this.saveKey = `embla.sparks.${saveKey}`;
    this.taken.clear();
    this.count = 0;
    for (const f of this.flying) this.group.remove(f.bead);
    this.flying = [];
    try {
      const s = JSON.parse(localStorage.getItem(this.saveKey) ?? 'null');
      if (s) { this.count = s.count | 0; for (const k of s.taken ?? []) this.taken.add(k); }
    } catch { /* a fresh start */ }
    this.scanT = 0;
  }

  private save() {
    try { localStorage.setItem(this.saveKey, JSON.stringify({ count: this.count, taken: [...this.taken] })); } catch { /* private mode */ }
  }

  /** What tower `id` costs to open. */
  price(id: number) { return this.cost[id] ?? 0; }
  /** Dev, and the guide's gift: `n` more (or fewer). */
  give(n: number) { this.count = Math.max(0, this.count + n); this.save(); }
  /** Pay for tower `id` (false if you can't). */
  pay(id: number) {
    const c = this.price(id);
    if (this.count < c) return false;
    this.count -= c;
    this.save();
    return true;
  }
  /** Every spark not yet taken (tests and the proof script). */
  get left() { return this.all.filter((s) => !this.taken.has(s.key)); }
  get total() { return this.all.length; }

  /** The HUD's jar: what's landed in it, of what's wanted here (or of a jarful). */
  private hud(want: number, show: boolean, on: boolean) {
    const n = Math.max(0, this.count - this.flying.length), of = want > 0 ? want : JAR;
    // (Nothing to show until you've found one, or stand by a tower that wants them.)
    this.el.style.display = on && (this.count > 0 || want > 0 || this.jar) && show ? 'flex' : 'none';
    const key = `${n}/${want}`;
    if (key === this.shown) return;
    this.shown = key;
    this.elJar.src = jarCanvas(n, of).toDataURL();
    this.elN.textContent = want > 0 ? `${n} / ${want}` : `${n}`;
    this.el.style.borderColor = want > 0 && n < want ? '#b0503a' : '#5a3f33';
    // One more in it: the jar hops.
    if (this.shownN >= 0 && n > this.shownN) this.elJar.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.32) rotate(-7deg)' }, { transform: 'scale(0.95) rotate(3deg)' }, { transform: 'scale(1)' }], { duration: 420, easing: 'ease-out' });
    this.shownN = n;
  }

  /**
   * `on`: the country is cold (before that there are none to find and nothing to pay).
   * `want`: by a sealed tower, what it costs (shown beside what you hold); 0 otherwise.
   */
  update(dt: number, at: THREE.Vector3, on: boolean, want = 0, show = true) {
    this.t += dt;
    this.group.visible = on;
    const L = this.lights;
    L.begin(dt);
    this.fly(dt);
    this.hud(want, show, on);
    if (!on) { for (const m of this.pool) m.visible = false; L.end(); return; }
    // The nearest few that are in the warm, looked for again a few times a second.
    this.scanT -= dt;
    if (this.scanT <= 0) {
      this.scanT = 0.3;
      this.near = this.all.filter((s) => !this.taken.has(s.key) && Math.abs(s.x - at.x) < SEE && Math.abs(s.z - at.z) < SEE && this.d.warm(s.x, s.z))
        .sort((a, b) => Math.hypot(a.x - at.x, a.z - at.z) - Math.hypot(b.x - at.x, b.z - at.z)).slice(0, DRAWN);
    }
    for (let i = 0; i < DRAWN; i++) {
      const m = this.pool[i], s = this.near[i];
      if (!s || this.taken.has(s.key)) { m.visible = false; continue; }
      const ph = hash01(i, Math.round(s.x), Math.round(s.z), 77) * 6.28, dist = Math.hypot(s.x - at.x, s.z - at.z);
      // Low in the grass, breathing; it leans up toward you as you come near.
      const perk = 1 - THREE.MathUtils.smoothstep(dist, TAKE, TAKE * 3);
      m.visible = true;
      m.position.set(s.x, s.y + REST.y + 0.07 * Math.sin(this.t * 1.7 + ph) + 0.35 * perk, s.z);
      L.put(m.position, REST.size * (1 + 0.25 * perk), ph);
      // (A fleck of glitter drifts up off it now and then: more, the nearer you are.)
      if (dist < 70 && Math.random() < dt * (0.9 + 5 * perk)) L.shed(this.v.copy(m.position).setY(m.position.y + 0.15), 1, 0.5, 0.06);
      if (dist < TAKE && Math.abs(s.y + 1 - at.y) < 3.5) {
        // Yours from here: it only has to get to the jar.
        this.taken.add(s.key);
        this.count++;
        this.save();
        m.visible = false;
        const bead = sparkBead();
        this.group.add(bead);
        this.flying.push({ from: m.position.clone(), t: 0, ph, bead });
        L.shed(m.position, 7, 2.2, 0.08);
        this.d.onWake(m.position);
      }
    }
    L.end();
  }

  /** Woken ones: up and round you, then into the jar. */
  private fly(dt: number) {
    const L = this.lights;
    for (const f of this.flying) {
      f.t += dt;
      const u = Math.min(1, f.t / FLY.dur), arc = Math.sin(u * Math.PI);
      // (Slow off the ground, quick at the last: it's drawn in.)
      const e = u * u * u, a = f.ph + u * FLY.turns * Math.PI * 2;
      this.d.jarAt(this.to);
      const p = f.bead.position.copy(f.from).lerp(this.to, e);
      p.x += Math.cos(a) * FLY.wide * arc * (1 - e);
      p.z += Math.sin(a) * FLY.wide * arc * (1 - e);
      p.y += FLY.lift * arc * (1 - e * 0.6);
      f.bead.visible = true;
      L.put(p, REST.size * (1.15 - 0.55 * e), f.ph, 1);
      if (Math.random() < dt * 34) L.shed(p, 1, 0.35, 0.07);
      if (u >= 1) {
        this.group.remove(f.bead);
        L.shed(this.to, 9, 1.6, 0.07);
        this.d.onTake(this.to);
      }
    }
    this.flying = this.flying.filter((f) => f.t < FLY.dur);
  }
}
