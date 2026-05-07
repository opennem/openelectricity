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
- [Bun](https://bun.sh/) (recommended for local development)

### Setup

```bash
bun install
cp .env.example .env   # fill in your own keys — see "Environment variables" below
bun run dev
```

The dev server starts at `http://localhost:5173`.

### Environment variables

Open Electricity is an open-source project, and contributors are expected to bring their own credentials for the external services they want to exercise locally (Open Electricity API, Sanity, Clerk, Mailchimp, etc.). The default workflow uses a plain `.env` file so anyone can clone the repo and run it without further tooling:

1. Copy `.env.example` to `.env`.
2. Fill in keys for the services you need. Most `PUBLIC_*` URLs in the example are sensible defaults; the API keys are yours to provide.
3. Run `bun run dev`.

`.env` is gitignored. Only `.env.example` is checked in — keep it up to date when adding new variables.

#### Maintainer flow (Doppler)

Core maintainers use [Doppler](https://www.doppler.com/) to share secrets across machines. If you have access to the Doppler project:

```bash
brew install dopplerhq/cli/doppler
doppler login
doppler setup            # link this directory to the openelectricity project + dev config
bun run doppler-dev      # runs vite dev with secrets injected from Doppler
```

`doppler-dev`, `doppler-build`, and `doppler-preview` are maintainer conveniences that wrap their plain counterparts in `doppler run --`. The plain scripts (with a local `.env`) remain the canonical path for contributors and forks — no Doppler account required.

#### Feature flags

Build-time toggles for incomplete or experimental UI live in `PUBLIC_FEATURE_FLAGS` — a single JSON-string env var. Flags are parsed in `src/lib/stores/app.js` and read via `isFeatureEnabled('flag_name')`. Flip a value and restart the dev server to apply.

Current flags:

| Flag                   | Default | Effect                                                                  |
| ---------------------- | ------- | ----------------------------------------------------------------------- |
| `show_map_experiments` | `false` | Reveals the experimental Facilities-map controls: marker-style picker (Circles / Hex / Heat), the "Show by" metric dropdown (Capacity / Generation / Pollution), and the live tuning panel (bottom-left). |

Toggle locally via `.env`:

```bash
# .env
PUBLIC_FEATURE_FLAGS='{
  "show_map_experiments": true
}'
```

Toggle in Doppler (maintainers — apply per environment):

```bash
doppler secrets set PUBLIC_FEATURE_FLAGS='{"show_map_experiments": true}' --config dev
doppler secrets set PUBLIC_FEATURE_FLAGS='{"show_map_experiments": true}' --config stg
doppler secrets set PUBLIC_FEATURE_FLAGS='{"show_map_experiments": true}' --config prd
```

The full JSON object replaces the previous value, so include every flag you want to keep — run `doppler secrets get PUBLIC_FEATURE_FLAGS --plain --config <name>` first to see the current value.

## Commands

| Command               | Description                                        |
| --------------------- | -------------------------------------------------- |
| `bun run dev`             | Start dev server using `.env` (default)            |
| `bun run doppler-dev`     | Start dev server with secrets injected from Doppler (maintainers) |
| `bun run build`           | Production build                                   |
| `bun run doppler-build`   | Production build with secrets injected from Doppler (maintainers) |
| `bun run preview`         | Preview production build                           |
| `bun run doppler-preview` | Preview production build with secrets injected from Doppler (maintainers) |
| `bun run check`       | Type check with svelte-check                       |
| `bun run lint`        | Lint with Prettier + ESLint                        |
| `bun run format`      | Auto-format with Prettier                          |
| `bun run test`        | Run unit tests (Vitest)                            |
| `bun run test:e2e`    | Run end-to-end tests (Playwright)                  |
| `bun run dev-sync`    | After a release: fast-forward `dev` to `main` and push (returns to `main`) |

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

| Branch | Environment                                                        |
| ------ | ------------------------------------------------------------------ |
| `main` | Production — [openelectricity.org.au](https://openelectricity.org.au) |
| `dev`  | Staging — [dev.openelectricity.org.au](https://dev.openelectricity.org.au) |

Production deployments are triggered via a Cloudflare deploy hook on version tags:

```bash
npm version patch   # or minor / major
git push            # push.followTags pushes the tag automatically
```

GitHub Actions picks up the `v*` tag and triggers the Cloudflare build.

## Licence

See [LICENSE](LICENSE) for details.
