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
bun run dev
```

The dev server starts at `http://localhost:5173`.

## Commands

| Command              | Description                     |
| -------------------- | ------------------------------- |
| `bun run dev`        | Start development server        |
| `bun run build`      | Production build                |
| `bun run preview`    | Preview production build        |
| `bun run check`      | Type check with svelte-check    |
| `bun run lint`       | Lint with Prettier + ESLint     |
| `bun run format`     | Auto-format with Prettier       |
| `bun run test`       | Run unit tests (Vitest)         |
| `bun run test:e2e`   | Run end-to-end tests (Playwright) |

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
