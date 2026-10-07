# Next: after dungeon 2 (brief for a fresh session)

Written 2026-10-02, after slice C of `docs/NEXT-dungeon1.md` was built;
rewritten at its top and bottom the same day, after dungeon 2 was.
**Dungeon 2, the Veil Cave, is built end to end and has not been played by
the owner.** Neither has dungeon 1's slice C (the homecoming). Nothing
more is to be built until the owner has played both and answered the
questions at the bottom ("Dungeon 2: questions for the owner").

Read `CLAUDE.md` first, then this, then in `NOTES.md` "Dungeon 2: the Veil
Cave" (the last section), then `src/dungeon/veilPlan.ts` (the plan is drawn
at its top) and `src/dungeon/veilCave.ts`.
All of it is uncommitted, in the working tree. Ask before committing.
**Other sessions work in this checkout at the same time**: build to your
own folder and pass `DIST=` to the scripts.

## Where the game ends now

1. You take the light below, come up on the rockhopper, and the offering
   plays (slice B): the ring shuts into a shrine, a crow takes the light
   into the giant's mouth, it smiles.
2. It carries straight on, hands still off (`giant/homecoming.ts`, about
   32 s more):
   - a crow lifts out of the giant's trees with its light and flies out
     past the camera;
   - a short violet veil; the camera is at the guide's cabin (you are not:
     you stay at the ring). The guide is on its doorstep. The crow comes
     over the roof and lets the light go from 7 m up; it lands in a cloud
     of dust, and out of the dust comes the spirit. The crow flies on out
     of sight. The two run to each other and jump for joy. (Unseen, that
     spirit's house is left as it was, a wreck; it walks home to it
     afterwards.)
   - the veil; back at the ring, from far off and side on: the giant
     comes up out of the ground in a squat, pushes itself to its feet and
     walks away. After its first few steps
     you have your hands back, on the rockhopper, facing it.
3. It walks on for about two minutes, leaving prints, to **a second ring
   of bare standing stones**, and lies down beside it: a hill again, solid
   again, eyes shut. Its crows ride there in its trees with the other
   lights.
4. Lying down, it lets a dark spirit go into that ring, which opens as the
   first did. Walk on to its field on foot and you are taken down into
   **dungeon 2, the Veil Cave** ("Dungeon 2 as built", below).
5. With its light taken you come up on the glimmer, and a short offering
   plays (about 20 s). The giant smiles.
6. Then the homecoming again (owner, 2026-10-06; about 30 s, hands off):
   a crow flies the second spirit's light to the guide's cabin, and the
   giant gets up and walks to **a third ring of bare standing stones** and
   lies down. **The trail ends there:** nothing is under the third ring.

A reload once the spirit is on its doorstep replays none of this and finds
it all done, the giant already asleep at the second ring. A reload before
that puts you by the shrine and plays the homecoming from its start.

## What dungeon 2 can assume

- `WorldGen.dungeons[1]`: the second ring's place and the way to it, a pure
  function of the seed, cached and handed to the workers like the first.
  A third is one more call to `nextSite` in the `dungeons` getter and a
  bump of the cache key (now `embla.dungeon.v9`: the third is found); `scripts/sites.mjs`
  checks that the earlier ones don't move.
- The giant asleep 58 m or more from that ring, facing it, its crows in
  its trees with seven lights (of eight on `hilda`).
- `Giant.rise()` and `walkRoute`, and `onwardRoute(gen, n, from, before)`
  for the footfalls of leg `n`.
- You have the rockhopper above ground.
- The second ring needs a `Ring` (the first is built for `gen.dungeon` in
  `makeVisit`), the dark spirit let go there when the giant arrives
  (`Homecoming.update`, where it goes dormant), and its own inside.
  `Offering`, `Homecoming` and the dungeon's save keys are all written for
  dungeon 1 by name (`offer1`, `home1`, `dungeon1`).
- The owner on the offering: 32 s hands off "could get repetitive".
  Dungeon 2's ending should not be this one again at full length; with the
  homecoming it is now about 75 s.

