# Next: dungeon 1, second pass (brief for a fresh session)

Written 2026-10-01 after the owner played the first slice. Nothing in here
is built. Read `CLAUDE.md` first, then the last three sections of `NOTES.md`
("Dungeon 1: ..."), then `src/dungeon/` and `src/giant/ring.ts`. Work on
master, don't commit unless asked, verify with screenshots
(`scripts/dungeon.mjs`, `docs/WORKFLOW.md`).

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

- The ring takes you down with two arms and lifts you back out
  (`ring.ts`, `Dungeon.enter` / `onLeft`, `Ring.emerge`).
- The cave is a 2.5D plan (`layout.ts`): rooms and capsule passages as an
  SDF, a floor height, a ceiling height, walls that lean into a vault.
  Mesh, collision and camera all read the plan. About 135 x 60 m, five
  rooms, four passages. Authored by hand, seeded only for side and scatter.
- Light is up to **12** pools (`DUNGEON_GLOWS`, `DUNGEON_FRAG`), hard
  rings, violet grade (`DUNGEON_LOOK`).
- `Layout.shelf` is one ledge (a line across a passage; `Dungeon.collide`
  treats a rise over 0.9 m as a wall from below). `Layout.plug` is the
  rockfall. The rockhopper is a `Mob` with `below`, run by `Mobs.under`.
- The warm light is taken by walking into it and then just follows you.
- Above ground: the giant is asleep 48 m short of the ring as a solid
  boulder hill with crows roosting on it (`Giant.dormant`, `settle()`);
  there is **no way to wake it** in code. There is **one** dungeon site
  (`WorldGen.dungeon`, slow to find, cached per seed, handed to workers).
  After the visit the guide walks home and grieves in the village
  (`journey.ts`: `trudge`, `grieve`); it is not at the ring.

## Do it in three slices, in this order

Each is shippable alone. Stop after each and show the owner.

### Slice A: a bigger, darker dungeon (all inside `src/dungeon/`)

1. **Bigger.** Aim for roughly 5 to 8 times the walkable area and 4 to 6
   minutes on foot from the well to the light on a first visit. Keep the
   plan authored (a graph of rooms you design), not random: it needs a
   wrong turn, a platform room and a mount room in a deliberate order.
   Suggested route:
   - well → a fork.
   - **Short branch:** a passage to the ledge, with the light's glow
     visible beyond it. Impassable. This is the "wrong way" (item 4).
   - **Long branch:** winds through two or three big rooms, the platform
     room (item 5), to the rockhopper's den behind its rockfall (item 3).
   - From the den a short link comes back out near the fork, so the ride
     to the ledge is not the whole walk again.
2. **Darker, with spirit lanterns.**
   - Darker means a deeper shade tone, shorter fog, and fog toward a dark
     violet instead of the pale lilac now. Keep outlines and keep it blue
     or violet, never black: DESIGN.md conflict 7 (agreed) says "dark is
     the blue night palette with the outlines kept".
   - Lanterns on the walls as the pools of light. Recommended: they are
     **unlit until you come near**, then stay lit (saved). That gives the
     owner's "discover things", marks where you've been in a big dark
     place without a map, and makes the wrong turn readable on the way
     back. Give them a small dark-spirit face or the tower spirits' tall
     eyes so they belong to this world; cool light, so the orb stays the
     only warm thing.
   - **The 12-glow cap will not survive this.** Pick the nearest N glows
     to the camera each frame, or raise the cap and measure. Don't loop
     over 60 lights per pixel on integrated graphics.
3. **The mount is found far in**, at the end of the long branch. Keep the
   rockfall and the pick unless the owner says otherwise (they haven't
   answered whether freeing should be gentler).
4. **The wrong-way ledge.** Reuse `Layout.shelf` (it needs to become a
   list). Rules: you must be able to reach it before the mount; you can
   see the goal past it; nothing nearby to climb; the parachute can't
   beat it (it can't gain height, but check for higher ground to launch
   from).
5. **Platform room.** Jump between stone tops over a drop; miss and you
   land on a lower floor with an obvious way back to the start. No death,
   no reset. Put it **before** the mount, on foot, or the bound trivialises
   it.

Holes and decisions for slice A:

- **Space in mid-air opens the parachute** (glides about 4 m forward per
  1 m down). It will carry players across any gap that isn't sized for
  it. Either size the gaps for jump-plus-glide and call that the
  mechanic, or switch the parachute off in the platform room. Default:
  design for it, since the owner listed "jump, parachute" together.
- **The plan is a height field.** Pillars, pits, ledges and ramps are
  easy; overhangs and floors above floors are not possible without a
  rewrite. Don't design the platform room to need them.
- **Build time.** The shell is a 1 m grid over the bounding box and every
  node calls the SDF, which loops every room. At this size expect a
  hitch on first entry. It happens under the violet veil; measure it, and
  if it's over about half a second cache the SDF grid or coarsen the
  floor away from walls.
- **"Discover things" needs things.** Beyond lanterns, pick two or three
  cheap ones and stop: a view down into a room you reach later, the
  rockhopper heard or glimpsed before you can get to it, giant-sized
  shapes in the rock (DESIGN.md foreshadowing). Ask the owner before
  inventing collectibles.
- **The mount's camera** (the owner's "shakey and weird"). Not diagnosed.
  Reproduce first: `scripts/dungeon.mjs <dir> quest` rides it. Suspects,
  most likely first: `mount()` in `main.ts` sets the zoom to 12 m, more
  than most passages allow, so `Dungeon.clampCamera` is pulling in and
  easing out every frame; `Dungeon.floorAt` lets a body step up on to any
  boulder top within a step, so a trotting mount's height jumps; the ride
  mode's speed-based pull-back and FOV kick fighting the clamp; the
  explorer being hidden and shown as the camera crosses 1.3 m.
- Other seeds have never been looked at.

### Slice B: the ending, up to the giant taking the orb

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

- **How is the guide there?** It's 1.5 to 1.9 km away grieving in the
  village, and the rucksack idea (DESIGN.md conflict 4) isn't built.
  Pragmatic default: it is simply standing by the ring when you come out,
  no explanation, and say so in NOTES.md. Don't build the rucksack for
  this.
- **Shrine placement.** "The entrance becomes a shrine" would close the
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
- **The rockhopper stays underground** (it can't come up). So "unlock a
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

## Questions to put to the owner (none of them block slice A)

1. Should the rockhopper come up out of the dungeon with you?
2. Does the dungeon shut once the orb is taken?
3. Is breaking the rockfall with the pick the right way to free it?
4. Parachute in the platform room: part of the challenge, or off?
5. Is it all right for the guide to simply be at the ring?
6. Rebuilding the returned spirit's house: is that the next task?
