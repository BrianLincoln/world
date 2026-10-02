# CLAUDE.md

A procedurally generated, browser-playable Nordic sandbox in the flat-shaded
storybook style of *Hilda*. **Visual quality is the top priority, above feature
count.** Keep this file lean. Depth lives in:

- `DESIGN.md`: our shared design doc (pillars, decisions, player sequence).
  Keep it current when a design decision changes; it's not a build log.
  Never build anything from its Parking Lot unless asked.
  **The story is changing** (2026-09-30) to "The giant": a giant carries
  off the village's hearth spirits, and you follow its footprints through
  mount-gated puzzle dungeons. Decided, not built. Read its "Conflicts to
  settle" before touching the story, and don't resolve one unasked.
  Dungeon 1 is built through all three slices of `docs/NEXT-dungeon1.md`
  (slice C, the homecoming, not yet played by the owner). What comes next
  is `docs/NEXT-dungeon2.md`: the open questions from slice C, and what
  dungeon 2 can assume. The giant's trail ends at a second ring with
  nothing under it.
  No combat, no text. Spooky is fine where the story wants it (the
  giant's crows); nothing gory or cruel.
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
- `src/world/`: `worldgen.ts` (height, biomes incl. bog/glimmerwood/hollows, POIs, paths;
  how much is water: `scripts/water.mjs`, about 20% since 2026-10-02),
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
  `beast.ts` (shared brain/body for the eleven wilder kinds in `beasts.ts`;
  their ride traits are `MountTrait` in `movement.ts`),
  `parts.ts` (instanced part batches, fur), `rope.ts`.
- `src/vehicles/`: bicycles. `bicycle.ts` (geometry, instanced parts,
  skeleton), `bikes.ts` (seeded placement, parking, riding presentation,
  rider IK targets). Movement is `BikeMode`.
- `src/story/`: `story.ts` (the director: runs phase tables, actions,
  inventory, save), `phase1.ts` / `phase3.ts` (steps as data), `spirit.ts`
  (the hearth spirit: wants, gestures, acts), `build.ts` (sketch-and-slots
  building; `cabin.ts` and `stable.ts` are the buildables), `herd.ts`
  (creatures that live at the stable), `village.ts` (the other spirits'
  houses down the lane; the lane and plots are `StorySite.village`; they
  mill about until the giant comes: `mill`, check with `scripts/mill.mjs <dir>`;
  a house is built again in five steps, `setStep` / `buildStage`, wired to
  nothing past step 0: dev `__ow.house(i, step)`, shoot every step with
  `scripts/rebuild.mjs <dir>`),
  `pointer.ts`, `icons.ts`
  (pictograms), `overlay.ts`. `src/world/harvest.ts`: felling, smashing,
  regrowth. `src/world/colliders.ts`: prop collision.
- `src/story/beacons.ts`: beacon towers at runtime (drawing, the lock,
  freeing the tower spirit = lighting, being slurped in via `CarriedMode`,
  the head view, the tower camera's aim and ember flight, save).
  `towerRock.ts`: tower rock as exact solid shapes (collision, camera,
  arms). `towerView.ts`: the tower camera's overlay (silhouettes, eyes).
  `journey.ts`: phase 2 (bike gift, guided rides, the first two towers),
  and the send-off to the giant's trail once a creature is home
  (`sendOff`; check with `scripts/sendoff.mjs <dir>`).
- `src/giant/giant.ts`: the giant (skeleton, gait, IK, instanced boulders).
  Drawn by `GIANT_FRAG`; fogged as one card via `uGiant` in `post.ts`.
  Dev: `?giant=600,walk`. In the story, `visit.ts` drives it.
  `trail.ts`: what a footfall leaves (print, flattened trees, steam).
  `visit.ts`: the giant's visit to the village once the hearth is lit
  (its footfalls, the smashing, the taking, the camera, restore from save).
  `birds.ts`: its flock of black crows, which snatch the spirits and carry their lights.
  `ring.ts`: the dungeon ring once open (forcefield, dark spirit, the two
  arms that pull you down and lift you back out), and shutting for good
  (`seal`).
  `offering.ts`: what becomes of the dungeon's light above ground, a
  cutscene with your hands off (the shrine the ring becomes, the crow that
  takes the light and flies into the giant's open mouth: the whole
  sequence and its camera are the table `T` and `cinematic()`; saved as
  `fjellheim.offer1.<seed>`). No guide in it. The giant's side of it is
  `awake` / `mouth` / `gulp` / `grin` / `look` in `giant.ts`; its open
  mouth is a real hole into the hollow of its head (`throat`, `uHeadInv`).
  Its breath and the steam off its prints show only while it walks.
  Dev: `?fresh=1&cp=offer`, `__ow.winDungeon()`,
  `__ow.offering().debug('held'|'placed'|'given')`; check a change with
  `scripts/offering.mjs <dir> play,reload,views,mouth` and look at the frames.
  `homecoming.ts`: what follows the smile, still hands off (a crow leaves
  with a light; the camera cuts to the guide's cabin under a veil and
  waits for `terrain.busy`; the crow drops the light, it lands in dust and
  is the spirit, `Village.comeHome`; the two meet; its house is left a wreck, step 0;
  the cut back; `Giant.rise` (it stands up: `UP`),
  and the walk to the second ring, `onwardRoute` in `visit.ts`). Saved as
  `fjellheim.home1.<seed>` once the spirit is home; a reload after that
  replays nothing and finds the giant asleep by the second ring. Check
  with `scripts/offering.mjs <dir> home` (and `sandbox`, which walks the
  whole way), `scripts/rise.mjs <dir>` and `scripts/sites.mjs [map.png] <seeds>`.
- `src/dungeon/`: dungeon 1 inside, its own scene, drawn instead of the
  world while `dungeon.inside` (main swaps the `WorldQuery` over to it).
  `layout.ts` (the cave's plan as functions of the seed, drawn at its top:
  rooms, passages, ledges, the pit and its stepping stones, lanterns,
  lights; `layout.at` names its places), `shell.ts` (meshes from the plan),
  `dungeon.ts` (scene, collision, camera, light, being let down and lifted,
  and what you do there: the wrong-way ledge, the stones, the rockfall, the
  shut-in rockhopper, the warm light). Its creature is a `Mob` with `below`,
  run through `Mobs.under`. Slices A and B of `docs/NEXT-dungeon1.md` are
  built (taking the light: a success beat, then out on the surface on the
  rockhopper: `leaveDungeon(true)`, `dungeonWon`, `bringUp` in main; the
  offering is `giant/offering.ts`), and slice C (`giant/homecoming.ts`). Dev: `?dungeon=1`, `?fresh=1&cp=ring`; check a change with
  `scripts/dungeon-plan.mjs` (the plan from above, what can reach what) and
  `scripts/dungeon.mjs <dir> quest` (plays it through by the keys, the
  offering included).
  `WorldGen.dungeons`: every dungeon's ring and the way to it, a list
  (two so far; `dungeon` is the first). Slow to find: found in order on
  the main thread, cached per seed (`fjellheim.dungeon.v8`; when the land moves, bump `WORLD_VERSION` in main, which wipes every save) and handed to
  the workers, which never search (`primeDungeon` in main). Adding one must
  not move the ones before it: `scripts/sites.mjs` prints a fingerprint.
  `src/world/hands.ts`: stone hands standing about the world on islands
  and summits (seeded, one at most per 1.1 km cell; inert so far).
  `src/world/prints.ts`: the prints themselves, as a texture the terrain and
  prop shaders read (`PRINT_GLSL`), plus the same maths in TS for walking.
- `src/audio/ambience.ts`: the music. One loop for outdoor exploration
  (a test of the musical language: no biome beds, air, night layer or
  plucks until asked), faded in and out over `FADE`, hushed in cutscenes
  and the dungeon. Volume is `Ambience.gains.music`. On the `Sfx` context
  (`src/story/audio.ts`, the synthesised effects), its own gain. Files are
  `public/audio/*.mp3`, made from the WAV by `scripts/audio.mjs`.
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
