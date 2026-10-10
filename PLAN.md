# The Afterlife of Darlings: Hackathon Plan

Track: Adobe Creative Track
One-liner: *A graveyard for rejected creative work, except the ghosts are happy.*

**Decision rule:** Demo impact > sophistication. Reliability > production architecture. Polish > features. Convincing illusion > complex implementation.

---

## 1. Tech Stack

| Tech | Why | What it does | Required? | Simpler alternative |
|---|---|---|---|---|
| **Vite + React + TypeScript** | Instant dev server, zero config | App shell, screens, state | Yes | Plain Vite + vanilla JS (but R3F wants React) |
| **three + @react-three/fiber** | Declarative 3D | Scene, meshes, animation loop (`useFrame`) | Yes | Raw three.js (more boilerplate) |
| **@react-three/drei** | Ready-made helpers | `Billboard`, `Text`, `Float`, `OrbitControls`/`CameraControls`, `Html`, `Sky`, `Sparkles`, `useTexture` | Yes | Hand-roll each helper |
| **Tailwind CSS** | Fast UI polish | Landing, HUD, modals, stamps | Recommended | Plain CSS modules |
| **Zustand** | Tiny global store | Artworks list, selected entity, scene phase | Recommended | React `useState` + context |
| **Framer Motion** | Smooth screen transitions | Landing → upload → world fades | Optional (🟡) | CSS transitions |
| **Browser File API + `<canvas>`** | No backend | Read image, downscale to 512px, auto-crop, extract dominant color, cutout edge | Yes | Skip processing; use raw image as texture |
| **howler.js** (or `<audio>`) | Sound | Ambient loop, stamp thunk, boing | Optional (🟡) | `<audio>` tag |
| **@react-three/postprocessing** | Dreamy look | Bloom, vignette, noise | Optional (🟡) | Fog + baked gradient sky |
| **Physics (rapier / cannon)** | none | none | **No** (⚫) | Scripted sine/lerp motion |
| **Backend / DB / Auth** | none | none | **No** (⚫) | `localStorage` only if we want persistence |

Hosting: `npm run build` + Vercel/Netlify static, **or** run locally from `npm run preview` on the demo laptop (preferred: no network risk).

---

## 2. Experience Flow (10 stages)

| # | Stage | UI | User action | System behavior | Visual feedback | Transition | Tech |
|---|---|---|---|---|---|---|---|
| 1 | **Landing** | Dark paper-grain bg, big title "The Afterlife of Darlings", slow-drifting torn-paper scraps, "Enter" button | Click Enter | Preload textures/audio | Scraps parallax with mouse | Fade through black | React + Tailwind, CSS parallax |
| 2 | **Concept intro** | 3 short typewriter lines: "Every creative has a folder of things that almost existed." / "Most get deleted." / "Not here." | Click / auto-advance | Sequenced text | Cursor blink, subtle paper rustle | Cross-fade | Framer Motion / CSS |
| 3 | **Rejection moment** | Fake email card: *"Thanks for your submission. We've decided to go in a different direction."* Giant **REJECTED** stamp slams onto a sample design | Click "Send it somewhere better" | Stamp animation, screen shake | Stamp thunk + red ink spread | Email card slides away, drop zone rises | CSS keyframes, audio |
| 4 | **Upload / drop** | Large dashed "grave plot" drop zone; row of 4 **demo artwork buttons** below | Drag/drop, click to pick, or click a demo | Validate type (png/jpg/webp/svg/gif), read via `FileReader` | Zone glows on hover, thumbnail pops in | None (stays) | File API, `<input type=file>` |
| 5 | **Processing / transformation** | Artwork shown on a "casket" card; label cycles: "Dusting off…", "Assigning a personality…", "Finding a home…" | Wait ~2.5s (fixed, deterministic) | Downscale on canvas, auto-pick **role** (see §4), generate funny label + filename epitaph | Card folds into a paper plane / swirls into a portal | Portal wipe into world | Canvas, `THREE.CanvasTexture` |
| 6 | **Entering the world** | Camera starts high above the diorama, dives down | None (cinematic) | Spawn world, play ambient | Fog lifts, god rays/sparkles | Camera spline ~3s | `useFrame` lerp, drei `CameraControls` |
| 7 | **Artwork appears** | Their entity drops from the sky/portal, lands with a squash-and-stretch; HUD caption "Welcome to the afterlife, *FINAL_v7.png*" | None | Entity spawns at center stage; camera briefly focuses it | Sparkle burst, confetti scraps | Camera eases to orbit view | Spring anim, drei `Sparkles` |
| 8 | **Exploration** | Orbit/pan/zoom diorama, small HUD (counter: "Darlings rehomed: N") | Drag to orbit, scroll to zoom, WASD optional | Preloaded neighbors wander; day-dusk light drift | Parallax, floating dust, drifting paper | n/a | OrbitControls, scripted paths |
| 9 | **Interaction** | Hover = outline + label tooltip; click = reaction + speech bubble; approach (proximity) = look-at/wave | Hover, click, **"Upload another"** button | Per-role reaction (hop, spin, hug, honk), bubble from quote pool | Squash, hearts/stars, sound | Camera dolly to clicked entity | Raycast events, `Html` bubbles |
| 10 | **Emotional payoff** | After ~N interactions or button "Close your eyes": sunset, all entities gather, camera pulls back; text: *"It wasn't worthless. It just needed a different home."* + credit/Adobe line | Click / wait | Scripted finale | Warm light, lanterns/fireflies, music swell | Fade to end card with "Upload another" | Timeline of lerps + overlay text |

