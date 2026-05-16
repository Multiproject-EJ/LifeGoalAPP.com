# Promise Creation Failure — Reverse Promises

**Investigation date:** 2025-07-11
**Status:** Root cause confirmed; UI fix implemented in `ContractWizard.tsx` (see Fix Strategy / Smallest Safe Implementation Slice)

---

## Executive Summary

Creating a reverse promise fails on final submit ("Failed to create promise") whenever the user
enters a fractional `allowedSlips` value (e.g. `0.25`) **or** the integer value `0`.
Both cases are valid in the UI but are rejected by a PostgreSQL `CHECK` constraint on the
`target_count` column of `commitment_contracts`.

There are **two overlapping database constraint problems** and **one missing client-side guard**,
together with an error-type masking issue that converts every database error into the generic
"Failed to create promise" string shown in the UI.

---

## Flow Trace

### 1. `ContractWizard.tsx` — cadence screen (target-count input)

**File:** `src/features/gamification/ContractWizard.tsx`  
**Lines:** 751–764

```tsx
<input
  id="target-count"
  type="number"
  min={selectedContractType === 'reverse' ? '0' : '1'}   // ← no `step` attr; decimals allowed
  value={targetCount}
  onChange={(e) => {
    const parsed = Number(e.target.value);
    if (selectedContractType === 'reverse') {
      setTargetCount(Number.isNaN(parsed) ? 0 : Math.max(0, parsed));  // ← 0.25 passes through unchanged
      return;
    }
    setTargetCount(Number.isNaN(parsed) ? 1 : Math.max(1, parsed));
  }}
/>
```

There is no `step` attribute. The browser `<input type="number">` with no step defaults to `step="any"`,
so it happily accepts `0.25`. The `onChange` handler calls `Math.max(0, 0.25) = 0.25` and stores it
in state without rounding.

---

### 2. `ContractWizard.tsx` — `validateCurrentScreen()`

**Lines:** 296–348

```ts
if (currentScreen === 'cadence' && selectedContractType === 'reverse' && targetCount < 0) {
  setError('Allowed slips cannot be negative.');
  return false;
}
```

Only a `< 0` check is present. Both `0.25` and `0` pass this guard. There is no
`Number.isInteger()` check anywhere in the wizard.

---

### 3. `ContractWizard.tsx` — `handleConfirm()` builds `ContractInput`

**Lines:** 377–397

```ts
const input: ContractInput = {
  ...
  targetCount,          // ← whatever is in state — can be 0.25 or 0
  ...
  contractType: selectedContractType,   // 'reverse'
  trackingMode,         // 'outcome_only' if outcome-style was chosen
  ...
};
```

`targetCount` is mapped verbatim from state into `ContractInput.targetCount`. No rounding,
no clamping, no integer assertion.

---

### 4. `commitmentContracts.ts` — `createContract()`

**File:** `src/services/commitmentContracts.ts`  
**Lines:** 649–796

```ts
export async function createContract(userId, input): Promise<ServiceResponse<CommitmentContract>> {
  // ... active count guard, cooldown check, sacred limit, stake validation ...
  // validateStakeAmount() is called — it never checks targetCount
  const newContract: CommitmentContract = {
    ...
    targetCount: input.targetCount,   // ← 0.25 or 0 passed straight through (line 720)
    ...
  };

  const { data: allContracts } = await fetchContracts(userId);
  const updated = [...(allContracts ?? []), newContract];
  await saveContracts(userId, updated);   // ← this throws on constraint violation
```

`validateStakeAmount()` (lines 453–487) validates only the stake amount; it never inspects
`targetCount`. No integer coercion is applied before calling `saveContracts`.

---

### 5. `commitmentContracts.ts` — `saveContracts()` → Supabase upsert

**Lines:** 331–343

```ts
async function saveContracts(userId, contracts) {
  if (!canUseSupabaseData()) {
    localStorage.setItem(...);   // ← offline/demo: no DB constraint, succeeds silently
    return;
  }
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('commitment_contracts')
    .upsert(contracts.map(contractToRow), { onConflict: 'id' });
  if (error) throw error;       // ← PostgrestError thrown here
}
```

For authenticated users (`canUseSupabaseData() === true`), the upsert goes to Supabase/PostgreSQL.
The JSON payload carries `target_count: 0.25` (or `target_count: 0`). PostgreSQL's type cast
converts `0.25` to `INTEGER 0`, then the `CHECK (target_count > 0)` fires.

---

### 6. `commitmentContracts.ts` — error masking in catch block

**Lines:** 790–795**

```ts
} catch (error) {
  return {
    data: null,
    error: error instanceof Error ? error : new Error('Failed to create promise'),
  };
}
```

