# Mobile runtime image budget

All newly added or modified raster images shipped by the phone app must:

- use WebP or AVIF;
- stay at or below 550 KB per image;
- be composed and tested at the primary 390 × 844 portrait viewport;
- reserve full-resolution source masters for non-runtime production storage.

Run `npm run check:mobile-images` before merging. The check evaluates uncommitted
image changes, the latest commit, and every championship micro-film image. It
also reports the total public raster footprint so the legacy asset library can
be reduced deliberately without blocking unrelated releases.

For artwork with transparency, prefer lossless WebP only when edges require it.
For painted scenes and photographic material, use lossy WebP/AVIF and inspect
faces, type, gradients, and dark skies at phone size before accepting the
compression.
