# Plan: a rescued spirit's house, rebuilt in steps

Written 2026-10-02. **A plan for the owner to read; nothing here is built.**
Answer 4 in `docs/NEXT-dungeon2.md`: "about five steps of a cabin being
constructed, hands off, in the background, as you get through the dungeons.
This may be step zero, with not even a foundation until after dungeon 2."

## The steps

A house has a step number, 0 to 5. Step 0 is what a spirit coming home
gives it; each later step is one more stage of the same hut (same size,
same colours, same door and window places as before it was trodden on).
Every step is drawn at once from its number: nothing animates, nothing is
shown, you just find it further along next time you pass.

| Step | Name | What you see from the lane | Stack of boards | Stones | The spirit |
|---|---|---|---|---|---|
| wreck | (as now) | Boards and stones strewn round the giant's print. | none | strewn | gone |
| **0** | **Cleared** | The print filled in and level. No footing. Four short corner pegs mark out where the house stood, and a fifth pair marks the door. | all 26, stacked beside the plot | all 8 in a heap by the stack | Paces from peg to peg; arms wide at the size of the job; goes and looks at the stack. |
| **1** | **Footing** | The hut's stone footing laid inside the pegs (pegs gone), its doorstep stone in front. A low step: you and the spirit can stand on it. | all 26 | 4 left, set at the footing's corners (the rest went into it) | Stands on the footing, hops on it, nods; over to the stack and back. |
| **2** | **Frame** | On the footing: four corner posts, a top plate round them, the door's two posts and lintel, the window's frame, one ridge pole on two king posts. The chimney's stone base, knee high. You see straight through it. | about 18 | none | Stands in the doorway that isn't a door yet; looks up at the ridge; points at it. |
| **3** | **Walls** | Board walls to the eaves and both gables, in the hut's own wall colour. The doorway and window are dark holes (no door, no glass, no light). Chimney to full height. No roof: the ridge pole and three pairs of bare rafters against the sky. | about 10 | none | In and out of the doorway; outside, looks up at the rafters. |
| **4** | **Roof** | The back slope boarded; the front slope (the lane's side) half boarded from the eaves up, rafters showing above. Ridge trim on. Window has its bars and glass, unlit. Door still not hung. | about 4 | none | Mostly at the front, looking up at the gap; a hop, a cheer. |
| **5** | **Home** | The hut exactly as it was: roof whole, door hung, window lit, smoke from the chimney. | gone | none | Its ordinary life again: on its doorstep, in at the door, out along the lane. No more `work`. |

So "five steps of construction" are 1 to 5, and step 0 is the owner's
"not even a foundation yet".

## What step zero is (a change from today)

Today, after dungeon 1, the footing and the stack are both there. Under
this plan dungeon 1 gives **step 0: the cleared, pegged-out plot and the
stack, and no footing.** The footing is the first thing the next dungeon
buys. A save from after the homecoming would show step 0 on its next load
(the footing it has today would be gone).

## One step per dungeon, to start with

Finishing a dungeon advances a house by one. Nothing more is decided here:
not which houses advance, not whether a newly rescued spirit's house starts
at 0 while the first moves to 1, not whether five more dungeons is too
long to wait for one roof. Steps 1 to 5 are wired to nothing. Only
`comeHome` after dungeon 1 sets a step (0), as `mend` does now.

## How it's built

- `village.ts`: `buildStage(variant, step)` returns the merged geometry for
  that step from the same `HUTS` numbers `buildHut` uses, so all three
  variants (and their wall and roof colours) follow. Step 5 hands back the
  real hut meshes rather than a copy.
- `Village.setStep(i, n)`: replaces `mend`. Any step from any step, at
  once: swaps the stage mesh and its shadow caster, lays the stack to that
  step's board count, places the stones, shows or hides hut, door leaf and
  smoke. `House.step` replaces `footing` / `mended`; `stack` stays (absent
  at 5).
- Standing and bumping follow the step: nothing at 0 (pegs are too small);
  the footing's top from 1; walls push you out from 3; the roof is
  landable from 4 (back slope) and 5.
- `work` picks its places by step (pegs, footing, doorway, front), using
  the gestures the spirits already have. No tools, nothing carried.
- Save: one number per house. For now it is implied (home1 saved = step 0
  for that house), since nothing else can set it. The dev hook does not
  save.
- Colour: `K.stone`, `K.wood` / `K.wall`, `K.cut` (fresh-cut ends on posts
  and rafters), `K.trim`, `K.roof` / `K.moss`, `K.soot`, `K.glass`. All in
  the palette already. No textures.

## Dev hook and script

- `__ow.house(i, step)`: sets house `i` to a step (smashing it first if it
  stands); `__ow.house(i)` reads it.
- `scripts/rebuild.mjs <dir>`: finds one house of each variant on the lane,
  and for each step 0 to 5 shoots it from the lane at the spirit's eye
  level and from a little above, with its spirit at work. Then one contact
  sheet, 3 variants by 6 steps, to compare against `/inspo`.

## What I'd like the owner to say

1. **Step zero has no footing** (so the footing that's there today after
   dungeon 1 goes): yes?
2. Is a see-through **frame** step (2) wanted, or should walls go straight
   up from the footing and the fifth step be spent elsewhere (say, a
   garden fence or woodpile once it's home)?
3. Spirits work with **gestures only**, nothing in their hands: all right
   for now?
