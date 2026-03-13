<script>
	import { transformPollutionData } from './transform-pollution.js';
	import CategoryBarCharts from './CategoryBarCharts.svelte';
	import PollutionHeatmap from './PollutionHeatmap.svelte';
	import PollutionSmallMultiples from './PollutionSmallMultiples.svelte';
	import PollutionDataTable from './PollutionDataTable.svelte';

	/** @type {{ pollutionData: any[] }} */
	let { pollutionData } = $props();

	let activeTab = $state('bars');

	let transformed = $derived.by(() => transformPollutionData(pollutionData));

	let hasPollutants = $derived(transformed.pollutants.length > 0);

	const tabs = [
		{ id: 'bars', label: 'Category Charts' },
		{ id: 'heatmap', label: 'Heatmap' },
		{ id: 'multiples', label: 'Small Multiples' },
		{ id: 'table', label: 'Data Table' }
	];
</script>

<div class="p-5 space-y-4">
	<div
		class="text-[10px] text-mid-grey uppercase tracking-widest mb-2 pb-1 border-b border-dark-grey"
	>
		NPI Pollution Data
	</div>

	{#if !hasPollutants}
		<p class="text-sm text-mid-grey">No pollution data available</p>
	{:else}
		<div class="flex gap-1 border-b border-warm-grey">
			{#each tabs as tab (tab.id)}
				<button
					type="button"
					class="px-3 py-1.5 text-[11px] font-medium uppercase tracking-wide cursor-pointer transition-colors rounded-t-lg
						{activeTab === tab.id
						? 'text-dark-grey bg-warm-grey/50'
						: 'text-mid-grey hover:text-dark-grey'}"
					onclick={() => (activeTab = tab.id)}
				>
					{tab.label}
				</button>
			{/each}
		</div>

		{#if activeTab === 'bars'}
			<CategoryBarCharts data={transformed} />
		{:else if activeTab === 'heatmap'}
			<PollutionHeatmap data={transformed} />
		{:else if activeTab === 'multiples'}
			<PollutionSmallMultiples data={transformed} />
		{:else if activeTab === 'table'}
			<PollutionDataTable data={transformed} />
		{/if}
	{/if}
</div>
