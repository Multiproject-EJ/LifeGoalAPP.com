# Island Run storyline assets

Upload story episodes under this folder.

## Episode folder layout

```text
public/storyline/
  episode-001/
    manifest.json
    001.webp
    002.webp
    003.mp4
    003-poster.webp
    bgm.mp3
```

- Keep image/video filenames short and ordered.
- Use `manifest.json` to control panel order and per-panel metadata.
- Images: prefer `.webp`.
- Videos: prefer H.264 `.mp4` with optional `poster` image.

## Optional soundtrack fields

You can add soundtrack metadata at the episode level and/or per-panel:

```json
{
  "soundtrack": { "src": "/storyline/episode-001/bgm.mp3", "loop": true, "volume": 0.35 },
  "panels": [
    {
      "type": "image",
      "src": "/storyline/episode-001/001.webp",
      "soundtrack": { "src": "/storyline/episode-001/scene-1.mp3", "loop": true, "volume": 0.5 }
    }
  ]
}
```

- Story audio is always user-consented (off by default, enabled via the 🔇/🔊 toggle in reader UI).
- Panel soundtrack overrides episode soundtrack while that panel is visible.
