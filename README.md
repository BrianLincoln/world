# Fjellheim

A procedurally generated Nordic landscape to wander, drawn like a storybook
(after the backgrounds of *Hilda*). A wordless story runs through it: a
cold hearth spirit, a cabin to mend, beacon towers to light, a stable and
creatures to catch and ride. It's being reworked around a giant who carries
off the village's spirits; see [DESIGN.md](DESIGN.md).

```bash
npm install
npm run dev
```

WASD move · Shift run · Space jump (again in the air: parachute) ·
click/drag to look · wheel zoom · E or click: the action on the badge (pick
up, chop, smash, build, light, pat) and ride / hop off · R / right-click
lasso (and lead / let go of a tamed creature) · C descend · F fly ·
T +1 hour · H hide UI

Setting a time or place turns the story off for a plain wander: try
`?seed=42&t=7.2` (rose dawn) or `?seed=fjord&t=22.5` (night). `?fresh=1`
forgets the saved story.

`npm run build` outputs a static site in `dist/`.

- What the game is and what's decided: [DESIGN.md](DESIGN.md)
- Intent and art direction: [docs/BRIEF.md](docs/BRIEF.md)
- Design decisions and tradeoffs: [NOTES.md](NOTES.md)
- Dev and verification workflow: [docs/WORKFLOW.md](docs/WORKFLOW.md)
