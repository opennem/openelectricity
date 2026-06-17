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

	// Hidden toggle: the 2035 trend projection is off by default and revealed with
	// Shift+T. Deliberately undocumented in the UI — it's an exploratory overlay,
	// not a published forecast.
	let showTrends = $state(false);

	/** @param {KeyboardEvent} e */
	function handleKeydown(e) {
		if (e.defaultPrevented || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
		const target = /** @type {HTMLElement | null} */ (e.target);
		if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable)
			return;
		if (e.shiftKey && e.key.toLowerCase() === 't') {
			showTrends = !showTrends;
		}
	}

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

<svelte:window onkeydown={handleKeydown} />

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
		{showTrends}
		historicalDataset={result.statsDatasets}
	/>

	<p class="mt-8 px-2 text-left text-xs leading-snug text-mid-grey md:mt-2 md:px-0">
		Renewables and fossil fuels are each shown as a share of gross demand and measured
		independently, so the two lines don't always sum to exactly 100%.
		<br />
		<a
			href="https://docs.openelectricity.org.au/guides/renewables/"
			target="_blank"
			rel="noopener noreferrer"
			class="mt-1 block underline hover:opacity-80"
		>
			How renewable energy is calculated →
		</a>
	</p>
	{#if showTrends}
		<p class="px-2 text-left text-xs leading-snug text-mid-grey md:mt-2 md:px-0">
			The dashed lines extend each series to 2035 as a simple linear trend fitted to the last decade
			— indicative only, not a forecast.
		</p>
	{/if}
{/if}
