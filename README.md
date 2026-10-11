# Artdobe

**Artdobe** is a tiny planet where kids' drawings come to life. There are two planets, and you pick one on the title screen:

- **Toy Globe**: a low-poly planet where every drawing gets its own easel. Upload a drawing, drag its easel anywhere on the globe, walk up to it, open the full picture and stick notes on it.
- **Paper Globe**: the same planet, but everything on it is a real drawing cut out of paper and standing up like a paper-craft diorama. Every tree, flower, house, animal and person is a kid's drawing. Show the planet a drawing (pick one, upload one, or **draw it on a whiteboard** with crayon colors), an "AI" finds the thing in it and cuts it out, and it drops out of the sky next to you and comes alive: the tree plants itself, the cat walks off, the fish dives into the nearest pond.

Both run in the browser, nothing leaves the device (one opt-in exception: with a Gemini key set, a whiteboard drawing is sent to Google to find out what it is, see [the whiteboard](#the-whiteboard)), and each keeps its own saved state in `localStorage`.

![The Paper Globe seen from outside](docs/screenshots/paper-planet.jpg)

| Walking on the Paper Globe | The big lake |
|---|---|
| ![Paper cut-outs on the lawn: a kid, an apple tree, a rainbow, flowers](docs/screenshots/paper-walking.jpg) | ![The lake from above with a ship, fish, palms and lily pads](docs/screenshots/paper-lake.jpg) |

| Pick a drawing | The "AI" finds what is in it |
|---|---|
| ![The upload shelf with 16 demo drawings](docs/screenshots/paper-upload.jpg) | ![A whale cut out of its drawing, "I found a whale!"](docs/screenshots/paper-ai-found.jpg) |

The Toy Globe:

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
| See a drawing | stand next to it and press E, or click or tap it (the Toy Globe: an easel; the Paper Globe: anything) |
| Talk to a character (Paper Globe) | open its picture, then type in the chat box or press Mic; it answers in its own voice |
| Move something | press and drag it: an easel on the Toy Globe, any tree, animal, house or person on the Paper Globe |
| Add a note (Toy Globe) | open a drawing, write, pick a color, "Stick it!" |
| Add a drawing (Paper Globe) | the plus button, then pick a demo drawing or one of your own |
| Planet view | G or the globe button |
| Music | starts on your first click; the note button mutes it (and it quietens while a character speaks) |

Page switches: `?globe=paper` or `?globe=toy` (pick the planet), `?lite` (half the content, no shadows, easier on slow devices), `?screen=world` (skip the intro), `?fresh` (forget what was saved on that planet), `?sheet` (the Paper Globe's cut-out library on one page, with outlines and feet drawn on), `?noai` (never ask the cloud AI what a whiteboard drawing is, or to answer in a chat), `?novoice` (characters answer in text only, nothing is spoken).

## Adding a drawing

**Toy Globe.** Pick a file, drop one on the page, use the camera button on a touch device, or tap one of the ten sample drawings. Then give it a name, say who drew it and write a short story. Photos keep their rotation, are shrunk to 800 px and get a four-color palette. Uploads are stored as JPEGs, so about 20 fit in the browser's `localStorage`.

**Paper Globe.** Press **Draw one!** for the whiteboard (below), pick a file, drop one, or tap one of the 16 demo drawings (one drawing, one thing: a tree, a cat, a dog, a fish, a flower, a person, a house, a bird, a butterfly, a mushroom, a sheep and so on). There is nothing to fill in. A short "AI is looking at your drawing" show plays (scanning lines, sparkles, scissors snipping around the outline, then "I found a cat!"), and the cut-out falls from the sky next to you with a star burst. Tap anything to see its drawing big, with its name. Things you added can be taken down again from that view.

### The whiteboard

**Draw one!** opens a white board with 12 crayon colors, three brush sizes, an eraser, undo and clear. Because the drawing is ink on a clean white board, cutting it out needs no guessing: the strokes are the drawing. Everything the lines enclose becomes the paper (small gaps in an outline are closed, so a cat drawn only as a line still gets a body), a thin black outline and a white paper border go around it, and the shape is traced for the paper edge (`src/paper/draw/cutout.ts`, the same steps as the script that made the library's cut-outs, and about 150 ms).

Then the planet has to learn *what* it is, so it knows how it behaves (a cat walks, a bird flies, a fish swims, a house stands as four cards with a roof). There are two ways, and the second always works:

1. **Gemini (needs an API key).** Get a key at [Google AI Studio](https://aistudio.google.com/apikey), copy `.env.example` to `.env.local`, put it in `VITE_GEMINI_API_KEY=` and restart `npm run dev`. The drawing (a small JPEG, nothing else) is sent to Google's Gemini API, which answers with one of the planet's kinds, a friendly name ("Red car") and which way the thing looks. The kid can say "Not right?" and pick for themselves. `VITE_GEMINI_MODEL` changes the model (default `gemini-3.5-flash-lite`, then `gemini-3.8-flash`); `src/paper/draw/classify.ts` is the only place a drawing leaves the device. The key is built into the page, so this is for local demos: put a small server in front of it before putting the app online. `?noai` switches it off.
2. **The kid picks.** With no key, no network, or a refusal, the AI screen asks "What did you draw?" with twelve big pictures (tree, flower, house, person, cat, dog, bird, butterfly, fish, car, mushroom, something else), and for things seen from the side "Which way is it looking?" with two arrows.

What the kid drew is saved with the planet (the cut-out and the picture, about 50 KB each), comes back after a reload, stands a little bigger than the library's pieces, and can be carried, tapped and taken down like everything else.

### Music

A slow, sparse, original piece plays under both planets: soft piano-like notes over a warm pad, four gentle chords, long silences. It is made live with Web Audio in `src/lib/music.ts`, so there is no audio file and nothing to license. It starts on the first click or key press (browsers do not allow sound before that), the note button in the corner mutes it and the choice is remembered. Change the chords or the tempo at the top of that file.

### Talking to the characters

Tap any character on the Paper Globe to open its picture, and a chat box sits under its name. Type (or press **Mic**, talk, then **Stop**) and the character answers as itself: a cat, a tree, a whale, a house, in a sentence or two of simple words.

- **Animals make their noise.** A cat says "Meow!", a duck "Quack quack!", a pig "Oink oink!", a fish "Glub glub!" (`src/paper/talk/sounds.ts`, one line per kind, a few variations each). The animal's real noise is made once by ElevenLabs sound effects (the key needs that permission; it is kept for the session and costs a few credits per kind), then it says a few small words in its voice: Gemini picks them ("Hi friend!"), or a fixed list does when there is no Gemini key. If the sound effect fails, the written noise is spoken instead.
- **Gemini writes the answer** for everything that is not an animal (a person, a tree, a house, a thing), in one short sentence, (`src/paper/talk/chat.ts`), with the same `VITE_GEMINI_API_KEY` and model fallbacks as the whiteboard. Without a key the character says it cannot talk yet.
- **ElevenLabs says it out loud** (`src/paper/talk/voice.ts`). Get a key at [ElevenLabs](https://elevenlabs.io/app/settings/api-keys) (it needs the text-to-speech permission), put it in `.env.local` as `VITE_ELEVENLABS_API_KEY=` and restart `npm run dev`. There are four voices: male, female, mom and dad (`src/paper/talk/roles.ts`). A name like "Mom", "Grandpa", "girl" or "king" decides first, then the kind (a lion or a rooster is male; a cat or a butterfly is female), then the character's id, so each one always keeps its voice. A person with nothing to go on is a mom or a dad. `VITE_ELEVENLABS_VOICE_MALE`, `_FEMALE`, `_MOM` and `_DAD` set your own voices; `VITE_ELEVENLABS_VOICE_ID` uses one voice for everybody. Without a key the answers are shown as text.
- What leaves the device: the chat so far (to Google) and the character's reply (to ElevenLabs). The Mic records your voice and, with an ElevenLabs key (it also needs the speech-to-text permission), sends that recording to ElevenLabs to turn it into words; without one it uses the browser's own speech recognition, which only some browsers have. Press Mic, talk, press Stop. As with the whiteboard, the keys are built into the page, so this is for local demos. `?noai` and `?novoice` switch the two off.

### The demo-shelf AI is a stand-in

Nothing looks at the picture. `src/paper/ai.ts` has one function, `extractElements(image) => Promise<Element[]>`, that a real vision model could replace without touching the screens. Today it picks from a prepared library of 138 cut-outs: a demo-shelf picture gives the thing it is a picture of; any other picture is matched by a word in its file name (`my_cat.png` gives a cat); otherwise it is a fixed pick based on the picture itself, so the same picture always gives the same thing.

### What the planet is made of

Each cut-out is a webp in `public/paper` with a black outline and a thin white paper border, listed in `src/paper/library.gen.ts` with its kind. `src/paper/kinds.ts` is the data table behind everything: a kind says what it is made of (two or three cards crossed like a plant, four cards and a folded roof for a house, a single card for an animal), how it moves (`static`, `walker2` for people, `walker4` for animals, `bird`, `insect`, `fish`, `floater`) and how big it is. A new kind is one line.

The cut-outs are made by a one-off script: `npm run cutouts` (it installs `sharp` into `scripts/` on first use and needs the source pictures in `dist/references/pics`). `PLAN-PAPER.md` explains the pipeline.

## Built with

Vite, React 19, TypeScript, three.js with react-three-fiber and drei, Zustand (saved to `localStorage`), Tailwind v4 plus hand-written "sticker" CSS, and framer-motion. Fonts are Fredoka, Nunito and Caveat through Fontsource.

There are no 3D model files. On the Toy Globe, trees, buildings, people and animals are built in code (`src/lib/kit.ts`) from flat-shaded, vertex-colored parts with dark outlines. On the Paper Globe, every cut-out is drawn by one shared shader that bends and sways the paper (instanced, one draw call per cut-out), so a planet with about 900 pieces of paper stays smooth.

## Where things live

| Folder | What is in it |
|---|---|
| `src/world` | the planet, terrain, regions, camera rig, collisions, spot finding, and the switch between the two globes (`variants.ts`) |
| `src/entities` | Toy Globe easels, people, animals, the walker, the kid, easel dragging, and the movement hook both kids share |
| `src/paper` | the Paper Globe: kinds table, cut-out library, card geometry and shader, layout by region, creatures and their paper motion, the fake AI, spawning, dragging, the picture view |
| `src/paper/draw` | the whiteboard, cutting a drawing out of it, and asking Gemini (or the kid) what it is |
| `src/paper/talk` | chatting with a character: Gemini for what it says, ElevenLabs for its voice |
| `src/ui` | HUD, picture view with notes, panels, labels |
| `src/screens` | landing, upload, processing |
| `src/lib` | noise, sphere math, the low-poly kit, image processing |
| `public/doodles` | six original neighbor drawings that are on the Toy Globe from the start |
| `public/samples` | the ten sample drawings on the Toy Globe's upload shelf |
| `public/paper` | the 138 cut-outs, and `raw/` with the 16 demo drawings they came from |
| `public/doodles-paper` | eight original crayon-style doodles (rocks, mushrooms, lily pads, reeds, two fish) |
| `scripts` | the cut-out script and its manifest |

## Notes

- **The pictures are for the hackathon demo.** The ten drawings in `public/samples`, the 138 cut-outs in `public/paper` and the 16 pictures in `public/paper/raw` were made from pictures supplied for the hackathon (Adobe Stock and similar). Replace them with artwork you have the rights to before the project is shared or released publicly. The six doodles in `public/doodles` and the eight in `public/doodles-paper` are original.
- `dist/` is not in git. The style reference videos and source pictures live in `dist/references` on the author's machine, and `npm run build` keeps that folder instead of wiping it.
- Checked in one browser at desktop and phone widths. Not tried on a real touch device or in other browsers yet.
- [STATUS.md](STATUS.md) lists what works and the rough edges. [PLAN.md](PLAN.md) is the plan for the Toy Globe and [PLAN-PAPER.md](PLAN-PAPER.md) the plan for the Paper Globe.
- Round 1 of the project was a paper-craft graveyard diorama, "The Afterlife of Darlings". It is the git history up to commit `b17a721`.
