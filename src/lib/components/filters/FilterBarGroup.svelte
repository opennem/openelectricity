<script>
	import { inFilterSheet } from './filter-sheet.js';

	/**
	 * FilterBarGroup — filter-bar layout that the phone filter sheet
	 * (`filter-sheet.js`) drops. In a bar it wraps its controls in a div with
	 * `class` (keeping them on one line, say), or renders them bare without a
	 * class. In a sheet the controls render bare, each laying itself out as a
	 * section; with `barOnly` (a separator, a joining word) nothing renders.
	 * `sheetOnly` is the reverse: controls the page shows elsewhere from 768px
	 * up (a bar of their own), gathered into the sheet on phones.
	 *
	 * @type {{ class?: string, barOnly?: boolean, sheetOnly?: boolean, children: import('svelte').Snippet }}
	 */
	let { class: className = '', barOnly = false, sheetOnly = false, children } = $props();

	const sheet = inFilterSheet();
</script>

{#if sheet ? !barOnly : !sheetOnly}
	{#if !sheet && className}
		<div class={className}>{@render children()}</div>
	{:else}
		{@render children()}
	{/if}
{/if}
