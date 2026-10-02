import type { DungeonSite } from './worldgen';
import * as THREE from 'three';
import { CHUNK_RES, INST_STRIDE, type ChunkRequest, type ChunkResult } from './chunkBuilder';
import ChunkWorker from './chunk.worker.ts?worker';
import { buildBoulder, buildBush, buildCabin, buildConifer, buildFlower, buildGlowcaps, buildReeds, buildTuft, TREE_HEIGHT } from '../gfx/geometry';
import { SHADOW_LAYER } from '../gfx/groundShadow';
import { ROCK_CELL, TREE_CELL } from './harvest';
import { makeCasterMaterial, makePropMaterial, makeTerrainMaterial, makeWaterMaterial } from '../gfx/materials';

// Streams terrain as a camera-centred quadtree. Every node is a fixed
// CHUNK_RES grid, so distant nodes are physically large and coarse: far
// terrain collapses into simple silhouettes. Nodes are built in a worker pool
// and cached; a node is only swapped in once it (or all its children) exist,
// so there are never holes.

const ROOT_SIZE = 8192;
const MIN_SIZE = 64;

export interface TerrainSettings {
  /** Split when distance < size * splitFactor. Higher = more detail. */
  splitFactor: number;
  /** How many root tiles around the camera (radius, in roots). */
  rootRadius: number;
  showProps: boolean;
  showGround: boolean;
}

interface NodeEntry {
  key: string;
  x0: number;
  z0: number;
  size: number;
  state: 'pending' | 'ready';
  group: THREE.Group | null;
  lastUsed: number;
  minY: number;
  maxY: number;
}

interface PropKind {
  name: string;
  geos: THREE.BufferGeometry[]; // [lod] variants
  material: THREE.ShaderMaterial;
  lodFor: (size: number) => number;
  /** Ground shadow caster: its material and which LOD it flattens. */
  caster?: { material: THREE.ShaderMaterial; lod: number };
}

/** Nodes up to this size carry shadow casters (the mask only covers ~90 m). */
const CASTER_MAX_SIZE = 128;
/** Longest shadow run (m) past a node's bounds, for culling the casters. */
const CASTER_MARGIN = 45;

function buildSharedIndex(): THREE.BufferAttribute {
  const R = CHUNK_RES;
  const idx: number[] = [];
  const V = (i: number, j: number) => j * (R + 1) + i;
  for (let j = 0; j < R; j++) {
    for (let i = 0; i < R; i++) {
      const a = V(i, j), b = V(i + 1, j), c = V(i, j + 1), d = V(i + 1, j + 1);
      idx.push(a, c, b, b, c, d);
    }
  }
  const nv = (R + 1) * (R + 1);
  const S0 = nv; // bottom edge j=0
  const S1 = nv + (R + 1); // top edge j=R
  const S2 = nv + 2 * (R + 1); // left edge i=0
  const S3 = nv + 3 * (R + 1); // right edge i=R
  // Skirts are drawn double-sided-by-both-windings (cheap and they are tiny).
  for (let k = 0; k < R; k++) {
    const quads: [number, number, number, number][] = [
      [V(k, 0), V(k + 1, 0), S0 + k, S0 + k + 1],
      [V(k, R), V(k + 1, R), S1 + k, S1 + k + 1],
      [V(0, k), V(0, k + 1), S2 + k, S2 + k + 1],
      [V(R, k), V(R, k + 1), S3 + k, S3 + k + 1],
    ];
    for (const [a, b, c, d] of quads) {
      idx.push(a, c, b, b, c, d);
      idx.push(a, b, c, b, d, c);
    }
  }
  return new THREE.BufferAttribute(new Uint32Array(idx), 1);
}

