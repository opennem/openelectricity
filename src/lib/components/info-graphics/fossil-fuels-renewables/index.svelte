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
		!!data &&
			(data.marketStats?.length > 0 || (data.legacyFueltechStats?.length ?? 0) > 0)
	);

	// Homepage uses the legacy OpenNEM JSON source, 12-month rolling, percentage,
	// without the denominator line (showTotal: false). All other modes / options
	// live on /studio/renewables.
	let result = $derived.by(() =>
		hasData && data
			? calculateRenewables(
					data,
					'legacy_opennem',
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
{/if}
