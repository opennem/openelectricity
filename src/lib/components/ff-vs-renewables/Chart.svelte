<script>
	import { LayerCake, Svg, Html, flatten, groupLonger } from 'layercake';
	import { scaleOrdinal } from 'd3-scale';
	import { format as d3Format } from 'd3-format';
	import { formatInTimeZone } from 'date-fns-tz';

	import {
		fuelTechGroup,
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
	import HoverLine from '$lib/components/charts/HoverLine.html.svelte';
	import Annotations from './Annotations.svelte';

	export let data;
	export let title = '';
	export let description = '';

	const xKey = 'date';
	const formatTickX = (/** @type {Date} */ d) => formatInTimeZone(d, '+10:00', 'yyyy');
	const formatTickY = (/** @type {number} */ d) => `${d3Format('~s')(d)}%`;

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

	/** @type {TimeSeriesData | undefined} */
	export let hoverData = undefined;

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

	function isLoads(ft) {
		return ft === 'battery_charging' || ft === 'pumps';
	}

	$: {
		if (data && data.length) {
			console.log('cal total', data);
			totalSet.history.data = data[0].history.data.map(() => 0);
			data.forEach((set, i) => {
				if (i === 0) {
					console.log('first one', set.fuel_tech, isLoads(set.fuel_tech));
					totalSet.history.data = set.history.data.map(() => 0);
					totalSet.history.start = set.history.start;
					totalSet.history.last = set.history.last;
				}

				// NOTE: the sum to be used for % calculations do not include any loads - only generation
				set.history.data.forEach((d, i) => {
					if (isLoads(set.fuel_tech)) {
						// totalSet.history.data[i] -= d || 0;
					} else {
						totalSet.history.data[i] += d || 0;
					}
				});
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
				// obj[key] = d[key];
			});

			return obj;
		});

		console.log('rollingSumPercentage', rollingSumPercentage);

		// tsData = [...groupByYearDate.values()];
		tsData = rollingSumPercentage;
	}

	const displayXTicks = [2000, 2005, 2010, 2015, 2020, 2025, 2030].map(
		(year) => new Date(`${year}-01-01`)
	);

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
		padding={{ top: 20, right: 15, bottom: 40, left: 45 }}
		x={'date'}
		y={'value'}
		z={'group'}
		xDomain={[new Date(2000, 0, 1).getTime(), new Date(2030, 11, 31).getTime()]}
		yDomain={[0, null]}
		zDomain={seriesNames}
		zScale={scaleOrdinal()}
		zRange={seriesColours}
		data={groupedData}
		{flatData}
	>
		<Html>
			<div class="italic text-right text-xs text-dark-grey mr-8">
				NEM 12 Month Rolling Sum (Energy % of total)
			</div>
		</Html>

		<Svg>
			<AxisX formatTick={formatTickX} ticks={displayXTicks} tickMarks={true} gridlines={true} />
			<AxisY formatTick={formatTickY} ticks={5} />

			<MultiLine {hoverData} />
		</Svg>

		<Html>
			<HoverLine
				dataset={tsData}
				formatValue={formatTickX}
				on:mousemove={(e) => (hoverData = /** @type {TimeSeriesData} */ (e.detail))}
				on:mouseout={() => (hoverData = undefined)}
			/>

			<div class="w-6/12 mt-[150px] ml-6">
				<h2 class="md:text-9xl md:leading-9xl">{title}</h2>
				<p>{@html description}</p>
			</div>

			<Annotations annotation={hoverData || latestDatapoint} dataset={historicalDataset} />
		</Html>
	</LayerCake>
</div>

<style>
	.chart-container {
		width: 100%;
		height: 650px;
	}
</style>
