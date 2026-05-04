# Space Excavator Prototype Integration Notes

## Current status (in this repository)

- The `space-excavator` drop is currently a **standalone prototype module** and remains **inert** from Island Run gameplay wiring.
- It is **not wired into Island Run launch flows** at this time.
- The raw standalone prototype files have been quarantined outside app compilation under:
  - `prototypes/space-excavator/`
- Do **not** import or bootstrap the standalone prototype through its app entry files (`src/main.tsx`, `src/App.tsx`) from host gameplay surfaces.
- The apparent feature-level gameplay surface in the prototype is `TreasureDigFeature`.

## Host integration boundaries

- Do not import prototype global CSS/theme files into host app/gameplay surfaces yet.
  - In particular, global files like `src/index.css`, `src/main.css`, and `src/styles/theme.css` in the quarantined prototype must be scoped/adapted before any host integration.
- Keep this prototype behind an adapter seam until UI, style, and state boundaries are reviewed.

## Island Run contract requirements for future integration

- Future integration must follow the Island Run minigame contract shape (`IslandRunMinigameProps`) and canonical completion/close callback flow expected by launcher surfaces.
- Event tickets are launcher-owned and should remain outside minigame internals, using canonical event ticket authority (`minigameTicketsByEvent[eventId]`).
- The minigame must not read or write `spinTokens`.
- No economy mutations should be performed by the prototype component directly; Island Run action services/engine paths remain authoritative.
