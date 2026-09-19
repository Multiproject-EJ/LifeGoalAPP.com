# Zone 73–96 (Mastery / Identity) — Narrative Harvest

Status: **Method draft + one authored pilot island (092).** Islands 73–91 and 93–96 are
mapping-only; no beats authored yet.

## 1) Where this material comes from

A 203,935-word manuscript of philosophical writing — a consciousness-first ontology built
around awareness, the mosaic self, and existential limits. It is **not** in this repo and
must not be committed to it: this repository is public, and the source is unpublished
personal writing. It lives with the author.

What transfers here is the *idea structure*, transposed into fiction. Nothing autobiographical
crosses over — see §4.

Concept density in the source, for orienting which zones it can actually feed:

| Concept | Hits | Concept | Hits |
| --- | ---: | --- | ---: |
| awareness | 787 | JOLT (tagged insight moments) | 50 |
| consciousness | 391 | mosaic self | 48 |
| qualia | 191 | existential limits | 45 |
| ego | 189 | iconoclastic scenarios | 60 |
| free will | 138 | value molecules | 11 |
| determinism | 110 | veil of ignorance | 5 |

The manuscript's densest cluster — mosaic self, ego, the illusion of a fixed self — lands on
the zone already named *Mastery / Fantasy & Identity*. That is why 73–96 was harvested first.

## 2) The method

Three passes. The point of pass 1 is that the source is far too large to read linearly, and
roughly nine tenths of it is not game material.

**Pass 1 — harvest, don't summarise.** Walk the source in chunks and emit only extraction
rows of four kinds: an open question; an image or place; a voice; a *turn* (a point where the
writer changed their mind mid-paragraph). Everything else drops. 203k words collapses to a few
hundred rows.

**Pass 2 — split each row across two layers.** See §3. This is the load-bearing step.

**Pass 3 — map onto the zone arc.** The 120 islands already carry an emotional progression
(Awakening → Growth → Power → Identity → Tech → Transcendence). Philosophical material sorts
into it with very little forcing.

## 3) The two-layer rule

A player told *"notice a pattern in your own life"* on arrival has been handed a mirror before
they agreed to look at one. Defences go up. A player who watches an islander live out the
problem recognises it at a safe distance, with no admission required — and *then* the prompt
lands.

So every harvested passage splits in two, and the halves stay paired on the same island:

| Half of the source passage | Becomes | Fires when |
| --- | --- | --- |
| The lived struggle — specific, messy | Arrival + stop beats: an islander has this problem | `island_entered`, before anything is asked of the player |
| The open question underneath it | Wisdom-stop card / reflection prompt | Later, once the fiction has done the work |

This matches `WISDOM_ENGINE_PRINCIPLES.md` ("micro-insights, not lectures"; "discovery over
instruction") — the principles describe the *second* layer, and are only safe to apply after
the first has earned the player's assent.

It is also the order the code already implements: island 001 fires a `story_reader` episode on
`island_entered`, and only on `arrival_closed` does Central Command issue an objective.

### Track split

The source contains material — political violence, death penalty, sexuality, religion critique,
sections on apathy and depression — that is serious adult writing and does not belong in a
general-audience main loop. The `IslandNarrativeTrack` type already separates:

- `island_mission` — free, drives progression. Gets the light, universal form of each idea.
- `full_story` — opt-in Pro Story Mode, never gates progress. Gets the full-strength version.

**Blocker for the `full_story` half:** `islandNarrativeRegistry.test.ts` currently asserts that
*every* beat in *every* registered definition is `island_mission` ("must remain available in the
free main loop"). The playback machinery supports the split and is tested, but registering the
first `full_story` beat means changing that assertion — i.e. deciding to put narrative behind
the paywall for the first time. That is a product call, so it has not been made here. Until it
is, only the `island_mission` layer ships.

## 4) Transposition, not deletion

Identifying detail is stripped by *moving the idea into the fiction*, not by cutting it. The
emotional truth survives transposition; the biography does not. A passage written at 2am about
the author's own migraine and a warm shower becomes a lamp-tender on Spellbound Bay who cannot
hold her gaze on a mark. The observation is identical. The person is gone.

This is not a compromise for privacy's sake — it is what makes the material playable at all. A
stranger cannot inhabit someone else's literal biography, but they can inhabit an islander.

## 5) Zone map

Island 82 is deliberately absent: the registry test reserves it for a recurring-villain payoff
that is documentation-only, and registering a definition there would fail the suite.

| # | Island | Identity thread |
| ---: | --- | --- |
| 73 | Dragon's Rest | The autopilot at rest — who you are when nothing is demanded |
| 74 | Knightfall Keep | The ego defending itself; identity under threat |
| 75 | Mystic Harbor | Awareness is not located where you assume it is |
| 76 | Wizard's Isle | Who is casting — will, or automaticity |
| 77 | Arcane Bay | The hidden rules that run you |
| 78 | Crown of Magic | The wish to be the author of yourself |
| 79 | Crystal Kingdom | Qualia — where do you actually see the apple |
| 80 | Enchanted Shores | Familiarity as the creator of illusions |
| 81 | Rune Island | Preferences you never consented to |
| 82 | *(Sorcery Sands)* | **Reserved** — recurring-villain payoff, documentation-only |
| 83 | Crowned Isle | The story of being a someone |
| 84 | Festival of Legends | The mosaic — you are many, not one |
| 85 | Moonlight Kingdom | The twin in the mirror |
| 86 | Phoenix Nest | Are you the same person you were |
| 87 | Shadow Realm | The parts of yourself you disown |
| 88 | Golden Throne Isle | The ego as ruler; the illusion of a core |
| 89 | Elven Coast | Irreversible choices and long horizons |
| 90 | Shrine of Heroes | Who you would have been under other conditions |
| 91 | Dwarven Depths | The buried automatic; habit as sediment |
| **92** | **Spellbound Bay** | **Autopilot — authored, see `island092Narrative.ts`** |
| 93 | Royal Garden Isle | Cultivating a self on purpose |
| 94 | Hero's Landing | Acting anyway, without a fixed self |
| 95 | Legend's Rise | The story you tell about yourself |
| 96 | Mythic Horizon | Know thyself as a journey, not a statement — zone capstone |

## 6) Pilot: island 92, Spellbound Bay

Chosen because the name already carries the idea. *Spellbound* is what living on autopilot
feels like from the inside.

**Premise.** The Bay runs perfectly. Every islander keeps to enchantments they cast on
themselves so long ago that none of them remember casting. Nothing is wrong. Nothing is chosen.

**Guardian.** Vess the Everbound, a spellwright who once bound herself so she would never have
to decide again, and can no longer tell which of her actions are hers.

**Lesson seam.** You are not the author of most of what you do. Noticing that is not a defeat —
it is where choosing starts. The island resolves on *awake inside the spell*, not *free of it*:
the source is emphatic that determinism is not escaped, only seen.

**The wisdom-stop exercise (the Stillpoint).** Fix your eyes on a mark and hold them there.
The gaze slips within about ten seconds, and the slip is not something you did. It is a
20-second experiment the player can actually run, and it demonstrates the island's thesis
empirically rather than asserting it — which is the difference between a wisdom card and a
lecture.

## 7) Next

1. Product decision on the `full_story` assertion above, which unblocks the deep layer.
2. Author 73–81 and 83–91 against this map; 96 last, as the zone capstone.
3. Feed the harvested open questions into `wisdomTreeCards.ts` — 28 cards currently serve 120
   islands, and `islandRunReflectionCurriculum.ts` documents repetition setting in by island ~7.
