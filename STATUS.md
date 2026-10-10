# STATUS: Doodle Planet (round 2)

Built: PLAN.md Phases 0 to 4 on branch `round-2-globe`, one commit per phase. Phases 5 to 7 (polish, reliability, presentation) are not started. Round 1 (the graveyard diorama) is untouched on branch `long`.

## What works
- **Flow:** landing -> upload -> details -> "building your easel" -> the camera dives from space to the plaza, the kid and a cat appear, and your easel falls out of the sky with a star burst while people walk over to look. Returning visitors get "Back to my planet".
- **Upload:** drag and drop, file picker, camera button on touch devices, and a shelf of the 10 sample drawings (`public/samples`, copied from `dist/references/pics`). `D` on the panel picks a surprise drawing and goes straight to the planet. Friendly errors for non-pictures, HEIC, files over 15 MB and unreadable files. Photos keep their rotation, are shrunk to 800 px, and get a 4-color crayon palette. The details step takes a name, an artist name (remembered) and a short story.
- **World:** a 12-region low-poly planet (plaza, lily pond, cherry grove, farm, picnic hill, pine woods, village, duck pond, Mount Giggle, twin hills, big lake, sunflower meadow) with biome colors, foam-shader water, ~490 outlined trees, flowers, wheat, sunflowers, cottages, barn, spinning windmill, tractor, boats, a rainbow gate over the pond path, clouds, gulls, songbirds and butterflies.
- **People and animals:** 1 to 3 watchers in front of every easel (they clap, cheer when an easel lands or a note is added, and follow an easel you move), a picnic family with a dog, villagers, straw-hat farmers; sheep and cows in the paddock, rabbits, ducks and ducklings on the ponds. The cat follows the kid.
- **Walking:** WASD or arrows (camera-relative), tap or click the ground to walk there, touch joystick on touch devices. Water, trees, rocks, buildings and easels block you, but you can always walk out of an overlap. The camera follows behind, drag to look around, wheel or pinch to zoom, and anything between the camera and the kid fades out in a dither pattern.
- **Easels:** wooden easel with the picture on both faces, tiny sticky notes pinned for each note, a floating gem in the drawing's color, a ring and a bigger size when you are close, a "Look [E]" prompt. Press and drag an easel to carry it anywhere on dry land; it drops with a squash, turns so its watchers stand on dry ground, and the position is saved. Dropping toward water says "Easels can't swim!".
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

## Run
```bash
npm install
npm run dev                         # or: npm run build && npm run preview
```
`npm run build` keeps `dist/references` (the style video and sample pictures) instead of wiping it.

## Rough edges and things to know
- I checked the build at phone width and through captured frames, including walking, dragging, notes, planet view and the first-run dive. I did not run it on a real touch device (the joystick and camera button are untested on touch) or in browsers other than the one in the app, and I could not measure real frame rate there. Planet view with shadows is about 440 draw calls and 500k triangles (`renderer.info`); `?lite` is about 230 draw calls.
- Label pills in planet view can overlap when easels are close together, and they sit under the button stack on narrow screens.
- No sound or music. No finale moment.
- Uploads are stored as JPEGs of up to 800 px, roughly 100 to 250 KB each, so about 20 uploads fit in `localStorage`; a toast warns when it is full.
- The 10 sample pictures are the images supplied in `dist/references/pics`; replace them with cleared artwork before any public release. The six neighbor doodles in `public/doodles` are original.
- In `npm run dev` only, a few helpers hang off `window` (`__shot`, `__peek`, `__sim`, `__look`, ...) for inspecting the scene. They are stripped from production builds.
- Bundle is ~1.3 MB (no code splitting).

## Where things live
`src/world` the planet, terrain, regions, camera rig, collisions, spot finding. `src/entities` easels, people, animals, the walker, the kid, easel dragging. `src/ui` HUD, picture view, panels, labels. `src/screens` landing, upload, processing. `src/lib` noise, sphere math, the low-poly kit, dither patch, image processing.
