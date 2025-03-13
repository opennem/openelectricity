<script>
	import { getContext } from 'svelte';
	import IconXMark from '$lib/icons/XMark.svelte';
	import { fuelTechLabel, milestoneTypeLabel, periodLabel } from '../page-data-options/filters';

	const { selectedFuelTechs, selectedMetrics, selectedPeriods } = getContext('records-filters');
</script>

{#if $selectedFuelTechs.length || $selectedMetrics.length || $selectedPeriods.length}
	<h4 class="hidden md:block">Filters</h4>
{/if}

<div>
	{#if $selectedFuelTechs.length}
		<h6 class="md:mt-10">Technology</h6>
	{/if}
	<div class="flex flex-col md:flex-row gap-2 flex-wrap">
		{#each $selectedFuelTechs as fuelTech}
			<div
				class="bg-white border border-warm-grey text-xs leading-xs rounded-full flex justify-between items-center gap-3 pl-5 py-1 md:py-0"
			>
				<span class="whitespace-nowrap">{fuelTechLabel[fuelTech]}</span>
				<button
					class="bg-light-warm-grey hover:bg-warm-grey rounded-full p-2 text-mid-grey"
					onclick={() => ($selectedFuelTechs = $selectedFuelTechs.filter((d) => d !== fuelTech))}
				>
					<IconXMark class="size-6" />
				</button>
			</div>
		{/each}
	</div>
</div>

<div>
	{#if $selectedMetrics.length}
		<h6 class="md:mt-10">Metric</h6>
	{/if}
	<div class="flex flex-col md:flex-row gap-2 flex-wrap">
		{#each $selectedMetrics as metric}
			<div
				class="bg-white border border-warm-grey text-xs leading-xs rounded-full flex justify-between items-center gap-3 pl-5 py-1 md:py-0"
			>
				<span>{milestoneTypeLabel[metric]}</span>
				<button
					class="bg-light-warm-grey hover:bg-warm-grey rounded-full p-2 text-mid-grey"
					onclick={() => ($selectedMetrics = $selectedMetrics.filter((d) => d !== metric))}
				>
					<IconXMark class="size-6" />
				</button>
			</div>
		{/each}
	</div>
</div>

<div>
	{#if $selectedPeriods.length}
		<h6 class="md:mt-10">Period</h6>
	{/if}
	<div class="flex flex-col md:flex-row gap-2 flex-wrap">
		{#each $selectedPeriods as period}
			<div
				class="bg-white border border-warm-grey text-xs leading-xs rounded-full flex justify-between items-center gap-3 pl-5 py-1 md:py-0"
			>
				<span>{periodLabel[period]}</span>
				<button
					class="bg-light-warm-grey hover:bg-warm-grey rounded-full p-2 text-mid-grey"
					onclick={() => ($selectedPeriods = $selectedPeriods.filter((d) => d !== period))}
				>
					<IconXMark class="size-6" />
				</button>
			</div>
		{/each}
	</div>
</div>
