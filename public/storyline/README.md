# Island Run movie assets

Upload movie files under this folder.

## Episode folder layout

```text
public/storyline/
  episode-001/
    manifest.json
    prologue.mp4
    prologue.mov
    prologue.avi
    prologue-poster.webp
    bgm.mp3
```

- Keep movie filenames short.
- Use `manifest.json` to point the reader at the movie file.
- Preferred movie format: H.264 `.mp4` with optional `poster` image.
- Optional fallbacks: `.mov` and `.avi` can be listed as additional video sources, but browser support varies.

## Optional soundtrack fields

You can add soundtrack metadata at the episode level and/or per-panel:

```json
{
  "mediaKind": "movie",
  "soundtrack": { "src": "/storyline/episode-001/bgm.mp3", "loop": true, "volume": 0.35 },
  "panels": [
    {
      "type": "video",
      "poster": "/storyline/episode-001/prologue-poster.webp",
      "sources": [
        { "src": "/storyline/episode-001/prologue.mp4", "type": "video/mp4" },
        { "src": "/storyline/episode-001/prologue.mov", "type": "video/quicktime" },
        { "src": "/storyline/episode-001/prologue.avi", "type": "video/x-msvideo" }
      ],
      "soundtrack": { "src": "/storyline/episode-001/scene-1.mp3", "loop": true, "volume": 0.5 }
    }
  ]
}
```

- Movie audio is always user-consented (off by default, enabled via the 🔇/🔊 toggle in reader UI).
- Panel soundtrack overrides episode soundtrack while that panel is visible.
