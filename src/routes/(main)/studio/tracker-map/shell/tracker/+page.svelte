<script>
	import { page } from '$app/state';
	import MapLayerPortal from '../_lib/MapLayerPortal.svelte';
	import TrackerScene, { MOCK_REGIONS } from '../_lib/scenes/TrackerScene.svelte';

	let scenesMounted = $derived(page.url.searchParams.get('scenes') === 'mounted');

	// Mock dashboard numbers — static, purely to fill the panel.
	const stats = [
		{ label: 'Operational demand', value: '22,431 MW' },
		{ label: 'Renewables share', value: '41.2%' },
		{ label: 'Volume-weighted price', value: '$86/MWh' }
	];
</script>

{#if !scenesMounted}
	<!-- Portal mode: contribute tracker layers to the layout's map.
	     In mounted mode the layout already hosts the scene, so skip. -->
	<MapLayerPortal id="tracker">
		{#snippet layers()}
			<TrackerScene active={true} />
		{/snippet}
	</MapLayerPortal>
{/if}

<div class="flex flex-col gap-6 p-6">
	<div>
		<h1 class="text-lg font-semibold">Tracker</h1>
		<p class="mt-1 text-xs text-mid-grey">Mock dashboard panel (shell spike)</p>
	</div>

	<dl class="grid grid-cols-1 gap-3">
		{#each stats as stat (stat.label)}
			<div class="rounded-lg border border-warm-grey p-3">
				<dt class="text-xs text-mid-grey">{stat.label}</dt>
				<dd class="mt-1 text-xl font-semibold">{stat.value}</dd>
			</div>
		{/each}
	</dl>

	<div class="flex flex-col gap-3">
		{#each ['Generation', 'Price', 'Emissions'] as chart (chart)}
			<div
				class="flex h-28 items-center justify-center rounded-lg bg-light-warm-grey text-xs text-mid-grey"
			>
				{chart} chart placeholder
			</div>
		{/each}
	</div>

	<div class="rounded-lg border border-warm-grey bg-light-warm-grey p-4 text-xs leading-relaxed">
		<p class="font-semibold">Regions on the map:</p>
		<ul class="mt-2 list-disc pl-4">
			{#each MOCK_REGIONS as region (region.id)}
				<li>{region.name}</li>
			{/each}
		</ul>
	</div>
</div>
