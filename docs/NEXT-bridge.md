# Next: the bridge, as a quest (agreed with the owner 2026-10-14/15; being built)

Brief for a fresh session, on the branch `islands` (worktree
`.claude/worktrees/islands`). Read `docs/NEXT-islands.md` first: it says what
the branch already has (islands, the strait, the deep, the sea spirit, the
bridge as geometry, `Bridges.built` a bay at a time, a lumber mill, and a
100-wood sketch at the shore). **The sketch at the shore goes**: the owner
found it confusing. This replaces it.

## The sequence, beat by beat

1. **The giant crosses.** After the first island's last dungeon (dungeon 2)
   it wades the strait to its waist and comes up out of the water on the
   far side, like Godzilla. Shown: a camera on it from the home shore.
   (Today its walk to ring 3 is filmed as any other: `homecoming2`.)
2. **Your spirit at the shore, like a quest giver.** The guide is simply
   there at the water's edge (it can just appear), looking out at the gap.
   It shows a thought: a bridge (a pictogram, as its other wants).
3. **Home on bikes.** No hopping in the pack. You and it get on your bikes,
   and a short shot shows the two of you biking into the village; a veil
   cut covers the distance (about 3 km). Bikes: `vehicles/bikes.ts`, the
   journey's two-bike rides (`story/journey.ts`).
4. **The lumber mill.** In the yard the guide shows the mill as a sketch,
   built with logs and stones like the cabin and stable (`story/build.ts`).
   The mill exists (`story/mill.ts`); it becomes a buildable. Once it
   stands, the villagers work for real: they fell, carry logs in on their
   heads, saw at the mill. Their chores are looks only today
   (`story/chores.ts`, `Village.work`); here they make wood.
5. **The wagon and its stack.** The guide has you build a wagon (another
   sketch). Then the stack of boards on it grows as the villagers bring
   wood, and as you bring any. **Not a grind:** a few minutes of play to
   fill if you just wait (default: about four), quicker if you help. Free
   to wander off meanwhile.
6. **The haul.** When it's full you yoke the **stelk** (the first mount,
   `mobs/stelk.ts`) to it and **drive it yourself** down the giant's trail
   to the strait, the villagers marching alongside. A veil cut skips the
   long middle: about two minutes of driving in all.
   **Guardrails (agreed in outline):** the wagon only goes along the trail.
   You set its pace (and can stop), and steer only within the road's
   width; it won't turn round or go back more than a few metres (the stelk
   balks). So it can't be driven off or the wrong way, and nothing can get
   stuck. A `MovementMode` (`player/movement.ts`): driving, on a rail.
7. **The building.** At the strait it's a scene: the villagers swarm out
   and the bridge grows bay by bay over the water (`Bridges.built` from 0
   to 1). Then you cross.
8. **After.** Everyone celebrates for a minute (`Village.attend`, the
   homecoming's crowd). After a beat they all start walking home, and
   vanish once you're out of the area. Your spirit points you across; once
   you're away, it's simply home again. The stelk goes home with them; the
   wagon is left by the bridgehead.

## Defaults to take unless the owner says otherwise
- The wagon fills in about four minutes of play with nobody helping.
- The mill and wagon cost about what the stable does.
- The haul's veil cut comes once the wagon is out of the village.
- Two villagers come along beside the wagon; the rest stay working.
- One stelk pulls it; it's a stelk the village has (not one you caught).

## What exists to reuse
Sketch-and-slots (`build.ts`, `cabin.ts`, `stable.ts`), the guide's wants
and thoughts (`spirit.ts`), veil cuts (`homecoming.ts`), the village's
work and crowds (`village.ts`, `chores.ts`), the bridge (`world/bridge.ts`),
the mill's geometry (`story/mill.ts`), bikes and the two-bike ride
(`bikes.ts`, `journey.ts`), the giant's onward walk (`visit.ts`
`onwardRoute`, `homecoming.ts`).

## Do it in slices, each played by the keys before the next
A. Beats 1 to 3 (the crossing shot, the guide at the shore, home on bikes).
B. Beat 4 (the mill as a buildable; villagers making wood for real).
C. Beat 5 (the wagon and its stack).
D. Beat 6 (yoking and driving on a rail).
E. Beats 7 and 8 (the building scene, the celebration, the walk home).
Remove `story/bridgeWork.ts` and its sketch when D or E lands; until then
leave it. Save every beat so a reload resumes it.

## Rules that still apply
No text, no combat. Visual quality first. Build to your own folder
(`npx vite build --outDir dist-<name>`, `DIST=<folder>` for scripts): other
sessions share the main checkout and rebuild `dist/`. Commit on `islands`,
never master, until the owner says.

## Also note
Master has moved on since the branch was made (the giant now wakes in the
bay on the old land, walks through the village). That collides with the
islands' land and needs sorting before the branch can merge: a job of its
own, not part of this.

## What's built (2026-10-15; none of it played by the owner)

