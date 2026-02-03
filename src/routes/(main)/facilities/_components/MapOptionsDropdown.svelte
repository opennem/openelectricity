<script>
	import { fly } from 'svelte/transition';
	import { clickoutside } from '@svelte-put/clickoutside';
	import { Layers, Map as MapIcon, Satellite, ChevronDown, Flag, Sparkles } from '@lucide/svelte';

	/**
	 * @type {{
	 *   satelliteView: boolean,
	 *   showTransmissionLines: boolean,
	 *   showGolfCourses: boolean,
	 *   showGolfOption: boolean,
	 *   showMagicIndicator: boolean,
	 *   clustering: boolean,
	 *   onsatellitechange?: (value: boolean) => void,
	 *   ontransmissionlineschange?: (value: boolean) => void,
	 *   ongolfcourseschange?: (value: boolean) => void,
	 *   onclusteringchange?: (value: boolean) => void
	 * }}
	 */
	let {
		satelliteView = false,
		showTransmissionLines = true,
		showGolfCourses = false,
		showGolfOption = false,
		showMagicIndicator = false,
		clustering = true,
		onsatellitechange,
		ontransmissionlineschange,
		ongolfcourseschange,
		onclusteringchange
	} = $props();

	let isOpen = $state(false);

	function handleClickOutside() {
		isOpen = false;
	}
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
			class="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-mid-warm-grey z-50 min-w-[180px] py-1"
			in:fly={{ y: -5, duration: 150 }}
		>
			<!-- Base map toggle -->
			<button
				onclick={() => {
					onsatellitechange?.(!satelliteView);
				}}
				class="w-full px-3 py-2 text-xs font-medium flex items-center gap-3 hover:bg-light-warm-grey transition-colors text-left"
			>
				{#if satelliteView}
					<Satellite class="size-5 text-mid-grey" />
				{:else}
					<MapIcon class="size-5 text-mid-grey" />
				{/if}
				<span class="flex-1">Base map</span>
				<span class="text-mid-grey">{satelliteView ? 'Satellite' : 'Map'}</span>
			</button>

			<div class="border-t border-warm-grey my-1"></div>

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

			<!-- Clustering toggle -->
			<button
				onclick={() => {
					onclusteringchange?.(!clustering);
				}}
				class="w-full px-3 py-2 text-xs font-medium flex items-center gap-3 hover:bg-light-warm-grey transition-colors text-left"
			>
				<span
					class="w-5 h-5 rounded border-2 flex items-center justify-center transition-colors"
					class:bg-dark-grey={clustering}
					class:border-dark-grey={clustering}
					class:border-mid-warm-grey={!clustering}
				>
					{#if clustering}
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
							? `background-color: ${satelliteView ? '#4ade80' : '#16a34a'}; border-color: ${satelliteView ? '#4ade80' : '#16a34a'};`
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