export class Terrain {
  readonly root = new THREE.Group();
  settings: TerrainSettings = { splitFactor: 1.9, rootRadius: 1, showProps: true, showGround: true };
  private seed: number;
  private workers: Worker[] = [];
  private idle: Worker[] = [];
  private queue: ChunkRequest[] = [];
  private inflight = new Map<number, NodeEntry>();
  private nodes = new Map<string, NodeEntry>();
  private nextId = 1;
  private frame = 0;
  private index = buildSharedIndex();
  private terrainMat = makeTerrainMaterial();
  private waterMat = makeWaterMaterial();
  private kinds: Record<string, PropKind>;
  private visible = new Set<NodeEntry>();
  private generation = 0;
  stats = { nodes: 0, pending: 0, built: 0, avgMs: 0, instances: 0 };

  /** Visible instance / triangle counts per prop kind (debug). */
  kindStats() {
    const out: Record<string, { inst: number; tris: number }> = {};
    for (const n of this.visible) {
      if (!n.group) continue;
      for (const c of n.group.children) {
        if (!c.visible) continue;
        const g = (c as THREE.Mesh).geometry;
        const e = (out[c.name] ??= { inst: 0, tris: 0 });
        const t = (g.index ? g.index.count : g.attributes.position.count) / 3;
        const k = g instanceof THREE.InstancedBufferGeometry ? g.instanceCount : 1;
        e.inst += k;
        e.tris += t * k;
      }
    }
    return out;
  }

  constructor(seed: number) {
    this.seed = seed;
    const n = Math.max(2, Math.min(6, (navigator.hardwareConcurrency || 4) - 1));
    for (let i = 0; i < n; i++) {
      const w = new ChunkWorker();
      w.onmessage = (e: MessageEvent<ChunkResult>) => this.onResult(w, e.data);
      this.workers.push(w);
      this.idle.push(w);
    }
    this.root.name = 'terrain';

    const treeLods = [0, 1, 2].map((l) => buildConifer(7, l as 0 | 1 | 2));
    const treeLods2 = [0, 1, 2].map((l) => buildConifer(31, l as 0 | 1 | 2));
    this.kinds = {
      trees: {
        name: 'trees',
        geos: [...treeLods, ...treeLods2],
        material: makePropMaterial({ prints: true, bend: 0.24, wind: 0.012, heightRef: TREE_HEIGHT, toneVar: 0.22, doubleSide: true, cutaway: 'occluders', harvest: { grid: TREE_CELL, chan: 0 } }),
        lodFor: (s) => (s <= 64 ? 0 : s <= 128 ? 1 : 2),
        caster: { material: makeCasterMaterial({ prints: true, bend: 0.24, wind: 0.012, heightRef: TREE_HEIGHT, harvest: { grid: TREE_CELL, chan: 0 } }), lod: 2 },
      },
      bushes: {
        name: 'bushes',
        geos: [buildBush(3, 2), buildBush(3, 1), buildBush(3, 1)],
        material: makePropMaterial({ prints: true, wind: 0.01, heightRef: 1.6, toneVar: 0.25, cutaway: 'near' }),
        lodFor: (s) => (s <= 64 ? 0 : 1),
        caster: { material: makeCasterMaterial({ prints: true, wind: 0.01, heightRef: 1.6 }), lod: 1 },
      },
      rocks: {
        name: 'rocks',
        geos: [buildBoulder(5, 3), buildBoulder(5, 2), buildBoulder(5, 1)],
        material: makePropMaterial({ prints: true, toneVar: 0.18, harvest: { grid: ROCK_CELL, chan: 1 } }),
        lodFor: (s) => (s <= 128 ? 0 : s <= 512 ? 1 : 2),
        caster: { material: makeCasterMaterial({ prints: true, harvest: { grid: ROCK_CELL, chan: 1 } }), lod: 1 },
      },
      tufts: {
        name: 'tufts',
        geos: [buildTuft()],
        material: makePropMaterial({ prints: true, wind: 0.12, heightRef: 0.6, toneVar: 0.4, doubleSide: true }),
        lodFor: () => 0,
      },
      flowers: {
        name: 'flowers',
        // Daisies / buttercups, harebells, bog reeds, glowcaps.
        geos: [buildFlower(0), buildFlower(1), buildReeds(), buildGlowcaps()],
        material: makePropMaterial({ prints: true, wind: 0.1, heightRef: 0.45, toneVar: 0.05, doubleSide: true }),
        lodFor: () => 0,
      },
      cabins: {
        name: 'cabins',
        geos: [buildCabin(0), buildCabin(1), buildCabin(2)],
        material: makePropMaterial({ toneVar: 0.1, doubleSide: true, flipBack: true }),
        lodFor: () => 0,
        caster: { material: makeCasterMaterial({}), lod: 0 },
      },
    };
  }

