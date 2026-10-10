# Doodle Planet: Round 2 Plan

Track: unchanged from round 1 (Adobe Creative Track)
One-liner: *Every kid's drawing gets its own easel on a tiny low-poly planet, and the kid can walk around it.*

Round 2 is a restart, not a continuation. Round 1 (the paper-craft graveyard, "The Afterlife of Darlings") is the git history up to commit `b17a721`. Round 2 is everything after it, and builds **Phases 0 to 4** below.

**Decision rule:** Demo impact > sophistication. Reliability > production architecture. Polish > features. Convincing illusion > complex implementation. **Kid-first:** big targets, almost no reading, nothing scary, nothing leaves the device.

---

## 0. What changed from round 1

| Round 1 | Round 2 |
|---|---|
| Flat diorama island, dusk, graveyard jokes | Round "tiny planet" you can spin, zoom out of, and walk on |
| Adult designers, rejected work | Kids, their drawings, praise and sticky notes |
| Artwork becomes a role (creature, house, doll...) | Artwork always becomes an **easel**; the picture stays recognisable |
| Orbit camera only, click to react | Kid avatar with a third-person camera that follows around the globe, plus a planet view |
| Entities fixed in slots | Easels can be **dragged** anywhere on the globe |
| Click shows a speech bubble | Walk up, press E, see the **full picture** and leave **notes** |
| Paper-craft, dark and moody | Low-poly cozy: pastel, teal sky, outlined trees, grain, sticker UI |

## 1. Reference analysis (`dist/references/globe_1.mp4`)

A tiny-planet website for Sado island. Things worth copying:

- **Planet view:** small globe floating in a flat teal void, drifting cream clouds with dark outlines, label pills with numbered badges over points of interest.
- **Walk view:** third-person camera behind a blocky chibi character, pitched down ~30°, the horizon visibly curving. A floating pill "View photo [E]" appears over the thing you can open. A huge white title appears bottom-left when you enter an area.
- **Detail panel:** large cream rounded panel, polaroid-framed photo with round prev/next buttons on the left; on the right a small teal caps label, bold title, description, little spec chips, a thumbnail row and a square close button.
- **Look:** flat-shaded facets, **thick dark outlines on trees and rocks**, soft blotchy grass, teal water with white foam patches, screen-door **dither** where a tree stands between camera and character, faint grain over everything.
- **UI chrome:** cream sticker panels, 3px dark outline, **hard offset drop shadow**, a vertical stack of square icon buttons top-right (the first one yellow), a rounded badge top-left.

## 2. Tech Stack

| Tech | Why | What it does | Required? | Simpler alternative |
|---|---|---|---|---|
| **Vite + React + TypeScript** | Instant dev server | App shell, screens, state | Yes | none |
| **three + @react-three/fiber** | Declarative 3D | Planet, props, characters, `useFrame` loops | Yes | Raw three.js |
| **@react-three/drei** | Helpers | Small utilities only (the scene is mostly hand-built geometry) | Yes | Hand-roll |
| **Tailwind CSS v4 + hand-written sticker CSS** | Fast, consistent UI | Layout utilities, outlined/hard-shadow components | Yes | Plain CSS |
| **Zustand (+ persist)** | Tiny global store | Screens, artworks, notes, camera mode, drag state, saved world | Yes | `useState` + context |
| **Framer Motion** | Smooth panel transitions | Upload panel, modal, toasts | Recommended | CSS transitions |
| **Canvas 2D / File API** | No backend | Decode, downscale, palette, EXIF-safe orientation | Yes | Use the raw image |
| **Procedural geometry (`Kit`)** | No model files, tiny bundle | Merged flat-shaded parts with vertex colors and an inflated-hull outline | Yes | glTF assets |
| **localStorage** | Planet remembers you | Uploads, easel positions, notes | Recommended | In-memory only |
| **Audio** | none this round | none | **No** | none |
| **Physics / backend / accounts** | none | none | **No** | scripted motion |

Hosting: `npm run build` then `npm run preview`, fully offline. Fonts are bundled through fontsource. `vite build` keeps `dist/references` (the style video and sample drawings) instead of wiping it.

## 3. Experience Flow (11 stages)

