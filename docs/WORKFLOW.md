# Working on Embla

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
- `scripts/giant.mjs <dir> [skyline,walk,gait,close,prints]`: the giant at three
  distances and four times of day, walking across the view, walking from the
  side, close up, and (`prints`) the footprints it leaves walking off from
  the cabin. It shoots from just over the treetops on open ground.
  `__ow.trail.prints.list` is every print so far.
- `scripts/mill.mjs <dir>`: the village milling about (one in at its door and
  out again, two talking in the lane, then the lane left to itself with what
  each is doing printed). It drives `Village`'s private `go` / `meet`.
- `scripts/rebuild.mjs <dir> [seed=..] [t=..]`: a house being built again,
  steps 0 to 5 of each of the three huts, from the lane and from above, and
  `sheet.png` with all of them; prints what's underfoot at each step.
- `scripts/village.mjs <dir> [seed=..] [survey]`: the village lane from above,
  from the yard and from its far end (day, dusk, night), each kind of house
  at eye level, and a footprint on a house for scale. `survey` lists which
  of forty seeds get a lane. `__ow.village()` is it (null if none fits).
- `scripts/visit.mjs <dir> [seed=..] [t=16.6] [after]`: the giant's visit,
  frame-stepped, a shot every 1.5 s; `after` adds the wrecked lane and a
  reloaded save; `tower` runs it the real way (from the home tower's head);
  `trail` fast-forwards the walk to the ring and shoots it.
  `__ow.visit().start()` runs it from anywhere in the story;
  `__ow.visit().restore()` jumps to after it (prints, wreckage, giant asleep, ring open).
- `scripts/dungeon.mjs <dir> [seed=..] [inside,take,leave,quest,perf]`: dungeon 1.
  `inside` is stills round the cave as you'd find it (and four with every
  lantern awake); `take` walks on to the opened ring and steps through the
  pull and the arrival; `leave` the lift and the emerge; `quest` **plays the
  whole thing by the keys** from the well (the wrong way and failing the
  ledge on foot, the long way, a fall into the pit and back up the tunnel,
  the stepping stones, the rockfall, the ride off the balcony, the bound,
  the light, and then above ground the ring shutting and the whole
  offering), prints ok/FAIL per step and the game time it took, and exits
  1 on a failure; `perf` (add `uncapped`) is frame cost in six places, dark
  and with every lantern lit, and the build hitch. Needs `npx vite build`
  first. It injects `window.__bot` (walk to a place, hop a stone, stand
  somewhere): places are `layout.at`'s names.
- `scripts/water.mjs [km=12] [step=40] [png=out.png] [seed ...]`: how much
  of each seed's world is water (a square round the start site: water, shore
  flats, how much of the land near the start you can reach dry, lakes, forest),
  and with `png=` a map of each. Runs `worldgen.ts` in node, no build, about
  3 s a seed. Run it before and after anything that touches `baseHeight`.
- `scripts/cabin-clear.mjs <seed> ...`: how near the giant's prints come to
  your cabin (fails under `KEEP`, 10 m; 4 m for the print on a house).
- `scripts/sites.mjs [map.png] <seed> ...`: the dungeon sites per seed
  (where, how far, the way's length, how long each search took), a
  fingerprint of the first site and of the visit's footfalls (neither may
  change when a later site is added: compare before and after), and the
  walk on to the second ring (a footfall on a ring or a tower fails it;
  `wades` counts those in water, which only a fallback site should have;
  each site says `fallback: true` if no route reached it and its way is the
  straight line, and `wetPts`, its way's points in water).
  With a `.png` it draws each seed from above: ways, footfalls, rings.
- `scripts/rise.mjs <dir> [seed=..] [dist=210] [face=1.2]`: the giant getting
  up and lying down again, close to, from the air (the explorer hidden).
- `scripts/offering.mjs <dir> home [seed=..] [sandbox] [walk=0]`: slice C,
  from the smile on: a shot a second through the crow leaving, the
  village and the giant getting up, then from the saddle, then a reload at
  every step. **Under the veil the land is built by workers, which need
  real time:** the script's `step` gives it to them while
  `__ow.homecoming().waiting`; a bare `advance(n)` across the cut times
  out the veil (20 s of game time) and shows unbuilt land. `sandbox` walks
  the giant all the way to the second ring (about two minutes of game
  time).
- `scripts/offering.mjs <dir> [seed=..] [t=22.5] [every=1] [sandbox] [play,reload,views]`:
  the offering (dungeon 1, slice B), in the story from `?cp=ring` as if the
  light had just been taken. It is a cutscene, so `play` only holds W from
  coming up to the end (nothing may move you) and shoots every `every`
  seconds; `reload` reloads with the light held, in
  the bowl and given; `views` is the giant asleep beforehand and what you
  see from the saddle after. Prints ok/FAIL, exits 1 on a failure.
  **Look at the frames**: tile them with `sheet.mjs`. `?fresh=1&cp=offer`
  starts there by hand; `__ow.offering()` (`.state`, `.clock`, `.cues`,
  `.debug('held'|'placed'|'given')`), `__ow.winDungeon()`.
- Stone hands about the world: `__ow.hands().list` (found so far),
  `__ow.hands().survey(x, z, cells)` (look further at once; returns them).
- `scripts/chute-hint.mjs <dir> [seed=..] [touch]`: the thought on dungeon
  1's high stone (its four frames, the reminder in the air, gone once the
  parachute is open); `touch` as a phone has it, jump button included.
