# The Great Drift — Eternal Islands Development Plan

## Status

**Planning stage:** repository-grounded narrative and systems plan.
**Scope:** documentation-only development plan for the late-game Great Drift arc.
**Implementation posture:** extend the existing 120-island Island Run architecture; do not replace it with a new progression engine.

This document preserves the original narrative vision while separating confirmed repository facts, locked product decisions, MVP architecture recommendations, open product decisions, deferred features, and future detailed story-writing work.

---

## 1. Planning Ledger: What Is Fact, Decision, Proposal, or Deferred

| Category | Meaning in this plan | Current status |
|---|---|---|
| Confirmed repository facts | Behaviours, structures, or absences found in the repository investigation | Use as constraints for implementation planning |
| Product decisions already made | Decisions the MVP should treat as locked unless product direction changes | Build future implementation plans around these |
| Recommended MVP architecture | Practical implementation approach that fits the existing codebase | Recommended, but still needs implementation design and code review |
| Unresolved product decisions | Questions that still need an owner decision before build | Listed at the end of this document |
| Deferred features | Ideas that may fit the vision but should not be in the first implementation | Explicitly beyond MVP |
| Future story-writing work | Detailed scenes, dialogue, caretakers, and island scripts still to author | Planned as a later content phase |

---

## 2. Confirmed Repository Facts

### Overall compatibility

The repository is **partially compatible** with the Great Drift plan. The late-game storyline should be implemented as a small extension of the existing generated island architecture, not as a new progression engine.

The repository already has:

- a 120-island loop;
- canonical persisted Island Run state;
- sequential island travel;
- cycle progression;
- a narrative beat model;
- story manifests;
- narrative repeat policies;
- a cross-device seen ledger;
- timed-event state;
- Compass Book persistence;
- caretaker/inhabitant structures;
- creature collection and active companion state;
- canonical dice state and reward actions.

The repository does **not** currently have:

- a global Great Drift narrative-state model;
- threat-phase persistence;
- durable story decisions beyond seen-state;
- general world-state-dependent dialogue;
- a true apparent-ending state at Island 115;
- bespoke content for Islands 114–120;
- a separate future Essence balance.

### Island architecture

The island system is mostly generated.

Confirmed:

- names are explicitly listed for all 120 islands;
- act, depth, and intake stage are derived from island number;
- five acts contain 24 islands each;
- Islands 97–120 belong to Act 5, **Transcendence**;
- special-island metadata is defined separately;
- shared boards, rewards, stops, and completion systems are parameterised by island;
- Compass Book contains 120 island-linked activities;
- `currentIslandNumber` is the runtime progression authority;
- `cycleIndex` tracks completed cycles;
- progression is sequential;
- completed islands are not generally selected through a free revisit map.

### Current final-island behaviour

Island 120 is the actual technical capstone.

Confirmed behaviour:

- the maximum island number is hard-coded as 120 in multiple systems;
- travel after Island 120 wraps to Island 1;
- `cycleIndex` increments;
- Island 120 may grant a theme entitlement;
- Island 120 is a rare, special, milestone, and treasure-path island;
- Island 115 is currently a normal island;
- there is no current apparent-ending/post-ending structure.

Therefore this plan must not describe Island 115 as the current technical ending. Island 115 should become the **apparent story ending** while technical progression remains unchanged and still proceeds through Island 120.

### Story architecture

The current narrative system supports:

- island-entered triggers;
- arrival-closed triggers;
- stop-opened triggers;
- stop-completed triggers;
- landmark-completed triggers;
- boss triggers;
- island-clear triggers;
- once-only narrative beats;
- speakers;
- text;
- CTAs;
- priorities;
- story-reader surfaces;
- dialogue-sheet surfaces;
- toast surfaces;
- episode paths;
- cross-device seen state.

The narrative validation system intentionally prevents authored narrative data from mutating gameplay state. Preserve this rule. Gameplay-affecting state must change through canonical Island Run actions, not through narrative manifests or React components.

The existing narrative implementation is currently strongest around Island 1 and must be generalised and populated for Islands 114–120.