Supabase returns a `PostgrestError` — a plain object with `.message`, `.code`, `.details`, etc.
It does **not** extend `Error`, so `PostgrestError instanceof Error === false`. The fallback
`new Error('Failed to create promise')` is returned.

---

### 7. `ContractWizard.tsx` — `handleConfirm()` surfaces the message

**Lines:** 399–402 and 437–439**

```ts
const { data: contract, error: createError } = await createContract(userId, input);
if (createError || !contract) {
  throw createError || new Error('Failed to create promise');
}
// ...
} catch (err) {
  setError(err instanceof Error ? err.message : 'Failed to create promise');
}
```

`createError` is the wrapped `new Error('Failed to create promise')` (step 6 above), which
is `instanceof Error`, so `err.message` is `'Failed to create promise'` — exactly what the UI
displays.

Because `createContract` throws before returning a contract, the subsequent
`activateContract` and `linkRewardToContract` calls are never reached.

---

## Failure Analysis Per Suspicion Area

### 1. Fractional allowed-slip values (0.25) — **CONFIRMED ROOT CAUSE**

| Layer | Behaviour |
|---|---|
| HTML input (`ContractWizard.tsx:751`) | No `step` attribute → browser allows `0.25` |
| `onChange` handler (`ContractWizard.tsx:760`) | `Math.max(0, 0.25)` = `0.25`; stored in state |
| `validateCurrentScreen` (`ContractWizard.tsx:312`) | Only checks `< 0`; `0.25` passes |
| `ContractInput` mapping (`ContractWizard.tsx:382`) | `targetCount: 0.25` set verbatim |
| `createContract` (`commitmentContracts.ts:720`) | `targetCount: input.targetCount` — no rounding |
| `contractToRow` (`commitmentContracts.ts:249`) | `target_count: contract.targetCount` — `0.25` sent to DB |
| PostgreSQL (`0140_commitment_contracts.sql:12`) | `target_count INTEGER` casts `0.25` → `0`; `CHECK (target_count > 0)` **FAILS** |

### 2. Reverse promise validation mismatch — **CONFIRMED, CONTRIBUTING CAUSE**

