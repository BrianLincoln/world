# The brief

This is the original request that started the project, kept verbatim so the
intent never drifts. Everything else in the repo serves this document. If a
change makes screenshots less beautiful, it's the wrong change.

---

> Build a browser-playable, procedurally generated open-world sandbox with a
> third-person camera. There are no goals yet. The point is exploring a world
> that is fucking beautiful. Visual quality is the top priority, above feature
> count.
>
> Work autonomously from start to finish. Don't stop to ask me questions; make
> reasonable decisions and keep going. Log your key decisions, tradeoffs, and
> anything you'd do next in a NOTES.md.
>
> ## Tech stack
> Choose the stack yourself based on these requirements, and record your
> reasoning in NOTES.md:
> - Runs in a modern desktop browser with no install; deployable as static files
> - Targets 60fps on a mid-range laptop with integrated graphics
> - Deterministic world generation from a seed
> - Architecture that can later support flying and water travel
>
> ## Art direction
> Reference images are in /inspo. Study them closely before you start and keep
> returning to them. The target look is a flat-shaded storybook illustration of
> a Nordic landscape:
> - Toon shading: 2 to 3 hard-edged light bands per surface, no gradients. Use
>   smooth normals; avoid a faceted low-poly look.
> - Thin outlines in a dark warm tone (deep brown or plum, never pure black),
>   fading out with distance.
> - Colors come from a small, desaturated, warm-leaning palette per biome and
>   time of day, not from textures. Each scene should feel close to monochrome
>   within one hue family.
> - Atmospheric depth in stepped bands: distant terrain gets paler, lower in
>   contrast, and closer to the sky color, as flat layers rather than a smooth
>   fade.
> - Soft, rounded shapes: conifers as stacked drooping scalloped tiers with a
>   slight random lean, smooth pebble-like boulders, gently rolling hills, a few
>   dominant peaks with hard-edged snow caps.
> - Terrain colored by height and slope with hard boundaries, not blends.
> - Banded sky gradient and flat-bottomed billboard clouds.
> - Night: the palette shifts to blue, and cabin windows glow warm yellow with
>   subtle bloom.
>
> ## World
> - Infinite or very large terrain, streamed in chunks around the player, with
>   LOD that simplifies distant terrain to silhouettes
> - A defined sea level with lakes and fjords (water can be a flat stylized
>   plane for now)
> - Biomes such as conifer forest, open meadow, rocky highlands, and coast
> - Sparse points of interest: small cabins, stone formations, paths
> - Place things by rules, not uniform noise: clustered groves, open clearings,
>   landmarks visible from a distance
>
> ## Player and camera
> - A simple placeholder character with walking and running
> - A movement system built so new modes (flying, swimming, boating) can be
>   added later without rewriting it
> - A third-person orbit camera, separate from movement, with a fairly narrow
>   field of view
>
> ## Sandbox tools
> - A day/night cycle
> - A debug panel with seed, time of day, fog, outline, and palette controls,
>   plus an FPS counter
>
> ## Verify your own work
> Set up headless browser screenshots (Playwright or similar) and use them
> throughout. Capture the world from several positions, at several times of
> day, and with a few different seeds. Compare them honestly against /inspo and
> keep iterating on shading, palette, fog, and composition until the
> screenshots would hold up next to the references. Also check that the frame
> rate holds up while moving through the world. Don't call it done until you've
> looked at the results and they're genuinely beautiful.

---

## How to read the references (`/inspo`)

All seven are backgrounds from *Hilda* (Netflix). What makes them work, and
what the code is trying to reproduce:

| File | Mood | What to take from it |
|---|---|---|
| `1.jpg` | Rose dawn | Near-monochrome dusty mauve. 3–4 flat distance layers, each paler toward the cream sky. Tall, slender, leaning conifers with drooping scalloped tiers and visible trunks. White snow caps with a wavy lower edge. White flat-bottomed clouds. Far-layer outlines are a darker shade of that layer, not ink. |
| `2.webp` | Coral dusk | Horizontal sky bands (purple → coral → peach). Purple clouds with a light rim along the flat bottom. Flat blue-grey water with a light streak. Pebble-like rounded rocks with mossy tops. |
| `3.webp` | Golden valley | Cream sky, olive meadows, a few big triangular peaks with hard white caps. Dark conifer clusters in the foreground. **One red cabin** as the accent, plus a winding pale path and small white flowers. |
| `4.webp` | Blue night | Everything in navy/indigo. Warm yellow windows glow. Rounded pale boulders, stars. Characters stay readable. |
| `5.webp` | Stone formations | Tall rounded rock towers and arches in warm pinks and ochres. Framing foreground trees are almost silhouettes. |
| `6.jpg` | Olive forest | Ochre/olive/brown. Big rounded blob canopies, a soft contact shadow under the tree. Dark bush silhouettes in the foreground, pale layered forest behind. |
| `7.jpeg` | Night fjord | A town of lights on a lake between steep dark mountain walls, framed by dark conifers. |

Principles that aren't obvious from the bullet list:
- **Shade is a colour, not a darkening.** It's warm purple by day and blue at
  night.
- **Value stays high-key.** Hilda almost never goes muddy-dark except in deep
  foreground silhouettes.
- **Layers, not gradients.** A whole hill or range reads as one flat tone.
  That's why the fog is per-layer (see NOTES.md, "Stepped atmospheric depth").
- **Accents are rare and deliberate:** the red cabin, the explorer, white
  snow, warm windows. Everything else obeys the monochrome grade.
