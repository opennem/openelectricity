<script>
	import { colourReducer } from '$lib/stores/theme';
	import { calculateRenewables } from '$lib/oe-api/calculate-renewables';

	import Chart from './Chart.svelte';

	/**
	 * @typedef {Object} Props
	 * @property {{ marketStats: StatsData[], legacyFueltechStats?: StatsData[] } | null} data
	 * @property {string} [title]
	 * @property {string} [description]
	 * @property {boolean} [skipAnimation]
	 */

	/** @type {Props} */
	let { data, title = '', description = '', skipAnimation = false } = $props();

	let hasData = $derived(
		!!data && (data.marketStats?.length > 0 || (data.legacyFueltechStats?.length ?? 0) > 0)
	);

	// Homepage uses the live OE API (oe_homepage mode): renewables =
	// generation_renewable_energy ÷ gross demand, fossils = Σ fossil fueltechs ÷
	// gross demand. 12-month rolling, percentage, without the denominator line
	// (showTotal: false). All other modes / options live on /studio/renewables.
	let result = $derived.by(() =>
		hasData && data
			? calculateRenewables(
					data,
					'oe_homepage',
					$colourReducer,
					'rolling12mth',
					'percentage',
					false
				)
			: null
	);
</script>

{#if hasData && result}
	<Chart
		{title}
		{description}
		valueType="percentage"
		dataset={result.dataset}
		seriesNames={result.seriesNames}
		seriesColours={result.seriesColours}
		seriesLabels={result.seriesLabels}
		{skipAnimation}
		historicalDataset={result.statsDatasets}
	/>

	<p class="mt-8 px-2 text-left text-xs leading-snug text-mid-grey md:mt-2 md:px-0">
		Renewables and fossil fuels are each shown as a share of gross demand and measured
		independently, so the two lines don't always sum to exactly 100%.
		<a
			href="https://docs.openelectricity.org.au/guides/renewables/"
			target="_blank"
			rel="noopener noreferrer"
			class="mt-1 block underline hover:opacity-80"
		>
			How renewable energy is calculated →
		</a>
	</p>
{/if}
