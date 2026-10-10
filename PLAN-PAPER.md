# Paper Globe: Plan

One-liner: *The same tiny planet, but everything on it is a real kid's drawing, cut out of paper and standing up like a diorama.*

The Paper Globe sits next to the Toy Globe (Doodle Planet, see [PLAN.md](PLAN.md)). One codebase, one camera, one UI kit, one terrain. Only what stands on the ground is different.

**Decision rule** (same as the rest of the project): demo impact beats sophistication, reliability beats architecture, kid-first (big targets, almost no reading, nothing scary, nothing leaves the device). The AI step is **faked** and says so in the code.

---

## 1. What stays and what goes

| Kept from the Toy Globe | Removed on the Paper Globe |
|---|---|
| Planet geometry, hills, mountains, ponds with foam (`terrain.ts`, `regions.ts`, `Planet.tsx`, `sphere.ts`) | Procedural 3D trees, bushes, rocks, flowers, buildings, fences, crops |
| Clouds and the sky (`Atmosphere`, `Sky`) | People, animals, boats, the picnic family, the easels |
| Camera rig with walk and planet modes (`rig.ts`, `CameraRig.tsx`) | Gulls and songbirds of the toy globe (paper birds replace them) |
| Sticker UI kit, screens (landing, upload, processing, world), HUD, planet view | |
| Pointer picking and dragging (`pick.ts`), spot finding (`findSpot`, `easelCapacity`), collisions (`collide.ts`), the `Walker` | |
| The persisted Zustand store pattern | |

The terrain colors are tuned per globe (`terrain.ts`, `PALETTES`): the paper palette is paler, so the crayon colors of the cut-outs are what the eye goes to.

## 2. What the style references taught

**`ref-tree.png`: two paper trees on a table.** Each tree is TWO flat cut-outs slotted together at right angles. The drawing is colored in, outlined in black, cut out with a thin white paper edge, and stands on a tiny cardboard base (one has a brick pattern). The paper is slightly bent and you can see its edge from the side. -> Plants are two (or three) crossed cards of the same cut-out plus a small cardboard base. Cards are real meshes with a visible edge, a slight curl and a soft shadow that follows the cut-out shape.

**`paper-like.mp4` (15 s, a paper-puppet music video).** Photo-printed paper heads on paper bodies hang from strings against a saturated blue wall. Things worth copying:
- The paper **turns around its vertical axis**: a head swings from face-on through a three-quarter view to edge-on and back. Perspective foreshortening is most of the charm. -> Turning is a flip about the up axis, and the card passes edge-on.
- Cards are **bent, not flat**: heads show a vertical crease, hands curl, arms flex at hinges. -> A per-card curl and a fold line, done in the vertex shader.
- **Stop-motion cadence**: motion happens in steps and the puppets wobble and sway between them, with smear on fast moves. -> Walking is rocking left and right plus small hops, posed at about 12 steps a second.
- Soft, even, slightly cool light with very little hard shadow, and the edges of the paper catch light as thin white lines. -> Strong hemisphere light, a soft sun, a visible cream paper edge.
- A cut to a paper-collage burst between shots. -> The "spawn" star burst.

**`globe_1.mp4`** (unchanged from round 2): flat teal void, pastel planet, drifting outlined clouds, grain over everything. The Paper Globe keeps the camera, clouds and grain and only makes the ground paler.

## 3. Assets (inspected, see section 8 for the pipeline)

13 pictures in `dist/references/pics` (Adobe Stock and sample drawings, gitignored). Contents:

| File | Contents | Used for |
|---|---|---|
| `AdobeStock_374926901.jpeg` 3789x3959, white | ~150 crayon-style doodles: fish, dolphin, duck, rabbit, deer, zebra, giraffe, elephant, rhino, rooster, hedgehogs, cats, dog, horse, lion, sheep, cow, pig, goat, bear, fox, squirrel, monkey, kangaroo, camel, panda, frog, snail, caterpillar, mouse, toucan, swan, stork, peacock, jellyfish, butterflies, bee, boy, girls, princess, mom, toddler; pine, palm and apple trees; flowers; two houses; cars, boat, bicycle; sun, clouds, stars, hearts, fruit | the main set |
| `AdobeStock_501863760.jpeg` 5521x2717, cream | ~100 flat "paper-cut" doodles: elephants, lion, leopard, giraffe, unicorn, tigers, flowers on stems, trees, rainbows, leaves, grass, fruit | secondary set for some regions |
| `AdobeStock_641878981.png` 4568x3552 | four painted stick figures (a family) holding hands | people |
| `pic1.webp` | yellow dog sitting in front of a red doghouse | dog, doghouse |
| `pic2.webp` | marker family with sun, bush and flowers (335 px, low resolution) | not used |
| `pic3.jpg` | cute blue whale in a wooden frame | whale (swims in the big lake) |
| `pic4.jpg` | yellow bird with a pink tail | bird |
| `pic5.jpg` | house with a red tile roof, kites, pond | house |
| `pic6.jpg` | rainbow chameleon on a branch, sun, leaves | chameleon, leaves |
| `pic7.jpg` | smiling buddy in blue overalls waving | person |
| `pic8.jpg` | scribble monster (a hand holding a pen in the photo) | monster |
| `pic9.jpg` | green planet with balloons, kids, houses | not used |
| `pic10.jpg` | big ship on the sea with gulls | ship, seagull |