  /** Handed to the workers with every request (see WorldGen.dungeons: found once, on the main thread). */
  dungeons: DungeonSite[] | null = null;

  setSeed(seed: number) {
    if (seed === this.seed) return;
    this.seed = seed;
    this.generation++;
    this.queue.length = 0;
    this.inflight.clear();
    for (const n of this.nodes.values()) this.disposeNode(n);
    this.nodes.clear();
    this.visible.clear();
    this.root.clear();
  }

  get busy(): boolean {
    return this.queue.length > 0 || this.inflight.size > 0 || this.missing > 0;
  }
  private missing = 0;

  // ------------------------------------------------------------ scheduling

  update(cam: THREE.Vector3) {
    this.frame++;
    const desired: NodeEntry[] = [];
    const draw: NodeEntry[] = [];
    const R = this.settings.rootRadius;
    const rcx = Math.floor(cam.x / ROOT_SIZE);
    const rcz = Math.floor(cam.z / ROOT_SIZE);
    this.missing = 0;
    for (let dz = -R; dz <= R; dz++) {
      for (let dx = -R; dx <= R; dx++) {
        const out = this.visit((rcx + dx) * ROOT_SIZE, (rcz + dz) * ROOT_SIZE, ROOT_SIZE, cam, desired);
        if (out) draw.push(...out);
        else this.missing++;
      }
    }
    // Request missing nodes: coarse first (no holes), then nearest.
    const want = desired.filter((n) => n.state === 'pending' && !this.isQueuedOrInflight(n));
    if (want.length) {
      want.sort((a, b) => b.size - a.size || this.dist(a, cam) - this.dist(b, cam));
      for (const n of want) {
        this.queue.push({ id: this.nextId++, seed: this.seed, x0: n.x0, z0: n.z0, size: n.size });
        this.inflight.set(this.nextId - 1, n);
        (n as NodeEntry & { requested?: boolean }).requested = true;
      }
    }
    // Keep the queue relevant: drop requests for nodes no longer wanted.
    const wantedKeys = new Set(desired.map((d) => d.key));
    this.queue = this.queue.filter((q) => {
      const n = this.inflight.get(q.id);
      if (!n) return false;
      if (!wantedKeys.has(n.key)) {
        this.inflight.delete(q.id);
        (n as NodeEntry & { requested?: boolean }).requested = false;
        return false;
      }
      return true;
    });
    this.queue.sort((a, b) => b.size - a.size || this.distXZ(a.x0 + a.size / 2, a.z0 + a.size / 2, cam) - this.distXZ(b.x0 + b.size / 2, b.z0 + b.size / 2, cam));
    this.pump();

    // Swap visible set.
    const next = new Set(draw);
    for (const n of this.visible) if (!next.has(n) && n.group) n.group.visible = false;
    for (const n of next) {
      n.lastUsed = this.frame;
      if (n.group) {
        if (!n.group.parent) this.root.add(n.group);
        n.group.visible = true;
        this.applyVisibilityToggles(n, cam);
      }
    }
    this.visible = next;
    this.evict();
    this.stats.nodes = next.size;
    this.stats.pending = this.queue.length + this.inflight.size;
  }

  /** Near-detail props swap to their mid LOD past this distance (m). */
  nearLodDistance = 85;

