# STATUS: Doodle Planet

Two planets, one codebase, picked on the title screen (or with `?globe=toy` / `?globe=paper`):

- **Toy Globe** (round 2): PLAN.md Phases 0 to 4, one commit per phase, then a pass that balances the trees against room for drawings. Phases 5 to 7 (polish, reliability, presentation) are not started.
- **Paper Globe**: PLAN-PAPER.md Phases 0 to 4, one commit per phase. All five are built.

Round 1 (the graveyard diorama) is the git history up to commit `b17a721`.

---

# Paper Globe

Every tree, flower, house, animal and person is a kid's drawing cut out of paper and standing up like a diorama. The Toy Globe's terrain, clouds, camera, walking, picking, sticker UI and screen flow are reused; everything that stood on the ground is replaced.

## What works
- **Flow:** title screen -> "Let's go!" (or "Just look around", or "Back to my planet" if you have been before) -> pick a drawing (demo shelf of 16, drop, choose a file, camera on touch) -> the "AI is looking at your drawing" show (scanning line and sparkles, scissors snipping around the outline, "I found a sheep!") -> the camera dives in and the cut-out falls out of the sky beside the kid with a star burst -> it acts by kind. Later additions fall in next to wherever the kid is, or beside where the planet view is turned to.
- **By kind:** trees and flowers plant themselves (they grow), houses pop up as four cards with a folded roof, people and animals walk (and keep walking for a while before they notice the kid), birds take off and loop, butterflies flutter, fish flop toward the nearest pond in one big leap or a few hops and dive in with a splash and start swimming, swans and boats float.
- **Whiteboard:** "Draw one!" on the upload screen opens a white board with 12 crayon colors, 3 brush sizes, an eraser, undo (also Ctrl+Z), clear (asks twice) and Done. The drawing is ink on a transparent canvas over white, so it is already separated from its background: `src/paper/draw/cutout.ts` takes the shape (everything the lines enclose, gaps up to about 4 percent of the size closed, specks dropped), adds the outline and paper border, traces the silhouette and guesses a house's roof line and color, in about 150 ms. Then the AI screen finds out what it is: **Gemini** (`src/paper/draw/classify.ts`, needs `VITE_GEMINI_API_KEY`, see the README) answers with a kind, a name and which way it looks; with no key, no network or any trouble the kid taps one of twelve pictures ("What did you draw?") and, for side views, an arrow ("Which way is it looking?"). "Not right?" on the reveal goes back to the pictures. It is built as the kind's element (a cat walks, a bird flies, a fish dives, a house stands as four cards with a folded roof; anything else is a paper statue), stands 30 percent bigger than a library piece, and is saved with the planet (cut-out and picture, about 50 KB) and restored after a reload.
- **The AI is a stand-in** (`src/paper/ai.ts`, `extractElements(image) => Promise<Element[]>`): a demo-shelf picture gives its own element, another picture is matched by a word in its file name (`my_cat.png` is a cat), anything else is a fixed pick from the shelf's kinds. One picture, one element. Nothing is sent anywhere.
- **World:** 753 cut-outs standing (trees, pines, palms, flowers, grass, mushrooms, rocks, lily pads, houses, doghouses, rainbows, starfish) and 148 creatures (84 walkers, 11 birds, 22 insects, 20 fish and sea creatures, 11 floaters, all paper) plus the kid, a different cast in each of the 12 regions. About 38 percent of the ground is open flat dry land with room for the kid's own things (`__paperCapacity()` says 460 more would fit at the usual spacing).
- **Paper look:** black outline, thin white paper edge, a small cardboard base, soft shadows, plants sway and curl, walkers rock and hop "on twos" (stop-motion), turns are flips about the up axis, birds fold their wings down the middle, fish bend along the body. One shared shader, one instanced mesh per cut-out.
- **Interaction:** press and drag anything anywhere on dry land (water things only into water), it floats up and drops with a squash and a star burst and the new place is saved; a short tap opens its drawing big in a polaroid frame with its name (the kid's own picture for what they added, the demo drawing for the shelf ones, the cut-out itself for the rest) and, for things the kid added, "Take it down". Tapping something far away walks over to it and opens it; tapping it in planet view flies down next to it.
- **HUD:** badge with the count of things added, button stack (planet view, "My stuff" list that takes you to each one, add a drawing, full screen, help), "Look [E]" prompt over what you stand next to, control hints until you have walked a few steps, numbered name pills over added things in planet view.
- **Saved:** things added (with the kid's own picture, kept small) and things carried somewhere else are remembered in `localStorage` under `doodle-planet:paper:v1`, separate from the Toy Globe's `doodle-planet:v1`. `?fresh` clears the planet you start on.
- **Switches:** `?globe=paper|toy`, `?lite` (about 520 cut-outs, 120 draw calls, 190k triangles, no shadows), `?screen=world`, `?fresh`, `?sheet` (every cut-out with its outline and foot drawn on).

## Controls
| Do | How |
|---|---|
| Walk | W A S D, arrows, tap the ground, touch stick |
| Look around, zoom | drag, wheel or pinch |
| See a drawing | stand next to anything and press E, or click or tap it |
| Carry something | press and drag it, let go where you want it |
| Add a drawing | the plus button |
| Planet view | G or the globe button |

## Run
```bash
npm install
npm run dev                         # or: npm run build && npm run preview
npm run cutouts                     # only to remake public/paper from dist/references/pics (installs sharp into scripts/)
```
`npm run build` keeps `dist/references` (the style videos and source pictures) instead of wiping it.

## Rough edges and things to know
- **The whiteboard's Gemini call was tried once with a real key**: a cat drawn on the whiteboard came back as kind `cat`, name "Orange Cat", looking left (right), `gemini-3.5-flash-lite` answered, and the cat was added to the planet and walked. The other models and answer shapes (fenced, unknown kind, no such model, busy, blocked, garbage, offline, quota, bad key) were tested with a stand-in `fetch`; `gemini-3.8-flash` answered 503 (busy) once, which is why a busy or out-of-quota model now moves on to the next. If a call misbehaves, `console.warn` in `classify.ts` says why and the kid is asked instead. The default models are `gemini-3.5-flash-lite` then `gemini-3.8-flash` (names from Google's model page today). With a key set, a whiteboard drawing leaves the device (a small JPEG to Google); the key is in the page, so it is for local demos. Uploaded files are not sent anywhere.
- The whiteboard cut-out takes whatever is drawn as one thing (two drawings far apart are one card). A drawing made only of lines with gaps wider than about 4 percent of its size becomes a shape you can see through at the gap. Photos are not cut out (they are not on a clean background).
- **The pictures are for the hackathon demo.** Every cut-out comes from the supplied Adobe Stock pictures except the eight crayon doodles in `public/doodles-paper`. Replace them with cleared artwork before any public release. One of the supplied drawings (the yellow character with goggles, `buddy`, who walks the village) looks like a trademarked cartoon character; swap that one first.
- Checked in one browser (the app's), at desktop and phone widths, by driving it and capturing frames, not by watching it for real: the pane renders only while it is being captured, so every timing was stepped by hand (`__sim`). I could not measure real frame rate or try a real touch device. By the numbers: about 155 draw calls and 540k triangles for the standing world, 269 draw calls and 587k triangles with everything alive (including the shadow pass), about 3.7 ms of CPU per frame; `?lite` is about 120 draw calls and 190k.
- The fake AI is obviously fake outside the demo shelf: an uploaded photo of a dog drawing called `IMG_2041.jpg` gives a fixed pick, not a dog. The "drawing it was cut out of" for a picture that is not from the shelf is just the picture the kid gave.
- Planet view name pills overlap when several things were added close together.
- Creatures near the kid stop, turn to show their picture and bounce; if the kid stands still among them they all keep doing that. Something that was just added is exempt for 16 seconds so you can watch it walk.
- Creatures on the far side of the planet wait (they are not updated) until you turn that way; falls and dives always finish.
- No sound or music. No finale moment. The camera does not follow a fish on its way to the pond.
- A new addition lands where the kid is standing, so dozens of additions in one spot get spread by the spot finder rather than stacked.
- In `npm run dev` only, helpers hang off `window` (stripped from production builds): `__shot`, `__peek`, `__look`, `__walk`, `__sim`, `__stats` (as on the Toy Globe) and, for this planet, `__paper`, `__plan`, `__items`, `__solids`, `__dyn`, `__paperCapacity()`, `__paperSpot()`, `__paperHealth(120)` (runs the world with everything awake and reports creatures that are stuck, never move or ended up in the wrong place), `__paperAdd('cat-glasses')` (drops that element in as if the AI had found it) and `window.__aiSlow = 4` (plays the AI show four times slower).

---

# Toy Globe

## What works
- **Flow:** landing -> upload -> details -> "building your easel" -> the camera dives from space to the plaza, the kid and a cat appear, and your easel falls out of the sky with a star burst while people walk over to look. Returning visitors get "Back to my planet".
- **Upload:** drag and drop, file picker, camera button on touch devices, and a shelf of the 10 sample drawings (`public/samples`, copied from `dist/references/pics`). `D` on the panel picks a surprise drawing and goes straight to the planet. Friendly errors for non-pictures, HEIC, files over 15 MB and unreadable files. Photos keep their rotation, are shrunk to 800 px, and get a 4-color crayon palette. The details step takes a name, an artist name (remembered) and a short story.
- **World:** a 12-region low-poly planet (plaza, lily pond, cherry grove, farm, picnic hill, pine woods, village, duck pond, Mount Giggle, twin hills, big lake, sunflower meadow) with biome colors, foam-shader water, ~170 outlined trees (real woods in the pine woods, the cherry grove and on the twin hills, a few clumps on the lawns, open grass around the plaza, ponds, farm and village) with ~90 bushes under the woods, flowers, wheat, sunflowers, cottages, barn, spinning windmill, tractor, boats, a rainbow gate over the pond path, clouds, gulls, songbirds and butterflies.
- **People and animals:** 1 to 3 watchers in front of every easel (they clap, cheer when an easel lands or a note is added, and follow an easel you move), a picnic family with a dog, villagers, straw-hat farmers; sheep and cows in the paddock, rabbits, ducks and ducklings on the ponds. The cat follows the kid.
- **Walking:** WASD or arrows (camera-relative), tap or click the ground to walk there, touch joystick on touch devices. Water, trees, rocks, buildings and easels block you, but you can always walk out of an overlap. The camera follows behind, drag to look around, wheel or pinch to zoom, and anything between the camera and the kid fades out in a dither pattern.
- **Easels:** wooden easel with the picture on both faces, tiny sticky notes pinned for each note, a floating gem in the drawing's color, a ring and a bigger size when you are close, a "Look [E]" prompt. Press and drag an easel to carry it anywhere on dry land; it drops with a squash, turns so its watchers stand on dry ground, and the position is saved. Dropping toward water says "Easels can't swim!". There is always room for more: about 70 easels fit on dry, flat, tree-free ground at the usual spacing, and once that fills up the spot finder relaxes its spacing instead of failing. A saved easel that ends up inside a tree after a layout change is moved to the nearest free spot when the world loads.
- **Picture view:** press `E` (or tap the easel) for the big picture in a polaroid frame with title, artist, story, color swatches, **sticky notes** (write a note, pick a color, "Stick it!"; delete your own), prev/next arrows and a thumbnail strip. Arrow keys cycle, Esc closes.
- **Planet view:** `G` or the globe button. Spin with inertia, zoom, and numbered title pills (plus a "You" pill) float over every easel. "My drawings" lists everything; tap one to be taken there.
- **HUD:** badge with the drawing count (tap for the title screen), button stack (planet view, my drawings, add a drawing, full screen, help), place-name banner when you enter a region, control hints until you have walked a few steps.
- **Saved:** drawings, notes, easel positions and the artist name are remembered in `localStorage`. `?fresh` clears them.
- **Switches:** `?lite` (half the content, no shadows, no dither), `?screen=world` (skip the intro), `?fresh`.

## Controls
| Do | How |
|---|---|
| Walk | W A S D, arrows, tap the ground, touch stick |
| Look around, zoom | drag, wheel or pinch |
| See a drawing | stand next to an easel and press E, or click or tap it |
| Move an easel | press and drag it |
| Planet view | G or the globe button |

## Rough edges and things to know
- I checked the build at phone width and through captured frames, including walking, dragging, notes, planet view and the first-run dive. I did not run it on a real touch device or in browsers other than the one in the app, and I could not measure real frame rate there. Planet view with shadows is about 440 draw calls and 500k triangles (`renderer.info`); `?lite` is about 230 draw calls.
- Label pills in planet view can overlap when easels are close together, and they sit under the button stack on narrow screens.
- No sound or music. No finale moment.
- Uploads are stored as JPEGs of up to 800 px, roughly 100 to 250 KB each, so about 20 uploads fit in `localStorage`; a toast warns when it is full.
- The 10 sample pictures are the images supplied in `dist/references/pics`; replace them with cleared artwork before any public release. The six neighbor doodles in `public/doodles` are original.
- In `npm run dev` only, a few helpers hang off `window` (`__shot`, `__peek`, `__sim`, `__look`, ...) for inspecting the scene. They are stripped from production builds. `__capacity()` reports how many easels fit; check it after adding trees or buildings (it was 19 with the first, denser forest and is about 73 now).

---

## Where things live
`src/world` the planet, terrain, regions, camera rig, collisions, spot finding, the globe switch. `src/entities` Toy Globe easels, people, animals, the walker, the kid, easel dragging, and the shared movement hook. `src/paper` the Paper Globe (kinds table, cut-out library, card geometry and shader, layout, creatures, the fake AI, spawning, dragging, picture view). `src/ui` HUD, picture view, panels, labels. `src/screens` landing, upload, processing. `src/lib` noise, sphere math, the low-poly kit, dither patch, image processing. `scripts` the cut-out script. The bundle is about 1.6 MB (no code splitting).
