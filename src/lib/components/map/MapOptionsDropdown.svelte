<script>
	import { fly } from 'svelte/transition';
	import { clickoutside } from '@svelte-put/clickoutside';
	import { Layers, Flag, Sparkles } from '@lucide/svelte';
	import { MAP_FAB_CLASS } from './map-style.js';

	/**
	 * Floating map-display options dropdown, shared by every map surface
	 * (/facilities, /facility/[code], /tracker). The trigger is always the
	 * same circular Layers icon so the control is recognisable across maps;
	 * per-map rows are opted out via the `show*Option` props.
	 * @type {{
	 *   mapTheme?: 'voyager' | 'light' | 'dark' | 'satellite',
	 *   showVoyagerTheme?: boolean,
	 *   showTransmissionLines?: boolean,
	 *   showFlows?: boolean,
	 *   showFlowsOption?: boolean,
	 *   showGolfCourses?: boolean,
	 *   showGolfOption?: boolean,
	 *   showMagicIndicator?: boolean,
	 *   clustering?: boolean,
	 *   showClusteringOption?: boolean,
	 *   showDaylight?: boolean,
	 *   showDaylightOption?: boolean,
	 *   showCloudCover?: boolean,
	 *   showCloudCoverOption?: boolean,
	 *   showLegend?: boolean,
	 *   showLegendOption?: boolean,
	 *   onmapthemechange?: (value: 'voyager' | 'light' | 'dark' | 'satellite') => void,
	 *   ontransmissionlineschange?: (value: boolean) => void,
	 *   onflowschange?: (value: boolean) => void,
	 *   ongolfcourseschange?: (value: boolean) => void,
	 *   onclusteringchange?: (value: boolean) => void,
	 *   ondaylightchange?: (value: boolean) => void,
	 *   oncloudcoverchange?: (value: boolean) => void,
	 *   onshowlegendchange?: (value: boolean) => void
	 * }}
	 */
	let {
		mapTheme = 'light',
		showVoyagerTheme = false,
		showTransmissionLines = true,
		showFlows = true,
		/** Show the interconnector-flows row (the tracker map only). */
		showFlowsOption = false,
		showGolfCourses = false,
		showGolfOption = false,
		showMagicIndicator = false,
		clustering = true,
		showLegend = false,
		/** Hide the legend row for maps that have no legend (e.g. the facility detail map). */
		showLegendOption = true,
		/** Hide the clustering row for maps with a single point (e.g. one facility). */
		showClusteringOption = true,
		showDaylight = false,
		showDaylightOption = false,
		showCloudCover = false,
		showCloudCoverOption = false,
		onmapthemechange,
		ontransmissionlineschange,
		onflowschange,
		ongolfcourseschange,
		onclusteringchange,
		ondaylightchange,
		oncloudcoverchange,
		onshowlegendchange
	} = $props();

	let isOpen = $state(false);

	function handleClickOutside() {
		isOpen = false;
	}

	const THEMES = /** @type {const} */ ([
		{ value: 'light', label: 'Light' },
		{ value: 'dark', label: 'Dark' },
		{ value: 'satellite', label: 'Satellite' }
	]);

	let themes = $derived(
		showVoyagerTheme
			? [{ value: /** @type {const} */ ('voyager'), label: 'Voyager' }, ...THEMES]
			: THEMES
	);
</script>

