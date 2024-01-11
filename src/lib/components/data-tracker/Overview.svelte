<script>
	import { fuelTechNames, fuelTechName, fuelTechColour, fuelTechGroups } from '$lib/fuel_techs.js';
	import { transformToTimeSeriesDataset } from '$lib/utils/time-series-helpers/data-tracker-helpers.js';
	import deepCopy from '$lib/utils/deep-copy';

	import OverviewChart from './OverviewChart.svelte';

	export let data;

	$: dataset = data;

	const xKey = 'date';

	/** @type {FuelTechCode[]} */
	let loadFts = ['exports', 'battery_charging', 'pumps'];

	/** @type {*[]} */
	let orderedAndLoadsInverted = [];

	$: {
		orderedAndLoadsInverted = [];
		fuelTechNames.forEach((/** @type {*} */ code) => {
			const filtered = dataset.filter((d) => d.fuel_tech === code);
			if (filtered.length > 0) {
				const copy = deepCopy(filtered[0]);
				copy.colour = fuelTechColour(code);
				orderedAndLoadsInverted.push(copy);
			}
		});

		orderedAndLoadsInverted.forEach((d) => {
			const code = d.fuel_tech;
			// invert load fuel techs so it displays below the zero x axis in the stacked area chart
			if (loadFts.includes(code)) {
				d.history.data.forEach((value, i) => {
					d.history.data[i] = value * -1;
				});
			}
		});
	}

	$: tsData = transformToTimeSeriesDataset(orderedAndLoadsInverted);
	$: seriesColours = orderedAndLoadsInverted.map((d) => fuelTechColour(d.fuel_tech));
	$: seriesNames =
		tsData && tsData.length ? Object.keys(tsData[0]).filter((d) => d !== xKey && d !== 'time') : [];

	$: fuelTechLabelDict = orderedAndLoadsInverted.reduce(
		(/** @type {Object.<string, string>} */ acc, curr) => {
			acc[curr.id] = fuelTechName(curr.fuel_tech);
			return acc;
		},
		{}
	);
	$: fuelTechColourDict = orderedAndLoadsInverted.reduce(
		(/** @type {Object.<string, string>} */ acc, curr) => {
			acc[curr.id] = fuelTechColour(curr.fuel_tech);
			return acc;
		},
		{}
	);
	$: console.log('updated', orderedAndLoadsInverted, tsData);
	$: console.log('seriesNames', seriesNames, fuelTechLabelDict);
	$: console.log('seriesColours', seriesColours, fuelTechColourDict);

	let hoverData = undefined;
</script>

{#if tsData.length === 0}
	<p class="mt-6">No data</p>
{:else}
	<OverviewChart
		dataset={tsData}
		{xKey}
		yKey={[0, 1]}
		zKey="key"
		{seriesNames}
		{seriesColours}
		on:mousemove={(e) => (hoverData = /** @type {TimeSeriesData} */ (e.detail))}
		on:mouseout={() => (hoverData = undefined)}
	/>
{/if}
