<script>
	import { run } from 'svelte/legacy';

	import { format, isToday } from 'date-fns';
	import { scaleLinear } from 'd3-scale';

	import Map from '$lib/components/info-graphics/system-snapshot/map/Map.svelte';
	import MapHeader from '$lib/components/homepage/MapHeader.svelte';

	import ColourLegend from './ColourLegend.svelte';
	import CrossBorderExport from './CrossBorderExport.svelte';
	import { regionGenerationTotal, regionRenewablesTotal, regionEmissionsTotal } from './helpers.js';

	import { carbonIntensityColour } from '$lib/stores/theme';

	/**
	 * @typedef {Object} Props
	 * @property {string} [title] - export let data;
	 * @property {any} flows
	 * @property {any} prices
	 * @property {any} regionPower
	 * @property {any} regionEnergy
	 * @property {any} regionEmissions
	 */

	/** @type {Props} */
	let { title = '', flows, prices, regionPower, regionEnergy, regionEmissions } = $props();

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

	let intensity = $state({});
	const intensityScale = scaleLinear().domain([0, 900]).range([0, 100]);

	function updateIntensity(emissionsTotal, generationTotal) {
		rows.annual.forEach((row) => {
			intensity[row.id] = emissionsTotal[row.id] / generationTotal[row.id];
		});
	}

	// Track map mode and data
	let mapMode = $state('annual'); // annual

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

	function getRenewablePercent(state) {
		return Math.round((renewablesTotal[state] / generationTotal[state]) * 100);
	}

	let hoverRegion = $state();

	// function getCarbonIntensity(state) {
	// 	return Math.round(emissionsTotal[state] / generationTotal[state]);
	// }
	// $: mapData = data[mapMode];
	let liveMode = $derived(mapMode === 'live');
	let generationTotal = $derived(
		regionGenerationTotal(
			liveMode ? rows.live.map((d) => d.id) : rows.annual.map((d) => d.id),
			liveMode ? regionPower : regionEnergy
		)
	);
	let renewablesTotal = $derived(
		regionRenewablesTotal(
			liveMode ? rows.live.map((d) => d.id) : rows.annual.map((d) => d.id),
			liveMode ? regionPower : regionEnergy
		)
	);
	let emissionsTotal = $derived(
		regionEmissionsTotal(
			!liveMode ? rows.annual.map((d) => d.id) : [],
			!liveMode ? regionEmissions : []
		)
	);
	run(() => {
		updateIntensity(emissionsTotal, generationTotal);
	});
	let dispatchTime = $derived(Date.parse(flows.dispatchDateTimeString));
	let dispatch = $derived(
		mapMode === 'live'
			? dispatchTime
				? `${isToday(dispatchTime) ? 'Today ' : ''}${format(dispatchTime, 'HH:mmaaa xxx')}`
				: ''
			: 'Avg. past 12 months'
	);
	let mapModeRows = $derived(rows[mapMode]);
	let getPrice = $derived((state) => {
		return prices.regionPrices[`${state}1`]
			? auDollar.format(prices.regionPrices[`${state}1`])
			: '—';
	});
</script>

<MapHeader {mapMode} mapTitle={title} onChange={onMapModeChange} {dispatch} class="md:hidden" />

<div class="relative">
	<Map
		mode={mapMode}
		flows={flows.regionFlows}
		prices={prices.regionPrices}
		{intensity}
		highlight={hoverRegion}
		class="w-full block h-auto pt-8 md:pt-0"
		on:hover={(evt) => (hoverRegion = evt.detail?.region)}
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
	<div class="bg-white rounded-lg md:p-16 text-center md:w-[500px] md:h-[500px]">
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
					<tr class="border-b border-mid-warm-grey text-mid-grey align-bottom text-xs">
						{#each columns[mapMode] as column, i (i)}
							{#if !(mapMode === 'annual' && i === 2)}
								<td
									class="pb-3"
									colspan={column.label === 'Carbon Intensity' ? 2 : 1}
									class:text-left={mapMode === 'annual' && i === 1}
									class:pl-10={mapMode === 'annual' && i === 1}
									class:md:pl-2={mapMode === 'annual' && i === 1}
									class:text-right={!(mapMode === 'annual' && i === 1)}
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
					{#each mapModeRows as row (row.id)}
						<tr
							class="border-b border-warm-grey cursor-pointer"
							class:bg-light-warm-grey={hoverRegion === row.id}
							onmouseenter={() => (hoverRegion = row.id)}
							onmouseleave={() => (hoverRegion = undefined)}
						>
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
								<td class="py-3 text-sm text-right pl-6 md:pl-0">
									{auNumber.format(intensity[row.id])}
								</td>

								<td class="py-3 pl-3 md:pl-6">
									<div
										class="h-4 border border-black"
										style:background-color={$carbonIntensityColour(intensity[row.id])}
										style:width={`${intensityScale(intensity[row.id])}px`}
									></div>
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
			<!-- {#if mapData.notes}
				<div class="text-mid-grey pt-8 px-8 text-xs">
					{#each mapData.notes as note}<div>{note}</div>{/each}
				</div>
			{/if} -->

			{#if mapMode === 'live'}
				<div class="md:hidden">
					<h5 class="text-left mt-8">Cross Border Export</h5>
					<div class="grid grid-cols-2 gap-4">
						{#each Object.entries(flows.regionFlows) as [regionFlow, value] (regionFlow)}
							<CrossBorderExport regions={regionFlow} {value} />
						{/each}
					</div>
				</div>
			{/if}
		</section>
	</div>
</div>