---

## 3. Visual Direction

**Art direction: "Cozy paper-craft afterlife."** Think stop-motion paper diorama, not a generic game level.

- **Palette:** warm cream `#F4E9D8`, dusk peach `#F7B89A`, dusty lavender `#8E7CC3`, deep teal night `#1F3A4D`, stamp red `#C7392F`, marigold glow `#F2B544`. Low saturation, one hot accent (the stamp red).
- **Style rules:** flat/toon shading (`MeshToonMaterial` or `MeshBasicMaterial` + fog), paper-grain noise overlay, thick cardboard edges (extruded planes), no realistic PBR.
- **Lighting:** one warm key light, hemisphere fill, fog in lavender, bloom on lanterns/sparkles. Dusk is the default time of day.
- **Typography:** one handwritten face for notes (e.g. *Caveat*), one condensed stamp/label face (e.g. *Special Elite*), one clean sans for UI (e.g. *Inter*). Keep all palette/font tokens in one config file so they're easy to swap.
- **World layout (small diorama, ~30×30 units, circular island on floating cardboard):**
  - Center: **"Plot of Honor"**, a spotlighted stage for the user's newest upload.
  - Ring: **Poster Billboards** (floating, bobbing), **UI Tower Village** (stacked card "buildings" with windows), **Creature Meadow** (logo critters), **Memorial Wall** (tiny tombstones with epitaphs, soft glow), **The Archive of FINAL_FINAL_v7** (a leaning stack of folders).
  - Sky: drifting paper-plane rejections, floating Pantone chips, UI fragments (buttons, cursors, sliders) as clouds.
  - Props: stamp-pile, coffee mugs, rubber ducks, a "Client Feedback Compost Bin" that blooms flowers.

---

## 4. Artwork → Entity (the core illusion)

Everything uses a **textured plane** with the user's image. No rigging, no reconstruction.

**Pipeline:** image → canvas downscale (max 512px) → edge/alpha check → `CanvasTexture` → assign a **role** → spawn.

**Role assignment (deterministic, cheap):**
- Aspect ratio + size heuristic: tall → *Poster/Billboard*; ~1:1 or small → *Creature*; wide → *Building/Floor (UI)*; mid-portrait → *Paper Doll*. **User can override with 5 chips** ("Make it a… creature / billboard / house / doll / relic"). Random fallback if undecided.

| Role | Geometry | Motion | Click reaction |
|---|---|---|---|
| **Creature** (logos) | Billboard sprite + 2 googly-eyes + tiny feet (primitives) | Hop-walk wander on a circle path, squash/stretch | Spins, says a line, hearts |
| **Billboard** (posters) | Plane on 2 sticks or floating, cardboard backing | Gentle float + sway, slow rotation | Flips, flashes "APPROVED*" (*by no one) |
| **House / Tower floor** (UI) | Image on a box face, roof/door primitives, lit windows | Windows flicker, smoke puffs, subtle sway | Door opens, tiny NPC waves |
| **Paper Doll** (illustrations) | Plane with hinged arms/legs cut from primitives | Walks with pendulum limbs, looks toward cursor | Waves, curtsies |
| **Relic** (drafts) | Plane in a glowing frame on a pedestal | Rotates, orbiting sparkles | Glows, reveals "version history" |

**Recognizability guarantee:** the artwork is always shown at ≥50% of the entity's front face, uncropped (contain-fit), with a thin paper border. It also appears on the HUD card and the Memorial Wall tombstone, so the user can always point and say "that's mine."

**Label generator:** pick from a pool, fill filename: `"{filename}: Client requested something more exciting."`

---

## 5. Emotional Details (cheap, high impact)

