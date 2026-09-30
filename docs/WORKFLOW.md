# Working on Fjellheim

## The loop
The brief says: don't call it done until you've *looked* at it. Every visual
change goes through this loop:

1. Make the change.
2. `npm run shots` (or faster: `node scripts/shots.mjs --only vista-42-dawn,cabin-night`).
3. Tile the results and compare them side by side with `/inspo`:
   `cd shots && node ../scripts/sheet.mjs _sheet.png a.png b.png c.png d.png`
4. Be honest. Check whether it is still near-monochrome, whether the layers
   read as flat, whether the outlines are warm and thin, and whether anything
   looks muddy, faceted, striped or noisy.
5. For anything that touches geometry counts or passes, run perf:
   `node scripts/shots.mjs --no-build --only none --perf --uncapped`

### Scripts
- `scripts/shots.mjs`: builds, serves `dist/`, and drives headless Chromium on
  the real GPU (`--use-angle=metal` on macOS; change the flag on other
  platforms). It waits for terrain streaming to go idle before each capture.
  The shot list is at the top of the file.
  - Flags: `--no-build`, `--only a,b`, `--kinds` (per-prop triangle counts),
    `--perf` (6 s run, then 8 s fast flight), `--uncapped` (no vsync, for
    real frame cost).
- `scripts/probe.mjs "<url query>" "<js expression>" [out.png]`: loads the
  build, runs JS in the page, and optionally screenshots. Use it for
  debugging.
- `scripts/sheet.mjs out.png imgs...`: 2-column contact sheet.
- `scripts/mobs.mjs <dir> [floof,crow,crowface,inspect,lasso,ride,ridecrow,ambient,night]`:
  creature shots (runs with `mobs=0` and places its own flocks, except `ambient`, which looks at natural spawns). `inspect` is a
  turntable via `__ow.inspect(i, yawRel, pitch, dist, species)`, which
  freezes brains and hides the explorer. Remember the orbit camera faces the
  explorer, so in scripted walks S moves *away* from the camera.
- `scripts/pat.mjs <dir> [seed] [warmth] [camYaw]`: patting the home spirit,
  stepped frame by frame (camYaw 1.7 = patting side, 3.3 = from behind).
- `scripts/bike.mjs <dir> [parked,mount,ride,sprint,turn,hop,night,wild]`:
  bicycle shots. Scripted rides call `__ow.lockInput(yaw)`, because steering
  is camera-relative and re-aiming the camera for a side shot would turn the
  bike.
- Perf with extra URL params: `Q='&mobs=0' node scripts/shots.mjs --no-build --only none --perf --uncapped`.

### Page hooks (`window.__ow`)
- `ready()`, `stats()`, `setHour(h)`, `setPalette(name|null)`,
  `teleport(x,z)`, `view(yaw,pitch,dist)`, `setMode('walk'|'swim'|'fly', y?)`,
  `setSeed(s)`, `height(x,z)`, `gen()`.
- `lookAtPoi(kind, dist, side?, hover?)` frames a `cabin|circle|erratic|tower`.
- `lookAtBike(dist, side, pitch)`, `mountBike()`, `dismountBike()`,
  `lockInput(yaw|null)` for bicycles.
- `facePeak()` turns toward the tallest nearby ground.
- `goToTower(i)` stands you on the most open side of beacon tower `i` (0 =
  home), looking up at it. `gen().towers` is the whole network;
  `_towerDebug.settings.{links,map}` toggle the dev views (`?towers=1` turns
  both on).
