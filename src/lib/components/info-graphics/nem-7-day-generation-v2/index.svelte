<script>
	/**
	 * NEM 7-Day Generation Chart v2
	 *
	 * Uses the Stratum chart system with server-side data processing
	 * for improved performance.
	 */
	import { fade } from 'svelte/transition';
	import { format } from 'date-fns';
	import { ChartStore, StratumChart, ChartTooltip } from '$lib/components/charts/v2';
	import { fuelTechColour } from '$lib/stores/theme';
	import { fuelTechName } from '$lib/fuel_techs.js';
	import { dataTrackerLink } from '$lib/stores/app';
	import nighttimes from '$lib/utils/nighttimes';
	import legend from './helpers/legend';

	/**
	 * @typedef {Object} ProcessedData
	 * @property {any[]} data - Time series data
	 * @property {string[]} seriesNames
	 * @property {Record<string, string>} seriesColours
	 * @property {Record<string, string>} seriesLabels
	 * @property {number} minY
	 * @property {number} maxY
	 * @property {{ processingTimeMs: number, dataPoints: number, interval: string }} [meta]
	 */

	/**
	 * @typedef {Object} Props
	 * @property {ProcessedData} [initialData] - Server-prefetched processed data
	 */

	/** @type {Props} */
	let { initialData = undefined } = $props();

	// Create chart store
	const chart = new ChartStore({
		key: Symbol('nem-7-day-generation-v2'),
		title: 'NEM 7-Day Generation',
		prefix: 'G',
		displayPrefix: 'G',
		baseUnit: 'W',
		timeZone: 'Australia/Sydney'
	});

	// Configure chart styles
	chart.chartStyles.chartHeightClasses = 'h-[300px] md:h-[500px]';
	chart.chartStyles.yAxisStroke = 'transparent';
	chart.chartOptions.allowHoverHighlight = false;
	chart.yTicks = 4;
	chart.xTicks = 8;

	// Format x-axis labels as "28 Jan"
	chart.formatTickX = (/** @type {Date} */ d) => {
		if (!d || !d.getTime || d.getTime() === 0) return '';
		return format(d, 'd MMM');
	};

	// Update chart when data is available
	$effect(() => {
		if (initialData) {
			// Convert date strings back to Date objects
			const dataWithDates = initialData.data.map((d) => ({
				...d,
				date: new Date(d.date)
			}));

			chart.seriesData = dataWithDates;
			chart.seriesNames = initialData.seriesNames;
			chart.seriesColours = initialData.seriesColours;
			chart.seriesLabels = initialData.seriesLabels;

			// Set Y domain from pre-calculated min/max
			chart.setYDomain([initialData.minY, initialData.maxY]);

			// Calculate nighttime shading
			if (dataWithDates.length > 0) {
				const startDate = dataWithDates[0].date;
				const endDate = dataWithDates[dataWithDates.length - 1].date;
				chart.shadingData = nighttimes(startDate, endDate);
				chart.shadingFill = '#33333311';
			}
		}
	});

	// Build legend from static list
	let displayLegend = $derived(
		legend.toReversed().map((d) => ({
			key: d,
			label: fuelTechName(d),
			colour: $fuelTechColour(d)
		}))
	);

	let hasData = $derived(chart.seriesData?.length > 0);
</script>

<div class="container max-w-none lg:container">
	<header>
		<h3>National Electricity Market</h3>
	</header>
</div>

{#if hasData}
	<div transition:fade={{ duration: 500 }}>
		<StratumChart
			{chart}
			showHeader={false}
			defaultTooltipText="Last 7 days Power Generation (GW)"
			chartPadding="px-0"
		>
			{#snippet tooltip()}
				<div class="container max-w-none lg:container">
					<ChartTooltip {chart} defaultText="Last 7 days Power Generation (GW)" />
				</div>
			{/snippet}
		</StratumChart>

		<div class="container max-w-none lg:container md:mt-12">
			<footer class="block md:flex justify-between items-center">
				<dl class="flex flex-wrap gap-1">
					{#each displayLegend as { colour, label } (label)}
						<dt class="flex items-center gap-2 text-xs text-mid-grey mr-3">
							<span class="w-4 h-4 block" style="background-color: {colour}"></span>
							<span>{label}</span>
						</dt>
					{/each}
				</dl>
				<a
					href={$dataTrackerLink}
					class="text-base mt-12 md:mt-0 block text-center rounded-xl font-space border border-black border-solid p-6 transition-all text-white bg-black hover:bg-dark-grey hover:no-underline"
				>
					View tracker
				</a>
			</footer>
		</div>
	</div>
{:else}
	<div
		class="container max-w-none lg:container h-[300px] md:h-[500px] rounded-xl bg-warm-grey animate-pulse"
	></div>
{/if}
