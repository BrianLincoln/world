# Fjellheim: design

Our shared design doc: what the game is and what has been decided.
The build log (how things were made, tradeoffs, perf) lives in `NOTES.md`.

Nothing in the **Parking Lot** gets built unless it's asked for.

**Status (2026-09-30): the story and core loop are changing.** The new
direction is "The giant" below: decided, none of it built. Everything marked
*(built)* further down is what the game does today, under the old plan
(hearth, towers, stable). Where the two disagree, the built section carries a
**New direction** note and the disagreement is listed under Open Questions →
"Conflicts to settle". Nothing built gets removed until those are answered.

## Pillars

These apply to everything.

- **Wordless.** There is no text or dialogue anywhere in the player
  experience. The game teaches through the spirits' behaviour, gestures,
  emotes, pictogram bubbles, visual cues and sound.
- **No combat.**
- **Nothing scary.** It's for the owner and their kids. The giant is big,
  not frightening; dark places are blue, not black.
- **Fucking beautiful.** Everything matches the art direction in `/inspo`
  and the existing style. The giant, its smashing, the taking of the spirits
  and its footprint trail are the game's showpieces and get the most visual
  care of anything in it.
- **Playable by young kids who can't read.** It's forgiving and has no
  failure states. A puzzle can be unsolved, never failed.

## Decided

### The giant: story (decided, not built)
A linear main path.
- The intro is a **village of hearth spirits**. One small spirit, **the
  guide**, directs your repairs, as the hearth spirit does now.
- Just after you've fixed things up, **a giant smashes the village and
  carries off most of the spirits**. The guide is left behind and stays with
  you for the whole game.
- The giant leaves a **trail of huge footprints** leading to puzzle
  dungeons. Each dungeon is something the giant's passing disturbed (a
  collapsed mine, a flooded ruin, a toppled tower). Solving it rescues one
  spirit. The giant shrugs you off and moves on carrying the rest, and a new
  trail opens to the next dungeon.
- **The giant isn't evil.** Working theory: it's cold, and hearth spirits are
  warm. This is foreshadowed, never explained: warm footprints, giant-sized
  furniture shapes in the landscape, dropped giant items.
- **Finale:** you build the giant a huge cabin and hearth, so it no longer
  needs the spirits. Each rescued spirit contributes a piece (hearth, roof,
  door), and mounts haul giant logs and boulders.

### The giant: how it has to look (decided, not built)
This is the brief for the showpiece. It has to be fucking cool, and it has
to stay inside the art direction (`docs/BRIEF.md`) and "nothing scary".
- **It's landscape that walks.** Around 60–90 m tall, taller than a beacon
  tower. Built from the world's own vocabulary: pebble-boulder limbs, a
  turf-and-moss back with whole conifers growing on its shoulders, snow on
  its head above a wavy snow line. Standing still, far off, it should pass
  for a hill. Then the hill gets up.
- **It obeys the fog layers.** At distance it's one flat tone, a painted
  background card like any ridge (inspo/1), with a slightly darker outline of
  its own layer. Scale is sold by it walking *behind* a near ridge and *in
  front of* a far one, by clouds at its shoulders, and by crows wheeling
  round its head. Never by darkness or detail.
- **Cold, read at a glance.** Its palette is the cold spirit's ash blue. It
  hunches, hugs itself, and shivers now and then. Its breath comes out as
  big flat-bottomed toon clouds. Frost rimes its shoulders. Same language as
  the cold hearth spirit in phase 1, so kids have already learned it.
- **The face** is the towers' and spirits' face: two tall, rounded-rectangle
  eyes, sleepy and half-lidded, set high. No teeth, no brow, no scowl. It
  never looks at you in anger. When it notices you it blinks slowly, the way
  the spirit does.
- **The one accent is the warmth it carries.** The spirits it takes glow
  amber (self-lit, skipping the grade, with bloom) against its blue. It
  tucks them against its chest like a kid holding kittens, or into a huge
  lantern or knitted sack it carries. That warm point is visible for
  kilometres at dusk, and it's what you follow with your eyes when the
  footprints run out of sight. Where they rest against it, its stone warms
  from ash blue to rose.
