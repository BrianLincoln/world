# Next: dungeon 1, the offering (brief for a fresh session)

First written 2026-10-01 after the owner played the first slice; brought up
to date the same evening after slice A and the first step of slice B were
built and played. **Next to build: the rest of slice B, then slice C.**
Read `CLAUDE.md` first, then this, then in `NOTES.md` everything from
"Dungeon 1, slice A" to the end, then `src/dungeon/`, `src/giant/ring.ts`,
`src/giant/giant.ts` and `src/giant/visit.ts`. Work on master, don't commit
unless asked, verify with screenshots (`docs/WORKFLOW.md`).

**Nothing from this work is committed**: slice A and the start of B are all
in the working tree on top of `e215081`. Ask the owner before committing.

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
  nearest 16 pools of light are drawn. A parachute thought bubble after
  three falls from the high stone.
- Taking the light: a 5.4 s success beat (hops, a heart bubble, lanterns
  up), the violet veil, and `onWon` -> `leaveDungeon(true)` in `main.ts`.
- `layout.at` names every place; `scripts/dungeon.mjs <dir> quest` plays
  the whole thing by the keys and must keep passing;
  `scripts/dungeon-plan.mjs` checks the plan.

Above ground, after the light is taken:
- The ring's arms lift you out (`Ring.emerge`); the rockhopper is brought
  up (`below` cleared, `bringUp` in `main.ts`) and you are on it the
  moment the arms let go.
- `dungeonWon` (read from `fjellheim.dungeon1.<seed>`, `taken`) stops the
  ring taking you again. **It still looks like the open ring**: field,
  dark spirit and all.
- On a reload after winning, a rockhopper is adopted standing by the ring
  (it is not in any save of its own).
- **The light does not come up.** It is a mesh in the dungeon's scene.
- The giant is asleep 48 m short of the ring as a solid boulder hill with
  crows roosting on it (`Giant.dormant`, `settle()`); there is **no way
  to wake it** in code. There is **one** dungeon site (`WorldGen.dungeon`,
  slow to find, cached per seed, handed to workers). The guide walks home
  and grieves in the village (`journey.ts`: `trudge`, `grieve`); it is not
  at the ring.

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

### Slice B: the ending, up to the giant taking the orb

**Step 1 is built** (the success beat, the veil, out on the surface mounted,
the ring refusing you afterwards). Steps 2 to 5 are not. The owner's answers
since (see the questions at the end) change three of the defaults below;
where they do, the answer wins:
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

### Slice C: the spirit goes home and the giant moves on

1. Cut to a crow carrying a spirit's light to the village, the spirit
   back on its doorstep.
2. The giant gets up and walks to the next dungeon's site, leaving prints.

Holes and decisions for slice C:

- **The village isn't loaded** when you're at the ring. A straight cut
  there shows unstreamed terrain. Do the cut under a short veil and wait
  for `terrain.busy` to clear, both ways. The owner already expects a
  teleport, so the crow doesn't need to fly the distance.
- **Its house is still smashed.** DESIGN.md conflict 9 proposes "each
  rescued spirit's house is the next thing rebuilt", awaiting a yes.
  Default: the spirit stands by its wreck and that rebuild is the next
  thing the guide asks for. Confirm with the owner; don't build the
  rebuild in this slice.
- **There is no second dungeon site.** `WorldGen.dungeon` is one site and
  one route, the search takes 0.4 to 4.8 s, it's cached under a versioned
  localStorage key, and the chunk workers are handed it (the cleared
  swath, the ring's stones). A second site means making that a list
  everywhere and bumping the cache key. This is the biggest piece of
  hidden work in the whole request.
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

Still open ("TBD"):
3. Is breaking the rockfall with the pick the right way to free it?
6. Rebuilding the returned spirit's house: is that the next task?
7. Is the freed rockhopper appearing behind you when you leave it
   acceptable, or should it properly follow?
8. Is the dark too empty in the big rooms before any lantern is lit?
9. The saddle's bounce is smoothed out of the camera only underground. The
   same above ground?
10. Is the upright stone hand the right foreshadowing, or too much too
    early?
