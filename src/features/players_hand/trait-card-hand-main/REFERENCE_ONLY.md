# Reference-only SPARK scaffold

This folder contains an extracted standalone SPARK app for visual/interaction reference only.

- Do not import `src/App.tsx` or `src/main.tsx` from the main LifeGoalAPP runtime.
- Do not use `@github/spark/hooks` / `useKV` here as app state authority.
- Treat this folder as a source for selective component adaptation into `src/features/players_hand/spark-preview/` and future canonical integrations.
