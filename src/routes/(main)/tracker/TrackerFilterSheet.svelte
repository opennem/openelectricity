<script>
	import { fade } from 'svelte/transition';
	import { X } from '@lucide/svelte';
	import { BottomSheet } from '$lib/components/ui/bottom-sheet';
	import FilterSheetSection from '$lib/components/filters/FilterSheetSection.svelte';
	import { setFilterSheet } from '$lib/components/filters/filter-sheet.js';
	import Switch from '$lib/components/SwitchWithIcons.svelte';
	import { TRACKER_REGION_OPTIONS } from './tracker-regions.js';

	/**
	 * TrackerFilterSheet — the phone filters (below 768px): a bottom sheet over
	 * a dimmed page, opened from the sticky range pill, in the chrome of the
	 * Facilities filter sheet (centred title, round ✕, a full-width button in
	 * the footer). It renders the Region switch and then the view's own
	 * `controls`, the same snippet the filter bar shows from 768px up, in a
	 * filter-sheet subtree (`filter-sheet.js`): each control lays itself out
	 * as a collapsible section listing its options as radios (or checkboxes),
	 * with its current choice as the section's tag. Picks apply as they land,
	 * so the charts behind update while the sheet is open; Done, ✕, Escape, a
	 * tap on the page or a drag down closes it.
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

	let containerHeight = $state(0);

	// Like the Facilities filters, the sheet opens near the top with no middle
	// snap: a drag down either settles back or, past the dismiss line, closes.
	const SHEET_FRACTION = 0.94;

	/** @param {KeyboardEvent} event */
	function handleKeydown(event) {
		if (open && event.key === 'Escape') onclose();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- Kept mounted (pointer-events-none) so the sheet's fly in and out can play. -->
<div
	class="pointer-events-none fixed inset-0 z-50 tablet:hidden"
	bind:clientHeight={containerHeight}
>
	{#if open}
		<!-- A tap on the dimmed page closes the sheet; ✕, Done and Escape are
		     the accessible ways out. -->
		<div
			class="pointer-events-auto absolute inset-0 bg-black/20"
			aria-hidden="true"
			transition:fade={{ duration: 150 }}
			onclick={onclose}
		></div>
	{/if}
	<BottomSheet
		{open}
		{onclose}
		{containerHeight}
		peekFraction={SHEET_FRACTION}
		fullFraction={SHEET_FRACTION}
		class="pointer-events-auto"
	>
		{#snippet header()}
			<div
				class="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-2 border-b border-warm-grey px-6 pb-4 pt-2"
			>
				<h2 class="col-start-2 mb-0 text-base">Filters</h2>
				<button
					type="button"
					class="cursor-pointer justify-self-end rounded-full bg-light-warm-grey p-2 transition-colors hover:bg-warm-grey"
					onclick={onclose}
					aria-label="Close filters"
				>
					<X class="size-5 text-dark-grey" />
				</button>
			</div>
		{/snippet}

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

		{#snippet footer()}
			<footer class="shrink-0 border-t border-warm-grey bg-white p-4">
				<button
					type="button"
					class="w-full cursor-pointer rounded-lg bg-dark-grey py-4 text-sm font-medium text-white transition-colors hover:bg-black"
					onclick={onclose}
				>
					Done
				</button>
			</footer>
		{/snippet}
	</BottomSheet>
</div>