**Slice A** (`story/bridgeQuest.ts`, `story/rail.ts`; check with
`node scripts/bridge.mjs <dir> cross,shore,reload,skip`, `DIST=` your build):
- After the second homecoming hands you back, a veil, and four shots from
  the home shore: the giant walking down into the water (side on, 175 m
  off), waist-deep out in the deep (low over the water, behind it), coming
  up the far beach (a long lens from the guide's shore), and the guide at
  the water's edge watching it go with its bridge thought up. About 40 s;
  hold Space to skip. Then back to you by the shrine.
- The guide stays at the water's edge where the prints go in, its thought
  a bridge (a new pictogram). The pointer points to it from far off.
- Come within 5 m: it waves, thinks of bikes, two bikes appear in a puff
  (yours, unless you're on it, and its little one), and hands off you ride
  off up the trail together; a veil; you ride in along the trail into the
  village and stop in the yard on your bike. About 20 s; skippable.
- Saved: the crossing as "at the shore" (a reload puts you on the trail
  16 m short of the guide), the ride as "home".

Defaults taken in slice A:
- The giant walks the strait's real bed (45 m), so it's in to the waist;
  footfalls in water throw spray. Elsewhere it still walks a floor 6 m
  under any water (lakes).
- The guide appears under the veil before the shots and is in the last one.
- You aren't moved to the shore after the crossing: you walk down the
  prints from the shrine (about 400 m), the pointer helping.
- Whatever creature you're on when you reach the guide is left at the
  shore (it's tame; it stays there).
- Checkpoints: `cp=shore` (the strait, the guide waiting) and `cp=mill`
  (home after the ride). `cp=offer2` plays the crossing after the offering.

Questions for the owner (slice A):
1. Is the crossing too long at about 40 s, and is "from the home shore" the
   right side (we see its back as it comes up the far beach)?
2. Should you be carried to the shore after the crossing, rather than walk
   down from the shrine?

**Slices B to E** (check with `node scripts/bridge.mjs <dir> mill,wagon,haul,build`):
- **The mill** (`story/mill.ts`, phase 4 of the director, `story/phase4.ts`):
  home from the strait, the guide walks you to the free plot nearest the
  cabin and shows the mill as a sketch: 6 stones for its footing, then 12
  logs for its frame and roof. Once it stands, the villagers home work it
  for real (`story/village.ts`, `MillWorks`): one takes a hatchet to a real
  tree about the village (it falls, leaves a stump, regrows), carries the
  log in on its head to the pile; another saws it into boards at the
  sawhorse and carries them to the stack. The stack is yours to take.
- **The wagon** (`story/wagon.ts`): the guide shows it in front of the mill
  (12 logs: wheels, then bed, bench and shafts). Then the villagers carry
  the mill's boards out to it, and any wood you walk up with goes in; the
  guide's thought is the wood still wanted. 21 boards.
- **The haul** (`WagonMode` in `player/movement.ts`): loaded, the guide
  points at the village's stelk; walk up to the bench and it's yoked and
  you're on. W on at a walk (Shift a trot), S reins in and backs at most
  4 m (the stelk balks), A/D across the trail no further than its edges.
  The guide sits beside you; two villagers walk alongside. A veil skips
  the long middle about 50 s out; about 110 s of driving in all.
- **The building**: at the water's edge a hands-off scene (about 25 s,
  skippable): the crew carrying boards from the wagon to the first bays,
  the bridge growing across the strait seen from out on the water, the last
  of it reaching the far shore along the deck. Then hands back: everyone
  cheers round you for about 20 s, walks off home up the trail and is home
  once out of sight; the stelk goes with them; the wagon stays at the
  bridgehead; the guide points you across and is home by its fire once
  you're away. You walk over.
- Saved per beat: the mill and wagon as parts of the director's save, the
  pile and stack (`embla.mill.<seed>`), the load (`embla.wagon.<seed>`),
  the quest stage (`embla.quest.<seed>`) and where the haul is
  (`embla.quest.<seed>.haul`: a reload puts you back on the bench there).
  The building scene is saved as done (a reload finds the bridge standing).
- Checkpoints: `cp=shore`, `mill`, `yoke` (loaded), `haul` (on the bench).
  `cp=offer2` plays all of it from the second offering. `cp=ring3` and later
  now find the bridge standing. `story/bridgeWork.ts` is gone.

Defaults taken in B to E (the brief's, and where it was silent):
- The mill and the wagon together cost about what the stable did (6 stones,
  24 logs); a log a tree from the villagers, three boards a log.
- The villagers work the mill whenever it stands (they drop house chores and
  the digging for it); by night they go in, except while the wagon's being
  loaded (then they work on).
- The stelk is the village's own, kept by the mill; nobody can ride it.
- You can't get down off the bench during the haul (E does nothing): it's
  two minutes, and it keeps the haul from being left half way.
- The bridge goes up in the scene; the wagon's load goes into it.
- The party is about 20 s, not a minute (with hands back you can walk away
  from it at any time and they'll go home).

Rough, and not looked at:
- With two villagers home (after dungeon 2 that's all there are) the mill
  and the bridge crew are thin. The crew in the building scene is drawn
  carrying boards and knocking, but far out on the bridge they're simply
  kept at its growing end.
- How long the wagon takes to fill depends on how far the nearest standing
  trees are: if you've cleared round the mill yourself, longer.
- No sound of its own for the mill, the wagon or the building (borrowed:
  chop, fall, a soft step for the saw, thunk, fanfare). No music.
- The wagon pitches hard in the giant's prints. The stelk's walk is its own
  gait at the wagon's pace; it isn't tied to the shafts beyond being put at
  their end.
- Not played by the owner; not looked at at night; frame rate not measured.

Questions for the owner (B to E):
1. Is two villagers enough to read as "the village" working, or should more
   come home for it (or should spirits not yet saved be... not)?
2. The fill: about four minutes with nobody helping. Too long, too short?
3. Should you be able to get down off the wagon mid-haul?
4. The party is short (20 s); a minute felt long in a scene you can't leave.
