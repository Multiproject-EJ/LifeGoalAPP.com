# Chapter V Quest Forge — strict validation

Result: **PASS**

Command:

`python3 forge/stage2_spec/validate_sculpt_spec.py quest-forge-sculpt-spec.json --strict-quality`

The accepted spec contains 21 named components, seven independently described material families, four repetition systems, 13 mapped detail-inventory entries, action-ready attachments/sockets, five-plus review views, exact candidate-count gates, and reference-derived PBR evidence for every material.

Reference PBR confidence range: **0.794–0.860**, above the required **0.700** threshold. These are single-image estimates and still require neutral, grazing, reference-matched, map-stripped, and orbit render review.
