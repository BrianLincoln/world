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
  comes back. Landmark boulders (tors, stone circles, erratics, the spring)
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

## Elk (stag mount)
- `src/mobs/elk.ts`: a ground-only mob. Herds of 2–5 graze in meadows and at
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
- Trees: above 13 m/s, a tree in the elk's path is knocked flat (`Story.
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
