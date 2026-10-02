# Next: after dungeon 1 (brief for a fresh session)

Written 2026-10-02, after slice C of `docs/NEXT-dungeon1.md` was built.
**Dungeon 1 is built end to end. Slice C (the homecoming) has not been
played by the owner.** Nothing here is to be built until the owner has
played it and answered the questions at the bottom.

Read `CLAUDE.md` first, then this, then in `NOTES.md` "Dungeon 1, slice C:
the homecoming" (the last section), then `src/giant/homecoming.ts`.
Slice C is uncommitted, in the working tree. Ask before committing.

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
4. **The trail ends there.** The second ring has no field, no dark spirit
   and nothing under it. Standing in it does nothing. Nothing in the game
   tells you so.

A reload once the spirit is on its doorstep replays none of this and finds
it all done, the giant already asleep at the second ring. A reload before
that puts you by the shrine and plays the homecoming from its start.

## What dungeon 2 can assume

- `WorldGen.dungeons[1]`: the second ring's place and the way to it, a pure
  function of the seed, cached and handed to the workers like the first.
  A third is one more call to `nextSite` in the `dungeons` getter and a
  bump of the cache key (`fjellheim.dungeon.v8`); `scripts/sites.mjs`
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
   seed, which may solve it.** Not done: handed off as its own task. It
   will move every seed's world, so the site cache key and anything saved
   by position need thinking about.
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
- Less water on every seed (answer 8).
- What the stone hands out in the world do.
- Whether the third version of the offering looks right.