  private applyVisibilityToggles(n: NodeEntry, cam: THREE.Vector3) {
    const g = n.group!;
    const d = this.dist(n, cam);
    const near = d < this.nearLodDistance + n.size * 0.5;
    for (const c of g.children) {
      if (c.name === 'ground' || c.name === 'water') c.visible = this.settings.showGround;
      else if (c.userData.lod === 'caster') c.visible = this.settings.showProps;
      else if (c.userData.lod === 'near') c.visible = this.settings.showProps && near;
      else if (c.userData.lod === 'mid') c.visible = this.settings.showProps && !near;
      else c.visible = this.settings.showProps;
    }
  }

  private isQueuedOrInflight(n: NodeEntry) {
    return (n as NodeEntry & { requested?: boolean }).requested === true;
  }

  private dist(n: NodeEntry, cam: THREE.Vector3) {
    return this.distXZ(n.x0 + n.size / 2, n.z0 + n.size / 2, cam);
  }
  private distXZ(x: number, z: number, cam: THREE.Vector3) {
    return Math.hypot(x - cam.x, z - cam.z);
  }

  private getNode(x0: number, z0: number, size: number): NodeEntry {
    const key = `${x0},${z0},${size}`;
    let n = this.nodes.get(key);
    if (!n) {
      n = { key, x0, z0, size, state: 'pending', group: null, lastUsed: this.frame, minY: 0, maxY: 0 };
      this.nodes.set(key, n);
    }
    return n;
  }

  /**
   * Returns the list of nodes to draw for this subtree, or null if nothing
   * complete is available. Pushes every desired leaf into `desired`.
   */
  private visit(x0: number, z0: number, size: number, cam: THREE.Vector3, desired: NodeEntry[]): NodeEntry[] | null {
    const node = this.getNode(x0, z0, size);
    node.lastUsed = this.frame;
    // Distance from camera to the node's box (xz + height).
    const cx = Math.max(x0, Math.min(cam.x, x0 + size));
    const cz = Math.max(z0, Math.min(cam.z, z0 + size));
    const dy = node.state === 'ready' ? Math.max(0, cam.y - node.maxY, node.minY - cam.y) : Math.max(0, cam.y - 150);
    const d = Math.hypot(cx - cam.x, cz - cam.z, dy);
    const split = size > MIN_SIZE && d < size * this.settings.splitFactor;
    if (!split) {
      desired.push(node);
      if (node.state === 'ready') return [node];
      // Fall back to already-built children (e.g. while zooming out).
      const h = size / 2;
      const kids = [this.nodes.get(`${x0},${z0},${h}`), this.nodes.get(`${x0 + h},${z0},${h}`), this.nodes.get(`${x0},${z0 + h},${h}`), this.nodes.get(`${x0 + h},${z0 + h},${h}`)];
      if (kids.every((k) => k && k.state === 'ready')) return kids as NodeEntry[];
      return null;
    }
    // Always want the coarse parent resident too, so a fast camera never sees holes.
    if (size >= 1024) desired.push(node);
    const h = size / 2;
    const parts: NodeEntry[] = [];
    let ok = true;
    for (const [ox, oz] of [[0, 0], [h, 0], [0, h], [h, h]]) {
      const r = this.visit(x0 + ox, z0 + oz, h, cam, desired);
      if (r) parts.push(...r);
      else ok = false;
    }
    if (ok) return parts;
    if (node.state === 'ready') return [node];
    return null;
  }

  private pump() {
    while (this.idle.length && this.queue.length) {
      const req = this.queue.shift()!;
      const w = this.idle.pop()!;
      (w as Worker & { gen?: number }).gen = this.generation;
      w.postMessage(this.dungeons ? { ...req, dungeons: this.dungeons } : req);
    }
  }

  private onResult(w: Worker, r: ChunkResult) {
    this.idle.push(w);
    const staleGen = (w as Worker & { gen?: number }).gen !== this.generation;
    const n = this.inflight.get(r.id);
    this.inflight.delete(r.id);
    if (!staleGen && n) {
      this.buildNode(n, r);
      this.stats.built++;
      this.stats.avgMs = this.stats.avgMs * 0.95 + r.ms * 0.05;
    }
    this.pump();
  }

