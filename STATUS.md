# STATUS: Doodle Planet (round 2)

Built so far: PLAN.md Phases 0 to 3. Phase 4 (walking, dragging, the full-picture view with notes) is next. Round 1 (the graveyard diorama) stays on branch `long`.

## What works
- **Flow:** landing -> upload panel -> details -> processing -> planet. Returning visitors get "Back to my planet".
- **Upload:** drag and drop, file picker, camera button on touch devices, and a shelf of the 10 sample drawings (`public/samples`, from `dist/references/pics`). `D` on the panel picks a surprise drawing and goes straight to the planet. Friendly errors for non-pictures, HEIC, files over 15 MB and unreadable files. Photos keep their rotation, are shrunk to 800 px and get a 4-color crayon palette.
- **Easels:** every drawing is a wooden easel with the picture on both faces (contain-fit, paper border), tiny sticky notes pinned for each note, a floating gem in the drawing's color so easels are easy to spot, a ring when selected. A new upload falls out of the sky with a squash landing and a star burst, and the globe turns to watch it.
- **Neighbors:** six original crayon doodles by made-up kids (`public/doodles`) are on the planet from the start, each with a pre-written note, so uploads never duplicate them.
- **People:** chunky low-poly kids and grown-ups with different hair, glasses, hats and backpacks. 1 to 3 **watchers** stand in front of every easel, clap now and then, cheer when an easel lands, and walk over when a new one appears. A picnic family (mom waving from the blanket, a girl, dad, a toddler, a dog), villagers and straw-hat farmers wander.
- **Animals:** sheep and cows in the farm paddock, sheep on the twin hills, rabbits that hop, ducks and ducklings on the three ponds, a cat in the plaza, the family dog.
- **World:** 12-region low-poly planet with biome vertex colors, foam-shader water, ~490 outlined trees, ~1,900 flowers, wheat, sunflowers, cottages, barn, spinning windmill, fence, tractor, boats, a rainbow gate; clouds, gulls, songbirds and butterflies.
- **Planet view:** numbered title pills float over each easel; spin with inertia, zoom with wheel or pinch.
- **Saved:** drawings, notes and the artist name are remembered in `localStorage` (`?fresh` clears them).
- `?lite` halves the content and drops shadows. `?screen=world` skips the intro.

## Run
```bash
npm install
npm run dev        # or: npm run build && npm run preview
```

## Not done yet
Walking around as the kid, dragging easels, opening a drawing to see it big and leave notes (Phase 4). No sound.
