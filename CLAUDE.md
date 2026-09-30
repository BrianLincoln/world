# CLAUDE.md

A procedurally generated, browser-playable Nordic sandbox in the flat-shaded
storybook style of *Hilda*. **Visual quality is the top priority, above feature
count.** Keep this file lean. Depth lives in:

- `DESIGN.md`: our shared design doc (pillars, decisions, player sequence).
  Keep it current when a design decision changes; it's not a build log.
  Never build anything from its Parking Lot unless asked.
- `docs/BRIEF.md`: the original request, verbatim, plus how to read `/inspo`.
  Read it before any visual change.
- `NOTES.md`: stack reasoning, architecture, every major decision, known
  issues and the "what I'd do next" list. Append to it when you make a
  decision.
- `docs/WORKFLOW.md`: how to verify with screenshots and perf, plus the
  gotchas that have already bitten.

## Stack
Three.js (hand-written GLSL3 `ShaderMaterial`s, no built-in lighting) +
TypeScript + Vite; chunk generation runs in Web Workers; static build (`base:
'./'`). No backend. lil-gui for the debug panel. Playwright for screenshots.

```bash
npm run dev      # play
npm run shots    # build + headless GPU screenshots -> shots/   (look at them!)
```

## Non-negotiables (from the brief)
- Deterministic from the seed. The world is a pure function of `(seed, x, z)`
  in `src/world/worldgen.ts`, and must stay identical between worker and main
  thread. Use `core/rng.ts` hashes and never `Math.random()` in world gen.
- 60 fps on mid-range integrated graphics. Check tris and draw calls in the
  HUD and run the perf script after anything heavy.
- 2–3 hard toon bands, smooth normals, warm (never black) outlines that fade
  with distance, palette-only colour (no textures), stepped flat fog layers,
  a banded sky, flat-bottomed clouds, and a blue night with glowing windows.
- New locomotion (boat, glider) goes in as a `MovementMode` in
  `src/player/movement.ts`. The camera and rig stay independent of it.

## Where things are
- `src/world/`: `worldgen.ts` (height, biomes incl. bog/glimmerwood/hollows, POIs, paths),
  `chunkBuilder.ts` (worker: grid, normals, scatter), `terrain.ts`
  (quadtree streaming, LOD, instancing), `towers.ts` (the beacon-tower
  network, grown from the home tower so it always connects), `storySite.ts`
  (the guaranteed start area).
- `src/gfx/`: `shaders.ts` (all scene GLSL), `materials.ts` (shared
  uniforms), `palette.ts` (time-of-day keyframes and biome colours),
  `environment.ts` (day/night), `groundShadow.ts` (prop shadows on the ground), `post.ts` (G-buffer → bloom → layer fog →
  outlines/grade → FXAA), `geometry.ts` (trees, rocks, cabins), `sky.ts`.
- `src/player/`: input → movement modes → character rig; `orbitCamera.ts`.
- `src/mobs/`: creatures. `manager.ts` (spawning, lasso, leads, shadows),
  `floof.ts`, `crow.ts`, `stelk.ts` (geometry + brain + animation per species),
  `beast.ts` (shared brain/body for the ten wilder kinds in `beasts.ts`;
  their ride traits are `MountTrait` in `movement.ts`),
  `parts.ts` (instanced part batches, fur), `rope.ts`.
- `src/vehicles/`: bicycles. `bicycle.ts` (geometry, instanced parts,
  skeleton), `bikes.ts` (seeded placement, parking, riding presentation,
  rider IK targets). Movement is `BikeMode`.
- `src/story/beacons.ts`: beacon towers at runtime (drawing, the lock,
  freeing the tower spirit = lighting, being slurped in via `CarriedMode`,
  the head view, the tower camera's aim and ember flight, save).
  `towerRock.ts`: tower rock as exact solid shapes (collision, camera,
  arms). `towerView.ts`: the tower camera's overlay (silhouettes, eyes).
  `journey.ts`: phase 2 (bike gift, guided rides, the first two towers).
- `src/ui/debug.ts`: the panel and HUD. `towerDebug.ts`: tower sight lines
  (L) and network map (M), only while the panel shows (H).

## Critical gotchas (details in docs/WORKFLOW.md)
- `import './core/colorSetup'` must stay the **first** import in `main.ts`.
  Palette hex values are display colours.
- Every scene shader must call `writeG()` (MRT: colour+emissive,
  normal+depth). Props set `uIsProp=1`, which halves normal length. Negative
  colour alpha means a partial opt-out from the monochrome grade.
- Chunk bounding volumes are hand-set. If they're wrong, whole chunks
  silently vanish.
- Never dispose shared prop or index buffers when a chunk is evicted (see
  `disposeNode`).
