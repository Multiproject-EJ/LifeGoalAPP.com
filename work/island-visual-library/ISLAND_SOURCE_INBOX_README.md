# Island 011–120 source inbox

Drop a new island concept into this folder with its three-digit runtime number,
for example `013.png`.

The production intake will:

1. rename an exact `NNN.<ext>` file to immutable `NNN-source.<ext>`;
2. keep all checkpoint history under `_workflow/NNN/`;
3. add `NNN-done-v001.<ext>` when the current production version is accepted;
4. add `done-v002`, `done-v003`, and so on for later accepted improvements.

Do not replace or edit a `source` or `done` file. Ambiguous names such as
`019(2).png`, `0212.png`, named batches or theme studies are deliberately left
untouched until their island mapping is explicit.

Every major 3D pass must be compared back to the original source. The complete
contract is `docs/gauntlets/2026-08-21-island-source-fidelity-workloop.md` in
the HabitGame repository.