### Caretakers and creatures

Caretaker/inhabitant infrastructure exists, but only Island 1 content is currently registered. Final-island caretakers should be authored through the existing inhabitant registry.

Creature collection and active companion state already persist. However, there is no complete generic creature-dialogue engine. The MVP should use lightweight companion reactions, not a full creature-specific branching system.

### Compass Book

Confirmed:

- there are 6 chapters;
- each chapter has 20 activities;
- there are 120 total island-linked activities;
- Chapter 6 covers Islands 101–120;
- Chapter 6 is **The Personal Playbook**;
- answers persist in Supabase;
- a local fallback/cache exists.

The MVP should reuse or substantially rewrite the existing Island 120 Chapter 6 activity. It should not add a new journal system or a 121st activity.

### Currency

The current internal Essence system is deeply embedded. Current Essence is not merely a label; it is a technical and persisted currency system.

It is used as:

- a persisted wallet;
- a reward kind;
- a spend currency;
- a stop-ticket cost;
- a build cost;
- a daily-spin multiplier cost;
- a dice-pack cost;
- a reward-bar resource;
- a minigame reward;
- a lifetime earned/spent metric;
- a Supabase runtime-state field;
- a localStorage field.

---

## 3. Product Decisions Already Made

### Star Tokens

The current ordinary Island Run currency should be renamed **Star Tokens** in user-facing language.

For the first implementation:

- preserve the existing internal `essence` key;
- preserve existing Supabase columns;
- preserve old localStorage records;
- preserve reward and spend logic;
- introduce a central display-name adapter;
- do not perform a database rename.

The existing currency represents practical, agreed trade value. It is used for things such as:

- stop tickets;
- builds;
- boosts;
- daily-spin multiplier costs;
- dice packs;
- market purchases;
- ordinary rewards.

The safest Star Token strategy is:

1. display rename;
2. adapter layer;
3. optional gradual code cleanup;
4. avoid database rename unless later justified.

### Future Essence

Future lore **Essence** must be a separate resource. It must not reuse the current persisted `essence` field.

Working concept:

- Star Tokens store agreed value;
- dice represent immediate movement and action;
- Essence stores renewal, movement, and life potential;
- Essence can primarily be converted into dice;
- Island 114 reveals the deeper nature of Essence;
- Perfect Memory provides the pattern for restoration;
- Essence provides the capacity to restore;
- the combination creates the Eternal Loop.

Use an unambiguous working internal name such as `renewalEssence`. The user-facing name remains **Essence**. Do not present `renewalEssence` as a final player-facing name.

### Great Drift escalation

Use milestone-driven escalation for the MVP. Do not recommend a real-time countdown for the first implementation. The threat should advance through authored island milestones and persisted phase flags.

### Island ending structure

Island 115 should become an apparent narrative ending. It should not become the technical final island.

Island 120 must remain the actual capstone and cycle wrap. The current 120-island travel architecture should remain intact.

### Compass Book

Use the existing Compass Book Chapter 6 for final reflections. Do not add a 121st activity for MVP.

The Island 120 activity should culminate in:

> What are you ready to stop carrying?

### Creatures and caretakers

For MVP:

- caretakers explain the public technical crisis;
- creatures or the active companion notice the hidden emotional or cultural problem;
- creature dialogue should be lightweight and flavour-oriented;
- do not introduce creature inventory removal;
- do not require fully authored variants for every creature.

---

## 4. Core Narrative Premise

The late-game arc of the 120-island journey explores a civilisation that has progressively solved the limitations of human life:

- memory loss;
- bodily decay;
- disease;
- scarcity;
- death;
- damaged infrastructure;
- lost knowledge.

These breakthroughs initially appear to represent the final success of civilisation.

Instead, they create a new class of problems.

The final arc asks:

> What happens when every human limitation is finally solved—and those limitations turn out to have been protecting us?

The player gradually discovers that forgetting, endings, uncertainty, privacy, ageing, and irreversible consequences are not merely technical defects. They are also part of how meaning, forgiveness, attention, identity, novelty, and growth remain possible.

