# Expedition Ship goal-image index

Status: **canonical visual-reference entrypoint**
Updated: 2026-08-23

This folder is the one place to start when judging or improving the HabitGame
Expedition Ship and its dedicated presentation garage. Images elsewhere may be
useful evidence, but they do not become design authority until they are listed
here with an explicit status and allowed use.

## Authority labels

- **Authority** — approved source of truth for the named feature. It outranks
  generated alternatives within that feature's scope.
- **Approved direction** — use for the stated relationship, mood or system, but
  reconcile it with higher-ranked authority images.
- **Provisional** — useful candidate awaiting Eivind's explicit approval.
- **Limited cue only** — only the named detail is usable; the rest must not
  influence the model.
- **Rejected for geometry/scale** — retained as decision history, not a target.

No generated image is automatically authoritative. Eivind's approval and an
update to this index are both required.

## Canonical ship references

| File | Status | Allowed use |
| --- | --- | --- |
| `../habitgame-expedition-ship-controller-shape-lock-v4.png` | Authority | Controller-derived exterior volumes outside the literal front planform. |
| `../../../../src/assets/Blue_darkcontroller.webp` | Highest literal authority | Closed speed-shell front planform: smooth white grips, dark bridge, blue centre surface and open lower centre. |
| `11-calibrated-haven-interior-speed-authority-v1.png` | Authority | Middle-scale habitat, wraparound Haven glazing and closed speed-mode relationship. |
| `12-shoulder-command-exterior-authority-v1.png` | Authority | Steering and administration rooms contained inside the outer shoulder masses. |
| `03-primary-exterior-cutaway.jpg` | Approved direction | Overall exterior/cutaway scale relationship and inhabited controller reading. |
| `01-docked-upright-controller-shell.jpg` | Approved direction | Docked/service stance. |
| `02-compact-garden-shell.jpg` | Approved direction | Compact sanctuary relationship; not independent scale authority. |
| `06-transformation-movement-goal-v2.png` | Approved direction | First two views for Haven/walker shape and transformation movement. |
| `07-expanded-living-mode-turnaround-v1.png` | Approved direction | Expanded living-mode volume and turnaround cues. |
| `10-folded-sanctuary-transform-sequence-v1.png` | Limited cue only | Transformation choreography; it does not set the final ship dimensions. |
| `08-mega-atrium-tree-city-concept-v1.png` | Rejected for geometry/scale | Individual amenity inspiration only; the atrium is far too large. |

## Canonical interior references

| File | Status | Allowed use |
| --- | --- | --- |
| `04-deck-adjacency-pov-sheet.jpg` | Authority | Vertical deck order, adjacency and true interior POV intent. |
| `05-central-atrium-sky-terrace.jpg` | Approved direction | Zen garden, Great Tree and Sky Terrace atmosphere. |
| `09-tree-crown-observatory-terrace-pov-v1.png` | Approved direction | Tree stair, crown terrace, pavilion, greenery wall and observatory lounging. |
| `13-inhabited-room-pov-authority-v1.png` | Authority | Helm, administration, Haven balcony and tree-terrace POVs. |
| `14-workshop-and-creature-exploration-mixed-v1.png` | Limited cue only | Top-left garage and top-right engineering bench are approved; lower-left contributes only its green water cue; lower-right ship/section is rejected. |
| `15-premium-creature-habitat-candidate-v1.png` | Provisional | Bounded premium creature habitat with a modest bathing stream and garden overlook. |
| `fabrication-deck-panoramic-master-v1.png` | Approved direction | Iron-Man-style fabrication/workshop mood and panoramic exterior glass wall. |

## Dedicated presentation garage references

The garage is a separate, lightweight Three.js environment. It showcases the
same canonical ship used for travel and island arrival; it never owns a second
ship model.

| File | Status | Allowed use |
| --- | --- | --- |
| `garage/16-garage-entry-and-island-summon-sequence-v1.png` | Approved direction | Closed facade, rolling-door reveal, presentation platform and garage-to-island summon story. The pictured ship is a placeholder only. |
| `garage/17-garage-interior-upgrade-sequence-v1.png` | Approved direction | Entry camera, dramatic lighting, compact service arms, recessed maintenance ring and open-door return state. The pictured ship is a placeholder only. |

## Resume protocol for every new task

1. Start from the latest `origin/main`; inspect relevant branches/worktrees
   before assuming work is absent.
2. Read this index, then
   `../README.md`,
   `../EXPEDITION_SHIP_MODE_ARCHITECTURE_V1.md`, and
   `../../../gauntlets/2026-08-23-expedition-ship-and-garage-visual-production.md`.
3. Read `.img2threejs/expedition-ship/state.json` and its latest evidence before
   restarting a correction loop.
4. Compare the current model against the exact authority image for the feature
   being changed. Do not average contradictory references together.
5. Change one meaningful visual system at a time and capture the required
   exterior/interior views at both Smooth and Ultra quality where relevant.
6. Save accepted new goal images in this folder with the next numeric prefix,
   append their status here, and keep rejected exploration labelled rather than
   silently deleting the decision history.

## Current user assessment

As of 2026-08-23, Eivind rates the overall spaceship approximately **3/10**.
The garage direction is promising, but neither attractive lighting nor interior
dressing may conceal failed outer volume, controller likeness, real walkable
space or transformation mechanics.
