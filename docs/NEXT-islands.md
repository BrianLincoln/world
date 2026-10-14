# The islands (built on the branch `islands`; not played by the owner)

Owner, 2026-10-13: "do a lot and make decisions as you go, on your own
branch, until we're feeling good." This is what was done and what was
decided on the way. None of it is on master. The direction it serves is
DESIGN.md "The shape of the world".

## To look at it
- The map: `docs/worldmap.png` (`node scripts/worldmap.mjs`).
- In the game: this branch, `npm run dev`. The strait is at world x 100,
  z 3450 to 4080: `?story=0&x=105&z=3470&yaw=3.14`.
- The sea spirit by the keys: `node scripts/sea.mjs shots/sea` (frames of
  the warning, the arm and the shore, for swimming, the bog hag and flying).

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
5. **A wooden bridge crosses the strait** (`src/world/bridge.ts`), on
   trestles, about 440 m long, on the giant's line, so the story can still
   be played from ring 2 to ring 3. Its deck is ground to everything that
   walks, rides or cycles, and the spirit leaves you be on it. Under it the
   sea floor is a shoal, so the giant wades astride it, a foot either side.
   (First it was a sandy causeway; the owner: not that, a wooden bridge.)
   **Nothing gates it yet:** it stands whole from the start.
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
7. The first crossing is a whole bridge for now, open from the start.
8. Towers: each island grows its own from its best hilltop.

## Known rough
- **The spirit is a first shape**: a column of beads, a palm, two flat
  eyes. No face, no sound of its own (it borrows three), nothing in the
  music. The camera does nothing special.
- **The bridge is a first shape**, dead straight, no ramp or gate at its
  ends, and you can walk off its side between the posts. Swimming under it
  lifts you on to it. Nobody has watched the giant walk astride it: its
  second walk now counts as wading in `scripts/sites.mjs`, as meant.
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

## Questions for the owner (after looking)
1. Do the islands feel right in the game: size, how far apart, the strait?
2. Is the spirit's warning long enough, and is being carried back fun or
   a nuisance?
3. What is the first crossing really (a bridge you mend, something the
   giant breaks), and when does it open? Today it's open from the start.
4. Which island is third, and what is each of the outer three about?
5. Should the deep begin further out off steep coasts?