`target_count = 0` is explicitly documented as valid for reverse promises ("0 slips = breaks
after first slip", `ContractWizard.tsx:768`). However:

- DB constraint: `CHECK (target_count > 0)` — `0` is **rejected by the database**.
- Wizard validation (`ContractWizard.tsx:312`): only rejects `< 0`, so `0` passes to the submit.
- No migration has ever relaxed the `> 0` constraint for reverse contracts.

This means every reverse promise with `targetCount = 0` (the explicitly documented "zero
tolerance" mode) also fails, regardless of fractional input.

### 3. `ContractInput` mapping for reverse promises — **CONFIRMED, STRUCTURAL GAP**

`ContractInput` (defined at `commitmentContracts.ts:58–83`) has a single `targetCount: number`
field used for both forward (required completions) and reverse (allowed slips) contracts.
There is no `allowedSlips` field, no discriminant type, and no hint to the service that for
`contractType === 'reverse'` the semantic of `targetCount` changes from "must reach N" to
"must not exceed N slips". The service therefore applies no special coercion or validation
for the reverse case.

### 4. Invalid `targetCount`/slip conversion — **CONFIRMED, PRIMARY CAUSE**

No conversion (`Math.round`, `Math.trunc`, `parseInt`) is applied at any layer between
the raw HTML input value and the Supabase upsert payload. The decimal value reaches
PostgreSQL as-is and is silently truncated to `0` before the check constraint fires.

### 5. Reward-link creation failure — **NOT THE FAILING STEP**

`linkRewardToContract` is pure localStorage (`contractRewards.ts:45–71`); it is never
reached because `createContract` throws first. No evidence of failure in this function
for the described scenario.

### 6. Malformed title/custom identity composition — **NOT A CAUSE**

`resolvedPromiseTitle` (`ContractWizard.tsx:275–278`) correctly composes
`icon + promiseTitle`. The identity statement is `promiseTitle.trim() || null` (line 391).
Both values are strings — no type mismatch or null explosion.

---

## Root Cause

There are **two co-present bugs** both originating in `supabase/migrations/0140_commitment_contracts.sql:12`:

```sql
target_count INTEGER NOT NULL CHECK (target_count > 0),
```

**Bug A — zero blocked:** The `> 0` check rejects `target_count = 0`, but the wizard UI
explicitly supports and advertises `0` as a valid reverse-promise slip count.

**Bug B — fractional value silently truncated then blocked:** The `INTEGER` column type causes
PostgreSQL to truncate any decimal input to zero, which then fails the `> 0` check. No client
layer rounds or rejects fractional values before they reach the database.

Both bugs manifest as a `PostgrestError` that is caught and wrapped into the generic
`new Error('Failed to create promise')` message due to `PostgrestError` not extending `Error`.

**The specific scenario in the bug report** ("0.25 per weekly, outcome-style, linked habit,
custom title/reward") triggers Bug B. Had the user entered `0` instead of `0.25`, Bug A would
have triggered with the same surface symptom.

---

## Affected Files

| File | Location | Role |
|---|---|---|
| `supabase/migrations/0140_commitment_contracts.sql` | Line 12 | `CHECK (target_count > 0)` on `commitment_contracts` table — **origin of both DB bugs** |
| `supabase/migrations/0140_commitment_contracts.sql` | Line 36 | Same constraint on `commitment_contract_evaluations.target_count` |
| `src/features/gamification/ContractWizard.tsx` | 751–764 | Missing `step="1"` on input; no rounding in `onChange` |
| `src/features/gamification/ContractWizard.tsx` | 312–319 | `validateCurrentScreen()` — no integer check for reverse `targetCount` |
| `src/services/commitmentContracts.ts` | 720 | `targetCount: input.targetCount` — no normalisation before persistence |
| `src/services/commitmentContracts.ts` | 790–794 | `instanceof Error` guard swallows PostgrestError detail |

---

## Fix Strategy

### Option 1 — Relax the DB constraint (minimal, correct)

Add a new migration that:

1. Drops the existing `CHECK (target_count > 0)` constraint on `commitment_contracts`.
2. Replaces it with `CHECK (target_count >= 0)` (zero is now allowed for reverse contracts).
3. Similarly update the same constraint on `commitment_contract_evaluations` if evaluations
   for zero-slip reverse contracts are to be stored.

This alone does not fix the fractional-value path — a `0.25` would still be truncated to `0`
by PostgreSQL INTEGER cast, but the `>= 0` check would then pass, meaning the contract would
be stored with `target_count = 0` — potentially wrong behaviour, not a crash.

### Option 2 — Add client-side integer coercion + UI guard (complete fix for fractional path)

In `ContractWizard.tsx`, `onChange` for reverse:

```ts
setTargetCount(Number.isNaN(parsed) ? 0 : Math.max(0, Math.round(parsed)));
```

Add `step="1"` to the input (`type="number" step="1"`) to prevent non-integer entry.

In `validateCurrentScreen()` for the `'cadence'` screen:

```ts
if (currentScreen === 'cadence' && selectedContractType === 'reverse') {
  if (!Number.isInteger(targetCount) || targetCount < 0) {
    setError('Allowed slips must be a whole number (0 or more).');
    return false;
  }
}
```

### Option 3 — Add service-layer coercion (defence-in-depth)

In `createContract()`, before constructing `newContract`:

```ts
const normalizedTargetCount = input.contractType === 'reverse'
  ? Math.max(0, Math.round(input.targetCount))
  : Math.max(1, Math.round(input.targetCount));
```

Use `normalizedTargetCount` in place of `input.targetCount` on line 720.

### Option 4 — Fix `PostgrestError instanceof Error` masking

Wrap the thrown Supabase error so the DB constraint message surfaces:

```ts
} catch (error) {
  const message =
    error instanceof Error ? error.message :
    (error as { message?: string }).message ?? 'Failed to create promise';
  return { data: null, error: new Error(message) };
}
```

---

## Smallest Safe Implementation Slice

**Estimated effort:** 2 migrations + 5 lines of TypeScript

1. **Migration: relax `target_count` constraint**  
   New file: `supabase/migrations/XXXX_allow_zero_target_count_reverse.sql`

   ```sql
   ALTER TABLE public.commitment_contracts
     DROP CONSTRAINT IF EXISTS commitment_contracts_target_count_check;
   ALTER TABLE public.commitment_contracts
     ADD CONSTRAINT commitment_contracts_target_count_check
       CHECK (target_count >= 0);
   ```

   This unblocks `targetCount = 0` for reverse promises. It is backward-compatible with all
   existing classic/sacred/identity contracts because those always have `target_count >= 1`.

2. **`ContractWizard.tsx` — add `step="1"` + round in `onChange`**

   Change the input (`~line 751`) to add `step="1"`.  
   Change the reverse branch of `onChange` (`~line 760`) from `Math.max(0, parsed)` to
   `Math.max(0, Math.round(parsed))`.

3. **`ContractWizard.tsx` — add integer guard in `validateCurrentScreen`**

   Add `!Number.isInteger(targetCount)` to the existing reverse cadence check at line 312,
   or as a separate condition immediately after it.

This slice addresses both Bug A and Bug B with no semantic change to any existing stored data
or existing classic-contract paths.