- **The smashing is clumsy, not cruel.** It doesn't attack the village. It
  wades through it as if through long grass, half asleep, reaching for the
  warm things. A foot comes down and a roof you just built pops into
  tumbling boards and a huge dust cloud. Nothing burns, nobody is hurt, the
  spirits squeak and wriggle rather than scream. The beats:
  1. **Tells before it's seen:** the ground thumps (a camera dip per step,
     getting stronger), puddles and the brook ripple, crows lift off all at
     once, the guide stops mid-gesture and turns. A shadow the size of the
     yard slides over the cabin.
  2. **The reveal:** what you took for a hill on the skyline stands up, or
     it steps over the ridge, breaking the fog layers one by one as it
     comes nearer: pale card, darker card, then full colour and outline.
  3. **The wade:** three or four footfalls through the village. Each one:
     a squash-and-stretch stomp, a ring of toon dust puffs, boards and
     stones popping out in arcs, trees under the foot laid flat radially,
     a hard camera dip.
  4. **The taking:** a hand as big as the cabin comes down, cupped and
     gentle, and scoops. Spirits become small warm lights between its
     fingers, then go into its chest / lantern, each adding to the glow.
  5. **The guide is missed:** it's knocked under the fallen door or behind
     your legs, and the hand passes over. It reaches up after the others.
  6. **It goes:** it turns and walks off into the fog layers, each step a
     thump a little quieter, the warm glow at its chest shrinking with
     distance. Its first footprints are left steaming across the yard.
  Short: under about 40 s, camera taken as in the gift shots, input off.
- **The footprints.** Each is the size of the pasture gate to the cabin
  (roughly 12 × 7 m), pressed a metre or more into the ground: a real
  hollow you walk down into, with a raised squashed rim, flattened trees
  fanned outward, cracked boulders, and a puddle if the ground is wet.
  - **Warm.** The pressed earth holds heat: a rose-amber floor against the
    cool ground, steam rising as soft toon puffs, flowers and glowcaps
    blooming inside it, snow melted to bare earth in the highlands, a faint
    glow at night so the trail reads as a string of warm lights going over
    the hills. Fresh prints (near the giant) are warmer and steamier, old
    ones cooled and already grassed. Warmth tells you which way it went.
  - **Readable from far.** Stride is about 45 m, left-right-left, so from
    any rise you see the next three or four. From a tower head they're a
    dotted line to the horizon.
  - **A place, not a decal.** Creatures gather in the warm ones. Kids
    should want to jump in every single one.
- **Being shrugged off** (end of each dungeon) is the giant close up: you
  free a spirit from where it's wedged, the giant's hand comes down to take
  it back, misses or lets it go, and it lumbers away. Gentle, slow, a
  different beat each time so it never turns into a boss.

### The trail and the core loop (decided, not built)
- **Loop:** follow the trail → catch the right creature → solve the
  dungeon → rescue a spirit → return to the village (it grows, and unlocks
  new buildables) → follow the new trail.
- **Story layout is authored:** trail direction, dungeon order and each
  dungeon's required abilities. **Terrain and rooms are procedural** around
  that, deterministic from the seed like the story site, towers and journey
  routes are now.
- The creature a dungeon needs lives in the region near it.
- The main path is open from the start. No timer. Only a gentle pull.

### Dungeons (decided, not built)
- Metroidvania-style gating by **mount ability**: swimmer, digger, glider,
  heavy pusher, climber, small-gap, and glowing (for dark rooms). The axe
  and pickaxe still matter.
- Each dungeon teaches one ability. Later ones combine them.
- **Generated backward from an ability chain** so they're solvable by
  construction, using room templates per ability.
- Abilities that exist today, by creature (what the code has now; see
  "Wild creatures and their biomes"):

  | Ability | Already in the game | Gap |
  |---|---|---|
  | Swimmer | Bog hag (dives, fast in water); stelk swims | – |
  | Digger | Mudsnoot (burrows, pops up further on) | – |
  | Glider | Moonmoth (floatiest); floof, crow, drakitten fly; your own parachute | Free flight skips rooms: dungeons need lids or a no-fly rule |
  | Heavy pusher | Stormback (charge flattens trees, shoves creatures) | Nothing pushable exists yet |
  | Climber | Woolly wurm (walls, roofs); mossback (any slope); rockhopper (bounds) | – |
  | Small-gap | none | Needs a small creature, or the glimmer's phase stands in |
  | Glowing | Lantern hare, glimmer, moonmoth eyespots | No dark places exist yet |

### Village and building (decided, not built)
- The guide keeps directing repairs and building all game, so **locked
  placement is the game's voice** (the sketch-and-slots building that the
  cabin and stable use now).
- Each rescued spirit unlocks new buildables.
- **Free placement** unlocks late, as a reward.
- Rescued spirits have distinct silhouettes themed to their dungeon.

### Side content (decided, not built)
None of it is required.
- Mini one-room hollows.
- Oversized dropped giant items as collectibles.
- Rare off-path creatures with odd abilities.
- Pictogram errands.
- Traversal toys.
- Hidden spots.
- Some give modest upgrades: a faster mount, a longer lasso, a bigger carry.

