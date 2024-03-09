<script>
	import { fuelTechOrder } from '$lib/fuel_techs.js';
	import parseInterval from '$lib/utils/intervals';

	import StatsDatasets from '$lib/utils/stats-data-helpers/StatsDatasets';
	import TimeSeriesDatasets from '$lib/utils/time-series-helpers/TimeSeriesDatasets';
	import Chart from './Chart.svelte';

	/** @type {Object.<FuelTechCode, FuelTechCode[]>}} */
	const historicalEnergyGroupMap = {
		battery_charging: ['battery_charging'],
		pumps: ['pumps'],
		exports: ['exports'],
		imports: ['imports'],
		coal: ['coal_black', 'coal_brown'],
		gas: ['gas_ccgt', 'gas_ocgt', 'gas_recip', 'gas_steam', 'gas_wcmg'],
		battery_discharging: ['battery_discharging'],
		hydro: ['hydro'],
		wind: ['wind'],
		solar: ['solar_utility', 'solar_rooftop']
	};

	/** @type {FuelTechCode[]} */
	const loadFts = ['exports', 'battery_charging', 'pumps'];

	/** @type {StatsData[]} */
	export let data;

	const xKey = 'date';

	$: statsDatasets = new StatsDatasets(data, 'history')
		.mergeAndInterpolate()
		.reorder(fuelTechOrder)
		.invertLoadValues(loadFts)
		.group(historicalEnergyGroupMap).data;

	$: timeSeriesDatasets = new TimeSeriesDatasets(statsDatasets, parseInterval('5m'), 'history')
		.transform()
		.rollup(parseInterval('5m'))
		.updateMinMax(loadFts);

	$: dataset = timeSeriesDatasets.data;
</script>

{#if dataset.length === 0}
	<p class="mt-6">No data</p>
{:else}
	<Chart
		{dataset}
		{xKey}
		yKey={[0, 1]}
		zKey="key"
		seriesNames={timeSeriesDatasets.seriesNames}
		seriesColours={timeSeriesDatasets.seriesColours}
		seriesLabels={timeSeriesDatasets.seriesLabels}
	/>
{/if}
