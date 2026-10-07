# Roadmap: the open world (the cold country, sparks, and what hangs off them)

Written 2026-10-07 over one long brainstorm with the owner, and rewritten
at its end round the idea that came out of it. **Nothing here is built.**
What the owner agreed to is in DESIGN.md ("The cold country") and marked
**agreed** below; everything else is a proposal or a pool of ideas, and
says so. The first thing to build is in `docs/NEXT-warmth.md`.

## What the owner wants

The game outside the dungeons, and after them, should be more of a game:
more to find, more to do, a reason to do it. Quests of a kind, something
like treasure, a small resource you always want more of, a village that
gets new things, shops, clothes, vehicles, big rewards. Still no text, no
combat, no failure, one action button, and it has to look like the rest.

Building floor by floor and wall by wall was weighed and left; so were
growing cabins room by room and a homestead game. They didn't excite.

## The core (agreed)

For most of the brainstorm a resource was looked for and none stuck,
because nothing at the heart of the game used anything up. This is the
idea that did:

**The country has gone cold, and you warm it, tower by tower, with
sparks.**

- **Cold, not dark.** The sun still rises. Land with no light near it is
  drained: pale, close to one colour, the fog standing near, nothing
  living in it and nothing to find. Lit land is the game as it looks now.
- **Towers are the lamps.** Lighting a beacon tower warms a big swath of
  country round it, and you watch it happen: the warming rolls out from
  the tower across the land.
- **Sparks open a tower**, not a smashed padlock. Sparks are the common
  resource: small, found often, always wanted.
- **Sparks come out of warm land.** What's worth finding only shows, or
  only opens, where it's warm. So: light a tower, the country wakes, you
  search it, and what you find lights the next. Flying anywhere doesn't
  break this, since there's nothing to see or take in the cold.
- **No tower stands near a dungeon's ring.** That country can't be warmed
  early. When the dungeon is won, **a tower rises out of the sealed ring**
  and warms it for nothing. So the story alone warms a chain of regions
  along the giant's trail, and sparks buy all the rest.
- **Nothing drains.** No meter runs down as you walk. (Asked and dropped:
  losing sparks slowly as you explore; a torch.)

### Proposed round it, not yet agreed

- You carry a little light for nothing: the guide in your pack is a hearth
  spirit. A few metres of colour round you, so you're short-sighted in the
  cold, never blind.
- The giant's prints glow, so the trail shows best of all in cold land and
  the main path stays open with no sparks at all.
- The cold comes with the giant's visit: the colour drains out of the
  country behind it as it leaves. Your own valley stays warm because your
  hearth is lit.
- A tower costs more the further out it is. The network grows out from
  the home tower, so every tower has a depth to price it by. The guide
  gives you the first tower's sparks.
- **A guarantee, proved by a script:** every swath holds at least the
  sparks its dearest neighbour costs. Nobody can be stuck.
- The dungeon's tower rises as the giant gets up and walks off, so the
  colour spreads behind it while it goes on into the cold.
- Cold cabins are small lamps: a pocket of warmth in the cold between
  towers, something to come upon.
- From a tower's head the map is islands of colour in a pale country.

## The lore (agreed as the direction; it is the story, so see DESIGN.md "Conflicts to settle" before building any of it)

The owner asked two things: why does the giant move on, and why would its
crows give a spirit back? "It seeks the cold as you warm things" was
weighed and left: it keeps warm lights round its head, and it raises what
happens if you've warmed where it's going.

**The giant is a tower whose light has gone out.**

- Towers are stacks of boulders with a hollow stone head. So is the giant.
- It is cold and empty, and walking about looking for its light.
- It took the hearth spirits, the last warmth in a cold country, to fill
  its head. They are too small; its crows only carry them round it.
- The dark lights under the rings are pieces of its own. It is too big to
  go down, so it lies by each ring and waits for someone who can.
- Each piece it swallows is one borrowed light it no longer needs, and it
  lets that one go home.