Pool for labels/bubbles/tombstones (random per entity):
- "Client requested something more exciting."
- "Maybe next quarter."
- "FINAL_FINAL_v7"
- "They said the first version was better."
- "Rejected but still beautiful."
- "Could you make the logo bigger?"
- "Love it! Can we start over?"
- "Moved to the 'Archive' folder. Never opened again."
- "Died doing what it loved: being exported at 72 DPI."

Environmental touches: memorial plaque ("Here lie 1,204 unused concepts"), a rejected UI becoming a cozy home with a lit window, a logo floating peacefully across the sky with a tiny trailing ribbon, a stamp pile gently decomposing into flowers, a sign: *"No feedback past this point."*

---

## 6. Risks & Mitigations

| Risk | Impact | Simplest solution | Fallback |
|---|---|---|---|
| Arbitrary file formats | Upload fails live | Accept png/jpg/webp/svg/gif only | 4 **preloaded demo artworks** + buttons |
| Upload fails on stage | Demo dead | Demo buttons sit next to dropzone | Hidden hotkey (`D`) drops a demo asset |
| Physics instability | Jitter, tunnelling | No physics at all, scripted sine/lerp paths | n/a (already deterministic) |
| Performance (too many objects) | Frame drops | Cap at ~25 entities, instanced props, low-poly, DPR ≤ 1.5 | `?lite` mode: fewer props, no postprocessing |
| Browser differences | Visual bugs | Target **Chrome** on the demo machine only | Pre-recorded 60s backup video |
| World takes too long | Ugly/incomplete | Small diorama, not an open world | Single hero island, skybox gradient |
| Texture load/CORS | Black planes | Import demo images from `/public`, use object URLs for uploads | Checker-pattern placeholder texture |
| WebGL context loss | Black screen | Handle `webglcontextlost`, show reload CTA | Backup video |
| Audio autoplay blocked | Silence | Start audio on first click (Enter) | Run muted; visuals carry the demo |
| Wi-Fi at venue | Broken CDN/fonts | Self-host fonts/assets, run `vite preview` locally | Offline build on USB stick |

---

## 7. Implementation Phases

### Phase 0, Setup
- **Goal:** Running skeleton with the stack wired.
- **Tasks:** `npm create vite` (React + TS); install three, r3f, drei, tailwind, zustand; folder structure (`/screens`, `/world`, `/entities`, `/data`); fonts + palette tokens; stub screens with a state machine (`landing → intro → reject → upload → world`).
- **Output:** Blank R3F canvas + clickable screen flow.
- **Definition of Done:** `npm run dev` shows screens advancing; one cube renders in 3D.

### Phase 1, Basic World
- **Goal:** A small, pretty diorama with no user art yet.
- **Tasks:** circular floating island, toon materials, fog, lights, sky gradient, orbit camera with limits, 6–8 static props (tombstones, folder stack, stamp pile), drifting paper particles.
- **Output:** Navigable diorama at 60fps.
- **Definition of Done:** Looks intentional in a screenshot; orbit/zoom feels good.

### Phase 2, Artwork Upload
- **Goal:** Reliable image intake.
- **Tasks:** drop zone + file picker; type/size validation; canvas downscale; 4 demo artworks + buttons; processing screen with cycling copy; error toast; `D` hotkey.
- **Output:** `Artwork { id, name, texture, aspect, role }` in the store.
- **Definition of Done:** Drop, pick, and demo buttons all produce an artwork object; bad files fail gracefully.

### Phase 3, Artwork → Entity
- **Goal:** User art visibly lives in the world.
- **Tasks:** role heuristic + override chips; 5 entity components (Creature, Billboard, House, Doll, Relic); contain-fit textured planes with paper border; drop-in spawn animation with squash; label generator; tombstone on Memorial Wall; seed world with 6 preloaded neighbors.
- **Output:** Upload → arrives in world, recognizable.
- **Definition of Done:** Uploading 3 different images yields 3 recognizably distinct, moving entities.

### Phase 4, Interaction
- **Goal:** Memorable "it's alive" moments.
- **Tasks:** hover outline + label; click reactions per role; speech bubbles from quote pool; proximity "look at cursor/wave"; camera focus-on-click; "Upload another" in-world; interaction counter; finale trigger.
- **Output:** Every entity reacts to hover and click.
- **Definition of Done:** A first-time user finds ≥3 reactions in 30 seconds without instructions.

### Phase 5, Art Direction & Polish
- **Goal:** Look art-directed, not a three.js sample.
- **Tasks:** paper-grain overlay, bloom/vignette, color grading to palette, landing/intro/rejection polish (stamp slam, typewriter), screen transitions, cinematic entry camera, ambient music + SFX, sunset finale + end card, Adobe line.
- **Output:** Full flow looks and sounds finished.
- **Definition of Done:** Screenshots of every stage are share-worthy; audio mixes cleanly.

