<script>
	import StatsDatasets from '$lib/utils/stats-data-helpers/StatsDatasets';
	import TimeSeriesDatasets from '$lib/utils/time-series-helpers/TimeSeriesDatasets';
	import parseInterval from '$lib/utils/intervals';

	import Chart from './Chart.svelte';

	/** @type {StatsData[]} */
	export let data;
	export let title = '';
	export let description = '';

	/** @type {Object.<FuelTechCode, FuelTechCode[]>}} */
	const fossilRenewablesGroupMap = {
		fossil_fuels: [
			'coal_black',
			'coal_brown',
			'gas_ccgt',
			'gas_ocgt',
			'gas_recip',
			'gas_steam',
			'gas_wcmg',
			'distillate'
		],
		renewables: [
			'solar_utility',
			'solar_rooftop',
			'wind',
			'hydro',
			'bioenergy_biogas',
			'bioenergy_biomass'
		]
	};

	const totalId = 'au-total';

	/** @type {FuelTechCode[]} */
	const loadFts = ['exports', 'battery_charging', 'pumps'];

	$: statsDatasets = new StatsDatasets(data, 'history')
		.group(fossilRenewablesGroupMap)
		.addTotalMinusLoads(loadFts, totalId);

	$: timeSeriesDatasets = new TimeSeriesDatasets(statsDatasets.data, parseInterval('1M'), 'history')
		.transform()
		.calculate12MthRollingSum()
		.convertToPercentage(totalId);

	$: tsData = timeSeriesDatasets.data;
	$: seriesNames = timeSeriesDatasets.seriesNames.filter((name) => name !== totalId);
	$: seriesColours = timeSeriesDatasets.seriesColours;
	$: seriesLabels = timeSeriesDatasets.seriesLabels;
	$: seriesLabels2 = timeSeriesDatasets.seriesLabels2;

	$: console.log('statsDatasets', statsDatasets, timeSeriesDatasets, seriesLabels2);
</script>

<Chart
	{title}
	{description}
	{tsData}
	{seriesNames}
	{seriesColours}
	seriesLabels={seriesLabels2}
	historicalDataset={statsDatasets.data}
/>
