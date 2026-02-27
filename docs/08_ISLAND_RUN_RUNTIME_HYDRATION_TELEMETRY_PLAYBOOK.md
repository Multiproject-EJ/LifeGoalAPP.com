# Island Run runtime-state hydration telemetry playbook (M7O.3)

## Scope
This playbook covers client telemetry emitted during Island Run runtime-state hydration.

## Event types
- `runtime_state_hydrated`
- `runtime_state_hydration_failed`

## Stage metadata
- Success stage: `island_run_runtime_state_hydrated`
- Unexpected failure stage: `island_run_runtime_state_hydration_failed_unexpected`

## Hydration source values (success event)
- `table`
- `fallback_demo_or_no_client`
- `fallback_query_error`
- `fallback_no_row`

## Monitoring guidance
- Treat `source=table` as healthy baseline.
- Monitor ratio of fallback sources over total hydration events; investigate if fallback ratio rises.
- Prioritize `fallback_query_error` spikes as likely backend/table/API regressions.
- Track `runtime_state_hydration_failed` count separately as unexpected client/runtime failures.

## Suggested dashboard slices
- Hydration source distribution by day.
- Fallback ratio trend (7-day moving average).
- Failure event count trend.
- Breakdown by environment (demo vs non-demo inferred from source).

## Emission guardrails
- Client emits hydration telemetry at most once per session per user/event/source/day key (UTC) to reduce duplicate noise during repeated component mounts.
- Dedupe applies only to client telemetry emission; hydration logic itself still runs on every entry as expected.

## Reference SQL seeds
- See `docs/09_ISLAND_RUN_RUNTIME_HYDRATION_ALERT_QUERIES.sql` for source distribution, fallback ratio, failure trend, and alert seed queries.
- Thresholds in that file are starter defaults and should be tuned using observed traffic volume and dedupe-adjusted event rates.

## Default alert thresholds
- `fallbackRatio24h = 0.35`
- `failureCount24h = 25`
- `minHydrationEvents24h = 20` (guardrail to avoid low-volume false positives)

These defaults are represented in code (`ISLAND_RUN_RUNTIME_HYDRATION_ALERT_DEFAULTS`) and mirrored in SQL seed queries.
