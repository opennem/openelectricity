---
name: commit
description: Create a git commit with the project's conventions — imperative-title + bullet body, no Co-Authored-By, staged by filename (never -A), pre-commit tests must pass, docs/tests reviewed. Use when the user says "commit", "commit this", "commit all", "commit everything", "stage and commit", or otherwise asks for changes to be committed.
---

# Commit: project conventions

This skill is the user's standing preference for how commits are created in this repo. Follow it whenever the user asks for a commit — don't invent your own workflow.

## When this skill applies — and when it doesn't

- **Applies** when the user explicitly asks to commit (any of the trigger phrases above).
- **Does not apply** when the user has just asked for code changes without saying "commit". The standing rule is [`feedback_no_commit_until_tested.md`](../../../../../.claude/projects/-Users-steventan-Documents-Code-openelectricity/memory/feedback_no_commit_until_tested.md): don't auto-commit after implementing — wait for the user to test and ask.
- **Does not apply** to version bumps or releases — those use the [`release` skill](../release/SKILL.md).

## Step 1 — Preflight (parallel `Bash` calls)

Run in one message so they complete together:

1. `git status --porcelain` — list of what would be committed.
2. `git log --oneline -5` — recent commit-message style to mirror.
3. `git rev-parse --abbrev-ref HEAD` — current branch (informational; don't block).

From the status output:

- If there's **nothing to commit**, stop and tell the user.
- If the status lists obvious **secret files** (`.env`, `.env.local`, `credentials.json`, `*.pem`, `service-account*.json`, etc.), **stop and ask** — never auto-stage them.
- If the user named specific files, narrow down to those; otherwise the whole working-tree diff is the scope.

## Step 2 — Verify the change is ready

Run `bun run test` (blocking) and `bun run check` (informational) in parallel. On failure:

- **Tests fail**: stop. Show the failing names to the user and ask whether to fix or commit anyway. Do not commit broken tests unless the user explicitly overrides.
- **Type check has errors**: this repo has a pre-existing baseline (studio/stratify/auth pages). Only block if the errors are in files being committed. Otherwise proceed and note the count.

Skip tests/check only if the user says "skip checks" or "just commit" explicitly.

## Step 3 — Docs and test coverage review

Before staging, scan the diff for things that usually need a companion update. Default is to fold updates into the same commit unless the user says otherwise.

### 3a — Find every relevant README

For each file in the diff, walk **up** the directory tree from the file's folder to the repo root, collecting every `README.md` on the way. Deduplicate.

```bash
# Example for src/lib/components/charts/v2/elements/StepHoverBand.svelte:
# check src/lib/components/charts/v2/elements/README.md
# check src/lib/components/charts/v2/README.md
# check src/lib/components/charts/README.md
# check src/lib/components/README.md
# check src/lib/README.md
# ... (root README.md is usually out of scope for code-level docs)
```

You can do this quickly with a find-and-filter:

```bash
# For each changed directory, list READMEs upward until repo root
git diff --cached --name-only --diff-filter=d | xargs -I{} dirname {} | sort -u | \
while read d; do
    while [ "$d" != "." ] && [ "$d" != "/" ]; do
        [ -f "$d/README.md" ] && echo "$d/README.md"
        d=$(dirname "$d")
    done
done | sort -u
```

**Read every README that turns up** (use `Read`, don't grep blind) — the goal is to assess whether the current change makes any part of the document inaccurate or incomplete. Common cases to update:

- **Prop tables** — any component whose public props changed needs its table updated.
- **File-structure trees** — any new file belongs in the tree listing.
- **Property tables for stores/classes** — new `$derived` getters, `$state` fields, or methods added to a runes class.
- **Usage examples / snippets** — if the change affected how something is called from outside.
- **Architectural sections** — new modes, new interaction behaviour, new pipelines.
- **Cross-references** — if you moved or renamed something that another README points to.

If nothing in a given README is affected, skip it — don't rewrite just to touch the file.

### 3b — Test coverage

- **Pure helpers added** (new `.js` module with exported functions, no runes / no framework) → should have a co-located `*.test.js`. Existing convention: `wheel-interaction.js` + `wheel-interaction.test.js`, `step-band.js` + `step-band.test.js`, `tooltip-derivations.js` + `tooltip-derivations.test.js`.
- **Runes class additions** (new `$derived` getters on `ChartStore` etc.) → extend the corresponding `*.test.js` to cover the new derivation. Look at `ChartStore.test.js` as a template.

### 3c — Surface what you found

Before staging, report back what you're about to include. Example:

> "Updating these alongside the code:
> - `src/lib/components/charts/v2/README.md` — add `stepIntervalMs` / `renderXDomain` to the ChartStore property table, refresh the Step Mode section.
> - `step-band.test.js` — add cases for uneven-interval last-point extrapolation."

If unsure whether an update is warranted, ask; default to including it.

## Step 4 — Stage by filename

**Never** use `git add -A`, `git add -u`, or `git add .`. Always name files:

```bash
git add src/lib/components/charts/v2/ChartStore.svelte.js src/lib/components/charts/v2/StackedAreaChart.svelte …
```

This protects against accidentally staging:
- Sensitive files that slipped into the working tree
- Unrelated side changes from a different task
- Large binaries / generated files

Quote paths with parens (`src/routes/(main)/…`) if using shell interpolation, but git commands handle them fine without quoting.

## Step 5 — Write the message

**Title** (first line, under 70 chars):

- Imperative mood: "Render last step-mode bar at full width", "Lift wheel pan/zoom into InteractionLayer", "Fix facility detail panel header alignment".
- No trailing period.
- No prefix tags like `feat:` / `fix:` — this repo doesn't use conventional commits.

**Body** (after one blank line):

- Bullet list (`- ` prefix), one bullet per distinct change.
- Focus on *why* / *what it now does*, not a restatement of the diff. Future readers want intent, not a list of files.
- Wrap around 78 characters for `git log` readability.
- **UK English** — `colour`, `behaviour`, `initialise`, etc. (from global `CLAUDE.md`).

**Forbidden footers** (from global instructions):

- No `Co-Authored-By:` line.
- No "Generated with Claude Code" / "🤖" / any tool attribution.

Use a HEREDOC so formatting is preserved:

```bash
git commit -m "$(cat <<'EOF'
Render last step-mode bar at full width and fix hover alignment

- Append phantom trailing point in StackedAreaChart so curveStepAfter draws
  the final bucket; ChartStore derives stepIntervalMs + renderXDomain
- InteractionLayer now reads chart.renderXDomain so pointer→time stays in
  sync with the LayerCake $xScale (fixes hover misalignment near the edge)
- Hide the floating tooltip's vertical crosshair in step mode
- Extract StepHoverBand math to pure step-band.js helper; add tests
EOF
)"
```

## Step 6 — Post-commit sanity check

After the commit succeeds:

1. `git status --short` — confirm the tree is clean.
2. `git log --oneline -3` — confirm the commit title looks right.
3. `git rev-list --count origin/main..HEAD` — report how many commits are ahead of origin.

Short summary back to the user: `"Committed as <hash>. Working tree clean, N commits ahead of origin. Not pushed."`

## Step 7 — Don't push

Never push unless the user explicitly says "push", "push to main", "send it up", etc. Per the commit-safety protocol and global preference, pushing is always a separate authorisation.

If the user asks to push afterwards and the push is to `main`, don't use `--force`; if `git push` is rejected (e.g. non-fast-forward), stop and ask.

## Guardrails (always)

- **Never** use `git commit --amend` unless the user explicitly asks. If a pre-commit hook rejects the commit, the commit *didn't happen* — fix the issue and make a NEW commit. Amending here would overwrite the previous commit (potentially their in-progress work).
- **Never** skip hooks (`--no-verify`, `--no-gpg-sign`).
- **Never** stage `.env*`, `credentials*`, `*.pem`, or anything that looks like a secret, even if the user says "commit all" — stop and confirm.
- **Don't** rewrite commits that are already in `origin/main`.

## If the user asks to commit but nothing's been tested

Remind them once: "The standing rule is to wait for manual testing before committing UI changes — want me to proceed anyway?" If they confirm, proceed. Don't second-guess them a second time.

## References

- Global `CLAUDE.md` — UK English; no Co-Authored-By; no "Generated with Claude Code".
- Project `CLAUDE.md` — Bun for local tests/build, npm for version bumps, Cloudflare deploy pipeline.
- Memory `feedback_no_commit_until_tested.md` — why we wait for the user to test.
- Memory `feedback_no_test_plan_pr.md` — PR descriptions are summary-only (relevant if the commit is followed by PR creation).
- `release/SKILL.md` — for `npm version` bumps and deploy, not plain commits.
