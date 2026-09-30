import { WorldGen } from '../src/world/worldgen'; import { seedFromString } from '../src/core/rng';
for (const seed of ['fjord', 'moss', 'birch', 'troll', 'skerry', 'a', 'b', 'c']) {
  const g = new WorldGen(seedFromString(seed));
  let worst = 9, n = 0, hi = 0, maxUp = 0;
  for (const t of g.towers.towers) {
    const b = t.boulders[1], s = t.scale, fx = Math.sin(t.yaw), fz = Math.cos(t.yaw);
    const on = (e: number, o: number) => ({ x: b.x + fx * Math.cos(e) * b.sx * o, y: b.y + Math.sin(e) * b.sy * o, z: b.z + fz * Math.cos(e) * b.sx * o });
    const clear = (e: number) => { const p = on(e, 1.07), q = on(e, 1); p.x += fx * 0.25 * s; p.z += fz * 0.25 * s;
      return p.y - 1.1 * s - Math.max(g.height(p.x, p.z), g.height(q.x, q.z)); };
    const want = t.door.ground.y + 1.4 + 0.55 * s;
    let e0 = Math.asin(Math.max(-0.5, Math.min(0.1, (want - b.y) / (b.sy * 1.05))));
    while (e0 < 0.3 && clear(e0) < 0.4) e0 += 0.02;
    const c = clear(e0); worst = Math.min(worst, c); n++; if (e0 > 0.1) hi++;
    // how high the lock is above the ground where you stand to hit it (1.5 m out)
    const p = on(e0, 1.07); maxUp = Math.max(maxUp, p.y - 0.5 * s - g.height(p.x + fx * 1.5, p.z + fz * 1.5));
  }
  console.log(seed.padEnd(7), n, 'towers; min padlock clearance', worst.toFixed(2), 'm; raised past 0.1:', hi, '; max lock-over-stand', maxUp.toFixed(1));
}
