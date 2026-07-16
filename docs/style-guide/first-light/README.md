# First Light production artwork

`first-light-auth-background-source.png` is the approved high-resolution source
for the shared public authentication hero used by the PWA and future native
wrappers.

Delivery rules:

- Keep interface text, controls, frames, and icons out of the raster artwork.
- Preserve this PNG as the source master.
- Ship a resized, lossy WebP to
  `public/assets/themes/first-light/auth-background.webp`.
- Start WebP quality at 82 and adjust only after visual inspection.
- Re-check the phone crop, desktop crop, file dimensions, file size, and build
  whenever the source or encoder settings change.

Prompt intent: reconstruct only the approved celestial book-portal and floating
castle scenery, leaving safe central space for the live HabitGame title and
service-status pill.
