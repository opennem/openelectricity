<script>
	import { fuelTechName, fuelTechColour, fuelTechOrder } from '$lib/fuel_techs.js';
	import { transform } from '$lib/utils/time-series-helpers/transform/power.js';
	import withMinMax from '$lib/utils/time-series-helpers/with-min-max';
	import deepCopy from '$lib/utils/deep-copy';

	import Chart from './Chart.svelte';

	/** @type {TimeSeriesData[]} */
	export let data;

	const xKey = 'date';

	/** @type {FuelTechCode[]} */
	let loadFts = ['exports', 'battery_charging', 'pumps'];

	/** @type {*[]} */
	let orderedAndLoadsInverted = [];

	$: {
		orderedAndLoadsInverted = [];
		fuelTechOrder.forEach((/** @type {*} */ code) => {
			const filtered = data.filter((d) => d.fuel_tech === code);
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
				d.history.data.forEach(
					/**
					 * @param {number} value
					 * @param {number} i
					 */
					(value, i) => {
						d.history.data[i] = value * -1;
					}
				);
			}
		});
	}
	$: transformed = transform(orderedAndLoadsInverted, '30m');
	$: seriesColours = orderedAndLoadsInverted.map((d) => fuelTechColour(d.fuel_tech));
	$: seriesLabels = orderedAndLoadsInverted.map((d) => fuelTechName(d.fuel_tech));
	$: seriesNames =
		transformed && transformed.length
			? Object.keys(transformed[0]).filter((d) => d !== xKey && d !== 'time')
			: [];
	$: tsData = withMinMax(transformed, seriesNames, loadFts);

	// $: fuelTechLabelDict = orderedAndLoadsInverted.reduce(
	// 	(/** @type {Object.<string, string>} */ acc, curr) => {
	// 		acc[curr.id] = fuelTechName(curr.fuel_tech);
	// 		return acc;
	// 	},
	// 	{}
	// );
	// $: fuelTechColourDict = orderedAndLoadsInverted.reduce(
	// 	(/** @type {Object.<string, string>} */ acc, curr) => {
	// 		acc[curr.id] = fuelTechColour(curr.fuel_tech);
	// 		return acc;
	// 	},
	// 	{}
	// );
	// $: console.log('updated', orderedAndLoadsInverted, tsData);
	// $: console.log('seriesNames', seriesNames, fuelTechLabelDict);
	// $: console.log('seriesColours', seriesColours, fuelTechColourDict);
</script>

{#if tsData.length === 0}
	<p class="mt-6">No data</p>
{:else}
	<Chart
		dataset={tsData}
		{xKey}
		yKey={[0, 1]}
		zKey="key"
		{seriesNames}
		{seriesColours}
		{seriesLabels}
	/>
{/if}
