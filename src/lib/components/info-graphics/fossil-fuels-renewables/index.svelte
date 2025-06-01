<script>
	import { addMonths, isAfter, subMonths } from 'date-fns';
	import { colourReducer } from '$lib/stores/theme';

	import Statistic from '$lib/utils/Statistic';
	import TimeSeries from '$lib/utils/TimeSeries';
	import parseInterval from '$lib/utils/intervals';

	import {
		domainGroups,
		loadFts,
		totalId,
		labelReducer,
		xDomain,
		displayXTicks,
		formatTickX2,
		formatTickX
	} from './helpers';

	// import Chart from './Chart.svelte';
	import Chart2 from './Chart2.svelte';

	/**
	 * @typedef {Object} Props
	 * @property {StatsData[]} allNemEnergyData
	 * @property {StatsData[]} dailyNemEnergyData
	 * @property {string} [title]
	 * @property {string} [description]
	 */

	/** @type {Props} */
	let { allNemEnergyData, dailyNemEnergyData, title = '', description = '' } = $props();

	let view = $state('daily');
	let isDailyView = $derived(view === 'daily');

	let statsDatasets = $derived(
		new Statistic(allNemEnergyData, 'history')
			.group(domainGroups)
			.addTotalMinusLoads(loadFts, totalId)
	);

	let timeSeriesDatasets = $derived(
		new TimeSeries(statsDatasets.data, parseInterval('1M'), 'history', labelReducer, $colourReducer)
			.transform()
			.calculate12MthRollingSum()
			.convertToPercentage(totalId)
	);

	/** @type {Statistic | undefined} */
	let dailyStatsDatasets = $derived(
		new Statistic(dailyNemEnergyData, 'history')
			.group(domainGroups)
			.addTotalMinusLoads(loadFts, totalId)
	);
	/** @type {TimeSeries | undefined} */
	let dailyTimeSeriesDatasetsPercentage = $derived(
		new TimeSeries(
			dailyStatsDatasets.data,
			parseInterval('1d'),
			'history',
			labelReducer,
			$colourReducer
		)
			.transform()
			.rollup(parseInterval('1M'))
			.convertToPercentage(totalId)
	);

	let dataset = $derived(timeSeriesDatasets.data);
	let seriesNames = $derived(timeSeriesDatasets.seriesNames.filter((name) => name !== totalId));
	let seriesColours = $derived(timeSeriesDatasets.seriesColours);
	let seriesLabels = $derived(timeSeriesDatasets.seriesLabels);

	let yearDataset = $derived(dailyTimeSeriesDatasetsPercentage.data.slice(-13));
	let yearDisplayXTicks = $derived([yearDataset[0].time, yearDataset[yearDataset.length - 1].time]);
	let yearXDomain = $derived([yearDataset[0].time, yearDataset[yearDataset.length - 1].time]);

	let averageFossilAndRenewables = $derived(getAverageFossilAndRenewables(dailyStatsDatasets.data));

	/**
	 * @param {StatsData[]} data
	 */
	function getAverageFossilAndRenewables(data) {
		let totalAu = 0;
		let totalFossil = 0;
		let totalRenewables = 0;
		let dailyTimeSeriesDatasetsAbsolute = new TimeSeries(
			data,
			parseInterval('1d'),
			'history',
			labelReducer,
			$colourReducer
		).transform();

		let timeSeriesData = dailyTimeSeriesDatasetsAbsolute.data;
		let twelveMonthsAgo = subMonths(timeSeriesData[timeSeriesData.length - 1].date, 12);
		let filteredDataset = timeSeriesData.filter((d) => isAfter(d.date, twelveMonthsAgo));

		// calculate average
		filteredDataset.forEach((d) => {
			dailyTimeSeriesDatasetsAbsolute.seriesNames.forEach((name) => {
				const value = Number(d[name]) || 0;
				if (name === 'fossil_fuels.energy.grouped') {
					totalFossil += value;
				} else if (name === 'renewables.energy.grouped') {
					totalRenewables += value;
				} else if (name === 'au-total') {
					totalAu += value;
				}
			});
		});

		return {
			'fossil_fuels.energy.grouped': (totalFossil / totalAu) * 100,
			'renewables.energy.grouped': (totalRenewables / totalAu) * 100
		};
	}
</script>

<Chart2
	{title}
	{description}
	{seriesNames}
	{seriesColours}
	{seriesLabels}
	xDomain={isDailyView ? yearXDomain : xDomain}
	dataset={isDailyView ? yearDataset : dataset}
	displayXTicks={isDailyView ? yearDisplayXTicks : displayXTicks}
	formatTickX={isDailyView ? formatTickX2 : formatTickX}
	historicalDataset={statsDatasets.data}
	{view}
	{averageFossilAndRenewables}
	onviewchange={(value) => (view = value)}
/>
