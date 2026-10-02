# Narrative Source Integration Plan

How a 203,935-word philosophical manuscript becomes story, seams, and wisdom cards across
120 islands.

> **Source handling.** The manuscript is unpublished personal writing. It is **never**
> committed to this repository — not in full, not parsed, not chunked, not as extracted
> harvest rows. This repo is public. Only transposed fiction and derived design content cross
> over. All working files live outside the git tree.

## 0) The problem this solves

The game has almost no story. 115 of 120 islands have no authored narrative at all, and the
beats that do exist are mostly *functional* rather than *thematic*:

> "Roll the dice. Collect the fragments." — island 001
> "Awaken the landmark."

Compare island 003, which does have a theme:

> "Tamba is not hoarding. He fears the grove will run dry."

That is a **seam** — a human failure mode, embodied by a guardian, illustrated at the stops,
and resolved by understanding rather than force. Island 003 has one. Island 001 does not.

The manuscript is 200k words of nothing but seams. That is the whole opportunity.

## 1) Reading all of it

Not a sampling exercise — a bounded, resumable pass over the entire text.

- The document splits into **34 chunks of ~6,000 words** (4,037 non-empty paragraphs).
- Each chunk is read once and produces **harvest rows** appended to a working file.
- Rows carry the original paragraph index, so any row can be traced back without re-reading.
- The pass is resumable: progress is on disk, not in context. Interruption costs one chunk.

**Row kinds:**

| Kind | What it captures |
| --- | --- |
| `SEAM` | A human failure mode — the load-bearing kind. Becomes a guardian. |
| `JOLT` | A runnable 30–90s experiment. Becomes a wisdom card's exercise. |
| `QUESTION` | An open question the author left unresolved. Becomes a card's prompt. |
| `IMAGE` | A place, object, or metaphor. Becomes island scenery or a landmark. |
| `VOICE` | A distinct speaking register. Becomes a character. |
| `TURN` | A point where the author changed their mind mid-paragraph. Becomes a boss reversal. |

Expected yield: 400–800 rows. Known seeds already located — 17 passages the author
pre-tagged `Jolt:` / `Speculation:` / `Iconoclastic:`, and 546 lines ending in a question mark.

## 2) The seam spine

Every island gets exactly one seam. That is the unit of work, and it is what the game is
currently missing.

An island's seam determines all of it:

```
seam → guardian's wound → what the 5 stops illustrate → the wisdom card's question
```

The zone arc already sorts the material with very little forcing:

| Islands | Zone | Seam family |
| --- | --- | --- |
| 1–24 | Awakening / Calm | noticing; the automatic; awareness of awareness |
| 25–48 | Growth / Jungle | complexity from simple rules; evolution; what compounds |
| 49–72 | Power / Intensity | desire, attachment, pain and pleasure as the root of value |
| 73–96 | Mastery / Identity | the mosaic self; ego; the illusion of a fixed core |
| 97–110 | Tech Shift | artificial minds; algorithms that feed you yourself |
| 111–120 | Transcendence | mortality; the eternal now; what is actually at stake |

## 3) Fascism as a guardian pattern

Not one boss. A **recurring pattern** that returns once per zone in escalating form, because
the manuscript treats it as a single failure with many sizes: the failure to internalise that
other minds are as real as your own.

The source is explicit that this is the crux — that someone can know all of it, recognise that
others are aware and experiencing their own inner states, *and still act as if that were not
true*. The author calls that a complete mystery, and never resolves it. Good: an unresolved
question makes a better boss than a moral.

| Zone | The guardian who… | Scale |
| --- | --- | --- |
| Awakening | assumes everyone else feels exactly as they do | one household |
| Growth | prunes from the garden anything that grows differently | one village |
| Power | needs an enemy in order to stay whole | two islands |
| Identity | sorts people by what they *are*, not what they do | a kingdom |
| Tech Shift | feeds each islander only what confirms them — the manuscript's "self-controlled" state media | a network |
| Transcendence | would erase every other awareness to keep his own story pure | everything |