  // ------------------------------------------------------------ meshes

  private buildNode(n: NodeEntry, r: ChunkResult) {
    const g = new THREE.Group();
    g.position.set(n.x0, 0, n.z0);
    g.visible = false;
    g.matrixAutoUpdate = false;
    g.updateMatrix();

    const geo = new THREE.BufferGeometry();
    const posAttr = new THREE.BufferAttribute(r.positions, 3);
    geo.setAttribute('position', posAttr);
    geo.setAttribute('normal', new THREE.BufferAttribute(r.normals, 3));
    geo.setAttribute('aBiome', new THREE.BufferAttribute(r.biome, 4));
    geo.setIndex(this.index);
    const skirt = 1 + n.size * 0.012;
    const box = new THREE.Box3(new THREE.Vector3(0, r.minY - 8 - skirt - 2, 0), new THREE.Vector3(n.size, r.maxY + 1, n.size));
    geo.boundingBox = box;
    geo.boundingSphere = box.getBoundingSphere(new THREE.Sphere());
    const ground = new THREE.Mesh(geo, this.terrainMat);
    ground.name = 'ground';
    ground.matrixAutoUpdate = false;
    g.add(ground);

    if (r.hasWater) {
      // Water reuses the terrain grid: the shader flattens y to sea level and
      // reads -y as depth for shallows and foam.
      const wgeo = new THREE.BufferGeometry();
      wgeo.setAttribute('position', posAttr);
      wgeo.setIndex(this.index);
      wgeo.boundingSphere = new THREE.Box3(new THREE.Vector3(0, -1, 0), new THREE.Vector3(n.size, 1, n.size)).getBoundingSphere(new THREE.Sphere());
      const water = new THREE.Mesh(wgeo, this.waterMat);
      water.name = 'water';
      water.renderOrder = 1;
      water.matrixAutoUpdate = false;
      g.add(water);
    }

    const sphere = new THREE.Sphere(new THREE.Vector3(n.size / 2, (r.minY + r.maxY) / 2 + 8, n.size / 2), n.size * 0.75 + (r.maxY - r.minY) / 2 + 30);
    const casterSphere = new THREE.Sphere(sphere.center, sphere.radius + CASTER_MARGIN);
    const addInstances = (kind: PropKind, data: Float32Array, variants: number, variantOf?: (i: number) => number) => {
      const count = data.length / INST_STRIDE;
      if (!count) return;
      const lod = kind.lodFor(n.size);
      if (kind.caster && n.size <= CASTER_MAX_SIZE) {
        // Drawn only by the ground shadow camera (SHADOW_LAYER). One draw
        // covers every variant (they're indistinguishable as flat shadows),
        // reading the chunk's instance rows directly: stride 8 = aI0 | aI1.
        const base = kind.geos[Math.min(kind.caster.lod, kind.geos.length / variants - 1)];
        const rows = new THREE.InstancedInterleavedBuffer(data, INST_STRIDE);
        const ig = new THREE.InstancedBufferGeometry();
        ig.index = base.index;
        ig.setAttribute('position', base.attributes.position);
        ig.setAttribute('aI0', new THREE.InterleavedBufferAttribute(rows, 4, 0));
        ig.setAttribute('aI1', new THREE.InterleavedBufferAttribute(rows, 4, 4));
        ig.instanceCount = count;
        ig.boundingSphere = casterSphere;
        const m = new THREE.Mesh(ig, kind.caster.material);
        m.name = `${kind.name}-caster`;
        m.userData.lod = 'caster';
        m.layers.set(SHADOW_LAYER);
        m.matrixAutoUpdate = false;
        g.add(m);
      }
      // Split into per-variant buckets.
      const buckets: number[][] = Array.from({ length: variants }, () => []);
      for (let i = 0; i < count; i++) {
        const v = variantOf ? variantOf(i) : 0;
        buckets[v].push(i);
      }
      buckets.forEach((ids, v) => {
        if (!ids.length) return;
        const perVariant = kind.geos.length / variants;
        const a0 = new Float32Array(ids.length * 4);
        const a1 = new Float32Array(ids.length * 4);
        ids.forEach((id, k) => {
          const o = id * INST_STRIDE;
          a0.set(data.subarray(o, o + 4), k * 4);
          a1.set(data.subarray(o + 4, o + 8), k * 4);
        });
        const i0 = new THREE.InstancedBufferAttribute(a0, 4);
        const i1 = new THREE.InstancedBufferAttribute(a1, 4);
        // Near nodes carry two LODs sharing the same instance buffers and
        // switch by camera distance every frame.
        const lods: [number, string][] = lod === 0 && perVariant > 1 ? [[0, 'near'], [1, 'mid']] : [[lod, '']];
        for (const [l, tag] of lods) {
          const base = kind.geos[Math.min(kind.geos.length - 1, v * perVariant + Math.min(l, perVariant - 1))];
          const ig = new THREE.InstancedBufferGeometry();
          ig.index = base.index;
          ig.setAttribute('position', base.attributes.position);
          ig.setAttribute('normal', base.attributes.normal);
          ig.setAttribute('aKind', base.attributes.aKind);
          ig.setAttribute('aI0', i0);
          ig.setAttribute('aI1', i1);
          ig.instanceCount = ids.length;
          ig.boundingSphere = sphere;
          const m = new THREE.Mesh(ig, kind.material);
          m.name = kind.name;
          m.userData.lod = tag;
          m.matrixAutoUpdate = false;
          g.add(m);
        }
        this.stats.instances += ids.length;
      });
    };
    addInstances(this.kinds.trees, r.trees, 2, (i) => (r.trees[i * INST_STRIDE + 7] < 0.5 ? 0 : 1));
    addInstances(this.kinds.bushes, r.bushes, 1);
    addInstances(this.kinds.rocks, r.rocks, 1);
    addInstances(this.kinds.tufts, r.tufts, 1);
    addInstances(this.kinds.flowers, r.flowers, 4, (i) => Math.round(r.flowers[i * INST_STRIDE + 6]));
    addInstances(this.kinds.cabins, r.cabins, 3, (i) => Math.round(r.cabins[i * INST_STRIDE + 6]) % 3);

    n.group = g;
    n.minY = r.minY;
    n.maxY = r.maxY;
    n.state = 'ready';
    (n as NodeEntry & { requested?: boolean }).requested = false;
    g.updateMatrixWorld(true);
  }

