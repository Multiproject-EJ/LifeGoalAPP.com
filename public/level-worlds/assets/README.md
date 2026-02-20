# Level Worlds asset naming

Use this naming pattern for Level Worlds assets:

- `level-bg-01.svg`, `level-bg-02.svg`, `level-bg-03.svg`, ...
- `island-overlay-01.svg`, `island-overlay-02.svg`, ...

`public/level-worlds.html` reads the ordered `levels` array, so add more levels by appending entries with matching background/overlay names.

This SVG-only setup avoids binary-file PR limitations while keeping level naming structured.
