<script>
	import { inFilterSheet } from './filter-sheet.js';

	/**
	 * FilterSheetSection — a titled section around a control that has no
	 * sheet layout of its own (a segmented switch, a date picker) in the phone
	 * filter sheet (`filter-sheet.js`), styled like the sheet's other
	 * sections, with an optional `action` (e.g. a "Show all" link) at the
	 * title's end. In a filter bar it renders the control alone.
	 *
	 * @type {{
	 *   title: string,
	 *   action?: import('svelte').Snippet,
	 *   children: import('svelte').Snippet
	 * }}
	 */
	let { title, action, children } = $props();

	const sheet = inFilterSheet();
	const id = $props.id();
</script>

{#if sheet}
	<section
		class="flex flex-col gap-3 border-b border-warm-grey py-4 last:border-b-0"
		aria-labelledby={id}
	>
		<div class="flex items-center justify-between gap-4">
			<h3 {id} class="m-0 font-space text-xs font-medium uppercase text-dark-grey">{title}</h3>
			{@render action?.()}
		</div>
		<div class="flex flex-col gap-2">{@render children()}</div>
	</section>
{:else}
	{@render children()}
{/if}
