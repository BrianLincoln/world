# Fjellheim — notes

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
  (`storyBlock`). Where the natural forest by the path is thin, the story
  plants conifers (`Woods`) so you always set out from the woods.
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
  The planted woods by the start path can't be felled yet.
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
- **Save:** localStorage per seed (`fjellheim.story.<seed>`, v2: includes
  tools and everything felled / smashed). The lit cabin is the respawn point.
  `?fresh=1` forgets, `?story=0` turns the story off (also off when the URL
  sets a time, position or flight, for shots).
- **Verify:** `node scripts/story.mjs <dir> seed=<s> [from=<step>]` plays the
  whole thing with real key presses (tap E, hold E at trees and rocks) and
  screenshots each stage; `scripts/spirit.mjs` does spirit close-ups.
- **Known / next:** a bed (sleep through the night) inside the bigger cabin;
  a new look for the spirit; felling the planted woods; shots whose subject
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
  catches. Lit towers are saved per seed (`fjellheim.towers.<seed>`,
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
  (`fjellheim.journey.<seed>`, cleared by `?fresh=1`). The paths are real
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
  `fjellheim.herd.<seed>` and adopted back into the pasture on load.
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
- **TEMP**: `main.ts` lands a crew in the cabin's front yard 2.5 s after
  load (`?drak=0` off; skipped with `capture`). `__ow.drakArrive()`.
  Remove before shipping.
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
- **The drakitten TEMP demo is still live** (`drakDemoT` in `main.ts`): a
  crew lands in the yard 2.5 s after every load unless `?drak=0` or
  `capture`. It would ship with a deploy.
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
