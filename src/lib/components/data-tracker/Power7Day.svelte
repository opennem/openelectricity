<script>
	import { rollup } from 'd3-array';
	import { fuelTechName, fuelTechColour, fuelTechOrder } from '$lib/fuel_techs.js';
	import transform from '$lib/utils/time-series-helpers/transform-stats-to-ts';
	import withMinMax from '$lib/utils/time-series-helpers/with-min-max';
	import { key } from '$lib/utils/time-series-helpers/rollup/key';
	import parseInterval from '$lib/utils/intervals';
	import meanReducer from '$lib/utils/time-series-helpers/reducer/mean';
	import StatsDatasets from '$lib/utils/stats-data-helpers/StatsDatasets';

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
	const targetIntervalObj = parseInterval('30m');

	$: statsDatasets = new StatsDatasets(data, 'history')
		.mergeAndInterpolate()
		.reorder(fuelTechOrder)
		.invertLoadValues(loadFts)
		.group(historicalEnergyGroupMap).data;

	$: transformed = transform(statsDatasets, '5m', 'history');
	$: seriesColours = statsDatasets.map((d) => fuelTechColour(d.fuel_tech));
	$: seriesLabels = statsDatasets.map((d) => fuelTechName(d.fuel_tech));
	$: seriesNames =
		transformed && transformed.length
			? Object.keys(transformed[0]).filter((d) => d !== xKey && d !== 'time')
			: [];

	$: rolledUpData = rollup(
		transformed.map((d) => {
			return {
				...d,
				key: key(d.time, targetIntervalObj.milliseconds)
			};
		}),
		(/** @type {TimeSeriesData[]} */ values) => meanReducer(values, seriesNames),
		(/** @type {TimeSeriesData} */ d) => d.key
	);

	$: dataset = withMinMax([...rolledUpData.values()], seriesNames, loadFts);
</script>

{#if dataset.length === 0}
	<p class="mt-6">No data</p>
{:else}
	<Chart {dataset} {xKey} yKey={[0, 1]} zKey="key" {seriesNames} {seriesColours} {seriesLabels} />
{/if}