## Defaults taken in slice C (each is the builder's choice, not the owner's)

- **Which spirit comes home:** the first one taken (`WHO` in
  `homecoming.ts`), the one the visit's camera went down with.
- **What "one step of mending" is:** the returned spirit's own house only.
  The giant's print under it is filled in (unseen: it is level when the
  camera arrives), its footing is laid again, its boards are stacked beside
  it and its stones set round the footing, unseen. Afterwards the
  spirit potters between stack and footing. The other seven wrecks are as
  they were.
- **You don't go to the village; the camera does.** When it's over you are
  where you were, by the shrine, 1.5 km from the spirit you rescued.
- **The guide is put on its own doorstep** under the veil for the scene.
  Afterwards it goes back to what it was doing.
- **The giant's print under the mended house is erased.** Prints were
  permanent until now.
- **Where the way on runs back along the way in, the giant treads in its
  own prints** rather than laying a second set.
- **One saved state.** A reload while the giant is walking finds it
  already arrived.
- **The veil is the dungeon's violet.**
- **Outside the story** there is no village and no crow: the giant just
  gets up.
- **The crow that brought the spirit** flies out of sight, and is back in
  the giant's trees with nothing to carry when you next see the giant.

## The owner's answers (2026-10-02, after a first look)

1. Do the three shots read? **"Passable for now."**
2. 75 s hands off: **shorten the village part.** Done: it is about 9 s now
   and the whole about 70 s.
3. Taken to the village, or only shown it? **Keep as is** (only shown).
4. What a step of mending is: **no strong preference. What's wanted is
   about five steps of a cabin being constructed, hands off, in the
   background, as you get through the dungeons. This may be step zero, with
   not even a foundation until after dungeon 2.** Not designed or built: a
   separate piece of work. As it stands the footing and the stack of boards
   are there (unseen) after dungeon 1.
5. Moods once a spirit is home: **they should stop being downcast.** Done.
6. Does the rescued spirit give you anything? **No, not yet. The mount from
   the dungeon is the only reward.**
7. A silent dead end at the second ring until dungeon 2 exists: **yes,
   fine.**
8. The giant wading across lakes on seeds like `42`: **no. Make it work.
   And, a bigger project: change world gen so there is less water on every
   seed, which may solve it.** Done (water is about 20% now). What matters
   is that you can follow it: from the village to ring 1 and on to ring 2
   no footfall is in water (20 seeds; `scripts/sites.mjs` fails if one
   is). Its way *in* to the village may be through a lake, and the owner
   likes that: it looks well coming up out of the water.
9. The crow that brought the spirit: **it goes away quietly off camera.**
   Done: it flies on out of sight and is only put back in its tree under
   the veil.

Also asked for and done: the crow drops the light from a few metres up at
the guide's cabin, it lands in dust, the two run to each other; the mending
isn't shown; the giant stands up rather than rising straight.

## Still open

