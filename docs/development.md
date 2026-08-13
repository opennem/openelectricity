# Development and quality checks

## Commands

| Command                | Purpose                                         |
| ---------------------- | ----------------------------------------------- |
| `pnpm run dev`         | Contributor development server using `.env`     |
| `pnpm run doppler-dev` | Maintainer server with Doppler-injected secrets |
| `pnpm run build`       | Production build using local `.env`             |
| `pnpm run test:unit`   | One-off Vitest unit suite                       |
| `pnpm run check`       | Svelte and JSDoc diagnostics                    |
| `pnpm run lint`        | Prettier check and ESLint                       |
| `pnpm run test:e2e`    | Playwright end-to-end suite                     |

`pnpm run test` intentionally remains Vitest's interactive/watch-oriented entry
point. Use `test:unit` for a deterministic one-off verification.

## Diagnostic baseline

The unit suite is expected to pass. `pnpm run check` currently reports existing
diagnostics, concentrated in chart-v2, Studio, scenario, and Clerk typing work.
Treat it as a regression check: investigate diagnostics in changed files rather
than fixing unrelated baseline debt as part of an ordinary feature.

## Environment and service access

The checked-in `.env.example` documents required variables. Keep public values
and private keys out of source code and commit only the example file.

Maintainers may load the same variables through Doppler. Contributor commands
must continue to work with a local `.env`.

## MCP configuration

`.mcp.json` is intentionally local and ignored because it can contain
machine-specific connections. Copy `.mcp.example.json` to `.mcp.json` and enable
only the services you have authority to use.
