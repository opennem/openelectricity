# Architecture

Open Electricity is a SvelteKit application for exploring Australia's electricity
system through editorial content, live data, facilities, historical records, and
scenario modelling.

## Runtime

- SvelteKit with Svelte 5 runes, built by Vite and deployed with the Cloudflare
  adapter.
- Tailwind CSS and shadcn-svelte-style UI primitives.
- LayerCake, D3, Observable Plot, Chroma, and MapLibre for visualisation.
- Sanity for editorial content; Clerk for authenticated studio features.
- The Open Electricity SDK and legacy OpenNEM data feeds for electricity data.

## Routes

`src/routes/(main)/` contains the public site with shared navigation and footer:

- `/` — homepage and high-level live indicators.
- `/tracker` — live grid status, map, flows, prices, and emissions.
- `/facilities` and `/facility/[code]` — facility explorer and detail views.
- `/records` — historical electricity records.
- `/scenarios` — future-system modelling.
- `/analysis`, `/content/[slug]`, and `/about` — editorial and organisation pages.
- `/studio` — internal and experimental exploration tools.
- `/strata*` — published and community chart views.

`src/routes/(micro)/` contains embed-friendly or minimal experiences, including
the widget and Stratify chart builder. `src/routes/api/` contains only data that
must be fetched from the browser.

## Data and state

- `src/lib/opennem/` and `src/lib/oe-api/` integrate and transform electricity
  data.
- `src/lib/server/` contains server-only caches and service integrations.
- `src/lib/fuel-tech-groups/`, `src/lib/fuel_techs.js`, and `src/lib/theme/`
  define fuel-technology classification, labels, and colours.
- `src/lib/components/charts/` contains the established chart system;
  `charts/v2/` is an in-progress newer system.
- Use local Svelte runes for component state, stores in `src/lib/stores/` for
  global state, and context for coordinated chart interaction.

## Important constraints

- Electricity time series can be large. Avoid deep `$state` proxies for large
  data arrays; use `$state.raw` when data is replaced as a whole.
- Facility and tracker views are fullscreen by default and share transition
  behaviour in `(main)/+layout.svelte`.
- Production deploys are tag-driven. `main` is production and `dev` is staging.
