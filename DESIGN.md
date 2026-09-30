# Fjellheim: design

Our shared design doc: what the game is and what has been decided.
The build log (how things were made, tradeoffs, perf) lives in `NOTES.md`.

Nothing in the **Parking Lot** gets built unless it's asked for.

## Pillars

These apply to everything.

- **Wordless.** There is no text anywhere in the player experience. The game
  teaches through the spirits' behaviour, visual cues and sound.
- **No combat.**
- **Fucking beautiful.** Everything matches the art direction in `/inspo`
  and the existing style.
- **Playable by young kids who can't read.** It's forgiving and has no
  failure states.

## Decided

### Phase 1: the cabin and the hearth (built)
- You start in the woods and follow a path to a broken cabin. A cold hearth
  spirit meets you there.
- The spirit shows you the axe. You fell trees for logs and repair the roof
  and door.
- It then shows you the pickaxe. You break rocks for stones and rebuild the
  chimney.
- You light the hearth in the afternoon. The spirit warms and glows, and
  chimney smoke marks home from across the valley. Finishing the house does
  **not** jump the clock to night; the day just carries on.
- Gathering is a mechanic, not a script: any tree can be felled and any
  ordinary rock broken, and they regrow.
- Walking, running, parachuting, biking, riding creatures and dev-mode flying
  all keep working.
- You can pat the home spirit only when it's idle at the cabin: settled
  (sitting by the fire or pottering round the yard), never while it's asking
  you to do something, pointing, leading or riding. Walk up close and the action badge shows a mitten on
  its head. You kneel and pat it three times. It shuts its eyes, blushes,
  glows warmer and coos at each pat, then hops and spins with a heart.

### Beacon towers
- A beacon tower is a huge stack of boulders. Nothing else in the landscape
  is a stacked-boulder cairn, so any stack you see far off is a tower.
- Towers are placed procedurally from the seed:
  - on high points;
  - spaced out so they don't cluster;
  - so that every tower can see at least one other and the network always
    connects.
- A **home tower** always stands a short distance from the home cabin, as
  part of the guaranteed start area. Currently about 200–420 m (up to 600 m
  if nothing nearer can be seen from the yard); the exact distance still
  needs a feel pass. It should be visible from the cabin yard.
- **"Can see"** means within a set range, with a clear line from glow to
  glow (head to head). Terrain blocks the line and trees don't.

### Towers and their spirits
- Towers are big (about 25-50 m). No two are the same shape: each has its
  own build (a tapering cairn, a tall slim pillar, a top-heavy stack with a
  big boulder balanced on a small one, or a squat stack under a big head),
  number of boulders, proportions and lean. The head sits right on the top
  stone; there's no flat capstone under it. The base sits into the ground.
- The tower spirit is a glowy little ghost: a rounded dome over a wavy hem,
  floating, with the towers' tall dark eyes, a smile, and long stretchy arms
  that hang down to the ground. It climbs the tower hand over hand, ledge by
  ledge, and slips into the head through an eyehole.
- The top boulder is a hollow stone head in the same stone as its tower,
  with two tall, near-rectangular eyeholes with rounded corners: dark and a
  little spooky. There is no flame, ever.
- **An unlit tower is sealed and empty.** Its head is dead stone, very dark
  inside, and it doesn't move. The second boulder from the bottom (the one
  above the half-buried base) is a big door boulder, bound with an old
  rusted iron band and padlock.
- **Lighting a tower = freeing its spirit.** You smash the old lock with the
  pickaxe (the same hold-to-swing as breaking rocks). The door boulder cracks
  open into a big doorway. Out tumbles the tower's spirit: a new kind of
  spirit, a small glowing body with the tall dark eyes and long stretchy
  glowing arms. It has a happy moment with you (like the cabin spirit), then
  flings its arms up and dramatically hauls itself up the outside of the
  tower into the head. The eyes blaze on and the rock glows from inside: the
  tower is lit, and fast travel to and from it is unlocked.
- Each tower has its own spirit, different from the home cabin spirit.
- **Going up:** the opened door boulder is a real hollow room you can walk
  into. Once you're inside, the spirit's arms come down from above and slurp
  you up through the inside of the tower.
- **Up top, you are the head.** The explorer isn't there; you're ephemeral
  ember stuff, looking out through the head's eyes (the tower camera, below).
  The head turns all the way round with your look.
  There's always a clear, wordless way out, which slurps you back down and
  out of the doorway. That matters at the first tower, when there's nowhere
  to travel to yet.
- The home tower looks special: a different colour, and brighter than the
  others.

