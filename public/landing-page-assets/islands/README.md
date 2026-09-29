# Landing page island reels

Short, silent in-game clips used by the "Your voyage" carousel on the public
landing page (`src/world/WorldHome.tsx`). Each reel plays once, then the
carousel moves on to the next island.

## Provenance

Original HabitGame artwork: each clip is rendered from the game's own Island
Run 3D scene (`Island5ThreePilot`) through the dev route
`/dev/island-template-kit?island=N&mode=3d` with overlays hidden. No
third-party creative assets are included.

## How they were made

Each reel is two shots of about 3 s, joined by a 0.42 s crossfade (≈6 s):

1. **Overview**: `level=3`, the island's default camera.
2. **Build**: `level=2&construction=1&landmark=boss&commissioning=1`, the
   in-game construction shot of the central landmark with builders at work.

Capture: headless Chromium (SwiftShader WebGL), 390×780 CSS px at device scale
2, cropped to 390×700 CSS px (780×1400 px). The page clock is frozen and
advanced by exactly 1/24 s per frame, so the scene's own animation (water,
airships, rides, builder tools) stays smooth even though software rendering
is slow. The in-game camera is not moved during capture.

Camera moves are added in ffmpeg: a slow push-in on the overview (to 1.22×,
aimed at the island) and a gentle push on the build shot (to 1.08×). Frames
grow in 2 px steps before cropping, so the move has no sub-pixel jitter.

- `island-NNN.mp4`: 540 px wide, H.264, yuv420p, 24 fps, `+faststart`, no audio.
- `island-NNN.webm`: the same reel as VP9 (~800 kbit/s) for browsers without
  H.264; the page lists the MP4 first.
- `island-NNN.webp`: the first frame, used as the video poster.

To re-film an island, capture both shots (78 frames each) and rebuild the reel
with the same file names.
