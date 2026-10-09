# The cold country: the handoff as written, and the log of what became of it

**Read the log at the bottom first: its last entries are how things are.**
In short (2026-10-07, late): a first form of all of this was built in a
day, the owner played it and changed back. The cold is only the land above
200 m; no tower is cold or wants sparks; the regions and the reordered
opening are switched off or unwound. Steps 1 and 2 below are kept as they
were written, as the record; they are not a to-do list.

The handoff for whoever builds this. Read DESIGN.md "The cold country"
(what the owner agreed) and, if you want the why, `docs/ROADMAP-openworld.md`.
**Add to the log at the bottom before your session ends.**

## The idea in four lines

After the giant's visit the country is cold: pale, near one colour, fog
standing close, nothing to find. Lighting a beacon tower warms a big swath
round it, and the warming rolls out across the land while you watch.
Towers are opened with sparks, and sparks are found in warm land.

## Step 1: mock the look (do this first, and only this)

The owner has not seen it. Everything else waits on whether the cold is
beautiful. **A throwaway**: don't design the real system, don't save
anything, don't touch the story.

Three pictures, the same seed and time of day, for the owner to look at:

1. **A valley, cold.** From the ground, somewhere with trees, water and a
   far ridge.
2. **The warming part-way across it.** The same view with the edge of the
   warmth half way over: warm near, cold far, and the edge itself.
3. **From a tower's head, one region lit.** An island of colour in a pale
   country, and where it ends.

And the same three as they are now, for comparison. A few seconds of the
ring moving, as frames, if it's cheap.

### How, cheaply

- The composite pass (`COMPOSITE_FRAG` in `src/gfx/post.ts`) already has
  what's needed: it pulls every pixel toward one hue (`uTint`, `uTintAmt`),
  lifts it toward the fog colour (`uLift`), and has `uInvProj`,
  `uCamWorld` and linear depth, so a pixel's place in the world can be
  worked out there. Fog is there too (`uFogStart`, `uFogDensity`).
- So for the mock: a few uniforms for one warm circle (centre x, z and a
  radius that can be moved), and in the composite, by a pixel's world
  place, more tint toward a cold hue, more lift, nearer fog outside it.
- Drive it from a dev hook on `__ow` or a query parameter, and shoot it
  with Playwright as `scripts/shots.mjs` does (see `docs/WORKFLOW.md`).
- `scripts/towerland.mjs` and `scripts/beacon.mjs` already get a camera
  into a tower's head.

### What "beautiful" has to mean

- A frosted, misty morning, not a grey filter. The palette's own colours,
  hushed. Read `docs/BRIEF.md` before judging it.
- **It must not look like dusk or night.** The game already grades toward
  one hue by time of day, so cold needs its own character: try a pale
  blue-white with the outlines kept warm, and the stepped fog close.
- The sky: probably not cold. A warm sun over a cold land may be the
  picture. Try both.
- Accents that opt out of the grade (negative colour alpha, emissive
  ≥ 0.5) will stay coloured: the giant's glowing prints should, by design.
  Check what else does and whether it's wanted.
- The edge of the warmth should be a shape, not a blur: stepped, like the
  fog, or a hard line with a little lead of light. Try two.
- Things to look at on purpose: water, snow caps (they resist the grade),
  cabins' windows at night, the giant.

### Rules of the house

- Other sessions share this checkout and rebuild `dist/`. Build to your
  own folder and pass `DIST=<folder>`.
- `shaders.ts`, `post.ts` and `materials.ts` are being edited by others.
  Keep the mock's changes small and behind a uniform that is 0 by default,
  or keep them out of the tree entirely once the pictures are made.
- Show the owner the pictures. Don't describe them.

## Step 2, once the look is chosen: warmth for real

- **A warmth map**: a texture the shaders read, as the prints are
  (`PRINT_TEX`, `PRINT_GLSL`, `CLEAR_TEX` in `src/world/prints.ts` are the
  pattern: a world-wrapped data texture, the same maths in TS). Or, since
  warmth is circles round lit towers, a short list of circles as uniforms
  may do, with no texture at all. Decide by what the look needs.