---

## 5. The Great Drift

The late-game crisis is known as **the Great Drift**.

It is not a single disaster. It is a gradual civilisation-wide loss of meaning, direction, emotional movement, and cultural renewal.

People remain alive and technically functional, but increasingly become:

- trapped in old identities;
- unable to release painful memories;
- bored by endlessly repeated experiences;
- emotionally desensitised;
- dependent on escalating novelty;
- unable to forgive;
- unable to complete relationships, roles, or chapters of life;
- afraid to let anything end.

The Great Drift spreads differently across the island network, but its causes are connected.

---

## 6. The Combined Help Signal

The player and the patrol receive an unusual distress signal.

No individual island sent it.

The signal has emerged from the combined residue of:

- abandoned distress calls;
- damaged machines;
- behavioural telemetry;
- forgotten intentions;
- unfinished prayers;
- creature migration patterns;
- fragments of archived memories;
- systems repeatedly attempting to repair themselves.

Together, these signals form a coherent message:

> **HELP US FORGET.**

At first, the player assumes the islands are suffering from damaged memory systems, lost history, or erased identities.

The actual problem is the opposite:

> The islands are losing the ability to forget.

---

## 7. The Patrol Mission and the Permanence Engine

The player travels as part of an inter-island patrol or survey vessel.

Possible working identities:

- **Sanctuary Survey**;
- **Starward Service**;
- **S.S. Luma**;
- **The Patrol**;
- **The Compass Patrol**.

The original mission appears to be a broad investigation into unusual technical failures across the islands.

Later, it becomes clear that the patrol is following the first visible symptoms of the Great Drift.

The patrol's mission evolves from:

1. investigate local disturbances;
2. repair failing systems;
3. identify the shared cause;
4. contain the expanding threat;
5. reach the civilisation that perfected the underlying technology;
6. decide how memory, renewal, endings, and identity should work in the future.

### Working concept: The Permanence Engine

Around Island 7 or Island 8, the player activates, awakens, or accidentally completes an ancient system.

The **Permanence Engine** was built to protect civilisation from loss. Its purpose is to continuously record, restore, and preserve:

- bodies;
- buildings;
- memories;
- identities;
- simulations;
- ecosystems;
- damaged infrastructure;
- erased data;
- emotional records.

Its creators treated forgetting, decay, and irreversible loss as defects.

Once activated, the Permanence Engine begins transmitting an expanding field through the island network.

This means:

- damaged structures rebuild;
- erased memories return;
- old emotional states reactivate;
- extinct simulations restart;
- bodies begin repairing themselves;
- abandoned systems come back online;
- completed conflicts reopen;
- identities become harder to change.

### MVP escalation recommendation

The original plan imagined urgency, clocks, telemetry, and field expansion. Repository findings make milestone escalation the best MVP fit.

| Escalation option | Fit for MVP | Notes |
|---|---:|---|
| Real-time timer | No | Creates offline reconciliation complexity, device-time issues, higher test burden, inactive-user punishment, and tonal conflict with the game's supportive posture |
| Island-progression timer | Possible | Feasible but more mechanical and predictable |
| Milestone escalation | Yes | Reuses island thresholds, is easy to persist, avoids punishing inactivity, fits authored beats, is easier to test, and preserves agency |
| Hybrid timer | Later | Defer beyond MVP until the Great Drift state model and content are proven |

The MVP should communicate pressure through authored milestones rather than a literal countdown:

- telemetry updates;
- visible phase changes;
- altered NPC behaviour;
- creatures reacting to the field;
- patrol communications;
- island-specific thresholds;
- late-game narrative reveal flags.

---

## 8. The Two-Problem Island Structure

Each relevant island should contain two linked problems:

1. **A technical problem**
2. **A moral, emotional, or cultural problem**

The technical problem is what the island asks the patrol to fix.

The cultural problem is what prevents the technical solution from working safely.

The player should not be able to fully solve the island by repairing machinery alone.

