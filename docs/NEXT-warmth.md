# Next: the cold country (nothing built yet)

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

- A swath is about 600 m in radius (towers are at least 560 m apart, so
  neighbours' swaths meet).
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
