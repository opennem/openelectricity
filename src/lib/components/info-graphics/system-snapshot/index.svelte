<script>
	import { format, isToday } from 'date-fns';
	import { scaleLinear } from 'd3-scale';

	import Map from '$lib/components/map/Map.svelte';
	import MapHeader from '$lib/components/homepage/MapHeader.svelte';

	import ColourLegend from './ColourLegend.svelte';
	import {
		intensityColour,
		regionGenerationTotal,
		regionRenewablesTotal,
		regionEmissionsTotal
	} from './helpers.js';

	export let data;
	export let title = '';
	export let flows;
	export let prices;
	export let regionPower;
	export let regionEnergy;
	export let regionEmissions;

	const rows = {
		live: [
			{ id: 'NSW', label: 'NSW' },
			{ id: 'QLD', label: 'QLD' },
			{ id: 'SA', label: 'SA' },
			{ id: 'TAS', label: 'TAS' },
			{ id: 'VIC', label: 'VIC' }
		],
		annual: [
			{ id: 'NSW', label: 'NSW' },
			{ id: 'QLD', label: 'QLD' },
			{ id: 'SA', label: 'SA' },
			{ id: 'TAS', label: 'TAS' },
			{ id: 'VIC', label: 'VIC' },
			{ id: 'WA', label: 'WA' }
		]
	};

	const columns = {
		live: [
			{ id: 'state', label: '', unit: '' },
			{ id: 'price', label: 'Price', unit: '$/MWh' },
			{ id: 'generation', label: 'Net Generation', unit: 'MW' },
			{ id: 'renewable', label: 'Renewables', unit: '%' }
		],
		annual: [
			{ id: 'state', label: '', unit: '' },
			{ id: 'intensity', label: 'Carbon Intensity', unit: 'kgCO₂e/MWh' },
			{ id: 'intensity-bar', label: '', unit: '' },
			{ id: 'generation', label: 'Net Generation', unit: 'GWh' },
			{ id: 'renewable', label: 'Renewables', unit: '%' }
		]
	};

	$: generationTotal = regionGenerationTotal(
		liveMode ? rows.live.map((d) => d.id) : rows.annual.map((d) => d.id),
		liveMode ? regionPower : regionEnergy
	);
	$: renewablesTotal = regionRenewablesTotal(
		liveMode ? rows.live.map((d) => d.id) : rows.annual.map((d) => d.id),
		liveMode ? regionPower : regionEnergy
	);
	$: emissionsTotal = regionEmissionsTotal(
		!liveMode ? rows.annual.map((d) => d.id) : [],
		!liveMode ? regionEmissions : []
	);

	let intensity = {};
	const intensityScale = scaleLinear().domain([0, 900]).range([0, 70]);

	$: {
		updateIntensity(emissionsTotal, generationTotal);
	}

	function updateIntensity(emissionsTotal, generationTotal) {
		rows.annual.forEach((row) => {
			intensity[row.id] = emissionsTotal[row.id] / generationTotal[row.id];
		});
	}

	$: console.log('prices/intensity', prices.regionPrices, intensity);

	$: console.log('emissionsTotal', emissionsTotal);

	// Track map mode and data
	let mapMode = 'annual'; // annual
	$: mapData = data[mapMode];
	$: liveMode = mapMode === 'live';
	$: dispatchTime = Date.parse(flows.dispatchDateTimeString);
	$: dispatch =
		mapMode === 'live'
			? dispatchTime
				? `${isToday(dispatchTime) ? 'Today ' : ''}${format(dispatchTime, 'HH:mmaaa xxx')}`
				: ''
			: 'Avg. past 12 months';

	$: mapModeRows = rows[mapMode];

	/**
	 * @param {string} value
	 */
	function onMapModeChange(value) {
		mapMode = value;
	}

	const auDollar = new Intl.NumberFormat('en-AU', {
		style: 'currency',
		currency: 'AUD'
	});

	const auNumber = new Intl.NumberFormat('en-AU', {
		// minimumFractionDigits: 2,
		maximumFractionDigits: 0
	});

	$: getPrice = (state) => {
		return auDollar.format(prices.regionPrices[`${state}1`]);
	};

	function getRenewablePercent(state) {
		return Math.round((renewablesTotal[state] / generationTotal[state]) * 100);
	}

	// function getCarbonIntensity(state) {
	// 	return Math.round(emissionsTotal[state] / generationTotal[state]);
	// }
</script>

<MapHeader {mapMode} mapTitle={title} onChange={onMapModeChange} {dispatch} class="md:hidden" />

<div class="relative">
	<Map
		mode={mapMode}
		data={mapData}
		flows={flows.regionFlows}
		prices={prices.regionPrices}
		{intensity}
		class="w-full block h-auto pt-8 md:pt-0"
	/>
	<div
		class="absolute bottom-0 md:bottom-6 left-6 md:left-12 md:w-[300px]"
		class:w-[230px]={mapMode === 'live'}
		class:w-[150px]={mapMode === 'annual'}
	>
		<ColourLegend mode={mapMode} />
	</div>
</div>

<div>
	<div class="bg-white rounded-lg md:p-16 text-center md:w-[500px]">
		<MapHeader
			{mapMode}
			mapTitle={title}
			onChange={onMapModeChange}
			{dispatch}
			class="hidden md:block"
		/>
		<section class="mt-24 md:mt-12">
			<table class="text-left w-full">
				<thead>
					<tr
						class="border-b-[0.05rem] border-mid-grey text-mid-grey border-solid align-bottom text-xs"
					>
						{#each columns[mapMode] as column, i}
							{#if !(mapMode === 'annual' && i === 2)}
								<td
									class="pb-3"
									class:text-right={mapMode === 'live' || i > 1}
									colspan={column.label === 'Carbon Intensity' ? 2 : 1}
								>
									{#if column.unit}
										<div class="text-mid-warm-grey">
											{column.unit}
										</div>
									{/if}
									{column.label}
								</td>
							{/if}
						{/each}
					</tr>
				</thead>
				<tbody>
					{#each mapModeRows as row, i (row.id)}
						<tr class="border-b-[0.05rem] border-mid-warm-grey border-solid">
							<td class="py-3 text-xs text-dark-grey font-light text-left md:w-[100px]">
								{row.label}
							</td>
							{#if mapMode === 'live'}
								<td class="py-3 text-sm text-right">
									{getPrice(row.id)}
								</td>
								<td class="py-3 text-sm text-right">
									{auNumber.format(generationTotal[row.id])}
								</td>
								<td class="py-3 text-sm text-right">
									{getRenewablePercent(row.id)}%
								</td>
							{/if}

							{#if mapMode === 'annual'}
								<td class="py-3 text-sm text-right">
									{auNumber.format(intensity[row.id])}
								</td>

								<td class="py-3 pl-6">
									<div
										class="h-4 border border-black"
										style:background-color={intensityColour(intensity[row.id])}
										style:width={`${intensityScale(intensity[row.id])}px`}
									/>
								</td>

								<td class="py-3 text-sm text-right">
									{auNumber.format(generationTotal[row.id])}
								</td>

								<td class="py-3 text-sm text-right">
									{getRenewablePercent(row.id)}%
								</td>
							{/if}
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
</div>
