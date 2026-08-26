# Queen's Nursery — image analysis

Reference: `docs/visual-references/island-014-honeycomb-kingdom/014-source.png`

Scope: isolate the Hatchery / Queen's Nursery identity from the approved whole-island goal. The UI card's egg emblem is the strongest explicit authority for this landmark. The current Three.js landmark is only a baseline and is not identity authority.

## 1. Subject and intent

- Primary noun: a royal honeycomb brood egg enlarged into a compact nursery landmark.
- Object class: stylized architectural prop / small environment landmark.
- Read: precious, protected, fertile, warm, edible-wax opulence; not industrial and not an ordinary tower.
- Dominant gesture: vertically oriented egg/ovoid, broadest below center, tapering to a crowned top, seated firmly in a small royal chamber base.
- Recognition test at phone scale: it must read as **one large golden honeycomb egg** before its smaller architecture is noticed.

## 2. Layered decomposition

### Macro form

1. A single upright egg-shaped core supplies at least 60–70% of the landmark silhouette.
2. A low, broad plinth/brood chamber anchors the egg and prevents a floating-prop read.
3. Two compact side pods or buttresses frame the lower third without competing with the egg.
4. A small crown, bee crest, or pointed wax finial closes the upper silhouette.

### Meso forms

1. A network of thick raised wax ribs divides the shell into large hexagonal cells.
2. Select cells are recessed and dark amber, producing legible honeycomb contrast.
3. The front-lower third contains one dark arched nursery entrance or viewing aperture.
4. A short ceremonial stair/ramp connects the route to the entrance.
5. Gold trim bands gather the egg at its base and crown.
6. Side pods repeat the egg/cell language at reduced scale.

### Micro forms

1. Tiny honey beads/drips collect beneath several lower cells.
2. Small bee-wing or petal ornaments sit near the crown and entrance.
3. A few warm internal lights glow from deep cell recesses.
4. Flowers and wax lamps ground the base, but remain subordinate and phone-safe.

## 3. Silhouette and proportions

- Front silhouette: bilateral and immediately egg-like, with a narrower crown and a weighted lower belly.
- Side silhouette: still ovoid, approximately 70–80% of the front width; avoid a thin facade.
- Rear silhouette: closed egg shell with fewer details, plus a small service/brood vent; no blank flat wall.
- Target visible proportions:
  - egg core height: 1.00 unit
  - egg core width: 0.58–0.66
  - total base width: 0.82–0.92
  - base height: 0.18–0.24
  - finial/crown: 0.08–0.13
- Avoid: a spherical hive, generic minaret, pinecone, smooth Easter egg, or palace turret.

## 4. Construction logic and attachments

- Root assembly: route-facing plinth with stable floor contact.
- Egg shell mounts into a thick annular cradle rather than intersecting the ground.
- Wax rib network conforms to the egg surface and must not z-fight.
- Front entrance is cut/recessed visually into the shell or the supporting brood chamber.
- Side pods attach to the plinth with readable collars or arches.
- Crown/finial has an explicit socket at the egg apex.
- Honey drips hang from underside sockets and never penetrate the route.
- Three build-robot sockets remain clear around the front-left, front-right, and rear working arcs.

## 5. Materials and PBR intent

### Raised wax ribs

- Color: saturated honey-gold with pale yellow edge highlights.
- Roughness: medium-low, approximately 0.28–0.42.
- Metalness: 0; highlights should feel like polished wax, not brass.
- Surface: softly rounded and slightly translucent-looking through color/highlight design.

### Recessed cells

- Color: dark caramel to burnt amber.
- Roughness: 0.18–0.32 where honey is exposed; 0.45–0.58 for dry brood interiors.
- Select emissive warmth only, never uniform neon.

### Flowing honey

- Color: orange-gold core with yellow highlights and darker amber depth.
- Roughness: 0.08–0.2; strong controlled specular/glint.
- Use convex beads, meniscus lips, and tapered drips to sell thickness and appetite.

### Stone/structure accents

- Cream-gold waxstone, roughness 0.5–0.7, used sparingly to clarify the base.
- Purple royal accent may appear once at the entrance banner or queen seal, echoing the central palace doors.

## 6. Camera and view authority

- Primary identity view: front three-quarter from the island's canonical phone camera.
- The whole-island reference is authoritative for palette, density, finish, and the explicit egg icon; it does not provide an exact in-world Nursery side or rear.
- Required validation views: canonical phone view, isolated front, front-left 45°, side 90°, rear 180°, front-right 315°, and top-oblique attachment check.
- Source-facing success: the egg silhouette and cell contrast survive downsampling to the landmark's actual phone footprint.
- Orbit success: no facade cheats, open backs, detached cells, flat rear cap, or intersecting drips.

## 7. Observations versus inferences

### Direct observations

- The Hatchery card depicts a tall gold egg with a honeycomb shell.
- The shell uses bright raised cell borders and darker recessed interiors.
- The island language is dense gold/amber honey architecture with domes, flowers, bees, hexagons, and glossy honey.
- The title identifies the landmark as `The Queen's Nursery` and describes eggs nurtured in royal chambers.

### Controlled inferences

- A low royal chamber base, entry arch, stair, side brood pods, crown/finial, and rear service detail are inferred to turn the icon into a traversable true-3D landmark.
- The inferred geometry must repeat the source's palace vocabulary but remain unmistakably egg-led.
- Rear and side details should be simpler than the front and must not invent a competing landmark identity.

## 8. Identity gate and review targets

The Nursery fails if any of these occur:

- The dominant read is tower, hut, sphere, or palace annex instead of royal egg.
- Honeycomb cells disappear at phone scale.
- The gold is metallic/bronze rather than warm wax and honey.
- The front is hidden behind the Royal Palace or cropped by the phone frame.
- Side/rear views expose a flat shell, hollow geometry, or disconnected decorations.
- Oversized flowers or scenery compete with the egg.

Acceptance targets:

- Phone silhouette/recognition: at least 0.85.
- Egg proportion and honeycomb identity: at least 0.85.
- Source palette/material appetite: at least 0.80.
- Side/rear structural credibility: at least 0.80.
- Route connection and landmark interaction clarity: at least 0.80.
- No critical occlusion, clipping, construction-socket, or animation regression.

## Uncertainty register

- Exact in-world placement and architecture of the Nursery are not visible in the source: medium uncertainty.
- Side and rear ornament: high uncertainty; keep restrained.
- Exact number and arrangement of shell cells: medium uncertainty; optimize for phone readability instead of literal tessellation density.
- Purple royal accent: low-confidence optional inference and must remain subordinate.
