<script>
	import { getContext } from 'svelte';
	import IconXMark from '$lib/icons/XMark.svelte';
	import { fuelTechLabel } from './page-data-options/filters';

	// const { selectedRegions, selectedFuelTechs, selectedMetrics, selectedPeriods } =
	// 	getContext('records-filters');

	let {
		selectedRegions = [],
		selectedStatuses = [],
		selectedFuelTechs = [],
		onregionschange,
		onstatuseschange,
		onfueltechschange
	} = $props();

	/**
	 * @type {{ [key: string]: string }}
	 */
	const regionsLabels = {
		nem: 'NEM',
		nsw1: 'NSW',
		qld1: 'QLD',
		sa1: 'SA',
		tas1: 'TAS',
		vic1: 'VIC',
		wem: 'WA'
	};
</script>

{#if selectedRegions.length}
	<h4 class="hidden md:block">Filters</h4>
{/if}

<div>
	{#if selectedRegions.length}
		<h6 class="md:mt-10">Region</h6>
	{/if}
	<div class="flex flex-col md:flex-row gap-2 flex-wrap">
		{#each selectedRegions as region}
			<div
				class="bg-white border border-warm-grey text-xs leading-xs rounded-full flex justify-between items-center gap-3 pl-5 py-1 md:py-0"
			>
				<span class="whitespace-nowrap">{regionsLabels[region]}</span>
				<button
					class="bg-light-warm-grey hover:bg-warm-grey rounded-full p-2 text-mid-grey"
					onclick={() => onregionschange(selectedRegions.filter((d) => d !== region))}
				>
					<IconXMark class="size-6" />
				</button>
			</div>
		{/each}
	</div>
</div>

<div>
	{#if selectedStatuses.length}
		<h6 class="md:mt-10">Status</h6>
	{/if}
	<div class="flex flex-col md:flex-row gap-2 flex-wrap">
		{#each selectedStatuses as status}
			<div
				class="bg-white border border-warm-grey text-xs leading-xs rounded-full flex justify-between items-center gap-3 pl-5 py-1 md:py-0"
			>
				<span class="whitespace-nowrap">{status}</span>
				<button
					class="bg-light-warm-grey hover:bg-warm-grey rounded-full p-2 text-mid-grey"
					onclick={() => onstatuseschange(selectedStatuses.filter((d) => d !== status))}
				>
					<IconXMark class="size-6" />
				</button>
			</div>
		{/each}
	</div>
</div>

<div>
	{#if selectedFuelTechs.length}
		<h6 class="md:mt-10">Fuel Technology</h6>
	{/if}
	<div class="flex flex-col md:flex-row gap-2 flex-wrap">
		{#each selectedFuelTechs as fuelTech}
			<div
				class="bg-white border border-warm-grey text-xs leading-xs rounded-full flex justify-between items-center gap-3 pl-5 py-1 md:py-0"
			>
				<span class="whitespace-nowrap">{fuelTechLabel[fuelTech]}</span>
				<button
					class="bg-light-warm-grey hover:bg-warm-grey rounded-full p-2 text-mid-grey"
					onclick={() => onfueltechschange(selectedFuelTechs.filter((d) => d !== fuelTech))}
				>
					<IconXMark class="size-6" />
				</button>
			</div>
		{/each}
	</div>
</div>
