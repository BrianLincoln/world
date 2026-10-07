# Dungeon 4: ideas (nothing here is decided)

A pool of ideas for dungeon 4, started 2026-10-07. **Don't build from this
file unless asked.** When one is chosen it moves to DESIGN.md "Dungeons" and
gets its own `docs/NEXT-dungeon4.md`.

## What the owner asked for

Dungeons 1 to 3 are puzzles you can take your time over. Dungeon 4 should
be **harder, by way of action that isn't combat**: something to do with
your hands and your timing, where getting it wrong costs you ground and
you try again. Either half of the dungeon can carry it: on foot (to reach
the mount) or riding (to reach the light).

Still true: no combat, no text, nothing gory or cruel, spooky is fine. You
go in on foot, find the creature, use it, take the light, and the ring's
arms lift you out.

## Ground rules for action without combat (proposed)

- **You are never hurt, only put back.** Something carries, lifts, blows,
  floats or drops you to where the try began. The putting back should be a
  thing in the world you can watch (an arm, a crow, a wave), not a fade.
- **Putting back is short.** A few seconds, and never further than the
  start of the room you're in. A fall to a lower floor with stairs back up
  is the longest it should get.
- **Every threat shows itself first,** in pictures and sound: a shadow
  before a hand comes down, dust before a stone drops, a hum before a gust.
- **Harder by stacking, not by tightening.** One thing at a time first,
  then two together. Timings stay generous enough for touch controls.
- **The mount turns the room over.** What was the danger on foot is what
  the creature shrugs off, and the creature brings a new difficulty of its
  own (too slow, can't stop, overheats).
- Open: whether a room eases off after several failed tries.

## The ideas

### The owner's three

1. **The chaser.** Something is after you, and if it reaches you it takes
   you back to the beginning. You evade it, you don't fight it.
2. **The course against the clock.** Get through before something happens
   (a door shuts, a tide comes in, a light goes out). Too slow and it's
   reset.
3. **The floor that falls away, flips or turns.** You get a hint of which
   floor will hold. Falling through drops you to a lower level, and you
   take the stairs back up to try again.

### Things that put you back

4. **Stone hands.** The hands of `world/hands.ts`, awake down here. A
   shadow spreads on the floor, a hand comes down flat and stays a moment
   (a gate you time), or one rises under you, closes gently and sets you
   down at the door. Would give the hands above ground a meaning.
5. **The watcher.** A stone face or one great eye sweeps its look across
   the room. Move while it looks away or behind cover; if it sees you
   move, an arm (the ring's own) puts you back. Statues-in-the-playground.
6. **The crows.** They already snatch and carry. A roost of them asleep:
   creep past, run while their heads are tucked. Wake them and they lift
   you by the rucksack and drop you at the start.
7. **Your own shadow.** A dark twin walks the path you walked, a few
   seconds behind. Cross your own trail, or dawdle, and it catches up and
   you're both back at the start. Could be the ring's dark spirit.
8. **Wind.** A gust down the passage every so often, with a hum first.
   Caught in the open, you're blown back along it. Shelter behind piers.
9. **The tide.** Dark water rises through the room. If it reaches you it
   floats you back down to the door as it drains. Climb ahead of it.

### Floors and rooms that move

10. **Hints for the falling floor** (for idea 3), any of: dust trickling
    from the bad slabs; a glow under the good ones that pulses once and
    goes dark, so you cross from memory; the pattern carved on the wall
    before the room, as the Moon Hall's moons are; the creature crossing
    first and leaving its prints (`pawTrail.ts`); a different sound
    underfoot.
11. **Crumbling path.** Each slab drops a beat after you step off it, so
    you can't stand and think and you can't go back. They grow back when
    you're put back.
12. **The turning room.** The whole chamber is a great drum that rolls a
    quarter turn every so often. Walls become floor. On foot you tumble to
    the bottom and climb the stairs; a creature that clings doesn't care.
13. **Seesaws and counterweights.** Slabs that tip under your weight: keep
    moving, or use a heavy creature to hold one down.
14. **Stones on a beat.** Stepping stones that rise and sink in order, in
    time with that room's music, so the tune tells you when.
15. **Geysers.** Steam vents on a cycle, like the steam off the giant's
    prints. They throw you up: a hazard on the way in, a lift once you
    know the count.

### Against the clock

16. **The light that goes out.** Carry a flame from one brazier to the
    next before it dies. In the dark the way isn't there (the floor shows
    only in light) or the shadow of idea 7 comes.
17. **Pools of light.** Lamps swing or drift, and only the lit floor is
    safe. Keep inside the moving pool.
18. **The cave comes down behind you.** Taking something starts a rockfall
    (dungeon 1 has one) that follows you up the passage. Run. Caught, you
    come up out of the dust back at the last alcove.
19. **Shutters.** A row of doors that close one after another. A straight
    sprint, then the same with a bend, then with a gap.

### You do the chasing

20. **Catch it.** Before the creature is yours it runs, and you can't
    outrun it: you cut it off, shut gates ahead of it, herd it into a
    dead end. Dungeon 2's hide and seek, fast.
21. **The loose light.** The dungeon's light (or a small one that opens a
    door) flits away when you come near and goes back to its niche if you
    lose it. Corner it.

### What each unused creature would bring

Rockhopper, glimmer and moonmoth have had their dungeons.

22. **Woolly wurm** (clings, never stops, turns in right angles, the body
    follows the head). Snake for real: the turning room of idea 12, where
    she crawls round the inside of the drum as it rolls; your own body as
    a wall you mustn't run into; your body held across a gap as a bridge
    or in a doorway as a wedge; a board of lights to crawl over before the
    drum turns, without boxing yourself in.