### Phase 6, Demo Reliability
- **Goal:** Nothing can break on stage.
- **Tasks:** `?lite` mode and entity cap; WebGL context-loss handler; placeholder texture; offline build via `vite preview`; test on the demo machine/Chrome at projector resolution; run the full flow 10×; record 60–90s backup video; hotkeys (`R` reset, `D` demo art, `F` finale).
- **Output:** Reset-able, offline-capable build + backup video.
- **Definition of Done:** 10 consecutive clean runs; recovery from any failure in <5s.

### Phase 7, Final Presentation
- **Goal:** Land the story in 2 minutes.
- **Tasks:** write script + timings; pick the "hero" rejected artwork (a real team member's, with a true story); rehearse 5×; prepare Q&A (tech stack, scope decisions, Adobe tie-in); devpost/screenshots.
- **Output:** Rehearsed demo, assets, submission copy.
- **Definition of Done:** Hits 1:55 ±5s twice in a row; backup plan rehearsed.

---

## 8. Two-Minute Demo Script

| Time | Beat | On screen | Say |
|---|---|---|---|
| 0:00–0:20 | **Problem** | Real rejected design + email, REJECTED stamp slams | "Every creative has a folder of things that almost existed. This was mine." |
| 0:20–0:40 | **Idea** | Title card → drop zone | "This is The Afterlife of Darlings. A place for work that didn't get picked." |
| 0:40–1:30 | **Experience** | Drop the hero artwork → processing → dive into world → it lands → click it, it reacts → pan to neighbors, Memorial Wall, upload a second via demo button | "It isn't deleted. It's *alive*. That's my logo. Hi, little guy." |
| 1:30–1:50 | **Payoff** | Sunset finale, entities gather, text | "We don't want rejected work to disappear. We wanted to give it somewhere to live." |
| 1:50–2:00 | **Adobe** | End card | "Adobe gives creators tools to make things. This celebrates the things creators make even when nobody chooses them." |

Rehearsal rule: the demo operator never relies on drag-and-drop live; use the pre-staged file in the picker, with the demo button as backup.

---

## 9. Final Priority Classification

| Feature | Class |
|---|---|
| Landing + concept intro | 🔴 MUST SHIP |
| Rejection moment (stamp) | 🔴 MUST SHIP |
| Image upload (drop + picker) | 🔴 MUST SHIP |
| Demo artwork buttons | 🔴 MUST SHIP |
| Artwork → textured entity in world | 🔴 MUST SHIP |
| Movement on every entity | 🔴 MUST SHIP |
| Orbit exploration of diorama | 🔴 MUST SHIP |
| ≥1 memorable interaction (click reaction + bubble) | 🔴 MUST SHIP |
| `?lite` mode / reliability fallbacks | 🔴 MUST SHIP |
| 5 role types with distinct behavior | 🟡 SHOULD SHIP |
| Role override chips | 🟡 SHOULD SHIP |
| Funny labels / tombstones / epitaphs | 🟡 SHOULD SHIP |
| Preloaded neighbors | 🟡 SHOULD SHIP |
| Cinematic entry camera + finale | 🟡 SHOULD SHIP |
| Music + SFX | 🟡 SHOULD SHIP |
| Bloom / grain / color grade | 🟡 SHOULD SHIP |
| Proximity reactions | 🟡 SHOULD SHIP |
| Day→dusk cycle | 🟢 NICE TO HAVE |
| Share / screenshot button | 🟢 NICE TO HAVE |
| Persist world in `localStorage` | 🟢 NICE TO HAVE |
| Rule-based "AI" dialogue variants | 🟢 NICE TO HAVE |
| 2D→3D rigging / reconstruction | ⚫ DO NOT BUILD |
| Physics engine | ⚫ DO NOT BUILD |
| Backend, accounts, multiplayer | ⚫ DO NOT BUILD |
| PSD/AI/Figma file parsing | ⚫ DO NOT BUILD |
| Generative AI models / pipelines | ⚫ DO NOT BUILD |
| Procedural terrain / large open world | ⚫ DO NOT BUILD |

---

## 10. Build Order Cheat Sheet

1. Phase 0–1 (get a pretty diorama) · 2. Phase 2–3 (the artwork lives; **this is the demo**) · 3. Phase 4 (interaction) · 4. Phase 6 *before* deep polish (lock reliability) · 5. Phase 5 (polish) · 6. Phase 7 (rehearse).

**Optimize for:** Emotional Impact × Visual Originality × Interaction × Demo Reliability.
