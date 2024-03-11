<script>
	import StatsDatasets from '$lib/utils/stats-data-helpers/StatsDatasets';
	import TimeSeriesDatasets from '$lib/utils/time-series-helpers/TimeSeriesDatasets';
	import parseInterval from '$lib/utils/intervals';

	import { fuelTechName, fuelTechColour } from '$lib/fuel_techs.js';

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
	const labelReducer = (
		/** @type {Object.<string, string>} */ acc,
		/** @type {StatsData} **/ d
	) => {
		acc[d.id] = d.fuel_tech ? fuelTechName(d.fuel_tech) : '';
		return acc;
	};
	const colourReducer = (
		/** @type {Object.<string, string>} */ acc,
		/** @type {StatsData} **/ d
	) => {
		acc[d.id] = d.fuel_tech ? fuelTechColour(d.fuel_tech) : '';
		return acc;
	};

	/** @type {FuelTechCode[]} */
	const loadFts = ['exports', 'battery_charging', 'pumps'];

	$: statsDatasets = new StatsDatasets(data, 'history')
		.group(fossilRenewablesGroupMap)
		.addTotalMinusLoads(loadFts, totalId);

	$: timeSeriesDatasets = new TimeSeriesDatasets(
		statsDatasets.data,
		parseInterval('1M'),
		'history',
		labelReducer,
		colourReducer
	)
		.transform()
		.calculate12MthRollingSum()
		.convertToPercentage(totalId);

	$: tsData = timeSeriesDatasets.data;
	$: seriesNames = timeSeriesDatasets.seriesNames.filter((name) => name !== totalId);
	$: seriesColours = timeSeriesDatasets.seriesColours2;
	$: seriesLabels = timeSeriesDatasets.seriesLabels2;

	$: console.log('statsDatasets', statsDatasets, timeSeriesDatasets, seriesLabels);
</script>

<Chart
	{title}
	{description}
	{tsData}
	{seriesNames}
	{seriesColours}
	{seriesLabels}
	historicalDataset={statsDatasets.data}
/>