| Island issue | Technical layer | Moral or cultural layer |
|---|---|---|
| Nobody forgets arguments | The memory system preserves every detail | People believe forgiveness means declaring the harm acceptable |
| Everyone can live indefinitely | Essence continuously repairs the body | Nobody can release an identity, relationship, role, or dream |
| Work has been automated | Distribution systems are unstable | People no longer know how to feel useful |
| Every desire can be simulated | Pleasure systems are overheating | People cannot distinguish desire from meaning |
| Outcomes can be predicted | Prediction systems become recursive | People refuse to act without certainty |
| Nobody dies | Population and resource systems destabilise | Choosing an ending is treated as betrayal |
| Perfect partners can be generated | Compatibility systems fragment relationships | People abandon relationships at the first discomfort |
| All history is preserved | Archives consume the island | Nobody agrees what deserves continuing attention |

### Design rule

The player repairs the system only after understanding the belief, fear, incentive, or unresolved conflict sustaining the failure.

This allows wisdom to become gameplay rather than detached quotations.

For MVP delivery, the caretaker should generally explain the public technical crisis, while the active companion or a lightweight creature reaction reveals the hidden emotional contradiction.

---

## 9. Thematic Foundations

The final arc should explore the difference between:

- remembering and reliving;
- persistence and imprisonment;
- longevity and aliveness;
- repair and refusal to change;
- completion and meaning;
- identity and rigidity;
- novelty and attention;
- privacy and secrecy;
- forgiveness and denial;
- historical accountability and personal emotional release;
- preservation and possession;
- an ending and a failure.

The late-game story should connect these themes back to the app's broader emotional systems:

- shame;
- self-forgiveness;
- courage;
- being seen;
- restarting;
- failed goals;
- emotional punishment;
- gradual exposure;
- changing identity;
- releasing old self-judgements;
- learning without carrying everything at full emotional weight.

---

## 10. Recommended MVP Architecture

### Great Drift persisted state

The MVP should store compact Great Drift state in canonical Supabase-backed Island Run persistence. A separate narrative-state table may be considered later if the branching model grows.

The following TypeScript shape is conceptual planning language, not a final schema mandate:

```ts
type GreatDriftPhase =
  | 'dormant'
  | 'activated'
  | 'restoration_anomalies'
  | 'memory_saturation'
  | 'identity_lock'
  | 'renewal_race'
  | 'apparent_victory'
  | 'eternal_loop_revealed'
  | 'living_memory'
  | 'final_horizon_resolved';

interface GreatDriftState {
  phase: GreatDriftPhase;
  activationSeen: boolean;
  apparentEndingSeen: boolean;
  finalArcRevealed: boolean;
  livingMemoryUnlocked: boolean;
  finalReflectionCompleted: boolean;
  milestoneFlags: string[];
  finalChoiceId?: string;
}
```

Implementation principles:

- provide safe defaults for old saves;
- sanitise persisted state on hydration;
- derive or advance phases through canonical actions;
- avoid gameplay writes in React UI components;
- keep narrative manifests declarative and non-mutating;
- use once-only beats and the cross-device seen ledger for presentation history;
- use persisted Great Drift flags for durable story state.

### Future Essence MVP

Future lore Essence should:

- use a separate persisted balance;
- be hidden before its story reveal;
- become visible through Great Drift narrative state;
- convert into dice through a canonical Island Run action;
- not reuse the current reward key `essence`;
- have separate analytics and tests;
- use safe defaults for old saves;
- support local hydration and cross-device persistence.

For MVP, store it in canonical Island Run runtime state. A generic wallet may be more appropriate later if Essence becomes app-wide.

### Essence-to-dice conversion architecture

The canonical Essence-to-dice action should:

1. read canonical state;
2. validate the reveal flag;
3. validate the available future Essence balance;
4. validate conversion limits;
5. calculate the dice amount;
6. debit future Essence;
7. credit `dicePool`;
8. commit both in one atomic state change;
9. emit telemetry;
10. allow UI animation from the resulting state update.

Do not place conversion logic directly in UI components.

### Narrative generalisation

MVP narrative implementation should extend the existing narrative registry rather than building a new story engine.