### The tower camera
- From inside the head you look around freely.
- Lit towers in sight are extremely visible: their glow is bright and punches
  through fog and darkness.
- Unlit towers in sight appear as dark silhouettes with dim eyes, so you know
  where to go next.
- The home tower is always a destination from any tower, even when it's out
  of sight. From the home tower you can reach every lit tower.
- Aim snaps to the nearest lit tower in view, which brightens further when
  targeted. You confirm to travel, and there's a clear way to exit.

### Ember flight
- When you travel, your body bursts into sparks and becomes a single glowing
  ember. The camera follows it along a high arc from tower to tower.
- A trip takes a few seconds, longer for farther towers. The flight time
  covers loading the terrain at the destination.
- The ember flies into the destination tower's glowing head, and you are
  that head now (the tower camera there). You reform on the ground when you
  exit through its doorway.
- Ember flight only goes from the top of a lit tower to the top of another
  lit tower. Never from anywhere else in the world.

### The bike
- There's no starter bike. The bike is the home spirit's gift (Phase 2), and
  from then on it always reappears outside the home cabin.

### The stable and creatures
- The stable is small: an open-fronted timber shed with three stalls and a
  turf roof. It stands across one end of a big fenced pasture (about
  34 × 24 m) on flat open ground by the cabin, with a gate on the cabin
  side. Every start area has room for one (worldgen guarantees it).
- Building it takes about 20 logs and 6 stones: a stone footing and trough,
  the frame, the roof, then the fence.
- There's no lasso at the start. The spirit gives it to you when the stable
  is done, pulling it out of its heart like the bike. Before that, creatures
  are only ambient life (you can spook them).
- A lassoed creature can be led on its rope but not ridden. Lead it into
  the pasture and it lives there: it gets a saddle, can be ridden and led,
  and wanders the pasture and the stalls.
- Wherever you leave it, it comes home: the next time you're near the
  stable and it's out of sight, it's back in the pasture. It never
  disappears in front of you.
- Up to 20 creatures, any kind (crows too: they could fly off but choose to
  stay). A tally board on the stable wall shows how many live there: 20
  carved notches, one painted per creature. Upgrades to hold more come
  later.

## Player Sequence

The objective sequence is built as data, like phase 1.

**Phase 1: the hearth** (built)
1. Arrive through the woods and meet the cold hearth spirit.
2. Pick up the axe, fell trees, and repair the roof and door.
3. Pick up the pickaxe, break rocks, and rebuild the chimney.
4. Light the hearth (afternoon; no jump to night). The spirit settles by the
   fire.

**Phase 2: the gift and the first journey** (built, first pass: stages 0-5 are all in, waiting on a review pass)
1. After the hearth is lit, the home spirit gives you a bike. It waits until
   you're outside in the yard with it, then takes the camera for a short
   shot of it pulling the bike out of its heart, so you can't miss it.
   From then on, the bike always reappears outside the home cabin.
2. The spirit rides alongside on its own small bike and leads you along a
   visible path from the cabin to the home tower.
3. The cabin spirit teaches you to light towers: at the home tower it shows
   you the old lock. You smash it, the tower's spirit comes out, has its
   happy moment and hauls itself up into the head, and the tower is lit.
4. You walk into the doorway, get slurped up, and the tower camera opens for
   the first time, showing a nearby unlit tower. You exit back down.
5. As soon as you come out, the cabin spirit is waiting on its bike and leads
   you along a visible path to that tower. You light it the same way. Now you
   can travel home by ember flight.

**Phase 3: the stable** (built, first pass)
1. The first time you come home after lighting the second tower, the spirit
   greets you and leads you to the pasture ground, where marker stakes show
   where it will go.
2. Break rocks for stones and build the footing and trough.
3. Fell trees for logs and raise the frame and the turf roof.
4. More logs, and build the fence and gate.
5. The spirit pulls a lasso out of its heart and hangs it on the gatepost.
   Take it.
6. Lasso a creature and lead it in through the gate. It's home: saddled,
   rideable, and it always comes back here.

## Open Questions

- How do towers get lit in the long term? A resource, or a challenge, later.
- Can creatures travel through towers?
- How do tower spirits differ from each other?
- What makes the home tower look special? Currently: 12% bigger, golden
  sandstone instead of grey-rose granite (its head matches), a brighter
  glow, and a small house carved over the brow that glows when lit. To be
  refined.
- How far should the home tower be from the cabin? Needs a feel pass.
- What happens when the stable is full (20)? Letting one go, trading, or
  upgrades to hold more?

## Parking Lot

Not to be built unless asked.

- Cartography and a wall map
- Trolls and night hazards
- More mounts
- A workshop