| # | Stage | UI | Kid action | System behavior | Visual feedback | Transition |
|---|---|---|---|---|---|---|
| 1 | **Landing** | Big "Doodle Planet" title over a slowly turning planet, "Let's go!" | Click | World geometry builds behind the title | Clouds drift, birds circle | Panel slides in |
| 2 | **Pick a drawing** | Sticker panel: drop zone, "Choose a picture", camera button on touch, shelf of 10 sample drawings | Drop, pick, or tap a sample | Validate type and size, decode | Thumbnail pops in | Flips to details |
| 3 | **Details** | Polaroid preview, "Name your drawing", "Your name", "Tell us about it" | Type or accept defaults, "Put it on the planet!" | Defaults prefilled so one click is enough | Preview tilts | Processing |
| 4 | **Processing** | "Building your easel..." with cycling lines and a progress bar | Wait ~2.5 s | Downscale, palette, texture | Mini easel card wobbles | Dive |
| 5 | **Arrival** | Camera dives from space to the plaza | None | Spawn kid and cat, drop the easel from the sky | Squash landing, star burst | Hands over control |
| 6 | **Explore** | Zone banner, hint line, HUD | Walk (WASD, arrows, click ground, touch joystick), drag to look, wheel to zoom | Collisions with trees, water, buildings | Footsteps bob, banner on entering a zone | n/a |
| 7 | **Meet the easels** | Easels show a minimised picture; the nearest one perks up and shows "Look [E]" | Walk close | Proximity test | Easel grows, ring pulses, watchers cheer | n/a |
| 8 | **Carry an easel** | Cursor becomes a hand | Press and drag an easel, release | Raycast to the globe, lift, validate, drop | Easel floats and wobbles, lands with a squash; watchers follow | Water refuses with a friendly shake |
| 9 | **Full picture** | Cream modal: polaroid picture, thumbnails, prev/next, title, story, palette, **sticky notes** and a note composer | Press E or click an easel, write a note | Save note, pin a tiny sticky on the easel | Notes pop in with a tilt | Close with the X or Esc |
| 10 | **Planet view** | Label pills over each easel, "My drawings" list | Press the globe button, spin and zoom, click a pill | Slerp the camera, teleport the kid beside it | Clouds and birds around the planet | Dive back down |
| 11 | **Add another** | Same upload panel over the live world | Plus button | New easel drops beside the kid | Star burst | Back to explore |

## 4. Visual Direction

**Art direction: "Cozy low-poly tiny planet."** Pastel, painterly, handmade, picture-book, never glossy.

- **Palette tokens** (CSS variables and `data/theme.ts`): ink `#22333b`, outline `#1f3340`, cream `#fbf5e6`, paper `#f1e9d8`, globe sky `#5bb8b5`, walk sky `#8fd3c9` to `#c5ebd9`, grass `#58a24b #79c257 #a4d86e`, sand `#e8d9a0`, water `#3fb6b2 #7fd6cf`, foam `#f6fbf7`, sun yellow `#f2c14e`, coral `#ee6c4d`, pink `#f6a6b8`, lilac `#c9b6f2`, sky blue `#9ad4f5`, mint `#a8e6c3`, wood `#c88a54 #a96d3b`.
- **3D rules:** flat-shaded facets (`flatShading`, vertex colors, mild per-face jitter), no tone mapping so pastels stay pastel, **outline by inflated back-face hull** on trees, rocks and clouds, soft shadows from one sun that follows the camera so the visible side is always lit, **dither fade** on anything between the camera and the kid, CSS **grain** and a very light vignette over the canvas.
- **Sky:** a CSS gradient behind a transparent canvas. Flat teal in planet view, lighter mint toward the horizon in walk view, a smiling cartoon sun, faint sparkles.
- **UI kit:** 3px ink outline, 4px hard offset shadow, 18px radius, chunky and at least 48px tall for anything pressable, icon-first labels. Fonts: **Fredoka** (titles, buttons), **Nunito** (body), **Caveat** (sticky notes).
- **Scale:** planet radius 12 units, kid about 1 unit tall, trees 1.5 to 2.5, an easel about 1.4. A lap on foot takes about 25 seconds.

## 5. World layout (12 regions, one per vertex of an icosahedron)

Regions are ~63° apart, so every neighbor is a short walk and nothing is crowded. The icosahedron is rotated so the **plaza faces the default camera** and the pond sits to its east.

