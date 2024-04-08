<script>
	import { format, isToday } from 'date-fns';
	import Map from '$lib/components/map/Map.svelte';
	import MapHeader from '$lib/components/homepage/MapHeader.svelte';

	export let data;
	export let title = '';
	export let flows;

	// Track map mode and data
	$: mapMode = 'live';
	$: mapData = data[mapMode];
	$: dispatchTime = Date.parse(flows.dispatchDateTimeString);
	$: dispatch = dispatchTime
		? `${isToday(dispatchTime) ? 'Today ' : ''}${format(dispatchTime, 'HH:mmaaa xxx')}`
		: '';

	console.log('flows', flows);

	/**
	 * @param {string} value
	 */
	function onMapModeChange(value) {
		mapMode = value;
	}
</script>

<MapHeader {mapMode} mapTitle={title} onChange={onMapModeChange} {dispatch} class="md:hidden" />

<Map
	mode={mapMode}
	data={mapData}
	flows={flows.regionFlows}
	class="w-full block h-auto pt-8 md:pt-0"
/>

<div class="bg-white rounded-lg md:p-16 text-center">
	<MapHeader
		{mapMode}
		mapTitle={title}
		onChange={onMapModeChange}
		{dispatch}
		class="hidden md:block"
	/>
	<section class="mt-12">
		<table class="text-left w-full">
			<thead>
				<tr class="border-b-[0.05rem] border-mid-grey border-solid align-bottom text-xxs">
					{#each mapData.columns as column}
						<td class="pb-3 text-left">
							{#if column.unit}
								<div class="text-mid-warm-grey">{column.unit}</div>
							{/if}
							{column.label}
						</td>
					{/each}
				</tr>
			</thead>
			<tbody>
				{#each mapData.rows as row}
					<tr class="border-b-[0.05rem] border-mid-warm-grey border-solid">
						{#each mapData.columns as column, cidx}
							<td class="py-3 text-sm text-left" class:font-medium={cidx > 0}>
								{row[column.id]}
							</td>
						{/each}
					</tr>
				{/each}
			</tbody>
		</table>
		{#if mapData.notes}
			<div class="text-mid-grey pt-8 px-8 text-xs">
				{#each mapData.notes as note}<div>{note}</div>{/each}
			</div>
		{/if}
	</section>
</div>
