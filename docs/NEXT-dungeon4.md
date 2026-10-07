# Dungeon 4: the Drop (built in a first rough form; not yet played by the owner)

The owner's idea (2026-10-07, in full in `docs/IDEAS-dungeon4.md`): harder
than the first three, through action that isn't combat. You start very high
up in a cavern and get down by precision jumps on the parachute, from one
pillar's top to the next; a lantern lights at your next landing; a mistake
brings you back up to the top; the wurm is at the bottom; she climbs you up
to a hallway level with where you started, where the light is, in sight
from the first cliff edge. The wind keeps blowing the whole time (owner:
"we can just have it keep up"), and has a sound, louder when it has you.

## What is built

Under the fourth ring (`ring4` in main), which opens when the giant lies
down there after the third homecoming, takes you down, lifts you out and
shuts for good once the light is taken. Then its offering (`offering4`: the
short telling, the shrine a wurm in stone). **Nothing follows the offering
yet**: the giant stays where it lies.
Dev: the progress selector's "7.1 ring (dungeon 4)" and "7.2 offering
(dungeon 4 done)" (`?fresh=1&cp=ring4`, `cp=offer4`), `?dungeon=4` (or
`?dungeon=4,x,z`), `__ow.enterChasm()`, `__ow.thirdDone()`,
`__ow.winDungeon(4)`.

- `src/dungeon/dropPlan.ts` (the plan, drawn at its top), `dropShell.ts`
  (pillars, the ledge, kerbs, lantern posts), `dropCave.ts` (`DropCave`:
  the scene, the wind, the lanterns, the dust, the wurm, the light). In
  main it is `chasm`.
- **The cavern:** round, 116 m across, moss green above the lips. A pit
  straight across it leaves a crescent of floor either side: the lip you
  come out on and the far lip, 88 m apart and level. The far way's two
  lanterns are awake from the start, and the dark light is in the doorway
  between them.
- **No floor** (owner, 2026-10-07: "a black hole floor"). Below the lips
  the rock is not seen at all unless a lantern is on it (`uDarkY`,
  `uDarkAt` in the dungeon shader), and there is nothing to land on: fall
  past the ledge's level and the wind has you, always. No glowcaps in the
  cavern.
- **Dust and grit** come up out of the dark all through the pit (`Dust`:
  900 small tumbling chips in a box that goes where you go; faster while
  the wind has you).
- **The way down:** six pillars, tops 7 m across down to 4.5, scattered
  about the cavern, each about 26 m lower than the last and 40 to 46 m from
  it (the first is 38 m out from the lip and only 12 m under it: the owner
  found it too close under the cliff). Then the ledge, 172 m under the
  lips. A big lantern on a post on each. **Only two are ever awake:** the
  one you're to land by, which wakes 0.9 s after you've earned it (the
  first as you come to the lip), and the one you stand by.
- **The parachute thought** (dungeon 1's) shows on the lip by its edge until
  you first leave it; and again for anyone who stands 12 s on a pillar
  with the next one waiting, until they step off.
- **A miss:** dropping 4 m below the lit top. The wind opens your parachute
  if it's shut and carries you, hands off, up and over the lip, and sets you
  down 5 m back from the edge. It puts every lantern out but the first.
  `WorldQuery.updraft`, which `GlideMode` follows.
- **The ledge** (owner: "the wurm should be in like a hallway that you
  need to jump to from the last platform", and it should jut out so she
  can get out and go up): a shelf of stone 8 m wide and 51 long, out of the
  mouth of a burrow in the cavern's side wall and along the foot of the far
  face, to under the lit doorway. Land on it and the way down is done for
  good (`down`, saved); its other two lanterns wake. In the burrow is the
  den, and the wurm asleep with her head to the way out. Come within 7.5
  m: she hops, a heart, and she's yours.
- **The climb is the main cavern's** (owner: no second way up). She goes
  out along the ledge by herself; a thought shows her going up a wall
  (`climbHintCanvas`) until you've been up one; turn her to the far face
  (one tap) and she goes straight up it (her own wall climb, through
  `DropCave.climbTop`), 172 m, about 35 s at a walk, over the far lip in
  front of the doorway and on to the light. A small light goes with you up
  the dark face.
- **She can't go into the dark:** riding, the ledge's edges and the lips
  hold her (she stops), but for the far lip over the ledge, where the way
  down the face comes out on it.
- **The end** is the others': the hops, the heart, the cut, the ring's arms,
  the offering.
- **The wind's sound** is `Sfx.wind(level, gust)`: a low moan with a
  wandering howl in it, faint down the way in and full in the cavern; a
  soft swoosh goes by every few seconds; and a rush over it as you fall
  and while it carries you (the owner, of the first version: the vibe is
  good, the carrying-up hurt the ears. So that part is under half what it
  was and lower in pitch, and the moan is up a little).
- Saved as `embla.dungeon4.<seed>` (`down`, `yours`, `hinted`, `taken`),
  its ending as `offer4`.
- Check a change with `scripts/drop.mjs <dir> inside,quest,climb,story,offer`
  (`quest` plays all of it by the keys, the miss included).

## Defaults I took (the owner hasn't ruled on these)

1. **Back to the very top every time,** as asked: six tops and the ledge.
2. **A miss is 4 m below the lit top.** You can't skip one.
3. **The climb is the release:** nothing on the way up can go wrong. On a
   wall she goes up or down only; a tap turns her back (as everywhere).
4. **It only gets harder by size and by turning.** No side gusts, no sinking
   or swinging tops yet.
5. **Moss green,** where the others are violet, teal and rose; the dark is
   a green black, never black.
6. **How tall:** the ledge is 172 m under the lip (it was 112 to the floor),
   26 m a drop: about 11 s under the parachute each, less if you let it go
   and open it again.
7. **The burrow and den are not dark** the way the cavern is.
8. **If you're left on a different level from her** (you got off at the top
   and fell), after 2.5 s she is simply beside you, in a puff. Rough.
9. **No first look across the cavern** (a camera move to the light as you
   reach the lip). You see it if you look.
10. **Her coat is the wild wurm's.** No music of its own.
11. **The shrine** is a first go: a wurm in stone, coiled.

## Questions after playing

- Is it hard enough, or too hard? The test player lands every top first
  time, but it is a machine. Top sizes and distances are one table in
  `dropPlan.ts` (`down`).
- Is it dark enough, and can you still find the next top? From the lip the
  first top is under the edge until you walk up to it.
- Is the whole way down again the right price for a miss near the bottom?
- Does the parachute steer finely enough for this?
- Is there enough dust, and is it the right size?
- The wind's sound again, now it's changed.
- Is the climb too long (35 s at a walk, 19 hurrying)?
- Should the wind do more (gusts that push you sideways, with a tell)?

## Still to build

- **Left and right on a wall** (owner, 2026-10-07: wants it). On a wall
  she goes up or down only today. Wanted: a tap turns her a right angle
  on the wall too. It needs her body to roll (her segments stay upright,
  so sideways she'd stand out from the wall on nothing), and the Drop
  needs to keep her off the ends of its faces. It is the overworld's wurm
  too.

- What follows the offering (a fourth homecoming, and where the giant goes).

## Also changed

- `mobs/wurm.ts`: straight up or down a sheer wall her body's segments
  were turned whichever way the maths fell (their back to the world's north
  or south), which put the rider inside the rock on two walls of four. They
  take the head's heading now. This is the overworld's wurm too.
- `dungeon/shell.ts`, `layout.ts`: a lantern can be big (`Lantern.s`).
