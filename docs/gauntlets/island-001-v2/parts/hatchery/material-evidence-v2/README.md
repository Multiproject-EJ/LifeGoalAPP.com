# Verified regional material evidence

Six exact crops inspected with the contact sheet. Stone pier, brass lift column, cyan glazing, faceted egg, nursery wood jamb and grouped leaves are the intended regions. Small crops retain highlights and some edge contamination; maps are inferred single-image evidence and cannot establish true physical PBR.

Actual skill extraction at256px passed .7 threshold: stone .860, brass .860, glass .767, egg .860, wood .829, leaf .829. `analyze_texture.py` also ran for every crop. Each map channel has its own artifact. We did not enable multi-view mode, lower confidence threshold, or force low-confidence acceptance.

A first mixed crop pass at1024px was interrupted; it is retained in sibling material-evidence and not the admitted source. The corrected crops here narrowed stone/wood/glass boundaries. Extracted roughness interpreted specular highlights as rough surfaces; polished glass/egg/brass scalar priors were restored from direct visual observation rather than blindly treating inverse estimates as truth.

Strict spec success establishes intake completeness, not final lookdev or visual acceptance. Macro pass uses flat materials; final neutral, grazing and reference-camera browser renders remain required.