### Communication (decided, not built)
- An **emote wheel**: wave, point, nod, offer, come here.
- Creatures react to gestures.
- Quests use pictogram bubbles (the spirit's thought bubbles, as now).

### Finding the way back (built)
- Wander well away from the task and, after about 15 s, a small warm
  arrowhead fades in. It rides the screen edge pointing toward the task, or
  hangs over it when it's in view. It fades out once you're close. The task
  is the spirit (it always waits at, or leads you to, the next job), a
  tower's door at a lock, or home when the stable is waiting. It shows
  nothing while you're gathering (trees and rocks are anywhere) or out
  catching a creature.
- The spirit's calls, chirps and whimpers fade with distance (full volume
  within 50 m, silent by 110 m), so you never hear it without some way to
  find it.
- At the bike gift and at a tower's lock, the spirit gives the same idle
  hint as at home: after 20 s with nothing happening it comes over, tugs
  your coat toward the task, calls and points.

### Phase 1: the cabin and the hearth (built)
- **New direction:** this becomes the village intro. Today it's one cabin
  and one spirit; see Conflicts 1 and 2.
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
- **New direction:** towers, tower spirits and ember flight aren't
  mentioned in it. See Conflict 3.
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
- A lassoed creature can be led on its rope or ridden bareback straight
  away, but it isn't yours yet: no saddle, and if you leave it behind it
  wanders off wild again. Lead or ride it into the pasture and it lives
  there: it gets a saddle, is yours for good, and wanders the pasture and
  the stalls.
- Wherever you leave it, it comes home: the next time you're near the
  stable and it's out of sight, it's back in the pasture. It never
  disappears in front of you.
- Up to 20 creatures, any kind (crows too: they could fly off but choose to
  stay). A tally board on the stable wall shows how many live there: 20
  carved notches, one painted per creature. Upgrades to hold more come
  later.

### Wild creatures and their biomes
- **New direction:** these ways of getting about become the dungeon keys
  (the table under "Dungeons"). See Conflict 6 for the ones that would skip
  a dungeon as they are.
- Eleven more creatures, all lassoable and rideable like the first three, each
  living in its own kind of place and each getting about in its own way
  (not just faster or slower):
  - **Mossback** (forest edges, meadows): a huge old turtle wearing a hill
    of moss, toadstools and a seedling. Slow, but no slope is too steep.
  - **Glimmer** (glimmerwood; any forest at night): a dusk-blue fox-cat
    with shining spots, ears and tail. Nimble; Space phases it a few metres
    straight through trees and walls.
  - **Mudsnoot** (bogs): a bristly bog pig with a shovel snout. Mud doesn't
    slow it; Space burrows underground and it bursts up further on (further
    in bog mud).
  - **Moonmoth** (forests, glimmerwood, hollows): a giant pale moth with
    shining eyespots. Rests by day, drifts at night. The floatiest flier.
  - **Rockhopper** (crags): a small shaggy ram. Bouncy, sure-footed on steep
    rock, and Space is an enormous bound.
  - **Bog hag** (bogs, marshy shores): a hunched frog-seal-marsh-wife under
    a pondweed shawl. Waddles on land; in water it's fast and dives.
  - **Brambler** (deep forest): a deer woven of branches and leaves. Walks
    straight through trees and bushes, quicker the deeper the wood.
  - **Woolly wurm** (hollows, cliffs): a huge banded caterpillar, ridden
    like Snake: once going it crawls on by itself (W goes, S stops), and
    each tap of A / D turns it a right angle on the spot at full speed, the
    camera swinging round behind; the body follows the head's exact path. It clings: straight up
    ravine walls, over boulders, up a cabin wall, over the roof and down the
    far side, and never falls.
  - **Stormback** (open downs): a shaggy bison-yak that builds static as it
    runs; Space lets it go in a charge that flattens trees and throws
    creatures aside.
  - **Lantern hare** (meadows, woodland edges): a pony-sized hare with
    glowing ears and tail. The fastest thing there is, and hard to stop.
  - **Drakitten** (sunny open hillsides, tors): a round kawaii cat, mostly,
    with small dragon wings it flies on and a rocket out of its behind.
    Coats: pink, dark (gold eyes), marigold tabby, rare cream; each with its
    own wing and flame colour (pink/violet plasma, orange fire, blue).
    Wild ones lounge sitting up, swoop about in rocket bursts, and arrive
    in twos and threes from afar, landing on their rockets side by side
    like boosters. Ridden: walks, flies, Shift fires the rocket (very fast,
    overheats after ~5 s).
