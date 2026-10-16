<script>
	import { Settings2 } from '@lucide/svelte';
	import FilterPanel from '$lib/components/filters/FilterPanel.svelte';
	import { setFilterSheet } from '$lib/components/filters/filter-sheet.js';

	/**
	 * TableOptions — the sliders button every tracker table panel carries in its
	 * header (and collapsed rail), opening that table's options: a popover under
	 * the button from 768px up, a bottom sheet over the table sheet on phones
	 * (`FilterPanel`), with Done (and `footerLeft`, e.g. "Show all columns") in
	 * its footer. The options lay out as the filter sheet's titled sections
	 * (`FilterSheetSection`, segmented switches, switch rows), and apply as
	 * they're picked. The button's title echoes the current choices
	 * (`summary`).
	 *
	 * @type {{
	 *   title: string,
	 *   summary: string,
	 *   footerLeft?: import('svelte').Snippet,
	 *   children: import('svelte').Snippet
	 * }}
	 */
	let { title, summary, footerLeft, children: content } = $props();

	setFilterSheet();
</script>

<FilterPanel
	label={title}
	{title}
	panelClass="w-[320px]"
	sheetPeek={0.82}
	dialog
	applyLabel="Done"
	onapply={() => {}}
	{footerLeft}
>
	{#snippet trigger({ open, toggle })}
		<button
			type="button"
			aria-label={title}
			aria-haspopup="dialog"
			aria-expanded={open}
			title={`${title} · ${summary}`}
			onclick={toggle}
			class="flex size-[40px] shrink-0 cursor-pointer items-center justify-center rounded-lg transition-colors hover:bg-light-warm-grey focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-dark-grey motion-reduce:transition-none {open
				? 'bg-light-warm-grey text-dark-grey'
				: 'text-mid-grey'}"
		>
			<Settings2 class="size-[16px]" strokeWidth={1.75} aria-hidden="true" />
		</button>
	{/snippet}
	<div class="px-4 max-tablet:px-6">{@render content()}</div>
</FilterPanel>
