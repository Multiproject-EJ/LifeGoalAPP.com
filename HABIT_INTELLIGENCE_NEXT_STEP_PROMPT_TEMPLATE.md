# Reusable Prompt Template: Build the Next Step of Habit Intelligence

Use this prompt to direct an AI coding agent to implement the next increment of `HABIT_INTELLIGENCE_INTEGRATION_PLAN.md` while reusing the existing app architecture.

---

## Prompt (copy/paste)

You are working in the LifeGoalAPP codebase.

### Objective
Implement **the next step** from `HABIT_INTELLIGENCE_INTEGRATION_PLAN.md`.

### Source of truth
- Read and follow: `HABIT_INTELLIGENCE_INTEGRATION_PLAN.md`
- Reuse existing systems first (do not rebuild what already exists), especially:
  - adherence snapshots
  - performance classifier + suggestions engine
  - AI rationale and AI suggestion services
  - today/time-limited-offer flow
  - archive + adjustment persistence
  - existing XP/challenge hooks

### Step selection
Implement exactly this plan step:
- **Phase:** {{PHASE_NAME}}
- **Step:** {{STEP_NAME}}
- **Goal statement:** {{GOAL}}

If the requested step is ambiguous, choose the smallest shippable slice and state assumptions.

### Reuse-first constraints (important)
1. Prefer extending existing files/services over adding parallel systems.
2. Do not add a new AI provider pathway if existing AI services can be reused.
3. Keep migrations minimal and backward compatible.
4. Avoid broad refactors unrelated to this step.
5. Preserve current UX behavior unless the step explicitly changes it.

### Required workflow
1. Scan repository for the exact existing components relevant to this step.
2. Propose a short implementation plan (files + approach).
3. Implement the change.
4. Add/update tests where practical.
5. Run validation commands.
6. Summarize what was changed and why.

### Deliverables
- Code implementing this step.
- If schema changes are needed: migration + service updates.
- Any UI updates needed for the step.
- Updated docs:
  - append/update progress notes in `HABIT_INTELLIGENCE_INTEGRATION_PLAN.md`
  - include what was implemented vs. deferred.

### Acceptance criteria
Treat this step as complete only if all are true:
- [ ] Behavior matches `{{GOAL}}`
- [ ] Uses existing architecture where possible
- [ ] No regression in current habit flows
- [ ] Build/tests pass locally
- [ ] Changes are scoped to this step only
- [ ] Clear notes for the next step are included

### Validation commands
Run at minimum:
- `npm run build`

Also run targeted checks/tests relevant to touched code.

### Output format
Return your final response with:
1. **Summary** (bullet list)
2. **Files changed** (with purpose)
3. **Validation run** (commands + pass/fail)
4. **Follow-ups** (next small step)

### Implementation context (fill before use)
- Phase target: {{PHASE_NAME}}
- Step target: {{STEP_NAME}}
- User story: {{USER_STORY}}
- Non-goals: {{NON_GOALS}}
- Constraints: {{CONSTRAINTS}}
- Suggested files: {{LIKELY_FILES}}

---

## Example filled prompt (Phase 1)

- `{{PHASE_NAME}}`: Phase 1 (rules only)
- `{{STEP_NAME}}`: Detection state machine
- `{{GOAL}}`: Compute and persist `active / at_risk / stalled / in_review` per habit using existing adherence/log data
- `{{USER_STORY}}`: As a user, I want stale habits detected automatically so my active list stays relevant
- `{{NON_GOALS}}`: No AI redesign flow yet, no gamification changes yet
- `{{CONSTRAINTS}}`: Reuse `adherenceMetrics`, avoid creating new scoring engine
- `{{LIKELY_FILES}}`: `src/services/adherenceMetrics.ts`, `src/features/habits/HabitsModule.tsx`, `src/features/habits/DailyHabitTracker.tsx`, `src/services/habitsV2.ts`

