<script>
	import { browser } from '$app/environment';
	import { CalendarClock } from '@lucide/svelte';

	/**
	 * @type {{
	 *   years: number[],
	 *   active: boolean,
	 *   selectedYear: number | null,
	 *   ontoggleyearfilter: () => void,
	 *   onyearselect: (year: number) => void
	 * }}
	 */
	let { years, active, selectedYear, ontoggleyearfilter, onyearselect } = $props();

	let sortedYears = $derived([...years].sort((a, b) => a - b));

	/** @type {HTMLDivElement | undefined} */
	let scrollContainer = $state(undefined);

	// Auto-scroll the selected year button into view
	$effect(() => {
		if (!browser || !active || selectedYear === null || !scrollContainer) return;

		const btn = scrollContainer.querySelector(`[data-year="${selectedYear}"]`);
		if (btn) {
			btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
		}
	});
</script>

<div class="flex items-center gap-2 px-3 py-2 border-b border-mid-warm-grey bg-white">
	<button
		class="shrink-0 flex items-center gap-1.5 px-2 h-8 rounded cursor-pointer transition-colors {active
			? 'bg-dark-grey text-white'
			: 'text-mid-grey hover:bg-warm-grey'}"
		onclick={ontoggleyearfilter}
	>
		<CalendarClock size={14} />
		{#if !active}
			<span class="text-xxs font-space whitespace-nowrap">Filter by year</span>
		{/if}
	</button>

	{#if active}
		<div class="w-px h-5 bg-mid-warm-grey shrink-0 self-center"></div>

		<div
			bind:this={scrollContainer}
			class="flex gap-1 overflow-x-auto"
			style="scrollbar-width: none;"
		>
			{#each sortedYears as year (year)}
				<button
					data-year={year}
					class="shrink-0 px-2 py-1 rounded text-xxs font-space cursor-pointer transition-colors whitespace-nowrap {year ===
					selectedYear
						? 'bg-dark-grey text-white'
						: 'text-mid-grey hover:bg-warm-grey'}"
					onclick={() => onyearselect(year)}
				>
					{year}
				</button>
			{/each}
		</div>
	{/if}
</div>

<style>
	div ::-webkit-scrollbar {
		display: none;
	}
</style>
