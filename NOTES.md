# Fjellheim — notes

> Decision log. The original brief is in `docs/BRIEF.md`; the working loop and gotchas are in `docs/WORKFLOW.md`; agent entry point is `CLAUDE.md`.

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
- **Tors** (stacked boulder cairns) take the best of several candidates by
  height minus forest, so they stand on open hilltops and read as landmarks.
  There are also stone circles on open meadow and lone glacial erratics.
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
- **No cast shadows.** Hilda uses few, and a shadow map is the biggest single
  GPU cost I'd add. The explorer gets a painted contact shadow.
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
4. **Soft cast shadows** for trees onto ground near the camera only (one
   small cascade, hard-edged, tinted with the shade colour).
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