- **Saved, not generated.** Which towers are lit is saved already
  (`Beacons.lit`, `isLit`). Warmth follows from that; `worldgen.ts` does
  not change and the world stays a pure function of the seed.
- **The warming** is one number per tower going from 0 to its radius over
  about ten seconds from the moment it is lit (`litT` is there).
- A dev hook to light a tower and watch (`Beacons` has one that sets
  `lit` for 'all' / 'none' / an id).
- A `scripts/warmth.mjs` that lights a tower and shoots the ring at five
  moments, and the perf script after (it is one more texture read per
  pixel in the composite, or per fragment if terrain and props read it).

Not in step 2: sparks, the lock, caches, the giant's visit, where towers
stand, creatures. Those are steps 3 and 4 in the roadmap.

## Defaults to take unless the owner says otherwise

- A swath is a tower's patch: the land nearer it than any other tower
  (owner, 2026-10-07; see the log). Not a fixed radius.
- The home valley is warm from the start.
- You carry a few metres of warmth with you.
- Cold is a matter of looks first. Hiding creatures and finds in the cold
  comes with step 3.

## Questions for the owner, after the pictures

1. Is the cold beautiful enough to look at for hours?
2. Which edge?
3. A warm sky over cold land, or a cold sky?
4. How far can you see in the cold?
5. How big is a swath?

## Log

- 2026-10-07: written at the end of the brainstorm. Nothing built.
- 2026-10-07: **step 1 done, the mock; the owner has not answered yet.**
  Pictures in `shots/warmth/` (the `_*.png` sheets first): seed hilda,
  9:30, the valley at -1115, -1548 and tower 1's head.
  - What it is: `postSettings.cold` in `src/gfx/post.ts` (off while `amt`
    is 0) and a block in `COMPOSITE_FRAG`: one warm circle, a cold tint
    and lift outside it, and fog by how much of the line from the eye
    lies outside the circle (nearer, denser, paler, a mist bank from
    40 m). No hook in main: scripts set `__ow.post.cold`. A throwaway:
    take it out or build step 2 over it.
  - `scripts/warmth-mock.mjs <dir> shots=valley,ring,night,tower,cabin,here
    at=x,z,yaw,pitch,dist,edgeAhead [me=6] [set={json}] [tag=] [q=]`
    (`shots=scout` finds valleys). Build with
    `npx vite build --outDir dist-warmth`, run with `DIST=dist-warmth`.
  - The look taken: tint (0.58, 0.72, 0.86) at 0.7, lift 0.42 toward a
    pale blue-white. A first try (greyer, tint 0.8, lift 0.3) read as a
    grey filter.
  - Both edges are in the mock (`edge` 0 stepped in three 34 m bands, 1 a
    hard line with a 4 m rim of light and a fainter 20 m one). The steps
    barely read from the ground; the line's rim shows mostly on trees.
  - `meR`: warmth carried with you, a hard circle (6 m in the picture).
  - **Not solved: dusk and night.** The frost colour is scaled by the
    hour's fog brightness, and that goes muddy grey at night and
    grey-white at dusk (`night-*`). Unscaled it glowed white under a dark
    sky. Cold needs its own colour per time of day, in the palette.
  - Seen: cabin windows stay lit in the cold (emissive); snow caps go
    with the frost; outlines stay warm near to; the sleeping giant stays
    dark from the tower. Not looked at closely: the giant near to, its
    prints, water from close by.
- 2026-10-07, the owner's answers after the pictures:
  1. The cold is beautiful as mocked. Build on that look.
  2. Edge: undecided, the pictures didn't show it well. Taken for now:
     the hard line with a rim of light. Shoot it better (low, across
     open ground) when it's real and ask again.
  3. A cold sky over cold land.
  4. You see less far in the cold than in the mock: fog nearer.
  5. Swath size: **fewer towers** (the owner has played and finds too
     many), and the swaths sized so that with every tower lit no cold is
     left anywhere, by construction. Not built; changing the network
     moves the world (`WORLD_VERSION`).
  6. No circle of warmth carried on the ground. Something of the kind
     only as style or expression (the character, not the land).
  7. Night in the cold, from the owner's own winters: the sky and the
     trees darker, the snowy ground still light. Not the mock's scaling.
