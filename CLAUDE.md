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
  (slice C, the homecoming, not yet played by the owner). Dungeon 2, the
  Veil Cave (its creature the glimmer), is built under the second ring and
  **not yet played by the owner**: `docs/NEXT-dungeon2.md` has what it is,
  the defaults taken and the questions to answer after playing it. After
  it a second spirit is flown home and the giant walks on to a third ring
  (2026-10-06), which opens when it lies down. Dungeon 3, the Moon Hall (its
  creature the moonmoth), is built under it (2026-10-07) and **played by the
  owner only in its first rough form**: `docs/NEXT-dungeon3.md`. After its
  offering a third spirit is flown home and the giant walks on to a fourth
  ring (2026-10-07) and lies down. That ring is bare stones: dungeon 4
  isn't built, and the trail ends there.
  **The open world is changing too** (2026-10-07) to "The cold country":
  the land is cold (pale, fogged, empty) until you light beacon towers
  with sparks, and each warms a swath; a tower rises from each won
  dungeon's ring; the giant is a tower whose light went out; the lasso
  comes much later. Decided, not built: `docs/ROADMAP-openworld.md` (all
  of it, and what was tried and left), `docs/NEXT-warmth.md` (what to
  build first: a mock of the look).
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
  `startWoods`: forest grown round the start clearing and the way in, so the cabin is hidden round the bend; the story never plants trees;
  how much is water: `scripts/water.mjs`, about 20% since 2026-10-02),
  `chunkBuilder.ts` (worker: grid, normals, scatter), `terrain.ts`
  (quadtree streaming, LOD, instancing; trees past about 490 m are lod 3, lod 2's picture at half the triangles: check with `scripts/treelod.mjs`), `towers.ts` (the beacon-tower
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
  the glimmer's phase is a blink (gone, then back a few metres on; looks only, the body runs the whole way: `PHASE_IN`, `blinkWork` in main; check with `scripts/blink.mjs <dir>`),
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
  It's solid whatever it's doing (`shell`: its boulders, worked out again each frame something near asks), carries
  whoever stands on it (`rider`), and its stone is sticky underfoot (half pace, never shed; a jump comes off): check with `scripts/giant-solid.mjs <dir> [spot=hump]`.
  `trail.ts`: what a footfall leaves (print, flattened trees, steam).
  `visit.ts`: the giant's visit to the village once the hearth is lit
  (its footfalls, the smashing, the taking, the camera, restore from save).
  `birds.ts`: its flock of black crows, which snatch the spirits and carry their lights.
  Just after the village bolts every wild creature about runs or flies off for good (`Mobs.scare`, each species' `bolt`; check with `scripts/visit.mjs <dir> tower mobs fine`).
  `ring.ts`: the dungeon ring once open (forcefield, dark spirit, the two
  arms that pull you down and lift you back out), and shutting for good
  (`seal`). The field has no mesh: the ground's shader paints it (`FIELD_U`,
  `uField` in `TERRAIN_FRAG`; tufts under it are hidden in `trodden`), so it
  is opaque and no ground can stand above it. Check with `scripts/ring-field.mjs <dir>`.
  `offering.ts`: what becomes of the dungeon's light above ground, a
  cutscene with your hands off (the shrine the ring becomes; you get down,
  walk to it and hold the light up, `approach`; the crow that swoops through,
  takes the light on the wing and flies into the giant's open mouth: the whole
  sequence and its camera are the table `T` and `cinematic()`; saved as
  `embla.offer1.<seed>`). No guide in it. The giant's side of it is
  `awake` / `mouth` / `gulp` / `grin` / `look` in `giant.ts`; its open
  mouth is a real hole into the hollow of its head (`throat`, `uHeadInv`).
  It has no breath clouds (removed 2026-10-02); the only puffs off it are
  the dust of its footfalls. The steam off its prints shows only while it walks, and their glow goes out a few seconds after it stops (`Prints.cool`).
  Dev: `?fresh=1&cp=offer`, `__ow.winDungeon()`,
  `__ow.offering().debug('held'|'placed'|'given')`; check a change with
  `scripts/offering.mjs <dir> play,reload,views,mouth` and look at the frames.
  `homecoming.ts`: what follows the smile, still hands off (a crow leaves
  with a light; the camera cuts to the guide's cabin under a veil and
  waits for `terrain.busy`; the crow drops the light, it lands in dust and
  is the spirit, `Village.comeHome`; the two meet, and everyone home already is in the yard cheering,
  `crowd` / `Village.attend`; that crow never goes back to the giant, `Birds.leave`: crows on it = spirits
  still to save; its house is left a wreck, step 0;
  the cut back; `Giant.rise` (it stands up: `UP`),
  and the walk to the second ring, `onwardRoute` in `visit.ts`). Saved as
  `embla.home1.<seed>` once the spirit is home; a reload after that
  replays nothing and finds the giant asleep by the second ring. Check
  with `scripts/offering.mjs <dir> home` (and `sandbox`, which walks the
  whole way), `scripts/rise.mjs <dir>` and `scripts/sites.mjs [map.png] <seeds>`.
  There are two of them: `homecoming2` in main is the same class after
  dungeon 2's offering (`who: 1, leg: 2, name: 'home2'`: the second spirit
  taken, the walk from ring 2 to ring 3, its veil teal). Check with
  `scripts/veil.mjs <dir> home2 [sandbox]`. And `homecoming3` after dungeon
  3's (`who: 2, leg: 3, name: 'home3'`: ring 3 to ring 4, its veil rose; no
  `settledAt`, so nothing opens there). Check with
  `scripts/moth.mjs <dir> home3 [sandbox]`.