Recommended approach:

- register late-game manifests for Islands 114–120;
- preserve narrative validation that blocks gameplay mutation;
- use triggers already supported by the narrative system;
- use phase flags to control visibility;
- add caretaker definitions through the existing inhabitant registry;
- keep companion reactions lightweight and non-branch-explosive;
- rely on canonical Island Run actions for state changes.

---

## 11. Islands 114–120: Confirmed Metadata and Proposed Roles

| Island | Current name | Confirmed repository status | Proposed role |
|---:|---|---|---|
| 114 | Galaxy Gate | Act 5 / Transcendence; reflection stage; special/seasonal; no bespoke story, caretaker, or island-specific assets found; uses shared completion systems | Discovery of completed Essence renewal |
| 115 | Lunar Haven | Ordinary island in current metadata; not technically final; no bespoke story, caretaker, or island-specific assets found | Apparent utopian ending and Perfect Memory civilisation |
| 116 | Crown of Infinity | Existing Island 116 name in the 120-island sequence | The Right to Forget |
| 117 | Astral Plains | Existing Island 117 name in the 120-island sequence | The Last First Time |
| 118 | Voidwalker Isle | Existing Island 118 name in the 120-island sequence | The Voluntary Ending |
| 119 | Ascension Isle | Existing Island 119 name in the 120-island sequence | The Unrecorded Day |
| 120 | Final Horizon | True capstone; special; rare; milestone; treasure-path; wraps to Island 1; increments `cycleIndex`; may grant Island 120 theme entitlement; no bespoke story currently authored | The Island That Changes |

### Island 114 — Galaxy Gate

#### Role in the arc

Island 114 appears to deliver the final great technical victory.

The patrol discovers or completes the final form of future **Essence**.

Essence is not merely energy. It is restoration instruction: a renewal language that tells life what state it can return to.

The existing name, **Galaxy Gate**, is compatible and should be retained as the working name.

#### Technical problem

The formula is unstable because the system cannot determine which version of a person represents the correct self.

Possible restoration targets include:

- the youngest body;
- the healthiest body;
- the body before illness;
- the body before trauma;
- the body the person identifies with;
- the current body;
- a continuously changing ideal;
- a culturally approved template.

The technical challenge is therefore an identity problem disguised as biological engineering.

#### Cultural problem

The island is divided over what eternal repair means.

Possible groups include:

- people who repeatedly reset themselves;
- people who refuse renewal;
- people who preserve children permanently;
- people who alter themselves every decade;
- people who consider ageing an act of rebellion;
- people who preserve a deceased person's last version;
- families that disagree over which version of someone is the real one.

#### Apparent resolution

The player helps stabilise the Essence system.

Eternal bodily renewal becomes possible.

This unlocks the route to Island 115.

The victory should feel impressive, beautiful, and slightly unsettling.

#### Core question

> Which version of you deserves to be preserved forever?

### Island 115 — Lunar Haven

#### Role in the arc

Island 115 becomes the apparent final island and the culmination of the civilisation's technological ambitions.

It has solved:

- disease;
- bodily decay;
- scarcity;
- infrastructure loss;
- memory loss;
- death;
- reconstruction;
- preservation.

At first, it appears to be a utopia.

Then the patrol discovers the consequences.

The existing name, **Lunar Haven**, is compatible and should be retained as the working name.

#### Apparent ending implementation

Island 115 can feel final without changing progression architecture.

Recommended MVP:

- Island 115 presents a full victory sequence;
- the mission appears resolved;
- the player receives emotional and narrative closure;
- a contradiction, delayed signal, memory error, or restored event breaks the victory;
- `apparentEndingSeen` persists;
- `finalArcRevealed` unlocks the meaning of Islands 116–120;
- ordinary travel continues to Island 116;
- no new island engine or hidden map is required.

#### Social symptoms

People increasingly create danger because consequences no longer feel permanent.

Possible behaviours include:

- staging disasters;
- manufacturing enemies;
- creating extreme experiences;
- erasing and rebuilding parts of their personality;
- competing to experience something unprecedented;
- withdrawing from society;
- simulating centuries of suffering or worship;
- repeating relationships with altered memories;
- treating other people as novelty devices;
- escalating risk to feel alive.

#### Technical problem: Perfect Memory

Every new experience is instantly compared with every previous experience.

Nothing arrives innocently.

- no song is heard without every prior song;
- no relationship begins without every former relationship;
- no apology is heard without perfect recall of the injury;
- no place feels new;
- no identity can escape its archived versions;
- no argument truly ends;
- no shame naturally fades.

The memory system preserves identity so completely that identity can no longer change.

#### Cultural problem

The civilisation has mistaken memory for meaning.

Its people believe:

- forgetting means something did not matter;
- releasing pain dishonours the harmed self;
- reducing emotional intensity falsifies history;
- archived experience must remain continuously accessible;
- permanent remembrance is a moral duty;
- deleting or resting memory is equivalent to destroying identity.

The island wants relief but cannot consent to losing anything.

#### Core dilemma

The solution should not be:

- total memory destruction;
- simple forgetting;
- forced erasure;
- returning everyone to ignorance.

The player must discover a third possibility.

### Living Memory

The proposed solution is **Living Memory**.

Memory remains available, but it is allowed to change status.

Possible memory states:

1. present;
2. active;
3. unresolved;
4. integrated;
5. resting;
6. archived;
7. released.

The purpose is not to deny what happened.

The purpose is to prevent every event from remaining emotionally present forever.

#### Core wisdom

> To honour something does not require carrying it at full weight forever.

#### Gameplay possibilities

The player may need to:

- classify memories;
- help characters decide what remains active;
- separate factual records from emotional punishment;
- restore consent over memory access;
- create private memory spaces;
- allow memories to rest;
- distinguish public history from private healing;
- test different memory policies;
- experience consequences of over-preservation and over-erasure.

### Island 116 — Crown of Infinity: The Right to Forget

Island 116 begins the revealed final arc beyond the apparent ending.

#### Core conflict

The civilisation must decide what individuals may release and what society must preserve.

#### Technical problem

Memory ownership, access, archival, and deletion systems conflict.

#### Cultural problem

People confuse personal emotional release with historical denial.

#### Wisdom

> Personal healing and historical accountability are not the same kind of memory.

A person can stop reliving harm without pretending it never happened.

### Island 117 — Astral Plains: The Last First Time

#### Core conflict

People who have lived for centuries believe novelty has ended.

#### Technical problem

Experience systems continuously compare new events with archived ones, preventing surprise.

#### Cultural problem

The civilisation treats novelty as encountering something nobody has ever encountered before.

#### Resolution direction

The island learns that novelty can come from:

- deeper attention;
- becoming a different person;
- seeing through someone else's perspective;
- commitment;
- mastery;
- rediscovery;
- changing relationships;
- noticing hidden layers.

#### Wisdom

> A shallow life needs endless new experiences. A deep life can discover infinity inside one thing.

### Island 118 — Voidwalker Isle: The Voluntary Ending

#### Core conflict

Some inhabitants want the right to stop renewing themselves.

This island must be handled carefully through consent, completion, dignity, and philosophical limits. Do not frame it casually or as a simplistic lesson about death.

#### Technical problem

Essence has no safe termination state.

#### Cultural problem

Choosing an ending is treated as betrayal, ingratitude, or proof that life was not valuable.

#### Wisdom

> An ending does not prove that something failed. Sometimes the ending is what gives the thing its shape.

### Island 119 — Ascension Isle: The Unrecorded Day

#### Core conflict

The island is offered one day that will not be automatically recorded.

#### Technical problem

The recording network must allow temporary non-capture without destabilising identity or public systems.

#### Cultural problem

People no longer know how to behave when their actions do not become permanent records.

Possible reactions:

- panic;
- dishonesty;
- cruelty;
- intimacy;
- play;
- creativity;
- confession;
- withdrawal;
- genuine experimentation.

#### Wisdom

> Privacy is not merely secrecy. It is the space in which an unfinished self can grow.