- 2026-10-07: **fewer towers, built.** `TOWER_SPACING` 560 -> 900 m (the
  owner chose it): about 60 towers a seed where there were about 115,
  each seeing 2-3 others (it was 6), never fewer than 1. The home tower
  doesn't move. `WORLD_VERSION` 4 and `embla.dungeon.v11`: every save is
  wiped, and **every dungeon ring moved** (the first is found outward from
  a tower near the village). The journey's second tower is now about
  1.1 km from home (it was about 600 m): not ridden since.
  - **The swath is the tower's patch**, so no cold is left once all are
    lit, wherever they stand. Typical patch about 680 m in radius
    (200-1100); the farthest land from any tower is 1.3-2.1 km. The
    warming is still a ring growing from the tower, cut off at the
    borders with its neighbours. Step 2 should build that, not circles.
  - `scripts/towermap.mjs <out.png> [seeds]` draws the towers and their
    patches and prints these numbers. `shots/warmth/towers-*.png`.
  - `scripts/sites.mjs` on 16 seeds: seed 42's second ring is now a
    fallback in water (21 wet points); seed g's was already, before and
    after. So about the rate it was, but 42 is one of the shot seeds.
- 2026-10-07, after the owner played the mock (panel: H, "Cold (mock)"):
  - Fixed: glowing things flickered cold (the grade had a threshold at
    emissive 0.5, and a spirit's light pulses across it; now the more it
    glows the more colour it keeps). "Warm circle round me" is a tick box.
  - Fixed, not the cold's doing: **the giant walked its visit sunk to the
    waist.** Something asks for the sleeping giant (`theGiant` in main,
    which `settle`s one by the ring) before the visit, and the visit
    reused it still dormant. `Giant.emerge` now stands it up. It was in
    the 12:03 `dist/` too, before the towers changed.
  - Asked for, not built: in the cold your character's face and your
    spirit's show it (expression, not colour). And lighting a tower gets
    a camera of its own: the warmth shooting out of the tower as the
    spirit climbs it.
- 2026-10-07, **built while the owner was away: steps 2 to 4 in a first
  form, for revising.** Not played by the owner. Nothing committed.
  - **Warmth for real** (`src/story/warmth.ts`): the mock's circle is
    gone. Cold from `story.giantGone` (it falls over 14 s after the visit;
    a reload starts cold). Warm: the patch of every lit tower, of home,
    and of a won dungeon's ring once the giant has left it (`ringWarm` in
    main: `homecoming*.left`; the fourth, `dungeon4Won`). No new save.
    The edge is the hard line with a rim of light, and wanders (`wob`).
    Lit while you play, a tower's warmth runs out 1500 m in 11 s,
    gathering pace, then on to the edge of its patch.
  - **The look**, the owner's answers in: a cold sky over cold land (by
    what lies under the sky the way you look), fog nearer (`fogMul` 6.5,
    the mist bank from 30 m), and **night**: dark sky and trees, pale
    ground (`night` in the shader, from how dark the hour's fog is;
    `snowNight`). Dusk is a pinkish grey-white: not looked at hard.
  - **The lighting shot** (`WARM_CAM`, `WARM_AFTER` in beacons): as the
    spirit goes into the head the camera goes up and back over the tower
    and drifts round for 9.5 s while the ring runs out. Only when the
    country is cold (`Beacons.cold`). Frames: `6-light-*`.
  - **Cold faces**: `Character.chill` (brows knit, grin gone, hunched, a
    shiver that comes and goes), `Spirit.chill` (its shiver: arms hugged,
    half lids, a frown). Only the character's was looked at close to.
  - **Sparks** (`src/story/sparks.ts`), defaults to revise: a tower costs
    3 and one more per tower between it and home, to 8; a patch holds
    what its dearest neighbour costs and 2 over, scattered within 420 m
    of its tower; taken by walking into one; shown bottom left, and by a
    sealed tower as "have / cost". **The padlock is still there**: in a
    cold country it can only be smashed with the price in hand, and
    takes it. `scripts/sparks.mjs` passes on hilda, fjord, 42. There are
    more than are needed (hilda: 597, about 200 left over at the end).
  - **Not built:** a tower rising from a sealed ring (the ring's patch
    just warms); towers keeping clear of rings (not needed for that);
    sparks from the door boulder instead of a padlock; the guide giving
    you the first sparks (the home patch holds them); caches; creatures
    and finds hidden in the cold (wild creatures are as they were);
    cabins as lamps; the giant's prints seen through the cold (not
    looked at); the lasso.
  - **Known and left:** an unlit tower 900 m off in cold fog is hard to
    see from a head (how do you find the next one?). Phase 2's two towers
    are lit before the giant, so they're warm when the cold comes. Frame
    cost with the cold on is the same within noise (6.4 against 6.7 ms).
  - Still unchecked from the tower change: the longer guided ride, and
    seed 42's second ring.