**Result of Phase 1: 138 cut-outs** (79 from the crayon sheet, 38 from the flat sheet, 4 family members, 12 from the sample drawings, 9 original SVG doodles), for 70 kinds: 16 blossoms, 12 flowers, 11 people, 6 rainbows, 4 trees, 4 pines, 2 palms, 3 houses plus a doghouse, about 30 kinds of animals, 3 butterflies and a bee, 3 fish plus a dolphin, a whale and a jellyfish, and boats. There are enough distinct pictures. What the sheets do not have (mushrooms, rocks, lily pads, reeds, and two more fish so the ponds are not one fish repeated) is drawn as original crayon-style SVG doodles in `public/doodles-paper`. Left out on purpose: the scribble monster (a hand and a pen are in the photo), the low-resolution marker family, the planet drawing, and anything scary (snake, crocodile, spider, bat). Hearts, stars, moons and suns are decoration, not things that live on a planet.

Fish are the thinnest set (the crayon sheet has one). The world varies copies with a hue shift in the shader, so a blue fish can be green or pink, and the SVG fish add two more shapes.

The 16 pictures on the demo shelf (tree, cat, dog, fish, flower, person, house, bird, butterfly, mushroom, sheep, cow, elephant, unicorn, whale, chameleon) keep their original crop in `public/paper/raw` so the fake AI has a picture to look at.

## 4. Architecture

```
src/world/variants.ts     GlobeId, the two VariantInfo records, which globe to open first (?globe=, last choice)
src/store.ts              `globe` + one persisted store, split by a storage adapter into two localStorage keys
src/world/Scene.tsx       shared light, terrain, camera; picks ToyContent or PaperContent
src/world/ToyContent.tsx  everything that stood on the planet before (unchanged behavior)
src/paper/*               the Paper Globe: library, cards, materials, layout, life, kid, drag, demo flow
scripts/                  one-off asset tooling (its own package.json, sharp)
```

- **World variant switch.** `useStore().globe` is `'toy' | 'paper'`. The landing screen shows two big sticker buttons; picking one swaps the content behind the title live. `?globe=paper` opens it directly; the last choice is remembered. `collide.ts` takes its solid obstacles from whichever globe is mounted (`staticObstacles`).
- **Saved data per globe.** Toy: `doodle-planet:v1` (unchanged). Paper: `doodle-planet:paper:v1`, holding only what the kid changed (elements they added, elements they carried somewhere new), because everything the world starts with has a stable id.
- **The library** (`src/paper/library.gen.ts`, written by the cut-out script) is a data table. Each entry is `{ id, label, kind, shape, behavior, size, ... }` plus the texture size, the cut-out outline and a few colors. `shape` is `plant | building | card`, `behavior` is `static | walker2 | walker4 | bird | insect | fish | floater`. A kind table supplies the defaults, so a new kind is one line.
- **A card** is a thin double-sided paper mesh: one grid for the face (so the vertex shader can bend it, drawn on both sides, so the back is the drawing seen from behind, which is what turning around looks like), a ribbon of cream paper edge along the cut-out outline (at most 44 points, so a card seen from the side has real thickness), and a few vertex-colored parts (cardboard base, house roof and corner posts). The back of a person is plain colored paper instead of a mirrored face. The outline comes from the script, and shadows follow it (alpha-tested depth with the same bending).
- **Plants** are 2 (or 3) crossed cards plus a base. **Buildings** are 4 cards forming a box plus a folded roof and corner posts. **Walkers, birds, insects, fish, floaters** are single cards with their own motion.
- **Instancing.** One `InstancedMesh` per cut-out (about 80), sharing one shader. Sway, curl, wing fold and fish bend are vertex shader math driven by a per-instance phase, so 300+ cut-outs stay cheap. `?lite` halves the counts and drops shadows.
- **Behaviors** are small state machines on the sphere (`dir` + `fwd`), using the terrain helpers: stay on land (or in water for fish), avoid steep slopes, never get stuck, look at the kid when they come close.
- **The fake AI** (`extractElements(image) => Promise<Element[]>`): a scanning screen with lines, sparkles and scissors tracing the real outline, then "I found a tree!". The result comes from the library: a demo-shelf pick is used directly, any other upload is matched by a filename keyword, else by a deterministic pick. It is one function so a real vision model could replace it. Nothing is sent anywhere.

## 5. Work plan (one commit per phase, nothing pushed)