- The five steps of a cabin being built (answer 4): **built as geometry,
  wired to nothing** (`Village.setStep`, NOTES "A house built again in five
  steps"). Dungeon 1 now leaves the rescued spirit's house at step 0: a
  wreck, its print not filled, no footing, no stack. Open: which houses
  step on when a dungeon is done, and saving a step per house.
- What dungeon 2 is: **settled and built** (the Veil Cave, the glimmer):
  below.

The offering is **good enough for now** (owner, 2026-10-02). The stone
hands out in the world are their own piece of work, not part of the
dungeons.

## Dungeon 2 as built (2026-10-02; not played by the owner)

The design is in `DESIGN.md` ("Dungeon 2's interior: the Veil Cave"); how
it was built, measured and what is rough is in `NOTES.md` ("Dungeon 2: the
Veil Cave"). In short:

- Under the second ring: a teal cave cut into a honeycomb by veils of pale
  stone. On foot you walk the ring of ten cells; the three middle cells,
  the light's room and the way out are behind veils.
- The glimmer plays hide and seek with you three times, then offers her
  back. Riding her, Space takes you through veils: into the pocket, down
  the middle, to the light. Taking the light ends it as dungeon 1 ends (owner, 2026-10-06, and so for every dungeon unless decided otherwise): the success beat, the cut, the ring's arms lift you out.
- Above: the ring shuts into a shrine (a glimmer in stone), a crow takes
  the light to the giant, it smiles; a second spirit is home, unseen.
- To play it: `?fresh=1&cp=ring2` stands you by the open ring in the story;
  `?dungeon=2` drops you in its well; `cp=offer2` is the ending. To check
  it: `scripts/veil-plan.mjs` and `scripts/veil.mjs <dir>
  quest,dash,stall,reload,story,arrive` (`docs/WORKFLOW.md`).
- **The dungeon's light is violet, not amber:** another session changed
  both dungeons' light to a "dark light" while this was being built
  (`NOTES.md`, "the dungeon's light is a dark light"). The code still says
  `amber` and `warm`.

## Dungeon 2: defaults taken (the brief's, and the builder's)

From the brief: you go in on foot and the rockhopper stays above; the
second ring opens the way the first does; the ending is short (about 20 s),
a second spirit goes home unseen, and the giant does not walk on; the cave
is a function of the seed; dev entry points like dungeon 1's.

Changed 2026-10-06, after the owner played it ("the chase thing is
confusing... the glimmer eventually just finds me"): hide and seek is now
follow-me (NOTES "Dungeon 2: she leads you like a puppy"). She waits for
you, goes through veils only in front of you, leaves prints and a mark in
the veil, her room is alight when she's behind one, and she comes back for
you in 5 to 11 s. Touching her on the way no longer counts; only at her
hide. Questions 3 and 5 below are to be asked again of this version.

The builder's own:
- **The loop is 470 m (76 s at a run), not four minutes.** The ride is as
  asked (about 20 s at her canter). See question 1.
- Touching her anywhere counts as finding her, including when she has come
  to fetch you.
- If you never go near the pocket, round 3 ends itself: after about half a
  minute she comes to you and offers her back.
- Once she's yours she follows you if you walk off.
- The second spirit home is the second one taken.
- After the ending, on a reload, the glimmer waits by the second ring (the
  rockhopper by the first). Neither lives at the stable.
- The seed mirrors the cave and moves its scatter; the comb is the same
  everywhere.
- Lanterns wake as you pass, as in dungeon 1.
- She gets her saddle when she offers her back.

## Dungeon 2: questions for the owner (after playing it)

1. **How long should the walk be?** It is about a minute and a quarter
   round at a run; the brief said four. Four needs a cave about three
   times as wide (or a second ring of cells). Bigger, or is this enough
   once the three rounds are in it?
2. **Does a child find Space?** The key hints are hidden in the story. A
   veil ripples when you ride near it, but nothing says what to press.
   Should she take a veil by herself when you ride at it?
3. **Do the veils read at a glance?** "If light shows through it, you can
   go through it": does a child get that from the first cell, and from her
   glow behind the short veil?
4. **The light is violet now** (the other session's change). In this cave
   that makes its veil the one thing that isn't teal, as amber was. Does
   violet work here, where dungeon 1's whole cave is violet?
5. **Hide and seek:** too easy, too long, right? Is 24 s the right wait
   before she comes for you? Should being fetched count as finding her?
6. **Her head through the stone** is drawn as a round hole with her face in
   it. Good enough, or should it be worked on?
7. **The dash's camera:** it follows her through a hole that opens in the
   veil. Does it feel right in the hand? (Measured steady; not felt.)
8. *(Answered 2026-10-06: the homecoming is shown, and the giant walks
   on to a third ring. Built.)* **The ending at 20 s:** right length? And should the second spirit's
   homecoming be seen at all?
9. **Getting to the second ring on the rockhopper:** the ring only takes
   you on foot, and nothing says so. Should riding on to the field put you
   down off your mount?
10. **Where do dungeon mounts live afterwards?** Both wait by their rings.
11. **What does the giant do next?** It lies smiling by the second ring.
    There is no third ring, and the house-building steps are still wired
    to nothing.