  private disposeNode(n: NodeEntry) {
    if (!n.group) return;
    n.group.removeFromParent();
    for (const c of n.group.children) {
      const geo = (c as THREE.Mesh).geometry;
      if (geo instanceof THREE.InstancedBufferGeometry && c.userData.lod !== 'caster') this.stats.instances -= geo.instanceCount;
      // Detach shared buffers first: dispose() frees every attribute the
      // geometry references, and prop meshes / the grid index are shared.
      geo.index = null;
      for (const k of ['aKind', 'normal']) if (geo instanceof THREE.InstancedBufferGeometry) geo.deleteAttribute(k);
      if (geo instanceof THREE.InstancedBufferGeometry || c.name === 'water') geo.deleteAttribute('position');
      geo.dispose();
    }
    n.group = null;
  }

  private evict() {
    if (this.nodes.size < 900 || this.frame % 30) return;
    const arr = [...this.nodes.values()].filter((n) => !this.visible.has(n) && !this.isQueuedOrInflight(n));
    arr.sort((a, b) => a.lastUsed - b.lastUsed);
    const drop = arr.slice(0, this.nodes.size - 700);
    for (const n of drop) {
      if (this.frame - n.lastUsed < 60) continue;
      this.disposeNode(n);
      this.nodes.delete(n.key);
    }
  }
}