| Phase | Output | Definition of done |
|---|---|---|
| **0** Plan and skeleton | this file, the world-variant switch, the landing choice, paper palette | the Paper Globe shows terrain and clouds; the Toy Globe behaves as before |
| **1** Assets | cut-out script, `public/paper/*.webp`, library, debug sheet | every cut-out checked by eye; no halos; each has `{ id, label, kind, shape, behavior, size }` |
| **2** Paper statics | crossed-card plants, 4-card buildings, outline + paper edge + shadows + sway; the world filled by region | free space measured (`__paperCapacity()`); 700 cut-outs in 155 draw calls |
| **3** Paper life | walker2, walker4, bird, insect, fish, floater with paper motion; the world populated | nothing gets stuck over a long simulated run |
| **4** The demo | upload + demo shelf, fake AI reveal, spawn, drag, tap to view, save and restore, HUD, `?lite` | a kid can add a drawing and watch it come alive; verified (tsc, build, frames, fresh clone) |

## 6. Decisions

- **Live switch, not a reload.** One store, content swapped under the canvas; both terrains are cached so switching is instant after the first build.
- **Own package for the image tooling.** `scripts/package.json` holds `sharp`, so the app's install stays lean. `npm run cutouts` installs it on demand and runs the script.
- **Faces on a grid, edge from the outline.** Face geometry is a grid (so it can bend); the paper edge is a ribbon built from the simplified cut-out outline. No triangulation of arbitrary polygons, so no failure cases.
- **Back faces.** One double-sided face per card. Animals and plants show their drawing from behind (a flip makes an animal face the other way, like turning a sheet of paper). People (front views) show a plain colored paper back, so walking away from the camera does not make a face look back at you. A mirror flip for variety is just a half turn.
- **Hue shifts only touch green on trees**, so an apple tree can blossom pink while its trunk stays brown; flowers and fish shift every color.
- **Picking is done by hand** (rays against a capsule per item) instead of raycasting the instanced meshes: 700 cut-outs are about 400k triangles, far too many to test on every pointer move.
- **Orientation of walkers.** Front-view drawings (people) face the way they walk. Side-view drawings (animals) walk along their own length. When the kid comes close they turn face-on and hop.
- **The player is a paper kid**, the same kind of card as everyone else, and the cat that follows them is a paper cat.
- **Rocks, mushrooms, lily pads** are original crayon SVG doodles, since the picture sheets have none.
- **Adobe Stock pictures are for the hackathon demo** and must be replaced with cleared artwork before any public release (also said in the README).

## 7. Risks

| Risk | Fix |
|---|---|
| Hundreds of textures and draw calls | One shared shader, instanced per cut-out, textures at most 448 px; `?lite` |
| Cards edge-on look like they vanished | Walkers favor poses that face the camera when they pause; flips are fast |
| Shader patch breaks on a three.js update | One module (`paperMaterial.ts`) holds every patch, with a plain material fallback |
| Walkers stuck on trees or houses | Same `stepBlocked` rule as the toy globe (anything overlapping can always leave) plus a stuck timer that re-picks a target |
| localStorage full | Same toast and in-memory fallback as the toy globe; uploads are stored as small JPEGs |

## 8. Cut-out pipeline

`npm run cutouts` (installs `sharp` into `scripts/` on first use) runs `scripts/build-cutouts.mjs`. It reads `scripts/cutouts.manifest.json`: sheets, and one explicit crop rectangle per element (chosen by eye from labelled contact sheets made with `scripts/sheet-components.mjs`, `scripts/tile.mjs` and `scripts/crop-grid.mjs`). For each element it:

1. crops the rectangle and finds the lines of the drawing (pixels that are not paper, or only the dark ones for pictures that have a colored background);
2. widens the lines a little so small gaps stay shut, and floods from the edge of the crop: the page is everything the flood reaches, so everything a line encloses (white wool, a window, a belly) stays;
3. keeps the main drawing (and, when asked, its other big parts), shrinks the cut back to the lines, and applies drop rectangles, a clipping polygon or page colors where a neighboring drawing touches;
4. scales it (at most 420 to 460 px), adds a thin black outline and a white paper border from a distance transform, and trims;
5. traces the silhouette with marching squares, simplifies it to at most 84 points, finds where the foot is and the main colors;
6. writes `public/paper/<id>.webp`, `public/paper/raw/<id>.jpg` for shelf pictures, and `src/paper/library.gen.ts`.

`node scripts/build-cutouts.mjs --contact <dir>` also writes contact sheets (every cut-out on grass) for checking by eye, and `?sheet` in the app shows the same library with the outline and the foot drawn on top. The whole run takes about 10 seconds.

## 9. Phase 2 results

- 742 static cut-outs (127 per region on average, the plaza and the ponds lighter, the woods and the meadow denser), in 155 draw calls and about 540k triangles per frame including the shadow pass (`?lite`: 427 cut-outs, 85 draw calls, 184k triangles). The CPU side of a frame is about 2 ms.
- Free ground after the layout: 38 percent of the planet is open, and `__paperCapacity()` finds room for about 476 more things at 1.2 units apart (the Toy Globe had room for 73 easels at 3.2 units apart).
- Hat tip to the reference: the crossed cards look like `ref-tree.png` from every side, the shadows follow the cut-out, and the card edges catch the light as thin cream lines.