{#snippet tick()}
	<svg
		class="w-3 h-3 text-white"
		fill="none"
		viewBox="0 0 24 24"
		stroke="currentColor"
		stroke-width="3"
	>
		<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
	</svg>
{/snippet}

{#snippet flag()}
	<Flag class="w-3 h-3 text-white" />
{/snippet}

<!-- Every toggle in the menu. `tint` and `mark` exist for the golf row, which
     fills its box in course-green and marks it with a flag; leaving it as its own
     copy of this markup is how it ended up without a pressed state or a button
     type when the rest gained them. -->
{#snippet checkboxRow(
	/** @type {string} */ label,
	/** @type {boolean} */ checked,
	/** @type {((value: boolean) => void) | undefined} */ onchange,
	/** @type {string} */ tint = '',
	/** @type {import('svelte').Snippet} */ mark = tick
)}
	<button
		type="button"
		onclick={() => onchange?.(!checked)}
		aria-pressed={checked}
		class="w-full cursor-pointer px-3 py-2 text-xs font-medium flex items-center gap-3 hover:bg-light-warm-grey transition-colors text-left"
	>
		<span
			class="w-5 h-5 rounded border-2 flex items-center justify-center transition-colors"
			class:bg-dark-grey={checked && !tint}
			class:border-dark-grey={checked && !tint}
			class:border-mid-warm-grey={!checked}
			style={checked && tint ? `background-color: ${tint}; border-color: ${tint};` : ''}
		>
			{#if checked}{@render mark()}{/if}
		</span>
		<span class="flex-1">{label}</span>
	</button>
{/snippet}

<div class="relative" use:clickoutside onclickoutside={handleClickOutside}>
	<button
		onclick={() => (isOpen = !isOpen)}
		class="size-11 {MAP_FAB_CLASS}"
		title="Map display options"
	>
		{#if showMagicIndicator}
			<Sparkles class="size-6" style="color: #facc15;" />
		{:else}
			<Layers class="size-6" />
		{/if}
	</button>

	{#if isOpen}
		<div
			class="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-mid-warm-grey z-50 min-w-[220px] py-2"
			in:fly={{ y: -5, duration: 150 }}
		>
			<!-- Map theme (Light / Dark / Satellite) -->
			<div class="px-3 py-1">
				<div class="text-[10px] font-semibold uppercase tracking-wider text-mid-grey mb-1.5">
					Map theme
				</div>
				<div class="inline-flex w-full rounded-md border border-warm-grey overflow-hidden">
					{#each themes as { value, label } (value)}
						<button
							type="button"
							onclick={() => onmapthemechange?.(value)}
							aria-pressed={mapTheme === value}
							class="flex-1 px-2 py-1 text-xs transition-colors cursor-pointer"
							class:bg-dark-grey={mapTheme === value}
							class:text-white={mapTheme === value}
							class:font-medium={mapTheme === value}
							class:text-mid-grey={mapTheme !== value}
							class:hover:text-dark-grey={mapTheme !== value}
							class:hover:bg-light-warm-grey={mapTheme !== value}
						>
							{label}
						</button>
					{/each}
				</div>
			</div>

			<div class="border-t border-warm-grey my-2"></div>

			<!-- Transmission lines toggle -->
			{@render checkboxRow('Transmission lines', showTransmissionLines, ontransmissionlineschange)}

			<!-- Interconnector flows toggle -->
			{#if showFlowsOption}
				{@render checkboxRow('Interconnector flows', showFlows, onflowschange)}
			{/if}

			<!-- Clustering toggle -->
			{#if showClusteringOption}
				{@render checkboxRow('Clustering', clustering, onclusteringchange)}
			{/if}

			{#if showDaylightOption}
				{@render checkboxRow('Day/night', showDaylight, ondaylightchange)}
			{/if}

			{#if showCloudCoverOption}
				{@render checkboxRow('Cloud cover', showCloudCover, oncloudcoverchange)}
				<p class="pl-11 pr-3 pb-1 -mt-1 text-[10px] text-mid-grey">
					Asia-Pacific imagery: NASA GIBS · JMA Himawari
				</p>
			{/if}

			{#if showGolfOption}
				<div class="border-t border-warm-grey my-1"></div>
				{@render checkboxRow(
					'Golf courses',
					showGolfCourses,
					ongolfcourseschange,
					mapTheme === 'satellite' ? '#4ade80' : '#16a34a',
					flag
				)}
			{/if}

			{#if showLegendOption}
				<!-- Last, below a rule: this one shows map chrome rather than toggling
				     a layer, so it doesn't belong with the rows above it. -->
				<div class="border-t border-warm-grey my-1"></div>
				{@render checkboxRow('Show legend', showLegend, onshowlegendchange)}
			{/if}
		</div>
	{/if}
</div>
