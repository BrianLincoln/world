# Embla — notes

> Decision log. The original brief is in `docs/BRIEF.md`; the working loop and gotchas are in `docs/WORKFLOW.md`; agent entry point is `CLAUDE.md`. The shared design doc (pillars, decided features, player sequence, open questions, parking lot) is `DESIGN.md`.

A browser-playable, procedurally generated Nordic sandbox in the flat-shaded
storybook style of the `/inspo` references (Hilda backgrounds). No goals; the
point is wandering somewhere beautiful.

## Running it

```bash
npm install
npm run dev            # http://localhost:5173
npm run build          # static site in dist/ (relative paths, host anywhere)
npm run shots          # build + headless screenshots into shots/
node scripts/shots.mjs --no-build --only none --perf --uncapped   # frame-time run
```

Controls: WASD move · Shift run · Space jump · click (pointer lock) or drag to
look · wheel zoom · R / right-click lasso or lead · E ride · F fly · T +1 hour ·
H hide UI. Useful URL params (`mobs=0` = no wild creatures):
`?seed=fjord&t=18.3&mode=fly&y=120&pitch=0.2&dist=30&yaw=1.2&ui=0&palette=night`.

## Stack and why

**Three.js + TypeScript + Vite, custom GLSL, Web Workers.** Static files, no install.

- **Three.js over Babylon/PlayCanvas/raw WebGL.** Small and mature, easy to
  bypass: every material here is a hand-written `ShaderMaterial`, and the post
  pipeline is hand-rolled on WebGL2 MRT. I wanted full control of the look
  without writing a renderer from scratch.
- **WebGL2, not WebGPU.** WebGPU isn't universal on mid-range laptops yet
  (Linux, older Intel drivers). WebGL2 gives MRT, half-float targets and
  instancing, which is everything this look needs.
- **Vite** builds with `base: './'`, so `dist/` works from any static host or
  sub-path. Workers are bundled as ES module workers.
- **Workers for world generation.** Chunk meshes and scatter are built off the
  main thread and handed over as transferable typed arrays, so streaming never
  hitches the frame.
- **Determinism.** A seeded simplex (`core/noise.ts`) plus integer hashes
  (`core/rng.ts`). The world is a pure function of `(seed, x, z)` in plain JS,
  so the worker (meshes) and main thread (player grounding) agree exactly.
  Seeds can be words (`?seed=fjord`).

## Architecture

```
core/        rng, seeded simplex noise, colour-management switch
world/       worldgen.ts (height, biomes, POIs, paths: pure functions)
             chunkBuilder.ts (runs in worker: grid, normals, scatter)
             terrain.ts (quadtree streaming, worker pool, meshes, LOD)
gfx/         shaders.ts, materials.ts (shared uniforms), palette.ts,
             environment.ts (day/night), sky.ts, post.ts, geometry.ts
player/      input.ts → movement.ts (mode state machine) → character.ts
             orbitCamera.ts (independent of movement)
ui/          lil-gui debug panel + FPS/HUD
scripts/     shots.mjs (screenshots + perf), probe.mjs, sheet.mjs
```

### Terrain streaming and LOD
- Camera-centred **quadtree** over 8 km root tiles (3×3 around the camera).
  Every node is the same 32×32 grid, so a far node is simply huge and coarse.
  Distant terrain is silhouettes by construction.
- Nodes split when `distance < size × splitFactor` (1.9). Typically ~350
  nodes and ~400–550 draw calls are visible.
- **No holes:** a node is only swapped in once it (or all four children) is
  built. Coarse nodes are requested first, then nearest.
- **Seams:** odd edge vertices are forced to the midpoint of their neighbours,
  so every edge matches a neighbour one level coarser. Short skirts cover the
  rest. This matters doubly here, because any crack becomes an *outline*.
- **Water** reuses each chunk's grid and position buffer. The shader flattens
  it to sea level and reads `-y` as depth for hard-edged shallows and a foam
  line. There's no depth-texture read and no extra geometry data.
- Props are instanced per node (8 floats per instance). Near nodes carry both
  a high and a mid LOD that share instance buffers and switch by distance
  every frame.

### Placement by rules, not uniform noise
- **Groves:** a low-frequency forest field with a steep threshold gives
  clustered woods with hard edges. A second octave carves clearings inside
  them. Rare lone trees stand in meadows. There are no trees above the
  treeline or on beaches and steep slopes.
- **Bushes** gather along grove *edges* (`fd·(1−fd)`). **Boulders** follow a
  rock field plus altitude.
- **Cabins:** on flat ground, off the shore, not in deep forest. They
  flatten a pad into the height field and clear a ring of trees. 30% get a
  neighbour (a hamlet).
- **Landmarks:** stone circles on open meadow and lone glacial erratics.
  (Tors, smaller stacked-boulder cairns, were removed; see below.)
- **Paths** join each cabin to its two nearest cabins or landmarks. They
  meander, avoid water and high moor, and are traced canonically so A→B and
  B→A are identical. Trees avoid them.
- **Peaks:** one optional dominant peak per 2.3 km cell (230–590 m), plus
  rounded highland massifs, give "a few dominant peaks" rather than noise
  everywhere.
- **Fjords/lakes:** a warped `|fbm|` valley network, masked regionally and
  carved with a U-profile `k = (1−t²)²` (flat floor, smooth rim). It makes
  fjords in the highlands and lakes and rivers in the lowlands.

### Look (the important part)
- **G-buffer:** every scene shader writes colour + emissive and view-normal +
  linear depth (MRT, half float). Props store half-length normals as a
  "this is a prop" tag.
- **Toon shading:** three hard bands (`light/mid/shade`). The band colours
  come from the palette (the shade is a warm purple by day and blue at night),
  never a plain darkening. Normals are smooth. Tree tiers and bushes blend
  their normals toward a sphere around the form, so each tier reads as one
  puffy shape with a lit top and a shaded underside, not facets.
- **Outlines** (post): the Laplacian of *inverse* depth. It's zero on planes
  even at grazing angles, so no false lines on flat ground. It's positive only
  on the nearer side of a silhouette, so lines hug the front object. Normal
  creases are added near the camera. Lines use the palette's outline colour
  (deep plum/brown, navy at night, never black), fade out by ~2.6 km, and are
  fogged like the surface. That makes distant lines a darker shade of their
  layer, as in inspo/1.
- **Palette/grade:** colours are palettes, not textures. Each time-of-day
  keyframe (rose dawn → golden → olive noon → golden → coral dusk → twilight
  → blue night) is modelled on one reference. The post grade keeps luminance
  and swaps chroma toward the keyframe's tint (0.4–0.86), so each scene sits
  in one hue family. A `lift` wash toward the fog colour gives the
  high-key, low-contrast dawn of inspo/1. Accents opt out partly through
  negative alpha in the G-buffer: the explorer, the falu-red cabins (the red
  house in inspo/3), water and snow caps.
- **Stepped atmospheric depth:** fog is exponential, then *quantised into 5
  bands* and capped at 0.9, so distance reads as flat layers. Naive
  per-pixel bands cut diagonal stripes across a single mountain. So a
  **layer pass** (quarter resolution) walks up the screen from each
  viewer-facing terrain pixel to its silhouette ridge (the first depth jump),
  and the whole layer takes the ridge's fog. Each hill or range becomes one
  flat tone, like painted background cards. Props don't define layers, and
  flat ground and water keep their own depth. Fog also thins with altitude so
  snow caps stay legible, and a flat valley-mist bank with a hard top edge
  lies over distant lowlands.
- **Far terrain simplification:** beyond ~350 m, lighting bands blend to one
  tone and slope-based rock colouring fades out. Coarse far triangles never
  show, and far ranges become silhouettes with height bands (moor, snow).
- **Terrain colour** is a per-fragment rule stack with hard boundaries:
  meadow / darker meadow patches / forest floor / moor above ~105 m / rock
  on slopes / sand at the shore / path / snow above a wavy snow line. Noise
  only wobbles the boundaries.
- **Sky:** quantised elevation bands, a flat sun disc with two hard glow
  rings, a crescent moon and hashed stars. **Clouds** are camera-dome
  billboards drawn by an SDF of puffs cut by a flat bottom, with a rim line
  and an in-shader outline.
- **Night:** a blue palette, windows switch to warm yellow with emissive in the
  G-buffer, feeding a half-res two-pass bloom.
- **Storybook marks:** short curved ground strokes (two jittered, rotated
  lattices so no grid shows), thin ink-like grass tufts, and stemmed wildflowers in
  flower patches. Conifers are 5–6 drooping, scalloped tiers with a baked
  S-offset plus per-instance lean, bend and wind sway.

### Player, movement, camera
- `MovementController` is a small state machine of `MovementMode`s (`walk`,
  `swim`, `fly`). Each mode gets an abstract `InputState` (not keys), the
  camera yaw/pitch and a `WorldQuery` (`groundHeight`, `waterLevel`), and
  returns a transition request. Boating or gliding means implementing
  `MovementMode` and registering it. The camera, rig and input don't change.
- Walk → swim happens automatically in water deeper than ~1.1 m. Fly is on F
  (a debug mode, and the basis for a later glider).
- `OrbitCamera` only needs a focus point: 36° vertical FOV (narrow, flattened
  storybook perspective), smoothing and terrain/water clamping. Trees that
  stand between the camera and the explorer are removed whole in the vertex
  shader, rather than sliced open.
- Looking up: pitch goes down to -1.4, but the orbit itself stops at -0.22
  (going lower only buried the camera in the floor clamp). Past that the view
  tilts upward from a low camera that eases about 30% closer, so you can look
  at the sky and lasso flyers. Lasso picking already follows the camera's
  real view direction, and fly mode's `camPitch` steering keeps the raw pitch.
- The explorer is a placeholder (red knit hat, blue coat, satchel) with
  procedural walk, run, swim and fly poses and a flat contact shadow painted
  into the terrain shader.

### Debug panel
lil-gui with sections for seed (text, regenerate, random), time of day (hour,
minutes per day, pause, palette override), palette (mono-grade strength, band
thresholds, biome colours), fog (density, bands, per-layer toggle, mist,
max, start), outline (on/off, width, depth and crease sensitivity, fade), and
render (bloom, resolution scale, adaptive toggle, FXAA, terrain detail,
props/ground toggles, ground strokes). The HUD shows FPS, average and worst
ms, resolution %, triangles, draw calls, nodes, queue, position and mode.

## Verification (what I actually did)

`scripts/shots.mjs` builds the site, serves `dist/`, and drives headless
Chromium on the real GPU (ANGLE/Metal, M1 Pro). It waits until streaming is
idle before each capture. The standard set is 21 views: several positions
(ground, lakeshore, aerials, vistas framed toward the highest peak, cabins,
tor, stone circle, erratic), several times (07:00 rose, 09–12 golden/olive,
16–17 golden, 18:30 coral, 22–23 night) and three seeds (`hilda`, `fjord`,
`42`). `scripts/sheet.mjs` tiles them into contact sheets. I compared them
against `/inspo` after every change.

Bugs found only by looking at screenshots:
- Colour constants were created before `ColorManagement` was disabled, so
  everything came out too dark.
- FXAA needed a `uv` attribute, and its absence produced a solid-colour
  frame.
- An inverted chunk bounding box culled every elevated chunk. The player
  floated over a lake and the skirts appeared as "ribbons".
- Banded height-fog contours cut wedges across unrelated objects. That was
  replaced by a flat mist bank.
- Per-pixel fog bands striped mountain faces. That led to the layer pass.
- Tree-interrupted and flat-ground scans streaked. Fixed with prop tags and
  the viewer-facing test.
- Seabed doubling made sawtooth shores. It's now distance-based.
- Coarse triangles showed on far slopes. Fixed with far simplification.

**Performance** (1600×900, headless GPU run: 6 s running, then 8 s flying fast):
- vsync on: avg 16.7 ms, p99 18.9 ms (locked 60 fps).
- Uncapped: avg 4.1 ms, p95 6.1 ms, p99 7.3 ms. That's ~4× headroom on an
  M1 Pro. A mid-range Iris Xe/Radeon iGPU is roughly 3–4× slower, which is
  why there are two safeguards:
  - The default pixel ratio is capped at 1.5.
  - Adaptive quality: when frames run long it sheds resolution first
    (down to 70%), then terrain and prop detail (split factor and near-LOD
    distance), then more resolution.
    (Desktop stops at 85% since 2026-10-06; see the end of this file.)
- Chunk builds take 3–5 ms each in the workers.
- Visible load: ~2.5–6 M triangles and 380–580 draw calls, depending on
  how much forest is in view.

I have **not** measured on actual Intel/AMD integrated hardware; the numbers
above are extrapolated. The adaptive controller exists precisely because of
that uncertainty.

## Tradeoffs / known issues
- **Post-process fog, not per-material.** It's consistent for surfaces and
  lines, and the layer pass needs screen-space depth anyway. The cost is a
  quarter-res scan (≤64 taps). The layer heuristic can still misassign a few
  pixels at silhouettes; a nearest-matching-depth fallback hides most of it.
- **Stepped fog on open water** still shows as wide concentric arcs from
  high altitude. Flat water can't be layered by ridges. It's acceptable at
  eye level.
- **Cast shadows fall on the ground only.** Trees, bushes, rocks and cabins
  shadow the terrain near the camera (see "Ground cast shadows" below). Props,
  creatures and the explorer don't receive them, and creatures and the
  explorer don't cast them (they have contact shadows).
- **No collisions** with trees, rocks or cabins (you walk through them). Trees
  between the camera and the player are culled.
- Draw calls (~500) are per node × prop type. Fine on desktop GPUs; merging
  into per-type global instance buffers or `BatchedMesh` would cut them.
- The seabed is pushed down with distance to avoid far z-fighting with a
  24-bit depth buffer. Reversed-Z would be the principled fix.
- Snow can follow ridge lines down a face as pale streaks at mid-distance.
  It's plausible, but less "cap-like" than the references.
- Cabins are one design with three variants and simple box geometry.
- Headless screenshots use a 1:1 pixel ratio; on a Retina screen the lines
  are a little finer.

## What I'd do next
1. **Chimney smoke and birds:** two cheap billboard systems that would add
   a lot of life to the cabins and skies.
2. **Deciduous/rounded trees** (the big blob canopies of inspo/6) as a second
   forest type in lowland valleys. Also birch groves.
3. **Hand-drawn texture:** subtle hatching in the shade band and wobbling
   outline widths (a noise-modulated sample offset) so lines feel inked.
4. ~~Cast shadows near the camera~~: done as a ground-only mask (below).
   Next steps there: the explorer and creatures as casters, and props
   receiving (a real depth map would be needed for that).
5. **Colliders:** trunk cylinders and cabin boxes from the scatter data
   already in the workers.
6. **Boat and glider modes** on the existing movement interface. `WorldQuery`
   already exposes `waterLevel`, and fly mode is the glider's skeleton.
7. **Merge instancing** into global per-type buffers with GPU culling to
   cut draw calls to ~50. Add a real "Low" quality preset for weak iGPUs.
8. **Seasonal palettes** (autumn birch gold, winter snow-line drop) on the
   same keyframe system.
9. Real-device perf testing on Intel Iris Xe / Radeon 680M.

## Explorer, motion feel, camera, parachute (2026-09-28)
- **Character rebuilt** (`player/character.ts`): lathe/ellipsoid forms at
  high segment counts so toon bands curve cleanly (the old 12-sided capsules
  showed facets). A-line parka with fur hem, big head (~3.5 heads tall) with
  a painted face, a knit hat with a spring-driven two-segment
  floppy tip, a mustard scarf with flapping tails, and a rounded rucksack
  with a bedroll. Knees and elbows are real joints.
- **The face is painted in the head's shader** (`FACE_FRAG`), not built
  from geometry. The scene outline pass is too heavy at face scale: geometric
  eyes and cheeks got ringed and read as spectacles. Painted features get
  their own thin ink (clamped to ~1 px so they hold up at distance). There
  are two eye types, following `inspo/char*`: `dot` (solid ink ovals, the
  default) and `round` (whites with small pupils). Switch them in the debug
  panel or with `?eyes=round`. Getting the round eyes right took several
  rounds. What mattered wasn't raw size but the *vibe*:
  - near-pure whites that skip the grade, with a crisp thin line;
  - both pupils looking the same way (inward-offset pupils look
    cross-eyed and derpy);
  - eyes high on the head and well apart, leaving a big open lower face.
  The hat sits a little higher to make room. The "c" nose and an
  off-centre grin with one end lifted apply to both types. At night the
  whites take some scene light so they don't glow.
- **Face tuning is live.** Open the debug panel at Player → Face (round
  eyes). "face cam" frames the face and freezes blinks and head turns.
  Every round-face value is a slider (`FACE_PARAMS` in `shaders.ts`, read
  by FACE_FRAG as `uFace[]`). Values persist in localStorage, and "copy
  values" copies JSON to paste back into `FACE_PARAMS` as the new defaults.
  The defaults are the user's tuned values (big squarish whites high under
  the brim, tall slim pupils). Gaze is animated through `uLook`: idle
  glances, leading into turns, following head turns. Face-feature edges
  anti-alias over ±0.5 px with a ~1 px minimum line width. Wider AA made
  the eyes look muddy and over-outlined at gameplay distance.
  looked off.
- **Animation** is procedural pose blending. Ground/air/glide/swim/fly each
  produce a pose, blended by smoothed weights. The stride phase advances
  with *distance*, and cycle length grows with speed, so feet don't skate.
  Overlays: a gentle lean into acceleration and bank into turns (the first
  pass was too strong), a landing crouch
  scaled by impact, and volume-preserving squash & stretch. The rig reads
  only `Body`, the mode name and `Body.events`
  (`jump|land|deploy|stow`), so it's still decoupled from movement.
- **Movement feel**: the default gait is a 6.2 m/s jog, Shift sprints at
  10.5 m/s, Alt walks at 2.4 m/s. The jump has coyote time (0.12 s), an
  input buffer (0.14 s), variable height (releasing early adds ×2.6
  gravity), a heavier fall (×1.6) and a slight apex hang. Air control keeps
  momentum. Ground snapping scales with speed, so the explorer follows
  slopes up to ~58° and launches off anything steeper.
- **Camera** (standard third-person game-feel practice): FOV kick and
  pull-back at speed (sprint, fall, glide, fly). Vertical follow is soft
  while airborne, so jumps read as the character leaving the ground rather
  than the world dropping. There's an underdamped spring dip on hard
  landings and a small look-ahead along velocity. No auto-recentre: with
  mouse look it fights the player.
- **Parachute** = `GlideMode`. Space in mid-air (≥1 m clearance) opens it;
  Space again drops. It sinks at 2.3 m/s with 9 m/s steerable drift, and
  Shift dives. The canopy is 8 scalloped gores (red/cream, echoing the hat)
  that unfurl from the rucksack on a spring and tilt into turns and
  acceleration. It's the template for mounts/gliders later.
- **Dust puffs** (`gfx/puffs.ts`) are opaque toon blobs that swell and
  shrink, since there's no alpha in the G-buffer. They appear on jump,
  landing, sprint footfalls and parachute deploy. The pool of 40 costs no
  draw calls when idle.
- The contact shadow now stays on the ground under the explorer and
  shrinks with height, which helps a lot with judging landings.
- Perf is unchanged (uncapped avg 4.1 ms, p99 7.7 ms).
- Action shots: `node scripts/poses.mjs <dir> [idle,run,jump,glide]`.

## Prop collision and tree cutaway (2026-09-28)
- **Collision** (`src/world/colliders.ts`): props only exist as GPU instance
  buffers built in workers, so the main thread re-runs `buildChunk` for the
  64 m cells around the player (`propsOnly` skips tufts/flowers, ~3–4 ms,
  at most one cell per frame via `prefetch`, LRU of 36). That is the exact
  scatter the nearest (size-64) render nodes draw, so colliders match what
  you see. Shapes: trees = trunk circles (0.34·scale, walk under branches),
  rocks = domes, cabins = oriented footing boxes with a pitched-roof top.
  Bushes, tufts and flowers stay walk-through.
- `WorldQuery` gained optional `floorHeight(x, z, feetY, r)` and
  `collide(pos, vel, r)`; walk, glide and swim use them, fly ignores them.
  Push-out cancels velocity into the surface, so you slide along it.
- **Stepping:** a surface up to `STEP` (0.5 m) above the feet is floor. Rocks
  also need a slope limit: with the step rule alone you climb a dome a
  fraction of a step per frame. Only a rock's cap (slope ≤ 45°) is floor; the
  flank is a wall unless the whole cap is within a step (pebbles). Big
  boulders, erratics and roofs have to be jumped or glided onto.
- The contact shadow uses the floor height, so it doesn't draw on the
  terrain under a rock you're standing on.
- **Tree cutaway fix:** trees used to hide when their trunk was within
  ~2.8·scale of the camera→player segment (t < 0.97), which caught every tree
  you walked past within ~3.5 m, even beside you. Now the sightline is
  sampled against a canopy cone (17% of the height up to the tip), stopping
  0.6 m short of the player. A tree beside you isn't hidden, because the line
  runs under its branches there. It hides about 1 m after you pass it, once it
  would cover the character. Tried hiding only when the line is deep in the
  canopy (0.6·radius): trees then covered the player's upper body and
  near-camera trees reappeared, so it was reverted. Bushes now only use the
  near-plane discard (`cutaway: 'near'`).
- Cost: queries ~10 µs/frame; a cell build ~3 ms, at most one every few
  seconds on foot. It's skipped in fly mode, which ignores collision. If that
  hitch ever shows up on slow machines, build cells in the chunk worker pool.
- Probe hooks: `__ow._colliders`, `__ow._body`.

## Creatures: floofs, crows, lasso, leads, riding (2026-09-28)
- **Two species** (`src/mobs/`). **Floofs** (an original creature in the storybook style):
  an almost perfect sphere of fur with a big painted face, a cream muzzle, a
  frown, little ears, paddling paws and a nub of a tail. Flocks of 4–9 pass
  by now and then, 3–9 m up (out of reach), climbing over forests. The name is
  deliberately our own: the look is Hilda-inspired, but the creatures aren't Hilda's. **Crows** are
  big storybook ravens (1.4× scale so a rider fits), deliberately between the
  floof's roundness and a real corvid. They have a plump egg body and a round
  head with the same painted eyes, but keep the crow cues: a heavy hooked beak,
  shaggy throat, fingered wingtips, a fanned tail and hopping. A slider
  ("crow roundness" in the panel) pushes them toward sleek or ball. Flocks of
  3–8 roam: they fly in from beyond view, settle on open ground, forage for
  30 s–2 min, then fly on to somewhere 150–450 m away. They take off early
  when you come within 9 m (15 m when sprinting or riding) or throw a lasso,
  and then land only 80–250 m off.
- **Floof redesign** (2026-09-28, feedback: "almost too Hilda-woff looking").
  The dog muzzle, black nose and frown are gone. Floofs now have a small rose
  button nose, a painted "w" mouth and blush cheeks (`uMouthW`/`uBlush` in
  CREATURE_FRAG). Long lop ears flap like wings: **floofs fly by flapping their
  ears**, which is the change that does most to make them their own creature.
  Three coats: peach, cream-white and dark cocoa-plum. Fur is white in the mesh
  and the coat is the instance tint, masked per vertex (`aTint`) so noses keep
  their colour. A flock has a main coat (65%) plus odd ones out. A flock shares
  a cruising height of 9–15 m, with members within ±1.5 m of it.
- **Creature G-buffer tag:** creatures write normal length 0.62 (props 0.5,
  ground 1.0; `uIsProp = 2`), so the composite pass can treat their outlines
  separately (see "Distant creatures").
- **Rendering: instanced parts.** Each mob keeps a small Object3D skeleton
  (not in the scene); after animation its part matrices go into per-part
  `InstancedMesh` batches (`parts.ts`). All creatures cost ~15 draw calls in
  total. Parts use `CREATURE_VERT/FRAG`: vertex colours so a whole body is
  one merged mesh, instance tint, and painted features (the explorer-face
  approach) tagged by `aCol.a` (1 = eyes, 2 = mouth), with per-instance
  look/blink/happy in `aEye`. Anti-aliasing is measured from
  `fwidth(direction)`, not the angles, because `atan` wraps at the back of
  the sphere; the first version drew a dashed seam there.
- **Fur** (`furBall`): a sphere displaced into tufts on a jittered Fibonacci
  lattice, tips combed back and down, masked off the face. **Normals stay the
  sphere's**, so the toon bands are clean curves and only the silhouette (the
  outline) reads as fluffy, like the reference. Tried: every lattice point a
  tuft (read as a lumpy potato up close), and narrow tall flicks (a sea
  urchin). What works is ~45% of points growing a real tuft with the rest
  nearly smooth. The high-res body (132×96) is used within 45 m, and a coarse
  one beyond.
- **Palette:** floofs are light peach (`keep` 0.62), because the mono grade
  pulled the first tan toward olive-brown. Crows are a lifted slate-indigo, not
  black. Near-black read as holes in the high-key scenes.
- **Spawning is ambient, not placed.** The first version gave each 360 m cell a
  deterministic flock home. That made crows feel pinned to little patches, and
  floofs rarely showed up. The manager now keeps a population around you:
  `crowFlocks` (3) crow flocks, plus up to two floof flocks, one arriving every
  25–80 s (the first 3–15 s after load). **New arrivals appear out of view**
  (tested against last frame's frustum). Crows arrive 220–320 m out, flying
  high; 65% settle 60–300 m from you, and the rest cross over you to open ground
  on the far side. At load, most crows start out already foraging 90–380 m
  away. Floofs appear 170–260 m out and drift across at 4.5–8 m/s on a gently
  wandering line that passes within ~60 m (a probe measured 56 m within 50 s).
  **Crow fly-overs:** every 45–80 s (the first 20–40 s after load), a flock
  flies in out of view and crosses right over you (within ~0–40 m of your
  position) to open ground 260–400 m beyond. These don't count toward the
  resident flocks; the total is capped at residents + 2. Flocks past 500 m (just
  beyond the 460 m draw range) are dropped and replaced where you are. At
  850 m, as it was first, the flocks near the start stayed "present" long
  after you left, so nothing new arrived. **Random per session**, not
  seeded: the first version seeded this from the world seed, so on the same
  world, arrivals repeated identically every load. Creatures are ambient life,
  not world generation. `density` in the panel scales everything; `?mobs=0`
  turns wild spawns off.
- **Distant creatures:** seen from below, a floof is mostly its shaded belly
  and read as a dark blot. From 20 m to 110 m, creature lighting flattens
  toward the lit tones (as far terrain does), and from 35 m a light aerial haze
  pulls them toward the sky tone (up to 40%). Outlines ease to 25% strength in a
  darker shade of the body colour.
- **Lasso** (R or right-click): auto-aims at the creature nearest the camera
  ray, within 24 m (the cone widens near the explorer). A dashed ink ring marks
  the target and a key prompt shows the action. The arm winds up and snaps; the
  noose flies a lob; the creature struggles against the rope for 1.8 s, then is
  tamed (happy ^^ eyes, a puff) and starts out on a lead. Ropes are verlet
  chains drawn as thin tubes; the outline pass inks them. The rope's hard length
  limit is measured from the body centre. The first version measured from the
  posed collar, which is stale for off-screen mobs, and it flung a crow
  30 km.
- **Tamed:** R toggles the lead. Led floofs trail above and behind; led crows
  hop or run, and fly when you're airborne, over water or far away. Left alone
  they wait where you left them; floofs come down low when you walk up so you can
  climb on. Tamed floofs wear a small knitted blanket. Tamed crows wear simple
  leather reins: a noseband with brass rings, a crown strap behind the eyes,
  and a slack loop lying along the neck where the rider's hands go. There's no
  seat. Rejected: a back blanket (read as an open mouth from behind) and a red
  knitted scarf (didn't read as a scarf).
- **Riding** = `RideMode` + `MountSpec` in `movement.ts` (one mode for both).
  The Body is the mount's body (pos = its feet), the mob mirrors it, and the
  rig sits in the species' `seat()` with a ride pose (knees wide by `spread`).
  Floofs: flight only, hovering ≥1.1 m; Space climbs, C descends; 26 m/s,
  Shift 40. Crows walk and run (8 / 14 m/s) and Space takes off; in the air
  (28 m/s, Shift 44) they glide down slowly unless you hold Space, and they
  land by touching down. Mounts fly faster than the explorer's own fly mode
  (22 m/s). A ridden crow on the ground uses a **walk/run gait**: alternating
  legs with stride length growing with speed, a slight waddle, a forward lean
  when running, and the pigeon head-bob. Wild crows still hop, and led crows
  switch to the gait above 4 m/s.
  E mounts and dismounts, and a mid-air dismount can open the parachute.
  E no longer means "up" in fly mode (Space does).
- **Contact shadows:** the 12 nearest creatures get flat shadow discs in the
  terrain shader (`uMobShadow`), shrinking with height. This sells the floofs'
  altitude.
- **Perf:** a worst case of 17 creatures on screen adds ~440 k tris and 10 draw
  calls. The perf run with natural spawns is unchanged (avg 4.23 ms vs 4.25 ms,
  p99 7.2–7.3 ms, A/B'd twice).
- **Soft contact (`Mobs.nudge`):** you nudge creatures aside rather than
  walking through them. Your contact shape is a 0.4 × 1.7 m cylinder, 0.6 m
  on a bike, or the mount's radius when riding. Overlap eases out at 12/s,
  and the creature picks up your closing speed plus a small spring, so it
  gets pushed ahead and slides off to the side. Only the creature moves;
  you're never blocked. Tamed creatures also keep apart from each other, and
  a ridden mount always wins. Wild flock-mates can still overlap each other
  (their flocking keeps that rare).
- **Known / next:** tamed creatures aren't saved across reloads (no backend;
  localStorage would do). Wild floofs ignore trees (they fly over forests by
  rule) and ridden floofs only collide with trunks. Crow folded wings still fan
  a little from straight behind. There are no creature sounds. Ideas: whistle
  to call a waiting mount, a lasso that can miss, more species on the same
  `Species` interface.

## Wildflowers among the grass (2026-09-28)
- The flat ground-level daisies read as splats, so they're gone. Flowers are
  now upright clumps (`buildFlower` in `geometry.ts`): three tapered stems,
  two basal leaves and heads that sit just above the tufts. Variant 0 has
  open heads, variant 1 has nodding harebells. That's two geometries, so at
  most two extra draw calls per near chunk.
- Daisy vs buttercup is chosen in `PROP_FRAG` from instance tone (> 0.6 means
  the buttercup, kind 16). This saves a third variant and its draw calls.
  Petals (kinds 5 and 15) use emissive -0.35, so they keep some colour
  through the grade.
- Placement is its own roll per tuft cell, so flowers grow alongside tufts
  instead of replacing them. It's `0.02 + 0.26 * gen.flowers()`, jittered
  within the cell. Each 10 m cell leans to one species, so colours drift in
  patches.
- Things that failed: stems at half-width 0.011 became pure outline at mid
  range and read as dark scratches. 0.02 matches the tufts. Bell normals
  pointing outward fell into the shadow band and went grey, so they now
  lean up.

## Bicycles (2026-09-28)
- **What:** a ridable town bike (step-through frame, swept-back bars, wicker
  basket with bread and apples, cream mudguards, kickstand, and a headlamp
  that glows at night). Press E beside one to ride, E again to hop off. It
  goes back onto its kickstand wherever you leave it.
- **Placement is world generation** (`src/vehicles/bikes.ts`). It's a pure
  function of the seed, like the cabins, not session-random like the
  creatures. One bike waits a few metres from the spawn, side-on to the
  first camera. Beyond that, 13% of 480 m cells get one: first on the verge
  of a footpath (1.35 m off the centreline and parked along it; paths are
  already clear of trees, rocks and bushes), else in an open meadow (no
  forest, low rockiness). Every spot must be flat and dry, away from POIs,
  and clear of the prop colliders (trunks, boulders, cabins, and now
  bushes, which `Colliders` records as walk-through `inBush` data). Seed
  `hilda` gives 11 bikes in 59 km², about one per 5 km². A bike you've
  ridden is kept for the session; untouched ones drop out past 520 m and
  regenerate when you return.
- **Movement:** `BikeMode` in `movement.ts`. There's no sideways slip: the
  velocity follows the heading, and the yaw rate is capped by a turn radius
  that widens with speed (plus a little pivot at a standstill), so it carves.
  Steering is camera-relative like walking. Pulling back brakes and then
  U-turns. Slopes pull the bike along (it freewheels downhill, stalls on
  steep climbs), crests launch it, Space bunny-hops, and water is a wall at
  the shore. The front and back wheels are separate collision circles.
  Hitting something hard emits a `bump` event (dust plus a camera dip).
  Lean is `atan(v·ω/g)`.
- **Speed (retuned):** it pedals up to 10 m/s (16 with Shift) at the same
  gentle acceleration. There's no top speed: gravity along the slope is
  opposed only by rolling resistance and a light v² drag (terminal speed is
  about 75 m/s on 30°). The no-input brake only acts below the cruise speed,
  so you freewheel descents. Turn radius grows with v² to stay steerable,
  and movement is sub-stepped (0.25 m) so it can't tunnel through trunks.
  From the 530 m summit near the `hilda` spawn it reaches 58 m/s in 14 s,
  including a 4 s jump off a ledge (`scripts/bike.mjs <dir> descent`).
  FOV and pull-back keep building up to about 75 m/s.
- **Pedalling fix:** at the target speed the old push overshot and cut out.
  Because drag is now low, it then coasted above target for a long time with
  the legs frozen (and after a descent, for a very long time). The push now
  eases in, including holding against resistance, and the legs turn whenever
  you're asking to go (cadence capped at 15 rad/s). The bike only freewheels
  when you let go.
- **Boulder ramps:** at more than 3 m/s, boulders standing up to 2.2 m out of
  the ground are ramps instead of walls (`Colliders.ramp` gives the full dome
  surface; `push(…, rampMax)` lets them through). Climbing a dome feeds
  `rampVy`. At the crest (the climb rate falls under 30% of its peak) the
  bike is kicked up by `max(climb rate, 0.45·speed) · min(1.3, rise/0.9)`.
  Space in a 0.16 s window before the lip (it waits for the lip instead of
  hopping) or after it doubles the kick: a `kick` event with `perfect`, a
  bigger dust poof, and a short dust trail off the back wheel. Deliberately
  quiet: an on-screen word and a backflip with slow motion were both tried
  and cut, as they didn't suit the storybook tone. On a 0.96 m rock at 14 m/s:
  untimed peak 2.9 m, timed 6.3 m (`scripts/bike.mjs <dir> ramp`). Bigger
  rocks (tors, erratics) stay walls.
- **Presentation:** parts are instanced `PartBatch`es (frame, steering,
  wheels, crank, pedals, kickstand), so every bike in the world costs six
  draw calls in total. The frame takes a per-bike tint (red, teal, mustard,
  blue or plum; the starter is always red). The lamp glass is creature-shader
  tag 3 (`uGlow`, emissive by `uNight`). The crank only turns while
  pedalling. At a stop the left boot goes down, the bike tips onto it, and
  the pedals come round to the ready position. Standing on the pedals
  (Shift, or steep climbs) lifts the hips and rocks the bike.
- **Rider:** a `bike` state in `CharacterRig` with two-bone IK
  (`solveLimb`) that puts boots on the pedals and mittens on the grips. The
  bike hands the rig world-space targets (`BikeRider`). The rig still reads
  only Body, mode and the seat, so the camera and rig stay independent of
  the bike. A lead rope still pulls the right arm off the bar, so you can
  cycle a floof home.
- **Switching mounts:** E on a bike or a creature climbs straight onto the
  nearest other thing in reach (`nextMount` / `switchTo` in `main.ts`), and
  hops off only when there's nothing else. The mount you leave stays where
  it is. Reach from a mount is wider: 6.5 m to a creature (a floof on its
  lead trails about 5 m back) and 4.5 m to a bike, from a mount no more than
  3 m off the ground. The prompt names what E will do.
- **Camera:** with the mouse idle for more than 1.2 s and speed above 3 m/s,
  the orbit drifts round behind the bike. Speed adds FOV and pull-back.
- **Shots:** `node scripts/bike.mjs <dir> [parked,mount,ride,sprint,turn,hop,night,wild]`.
  Hooks: `__ow.lookAtBike(dist, side, pitch)` (hides the explorer and
  lowers the focus), `mountBike()`, `dismountBike()` and `lockInput(yaw)`
  (steer relative to a fixed yaw, so scripted rides don't follow a
  re-aimed camera). `?bikes=0` turns them off.
- **Perf:** unchanged (avg 4.2 ms, p99 7.4 ms uncapped with `mobs=0`).
- **Known / next:** parked bikes don't collide with the ridden one's
  wheels beyond simple circles. Mounting snaps onto the saddle (there's no
  climb-on animation). If a jump lands you in deep water, the bike returns
  to your last dry spot. Ideas: a bell (the geometry is there), panniers,
  towing a floof in a trailer, and remembering moved bikes across reloads.

## Touch controls (`src/ui/touch.ts`)
- Shown when `(hover: none) and (pointer: coarse)` matches, or on the first
  touch of a hybrid screen. Everything feeds `Input` as virtual keys
  (`virtualKey`), an analog stick (`setStick`), look deltas and zoom, so
  movement modes and the camera don't change.
- The left 45% of the screen is a floating stick. Under about half a push it
  walks; past the rim (115%) it sprints and the knob turns gold. Anywhere else,
  drag to look; a second finger pinches to zoom.
- Buttons are contextual and mirror the keyboard prompt: Jump (▲ while flying
  or riding), Ride / Hop off (E), Lasso / Lead / Let go (R), ▼ (C) and Fly (F).
  On touch, the keyboard help, the prompt and the stats HUD are hidden.
- Follow camera (`followOnTouch` in main): with no finger on the look side
  for 0.4 s, the camera eases round behind the direction of travel (~0.8/s,
  so holding the stick sideways circles gently), unless you're running
  towards it (>130° off), and pitch eases back to 0.2 on foot. A look finger
  overrides it at once. Bikes keep their own drift.
- Verify with `node scripts/touch.mjs`, which drives real CDP touch events
  in a phone-landscape context and writes `shots/touch-*.png`.

## Phones: resolution and adaptive quality (2026-09-28)
It looked bad on an iPhone for two reasons in `main.ts`:
- **The adaptive controller mistook a frame cap for a slow GPU.** iOS caps
  requestAnimationFrame at 30 fps in Low Power Mode, and the "slow" test was
  anything under 50 fps. So the phone always dropped to the lowest
  resolution (55%) and shed terrain detail. On touch devices
  (`isTouchDevice()`) the test is now under ~27 fps. Desktop keeps 50.
- **Pixel-ratio cap 1.5 on a 3x screen** (rendering about half of native
  per axis) made everything soft, with chunky outlines after FXAA. Touch
  devices now cap at 2. Desktop keeps 1.5.
- The layer-fog target went from RGBA32F to RGBA16F. Depths fit, and the
  match only needs about 8% relative accuracy. 16F targets are renderable
  on more mobile GPUs, and the pass uses half the bandwidth. Desktop shots
  before and after this change came out the same.
Not verified on a real device: Playwright's WebKit crashes on this macOS,
so Safari rendering is untested here.

## Ground cast shadows (2026-09-28)
`gfx/groundShadow.ts`. Not a depth shadow map. Each caster is posed exactly as
drawn (the prop pose is now a shared GLSL function, `propPose`, so shadows sway
with the wind), flattened along the key light onto the plane of its own base,
and drawn from straight above into a 2048² R8 coverage mask. The mask covers
180 m around the camera and is snapped to texels so edges don't crawl. The
terrain shader thresholds the filtered mask (crisp edges at any texel size)
and drops the ground into the **shade band**, the same tone as a hill's far
side, so it stays toon and never goes black. It fades out 55–85 m from the
camera.
- Why a mask instead of a shadow map: only the ground receives, so there's no
  acne, no bias tuning, and no depth compare. On slopes the shadow is slightly
  wrong (it's projected onto the base's plane), which isn't visible in play.
- Casters are extra meshes in terrain nodes ≤128 m, on layer 1
  (`SHADOW_LAYER`), which the main camera never renders. They're one draw per
  node per kind: every variant shares one mesh reading the chunk's instance
  rows directly (stride 8 = aI0 | aI1). Trees use the far LOD (~150 tris);
  the flat silhouette looks the same. Their bounding spheres grow by 45 m so
  shadows from nodes just outside the mask still land.
- **Shadow length is capped** (`uShadowReach`, 1.5 m of run per metre of
  height). The key light never drops below y = 0.24, which would give 4×
  shadows. At 2.2, dusk put the whole foreground in shade and the frame went
  muddy. 1.5 keeps long evening shadows without losing the lit ground.
- At night the moon is the key light, so shadows are faint and blue. That fits.
- Cost on an M1 Pro: ~0.4 ms per frame for the pass, with ~80 draw calls and
  ~0.5 M triangles. Before capping the tree LOD and merging variants it was
  ~110 calls and 1.2 M triangles. Adaptive quality sheds shadows after
  resolution and before terrain detail, and restores them in reverse.
  `?shadows=0` turns them off for A/B tests. The debug panel has an on/off
  toggle, strength and reach under Render.
- Frame-time A/B with `--perf` was too noisy to trust this session (another
  Chrome tab was using the GPU; shadows off ranged from 9 to 27 ms), so the
  number above is from timing the pass alone in a probe (40 passes between
  `gl.finish()` calls). Still to do: an A/B on a quiet machine and on a real
  iGPU.

## Story phase 1: the wordless opening (2026-09-29)
- **What:** you start in a clearing in the woods and follow a wide worn path
  round a bend to a broken cabin. A cold hearth spirit meets you and shows you
  the axe; you fell three trees and fix the roof and door (a flurry in a cloud
  of dust). It shows you a hammer on a boulder behind the chimney end; you
  smash rocks for stones, rebuild the chimney (knocking with the hammer) and
  light the hearth at dusk. At night the spirit shows you the next cabin's
  light across the valley. No text anywhere.
- **Data-driven:** `src/story/phase1.ts` is a table of steps whose kinds
  (`meet`, `pickup`, `gather`, `build`, `light`, `rest`) are all the director
  (`story.ts`) knows. Each step names the spirit's anchor, pose, bubble icon,
  warmth, start hour and hint behaviour. Later phases add tables.
- **Guaranteed start** (`world/storySite.ts`, pure, runs in workers too):
  spiral out from the origin for flat, dry, open ground; lay out the cabin
  (7.4 x 5.6 m, room for a bed later) with the brook side +x, the grove
  behind it (away from the arrival path), three boulders behind the chimney
  end (the hammer on the first), a brook traced down the fall line and carved
  into `height()` with sandy banks, and a curved approach path from a clearing
  70-100 m out. The strict pass also requires the next cabin's light to be
  visible (>= 4 m clearance, sparse trees count as a 14 m wall) from the
  doorstep or a knoll within 42 m; after 30 good sites it takes the best view.
  Natural POIs within 110 m are dropped; scatter keeps off the set
  (`storyBlock`). (Where the natural forest by the path was thin the story
  used to plant conifers, `Woods`; removed 2026-10-02, see below.)
- **Gathering is a mechanic, not a script:** with the axe any world tree can
  be felled, with the hammer any ordinary boulder smashed (landmark boulders,
  tagged lean = 9 in the chunk data, can't). The grove and the three boulders
  are just the first ones the spirit points you to. How it works
  (`world/harvest.ts`): scatter trees sit one per 4 m grid cell and rocks one
  per 9 m cell, so a cell id names a prop at every LOD. A 512 x 512 wrap-around
  flag texture hides taken props in the prop and shadow-caster vertex shaders
  (`harvested()`), no chunk rebuilds. The one you walk up to is swapped for an
  identical story prop (proxy flag) that can glint and take hits; if it falls
  or breaks it's taken (saved), and felled trees leave instanced stumps
  until they grow back (see *Regrowth* below). Colliders skip taken props (`Colliders.skip`) and answer
  `nearestTree` / `nearestRock`. Aliasing: two taken props exactly 2 km (trees)
  or 4.6 km (rocks) apart share a flag; rare, and it only hides a far twin.
- **One action for everything:** E, a click (pointer locked) or the on-screen
  badge (touch). The badge shows what it does: mitten = pick up, axe = chop,
  cracked stone = smash (both hold to keep swinging), hammer = repair (one
  press hands over all you carry), flame = light. Beside it a device glyph
  shows how: a mouse with its left button lit, or a finger on touch screens,
  tapping for a press and pressing-and-staying for a hold. Nothing triggers by
  walking into it. A gamepad can map its X to the same `KeyE` later.
- **Regrowth** (`Harvest.update`, like most sandboxes: Palworld regrows in
  place, Zelda respawns while you're away). A harvest clock counts in-game
  hours from `env.hour` deltas, so time-lapses (and a bed, later) count;
  jumps backwards don't. A felled tree is a bare stump for 10 h, then
  sprouts (only unseen: > 25 m away and off screen, or > 120 m) and grows
  over 36 h, drawn as the world tree scaled from 12% up: the harvest
  texture's R byte holds its growth, quantised to 64 steps and uploaded at
  most once a second. Its stump sinks away by 40%, it's solid from 60% and
  can't be felled until it's full grown (`Colliders.busy`). Smashed rocks
  come back after 20 h, unseen. Nothing comes back within 40 m of the cabin
  (the clearing you made stays cleared). Saved: `clock` plus per-entry `at`
  and `grow`. Felled world trees weren't being saved at all before this
  (only rocks called `takeWorld`), so they came back on reload with no stump.
- **Big boulders** (scatter rocks over scale 1.4, which couldn't be broken
  before) take 5 blows and break into 3-4 small rocks (`rubbleOf`: seeded by
  cell, a loose pile inside the footprint, under a step high so you walk
  over them). The pieces tumble out and are smashed like any small rock for
  stones. They are story `SmashRock`s (a handful of draws); which ones are
  smashed is a bitmask on the boulder's entry, and they vanish when it
  comes back. Landmark boulders (stone circles, erratics, the spring)
  still can't be broken.
  `node scripts/regrow.mjs <dir>` checks all of it headless: break, rubble,
  a piece, reload, fell, fast-forward (sprout only when away), grown, back.
- **Tools, no inventory:** owned tools are worn (axe across the pack, hammer
  at the hip) and drawn into the hand for the action that needs them, then
  stowed again after 3 s unused.
- **Only usable things glint** (hard warm rim + slow shimmer, `glintAmt`),
  gentler on big trees and thin tools. A story tree you're working on cuts a
  4.5 m hole round the camera instead of the usual 1.5 m, so its canopy never
  fills the screen.
- **Sketches** are an overlay pass (`story/overlay.ts`) after the composite,
  before FXAA, with real alpha: dashed ink edges + hatched wash, fading where
  the G-buffer says something is in front. Icon slots are billboards with a
  minimum pixel size. The chimney's only appears once its step begins (a
  reload used to bring back every unbuilt part's sketch).
- **The spirit** (`story/spirit.ts`): pebble body, painted eyes, stubby arms,
  feet, an ember in its chest. Cold = ash blue and frowning, warm = self-lit
  amber (emissive >= 0.5 so the night grade can't turn it blue). It leads and
  waits, tugs you after 20 s without progress, never leaves ~45 m of the cabin
  (calls from the edge instead), and only shows its bubble within ~5 m. Its
  head tuft was removed on feedback; it still wants a new silhouette hook.
- **Cabin cutaway:** walls between camera and explorer, and the roof, hide
  when either is inside; the floor and hearth never do.
- **Chimney smoke** (`story/smoke.ts`): once the hearth is lit, a ~120 m
  column of toon puffs (one instanced draw) swelling as it rises and leaning
  with the wind, so you can find home from across the valley.
- **Inventory** is a parchment tab per resource: its icon and a count
  (`×3`), plus a green tick when you carry all that's needed. A row appears
  when the story first reaches that resource's `gather` step and stays after,
  greyed out at ×0 (`Story.opened()`). It used to be one icon per item and no
  numbers, dropped on feedback: the row got long and vanished when empty.
  Extra logs and stones are kept (for later crafting).
- **Clock:** each step drifts the time to its start hour, then runs naturally
  but never past the next step's hour, so dusk arrives only when the hearth
  is ready; the ending time-lapses into night.
- **Save:** localStorage per seed (`embla.story.<seed>`, v2: includes
  tools and everything felled / smashed). The lit cabin is the respawn point.
  `?fresh=1` forgets, `?story=0` turns the story off (also off when the URL
  sets a time, position or flight, for shots).
- **Verify:** `node scripts/story.mjs <dir> seed=<s> [from=<step>]` plays the
  whole thing with real key presses (tap E, hold E at trees and rocks) and
  screenshots each stage; `scripts/spirit.mjs` does spirit close-ups.
- **Known / next:** a bed (sleep through the night) inside the bigger cabin;
  a new look for the spirit; shots whose subject
  hugs the cabin can put the camera in a wall (the orbit camera only collides
  with terrain); gamepad mapping.
- **Crows keep off the home patch:** `groundScore` in `mobs/crow.ts` rejects
  any landing spot within `BASE_CLEAR` (80 m) of the story cabin, and
  `depart`'s random fallback gets pushed out past that ring too. Their flight
  paths are untouched, so flocks still cross over the cabin now and then.

### Phase 1 feel pass (2026-09-29)
- Reach is about 0.5 m longer for the axe, trees, the hammer and rocks. A swing
  started from the edge of reach steps the explorer in over its first 0.28 s,
  so the blow still lands on the bark or stone.
- A tool is stowed (axe across the pack, hammer at the hip) 0.7 s after its
  last use, down from 3 s.
- The hammer leans against the cabin side of its boulder, fitted to the
  boulder's posed vertices (`SmashRock.extent`) so it can't clip. The grip
  clears the boulder's flared base.
- Both work prompts show the tool: the axe to chop, the hammer to smash.
- `Want.settled`: the spirit's idle once nothing is being asked for (the
  `rest` step and after). It sits facing the fire with its palms out and a
  slow sway, and never points. When you're within 7 m it looks round at you
  every 5-11 s with happy eyes. This is the base for whatever comes next.

## Peak tails no longer clip into walls (2026-09-29)
`peaks()` culls a peak beyond `r * sqrt(1.6)`, but its falloff uses the
wobbled radius (up to 1.34 r), so on wide lobes the cut landed where the peak
still added 15-27 m: a sheer, perfectly circular wall that zigzagged across
the mesh grid (e.g. seed default, x ≈ -120, z ≈ 670). The tail now tapers to
zero over the outer 30% of the cull radius. Heights inside ~0.88 r are
unchanged and the story site doesn't move. If real cliffs are wanted, they
should be a deliberate feature with their own shading, not this.

### Greeting, per-blow resources, tools on the pack (2026-09-29)
Supersedes the hammer notes in the feel pass above.
- **The spirit greets you at the doorstep.** The 'meet' step fires at 24 m
  from the door (was 13). The spirit then hurries out (`emerge` act) to the
  doorstep and waves. On five seeds this fires about 26 m from the cabin,
  always with the cabin on screen after the approach path's bend. The wave
  plays while you close in from ~8 m to 3 m.
- **Resources come out per blow**, not at the fall or break: a log or stone
  on blows 1 and 3 (`yields` + `spill` in story.ts), nothing after. Totals
  are unchanged (2 per tree, 2 per boulder). Big boulders give stones on
  blows 1, 3 and 5 plus their rubble. Tool reach is now `CHOP_REACH` 2.2 m /
  `SMASH_REACH` 2.15 m from the surface. The swing's step-in still lands the
  blow on the bark or stone.
- **The hammer is stowed on the pack**, crossed with the axe in an X. Both
  are visible when neither is in hand.
- **The hammer prop is fitted by ray casts** (`SmashRock.surface` against the
  posed boulder mesh). Head-height rays alone floated the hammer 0.4-0.6 m
  off the rock on 4 of 7 seeds, because the boulders sit lower than the
  ground beside them and the head ended up above the rock. Now ~30 sample
  points on the head and handle are tested for leans between 0.12 and
  1.25 rad. For each lean, the grip stands as close as it can without any
  point entering the rock. It takes the lean nearest 0.42 at which the
  *head* is what touches. On the seeds checked, leans come out 0.7-1.1 and
  the head sits within ~2 cm of the rock.
- **The ending has no night reveal any more.** The spirit used to walk out
  to the lookout at 20:36 and point at the far cabin's light. Playtesting
  showed that it read as leading you off at random and then pointing back
  at the house. The rest step (`kind: 'rest'`, `doneAt`) is now a plain idle
  state, `Story.potter`: a 45-90 s sit by the fire, then 1-3 spots round
  the yard (7-16 s each, looking at the grove, cabin, far light and so on),
  then back to the fire. It is always `settled`, so it never leads, points
  or tugs. The next phase's first step takes over from it. The far light
  and the lookout's view corridor are still in the world.

### Pickaxe for rocks, hammer only for building; canopy-edge chop reach (2026-09-29)
- **The rock tool is a pickaxe** (`buildPick`, `PickProp`). It stands with its
  point struck into the top of the first boulder (`SmashRock.top` ray-casts
  the posed rock), handle leaning out toward the cabin. The pickup step, the
  target tag, the anchors (`pickSpot`) and the save field are all `pick`
  now. Old saves with `hammer` / step `'hammer'` still load.
- **Axe and pick cross on the pack.** The hammer is never owned or stowed.
  The rig draws it into the mitten for each building knock (roof, door and
  chimney), and it goes away after `TOOL_HOLD` like the others. It used to
  stay in hand after the chimney: `depositing` was only cleared inside the
  build step, so it stuck on once the step moved on. It's now cleared on
  any other step.
- **Chop reach is measured from the canopy edge** (`ChopTree.canopy` is
  the widest tier, `(TREE_HEIGHT * 0.19 + 0.3) * sc`, plus 1.3 m). The
  bottom tier droops to head height, so measuring from the trunk meant
  standing under the branches. From that far out, the swing first walks you
  in (`stepIn`, which sets `body.vel` so the gait animates and collides,
  1.2 s cap), then swings from arm's length.

## Stelk (stag mount; was "elk")
- `src/mobs/stelk.ts`: a ground-only mob. Herds of 2–5 graze in meadows and at
  forest edges, look up, and gallop away if you run at them (or within ~10 m
  on foot). It can be lassoed, led and ridden like the others, but never flies.
  The body is sculpted: each sphere direction is mapped through a shape
  function (`barrel`), with normals from finite differences. The rump patch
  and saddle are caps of the same sphere, so they sit exactly on the body.
  The silhouette is a stag, not a moose: a deep chest, high withers, the
  back sloping to a round rump, and a thick neck held upright. The head is
  level, with wide lyre antlers made of tapered tubes.
- Gait: per-leg phase with walk (lateral 4-beat), trot (diagonals) and
  rotary gallop offsets, blended by speed. After posing, the body is lifted by
  the deepest hoof penetration, so hooves don't sink into slopes.
- Riding uses `gallopUpdate` in movement.ts (a MountSpec without `fly`). It
  carves instead of strafing, takes `gather` seconds to reach a 34 m/s
  gallop, leaps on Space, swims deep water, and sub-steps its collision.
- Trees: above 13 m/s, a tree in the stelk's path is knocked flat (`Story.
  knockTree`, called before the move). Harvest's `knocked` flag drops its
  collider at once. Slower, a click or the badge butts the tree ahead down.
  Either way it gives 2 logs, which hop up to the rider (`Story.packLift`).
  In the sandbox, the inventory shows once you're carrying something.
- The touch action badge now stands in for a click (Mouse0), not E, so it no
  longer clashes with the ride / hop-off button.
- **Stow gesture.** When a tool goes away (not when you swap to another),
  the right arm reaches back over the shoulder. The tool leaves the mitten
  at 0.2 s and lands on the pack with a small scale bounce (0.45 s in all).
  The hammer has no pack slot, so the hand drops to the hip and it shrinks
  away instead (`Character.stowing`).
- **Dusk no longer holds up the fire prompt.** The hearth unlocks at
  `readyAt` (18:35), and the light step's time-lapse started from wherever
  the chimney finished (often ~14:00), so it took ~13 s. If you walked
  straight in, you stood at the hearth with no prompt. `clock()` now gets
  there within ~4.5 s of the step starting, and in about a second if you're
  already within 2.5 m of the hearth. In the playthrough, the hearth step
  went from 17.5 s to 7 s including the walk.

## Phase 2, stage 1: beacon tower placement and the sight network (2026-09-29)
The design is in `DESIGN.md` (our shared doc); this is the how and why.
- **Phase 1 no longer ends at night.** The hearth step has no `easeTo` and
  `readyAt: 0`: you light it whenever the chimney is done (the clock drifts
  to ~16:00 by then). The rest step has no `easeTo` and `doneAt: 0`, so the
  story lets go of the clock at once and the day carries on naturally. The
  owner found the sudden time-lapse into night weird. `scripts/story.mjs`
  shoots `10-hearth-outside` instead of the old dusk and night shots.
- **No starter bike in the story.** That was already true (`bikes.reset(...,
  starter = !story)`). The bike becomes the spirit's gift in stage 5.
- **`world/towers.ts`, pure like the story site.** `WorldGen.towers` builds
  the whole network lazily from `baseHeight`, `forestDensity` and the story
  site, in each worker and on the main thread (~160 ms each, once per seed;
  measured on 8 seeds). A per-POI-cell index feeds `poisInCell`, so a tower
  is just a `kind: 'tower'` POI with boulders. Chunks draw it as landmark
  rocks (lean 9, never harvested), the colliders get it for free (walls, you
  can't climb it: the spirit lifts you in stage 2), and trees keep off its
  clearing (30 m, home 34 m). Other POIs within 90 m of a tower are dropped.
  World footpaths may now lead to towers as well as cabins, tors and circles.
- **Network growth guarantees connectivity.** Candidate summits: one per
  400 m cell (the best of 9 jittered samples, then a hill climb). A candidate
  needs to be over 14 m, have a standable top (±5.5 m within 10 m), stand
  proud of its surroundings (3 m over the 140 m ring), and not be a cliff top
  (±24 m within 32 m). It scores on height and prominence, minus forest. The
  home tower is placed first. Then each round takes the best-scoring
  candidate that some accepted tower can see and that is at least
  `TOWER_SPACING` (560 m) from every tower. So every tower sees at least one
  other and the network is connected by construction. Unseen candidates are
  dropped. Links are then every pair within range that can see each other.
  Typical result: ~95–115 towers over a 5.2 km radius (birch, a watery seed,
  gets 51), each with a mean of about 6 links.
- **"Can see"** (`sees`): flame to flame within `TOWER_RANGE` (1500 m), with
  terrain at least 2 m under the straight line, sampled every 18 m. The last
  16 m at each end are skipped (the tower's own hilltop). Trees don't block.
  Uses `baseHeight` (cabin pads are too small to matter).
- **The home tower** (`homeSpot`): hill-climbed summits 200–420 m from the
  cabin, or out to 600 m at a penalty. They must be clear of the story set's
  box, have no cliffs within 40 m, and have a dry, gentle straight line from
  the cabin (the worst 20 m stretch climbs under 0.42), because stage 5 has a
  kid biking there. The score favours being seen from the yard: the top
  14 m of the stack over terrain and trees (trees count as a 14 m wall,
  except in the first `HOME_VIEW` = 90 m and the tower's own clearing). The
  story then keeps that 90 m corridor free of trees and bushes
  (`storyBlock`). It must also see at least one candidate, so the network
  has somewhere to grow. On 8 seeds it's 203–519 m out. It's clearly visible
  from the yard on 7 and just peeks over the forest on `troll` (519 m).
- **The stack**: base, two middle boulders, then a flat shoulder slab and a
  head boulder, set back toward the slab's rear so a ledge in front of the
  face stays free for standing (`ledge`). The flame is at `head.y + 1.25 *
  head.sy`. About 37 m tall (×1.12 for home), with 3–5 loose boulders
  round the foot. The face looks back toward the tower it was first seen
  from (the home tower looks at the cabin), so faces across the network turn
  loosely toward home. The head is still a plain chunk rock; stage 2 gives
  it the face.
- **Tall towers on mountain summits** (up to ~540 m, above the snow line)
  are allowed. They're dramatic landmarks, and the ember network makes them
  reachable once lit. If they prove too hard to walk up to for young kids,
  cap `siteScore` by height.
- **Dev views** (`ui/towerDebug.ts`, keys only while the panel shows, or
  `?towers=1`): L draws sight lines flame to flame in the world as overlay
  lines, dimmed through terrain (home links red), plus a tall marker over
  every flame. M shows a 560 px top-down map: relief (height bands, hill
  shade, forest), every tower numbered (home ringed), links, the home cabin,
  and you with a view cone. The panel's "Beacon towers" folder has both
  toggles, "go to tower #" (`goToTower`) and "view from above". `OverlayLines`
  in `story/overlay.ts` is the reusable line primitive.
- **Perf:** unchanged (A/B against the previous commit on the same machine:
  avg 4.5 ms and p99 8.4 ms both sides, uncapped, `mobs=0`).

## Phase 2, stage 2: tower spirits, the lift, lighting (2026-09-29)
- **Bigger towers** (owner's request): `TOWER_SCALE` 1.45, so about 50 m to
  the flame (the home tower ×1.12 on top of that). The stack is now base,
  two middles and a **wide flat capstone** (radius ~11 m) that overhangs
  like a brim, with the head set back on it. The ledge in front of the face
  is 0.6 of the capstone's radius out, where the dome is ~14° (standable).
  `layout()` is the one source for heights, so the nominal flame used while
  growing the network matches the built stack.
- **Towers are drawn by `story/beacons.ts`, not the chunks.** Chunks still
  emit their boulders (with tone + 2, which `PROP_VERT` hides) so colliders
  and ground shadows keep working unchanged. Beacons draws bodies as two
  instanced LODs (detailed within 650 m, 80-tri beyond) out to 5.2 km, so
  towers stay on the skyline past the chunk POI cut-off. The home tower gets
  its own material copy with a different rock colour. That's ~8 draw calls
  for every tower in the world.
- **The hollow head is a shader, not geometry** (`HEAD_VERT/HEAD_FRAG`). The
  mesh is a plain lumpy ball (detail 4 near, 2 far). Inside the two tall
  oval eyeholes and the crown hole, the fragment traces the view ray in
  object space against the hollow (radius 0.8). It shows either the cut wall
  of the shell (binary search for where the ray leaves the opening's cone),
  the far inside of the hollow, or nothing (`discard`) when the ray goes
  straight out through another hole. It writes that point's real depth, so
  the outline pass inks every rim, and holes cost nothing at any LOD.
  Unlit, the hollow is a dim plum that gets a faint ember low down as you
  approach (`wake`). Lit, it's a flickering fire, hottest low down, with
  firelight on the cut walls and round the lips.
- **The home tower**: golden sandstone (`HOME_STONE` #d9bc8a) against the
  grey-rose granite of the others, 12% bigger, a brighter, whiter core, and a
  little house carved over the brow that glows when lit. A pale grey stone
  was tried first and read as a skull (pale ball, two dark holes).
- **Flames**: five rounder lathe tongues (the hearth's sharp cones read as a
  paper crown at this size) rising out of the crown, flaring as they catch.
  Only the 12 nearest lit towers within 2.6 km get one. Far visibility is
  stage 3's job.
- **The spirit is the head.** The nearest one watches you (yaw ±0.45 and a
  tilt down toward you), stirs as you come, hops when lit, and bobs while it
  carries you.
- **The lift** (all timings are constants at the top of beacons.ts): step
  within the foot radius + 5.5 m on foot, grounded, for 0.18 s. Two arms
  shoot down from under the cheeks with an overshoot (0.34 s), grab (0.12 s,
  into `CarriedMode`, a new `MovementMode` that doesn't move the body; the rig
  maps it to the air pose), swing you up a Bezier arc out and over onto the
  ledge (1.05 s, fast in the middle), set you down facing the spirit, and
  retract. The camera swings to the face side, so you land looking at it.
  Arms are a tapered tube along a cubic curve with a rotation-minimising
  frame, rebuilt in place each frame, plus a mitten, all in a warm amber
  emissive. Versions tried: pale white at 0.92 emissive bloomed into white
  bars, fat mittens hid the explorer, and control points proportional to
  arm length looped up like a moustache at the top. A low look-up camera for
  the reach ended up inside trees at the foot, so it's level now.
- **Down**: on the capstone, walk outward past 80% of its radius and it
  catches you and sets you down at the foot on that side, facing out (0.95
  s). Jumping off doesn't get caught, so the parachute still works. After
  being set down, the lift is disarmed until you step 10 m away.
- **Lighting**: on the capstone, the action badge shows the flame. The
  press plays the give gesture, a spark arcs into the crown, and the tower
  catches. Lit towers are saved per seed (`embla.towers.<seed>`,
  cleared by `?fresh=1`).
- **Bug found by the Phase 1 replay:** `Input.pressed()` consumes the press,
  and the tower check read E before the story did, so the chimney step never
  saw it. The tower now only reads the press when it has an action on offer.
- **Perf**: no measurable cost (towers hidden vs shown vs every tower lit,
  same session). This session's absolute numbers were ~14 ms for everything
  including the previous commit, because something else was loading the
  GPU, so re-measure on a quiet machine.
- Shots: `node scripts/beacon.mjs <dir> seed=.. tower=.. shots=face,lit,far,night,home,lift`.

### Stage 2 feedback pass (2026-09-29)
Owner feedback: the head was a different colour from its tower, the eyes
were derpy, it wasn't dark enough inside, no flame, dead until lit, towers
floated, they needed a place to stand, and they were all the same shape.
- **Eyes**: tall superellipse holes (exponent 5, i.e. rounded rectangles),
  0.125 × 0.3 in the head's angular frame, level and parallel, with no tilt
  or wandering gaze. That's the spooky, tall-eyed vibe of the owner's
  reference. The hollow is now #150e13, nearly black until lit. The shell
  is thinner (hollow radius 0.88) so the cut bevel reads as a thin inner
  wall, not a frame.
- **No flame, no crown hole.** Lit = the hollow glows (deep amber, warmer
  toward the bottom) with light spilling on the bevels and round the rims.
  `Tower.flame` is now the glow point, just above the head's centre; sight
  lines use it.
- **Same stone as its tower**: the head writes emissive 0 like the body's
  props (the old −0.2 grade opt-out shifted its hue), and the home head uses
  the home sandstone.
- **Dead until lit**: unlit heads never turn, tilt or stir. The arms still
  lift you at an unlit tower (you have to get up to light it). That's an
  open question in DESIGN.md.
- **Grounded**: the base boulder's centre is only 0.1 of its height above the
  lowest ground under 70% of its radius, so its bottom is buried and the
  uphill side goes into the slope.
- **Varied stacks** (`layout`/`stack`): 1–3 middles with their own shrink
  and height, a capstone from a wide thin brim to a chunky block, 45% lean
  one way all the way up, 30% have a twin base boulder, half have 1–2
  boulders leaning on the base, 40% have a small stone perched beside the
  head, plus head size ±8% and three boulder meshes. The per-tower rolls are
  independent (checked); two towers can still roll alike.
- **The standing stone** (`Tower.pad`): a two-step flagstone plinth in pale
  stone (#d6cbbb) in front of the face, ringed by four small upright stones
  on the diagonals (a tiny stone circle reads as "stand here"; a lone flat
  disc didn't read at all). It glints when you're near. Stand on it and the
  action badge shows a new amber up-arrow icon. The lift is on the action
  press now, not on walking up, so passing by never grabs you. Setting you
  down lands you back on it, facing out. It's walkable through
  `Beacons.surface`, part of `floorHeight`.

### Stage 2 redesign: the lock, the tower spirit, being the head (2026-09-29)
The owner's new flow (DESIGN.md has it): lighting a tower = freeing its
spirit, and up top you *are* the head. This replaces the outside lift, the
ledge, the standing stone and lighting on top.
- **Stack** (`towers.ts layout`): a wide base, half buried; the big **door
  boulder** set forward on it, rotated to face the head's way, so its doorway
  comes down to the ground (`Tower.door` = the opening's centre on its
  surface + `door.ground`, 2.5 m out, where walking in triggers); 0–2 middles;
  a capstone; the head. Tower clearing is now `foot * 1.5 + 16`, since trees
  crowded the doorway.
- **The door boulder is drawn by the head shader** (kind 1 in `aH2.z`): one
  big superellipse doorway traced into its hollow exactly like the eyeholes,
  cut only once open. Sealed, it shows a carved seam round a slightly darker
  door stone. Open, it's dark inside with the tower's glow high up the shaft
  once lit (`aH2.w`). So the door costs nothing extra and holds up at any LOD.
  Chunk colliders still treat it as solid rock; you never walk inside.
- **The lock** (`Lock`, only for the nearest sealed tower): two rusted iron
  straps (tubes along the boulder's ellipsoid, 5% proud) crossed low on the
  door stone, and a squat rusty padlock with a keyhole where they cross, at
  about 1.4 m over the doorway ground, a child's reach. The first version hung
  it 6 m up at the door's centre. The pick badge shows within 5.5 m. Hold
  the action to swing (the story's pick drawn into the mitten via
  `Story.showTool`; the sandbox lends one); each swing steps you in to 1.5 m
  (walk mode, so it collides) and faces you to it. Three blows; it jolts
  like a pendulum, sparks, then bursts off to one side while the straps
  slither down and shrink away.
- **Freeing** (`updateFreeing`, timeline constants `T_*`): dust and small
  rubble tumbling out to the sides of the doorway (never onto the path in;
  it sinks away after 6 s); the spirit tumbles out and lands beside you; looks
  about and blinks; two happy hops with its long arms flung up, waving,
  facing between you and the camera; turns and looks all the way up;
  flings both arms up to the capstone rim; yanks itself up the outside,
  stretched long; goes over the top into the back of the head; the head blazes
  on with a burst of sparks and a happy hop. That's ~8 s, input off. It's
  saved as lit the moment the lock breaks.
- **The spirit** (`TowerSpirit`): a glowing orange lathe body about 2 m
  tall (`SPIRIT_SIZE`), two tall dark capsule eyes (the towers' eye
  language), and the stretchy `Arm`s. At emissive 0.6 it bloomed to white;
  it's 0.32 now.
- **Camera**: `Beacons.cinematic()` gives the orbit camera a shot. First side
  on to you and the spirit with the doorway behind (the side is random),
  then a **hard cut** as the arms fling up, to the whole tower from the
  front, so the climb and the eyes lighting are seen face on. Gliding there
  passed the camera through the door boulder, and a camera behind the tower
  saw only the back of the head. It cuts back to you at the end. After
  freeing you're disarmed at that doorway until you step 5 m away,
  otherwise it slurped you straight in.
- **In and out** (`updateSlurp`): walk to the doorway of a lit tower and two
  arms reach out of the dark and pull you in (`CarriedMode`). The explorer is
  hidden (`hidePlayer`: `rig.root.visible` and the contact shadow), and the
  camera rises from the doorway to the head's eyes (`viewCam()`, a smoothed
  lerp, 0.85 s). Then you look out through the eyes: free mouse look
  (`Beacons.look`), FOV 42, and the action badge shows a down arrow (new
  icon). E, a click or Esc drops the camera back down and the arms push you
  out onto the doorway ground. `Story.findAction` now shows the external
  badge even when not walking, for this.
- Unlit heads are dead stone (no hop); the head you're inside
  holds still too. (Superseded: every head now watches you, see below.)
- Tests: `node scripts/beacon.mjs <dir> seed=.. tower=.. shots=unlock` plays
  it all (lock → hold E → sequence frames → walk in → head view → look →
  exit) and logs the badge each step. Checked on fjord and hilda. The panel
  has "break the nearest lock" (`beacons.debugBreak()`), which plays the
  sequence from wherever you stand.

### Tower feedback pass: ghost spirit, ledge climb, 360 head, walk-in room (2026-09-29)
- **Ghost spirit** (`TowerSpirit`): a lathe dome over a flared skirt whose hem
  waves in seven scallops, double sided, floating 0.35 m with a bob. Tall
  dark capsule eyes, a torus-arc smile (`grin` widens it when happy). The arms
  (same glowing material) hang down to just off the ground and sway; they
  fling up for joy.
- **Ledge climb** (`frontAt`, `ledges`): the climb never enters rock. For
  any height, `frontAt` is how far the stack reaches out along the face
  (the widest boulder's ellipsoid there, plus its offset), and the spirit
  hangs just outside that line. Ledges are each boulder's upper shoulder
  (0.72 of its height) and the capstone lip. For each ledge (`CLIMB_STEP`
  0.62 s) both hands stretch up and grab (a thud and sparks), then it hauls
  itself up to hang under it. Then it goes over the lip onto the capstone,
  takes a look up, and squeezes into the left eyehole, shrinking.
- **360 head view**: the head you're in turns with your look (`look` follows
  `viewYaw`, the tilt follows pitch), and the camera rides round just in
  front of its face, so the rock never blocks the view. On the way in, the
  camera rises from wherever it was, swinging out in front of the tower.
- **Walk-in room**: the door boulder is drawn double sided (its own
  `HeadBatch`/material sharing the head uniforms). Its doorway is a real
  `discard` cut with a bevel ring for thickness; back faces are the cave (dark
  stone, glowing from above once lit). Collision is done by `Beacons`: the
  door boulder is a shell (normalised ellipsoid, walls between radius 0.86
  and 1, horizontal push only, open through the doorway with a margin; solid
  while sealed). The buried base is an exact dome floor (`surface`). The
  prop colliders now leave the **whole stack** out (lean 8, via the POI's
  `stack` count): they model every rock as a column from the ground, so the
  floating boulders overhead became invisible walls inside the room.
  Loose rocks round the foot stay solid. The base now sits deeper (centre at
  -0.75 of its height) and the door boulder stands on the ground, so the
  room's floor is walkable. Walk in over halfway (`inRoom` 0.55,
  horizontal) and the arms come down from high in the dome to take you up.
  Coming out, you're lowered to the room's floor, facing the doorway, and
  the camera cuts to look in at you through it. `clampCamera` keeps the
  camera inside the room while you're in it (unless the line of sight goes
  out through the doorway), and never during a cinematic.

### Spirit face, long-arm climb, no crows at towers (2026-09-29)
- **Face painted in** (`GHOST_VERT/FRAG`): the capsule eyes and torus smile
  stood proud of the body and read as clip art ("MS Clippy"). Now the body
  shader paints two tall rounded-rectangle sockets (superellipse, exponent 4)
  that sink into the glow: a darkened rim, near-black inside, a touch warmer
  low down, deepest under the brow. The smile is a small, thin, lopsided
  line like the explorer's grin (`uGrin` widens it a little). Blinks squash
  the sockets.
- **Climb**: no more ledge-by-ledge. Both very long arms stretch up the face
  of the tower to the capstone lip (1.0 s, the hands tracking up just
  outside the rock, the arm curves bowing out round the bulges via controls
  set out from `frontAt`), a tug on the grip (0.35 s), then a slow haul in
  three heaves (2.6 s) hanging just outside the rock, over the lip (0.7 s),
  a look up (0.5 s), and it slips into an eyehole (0.65 s). The whole
  freeing takes about 12 s.
- **Crows and stelks keep off towers**: `nearBase` in `crow.ts`/`stelk.ts` also
  rejects anywhere within `TOWER_CLEAR` (55 m) of a tower. All their landing
  and spawn spots go through it. Crows had settled in a doorway's room.

## Phase 2, stage 2 polish + stages 3-5 (2026-09-29)
Owner's bug list, then the rest of phase 2 in one go (the owner was away and
asked for as far as possible). Everything below is a first pass for review.
- **Towers are solid** (`story/towerRock.ts`). Every tower boulder (stack,
  loose rocks, the head) collides against its *drawn* shape: each boulder
  mesh is rasterised once into top/bottom height fields (129², unit space),
  since the meshes are star-shaped round their vertical axis. Walls push you
  out radially past the rock at any height the body spans (feet + 0.5 to
  + 1.7 m); tops are floor only if walkable (rise/run < 1.15), open to the
  sky and with headroom (never inside or tucked under another boulder: that
  was the invisible floor inside the stack). Landings from any height: if
  last frame's feet were over a top and this frame's are under it, you land
  on it (fall, parachute, mounts, bike jumps). The door boulder keeps its
  shell collider (hollow room); its roof is a normal top. The chunk prop
  colliders now skip every tower boulder (lean 8). **Dev fly collides too**
  (owner's answer): `WorldQuery.landmarks`, called by `FlyMode`. Mobs collide
  with towers as well. `Beacons.clampCamera` pulls the orbit camera in to
  just short of any tower rock (snaps in, eases out), which also keeps it in
  the room. `scripts/towerland.mjs`: 49-point drop grids per tower in walk,
  glide and fly; 0 bad on fjord and hilda after two fixes (headroom, and the
  door's `solidAt` using the drawn shape, not the ellipsoid).
- **Stepped frames for tests**: `__ow.manual(true)` + `advance(n, dt)`. A
  browser frame already queued when stepping starts used to run with a
  negative dt (it froze the padlock's flight); stray frames are now ignored
  and dt is clamped at 0.
- **The tower spirit**: tall and skinny (2 units × 0.3, ~2.8 m at 1.4 m per
  unit), a slim lathe that swells at a five-scallop hem. Colour: the lit
  eyes' uEmber/uCore, hotter up top, deeper ember at the hem and edges. It
  read white because emissive 0.34 is under the grade's 0.5 cut-off: the
  monochrome grade swapped its chroma for the tint's. It writes 0.62 now.
  Arms too (same colour, 0.62).
- **The climb** (`planClimb`, worked out once): it climbs beside the doorway
  (not over it). Both arms reach up the face to grips on the capstone's
  top edge (found from the capstone's height field), a tug, then a slow
  three-heave haul with the body held clear of the rock over its whole
  height and width (`faceClear`, marching `solidAt`), up past the lip, in
  onto the capstone in front of the left eye, a look up, then it rises to
  the eyehole and slides in along the eye's axis, shrinking a little (the
  eye is ~1.4 × 3.3 m; it fits). Arms are tubes along a path up the face
  (`Arm.setPath`, Catmull-Rom), and any point of an arm in or within 0.3 m
  of rock is pushed back out (up and out above the capstone, out below), so
  no arm passes through rock. Hanging arms reach the floor under the spirit
  (the capstone when it's up there), capped at an arm's length that scales
  with it, so they retract as it shrinks. It keeps a step away from you on
  the ground. ~20 s in all.
- **The freeing camera** is explicit now (`cinematic()` returns a pose, and
  main eases in from and back out to the orbit over 1.1 s): side on to the
  pair, then a smooth pull back and round to the whole tower as it climbs
  (distance leads the focus, so it never passes through rock), closing in
  on the head for the eyehole. No cuts. The padlock flies away from the camera.
- **No disarm after freeing**: you're outside the room at the lock, and a
  kid walking straight in (as the hearth spirit shows) must get taken up.
- **Stage 3, the tower camera** (`towerView.ts`, overlay scene, so fog and
  night can't hide it): towers in sight (the head's links, plus anywhere you
  can fly) are drawn as plum silhouettes where the real tower has faded
  (fading in past 250-700 m) with eye markers: lit = white-hot eyes in a big
  ember glow, unlit = two dim embers. Targets: lit towers it can see, plus
  home (from home: every lit tower). Aim snaps to a target within 0.2 rad
  and eases the view onto it, leaning in a little (the FOV narrows 42° → 33°,
  `AIM_ZOOM`, easing in over ~1 s and back out on losing it or flying) so it
  reads as a destination; it glows brighter with a pulsing ring, and the
  badge becomes a new `ember` icon (E / click flies). No target, or looking
  well down, the badge is the down arrow (out). Esc is always out.
- **Stage 4, ember flight**: you become a small ember on a cubic arc (up and
  out along your look, high over the land, then round to come into the far
  head's eyes from the front, so never through its rock), 2.6 s + 1 s per
  480 m. The camera follows behind it, easing out of the eyes at the start
  and into the far eyes at the end, turning to look out of its face. Your
  (hidden) body is moved to the far doorway at take-off so the world streams
  in there. You arrive as that head (the tower camera again).
- **Stage 5, the journey** (`story/journey.ts`, data-light director; the
  story lends it the hearth spirit with `Story.lent`). Stages: gift → ride1 →
  lock1 → enter1 → ride2 → lock2 → enter2 → done, saved per seed
  (`embla.journey.<seed>`, cleared by `?fresh=1`). The paths are real
  world footpaths (`WorldGen.journey`, drawn and kept clear of trees like any
  path): yard → the home tower's doorway, and on to the next tower (a
  neighbour of home, preferring one whose face looks back at home, nearest
  first). They detour through dry midpoints when the straight way crosses
  water (checked on 4 seeds: no wet samples). The spirit rides a 0.55-scale
  bike (`BikePose.scale`; `Bikes.place/move`), 1.5 m right of the path, about
  10 m ahead, matching your speed, stopping to wait (looking back, a chirp
  every 3.5 s) if you're 24 m behind or 40 m off the path. At the tower it
  hops off, points at the lock (pick bubble), then at the doorway (up
  bubble). In the head the view turns by itself to the next tower (dark,
  dim-eyed) (`Beacons.guide`); coming out, it's already on its bike to lead
  you on. At the second tower, the head's view turns to home, glowing: fly
  home. Then it goes back to its fire once you're 90 m away. From ride1 on,
  the gift bike turns up again outside the cabin whenever it's been left far
  away and you're not near either. Dev: panel → "Journey (phase 2)", or
  `?story=1&journey=<step>`.
- Checked: `scripts/journey.mjs` plays the whole of phase 2 on fjord and
  hilda (frame-stepped); Phase 1 replay completes (34 s); perf unchanged
  (avg 3.89 ms / p99 6.5 ms vs 3.90 / 6.6 at 232258b, uncapped, mobs=0).
- Known / next: the rise into the head and the exit still have their old
  camera moves (the exit cuts to look in through the doorway); the spirit's
  arms near the capstone lip can kink a little; the tower camera has no
  touch controls beyond the badge; no bell/voice for the waiting spirit
  beyond a chirp; the gift has no ceremony beyond pointing and a bubble.

### Owner feedback round (2026-09-29): paths, the climb, the exit, the ride off
- **Journey paths are routed** (`WorldGen.route`): A* on an 8 m grid, with
  the cost worked out lazily per cell. It never crosses water (the full
  `height`, so rivers and lakes, plus the story brook) and keeps 4 m of dry
  ground either side. It keeps off the cabin (7.5 m), the story's trees,
  stump and stones, other POIs' boulders, and every tower's rock, and it
  prefers gentle, open ground (cost 1 + 14·slope² + 1.2·forest). Then it's
  pulled straight in clear runs of up to 45 m and rounded (Chaikin ×2,
  never into a blocked spot). The last stretch into each doorway is
  straight. ~200 ms per seed (per worker). The old line crossed a lake on
  fjord and ran through the cabin.
- **Paths are clearer**: journey paths are drawn 1.2 m wider each side
  (`PathSeg.wide`: two bikes side by side), and every path keeps trees
  clear by their canopy (1.6 + 2.4·scale m), bushes by 1.4 + 1.5·scale and
  rocks by 2 + 1.1·scale (it was a flat 3.2 / 2.2 / 1.8 from the centre).
  The story's planted woods also keep off the trail to the home tower.
- **The climb, again** (owner: "arms should arch out and around right up to
  the eyes and pull himself right in"). It now waits at the foot beside the
  doorway; both arms shoot up along big arcs out in front of the stack and
  swing out wide across the face (away from the camera's side, so the arc
  reads on screen; out toward the camera it looked flat against the rock)
  and hook into the left eyehole's rims (1.2 s, drawn as the growing first part
  of a cubic, any point near rock pushed out); a tug; then it's yanked up
  along an arc (1.9 s, slow start, then a snap with only a short ease at the
  eye), pushed out from the face until the whole body clears all rock
  (checked at 24 points × 9 body samples), and pops into the eye (0.35 s).
  No more walking over the capstone. Owner: the arms got awkward at the very
  end (as the arc closes on the eye they crumple into a zig-zag, and drawing
  them back in after it read badly too). So at 90% of the pull they burst
  into glowing wisps all along their length (`poofArms`, its own `Puffs`
  pool in the arm colour) and it finishes the last bit armless.
- **Out of the head: straight outside.** The drop back into the room is
  gone (you couldn't tell where the doorway was). You reappear 3 m in front
  of the doorway facing out, with a puff of sparks, and the camera glides
  down from the head's view (1.1 s blend) to a shot from in front with the
  doorway behind you.
- **Ride off**: coming out, the hearth spirit is there; it greets you,
  walks to its little bike, climbs on, and waits with a bike bubble,
  watching you, until you're on yours (or you set off along the path on
  foot, or 40 s). Then it leads. The first ride works the same way: its bike
  stands a few metres up the path from your gift. Its bike is never one you
  can climb on.
- **Lit towers watch you**: every lit tower within 700 m turns its head
  all the way round to face you (and tilts down a little), not just the
  nearest, ±0.45 rad.
- **Every head watches you, always** (owner request): lit or unlit, at any
  distance, every tower head turns to face you and tilts down a little. The
  only exceptions are the head you're inside (it turns with your look) and
  the tower being freed, which faces front because the spirit's climb plan
  targets the resting eyehole.
- **Ember flights**: the far head turns to face the tower you left
  (`Slurp.yaw`), and the arc ends at the eye in that pose, coming straight
  in along that line. You arrive looking back the way you came. Every other
  head (including the one you left) watches the ember in flight, not your
  hidden body, which has already been moved to the far door.
- **Collision**: a steep rock lip below step height counts as wall (you
  stood 0.4 m into one), and from outside, the door boulder uses its drawn,
  lumpy shape, not the ellipsoid shell (lumps poked 0.5 m into you). Drop
  tests: 0 bad on fjord and hilda.

### Bikes at the cabin (2026-09-29)
- A bike stood by the cabin from the start: world bikes are placed on path
  verges, and the journey trail is a path now. **No world bikes within
  350 m of the story cabin** (`CABIN_CLEAR` in bikes.ts). A saved journey
  step also can't outlive its story: if the hearth isn't lit, the journey
  goes back to `wait` and its bikes go.
- **The gift is pulled out of the hearth spirit's heart**: it comes out to
  the yard, and once you're near and watching it throws its arms up. A
  spark rises out of its chest and swells into a ball of light over its
  head, arcs over to the spot and bursts, and the bike spins up out of the
  light with a little overshoot (`conjure`, 2.7 s). Then it points at the
  bike (bike bubble). Its own little bike comes out the same way when you
  climb on, just up the path.
- **Exactly one bike at the cabin** (`tidyCabin`), settled once as you come
  within `CABIN_R` (340 m, past bike draw range) of it. On foot: your bike
  goes back to its spot (recreated if missing). Riding in: the bike under you
  is the cabin's one, so the spot stays empty (the gift, if it was left out
  front, goes). Any other bike within 80 m of the cabin goes either way.
  Nothing moves or goes within 70 m of you. The spirit's
  own bike is never at the cabin after the first ride (and is gone when the
  journey's done). The ground shadow waits until a conjured bike has grown.
- **A bike at the foot of a tower you fly to** (`Journey.towerBike`, on the
  `arrived` event): `tower:<id>`, beside where you step out (3 m in front of
  the doorway), side-on, on the first flat, prop-free spot off the rock
  (`Bikes.placeNear`, which skips the POI clearance: the tower is a POI).
  Not if one of yours is already within 25 m. Earlier tower bikes 500 m+
  away go when a new one is made.
- `scripts/gift.mjs`: the gift moment frame by frame, with bike counts
  near the cabin before and after.

### Tower locks never buried (2026-09-29)
- Where a door faces downhill, the stack (stood on the lowest ground under
  its base) is several metres above the ground in front of the doorway. The
  lock aimed for ~1.4 m over that lower ground, slid down the underside of
  the door boulder (below the doorway itself) and ended up 1–4 m inside the
  slope on ~20% of towers. Now `Lock` stays on the door stone (elevation
  -0.5..0.1 before lifting) and climbs until the padlock clears the terrain
  under it by 0.4 m (checked on all towers of 8 seeds). The pick's vertical
  reach allows the lock up to 7.5 m above you, for the few steep drops.
- `scripts/beacon.mjs ... shots=door` frames a tower's sealed doorway.

### The door breaking and the spirit emerging (2026-09-29)
- Owner: breaking the lock felt like a jarring jump; the spirit was just
  out. Before, the doorway was cut open on the lock's last blow, and the
  spirit flew out over your head within 0.5 s while the camera was still
  easing in. The camera's focus also jumped at T_OUT.
- Now (constants at the top of `beacons.ts`): the door stone stays sealed
  until `T_BURST` (0.95 s). It shudders harder and harder, with ember cracks
  running out from its middle and glowing through the seam (the door
  instance's glow slot carries 0..1 while sealed; see the sealed branch of
  `HEAD_FRAG`). Then `burst()` throws chunks, dust and a camera jolt, and
  the explorer steps back. The spirit's glow stirs deep in the dark
  doorway, it blinks and drifts out over the threshold, then curves round to
  beside you. Everything after is shifted about 2 s later.
- The cinematic is one continuous shot. It opens nearer face on to the door
  (yaw ±0.55, 15 m) and eases to the old side-on pair shot as the spirit
  comes out.
- Bug fix in `main.ts`: the camera blend's rotation never blended.
  `q.slerpQuaternions(from, q, k)` copies `from` into `q` first, so it held
  the old view for 1.1 s and then snapped. This affected every cinematic
  blend-in and blend-out (freeing, leaving a head).

## Towers: no capstone, four builds (2026-09-29)
- **The capstone brim is gone.** It was there as a standable ledge for the
  old lift (you were set down on it) and for the spirit to climb over its
  lip. Both are gone (the spirit's arms go straight to the eyehole, you ride
  up inside), so it was just a hat. The head now sits right on the top
  stone, set back only when that stone is wider than it. `Tower.slab` is
  kept as "the top stone" (the arm clearing and `towerland.mjs` still use
  it).
- **Four builds** in `layout()` (`towers.ts`), picked per tower: cairn
  (44%, 2-3 shrinking stones; the nominal `rnd = 0.5` tower), pillar (18%,
  3-4 tall narrow stones, slightly smaller head), top-heavy (18%, a small
  neck stone with a big one balanced on it, sometimes a small one under the
  head) and squat (20%, 1-2 wide chunky stones under a 16% bigger head).
  Squat stones started at 0.55-0.7 height/radius and read as the brim
  again, so they're 0.7-0.82.
- **Stacking is contact-based now**: each stone's flat bottom sits at 0.92
  of the height of the one below (`below.cy + below.sy * 0.92 + sy * 0.5`).
  The old "+0.7 below, +0.85 above" spacing left a big gap under a large
  stone on a small one.
- The perched stone on the capstone became 0-2 small stones wedged in the
  joins up the stack, poking out to the side (never across the face).
- Heights now run ~25-47 m to the head (fjord seed). The network still
  grows from the nominal flame height, and parent links are forced, so the
  graph always connects. A squat tower may see fewer of its neighbours.

## Elk renamed to stelks (2026-09-29)
- Owner call: the stag mount is a **stelk** (plural stelks), made up like the
  floof. Species name `'stelk'`, class `Stelk`, `src/mobs/stelk.ts`, debug
  `spawnFlock('stelk')` and `settings.stelkHerds`. No save data keyed on it.
- Checked while at it: they still spawn, but sparsely and far off. Herds land
  70–300 m out at load and 150–320 m later, never within 80 m of the cabin or
  55 m of a tower, and always out of view. In a check on the default seed
  there was one herd of 2 about 250 m from the cabin after 30 s, which is easy
  to never see. If they should be more visible, bring the ranges in or raise
  `stelkHerds`.

## The gift shot (2026-09-29)
- Owner call: you must be outside and watching when the spirit conjures your
  bike, so it takes the camera. `Journey.shot` starts once the spirit is in
  place and you're on the ground outside the cabin (`cabin.inside`, 0.6 m
  margin) within 16 m (40 m after 25 s). There's a 1.2 s lead-in so the
  camera has settled before the spark comes out, then the conjure (2.7 s),
  then a 1.6 s hold on the bike.
- `Journey.cinematic()` goes into the same camera slot as the tower
  cinematic in `main.ts` (`beacons.cinematic() ?? journey.cinematic()`),
  so it gets the same eased blend in and out. `Journey.busy` freezes movement
  and the E and F keys, as `beacons.busy` does.
- The shot is side on to the spirit and the bike spot, from whichever side
  faces away from the cabin, so the cabin never sits between the camera and
  them. `scripts/giftshot.mjs` frame-steps it and checks that it waits while
  you're indoors.

## A more run-down cabin (2026-09-29)
- Owner ask: the start cabin should look much more neglected before you fix
  it. There's a sunken roof, not just a hole, plus peeling paint and patina.
- **Roof:** `roofSag(x, z)` in `story/geometry.ts` bends the ruined roof down.
  The ridge swaybacks between the gables, and there's a deep dip round the
  front-slope hole, held up at the gables and on the eave walls. The roof is
  now built twice. `roof` is the ruin: sagged, with holes, three boards
  hanging into the room, moss cushions and a birch sapling by the ridge.
  `roofFixed` is straight and whole. The roof repair swaps the whole roof
  (`mkPart` takes a separate fill geometry, so the sketch still ghosts only
  the missing boards). `cabin.surface()` subtracts the sag until the roof is
  built. Boards and rafters are segmented boxes (`kbox(..., seg)`) so they
  can bend.
- **Paint:** a `uWear` uniform on the prop material (0 everywhere except the
  story cabin). In `PROP_FRAG` it fades the falu red toward `cabinFaded` and
  peels whole clapboard runs back to grey `cabinBare` wood, worst near the
  ground. It chips the cream trim and spreads moss (kind 23) up the roof
  boards from the eaves. Each built part takes off a third
  (`RuinCabin.update` eases it). I tried vertical grime streaks, but they
  read as plaid against the clapboard lines, so they're out.
- **Wear props** (`buildWear`, by side, so the cutaway still works): sprung
  clapboards with the gap showing, the left window boarded with crossed
  planks, and moss and weeds along the footings. Front goes with the door
  repair, back and left with the roof, right with the chimney. The cutaway
  now treats anything in a part's `broken` list the same way.
- `scripts/cabin.mjs <dir> [tag=x]` shoots the cabin from five sides, broken
  and then fully mended.

## No more tors (2026-09-29)
- Owner ask: the small stacked-boulder tors read like far-off beacon towers,
  so you couldn't tell which stacks mattered. They're gone from `poisInCell`;
  the only boulder stacks in the world are now the towers. Stone circles and
  erratics stay. This shifts the POI rng stream, so circles, erratics and
  paths move for a given seed. The `tor` shot is gone from `scripts/shots.mjs`.

## Patting the spirit (2026-09-29)
- Owner ask: a way to gently pat the house spirit, only while it's idle, with
  a prompt when you're near and a reaction that shows it loves it.
- **Offer:** `Story.findAction` gives a `pat` verb (new `pat` icon: a mitten
  on a happy dome) when you're within `PAT_NEAR` (1.7 m) of the spirit and
  `spirit.idle` holds: its want is `settled` (the rest step's sit by the fire
  and pottering, or phase 2's sit at the hearth) with no icon, it's inside its
  yard, arrived, with no acts queued, not riding or waiting to lead. (At
  first any arrived spirit could be patted, including while it pointed at
  the next job. The owner wants it only when idle at the cabin.) Trees, rocks, pickups and repairs take priority over it.
  It stays wordless, so the badge is the prompt.
- **Timeline:** `spirit.pat()` queues a `pat` act. `PAT` in `spirit.ts`
  holds the beats (0.6/1.1/1.6 s), the end of the hand (2.1 s) and the joy
  (1.3 s). The story reads `spirit.patTime` to drive the explorer, so the
  hand and the squish stay in step. Moving, jumping or leaving the walk mode
  lets go (`endPat`).
- **Explorer:** the story walks the body to `PAT_STAND` (0.7 m), turned so
  the spirit sits in front of the left mitten. The left hand does the
  patting because the right one may hold a tool or a rope. `rig.patAt` is
  the mitten target (the crown from `spirit.headTop`, lifting between
  beats, then a short stroke back). The rig drops onto one knee with leg
  IK (feet planted, left knee down) and a fairly upright torso. The first
  try was a bow from the waist, and the big head landed on the spirit. The
  arm is two-bone IK in the spine frame. The spine leans in only as far as
  it has to to bring the crown within reach (`patLean`, at most 0.35).
- **Spirit:** its eyes shut in happy arcs, it leans up into the hand and
  wiggles, and its arms clasp at its chest. Each beat gives it a squash
  impulse, a `coo` (a new warbling sine in `audio.ts`) and two sparkles.
  `patGlow` warms its tint (even when cold), brightens the ember and the
  heart, and deepens the blush. When the hand lifts, it throws its arms up,
  bounces, spins, gives an excited chirp and shows the heart bubble. The
  bubble stays hidden during the pat because it covered the explorer's
  face.
- **Camera:** from straight behind, the explorer's back hides everything.
  So when the mouse is idle and the camera is within ~80° of behind, it
  eases toward `story.patCamYaw` (heading + 1.8, three-quarters from the
  patting side), the same way it drifts behind the bike.
- `scripts/pat.mjs <dir> [seed] [warmth] [camYaw]` presses E next to an
  idle spirit and steps through the pat frame by frame.


## Phase 3: the stable (2026-09-30)
- Owner ask: after the house and the first two towers, the spirit has you
  build a stable with a big fenced pasture by the cabin (room for about 20
  creatures). The lasso stops being there from the start: the spirit gives
  it to you when the stable's done. A lassoed creature can be led but not
  ridden until you bring it home to the pasture. After that it's saddled,
  rideable, and always comes back there.
- **Where (worldgen):** `findPasture` in `storySite.ts` puts a 34 × 24 m
  rectangle 42-64 m from the cabin, all the way round, with its gate side
  (+z) turned to the cabin. It has to be dry, thinly wooded, and clear of
  the brook, the grove, the boulders, every story path, the start clearing
  and the far light's sightline. The ground must lie within 2.2 m of a
  least-squares plane that tilts at most 1 in 20. `WorldGen.height` eases the
  ground onto that plane (full weight 2 m out from the fence, blended out
  over 10 m), so the fence and stable sit on exactly the plane's heights.
  `storyBlock` keeps trees, bushes and rocks out of it (and tufts out from
  under the stable). The journey's A* route avoids it. A worn path runs from
  the yard to the gate.
  - The strict story-site pass now needs a pasture, which **moves the cabin
    on seeds that had no room** (about half of 15 tested; `hilda` keeps its
    cabin, so the owner's save survives). The owner okayed this. Site search
    got ~50% slower (~0.5 s). The pasture search runs before the expensive
    far-light search and is re-run only if it blocks the view.
- **The build (`stable.ts`, `stableGeometry.ts`):** four parts on the shared
  part mechanics that were pulled out of the cabin (`build.ts`: sketch,
  slots, the snap-in pop; the cabin uses them too now). Footing is 6 stones
  (a stone sill, post pads and the trough). The frame is 8 logs (posts,
  plates, board walls, three stalls, hay racks, straw, the tally board). The
  roof is 4 logs (deck, a thick turf with rounded edges, crossed bargeboards
  and a few flowers). The fence is 8 logs (split rails with trunk posts, a
  swinging gate). That's 20 logs and 6 stones. Walls use the brown board kind
  (not the red cabin paint, which stays the one accent). The fence rises out
  of the ground as it pops in (a stand-in pivot carries the pop, and only
  the fence's y scale follows it), because scaling a 34 m fence about its
  centre slid it sideways. Marker stakes with ribbons and a string show the
  pasture from the start of the phase until the fence replaces them.
  - Turf tufts made little "v" outlines that read as birds on the roof, so
    they came out.
- **Steps (`phase3.ts`):** plot (a `meet` that leads, with the stable in its
  bubble), stones3, footing, logs3, raise, logs4, fence, lasso (a `pickup`,
  item `lasso`), herd (the new `herd` kind: done when N creatures live
  there), then ranch (rest). The director now runs a list of phase tables
  (`Story.phases`, `phaseIndex`). Parts belong to the cabin or the stable
  (`owner(id)`). Phase 3 never touches the clock (`startHour: null`).
  The journey starts it (`startStable`) the first time you're home (within
  35 m of the cabin, on the ground) after phase 2's `done`. Once phase 1
  was over, gather hints fall back to the nearest world tree or rock round
  where the spirit waits, because the grove is long gone by then.
- **The lasso gift:** like the bike's. Once you're outside by the gate, the
  camera takes a three-quarter view of the spirit and the gatepost. A spark
  swells over its head, arcs to the post and bursts, and the coiled lasso
  bounces in there. Take it (the hand badge). `Mobs.rules.lasso` follows
  `story.hasLasso`, so before that there's no aim and no throw, only
  spooking. The sandbox keeps the lasso from the start.
- **Creatures (`herd.ts`):** `Mob.stabled` is the new flag. Saddles show
  only on stabled creatures, and `mountable` only offers stabled ones. In
  the story (`rules.stable`) a tamed creature is just on a rope. When it's
  inside the fence (0.5 m in) it's welcomed: it hops, hearts float up, the
  spirit celebrates, the saddle appears and the tally gets a mark. At most
  20 (`TALLY`); past that nothing more is welcomed. Creatures that live
  there pick a new spot every 14-44 s, sometimes a stall (more often after
  dark), and are held inside the fence (`keepIn`). The fence doesn't block
  creatures. Only the player collides with it, so a led stelk never snags
  on the gatepost. Left anywhere else, one stays put until you're within
  160 m of the pasture. Then, the first moment it's off screen or over 90 m
  away, it's back in the pasture. Tamed ones you never brought home go wild
  again once you're 500 m from them. The roster (species, tint) is saved as
  `embla.herd.<seed>` and adopted back into the pasture on load.
- **Tally board:** on the stable's gate-side gable at eye height. There are
  20 carved grooves (four fives, the fifth struck across) and a cream mark
  is painted over each one per resident (a draw range over the painted
  marks). The first place for it was over the middle stall, where the deep
  eave hid it.
- **The spirit** routes through the gate in and out of the fenced pasture,
  and round its corners otherwise (`around`, now shared with the cabin).
- Dev: `?stable=<step>` / `__ow.stableJump(step)` (also in the panel's
  journey list), `__ow.bringHome(species, n)`, `__ow.spawnAt`.
  `scripts/stable.mjs <dir> [shots]` frames each step.
  `scripts/stablerun.mjs <dir>` plays phase 3 with real keys and checks the
  save after a reload.
- Next: a way to let a creature go (or trade one out when you're full),
  creatures coming to the gate to greet you, a lantern on the stable at
  night, and feel passes on the pasture size and the build zones.

## Wild creatures and biomes (ten new mounts)

- **One base class, `mobs/beast.ts`.** The stelk's brain and body plan made
  general: herds find a spot by a per-species `habitat(site)` score
  (`Site` = height, slope, forest, bog, glimmer, hollow, rock, night),
  idle there (graze/look/step), wander on, bolt when rushed; tamed ones
  follow on the lead, wait at `stay`, live at the stable (`herd.ts` needed
  nothing new). Fliers (the moonmoth) get a hover brain instead of `move`
  (lazy loops, resting on the ground by day). Each species file supplies
  geometry, a skeleton (`build`) and a `pose`; shared helpers do legs
  (`makeLegs`/`poseLegs`, the stelk's swing), gait blending (`gaitMix`),
  foot lift, eyes, seat, saddle (`saddleGeometry`) and collar. The stelk,
  crow and floof are untouched (the stelk only exports `sculpt`/`taper`).
  `mobs/shapes.ts` has the small shape helpers; `mobs/beasts.ts` lists them.
- **Spawning:** the manager keeps `Species.herds × settings.beastHerds ×
  density` herds of each new kind, newcomers every `Species.every` s. Only
  two habitat searches per 0.5 s tick, and a failed search (nowhere suitable
  nearby) waits 4-9 s: every sample costs a few `height()` calls.
  Debug panel: Creatures → "Spawn the wilder creatures".
- **Riding: `MountTrait` in `movement.ts`.** `gallopUpdate` (the stelk's
  mode) grew optional traits, all off for the stelk (its behaviour is
  unchanged line for line): `slopeDrag`/`maxClimb` (mossback climbs
  anything; the others stall on slopes past their limit), `grip`/`brake`
  (the hare slides wide and takes ages to stop), `leapFwd`/`airTurn`
  (rockhopper and hare bounds), `cling` (the wurm: boulders are floor via
  `ramp`, never runs off a ledge), `thicket` (the brambler: `collide` gets
  `noTrees`, and a forest speed bonus), `mudder` (bog mud slows everyone
  else to 55%), `diver` (the bog hag: C dives, Space rises, leaps out at
  the surface), and `ability` on Space: `phase` (0.42 s ghost dash, only
  towers block), `burrow` (underground 1.4 s, +1.2 s in bog; the rider is
  hidden, `main.ts` trails mud), `charge` (static builds 1/45 per metre run,
  needs 0.3; 30 m/s, low gravity, rides over rocks up to 1.8 m, trees
  knocked down via `story.knockTree`, creatures flung by `Mobs.shove`).
  `GallopState` carries the ability state and a one-frame `fx` for effects
  (`beastWork` in `main.ts`: mud, glimmer and spark puffs).
  The moonmoth uses the ordinary flying ride with a new `fly.ease` (0.8:
  floaty). Prompts read `Species.verb`.
- **Glow:** creature paint tag 4 = its own colour, self-lit (0.3 by day,
  0.75 at night emissive). Glimmer spots/ears/tail, moth eyespots, hare
  ears and tail, stormback sparks, the mossback's glowcaps.
- **Biomes (`worldgen.ts`):** `bog`, `glimmer`, `hollow`, from five new
  Simplex fields seeded after the old ones (so every old field is as it
  was). Bogs and hollows are carved into `height()` via `wildCarve`, after
  the base height: the story site, towers and POIs are all placed on the
  base height, so they don't move. `wildRoom` fades both out round the
  story box, towers, POIs (cabins, circles, erratics) and the journey's
  routes; the journey is planned on `tameHeight` (no carving) and
  `forestBase`, so it's exactly what it was. Verified: story site, towers
  and journey routes identical to master on hilda, 42 and fjord, and the
  vista/cabin shots are pixel-identical. Bogs thin the forest
  (`forestDensity` × (1 - 0.85 bog)); the story, towers and POIs use
  `forestBase`. Coverage of land on hilda (6 km square): bog ~11%, glimmerwood ~9%, hollows ~2%.
- **Terrain look:** `aBiome.w` (it held the unused flower mask) is now
  bog − glimmer: bog moss / wet peat, glimmer moss. New prop kinds 25-28
  (cattail, glowcap, toadstool stalk, reed blade); flowers have variants 2
  (reeds, in the shallows) and 3 (glowcaps, shining after dark).
- **Perf:** frame time unchanged (uncapped avg 4.7 ms vs 5.1 on master,
  same machine). Chunk builds are ~25% slower (2.5 → 3.2 ms): the extra
  noise in `height()`. New creatures add ~10 batches each, drawn only when
  one is visible.
- **Scripts:** `scripts/beasts.mjs <dir> [names] [look,ride]` (turntable,
  ride, run and Space for each, logs speeds and ability state),
  `scripts/biomes.mjs <dir> "name:x,z,yaw,pitch,dist,hour;..."`,
  `HERD='[["glimmer",2]]' node scripts/stable.mjs` for a pasture of other
  kinds. `__ow.rideState()` reads the ability state.
- **Limitations / next:** no true caves (height field), so "caves" are the
  hollows; the wurm clings to steep walls, not ceilings. No health or
  damage anywhere (the no-combat pillar); the charge shoves and spooks.
  Wild creatures don't use their tricks (a wild glimmer doesn't phase, a
  wild mudsnoot doesn't burrow). Burrowing/phasing through a cabin can
  leave you pushed out the near side if you stop inside. The hollows'
  walls are steep enough to facet at far LODs. Feel passes on every mount
  still wanted; sound for the new tricks.

## The far-off pointer and the spirit's earshot (2026-09-30)

Playtest: walk far from the cabin at the start and you still heard the
spirit, with no idea where or what it was. Two changes:

- `story/pointer.ts`: an HTML arrowhead (icons' fill and ink), off screen on
  an inset edge pointing out, on screen over the target pointing down. It
  only shows after 15 s away (`DELAY`), so the opening walk down the path,
  and stepping off for a look round, stay unprompted. The goal comes from
  `Journey.guide()`, which falls back to `Story.guide()`. It's the spirit for
  most steps (it's always where the job is), the tower door at a lock, and
  the cabin while the stable waits. It's null while gathering, resting, or
  herding without a creature on a lead. It's hidden during cutscenes and
  the tower view.
- The spirit's sounds (the `Spirit` sound hook, and every chirp in story.ts
  and journey.ts through `Story.chirp`) fade with distance: full within 50 m, silent by
  110 m (`EARSHOT`, via `Story.voice` and `Sfx.level`). A hard 45 m cutoff
  was tried first, but it silenced the hint where the spirit stops at its
  yard edge (45 m from the cabin) and calls you back from further out.
- The journey's gift and lock stages had no idle hint (story.ts only hints
  while it has the spirit, and the journey borrows it), so at a tower the
  spirit just pointed silently. `Journey.nudge` now runs the same hint (walk
  over, tug your coat, call, point) after 20 s without progress while you're
  within 40 m. The enter stages are left to the tower ushering.
- At an open tower (journey `enter1`/`enter2`) the spirit ushers you in
  rather than just pointing. `Journey.byDoorway` stands it just outside the
  doorway's edge (0.3 sx + 0.9 m across, stepped out of rock), and
  `Want.usher` (the doorway) drives a cycle in spirit.ts (`USHER_CYCLE`).
  Turned between you and the opening, it holds the near arm out to you, sweeps
  it round into the doorway with a hop, holds it, then drops it. It chirps on
  the first three sweeps only. The 'up' bubble stays. `scripts/usher.mjs`
  shoots it.
- Journey checkpoints: a reload used to put everyone at the cabin doorstep
  with the saved stage, so at a tower stage the spirit walked all the way
  there. The saved stage is now the checkpoint. `Journey.resume()` (after
  the spawn and bike reset in main.ts) handles each stage. `ride1` starts
  at the cabin with the spirit by its bike up the path. `ride2`, `lock*` and
  `enter*` put you 7 m in front of that tower with the gift bike, and the
  spirit's bike where the ride ended. `wait`, `gift` and `done` spawn as
  before. A ride always starts over from its start line.
- At the start of a ride, if there's no free bike within 30 m of you (you
  walked there, or yours is back home), the spirit conjures one for you
  (`gift`, which moves it from wherever it was) before it gets on its own.
- `Journey.jump` now saves the story too, so `?journey=` survives a reload.
- Phase 3 foreman: the stable's gather and build steps anchor the spirit at
  `stableBase` (`Stable.base`, the middle bay, 0.8 m in from the open
  front). `enterStep` sets `Want.fetch` on stable gather steps. That's the
  nearest world rock or tree from its spot (`Story.source()`, re-picked every
  3 s as things get taken; trees fall back to `woods`). On build steps it
  sets `Want.present`. spirit.ts runs a `FOREMAN_CYCLE` (5.2 s): fetch =
  point at it with a hop and chirp, then face you and beckon; present =
  both arms wide, looking at the sketch. It chirps on the first three
  cycles only. The idle hint for these steps is `Spirit.nudge()`: a call and
  the cycle restarted, plus a glint boost. It no longer walks to you and
  tugs you to a tree. Gather steps in this phase also show the sketch of
  the parts they're for. Phase 1 is unchanged.

## The lasso lesson and the first creature's welcome (2026-09-30)

Playtest: with the stable built and the lasso taken, the spirit only stood
at the gate pointing, leaving you to work out catching on your own. Once the
first creature was home it cheered from where it stood, still looked like it
wanted something (the herd step's `lead` defaulted on, so it beckoned and
called whenever you were off hunting), then walked straight to the hearth
and sat down. Now:

- **A new `catch` step kind** (phase1.ts, before `herd`): done once a creature
  that doesn't live here yet is on your lead (`Story.leadingHome`). `herd`
  now names its `catch` step. With nothing on a lead for 2.5 s (you let go),
  it goes back to catching, like build falls back to gather.
- **The lesson's creature** (herd.ts `lesson()`): during `catch` a single
  calm stelk is spawned 19-28 m out from the gate, in a ±70° arc, on flat
  dry ground, clear of the fence and cabin, within the spirit's yard. It's
  spawned out of view if possible, and anywhere after ~8 s of trying. It's
  respawned if it's lost (despawned or more than 90 m off). `flock.data.calm`
  (stelk.ts) shrinks its scare radius to 3 m (6 m if you run or ride up) and
  its flee to ~10 m, and stops it wandering off to new grass. That makes it
  catchable for small kids. Calm is cleared once the lesson's over.
  `Story.quarry` is a creature you let go of if there is one (walk up and
  lead it again), otherwise the lesson's stelk.
- **The pantomime** (`Want.lasso`, `LASSO_CYCLE` 4.8 s in spirit.ts): the
  spirit leads you out and stops 10 m short of the creature, on the gate
  side, never inside the fence. There it turns to the creature and whirls
  a little rope loop overhead (a torus in the rope's colour, on its right
  hand; the other arm is out for balance). It flings the loop in a lob that
  opens out, drops over the creature's head and fades. Then it turns to you
  with a hop ("now you"). It chirps on the first three throws only. The
  bubble shows the lasso. The pointer leads to the spirit, as for any step.
- **Leading it home**: the herd step now ushers (`Want.usher` = the gate),
  stood at `gateOut`, with `lead: false`, so no more beckon-and-call while
  you're away. The gate also swings open for the spirit whenever it's
  walking (`Spirit.travelling`), so it never walks through a shut gate.
- **Praise** (`onDone: 'praise'`, `Spirit.praise()`): it runs over to you
  (from within 30 m), then does a big jump with two spins, arms up,
  sparkles, three hearts (`hooks.hearts` → `Story.hearts`) and a coo, and
  keeps its happy eyes for a few seconds. It replaces the welcome's own
  celebrate.
- **Then quiet**: the `ranch` rest step in phase 3 doesn't chirp on entry.
  The spirit stands at `fenceView` (just outside the fence) watching the
  pasture for 30 s, then potters as usual (yard spots, gate, stable front,
  and the fire now and then). Later arrivals still get the plain celebrate.
- Bug fixed on the way: act timings tested `t - dt < k && t >= k`, which can
  miss `k` entirely to float rounding (it did for the hearts at 0.5 s at a
  steady 1/30 s step). Acts now compare against the time before the frame
  (`passed(k)`). Pat coos used the same test and are fixed too.
- `scripts/lesson.mjs` shoots it all (the twirl, throw, ushering, cheer,
  afterwards). `scripts/stablerun.mjs` now lassoes the quarry the spirit
  shows it instead of spawning its own.

### Riding before it's yours
- Changed my mind on "led but not ridden": a lassoed creature can be ridden
  bareback at once (`Mobs.mountable` no longer needs `stabled`). `stabled`
  now just means *yours*: the saddle (already drawn only when `stabled`),
  coming home, and not going wild when left behind.
- Riding one counts as leading it home: `Story.leadingHome` and the gate's
  opener list (`gateFor`) include a ridden, unstabled mob, so the herd step
  doesn't fall back to "catch one" while you're on it.
- Ridden in through the gate, the welcome skips the hop, the `species.reset`
  and the new pasture spot (the rider's brain is in charge; `reset` would
  clear a beast's ride state `gs`). Climbing off resets it as usual.

## Drakitten (rocket cat)

- **`mobs/drakitten.ts`**, a `Beast` flier. Kawaii proportions (head as wide
  as the body), two-piece dragon wings (arm + hand; the arm's Euler order
  is `ZYX` so folded wings stand on edge along the flank), hook tail, tabby
  stripes as separate shell batches shown only on the tabby coat.
- **Base changes (`beast.ts`)**: a `Draw` can take a per-mob `THREE.Color`
  instead of the coat tint (wing membranes, flame, whiskers per coat);
  `d.s.coat` records the coat index (-1 rare); fliers' resting is the
  overridable `resting()`; `findSpot` is protected.
- **Shader**: creature looks can have `gloss` eyes (no whites, pupil-colour
  eye with two glints; `aEye.w` swaps ink for `iris`, used for the dark
  coat's gold eyes) and paint tag 5 = fire (always emissive 0.85, toon
  bands by facing so it reads as a white-hot core in any view).
- **Rocket (`movement.ts`)**: `fly.rocket {speed, climb, burn, cool}`. In
  the air Shift burns instead of sprinting; thrust drives along the heading
  even with the stick released; heat builds over `burn` s, then it's
  overheated until below 0.35. Flight collision is sub-stepped (0.5 m).
  `GallopState.rocket/heat/overheat`, fx `ignite`/`fizzle` (`rocketWork`
  in `main.ts`: smoke burst, sputter). Smoke trail: `MobCtx.trail` →
  `smokePuffs` (140 pool).
- **Arrivals**: non-initial herds pick a visible spot 50-170 m off and
  start 260 m beyond it out of view; they cruise high in a V at ~40 m/s,
  then flip butt-down (`upr`) and descend no faster than a 5 m/s² burn can
  stop, landing on pads 2.4 m apart. A herd moving on (`walk`) hops the
  same way. Flock mode `arrive` until all are down.
- **Dev**: `__ow.drakArrive()` lands a crew in front of you (in the
  cabin's front yard if you're home). The landing 2.5 s after every load
  was a test and is gone (2026-10-02); `drak=0` in the scripts' URLs now
  does nothing.
- **Script**: `scripts/drakitten.mjs <dir> [land|look|ride]`.
- **Next**: rocket sound; a heat gauge; a perf pass with several crews in view.
- **Wurm: snake steering and wall climbing (`movement.ts`).** New trait
  `snap`: Snake controls, relative not camera-relative. `GallopState.crawl`
  (W or a turn sets it, S clears it) keeps it going with no stick held; a
  press of stick x past 0.5 (edge on `stickX`) turns the heading exactly
  90°. Accel 45 / brake 60 m/s², so `turn`/`gather`/`brake` don't apply.
  Speeds 6.5 / 11.5. With the mouse idle `main.ts` swings the camera behind
  (rate 5) so left/right stay the wurm's. On a wall a turn reverses
  up/down. The body follows the head's recorded trail by arc length, so a
  turn shows as a right-angle kink running down the body. Trail bug fixed
  on the way: it used to lay a point only when the head moved more than
  `TRAIL_STEP` in one frame, so below ~7 m/s trail[0] just dragged along
  and the tail cut straight across to a stale point; now points are laid
  every `TRAIL_STEP` from the last one laid. Climbing: new
  `WorldQuery.climbTop` (chunk cabins via `Colliders.cabinTop`, the story
  cabin via its `surface` with no step limit). A grounded clinger pushing
  into something whose top is more than 0.5 m above its feet enters
  `GallopState.wall = 1` (`climbWall`): xz held at the face, the stick
  into the wall climbs, away climbs down, sideways shuffles along it; it
  pulls over onto whatever is `radius` past the lip once level with it.
  Walking off a drop of more than 1.2 m enters `wall = -1` (nose down the
  face) instead of snapping to the ground. The wurm pitches its head along
  its own trail when ridden (vertical on a wall) and counter-tilts the
  seat by 55% of the saddle segment's pitch so the rider hugs it rather
  than lying flat. Trees and landmarks aren't climbable (no top to crest).

## Direction change: the giant (2026-09-30, docs only, no game code yet)

The owner changed the story and core loop. `DESIGN.md` has the direction
("The giant" sections), the open questions and a numbered list of conflicts
with what's built. This entry is the how: what the code already gives us,
what's missing, and the first slice. Nothing below is built.

### Docs vs code, found while reading everything
- `README.md` said "There are no goals; just walk" and listed sandbox keys
  only. The game has had a story since phase 1. Fixed.
- `DESIGN.md` said "ten more creatures" and "the thirteen"; `beasts.ts`
  makes eleven (the drakitten), so fourteen with floof, crow and stelk.
  Fixed. `CLAUDE.md` said "ten wilder kinds" too. Fixed.
- `docs/WORKFLOW.md` "Where to pick up" listed chimney smoke and colliders,
  both long done, and its URL params left out `story`, `fresh`, `journey`,
  `stable`, `mobs`, `bikes`, `drak`, `debug`. Fixed.
- This file's early sections ("No goals", "No collisions" under known
  issues, the "What I'd do next" list) are stale but they're the log as it
  was written. Left alone; later entries supersede them.
- `mobs/types.ts`'s header comment says a mob can be ridden only once
  stabled. `Mobs.mountable` takes any tamed mob (bareback riding). The
  comment is stale; the code and DESIGN.md agree.
- A lot of this is uncommitted in the working tree (drakitten, the lasso
  lesson, the pointer, the wurm's snake steering, the usher).

### What the new direction can reuse
- **Scripted events with the camera taken:** `cinematic()` on beacons,
  journey and story feed one camera slot in `main.ts` with an eased blend;
  `busy` freezes input. The giant event is another provider.
- **Guaranteed, seeded set pieces:** `storySite.ts` (start area),
  `towers.ts` (a network grown so it always connects), `WorldGen.route`
  (A* paths that avoid water, the cabin, POIs). The trail and dungeon sites
  are the same kind of thing: authored order, seeded placement.
- **Terrain that story shapes:** the brook and the pasture are carved or
  eased into `height()`; `storyBlock` keeps scatter off the set. Footprints
  can press into `height()` the same way.
- **Props removed without rebuilding chunks:** the harvest flag texture
  hides any tree or rock by cell; `Story.knockTree` lays a tree flat.
  Flattened trees in a footprint are that.
- **Locked building:** `build.ts` (sketch, slots, the snap-in pop) with the
  cabin and stable as `Buildable`s, phases as step tables (`PhaseDef`).
  Village growth and the giant's cabin are more tables and more parts.
- **Pictograms:** `icons.ts` bubbles and badges. **Gestures:** the spirit's
  `Want`s (point, usher, fetch, present, lasso pantomime).
- **Ability keys:** `MountTrait` (`diver`, `cling`, `thicket`, `mudder`,
  `ability: phase | burrow | charge`), fliers, tag-4 glow.
- **A walk-in room with its own collider and camera clamp:** the tower's
  door boulder (`towerRock.ts`, `Beacons.clampCamera`). The only interior
  precedent besides the story cabin's cutaway.
- **Effects:** `Puffs` (opaque toon dust and steam), emissive + bloom for
  warm glow, ground contact discs (`uMobShadow`), the ground shadow mask.

### What's missing
- A village (worldgen room for it, small houses, several spirits at once:
  `Spirit` is a single instance today, lent between story and journey).
- The guide off its 45 m leash (`Spirit.range`).
- Any dungeon: room kit, room colliders, a camera that works under a roof,
  pushables, water levels, darkness, the backward generator.
- Phase- and burrow-proof walls, and a no-fly rule or lids.
- An emote wheel (input, touch UI, rig poses) and creature reactions.
- A small-gap creature.
- Carry limits and upgrades (nothing caps logs or stones today; the lasso
  is a fixed 24 m).

### The giant, technically (a plan to check against screenshots)
- **Body:** a skeleton of Object3Ds posed in code and drawn as instanced
  parts, like the creatures, but in the *terrain's* look rather than the
  creature shader: boulder meshes for limbs, a turf back, real conifer
  instances on the shoulders, the snow rule on its head. It should write
  the G-buffer as terrain does (normal length 1.0) **so the layer-fog pass
  treats it as a ridge** and flattens it to one tone at distance. That is
  the single most important trick for scale; if it's tagged as a prop it
  will fog per pixel and look like a toy.
- **Far LOD:** past the chunk range, a silhouette card in the overlay
  scene, as the tower camera draws far towers.
- **The warm load:** emissive ≥ 0.5 so the grade and the night can't cool
  it, feeding bloom. Spirits in hand are instanced glow blobs.
- **Gait:** slow (a step every ~2 s), foot IK onto `height()`, heavy
  follow-through in the shoulder trees (they already sway by instance).
  Each footfall emits: a `Puffs` ring, a camera dip (the landing spring in
  `orbitCamera`), a thump with distance falloff, and harvest-flag knocks
  for trees under the sole.
- **Its shadow:** the ground shadow mask only reaches 180 m and takes prop
  casters; the giant needs its own cheap term in the terrain shader (a few
  capsules projected along the key light), which is also what darkens the
  yard before the reveal.
- **Footprints:** a seeded list of prints along the authored trail
  (`WorldGen`, pure, same in workers). Each presses a sole-shaped hollow
  with a raised rim into `height()` (only near the trail, so the cost stays
  off ordinary chunks), blocks scatter inside, and marks the terrain's
  per-vertex biome data so the fragment shader paints the warm floor with a
  hard edge. Steam is one `Puffs` pool on the nearest few. Night glow is a
  low emissive on the floor. Warmth (0..1 by distance along the trail from
  the giant) drives colour, steam and what grows in it.
- **Budget:** the giant must fit the frame budget while a village's worth
  of debris is flying. Measure with the perf script before polishing.
- **Verify the way everything else is:** a `scripts/giant.mjs` that
  frame-steps the event and shoots each beat, plus far, dusk and night
  shots of the giant on the skyline and of a trail going over a hill,
  compared against `/inspo` 1, 3 and 4.

### Giant slice 1 (agreed with the owner; start here)
The smash, the taking and the footprint trail, ending at a sealed dungeon
entrance. **The dungeon is not in this slice.** DESIGN.md has the player's
view ("Giant slice 1" under Player Sequence), the look brief ("The giant:
how it has to look") and the owner's answers to the conflicts. Build in
this order, and show the owner screenshots at the end of each step before
going on; the look is the point.
1. **The giant on the skyline, standing and walking, at three distances
   and three times of day.** No story. If this isn't beautiful nothing else
   matters, and it proves the fog-layer trick above.
2. **Footprints:** six prints over a rise near the cabin, fresh to cool,
   day and night.
3. **A minimal village:** a few intact spirit houses near the cabin, each
   with a spirit (`Spirit` is a single instance today). Size, count and
   whether the start site needs more room are not decided: propose, with
   shots, and ask.
4. **The scripted event,** fired once the hearth is lit (the end of phase
   1 as built): the tells, the reveal, the wade through the *other* houses
   (the house you repaired is not smashed), the taking, the guide missed,
   the giant leaving. Camera taken, input off, under about 40 s.
5. **The trail** from the village to a seeded spot some way off, ending at
   a dungeon entrance sealed by a translucent forcefield (alpha only exists
   in the overlay pass; see `story/overlay.ts`). The guide tries it and
   can't open it. That's the end of the slice.
6. **A script** (`scripts/giant.mjs`) that frame-steps the event and
   shoots each beat, plus perf with the event running.

Decided and affecting this slice: the giant is cold, not an ice giant; the
guide will ride in the rucksack and become the direction pointer, replacing
`story/pointer.ts` (how it points is proposed in DESIGN.md, not yet agreed;
not required for this slice).

Not decided, so ask rather than guess: how the giant carries the spirits;
what happens to phases 2 and 3 (bike, towers, stable) in the new order
beyond "the giant comes right after the hearth"; whether the smashed
houses stay wrecked; what opens the forcefield.

Later slices: the dungeon (its own enclosed scene, big rooms, tight
camera, first one gated by the bog hag's dive), rescue and return, village
growth, the emote wheel, side content, the finale.

## Giant slice 1, step 1: the giant on the skyline (2026-09-30)

Built: the giant itself, standing and walking, with no story driving it.
`src/giant/giant.ts`, `GIANT_VERT/FRAG` in `shaders.ts`, `makeGiantMaterial`,
a dev hook and `scripts/giant.mjs`. Steps 2-6 are not started.

- **Body:** about 60 pebble boulders (three shapes, instanced, 3 draw calls)
  on an Object3D skeleton, plus ten real conifers (lod 1) as plain meshes on
  the torso bone. About 116k triangles and 7-13 draw calls; no LOD needed.
  It stands about 82 m: a turfed hump over a head sunk between the shoulders,
  limbs as strings of pebbles, soles of 12.5 x 8 m with three toes.
- **Terrain's look, not the creatures':** colour is a rule stack with hard
  noise-wobbled edges: stone, turf and moss on the tops, snow above a line.
  The caps are measured in each boulder's *rest* pose (`aUp`), so turf and
  snow ride with the stone instead of sliding as it leans. Pebble normals are
  70% sphere normals: the lumps show in the outline, the toon bands stay
  clean curves (raw normals contoured every bump and looked muddy).
- **The fog-layer trick, as built:** it writes normal length 0.8
  (`uIsProp = 3`). The layer pass treats anything over 0.71 as terrain, so
  it defines a layer like a ridge; the composite then recognises 0.8 and
  fogs the whole giant by one distance (`uGiant`, camera to chest), so no
  fog band can ever cut across it. Lighting flattens to one tone between
  350 and 1300 m, the same rule as far terrain.
- **Cold:** stone `#9db3d6` (the cold spirit's ash blue, a little deeper)
  with `uKeep` 0.72, so the grade can't warm it away. At 0.55 it went khaki
  under the golden palette.
- **Face:** the towers' superellipse eyes painted on the head boulder, with
  a stone lid drawn half down (`uLid`), a slow blink every 4-9 s.
- **Gait:** feet are planted on prints (`print(n)`, on `height()`), each
  swings two strides to its next print; legs and arms are two-bone IK. The
  pelvis rides as high as the shorter leg allows (a spring), sways over the
  standing foot and twists with the stride; trees lag on springs. It eases
  off from standing (a half first step). `hug` blends the arms between
  swinging and wrapped round itself. It breathes
  out flat-bottomed puffs (`Puffs` got a `flat` option). Each footfall calls
  `onStep`: a dust ring and a camera dip that falls off over 900 m.
- **Stride is 42 m, not the 45 in DESIGN.md.** With 39 m legs, 45 pulls the
  hips too low at double support. Footprints (step 2) should use
  `Giant.print(n)` so the trail and the feet agree; say if 45 matters more
  than the leg length.
- **Not in yet, from the look brief:** the warm load (waits on "how does it
  carry them"), clouds at its shoulders (sky clouds are a dome at infinity,
  they can't sit in front of it), crows round its head, its ground shadow,
  the crouched "it's a hill" pose and getting up, stopping and turning.
  No sound.
- **Dev:** `?giant=<metres>[,walk]`, `__ow.giantAhead(dist, face, walk)`
  (stands it in clear view, about level with you), `__ow.summonGiant(x, z,
  heading)`, `__ow.giant()`. `scripts/giant.mjs <dir> [skyline,walk,gait,close]`.

### Owner's review of step 1 (2026-09-30)
Scale, vibe, face and the top of it: good. Changed: feet and ankles much
bigger (soles about 21 x 14 m, so the prints are that size too, not the 12 x
7 first written); arms swing by default; the constant self-hug is gone
(an occasional "brrr" shiver replaced it, and was removed on 2026-10-01: it
didn't read well; `hug` stays for the dormant pose). The 42 m stride
stays. The blue is "ok for now", not settled. Asked for and not built yet:
it smashes whatever is in its path whenever it walks (trees, rocks), and
its footprints are permanent. Both belong to step 2 (prints pressed into
`height()`, harvest-flag knocks under each sole from `onStep`).

## Giant slice 1, step 2: footprints (2026-09-30)

Built: every footfall leaves a print for good and flattens what stood
there, wherever it walks. `src/world/prints.ts`, `src/giant/trail.ts`.

- **Not in worldgen, and no chunk rebuilds.** The plan was to press prints
  into `height()`. But they only exist once the giant has walked, so they
  are story state like the harvest flags, and the world stays a pure
  function of the seed. A 512 x 512 float texture holds one print per 12 m
  cell (x, z, heading, number); prints are always further apart than a
  cell can span, and the newest wins.
- **The hollow** is pressed in by the terrain *vertex* shader (1.9 m deep,
  a 0.5 m squashed rim) from an analytic sole shape: an oval and three
  toes, about 21 x 14 m, the sole as built. Near chunks have 2 m cells, so
  the mesh hollow is soft; the *fragment* shader redoes the shape exactly
  for the colours, the normal, and a painted shadow: the wall that faces
  away from the light and the crescent it throws on the floor. That
  crescent is what makes it read as a hole; the real normals alone didn't.
- **Walking in it:** `Trail.height()` is the ground plus `Prints.offset()`
  (the same functions in TS as in `PRINT_GLSL`; keep them in step). The
  player, the camera floor and creatures use it. `gen.height()` itself is
  untouched, so anything that calls it directly (towers, story props)
  doesn't know about prints.
- **Warmth** is by number, not time: a print is as warm as it is close
  behind the newest (`uPrintCool` = 9 prints), in four hard steps. Warm
  floor is rose-amber and keeps its colour through the grade; after dark it
  is self-lit (emissive 0.5+, which skips the night grade and blooms): the
  string of lights. Cold floor is whatever the ground was (grass grows
  back); the walls and lip stay bare earth for good. Warm floor also melts
  snow (it's painted after the snow rule).
- **Smashing:** world props whose base is inside a sole are hidden on the
  GPU (`trodden()` in `PROP_POSE`, opted into by terrain's prop and caster
  materials with `prints: true`; landmark boulders are spared) and dropped
  from collision. Trees among them are redrawn pressed flat, crown away
  from the middle of the sole (up to 90 kept, oldest cleared).
- **Steam:** small flat-bottomed puffs off the ten newest prints, more the
  warmer.
- **Not done:** no print in water or shallows (ground under 0.6 m): the
  puddle is later. Flowers and glowcaps blooming in warm prints, creatures
  gathering in them, cracked boulders (rocks just go). Flattened trees
  don't survive a reload, and nothing is saved yet (no story uses it).
  Prints on LOD seams can show a hairline crack. Flat trees shade dark
  (squashed normals).
- **Shots:** `node scripts/giant.mjs shots/giant prints`.
- **Owner's review:** the first shape (an oval and three toe circles) read
  as a cartoon bear's paw. Now a square-shouldered slab, broader at the
  front, with two cracks in from the front edge; the foot's toes became
  three blunt blocks along its front to match.
- **To plan before step 5 (owner):** the real giant must take a route you
  can follow: not over mountains, not through water. Today it walks a
  straight line or an arc over anything. `WorldGen.route` (A* that avoids
  water, the cabin and POIs) is the starting point, but the giant needs a
  wide, gently turning corridor, a slope limit, prints that never land in
  water, and its feet and the trail's prints coming from the same list.
  Needs real planning with the owner; not started.

## Giant slice 1, step 3: the village, rough (2026-09-30)

A rough version to choose from, not the village. `src/story/village.ts`,
dev only: `__ow.village({ n, size, rMin, rMax })` or
`?village=<n>,<small|mid|big>,<rMin>,<rMax>`. Shots:
`node scripts/village.mjs shots/village [seed=..] [only=a,b,c]`.

- **Deliberately not in worldgen.** Size, count and room aren't decided, so
  nothing in `storySite.ts` moved. Spots are picked on the main thread from
  what's there: dry, near-level, clear of the cabin, brook, grove, boulders,
  paths and pasture, and with no world tree or rock standing on them.
- **Three options shot** (seeds hilda, 42, fjord): (a) four spirit-sized
  huts, about 2.3 m to the ridge, within 20 m of the yard; (b) five of the
  same hut at 1.8x, about 4 m to the ridge, within 30 m; (c) three of the
  world's full-size cabins, within 46 m. Each with one footprint stamped in
  the yard for scale.
- **Room:** every option fitted on all three seeds without moving anything
  (5 to 18 free spots; full-size cabins are tightest at 5 to 7). So the
  start site doesn't have to grow for a village of this size. The real one
  still wants its houses in `StorySite` (placed after the cabin, so the
  cabin doesn't move) for `storyBlock`, levelled pads and paths to the yard.
- **Found:** a sole (21 x 14 m) is bigger than the guide's cabin. One
  footfall covers two or three spirit-sized huts at once; and at a 42 m
  stride, "three or four footfalls through the village" needs about 130 m
  of village, or a giant that shortens its step there.
- **Rough edges, known:** no colliders, no ground shadows, no levelled
  pads, no paths to the doors, every spirit is a whole `Spirit` (4 draw
  calls each; they lose their glow at night), hut smoke is too small, the
  mid hut is a scaled-up small one (window too big).

### Owner's answers (2026-09-30), and what was built from them
Mid-size houses (about 4 m to the ridge), five of them with room left for
more ("cabins maybe, but just stuff"), along a lane about 120 m long.

- **In the start site now** (`findVillage` in `storySite.ts`,
  `StorySite.village`): a gently bending lane out of the yard, 125 m (105 if
  nothing longer fits), no step steeper than about 1 in 4, clear of the
  brook, grove, boulders, pasture, the way you arrive and the far light's
  sightline. Five house plots on alternate sides, 21 m apart (one giant
  footfall) and 9 m off the lane; a free plot faces each where the ground
  allows (8 to 10 plots in all). Plots are 4.5 m level pads eased into the
  ground over 6 m; `storyBlock` keeps them clear; the lane and each door's
  path are story paths; `WorldGen.route` goes round the plots.
- **It is placed last and is optional,** so the cabin, brook, pasture and
  far cabin are exactly where they were on every seed. The start site's box
  grew to hold it, which can shift the home tower and the wild biomes' edge.
- **It doesn't fit everywhere.** Of 40 seeds, 27 get a lane (26 full
  length) and 13 get no village at all; `hilda` and `42` do, `fjord`
  doesn't. Making it a requirement of the start site would fix that and
  move the cabin on about a third of seeds. Not done: the owner's call.
- **`src/story/village.ts`** is owned by `Story` now (drawn with the story
  on or off): three hut shapes at 1.8x (red, timber with a moss roof, tall
  red), lit windows, chimney wisps, ground shadows, walls you can't walk
  through and roofs you can land on. A `Spirit` on each doorstep, warm,
  settled, watching the lane. `__ow.village()`; the rough ring options and
  `?village=` are gone.
- **Not done:** the free plots are just cleared grass (no markers); the
  spirits are five whole `Spirit`s (20 draw calls) with no sounds, no pats
  and nothing to say; all five are warm from the start (whether they start
  cold and warm with your hearth isn't decided); nothing can be smashed
  yet (step 4); the giant's track (feet 14.5 m either side of its line) and
  the 9 m plot offset haven't been matched up, which is part of planning
  its route. Perf not re-measured (about 30 more draw calls near home).

### Owner's second round (2026-09-30)
- **Every seed gets a village.** Room for the lane is now a requirement of
  the start site (strict pass), so the cabin moves on the seeds where it
  didn't fit. 40 of 40 survey seeds have one (2 with the 105 m lane; 9.2
  plots on average). Which seeds moved wasn't listed; old saves on those
  seeds will find the cabin elsewhere.
- **Only the guide starts cold.** The other spirits are warm from the
  start, as built.
- **Houses stand where the giant's feet fall** ("use good judgement"): the
  giant's track is 14.5 m either side of its line, so the plots moved from
  9 m to 14.5 m off the lane. Walking down the middle of the lane, each
  footfall (every 21 m, alternate sides) can land on a house; the free
  plots facing them fall between footfalls. Not yet tried with the giant
  itself: lining its first step up with the first house is step 4's job.
- The scale (one sole takes one house) is approved. Step 3 is done.

### Decided for step 4 (owner, 2026-09-30)
- **The giant carries the spirits cupped to its chest.** No lantern or sack.
- **Smashed houses stay smashed.** When a spirit is freed it starts mending
  its own house; that takes wood and stone, and you probably help. How
  exactly isn't settled (a later slice: rescue and return).

## Giant slice 1, step 4: the visit (2026-09-30, first pass)

Built: once the hearth is lit, the giant comes up the lane, treads on the
five other houses, gathers their spirits against its chest as warm lights,
misses the guide and walks off. `src/giant/visit.ts`; shots from
`node scripts/visit.mjs shots/visit [seed=..] [t=16.6] [after]`.

- **Where it treads is a pure function of the start site** (`visitRoute`):
  six or seven footfalls in from beyond the lane's far end (whichever puts
  the correct foot on the first house), one on each house from the far end
  to the yard, then fourteen more bearing off just enough to keep 26 m from
  your cabin and clear of the pasture, the grove and water. So a reloaded
  save puts the prints and the wreckage back without a replay
  (`Visit.restore`, `Story.giantGone` in the story save).
- **The giant walks a list of footfalls** (`Giant.walkRoute`): its feet go
  where they're told and the body rides half way between the last two. It
  stops on the last pair. This is the "feet and prints from one list" the
  step 2 notes asked for; step 5's trail can feed it the same way.
  `Giant.cradle` brings the left arm up to hold what it carries;
  `Giant.hold()` is where.
- **Smashing** (`Village.smash`): the house and its shadow go, 16 boards and
  7 stones (two instanced batches for the whole village) fly out, land in
  the print and stay. The spirit becomes a warm light (emissive 1.6) that
  arcs up to the giant's forearm over 2.4 s.
- **Beacons show through fog:** anything with emissive over 1.5 takes only
  15% of the fog (`post.ts`). Without it the lights went cream at 250 m.
- **The camera** (hard cuts between shots, a dip on every footfall): the
  guide stops and turns; from the yard, the giant coming down the lane; the
  wade from 250 m off to one side and 38 m up, the whole of it and the
  whole lane; the taking from level with its chest; the guide left behind;
  its going, from the side again. 40.5 s, a little over the 40 asked for.
  Shots from near the lane were tried first and failed: by the last houses
  an 82 m giant is on top of any camera in the yard.
- **Timing with the story:** it starts 4 s after the hearth is lit and the
  cheering is done; the bike gift (phase 2) now waits until it has gone.
  Phases 2 and 3 are otherwise untouched: what happens to them is still the
  owner's to decide, and a cheerful bike gift straight after is odd.
- **Not done, or rough:** no hand coming down to scoop (the lights fly up
  by themselves); the guide doesn't reach up (it stands and looks); no
  crows lifting, no brook ripple, no shadow sliding over the yard, no "hill
  stands up" (it is simply there, 250 m off, when the camera turns); house
  debris is tiny from the wide shot; the lights read yellow rather than
  amber; the stone doesn't warm to rose where they rest; sounds are the
  existing thud, smash, chirp and whimper; afterwards the giant just stands
  at the end of its route (about 300 m off) until step 5 gives it
  somewhere to go; a smashed house's free plot and wreckage have no
  collision. Only seed `hilda` was shot.

### Owner's review of step 4 (2026-09-30)
The lights cupped at its chest don't pass. New direction, replacing "cupped
to its chest": the giant opens a **jar** and the spirits are sucked into it
("something like that"). Not built; the details (where it carries the jar,
what the pull looks like) are being proposed first.

### Step 4, second pass: the jar (2026-09-30)
Owner: it pauses, struggles to open its jar, holds it out in front while
the spirits are sucked in, then the lid goes on, and it carries the jar at
its chest. If the camera is taken, the houses being destroyed must be seen.
The guide's close-up had no reaction.

- **The jar** (`Visit` makes it, the giant carries it: `Giant.jar`,
  `jarAt: 'hip' | 'out' | 'chest'`, `tug`, `lid`): pale glass about 14 m
  tall with a cork, on its hip on the way in. A step past the last house it
  stops (`Giant.pauseAt`, a whole number of steps so both feet are down),
  brings the jar out front, heaves at the cork three times, and it comes.
  The spirits, left cowering in their wreckage since their houses went, are
  pulled out one after another as stretched amber streaks that corkscrew
  into the mouth; the glass takes their colour and glows as it fills
  (emissive up to 1.55, so it shows through fog). Cork on, jar to the
  chest in the left arm, and it walks off. About 11 s of the 42.
- **Houses seen going under:** each house but the middle one gets its own
  shot from the lane beside it (26 m off, 3 m up); the middle one is the
  wide storybook shot. Boards and stones now start in a ring at the edge
  of the sole and are thrown high and wide (they were hidden under the
  foot), 26 boards and 8 stones a house.
- **The guide** has moods (`Spirit.mood`): 'scared' while the giant wades
  (trembling, wide-eyed), dragged a few metres down the yard by the pull,
  then 'sad' when the cork goes on: both arms stretched up after them,
  looking up, mouth turned down.
- **Shorter walk in** (4 or 5 footfalls before the first house, 2.0 s a
  step) to make room for the jar. 42 s in all: over the 40 asked for.
- **Still rough:** the cork is hidden under its hand during the struggle,
  so the tugging reads only as a wobble; the lifted cork is hard to see;
  the jar is opaque (no alpha outside the overlay pass), so the spirits
  inside are a glow, not five lights; the full jar reads yellow more than
  amber; the guide's mouth is small at that distance; the guide is not
  hidden behind anything when it's missed, it is just let go. Only `hilda`
  by day was shot this pass.

### Owner's review of the jar (2026-09-30)
The event is "pretty good"; the jar is "pretty lame". New idea, not yet
settled: the giant has flying minions that go down and snatch up the
spirits. Their style, where the spirits end up and whether the jar stays
are being proposed before anything is built. The jar code is still in.

### Step 4, third pass: the birds (2026-09-30)
Owner chose: the minions are the giant's own birds, and they keep the
spirits. The jar is gone from the code (`Giant.pauseAt` / `resume()` stay).

- **`src/giant/birds.ts`:** eight plump ash-blue birds, about 6 m across
  the wings, four instanced batches for the flock. No brain: `Visit` tells
  them when to roost, wheel, dive and climb. They roost on the treetops on
  its shoulders (`Giant.perch`) and wheel round its head (`Giant.crown`).
- **The beat** (about 8 s, the giant standing a step past the last house):
  they lift off together; five stoop down the lane, one to each cowering
  spirit, and climb back with it as a warm light slung underneath; a sixth
  stoops at the guide, which ducks, and goes up with nothing; the guide is
  left reaching up. From then on the flock wheels round its head with five
  lights, which is what you see from any side as it walks off, and what a
  reloaded save restores.
- **Camera for it:** the birds waking, from level with its head; one
  snatch from close by in the wreckage; the wide shot as the lights go up;
  the guide; the wide shot as it leaves. 39 s in all.
- **Not done:** the birds have no sound of their own, no feet and nothing
  holding the light; they don't sit on its shoulders during ordinary dev
  summons (`?giant=`), only in the visit; the two spare birds never land
  again. Nothing ties a bird to a dungeon yet (the idea: each dungeon frees
  one bird's spirit).

### Step 4, fourth pass: black crows (2026-09-30)
Owner: the round blue birds were too soft ("you are over indexing on the
kid game thing"); use the crow, "black black" and spookier. Also, a bird
"flashed in view" during the guide's close-up with no reason given.

- **The flock is the world's crow** (`crowParts()` exported from
  `mobs/crow.ts`: its body, head, wing and hand shapes), in soot black
  (instance tint about 0.3 on the crow's ink, `keep` 0.9 so the grade
  doesn't lift it), with blank yellow eyes: no pupil, lids slanted. Eleven
  of them, about 7 m across. Six instanced batches.
- **The miss is now a shot of its own:** from 15 m to one side, the crow
  comes in over the guide and goes up empty; then the close-up of the
  guide reaching. Before, the stoop went straight through the close-up's
  camera, which was the flash.
- **"Nothing scary" is loosened by the owner:** spooky is wanted where the
  story calls for it. DESIGN.md's pillar is reworded. Still no combat, no
  gore, nobody hurt.
- At 230 m in the leaving shot the fog lifts them to grey: they are black
  only up close. Not changed.

## Giant slice 1, step 5 (part 1): the long walk, the ring, the giant asleep (2026-10-01)

Owner's decisions going in: the route is mine to work out (passable, no
mountains or water, bikeable, "much farther"); about 1.5 km; the giant ends
by sinking into the ground so only the hill on top shows, or going dormant
as a rock pile; a tower on the way to the first dungeon if it can be had.
Also decided, **not built yet** (see DESIGN.md): dungeons are rings of
stones with a forcefield on the ground inside, opened by dark spirits the
giant sets free, which pull you *down* with black arms as the tower
spirits pull you up; and the order becomes house, first tower ride, giant,
then open world, with the second guided ride scrapped.

- **`WorldGen.dungeon`** (a `DungeonSite`: place, ring radius, the tower
  passed, and `way`, the route there from the yard). Candidates all round
  the village at 850-1600 m, on level dry open ground, well away from
  towers and the start; best first, and the first one `WorldGen.route`
  actually reaches wins. Four passes, from strict to lax (ground roughness
  and a hard slope limit of 0.34, then 0.5, then 0.7: `route` takes a new
  `steep` argument and refuses steeper cells). The way goes by a tower
  (130 m off it, because tower hills are steep) when one lies between a
  quarter and 85% of the way along and both legs route; else straight
  there. The wild biomes keep off the way as they do off the journey's
  paths, so no bog pool or ravine opens under it.
- **It is slow to find** (0.4 to 4.8 s; failed path searches are the
  cost), so the main thread finds it once per seed, keeps it in
  localStorage (`embla.dungeon.v1.<seed>`: bump the version if the
  search changes) and hands it to the chunk workers with each request
  (`ChunkRequest.dungeon`, `WorldGen.presetDungeon`). First load of a new
  seed stalls for that long.
- **The ring** is nine tall stones (3.6 to 5.2 m), radius 13 m, stood by
  the chunk workers as a stone-circle POI. Pale like every other stone for
  now; no forcefield, no dark spirit.
- **The giant's walk** (`visitRoute`): four footfalls bearing off past
  your cabin as before, chosen now to leave it facing the way; then on to
  `dungeon.way` 170 m out from the yard, rounded off, a footfall every
  21 m on alternate sides. A foot that would land in water, on the
  tower's rock or in the ring is drawn in toward the line. It stops 48 m
  short of the ring.
- **Dormant** (`Giant.dormant`, `settle()`): at the end it wraps its arms
  round itself, shuts its eyes and sinks 43 m over nine seconds: a boulder
  hill about 45 m high with its trees on top. The crows fly back to roost
  in the trees with their lights. A reloaded save puts all of it back.
- **Measured on ten seeds:** nine get a real route (924 to 2100 m of
  walking, no footfall in water, same-foot rise under about 0.5); four of
  those pass a tower. One seed (`42`) finds no route at all and falls back
  to a straight line 1.2 km toward the second tower, which crosses water
  and cliffs. `hilda` is the short one: 924 m, no tower.
- **Not done:** the camera does nothing at the end (it happens whether or
  not you're there); the fallback seed; prints that land on LOD seams; no
  sound for the settling; the sunk giant has no collision, so you walk
  through the hill; perf with the giant walking all the way wasn't
  measured.

### Owner's review of step 5 part 1, and three fixes (2026-10-01)
"Pretty good." Asked for: the resting giant to be solid; the crows to sit
on something instead of floating; the whole way cleared of trees, not just
under its feet.

- **The sleeping giant is solid** (`Giant.surface` / `push`, hooked into
  `world.floorHeight` and `collide` in main): its boulders are taken as
  ellipsoids once it has finished sinking (inverse matrices cached while it
  lies still). You can land on it from the air and walk about on top; from
  the ground you're pushed back off its sides, or step up on to the low
  stones. Tested: dropped from 90 m, landed at 46 m on the hump; walking in
  from four sides stops 10 to 22 m from its middle. Its trees aren't solid,
  the camera doesn't know about it, and creatures and bikes don't either.
- **The crows sit on the treetops.** The perch was worked out in the
  torso's frame, so with the torso leaning they hung in the air beside the
  trees; it's the tip of each tree's own mesh now. The one more crow than
  there are trees sits on the hump.
- **The way is a clear swath** (`storyBlock`, from `dungeon.way`): no
  trees or bushes within 23 m of the line, no rocks within 17 m, from the
  yard to the ring. It is in worldgen, so it is **there before the giant
  has walked**: a ride through the forest that the prints later run down.
  Clearing it only as the giant passes would mean knocking hundreds of
  trees at run time (harvest flags, which also regrow); not done.

## Dev: the checkpoint strip (2026-10-01)
- \` shows a strip (◀ list ▶ ↻) over the story's checkpoints in play order:
  phase 1's steps, the journey's stages, phase 3's steps. The list is `CHECKPOINTS` in `src/ui/checkpoints.ts`,
  built from the phase tables, so new steps appear by themselves.
- A step is a **reload** with `?fresh=1&cp=<id>`, not an in-place jump. The
  jumps (`debugJump`, `Journey.jump`) only ever add (build, fell, light), so
  going back in place would leave the roof on; from a fresh save back is as
  safe as forward. `cp` and `fresh` are dropped from the URL once applied, so
  a plain reload resumes the save.
- The giant comes in `enter1` (the home tower's head), so checkpoints up to
  and including it have the village whole, and `enter1` plays the visit;
  everything after sets `giantGone` and restores the wreckage. That's the
  `giantGone` flag on each checkpoint: move it if the visit moves again.
  (`?journey=` and `?stable=` alone never set it.)
- A new story beat needs a `kind` in `CHECKPOINTS` and a branch in
  `checkpoint()` in `main.ts`.

## Giant slice 1, step 5 (part 2): the new order, the ring opened, a tower on the way (2026-10-01)

The owner had no time to test and said to carry on; everything here is from
scripted runs and shots, not from play.

- **The order of the opening is the new one.** House and hearth, the bike
  gift, the ride to the home tower, light it, go up: 2.5 s after you settle
  in its head (`Beacons.onTop`) the giant comes (`visit.start(vantage)`).
  The first shot is from the tower's own eyes; then the village shots as
  built; then the camera goes back to the head, turned to look after the
  giant (`Beacons.lookToward`). Coming down ends the guided part
  (`enter1` + `outHead` goes straight to `done`): the second guided ride is
  gone (`startRide2` deleted; the `ride2`/`lock2`/`enter2` stages remain
  for old saves and the dev jump). The stable still starts the next time
  you're home, among the wreckage.
- **With the guide away at the tower,** nothing swoops at it and it isn't
  moved; it is shown at the tower's foot, reaching, and its thought bubble
  is hidden while it has a mood. A save already past the tower gets the
  visit on load, the old way, from the yard.
- **The story HUD is hidden during the visit.** The tower's own mouse hint
  still shows, and nothing stops you pressing the tower's exit during it.
- **The ring opens** (`src/giant/ring.ts`, rough): on arriving, before it
  settles, the giant lets a dark spirit go; it drops into the ring and a
  dark violet forcefield spreads over the ground inside (overlay pass, laid
  on the ground's slope). The spirit, the tower spirit's shape in ink with
  pale eyes, hangs over it and watches you. Step on to the field and seven
  black arms come up round you and reach for your shoulders. **They don't
  take you anywhere:** there is no dungeon to be pulled into. Nothing asks
  first, there's no sound, and the guide doesn't try the field.
- **A tower on the way:** the dungeon is now looked for outward from a
  tower first (five nearest 300-1200 m from the yard; to a point 130 m
  beside it, kept 75 m off it by a new `keepOff` argument to `route`, then
  350-650 m on). Ten seeds: eight pass a tower (70 to 135 m off), one has
  a route but no tower (`survey4`), one has no route at all (`42`: no
  candidate site passes even the laxest test; it still falls back to a
  straight line through water). `hilda` is now 1.9 km by tower 83.
  Finding it takes 0.8 to 4.9 s, once per seed (cache key is now v4).
- **Whole slice, live, on `hilda`:** 101 footfalls, none in water; the
  giant arrived, opened the ring and went dormant. Perf in the sandbox is
  unchanged (5.3 ms average, p99 9.1, 582 draw calls); not measured during
  the visit or the walk.
- **Slice 1 is now complete as a rough cut.** Open: seed `42`; the pull
  down and the dungeon itself (next slice); the guide in the rucksack and
  as the pointer; what the stable and lasso become now the village is
  wrecked; the swath existing before the giant walks it.

### Camera and the tower room (2026-10-01)
The camera slipped into a tower's room through the doorway when you walked or
rode away with it behind you, and watched you from behind the wall. The room
is now open to the camera only while you're in it or on its threshold
(`clampCamera` passes `sealed` to `solidAt` once the focus is outside the
shell); otherwise the door boulder is solid, doorway included, and the camera
pulls in to just in front of it and eases back out. Chosen over fading the
rock (a landmark that size going see-through reads worse than a short
pull-in).

### The snatching, re-shot (2026-10-01)
Owner: in their seed the trees hid the crows taking the spirits. Asked for it
slower and clearer: follow one crow down, see the grab, pull out to the
scene, a longer shot of the guide, a shot up among the crows, then back to
the tower's view.

- **One crow goes first, alone, and the camera goes with it** (`Visit.film`):
  cut in 15 m behind it 0.45 s into a 4.2 s dive on the furthest house,
  swinging out side-on as it comes in; hold on the grab; then straight up
  over the print and back to 44 m above the lane's far end, looking down the
  wrecks to the giant's legs while the other four dive (0.55 s apart, 2.6 s
  down). One move, no cut. The old fixed close-up from beyond the house is
  gone: that was the shot the trees blocked.
- **Trees:** the side-on spot is chosen from 36 candidates round the spirit
  by clearance from standing trunks (`VisitDeps.tree`, the colliders'
  `nearestTree`, which already leaves out trees a print has flattened), both
  where the camera stands and along its look. The crane rises over the print
  itself, where nothing stands. Chase and scene shots are in the air.
- **Then:** the guide, 5 s (was 2.6), drifting in; 6.5 s circling the head
  with the flock at their height (56 m out, slower than they fly, so they
  pass); 4.5 s drawing straight back to the tower's head as the giant sets
  off. The circle is timed to end on the tower's side of the head, so the
  pull-back never passes through the giant. `cinematic()` now returns a
  `fov` (36 to the head's 42 over the pull-back) and `Beacons.lookToward`
  takes a height, so the hand-over to the head's view has no jump.
- **Length:** 29.8 s from when it stops (was about 16); the whole visit is
  52 s from the tower. `busy` is by the clock now, not by its steps.
- The yard version (old saves) has the same shots plus the miss at the
  guide before the sad shot, and pulls back to the wide side view. **Not
  shot this pass.**
- Shot on `hilda`, `fjord`, `42` at 16.6 h from the tower
  (`node scripts/visit.mjs <dir> tower fine`). Seen on `42`: trees standing
  in the house prints in the wide shot; not looked into.

## The sleeping giant's collision, redone (2026-10-01)
Owner: "the hit box is bad, I can phase right into it."

- **Why it leaked (by reading, not reproduced):** `push` tested one point
  0.9 m above the feet against each boulder's ellipsoid and skipped any
  boulder whose surface there faced mostly up *or down*. Under an overhang
  (below a boulder's widest point) the normal faces down, so nothing pushed
  and you walked in. Pushing out of one boulder could also push into its
  neighbour.
- **First try, a baked height map (solid from the top down), was wrong:**
  the boulders overhang a long way at the base, so it made an invisible
  wall metres outside the rock. Owner's review: that, and flying sinks into
  the top boulder.
- **Now the boulders as drawn** (`Giant.shell` / `cut`): each is its
  ellipsoid *with the pebble's lumps* (`pebbleRadius`, the same noise the
  mesh is built from; they move the surface up to 14% of a boulder, metres
  on the big ones, which the old 0.96 shrink ignored). `cut` gives where a
  vertical line enters and leaves a boulder. `surface` is the highest top
  within a step (0.6 m) of the feet. `push` calls stone a wall when it is
  above that step and below head height (1.7 m), so you can walk in under
  an overhang until your head meets it; sides steeper than about 45 degrees
  are walls; a body found inside is put out by the nearest way.
- **Flying** lands on it and is stopped by its sides (`Giant.land`, in
  `world.landmarks`).
- The camera still doesn't know about it, nor do wild creatures; its trees
  aren't solid.
- **Not tested in play** (the owner asked to stop the slow headless
  probing); it typechecks. Fallback if it still feels bad: the owner's
  idea, an invisible forcefield that shimmers and bumps you back.

### The village runs; a crow for every spirit; crows keep out of the giant (2026-10-01)
Owner: spirits left in a house when it's trodden on read as crushed ("too
scary"). Asked for: they see/hear it, panic, run to the middle of town; a
reaction when the first house goes; then the crows, with the taking seen
better. Also: crows fly through the giant; and as many crows as spirits,
with two or three more spirits. (This replaces parts of the note above.)

- **Eight spirits, eight crows.** Every other house has two living in it
  (`Village.spirits` / `home` / `taken`; a house no longer owns a spirit). No
  spare crows; the yard version (old saves) has a ninth, for the miss at the
  guide. No new houses: the lane and plots are worldgen and weren't touched.
- **Nobody is in a house when it goes.** At 1.75 of the giant's steps
  (`FRIGHT`) everyone runs (`Village.panic`, `Spirit.haste` 7.5-8.7 m/s, out
  to the lane and along it) to `Visit.gather`: the lane point nearest half
  way that is furthest from every footfall. The giant's feet fall 14.5 m
  either side of the lane, so it wades over them and treads on nobody.
  `Village.smash` no longer leaves a spirit in the boards.
- **New shots:** the run, from down in the lane 17 m short of the huddle,
  the giant coming behind (replaces the low shot from the yard); their faces
  for 2.5 s after the first house goes, starting (`Spirit.flinch`) at each
  smash. **The second house is heard and felt there, not seen**: that bends
  the older rule that every house is seen going. The other houses keep
  their shots.
- **The snatching is all at the huddle now.** The camera rides the first
  crow down as before and settles 14 m off, three-quarters on to their
  faces (they turn toward it: `Visit.watch`), and stays while the other
  seven come, 0.65 s apart; it cranes out as the last go and tilts up after
  the lights to the giant's head. Then the guide, the flock, the pull-back
  as before. 52.8 s from the tower on `hilda` and `fjord`.
- **Crows and the giant.** Two causes. The flock wheeled round its head,
  but its hump and the trees on it stand higher than its head: the wheel's
  middle is now lifted over the highest perch. And dives and climbs went
  straight through its body: `Birds.clear` (set by `Visit`) lifts any point
  on a dive or climb over a dome on the giant (44 by 27 m, sloping off to
  twice that), eased at both ends so they still leave and arrive exactly.
  The chase camera gets the same. Not covered: lift-off from the perches
  and the flight back to roost at the ring.
- **Rough:** the carried light is far bigger than the spirit it was; eight
  crows on one spot overlap; in the flock shot the giant's head is mostly
  below frame now the wheel is higher. Yard version run once on `hilda`
  (no errors, reload restores 5 wrecks, 8 lights).

### The tower hand-over, and the village's run to the pasture (2026-10-01)
Owner: the cut from the tower's view to the giant was bad (too soon, and the
camera "phases through the tower"); the huddle didn't read ("a weird
formation", the run not in shot). Asked for: 10 s to look round, no way out
of the head that first time, a smooth move to the giant; the village seen
panicking, running somewhere, standing naturally, looking up at it. Offered
the stable area as the place.

- **The tower.** The giant now comes 10 s after you settle in the head (was
  2.5; cut to 7 s on 2026-10-01, asked for). `Beacons.holdIn` (set in main while that first visit is pending or
  running) takes away the way down, the ember flight and Esc. The first
  shot is from the head's own eye point (`Beacons.eyeToward`; it was the
  head's centre, inside the rock) at the head's fov, and the blend into it
  starts from last frame's camera, not the orbit camera parked at the door
  (that was the swing through the tower), over 2.4 s (`camBlendDur`).
- **They run to the pasture** (`Visit.gather`; no pasture: the old spot on
  the lane). The giant's route already keeps 14 m off it; on four seeds
  its nearest footfall is 32-69 m away and it stops 53-83 m off, so they
  stand and look up at it. Up to 148 m from the far house, so:
  **`LEAD_IN` is 10 steps (was 4)**: the giant starts about 240 m beyond the
  first house (in the lake, on `hilda`), and the visit is **65 s** from the
  tower (was 53). Saves from before get six more prints on restore.
- **The run** (`Village.panic`): the one with furthest to go bolts first;
  each of the others stares until the runners are 7 m short of its door,
  then goes with them, each a little to one side, all at about 11 m/s: a
  pack that grows down the lane and arrives together in 13 s.
- **Shots:** from the tower until step 2.6; a doorstep at the far end (they
  start at the footfall, bolt at 3.15); the camera running backwards ahead
  of the pack, low, the giant over them (`Visit.chase`); once they're
  there, over their heads at the giant; the first house; their faces.
- **Standing:** eight hand-placed spots in twos and threes, some forward,
  some back, jittered per spirit; they look up at its head (`Visit.watch`).
- **Not done / rough:** nobody was played through the hold (scripted runs
  only); runners have no collision (on `fjord` they pass close by your
  cabin); in an old save with the stable built they'd run through the
  fence; the yard version ran once without errors and wasn't looked at.
- **Tweaks (2026-10-01):** the chase shot is cut after 6 s (`CHASE`); they
  still run the full 13 s, seen from the wide view, then over their heads
  once there. Crows no longer drop straight down: a stoop levels out
  `SKIM` (18 m) short of its mark, skims it and goes on level before it
  climbs (both Béziers share the tangent, and the eases keep it moving
  through the mark). A dive now waits at its mark (`then: 'dive'`) rather
  than taking a frame of the wheel. The spirit is carried **as itself**
  (`Spirit.carried` = the crow's `grip`, arms up); only once the crow is
  back on the wheel does the light come up round it (`Bird.glow`, 0.6 s)
  and the spirit hide (`Village.drop`). Every visit shot is kept `FLOOR`
  (0.6 m) off the ground.
- **Later the same day:** the giant comes up slowly (`Giant.emerge`, 9 s,
  100 m, eased) as it sets off, instead of standing there at once: out of
  the lake on `hilda`, out of the ground on a dry seed (not looked at).
  The snatching is now: down with the lead crow, its pickup, a beat, three
  more half a second apart (`SEEN_TAKEN` = 4), then a **cut** to the guide.
  The crane-out and `sceneCam` are gone. The rest are still taken, unseen,
  and `cue().aloft` waits until the last is up with the flock.

## Ambient soundtrack (2026-10-01)

- **What:** `src/audio/ambience.ts` mixes the first audio pack behind the
  synthesised effects: one tonal bed (`bed_woods` everywhere, `bed_home`
  at home), day/night air, a night layer, and a warm pluck every 20-60 s.
  Each is a bus with its own gain (`Ambience.gains`, and "Ambient sound" in
  the panel). New places are rows in `BEDS`, new state layers rows in
  `LAYERS`, and what they read is `AmbienceState`, filled in main.ts.
- **Same context as `Sfx`**, so the same first-gesture unlock, but its own
  bus straight to the output: through the effects' compressor a chop would
  pump the music.
- **MP3, not the pack's WAVs** (150 MB; 4.6 MB as shipped). MP3 pads both
  ends with silence, which would click at the seam, so `scripts/audio.mjs`
  writes each loop with 0.5 s of its own tail in front and head behind and
  the game loops a window exactly one period long inside that. Checked: the
  step across the seam after decoding is the size of an ordinary step
  between samples. The WAVs stay out of the repo; rerun the script on a new
  pack, and keep `len` in the tables equal to what it prints.
- **Memory:** a decoded loop is about 40 MB a minute, so loops are fetched
  at start (small) but decoded when first wanted and dropped 45 s after
  they fall silent. Day in the woods holds about 70 MB, night at home about
  100. Not tried on a phone.
- **State:** night is `env.sky.night` (the palette's own keyframes, so the
  sound turns with the picture). Home is `atHome()` in main.ts: the cabin
  is lit and you're within 55 m (70 to leave) of the hearth, or of the
  village lane until `giantGone`. During the giant's visit (`visit.busy`)
  the bed, the night layer and the plucks fade out over 4 s and only the
  air stays; they come back after.
- **Starting mix:** master 0.5, bed 0.7, air 1 (as made: it is meant to be
  barely there), night layer 0.7, plucks 0.6 (each also 0.6-1 at random,
  panned a little). By ear these are untested: nobody has listened yet.
- **Not done:** beds for the highlands, bog, glimmerwood, hollows and
  towers (the woods bed plays there); riding/flying/giant layers; stingers;
  a mute control; whether the wrecked village should ever sound like home
  again is a story question, left open.

## Expressions: how she and the guide take the giant (2026-10-01)
Owner: after the village is smashed she walks out of the tower with her
default smirk. She had no expressions at all (the grin was fixed in
`FACE_FRAG`), and the guide's mood was cleared the moment the giant left.

- **Her face has moods.** `CharacterRig.mood`: `'scared' | 'sad' | 'set' |
  null`, eased into `uMood` (sad, worried, frightened, set) in `FACE_FRAG`.
  Sad: brows' inner ends up, a small centred frown, head and eyes down
  (round eyes get heavy outer lids). Scared: brows up, bigger eyes (round:
  smaller pupils), mouth a small "o". Set: the grin flattened to a short
  line. Both eye types. Still paint in the head shader, no geometry.
- **Who sets it** (main.ts, after `visit.update`): while the giant is here
  she mirrors the guide (scared, then sad as the lights go up). Once it's
  gone she is **sad within ~65 m of the lane** (85 to leave) and **set
  everywhere else**. The grin doesn't come back; nothing built yet earns it
  (first rescue is the obvious place).
- **The guide stays `'down'`** after the giant: frown and heavy lids, but no
  shiver or reaching, its bubbles still show, and it still brightens for
  pats and celebrations.
- Dev: `?mood=sad|scared|set` holds her face. `node scripts/face.mjs <dir>
  [eyes=round]` shoots each mood close and at play distance; `after` shoots
  the two of them in the wrecked village and her away from it.
- Not done: no other story beats drive her face yet (lighting the hearth,
  the gift, pats, the tower lighting, the ring).

## After the giant: the guide walks home, and the stable waits (2026-10-01)
Owner: when you leave the tower after the visit, the guide should walk
sullenly back to the village (forgetting its bike), do its own thing for a
few minutes, and only start on the stable once you're in the village.

- **Two new journey stages** between `enter1` and `done`: `trudge` and
  `grieve` (saved like the rest, and they're checkpoints).
- **`trudge`:** it walks `journey.toHome` backwards, a 9 m stretch at a time,
  at 1.8 m/s (`TRUDGE`; its trot is 3.1). It never stops on the way (it did, for 2-4 s every
  14-26 s, and glanced at you: the owner read that as waiting for them, so
  the stops are gone). It doesn't lead, wait or look at you. Its little bike stays
  parked at the tower. More than ~95 m from you it speeds up (to 14 m/s by
  130 m), so if you ride ahead it's about a minute behind you into the yard
  rather than five. A reload mid-walk puts it in the village (`grieve`).
- **`Spirit.sullen`** is the look: barely lifts its feet, bent forward, arms
  hanging, eyes on the ground, lids lower, and no pleased glance at you.
  On top of the `'down'` mood main.ts already sets. Pats and acts override it.
- **`grieve`:** `GRIEVE` = 180 s from reaching the yard. It goes between the
  wrecked houses (a spot in the lane abreast of each, 12-24 s, standing or
  sitting, looking at the wreck), and one time in n+1 sits by its own fire.
  Can be patted. The timer starts over on a reload.
- **The stable** starts when the 180 s are up *and* you're within 32 m of
  the cabin or the lane (`inVillage`), on the ground. Away, nothing happens
  however long you're gone. The pointer no longer calls you home for it
  (`guide()` returns null from `trudge` until the stable has begun).
- Checked with `scripts/trudge.mjs` on `hilda` (stages and close shots of
  the walk and the village). Not looked at: the walk as you'd see it from
  beside it in motion, night, a seed with no village (it would only sit by
  its fire), and whether 180 s feels right.
- **Fixes the same day:** trudging, its body sank into the ground (the
  forward bend drops the seat's front edge, and with no hop to hide it the
  flat seat cut into any slope): the body is now lifted by the bend and by
  the higher of the ground just ahead and behind. And the guide floated
  over footprints: `Story.floorAt` didn't know about them. It now adds
  `StoryDeps.dent` (`trail.prints.offset`), so the guide and flying
  logs/stones sit in a print. The village's own spirits still use plain
  `gen.height` (they're gone by the time there are prints).

## The guide's close-up at the tower, kept clear (2026-10-01)
Owner: on `hildax` the guide's reaction shot after the snatching was blocked
(by the tower, they thought).

- **Why:** at the tower the journey has the guide by the doorway, facing in.
  The close-up is from 4.3 m in front of wherever it faces, so the camera
  was in or against the rock. Nothing checked that shot for rock or trees.
- **Fix: move the guide, not the camera** (`Visit.placeGuide`). When the
  giant stops (the camera is at the village for the next 10 s) the guide is
  put out at the foot of the tower on the giant's side, facing the giant,
  and held there until the visit ends (`Visit.stage` overrides the
  journey's want each frame; the journey takes it back afterwards and it
  walks to the doorway again). Of 44 spots round that side it takes the one
  with most room: no rock at the guide, the camera, between them or just
  behind the camera (`VisitDeps.solid`, `Beacons.solidAt` sealed), trunks
  clear of both and of the look, dry, and near level. The shot itself is
  unchanged, and it now faces what it's grieving.
- `visit.start` takes the tower as a second argument (main passes the head's).
- Shot on `hildax`, `hilda`, `42` from the tower: clear on all three. The
  headless run never had the guide at the doorway, so the owner's blocked
  frame itself wasn't reproduced (before: rock filling the left of frame).
- Not done: the yard version of the shot (old saves) has no such check.
- **Air turned down (owner, after playing):** too much day and night as
  made, so the air bus starts at 0.3 (about -10 dB), not 1. If it's still
  too much, the files want remaking quieter and duller, not more gain cut.

## The giant and the tower you watch it from (2026-10-01)

Nothing tied the giant's line to the home tower, and you watch the visit from
its head with the guide at its foot. On `hildax` the walk-off trod 12 m from
the tower; on `fjell` the giant rose out of the ground underneath it. Three
rules now, all still pure functions of the seed:

- **The lane is side-on to the tower** (`findVillage`). The site search asks
  `homeHint` (towers.ts: the home tower's own hilltop search, before there is
  a village) where the tower will go, and a lane within `LANE_OFF` (40°) of
  that line, either way, loses up to 40 points. A preference, not a ban: on
  `hildax` only one lane fits and it stays 17° off. `homeSpot` has the same
  preference from its side (-90), but usually has no other hill to choose:
  the tower's candidates tend to sit in one direction, which is why the lane
  is the thing that turns.
- **The way to the ring keeps 120 m off the home tower** (`HOME_CLEAR`, a
  `keepOff` circle for `WorldGen.route`), and the home tower is never the
  tower the way goes by. If no way exists at 120 m the search runs again at
  60, then 0, rather than falling to the straight-line last resort (seed `6`
  did, straight over the tower).
- **No footfall within 55 m of it**, and the four steps past the yard count
  it (80 m) among the things not to tread on (`visitRoute`).

Over 20 seeds the nearest footfall to the home tower is now 56 m (seed `6`,
the relaxed tier) and otherwise over 100 m. The dungeon cache key went to
`v5`. Worlds change where the lane turned (`fjell`, `nord`, `troll`); saves
from after the visit get their prints along the new line.

### The guide's shot at the tower (2026-10-01)

Its close-up during the snatching read as "some spirit, somewhere", and ran
until the last crow was up (8.6 s on `hilda`, not the 5 s of `SNATCH.sad`).

- **Wide, then in** (`GUIDE` in `visit.ts`): 1.1 s from 17 m back on the
  close-up's own line (the tower's doorway behind it, the bikes), a 0.5 s
  push in, 1.5 s on its face. 3.1 s in all.
- **Its little bike is stood beside it** (`Journey.standBike`, from
  `placeGuide`), on the side away from the camera. It stays there after.
- **Then back to the giant** until the last crow is up: from behind the
  empty pasture, tilting up after the crows (`cue().rise`).
- **It faces the giant throughout** (`settled` on the staged want). Idle, it
  turned to look for you every few seconds, up in the tower behind it, and
  the close-up went round with it: forest behind, no tower.
- At home (no tower) the shot is as it was.
- `scripts/visit.mjs ... tower` now runs with bikes on.

## Dungeon 1: the pull down, and a first interior (2026-10-01)

Owner: "the hand pulling thing seems weird and not right. It shouldn't be so
many hands, and they should follow you around as you walk around on the
portal. They should come up once and pull ya down, just like the tower (but
reversed)." And: take a first shot at an interior to be pulled into; no
theme given. (I read "should follow you around" as "shouldn't": the seven
arms were pinned to you as you walked, and that's the part that looked
wrong. If it was meant the other way, it's `Ring.update`.)

### The take (`src/giant/ring.ts`)
- **Two arms, once.** The seven swaying arms are gone. Walk 3 m in past the
  field's lip, on your own feet (`mode === 'walk'`, grounded; never on a
  mount or a bike, as at a tower), and it takes you: hands off, two arms come
  up out of the field either side of you, arch over and come down on to your
  chest (0.5 s), hold a beat (0.14 s), and pull you under (0.6 s). They are
  the tower spirit's own arms (`Arm`, now exported from `beacons.ts`) in ink.
- They are planted where you stood when it began and never move with you.
  Their feet are kept inside the field's lip.
- **The cut** is a flat violet veil (a DOM div, opacity set every frame from
  `ring.veil` / `dungeon.veil`, so it steps with `advance`): up over the last
  60% of the pull, down over the first 0.6 s inside.
- **Coming back** is the reverse (`Ring.emerge`): lifted out through the
  middle of the field, set down, the arms let go and sink. The field won't
  take you again until you've stepped off it.
- The camera keeps its focus where you stood while the ring has you
  (`ring.heldY`), or it would follow you under the ground.
- Sound: `Sfx.sink(up)`, a low swallow, no chimes.

### The interior (`src/dungeon/`), a first shot
**Theme, proposed, not decided:** *the hollow under the ring.* The ring's
nine stones go on down as columns round a well whose ceiling is the
forcefield seen from underneath; a passage winds down past a grotto of
glowcaps into a great cavern with a still pool; up a ramp at the far end,
framed in an archway you can see from the cavern's mouth, a small warm light
on a stone. Everything is violet (the dark spirit's colour) except that one
light and the glowcaps' pale blue. Nothing to solve, no creature needed, and
the light does nothing: it is a place and a way in and out, to look at.

- **Its own scene** (conflict 5), drawn in place of the world while
  `dungeon.inside`. It keeps the world's x and z and lies 60 m under the
  ring, so terrain streaming, creatures and the story carry on overhead and
  nothing pops when you come back up. The explorer's rig and the dust move
  into its scene and back.
- **The plan is 2.5D** (`layout.ts`): free space is `sdf(x, z) < 0`, a
  smooth union of round rooms and capsule passages with the walls wobbled
  by noise (the well is left round); a floor height and a clear height
  blended from the rooms; walls lean in up a quarter ellipse to meet the
  ceiling as a vault. A pure function of the seed (which side it winds to,
  where the boulders, stalagmites and glowcaps are, which gap between the
  ring's stones the way on leaves by).
- **One set of functions** feeds the mesh (`shell.ts`: grids for floor and
  ceiling, marching squares swept up the vault for the walls, normals from
  the plan), collision (`Dungeon.collide`, `floorAt`: you can jump on to
  boulders), and the camera (`clampCamera`: drawn in along its line to you;
  only columns and tall stalagmites block it, it looks over the rest).
- **`main.ts`:** the `WorldQuery` hands everything to the dungeon while
  you're inside (and `waterLevel` goes to -1e9: it can lie below sea
  level). No flying, mounting or lasso down there. The world's overlay
  scene isn't drawn.
- **Light is pools, not a sun** (`DUNGEON_FRAG`): each glow (the portal,
  each clump of glowcaps, the warm light) lights what faces it in two hard
  rings; the rest is the shade tone. Strata up the walls are flat bands with
  wandering edges. `PostPipeline.render` takes an optional `air` (enclosed
  fog: short, six bands, no layer pass, no valley mist), and the grade is
  violet (`DUNGEON_LOOK`). The shared light uniforms are overwritten each
  frame after the day/night sets them, so the explorer is lit to match.
- **Being let down:** the same two arms hang from the portal and lower you
  to the middle of the well (1.6 s), watched from across the well, then let
  go. A pale double ring in the floor marks the spot; walk off it and back
  on and they come down for you.
- **Cost:** about 100k triangles and under 60 draw calls inside.
- **Dev:** `?dungeon=1` (or `=x,z`, a point of the plan) starts inside;
  `__ow.enterDungeon()`, `enterDungeon(x, z)`, `leaveDungeon()`,
  `dungeon()`, `goToRing()`; checkpoint `ring` (`?fresh=1&cp=ring`) stands
  you by the opened ring in the story; `scripts/dungeon.mjs`.
- **The way out is a dark round in the well's floor** (2026-10-01), `LIFT_R`
  across, rimmed in pale stone with a thin ring outside it: two thin pale
  rings were too easy to miss. The rim glows and breathes once the arms will
  take you (`uMarkOn`: you've stepped off past `ARM_R`), and is dull while
  you've only just been set down. All in `DUNGEON_FRAG`; no geometry.

**Checked** on `hilda` only, scripted: the take, the arrival, the walk off
the mark and back, the lift and the emerge, frame-stepped; eleven stills
round the cave; one live run in the browser with no console errors.

**Not done / open:**
- What dungeon 1 *is* (theme, which ability it teaches, the puzzle, what
  the warm light is). All of it is the owner's to decide.
- Mounts can't come in: the ring only takes you on foot. The design gates
  dungeons by mount ability, so how a creature gets down is an open question.
- Nothing is saved: reload inside and you're back at the cabin.
- The guide doesn't come, the dark spirit only watches, the cave is silent
  (the ambience is hushed), creatures on a lead stay above.
- With your back to the rock the camera comes right in and you aren't drawn
  (rather than seen from inside your hat). Boulders read a little angular
  under the pooled light. Glowcap halos on walls are plain discs.
- Other seeds weren't looked at. The layout only varies by side and scatter.

## Dungeon 1: a first mechanic, the mount you find down there (2026-10-01)

Owner, on the interior: "really quite good. we just need some kind of
mechanics for it now", with four ideas (gather and build; platforming;
move-this-unlock-that puzzles; help a creature). Then: "I do like the idea
of going in mountless but discovering/unlocking a mount needed to complete
the dungeon. I think this might replace the lasso idea (until end game,
lasso would be a final prize type thing)." The warm light: "A gift for the
giant? one gift = one crow flying a spirit back to the village? I'm not
married to this idea, its just ok." What to build: "your call."

**My call: nothing is built in dungeon 1.** With the mount as the key, a
bridge would do the same job twice. The slice is *help a creature, and it
becomes the mount the dungeon needs*, with one platforming beat:

1. You come down on foot (the ring never took mounts).
2. **A rockfall shuts the grotto**, and a rockhopper is shut in behind it
   (you can see it over the boulders, among the glowcaps). The boulders
   glint, the game's one "you can use this" signal, if you have the pick.
   Three blows break a boulder; the first gap frees it. It gets its saddle
   and is yours down here (E to ride).
3. **The warm light stands on a ledge** 4.2 m up across the far passage:
   too high to jump or parachute, and a run at it on the rockhopper is
   stopped too. Space, its bound, clears it.
4. Walk into the light and it comes with you, at your shoulder. That is
   all it does: what it is for isn't decided.

- **A dungeon's creature** is a `Mob` with `below` set, made with
  `Mobs.adopt`. `Mobs.under` (a `MobCtx` whose ground and walls are the
  dungeon's; the `gen` in it is a proxy whose `height` is the cave floor)
  is set while you're down: then only `below` creatures think and are
  drawn and the world's wait as they are, and the other way round above.
  It stays down there when you leave.
- **The ledge** is `Layout.shelf` (a line across the passage; past it the
  floor is `h` higher). `Dungeon.collide` treats any rise over 0.9 m as a
  wall from below, and now stops heads at the roof (a bound could reach
  it). The mesh has the floor run on under it, a separate top sheet drawn
  back to the line, and a plain face (a stepped height field drew teeth).
- **The rockfall** is `Layout.plug`, boulders set wall to wall across the
  grotto's passage, each its own mesh so it can go. The swing is the
  tower lock's (`Dungeon.action` / `act`, the story's action badge via
  `story.external`; the sandbox lends a pick).
- **Saved** per seed (`embla.dungeon1.<seed>`: freed, taken);
  `?fresh=1` forgets it.
- **Checked** (`scripts/dungeon.mjs <dir> quest`, `hilda`, scripted): the
  boulder breaks and the creature is freed; a ridden run at the ledge
  stays at the bottom; the bound lands on top; the light is taken. The
  take and leave still pass. Not played by hand.

**Rough / open:**
- The freed rockhopper only ambles out toward the gap; it doesn't come to
  you or follow you.
- No sound from it while shut in, nothing draws you to the grotto but
  seeing it, and nothing happens when you have the light (no crow, no way
  marked back). The light isn't carried up out of the dungeon.
- The other three ideas aren't in: no gathering or building, no pushables,
  only the one jump.
- The lasso and the stable are untouched above ground; if dungeons are
  where mounts come from, phase 3 needs rethinking (owner's "might").

### Dungeon 1: the well's columns (2026-10-01)
Were nine (r 1.5), one under each of the ring's stones, with the plan's +x
through a gap. But the passage leaves the well ~15 degrees off +x
(`halls[0]` runs to (34, 9s)), so a column stood half across its mouth.
Now four (r 2.3), placed by `Layout` itself at +-60 and +-140 degrees about
`Layout.door`, the passage's own bearing: the mouth is in the middle of a
120 degree gap. They no longer line up with the stones above (nothing down
there showed that they did). The let-down camera and your heading on being
set down are taken from `door` too; the far pair leave the camera its gap.

## Dungeon 1, slice A: bigger, darker, lanterns, a wrong way, stepping stones (2026-10-01)

Slice A of `docs/NEXT-dungeon1.md`, and only that (B and C aren't started).
Owner: "feels quite small... make me walk around a big dark dungeon and
discover things... darker... spirit lanterns... the mount discovered farther
in... an impassible ledge well before the ending... a mini platformer
area... the camera gets real shakey and weird when I'm on the mount."

### The plan (`layout.ts`; a diagram is at its top)
Authored, a loop with one way round it. Eleven rooms, eleven passages,
about 370 x 290 m. **20,700 m2 of floor against 3,800 before (5.4x).**

    well -- fork --(the wrong way)-- LEDGE -- sanctum, the warm light
             |  ^
             |  +-- balcony (a one-way drop) -- link -- den, the rockhopper
             v                                           | rockfall
           cavern (pool; a side grotto) -- kink -- the hand -- PIT -- gallery (a nook)

- **The wrong way** is the nearer and straighter of the fork's two ways
  on, with the warm light in sight at its end (a small orange point over
  the lip from halfway up the passage; I didn't check it from the fork
  itself). The ledge is 4.6 m. Nothing stands within 15 m of
  it, nothing hangs within 12.
- **The long way** is the cavern (the pool, and a dead-end grotto of
  glowcaps), a kink, the hand's room, the pit, the gallery (and a nook),
  and a long passage to the rockfall.
- **The pit** is 5.5 m deep with six flat-topped pillars across it, on a
  curve that leaves one lip square and arrives square at the other. Miss
  and you're on the pit's floor; a trail of glowcaps leads to a tunnel in
  the wall between the two lips, which climbs back to the hand's room,
  beside the passage you came by. No death, no reset.
- **The den** is behind the rockfall as before (the pick, three blows, the
  first gap frees it). Its other way out climbs a ramp to a **balcony**
  5 m over the fork and stops: a one-way drop, so the ride to the ledge is
  92 m and not the whole loop. From the fork it's a high dark mouth with
  glowcaps on it, which is the "somewhere you'll get to later".
- Three kinds of hard edge, because a stepped height field draws teeth and
  a steep smooth one can be walked up: `Shelf` (a straight lip; it may fall
  away behind as a ramp, which is the balcony), `Pit` (a disc, and a tunnel
  whose floor climbs out), and flat `Solid`s (the pillars). The shell cuts
  each in: the floor stops at the pit's edge, the pit's floor is a sheet
  below, a ledge's top is a sheet above, and each has a plain face.
- `layout.at` names the places (`lip`, `farLip`, `ledge`, `balcony`,
  `rockfall`...); the scripts and `dungeon().goTo(name)` use them.

### Defaults taken where the brief gave one (flagging each)
- **Parachute in the platform room: designed for, not switched off.**
  Measured on foot: a jump at a run clears about 3.5 m, at a sprint about
  6, with the parachute opened at the top 10 or more. The gaps are 2.7,
  3.0, 3.4, **9.5** (parachute only, on to a broad stone 1.2 m lower), 3.1,
  **4.6** (wants the sprint), 2.9. So it asks for one glide and one sprint.
- **Lanterns are unlit until you come near (12 m), then stay lit, saved.**
- **The rockfall and the pick are kept.**
- **Glows: the nearest 16 to the camera** (the cap went 12 -> 16), the
  portal always; the farthest few shrink before they drop out so none pops.

### Darker (`DUNGEON_LOOK`, `DUNGEON_FRAG`)
The rock has its own three tones now (`cLit`/`cMid`/`cShade`) rather than
borrowing the sun's: the shade tone is a deep blue-violet (#514d8c on the
rock's own colour), fog is #231f47 from 7 m at 0.03 (it was pale lilac from
9 m at 0.012), outlines kept. Never black: conflict 7's "the blue night
palette". The explorer and the rockhopper are lit by whatever pool they
stand in (`applyLight`) and are dim blue shapes between.

### Spirit lanterns (`buildLanterns`, `LANTERN_FRAG`)
54 to 60 of them by seed: a stone bowl on a stub out of the wall with a
small spirit in it, the tower spirits' dome and tall eyes. Asleep it is a
dull violet with its eyes shut; come within 12 m and it swells, turns pale
and bright, opens its eyes (0.7 s, a coo) and throws a cool pool 12.5 m
wide. All of them are one mesh and one draw call; waking rewrites a vertex
attribute. None in the sanctum: the orb is the only warm light and the only
light up there. Two flank the well's way out so the first thing you do is
wake one.

### Things to find (three, and stopped)
- The lanterns themselves.
- **The hand**: a giant's hand of the giant's own blue stone, 10 m tall,
  reaching up out of the floor of the room before the pit, palm to the way
  you come in, glowcaps at its wrist. It is framed in the passage from the
  kink. (My first go, a hand of boulders lying palm up, read as a pile of
  boulders. This one reads.)
- **The rockhopper heard before it's seen** (a whimper every 6 to 9 s
  while it's shut in and you're within 75 m), and the balcony seen from
  below. No collectibles.

### The mount's camera: reproduced, then fixed
`scripts/dungeon-cam.mjs` rides legs of the plan and counts. Before, in the
old cave, camera a quarter turn round from behind (as it is after any
corner): its distance to you **reversed 25 to 47 times in a 3 s leg**,
jumped up to 0.35 m in a frame (7.8 m when a wall came between), and it
sat anywhere from 3.5 to 15 m off. Four causes, the brief's first suspect
and three it didn't list:
1. `mount()` pushed the zoom to 12 m and the ride added a quarter: 15 m
   wanted in passages 9 m wide. Not done down there now (9 m, +8%).
2. `clampCamera` came in a 0.35 m step at a time, at once, and eased
   straight back out. It now bisects to where the rock begins, comes in
   over a few frames (the walls are one-sided: a frame inside the rock
   shows nothing), looks a quarter second ahead, and goes back out slowly,
   the slower the faster you're going, so along a passage it holds.
3. The camera's focus was the saddle, **which bounces with every stride**.
   Smoothed out down there (it is still raw above ground, where the
   camera is far enough off not to show it).
4. The orbit camera lifted itself on to "the floor" at its unclamped
   position, which out in the rock is no floor at all. Down there the
   dungeon's own clamp does that job.
After, same test in the new cave: 1 to 8 reversals a leg, typical frame to
frame change in distance 0.01 m, height jitter on the flat 0.003 m (it was
0.05 to 0.1). The explorer's hide/show at 1.3 m has a margin now. The
brief's second suspect (stepping on to boulder tops) didn't show on the
legs I rode, but a boulder's top is now a dome rather than a step anyway.
**Not felt by hand.** The numbers are much better; whether it feels right
is the owner's call.

### Two bugs the playthrough found
- **You could walk up the ledge.** Its lip was a 12 cm ramp and "a rise
  over 0.9 m is a wall" let you up it a step at a time. The old ledge had
  the same hole; it was only ever tested mounted. It's a true step now.
- **Leaving the rockhopper behind.** Walk off the balcony without it and
  it was the whole loop again to fetch it. Freed, and more than 38 m from
  you on foot for 2.5 s, it now lands a few steps behind you with a puff
  and a chirp. A cheat, said plainly: it doesn't path there.

### Checked
- `scripts/dungeon-plan.mjs` on `hilda`, `frost`, `42`, `bergen` (both
  sides): on foot from the well you reach the fork, the ledge's foot, the
  cavern, the hand, the lip, the pit and its tunnel, and not the sanctum,
  the far lip, the gallery or the den; with the rockfall open, the den,
  the balcony and the fork but not the ledge's top; mounted, the sanctum.
  No ledge edge or pit rim in open floor except across the two lips.
- `scripts/dungeon.mjs <dir> quest` on the same four seeds, every step ok:
  played by the keys from the well, including failing the ledge on foot
  three ways (run, jump, jump and parachute), falling into the pit and
  coming back up the tunnel, all seven hops, the smash, E to mount, the
  ride off the balcony, a ridden run at the ledge (stopped), the bound, the
  light. **154 to 165 s of game time** for a sprinting bot that knows the
  way. The brief asked for 4 to 6 minutes on a first visit; I think a
  first visit is in that range but nobody has made one.
- Take and leave still pass. Lanterns and `freed` survive a reload.
- **Build hitch on first entry: 0.39 s** (plan 24 ms, meshes 365 ms), under
  the veil. Under the brief's half second, so nothing is cached.
- **Frame cost inside, uncapped, 1600x900, this machine: 1.4 to 2.0 ms**
  (p99 3.2), 58 to 71 draw calls, 394k triangles (it was about 100k), the
  same with every lantern lit as with none. Not measured on integrated
  graphics.
- Stills of every room on `hilda` and `frost`, looked at beside inspo/4
  (the blue night): the values are close; it is more violet than that
  navy, which is the dark spirit's colour and was already.

### Rough / open
- Not played by hand. The bot can't tell me whether the stones are fun,
  whether the 9.5 m gap reads as "use the parachute" (nothing says so), or
  whether the dark is the right dark.
- Unlit, a big room crossed down its middle is very plain: floor and wall
  are nearly one tone and no lantern is in reach. That is the "dark" asked
  for, but it may be too empty.
- The balcony's floor has a toothed edge where it meets the wall on one
  side. A pillar between you and the camera pulls the camera right in.
  Straight after the drop off the balcony the camera is close behind your
  head for a second.
- The pool hardly shows in the dark. The hand has no collision but a
  round post.
- The rockhopper still only ambles out when freed; you walk to it.
- Only `side` and scatter vary by seed; the plan itself is one plan.
- Nothing happens when you take the light (slice B).

### Slice A, after the owner's first play (2026-10-01)
Owner: "the floor matches the walls too much... there's an invisible wall
that way [the rockhopper], same with the orb thing. I can see it but can't
go down that hallway... I don't see any platform / parachute stuff."

- **The invisible walls were the two ledges, and they were my bug.** Their
  faces were wound to face the high side, so from below they were culled:
  you saw the floor carry on under the ledge and walked into nothing. (The
  pit's face had the same fault and I fixed that one from a screenshot; I
  never looked at the ledges from their foot closely enough. The bot can't
  see.) Now wound to face the low side.
- Every lip (both ledges, both sides of the pit) has a **pale kerb**, a
  lantern hangs either side of each ledge's foot, and the wrong-way ledge
  is **3.4 m, not 4.6** (on foot you get up 2.5 m), so the light shows
  over it from down the passage. It is a small orange point; from right
  under the ledge the ledge hides it.
- **Floor**: pale blue slate (`cFloor` #b4c0ea) against darker violet walls
  (#685e90 and its two strata). In a lit pool they are clearly two
  materials; out in the dark they are still close.
- The stepping stones are past the hand: the passage on from its room, now
  marked with glowcaps (the room has three ways out). The owner hadn't got
  there.
- Rechecked: plan and quest on `hilda` and `frost` after these.

**Owner's answers** (the brief's questions 1 and 2): the rockhopper comes
up with you, and you are **on it for the whole offering sequence and when
you get control back**; the dungeon **shuts once the orb is taken and
becomes a shrine / stone**. Both are slice B's to build. 3 to 6: TBD.

### The stepping stones, redone as a jump down (2026-10-01)
Owner: "I think the platform is impossible. the parachute would need a
height difference", then, having made it: "feels like if we're making it a
parachute thing it should be a jumping down from above sorta deal", and
"if someone fails 3 times, we should show like a thought bubble of a
parachute".

- The first version had level stones and a 9.5 m gap: it only went with
  the parachute opened at the very top of a sprinting jump. A bot does
  that every time; a person doesn't. My mistake to pass it on the bot.
- Now: **three easy hops that climb** (gaps about 2.5 m, each stone 0.8 m
  higher) to a high stone; **a 15 m gap down to a broad stone 3.8 m
  lower**; three easy hops back up to the far lip. A sprinting jump off
  the high stone with no parachute comes down at about 12 m (measured:
  with the gap at 12 it missed by 0.3 m, so it's 15). With the parachute,
  opened any time on the way down, there are metres to spare. No gap
  wants a sprint any more.
- **The hint** (`Dungeon`, `HINT_AFTER`): fall from the high stone three
  times and, standing on it again, the explorer has a thought bubble with
  a parachute in it (a new `parachute` icon in `icons.ts`, the spirit's
  bubble; a `Billboard` in the dungeon's own overlay scene, which main
  now hands to the post pipeline while you're down there). It goes for
  good once you've crossed (saved as `crossed`). It is her own thought:
  the guide isn't down there. Falls from the other stones don't count.
- Checked: quest on `hilda`, `frost`, `42` with the new stones; three
  scripted falls bring the bubble up (looked at), crossing clears it.
  This answers the brief's question 4: the parachute is part of it.

### Stone tops marked, and the ridden rockhopper calmed (2026-10-01)
Owner: "the top of the platforms need some definition... hard to tell
where you need to reach", and "the rock hopper animation looks off. the
char bounces like crazy."

- **Stone tops** (`buildRock`): a pale kerb round each rim (the lips'
  kerb), a pale flat top, and a darker ring let into it. They read as
  targets from the lip and from each other, lit or not (looked at).
- **The bounce** was the rockhopper's pronk, not the camera: past a trot
  its body springs 0.28 m a stride, and its strides come 8 to 13 a second
  at riding speeds, so the saddle (and the rider on it) moved up to
  **0.36 m in a single frame**. Fine for a wild one seen across a crag;
  a blur with someone on it. `Rockhopper.pose` now carries a rider nearly
  level (`calm`: spring, bounce and rock at 15% while ridden; the legs
  still pronk). Measured, saddle against feet: biggest move in a frame
  0.27 / 0.36 m (canter / gallop) before, 0.04 / 0.05 m after. This is in
  `src/mobs/`, so it applies above ground too. Wild and unridden it is
  as it was. Not looked at in motion, only measured.

### Taking the light: a success beat, and out to the surface (2026-10-01)
Owner: "I reach the ball then nothing really happens... maybe the mount
takes over and does a little victory hop around, maybe we borrow the heart
thought bubble... I thought we would get teleported to surface." This is
the first step of slice B, built because it was asked for; the rest of B
(the orb carried above ground, the guide, the shrine, the crow, the giant)
is not.

- **The beat** (`Dungeon`, `WIN` = 5.4 s, hands off): the light flares
  and its pool swells, every lantern you've woken brightens, whoever is
  carrying you (the rockhopper; your own feet if you walked in) hops
  three times turning a full circle, a heart bubble over its head (the
  spirit's, in the dungeon's overlay), three chirps. Then the violet
  veil.
- **Out**: `onWon` -> `leaveDungeon(true)`. The ring's arms lift you out
  as on any exit; the rockhopper is brought up (`below` cleared) and
  stands beside the ring's middle, and the moment the arms let go you are
  on it (owner's answer 1: "on it when I regain control").
- **The dungeon is shut after** (answer 2): the ring won't take you again
  (`dungeonWon`, read from the dungeon's save). It does **not** yet turn
  into a shrine: it looks exactly as it did, field and dark spirit and
  all, and just doesn't work. On a reload the rockhopper is stood by the
  ring (adopted fresh; it isn't in the herd's save).
- The light itself doesn't come up: it lives in the dungeon's scene.
  Above ground there is nothing to show you have it and nothing to do
  with it. That is where slice B picks up.
- Checked (`quest`, `hilda`): the beat's frames looked at; out on the
  surface, mounted, at the ring; walking back on to the field does
  nothing.
- **Stone tops, again** (owner: "with the top and edge all white it is
  hard to see where one starts and the other ends"): the top stays pale,
  with a dark border round its edge and a dark band down the rim.

### The parachute section, third go: climb, then one long fall (2026-10-01)
Owner: "the platforms are just too hard still. the parachute one. I'd like
to see it go up even more... be pragmatic but make the parachute section
more fall-y."

- **Why it was hard, found by trying the gap eight ways in a probe rather
  than with the bot's perfect timing:** you take a long gap at a sprint,
  and **Shift held on in the air is the parachute's dive** (15 m/s but
  sinking 7: about two across for one down, against four floating). The
  dive fell 5 m short of a landing stone sized for floating. The bot let
  go of Shift.
- **Now** (`layout.ts`, the stones' comment has the numbers): the gallery
  and everything after the pit lie 6 m lower; the pit is 11 m deep. Five
  short hops (2 m gaps, 0.8 m up each) climb to a high stone 4 m above
  the lip you left and 10 m above the far one. From it, **one fall, 21 m
  across, on to the far lip and the passage behind it**: no stone to hit,
  the whole far side is the target. I didn't ramp the passage up to the
  first stone (the owner's first suggestion; "other ways are fine"): the
  floor is a blend of rooms and passages, and a ramp there tilts the
  pit's floor and every stone on it. The stones do the climbing.
- Tried from the high stone, landing place: sprint and no parachute, the
  pit (14.8 m out); run and open at once, sprint and open at the top,
  sprint and open 0.8 s late, walk off the edge and open, 8 degrees off
  either way: all the far side. Opened 1.1 s late: the pit.
- A pillar's top is now a height of the plan (`Solid.y`), not a height
  over the floor under your feet: over the pit's sloping floor near the
  far lip the old way gave a stone a sloping, unlandable top.
- The hint counts falls from the high stone (now the fifth) and clears
  when you're down on the far side.
- A fall from any stone is the whole climb again by the tunnel (now an
  11 m climb, about 35 m of ramp). Five easy hops, but it is more to
  redo than before.
- Checked: plan and quest on `hilda`, `frost`, `42`, `bergen`, all steps
  ok; stills of the lip and stones looked at.

### The rockhopper is glad to be out (2026-10-01)
- When the rockfall breaks: `Sfx.fanfare` (four rising chimes and the chord
  left ringing, in the thunk's voice) in place of the one chirp, and the
  rockhopper hops three times on the spot, the last highest, a chirp as
  each leaves the ground and dust where it lands (`GLAD_HOPS` in
  `dungeon.ts`).
- The hop is `Mob.hop`, a height the owner sets and `Beast.animate` adds to
  the body (legs go to their airborne pose). `Beast.move` pins a ground
  beast to the floor every frame, so `vel.y` can't do it (the stable's
  welcome hop sets `vel.y` and only ever showed as the `joy` lift).
- Checked: tsc, quest on the default seed all ok. In the quest's stills the
  rockhopper is still back in its den, small and half behind the explorer:
  the hops weren't judged by eye, and the fanfare hasn't been heard.

### Handing over (2026-10-01, evening)
- **State:** slice A and step 1 of slice B are in the working tree,
  uncommitted, on top of `e215081`. `tsc` is clean; `scripts/dungeon.mjs
  quest` passes on `hilda` on the tree as it stands.
- **Two things in the tree I didn't write up above because I didn't write
  them** (they arrived while this session was running; they read as
  intended and the quest passes with them): when the rockfall breaks
  there is a small fanfare (`Sfx.fanfare`) and the freed rockhopper hops
  three times on the spot (`Mob.hop`, `GLAD_HOPS` in `dungeon.ts`, drawn
  in `Beast`).
- **Owner, on the brief's question 5:** yes, the guide can simply be at
  the ring. Questions 3 and 6 are still open, with four of mine: see the
  end of `docs/NEXT-dungeon1.md`, which is now the brief for the offering.
- `DESIGN.md`'s "Decided 2026-10-01" now carries the offering as the
  owner described it, the creature coming up with you, and the entrance
  becoming a shrine.

## Dungeon 1, slice B: the offering (2026-10-01)

The rest of slice B of `docs/NEXT-dungeon1.md`: from being put out on the
surface on the rockhopper to the giant closing its fist on the light and
glowing. Slice C is not started. `src/giant/offering.ts` is all of it but
the giant's own new moves (`giant.ts`), the ring shutting (`ring.ts`) and
the wiring in `main.ts`.

### What happens
1. **Up.** The ring's arms set you down 5.6 m short of the middle, not on
   it, facing it, in line with the gap between two of the ring's stones
   (so the camera behind you looks in through the gap and not at the back
   of a stone: it was behind one, and you couldn't see yourself). The
   light is at your shoulder as it was below: it's a mesh in the world's
   scene now. The rockhopper is turned to face the shrine as you're
   put on it (it used to keep whatever way it had been facing below, so
   you came up looking at the camera).
2. **The ring shuts** (3 s, `Ring.seal`): the field's lip closes in to its
   middle, the dark spirit goes down through the last of it and is gone,
   flat blue stones show where the field lay, and a squat stone shrine
   with an empty bowl comes up in the middle.
3. **The guide** is at the field's edge as you come up, walks in as the
   field closes, and stands by the shrine pointing at the bowl with the
   ember in its bubble. The bowl has a dashed sketch of the light in it
   and one empty slot over it (`Sketch` and a slot `Billboard`, as the
   cabin's parts have).
4. **Setting it down**: E (or click) within 4.4 m, or just ride or walk to
   within 3 m of it. The slot fills, the light arcs into the bowl.
5. **Hands off for 32 s** (`T` in `offering.ts` is the whole timeline). A
   crow comes down off the giant's head in one long glide, lands beyond
   the shrine, looks at you, takes five hops to the bowl, leans in and
   takes the light in its beak, turns, hops back out toward the giant. The
   giant's eyes open; a mouth appears and turns up; it holds out a hand,
   palm up, over the treetops. The crow flies up with the light under it
   (grown to the size of the lights the other crows carry), hangs over the
   palm, lets go. The light drops into the hand, the fingers draw in over
   it, and the hand and forearm turn orange from the inside. The crow goes
   back to its head. The arm folds back against its chest with the warm
   fist, and it keeps a small grin and keeps looking at the shrine.
6. **Control back**, still mounted, camera in through the gap again.

### The camera for the hand-over (planned first, as asked)
A crow with a 7 m wingspan and a hand 15 m across, 30 to 60 m from the
ring and 15 m up. Three tries, each looked at as a sheet of frames:
- From over the ring, 23 m from the palm: the hand was a wall of boulders
  across the bottom of the frame and nothing read as a hand.
- From beside you on the ground for the ending: the ring's stones hid the
  giant.
- **Kept:** two places. *Near* (0 to 10.8 s): low, behind you and to one
  side, inside the ring, looking past you and the shrine to the crow, the
  giant behind. *High* (the rest): 30 m back from the palm toward the
  ring and 8 m above it, off to one side; it starts 14 m over the giant's
  face on a long lens (fov 19: eyes, mouth), cranes down and widens (46)
  as the hand comes out, closes on the hand (32) for the crow, the drop
  and the fingers, and ends on face and fist together (34). One position
  and no cuts after the first, so you always know where you are. Both
  places are picked from a few candidates for the clearest of tree trunks
  and ring stones (`pick`).
- The face shot is from above because from level with it the arms it hugs
  itself with hide its mouth.

### The giant (`giant.ts`, `GIANT_FRAG`)
- `awake` (eyes open, breathing, still sunk and still solid), `wide`,
  `grin` (`uGrin`: a short ink line under the eyes, ends turned up; at 0
  it has no mouth, as before), `look` (the head turns up to 0.55 rad),
  `reachArm` / `reach` / `reachAt` (one arm out of the hug to a wrist
  target, the hand turned palm up and level), `fist` (three fingers and
  the thumb lerp to places over the palm: its hands are boulders, so
  "closing" is boulders drawing together), `warm` (`uWarm`, a per-boulder
  weight in `aWarm`: hand and fingers 1, forearm 0.7 / 0.4 / 0.18).
  `snap()` for a restored save. `palm()`, `shoulder()`, `face()`.
- The warm boulders are lit from inside in two flat tones of the ember's
  orange, with emissive 0.34 (0.48 at night). My first value, 1.25,
  bloomed to a yellow-white blob with no shape in it; the second, lit by
  the sun's colours, was grey-pink at night.
- **It does not rise.** The owner's order is eyes, grin, takes the light,
  *then* "has gotten up", so getting up is slice C's. It takes the light
  lying where it is. It isn't solid while the arm moves and is again once
  it's still (the shell is rebuilt, fist and all).
- **A bug found on the way, and fixing it changes the sleeping giant.**
  Its limb bones hang off the group, not the pelvis, and were given
  positions that already included the group's sink, so a dormant giant's
  arms and legs were drawn 43 m below where they belonged: buried. Nobody
  had seen the arms it "wraps round itself" because they were under the
  ground. The reaching hand never appeared until this was fixed. Now the
  hugging arms show against its chest when it's asleep, and its solid
  shape includes them. It is the pose the code always described, but it
  is not the hill the owner has been looking at. Flagged below.

### The crow (`birds.ts`)
One more of the giant's crows, with no light of its own, roosting on top
of its head (the others are in its trees with their lights). `Birds` got
two states: `stand` (wings shut, put where its owner says: the hops are
the offering's) and `hover`. It has no legs (the flock never did); on the
ground it is a plump black shape that hops, which reads.

### Defaults and simplest choices taken (each flagged)
- **The dark spirit goes down with the field and is gone.** The brief said
  "leave it watching", from before the entrance was to become the shrine;
  hanging over the bowl it would be in the way of everything. Simplest.
- **The field becomes paving**, about 60 flat stones in the giant's ash
  blue laid on the slope, and **the shrine is a small stone in the
  middle** in the same blue. No raised floor: a step there would have to
  be taught to every creature and the guide.
- **The guide is simply there**, as agreed, and is put back by its own
  fire once the light is given and you're 90 m off. While you hold the
  light it stays at the ring, which also holds the story's own asking
  (`story.lent`) until you give it.
- **You can get off the rockhopper.** Nothing forces you to stay on. If
  you stay on, you're on it all the way through and when control returns.
- **A reload while you hold the light, or mid-sequence, puts you back by
  the shrine on the rockhopper** rather than on the cabin's doorstep
  1.5 km away with a light at your shoulder. Mid-sequence it plays again
  from the light in the bowl. Once the fist has shut it is `given`.
- **The glow stays** (settling to 0.7 of full) rather than fading after "a
  while": nothing follows it yet. Slice C can fade it as the giant walks.
- **Outside the story** (`story=0`, as the quest script runs) nothing has
  walked to the ring, so a giant is stood 66 m off on the way in, and
  there is no guide.
- Saved as `embla.offer1.<seed>`: `placed` or `given` (held is "the
  dungeon's light is taken and neither of those").

### Checked
- `scripts/dungeon.mjs quest` on `hilda` and `42`: all steps ok, now
  through to the end of the offering. It rides to the shrine with W only
  (no E), holds W through the whole sequence and checks you don't move,
  and checks the hand went out and shut and that you're still mounted.
- `scripts/offering.mjs` (new) in the story on `hilda`, `frost`,
  `bergen`: play (with E), and on `hilda` and `frost` a reload with the
  light held, set down (mid-sequence) and given. `hilda` at 22:30 too.
  Sheets of frames looked at for every one. On `bergen` the giant lies
  much nearer the ring, so the hand is bigger in frame; it still reads.
- **`42` in the story passes every scripted check and cannot be watched.**
  Its dungeon site is the search's fallback (the way there has two
  points, the yard and the ring itself) on a steep mountainside, and the
  giant ends its walk on top of the ring: the near camera is inside its
  boulders and the high one looks at a wall of them. That was so before
  this slice (the ring there was already under the giant); the offering
  just makes it obvious. Not fixed: it is the site search's problem, and
  which seeds fall back hasn't been surveyed.
- From the saddle, not only from the cinematic: coming up, the shrine
  with its sketch and the guide, the prompt, the giant after from the
  ring and from under its fist.
- `dungeon.mjs leave` (an ordinary exit) still lifts you out in the
  middle.
- Beside `/inspo`: the paving and shrine are the same cold blue-grey
  accent as the giant against the warm ground, which holds. The orange
  fist and the light's bloom are stronger colour than anything in the
  reference; the fist is two or three flat orange shapes with little
  inside them.

### Rough / open
- **Not played by hand.** In particular: whether 32 s with your hands off
  is too long; whether the crow's glide in is "calm"; whether the fist
  reads as a fist in motion (in stills it does at 24 to 27 s); whether
  riding to within 3 m and having the light go by itself feels right or
  feels taken from you.
- The sleeping giant looks different (above). If the owner wants the old
  hill back, the arms can be tucked lower rather than the bug restored.
- When control returns the ring's stones still hide part of the giant
  from where you sit; you see the glow between them.
- The shrine is a plain lathe shape, a little like an anvil from the
  side. The paving is regular.
- The crow turns on the spot with the light in its beak and the light
  swings round a beat behind it.
- On the sandbox's stand-in giant the folded fist can end up half in the
  hillside. In the story, on three seeds, it is clear of the ground.
- The reaching arm goes straight from the hug to the reach; it isn't
  checked against the other arm or its own chest.
- Sounds are the existing ones re-used (slot, whoosh, tug for hops,
  snatch, stomp for waking, thunk, thud, fanfare). Not heard.
- Frame cost not measured properly (a dozen or so more draw calls by the
  ring: one crow in six batches, paving, shrine, light, sketch, slot).
- The stand-in giant outside the story stood on the ring itself on seeds
  whose way ends at the ring (`42`); it now stands back along the way.


## The walk home and the grieving, shortened (2026-10-01)

Owner: the stretch after the giant felt long, the 180 s in the village most
of all.

- `TRUDGE` 1.8 -> 2.4 m/s on the path home. The village shuffle keeps 1.8
  (`MOPE`, split off from `TRUDGE`).
- `GRIEVE` 180 -> 75 s, and counted from setting off home (`grief`, across
  `trudge` and `grieve`) rather than from reaching the yard: a long walk
  back isn't followed by a full wait. Not saved; a reload starts the 75 s
  again. Always at least 20 s in the village itself (`GRIEVE_MIN`), so a
  long walk doesn't skip the grieving altogether.
- It can be brought round sooner (`comforted`): a pat (past `PAT.joy`), or
  staying within 3 m of it for 6 s while it sits by its fire. The other
  conditions stand (you in the village, on the ground, it not mid-act).

## The send-off: from the ranch to dungeon 1 (2026-10-01)

Owner: after the stable there was nothing pointing you at the trail. The
guide should walk you to the edge of town toward the footprints and gesture
that way with a footprint-path icon, looking brave and defiant ("go that
way, save my people"), not frightened.

- **Where it lives:** `Journey.sendOff()`, inside the `done` stage, with the
  spirit borrowed (`story.lent`) as the journey always does. Not a step in
  `phase3.ts`: a `meet` step ends when you arrive, and this has to stay,
  let go and come back. So saves already at `ranch` get it too.
- **When:** the story is at `ranch` (a creature is home), the giant has been,
  the ring isn't found, and you've been in the village on the ground for 6 s.
- **What:** 2.4 s looking at the nearest wrecked house (still downcast),
  then `mood = 'brave'` and it leads (`want.lead`, so it waits for you) to
  the heel rim of the first print more than 55 m from the lane and cabin
  (`trailEdge`: found from the far end of the print list backwards, since
  the giant walked in as well as out), and points at the print after next.
  The far-off pointer follows it while it walks, then stops: the prints ask.
- **Letting go:** you out of the village and 90 m from it and its spot: it
  walks home (no teleport) and is the house's again. Back in the village
  after being away, it does it again. Within 70 m of the ring is "found"
  (saved as `embla.journey.<seed>.ring`), and that's the end of it.
- **The brave face:** a new `mood`. `uBrow` on the part material cuts the
  top of each eye on a slant, low at the inner corner (all creatures share
  the shader; only the spirit sets it). Eyes wide under it, mouth a nearly
  flat line. It overrides the happy glance it gives when it sees you.
- **Icon** `prints`: three of the giant's prints going away up the bubble,
  smaller and paler each.
- Checked with `scripts/sendoff.mjs` on `hilda`. Not checked: at night, on
  other seeds (where the edge print lands), mounted, or with a save that
  was already at `ranch`.

### The offering, after the owner's first play (2026-10-01)
Owner: "the arms crossed thing looks weird and bad. Maybe make them go down
to the ground as if they were a rock stack... The hand/fist closing thing
looks pretty bad as is as well. the camera angle wasn't helping"; the
shrine "more of a thing. like a statue of the mount"; "glow fades"; "the
guide should just not be here at all... have it be like a cutscene where
its just happening out of the users control"; the saddle's bounce out of
the camera above ground too; fix the bad dungeon sites "if you think
that's best".

- **A cutscene from the moment you come up.** No guide (it stays home; all
  of its code here is gone, and so is the hold on the story's asking), no
  sketch, no slot, no E. The ring shuts, the shrine rises, and 0.7 s later
  the light leaves your shoulder in a slow arc and settles in the bowl;
  the rest as before. Hands are off from coming up to the end, about 37 s
  in all (3 s of the ring shutting, then 33 s).
- **The shrine is the rockhopper in stone** on a round plinth, side on to
  the way you come up, a shallow bowl on its back with the light in it
  (`rockhopperStatue()` in `mobs/rockhopper.ts`: its own body, head, ears
  and legs standing still, merged, 1.35 times life size, in the giant's
  blue). The crow stretches up to take the light from its back.
- **The sleeping giant's arms hang straight down into the ground**, one
  stack of boulders at each side (`dormant` now means `hug` 0, not 1).
- **The hand is a mitten.** Held out, the three finger boulders lie flat
  on beyond the palm, longer than they hang. Shutting, they swing up and
  over the palm about the knuckles as one piece (`fold`, `KNUCKLE`,
  `FOLD` in `giant.ts`) and come down on the light; the thumb comes in
  from the side. Before, each finger slid across the palm on its own:
  boulders rolling over a boulder. A try in between (each finger on its
  own arc) stood them up on end like slabs.
- **The camera for the hand is side on to it**, measured from the palm
  and on the side away from the giant's body: 27 m out, 14 m back toward
  the ring, 8 m over it. (My first "side on" was measured from the line
  between ring and giant; the arm comes off a shoulder 27 m from that
  line, so the camera was looking up the arm at the back of the hand.) It
  goes up again above the canopy for the end, when the fist is down at
  its chest.
- **The hand is held 20 m up**, not 15: at 15 the treetops between the
  giant and the ring came through the palm.
- **The glow fades** over 55 s after you get your hands back, and as it
  goes the arm goes back down to the ground (`hold`). The giant stays
  awake with its small grin. A reload after finds no glow.
- **The saddle's bounce is smoothed out of the camera everywhere**, not
  only below (`main.ts`).
- **The dungeon site search has a real fallback** (`WorldGen.dungeon`):
  when no way reaches any candidate it now takes the most level, open,
  dry, low spot of the same sweep, with a straight line to 48 m short of
  it for a way, instead of "1.2 km toward the next tower, whatever is
  there". The cache key is `embla.dungeon.v6` so old answers are
  thrown away. On such a seed the prints may cross ground you have to go
  round.
- The owner's other answers are in `docs/NEXT-dungeon1.md` and
  `DESIGN.md`: the pick is fine; the fetched rockhopper is fine; the dark
  is liked; the stone hand didn't read as the giant's but is liked, and
  is to be reused for things out in the world; rescued spirits mend the
  village a bit more at each checkpoint.
- **Checked** on the build as it stands: `offering.mjs` in the story on
  `hilda` and `frost` (play and all three reloads), `bergen`, `42`, and
  `hilda` at 22:30; `dungeon.mjs quest` on `hilda` and `42` (40 steps
  each). All pass. W is held from coming up to the end in every one and
  nothing moves. Sheets of frames looked at for `hilda`, `frost` and
  `42`. **`42` now has a level site with the giant lying clear of the
  ring, and its offering can be watched** (before, the giant sat on the
  ring on a mountainside). Which other seeds used the old last resort
  hasn't been surveyed.
- **Still rough:** the fist is clearer but it is still four boulders; the
  treetops come through the giant's chest and lower arm where it lies in
  forest (they always did through its body); from the saddle afterwards
  the ring's stones hide part of it; the second version hasn't been
  played by hand; sounds unheard; frame cost unmeasured.


## The spirit stays grey until the hearth is lit (2026-10-01)
- It used to warm a little with every step of the repair (`warmth` in
  `phase1.ts` climbed 0 → 0.68 before the hearth), so it was already a dull
  apricot by the chimney. Owner's call: every step before `home` is now
  `warmth: 0`. It turns only when the hearth is lit (`cabin.lit` sends the
  target to 1, eased in `spirit.ts`). A pat still flushes it a little.
  Typechecked; not looked at in the game.

### The offering, third go: into its mouth; and stone hands about the world (2026-10-01)
Owner: "the 'mitten' hand doesn't really work... the fingers don't cover
the hand or close around the orb. New idea! What if the giant opens its
mouth wide and the crow (with the orb) literally just flies inside it and
disappears, then the giant smiles... No smile before that, just big open
mouth." And: "the stone hands don't need to do anything yet out in the
world, just place them randomly in interesting places (islands, mountains
etc.)". And the village's mending steps on at each dungeon finished, to
start with.

- **The giant takes the light in its mouth.** The crow takes the light
  from the shrine and hops out as before. The giant's eyes open; then its
  mouth, wide, a dark hole under the eyes (`Giant.mouth`, `uMouth` in
  `GIANT_FRAG`; no smile first). The crow flies up and straight in, the
  light under it, and is gone (it isn't drawn again). The hole glows warm
  for a moment (`gulp`), the mouth shuts, and a beat later it smiles
  (`grin`). 24 s from the light leaving your shoulder, where the hand
  version took 33.
- **Everything to do with the hand is gone** from `giant.ts`, the shader
  and `offering.ts`: reach, palm, fingers, fist, glow, hold. The limb fix
  (arms and legs no longer sink twice) and the arms hanging down asleep
  stay. So there is no glow to fade.
- **The camera for the giant** is one place in front of its face and to
  one side, about level with it, 40 m off: close as its eyes open, back
  as the mouth opens and the crow flies up into frame and in, close again
  on the smile.
- **Where it ends:** the giant awake, mouth shut, a small smile, looking
  at the shrine; the crow gone; you on the rockhopper. A reload finds the
  same.
- **Stone hands** (`src/world/hands.ts`): the cave's hand (its shape is
  now `handBits()` in `dungeon/shell.ts`, shared) at 17 to 28 m tall, in
  the giant's blue, standing on small islands and the tips of headlands
  (dry, under 22 m, water at 70 or 140 m in at least 7 of 8 directions)
  and on summits (over 120 m, found by climbing from a few starts, falling
  away all round). A pure function of the seed: the world is cut into
  1.1 km cells, 60% of cells may have one, and a cell has at most one, at
  its most striking spot. Never within 420 m of the start, 150 m of a
  tower or 160 m of the ring. Cells are looked at one a frame as you
  travel (81 cells take 65 ms in all). You can't walk through one (a
  round post). They do nothing.
  On `hilda`, within 5 km of the origin: 19 hands, 9 of them on islands.
  Four were looked at (a spit in a lake, a summit, two lakeside slopes
  that the first, looser island test let through and the present one
  doesn't). Not looked at: how they sit on steep ground, or from far off.
- **The village mends a step at each dungeon finished** (owner, "let's
  start with that"). Recorded; it belongs with slice C and isn't built.
- **Checked** on the build as it stands: `offering.mjs` in the story on
  `hilda` and `frost` (play and the three reloads), `42`, and `hilda` at
  22:30; `dungeon.mjs quest` on `hilda` and `42` (40 steps each). All
  pass. Frames looked at for `hilda` and `frost`.
- **Rough:** the crow's wings are wider than the mouth and it simply
  stops being drawn at the lips; the crow never comes back (owner: "gone for
  good"); the white puffs by its mouth in some frames are its
  breath, which was already there; not played by hand; sounds unheard.


## The village mills about (2026-10-01)

The owner asked for the villagers to be less stationary. `Village.mill`
(`src/story/village.ts`) gives each spirit a small life while nothing's
wrong: on its doorstep for a while, then indoors (30%), over to meet a
neighbour (about 40%) or a stroll along the lane to look at something.

- **Indoors:** the door is now its own mesh, hung on its edge, and swings
  *in* (out would sweep whoever's on the step); the doorway behind it is a
  dark panel (a lit one, glass like the windows, blew out to white by day).
  The spirit's ground is its house's floor once it's over the step
  (`floor`), it walks in through the panel and is hidden until it comes out.
- **Talking:** two walk to a spot in the lane between their doors (or stay
  put if they're neighbours), face each other and take turns: `Spirit.gesture`
  (wave, arms wide, point, hop, cheer, nod), new, only read while settled.
  "Point" turns the pointer to a chimney or an end of the lane and the other
  looks too. The lower index keeps the talk's clock.
- **Waves:** across the way to whoever else is on their step (who waves
  back), and at you when you come within 5.5 m (at most every 20 s or so).
- They walk at 1.6-2.1 m/s (`haste`), out to the lane and along their own
  side of it (`along`), never through a neighbour's walls.
- **It stops at the giant's first felt footfall** (`still`, from `flinch` and
  `panic`): everyone stands where they are, anyone indoors comes out, and
  `panic` now runs each from the lane point nearest it rather than its door's.
- Behaviour timing uses `Math.random()` (not world gen; nothing is saved).
- Not done: nothing different at night (they could all be indoors), and
  "after we rescue them" has nobody to show yet: slice C isn't built. `mill`
  covers anyone not `taken`, and skips going indoors while the house is
  smashed, so a spirit flown home will stroll and talk as it is.

## Crows and a huddle under the giant (2026-10-01)

On `hildaz2` the snatching couldn't be seen: spirits vanished off the grass
with no crow in shot. Where the giant stops is set by the lane, and there
the pasture (where they huddle) is 40 m to its side, right under a hand; on
`hilda` it's 63 m in front. `Visit.clear` keeps a flying crow out of the
giant by lifting it over a hill-shaped roof that reaches out to twice the
giant's width, and a mark under that roof can't be flown to: the crow stayed
108 m up for the whole dive and was put down on the mark in the last few
frames (and back up as fast), the camera with it.

- A mark inside that reach (`bulk < 2`) is now flown *across* the giant, not
  from over it: the dive's control point is 80 m off to whichever side the
  crow is on (`UNDER.skim`), and the crow is let off `clear` over the last
  60% of the dive and the first 60% of the climb (`Bird.ease`, was a fixed
  10% at each end). So it goes over the top, comes down outside, and in low
  under the hand; and on out the other side.
- The camera behind the lead crow is let off by the same amount
  (`Bird.kept`), and `placeBeside` reads the way in from the curve's last
  leg, not from where the dive began.
- Marks outside the reach fly exactly as before (`hilda` checked).
- Not done: crows take no notice of trees or hills on the way in, here or
  before.

## The giant's mouth is a hole, and its clouds are for walking (2026-10-01)
- The owner: the breath and print steam round a sat giant were "more distracting than anything". Both now
  show only while `giant.walking` (`Giant.update`, `Trail.update(dt, near, walking)`). The puff at its mouth
  in the offering is gone too.
- The crow going into its mouth didn't read: the mouth was a painted ellipse, half of it buried in the chest
  boulder, and the crow just vanished at the surface. Now `GIANT_FRAG` discards the head inside the lip
  (`gape()`), and a second mesh (`hollow`: the head pebble again, BackSide, `uInside`) is what shows through:
  dark, lit in two hard rings by whatever light is in it (`gulp`, `gulpAt`). The crow flies along
  `Giant.throat` through the lips to the back of the hollow and the mouth shuts on it (`T.shut`, `T.closed`).
- The head sits sunk in the shoulders, so (a) with its mouth open it lifts and tips its head back (`chinNow`,
  `CHIN_*`), and (b) the other boulders aren't drawn where they run inside the head while the mouth is open
  (`uHeadInv`: within 0.86 of the head's unit space, or anything within its bounds seen through the hole).
- Check with `scripts/offering.mjs <dir> mouth`: the open mouth from three sides, then a frame every 0.2 s
  of the crow going in.

## Music: one exploration loop (2026-10-01)

- **What:** the bed / air / night layer / pluck mix of "Ambient soundtrack"
  above is gone. `src/audio/ambience.ts` now loops one file,
  `warm_field_v3_exploration_loop` (76 s), everywhere outdoors, at any
  hour, home or away. It never restarts while it sounds.
- **Why:** the owner wants to play with this one piece and decide whether
  it's the right musical language before any variations (home, night,
  highland, bog, flying, giant) or adaptive switching are made. Don't add
  musical layers or noise under it until asked.
- **Volume:** `Ambience.gains.music` (0.35; 1 is the file as made), also
  "Music > volume" in the panel. Separate from the effects' gain in
  `story/audio.ts`.
- **Fades:** `FADE` = 8 s in and out, squared so it's even to the ear. It
  fades in on the first gesture, and out for `hush` (the giant's visit, the
  offering, inside the dungeon), then back in.
- **Kept from before:** the padded-MP3 seamless loop (`PAD`, `LEN`), the
  `Sfx` context and own path past the compressor, silence while muted or
  hidden, dropping the decoded samples 45 s after falling silent.
  `atHome()` in main.ts went with the home bed; it's in git if a home
  variation wants it.

## Flying on foot is a dev setting (2026-10-01)
- **F no longer flies by default.** It only does while "Player > F flies
  (dev)" is ticked in the panel (H), or after `?fly=1` (`?fly=0` clears it).
  Kept per browser in `ow.devFly`. Unticking while flying drops you to walk.
- **Touch:** the Fly button shows only while that setting is on, so players
  on phones never see it; `?fly=1` is the way to get it there (no panel on
  touch).
- **Unchanged:** `?mode=fly`, `__ow.setMode('fly')`, the panel's mode list
  and the debug jumps still put you in fly mode regardless; the setting only
  gates the F key and the touch button. "F fly" is gone from the help line.

## The offering's crow walks (2026-10-01)
- **It walks to the bowl and back instead of hopping.** The giant's crows
  (`giant/birds.ts`) now have legs (the world crow's, from `crowParts`) and
  the world crow's walk: a `stand` bird walks whenever its owner moves it,
  paced by the distance covered (stride, waddle, head-bob), and its feet
  come together when it stops. `offering.ts` only slides it between its
  marks (`T.walk` in, `T.back` out); a soft `Sfx.step` at each footfall.
- **Legs elsewhere:** tucked back in the air (down for the last of a dive
  that ends standing), not drawn on a perch. Standing height is `STAND`
  (feet on the ground), so the stretch for the bowl is a small tiptoe
  (`Bird.reach` lengthens the legs to match).
- **No pause on landing:** it comes down and walks straight on (the look
  at you, `T.look`, is gone). The walk in starts at a trot and slows to a
  stop (`carry`), and `Birds` now shuts the wings and sits the body up over
  a moment (`Bird.shut`) instead of snapping, for every crow.
- **The sequence is 0.35 s shorter up to the take** (2.8 s walking in, where
  the look and five hops took 3.15 s).
- **Checked** with `scripts/offering.mjs <dir> every=0.5 play`: passes;
  frames show feet on the paving, mid-stride legs, and the beak at the bowl.

## The send-off starts where you are (2026-10-01)
- **Bug:** the send-off only ran while you stood "in the village" (32 m of
  the cabin or lane), but the pasture is ~53 m out. Ride or lead a creature
  in and stay by the stable, and the spirit cheered, went to the fence, then
  pottered: it never pointed you at the trail unless you happened to walk
  into the yard. (`scripts/sendoff.mjs` teleports to the yard, so it passed.)
- **Now** "at home" for the send-off is the village *or* within `PASTURE_R`
  of the pasture fence (`atHome`). It also comes over to you first
  (`send: 'come'`) rather than beckoning from across the yard, and if you
  leave it pointing at the trail's edge and go back home, after `SEND_LEFT`
  seconds it comes and starts over.

### The crow takes the light in its claws (2026-10-01)
- Owner's change: no more beak. The crow lands and walks up as before, then
  sinks on its legs, hops up over the bowl with its wings out and closes its
  claws on the light (`CROUCH_T`, `SNATCH` in `offering.ts`). It doesn't land
  again: it backs off and up (`hang`), beating on the spot (`hover`), turns to
  the giant, and flies into the mouth from there. The walk back out (`turn`,
  `back`, `wayOut`) is gone.
- `Bird.grab` (birds.ts): in the air, legs held straight down under it
  whatever the body's pitch, instead of tucked back. The light rides between
  its feet (`grip` + a little forward), and eases to the usual hang under it
  as it grows on the way up.

## Dungeon 1, slice C: the homecoming (2026-10-02)

Slice C of `docs/NEXT-dungeon1.md`: from the giant's smile to a spirit home
in the village, and the giant up and gone to a second ring. Dungeon 2 is
not started. `src/giant/homecoming.ts` is the sequence; the rest is
`WorldGen.dungeons` (worldgen.ts), `Giant.rise` (giant.ts), `onwardRoute`
(visit.ts), `Village.comeHome` / `mend` (village.ts), two-layer prints
(world/prints.ts) and the wiring in main.ts. The owner approved the plan
for the second site before it was built; everything else below is the
builder's choice. **Not played by hand.** Not committed.

### What happens
It carries straight on from the offering's last frame (`Offering.play` at
`T.end`), hands off, about 38 s more (75 s in all from coming up):
1. **A crow leaves** (4.6 s). Crow 0 lifts out of the giant's trees with
   its light and flies out past the camera; the giant's head turns after
   it. The veil comes up as it fills the frame.
2. **The village** (about 15 s). Only the camera goes; you stay at the
   ring on the rockhopper. The veil holds until `terrain.busy` clears
   round the camera (at least 0.45 s, at most 20 s). The crow comes down
   out of the sky beyond the wrecked house, lands beside its doorstep, the
   light swings forward out of its feet on to the step and is the spirit
   that lived there. The crow looks at it and flies off. The guide runs in
   from down the lane; they jump for joy; they turn to the wreck; its
   footing comes up out of the ground and its boards and stones hop, one
   after another, into a stack and round the footing; they jump again.
   Veil.
3. **The giant gets up** (about 14 s). Same wait for the land. From far
   off and side on: it comes up out of the ground over 8 s (`Giant.rise`),
   sets off after 5.2 s still coming up, and when it has taken 3.6 steps
   the camera cuts back to you. You've been turned to watch it go.
4. It walks on by itself, about two minutes, to the second ring and lies
   down 58 m or more short of it: dormant, eyes shut, no smile, solid once
   it has sunk. No dark spirit is let go.

### The second site (the plan the owner approved, as built)
- `WorldGen.dungeons`: a list, two long. `dungeon` is `dungeons[0]`.
  Found in stages in the getter: the first exactly as before (same code,
  with no other site standing), then `nextSite(first)` with the first
  already standing so routes go round its ring. `scripts/sites.mjs`
  prints a fingerprint of the first site and of the visit's footfalls:
  **unchanged on `hilda`, `42`, `frost`, `bergen`, `hildaz2`** against the
  build before.
- `nextSite`: candidates on rings of 900 to 1500 m round the first ring,
  nowhere within 900 m of the yard, scored for lying on beyond the first
  ring as seen from the village, open, low. Three passes of four
  candidates each (level and gentle; rougher and steeper; anything), each
  a `route()` from where the giant lay to 48 m short of the candidate,
  keeping 43 m off the first ring. Then the same fallback as the first
  site has (best place a ring can stand, a straight line to it).
- The world changes with it: nine bare stones at the second ring, and the
  way to it kept clear of trees and wild biomes like the first way. Stone
  hands keep off both rings.
- Workers never search: they're handed the list. Cache key
  `embla.dungeon.v7.<seed>`, an array.
- **Cost of the second search:** 0.3 to 1.9 s on the seeds tried (`hilda`
  0.28, `frost` 0.47, `bergen` 0.44, `42` 0.62, `hildaz2` 1.87). The
  first site's search is what it was: 0.8 s on `hilda`, 15 s on `42`
  (which fails every route before it falls back; that was so before).
- `42`: no way reaches the second site either, so its way is a straight
  line across two lakes. 27 of its 57 footfalls are in water (the giant
  wades; a print in water isn't left). You swim or go round.

### Rising (`giant.ts`)
`rise()`: no longer dormant; `sink` runs back down over `RISE_TIME` (8 s);
`shell()` is null the moment it isn't dormant, so it isn't solid from the
first frame. Its feet are put together under it while they're still 43 m
down (`place` at its pelvis), and its old route is dropped, so `walkRoute`
starts clean. `Visit` used to free the dark spirit whenever the giant had
"arrived"; that is once only now (`settled`), or getting up and arriving
again would have dropped one into the sealed ring.

### Where the way on runs back along the way in
On `hilda` the first ring is on a headland and the only dry way on goes
back up the way the giant came for a few hundred metres. Two things:
- **It treads in its own prints** (`onwardRoute`'s `back`): from the last
  print that isn't under it, each old print in turn, turning round over
  its first three steps, for as long as the new way lies within 12 m of
  the old line. On `hilda` that is only about four steps; after that the
  new way runs beside the old, 15 to 30 m off.
- **Prints overlapping cut pieces out of each other**: the print texture
  held one print per 12 m cell, and a new print took the cell from the old
  one, which then stopped dead at the cell's edge. Seen from above on
  `hilda` (half prints, U shapes). **`world/prints.ts` now holds two
  prints per cell** (two layers in the one texture; `printAt` in the
  shader and `Prints.at` take whichever sole is nearer the point). Now
  overlapping prints run together into trampled ground. Three deep still
  loses the oldest.

### The village (`village.ts`)
- `comeHome(k, at)`: not taken, itself, its own life again; `mill` runs
  again for whoever is home (it was switched off for good by the first
  footfall).
- `mend(i)`: **what "one step" is, the builder's guess:** the returned
  spirit's own house only. Its footing (the hut's own footing geometry)
  comes up where it stood; its 26 boards are trimmed to much the same
  length and stacked four across beside the plot; its 8 stones go to the
  footing's corners and the middles of its sides. The spirit then spends
  most of its time walking between stack and footing and hopping, nodding
  or throwing its arms wide at them (`work`). The footing is a step you
  and it can stand on. The other seven wrecks are untouched.
- **The giant's print under that house is filled in** (`Trail.fill`,
  `Prints.erase`), under the veil, before the camera arrives. The house
  stood exactly where a foot fell, so the plot was the bottom of a 1.9 m
  pit: the first version laid the footing at the old ground level, 2 m up
  in the air over the pit, and the camera sat in the pit looking at its
  wall. Prints were permanent until this.

### Cameras (planned first; three goes at two of them)
- **Crow leaving:** 52 m in front of the giant, 20 m to the clearer side,
  a little under its treetops, fov 34, following the crow. Worked first
  time.
- **Village:** 9.5 to 13.5 m out from the door, low, a little round to
  the stack's side, wherever is clear of trunks; then raised until the
  doorstep and the plot are in plain sight over the ground between (a
  neighbour's print has a rim). It looks up at the crow coming in and
  settles on the doorstep.
- **The giant getting up:** side on to the way it's about to go, 190 to
  245 m off, fov 38, looking at where its chest will be. First go: in the
  woods, treetops filling the bottom half. Second: open ground, but fov 33
  cut its head off as it stood, and on `42` it was perched on a hillside
  looking down a slope. Now scored for open ground, level ground under the
  camera, and how much the land between hides. **You and the ring are not
  in this shot** on most seeds (on `bergen` the ring's stones are at its
  feet).
- **Handing back** is a cut, not an ease (easing 200 m back went through
  trees). The orbit camera is put behind you, or as near behind as has a
  clear look at you past the ring's stones and the shrine (`backYaw`): the
  first version put it squarely behind a standing stone on `hilda`.

### Saves
`embla.home1.<seed>` = `1`, set the moment the spirit is on its
doorstep (outside the story: when the giant starts to rise).
- Before that (the offering `given`, this not saved): a reload puts you by
  the shrine on the rockhopper and the homecoming plays from its start,
  once the loading veil has gone. **A save from slice B at `given` gets
  slice C this way on its next load.**
- After it: nothing replays. Spirit home, house mended, its crow without a
  light, every print of the walk laid, the giant asleep by the second
  ring. So a reload while the giant is walking finds it already there.

### Checked (the build as it stands unless said)
- `scripts/sites.mjs` on `hilda`, `42`, `frost`, `bergen`, `hildaz2`,
  `7`, `fjord`: sites, fingerprints, and the walk on (no footfall on a
  ring or tower; it ends 50 to 76 m from the second ring).
- `scripts/dungeon.mjs quest` on `hilda` and `42`: pass, now through the
  giant getting up (W held; not moved; not solid; still mounted).
- `scripts/offering.mjs play,reload` on `hilda`: pass.
- `scripts/offering.mjs home` in the story on `hilda`, `42`, `frost`,
  `bergen`, and `hilda` at 22:30: every part runs, W held throughout and
  nothing moves, one spirit home and one house mended, the crow's light
  gone, the giant up and not solid, you can ride after; then reloads
  while it walks, once settled, before the spirit is home (mid-flight),
  and just after the spirit is home. And `sandbox` on `hilda`, which
  walks the giant the whole way: it lay down, sank, was solid again, eyes
  shut, with prints all the way.
- Frames looked at for all of those: the three shots, the hand-back from
  the saddle, the mended house from the lane after a reload, the first
  ring without the giant, the second ring with it; and the prints from
  above on `hilda` at the turn, the fork and the end.
- The night run and the sandbox's whole walk were on the build before the
  last change (the hand-back camera's angle); the four story seeds, the
  quest and the offering were run again after it.
- **Frame cost** (`shots.mjs --perf --uncapped`, twice each): 5.58 and
  5.57 ms average, p99 9.3, with two print layers; 5.48 and 5.55 with the
  second layer's fetch taken out. No measurable cost. (The budget in
  WORKFLOW says about 4 ms; today's build is 5.5 with or without this
  slice's shader change, so that is something else, or the machine.)
- Two script races, not game bugs, fixed in the script: a page load runs
  real frames before the script takes over, so "reload mid-flight" could
  find the scene already at the village.

### Rough / open
- **Not played by hand.** Timing, sound and whether the three shots read
  as one story are unjudged. Sounds are existing ones reused (whoosh,
  thud, chirp, stomp, slot per board, fanfare) and unheard.
- **The second ring is a dead end and nothing says so.**
- On `hilda` the first stretch of the walk on runs beside the walk in and
  the two sets of prints run together into a trampled strip. It doesn't
  look broken any more; it doesn't look like a clean trail either.
- The giant turns right round on `hilda` in three steps. Seen only from
  200 m.
- `42`'s rise shot still has a hillside across the bottom of the frame.
- From the saddle after the cut you are in plain view on all four seeds,
  but the giant is often partly behind a ring stone or off the edge of the
  frame (`bergen`: not in it at all until you turn).
- The crow's light (1.1 m) is twice the size of the spirit it becomes.
- The spirit looks pale for a second at night as it turns away from the
  camera to the guide (its back isn't lit).
- The "hop off / gallop / bound" hint bar shows through the whole
  cutscene, as it did through the offering.
- The guide's and the explorer's moods are unchanged by a spirit coming
  home (`down`, `sad` in the village).
- The stack of boards is chunky and the footing is a plain slab.
- The veil is the dungeon's violet.
- Beside `/inspo`: the rise shot is the nearest thing in the game to the
  reference's layered landscape (banded hills, a flat sky, one big shape),
  and holds. The village shot is plainer than the reference: open ground,
  a slab and a stack, with little in the foreground.
- **No look at the wrecked house** (owner, 2026-10-02: with the stable
  built the grieving's over, it's back in action). `come` goes straight to
  `lead`. And the lead is loud now (`want.rally` in `spirit.ts`): on the way
  the `prints` bubble stays up (seen from 20 m) and every `RALLY_GO` seconds
  it stops, turns and waves you on with a call; at the edge it hops and
  points down the trail, then turns and waves you over, round and round.

### The homecoming, after the owner's first look (2026-10-02)
Owner: "the crow dropping the spirit looks off... make the crow drop it from
above the ground a bit. It lands with a cloud of dust (somewhat obscuring
the transformation from orb to spirit). Remove the cabin foundation
sequence thing entirely, lets just have that be there already... have the
crow drop the spirit near my cabin where my spirit is there and they go up
to each other and celebrate. Don't show a shot of the new cabin foundation
thing at all, that will just happen in the background." And: "When the
giant gets up, we need some kind of standing up animation. it looks bad how
he is just like elevating vertically."

- **The village shot is at the guide's cabin now**, and about 9 s (was 15;
  the homecoming is about 32 s, was 38). The guide is on its doorstep. The
  crow comes in over the cabin's roof, 7 m up, lets the light go as it
  passes over the yard and **doesn't stop**: it flies on up and away over
  the lane and is out of sight before the veil, under which it is put back
  in its tree. It is never seen to vanish. The light falls, lands in a
  cloud of dust (three bursts), and the spirit comes up out of the dust.
  A beat; the two run to each other and jump for joy.
- **The mending isn't shown.** `Village.mend(i, true)` is done at once
  under the veil, with the print under that house filled in. Afterwards the
  spirit walks home down the lane by itself and potters at its own plot,
  where the footing and the stack already are. `Village.mend`'s animated
  tidying (boards hopping into a stack) is still in the code and no longer
  used by anything.
- **The giant stands up** (`UP` in `giant.ts`), and lies down the same way
  backwards. In the first 45% it comes out of the ground folded into a
  squat: hips 10 m up, knees up and forward, leaning well forward, hands
  on the ground in front of it. Then it pushes up: legs straighten, a
  further lean at the middle of the push, the hands stay on the ground
  until the shoulders lift them off, and it straightens. 9.5 s (was 8), and
  it sets off 8.2 s in. **This changes how it lies down at the first ring
  too** (it squats and then sinks, where it sank standing).
  `scripts/rise.mjs <dir>` shoots it close to, from the air.
- **Neither the guide nor the explorer is downcast once a spirit is home**
  (owner: "yes they should" stop): `Homecoming.home` switches off the
  `down` / `sad` / `set` moods in main.
- The owner's other answers are in `docs/NEXT-dungeon2.md`.

## A house built again in five steps (2026-10-02)

Answer 4 of `docs/NEXT-dungeon2.md`. The owner, on the plan
(`docs/PLAN-rebuild.md`, kept as written; this section is what was built):
"step zero is literally nothing, no footing nothing"; "no see-through
stuff. it would make it seem like the user is meant to build it"; "I don't
think we need to see them actually working. it just sorta invisibly happens
when the user is away (really just at the completion of a dungeon)".

- **`Village.setStep(i, n)`** replaces `mend`. `House.step`: 5 (`HOME`) is
  whole, as is a house never trodden on; `smash` sets 0. From any step to
  any step, at once, nothing animated. `buildStage(variant, step)` makes
  steps 1 to 4 from the same `HUTS` numbers as the hut, so the three kinds
  and their colours follow:
  0. nothing: the wreck as it fell, in the giant's print;
  1. the stone footing and doorstep; all 26 boards stacked beside the plot,
     the 8 stones round the footing;
  2. board walls to 45% of their height, a dark gap for the door, the
     chimney begun, a dark lid for the hollow inside; 18 boards, 4 stones;
  3. walls to the eaves, both gables, a ridge beam, the whole chimney, door
     and windows as dark holes, open to the sky; 10 boards;
  4. the roof boarded in fresh-cut wood (`K.cut`: `K.boards` was nearly the
     finished roof's brown and step 4 looked like step 5), window bars, no
     door, no light, no smoke; 4 boards;
  5. the hut itself (its own meshes shown again): door, lit window, smoke.
- **No frame step.** Every step is a solid built thing. A post-and-beam
  step was in the plan and cut on the owner's word.
- **Dungeon 1 leaves step 0.** `homecoming.ts` no longer fills the print or
  lays anything (its `fill` dep is gone). A save from after the homecoming
  loses the footing and stack it had.
- **The print is the caller's to fill** before step 1 or more
  (`trail.fill`; `__ow.house` does it). `Village` doesn't know the trail.
- **Underfoot:** nothing at 0; the footing's top at 1 (you and the spirit);
  the flat top of the walls at 2 and 3, and they push you out; the roof at
  4 and 5. For its spirit, steps 2 to 4 have the door's way in like a whole
  house. `scripts/rebuild.mjs` prints the heights.
- **Work isn't shown.** `work` is what it was (to the stack or the plot, a
  hop, a nod, arms wide), at steps 1 to 4 only. No tools, no carrying:
  later if wanted.
- The old animated tidying (boards hopping into the stack, the footing
  rising) is deleted; nothing used it.
- **Not wired:** steps 1 to 5 are reached only by `__ow.house(i, step)`,
  which saves nothing. To come: which houses step on per dungeon, and a
  saved step per house.
- Checked: `scripts/rebuild.mjs shots/rebuild` on `hilda`, all 18 frames
  and the sheet looked at. Beside `/inspo`: flat fills, warm outlines, the
  huts' own colours; each step reads apart from its neighbours at lane
  distance. Rough: the step 1 footing is a low grey slab that half sinks
  on a slope and reads as a patch more than masonry; step 2 is a plain
  box; in the dev shots step 0 has no print (no giant has walked), so the
  real step 0 (wreck in a pit) was not photographed here.
- **Checked** on this build: `offering.mjs home` in the story on `hilda`,
  `42`, `frost`, `bergen`, and `hilda` at 22:30, and `sandbox` (the whole
  walk, and lying down at the second ring by the new squat); `dungeon.mjs
  quest` on `hilda` and `42`; `offering.mjs play,reload`; `visit.mjs`
  (the giant's first lying down). All pass. Frames of the drop looked at
  on all five story runs, and the stand-up on `hilda` from the game's
  camera and from `rise.mjs`.
- Two checks in `offering.mjs` were racy and are loosened: a reloaded page
  runs real frames before the script takes it over, so how far the
  homecoming had got varies. (The mending now happens under the first veil,
  so "nothing mended yet" was no longer true mid-scene either.)
- **Rough:** the falling light is big in frame for a moment (it lands 8 to
  10 m from the lens); the crow is at the top edge of the frame as it lets
  go; at night both spirits go pale for a moment after they jump (seen in
  one frame, not run down); the stand-up is only seen from 200 m in the
  game; not played by hand.

## Less water (2026-10-02)

Owner: too much of every seed is water; lakes and inlets cut the map up, on
`42` no dry way reaches either dungeon site and the giant wades two lakes.
Wanted: clearly less water on every seed, still Nordic (fjords and lakes,
fewer and smaller). **This moves every seed's world.** Not committed, not
played by hand.

### What changed (`worldgen.ts`)
- `landAt`: the bias on the continent noise 0.08 -> 0.26. Most of the old
  water was this: about 45% of the map was under the land mask's sea.
- `baseHeight`: inland ground sits at 13 m, not 5 (`lerp(-34, 13, land)`).
- The hills term: hollows are 0.4 as deep as hills are high. At 5 m with
  full hollows every dip in the hills was a pond; now, on full land, the
  hills alone never reach the sea, so water is made by the land mask and
  the valleys and not scattered about.
- The valley network: 0.85 as wide, and **sills**: a 1.5 km noise (the
  mask's noise, offset; no new noise field, so the seeding of the others is
  untouched) lifts the floor from -8 to +6 m along about a third of a
  lowland valley's length. A valley is a chain of lakes with dry ground
  between, not one ribbon across the map. Highland fjords (`hl`) keep
  their floor.
- `forestBase`: threshold `f + 0.02` -> `f - 0.06` (forest is about 29% of
  the land, was 36%). Not asked for: see perf below.
- `nextSite`: the way on keeps 75 m off every tower. On `hildaz2` in the
  new land the giant trod on a tower's feet (three footfalls);
  `sites.mjs` caught it. The first way already did this for its own tower.
- `primeDungeon`: cache key `embla.dungeon.v8`.

### Measured (`scripts/water.mjs`: a 12 km square round the start, every 40 m)
`water` is the share under sea level; `reach` is how much of the land within
3 km of the start you can walk to dry (above 2.2 m, as `route` has it).

| seed | water before | after | reach before | after |
|---|---|---|---|---|
| hilda | 44.2% | 20.4% | 94% | 99% |
| 42 | 43.8% | 20.5% | **2%** | 99% |
| frost | 45.1% | 19.2% | 99% | 99% |
| bergen | 40.2% | 17.0% | 100% | 100% |
| hildaz2 | 50.3% | 22.1% | 91% | 99% |
| 7 | 45.9% | 17.3% | 97% | 99% |
| fjord | 46.2% | 19.9% | 99% | 99% |
| 1 | 44.7% | 17.3% | 86% | 100% |
| troll | 49.1% | 22.6% | 84% | 100% |
| saga | 48.3% | 24.6% | 99% | 100% |
| mean | 45.8% | 20.1% | 85% | 99% |

Shore flats (land under 3 m) went from 6.5% of the land to 1.8%. Separate
bodies of water in the square: about 250 before, about 180 after (most are
a cell or two; the count is by a 40 m grid).

`scripts/sites.mjs hilda 42 frost bergen hildaz2 7 fjord`:
- Before: `42` both sites were the fallback (a straight line), 27 of 57
  footfalls of the walk on in water, and 15 s to search. The other six: real
  routes, wades 0.
- After: **all seven, both sites from a real route, wades 0**, no way point
  in water, nothing on a ring or a tower, the walk ends 46 to 73 m from the
  second ring. Every first way goes by a tower now (before: not on `7` or
  `42`). Search 2.8 to 4.7 s (`42`: 3.9 s, was 16).
- `scripts/village.mjs survey`: all 40 seeds get a lane (2 the short one).
- `scripts/dungeon.mjs quest` on `hilda` and `42`: pass.
  `scripts/offering.mjs play,reload,home` on `hilda` and `42`: pass, frames
  looked at.
- Maps of before and after are in `shots/water/` (`before-*.png`,
  `after-*.png` from `sites.mjs`; `map-*.png` from `water.mjs`), and the
  shot list before and after in `shots/water/before|after/`.

### Perf (`shots.mjs --perf --uncapped`, M1 Pro)
More land is more trees and more chunks with props on them.
- Before: 5.84 ms average, p99 10.8; 3.56 M tris, 587 calls, 98 k instances.
- After, forest as it was: 7.96 ms, p99 13; 6.0 M tris, 759 calls, 162 k.
- After, forest thinned (as left): **7.1 ms, p99 11.6**; 5.2 M tris, 760
  calls, 145 k instances.
- Thinning further (`f - 0.1`) didn't help (6.85): what's left is draw
  calls, not triangles.
Not like for like: the start site moved, so the run is somewhere else.
But it is slower, about 20%, and the budget was already tight for
integrated graphics. **Left as it is; the owner should decide** (below).

### The look, beside `/inspo`
- Holds: banded hills behind a lake, groves and open slopes, the dawn and
  dusk frames. Nearer to inspo/1 (hills and forest to the horizon) than
  before; further from the old `seed-fjord-aerial`, which was an
  archipelago of islets and inlets and was the best water frame the game
  had. That frame is now a hillside over one lake. Nothing like it has
  been looked for in the new world.
- From above, water is now a few big lakes (0.5 to 1.5 km), thin valley
  lakes in chains, and bog meres. Coast is rare within 6 km of the start:
  on most seeds there is no open sea in the square at all, only lakes. If
  "fjords" means sea reaching inland, there are fewer than "fewer".
- Sills are plain ground: a valley floor at 0 to 6 m between two lakes,
  flat, no stream on it. Nobody has stood on one.
- The thinner forest is visible: more open ground round the start on
  `hilda` and `fjord`.

### Saves an old save now has wrong
Everything is the seed's, and the seed's land moved. Nothing is migrated
and no save version was bumped except the site cache.
- `embla.dungeon.v7.<seed>`: the sites. **Bumped to v8**, so found
  again. (The old key is left behind in storage, unused.)
- `embla.story.<seed>`: `world` (the harvest: felled trees and smashed
  rocks by world cell: now holes in the forest where you never were, or
  nothing), `felled` / `smashed` (indices into the start site's own trees
  and stones: other trees now). Step, inventory and what is built are by
  id and still mean what they did, at the new site.
- `embla.towers.<seed>`: lit tower ids. The network is regrown, so the
  same ids are other towers, somewhere else.
- `embla.journey.<seed>` (and `.ring`): the stage names the second
  tower and "found the ring": true of a tower and a ring that are now
  elsewhere.
- `embla.offer1.<seed>`, `embla.home1.<seed>`,
  `embla.dungeon1.<seed>`: flags only; the prints, the giant's place,
  the shrine and the mended house are worked out from the seed again, so
  they are consistent, in the new places. Not wrong, but not where you
  left them.
- `embla.herd.<seed>`: no positions. Fine.
- Bicycles, stone hands, creatures: seeded, not saved. They moved.
Simplest for a player: an old save keeps its story step and plays on in a
different land. Whether to wipe instead is an open question.

### Left rough / open questions
1. **Perf**: about 20% slower where measured. Take it, thin the forest
   more (didn't help), or cut prop draw distance / merge prop batches
   (not tried)?
2. **How little water?** 20% is the builder's guess at "clearly lower".
   The bias in `landAt` is the one knob to turn: 0.2 gives about 26%.
3. **The sea**: is losing most of the coast near the start all right, or
   should one arm of sea be guaranteed in sight of the village?
4. **The forest was thinned** to pay for the land, unasked. Put it back
   (`f + 0.02`) and take 8 ms?
5. **Old saves**: wipe them (bump `SAVE_VERSION` and the other keys) or
   let them play on in the new land with the harvest and lit towers wrong?
6. The shot list's framings were made for the old land (`seed-fjord-aerial`
   and `vista` most of all). They want choosing again.
7. `scripts/water.mjs` measures the base height, without the bogs' meres
   and the brook.

### Less water: the owner's answers (2026-10-02)
- 20% water: good. The coast and the thinner forest: fine so far.
- **Old saves are wiped.** `WORLD_VERSION` in `main.ts` (`embla.world`
  in storage): when it differs, every `embla.*` key of every seed is
  removed before anything reads one. Bump it with any change that moves the
  land (and the site cache key no longer needs its own bump for that, though
  it does for a change to the search). Dev keys (`ow.*`) are kept.
- Perf (about 20% slower) and the shot list's framings: each handed to a
  new session (a perf audit; choosing the shots again).

- The owner (2026-10-02): the giant's breath clouds "sorta puff out of its non existent mouth". Removed
  altogether (`onBreath`, `giantBreath`). The dust ring of each footfall stays (`giantDust` in `onStep`),
  and so does the steam off warm prints while it walks (`Trail.update`): ground level, not off the giant.

## The guide in despair on the walk home (2026-10-02)
Owner: sadder on the trudge, "depths of despair" until the stable begins.
- The levels, lightest first: `mood = 'down'` (frown, heavy lids, gets on
  with things), `mood = 'sad'` (reaching up after what's taken), and
  `sullen` on top of `down` (the `trudge` and `grieve` stages). `sullen` is
  now the bottom: eased in and out as `gloom`.
- What `sullen` adds: its colour sinks toward `ASHEN` and the ember glow
  and blush go (whatever its warmth); lids cut on a slant, low at the outer
  corner (`uSad.x` in `CREATURE_FRAG`, the mirror of `uBrow`); a wider,
  deeper frown that trembles; bent further over with the arms dangling in
  front; a slower, flatter plod with more sway; a heaved sigh every `SIGH`
  seconds; a tear from one eye every `TEAR` seconds (`uSad.y`).
- Pats and acts still override it, and it ends where it did (the stable
  beginning). No sound added.
- `scripts/trudge.mjs`'s `grieve-*` shots are taken after the grieving has
  already run out on the walk (`GRIEVE` counts from setting off), so they
  show the stable's first step, not the grieving.

## The planted woods are gone; forest grows round the start (2026-10-02)
- **What:** `Woods` / `plantWoods` (up to 95 conifers the story added round
  the start clearing and beside the arrival path where the natural forest
  was thin) are deleted, and with them the idea of the story planting
  trees. Every standing tree is a world tree, so every tree can be felled.
- **Why:** they were off the harvest grid, so the axe never found them, and
  they had drifted into the village. `plantWoods` took "every site path
  after the first two" as the arrival path; once the pasture path, the
  village lane and the door paths were appended to `site.paths`, most of the
  planting landed 5-14 m either side of the lane: lone unchoppable trees
  among the houses.
- **What holds the bend reveal now:** `WorldGen.startWoods`, a 0..1 field
  that `forestDensity` takes the max with: full within 26 m of the spawn and
  within 15 m of the outer 70% of `StorySite.approach` (new: the arrival
  path, yard -> clearing), fading over 7-8 m, and nothing within 24 m of the
  cabin or 10 m of the village lane. The ordinary scatter then grows the
  trees (and keeps them off the paths, the clearing and the plots, as
  anywhere). It was needed: on `hilda` the trees round the start were all
  planted ones, and without them the cabin is in view from the first frame.
- **Not in `forestBase`**, which is what the site, towers, dungeons and
  routes are placed on, so none of those move. Trees, bushes and the forest
  floor near the start do, so `WORLD_VERSION` is 3.
- Shots: `shots/woods-before-*` (planted), `shots/nowoods-*` (deleted, bare
  start), `shots/startwoods-*` (now).

## Music: the giant's visit (2026-10-02)

- **What:** three one-shot pieces (`giant_emergence` 24 s, `giant_village`
  34 s, `giant_aftermath` 28 s; `public/audio/*.mp3`, from the WAVs by
  `scripts/audio.mjs <folder>`) play through the visit, cross-faded, with
  the effects over them as before. `Ambience` only plays and fades
  (`CUES`, `score`); which piece is `Visit.music`, set where the visit's
  own events happen, no timers of the music's own:
  - `giant_emergence`: `Visit.start()` (the giant begins to come up; the
    loop goes out over `FADE` = 8 s from the same moment, as it already did).
  - `giant_village`: in `onStep`, the last footfall before the first house
    (about 22.75 s in), over 3 s: it is fully in as the first house bursts.
  - `giant_aftermath`: `cue.aloft` in `update` (all taken, the camera goes
    up among the crows and their lights; 6.5 s before `g.resume()`), over
    5 s: it is fully in about a second before the giant walks on.
  Then it plays out (about 17 s after the camera is handed back), `REST` =
  4 s of nothing, and the loop comes back over `FADE`.
- **Why those and not the smash and `resume()` themselves:** the first two
  pieces end at full level (they're made to be cross-faded out of), and
  their lengths are the scene's: 24 s to the first house, 34 s more to
  where it walks on. Triggered on those events exactly, each piece had
  already run out when the next began, so there was nothing to cross-fade.
  One event earlier each gives a real overlap.
- **If the scene runs long** (frames slow enough that game time lags the
  clock): a piece that reaches its end with nothing after it goes out over
  its last `TAIL` = 2 s, not a click, and there's silence until the next
  event. Seen only in a slow headless run from the tower.
- **Volume:** `gains.music` as before; the pieces get `gains.scene` (1.4)
  on top, since they're mastered about 3 dB under the loop (-16 to -13.4
  LUFS against -11.6). "Music > giant scene x" in the panel.
- A reloaded save after the visit plays none of it (`restore` leaves
  `music` null).
- Check: `node scripts/music.mjs [seed=..] [tower] [real]`.

## The pointer, restyled (2026-10-02)

The owner disliked the orange arrowhead: its look, where it sat (the
screen's edge, or hanging over the target), and that it showed at the very
start.

- `story/pointer.ts` is now a small pale chevron (cream stroke, no fill, no
  ink line, no glow, 60% at most) that stays by the explorer. It sits where
  a ring on the ground round their feet (`RING`, 1.7 m) projects on screen,
  on the side the task is on, and points straight out from them. Kept
  between `MIN_R` and `MAX_R` px off the explorer and inside the screen.
- Tried first: the chevron drawn flat in the ground's plane (a CSS matrix
  from the projected ground axes). At a low camera it sheared into a
  sliver that didn't read as an arrow. It's drawn upright now; only its
  place follows the ground ring.
- `Story.guide` returns nothing for phase 1's `meet`, so nothing points
  before you've met the spirit. Phase 3's `plot` (also a `meet`) still
  points. The 15 s `DELAY` and the fade by distance are unchanged.

Later the same day, the owner's second pass: waist high, glowing orange but
still translucent, and behind the explorer rather than drawn over them.

- No longer HTML. It's a camera-facing quad in the story's overlay scene
  (`overlayMat`, the one place with real transparency), the chevron and its
  halo drawn by a distance field in the fragment shader. `uThrough = 0`, so
  the overlay's depth test hides it wholly behind anything solid: the
  explorer, a mount, a tree.
- It hovers at `WAIST` (0.6 m) on a ring of `RING` (2.1 m; 1.3 at first, then the owner asked for farther, bigger and fainter: `PX` 104, `MAX_A` 0.6, a soft-edged stroke in a wide dim halo), lifted to
  `CLEAR` above the ground where a slope would swallow it. A set size on
  screen (`PX`). The dungeon swaps the overlay scene, so it can't show there.
- Known cost of going behind the explorer: with the camera behind them and
  the task dead ahead, the chevron is mostly hidden by their body. Told
  the owner; left as is (out of sight roughly means "you're facing it").

## The guide's shot at the tower: it bolts into the doorway (2026-10-02)

- **What:** in the giant's visit watched from the home tower, the guide's
  reaction shot is no longer it standing in the open by its bike. It runs
  for the doorway and into the room in the tower's foot, turns, looks one
  way, the other, then out and up, frightened. 4.6 s (`GUIDE.run` 1.9 +
  `GUIDE.look` 2.7) against 3.1 s before: asked for, "1-2 seconds longer".
- **How:** `placeGuide` (at the moment the giant stops, the camera away)
  puts it `DEN.from` out in front of the doorway; `GUIDE.lead` before the
  cut it's sent to `den` (inside, `DEN.in` behind the opening) at
  `GUIDE.speed`, so the shot opens on it already running. The camera starts
  out in front and to one side (whichever is clearer of trunks and rock)
  and comes in after it to the doorway. Where it looks is `stage.face`,
  on a timetable in `update`. It stays 'scared' (no 'sad' reach here: that
  is still the shot at home).
- Its bike is no longer stood beside it for the shot (`standBike` and the
  `bike` dep are gone): it stays where the ride left it.
- `spirit.ts`: a settled spirit that's 'scared' doesn't glance round at you
  pleased (you're right over it, up in the head).
- The music is unmoved on `hilda` (`giant_aftermath` still at 17.6 s after
  it stops: with eight spirits the last crow up sets `cue.aloft`, not this
  shot). With five or fewer it would come 1.5 s later.
- Check: `node scripts/visit.mjs <dir> tower fine`, frames at 9.7-14.3 s
  after it stops. Shots: `shots/dash/sheet.png`.

Third pass, same day. The owner: "it spins around relative to the
destination but doesn't pull you there". The cause: the chevron was a
billboard, always flat on to the camera and turned on the screen, so it
slid round the explorer as a 2D glyph and never pointed *into* the picture.

- It now lies in the world: a quad spanned by the way to the task and the
  across of a plane that is flat but leant toward the camera (`LEAN`), so
  a low camera never sees it edge on (the fault of the very first, HTML,
  flat attempt). Ahead of you it points away into the scene.
- Three chevrons in a row with a brightness pulse running outward (the
  ">>>" idiom), the outer ones brighter: that's the pull.
- True size, held between `MIN_PPM` and `MAX_PPM` px to the metre.
- Still wholly hidden behind the explorer when the task is dead ahead of
  a camera behind them (about 10 degrees either side). Open with the owner:
  a faint show-through (`uThrough`) would fix it, against their ask.

## Perf audit after "Less water" (2026-10-02)

Measured only; **no game code changed**. Scripts added: `scripts/perf-audit.mjs`,
`scripts/perf-profile.mjs`; `scripts/shots.mjs` gained `--dist <dir>`.

### The headline
On a quiet machine the default perf run (`shots.mjs --perf --uncapped`, M1
Pro, 1600x900) is **5.53 ms average, p99 8.8 to 9.0** (two runs: 5.53, 5.52;
411 nodes, 145 k instances). That is under the 5.84 of before the water
change. The 7.1 ms recorded in "Less water" was very likely taken while
something else had the GPU: on the day, the same still frame read 6.2 ms
quiet and 20 to 60 ms with a game tab and other sessions' headless browsers
running. Whether the old 5.84 was itself quiet is unknown, so "20% slower"
may be partly or wholly an artefact.

### Measuring: what went wrong, so it isn't repeated
- **Timings need the GPU to themselves.** A game tab open in a browser, or
  another session running any headless-browser script, doubles to tenfolds
  them. Ask the owner for a quiet window. Counts (calls, triangles) are
  fine at any time: `perf-audit.mjs --counts`.
- **Uncapped rAF intervals standing still are not reliable**: the same view
  read 4.7 or 13 ms depending on whether the canvas had just been resized
  (a `renderScale` toggle there and back). The moving `--perf` run was
  steady (5.53 / 5.52).
- **`gl.finish()` does not wait in Chrome.** The audit's toggles step
  frames by hand and wait with a one-pixel `readPixels`. That serialises CPU
  and GPU, so its absolute times are high (11 ms where the pipelined frame
  is about 6): read its differences, not its totals.
- Build into a folder of your own (`vite build --outDir dist-x`,
  `--dist dist-x`): another session's `npm run shots` replaces `dist/`.
- Don't kill browser processes by name: other sessions have their own.

### Where the frame goes
One thing off at a time, GPU waited for; two places only (the window ran
out), share of that place's frame:

| what | start, hilda | thickest forest, hilda |
|---|---|---|
| trees | 36% | 54% |
| ground and water | 12% | 5% |
| half the pixels | 10% | 10% |
| ground shadow pass | 6% | 7% |
| bushes, rocks, tufts, flowers, cabins together | 10% | 12% |
| FXAA, layer fog, outlines | 1 to 2% each | under 2% each |

**It is triangles, not draw calls** (against the guess in "Less water"):
trees are 1.9 to 3.7 M of the 4.2 to 9.0 M triangles drawn, about 185 a
tree for 10 to 14 thousand far trees (an average over the two far shapes,
from the counts). Fill rate is minor on this machine; unknown on
integrated graphics. Main thread: 2.9 to 4.7 ms a frame, of which the game
itself about 0.5; the rest is issuing draws.

Counts at nine places (start on hilda, 42, fjord; forest on hilda, 42;
vista; high on hilda, fjord; night): 640 to 890 calls, 4.2 to 9.0 M
triangles. Per frame, typically: ground 71 to 99 calls, water 49 to 83,
far trees 70 to 107, cabins 51 to 79 (for about 140 cabins), far rocks 42
to 54, flowers 27 to 76, tufts 14 to 30, bushes 11 to 30; the shadow pass
85 to 151 (every kind in every chunk near you is its own draw); the
explorer 44; beacon towers 50 to 100 (culling off). Files:
`shots/perf/counts-before.txt`, `audit-before.txt`, `base-perf.txt`.

### Not built (candidates, gains guessed, none measured)
- A. Shadow casters as three batches, not 100 to 150 draws: 2 to 4%, no
  look change.
- B. Merge cabins, rocks, bushes across far chunks (about 130 calls): 2 to
  4%, no look change; loses per-chunk culling for them.
- C. Tighter culling spheres on prop batches (now `size * 0.75 + 30`):
  1 to 3%; wrong bounds make things vanish.
- D. A fourth, simpler conifer for distant trees: 15 to 25%, **changes the
  look**. The owner handed this to a new session the same day.
- E. Shadow mask every other frame: about 3%, sway at half rate.
- The shadow pass also runs at night; not looked into.

### Open
1. Is 5.5 ms enough, or is headroom for integrated graphics wanted (then A
   and C, and D if it looks right)?
2. Nobody has measured on real integrated hardware; every share above is
   an M1 Pro's.
3. The toggle audit covers two places, not nine.

## A far shape for distant trees: lod 3 (2026-10-02)

Candidate D of the audit above. Kept; the owner has not yet looked at the
sheets.

**What survives of a tree far off.** At 500 m a tree is about 35 px tall,
at 1.2 km about 15. What reads is the stepped outline of the tiers and the
light top / dark rim band on each (which comes from the softened normals,
not from the tier's underside). The underside is hidden behind the skirt
from level or above; the caps of trunk and crown never show. Lod 2 also
carried 20 zero-area triangles (the ring at each tier's tip is five
vertices in one place), and was unindexed: 148 triangles on 444 vertices.

**The shape.** Lod 3 is lod 2 vertex for vertex (the same draws from `rnd`,
normals made with the underside still there) with those parts left out,
and indexed: 74 triangles on 82 vertices. `buildConifer(seed, 3)`.

**Where it starts.** In 256 m nodes and up (about 490 m off), which is
everywhere lod 2 was drawn; lod 2 is now only what the shadow casters
flatten (`caster.lod` still 2, `geos` is four per variant). Because the
picture is the same there is no new switch to hide: the only pop is the
one that was there, lod 1 to lod 2 when a 256 m node splits. No shader
change, no per-frame cost. `?lod3=512` starts it a node later, `?lod3=0`
turns it off.

**Tried and dropped.** The tiers' middle ring left out as well (34
triangles): every tree gets thinner, 1 to 9% of the frame's pixels change;
it would need its own hidden switch a long way out for 40 triangles a
tree. A distance switch in the node, dither and scale fades: not needed.

**Measured.** Same frozen frame, far trees as lod 3 and as lod 2
(`scripts/treelod.mjs`, `scripts/imgdiff.mjs`): of ten stills at most 0.19%
of pixels differ (edge at 1.2 km), nearly all by under 16/255; the same
through 71 frames of walking, sprinting and flying at a forest edge and
away (three frames differ more: a chunk streamed in between the two
shots). Triangles a frame at the audit's nine places, before / from 256 m
nodes / from 512 m nodes, in M: start hilda 4.23 / 3.55 / 3.71, start 42
4.57 / 4.07 / 4.27, start fjord 6.60 / 5.61 / 5.86, forest hilda 8.99 /
8.18 / 8.42, forest 42 7.35 / 6.43 / 6.47, vista 5.83 / 5.04 / 5.22, high
hilda 5.92 / 5.02 / 4.97, high fjord 4.44 / 3.61 / 3.71, night 5.17 / 4.31
/ 4.38 (`shots/perf/counts-after.txt`). The default perf run, twice each,
M1 Pro: 5.76 and 5.60 ms average (p99 9.2, 9.0) before, 4.20 and 4.25 (p99
7.8, 7.8) after (`shots/perf/lod3-perf.txt`). The frame time fell by more
than the triangles did (25% against 10 to 19%): vertices fell by 5.4x a
far tree, so the cost looks to be vertices (the prop vertex shader reads
two textures) more than triangles. The nine places were not timed (the
owner skipped it). `dungeon.mjs quest` and `offering.mjs play,reload,home`
pass on hilda and 42 (they take `$DIST` now).

### Left
- Lod 1 (472 to 496 triangles, unindexed, about 77 of them zero-area) is
  now most of what far trees cost: 128 m nodes, 243 to 490 m off, and the
  mid trees of 64 m nodes. Indexing it and lods 0 and 2 and dropping the
  zero-area triangles changes no pixel; whether lod 1's undersides can go
  needs looking at (its tongues droop, so they may show). Not done: not
  asked.
- Felled trees and the giant's trodden trees are per instance in the
  vertex shader, so they hold on lod 3 by construction; not shot.
- Still not measured on integrated graphics.

### The giant and water: what's allowed (2026-10-02)

Owner: "I don't mind if it goes through water on the way to the village
initially, in fact it looks better when it emerges from the water. It's
just that the character needs to be able to follow its path to the dungeons
so it can't pass through deep water."

- Checked after the cut in water: on 20 seeds no footfall from the village
  to ring 1, or on to ring 2, is in water, and no site's way is a fallback.
- The lead-in to the village (the ten or so steps before the first house)
  is a straight line back out along the lane and is in a lake on about 3
  seeds in 20 (`2`, `a`, `102`; up to 23 m deep). Left as it is, on purpose.
- `scripts/sites.mjs` now tests heel, middle and toe of each sole, reports
  `wadesVisit` (from the last house on) beside `wades` (the walk on), and
  fails on either.
- Also settled: the offering is good enough for now; the stone hands are no
  longer tracked in the dungeon docs.

## The send-off: in the middle of the trail, and not cross with you (2026-10-02)
- **Where it stands:** it stood on the heel rim of one print, so off to one
  side of the trail, pointing at a print of the same foot. Now
  `Journey.trailEdge()` puts it halfway between the first two prints beyond
  the houses (a left and the right after it: the middle of the trail) and
  points it at the same midpoint three prints on, so the arm lies along the
  trail.
- **The brave face read as angry at you.** Two changes: the brow cut in
  `PART_FRAG` is much lighter (0.38 of the eye, slant 0.14; was 0.8 and
  0.55), and `uBrow` only goes on while it isn't looking at you. Down the
  trail: set. Round to you, waving you on: eyes simply wide.
- `scripts/sendoff.mjs` now shoots both faces (`face`, `toyou`) and the spot
  from above (`above`).
- **The walk out (same day):** it kept stopping: a turn-and-wave every 5 s
  (`rally`) and a wait whenever you were 10 m behind, at 3.1 m/s. Now
  `want.lag` (new, in `Want`) means "leading at a stride": no stops on the
  way, and it only waits once you're that far behind (`SEND_LAG` 24 m; it
  goes again at half that). Pace is `SEND_PACE` 5.4 m/s via `haste` (you run
  at 6.2). The hop-point-wave is kept for when it's standing at the end.
- **Down the middle of the trail:** `trailEdge().way` is the midpoints of
  successive prints, from where the giant left the houses for good (among
  them it doubled back; following that took 12 s longer and looked lost) to
  the pointing spot. It joins at the nearest of them and `sendOff` feeds
  them to `want.at` one at a time. `scripts/sendoff.mjs` prints the walk:
  seed hilda, 34 s, 13 s to reach the trail, then within 0.9 m of its
  middle, no stops.
- **Prints go cold when the giant stops (2026-10-02):** warmth was only
  "how many prints back from the newest", so the last nine glowed for good
  beside a sleeping giant. Now the head runs on while it isn't walking
  (`Prints.cool`, from `Trail.update`): the glow is gone about 6 s after it
  stops, and the next print it makes is numbered from there, so it is warm
  and the old ones stay cold. Print numbers are no longer list indices.
  On a reload nothing has walked yet, so restored prints are cold at once.
- **A bike at the trail (same day):** if you've come out to the pointing
  spot on foot (not cycling, not on a creature: new dep `mounted()`), within
  `SEND_BIKE` 12 m for 1.5 s, it conjures the gift bike again right there:
  2 m to the side you're not on, pointing down the trail. Same `conjure()`
  as the first gift, but no camera shot (hands stay on). `Bikes.place('gift')`
  replaces the old one, so the one at the cabin (or wherever it was left) is
  gone. Not if the gift bike already stands within 30 m. `tidyCabin` still
  brings it back to the cabin spot when you next come home on foot.
- **The trail shot (same day):** at the pointing spot, once the bike is made
  (or isn't needed: you rode out, or it's already there), with you within
  12 m and on the ground, `Journey.look` runs for `LOOK` 6.5 s: `busy` (so
  controls freeze, as for the gift shot) and `cinematic()` returns
  `trailShot()`: from 9 m behind the spirit and 4 m up to 55 m behind and
  62 m up, looking down the trail, so the prints read as a line going off
  across the country. Main eases in and back out. Once per load (`looked`),
  not saved. `scripts/sendoff.mjs` shoots it (`shot1`, `shot2`).
- **Shorter, and it doesn't wait (same day):** the walk was still a chore.
  `TOWN_EDGE` 55 -> 20 m (the spot is the first clear pair of prints just
  past the last house; the trail shot does the showing), and the walk is no
  longer `lead`: it goes on ahead and hops at the spot until you turn up, by
  whatever way you like. (With `lead` it measured "behind" against its next
  waypoint, so cutting the corner made it stop for you.) If you stay in the
  yard it comes back for you after `SEND_LEFT`, now 20 s (was 8). Seed
  hilda: 25.5 s for it, about half of that getting to the trail.
- **The spot, again (same day):** with `TOWN_EDGE` 20 the "first print past
  the village" can still be among the houses, where the giant turned about
  (seed troll: 25 m from the cabin, in trees, prints at all angles). Now
  `trailEdge()` goes on from there to the first place the giant is simply
  walking: three even strides (0.6 to 1.4 of the median), each print's
  heading within 0.4 rad of the trail's, and no tree within 7 m of the
  middle (new dep `trees()`). Checked from above on hilda, troll, 12345,
  fjellheim (`shots/sendoff-<seed>/above.png`).
- **From the middle of the village after all (same day, owner's call):** the
  way now starts at the giant's nearest print to the cabin and follows the
  middle of the trail the whole way, wanderings among the houses included;
  the spirit joins at the nearest point of it. The end spot is unchanged.
  Its walk: hilda 42.5 s (was 30), troll 29.5 s, 12345 14.5 s. It doesn't
  wait for you, so the length costs you nothing unless you choose to follow.

## The giant clears its whole trail (2026-10-02)
- **Was:** only props under a sole (`soleSdf < 1`) went, so in a wood the
  strip between its left and right prints kept its trees, and the middle of
  the trail (where the send-off walks and stands) was forest. Seed hildaz3.
- **Now:** each print clears a box: 1 m out past its outer edge, 13 m in
  toward the other foot, 13 m ahead and behind (`CLEAR_*` in
  `world/prints.ts`; the feet are about 29 m apart centre to centre and
  21 m a stride, so the boxes meet). "In" is the side the previous print
  was on (`Print.side`; none if there's no telling, then just the sole).
- **How:** a second wrap-around texture, the clear mask (`CLEAR_TEX`, R8,
  3 m texels, 2048 wide). The prop shaders' `trodden()` and
  `colliders.skip` (`Prints.clears`) read it. First tried through the print
  cells (wider sdf, then a box test per print): two prints a cell isn't
  enough where the way in and the way out cross, trees survived. The mask
  has no such limit.
- **Never un-cleared:** `erase` (a plot mended) no longer brings back what
  stood round that print.
- Only trees under the sole lie there flattened, as before; the rest are
  simply gone (flattening them all carpeted the trail).
- The send-off spot also keeps off flattened trees (`Trail.littered`).
- **The trail shot pans:** once up, the look-at runs on down the trail
  (to the middle of it 12 prints on), so it tips up toward the horizon.
  `LOOK` 8.5 s.
- **No set face at the spot (2026-10-02):** `mood = 'brave'` only for the
  walk out; once it's at the pointing spot the mood is cleared (its usual
  face). Even the lighter brow read as "get out of here" when it stood
  pointing.

## 2026-10-02: the dungeon's light is a dark light
What a dungeon keeps and the giant is fed is no longer orange: it is a dark
light (`src/dungeon/darkLight.ts`: an ink heart with a violet rim, the ring's
colours), so it can't be taken for a spirit's light. Orange now means a
spirit and nothing else: the giant eats a violet one and gives back an orange
one. The pool it throws in the cave, the glow in the giant's mouth and the
Veil Cave's "amber" veil (`cAmber`) are violet to match; the `warm` / `cWarm`
names in code are kept and now mean the dark light's. The lore of why is
not decided. Not yet looked at in the Veil Cave.

## Dungeon 2: the Veil Cave (2026-10-02)

Built in one go from a brief agreed with the owner (design in DESIGN.md,
"Dungeon 2's interior"). **Not yet played by the owner.** Plays through by
the keys, start to finish, in `scripts/veil.mjs quest`. Another session was
working in this checkout at the same time and changed the dungeons' light
to the dark light (the section above) part way through: the frames looked
at before about 15:17 had an amber veil, the ones after a violet one. Its
edits to these files were left as they were.

### The plan (`veilPlan.ts`; a diagram is at its top)
- **A honeycomb.** Hexagonal cells 46 m across the flats, as overlapping
  round rooms (r 27.5) in dungeon 1's SDF, so it is one cavern with waists.
  A rock pier (r 4.2 to 5, part of the SDF) at every corner two cells
  share: 24 of them. A veil on every shared edge, pier to pier: 28 in all.
- **Ten cells make the ring** you walk (`RING`), three in a row down the
  middle are shut (M2, M1, and P, the pocket). Round the ring each edge has
  a short veil from one pier to a slim post half way, and a gap about 7 m
  wide beside it; the gap is at the inner pier and the outer one by turns,
  so the way weaves. The post is a `Solid`, not SDF: the shell's 1 m grid
  can't draw a 1.3 m column.
- The light's room opens off the first cell behind the last veil; the way
  out is an alcove behind a veil in the well's wall, opposite the way on.
- **Sizes come from the dash** (`DASH` 10.7 m: 0.42 s at 1.15 times her
  sprint). No two veils are within a dash of each other along any line
  that clears the piers (veils meet at 120 degrees at a pier, so a line
  crossing two of them near it would pass through the pier). Nothing
  solid stands within a dash of a veil. The light is 14 m past its veil,
  so a dash through sets you down short of it.
- **The checker proves it** (`scripts/veil-plan.mjs`): on foot the middle
  cells, the pocket, the light and the way out are unreachable and all the
  ring is reachable; riding, everything is; 153,816 dashes from a 2 m grid
  in 24 directions, none crossing two veils; about 3,700 made square at a
  veil (within 15 degrees, not in its last 2 m by a pier), none stopped by
  rock. Wider of square or hard by a pier she can meet the pier on the far
  side, which stops her like any rock (counted apart). Passed on `hilda`,
  `42`, `frost`, `bergen`, `hildaz2` (both mirror sides).
- **Lengths:** the loop is 470 m, 76 s at a run. From the well to where you
  get her, by the east, is 222 m. The ride (pocket, middle, first cell,
  light) is 208 m: about 23 s at her canter, 9 flat out. **The brief asked
  for about four minutes on foot and twenty seconds riding.** The ride
  fits; the loop is a third of that. Four minutes at a run is 1.5 km of
  cave: a comb about three times as wide, or two rings deep. Not done:
  it is the owner's call whether the walk should be that long.

### Veils (`veilShell.ts`, `VEIL_FRAG`)
- One mesh, a folded sheet per veil from under the floor to over the
  ceiling, its ends in the rock. Two flat tones for its folds.
- **Lit from behind is baked.** Per vertex, per side: what each steady
  light near it (glowcap clumps, the dungeon's light, the daylight behind
  the way out) would show on the other face: a patch that widens and
  fades with how far behind the light is. In the shader it is two hard
  bands, a pale heart in a halo, the edge wandering on noise. Baked rather
  than read from the 16 nearest glows so that every veil in view has its
  patch, however many there are.
- **Glowcaps stand on one side of each veil only**, the far one (the shut
  cell's; of two shut cells the one nearer the start; round the ring the
  cell further round). With clumps on both sides the near one lit the veil
  from in front and washed the patch out. A veil is also never lit from in
  front past the middle tone: what shows through is the brightest it gets.
- The patches' emissive is low (0.1 to 0.3): a patch is big and flat, and
  at dungeon 1's lantern strength the bloom whited the whole thing out.
- **Her lights** (`uShe`: ears, spine, tail tip) show through as three
  small moving patches when she's behind one. **Ridden**, `uWake` runs
  rings out across any veil within about 9 m. **A hole** (`uHole`, two
  slots) is where she takes you through, and where her head pokes out.

### The camera through a veil (`VeilCave.clampCamera`)
The part most likely to feel bad, so it was built first and looked at a
frame at a time (`scripts/veil.mjs dash`).
- A veil stops the camera like rock, except one she has just taken you
  through. That veil is open to it (`pass`) and has a hole in it, centred
  where the camera's line to you crosses the veil, so the camera follows
  at its own distance and passes through the hole. The hole shuts when the
  camera is on your side.
- Measured: over a dash the camera's distance stays within 9.3 to 10.6 m,
  the biggest change in a frame is 0.08 m, a veil is between it and you
  for about 25 frames and the hole is open (2 m, then 3.3 m) for every
  one of them. Same with the camera swung 0.9 rad to one side.
- Pull up just past a veil with the camera still behind it: after `LAG`
  (1.1 s) the veil draws it through at a walk (rate 4.5, not the 14 rock
  uses) and the hole shuts behind it. Checked.

### Phase and rock
- Outdoors a phasing glimmer passes everything but the towers
  (`world.landmarks`). In the cave `landmarks` is `cave.collide(.., true)`:
  rock, piers and what stands on the floor stop her; veils don't.
- **Space at rock** (`VeilCave.ride`): the frame the dash starts, a ray
  along her heading. Rock before any veil within a dash: the phase is
  cancelled, her speed put back to what it was, 0.35 s before she can try
  again, a shake of the head and two notes down (`Sfx.nope`). She brakes
  to about a metre short of the rock.
- A dash that ends inside a veil's thickness is pushed out to whichever
  side she's nearer.

### Hide and seek (`VeilCave.playHer`)
- The glimmer is a `Mob` with `below` like dungeon 1's rockhopper, and
  `puppet`: `Beast.think` leaves her alone and the cave drives her
  (position along `VeilLayout.route`, which goes cell middle to cell
  middle through the veils between; `ghost` for the flicker of a phase
  with nobody on her; `GlimmerAct` in `BeastData.s.act` for crouch, head
  down, tail twitch, head shake). All additive: a glimmer outdoors is
  unchanged.
- States: `watch`, `go`, `hide`, `fetch`, `show`, `found`, `peek`,
  `yours`. `round` (0 to 3) is what's saved.
- **Stalls.** Left unfound for 24 s (16 after the first time) she comes to
  you by the comb's ways, stops about 7 m off, hops twice, then leads back
  at 6.8 m/s (you run at 6.2). More than 17 m ahead she waits, hopping and
  calling; left 11 s she comes back again. Walk up to her at any of these
  and it counts. At round 3 a stall ends the game instead: she comes out
  to you and offers her back, wherever you are.
- **Yours:** more than 15 m away, or a veil between, and she follows.
  Checked getting off her inside the pocket and on again.

### The way out and the ending
- After the gladness (4.3 s), under the cut you're put in the well on her;
  she runs 20 m and through the veil in its wall; the cut comes down
  0.35 s after she's through. About 3.2 s. The camera is the ordinary one
  behind her (a fixed camera was tried first and lost her behind one of
  the well's columns).
- Above, `leaveCave(true)`: no arms; you're on her in the ring in a burst
  of her light, and the ring seals.
- **The ending is dungeon 1's `Offering` with options** (`OfferOpts`: a
  save name, a statue, a timing). `OFFER_SHORT` is 16.3 s from the light
  leaving you; with the ring sealing, 21 s from coming up (measured, in
  1.5 s steps). Dungeon 1 passes no options and is as it was.
- `secondHome()`: when the giant has the light, spirit 1 is put home and
  its crow's light put down, unseen; saved as `embla.home2.<seed>`.
- The second ring opens when `Homecoming` says the giant has settled
  (`settledAt`), or at once on a save from after that.

### Defaults taken (each the builder's choice or the brief's, not played)
- In on foot; the rockhopper stays above. The ring only takes you off a
  mount, as the first does.
- The second ring opens as the first does.
- The ending above ground: the short offering, a second spirit home
  unseen, the giant doesn't walk on.
- The cave is a function of the seed: which side it winds to, the walls'
  wobble, the scatter. The comb itself is the same on every seed.
- **Which spirit comes home second:** the second one taken (index 1).
- **Touching her anywhere counts as finding her**, not only at her hide.
- **The pocket is entered from the columns' cell** (she goes that way so
  you can follow to its veil), but she'll put her head out through
  whichever of its veils you come to.
- **She gets her saddle when she offers her back**, as the rockhopper got
  its when freed.
- **After the ending the glimmer waits by the second ring** on a reload,
  as the rockhopper does by the first. Neither is in the herd's save.
- **The portal overhead and the cut are teal** in this dungeon; the ring
  above and its dark spirit are the first's violet ink (`Ring` is shared).
- **Glowcaps and lanterns:** lanterns wake as you pass, as in dungeon 1,
  on the outer wall only; they don't light veils from behind.
- Dev entry: `?dungeon=2` makes dungeon 1 done first (`firstDone()`), by
  writing the saves a finished dungeon 1 leaves and rebuilding from them.

### Shared code touched, and what it does to dungeon 1
- `shell.ts`: `buildShell` takes a `ShellPlan` (an interface `Layout`
  already satisfies); `tint` and `lathe` exported. No change in output.
- `materials.ts` / `shaders.ts`: the portal's three colours are uniforms
  (dungeon 1's as exact defaults); `makeDungeonMaterial` takes a rock
  palette; `uWarmFlat` (0 in dungeon 1: off).
- `offering.ts`: its timing table is per instance; name and statue are
  options. `homecoming.ts`: `settledAt`. `dungeon.ts`: a `mountable`
  getter. `beast.ts`: `puppet`. `types.ts`: `puppet`, `ghost`.
- `main.ts`: `den()` is whichever dungeon you're in, used where
  `dungeon?.inside` was.
- **Checked:** dungeon 1's quest passes, 41 checks, the same ones as
  before this work (160 s before, 159 after). Five of its stills
  against the build from before, pixel by pixel: they differ by 0.7 to
  5%, and two runs of the *old* build differ by the same amount (the
  lights breathe), so no difference was found. `scripts/sites.mjs` on
  `hilda`, `42`, `frost`: both sites, the first's fingerprint, the visit's
  and the walk on are identical to before. The land and the cached sites
  were not touched; no save is wiped. (All of that was before the other
  session's dark light went into dungeon 1.)

### Perf (M1 Pro, 1600x900, uncapped, quiet runs)
- Inside: 370k to 382k triangles, 59 to 68 draw calls, 1.8 to 2.65 ms a
  frame, p99 3.4 ms, in seven places, lanterns dark or all lit. Dungeon 1
  on the same day: 402k, 58 calls, 1.4 to 2.0 ms. Building it: 23 ms for
  the plan, about 270 ms for the meshes, once, on first entry.
- Outdoors, the default run: 4.19 ms average, p99 7.9, against 4.22 and
  7.6 on the build from before. No change.
- A third run of the cave's timings gave 28 ms in one cell and 8 in
  another; two runs after it gave 2.6 again. Another session's browser was
  on the GPU. Not verified on real integrated graphics, like everything
  else here.

### Rough / open
- **The walking loop is short of the brief** (above).
- **How a child learns Space.** In the story the key hints are hidden
  (`story.silent`). The veil waking as you ride near it says "something
  here"; nothing says "press Space". Dungeon 1's bound has the same hole.
  One answer: ridden at a veil she takes it by herself.
- **"Two bright eyes"** at arrival are small: she is 21 m off in the mouth
  of the way on, a dark shape with her spots and tail alight. Seen, not
  striking.
- **Her head through the stone** is a round hole with her face in it. It
  reads, but as a porthole more than a head pushed through rock.
- **The rock is as smooth as dungeon 1's**: strata and boulders at the
  walls' feet. "Rough and lumpy" is carried by the contrast with the
  veils' folds, not by the rock itself.
- The veils' folds are two flat tones with no outline between them; from
  far off a veil with nothing lit behind it is only a little paler than
  the rock beside it. The piers frame it, which helps.
- Front-lit patches on veils (from glowcaps on your side, or her own
  light) have the same wandering edge as on rock and can look blotchy.
- **The shrine's glimmer** has thin legs and tail in stone.
- **She runs through glowcaps and small stones** on her way (her path is
  kept clear of boulders by the plan, not of everything).
- The ring above takes you only on foot: arrive on the rockhopper and
  nothing says to get off (as at the first ring).
- No sound was heard: the scripts run muted. `Sfx.shimmer` (through a
  veil) and `Sfx.nope` are new and unheard.
- Seen only in scripted frames and stills; nobody has held the keys.

## Creatures run from the giant (2026-10-06)
Just after the village bolts from the giant (`BOLT` in `giant/visit.ts`) every wild flock about is off the
other way for good: `Mobs.scare` calls each species' `bolt`, which sets `flock.data.gone`. Crows and floofs
climb and fly a straight line that never lands; herds run stretch by stretch over good ground and stop only
where there is none (a shore). A `gone` flock is drawn to 1000 m and dropped at 1100 (not 460 / 500), so
fliers are seen going until they're specks. Nothing new turns up until the visit hands the camera back
(`Mobs.calm`). Tamed, roped and the lesson's calm stelk stay.
- They go `BOLT` (0.35) steps after `FRIGHT`, just after the cut to the village running (owner's call,
  2026-10-06: at the first footfall they were out of view by the time the camera was back on the giant).
- Six more flocks of birds are put down in the woods between where the village gathers and the giant, and go
  up with the rest (`scare(.., flush, seen)`): the ambient flocks are few and anywhere. Session-random like
  all creatures, not world gen.
- Check with `DIST=<folder> node scripts/visit.mjs <dir> tower mobs fine` (frames from step 3.5 on; it prints who fled).

## A second homecoming, and a third ring (2026-10-06)
Asked for by the owner: after dungeon 2 a crow should be seen bringing a spirit home, and the giant should
walk on to where dungeon 3 will be.
- `Homecoming` takes `who` / `leg` / `name` (which of the taken, which ring it walks to, its save key) and
  main makes two: `homecoming` as before and `homecoming2` (`who: 1, leg: 2, name: 'home2'`), which starts
  from `offering2`'s last frame. Its `rest` is the end of the first one's route and its `before` that route,
  so it treads back in its own prints where the way on runs back. Its veil is the cave's teal.
- `embla.home2.<seed>` used to mean "the second spirit went home unseen" (set when the offering was
  given). It now means the second homecoming is done, so an old save with it set finds the giant already by
  the third ring. `secondHome` and the `home2` flag in main are gone.
- `WorldGen.dungeons` has a third site: `nextSite(second, [first])`. `older` rings are kept 700 m off and the
  way keeps off them; with none (the second site's search) nothing changes, so the first two are where they
  were (12 seeds compared against the build before; `scripts/sites.mjs` now prints `second` too and checks
  the walk to the third: no wading, ends 45-130 m short). Cache key `embla.dungeon.v9`. The search for
  the third costs 0.1-2.3 s once per seed.
- The third ring is the POI's bare stones only: no `Ring`, nothing opens, the giant just lies down by it.
  Dungeon 3 needs a `Ring` there, a `settledAt` on `homecoming2` to free its dark spirit, and its inside.
- Not changed: the village scene is the first one again (same yard, same camera rules). The ending after
  dungeon 2 is now about 50 s hands off rather than 20.
- Check: `scripts/veil.mjs <dir> home2 [sandbox]`.

## Dungeon 2: she leads you like a puppy (2026-10-06)

The owner played the Veil Cave and didn't get it: she ran off at 14 m/s to
a hide 60 m away, nothing showed where, and after 24 s she "eventually just
finds me". Asked for: her coming back to check you're following, a trail
that shows she went through the wall, and her room lit so you know which
wall she's behind. Hide and seek is now follow-me (`VeilCave.playHer`).

- **Leading** (`go` with `then === 'hide'`, numbers in `LEAD`). She runs
  ahead at 9.5 m/s (you run at 6.2) and stops when she's 15 m ahead, turns,
  bows, hops, wags and calls until you're within 8.5 m. **At a veil she
  stops 3.4 m short and only goes through when you're within 9.5 m with
  nothing between you**, so you always see it happen. Past a veil she goes
  5.5 m and waits for you to come round. Left waiting 5 s in the open, or
  10 s with a veil between, she comes back to you (`fetch`, `show`) and
  leads off again; hidden at her spot it is 11 s, then 9.
- **She leads only where you can follow** (`VeilLayout.route(.., walk)`):
  round the ring by its short veils, never through a shut middle cell. The
  first version took the short way through M1 when you were on the west
  side and waited inside it for ever. Only the last veil, into the pocket,
  is one you can't get round. Fetching you she still takes any veil.
- **Finding her is only at her hide.** Touching her on the way no longer
  counts (it let you win a round at the veil without ever going round it).
- **Prints** (`pawTrail.ts`): pads of her light on the floor every 0.95 m,
  left and right, a beat running along them the way she went. One mesh of
  150, moved on the CPU. They go out when she's found or sets off again.
- **A mark in the veil** where she went through (`uScar`, three slots): a
  ring round a heart, seen from both sides, until that trail goes out.
- **Her room alight** (`hidden`, `uHer`, `ROOM_R`): whenever a veil is
  between you and her and the game is on, her pool of light grows from 5.2
  to 11.5 m and she shows on the veil as a wide patch that beats twice and
  rests. Its emissive is very low (0.14 / 0.06): at 0.4 the bloom whited
  the whole veil out. Her three small lights came down from 0.7 to 0.5 for
  the same reason.
- **The pocket.** She waits at its veil for you, goes in, and 1.5 s later
  her head comes back out where you stand. If you never follow her there,
  after three fetches she gives in and offers her back where you are.
- A reload part way has her out to fetch you after 3.5 s rather than 24.
- Checked with `scripts/veil.mjs quest,stall,reload,dash` (the script
  follows her now: `chase`) and `veil-plan.mjs`. Not heard, and not held:
  frames and checks only. In `quest`, "the second ring does not take you
  again" fails above ground (E doesn't get you off the glimmer after the
  ending); nothing here touches that.
- Rough: at arrival she is 21 m off, so her first "come on" is small; she
  comes to you 5 s later. With her right behind a veil the mark, the patch
  and her own lights overlap into one bright shape.

## Thinner outlines, and a higher resolution floor on desktop (2026-10-06)
- **Why:** the owner's game looked rough (creature faces first). Nothing in
  the render path had changed and the working tree was no slower than the
  commit before it: other sessions' headless browsers had the GPU, frames
  ran long, and the adaptive controller had shed resolution to 55 to 70%.
- **Floor:** on desktop, resolution now sheds to 85% and no further
  (`softFloor` / `hardFloor` in main); after that go shadows, then terrain
  and prop detail. Touch devices keep 70%, then 55% last, as before. The
  cost: a truly slow integrated GPU loses geometry where it used to lose
  pixels, and has less to shed in all. Not measured on one.
- **Outlines:** default width 1 px, from 1.6 (`postSettings.outlineWidth`).
  The width is in render pixels, so at a lower resolution scale a line is
  that much wider on screen; 1 holds up there where 1.6 went chunky. The
  owner's call, by eye.


## The walk home, faster again (2026-10-06)

Owner: speed up the trudge back to the village after the giant.

- `TRUDGE` 2.4 -> 3.4 m/s (`story/journey.ts`): a little over its trot
  (3.1), where it was well under. The look is unchanged: the sullen gait's
  step rate and tiny hop don't depend on its speed (`hopRate` in
  `spirit.ts`), so it still reads as a trudge, just covering more ground.
- Untouched: `MOPE` (1.8, the village shuffle), the unseen catch-up
  (`UNSEEN`, `UNSEEN_PACE`), `GRIEVE` (75 s from setting off, so a quicker
  walk means more of it is spent in the village; `GRIEVE_MIN` still holds).
- Not re-shot with `scripts/trudge.mjs`.

## The giant's prints keep off your cabin (2026-10-06)

Owner: can the main cabin never be directly over or beside a footprint?

Measured first (`scripts/cabin-clear.mjs`): on every seed tried a print's
edge was within 9 m of the walls, on two seeds touching them. Three causes,
all in `visitRoute` (`giant/visit.ts`):

- The print on the house nearest the yard (20 m down the lane, sole 22 m
  long). Now trodden askew or off its middle, as little as it takes; the
  house stays well under the sole. That only buys so much: 5 m on `hilda`
  and `7`, 10 m or more on most. More would mean moving the village
  (`findVillage`: first house further from the yard), which moves the land
  and wipes saves (`WORLD_VERSION`). Not done.
- The four steps leaving the yard: the old test was 26 m from the ankle and
  only a preference. Now measured sole edge to wall (`gap`, `KEEP` = 10 m),
  weighed before everything else, with sharper turns tried if no gentle one
  clears.
- The turn on to the way to ring 1, which could come back round over the
  cabin (seeds `2`, `3`): each candidate is now judged with its first twelve
  steps of the walk too.

The visit's footfalls change on most seeds (the `visit` fingerprint in
`scripts/sites.mjs`); the dungeon sites don't. The walks on from ring 1 and
ring 2 are 500 m and more away and weren't touched. Checked on 16 seeds;
`scripts/visit.mjs` played through on `hilda` and `7`.

- 2026-10-06: the spirit's sad face redrawn (`uSad.x` in `CREATURE_FRAG`): no more flat slanted lids; instead short thin ink brows with the inner ends up (after the cartoon bear in the inspo), pupils grown big with a glint, and tears welling along the lower lids. One face for every kind of sad (`sullen`, and the `sad` / `down` moods through `Spirit.woe`); only `sullen` keeps the ashen colour and the tear that falls. The explorer's face is untouched.

## 2026-10-06: the giant is solid while it moves, and carries you

It was solid only asleep (its boulders' ellipsoids cached once it lay still). Now `Giant.shell` works the
47 boulders out again after every `pose`, lazily, and only when something within 80 m asks: about 0.03 ms a
frame, so no cost to speak of. What it needed besides:

- **Carrying** (`rider`, `footing` / `carry` in `update`): the body standing on a boulder is kept at the same
  place on it through the pose. Without it the giant walks out from under you (17 m/s). `rise()` carries too.
- **Sticky stone** (owner's idea): on its stone your feet are glued to it (up to 0.6 m of it dropping away is
  closed each frame), the boulder you stand on is never a wall to you (`held`: the "steeper than 45 degrees is
  a wall" rule was shoving a rider down the head as it tipped, getting up), and your own going is halved
  (`STICKY`, applied to the position after the movement mode, so it holds for mounts too). `vel.y > 1` (a jump,
  a flyer climbing) lets go; a jump on a walking giant lands you further back on it, no momentum kept.
- Not done: no sweep, so a foot or hand that comes down on you shoves you out by the nearest way (6 m in the
  check, 2 frames inside stone), and other boulders moving into a rider just push. The walks to rings 2 and 3
  are not cutscenes at present, so this can be ridden in the story.

Check: `scripts/giant-solid.mjs <dir> [spot=hump]` (rides the head walking and getting up, walks and jumps on
it, stands under a footfall, times it).

Later the same day, from the owner's second go: **no glowcaps behind the
first short veil** (`L1-E1`; she stood in them at her first hide and was
hard to make out; the clump is grown and taken away so the rest of the
scatter doesn't move), and **the first hide has no finding**: the moment
you come round the veil's end and nothing is between you (within `SEEN`,
24 m) she runs on to the grove, with no heart and no hops. The heart is
for the grove.

And a third note from the owner: her coming back "happens too close".
**Through a veil with a gap, she no longer comes back to you first: she
goes and stands in the gap** (`door`), where you can see her from your
side, and bows and hops there. She only does it once you have stood about
for 3.5 s without getting nearer the gap (`toDoor`: making for the gap
never counts against you, so there is always time to reach it). Come
within 6 m of her there and she goes back to what she was doing (11.5 was
tried: where you stand to watch her go through is already that near the
gap, so she went straight back). Left
14 s in the doorway she comes for you as before, and now stops 11 m short
(`DOOR.short`; it was 7.5).

### Dungeon 2, as it stands at the end of 2026-10-06 (supersedes the three notes above where they differ)

The owner, over the afternoon: scrap her coming back for you ("the trail
removes the need for it"); she waited "much much too close"; and the last
sequence made no sense ("I keep going around and there is no way in"):
"I turn 2 corners then see the trail, maybe it leads to another wall".

- **No fetch, no show, no doorway, no bow, no heart, no giving in.** The
  states are `watch`, `go`, `hide`, `peek`, `yours`. She never comes back:
  she waits, however long, and her prints and marks are the way.
- **Veil to veil at 14 m/s.** She runs to 3.4 m short of the next veil and
  stops. When you have her in sight within 32 m (`LEAD.veil`) she looks
  back for 1.1 s and goes through. Beyond it she goes to the middle of the
  room and waits until you are in its doorway (`through()`: nothing
  between you, and within 4 m of the veil's line or past it); then on.
- **Two veils' ends, then the wall.** Rounds 0 and 1 are the rooms past the
  first and second short veils (E1, E2: she only waits in each). Round 2:
  from the middle of E2, as you come into its doorway, she runs to the
  wall of the shut cell beside it (`HIDE`, M1; it was the far pocket P, a
  third veil on), looks back, goes in, and 0.9 s later **her head comes
  back out through the stone where she went in and stays** until you are
  within 12 m (`PEEK_R`); then out, and her back offered. The grove is
  scenery now: she doesn't hide in it, and nothing is "found".
- A reload part way puts her in the mouth of the way on again, to lead
  you from the well to wherever the game had got to.
- `scripts/veil.mjs`: `chase` walks the ring by its gaps; `stall` checks
  that she waits (half a minute at the first veil; in the next room;
  while you go the wrong way and come back). `quest,stall,reload` and
  `veil-plan.mjs` pass, but for "the second ring does not take you again"
  above ground, as before.
- Open: go the wrong way round and she is out of sight at a veil with only
  her prints to say so; nothing calls you back. The owner chose that.
  DESIGN.md's "three hides" text and `docs/NEXT-dungeon2.md`'s "as built"
  still describe the grove and the pocket.

## The parachute's hint (2026-10-06)
The owner: the parachute bubble after three falls came too late; "front
load that and make it clear from the start (any time you are on that top
step thing)", and say how without words, on a keyboard and on a phone.
- Dungeon 1's long fall is the first place the game needs the parachute,
  and nothing before it teaches the second press. So the thought is there
  whenever she stands on the high stone, fall count gone (`HINT_AFTER`,
  `falls` removed), and it stays after you've crossed.
- It says how, as four frames in one bubble (`chuteHintCanvas` in
  `icons.ts`, held for `HINT_HOLD`): on a stone; a press, and she's
  jumped; falling; a second press, and the canopy is open. The thing
  pressed is a blank space bar (a shape, no letter) or, by touch, the
  tapping finger. Drawn at 256 px and shown bigger than other bubbles.
- Off the stone and falling with nothing open, the bubble comes with her
  and turns its last two frames about quickly (`HINT_QUICK`): press now.
  Only until the first crossing (`crossed`, saved as before).
- By touch the jump button itself becomes the parachute's while a press
  would open it, anywhere in the world (`TouchContext.chute`, the same
  test as `WalkMode`: on foot, in the air, `deployClearance` under you).
  It flashes at the top of an ordinary jump too; that's true, so it stays.
- Not done: holding jump to open it (a change to every jump), a ghost
  that shows the way. The touch buttons still carry words (Jump, Ride,
  Lasso, Fly); this is the first of them to be a picture.
- Check: `scripts/chute-hint.mjs <dir> [touch]`.

## The name: Embla (2026-10-06)
The owner, after a long hunt for a title: "Let's call it Embla everywhere
for now." Embla is the first woman of the Norse myths, driftwood given
breath and warmth; a working title, not settled.
- Was Fjellheim. Changed in the page title (now just "Embla", the
  "storybook sandbox" tag dropped), the loading veil, the docs, and every
  save key (`embla.<what>.<seed>`).
- Saves made under the old name are carried over once, at the top of
  `main.ts`, before the world-version check reads them.
- Left alone: `package.json`'s `open-world` (the repo's name), and
  `fjellheim` where it's a seed someone typed.

Later still (owner: the turn to look "pivots in place", and coupled with
the phase "looks buggy"): before a veil she now **skips half round** (a
small hop, 0.34 s; side on at most, 1.75 rad, her head does the rest),
looks, **skips back to face the veil, and only when that turn is done**
(within 0.08 rad) does she run at it. Before, she spun to face you at rate
8 and then turned back while already running and flickering.

And: "too easy now... I do like the head poking back through but it
shouldn't just end so soon". **Her head comes out three times** (`PEEKS`:
from M1 into E2, from P into E3, from P into E4). Come within 12 m of the
first two and she draws it in and runs on inside the shut cells, her light
going along behind the stone, and puts it out again through the wall of
the next room round; at the third she comes out and offers her back. So it
is four veils' ends in all now, with her head showing where she is at each
of the last three rooms. Not saved: a reload in round 2 starts her from
the well again.

And: she **only stops and looks back at the first veil** (`round === 0`);
the rest she runs straight through, as you come into the doorway behind
her ("the pass and look gets redundant"). And **she no longer flickers
going through a veil by herself**: `Glimmer.pose` hid her body on
alternate 30ths of a second whenever she phased, which read as a fault
seen from outside. Unridden (`ghost`) she now only stretches thin, eased
in and out; ridden, outdoors and in the cave, the flicker is as it was.

And: **the heart and the bouncing are for the bond, and only that**
(owner: "the universal sign that we've bonded a pet"). When she comes out
of the last wall she bounces three times and turns about with a heart over
her (`GLAD`, 2.5 s), then goes down and offers her back; E doesn't get you
on until it's over. Nothing earlier in the cave shows a heart. (At the
stable a creature brought home already hops with hearts floating up,
`herd.ts`; the two aren't the same picture yet.)

And: "let's make the chase a little longer... have it come out of that
wall and run through another round of walls". **A second lap** (`LAP_AT`,
`LAP`): come up to her third head (in E4) and she comes out of the wall
beside you and away through the next short veil; she waits in the middle
of F, then of W4, as she did in the first two rooms; from W4 she goes
into P's wall and her head comes out; come up, and it comes out once more
a room on (W3); there she comes out for good, with the heart. Seven
veils' ends in all, about 85 s at a run by the script. `PEEKS` has five
entries now. Not saved: a reload in round 2 starts from the well.

And: "one more section where it goes into that next room and is already
there waiting for me. just doesn't run away that time". **The end is a
room on** (`LAST`, W2): come up to her last head (W3) and she comes out of
the wall by you and through one more short veil; in the middle of the
room beyond she stands, tail going, and doesn't run. Walk up to her
(`CATCH`, 4.5 m): the heart, the bouncing, her back. Eight veils' ends in
all.

**And before the heart, she plays** (2026-10-08, owner: "playfully comes
to you, then away, then does spin heart thing... right now it just sorta
ends"). Come within `TEASE_R` (10 m, was `CATCH`) and it's she who comes
to you: `Play` `'tease'`, a fixed five seconds (`TEASE`): up to you in two
bounds, head down and tail going a moment, away to where she stood, a look
back, once right round you and in to your feet; then `offer()` as before
(the hops, the turn, the heart). It follows you if you move, stops a
little to one side of straight ahead (from behind you'd hide her), pulls
its ring in rather than cross rock, and she can't be got on until it's
over. `round` is 3 from its first frame, so a reload mid-way finds her
yours. The bow is `crouch` and `low` together: all four legs fold, no
elbows-only pose in `glimmer.ts` yet. `scripts/veil.mjs <dir> quest`
checks it and shoots `q-12-tease-*`.

### Dungeon 2's ending is dungeon 1's (2026-10-06, owner)

"the ending of D2 is messed up. when I get the orb I should get pulled up
to the surface like in D1. it does a weird teleport thing rn". The
glimmer's run out (a cut to the well, across it, through the `out` veil;
`leave`, `OUT`, `snapYaw`) is gone. Now as `dungeon.ts`: the gladness, the
cut over its last `WIN_VEIL`, `onWon`; `leaveCave(true)` calls
`ring2.emerge` as `leaveDungeon` does, the glimmer stood beside the ring
as `bringUp`. **A rule for every dungeon from here on**, unless decided
otherwise for one (DESIGN.md, "Dungeons"). The `out` veil is still in the
plan, a veil in the well's wall with nothing behind it to do.
`scripts/veil.mjs quest` checks the lift. Its last check ("the second ring
does not take you again": E doesn't get you off the glimmer there) fails,
and failed before this change too (same result on an older build).

## The offering: the crow swoops, and you carry the light (2026-10-06)
- Owner's change: the crow doesn't land. One swoop off the giant's head,
  level between two of the ring's stones (`LEVEL`, `ASKEW` in
  `offering.ts`: in from the giant's side and round toward the near camera,
  so it crosses the view and isn't flying at you), claws down over the last
  0.8 s, the light taken at full speed (`T.has`), then up and round on the
  far side losing its speed (`Bird.stall`) to hang facing the giant. The
  walk, crouch and hop are gone, and with them `landed` / `walk` / `atBowl`
  / `take` from the timing: 4.4 s shorter (3 s in `OFFER_SHORT`).
- Owner's change: the light is held, not floating at your shoulder.
  `Character.carry`: 1, on both mittens before her belly; 2, lifted a
  little, to her chest. (Aloft on one mitten like a lantern was tried
  first, because held before her it's hidden from straight behind; the
  owner chose held close, and it reads from the shrine's side-on camera.)
  She doesn't throw it: at the shrine it rises out of her mittens by
  itself. `hands()`
  is where it sits, and the light is put there after the rig has moved
  (`carryAt` in the two dungeons, straight from `d.hands` in the offering),
  so it never lags a hop. Taking it below is 2 through the glad hops, 1
  after; mounted or not.
- And the offering is hers to make (`Offering.approach`): a beat, down off
  the mount, a slow walk to `MARK` from the shrine's middle with the near
  camera on her, the light held up for `RAISE`, and it leaves her mittens
  for the bowl. She stays on foot there to the end (the checks that said
  "still mounted" now say on foot). A reload mid-way still finds her
  mounted, as before.
- Not done: the Moon Hall (`mothCave.ts`, another session's) still floats
  its light at the shoulder. `scripts/veil.mjs home2`'s "third ring is bare
  stones" check now fails: on foot the third ring takes you down, since
  there is a dungeon under it.

## Dungeon 3: the Moon Hall (2026-10-07)
Built in one go from an outline agreed with the owner, then reworked twice from their notes. DESIGN.md has what it
is; `docs/NEXT-dungeon3.md` the defaults and what's rough.
- **Plan** (`mothPlan.ts`): the same 2.5D plan as the other two (rooms, halls, one `Shelf`), so `buildShell` draws
  it. The high ledge is a shelf 22 m tall across the gallery's mouth, as dungeon 1's wrong-way ledge is one of 3.4.
  A ledge that juts into the hall can't be a shelf (its sides would have no face), so the part that sticks out is a
  `Solid`: a round flat-topped pillar (`pulpit`, with `y`) whose top is level with the ledge.
- **You fly in it**, so `collide` adds the walls' lean at the body's height (`leanAt`): the other two only ever had
  feet on the floor.
- **Moons are geometry** (`mothShell.ts`), no textures: the lit part is a `Shape` (an arc and the terminator's
  ellipse), mirrored for waning; craters are discs kept only where they lie wholly in the lit or the dark part. The
  dark side is a dim disc with its own marks: a new moon is a moon.
- **The moth** is a puppet until she's yours. Clinging to the pulpit is `d.s.hang` in `Moonmoth.pose` (the body
  pitched nose up; her heading is into the rock so her back and wings face the hall).
- **Above ground she drifted round the shrine**: the offering takes you off your mount, and a tamed flier left
  alone hovers in loops. `Mob.settle` makes one stay down (`Beast.resting`, `hover`).
- **Scripts that step frames must call `__ow.manual(true)`**: `frame()` asks for another animation frame each time
  it runs, so every `advance(1)` left another loop running and after a few hundred the page drew 2 frames a second
  and screenshots timed out. (True of any script here; `moth.mjs` does it in `ready`.)
- Not done: a plan checker, perf on the bigger hall, anything after the offering.

- 2026-10-07: the giant's crows take things feet first and carry them in their feet (owner). `Bird.fore`
  (`Birds.reach(t, at)`: legs thrown out ahead from 0.8 s before, snapped back under as they close) for the
  orb and the spirits alike; `Bird.holds` keeps the legs down while anything is carried; `Bird.claw` is where
  the claws are, and every carried thing hangs from it (`Birds.clasp` for a ball, `grip` for a spirit), not
  from a fixed drop under the bird's middle. Check with `scripts/offering.mjs <dir> claws`.

- 2026-10-07: a freed tower spirit climbs from where it was happy (owner: the float over to the foot of the
  tower before the pull was a second movement and felt clunky). `planClimb` takes the celebration spot as the
  climb's foot; the arc and the arms are proved clear of rock from there as before. The gap between the cheer
  and the arms going up is a turn on the spot (`T_REACH` 7.5 → 6.7), and the wide shot sits lower and further
  back until it leaves the ground, since the spot is out from the rock and often downhill of the door. Check
  with `DIST=<folder> node scripts/beacon.mjs <dir> tower=3 shots=free` (and `tower=4`, the other camera side).

- 2026-10-07: the glimmer's phase is a blink (owner: out in the world the flickering dash looked lame; like a
  mage's blink, a poof, moved up a bit, dust going back from where she was, something phasing in where she
  lands). Presentation only: the body still runs the same `PHASE` 0.42 s the same way, so the Veil Cave's
  distances, its veil passes and the camera's holes are untouched (`veil-plan.mjs` and `veil.mjs quest,dash`
  pass as before). For all but the last `PHASE_IN` 0.1 s she and the rider aren't drawn (`d.hidden`,
  `blinkWork` in main; no shadow either); at the press dust is thrown back the way she came with a few motes
  of her light in it; while she's gone a thin line of motes marks where she went; back, she opens out of a
  tall sliver over `BLINK_IN` 0.3 s (`blinkIn`, the rider with her), pale as her light and taking her coat
  again, in a ring of motes and a kick of dust. The glimmer by herself in the cave (`ghost`) is as she was:
  never gone, only stretched. Check with `DIST=<folder> node scripts/blink.mjs <dir> [t]` (every other frame).
- **The moonmoth walks** (2026-10-07). Her six legs were part of the body's mesh, so on foot she slid. They're
  parts of their own now (`thighB` / `shinB`, twelve nodes `hip<k>` / `knee<k>`, `LEGS` in `moonmoth.ts`; the
  statue keeps the fixed ones, `bodyGeometry(true)`): an insect's tripod walk off `a.cyc` (fore and hind of one
  side with the middle of the other, `swing`), a small waddle and bob, the wings held about 0.3 rad up and
  shivering with each step so they don't drag; standing they're where they were, in the air they tuck under
  (`a.air`). No `feet()` yet: on a cross slope the downhill feet can hang a little.

- **The Moon Hall has music** (2026-10-07, owner's four files). `moonhall_way_in` (28 s, once),
  `moonhall_dark_hall_loop` (72 s loop), `moonhall_lamp_lights` (14 s, once), `moonhall_flying_loop` (64 s loop);
  `public/audio/*.mp3` by `scripts/audio.mjs <folder>`. Played by `Ambience` the way the giant's pieces are
  (`CUES`, now a table per piece: its group, its fade in, what the one before goes out over, a loop's length);
  which piece is `MoonHall.music`, from the hall's own events and no timers: the way in from `enter()`; the
  hall's loop from coming out into the great room (the same test as the first look at her, latched for the
  visit, so turning stones never restarts it); the lamp's from the fourth stone coming right (`show = 0`); the
  flying loop from first being on her back with the lamp lit, then to the end. Null once you're out, which
  fades whatever sounds over `DROP`.
  - Cross-fades: way in → hall 4 s; hall → lamp 3 s out, the lamp let in over 0.5 s (the file brings itself
    in, as the way in does); flying 3 s in (4 s over anything still sounding); out 4 s. A way in that runs out
    before you reach the hall (it stops dead in the file) goes out over its last 4 s.
  - Volume: `gains.hall` (1), times `gains.music`; in the panel's Music folder.
  - Timing as played by the keys on `hilda`: the hall at 26.9 s (the way in is 28 s); the lamp's piece ends
    1.8 s before she can be got on, so there is a breath with no music until you're on her.
  - Taken as defaults, not asked: coming back down with the lamp already lit plays the hall's loop until
    you're on her; the flying loop stays if you get off her.
  - Check: `DIST=<folder> node scripts/moth-music.mjs` (real time, the levels), and `scripts/moth.mjs <dir>
    quest` prints when each piece is asked for.

### Dungeon endings made one sequence (2026-10-07)
The Moon Hall's own way out (a cut to the well, put on the moth, flown up
its roof) is gone: on foot it read as a teleport. It now ends as the other
two do (`win` runs out under the veil, `onWon`, `ring3.emerge`). In all
three `leaveX(true)` only sets `bringUp` if you were riding when the light
was taken; otherwise `standBy` puts the creature beside where you come up.
The whole run (light, pulled up, offering, spirit home) is the standard for
every dungeon: DESIGN.md "Dungeons". Dungeon 3 still lacks the homecoming.

## A third homecoming, and a fourth ring (2026-10-07)
Asked for: after dungeon 3's offering, what follows the other two, and the
giant walking to where dungeon 4 will be. Dungeon 4 itself isn't built.
- `WorldGen.dungeons` finds a fourth site (`nextSite(third, [first, second])`). The first three don't move:
  `scripts/sites.mjs` fingerprints match the build before on `hilda`, `hildaz2`, `fjord`. Cache key
  `embla.dungeon.v10`. `WORLD_VERSION` not bumped: the land only changes at the new ring and along its way,
  1 km past anything a save holds. The fourth search costs 0.1-1.6 s once per seed on the five seeds tried.
- `homecoming3` in main: the same class, `who: 2, leg: 3, name: 'home3'`, `before` the second's route, veil
  rose (the Moon Hall's). No `settledAt` and no `Ring` for the fourth: the POI's bare stones only, as the
  third was before dungeon 3. `offering3`'s giant is null once it has got up.
- A save from between the third offering and the spirit landing puts you back by the shrine on the moth, as
  the other two do.
- Check: `scripts/moth.mjs <dir> home3 [sandbox]` (all ok on `hilda`), `scripts/sites.mjs` (now checks the walk
  to ring 4 too: dry, off rings and towers, ends 45-130 m short; ok on five seeds).
- No dev shortcut for "third done" (`thirdDone`, a `ring4` checkpoint): nothing to stand in front of yet.

## The ring's forcefield is painted by the ground (2026-10-07)
It was a flat tilted disc in the overlay scene, 0.55 m over the ring's average
slope, at 78% alpha. Rings stand on ground up to a few metres out of level
(2-2.6 m inside the three on seed hilda), so humps came up through it, and the
ground showed through it anyway. Now it has no mesh: `TERRAIN_FRAG` paints it
as the ground's own colour inside `uField` (x, z, radius, open; `FIELD_U` in
materials.ts, written by whichever `Ring` is open, one at a time). It can't be
poked through at any LOD, is opaque, and is fogged like everything else. It
writes emissive -1 so the grade leaves its violet alone. World props (tufts,
flowers) inside the open radius are hidden by `trodden()` in the prop shader.
The land itself is untouched (no flattening, no `WORLD_VERSION` bump). The
arms now root at the ground's height. `scripts/ring-field.mjs` shoots all three.

## Counting the saved, and the still taken (2026-10-07)
Owner: at each homecoming everyone already home should be there celebrating,
so you see how many are saved; and a crow with no light should be gone from
the giant, so the crows left on it are how many are still to save.
- `Homecoming.crowd`: every spirit home before this one is stood in the
  guide's yard round where the two meet (`CROWD` slots: angle from "across
  the yard, away from the camera", metres out; the guide's and the light's
  ways in kept clear). They watch the light down, start when it lands, and
  jump a beat after the two. `Village.attend` holds one out of `mill`;
  `dismiss` (at the cut back) sends it home down the lane. Nothing saved: a
  reload finds them at their doors.
- `Birds.leave(i)`: sheds the light and marks the bird `gone` (not flown,
  not drawn). Called at the cut back (it was last seen flying off over the
  village; it used to be put back in its tree under the veil) and in
  `Homecoming.restore`. Perches aren't reshuffled: the others stay in their
  own trees.
- Check: `scripts/veil.mjs <dir> home2` (now also checks `gone`). Its "third
  ring is bare stones" check fails since dungeon 3 was built: stale, not this.

### Dungeon 4, the Drop: a first rough form (2026-10-07)
- The owner asked for a harder dungeon by way of action that isn't combat,
  and gave the shape: start high, precision parachute landings down
  pillars, a mistake brings you back to the top, the wurm at the bottom
  climbs you out to the light. Built inside only (`?dungeon=4`); what's a
  default and what's to be asked is `docs/NEXT-dungeon4.md`.
- **The cavern is the shell's pit,** not a ledge: `pitSd` is a band straight
  across a round room, 112 m deep. `buildShell` drew it unchanged (walls'
  feet at the pit's floor, the two faces as its pit faces).
- **The wind is a `WorldQuery.updraft`,** not a mode of its own: while it
  returns a velocity `GlideMode` goes where it says and can't be let go of,
  and `WalkMode` in the air opens the parachute. So the rig, the camera and
  the landing are the parachute's own.
- **The wurm needed nothing new to climb:** `RideMode`'s wall climb asks
  `world.climbTop`, which in a dungeon was always -Infinity; the Drop
  answers it (a lip over a face, a pillar's top). Its collision holds a
  body its own radius off a face from below, as a cabin's wall does.
- **Found on the way:** the wurm's segments on a sheer wall took their yaw
  from `atan2(0, 0)` (see `wurm.ts`): fixed for the overworld too.
- The wind's sound (`Sfx.wind`) has not been heard by anyone.

### The cold country: what the open world is for (2026-10-07, decided, not built)
- A long brainstorm with the owner about what there is to do outside the
  dungeons. Free building, a homestead game, and a currency-and-shops
  economy were each tried and didn't land; the owner's reading was that a
  core idea was missing. Every use offered for a common resource was a
  toll on something that needed none, because nothing in the game used
  anything up.
- What stuck: the land is cold until beacon towers are lit, towers are
  opened with sparks, sparks are found in warm land. It gives the towers,
  the cabins and the hands a job and answers how towers get lit.
- The owner's own additions: no towers near a ring and one rising from
  each won dungeon; a treasure (one village structure) with every
  dungeon; the lasso much later.
- Lore direction: the giant is a tower whose light has gone out.
- In DESIGN.md "The cold country"; the whole of it, with what was left
  and what it collides with, in `docs/ROADMAP-openworld.md`; first job
  (mock the look) in `docs/NEXT-warmth.md`.

## The cold country: a mock of the look (2026-10-07)
Step 1 of `docs/NEXT-warmth.md`, for the owner to judge before anything
real is built. It lives wholly in the composite pass (`postSettings.cold`,
off by default) and is driven by `scripts/warmth-mock.mjs`; nothing in the
world, the story or the saves knows of it. Cold is a tint and lift by a
pixel's world place, and fog by the share of the sight line outside the
warm circle, so a lit region seen from its tower ends in mist. What was
tried and what isn't solved (dusk and night) is in that doc's log.

## Fewer towers: 900 m apart (2026-10-07)
The owner played and found too many, and wants the warmth sized so no
cold can be left. `TOWER_SPACING` 560 -> 900 (about 60 a seed, from about
115). Warmth will be a tower's patch (the land nearest it), which covers
everything by construction, so no radius needs choosing. Cost: the world
moved (`WORLD_VERSION` 4, dungeon cache v11), every dungeon ring is
somewhere new, and the journey's second tower is nearly twice as far.
Numbers and what broke: the log of `docs/NEXT-warmth.md`.

## The giant walked its visit waist deep (2026-10-07)
`theGiant()` in main stands a settled giant by the ring for whoever asks,
and something now asks before the visit; `Visit.start` then summoned that
same giant and walked it still dormant (sink 1, the group 43 m down).
`Giant.emerge` clears `dormant` and `sink`. Checked with
`scripts/visit.mjs <dir> tower`.

## The cold country, a first form (2026-10-07)
Built in one go while the owner was away, to be revised: `story/warmth.ts`
(patches, not circles: every place belongs to its nearest lamp, so all lit
means nothing cold), the look in the composite pass, the camera for
lighting a tower in the cold, cold faces, and `story/sparks.ts`. Warmth
saves nothing of its own: it follows from which towers are lit and how far
the story has got. The shader reads the four nearest lamps per 55 m cell
from one texture and each lamp's reach from another, so the edge is exact
and costs five fetches; the air (fog along a sight line, the sky) reads a
coarse warm / cold map. What was taken as a default and what isn't built
is in the log of `docs/NEXT-warmth.md`.

## Snow in the cold (2026-10-07)

- Owner asked for snow in the cold areas. `src/story/snow.ts`: 9000 flat
  round flakes, instanced quads in a 76 x 40 x 76 m box that stands a little
  ahead of the camera. A flake's place is a function of its number and a
  clock (wrapped into the box in the vertex shader): nothing simulated, so
  cuts of the camera need no settling.
- Each flake asks the warmth's own maps (`tWarmIds`, `tWarmTow`, the cabins'
  pockets: the composite's maths again, in its vertex shader) whether the
  land under it is cold. It thins over the last 9 m before a tower's warmth
  (4 m before a cabin's) and none falls in it; a tower's warmth rolling out
  sweeps it off with no code of its own.
- Drawn in the overlay scene, not the G-buffer: opaque flakes there would
  each get an ink outline, the grade and the fog. Hidden behind what's
  solid by the G-buffer's depth. Because the overlay is swapped in a
  dungeon, none falls there.
- White by day, the snowy ground's blue after dark. Capped at about 1% of
  the screen's height across and faded out under 4 m, or one near the lens
  is a great disc.
- Not done: it falls through roofs and under trees (hidden only by what's
  in front of it), nothing settles, no wind gusts, no sound. Perf not
  measured: 18k triangles, one draw call.


## The hearth's warming shot (2026-10-07)
- Lighting the hearth in a cold country is shown as lighting a tower is,
  at a cabin's size. `Story.lightHearth` starts it (only when `Story.cold`,
  which main sets from the warmth); the table is `HEARTH`, the camera
  `HEARTH_CAM` / `hearthCam`: 1 s where you stand for the fire to catch,
  then up first and out over the yard to 62 m off, looking down from
  front-left so the hearth's wall faces it, drifting a little.
- The ring is the cabin's own pocket: main asks `Story.hearthWarm` for how
  much of its 16 m it is and how bright its rim. A pocket now carries its
  rim (`uColdPk` is a vec4; 0.5 at rest, 1 while it rolls). A save that's
  already lit starts whole.
- It's `Story.busy`, so hands are off, and the journey's bike gift waits
  until it's over and then its own five seconds.
- The roof is off in the shot (the cabin's cutaway, because you're inside):
  left so, you see the fire and the two of you in the middle of the ring.
- Check with `scripts/hearth.mjs <dir>` (a frame each half second).
- Later the same day, the owner asked for it far heavier and the sky dark.
  `cold.snow` now runs 0 to 100 (1 = the first quiet fall, 9000 flakes;
  default 12; 100 = 900,000) and the wind rises with it. Flakes are points
  now, not quads: as quads 100 cost about 15 ms a frame here, as points
  under 1 ms (`scripts/snow.mjs`; this machine's GPU, shared with other
  sessions, so only roughly: **not measured on integrated graphics**).
  Buffers grow as the amount asks.
- The sky over cold land by day goes to a heavy slate (`cold.storm`, by
  `cold.gloom`, default 0.8), paling to the fog at the horizon so far land
  still goes into it; clouds stay as a shade of it. Night is as it was.



## The opening, reordered (2026-10-07)
Owner's decision (DESIGN.md "The opening, reordered"); built the same day,
all at once at the owner's asking, and not yet played by them.
- **One table.** Phase 1 (`phase1.ts`) is the whole opening now: `hello`,
  `jar`, `round`, `pour`, `away`, then the old repair steps unchanged
  (`meet` .. `hearth`), then `well` and `relight`, then `home`. New step
  kinds: `round`, `pour`, `away`, `draw`, `relight`. One table rather than
  a new phase, so nothing that counts phases (`phaseIndex`, the stable)
  moved.
- **`away` is where the journey has the guide.** `Story.begun` (the well
  is shut) is what the journey waits on now, not `done`; it hands the guide
  back with `Story.resume()` at the end of the grief, which used to start
  the stable. The stable starts as before once `done` (the tower relit and
  the guide home).
- **The house** starts whole (`RuinCabin.setWhole`, on a save-less load)
  and is broken by `wreck()` when the giant stops by the yard: parts go
  back to `broken` (`resetPart`), the fire is doused. Smashed, not run
  down: `rundown` (off) keeps the moss and the `uWear` paint for later.
- **Smashed hard** (owner, 2026-10-07: "way more smashed"; it had been a
  sagging roof with a hole in it). The walls are broken down at the door
  end, one gable gone and the chimney's torn, a rag of roof left at the
  chimney end, the ridge beam fallen in, the stack laid out across the
  yard, the door thrown down in it, boards everywhere. Still a house you
  mend in the same three repairs: each side is two meshes, whole and
  wrecked (`CabinParts.wreck`), and a repair puts whole ones back
  (`RuinCabin.mended`: roof = back and far gable, door = front, chimney =
  its own gable). Wall collision is unchanged (the low walls still stop
  you at full height); you can only stand on the roof that's left
  (`roofLeft`). The moss and sapling went from the broken roof, and
  `rundown`'s sprung boards were placed for whole walls: both would need
  doing again for a neglected cabin.
- **The clock.** The opening is an afternoon (13:00 on); `away` lets the
  day run free, so the giant comes late in the day as it always did; the
  repairs keep their old hours, a morning to dusk, and `Story.clock` runs
  the night between past in about eight seconds (the hour is later than
  the step's window: it wraps).
- **The jar is `Sparks.count`.** The village gives a jarful between them
  (`JAR` = 8, each spirit its share), the well keeps it (`Well.store`,
  saved with the story), and the home tower takes a jarful to light again.
  So one number, one HUD.
- **A tower that's out** is a second set in `Beacons` (`out`, saved beside
  the lit ones): open, dark, not alight for the warmth, taking nobody up,
  not flown to. `kindle` is its lighting: sparks up the face, `'lit'`,
  then the same warm shot a freed tower gets (`warmShot`, shared).
- **The cold** is on once `giantGone`, and comes over 24 s (`FALL`), which
  from the head of the tower whites the whole view out. A save from after
  starts cold. Cabins warm no ground any more, and the hearth's warming
  shot is gone with it (`HEARTH`, `hearthCam`, `scripts/hearth.mjs`).
- **Saves.** `SAVE_VERSION` 3 and `WORLD_VERSION` 5: every save is wiped,
  since the order of things in them changed.
- **Checked** with `scripts/opening.mjs` (the opening by the keys; the
  visit from the tower; the morning after; the well; the relighting) and
  `scripts/story.mjs` (the repairs by the keys, from the checkpoint).
  **Not checked:** the whole thing in one sitting by hand, a reload at
  every point, touch, or the frame rate on integrated graphics (nothing
  heavy was added: one small well, a jar, a handful of spark meshes).

- **The key prompt is back from the bike on** (2026-10-07). `Story.silent`
  hid it "while the opening runs", which was fine when the opening ended
  before the bike; reordered, the opening runs through the bike, the tower
  and the repairs, so "E ride the bicycle" never showed. It's now quiet
  only until the well is shut (`begun`): the jar's round has no keys to
  teach that the pictograms don't already.

## Sparks get a look of their own (2026-10-07)

The owner: sparks are central, so they and the jar icon must look much
better, and they shouldn't just float about the world as they did (one day
they may be in chest-like things). Done:

- One look for a spark wherever it is, `story/sparkLook.ts`: a white-hot
  bead in the scene and, in the overlay scene, a four-pointed star (amber
  edge, pale heart) that rocks, breathes and flares, a halo in two flat
  bands, and glitter shed when it moves. Drawn in its own colours, not
  added as light: added, it went white at night and washed out on pale
  ground. The gem (a stretched octahedron) is gone from the world and from
  the well's motes; a tower's kindling still uses puffs.
- In the world a spark lies low in the grass, wakes when you come within
  3.6 m, whirls up round you and goes into the pack. It's yours (counted
  and saved) from the moment it wakes; the HUD counts it when it lands.
- The jar icon is redrawn (round-bellied glass, cork, a shine) and the
  HUD's fills with light and stars as the count nears a jarful, or what the
  tower you're at wants; it hops when one lands.
- Not done, on purpose: chests. Where sparks lie is unchanged.
- Not checked: how one reads from far off (the star is never under 9 px,
  but the long shot in `scripts/spark-look.mjs` missed it).


## The well mended, and the village's gift (2026-10-07, later)

The owner on the jar's round, having seen it: "the vibe just ain't there",
every villager looks the same and you can't tell who has yet to give; then
"repairing the well or something, then they all come and add to it", the
well "should look deeper, pouring into it should look cool, it shouldn't
fill up so much".

- **Steps.** 'jar', 'round' and 'pour' are gone from the start. 'mend':
  five stones of the rim's upper course lie on the grass in front of it;
  the action by one and it hops back into its gap (no tool, no inventory).
  'gift': `Village.bring` walks everyone down the lane to a crescent round
  the well's front (they're too short to be seen over the rim from across
  it), each `bearing` a spark over its head; when all are there, and you
  are, they throw them in one after another and the guide shuts the lid.
  You do nothing in it but watch. The jar is a 'pickup' by the well just
  before 'draw', after the giant.
- **The shaft** isn't a hole: the terrain is in the way. It's a disc inside
  the ring whose shader casts each pixel's ray down a cylinder 7 m deep
  (`SHAFT_FRAG` in well.ts): coursed stone going dark in hard steps, a
  small heap of light on the bed whose glow climbs the wall only a little,
  up to four falling sparks painted with the ring of light each takes down
  with it, and a breath of light when one lands. A mote is a real mesh
  until it's inside the ring, then `Well.drop` hands it to the shader.
- **The jar in her hands** (`CharacterRig.jarOut`): the pat's kneel with
  both arms by IK round a jar that belongs to the rig, leaning in until
  they reach. Used at 'draw': sparks come up out of the well into its
  mouth, it warms in colour as it fills and dips with each. Input is held
  while it lasts (`Story.holding`).
- Not done: a camera of its own for the gift; anything in her hands while
  she lifts a stone (it's the two-handed `give`); sound for the fall.

## The reordered opening unwound; the cold as regions (2026-10-07, evening)

The owner, after seeing both the jar's round and the well mended: "the old
intro with cabin fix-up just felt better", and "when I build the cabin my
spirit guy lights up. it's a vibe and it's sorta kinda a story". Kept: the
cold country (but "just certain regions"), the action music, dungeon 4's
fixes, the other fixes of the day.

- **Put back to the last commit:** `phase1.ts`, `story.ts`, `journey.ts`,
  `giant/visit.ts`, `cabin.ts`, `geometry.ts`, `build.ts`, `village.ts`,
  `ui/checkpoints.ts`, `scripts/story.mjs`. Deleted: `well.ts`,
  `scripts/opening.mjs`, `docs/NEXT-opening.md`. Taken out by hand: the
  jar pose in the rig, `Spirit.bearing`, main's wiring (the jar, the home
  tower alight from the first, `snuff`, the jarful). So the smashed-cabin
  work of that day went too. `WORLD_VERSION` is 6: every save is wiped.
- **Left in, unused:** `Beacons.snuff` / `setOut` / `kindle` and their
  camera. Nothing calls them. Take them out if the idea isn't coming back.
- **All of it as it stood** is `refs/backup/reordered-opening` (a commit on
  top of bd941c7, on no branch): `git diff bd941c7 refs/backup/reordered-opening`.
- **The cold as regions.** `Warmth.isCold(id)`: a tower is a cold tower if
  the 2.7 km block it stands in is cold country (a hash of the seed, 28% of
  blocks), it's over 2 km from the start, and it isn't the home tower or
  the journey's second. A cold tower's patch is cold until it's lit; every
  other patch counts as lit. Nothing else changed: the composite pass, the
  snow, the roll-out on lighting. Cold towers alone want sparks. No ring
  warms anything (none is asked). Seed to seed the share swings widely
  (hilda: about half its towers at 34%; embla a sixth), blocks being few:
  a real biome in `worldgen.ts` is the proper form of this, not built.
- **Checked:** `scripts/story.mjs` plays the fix-up through; `scripts/visit.mjs
  <dir> tower` runs; the start is warm and a cold tower's land is cold and
  snowing on hilda. Not re-run: `scripts/warmth.mjs`, `sparks.mjs`,
  `towermap.mjs`, `snow.mjs` (their `story` / giant cases are stale).

## The way home, for whoever strays at the start (2026-10-07)

- Owner: walk far off at the very start and you're simply lost. The far-off
  pointer only ever pointed at a task, and at the start there's none.
- Now, with no task to point at and the giant not yet been, the pointer
  falls back to the guide's house (`wayHome` in main): once you've been
  over 350 m off and a minute out of 150 m, it shows, and stays until
  you're back inside 150 m. `Guide.far` / `Guide.delay` carry that;
  `Pointer` latches on `far`. Every other guide behaves as before.
- Not after the giant: then the trail and towers lead away on purpose.
- Typechecked only; not walked out to in the game.

## The cold is only the mountain tops (2026-10-07, late)
Owner's call, "for now". `REGIONS = false` in `story/warmth.ts` empties the
set of cold towers, so every patch is warm; the cold is by height instead:
`coldHigh` in the composite pass (`uColdTop` = `postSettings.cold.top`,
`topSoft`), taken as the max with the patches' cold, for the ground, the air
along a sight line (the share of it above the line) and the sky (by the
camera's height). `Warmth.warmAt` asks the ground's height (new dep
`height`), and snow.ts keeps flakes whose own height is above the line. The
region and patch machinery is untouched and `?cold=1` still shows it.

**By the ground's height, never the air's** (owner, the same night: it
snowed on anyone flying high, whatever was under them). A flake asks how
high the land under it stands: `Snow.survey` keeps a 32 x 32 half-float
texture of `gen.height` at 4 m round the box (each texel holds the cell it
is the remainder of, so only cells new to the square are asked for: about
32 a step, 1024 on a cut). The composite's sky goes by the ground under the
eye (`postSettings.cold.under`, set in main; `uColdTop.z`), and the air
along a sight line takes the ground between as a straight slope from there
to the pixel's own height.

## A tower out of the ring (2026-10-07)

The owner, after the cold-country story was set aside: keep the tower that
rises from a dungeon's ring, and put the shrine on top of it. "The orb
would get placed, then the tower would rise up from the ring." Answers
given: the same crow as now, from up top; you're bumped back and watch it
rise; it's a real, lit beacon tower; a spirit in it is implied.

- **Where it comes in the offering.** After the light settles in the bowl
  (`T.set`) and before the crow is sent for: `heave`, `rise`, `up` in the
  timing. It adds about 7 s to the first offering and 5 to the short one.
  The shrine still comes up out of the ground first, as it did, and you
  still walk to it: only then does the tower lift it.
- **The tower is not in the network.** `WorldGen.ringTowers`, one a ring,
  numbered after `towers.towers`. So no tower moved, no ring moved, no save
  was wiped, and workers know nothing of it (the ring's own clearing is
  what keeps trees off it). `Beacons` holds its list as the network's plus
  these, hidden (`under`) until `raise`. Its links are worked out one way
  (which of the network it sees); `Beacons.seen` reads them both ways, so
  the network's own `links` are never touched (the debug map indexes by
  them).
- **Rising is the tower itself moved.** `Beacons.place` sets every
  boulder's height from a copy of it standing, so drawing, collision, the
  camera clamp and the door all follow with no second code path.
- **The shrine rides the head** (`Beacons.crown`, `Offering.seat`): it
  turns, tips and hops as the head does. While the offering plays the head
  is held facing front (`still`), so the crow's marks hold; afterwards it
  watches you like any head, and the stone creature goes round with it.
- **A save.** `embla.offer<n>` is what stands the tower (`placed` or
  `given`: up and lit at once). A ring tower's id in `embla.towers` is
  ignored on load, so the two can't disagree.

Defaults taken, the owner hasn't ruled on them:

1. **Size.** 0.52 of an ordinary tower (`RING_TOWER_SIZE`): about 23 m to
   the top of its head on `hilda`, against 40 or so. At full size its door
   boulder swallowed the ring's stones. The nine stones stay, round its
   foot.
2. **It faces away from the giant,** out through a gap in the stones, at
   you. The giant looks at the back of its head.
3. **Its spirit wakes the moment it's up** (the hop, the eyes, the door
   open), before the crow comes. The other choice was at the giant's smile.
4. **You run to 17.5 m and watch from in front of its door.** Knocked back
   for 0.4 s, then a turn and a run. Whatever creature stood by is simply
   put 7 m to one side of you at the cut (no walk).
5. **Four cameras, a cut between each** (the owner: the camera has to
   change with what's happening; the crow taking the light from the foot
   of the tower "looks lame"). `cinematic()` in `offering.ts`: close by the
   shrine as the light goes to it and for the first second of the heave;
   low on the ground behind you, inside the ring's clearing, looking
   steeply up (64 degrees wide) while the tower comes up and wakes; **up in
   the air by the shrine on its head for the crow** (the old close shot
   again, 23 m up: the shrine near, the crow coming over it out of the
   giant, the giant's face beyond); then the giant's face as before.
6. **Its stone is the other towers' granite,** not the shrine's ash blue.
7. **Sound** is what there was: the giant's stomp as it starts and as it
   stands, thuds on the way, a shimmer as it wakes.

Checked on `hilda` with `scripts/offering.mjs <dir> play,reload,home,tower`
(dungeon 1's) and `scripts/veil.mjs <dir> story` (dungeon 2's short one).
Dungeons 3 and 4 use the same code and were not run. Two checks in
`offering.mjs home` were out of date before this (they expected the giant
not to be solid, and the second ring to be bare stones) and were put right.

## The giant's first walk never doubles back (2026-10-07)

Owner: the footprints sometimes ran one way and then the opposite way,
overlapping or side by side. Measured on 36 seeds with
`scripts/doubleback.mjs` (new): 13 did, `hilda` among them. Three causes,
all in `visitRoute` (`giant/visit.ts`), none in worldgen, so no land moves:

1. **The ring lay back the way it came.** It always came up the lane from
   the far end to the yard, wherever ring 1 was. Now, if that walk comes
   back on itself, it is tried from the yard's end too (round your cabin,
   then down the lane and on), and whichever doubles back least is taken.
2. **The way hairpins.** Worldgen's way goes to a point beside a tower and
   on from there, which can be straight back. The giant walks straight
   across the mouth of one (`straight`): no prints in the loop. The way
   itself, and what worldgen clears for it, is as it was.
3. **It spun on the spot by the yard** to get round your cabin (240 degrees
   one way rather than 80 the other). It may now bear round something and
   back (`bear(.., then)`), cut the corner on to the way, and come in on a
   bend (`comeIn`).

A seed whose old walk was clean keeps it to the last bit (`plain`; the
fingerprints in `scripts/sites.mjs` are unchanged for those). `awry` =
`doubled` + `tight` is the measure, and the script fails on either.

Not touched: the walks on to rings 2, 3 and 4 (`onwardRoute`) still turn
round and tread back in their own prints where the only way on is back,
by design. A save made after the visit on a seed whose walk changed
reloads with the prints where the new walk puts them.

Checked: 36 seeds clean; `scripts/sites.mjs` on 14 (nothing new wades or
treads on a ring; its lower bound on how near the last print is to ring 2
went from 45 m to 40, the giant's resting place is still held 58 m off);
`scripts/visit.mjs` on `7` and `13`, where it now comes from the yard's end.

## 2026-10-08: out of a dungeon still mounted; right angles on a wall; the Drop's ladder; a taller mouth
- **Coming up mounted, you stay mounted.** Every dungeon's exit used to dismount you below, lift you alone (under
  the veil for most of it), hide the creature and put you back on it once the arms let go: seen as a flash off it
  and on again. Now `rideUp` (main) keeps you on it and the ring lifts the two of you: `ringDeps` maps the ring's
  'walk' to 'ride' when you're riding, and the arms take you by the chest wherever the saddle puts it
  (`RingDeps.seat`). The rise is longer (`RISE` 1.3 s) and the veil is off in its first 0.3 s, so being pulled up
  out of the field is seen, on foot too. `bringUp` is left only for the dev `?ride=` arrival.
- **A snake steerer on a wall turns in right angles there too** (`GallopState.wallSide`, `climbWall`): from going up,
  right is along the face, right again is down. It used to double back. In the Drop she is kept over the ledge
  while on the far face (`collide`), so no way along it leads down into the dark.
- **The Drop's way up is shown**: `DropLayout.climbLanterns`, a ladder of lanterns up the far face either side of
  where the ledge's end leaves her, lit once the cavern wakes, with light running up it until the light is taken
  (`rung`, `wave` in dropCave). Pushed last so no saved lantern number moves.
- **The giant's mouth opens taller, mostly downward** (`gape` in GIANT_FRAG; `GAPE` follows), and the crow flies in
  `OVER_MID` over the middle: with the light under its feet it's the pair that has to clear the lips.
- `scripts/dungeon.mjs` and `scripts/veil.mjs` each fail "hands off" by 14.1 m: that is the offering's own run out
  from the rising tower (`flee`), which the checks predate. Not fixed here.

## 2026-10-08: the moonmoth stretches her wings; the Moon Hall's stones

- On the pulpit her wings lay in the rock: its face overhangs there by about 33 degrees and she hung plumb, 0.5 m
  out. `MothLayout.perch` now carries `lean` and stands her `CLING` off the face along its slope; hung, the wings
  are held a little off it too (`moonmoth.ts`).
- A stretch (`d.s.stretch`, `STRETCH` s): both pairs up over her back as one (a lagging hind pair passed through the fore), a quiver,
  eyes shut, down again. The hall starts one half a second into the first look, and as the lamp kindles (she
  leaves the rock with them still up). On the ground, not ridden and standing still, any moonmoth does it by
  herself every 14 to 40 s. The wild one is not looked at in a screenshot yet.
- Stones: only the one nearest the way in is a single turn off; the others two or three (owner: three of four
  were one turn). Same number of rng draws, so nothing else in the plan moves. A half-done save keeps its faces.
- Each stone has a little moon on its crown (`DIAL_ORB_Y`, `DIAL_ORB_R`; `Dial.orb` in mothCave), the lamp's in
  small: dark (`MOON_OUT`) until its face is right, then lit as the lamp is, and the beam starts in its middle
  (it used to start as a bare cylinder end over the cap). The stone's solid is taller by it.
- The stones' beams wait for all four (owner): a right face lights only its little moon (and the `collect` chime it
  already had); solved, the four beams go out together (`Dial.b`) and the lamp lights.

## A fourth homecoming, and a fifth ring (2026-10-08)
Asked for: after dungeon 4's offering the crow returns the spirit to the village, and the giant moves on to
where dungeon 5 will be. Dungeon 5 itself isn't built.
- `WorldGen.dungeons` finds a fifth site (`nextSite(fourth, [first, second, third])`); the four before it are
  found before it is known, so they can't move. Cache key `embla.dungeon.v12`. `WORLD_VERSION` not bumped, as
  for the fourth: the land only changes at the new ring and along its way. The fifth search cost 0.08-0.28 s
  on the five seeds tried.
- `homecoming4` in main: the same class, `who: 3, leg: 4, name: 'home4'`, `before` the third's route, veil
  moss (the Drop's). No `settledAt` and no `Ring` for the fifth: the POI's bare stones only. `offering4`'s
  giant is null once it has got up; `ringWarm(3)` is `homecoming4.left`.
- A save from between the fourth offering and the spirit landing puts you back by the shrine on the wurm.
- Check: `scripts/drop.mjs <dir> home4 [sandbox]` (all ok on `hilda`, in the story), `scripts/sites.mjs` (now
  checks the walk to ring 5 too; ok on `hildaz2`, `fjord`, `embla`, `north`). On `hilda` it fails on the walk
  to ring 4, whose last footfall is 43 m from the ring (the limit is 45): that walk doesn't read the fifth
  site, so it was so before this.
- No dev shortcut for "fourth done" (`fourthDone`, a `ring5` checkpoint): nothing to stand in front of yet.

## The loading veil: the start site is found once (2026-10-08)
Owner: loading feels much longer than it used to. Measured (headless, seed `hilda`, load to the veil lifting):
2.0 s at 575ffd8 (30 Sept), 7.4 s at d245dbd (2 Oct), 7.9 s before this change. Nearly all of the jump was one
thing: `findStorySite` had grown to about 2.3 s (the village, the pasture, the far cabin, the approach), and
ran on every load on the main thread and again in each chunk worker before its first chunk.
- Now found once per seed, kept as `embla.site.v1.<seed>` and handed to the workers with each request
  (`primeStory` in main, `WorldGen.presetStory`, `Terrain.story`), as the dungeon sites already were.
  Bump the key's version when `storySite.ts` changes what it finds (a `WORLD_VERSION` bump wipes it too).
- After: 2.6 s with the site kept. A seed's first load is still 7-8 s (the start site and then the dungeon
  sites, all on the main thread with the veil up); moving those searches to a worker is the next thing if
  first loads matter.

## The village mended as dungeons are finished (2026-10-08)

The owner: "I don't see any progress right now"; clutter cleaned up along
with cabins built back up; spirits doing something when you come back,
"shoveling dirt (from a pile) into the giant footprints in town", the
prints disappearing over time. The homecoming's celebration stays as it is.

- **`mendVillage(done)` in main** is the whole of it: the village as `done`
  dungeons leave it. Called under each homecoming's veil (`mend` in its
  deps, at `cutTo`, so the celebration is already in the mended village)
  and from the frame loop when a load or a dev jump has more spirits home
  than it has mended for. Forward only, nothing saved: it follows from how
  many `home<n>` saves there are.
- **Houses** (`Village.plan`): the owner, on the first cut (which tied a
  house to who lived in it and when they came home): "more about vibe than
  actual logical progress ... cabins in various states of repair ... use
  good judgement". So everyone home works on all of it, one house after
  the next down the lane, 1.4 steps a dungeon and each house 1.4 behind
  the one before: 1 0 0 0 0, 3 1 0 0 0, 4 3 1 0 0, 5 4 3 1 0, 5 5 4 3 1.
  Two numbers to tune by eye.
- **Prints**: the visit's footfalls within 30 m of the lane and not under
  a house are filled from the yard's end outward, `ceil(n * done /
  FILLED_BY)` of them (5: `hilda` has four, so one a dungeon). A house's
  own print goes when its footing is laid, with any other print reaching
  under it. `Trail.fill` now also takes away the trees pressed flat in it.
- **The print being filled** is the next in that order (then the one
  under the next house to be begun). It is drawn part full: `Prints.part`
  and `uPrintFill` (one print at a time; `printDeep` in `PRINT_GLSL`), its
  floor bare earth. It starts at 62% of its depth on each load and every
  shovelful takes a little more off, down to 30%; not saved.
- **Shovelling** (`Village.dig` / `DigSite`): a heap of earth on the lane's
  side of the print, two shovels stood in it. Someone home with nothing on
  goes to the heap, takes a shovel (`Spirit.take`: it hangs on the right
  arm), digs ('dig'), carries a clod to the lip, throws it ('toss': a puff
  of earth out over the hollow), and goes back, four to eight times. Two
  at once at most. `Village.busy()` puts them straight to it when the
  village has just been mended, so you don't arrive to find them all on
  their doorsteps.
- **Clutter**: a house's boards and stones are stacked from step 1 (as
  before); wreckage lying where a print has been filled is swept, and of
  what's strewn round houses not yet begun, 22% more goes with each
  dungeon (`CLEARED`, `Village.sweep`: the same pieces every load).
- A carried shovel is held blade up (it went through the ground held low).
- Spirits now walk on the ground with the prints in it (`Village.gy`):
  they used to cross a print on the air above it.
- Checked: `scripts/mend.mjs` on `hilda`, all frames looked at.
- Rough: the building itself is still unseen (they hop and nod at the
  stack); no sound for the shovel; the heap never shrinks.

### The home tower's sign (2026-10-08)
The little house is filled in, not an outline, and sits over the home tower's
doorway (on the door boulder: `houseMark` in `HEAD_FRAG`), no longer on the
head's brow. From inside another tower's head the home tower's glow shows the
same house in place of eyes, paler (white gold) and in a thin steady ring of
its own (`house` in `towerView.ts`; `aK.x` carries +2 for home). Check with
`scripts/beacon.mjs <dir> shots=mark,travel`. While the home tower is still
sealed the lock's upright strap runs across the sign.
- **The shovel is picked up, not conjured** (owner: "the shovel just like
  appears in the spirit's hand"): the two stand in the heap's foot on the
  print's side, handles leaning out. A digger walks up, puts a hand out
  ('grab'), and the shovel comes out of the earth to its hand
  (`Village.flyShovels`, `Spirit.handPose`); when it has had enough it
  walks back and stands it in the heap again ('stow'). Only an interrupted
  digger's shovel still snaps back. The blade is a spade: square
  shoulders drawn in to a rounded point.
- **Cutscenes can be skipped** (owner, 2026-10-08: "an escape hatch"):
  hold Space for 0.9 s (by touch: hold the prompt). Held, not pressed, so a
  stray key skips nothing; not Esc, which the browser keeps to let the
  mouse go under pointer lock. The prompt (`ui/skip.ts`, `#skip`) is text,
  as the E / Space tips are (owner: fine here), small and pale in the
  bottom right, and shows only once a key, click or tap is seen. Main does
  the skip under a veil (`skipUpdate`, `skippable`): fade in, the scene's
  own `skip()` puts everything as a save from after would find it, the
  veil waits for `terrain.busy`, the camera comes back at a cut (`skipCut`).
  Built for the giant's visit (`Visit.skip`), the offerings and the
  homecomings (`Offering.skip`, `Homecoming.skip`; an offering and the
  homecoming after it go as one, and the giant then gets up and walks on
  by itself with nobody made to watch: `loose`). **Not yet skippable**:
  tower lighting, the Moon Hall's show, the rings' arms, the journey's and
  the story's own beats; a scene with no `skip` shows no prompt. Dev:
  `__ow.skip()`, `__ow.skipping()`.
- **Found at their stations** (owner: "they are always walking to one when
  I get there"): `busy()` also runs whenever you come back within 120 m of
  the lane from more than 150 m off; diggers do 8 to 16 shovelfuls, and
  those at a stack stay at it longer. Anyone with nothing to do is on its
  doorstep.
- **Night** (owner: "always go into a cabin and sit by the hearth, at first
  just the OG cabin but as they develop into their own"): from 20:30 to
  5:30 a spirit whose house is whole goes in at its own door and stays in;
  the rest walk up the lane, in at your cabin's door and sit on the floor
  round the hearth (`VillageDeps.cabin`: seats in three arcs, clear of the
  guide's seat). Out again in the morning. Arriving at night finds them
  there already.
- **Solid** (owner: "give those things mass ... the player should be able
  to hop on top"): the heap is a low cone underfoot, a stack of boards has
  a flat top and pushes you out from the side (`Village.surface` / `push`).
  Spirits are kept out of the heap, the stacks and every house's walls,
  whole or part built, sliding along a wall toward where they're going.
- The guide does none of this work. Asked, not built.
- **Chores at a house part built** (owner, 2026-10-08: "the wood ones
  don't appear to actually be doing anything"; asked for sawing near a
  cabin, picking up debris and adding it to a pile, wood and maybe a stone
  pile, and hammering a board to a wall, maybe off a ladder). Every house
  at step 1 to 4 has a yard (`Yard`, `layYard`; props `story/chores.ts`),
  laid out in the house's own frame: a sawhorse out front of the stack, a
  pile of stones behind it, and from step 2 a ladder on the end wall away
  from the stack with a pile of cut boards by it. Three turns (`work`
  picks one that's free, in its own yard mostly; `chore` is the stages):
  *saw* (the saw off the horse, three ends sawn off a board and dropped
  under it, what's left carried to the cut pile, a fresh board fetched
  from the stack), *nail* (a cut board from the pile, the mallet off the
  ladder, up, the board on the wall crooked and knocked level in six
  blows, down), *haul* (a board or stone still lying of a house nobody has
  begun on, within 45 m, carried in on its head: boards on to the stack,
  stones on to the pile). One sawyer and one on the ladder per yard, two
  hauling. The old "stand and look at it" is what's left when all are
  taken. Defaults taken: it is looks only (nothing saved, nothing built
  by it; a hauled piece is back where it lay after a reload or the next
  mend); piles hold a fixed few and the oldest goes as a new one lands;
  a load is put down and a ladder climbed down before bed; no sounds yet
  (village spirits have none); the sawhorse, ladder and cut pile aren't
  solid to you, the stone pile is (pushes you round, no standing on it);
  the last house standing alone at step 1 to 4 with no wreck near has
  nothing to haul. Spirits pushed off a pile now slide round it toward
  where they're going (`shove`). Check with `scripts/chores.mjs <dir>`.
- **Chores, after the owner's first look** (2026-10-08): the pile of cut
  boards by the ladder is gone ("coming back to the single board ... over
  and over ... looks silly"): whoever nails walks to the stack, lifts a
  short board off it (it just appears there) and carries it round, and
  what the sawyer has left goes on the stack too. They stay at a thing
  longer rather than making more trips: about ten seconds of hammering to
  a board (`KNOCKS`), four to five and a half of sawing to a cut, one or
  two boards to a turn on the ladder. Spirits are kept out of the board on
  the sawhorse (they go by one side of it), and whoever saws stands clear
  of it. The saw and the mallet lie on the ground when nobody has them
  (leant up, the saw hung in the air).