- `scripts/dungeon-plan.mjs <out.png> [seed=..]`: the plan from above (floor
  height, lanterns, stones, named places) and a flood fill of what you can
  reach on foot, past the stones, with the rockfall open, and mounted; the
  walkable area; the stepping stones' gaps; hard edges in the wrong place.
  Run it after any change to `layout.ts`, on a few seeds.
- `scripts/dungeon-cam.mjs [seed=..] [sprint] [yaw=0.9] [from:to ...]`: rides
  the rockhopper along legs of the plan and prints how steady the camera
  was (jumps in its distance, reversals, height jitter).
  `__ow.enterDungeon()` is the ring taking you, `enterDungeon(x, z)` stands
  you at a point of the cave's plan, `leaveDungeon()` brings you up,
  `dungeon()` is it (`.goTo('lip')`, `.debugFree()`, `.debugLight()`,
  `.buildMs`, `.layout.at`), `goToRing()` stands you by the ring,
  `mode()` / `riding()` say how you're getting about.
- `scripts/sendoff.mjs <dir> [seed=..]`: the guide walking you to the edge
  of the village and pointing down the trail (`?cp=ranch`): close shots of
  its face and the bubble, then leaving, coming back, and finding the ring.
- `scripts/trudge.mjs <dir> [seed=..]`: the guide after the giant: its walk
  home from the tower (close up), keeping to itself in the village, and the
  stable beginning only once the minutes have passed and you're there. It
  prints the stage as it goes. `?cp=trudge` / `?cp=grieve` start there.
- `scripts/perf-audit.mjs [--counts] [--only a,b] [--quick] [--dist dir] [--json f]`:
  where the frame goes, standing still at nine places: draws and triangles
  by pass and kind, then the frame with one thing off at a time. `--counts`
  skips the timings (which need a quiet GPU). Its timed frames are stepped
  by hand and waited for, so read differences, not totals.
- `scripts/perf-profile.mjs <dir> "<query>" [secs]`: main-thread self time
  by function; wants an unminified build (`vite build --minify false --outDir <dir>`).
- `shots.mjs --dist <dir>` serves a build other than `dist/`.
- `scripts/treelod.mjs <outDir> [--dist dist] [stills,edge,motion] [edge=<edge.json>] [q=&lod3=0]`:
  distant trees. `stills` and `edge` (a forest edge from 300 m, 600 m,
  1.2 km) shoot each view twice from one frozen frame, as built and with the
  far trees (lod 3) drawn as lod 2 (`<name>-lod2.png`); `motion` walks,
  sprints and flies at the edge and away, stepped by hand, and prints which
  tree LODs are drawn at each frame. Two page loads of one view differ by
  more than a LOD change does (clouds, wind, creatures), so compare the pair
  from one frame: `scripts/imgdiff.mjs a.png b.png [out.png] [x,y,w,h]`
  counts the pixels that changed and writes a / b / difference x8.
  `?lod3=0` turns the far shape off, `?lod3=512` starts it a node size later.
- `scripts/dungeon.mjs` and `scripts/offering.mjs` serve `$DIST` if set
  (`DIST=dist-lod node scripts/dungeon.mjs ...`), so a session can test its
  own build folder. So do `sites.mjs`, `dungeon-plan.mjs`, `veil.mjs` and
  `veil-plan.mjs`. **Do this whenever another session may be working:**
  they share this checkout and rebuild `dist/` under you (`npx vite build
  --outDir dist-mine`).
- `scripts/veil-plan.mjs <out.png> [seed=..]`: dungeon 2's plan (the Veil
  Cave) from above, and proof that it holds: on foot (veils are walls) every
  cell of the ring is reachable and the three middle cells, the light and
  the way out are not; riding (veils open) everything is; no dash from
  anywhere crosses two veils; a dash made square at a veil ends in open
  floor. Prints the loop's length and exits 1 on a failure. Run it after
  any change to `veilPlan.ts`, on a few seeds (the seed mirrors the plan).
