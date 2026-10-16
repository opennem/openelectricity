<script>
	import { ModalSheet } from '$lib/components/ui/bottom-sheet';
	import FilterSheetSection from '$lib/components/filters/FilterSheetSection.svelte';
	import { setFilterSheet } from '$lib/components/filters/filter-sheet.js';
	import Switch from '$lib/components/SwitchWithIcons.svelte';
	import { TRACKER_REGION_OPTIONS } from './tracker-regions.js';

	/**
	 * TrackerFilterSheet — the phone filters (below 768px): a `ModalSheet`
	 * opened from the sticky range pill, in the chrome of the Facilities filter
	 * sheet. It renders the Region switch and then the view's own `controls`,
	 * the same snippet the filter bar shows from 768px up, in a filter-sheet
	 * subtree (`filter-sheet.js`): each control lays itself out as a
	 * collapsible section listing its options as radios (or checkboxes), with
	 * its current choice as the section's tag. Picks apply as they land, so the
	 * charts behind update while the sheet is open. Like the Facilities
	 * filters, it opens near the top with no middle snap.
	 *
	 * @type {{
	 *   open: boolean,
	 *   onclose: () => void,
	 *   region: string,
	 *   regionSelect: boolean,
	 *   onregionchange: (value: string) => void,
	 *   controls?: import('svelte').Snippet
	 * }}
	 */
	let { open, onclose, region, regionSelect, onregionchange, controls } = $props();

	setFilterSheet();

	/** One tap per region, like the range: "All" (NEM and WEM), the NEM, its
	 * five states and WA, named in full for assistive tech. */
	const regionButtons = TRACKER_REGION_OPTIONS.map((option) => ({
		label: option.value === 'au' ? 'All' : (option.shortLabel ?? option.label),
		ariaLabel: option.label,
		value: option.value
	}));
</script>

<ModalSheet {open} {onclose} title="Filters" class="tablet:hidden">
	<section class="px-6" aria-label="Filters" data-testid="tracker-filter-sheet">
		{#if regionSelect}
			<FilterSheetSection title="Region">
				<Switch
					buttons={regionButtons}
					selected={region}
					columns={4}
					rounded="rounded-lg"
					darkSelected
					aria-label="Region"
					onchange={(option) => {
						if (option.value !== region) onregionchange(option.value);
					}}
				/>
			</FilterSheetSection>
		{/if}
		{@render controls?.()}
	</section>
</ModalSheet>
