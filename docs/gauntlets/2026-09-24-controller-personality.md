# Controller size and personality pass — 2026-09-24

## User-approved scope

Enlarge the living controller, remove permanent Build/Ready text, and add a two-turn unpowered island-arrival spin with landing particles and double haptics. Add occasional idle wiggle/tilt and a minute-idle cowboy/face/gallop sequence. No progression, dice, reward, theme entitlement, or special-controller changes.

## Implementation boundaries

- Pure presentation clock and pose sampler in `personality.js`; island identity is an input, not a gameplay state mirror.
- First mount does not replay arrival. A changed island waits for modal/tutorial attention to clear. Player input cancels the current animation.
- Rolling, auto-roll, jackpot, empty dice, hidden controller/document, modal/tutorial attention, and reduced motion suppress idle antics.
- Actual Three.js body rotation includes paint, caps, trim, and multiplier; DOM targets project through the body transform.
- Build remains icon-led; affordability is communicated through trim and the existing accessible/hover label.
- Larger camera framing, 1.52 aspect ratio, full available footer width, 640px desktop cap.
- Native iOS landing uses Capacitor haptics behind existing audio, accessibility, mode and throttle gates. Web uses the vibration pattern where supported. Physical haptic feel still requires phone verification.

## Evidence

- Personality tests: pass (30/60-second sequence, two turns, cancellation, modal deferral, reduced motion and finite transforms).
- Framing and existing multiplier hologram tests: pass.
- Full Island Run suite: 2,302 passed, 0 failed.
- Architecture guard: 0 violations; 3 existing allowlisted warnings.
- Production Vite build: passed, including final post-review rebuild.
- Browser: rendered actual production component at 390px width; Build is an icon; arrival trigger reached landing-impact feedback. No renderer errors; existing SVGLoader deprecation warnings only.
- TypeScript full check: exit 0. Build callback verified in browser after animation changes.

This pass is local. It has not been pushed, installed on the phone, or represented as live. Review target: `/work/controller-release-check/index.html` on port 5197. The older study on port 5190 is not this implementation.