- `scripts/veil.mjs <dir> [seed=..] [inside,quest,dash,stall,reload,story,arrive,perf]`:
  dungeon 2. `inside` is stills round the cave; `quest` **plays it through
  by the keys** from the second ring (taken down; her three hides; a veil
  tried on foot; Space at rock; the four veils of the ride; the last veil
  and the light; the way out; the ending above), ok/FAIL per step; `dash`
  draws every third frame of two dashes (one with the camera swung to one
  side) and prints the camera's distance per frame and whether a veil ever
  hid you: **look at the `dash-*` frames**; `stall` stands still and goes
  the wrong way at each round; `reload` reloads at five stages; `story` is
  the two checkpoints in the story (a second spirit home); `home2` (add
  `sandbox` for outside the story) plays what follows the second smile, a
  frame a second (`h2-*`: look at them), walks the giant to the third ring
  and reloads (`scripts/moth.mjs <dir> home3` is the same after the third:
  `h3-*`, to the fourth ring); `arrive` walks
  the giant to the second ring the real way and sees it open; `perf` (add
  `uncapped`) is frame cost in seven places. Its bot is `window.__bot`
  (`walk('E3')` goes round the ring by the gaps, `dash('E3', 'P')` rides at
  a veil and presses Space, `mount()`). `__ow.cave()` is the cave (`.round`,
  `.play`, `.she`, `.debugRound(n)`, `.debugYours()`, `.goTo(name)`,
  `.debug`), `__ow.enterCave()`, `leaveCave()`, `winDungeon(2)`,
  `firstDone()` (dungeon 1 behind you, as a save has it), `goToRing(1)`.
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
Story and life: `story=0|1` (it's off by default when `t`, `x` or
`mode=fly` is set), `fresh=1` (forget saves), `journey=<stage>`,
`stable=<step>`, `cp=<id>` (with `fresh=1`: any checkpoint in `ui/checkpoints.ts`; the \` key shows a strip to step through them), `debug=1` (keep the panel during the story), `mobs=<density>`,
`bikes=0`, `eyes=round`,
`giant=<metres>[,walk]` (stand the giant in view, or walk it across),
`dungeon=1` or `dungeon=<x>,<z>` (start inside dungeon 1, at a point of its plan),
`dungeon=2` or `dungeon=2,<x>,<z>` (inside dungeon 2, the Veil Cave; dungeon 1 is made done first),
`ride=<species>` (on a tame one of its kind where you stand).

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
- **A camera that goes somewhere you aren't** (the homecoming's cut to the
  village): the terrain streams by the camera, so it loads; but anything
  the story keeps by *your* position doesn't, and the ground the story
  knows (`gen.height`) is not the ground you see where the giant has trodden
  (`trail.height`). The first village camera sat in a footprint looking at
  its wall. Check the sightline against the ground.
- **Two sets of the giant's prints along one line eat each other**
  (`world/prints.ts` keeps one print per 12 m cell). Where its way on runs
  back along its way in, it treads in its own prints (`onwardRoute`).
- **Scripted edits:** a Python `s[s.index(a):s.index(b)]` slice came back
  empty once, and `replace('', x)` destroyed `main.ts`. Commit before bulk
  edits and prefer targeted edits.

## Performance budget (measured on an M1 Pro, 1600×900)
- Uncapped default run (2026-10-02, about 20% water, with the far tree
  shape): 4.2 ms average, p99 7.8 (5.6 and 9 before that shape), **on a
  quiet machine**. Anything else using the GPU (a game tab, another
  session's headless browser) doubles it or worse: ask for a quiet window
  before timing, and check a still frame at the hilda start reads about
  6 ms (before the far shape; not re-read since).
- Visible load: 3.5–8.2 M tris and 640–890 draw calls at the audit's nine
  places (`shots/perf/counts-after.txt`).
- Target mid-range iGPUs are ~3–4× slower. Adaptive quality in `main.ts`
  sheds resolution first, then terrain and prop detail.
- Biggest costs: conifer vertices (lod 1, in 128 m nodes and the mid trees
  of 64 m nodes, is now the bulk; past about 490 m trees are lod 3, 74
  triangles). Draw calls and the post passes are small beside them. See
  "Perf audit" and "A far shape for distant trees" in `NOTES.md`.
- Not yet verified on real Intel/AMD integrated hardware.

## Where to pick up
The direction changed on 2026-09-30: see "The giant" in `DESIGN.md` and the
last entry of `NOTES.md` ("Direction change: the giant"), which ends with the
recommended first slice. Settle DESIGN.md's "Conflicts to settle" with the
owner before building on any of them.

Still-open look ideas from the original list: rounded deciduous trees
(inspo/6), inked line wobble and shade hatching. (Chimney smoke, crows,
ground cast shadows, colliders and the parachute are done.)