- It walks on because the next piece is under the next ring.
- At the end its head is lit, and you can go up into it as into any
  tower's. **That is riding the giant**, with the view from inside its
  head (owner: yes to this, 2026-10-07).
- The stone hands that stand about the world (`hands.ts`) are other
  giants', asleep under the hills: the "more enormous living things" the
  owner also said yes to.

What's already built rhymes with it: a tower spirit's long arms slurp you
up, the ring's dark spirit has two arms that pull you down; you are a
tower's head when you're in it, and the giant's mouth is a real hole into
the hollow of its head.

Two plainer versions were offered and not taken: a simple trade (what is
on screen today), and the crows as the thieves.

## What else is agreed

- **The lasso comes much, much later.** The stable is still built early;
  it is the handing over of the lasso that moves. For most of the game
  your only mounts are the ones the dungeons give you.
- **A treasure with every dungeon,** besides the light and the spirit:
  **one particular new structure for the village**, not a currency to
  spend as you like. Proposed: a rolled sketch, since building here is
  already sketch-and-slots. The owner's lean: it is always on the sealed
  ring by the shrine, so it can't be walked past. (How the shrine, the
  chest and the tower that rises there share one ring is open.)
- **Small caches**, worth less: several about each dungeon, and rarely out
  in the world. They want a name that isn't "glimmer" (the creature).
  These are the likeliest home for sparks.
- **You mend no house after the first.** The spirits rebuild their own,
  hands off, as you get on (`docs/PLAN-rebuild.md`).

## What's wanted but not worked out

The owner wants all of these; the frameworks first drawn up for them
predate the core and none was agreed. They are kept short here as a pool.

### Things to do in warm land

