# Next: dungeon 1, after the offering (brief for a fresh session)

First written 2026-10-01 after the owner played the first slice; brought up
to date after slice A, and again after slice B (the offering) was built.
**All three slices are built (slice C on 2026-10-02: `NOTES.md`, "Dungeon
1, slice C: the homecoming"). Slice C has not been played by the owner.
What comes next, and the questions slice C raised, are in
`docs/NEXT-dungeon2.md`. This file is kept for the owner's notes and the
reasoning.**
Read `CLAUDE.md` first, then this, then in `NOTES.md` everything from
"Dungeon 1, slice A" to the end, then `src/dungeon/`, `src/giant/`
(`offering.ts`, `ring.ts`, `giant.ts`, `visit.ts`, `birds.ts`). Work on
master, don't commit unless asked, verify with screenshots
(`docs/WORKFLOW.md`).

**Slice C is uncommitted**, in the working tree. Ask the owner before
committing.

## The owner's notes, verbatim

> ok I played through a few times. The whole thing feels quite small.
>
> Can we make it much bigger? Like make me walk around a big dark dungeon
> and discover things.
>
> The lighting is a bit off. Can we make it darker in general? Can we add
> some kind of like spirit lanterns about on the walls?
>
> Make the mount be discovered farther into the newly bigger and darker
> dungeon.
>
> Make an impassible ledge well before the ending so users can possibly go
> the wrong route and realize they needed to have gone the other way.
>
> Make a mini platformer area where I need to jump from one spot to the
> next and if I miss I fall down and have to try again.
>
> the camera gets real shakey and weird when I'm on the mount.
>
> Once I get to the glowing orb thing. maybe do a little success sequence
> (idk what exactly) and teleport me back outside. There will be my cabin
> spirit waiting outside and he will direct me to give the offering to the
> giant (we need to make this. maybe the dungeon entrance has become a
> little shrine or something). I bring the orb there. a crow calmly flies
> down and lands nearby, walks up and takes it. walks it to in front of the
> giant. They giants eyes open, he grins a little, takes the orb (somehow
> idk) then the camera goes to a crow flying a spirit back to the village
> (really more teleporting a good part of the way there probably).
> meanwhile the giant has gotten up and is making its way to the next
> dungeon spot.
>
> Poke holes in that if needed. be pragmatic

Added after: how the giant takes it.

> the giant sticks out his hand, palm up. the crow flies up to it and drops
> the orb into it. He closes his fist and that part of his body glows
> orange a bit (warming him)

## What exists now (so you don't re-derive it)

Below ground (`src/dungeon/`; the plan is drawn at the top of `layout.ts`):
- A big dark cave, about 370 x 290 m, authored as a loop: well, fork, the
  wrong way (a 3.4 m ledge with the warm light in sight beyond it), the
  long way (cavern, the giant's stone hand, a pit crossed on climbing
  stones and one long parachute fall, a gallery, a rockfall), the
  rockhopper's den, and a one-way balcony back into the fork.
- Spirit lanterns that wake as you come near and stay lit (saved). The
  nearest 16 pools of light are drawn. On the high stone the explorer
  thinks of how the parachute is opened, every time (see NOTES.md,
  "The parachute's hint").
- Taking the light: a 5.4 s success beat (hops, a heart bubble, lanterns
  up), the violet veil, and `onWon` -> `leaveDungeon(true)` in `main.ts`.
- `layout.at` names every place; `scripts/dungeon.mjs <dir> quest` plays
  the whole thing by the keys and must keep passing;
  `scripts/dungeon-plan.mjs` checks the plan.

Above ground, after the light is taken (`src/giant/offering.ts`; NOTES.md,
"Dungeon 1, slice B: the offering"):
- The ring's arms lift you out short of the middle; the rockhopper is
  brought up and you are on it the moment the arms let go; the light is at
  your shoulder.
- It is a cutscene from there, hands off, about 28 s. The ring shuts
  (`Ring.seal`): the field closes into paving, the dark spirit goes down
  with it, and a shrine rises in the middle: the rockhopper in stone with
  a bowl on its back. The light goes from your shoulder to the bowl. A
  crow comes down off the giant's head, takes it, and hops back out. The
  giant's eyes open, then its mouth, wide; the crow flies in with the
  light and is gone; the mouth shuts and it smiles. No guide: it stays at
  home. (A hand held out and a fist closing were built twice and thrown
  away: its hands are boulders.)
- **Where the offering ends** (the homecoming, slice C, now carries
  straight on from here): on the rockhopper. The
  giant is still lying where it settled, arms down at its sides, awake
  (`awake`), eyes half open, a small smile, looking at the shrine. The
  crow that went in is gone. The other crows still roost in its trees
  with the spirits' lights. Saved as `embla.offer1.<seed>` = `given`.
- The giant can wake, look, open its mouth and smile, but it **cannot
  rise**: there is `settle()` and the 9 s sink, and nothing that undoes
  them. (Its limbs now sink with it properly, which rising needs: see the
  bug in NOTES.) There is **one** dungeon site (`WorldGen.dungeon`, slow
  to find, cached per seed, handed to workers).

## Do it in three slices, in this order

Each is shippable alone. Stop after each and show the owner.

### Slice A: a bigger, darker dungeon: BUILT

Built and played by the owner ("feeling mostly really good", "ok looking
good"). What it is, what was checked and what is rough: `NOTES.md`,
"Dungeon 1, slice A" and the sections after it. Things the owner changed
by playing it, so you don't undo them: the floor is pale blue slate against
violet walls; every drop edge has a pale kerb; stone tops are pale with a
dark border and a ring; the parachute section is a climb and one long fall
on to the far lip (three versions: read why in NOTES before touching it);
the ridden rockhopper carries its rider level.

### Slice B: the ending, up to the giant taking the orb: BUILT

All five steps are built, played once by the owner, and changed by what
they said (`NOTES.md`, "The offering, after the owner's first play"):
it is a cutscene, there is no guide and no step for the player, the shrine
is the mount in stone, and the giant takes the light in its mouth, not its
hand. The third version (the mouth) has not been played by the owner. The rest of this
section is the brief as it stood, kept for the reasoning. The owner's
answers changed three of the defaults below; where they do, the answer
won:
- **You are on the rockhopper for the whole offering sequence**, and on it
  when you get control back. So the "ten-second walk" is a ride, and the
  crow comes to a mounted explorer.
- **The dungeon's entrance itself becomes the shrine** ("it turns to a
  shrine / stone thing"). Not a separate stone between ring and giant.
  What the dark spirit and the field do when that happens isn't said: the
  simplest reading is that the field closes over into stone and the
  shrine stands in the middle of the ring. Flag what you choose.
- **The guide is simply at the ring when you come out.** No explanation.

1. **Success and back outside.** Taking the orb: a short beat (the orb
   flares, the lanterns you've lit all brighten, the mount is glad), the
   violet veil, and you're put out on the surface by the ring
   (`Ring.emerge` already lifts you out; reuse it rather than inventing a
   teleport). The orb is then carried in the open world, which it isn't
   now (it lives in the dungeon's scene).
2. **The guide is waiting** and points you to the shrine.
3. **The shrine.** Use the game's own voice: a ghosted sketch with one
   slot, the orb, exactly like the cabin's building (`story/build.ts`).
   That is also where "collect and build" finally shows up.
4. **The crow.** One flies down from the giant's trees, lands, walks up,
   takes the orb, walks toward the giant, flies up.
5. **The giant.** Eyes open, a small grin, it holds out a hand palm up,
   the crow drops the orb in, the fist closes, and that hand and forearm
   glow orange for a while.

Holes and decisions for slice B:

- **How is the guide there?** *(Owner: yes, it is simply there.)* It's 1.5 to 1.9 km away grieving in the
  village, and the rucksack idea (DESIGN.md conflict 4) isn't built.
  Pragmatic default: it is simply standing by the ring when you come out,
  no explanation, and say so in NOTES.md. Don't build the rucksack for
  this.
- **Shrine placement.** *(Overruled by the owner: the entrance itself
  becomes the shrine, and the dungeon is shut. The rest of this bullet is
  the old default.)* "The entrance becomes a shrine" would close the
  only way back in. Default: the ring stays a ring, and the shrine is a
  low stone between the ring and the sleeping giant (they are 48 m
  apart). Ask the owner whether the dungeon should shut once it's done.
- **You arrive holding the orb a few metres from the shrine**, so
  "bring it there" is a ten-second walk. That's fine as a ceremony, but
  it isn't a task. Don't pad it.
- **The giant can't wake.** `Giant` only has `settle()`. Needed: rise out
  of the ground (the reverse of the 9 s sink), collision off while it
  moves, eyes open (`lids` exists), a reach pose with the palm up (it has
  arm IK), a closing fist, and an emissive patch on those boulders
  (`GIANT_FRAG`; emissive over 0.5 escapes the grade). Its hands are
  boulders with no fingers, so "fist" is the boulders drawing together.
  A grin needs a mouth; check what the face has before promising one.
- **Scale.** The crow is crow-sized and the giant is 60 to 90 m. The
  hand-over only reads from a long shot or with the orb glowing hard.
  Plan the camera (`visit.ts` has the cinematic machinery) and look at
  frames before polishing anything else.
- *(Settled and built: it comes up with you and you ride it through the
  sequence. The old note follows.)* **The rockhopper stays underground** (it can't come up). So "unlock a
  mount" gives you nothing above ground, and with the lasso moved to the
  end game the overworld has only the bike. The owner hasn't decided
  whether the creature comes up with you. Ask; it changes what the next
  dungeon can assume.
- What happens to the dark spirit over the ring once the dungeon is done:
  not decided. Leave it watching.

### Slice C: the spirit goes home and the giant moves on: BUILT

Built as below, with the defaults taken; what each default was is listed in
`docs/NEXT-dungeon2.md`. The rest of this section is the brief as it stood.

1. Cut to a crow carrying a spirit's light to the village, the spirit
   back on its doorstep.
2. The giant gets up and walks to the next dungeon's site, leaving prints.

Holes and decisions for slice C:

- **It starts where the offering stops** (`Offering.play`, at `T.end`):
  the camera is still the offering's, high over the ring. Simplest is to
  carry straight on from there rather than hand control back and take it
  again.
- **Which crow, which light.** The crow that took the orb flew into the
  giant's mouth and is gone. The spirits' lights are under the visit's
  crows in its trees (`Visit.birds`, restored by `Visit.restore`). One of
  those has to leave with its light, and that spirit has to stop being
  "taken" in the village's save.
- **Rising.** `Giant` needs the reverse of the sink (its limbs now sink
  and rise with it properly), and to stop being solid while it moves.
- **The guide** is at home (the owner took it out of the offering). The
  spirit's homecoming is where it comes back into this.
- **The village mends itself as you go** (owner): the returned spirit and
  the guide are seen working on the wreckage, and it steps on at each
  checkpoint; to start with, a checkpoint is a dungeon finished. That
  replaces "rebuilding its house is your next task".
- **If it walks to a ring with nothing under it, the player follows the
  prints to a dead end.** Pragmatic default: the giant rises and walks off
  along a real route to a real second ring, and that ring stays shut
  (bare stones, no field) until dungeon 2 exists. Tell the owner plainly
  that the trail ends there for now.
- Save and reload at every step (orb held, orb placed, giant gone), and
  what happens if the player rides away mid-sequence: decide per step,
  simplest is that sequences hold you (as the giant's visit does).

## Rules that still apply

- Visual quality first; look at screenshots before calling anything done.
- Deterministic from the seed; no `Math.random()` in the plan.
- No text, no combat. Spooky is fine, cruel isn't.
- Don't use Hilda's names for creatures.
- Append decisions to `NOTES.md`; update `DESIGN.md` only when a design
  decision changes; keep `CLAUDE.md` lean.
- Don't resolve an open DESIGN.md conflict without the owner's yes. Where
  this brief says "default", build the default and flag it.

## Questions to the owner

Answered (2026-10-01):
1. Should the rockhopper come up out of the dungeon with you? **Yes. You're
   riding it for the whole offering sequence, and on it when you regain
   control.**
2. Does the dungeon shut once the orb is taken? **Yes, it turns into a
   shrine / stone thing.**
4. Parachute in the platform room: part of the challenge, or off? **Part of
   it, as a jump down from above. Built.**
5. Is it all right for the guide to simply be at the ring? **Yes.**

Answered after the owner played the offering (2026-10-01):
3. The pick for the rockfall: **fine.**
6. The returned spirit's house: **not a task for you. The spirits are seen
   working on the village and clearing up, a bit more at each checkpoint.**
7. The fetched rockhopper: **fine as it is.**
8. The dark in the big rooms: **liked.**
9. The saddle's bounce out of the camera above ground too: **yes. Built.**
10. The stone hand: **doesn't read as the giant's, but liked. Keep it, and
    reuse the shape for things out in the world that trigger or mean
    something.** What the first does is open.
11. The sleeping giant's crossed arms: **"weird and bad". Now hanging down
    into the ground like rock stacks.** The fist was bad too, and bad
    again as a mitten: **dropped. The crow flies into its open mouth.**
12. The dark spirit when the ring shuts: **just gone.**
13. The paving: **great. The shrine is now the mount in stone.**
14-16, 20. Moot or fine: **it is a cutscene, and the guide isn't in it.**
17. The glow: gone with the hand.
19. 32 s hands off: **"didn't feel crazy but it could get repetitive".**
    Dungeon 2's offering shouldn't be this one again at full length.
21. Bad dungeon sites: **fix them.** The search has a real fallback now.
22. The crow that flew into the giant's mouth: **gone for good.**

The third version of the offering (cutscene, statue, the crow into its
mouth, arms down): **good enough for now** (2026-10-02).

Still open:
- How the village's mending is shown (a step per dungeon finished, to
  start with). A first step is built; see `docs/NEXT-dungeon2.md`.
