# Island Dialogue Master

Status: **Active narrative content contract**

## Purpose

This document defines how dialogue, story reactions, and Central Command orders are controlled across Island Run. It is the editorial map; the executable source of truth is the typed per-island narrative definition registered by `islandNarrativeRegistry.ts`.

## Canonical content path

1. Author an island's speakers and beats in `narrative/definitions/islandNNNNarrative.ts`.
2. Register that definition in `islandNarrativeRegistry.ts`.
3. Choose a canonical trigger and presentation surface for every beat.
4. Let the narrative dispatcher resolve live state transitions into authored beats.
5. Record one-time delivery through `narrativeSeenState`; never create a second dialogue-seen ledger.

Narrative definitions are display-only. They must never award currency, complete landmarks, move the token, alter probabilities, or invoke gameplay callbacks.

## Two narrative tracks

Use these names consistently in product discussion, content briefs, code, and QA:

| Internal track | Player-facing name | Access | Responsibility |
| --- | --- | --- | --- |
| `island_mission` | **Island Mission** | Included for everyone | The narrative wrapper around the main game loop: explain new mechanics, state the island mission, give short “do this next” commands, and deliver occasional brief dialogue or cinematic moments. |
| `full_story` | **Full Story Mode** | Pro | The complete long-form island story: extended scenes, deeper character arcs, mysteries, optional choices, and archive/replay material. |

The two tracks observe canonical gameplay; neither owns it. Island Mission always runs in the ordinary board context for both Free and Pro players. Full Story Mode runs only inside the separate Pro story context and must never be injected into rolls, landmarks, rewards, boss eligibility, island clear, or travel. A Pro player therefore receives the same clear game-loop guidance without duplicate long-form scenes appearing over play.

Every narrative beat must declare its track. Current shipped beats for Islands 1–5 are explicitly `island_mission`, including the short arrival/resolution StoryReader moments and the Concord first-contact call. Future `full_story` beats require separate approved content and Pro Story Mode playback wiring. Full Story Mode may unlock as canonical milestones are observed, but it must never become a condition for gameplay progress or rewards.

## Presentation surfaces

| Surface | Intended use |
| --- | --- |
| `story_reader` | Major illustrated or video story episodes. |
| `dialogue_sheet` | Character conversations that need deliberate reading. |
| `toast` | Short ambient reactions that should not interrupt play. |
| `expedition_phone` | Brief, imperative mission orders from Central Command. |

## Expedition Phone copy rules

- One mission heading.
- One command of no more than two short sentences.
- One display-only objective line.
- One acknowledgement label.
- No lore paragraphs, rewards, currencies, or competing calls to action.
- Automatic delivery first shows a compact **“Bip! Incoming message”** prompt. The phone does not unfold until the player taps **Read**.
- A persistent phone button may open the same sequence directly; in that case the phone-button tap is the explicit opening action.

## Expedition Phone physical and motion contract

- **Closed state:** a small, thin, hardened clamshell phone folded horizontally in half, with the upper cover resting directly over the lower half and a restrained holographic compass signal.
- **Display:** one continuous inner screen split only by the functional fold line. Fully unflipped, it must first read as a complete but small portrait phone before any enlargement begins.
- **Open sequence:** hologram retracts → the upper cover physically rotates around the horizontal hinge → it passes edge-on at 90 degrees and exposes the inner display → it continues to 180 degrees until both halves form one compact portrait phone → the phone keeps exactly the same width while its display and side rails telescope vertically to proper phone proportions → a short hold confirms that extension is complete → only then does the finished phone zoom uniformly to presentation size → Central Command UI comes online.
- **Timing:** the complete authored opening is approximately 2.45 seconds at 60 fps. The 180-degree unflip takes about 0.67 seconds, the fixed-width height extension remains 0.74 seconds, and only after its completion does a 0.25-second whole-phone snap zoom occur. Never combine the extension and zoom, substitute a card flip/opening box, or crossfade between unrelated shapes.
- **Open state:** a compact, thin phone with an almost-all-screen front. Precious metal, protective structure, and jewel detailing stay on the sides and rear rather than crossing the live screen.
- **Accessibility:** `prefers-reduced-motion` skips directly from the closed control to the readable open command UI.
- The motion is presentation-only. It must not write gameplay state, award rewards, or mark a narrative beat seen before acknowledgement.

## Island 1 communication trail

| Beat | Trigger | Surface | Purpose |
| --- | --- | --- | --- |
| `I001-B00` | Fresh Island 1 entry after the arrival story | `expedition_phone` | “Roll the dice. Collect the fragments.” Acknowledgement canonically arms the first roll. |
| `I001-B31` | First `the-concord` fragment collected (`0 → 1`) | `expedition_phone` | “Begin the diplomatic effort. Earn, build, and play.” Acknowledgement activates the ordinary island tile network. |
| `I001-B32` | The Concord is canonically active after fragment `9/9` | `dialogue_sheet` rendered as the Concord call screen | The Luma Caretaker becomes the first fully translated island voice and gives the five-light restoration purpose. |

Both transmissions are marked seen only when acknowledged. Their Island 1 tutorial transitions are committed atomically with the canonical seen ledger, preventing a reload or device sync from separating “message read” from “board activated.” The first-fragment transmission waits until the fragment-collection presentation has closed.

The first-contact call waits behind the assembly payoff, then opens before the reusable three-channel hub. If the app closes after The Concord activates but before the call is acknowledged, the active technology capability plus the shared seen ledger recovers `I001-B32` on the next hydration. It never grants rewards or alters gameplay progression.

## Adding future islands

Add beats to the island definition rather than editing UI components. Prefer existing triggers. When a genuinely new trigger family is required, extend the typed trigger union, validation, pure reaction snapshot/diff, and tests together. UI components render payloads only; they do not interpret gameplay progression.