**The resolution is identical every time, and it is the manuscript's own answer:** you never
win by force. You win by making one other mind undeniably real to the guardian. That is the
anti-fascist persona emerging from existential uncertainty, expressed as a boss mechanic.

The word "fascism" appears nowhere in player-facing copy, and no real-world politics is named.
The pattern does the work.

## 4) Wisdom cards as a collected trait

The manuscript sets its own rule: *"aim to leave one surprising speculation at each chapter."*
That is one wisdom card per island. `WISDOM_ENGINE_PRINCIPLES.md` independently specifies the
same format — "30–90 second reflections… small mental experiments… moments of surprise or
reframe."

**Card anatomy** — deliberately mirroring `TraitCard` in `personalityTraitCopy.ts`, so wisdom
reads as a trait the player builds rather than trivia they collect:

| Field | Content |
| --- | --- |
| suit | one of the 6 zones |
| jolt | an experiment the player can actually run |
| question | open, and genuinely unresolved by the author |
| stance | what the player answered, recorded — not scored |
| reframe | what the experiment tends to reveal, stated as possibility |

There is no right answer, and no score moves. This follows the existing rule in
`CREATURE_PERSONALITY_DEX_V1.md`: support a trait, never claim to change it.

**Why an experiment rather than a statement.** The strongest card found so far asks the player
to hold their gaze on a fixed point. It slips within about ten seconds, and the slip is not
something they did. The player verifies the island's thesis themselves instead of being told
it. That is the entire difference between a wisdom card and a lecture.

**Where they accumulate.** The Wisdom Tree already exists — 5 stages, watering, grace buffer
(`ZEN_GARDEN_WISDOM_TREE_UPGRADES.md`). Collected cards are a natural second water source, and
the collection becomes a wisdom profile alongside the personality profile.

Current state: **28 cards across 120 islands.** `islandRunReflectionCurriculum.ts` records that
repetition sets in by island ~7. A card per island fixes a live problem, not a hypothetical one.

## 5) What is excluded

Measured against the full text, the genuinely-unusable material is **under 1%**:

| Theme | Share | Disposition |
| --- | ---: | --- |
| religion / god / Buddhism | 6.5% | **keep** — philosophy of mind in theological dress |
| fascism / politics | 1.7% | **keep** — as the guardian pattern in §3 |
| sexuality | 0.6% | cut |
| depression / apathy | 0.5% | keep the phenomenology, cut the clinical framing |
| death penalty / punishment | 0.2% | cut the policy, keep the moral reasoning |

Also cut: specific legislative proposals, and the source's instruction to end a section by
showing footage of political violence. Also stripped: personal medical and biographical detail,
which is removed by transposing the idea into an islander rather than by deleting the passage.

7.7% of lines are Norwegian. Those need translation, not exclusion.

## 6) Sequencing

| Phase | Work | Output |
| --- | --- | --- |
| 0 | Full read — 34 chunk passes | 400–800 harvest rows |
| 1 | Seam spine — assign one seam per island | 120 seams, zone-ordered |
| 2 | Wisdom card per island | 120 cards |
| 3 | Author beats, one zone at a time | ~24 definitions per pass |
| 4 | Deep `full_story` track | blocked — see §7 |

Phase 1 is the highest-leverage step. Once every island has a seam, beats and cards become
mechanical, and the work parallelises cleanly by zone.

Island 092 (`island092Narrative.ts`) is the worked example of phases 1–3 on a single island.

## 7) Open decision

`islandNarrativeRegistry.test.ts` asserts that every beat in every registered definition is on
the `island_mission` track — *"must remain available in the free main loop."* The `full_story`
Pro track exists, and its playback split is implemented and tested, but registering the first
`full_story` beat means changing that assertion.

That is a product decision about paywalling narrative for the first time, not an engineering
detail. Phase 4 stays blocked until it is made.

## 8) Constraint to preserve

Island 82 stays unregistered — the registry test reserves it for a recurring-villain payoff
that remains documentation-only. It is the natural home for the Identity-zone fascism guardian
in §3, but that requires lifting the reservation deliberately.
