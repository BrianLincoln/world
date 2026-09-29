# Fjellheim

A procedurally generated Nordic landscape to wander, drawn like a storybook
(after the backgrounds of *Hilda*). There are no goals; just walk.

```bash
npm install
npm run dev
```

WASD move · Shift run · Space jump · click/drag to look · wheel zoom ·
R / right-click lasso (and lead / let go of a tamed creature) · E ride ·
F fly · T +1 hour · H hide UI

Try `?seed=42&t=7.2` (rose dawn) or `?seed=fjord&t=22.5` (night).

`npm run build` outputs a static site in `dist/`.

- Intent and art direction: [docs/BRIEF.md](docs/BRIEF.md)
- Design decisions and tradeoffs: [NOTES.md](NOTES.md)
- Dev and verification workflow: [docs/WORKFLOW.md](docs/WORKFLOW.md)
