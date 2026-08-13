# Contributing to Open Electricity

Thank you for helping improve Open Electricity.

## Local development

Use Node.js 22.12 or newer and pnpm. The normal contributor flow needs no
maintainer credentials:

```sh
pnpm install
cp .env.example .env
pnpm run dev
```

The application serves at `http://openelectricity.localhost:7602`.

Maintainers with Doppler access may instead use `pnpm run doppler-dev`. Do not
make Doppler necessary for contributors or forks.

## Before opening a change

Run the relevant checks:

```sh
pnpm run test:unit
pnpm run check
pnpm run lint
```

`pnpm run check` has a pre-existing diagnostic baseline. Please ensure your
change does not add diagnostics in files you touched.

Read [AGENTS.md](AGENTS.md) for the project's engineering conventions and the
change guides for Svelte, fuel-technology, API, and release work.

## Secrets and generated assets

Never commit `.env` files, credentials, or private keys. Update `.env.example`
when a new variable is required.

Facility social cards under `static/og/facility/` are committed generated
assets. Regenerate them only when the facility-card inputs changed; see the root
README for the `build:og` workflow.
