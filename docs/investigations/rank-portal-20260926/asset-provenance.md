# First paired asset provenance

Original HabitGame artwork created with built-in image generation, refined and reviewed in this task. User accepted the pair by replying “yeah ... implement the new system”. No third-party creative assets added.

Exact prompts / reference order: `deckhand-I-refinement-prompts.json`. References remain in the shared repository's `docs/design/rank-previews/codex-review-20260926/`; the final selected assets themselves are copied into this implementation worktree, not referenced from a generator cache.

| Project asset | SHA-256 | Generated output |
| --- | --- | --- |
| `public/assets/ranks/v2/deckhand-I-medal.png` | `4378919f2b2260dda7fae708aa01a19356daa7a30c8f92654fc7608cc31f12e4` | `exec-f4205071-dbfc-4d45-8f96-bc00beb7c86f.png` |
| `public/assets/ranks/v2/deckhand-I-pin.png` | `178892a8aae8d11b31f378f4989d4924e5414603e984ca7d09750d09b5b07b96` | `exec-065392b7-83d7-4810-9cb4-61f1641e3d0e.png` |

Each is 1254×1254 with transparency, validated in the earlier pair review. These master PNGs still need delivery-size optimization before release. The old assets remain on disk for rollback/history. No production deployment occurred.
