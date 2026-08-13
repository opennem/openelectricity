# Svelte 5 review guide

Review `.svelte`, `.svelte.js`, and `.svelte.ts` changes without making broad
unrequested refactors.

## Check for

- Derived values implemented as `$effect` assignments; use `$derived` or
  `$derived.by` when no external side effect is needed.
- Large API/chart arrays held in deep `$state`; prefer `$state.raw` when arrays
  are replaced wholesale.
- `untrack` inside an effect that is concealing what should be a derivation.
- Legacy `on:event` directives in newly changed Svelte code; use properties such
  as `onclick` and `onchange`.
- A parent `bind:prop` where the child did not declare that prop with
  `$bindable()`.
- New debug logs, accidental slots where snippets express the component contract
  better, and missing cleanup for timers, observers, or external listeners.

For chart state, use `src/lib/components/charts/v2/ChartStore.svelte.js` and
`ChartDataManager.svelte.js` as useful examples of `$state.raw` and derived
state, while still following the conventions of the subsystem being changed.
