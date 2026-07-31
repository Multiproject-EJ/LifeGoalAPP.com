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

Island Run treats the story reader as the focused owner of the music channel:
board ambience pauses while the reader is open, and the reader speaker control
uses the same player music preference.

For recognizable classic repertoire, do not add only a `src`. Mark the cue and
record both composition and master-recording clearance:

```json
{
  "soundtrack": {
    "src": "/assets/audio/music/story/classic/mus_story_classic_example_v1.mp3",
    "cueId": "story-classic-example-v1",
    "mood": "wonder",
    "sourceKind": "classic-repertoire",
    "loop": true,
    "volume": 0.28,
    "rights": {
      "composition": {
        "workTitle": "Reviewed work title",
        "composer": "Reviewed composer",
        "basis": "public-domain-confirmed",
        "evidenceReference": "rights-register:composition/review-id"
      },
      "recording": {
        "basis": "commissioned-master",
        "evidenceReference": "rights-register:master/review-id"
      },
      "territories": ["worldwide"]
    }
  }
}
```

The runtime deliberately resolves an incompletely documented
`classic-repertoire` cue to silence. A public-domain composition and a modern
recording are separate rights questions.

- Story audio is always user-consented (off by default, enabled via the 🔇/🔊 toggle in reader UI).
- Panel soundtrack overrides episode soundtrack while that panel is visible.
