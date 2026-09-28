/// <reference lib="webworker" />
import { buildChunk, type ChunkRequest } from './chunkBuilder';
import { WorldGen } from './worldgen';

let gen: WorldGen | null = null;

self.onmessage = (e: MessageEvent<ChunkRequest>) => {
  const req = e.data;
  if (!gen || gen.seed !== req.seed) gen = new WorldGen(req.seed);
  const r = buildChunk(gen, req);
  const transfer = [r.positions, r.normals, r.biome, r.trees, r.bushes, r.rocks, r.tufts, r.flowers, r.cabins].map((a) => a.buffer);
  (self as unknown as Worker).postMessage(r, transfer);
};
