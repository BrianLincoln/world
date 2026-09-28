// Deterministic hashing / PRNG helpers. Everything in world generation derives
// from these so a seed always reproduces the same world, on any thread.

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Integer hash of (x, z, seed, salt) -> uint32. */
export function hashInt(x: number, z: number, seed: number, salt = 0): number {
  let h = (seed ^ Math.imul(salt + 0x9e3779b9, 0x85ebca6b)) >>> 0;
  h = Math.imul(h ^ Math.imul(x | 0, 0x27d4eb2d), 0x165667b1);
  h = Math.imul(h ^ Math.imul(z | 0, 0x1b873593), 0xcc9e2d51);
  h ^= h >>> 15;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

/** Hash to [0, 1). */
export function hash01(x: number, z: number, seed: number, salt = 0): number {
  return hashInt(x, z, seed, salt) / 4294967296;
}

/** Seeds may be typed as words ("fjord") or numbers. */
export function seedFromString(s: string): number {
  const trimmed = s.trim();
  if (/^-?\d+$/.test(trimmed)) return (parseInt(trimmed, 10) >>> 0) || 1;
  let h = 2166136261;
  for (let i = 0; i < trimmed.length; i++) {
    h ^= trimmed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0 || 1;
}

export const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export function smoothstep(e0: number, e1: number, x: number): number {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
}