- `src/dungeon/`: dungeon 1 inside, its own scene, drawn instead of the
  world while `dungeon.inside` (main swaps the `WorldQuery` over to it).
  `layout.ts` (the cave's plan as functions of the seed, drawn at its top:
  rooms, passages, ledges, the pit and its stepping stones, lanterns,
  lights; `layout.at` names its places), `shell.ts` (meshes from the plan),
  `dungeon.ts` (scene, collision, camera, light, being let down and lifted,
  and what you do there: the wrong-way ledge, the stones, the rockfall, the
  shut-in rockhopper, the thought on the high stone of how the parachute is
  opened: `chuteHintCanvas`, check with `scripts/chute-hint.mjs <dir> [touch]`; the warm light: a dark light, violet, `darkLight.ts`;
  orange is only ever a spirit; once taken it's in your mittens, here and in
  the Veil Cave and up to the shrine: `Character.carry` / `hands`, `carryAt`). Its creature is a `Mob` with `below`,
  run through `Mobs.under`. Slices A and B of `docs/NEXT-dungeon1.md` are
  built (taking the light: a success beat, then out on the surface on the
  rockhopper: `leaveDungeon(true)`, `dungeonWon`, `bringUp` in main; the
  offering is `giant/offering.ts`), and slice C (`giant/homecoming.ts`). Dev: `?dungeon=1`, `?fresh=1&cp=ring`; check a change with
  `scripts/dungeon-plan.mjs` (the plan from above, what can reach what) and
  `scripts/dungeon.mjs <dir> quest` (plays it through by the keys, the
  offering included).
  **Every dungeon ends the same way, from the light to the spirit home**
  (owner, 2026-10-06/07, DESIGN.md "Dungeons"): one standard sequence, the
  same code with only the creature, statue and colours swapped. Take the
  light, the success beat on the spot, the cut, `onWon`, the ring's
  `emerge` lifts you out with the creature (under you if you were riding
  it when you took the light, `bringUp`; beside you if not, `standBy`),
  then `Offering`, then `Homecoming`. No other way out, and no ending of a
  dungeon's own unless the owner asks. (Dungeon 3 has no homecoming yet.)
  Dungeon 2, the Veil Cave, under the second ring (`ring2`, `cave`,
  `offering2` in main; `den()` is whichever dungeon you're in):
  `veilPlan.ts` (the plan, drawn at its top: a honeycomb of cells, rock
  piers at its corners, veils hung between them; `at` names its places,
  `route` is the glimmer's way), `veilShell.ts` (the veils' mesh, with what
  glows behind each baked in; the rock is `shell.ts`'s, which takes either
  plan), `veilCave.ts` (scene, collision: `collide(.., ghost)` lets a
  phasing glimmer through veils and nothing else; the camera: `clampCamera`
  and the holes she opens; hide and seek: `playHer`, the glimmer a `puppet`
  mob: she runs veil to veil, looks back before each, waits in the room beyond till you're in its doorway, never comes back for you; two veils' ends, then into the shut cell `HIDE` and her head back out; `LEAD`;
  `pawTrail.ts` is her prints on the floor, `uScar` her mark in a veil,
  `uHer` her room alight behind one; taking the light ends as dungeon 1's does: the cut, and `ring2.emerge` lifts you out). Veils are `VEIL_FRAG`. Saved as
  `embla.dungeon2.<seed>` (`round`, `taken`), its ending as `offer2`
  and `home2`. Its offering is dungeon 1's `Offering` with `OfferOpts`
  (`OFFER_SHORT`, a glimmer statue). Dev: `?dungeon=2[,x,z]`,
  `?fresh=1&cp=ring2` / `cp=offer2`, `__ow.cave()`, `__ow.winDungeon(2)`,
  `__ow.firstDone()`; check a change with `scripts/veil-plan.mjs` (proves on
  foot / riding reach and that no dash crosses two veils) and
  `scripts/veil.mjs <dir> quest,dash,stall,reload,story,arrive` (look at the
  `dash-*` frames for the camera). Build to your own folder and pass
  `DIST=<folder>`: other sessions rebuild `dist/`.
  Dungeon 3, the Moon Hall, under the third ring (`ring3`, `hall`,
  `offering3` in main): `mothPlan.ts` (the plan, drawn at its top: a long
  way in with a bend, one great dark hall 130 m high, a ledge 50 m up with
  a pulpit of rock standing out from it, a long tall gallery behind to the
  light; a ring of eight moon pictures in the floor round a lamp, fixed,
  the answer: `phaseAt`; four turning stones, `dials`; `wallCaps`), `mothShell.ts`
  (moons as geometry: `moonGeometry` / `craterGeometry` take a phase of
  eight; the stones' heads; the floor's pictures, `floorMoon`), `mothCave.ts` (`MoonHall`:
  scene, collision with the walls' lean since you fly in it, turning a
  stone: `action` / `act`; the lamp lighting and the moth's flight down:
  `SHOW`, `cinematic()`; it ends as the other two do). The moth is a `puppet`
  mob until she's yours; clinging to the pulpit is `d.s.hang` in
  `moonmoth.ts`. Above ground she has `Mob.settle` (a flier that stays
  down). Saved as `embla.dungeon3.<seed>`, its ending as `offer3` and `home3`. Dev:
  `?dungeon=3[,x,z]`, `?fresh=1&cp=ring3` / `cp=offer3`, `__ow.hall()`
  (`.debug`, `.debugSolve()`, `.debugYours()`), `__ow.winDungeon(3)`,
  `__ow.secondDone()`; check a change with `scripts/moth.mjs <dir>
  inside,quest,reload,story` (plays it through by the keys; a script that
  steps frames must call `__ow.manual(true)` first, or every `advance`
  leaves another frame loop running).
  Dungeon 4, the Drop, under the fourth ring (`ring4`, `chasm`,
  `offering4` in main; **a first rough form, not played through by the
  owner, and nothing follows its offering yet**: `docs/NEXT-dungeon4.md`):
  `dropPlan.ts` (the plan, drawn at its top: a cavern with a bottomless
  pit straight across it, six pillars' tops down it and last a long ledge
  along the foot of its far face, `tops`; the burrow and den the ledge
  comes out of; `at` names its places), `dropShell.ts`, `dropCave.ts` (`DropCave`:
  the way down on the parachute, a lantern waking on the top to land on
  next, `target`; the wind that carries you back to the lip if you drop
  past it: `caught`, `updraft`, which `GlideMode` follows through
  `WorldQuery.updraft`; the dark below the lips, `uDarkY` / `uDarkAt` in
  the dungeon shader; `Dust`; the wurm in the den, who goes out along the ledge
  and straight up the cavern's far face through `climbTop`, and is held
  back from the dark at every edge while ridden; her thought of it is
  `climbHintCanvas`; the wind's sound is `Sfx.wind`). Saved as
  `embla.dungeon4.<seed>`, its ending as `offer4`. Dev: `?dungeon=4[,x,z]`,
  `?fresh=1&cp=ring4` / `cp=offer4`, `__ow.thirdDone()`, `__ow.chasm()`
  (`.debug`, `.goTo(name)`, `.debugDown(n)`, `.debugYours()`),
  `__ow.winDungeon(4)`; check a change with `scripts/drop.mjs <dir>
  inside,quest,climb,story,offer`.
  `WorldGen.dungeons`: every dungeon's ring and the way to it, a list
  (four so far; `dungeon` is the first; nothing is under the fourth). Slow to find: found in order on
  the main thread, cached per seed (`embla.dungeon.v10`; when the land moves, bump `WORLD_VERSION` in main, which wipes every save) and handed to
  the workers, which never search (`primeDungeon` in main). Adding one must
  not move the ones before it: `scripts/sites.mjs` prints a fingerprint.
  `src/world/hands.ts`: stone hands standing about the world on islands
  and summits (seeded, one at most per 1.1 km cell; inert so far).
  `src/world/prints.ts`: the prints themselves, as a texture the terrain and
  prop shaders read (`PRINT_GLSL`), plus the same maths in TS for walking.
  Nothing is left standing between the outer edges of the trail: a second texture, the clear mask (`CLEAR_TEX`, `Prints.clears`).
- `src/audio/ambience.ts`: the music. One loop for outdoor exploration
  (a test of the musical language: no biome beds, air, night layer or
  plucks until asked), faded in and out over `FADE`, hushed in cutscenes
  and the dungeon. The giant's visit has three pieces of its own, played
  once each and cross-faded (`CUES`); which one is `Visit.music`, set by
  the visit's own events; check with `scripts/music.mjs [tower] [real]`.
  The Moon Hall has four the same way (two of them loops; `CUES` is the table,
  `MoonHall.music` says which, from the hall's own events); check with
  `scripts/moth-music.mjs`.
  Volume is `Ambience.gains.music` (`scene`: the visit's pieces, times that; `hall`: the Moon Hall's). On the `Sfx` context
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