- **Asks** (quests without words): a thought bubble with an icon and a row
  of pips that fill. Templates: collect N of a biome's rare find; bring a
  creature; carry this there; find the lost one; free a stuck creature;
  something too big for you (the giant's job, late). Givers: the village's
  spirits (written by hand), a cold cabin's spirit (seeded by its cell),
  creatures met by chance.
- **The cold cabins** that stand about meaning nothing: a spirit gone cold
  in each. The owner wants them to matter.
- **The hands**: the owner wants each to do something and leave something
  for good that you come back to. Proposed: each wants one thing set in
  its palm; woken, it gives sparks now and a few more whenever you return.
- **Chance meetings**: a creature stuck in bog mud or a thicket.

### The village

- **Structures**, one per dungeon's treasure, and some found in the world.
  The pool: a field, mushroom logs, a sawpit, a quarry face, bee skeps, a
  sheep-fold, a bigger stable and a loft for fliers, a kitchen, a lamp
  works, a well, a bridge, a bell, a sauna, a boat shed, a crow loft, a
  green where found things are stood.
- **A timeline**: each structure should make the next thing matter. A
  first draft (a stall, a loom, a lamp works, a wheelwright) was scrapped.
  What a new one must respect: the lasso is late; one new thing at a time,
  since no words can explain a choice; nothing needs more than one other
  structure. A way to teach each: its spirit makes the first thing in
  front of you and hands it over.
- **Where a dungeon's creature lives.** Proposed: the stable keeps a stall
  for every dungeon creature, apart from the pasture's twenty, so there is
  always room; with no stable yet, it keeps to the cabin yard. Gating a
  dungeon on stable room was weighed: possible without words, but the
  main path is meant to be open.

### Spending

- **A second currency** for shops is wanted and undefined. ("Beads" was
  only a stand-in.) Decide what it is in the world before using it.
- **Shops**: a stall with its goods standing on it; walk up, a bubble
  shows the price in pips; hold the action. Mount and rider upgrades (a
  longer lasso, a bigger pack), clothes, vehicles.
- **Clothes**: colours of what's worn first (palette only), then hats and
  scarves on the rig, then outfits themed to each dungeon.
- **Vehicles**: each a `MovementMode`, each getting about in its own way.
  The owner has thought of a hoverboard and a motorbike.
- **Giant's things**: oversized things it dropped (DESIGN.md "Side
  content"), as the rare currency for the biggest rewards.

## Tried and left (don't bring these back unasked)

- **Sparks spent on:** keeping a creature where it stands, making camp,
  calling a mount, flying home, warming a cabin's hearth, a bigger mount
  ability, opening a cache, hurrying a work. None landed. Nor charging for
  what mounts already do ("a pretty big nerf").
- **Reach as the gate** ("places you can see but can't get to yet"): one
  flier and nothing is out of reach, and it gave sparks no cost.
- **A collectible that grows what your creatures can do** (A Short Hike's
  feathers).
- Lighting cabins as the spine; cabins that grow room by room; a job per
  cabin; paths that wear in; carrying goods between cabins.
- Pairing creatures, cloud islands or an underworld, toys of wind and
  water, a second player: offered once, not picked up.

## Where it collides with what's built

To be settled with the owner as each is reached, not before:

1. **The lock.** A tower is lit by smashing a rusted padlock with the
   pickaxe (`beacons.ts`, `Lock`, `Freeing`). Sparks replace it.
2. **Phase 2's two towers** (`journey.ts`) are lit as part of the guided
   rides, before the giant comes. Are they warm from the start, and is
   anything cold before the visit?
3. **Where towers stand.** The network (`towers.ts`) must keep clear of
   every ring, so it has to be grown after the dungeons are found. That
   moves towers: a `WORLD_VERSION` bump, which wipes every save.
4. **The end of a dungeon** is one fixed sequence (DESIGN.md "Dungeons").
   A tower rising from the ring and a treasure beside the shrine are both
   new beats in it, by the owner's own asking.
5. **The lasso** is handed over when the stable is built
   (`phase3.ts`). Moving it late changes what phase 3 is for, and wild
   creatures become scenery for most of the game.
6. **Creatures in the cold.** Wild creatures are already scared off for
   good near the village at the visit (`Mobs.scare`). Are they absent from
   cold land, or only hidden?
7. **The look.** The picture is already graded toward one hue by time of
   day (`uTint`, `uTintAmt`, `uLift` in `post.ts`), with accents opting
   out. Cold has to read as plainly different from an ordinary dusk.
8. **Saves.** Warmth, sparks and the village are worth more than an hour
   of story. A save that a new world version leaves alone is wanted for
   whatever isn't tied to a place.
9. **The Parking Lot** in DESIGN.md has a workshop and a wall map. A
   vehicle shop is a workshop.

## Order of work

| # | What | Session |
|---|---|---|
| 1 | **Mock the look**: a valley cold, the warming part-way across it, a tower's head with one region lit. Throwaway. Everything rests on the cold being beautiful. | new; `docs/NEXT-warmth.md` |
| 2 | **Warmth**: the saved warmth map, the cold look done properly, one tower warming its swath from a dev hook. | new |
| 3 | **Sparks**: a thing you hold, the door boulder taking them, caches that show only in warm land, the script that proves nobody is stuck. | new; can run beside 2 |
| 4 | **The story joins in**: the visit drains the colour, towers keep clear of rings, a tower rises after dungeon 1. Wipes saves; batch with any other change to the land. | new |
| 5 | Design, one talk each, each ending in a doc: cold cabins and asks; the hands; the village's structures and their order; where the lasso lands; the second currency and shops; the ending and riding the giant. | new, one each |

Each session ends by writing what it built, decided and left open into its
`docs/NEXT-*.md`, so the next one starts from a short file.

## Questions waiting for the owner

1. How big is a swath? (Towers stand at least 560 m apart.)
2. What does the first tower cost, and how fast does the price climb?
3. Are creatures gone from cold land, or there but grey?
4. Do cold cabins warm a pocket of their own?
5. Is anything cold before the giant comes?
6. What is the second currency, in the world?
7. Is the giant ridden only once the story is done?