| Region | Terrain and props | Life |
|---|---|---|
| **Gallery Green** (spawn) | Flat lawn, dirt ring, cherry trees, flowers, benches, signpost | Rabbits, first easels, watchers |
| **Lily Pond** | 0.3 rad pond, sand shore, lily pads, a small rainbow | Ducks, butterflies |
| **Cherry Grove** | Pink trees, soft petals | Birds |
| **Sunflower Farm** | Barn, windmill, fenced paddock, wheat, haystacks, tractor | Sheep, cows, farmers in straw hats |
| **Picnic Hill** | Gentle rise, one big tree, blanket and basket | **The family** and their dog |
| **Pine Woods** | Dense pines, mushrooms, a hush | Birds, a few rabbits |
| **Cozy Village** | Three pastel cottages, well, fence | Villagers walking |
| **Duck Pond** | 0.28 rad pond, flowers along the shore | Ducks, a little boat |
| **Mount Giggle** | One big faceted peak with a snow cap, rock outcrops | Birds overhead |
| **Twin Hills** | Two smaller peaks, moss rocks | Sheep that wandered off |
| **Big Blue Lake** | Large lake, sand ring, small sailboat | Ducks |
| **Sunflower Meadow** | Open flowers, tall grass | Butterflies, rabbits |

**Balance budget:** about 420 trees, 70 rocks, 1,400 flowers, 1,800 grass tufts, 20 clouds, 8 birds, 18 butterflies, 20 animals, 14 people. Dense forest in two regions, open meadow in three, quiet water in three. `?lite` halves all of it.

## 6. Artwork to Easel (the core illusion)

Everything is a **textured plane** on a small wooden easel. No reconstruction.

**Pipeline:** file or sample -> decode (EXIF-safe) -> downscale to max 1024 px -> aspect + 4-colour palette -> `CanvasTexture` -> `Artwork` -> spawn.

| Part | Rule |
|---|---|
| **Easel** | Low-poly A-frame, tray, clamp bar, nameplate stake; about 1.4 units tall |
| **Picture** | Contain-fit inside a white paper board, never cropped; shown on **both faces** (readable from behind) |
| **Minimised** | 0.8 scale in the world; perks up to 1.1 scale when the kid is near |
| **Notes** | Each note pins a small coloured sticky to the board edge (up to 6 visible) |
| **Label** | Title pill over the easel in planet view, "Look [E]" pill in walk view |
| **Spawn** | Falls from above onto a free spot in front of the kid, squash on landing |
| **Placement** | Land only, gentle slope only, keeps clear of trees, buildings and other easels; dropping on water slides back with a shake |
| **Watchers** | 1 to 3 people stand in front of each easel and **follow it** when it is moved |

Neighbor easels are five authored crayon doodles (SVG) by made-up kids, so they never duplicate the pictures a kid uploads. The ten pictures in `dist/references/pics` are the **sample shelf** in the upload step.

## 7. Interaction model

- **Move:** WASD or arrows (camera-relative), click or tap the ground to walk there, touch joystick on touch devices. Water and obstacles block.
- **Look:** drag to orbit, wheel or pinch to zoom, `G` or the globe button toggles planet view.
- **Open:** `E`, Space or a click on the easel; Esc or the X closes.
- **Carry:** press and drag an easel; a short drag threshold keeps clicks and drags apart.
- **Globe math:** the kid is a unit direction plus a tangent heading, stepped along great circles so there are no poles and no seams. Camera poses blend by spherical interpolation so transitions never cut through the planet.

## 8. Risks & Mitigations

| Risk | Impact | Simplest solution | Fallback |
|---|---|---|---|
| Arbitrary or huge files | Upload fails | Accept png, jpg, webp, gif, svg up to 15 MB, downscale | Sample shelf plus `D` hotkey |
| HEIC photos from phones | Cannot decode | Friendly message asking for jpg or png | Sample shelf |
| Too many draw calls | Slow frames | Instance trees, rocks and plants; merge static parts | `?lite` halves content and drops shadows and dither |
| Dither shader fails to compile | Black or missing props | Patch is isolated in one module | Skip the patch |
| Drag fights camera drag | Easel will not move | Easel pointer-down claims the gesture | Click-to-walk still works |
| WebGL context loss | Black screen | Handler shows a reload button | Reload |
| localStorage full | Progress not saved | try/catch with a toast | Keep working in memory |
| Kid safety and privacy | Trust | No network calls, no accounts, copy says drawings stay on this device | n/a |
| Narrow phone screens | UI overlaps | Stack the modal, 16px gutters, large targets | Landscape hint |