### Island 120 — Final Horizon: The Island That Changes

#### Role in the ending

Island 120 is the true capstone and cycle wrap. The final narrative resolution should integrate with the existing 120-to-1 wrap rather than replacing it.

Retain the existing theme-entitlement behaviour for MVP.

The final island cannot be perfectly mapped, stored, restored, or repeated.

Its landscape changes whenever someone returns.

The Compass Book cannot fully document it.

The island resists complete systematisation.

#### Technical problem

There may be no true technical fault.

The player initially assumes the island must be stabilised.

#### Personal problem

The final challenge is the player's expectation that every mystery must become a system, every blank must be filled, and every journey must be permanently completed.

#### Final wisdom

> You were never sent to make the universe permanent.
> You were sent to help it remain alive.

#### Final Compass reflection

Use the existing Island 120 Chapter 6 Compass activity. Rewrite or substantially extend it so the final prompt culminates in:

> What are you ready to stop carrying?

---

## 12. Connection Back to the Early Weapon

The Permanence Engine activated near Island 7 or 8 should eventually be revealed as an early or incomplete version of the technology perfected on Island 115.

This creates a complete narrative loop:

1. an early island introduces the threat;
2. the middle islands show different symptoms;
3. the player follows the expanding field through milestone-driven escalation;
4. Island 114 provides the final Essence breakthrough;
5. Island 115 reveals the fully developed Eternal Loop;
6. Islands 116–120 define the rules for using the technology wisely;
7. Island 120 resolves through the existing cycle wrap instead of replacing it.

The player should eventually realise that repairing the system without changing its philosophy would complete the disaster.

---

## 13. Connection to the Player's Own Collection Loop

The final arc can gently reflect the player's own behaviour.

The game encourages the player to:

- collect creatures;
- complete chapters;
- fill the Compass Book;
- preserve rewards;
- unlock every island;
- retain progress;
- finish every blank space.

The final story can question whether total completion is the same as a fully lived journey.

This should not punish collection or delete player progress.

Instead, the final reward may be something that cannot be permanently possessed.

Possible endings:

- the final badge changes over time;
- the final island cannot be replayed identically;
- an NPC forgets the player but retains what they learned;
- the last Compass page remains partly blank;
- the final reward is a future possibility rather than an owned item.

For MVP, do **not** remove creatures, delete inventory, or make permanent loss the emotional mechanism. The story can ask the player to release a symbolic burden without taking away earned progress.

---

## 14. Narrative Delivery Principles

The wisdom should emerge through:

- character conflict;
- system behaviour;
- island mechanics;
- choices;
- visible consequences;
- creature reactions;
- caretaker dialogue;
- environmental storytelling;
- short cinematic scenes;
- Compass Book reflections;
- patrol telemetry;
- decisions that change how the island functions.

Avoid relying primarily on:

- isolated inspirational quotes;
- long lectures;
- abstract philosophy without consequences;
- obviously correct answer buttons;
- repetitive moral-choice formats;
- every island ending with the same type of resolution.

Each island should feel like a place with a functioning society, not merely a lesson delivery screen.

---

## 15. Practical Development Phases

### Phase 1 — Product decisions

Lock:

- Island 115 false-ending treatment;
- Great Drift state location;
- future Essence internal name;
- Star Token icon direction;
- Island 120 Compass activity treatment;
- companion reaction depth.

### Phase 2 — Star Token display rename

- central display adapter;
- copy updates;
- icon updates if approved;
- no database rename;
- compatibility tests.

### Phase 3 — Great Drift state foundation

- defaults;
- sanitisation;
- hydration;
- persistence;
- canonical actions;
- legacy-save tests;
- milestone phase derivation.

### Phase 4 — Narrative generalisation

- extend narrative registry beyond Island 1;
- register Islands 114–120;
- add late-game manifests;
- add caretaker definitions;
- add conditional narrative resolution.

### Phase 5 — Future Essence MVP

- separate persisted resource;
- story reveal gate;
- canonical Essence-to-dice action;
- conversion UI;
- telemetry;
- tests.

