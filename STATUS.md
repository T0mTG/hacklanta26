# STATUS: Doodle Planet (round 2)

Built so far: PLAN.md Phases 0 and 1. Phases 2 to 4 are next. Round 1 (the graveyard diorama) stays on branch `long`.

## What works
- **Flow:** landing -> pick a sample drawing -> processing -> planet (the real upload and details step come in Phase 2).
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
Upload and details step, easels, people and animals, walking, dragging, the full-picture view with notes (Phases 2 to 4).