## 9. Implementation Phases

### Phase 0, Setup
- **Goal:** Running skeleton with the stack wired.
- **Tasks:** new branch, Vite/React/TS/Tailwind/Zustand/R3F kept, fonts (Fredoka, Nunito, Caveat), tokens, sticker UI kit and icons, screen state machine (`landing -> upload -> processing -> world`), transparent canvas over a CSS sky with grain, a faceted planet placeholder, sample drawings copied to `public/samples`, build keeps `dist/references`.
- **Output:** Clickable flow over a turning low-poly planet.
- **Definition of Done:** `npm run dev` advances through every screen; `npm run build` passes and leaves `dist/references` untouched.

### Phase 1, Basic World
- **Goal:** A pretty tiny planet with no user art yet.
- **Tasks:** seeded terrain and 12 regions, biome vertex colors, foam water, instanced flora with outlines, buildings, clouds, birds, butterflies, camera-following sun with soft shadows, sky layer, grain, trackball globe camera with inertia and zoom limits, `?lite`.
- **Output:** Navigable planet at 60 fps.
- **Definition of Done:** Looks intentional in a screenshot; spin and zoom feel good.

### Phase 2, Artwork Upload
- **Goal:** Reliable intake a child can finish alone.
- **Tasks:** drop zone, picker, camera capture, validation, decode and downscale, palette and aspect, sample shelf of 10, details step, processing screen, `D` hotkey, persistence.
- **Output:** `Artwork { id, title, artist, story, src, aspect, palette, notes, dir, yaw }` in the store.
- **Definition of Done:** Drop, pick, camera and samples all produce an artwork; bad files fail gracefully.

### Phase 3, Artwork to Easel
- **Goal:** Drawings visibly live on the planet among people and animals.
- **Tasks:** easel model, contain-fit double-sided board, spawn drop, spot finder, five neighbor doodles, people and animals with wander behavior, the family picnic, watchers that gather and follow, name pills in planet view.
- **Output:** Upload arrives as an easel, in a busy but balanced world.
- **Definition of Done:** Three different uploads give three distinct easels, each with watchers.

### Phase 4, Interaction
- **Goal:** Walk, carry, read, and leave notes.
- **Tasks:** kid and cat, camera rig (walk, globe, dive) with blended transitions, movement with collisions, proximity perk-up and prompt pill, easel dragging, full-picture modal with thumbnails and sticky notes, zone banners, HUD buttons, cheers, saved positions and notes.
- **Output:** A complete loop: upload, arrive, walk, open, note, carry.
- **Definition of Done:** A first-time kid finds walking, opening and carrying within a minute, without instructions.

### Phase 5, Art Direction & Polish (not this round)
Bloom or color grade, music and sound effects, landing and transition polish, finale moment.

### Phase 6, Demo Reliability (not this round)
Entity caps, reset hotkey, offline test on the demo machine, backup video.

### Phase 7, Final Presentation (not this round)
Script, rehearsal, submission copy.

## 10. Final Priority Classification

| Feature | Class |
|---|---|
| Upload (drop, pick, samples) to easel on the globe | 🔴 MUST SHIP |
| Low-poly planet with trees, mountains, ponds, animals, birds, butterflies, family, watchers | 🔴 MUST SHIP |
| Drag an easel anywhere on the globe | 🔴 MUST SHIP |
| Walk to an easel, interact, full picture | 🔴 MUST SHIP |
| Notes on a picture | 🔴 MUST SHIP |
| Minimised easels that perk up when near | 🟡 SHOULD SHIP |
| Planet view with label pills and "My drawings" | 🟡 SHOULD SHIP |
| Dither fade, outlines, grain | 🟡 SHOULD SHIP |
| Persistence in `localStorage` | 🟡 SHOULD SHIP |
| Touch joystick, camera capture | 🟡 SHOULD SHIP |
| Zone banners | 🟡 SHOULD SHIP |
| Music and sound effects | 🟢 NICE TO HAVE |
| Emoji reactions, day-night cycle | 🟢 NICE TO HAVE |
| Real multiplayer, accounts, backend | ⚫ DO NOT BUILD |
| Physics engine | ⚫ DO NOT BUILD |
| Generative AI, 2D to 3D reconstruction | ⚫ DO NOT BUILD |
