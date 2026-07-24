# Open Electricity

The frontend for the [Open Electricity](https://openelectricity.org.au) platform — an open-source project exploring Australia's electricity system through data visualisation and analysis.

For the **Data Tracker** (a.k.a. OpenNEM), see [opennem/opennem-fe](https://github.com/opennem/opennem-fe).

## Tech Stack

- **SvelteKit** with **Svelte 5** (runes)
- **Tailwind CSS 4** with **shadcn-svelte** components
- **LayerCake** + **D3.js** for data visualisation
- **Sanity CMS** for editorial content
- **Cloudflare Pages** for deployment
- **Clerk** for authentication

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) >= 22.12.0
- [pnpm](https://pnpm.io/) — pinned via the `packageManager` field in `package.json`, so the easiest install is via [Corepack](https://nodejs.org/api/corepack.html): `corepack enable` (ships with Node 22+).

### Setup

```bash
pnpm install
cp .env.example .env   # fill in your own keys — see "Environment variables" below
pnpm run dev
```

The dev server starts at `http://localhost:5173`.

### Environment variables

Open Electricity is an open-source project, and contributors are expected to bring their own credentials for the external services they want to exercise locally (Open Electricity API, Sanity, Clerk, Mailchimp, etc.). The default workflow uses a plain `.env` file so anyone can clone the repo and run it without further tooling:

1. Copy `.env.example` to `.env`.
2. Fill in keys for the services you need. Most `PUBLIC_*` URLs in the example are sensible defaults; the API keys are yours to provide.
3. Run `pnpm run dev`.

`.env` is gitignored. Only `.env.example` is checked in — keep it up to date when adding new variables.

#### Maintainer flow (Doppler)

Core maintainers use [Doppler](https://www.doppler.com/) to share secrets across machines. If you have access to the Doppler project:

```bash
brew install dopplerhq/cli/doppler
doppler login
doppler setup            # link this directory to the openelectricity project + dev config
pnpm run doppler-dev     # runs vite dev with secrets injected from Doppler
```

`doppler-dev`, `doppler-build`, and `doppler-preview` are maintainer conveniences that wrap their plain counterparts in `doppler run --`. The plain scripts (with a local `.env`) remain the canonical path for contributors and forks — no Doppler account required.

#### Feature flags

Build-time toggles for incomplete or experimental UI live in `PUBLIC_FEATURE_FLAGS` — a single JSON-string env var. Flags are parsed in `src/lib/stores/app.js` and read via `isFeatureEnabled('flag_name')`. Flip a value and restart the dev server to apply.

Current flags:

| Flag           | Default | Effect                                                                           |
| -------------- | ------- | -------------------------------------------------------------------------------- |
| `tracker2_nav` | `false` | Surfaces the in-progress **Tracker2** (Explorer dashboard) link in the main nav. |

Toggle locally via `.env`:

```bash
# .env
PUBLIC_FEATURE_FLAGS='{
  "tracker2_nav": true
}'
```

Toggle in Doppler (maintainers — apply per environment):

```bash
doppler secrets set PUBLIC_FEATURE_FLAGS='{"tracker2_nav": true}' --config dev
doppler secrets set PUBLIC_FEATURE_FLAGS='{"tracker2_nav": true}' --config stg
doppler secrets set PUBLIC_FEATURE_FLAGS='{"tracker2_nav": true}' --config prd
```

The full JSON object replaces the previous value, so include every flag you want to keep — run `doppler secrets get PUBLIC_FEATURE_FLAGS --plain --config <name>` first to see the current value.

## Commands

| Command                    | Description                                                                |
| -------------------------- | -------------------------------------------------------------------------- |
| `pnpm run dev`             | Start dev server using `.env` (default)                                    |
| `pnpm run doppler-dev`     | Start dev server with secrets injected from Doppler (maintainers)          |
| `pnpm run build`           | Production build                                                           |
| `pnpm run doppler-build`   | Production build with secrets injected from Doppler (maintainers)          |
| `pnpm run preview`         | Preview production build                                                   |
| `pnpm run doppler-preview` | Preview production build with secrets injected from Doppler (maintainers)  |
| `pnpm run check`           | Type check with svelte-check                                               |
| `pnpm run lint`            | Lint with Prettier + ESLint                                                |
| `pnpm run format`          | Auto-format with Prettier                                                  |
| `pnpm run test`            | Run unit tests (Vitest)                                                    |
| `pnpm run test:e2e`        | Run end-to-end tests (Playwright)                                          |
| `pnpm run dev-sync`        | After a release: fast-forward `dev` to `main` and push (returns to `main`) |

## Project Structure

```
src/
├── lib/
│   ├── components/        # UI and chart components
│   │   ├── charts/        # LayerCake-based visualisations
│   │   ├── form-elements/ # Reusable form controls
│   │   ├── info-graphics/ # Interactive homepage visuals
│   │   └── ui/            # shadcn-svelte components
│   ├── fuel-tech-groups/  # Energy source categorisation
│   ├── models/            # Static scenario data
│   ├── opennem/           # OpenNEM API integration
│   ├── stores/            # Global state (Svelte stores)
│   ├── theme/             # Colour palettes and theming
│   ├── types/             # TypeScript definitions (JSDoc)
│   └── utils/             # Data processing utilities
├── routes/
│   ├── (main)/            # Primary app routes
│   │   ├── about/         # Team and project info
│   │   ├── analysis/      # Editorial articles (Sanity CMS)
│   │   ├── facilities/    # Power station explorer
│   │   ├── records/       # Historical electricity records
│   │   ├── scenarios/     # Future energy modelling
│   │   └── studio/        # Data exploration tools
│   │   ├── strata/        # Published chart detail pages
│   │   └── strata-community/ # Community chart gallery
│   ├── (micro)/           # Embeddable widgets and micro-apps
│   │   ├── record/        # Minimal record displays
│   │   ├── strata-embed/  # Strata chart iframe embeds
│   │   ├── stratify/      # Stratify chart builder (closed beta)
│   │   └── widget/        # Grid status widget
│   └── api/               # Server-side data endpoints
└── ...
```

## Deployment

| Branch | Environment                                                                |
| ------ | -------------------------------------------------------------------------- |
| `main` | Production — [openelectricity.org.au](https://openelectricity.org.au)      |
| `dev`  | Staging — [dev.openelectricity.org.au](https://dev.openelectricity.org.au) |

Production deployments are triggered via a Cloudflare deploy hook on version tags:

```bash
pnpm version patch   # or minor / major
git push             # push.followTags pushes the tag automatically
```

GitHub Actions picks up the `v*` tag and triggers the Cloudflare build.

### Facility OG cards

Per-facility social cards live under `static/og/facility/<code>.jpg` as **committed
static assets** — they are intentionally **not** generated during the deploy build
(regenerating all ~600 cards exceeded the Cloudflare build time limit). Regenerate
them whenever facility data or Sanity photos change and commit the result:

```bash
pnpm build:og                    # incremental: re-render only cards whose inputs changed
pnpm build:og --dry-run          # report what would regenerate/prune, write nothing
pnpm build:og --code=HAZEL,APS   # limit the run to specific facility codes
pnpm build:og:force              # force-refresh every card
```

Incremental runs diff each card against `src/lib/server/og/facility-card-state.json`
— a committed record of what every card was built from (template version, Sanity
photo URL, derived facility data) — so photos added or replaced in the CMS, facility
changes (name, capacity, status), and template bumps (`OG_CARD_VERSION` in
`facility-card.js`) all trigger exactly the right re-renders. Cards for facilities
no longer in the OE API are pruned.

`pnpm build:og` also rewrites `src/lib/server/og/facility-card-codes.json` — the
manifest of codes that have a card — so commit it and the state file alongside the
images. The facility page falls back to the default OG image (`/img/preview.jpg`)
for any facility **not** in that manifest, so a newly-added facility never shows a
broken preview before the next regeneration.

The `og-cards` GitHub workflow automates this (weekly schedule + manual dispatch,
with a `force` input for full refreshes) and commits only the cards that changed —
once its OE/Sanity secrets are configured.

## Licence

See [LICENSE](LICENSE) for details.
