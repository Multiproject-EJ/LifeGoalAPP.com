# Guided Journal Templates

This module powers guided journaling recommendations from two sources:

1. **Archetype hand templates** (dominant/secondary/support/shadow)
2. **Trait-band templates** from a matrix of **11 dimensions × 3 bands** (low/balanced/high)

## Files

- `src/features/journal/guidedTemplates.ts`
  - template types
  - starter template catalog
  - `TRAIT_TEMPLATE_MATRIX` with 33 prompt sets
  - recommendation helpers
- `src/features/journal/Journal.tsx`
  - loads latest personality test
  - computes guided template recommendations
  - passes recommendations into editor
- `src/features/journal/JournalEntryEditor.tsx`
  - template picker UI
  - inserts selected template into draft content

## Trait-band matrix shape

```ts
Record<DimensionKey, Record<'low' | 'balanced' | 'high', GuidedJournalTemplate>>
```

Each prompt set includes:
- template id/title/description
- suggested journal mode (`defaultMode`)
- 3 guided prompts
- optional AI coach follow-up prompt

## How recommendations currently work

- Archetype recommendations:
  - choose dominant, secondary, first support, and shadow templates
  - apply archetype-specific override when available (currently commander/strategist)
- Trait recommendations:
  - derive a band by score: `< 40 = low`, `40-60 = balanced`, `> 60 = high`
  - produce deterministic suggestions from ordered dimensions

## Next extension ideas

- Add suit-level templates and fallback by suit.
- Use top variance dimensions rather than static order.
- Add weekly synthesis templates (e.g., “pattern review”).
