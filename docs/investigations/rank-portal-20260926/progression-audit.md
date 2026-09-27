# Executable rank and progression audit

Source main: `1cf96aec74cbb1bcbc59ef2b304c5a078a2fd82a`. Generated: 2026-09-26T18:39:33.986Z.

Island-only examples; no completed goals or habits, zero current reward bar except reset reproduction. These are XP calculations, not time-to-rank or measured player outcomes.

## Three different progress measures

- Island 40 arrival: 3950 Journey XP / Journey level 13.
- Journey level 40: 28080 Journey XP. This drives menu rank and the combined ladder.
- Activity player level 40: 252982 activity XP under the CURRENT CODE formula. This separate total feeds useGamification and dice regeneration.
- The canonical gameplay document instead specifies 150 × (L−1) × L and logarithmic two-hour regeneration. Runtime uses floor(L^1.5 × 1000) and discrete regen bands. This is existing code/contract drift; neither economy is changed by this slice.

| Arriving at island | Journey XP | Journey level |
| ---: | ---: | ---: |
| 1 | 0 | 1 |
| 2 | 150 | 2 |
| 10 | 950 | 5 |
| 20 | 1950 | 8 |
| 38 | 3750 | 12 |
| 39 | 3850 | 13 |
| 40 | 3950 | 13 |
| 41 | 4050 | 13 |
| 80 | 7950 | 19 |
| 120 | 11950 | 25 |

## Confirmed defects / integration risks

1. At Island 38, a full reward bar gives 3850 XP / level 13; resetting the same bar after claim yields 3750 XP / level 12. Reward-bar fill is not durable island progress.
2. The overlay adapter has no cycle input; 120→1 makes its inferred completed-island count drop from 119 to 0. The final island is also not counted as complete until travel, and wrap loses the first-cycle count entirely.
3. Active habit count and current completed-goal rows can decrease; absent/loading real-life inputs contribute zero. Therefore the derived total is not a durable earned-XP ledger.
4. App, leaderboard snapshot persistence and chest eligibility must use the same revised authoritative evidence. A UI-only XP floor is not sufficient.
5. Old acknowledged rank ID 12 means Sky Marshal; expanded ID 12 means Navigator III. A versioned acknowledgement migration is mandatory.

## Candidate 36-rank requirements

Stage I keeps existing XP/age anchors. II/III subdivide the next family band in thirds. This preserves old families but does NOT solve overall pacing. The two final thresholds deliberately remain undecided; no invisible grind added.

| # | Rank | Journey XP | Registered years | Status |
| ---: | --- | ---: | ---: | --- |
| 1 | Deckhand I | 0 | 0 | existing-anchor |
| 2 | Deckhand II | 50 | 0 | proposed-subdivision |
| 3 | Deckhand III | 100 | 0 | proposed-subdivision |
| 4 | Crewmate I | 150 | 0 | existing-anchor |
| 5 | Crewmate II | 280 | 0 | proposed-subdivision |
| 6 | Crewmate III | 410 | 0 | proposed-subdivision |
| 7 | Pathfinder I | 540 | 0 | existing-anchor |
| 8 | Pathfinder II | 810 | 0 | proposed-subdivision |
| 9 | Pathfinder III | 1080 | 0 | proposed-subdivision |
| 10 | Navigator I | 1350 | 0 | existing-anchor |
| 11 | Navigator II | 1850 | 0 | proposed-subdivision |
| 12 | Navigator III | 2350 | 0 | proposed-subdivision |
| 13 | Flight Operator I | 2850 | 0 | existing-anchor |
| 14 | Flight Operator II | 3700 | 0 | proposed-subdivision |
| 15 | Flight Operator III | 4550 | 0 | proposed-subdivision |
| 16 | Senior Operator I | 5400 | 0 | existing-anchor |
| 17 | Senior Operator II | 7010 | 0 | proposed-subdivision |
| 18 | Senior Operator III | 8620 | 0 | proposed-subdivision |
| 19 | Lieutenant I | 10230 | 0 | existing-anchor |
| 20 | Lieutenant II | 13020 | 0 | proposed-subdivision |
| 21 | Lieutenant III | 15810 | 0 | proposed-subdivision |
| 22 | Commander I | 18600 | 0 | existing-anchor |
| 23 | Commander II | 23110 | 0 | proposed-subdivision |
| 24 | Commander III | 27620 | 0 | proposed-subdivision |
| 25 | Wing Commander I | 32130 | 0 | existing-anchor |
| 26 | Wing Commander II | 39620 | 0 | proposed-subdivision |
| 27 | Wing Commander III | 47110 | 0 | proposed-subdivision |
| 28 | Captain I | 54600 | 1 | existing-anchor |
| 29 | Captain II | 66330 | 1 | proposed-subdivision |
| 30 | Captain III | 78060 | 1 | proposed-subdivision |
| 31 | Fleet Captain I | 89790 | 2 | existing-anchor |
| 32 | Fleet Captain II | 107290 | 2 | proposed-subdivision |
| 33 | Fleet Captain III | 124790 | 2 | proposed-subdivision |
| 34 | Sky Marshal I | 142290 | 3 | existing-anchor |
| 35 | Sky Marshal II | TBD | 3 | unresolved |
| 36 | Sky Marshal III | TBD | 3 | unresolved |

## Island 40 portal

User clarified that the portal unlocks the full app / Today, habits and goals, not primarily external services. Existing regular players are gated too; verified developer accounts bypass. Preserve all saved data. Paid Early Access bypasses access only, never island/rank progression. Account/privacy/support stay reachable. Ordinary launch is game-first; earned portal/dev/paid launch is Today.

Current implementation is a tested policy and story brief, not active route gating, purchase provisioning, AI processing or a shipped ceremony. Canonical ownership, entitlement verification, route integration, privacy consent and real runtime/browser tests remain.

Reproduce: `node scripts/run-rank-tests.mjs --audit`.
