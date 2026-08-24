# Ikigai attention-problem scenarios v1

## Production asset

- Runtime path: `/assets/compass-book/ikigai/attention-problem-scenarios-v1.png`
- Workspace file: `public/assets/compass-book/ikigai/attention-problem-scenarios-v1.png`
- Source generation result: `/Users/ejmac/.codex/generated_images/01a02066-87c8-7f93-b085-2dc2daa9d581/exec-db39cb9a-37b0-415c-a779-e648129f9cb7.png`
- Format: one 4-column by 2-row sprite, with no embedded words or labels
- Use: The Ikigai Map, Island 62, `ikigai_map.a02`

## Final generation prompt

Create a single exact 4-column by 2-row sprite sheet of eight separate vertical illustrated situation cards for the Compass Book. Match the existing Compass visual language: hand-painted miniature dioramas, warm parchment, dark indigo and teal shadows, antique brass frames, restrained magical glow, tactile paper-and-metal materials, thoughtful rather than childish, premium game art. Each panel must have the same dimensions and a clean, consistent border. No words, labels, letters, numbers, logos, watermarks, UI, or moral good/bad symbols. Show concrete situations that a player can assess without having to invent an example.

Panel order, left to right. Top row: (1) an unnecessarily tangled workflow where people repeatedly pass the same work around, (2) two people seeking the same useful resource but an arbitrary barrier gives one a clear path while blocking the other, with no villain caricature, (3) conflicting map pieces and directions leaving a person lost, (4) one visibly overburdened person carrying too much alone while nearby support could help. Bottom row: (5) a shared public place that is broken, uncomfortable, and arranged without care for the people using it, clearly neglect and poor design rather than simple poverty, (6) useful food and repairable materials being discarded, (7) valuable knowledge visible behind a barrier that prevents people from reaching or understanding it, (8) people close enough to see one another but separated by missing or broken bridges. Diverse, non-stereotyped people; no single demographic associated with any problem. Compose every scene to remain legible when cropped into a small option card.

The final refinement changed only the unfair-barrier and neglected-place panels so that the former communicated unequal access without a villain and the latter communicated carelessly designed shared space rather than poverty.

## Crop map

| Answer ID | Column | Row | Player-facing scene |
| --- | ---: | ---: | --- |
| `inefficiency` | 0 | 0 | A process wastes everyone's time |
| `injustice` | 1 | 0 | Someone faces an unfair barrier |
| `confusion` | 2 | 0 | Information leaves people lost |
| `suffering` | 3 | 0 | Someone carries too much alone |
| `ugliness` | 0 | 1 | A shared place feels neglected |
| `waste` | 1 | 1 | Useful things are thrown away |
| `ignorance` | 2 | 1 | People cannot reach useful knowledge |
| `disconnection` | 3 | 1 | People are cut off from one another |

The legacy answer IDs `ugliness` and `ignorance` remain stable for saved-data compatibility. The player-facing language is now `Neglect & poor design` and `Blocked knowledge`.

## Quality gate

- Pass: all eight crops remain distinct at option-card size.
- Pass: no text or accidental pseudo-labels appear inside the art.
- Pass: captions and descriptions remain the authoritative meaning; the asset can fail without making the answer impossible.
- Pass: the two potentially moralising themes use situational barriers, not villains or demographic stereotypes.
- Pass: browser inspection confirms the sprite order and crop alignment.
- Revisit after founder playthrough: whether any scene creates a noticeably stronger emotional intensity than the others.
