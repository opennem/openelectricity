<script>
	import { fly } from 'svelte/transition';
	import { clickoutside } from '@svelte-put/clickoutside';
	import { Layers, ChevronDown, Flag, Sparkles } from '@lucide/svelte';

	/**
	 * @type {{
	 *   mapTheme?: 'light' | 'dark' | 'satellite',
	 *   markerStyle?: 'circles' | 'hex' | 'heatmap',
	 *   showMarkerStyleOption?: boolean,
	 *   showTransmissionLines: boolean,
	 *   showGolfCourses: boolean,
	 *   showGolfOption: boolean,
	 *   showMagicIndicator: boolean,
	 *   clustering: boolean,
	 *   onmapthemechange?: (value: 'light' | 'dark' | 'satellite') => void,
	 *   onmarkerstylechange?: (value: 'circles' | 'hex' | 'heatmap') => void,
	 *   ontransmissionlineschange?: (value: boolean) => void,
	 *   ongolfcourseschange?: (value: boolean) => void,
	 *   onclusteringchange?: (value: boolean) => void
	 * }}
	 */
	let {
		mapTheme = 'light',
		markerStyle = 'circles',
		showMarkerStyleOption = false,
		showTransmissionLines = true,
		showGolfCourses = false,
		showGolfOption = false,
		showMagicIndicator = false,
		clustering = true,
		onmapthemechange,
		onmarkerstylechange,
		ontransmissionlineschange,
		ongolfcourseschange,
		onclusteringchange
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

	const MARKER_STYLES = /** @type {const} */ ([
		{ value: 'circles', label: 'Circles' },
		{ value: 'hex', label: 'Hex' },
		{ value: 'heatmap', label: 'Heat' }
	]);

	let clusteringDisabled = $derived(markerStyle !== 'circles');
</script>

<div class="relative" use:clickoutside onclickoutside={handleClickOutside}>
	<button
		onclick={() => (isOpen = !isOpen)}
		class="bg-white rounded-lg px-3 py-2 text-xs font-medium flex items-center gap-2 hover:bg-light-warm-grey transition-colors border-2 border-warm-grey"
		title="Map display options"
	>
		{#if showMagicIndicator}
			<Sparkles class="size-5" style="color: #facc15;" />
		{:else}
			<Layers class="size-4" />
		{/if}
		<span>Layers</span>
		<ChevronDown class="size-3 transition-transform {isOpen ? 'rotate-180' : ''}" />
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
					{#each THEMES as { value, label } (value)}
						<button
							type="button"
							onclick={() => onmapthemechange?.(value)}
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

			<!-- Marker style (Circles / Hex / Heat) — gated by `show_map_experiments` -->
			{#if showMarkerStyleOption}
				<div class="px-3 py-1 mt-2">
					<div class="text-[10px] font-semibold uppercase tracking-wider text-mid-grey mb-1.5">
						Marker style
					</div>
					<div class="inline-flex w-full rounded-md border border-warm-grey overflow-hidden">
						{#each MARKER_STYLES as { value, label } (value)}
							<button
								type="button"
								onclick={() => onmarkerstylechange?.(value)}
								class="flex-1 px-2 py-1 text-xs transition-colors cursor-pointer"
								class:bg-dark-grey={markerStyle === value}
								class:text-white={markerStyle === value}
								class:font-medium={markerStyle === value}
								class:text-mid-grey={markerStyle !== value}
								class:hover:text-dark-grey={markerStyle !== value}
								class:hover:bg-light-warm-grey={markerStyle !== value}
							>
								{label}
							</button>
						{/each}
					</div>
				</div>
			{/if}

			<div class="border-t border-warm-grey my-2"></div>

			<!-- Transmission lines toggle -->
			<button
				onclick={() => {
					ontransmissionlineschange?.(!showTransmissionLines);
				}}
				class="w-full px-3 py-2 text-xs font-medium flex items-center gap-3 hover:bg-light-warm-grey transition-colors text-left"
			>
				<span
					class="w-5 h-5 rounded border-2 flex items-center justify-center transition-colors"
					class:bg-dark-grey={showTransmissionLines}
					class:border-dark-grey={showTransmissionLines}
					class:border-mid-warm-grey={!showTransmissionLines}
				>
					{#if showTransmissionLines}
						<svg
							class="w-3 h-3 text-white"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							stroke-width="3"
						>
							<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
						</svg>
					{/if}
				</span>
				<span class="flex-1">Transmission lines</span>
			</button>

			<!-- Clustering toggle (only meaningful for the Circles marker
			     style — hex and heatmap have their own visual semantics) -->
			<button
				disabled={clusteringDisabled}
				onclick={() => {
					if (!clusteringDisabled) onclusteringchange?.(!clustering);
				}}
				class="w-full px-3 py-2 text-xs font-medium flex items-center gap-3 transition-colors text-left disabled:cursor-not-allowed disabled:opacity-50"
				class:hover:bg-light-warm-grey={!clusteringDisabled}
				title={clusteringDisabled
					? 'Clustering only applies to the Circles marker style'
					: ''}
			>
				<span
					class="w-5 h-5 rounded border-2 flex items-center justify-center transition-colors"
					class:bg-dark-grey={clustering && !clusteringDisabled}
					class:border-dark-grey={clustering && !clusteringDisabled}
					class:border-mid-warm-grey={!clustering || clusteringDisabled}
				>
					{#if clustering && !clusteringDisabled}
						<svg
							class="w-3 h-3 text-white"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							stroke-width="3"
						>
							<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
						</svg>
					{/if}
				</span>
				<span class="flex-1">Clustering</span>
			</button>

			{#if showGolfOption}
				<div class="border-t border-warm-grey my-1"></div>

				<!-- Golf courses toggle -->
				<button
					onclick={() => {
						ongolfcourseschange?.(!showGolfCourses);
					}}
					class="w-full px-3 py-2 text-xs font-medium flex items-center gap-3 hover:bg-light-warm-grey transition-colors text-left"
				>
					<span
						class="w-5 h-5 rounded border-2 flex items-center justify-center transition-colors"
						class:border-mid-warm-grey={!showGolfCourses}
						style={showGolfCourses
							? `background-color: ${mapTheme === 'satellite' ? '#4ade80' : '#16a34a'}; border-color: ${mapTheme === 'satellite' ? '#4ade80' : '#16a34a'};`
							: ''}
					>
						{#if showGolfCourses}
							<Flag class="w-3 h-3 text-white" />
						{/if}
					</span>
					<span class="flex-1">Golf courses</span>
				</button>
			{/if}
		</div>
	{/if}
</div>
