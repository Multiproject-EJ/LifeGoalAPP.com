# Landing hero show sprites

Sprites for the landing page's hero animation (`src/world/LandingHeroShow.tsx`).

## Provenance

All four files are original renders of this project's own in-game models. No
third-party art is involved, and no attribution is required.

| File | Source model |
|------|--------------|
| `robot-heavy-worker.webp` | `createRobotFamilyModel` (`src/features/gamification/level-worlds/dev/RobotFamilyThreeModel.ts`), role `heavy-worker`, motion `carry` |
| `robot-project-manager.webp` | same model, role `project-manager`, motion `carry` |
| `robot-mini-artist.webp` | same model, role `mini-artist`, motion `carry` |
| `living-controller.webp` | the in-game `LivingController` (`src/features/gamification/level-worlds/components/living-controller/`), idle on Island 1 |

The caretaker, compass and egg art are existing project assets, reused from
`/assets/island_caretakers/001/` and `/assets/Eggs/`.

## Re-capturing

1. Run the dev server.
2. Open `/dev/hero-sprite-studio` (dev builds only). It renders one subject on a transparent canvas:
   - `?role=heavy-worker&motion=carry&size=640` for a robot. The optional parameters are `yaw`, `pitch`, `t` (pose time) and `margin`.
   - `?subject=controller` for the living controller.
3. Screenshot `#hero-sprite-studio canvas` with a transparent background, for example Playwright's `omitBackground: true`.
4. Crop to the alpha bounding box, with a 6px pad. For the controller, first drop the multiplier pill above the shell.
5. Export as WebP (quality 84) at these widths: heavy-worker 360px, the other two robots 300px, controller 420px or less.