- Three new biomes for them, none of them near the start area, the towers,
  the journey's paths or any cabin:
  - **Bogs:** low fens eased down to just above the water, with pools and
    meres, reeds and bulrushes instead of grass, and few trees.
  - **Glimmerwood:** patches of forest floored with teal moss and glowcaps
    that shine after dark.
  - **The hollows:** long, narrow, steep-walled ravines in the hills (the
    world has no true caves: it's a height field).
- There is no combat (see Pillars), so nothing has health or takes damage.
  A charge flings creatures aside and spooks their herd; that's all.

## Player Sequence

The objective sequence is built as data, like phase 1.

**The main path (new direction, not built).** How phases 1–3 below fold into
it is Conflict 2; this is the shape once that's settled.
1. The village: arrive, meet the guide, repair with it.
2. The giant comes: the village is smashed, the spirits are taken, the
   guide is left with you.
3. Follow the footprints to the first dungeon.
4. Catch the creature that lives near it.
5. Solve the dungeon and rescue one spirit. The giant shrugs you off and
   walks on. A new trail starts from where it stood.
6. Take the spirit home. The village grows and the spirit unlocks new
   buildables.
7. Repeat 3–6, each dungeon teaching one ability, later ones combining them.
8. Finale: build the giant its cabin and hearth, each rescued spirit giving
   a piece, mounts hauling the giant logs and boulders.

**Giant slice 1: the smash, the taking, the trail** (next to build). The
first piece of the main path. It ends at a dungeon entrance you can't get
into yet; the dungeon itself is a later slice.
1. The village: the guide's ruined house (today's cabin) among a few other
   spirit houses that are whole and lived in.
2. You repair the guide's house and light the hearth (phase 1, as built).
3. The giant comes. It smashes the other houses, not yours, and carries
   off their spirits. The guide is left with you.
4. Its footprints lead away from the village.
5. You follow them to a dungeon entrance sealed by a forcefield. The guide
   tries it and can't open it. The slice ends here.

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
6. The spirit shows you how. It leads you out to a calm stelk grazing a
   little way past the gate (one is always there for this), stops short of
   it, whirls a little loop of rope over its head and flings it over the
   stelk's head, then turns to you: your turn. The lesson stelk barely
   spooks, so small kids can walk right up to it.
7. With it on your lead, the spirit hurries back to the gate and waves you
   both in. Let go of the lead and it goes back to showing you.
8. Lead it (or ride it) in through the gate. It's home: saddled, yours,
   and it always comes back here. The spirit runs over to you and cheers (a big jump,
   spins, hearts), then goes quietly about its day: it watches the
   newcomer from the fence for a while, then potters round the yard and
   the fire. It doesn't ask for anything or call to you.
- While the stable goes up, the spirit keeps a home base in its middle bay,
  inside the sketch, and runs the job from there with gestures. It doesn't
  lead you to single trees or rocks. When it wants material, it points out
  at the nearest rocks or trees ("get those"), then waves you back in
  ("bring them here"). When you're carrying material, it throws its arms wide
  at the sketch round it ("build this"). The stable's sketch shows from the
  first ask for stones. If nothing happens for 20 s, it calls and gestures
  again from its spot while the targets glint. It doesn't come to fetch you.

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

### The giant (new direction)
- Does the village heal behind the giant, or stay wrecked?
- Do rescued spirits tag along, or go home?
- How long between the giant's first hit and the first dungeon?
- How big should optional side content be?
- How does the giant carry the spirits: cupped to its chest, a lantern, a
  sack? (It decides the silhouette and the glow you follow.)
- How many dungeons, and so how many spirits and village houses?

### Conflicts to settle
Where the new direction disagrees with what's built or written. Each has a
proposed resolution; none is applied until the owner says yes.

**Owner's answers (2026-09-30):**
- **Agreed as proposed:** 1, 2, 3, 7, 8, 10.
- **4, agreed and extended:** the guide rides in your rucksack and pops out
  when it's needed. It also **replaces the "go this way" arrow**, which the
  owner dislikes. Proposed (awaiting a yes): it leans out of the pack and
  points the way with its arm; its glow warms when you're heading right and
  cools when you turn away; if you stand lost for ~20 s it hops down, runs a
  few steps the right way and beckons. The pack is always on screen in
  third person, so it's always readable. The HTML arrow goes.
- **5, settled:** a dungeon is **its own enclosed scene**, separate from
  the outdoor world. Walking through its entrance swaps you into it. Rooms
  are big and open, with roofs; the camera stays fairly tight to the
  character and stops at walls and ceilings. (This replaces the open-topped
  and room-kit-on-the-terrain proposals in 5 below.)
