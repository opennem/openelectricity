# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

**Local Development** uses [Bun](https://bun.sh/) for faster package management and script execution. **Cloudflare deployment** uses npm (configured in CI/CD).

| Command | Local (Bun) | CI/Cloudflare (npm) |
|---------|-------------|---------------------|
| Install | `bun install` | `npm install` |
| Dev server | `bun run dev` | `npm run dev` |
| Build | `bun run build` | `npm run build` |
| Type check | `bun run check` | `npm run check` |
| Lint | `bun run lint` | `npm run lint` |
| Format | `bun run format` | `npm run format` |
| Test | `bun run test` | `npm run test` |

- **Development**: `bun run dev` - Start Vite development server
- **Build**: `bun run build` - Production build with Vite
- **Preview**: `bun run preview` - Preview built application
- **Type Checking**: `bun run check` - SvelteKit sync + svelte-check with jsconfig.json
- **Type Checking (Watch)**: `bun run check:watch` - Continuous type checking
- **Linting**: `bun run lint` - Prettier format check + ESLint
- **Formatting**: `bun run format` - Auto-format with Prettier
- **Testing**: `bun run test` - Run Vitest test suite
- **Version Management**: `npm run version:patch|minor|major` - Bump version using npm version (npm required)

## Technology Stack

### Core Framework

- **SvelteKit 2.20.4** with **Svelte 5.25.7** (modern runes system)
- **Vite 5.4.17** for build tooling and dev server
- **Node.js >=22.12.0** requirement
- **Cloudflare adapter** for edge deployment

### Styling & UI

- **Tailwind CSS 4.1.11** with extensive custom configuration
- **shadcn-svelte** components via `bits-ui` and `class-variance-authority`
- **Tailwind Animate CSS** for animations
- **Custom energy-focused color palette** for fuel technology visualization
- **PostCSS** processing

### Data Visualization

- **LayerCake 8.4.3** for composable SVG chart components
- **D3.js ecosystem** (d3-array, d3-interpolate, d3-format, d3-scale, d3-shape)
- **Chroma.js** for advanced color manipulation and fuel tech theming
- Custom chart element library in `src/lib/components/charts/elements/`

### Development Tools

- **TypeScript 5.8.3** with JSDoc annotations for gradual typing
- **ESLint 9** with Prettier integration and Svelte plugin
- **Vitest 2.1.9** for unit testing
- **svelte-check** for TypeScript validation

## Architecture Overview

### Route Structure

```
src/routes/
├── (main)/                 # Main application with shared layout
│   ├── +layout.svelte     # Nav, footer, theme switcher, shortcuts
│   ├── +page.svelte       # Homepage with infographics
│   ├── about/             # Team and project information
│   ├── analysis/          # Editorial articles from Sanity CMS
│   ├── records/           # Historical electricity records system
│   ├── scenarios/         # Future energy modeling & projections
│   └── studio/            # Data exploration tools
├── (micro)/               # Embeddable widgets and micro-apps
│   ├── record/[id]/       # Minimal record displays
│   └── widget/            # Embeddable grid status widget
└── api/                   # Data endpoints and server functions
    ├── energy/            # Historical energy data
    ├── power/             # Real-time power data
    ├── records/           # Record management
    ├── scenarios/         # Modeling data
    └── tracker/           # Live tracking endpoints
```

### Component Architecture

**Core Components** (`src/lib/components/`)

- `charts/` - LayerCake-based visualization components with context stores
- `info-graphics/` - Complex interactive visualizations for homepage
- `form-elements/` - Reusable form controls with consistent styling
- `articles/` - Content display components for CMS integration
- `filters/` - Advanced filtering interfaces for data exploration
- `ui/` - shadcn-svelte component implementations

**Chart System Architecture**

- **LayerCake wrapper components** provide chart context and responsive containers
- **Element components** (`charts/elements/`) render SVG primitives (lines, areas, axes)
- **Context stores** (`charts/stores/`) manage chart state, tooltips, and interactions
- **Reusable patterns** for hover interactions, brushing, and zooming

### Svelte 5 Patterns

The codebase extensively uses Svelte 5's runes system:

```javascript
// State management
let data = $state([]);
let selectedRegion = $state('NSW');

// Computed values
let filteredData = $derived(data.filter(d => d.region === selectedRegion));

// Side effects
$effect(() => {
  console.log('Selected region changed:', selectedRegion);
});

// Component props
let { title, data, onSelect } = $props();

// Event handlers (no more on: syntax)
<button onclick={() => count++}>Click me</button>

// Snippets for reusable markup
{#snippet chartTooltip(data)}
  <div class="tooltip">{data.value}</div>
{/snippet}
{@render chartTooltip(hoveredData)}
```

### Data Layer Architecture

**External Data Sources:**

- **OpenNEM API** - Real-time Australian electricity market data
- **Sanity CMS** - Article content and editorial management
- **AEMO ISP Models** - Future energy scenario projections
- **Static JSON Models** - Precomputed scenario data in `src/lib/models/`

**Data Processing Pipeline:**

- `src/lib/utils/TimeSeries/` - Time series data manipulation and aggregation
- `src/lib/utils/Statistic/` - Statistical calculations and data analysis
- `src/lib/utils/data-transform/` - Proportion calculations and change analysis
- `src/lib/fuel-tech-groups/` - Energy source categorization and grouping

**State Management:**

- **Svelte 5 runes** for component-local reactive state
- **Svelte stores** (`src/lib/stores/`) for global app state and theming
- **Context-based state** for chart interactions and complex UI components

### Fuel Technology System

The application has a sophisticated fuel technology classification system:

**Color Theming:**

- Custom color palettes for different energy sources (renewables, fossil fuels, storage)
- Dynamic theming via `src/lib/theme/` with support for multiple color schemes
- Chroma.js integration for color manipulation and accessibility

**Grouping System:**

- `src/lib/fuel-tech-groups/` contains various grouping strategies
- Support for detailed breakdowns vs simplified views
- Regional variations and lens-specific groupings

### API Architecture

**Server-Side API Routes** (`src/routes/api/`)

- RESTful endpoints for data fetching with query parameter support
- Data transformation and aggregation on the server
- Performance optimization with request timing
- Error handling with proper HTTP status codes

**Client-Side Data Fetching:**

- `src/lib/opennem/` - OpenNEM API integration utilities
- Async data loading with loading states
- Client-side caching and data transformation

### Testing Strategy

- **Vitest** configuration for unit testing
- Test files located alongside source code with `.test.js` naming
- Focus on utility functions and data transformations
- Component testing patterns for Svelte 5 components

### Deployment & Build

**Cloudflare Configuration:**

- Adapter optimized for Cloudflare Pages/Workers
- Route exclusions for static content (`/analysis/*`, `/content/*`)
- Prerender configuration with HTTP error handling

**Build Optimization:**

- Vite-based bundling with SvelteKit optimizations
- Code splitting and lazy loading
- Asset optimization and compression

### Development Patterns

**JSDoc Integration:**

- TypeScript-style annotations using JSDoc comments
- Type definitions in `src/lib/types/` with `.ts` extension
- Gradual typing adoption without full TypeScript compilation

**Performance Considerations:**

- Server-side data processing to reduce client load
- Efficient LayerCake chart rendering
- Optimized data structures for large time series datasets
- Lazy loading of complex visualizations

**Code Organization:**

- Feature-based component organization
- Shared utilities in `src/lib/utils/`
- Consistent naming conventions
- Modular architecture for maintainability

### Key Conventions

1. **Component Props**: Use `$props()` destructuring with JSDoc type annotations
2. **Event Handling**: Property-based event handlers (`onclick`, `onchange`)
3. **State Management**: Local state with runes, global state with stores
4. **Styling**: Tailwind classes with custom utilities, no CSS modules
5. **Data Fetching**: Server-side API routes with client-side utilities
6. **Chart Development**: LayerCake + custom elements pattern
7. **Type Safety**: JSDoc annotations for gradual TypeScript adoption
