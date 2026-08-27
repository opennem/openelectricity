# Tracker design review routes

`/studio/tracker` is the design-review index for the three Tracker concepts
that informed the canonical `/tracker` (promoted from `/tracker/next`):

- `/studio/tracker/map` — the map-first live-grid experience.
- `/studio/tracker/dashboard` — the analysis-first configurable dashboard.
- `/studio/tracker/explore` — a locally savable chart and metric canvas with a curated OE query
  builder, responsive card layout, and portable JSON views.

Shared Tracker components remain in this directory. Route-specific page files,
tests and documentation live in their named subdirectories.

`tracker-regions.js` and `RegionDropdown.svelte` are deliberate copies of the
canonical versions in `src/routes/(main)/tracker/` — the concepts are frozen
design reviews, decoupled so the live Tracker can evolve (or these routes be
deleted) without cross-checking the other side.