### Phase 6 — Detailed Islands 114–120 story writing

For each island, define:

- environment;
- civilisation;
- caretaker;
- creature role;
- arrival scene;
- technical problem;
- moral/cultural problem;
- investigation;
- gameplay;
- decision;
- resolution;
- Compass reflection;
- reward;
- consequence;
- transition.

### Phase 7 — Early and middle foreshadowing

- Permanence Engine activation near Island 7 or 8;
- telemetry milestones;
- sparse recurring signals;
- earlier memory, restoration, novelty, identity, privacy, and ending themes.

### Phase 8 — Final integration

- Island 115 false ending;
- Island 116 reveal;
- Island 120 final resolution;
- existing cycle wrap;
- theme entitlement;
- Compass Book persistence;
- cross-device state validation.

---

## 16. Testing Requirements for Future Implementation

When implementation begins, add or update tests for:

- Great Drift default state;
- hydration of old saves;
- milestone phase derivation;
- once-only activation beat;
- Island 115 apparent-ending state;
- Island 116–120 progression after the reveal;
- Island 120 wrap remaining unchanged;
- Island 120 entitlement remaining unchanged;
- narrative visibility by phase;
- Star Token display adapter;
- legacy essence compatibility;
- separate future Essence balance;
- atomic Essence-to-dice conversion;
- failed conversion preserving both balances;
- cross-device persistence;
- Island 120 Compass reflection persistence;
- caretaker registration;
- narrative validation blocking gameplay mutation.

---

## 17. Features Deferred Beyond MVP

Do not include these in the first Great Drift implementation:

- real-time Great Drift countdown;
- database rename of current essence fields;
- fully branching narrative engine;
- many permanent story choices;
- creature inventory removal;
- unique caretakers for all 120 islands;
- global visual corruption effects across every island;
- a 121st Compass activity;
- generic app-wide wallet architecture;
- several Essence spending systems;
- full creature-specific dialogue for every companion.

---

## 18. Open Product Decisions

1. **Should Island 115 merely feel final, or should progression briefly pause until the reveal scene is completed?**
   Strong recommendation: allow ordinary travel to continue to Island 116, but require the reveal beat to be seen before late-arc narrative beats become visible.

2. **Should Great Drift state be stored as a JSON-like field inside Island Run runtime state or in a separate narrative-state table?**
   Strong recommendation for MVP: store compact state in canonical Island Run persistence. Reconsider a separate table only if branching and story decisions grow.

3. **Should the future internal resource key be `renewalEssence`, `lifeEssence`, or another unambiguous name?**
   Strong recommendation: use `renewalEssence` as the working internal name because it distinguishes the resource from current `essence` and aligns with the story reveal.

4. **Should the Island 120 Compass activity replace the current content or substantially extend it?**
   Recommendation: substantially rewrite or extend the existing Island 120 activity while preserving the Chapter 6 structure and persistence path.

5. **How much companion-affinity variation should exist in MVP?**
   Recommendation: use broad affinity or active-companion flavour lines only. Do not author full variants for every creature.

6. **Should the existing Island 120 theme entitlement remain tied exactly to the 120-to-1 wrap?**
   Strong recommendation: yes for MVP. Preserve the existing reward and avoid changing cycle-wrap economics while adding story resolution around it.

7. **Should Star Tokens initially reuse the current icon, or launch with distinct new iconography?**
   Recommendation needed from product/art. The technical plan supports either, as long as the display adapter centralises naming and presentation.

---

## 19. North Star

The final arc should leave the player with a feeling that is hopeful, unsettling, and personally relevant.

The story should not argue that suffering, ageing, loss, or death are inherently good.

It should argue that removing a limitation technically does not remove the need for wisdom.

The civilisation's final challenge is not learning how to preserve everything.

It is learning:

- what to keep;
- what to transform;
- what to rest;
- what to release;
- what to allow to end;
- and how to remain alive in a world where almost anything can be repaired.

> The goal is not to make life permanent.
> The goal is to keep it capable of becoming new.