- **6, settled:** the entrance is a **translucent forcefield** across the
  doorway. Inside, the dungeon's walls and ceiling are what stop flying,
  phasing and burrowing past a puzzle. The giant is **not an ice giant**:
  it is cold, it doesn't make cold. (This replaces the "dungeon stone" and
  frost-dome proposals.) Still open: what opens the forcefield. Proposed:
  the guide's warmth.
- **9, changed:** the village has other buildings that don't need repair
  (yet). You repair the guide's house; **the giant smashes the others, not
  yours.** Proposed (awaiting a yes): each rescued spirit's house is the
  next thing rebuilt, which answers "does the village heal": one house per
  rescue.

1. **One cabin and one spirit vs a village of hearth spirits.** Built: a
   single ruined cabin with one cold spirit; worldgen guarantees room for
   the cabin, brook, grove and pasture only. *Proposed:* keep the cabin as
   the guide's house and the thing you repair. Add a handful of
   spirit-sized houses round the yard (knee-high, cheap to draw), each with
   its own spirit that lights up as your hearth does. The start site then
   needs more flat ground, which will move the cabin on some seeds, as the
   pasture did.
2. **When the giant strikes vs phases 2 and 3.** Built: after the hearth
   come the bike gift, two guided tower rides, then the stable and the
   lasso. The new direction says the giant comes "just after the player
   fixes things up" and that dungeons need a caught creature. *Proposed:*
   the giant comes right after the hearth is lit (the warmest moment, about
   10 minutes in). The stable and lasso become the first thing the guide
   has you rebuild afterwards, because you need a creature to follow the
   trail. The bike gift stays. The two guided tower rides stop being
   required. The alternative is to strike after the stable, which keeps
   everything built in order but puts the hook 30+ minutes in.
3. **Towers, tower spirits and ember flight.** Built and central to phase
   2; absent from the new direction. *Proposed:* keep them as optional fast
   travel and as the high place you spot the trail from. The trail passes
   lit and unlit towers. "Toppled tower" as a dungeon reuses the tower kit.
   The open question "how do towers get lit long term" stays open.
4. **The guide stays with you all game vs the spirit's yard.** Built: the
   hearth spirit never goes more than 45 m from the cabin, except when the
   journey borrows it to ride its little bike. *Proposed:* the guide
   travels with you (in the rucksack on foot and on mounts, on its own bike
   beside yours), and hops down to gesture.
5. **Dungeons vs a height-field world.** Built: the world has no caves or
   interiors, only the story cabin and each tower's hollow door boulder
   (hand-made rooms with their own colliders and camera clamp). A mine or a
   flooded ruin needs enclosed space. *Proposed:* dungeons are their own
   room kit placed on the terrain, like the tower room, not carved from the
   height field. The first ones are open-topped (sunken ruins, quarry pits,
   hollows) so the orbit camera keeps working; roofed rooms come once the
   camera can handle them.
6. **Mounts that skip dungeons.** Built: four fliers and the parachute
   cross anything; the glimmer phases through walls; the mudsnoot burrows
   under them; the wurm goes over them. *Proposed:* dungeon rooms are built
   from a "dungeon stone" that blocks phase and burrow (towers already
   block phase), and rooms that mustn't be flown have a lid or a low
   ceiling. Outside dungeons nothing changes.
7. **Dark rooms vs the look.** The brief keeps values high-key and never
   muddy; the pillars say nothing scary. *Proposed:* "dark" is the blue
   night palette with the outlines kept, not black. A glowing mount lights
   a warm pool round itself that brings the room's colour back.
8. **The giant vs the Parking Lot.** "Trolls and night hazards" was
   parked. *Proposed:* the giant is now asked for and leaves the lot;
   night hazards stay parked. "More mounts" partly leaves it too (rare
   off-path creatures, a small-gap creature). "A workshop" is folded into
   village buildables.
9. **Smashing what a small kid just built.** Not a contradiction in the
   docs, but it presses on "nothing scary" and "forgiving". *Proposed:* the
   cabin you repaired is damaged, not destroyed (the roof goes, the hearth
   stays lit), and the guide shows straight away that it can be mended.
   This also half-answers "does the village heal".
10. **The original brief says "no goals yet".** `docs/BRIEF.md` is kept
    verbatim on purpose. *Proposed:* leave it alone; its art direction
    still governs, and this document carries the goals.

## Parking Lot

Not to be built unless asked.

- Cartography and a wall map
- Night hazards (the giant has left the lot; see Conflict 8)
- More mounts beyond the fourteen, other than the rare off-path creatures
  and a small-gap creature the new direction asks for
- A workshop (pending Conflict 8)
