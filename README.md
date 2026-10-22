# Number Garden

A small, tactile browser game with a five-icon progress track and an immediate horror finale on question four.

## Play locally

```sh
npm start
```

Open http://localhost:4173. Python 3 serves the complete `dist/` directory; no dependency installation or build is needed to play. Host `dist/` on any static web host. All asset and module URLs are relative, including under nested paths and an itch.io iframe.

For an itch.io upload, run `npm run package:itch` and upload `number-garden-web.zip` as an HTML game. Enable mobile support and fullscreen. Audio unlocks after the player presses Play. The browser's iframe permissions control native fullscreen availability.

## Controls

- Tap or click an answer tile, or drag it onto the answer slot. Balance puzzles also accept a drop onto the right pan.
- Type a number and press Enter. Mobile fields open the numeric keyboard.
- Tap berries and flowers to mark them while counting. Tap a lily pad to select a landing number.
- Escape opens settings during normal play and exits the scare during the finale. A visible exit also remains available throughout the finale.
- Sound, volume, and gentle motion preferences are stored locally when storage is available.

## The fourth question

The first three puzzles check answers normally and allow unlimited retries. Any valid numeric submission from 0–99 on puzzle four takes the same path, including the mathematically correct answer. Empty input does not submit.

Submitting puzzle four cuts directly to the monster and recorded scream, with no incorrect-answer popup, countdown, or buildup. Two abrupt close-up lunges, irregular recoil, and a slow creep toward the screen fill 3.25 seconds, followed by a brief black screen and the ending at approximately 4 active seconds. All five progress icons remain in the HUD; the fourth is active when the scare hits, and the fifth stays unreached. The first three puzzles award three stars. Visibility changes pause both the sequence clock and Web Audio; exiting or replaying cancels active voices, particles, and pending animation state.

## Architecture and performance

- Buildless HTML, CSS, and native JavaScript modules. No production dependencies, WebGL, framework, or third-party runtime requests. Fonts, art, and the short scream recording are bundled locally.
- SVG scenes stay sharp without high-resolution canvas rendering. A damped spring drives the scale from the difference in weights.
- Animation frames run while the scale, feedback, confetti, or finale are active. Confetti is capped at 38 particles and 1.5× pixel density.
- Web Audio uses one context, master volume, compression, short musical notes, and explicit voice cleanup. The scream is a real CC0 human performance, processed into a deeper lead, a saturated low vocal layer, and a trailing human grunt. The denser mix raises loudness while retaining peak limiting and restrained room echoes. It is fetched early and decoded after the first user gesture; native audio playback is the fallback. Both playback paths respect mute, volume, pause, and cancellation. No synthesized vocal oscillators or AI-generated voice are used for the scare.
- The local WebP monster is preloaded by the hidden image and decoded at the start of the run. A bundled SVG creature is the image-error fallback.
- Responsive layouts use native CSS coordinates, safe-area padding, proportional desktop units, and a separate answer rail for short landscape screens. Small portrait screens reduce the illustration before reducing control sizes. Unusually small windows can scroll.
- DIECARD's `src/presentation/uiScale.ts`, `battleLayout.ts`, and `docs/UI-LAYOUT-AUDIT.md` informed the shared-scale approach, safe-area handling, visual viewport updates, and cancelling stale drag state on resize. The math game uses its own design proportions and does not alter DIECARD or CROGUEL.

## Development and checks

```sh
npm ci
npm run check
npm test
```

The tests cover complete DOM-based playthroughs, correct and incorrect fourth answers, all five HUD icons, every valid final numeric input, retry and score behavior, tap/drag/cancel, keyboard entry, counting interactions, modal focus, storage denial, background pause/resume, replay, spring stability, desktop scale relationships, shipped asset resolution, recorded-audio loading, mute, playback cancellation and media fallback, and the 400 KB distribution budget.

Browser automation was unavailable in the build session. These tests do **not** establish visual layout, audio output, native fullscreen, or physical-device compatibility. A real Chromium/Safari/Firefox and iOS/Android pass remains appropriate before public release.

## Files

- `dist/core.js`: questions, answer evaluation, scale calculation, spring, and finale schedule.
- `dist/scenes.js`: lightweight SVG illustrations and interactive scenes.
- `dist/game.js`: controls, view state, pointer capture, pause, particles, and finale orchestration.
- `dist/audio.js`: local music, feedback, and recorded-scream playback.
- `dist/style.css`: visual system and responsive layouts.
- `tests/`: rules and simulated user journeys.

Fredoka and Nunito are bundled under their included SIL Open Font Licenses. The monster illustration was generated for this game. The remaining artwork is drawn in SVG/CSS.

## Recorded scream and rebuilding

The scare uses an excerpt of [Male Screams [1] by marc3122](https://freesound.org/people/marc3122/sounds/556976/), released under [CC0](https://creativecommons.org/publicdomain/zero/1.0/). Attribution and processing notes are included in `dist/assets/scream-LICENSE.txt`.

`python3 scripts/build-scream.py` recreates the 3.20-second bundled MP3 from the verified source recording using ffmpeg. The source hash is checked before processing. This is an optional asset-build tool; the recording ships ready to play and requires no runtime download from Freesound.
