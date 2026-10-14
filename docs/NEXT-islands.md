# The islands (built on the branch `islands`; not played by the owner)

Owner, 2026-10-13: "do a lot and make decisions as you go, on your own
branch, until we're feeling good." This is what was done and what was
decided on the way. None of it is on master. The direction it serves is
DESIGN.md "The shape of the world".

## To look at it
- The map: `docs/worldmap.png` (`node scripts/worldmap.mjs`).
- In the game: this branch, `npm run dev`. The strait is at world x 100,
  z 3450 to 4080: `?story=0&x=105&z=3470&yaw=3.14`.
- By the keys: `node scripts/sea.mjs shots/sea` (the spirit swimming, on
  the bog hag and flying; the bridge on foot and riding; and `build`: the
  mill making boards, the wood going into the sketch, the bridge standing).
- The building, by hand: `?fresh=1&cp=ring3`, then in the console
  `__ow.story().inv.logs = 100` and walk south down the prints to the sea.

## What is built
1. **The one world is five islands in a sea** (`src/world/islands.ts`):
   home, south, east, west, north. Only the seed everyone plays has them;
   any other seed is the old endless land, kept for the dev scripts.
   Inside an island the land is exactly what it was. The cabin, the village
   and all five rings stand where they stood (the rings are pinned:
   `RINGS`); only the ways to them were found again.
2. **A strait is cut between home and south**, between rings 2 and 3, about
   430 m of water.
3. **The deep** is sea 25 m down or more, out past an island or in a
   strait. The water draws it as a darker band. Lakes inland are never deep.
4. **The sea spirit** (`src/story/seaSpirit.ts`): over the deep, two pale
   eyes come up under you in a dark pool for 2.2 s; turn back and they sink;
   carry on and an arm of water lifts you, with whatever you ride, and sets
   you down on the shore of the island you left. Swimming, riding and
   flying all the same. `?sea=0` switches it off.
5. **A wooden bridge over the strait** (`src/world/bridge.ts`), on
   trestles, about 440 m long. **It isn't there at first.** Its deck is
   ground to everything that walks, rides or cycles, and the spirit leaves
   you be on it.
   **You build it** (`src/story/bridgeWork.ts`): once the giant has crossed
   and lain down by ring 3, the whole bridge shows as a sketch with ten
   slots over its near end. Stand within 16 m of its line with wood and the
   wood goes in, about seven a second. It takes **100**; each slot is ten.
   Nothing of it bears you until the last piece is in; then it stands all
   at once. Saved as `embla.bridge.<seed>`. With no story running
   (`?story=0`) it simply stands.
   **The lumber mill** (`src/story/mill.ts`): an open shed on the village's
   free plot furthest from the giant's prints, standing once the first
   spirit is home. A board every 60 s of play (not while you're away, in a
   dungeon or in a cutscene), up to 60 on its stack; walk up to the stack
   and they go into your pack as wood. Saved as `embla.mill.<seed>`.
6. **Each island has its own towers** (47 in all), and no link crosses the
   sea, so a tower can't carry you to another island.
7. Every save is wiped (`WORLD_VERSION` 7).

## Decisions I took (the owner hasn't ruled on these)
1. The islands' shapes are the mock the owner chose (C), with the south
   island moved 140 m south to widen the strait.
2. The strait is cut by hand, whatever the land does there.
3. The deep is by depth, not by distance from shore: off a steep coast it
   begins close in; off a beach about 90 m out.
4. The spirit takes fliers at any height below 600 m.
5. It sets you down toward where you last stood on dry ground, on that
   island, never on the nearest shore of all.
6. Islands apply to the one seed only.
7. The mill makes a board a minute, not one in ten (the owner's "or
   something"): at one in ten a hundred-wood bridge is sixteen hours.
   At one a minute the mill alone builds the bridge in an hour and forty
   minutes of play; felling makes up the rest. A number to play with
   (`EVERY` in mill.ts).
9. The mill's boards and the logs you fell are one thing in your pack.
10. The mill stands from the first spirit home, built by nobody you see.
8. Towers: each island grows its own from its best hilltop.

## Known rough
- **The spirit is a first shape**: a column of beads, a palm, two flat
  eyes. No face, no sound of its own (it borrows three), nothing in the
  music. The camera does nothing special.
- **The mill is a first shape**: nobody works at it, you can walk through
  it, and boards don't fly to you, they're just in your pack.
- **The bridge is a first shape**, dead straight, no ramp or gate at its
  ends, and you can walk off its side between the posts. Swimming under it
  lifts you on to it.
- **Nobody has watched the giant wade the strait.** The sea there is 45 m
  deep and its legs are about 45 m, so it should be in to the waist; its
  walk from ring 2 to ring 3 goes that way (`scripts/sites.mjs` counts 24
  footfalls in water, as meant) but the picture hasn't been looked at.
- Not measured: frame rate (less land is drawn than before, and the water's
  shader does more), and load time.
- Not played: the story from a fresh save on this land. The ways to the
  rings and the giant's walks check out (`scripts/sites.mjs`: no fallback,
  no wading), and the guided rides exist (442 m and 1.1 km), but nobody has
  walked them. The second tower moved (it is north-east of home now).
- The east, west and north islands have towers, cabins and hands and
  nothing else. Nothing reaches them.
- `scripts/sites.mjs` says the giant lies 41 m from ring 5 (it wants 45).
- Scripts that prove things on other seeds run on the old endless land.

## The first crossing, as the owner wants it (2026-10-13; not built)

- The bridge **doesn't exist at first**.
- When the last dungeon of the first island is finished (dungeon 2, as the
  islands stand), **you see the giant cross the water and come up out of it
  on the other side**, like Godzilla.
- Then **your spirit appears at that spot and guides you to build it**.
- It costs a lot: **a hundred wood or so**. Ideally by then **the village
  has some way of gaining resources by itself**.

Made of it: the bridge, the building of it as a sketch, and a lumber
mill (above). Not made:
1. **The crossing shown**: a camera on the giant wading out and coming up
   the far beach. Today's walk to ring 3 is filmed as any other.
2. **Your spirit at the water's edge**, guiding you to it. Nothing points
   at the bridge yet: you'd find the sketch by following the prints.
3. More of the village: the owner wants "more and more ways to expand" it.
   The mill is the first; nothing says how it comes to be built.

## Questions for the owner (after looking)
1. Do the islands feel right in the game: size, how far apart, the strait?
2. Is the spirit's warning long enough, and is being carried back fun or
   a nuisance?
3. The mill's pace and the bridge's price: 100 wood, a board a minute?
4. Which island is third, and what is each of the outer three about?
5. Should the deep begin further out off steep coasts?