- 2026-10-07, the owner, after flying about: "I don't see the cold when
  I start": by design so far (cold comes with the giant); open whether
  that's wanted. And asked for: **lit cabins keep a little circle of
  warmth, and the spirits in them glow.** Built: `Warmth.pockets` (eight
  at most, `uColdPk` in the composite), set in main each frame: your
  cabin (38 m) and each village house whose spirit is home (24 m). Wild
  cabins have none (nothing lights them yet). Dev: `__ow.pocket =
  { x, z, r }` stands one anywhere; `shots/warmth/9-pocket.png`. The
  spirits themselves were not changed: they already keep their glow in
  the cold. On hilda the village lies inside home's patch, so its
  pockets can't be seen there.
- 2026-10-07, the owner: **cold from the very start**, all but a small
  radius round the lit cabins; and she shivers, with breath you can see.
  Built: `warmth.on` is the story being on (no slow fall, nothing to do
  with the giant any more; the roadmap's "the cold comes with the
  giant" is dropped). Home's patch is no longer warm of itself: only its
  tower lit does it. Your cabin's circle only once its hearth is lit
  (`story.cabin.lit`). Sparks and the towers' price wait for the giant
  (`sparksOn`), so the guide's two towers still open with the pick.
  A stronger shiver (`Character.chill`), and breath: two small pale
  puffs from her mouth every 2.4 s, quicker when she's been moving
  (`breath` in main). They are the house's opaque blobs, so they read a
  little like small balls: to look at again. Seen at a fresh start and
  at `cp=ranch`; phase 1 and 2 were not played through in the cold.
- 2026-10-07, the owner: the shiver was far too much; and the village's
  warm areas looked strange.
  - **How she's cold now** (`Character.chill`): no shaking. Shoulders
    rounded and arms drawn in, head a little down, a faint shudder for a
    moment every seven seconds or so; and standing still, every 9 s, one
    mitten comes across and rubs (`RUB`). **It lands on her chest, not
    her other arm**: her arms are short and the pose is set by hand. To
    reach the arm it wants `solveLimb` (as the pat does) for the right
    arm. Breath lowered to her mouth and made smaller (it had been at
    eye height).
  - **Cabin circles** are true circles now, 15 m round each village
    house's chimney and 22 m round your cabin (they were 24 and 38, and
    bent by the edge's wander into one blob). `11-village-*.png`.
  - Offered, not built: stamping her feet, blowing into her mittens,
    both arms hugged, a red nose and cheeks, walking hunched with
    shorter steps, the scarf pulled up.
- 2026-10-07, the owner: the rub is out (it didn't work). In its place,
  standing still in the cold, every 11 s she cups both mittens to her
  mouth and blows for a couple of seconds (`BLOW`, `Character.blow`;
  main puffs her breath faster while they're up). Cabin circles smaller
  again: 11 m (village) and 16 m (yours).
- 2026-10-07, the owner: blowing into her mittens is scrapped too (the
  first try didn't reach her mouth; solved as a reach it did, and looked
  like crying). **Don't bring back the arm rub or the mitten blow.**
  What's left of being cold: the face, rounded shoulders and arms drawn
  in, a faint shudder now and then, and her breath.

- **2026-10-07, snow.** Owner asked for snow in the cold. Built:
  `src/story/snow.ts` (NOTES.md "Snow in the cold"). Falls wherever the land
  is cold, stops at the warmth's edge and round lit cabins. Amount is
  `postSettings.cold.snow` (the panel's "snow"). Pictures in `shots/snow/`.
  The owner has seen only those. Open: how much of it, how big the flakes,
  whether it should fall under roofs and trees.


- **2026-10-07, the hearth's warming.** Owner asked that lighting the
  cabin's hearth get a camera and a growing ring like a tower's. Built
  (NOTES.md "The hearth's warming shot"): the fire catches where you
  stand, the camera lifts out over the yard, the cabin's circle grows
  from nothing to its 16 m with a bright rim, and the camera comes back;
  8.4 s, hands off. Pictures in `shots/hearth/`; the owner has seen only
  those. Open: how long, how high, whether the roof should be on (you
  see in through the cutaway, since you're standing inside), a sound for
  the ring, and whether a village house coming warm (a spirit home)
  should do the same.
  Later that day: far heavier by default (`snow: 12`, the slider to 100)
  and a heavy slate sky by day (`gloom`). Check with `scripts/snow.mjs`.
- **2026-10-07, the opening reordered.** The country is no longer cold
  from the first: it's warm until the giant has been (`Warmth.on` follows
  `giantGone`; it comes on over 24 s). Cabins warm no ground now
  (`pockets` is dev's only) and the hearth's warming shot is gone. The
  home tower is alight from the start, goes out with the giant, and takes
  a jarful to light again. DESIGN.md "The opening, reordered"
  (unwound that evening: see the last entry here).

- **2026-10-07, evening.** Owner: keep the cold country, "but (for now at
  least) make it just certain regions". It no longer waits on the giant or
  covers the land: seeded blocks away from the start are cold until their
  tower is lit (`Warmth.isCold`), and only those towers want sparks. The
  reordered opening that put the home tower out is unwound (NOTES.md, same
  date). Everything above about the giant bringing the cold, the home
  tower's jarful and the well is not how it is now. The scripts here were
  not re-run against this.

- **2026-10-07, late.** Owner: "make the snow biome only mountain tops for
  now". The cold regions are off (`REGIONS` in warmth.ts): no tower is a
  cold tower, none wants sparks, no warmth rolls out. Cold is the land above
  `postSettings.cold.top` (200 m, the panel's "cold above"; trees stop at
  175, snow caps from about 235), about 5% of the land round the start on
  `hilda`: frost, fog, the snow sky when you stand up there, falling snow,
  her cold face, no sparks. Lighting anything changes none of it.
  `scripts/peaks.mjs`, pictures in `shots/peaks/`; the owner has seen only
  those. Defaults taken: the height of the line; that a lit tower doesn't
  warm a peak; that anything tall standing below the line (a tower's head)
  frosts where it rises above it. The other scripts here were not re-run.

- **2026-10-07, later still.** The one thing kept from "the story joins
  in": **a tower comes up out of a dungeon's ring** when its light is in
  the shrine's bowl, and carries the shrine up on its head (the owner's
  idea). Built into every dungeon's offering, with no warming: it is a lit
  tower you can fly to and from. DESIGN.md "Dungeons" step 3; NOTES.md "A
  tower out of the ring". Towers were not moved clear of the rings (not
  needed for it), so no save was wiped.
