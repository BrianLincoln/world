# Next: after dungeon 3 (brief for a fresh session)

Written 2026-10-07. **Dungeon 3, the Moon Hall, is built end to end.** The
owner played its first rough form (a small hall, four stones, the answer
shown in the floor) and asked for what it is now; this version they have not
played. All of it is uncommitted. Ask before committing. Other sessions work
in this checkout: build to your own folder (`npx vite build --outDir <dir>`)
and pass `DIST=<dir>` to the scripts.

Read `CLAUDE.md`, then DESIGN.md "Dungeon 3's interior: the Moon Hall", then
`src/dungeon/mothPlan.ts` (the plan is drawn at its top) and `mothCave.ts`.

## To play it
`?dungeon=3` drops you in its well; `?fresh=1&cp=ring3` stands you by the
open ring in the story; `cp=offer3` is the ending.
Check: `DIST=<dir> node scripts/moth.mjs <out> inside,quest,reload,story`.
`quest`, `reload` and `story` all pass on `hilda` (2026-10-07).

## What the owner asked for, and got
- Light attracts her; a light puzzle with a hint in the room lights a lamp
  in the middle; she is seen up high first (a cut to her); she flies down to
  the lit lamp with a heart; the lamp points to the way on with a beam; the
  light is up high, down a hallway.
- After playing: a longer way in, a much bigger cavern, her perch higher and
  on a ledge that sticks out, moons that read as moons.
- Then: the ring of stones as the eight phases in order, the four cardinal
  ones turning and the four diagonals set; and above ground the moth down
  and out of the way, as at dungeons 1 and 2.

- Then (third telling, 2026-10-07): the eight phases as pictures in a ring
  in the floor; only four pillars; the set phases are pictures only. And
  the hall and the gallery as tall as feasible (130 m; the gallery 46 m
  high, 20 wide, 200 long with a bend; the ledge 50 m up).

## On height and cost
Height is nearly free: the walls are ten rows of triangles however tall, and
the pulpit is one lathe. What costs is floor area (the shell is a 1 m grid:
the hall is about 40k triangles of floor and roof) and overdraw, which
doesn't change with height. Not measured on integrated graphics.

## Defaults taken (the builder's, not the owner's)
- **Dusk rose** for the hall's colour.
- **The floor's eight pictures are fixed and are the answer** (owner, after
  seeing them change with the stones: no). The stones match them.
- **Glowcaps on the walls**, 46 clumps tried in the hall and a few down the
  gallery, more of them low: the owner asked for "a few sparse things".
- **A stone that's right can be turned wrong again** until all are right.
- **Which stone is "new" is seeded**; the month always runs the arrow's way.
- **She flies freely** below as above. She is the first flier the story
  gives you: above ground she crosses anything.
- **She has `settle`** above ground: left alone she lies where she is, and
  doesn't drift in loops as wild-tamed fliers do. It is never cleared.
- **After the offering, what follows the other two** (owner, 2026-10-07):
  the third spirit is flown home and the giant walks to a fourth ring and
  lies down. That ring is bare stones: nothing opens. Check with
  `scripts/moth.mjs <dir> home3 [sandbox]`.
- You go in on foot; the other two mounts stay above.

## Known rough
- No `moth-plan.mjs` (dungeons 1 and 2 have a plan checker).
- Perf not measured on the bigger hall (about 100 ms to build; frame cost
  unmeasured).
- On the pulpit's top and in the gallery the camera hasn't been felt in the
  hand, nor flying close under the hall's leaning walls.
- The dev `goTo('pulpit')` puts you inside the pulpit at floor level.

## Questions for the owner (after playing it)
1. Does a child get the month from the ring, or does it want more?
2. Is the hall the right size now? The walk between turning stones is about
   35 m each.
3. Her flight down takes 8 s with the camera off you. Right length?
4. Free flight above ground from here on: wanted?
5. (Answered 2026-10-07: a third homecoming and a fourth ring, built.)
