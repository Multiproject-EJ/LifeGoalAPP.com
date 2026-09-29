# Landing page island reels

Short, silent in-game clips used by the "Your voyage" carousel on the public
landing page (`src/world/WorldHome.tsx`).

## Provenance

Original HabitGame artwork: each clip is rendered from the game's own Island
Run 3D scene (`Island5ThreePilot`) through the dev route
`/dev/island-template-kit?island=N&mode=3d&level=3` with overlays hidden. No
third-party creative assets are included.

## How they were made

1. Headless Chromium (SwiftShader WebGL) at 390×780 CSS px, device scale 1.5.
2. The page clock is frozen and advanced by 1/24 s per frame, so ambient
   animation stays smooth even though software rendering is slow.
3. The camera orbits slowly via a drag gesture (0.35 px per frame, 96 frames).
4. Frames are cropped to 390×700 CSS px and encoded with ffmpeg:
   - `island-NNN.mp4`: the 4 s orbit played forwards then backwards (about
     8 s, so it loops without a jump), 540 px wide, H.264 CRF 29, yuv420p,
     24 fps, `+faststart`, no audio. Island 19 uses CRF 32 (busier scene).
   - `island-NNN.webm`: the same clip as VP9 (~700 kbit/s) for browsers
     without H.264; the page lists the MP4 first.
   - `island-NNN.webp`: the first frame, used as the video poster.

To re-film an island, re-run those steps for its island number and keep the
same file names.
