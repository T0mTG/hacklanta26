# STATUS: The Afterlife of Darlings

Built: PLAN.md Phases 0–4 (Phases 5–7 not started).
Rehearsal note: Knuckle Sandwich Robotics Inc. (KSR) hackathon build, Adobe Creative Track.

## What works
- **Flow:** landing → typewriter intro → fake rejection email with REJECTED stamp slam + screen shake → upload → processing → world.
- **Upload:** drag/drop, file picker, 4 demo artworks (SVG in `public/demo`), `D` hotkey for a random demo. Type (png/jpg/webp/svg/gif) and 15 MB validation with an error toast. Unreadable images fall back to a checker texture.
- **Processing:** ~3 s cycling copy; role chips ("Make it a… creature / billboard / house / doll / relic") override the aspect-ratio heuristic.
- **World:** floating paper-craft island, dusk sky dome, fog, toon materials, memorial wall, folder stack, stamp pile, compost bin, sign, mugs, ducks, drifting paper and sparkles. Orbit/zoom with limits.
- **Entities (5 roles, all moving):** creature hops in a loop with googly eyes, billboard floats on sticks, house has flickering windows and smoke, doll swings limbs and follows the cursor, relic spins in a glowing frame. Art is contain-fit with a paper border. 6 preloaded neighbors, a tombstone with thumbnail and epitaph for each upload, and a drop-in squash landing with a sparkle burst.
- **Interaction:** hover shows a ring and label tooltip; click triggers a per-role reaction, speech bubble, sparkles and a camera dolly. HUD counter and "Upload another". Cinematic dive-in on entry.
- **Finale:** after 8 clicks, "Close your eyes", or `F`. Sunset, entities gather, fireflies, closing text and the Adobe line.
- `?lite` mode (fewer props, particles and neighbors, DPR 1) and WebGL context-loss reload.

## What's rough
- Visually verified only at the end of Phases 1 and 3 (one screenshot each, plus one extra after the first came back before entities had rendered). The Phase 4 camera moves, the finale and the click reactions have **not** been seen on screen, only checked for console errors. Expect tuning (camera distances, bubble heights, gather radius).
- The browser pane only renders frames while it is being captured, so animations could not be judged in motion.
- Neighbors reuse the 4 demo images, so they can look like the artwork you upload.
- Phase 5 polish not done: no sound, bloom/vignette, color grading or page transitions. Proximity reactions are limited to the doll following the cursor.
- Phase 6 not done: no entity cap enforcement beyond the slot layout, no `R` reset hotkey, no backup video.
- 3D text uses the self-hosted `public/stamp.woff`; the page font is bundled via fontsource, so it runs offline.
- Bundle is ~1.1 MB (no code splitting).

## Run the demo
```bash
npm install
npm run build
npm run preview
```
Open the printed localhost URL in Chrome. Dev: `npm run dev`. Shortcuts: `?screen=world` jumps to the world, `?lite` is the low-spec mode.

Demo path: Enter → click through the intro → "Send it somewhere better" → click a demo button (or pick a file) → pick a role chip if you want → watch the dive and drop → click your entity and its neighbors → "Upload another" for a second → "Close your eyes" for the finale. If anything stalls, press `D` on the upload screen.
