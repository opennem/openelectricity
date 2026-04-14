---
name: svelte5-review
description: Review Svelte 5 code for rune antipatterns specific to this project — misuse of $effect for derived state, $state holding large datasets, legacy on:event syntax, missing $bindable, unnecessary untrack. Read-only — reports issues with file:line refs, never auto-fixes. Use when the user asks to "review", "audit", "check" Svelte components or modules.
---

# Svelte 5 Review

Review `.svelte`, `.svelte.js`, and `.svelte.ts` files for rune antipatterns. **This skill is read-only** — do not mutate any files. Report findings with `file:line` refs so the user can navigate.

## Arguments

Path(s) or glob(s) to review. If none given, ask the user which files.

## Step 1 — Run the official autofixer first

For every `.svelte` file in scope, call the Svelte MCP autofixer:

```
mcp__plugin_svelte_svelte__svelte-autofixer
```

Collect its findings but do not apply them. The autofixer catches framework-level issues; the project-specific ones below are what this skill adds on top.

## Step 2 — Project-specific antipattern checks

Use `Grep` (not Bash) for each pattern below. For each hit, read enough surrounding lines to judge whether it's a real violation or a false positive.

### A. `$effect` that only syncs one reactive into another — should be `$derived`

Pattern: an `$effect` block whose body is a single assignment like `foo = bar.something`.

```js
// ❌
$effect(() => {
    filtered = data.filter(...);
});

// ✅
let filtered = $derived(data.filter(...));
```

Grep: `\\$effect\\(` then inspect each block. Valid reasons to keep `$effect`: DOM side effects, timers, `fetch`, external API calls, `console.log`, `setTimeout`.

### B. `$state` holding large arrays/objects of chart data

Project rule (from memory): never store large datasets in `$state` — Svelte's proxy overhead tanks performance. Use plain variables with a reactive version counter, or `$state.raw` for arrays that are reassigned wholesale.

Canonical correct example: `src/lib/components/charts/v2/ChartStore.svelte.js` uses `$state.raw([])` for `seriesData` and similar.

Flag: `\\$state\\(\\s*\\[` and `\\$state\\(\\s*\\{` where the contents are populated from API responses, processed chart data, or anything expected to exceed ~100 items.

### C. `untrack()` + `$effect` that could be `$derived.by()`

Look for `untrack(() => …)` inside `$effect` blocks that guard against dependency tracking. These are often a signal that the correct abstraction is `$derived.by()` keyed on the actual dependency.

Canonical correct refactor: replace with `let x = $derived.by(() => { … })` that reads only the intended dependency.

### D. Legacy event syntax

`on:click`, `on:change`, `on:input`, `on:submit`, etc. Svelte 5 uses property syntax: `onclick`, `onchange`, etc.

Grep: `on:(click|change|input|submit|keydown|keyup|mouseenter|mouseleave|scroll|wheel)` in `.svelte` files.

### E. Slot patterns where snippets would be idiomatic

Grep: `<slot\\b` — suggest refactoring to `{#snippet}` + `{@render}` when the slot is used for structured content (not just default content).

### F. `$props()` destructuring missing `$bindable()`

If a parent binds a prop via `bind:foo={...}`, the child must declare it with `$bindable()`. Check for `bind:` in consumers and verify the child declares `let { foo = $bindable() } = $props()`.

### G. Dev log pollution

`console.log` inside `$effect` that wasn't obviously for debugging a specific fix. Flag but don't remove.

## Step 3 — Report

Produce a concise report grouped by severity:

- **Errors**: autofixer output, bind without `$bindable`, `on:event` syntax.
- **Warnings**: `$effect` that should be `$derived`, `$state` on large datasets, `untrack` + `$effect` patterns, slot usage.
- **Notes**: `console.log`, minor style issues.

Each finding: `path/to/file.svelte:123 — <one-line description>`.

**Do not edit any files.** If the user wants fixes applied after reading the report, they'll ask.

## Canonical correct examples

Point users to these when describing what "good" looks like:
- `src/lib/components/charts/v2/ChartStore.svelte.js` — correct `$state.raw` and `$derived.by()` usage.
- `src/lib/components/charts/v2/ChartDataManager.svelte.js` — correct private `$state` fields.