23. **Lantern hare** (fastest, hard to stop, glows). A run in the dark
    where her light is all you see: the crumbling path of idea 11 at
    speed, bends you must set up for early because she won't stop, the
    memory floor of idea 10 lit one stride ahead.
24. **Mossback** (slow, any slope, a hill on legs). Speed is impossible,
    so the pressure is slow and steady: the tide of idea 9 creeping up
    while you plod straight up the steep way. Gusts and shoving hands
    don't move it. Stood still with its head in, it's a mossy boulder,
    and the watcher of idea 5 looks straight past.
25. **Mudsnoot** (burrows, comes up further on). Under the watcher's look
    and under the hands: the action is choosing where you surface. Come
    up under a slab and you're bonked back to where you went down.
26. **Bog hag** (dives, fast in water). The tide turned over: on foot you
    ran from the water, riding her you need it. Dive through drowned
    passages before the tide drains and leaves her waddling; currents
    that carry you past the turning you wanted.
27. **Stormback** (static builds as it runs, a charge). A round track to
    wind up on, and gates that open in turn: let the charge go at the
    right moment and through the right gate. Blocks to shove onto plates
    before a count runs out. Needs pushables, which don't exist yet.
28. **Drakitten** (flies, a rocket that overheats in about 5 s). A chimney
    climb: burn, glide, land on a ledge to cool, with shutters of idea 19
    closing above. Fall and you're at the bottom.
29. **Brambler** (walks through trees and bushes). A thicket that grows
    shut. On foot you hack through with the axe and it closes behind and
    around you until you're walked back out; riding her you go straight
    through, quicker the deeper in, racing whatever is closing.

## The owner's concept: the Drop (2026-10-07; chosen, and built in a first rough form: `docs/NEXT-dungeon4.md`)

None of the ideas above jumped out. The owner's own, which did:

- **You start very, very high up in a cavern.** The first hallway ends at
  a cliff edge. As you come up to the edge the parachute thought shows
  again (`chuteHintCanvas`, dungeon 1's), this once and nowhere else.
- **You get down by precision jumps to platforms,** on the parachute.
- **A cave lantern lights at your next landing:** the first as you reach
  the edge, the next each time you land.
- **A mistake brings you back up to the top.** How isn't settled (below).
- **At the bottom is the creature: the woolly wurm.** She climbs you back
  up the cavern to a hallway level with where you started.
- **The light is in that hallway, and you can see it from the cliff edge**
  and from the cavern on the way down: the goal is in sight from the first
  moment, across a gap you can't cross.

### How a mistake brings you up (the wind was built; the owner: it has no story and never stops)

- **Wind (the builder's pick).** The deep breathes: an updraft fills the
  cavern below the platforms, and each platform stands in its own still
  air. Drop past the lit one and the wind fills your parachute and carries
  you up, hands off, to the cliff edge. It needs no new rig, the ride up
  shows you the whole course from underneath, and the same wind can make
  the later jumps harder (a side draft with a hum before it). It also
  answers why you can't just fall to the bottom.
- **The ring's arms.** They already let you down and lift you out. It
  would read as the dungeon itself refusing you, but it spends the
  ending's picture early.
- **A stone hand** rises out of the dark under you like a lift and sets
  you on the edge. Gives `world/hands.ts` a meaning. The most to build.
- **Crows** lift you by the rucksack. Cheap, but they're the giant's.

### Things to settle

- **What counts as a mistake.** Proposed: falling a few metres below the
  lit platform without being over it. So the wind takes you at once, you
  never fall the whole way, and you can't skip ahead.
- **All the way to the top, every time?** As asked, yes. The builder's
  worry: missing the last of eight jumps and doing all eight again is
  harsh, and each try is the ride up plus the way down. Options: top every
  time but few platforms (five or six); or one broad ledge halfway that
  the wind returns you to once you've reached it.
- **Why the bottom isn't just the floor.** With the wind rule, the floor
  is reached only by the last jump, beside the crack the wind comes from.
- **How to aim.** A landing needs to be readable from above: your own
  shadow on the platform and the lantern's pool of light as the target.
  Depends on how finely the parachute steers today: to be tried first.
- **How it gets harder.** The first jump can't be missed. Then: smaller,
  further, a turn in the air, a side draft, a platform that sinks a few
  seconds after you land (so you can't stand and plan), one that swings.
- **The wurm's half.** Is the climb the release after the drop (easy,
  with the view, the lanterns you lit below you), or does it carry action
  of its own (she never stops: Snake up the wall between ribs of rock,
  gusts she shrugs off)? She can't fall, so nothing puts her back.
- **The gap to the light** must be further than the parachute glides from
  the edge, and the wind must not carry you to it.

## First tries at whole dungeons

Rough pairings of the above, to argue with. On foot first, then riding.

- **The Wheel** (woolly wurm; under the hollows). On foot: floors that
  fall, with a hint, dropping you a level to the stairs (3, 10). Riding:
  the turning drum, Snake against the roll (12, 22).
- **The Hall of Hands** (mossback). On foot: dash between cover under the
  watcher and the hands (4, 5). Riding: slow and unshovable, a boulder
  when still, against a slow tide (9, 24).
- **The Drowned Stair** (bog hag; under a bog). On foot: climb ahead of
  the rising water (9). Riding: the same rooms drowned, dived through
  before they drain (26).
- **The Long Dark** (lantern hare). On foot: carry a flame from brazier
  to brazier with your shadow behind you (7, 16). Riding: the run, her
  glow, the crumbling path (11, 23).
- **The Chimney** (drakitten). On foot: geysers and beat stones up the
  lower shaft (14, 15). Riding: burn and cool to the top (28).
- **The Sett** (mudsnoot). On foot: the sleeping crows (6). Riding: under
  the watcher, choosing where to come up (25).