- `beacons.debugSet('all'|'none'|id)` lights towers; `beacons.busy`,
  `beacons.onTop`, `beacons.isLit(id)`. `scripts/beacon.mjs` shoots tower
  faces, lit/unlit, night, the home tower, and `shots=unlock` (smash the
  lock, the spirit's sequence, walk in, the head view, exit).
  `beacons.debugEnter(id)` makes you tower `id`'s head, `beacons.debugLookAt(id)`
  turns the view; `journeyJump('gift'|'ride1'|...)` jumps phase 2 (also
  `?journey=<step>` with `story=1`). `manual(true)` + `advance(n, dt)` step
  frames by hand at a fixed dt (deterministic sequences; only the last frame
  draws). Scripts: `scripts/towerland.mjs` (drop onto towers from above,
  walk/glide/fly), `scripts/beacon.mjs shots=free|travel|unlock`,
  `scripts/journey.mjs` (the whole of phase 2), `scripts/tl.sh <secs> cmd`
  (a time limit; macOS has no `timeout`).
  `beacons.debugBreak()` breaks the nearest lock; `beacons.inside` is the
  tower you're the head of.
- `_r` / `_p` / `_scene` / `_terrain` / `_cam` expose internals for probes.
  For example, read G-buffer pixels with `_r.readRenderTargetPixels(_p.gbuf, ...)`.

### URL params
`seed t x z yaw pitch dist mode=fly y paused=1 palette=<rose|golden|olive|coral|twilight|night> ui=0 capture=1 shadows=0 towers=1 lit=all beacons=0`
(`capture` disables adaptive resolution and the loading veil so shots are
deterministic).

## Debugging approach that worked
When a frame looks wrong, bisect in the page rather than guessing:
- Toggle post features via `__ow.post` (fxaa, outline, fogDensity,
  fogHeight, layeredFog).
- Hide mesh kinds by name in `_terrain.root` (ground, water, trees, bushes,
  rocks, tufts, flowers, cabins).
- Read the G-buffer at a pixel to get depth and normal.
- Compare mesh vertex heights with `gen.height()`.

## Gotchas already paid for
- **Colour management:** `THREE.ColorManagement.enabled = false` must run
  before any module builds a `THREE.Color`. Hence `core/colorSetup.ts` is
  imported first. Otherwise everything renders too dark.
- **Fullscreen triangle needs `uv`:** three's FXAA shader reads it. Without
  it you get a solid-colour frame.
- **Chunk bounds:** ground `boundingBox` / `boundingSphere` are set by hand
  from `minY`/`maxY`. An inverted box culls the chunk, so ground vanishes and
  props float.
- **Shared buffers:** chunk meshes share the grid index and prop geometry
  attributes. `disposeNode` detaches them before `dispose()`; otherwise other
  chunks' VAOs point at deleted buffers.
- **Fog must not be contoured by world height.** Banded height fog cuts
  wedges across unrelated objects. Valley mist is a single flat bank instead.
- **Per-pixel fog bands stripe mountains.** The layer pass (`LAYER_FRAG` in
  `post.ts`) scans up to each layer's ridge. It skips props (half-length
  normals) and flat, upward-facing pixels, or it streaks.
- **Far coarse triangles show** through slope colouring and band edges.
  Terrain beyond ~350 m flattens its lighting and fades rock-by-slope.
- **LOD seams become outlines.** Odd edge vertices are stitched to the
  coarser neighbour in `chunkBuilder.ts`. Keep that if you change `CHUNK_RES`.
- **Seabed push** (anti z-fighting) is distance-based. Pushing near geometry
  makes sawtooth shores.
- **Framing shots:** random spawns land in forests. Use `lookAtPoi` and
  `facePeak`, and prefer open ground when choosing positions.
- **Scripted edits:** a Python `s[s.index(a):s.index(b)]` slice came back
  empty once, and `replace('', x)` destroyed `main.ts`. Commit before bulk
  edits and prefer targeted edits.

## Performance budget (measured on an M1 Pro, 1600×900)
- Uncapped: ~4 ms average, p99 ~7 ms.
- Visible load: 2.5–6 M tris and 380–580 draw calls.
- Target mid-range iGPUs are ~3–4× slower. Adaptive quality in `main.ts`
  sheds resolution first, then terrain and prop detail.
- Biggest costs: conifer triangles (see the `--kinds` output) and draw calls
  (per node × prop type).
- Not yet verified on real Intel/AMD integrated hardware.

## Where to pick up
See the "What I'd do next" list at the end of `NOTES.md`. The top candidates:
chimney smoke and birds, rounded deciduous trees (inspo/6), inked line
wobble and shade hatching, near-camera cast shadows, colliders, then
boat/glider modes.
