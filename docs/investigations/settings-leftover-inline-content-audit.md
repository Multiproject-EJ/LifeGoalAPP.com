# Settings leftover inline content audit

Date: 2026-05-21  
Scope: `src/features/account/MyAccountPanel.tsx`, `src/components/SettingsFeatureCard.tsx`, `src/styles/settings-folders.css`, and inline-rendered imported settings sections.

## PASS/FAIL summary

**Overall: FAIL (minor/targeted follow-up needed).**

- ✅ The module grid (`Feature Hub`) is now the primary entry for most settings features.
- ✅ Most feature settings are opened through dedicated module cards + popups.
- ⚠️ A few surfaces still render inline on main Settings and should be evaluated for module-box treatment consistency.
- ⚠️ Some card wrappers/section wrappers appear duplicate or semantically empty after migration.

---

## Inline content map (main Settings surface)

The following is still visible inline (outside popup modules) in `MyAccountPanel`:

1. **Onboarding tools card** (conditionally shown when `onLaunchOnboarding` exists):
   - Local progress snapshot, Day 0 status, storage keys, launch/restart actions.
2. **Subscription / Plan overview card**:
   - Plan/status/renew date/wallet rolls + upgrade/manage/buy actions.
3. **Feature Hub card**:
   - Module grid itself (expected/desired).
4. **Feedback & Support launcher card**:
   - Intro copy + “Open support center” action only.
5. **Session footer action row**:
   - Sign-out explainer text + “Sign out” button.

Additionally, modal/popup overlays are mounted in-page but not visible until invoked (expected React pattern).

---

## Recommendation table

| Inline item | Current status | Should become own module box? | Rationale |
|---|---|---:|---|
| Onboarding tools | Inline card in summary grid | **Yes (recommended)** | It is a feature/tooling area, not account-critical auth/billing/privacy/legal. It fits module paradigm and can be opened from a card. |
| Subscription / Plan overview | Inline card in summary grid | **No** | Billing is explicitly account-critical and should remain obvious/predictable. Current visibility is appropriate. |
| Feature Hub | Inline card containing module grid | **No change** | This is the intended primary navigation surface, not leftover feature content. |
| Feedback & Support launcher | Inline card (button opens popup) | **Optional** | Already a lightweight launcher. Could be converted into a module card inside grid for consistency, but current behavior is acceptable because support is important and discoverability is good. |
| Session sign-out row | Inline footer action | **No** | Session/auth action should remain obvious and predictable; keep inline. |

---

## Items that should **NOT** be module-box migrated

Per rule carve-outs (account-critical/session/billing/auth/privacy/legal/dangerous):

- **Subscription / Plan overview** (billing-critical).
- **Session sign-out control** (auth/session-critical).
- Any future legal/privacy disclosures that must remain immediately visible (none currently inline besides routing to AI & Privacy module).

Note: AI & Privacy controls are already encapsulated in a dedicated popup module, with clear guardrail copy in the popup header.

---

## Duplicate or empty wrappers check

Potential leftovers:

1. **Support appears twice by heading/copy**:
   - Inline “Feedback & Support” launcher card.
   - Popup content repeats same heading and intro copy.
   - This is functionally valid, but mildly duplicative.

2. **`settings-modules__group` uses identical `aria-label` on multiple groups**:
   - Both groups labeled `"Settings feature modules"`.
   - Not empty, but redundant semantics.

3. **Nested card wrappers in popups**:
   - Several popups contain one `section.account-panel__card` that mainly wraps a single imported section/component.
   - Not broken, but can be considered wrapper overhead cleanup (cosmetic, low priority).

No truly empty rendered wrapper blocks were found in current main settings flow.

---

## Is module grid now the main Settings interaction surface?

**Yes (PASS).**

The `Feature Hub` with grouped `SettingsFeatureCard` entries is the central settings launch surface for appearance, haptics, menu display, birthday gift, AI/privacy, holiday themes, reminders, notifications, admin tools, game/rewards, and experimental features.

---

## Are any settings hidden too deeply inside popups?

**Mostly no; one mild depth concern.**

- Most modules are 1 click from Feature Hub and then directly visible in popup content.
- **Mild concern:** Feedback workflow requires launcher card → support popup → action (2-step path). This is acceptable, but if simplification is desired, a direct module card route could reduce depth.
- Admin-only diagnostics are intentionally dense/deep and appropriately gated.

---

## Recommended safe follow-up PR slices

1. **Slice A — Onboarding module normalization (recommended first)**
   - Add an “Onboarding tools” module card in Feature Hub.
   - Move current onboarding inline card content into dedicated popup module.
   - Preserve all existing controls/labels/gating.

2. **Slice B — Support entry consistency (optional)**
   - Replace inline “Feedback & Support” launcher card with a module card in Feature Hub, or keep launcher but trim duplicate header copy between launcher and popup.
   - Keep current modal flows unchanged.

3. **Slice C — Wrapper/semantics polish (optional low-risk cleanup)**
   - Differentiate group `aria-label`s for Personalization vs Quick modules.
   - Remove any redundant single-purpose wrapper cards only where it does not alter layout/spacing contracts.

4. **Slice D — Validation pass**
   - Snapshot/manual QA for Settings page information hierarchy.
   - Verify billing + sign-out remain inline and prominent.
   - Verify no feature access gating changes.

---

## Final verdict

The refactor is largely successful: module cards and popup modules now dominate the settings UX. The only clear leftover inline candidate that should likely be module-boxed for consistency is **Onboarding tools**. Billing and session/auth surfaces should remain inline by design.
