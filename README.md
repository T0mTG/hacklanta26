# Art Gallery - Globe Version

**Doodle Planet** is a tiny low-poly planet where every kid's drawing gets its own easel. Upload a drawing, drag its easel anywhere on the globe, walk up to it and open the full picture, then stick notes on it.

The planet is alive: a picnic family, people who stop to look at each drawing, sheep, ducks, butterflies and birds. It runs in the browser, and nothing leaves the device. Drawings and notes are kept in `localStorage`.

![The plaza, seen from above](docs/screenshots/plaza-from-above.jpg)

| Walking around | The big lake |
|---|---|
| ![Walking view with two easels, benches and a cat](docs/screenshots/walking-view.jpg) | ![The lake with lily pads and a sailboat](docs/screenshots/lake-view.jpg) |

## Run it

Needs Node 20.19+ or 22.12+.

```bash
npm install
npm run dev
```

To build and serve the production version: `npm run build && npm run preview`.

## How to play

| Do | How |
|---|---|
| Walk | W A S D, arrow keys, tap or click the ground, touch stick |
| Look around, zoom | drag, wheel or pinch |
| See a drawing | stand next to an easel and press E, or click or tap it |
| Add a note | open a drawing, write, pick a color, "Stick it!" |
| Move an easel | press and drag it |
| Planet view | G or the globe button |

Page switches: `?lite` (half the content, no shadows, easier on slow devices), `?screen=world` (skip the intro), `?fresh` (forget saved drawings).

## Adding a drawing

Pick a file, drop one on the page, use the camera button on a touch device, or tap one of the ten sample drawings. Then give it a name, say who drew it and write a short story. Photos keep their rotation, are shrunk to 800 px and get a four-color palette. Uploads are stored as JPEGs, so about 20 fit in the browser's `localStorage`.

## Built with

Vite, React 19, TypeScript, three.js with react-three-fiber and drei, Zustand (saved to `localStorage`), Tailwind v4 plus hand-written "sticker" CSS, and framer-motion. Fonts are Fredoka, Nunito and Caveat through Fontsource.

There are no 3D model files. Trees, buildings, people and animals are built in code (`src/lib/kit.ts`) from flat-shaded, vertex-colored parts with dark outlines.

## Where things live

| Folder | What is in it |
|---|---|
| `src/world` | the planet, terrain, regions, tree and building layout, camera rig, collisions, easel spot finding |
| `src/entities` | easels, people, animals, the walker, the kid, easel dragging |
| `src/ui` | HUD, picture view with notes, panels, labels |
| `src/screens` | landing, upload, processing |
| `src/lib` | noise, sphere math, the low-poly kit, image processing |
| `public/doodles` | six original neighbor drawings that are on the planet from the start |
| `public/samples` | the ten sample drawings on the upload shelf |

## Notes

- The ten drawings in `public/samples` were supplied as reference pictures. Swap in artwork you have the rights to before sharing the project widely. The six doodles in `public/doodles` are original.
- `dist/` is not in git. The style reference video and source pictures live in `dist/references` on the author's machine, and `npm run build` keeps that folder instead of wiping it.
- Checked in one browser at desktop and phone widths. Not tried on a real touch device or in other browsers yet.
- [STATUS.md](STATUS.md) lists what works and the rough edges. [PLAN.md](PLAN.md) is the plan.
- Round 1 of the project was a paper-craft graveyard diorama, "The Afterlife of Darlings". It is the git history up to commit `b17a721`.
