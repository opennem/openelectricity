---
name: release
description: Bump the version (patch/minor/major), commit and tag via npm version, and push to main so the v* tag fires the Cloudflare deploy hook. Use when the user says "ship it", "release", "deploy", "cut a version", or asks to bump the version.
---

# Release: bump, tag, push

This project deploys via a GitHub Actions workflow triggered on `v*` tags. The workflow (`.github/workflows/deploy.yml`) calls a Cloudflare deploy hook stored as `CLOUDFLARE_DEPLOY_HOOK_URL`. There is no automatic deploy on every merge.

## Arguments

The skill accepts one optional argument: `patch` | `minor` | `major`. If the user didn't specify, ask which bump level they want.

## Preflight — verify before doing anything

Run these checks in parallel (single message, multiple `Bash` calls). **Refuse to continue if any fails — explain to the user what's blocking:**

1. `git rev-parse --abbrev-ref HEAD` — must print `main`.
2. `git status --porcelain` — must be empty (clean tree).
3. `git fetch origin && git rev-list --count HEAD..origin/main` — must be `0` (not behind).
4. `git log origin/main..HEAD --oneline` — show the user what's about to ship. If there are zero commits ahead, ask the user whether to continue (pure version bumps are valid but unusual).

## Bump and push

Do these sequentially (each depends on the last):

1. `npm version <level>` — creates a commit like `3.27.9` and tag `v3.27.9`. Never pass `--no-git-tag-version`. Never use `bun` here — the project's CLAUDE.md explicitly requires npm for version bumps.
2. `git push` — `push.followTags` is enabled globally (per project memory), so the tag ships with the commit. Do **not** force-push. Do **not** use `--no-verify`.
3. Show the user the new tag and the GH Actions URL. Grab the repo from `gh repo view --json nameWithOwner -q .nameWithOwner` if needed. The run shows up at `https://github.com/<owner>/<repo>/actions/workflows/deploy.yml`.

## After push — confirm the deploy fired

Within ~10s of push, run `gh run list --workflow=deploy.yml --limit 1` and report the status to the user. Don't poll — one check is enough.

## Sync `dev` with `main`

Once the tag is pushed, fast-forward `dev` to the released `main` so both branches stay aligned (dev powers `dev.openelectricity.org.au`, main powers production):

```bash
git checkout dev && git merge --ff-only main && git push && git checkout main
```

- Use `--ff-only` — this should always be a fast-forward. If it isn't, `dev` has diverged; stop and ask the user how to resolve before pushing anything.
- Return the user to `main` at the end so they're back on the release branch.
- `dev` is protected against deletion and force-push but allows direct merges, so this push succeeds without a PR.

## Guardrails (always)

- **Never** force-push, rewrite, or amend published commits.
- **Never** skip hooks.
- **Never** edit `package.json`'s `version` field by hand — always use `npm version`.
- If `npm version` fails (e.g. pre-commit hook rejects), fix the underlying issue and create a NEW commit. Don't `--amend`.
- If the user asks to release while on a non-`main` branch, stop and ask whether they really want to tag from that branch.

## References

- `.github/workflows/deploy.yml` — deploy trigger.
- `package.json` scripts `version:patch` / `version:minor` / `version:major`.
- `CLAUDE.md` → "Deploy Pipeline" section.
