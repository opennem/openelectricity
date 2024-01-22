<script>
	import { LayerCake, Svg, Html, flatten, groupLonger } from 'layercake';
	import { rollup, sum } from 'd3-array';
	import { scaleOrdinal } from 'd3-scale';
	import { format as d3Format } from 'd3-format';
	import { formatInTimeZone } from 'date-fns-tz';

	import {
		fuelTechGroup,
		fuelTechGroups,
		fuelTechNames,
		fuelTechColour,
		fuelTechNameMap,
		fossilRenewablesGroups,
		fossilRenewablesGroupMap
	} from '$lib/fuel_techs.js';
	import deepCopy from '$lib/utils/deep-copy';
	import { transform as transformEnergy } from '$lib/utils/time-series-helpers/transform/energy';
	import transformRollingSum12Mth from '$lib/utils/rolling-sum-12-mth';

	import MultiLine from '$lib/components/charts/MultiLine.svelte';
	import AxisX from '$lib/components/charts/AxisX.svelte';
	import AxisY from '$lib/components/charts/AxisY.svelte';
	import ChartAnnotations from './ChartAnnotations.svelte';

	export let data;
	export let title = '';
	export let description = '';

	const xKey = 'date';
	const formatTickX = (/** @type {Date} */ d) => formatInTimeZone(d, '+10:00', 'yyyy');
	const formatTickY = (/** @type {number} */ d) => d3Format('~s')(d);

	/** @type {StatsData[]} */
	let historicalDataset = [];

	/** @type {TimeSeriesData[] | []} */
	let tsData = [];

	/** @type {string[]} */
	let seriesNames = [];

	/** @type {string[]} */
	let seriesColours = [];

	/** @type {*} */
	let nameMap = {};

	let totalSet = {
		data_type: 'energy',
		id: 'au.total.historical',
		network: 'nem',
		type: 'energy',
		units: 'GWh',
		history: {
			data: [],
			interval: '1M',
			units: 'GWh',
			start: '',
			last: ''
		}
	};

	$: {
		if (data && data.length) {
			console.log('data', data);
			data.forEach((set, i) => {
				if (i === 0) {
					totalSet.history.data = set.history.data.map((d) => d || 0);
					totalSet.history.start = set.history.start;
					totalSet.history.last = set.history.last;
				} else {
					set.history.data.forEach((d, i) => {
						if (set.fuel_tech === 'battery_charging' || set.fuel_tech === 'pumps') {
							totalSet.history.data[i] -= d || 0;
						} else {
							totalSet.history.data[i] += d || 0;
						}
					});
				}
			});

			console.log('totalSet', totalSet);
		}
	}

	$: {
		let ordered = [];

		fuelTechNames.forEach((/** @type {*} */ code) => {
			const filtered = data.filter((d) => d.fuel_tech === code);
			if (filtered.length > 0) {
				const copy = deepCopy(filtered[0]);
				copy.colour = fuelTechColour(code);
				ordered.push(copy);
			}
		});
		let groupedDatasets = groupedStatsData(fossilRenewablesGroups, ordered);
		console.log('grouped', groupedDatasets);
		historicalDataset = groupedDatasets;

		let transformed = transformEnergy([...groupedDatasets, totalSet], 'history', '1M');

		seriesColours = fossilRenewablesGroups.map((d) => fuelTechColour(d));
		seriesNames =
			transformed && transformed.length
				? Object.keys(transformed[0]).filter(
						(d) => d !== xKey && d !== 'time' && d !== 'au.total.historical'
				  )
				: [];

		const rollingSumSeriesNames =
			transformed && transformed.length
				? Object.keys(transformed[0]).filter((d) => d !== xKey && d !== 'time')
				: [];

		// const groupByYearDate = rollup(
		// 	transformed,
		// 	(v) => {
		// 		const obj = {
		// 			date: v[0].date,
		// 			time: v[0].time
		// 		};

		// 		v.forEach((d) => {
		// 			seriesNames.forEach((key) => {
		// 				if (obj[key] === undefined) {
		// 					obj[key] = 0;
		// 				}
		// 				obj[key] += d[key];
		// 			});
		// 		});

		// 		return obj;
		// 	},
		// 	(d) => d.date.getFullYear()
		// );

		const rollingSum = transformRollingSum12Mth(transformed, rollingSumSeriesNames);
		// const rollingSumTotal = transformRollingSum12Mth(transformedTotal, ['au.total.historical']);
		console.log('rollingSum', seriesNames, transformed, rollingSum);

		const rollingSumPercentage = rollingSum.map((d) => {
			const obj = {
				date: d.date,
				time: d.time
			};

			seriesNames.forEach((key) => {
				obj[key] = (d[key] / d['au.total.historical']) * 100;
			});

			return obj;
		});

		console.log('rollingSumPercentage', rollingSumPercentage);

		// tsData = [...groupByYearDate.values()];
		tsData = rollingSumPercentage;
	}

	const displayXTickYears = [2000, 2005, 2010, 2015, 2020, 2025, 2030];
	const displayXTicks = displayXTickYears.map((year) => new Date(`${year}-01-01`));

	$: groupedData = groupLonger(tsData, seriesNames);
	$: flatData = flatten(groupedData, 'values');
	$: console.log('ffvsrenew', groupedData, seriesNames, seriesColours);

	$: latestDatapoint = tsData[tsData.length - 1];
	$: console.log('latestDatapoint', latestDatapoint);

	/**
	 * @param {FuelTechCode[]} groups
	 * @param {StatsData[]} originalData
	 * @returns {StatsData[]}
	 */
	export function groupedStatsData(groups, originalData) {
		/** @type {StatsData[]} */
		let grouped = [];

		console.log('originalData', originalData);

		groups.forEach((code) => {
			const codes = fuelTechGroup(fossilRenewablesGroupMap, code);
			const filtered = originalData.filter((d) => codes.includes(d.fuel_tech));

			if (filtered.length > 0) {
				const history = filtered[0].history;
				const groupObject = {
					...filtered[0],
					code,
					fuel_tech: code,
					label: fuelTechNameMap[code],
					id: `au.${code}.historical`,
					history: { ...history }
				};

				// set the group projection.data array to all zeros
				groupObject.history.data = groupObject.history.data.map(() => 0);

				// sum each filtered projection.data array into group projection data
				filtered.forEach((d) => {
					d.history.data.forEach((d, i) => {
						groupObject.history.data[i] += d;
					});
				});

				grouped.push(groupObject);
			}
		});

		return grouped;
	}
</script>

<div class="chart-container">
	<LayerCake
		padding={{ top: 50, right: 0, bottom: 50, left: 50 }}
		x={'date'}
		xDomain={[new Date(2000, 0, 1).getTime(), new Date(2030, 11, 31).getTime()]}
		y={'value'}
		yDomain={[0, null]}
		z={'group'}
		zScale={scaleOrdinal()}
		zDomain={seriesNames}
		zRange={seriesColours}
		{flatData}
		data={groupedData}
	>
		<Svg>
			<AxisX formatTick={formatTickX} ticks={displayXTicks} tickMarks={true} gridlines={true} />
			<AxisY formatTick={formatTickY} ticks={5} />

			<MultiLine />
		</Svg>

		<Html>
			<div class="w-6/12 mt-[150px]">
				<h2 class="md:text-9xl md:leading-9xl">{title}</h2>
				<p>{@html description}</p>
			</div>

			<ChartAnnotations annotation={latestDatapoint} dataset={historicalDataset} />
		</Html>
	</LayerCake>
</div>

<style>
	.chart-container {
		width: 100%;
		height: 650px;
	}
</style>
