# STATUS: Doodle Planet (round 2)

Built so far: PLAN.md Phases 0, 1 and 2. Phases 3 and 4 are next. Round 1 (the graveyard diorama) stays on branch `long`.

## What works
- **Flow:** landing -> upload panel -> details -> processing -> planet. Returning visitors get "Back to my planet".
- **Upload:** drag and drop, file picker, camera button on touch devices, and a shelf of the 10 sample drawings (`public/samples`, from `dist/references/pics`). Press `D` on the panel for a surprise drawing that goes straight to the planet.
- **Intake:** friendly errors for non-pictures, phone HEIC photos, files over 15 MB and unreadable files. Photos keep their rotation, are shrunk to 800 px, flattened on white, and get a 4-color palette read from the crayon colors (paper and ink are skipped).
- **Details step:** name (defaults from the filename), artist name (remembered), short story.
- **Saved:** artworks, notes and the artist name are remembered in `localStorage` (`?fresh` clears them). If storage is full a toast says the planet will not be remembered.
- **World:** a 12-region low-poly planet (plaza, lily pond, cherry grove, farm, picnic hill, pine woods, village, duck pond, Mount Giggle, twin hills, big lake, sunflower meadow) with biome vertex colors, foam-shader water, ~490 outlined trees, bushes, rocks, ~1,900 flowers, grass, wheat, sunflowers, mushrooms, lily pads, cottages, barn, spinning windmill, fence, benches, signpost, tractor, well, boats, picnic blanket and a rainbow gate.
- **Sky life:** drifting outlined clouds, circling gulls and songbirds, flitting butterflies.
- **Look:** flat shading, inflated-hull outlines, CSS sky, grain and vignette, camera-following sun with soft shadows, sticker UI kit.
- **Camera:** the title screen turns the planet; planet view lets you spin it (with inertia), zoom with wheel or pinch.
- `?lite` halves the content and drops shadows. `?screen=world` skips the intro.

## Run
```bash
npm install
npm run dev        # or: npm run build && npm run preview
```

## Not done yet
Easels on the planet (so uploads are stored but not yet drawn in the world), people and animals, walking, dragging, the full-picture view with notes (Phases 3 and 4).
