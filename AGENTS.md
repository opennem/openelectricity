# Open Electricity agent guide

This is the canonical guidance for any coding agent working in this repository.
Platform-specific instruction files must defer to this document rather than
duplicating it.

## Start here

- If `personal-notes/` exists, begin with `personal-notes/PLAN.md` and
  `personal-notes/TODO.md` for the maintainer's current priorities and local
  working context. The directory is intentionally gitignored and may be absent.
- Keep all project-specific agent memory, next actions, TODOs, and planning notes
  in `personal-notes/`. Do not create local planning or memory files elsewhere in
  the repository.
- Read `README.md` for setup and `docs/architecture.md` before unfamiliar work.
- Preserve unrelated working-tree changes. Do not reset, reformat, or stage them.
- Prefer small, focused changes. Read the nearby code and tests before changing a
  subsystem.
- Use UK English in user-facing copy, documentation, and commit messages.

## Commands and verification

- Use `pnpm` only. Node 22.12 or later is required.
- `pnpm run dev` is the contributor path and reads `.env`.
- `pnpm run doppler-dev` is a maintainer convenience; never make Doppler a
  requirement for contributors.
- Run `pnpm run test:unit` for code changes. Run the narrowest relevant test
  first when practical.
- Run `pnpm run check` after JavaScript, TypeScript, or Svelte changes. It has a
  known pre-existing error baseline; do not introduce errors in files you touch.
- Run `pnpm run lint` when formatting or linting is relevant. Do not run
  `pnpm run format` over unrelated files without permission.

## Project rules

- This is Svelte 5 and SvelteKit. Use runes in new reactive code and property
  event handlers such as `onclick`, not legacy `on:click` syntax.
- Do not introduce React-bound packages. Install framework-neutral packages
  only, and add every package with `pnpm add -D`.
- Keep contributor `.env` support. When adding an environment variable, update
  `.env.example` and explain both local `.env` and maintainer Doppler flows in
  any setup documentation you change.
- Avoid new public `/api/*` routes for server-only data calls; call the service
  directly from a server load function instead. New client-facing endpoints need
  validation, caching, error handling, and a documented browser caller.
- Tests live next to the code they cover: `thing.js` and `thing.test.js`, never
  in a new `__tests__/` directory.
- Generated facility OG cards are committed assets. Follow the root README's
  `build:og` instructions; do not regenerate them incidentally.

## Git and release safety

- Do not commit unless explicitly asked. For UI changes, wait for the user to
  manually test unless they ask to proceed without it.
- Before an explicit commit, simplify the diff: review for reuse, clarity,
  Svelte 5 conventions, and relevant test coverage; make safe refactors and run
  verification. See `docs/agent-workflows/commits.md`.
- Stage named files only. Never use `git add -A`, `git add .`, or `git add -u`.
- Never stage secrets (`.env*`, credentials, private keys) or use `--no-verify`.
- Never push, amend, force-push, or rewrite history unless the user explicitly
  authorises that exact action.
- Releases are version tags from `main`; use
  `docs/agent-workflows/releases.md`.

## Change guides

- `docs/agent-workflows/fuel-technologies.md` — add a fuel technology safely.
- `docs/agent-workflows/oe-api-routes.md` — design OE-backed endpoints.
- `docs/agent-workflows/svelte-5-review.md` — review Svelte/reactivity work.
- `docs/agent-workflows/commits.md` — simplify, commit, and push rules.
- `docs/agent-workflows/releases.md` — verify, tag, deploy, and sync branches.
