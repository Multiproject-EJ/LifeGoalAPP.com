# Island Run — Source Fidelity Workloop

Date: 2026-08-21
Status: active execution contract after merge
Scope: source intake, production review and revisit tracking for Islands 011–120

## Mission

Make every island production run visibly traceable to the image Eivind dropped
into the `011-120 islands HERE` source folder. The selected image is not a
one-time inspiration prompt. It is the immutable visual-semantic target used at
every major review checkpoint.

Island 012 is the accepted exception that exposed the need for this loop. Its
procedural world is accepted for use even though it drifted substantially from
the original composition. That exception must be recorded; it must not become
the fidelity standard for later islands.

## Sources of truth

1. Canonical gameplay and visual contracts in `docs/gameplay/`.
2. The external source inbox in Eivind's OneDrive Habit Game UI folder.
3. The immutable `NNN-source.<ext>` image and recorded SHA-256.
4. The target island Gauntlet, img2threejs state and current implementation.
5. Versioned source/current comparisons and final `NNN-done-vNNN.<ext>` proof.

The filename assigns the intended runtime island number. Text rendered inside
the source image is visual evidence, not numbering authority. A mismatch must
be recorded. Island 012 is the first known case: the file maps to runtime
Island 012 while the supplied concept visibly contains an `ISLAND 011` label.

## Visible folder convention

```text
012-source.png       immutable dropped concept
012-done-v001.png    accepted production overview
013-source.png       next immutable concept
_workflow/
  012/status.json
  012/evidence/
  013/status.json
  013/evidence/
```

- A newly dropped exact `NNN.png`, `.jpg`, `.jpeg` or `.webp` is renamed once
  to `NNN-source.<ext>`.
- Sources are never overwritten, edited, recoloured or silently remapped.
- A later accepted improvement creates `NNN-done-v002`, not a replacement for
  `v001`.
- Ambiguous names such as `019(2).png`, `0212.png`, batch images or named theme
  studies remain untouched until their island mapping is explicit.
- `_workflow/NNN/status.json` records the source hash, state, checkpoints,
  fidelity reviews and accepted versions.

## What the source controls

Unless a dated brief explicitly records an approved adaptation, the source is
authoritative for:

- overall camera mood and near/mid/far composition;
- biome, terrain and water/sky balance;
- landmark identity, relative prominence and silhouette;
- architectural language, palette and material response;
- civilization density, vegetation and background storytelling;
- the immediate emotional read at phone scale.

The source is not authoritative for baked HUD, text, counters, fake tile
geometry, an approximate tile count, token position, or any gameplay rule. The
real 36-tile board and live UI remain canonical. Hidden sides from a single
image are documented approximations.

## Mandatory workloop

### 0. Intake and identity lock

1. Audit both the external source/workflow inventory and relevant repository,
   branch, worktree, world-factory and authored-routing ownership. A numbered
   slot is empty only when both sides are empty.
2. If either side already owns the proposed number, never overwrite it;
   continue forward to the first genuinely empty slot and adjust all new
   candidate paths/manifests before intake.
3. Run the intake helper in dry-run mode.
4. Resolve any ambiguous filename or collision before applying.
5. Apply the rename and record the immutable source hash.
6. Record runtime island number versus any embedded image label.
7. Copy/select the reference into the repository's target-island reference
   pack without modifying the external source.

### 1. Reference-lock sheet

Before broad implementation, write a one-page visual contract naming:

- five landmark identities and their relative positions;
- terrain/horizon depth stack;
- dominant palette and materials;
- identity-defining macro, meso and micro features;
- adaptations required by the canonical board/UI;
- forbidden drift and unseen-side limitations.

### 2. Source-return checkpoints

Return to the source—not merely the latest generated goal—after:

1. representative blockout;
2. terrain, ocean and background depth;
3. each landmark family or one bounded landmark batch;
4. ground materials, vegetation and living ambience;
5. live-board integration;
6. final phone review.

Every checkpoint captures a source/current comparison at the approved overview
camera and records five 0–1 scores:

- `composition`
- `landmarkIdentity`
- `paletteMaterials`
- `terrainBackground`
- `phoneReadability`

It also lists critical mismatches and chooses exactly one decision:
`pass`, `revise`, or `user-accepted-drift`.

### 3. Drift gate

Ordinary completion requires:

- overall fidelity at least `0.80`;
- every dimension at least `0.75`;
- zero unresolved critical mismatches;
- the canonical visual, gameplay, phone, performance and build gates.

A score is structured agent/user judgement supported by a visible comparison;
the helper records and validates it but never invents the score. A global score
cannot overrule a missing identity-defining landmark.

`user-accepted-drift` is an explicit exception. It requires Eivind's note and
remains visible in history. It does not lower future thresholds.

### 4. Done and revisit

`done` means the currently accepted production version passed or received an
explicit drift exception. It does not mean the island can never improve.

On revisit:

1. preserve the original source and every existing done proof;
2. move state back to an in-progress checkpoint;
3. compare the new work against both source and current accepted version;
4. create the next immutable `done-vNNN` only after review.

## Helper commands

```bash
python3 scripts/island_source_workloop.py intake --inbox <folder>
python3 scripts/island_source_workloop.py intake --inbox <folder> --apply
python3 scripts/island_source_workloop.py status --inbox <folder>

python3 scripts/island_source_workloop.py checkpoint \
  --inbox <folder> --island 013 --stage blockout \
  --evidence <source-current.png> --review-json <review.json> --apply

python3 scripts/island_source_workloop.py mark-done \
  --inbox <folder> --island 013 --evidence <phone-overview.png> \
  --review-json <final-review.json> --summary "Accepted production v1" --apply
```

Commands are dry-run by default. `intake` validates every collision before
renaming any file. `mark-done` never overwrites existing evidence.

## Authority and safety boundary

Authorized here:

- reversible repository workflow changes;
- initial canonical renames of unambiguous exact `NNN` source files;
- versioned evidence/status additions;
- recording Island 012's explicit accepted-drift exception.

Not authorized by this contract:

- guessing ambiguous island mappings;
- deleting raw studies or duplicate candidates;
- overwriting source or approved evidence;
- changing gameplay to match baked reference UI;
- merging, publishing, deploying or App Store submission without separate
  authority.

## Acceptance evidence

- helper unit tests pass;
- dry-run reports all planned renames and all ambiguous files;
- applied intake produces `NNN-source` files and matching source hashes;
- Island 012 has versioned done evidence and an explicit accepted-drift record;
- the playbook and visual contract require source-return checkpoints;
- `git diff --check` passes and the workflow is committed on an isolated branch.

## Stop conditions

Stop and request a mapping decision if a target source already exists, a
source hash changes, a filename is ambiguous, an evidence file would be
overwritten, or a pass still has a critical identity mismatch.
