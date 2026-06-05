# Quest Journey Visual System Preview QA

_Date: 2026-06-05_

This preview is dev-only and uses mock/static data only. It does not call Supabase, gameplay, rewards, telemetry, persistence, or production feature services.

## Preview URL

Run the local Vite dev server and open:

```bash
npm run dev -- --host 127.0.0.1 --port 4178
```

Then visit:

```text
http://127.0.0.1:4178/dev/quest-journey-visual-system
```

The route is only enabled when `import.meta.env.DEV` is true. It is not a production app navigation destination.

## Desktop screenshot

1. Open `http://127.0.0.1:4178/dev/quest-journey-visual-system`.
2. Set viewport to approximately `1440 × 1100`.
3. Capture the full preview page.
4. Confirm:
   - Hero card appears before operational detail.
   - Gold compass/star accent is visible.
   - Glass cards have soft shadows and subtle glow.
   - Companion card feels visually distinct but compatible.
   - Tool cards are visually secondary.
   - Progress bars and metric rings use blue/purple and gold accents.

## Mobile screenshot

1. Open browser devtools device mode.
2. Use an iPhone-sized viewport, for example `390 × 844`.
3. Visit `http://127.0.0.1:4178/dev/quest-journey-visual-system`.
4. Capture the initial hero and the lower component sections.
5. Confirm:
   - No accidental horizontal overflow.
   - Hero card remains readable.
   - One primary CTA is visible.
   - Cards stack in one column.
   - Text is not too small.
   - Safe-area padding does not crop content.

## Modal sheet screenshot

1. On the preview page, click **Open modal sheet**.
2. Capture desktop and iPhone-sized screenshots.
3. Confirm:
   - Backdrop is viewport-fixed.
   - Modal is centered on desktop.
   - Modal behaves as a bottom sheet on mobile.
   - Internal modal content scrolls when needed.
   - Body/background scrolling is locked while open.
   - Escape and close button dismiss the modal.

## Regression expectations

Because this is Phase 0.5 foundation work, production screens should remain unchanged. Verify that normal app routes still load and that the preview route does not require authentication or data setup in local dev.
