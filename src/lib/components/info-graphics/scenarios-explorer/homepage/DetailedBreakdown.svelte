<script>
	import MiniCharts from '$lib/components/charts/v2/MiniCharts.svelte';
	import { convert } from '$lib/utils/si-units';
	import { getNumberFormat } from '$lib/utils/formatters';
	import { withScenarioLabels } from '../../../../../routes/(main)/scenarios/page-data-options/models';

	/**
	 * @typedef {Object} Props
	 * @property {import('$lib/components/charts/v2/ChartStore.svelte.js').default} chart
	 * @property {string} selectedGroup
	 * @property {string[]} [seriesLoadsIds]
	 * @property {(time: number, key?: string) => void} [onhover]
	 * @property {() => void} [onhoverend]
	 */

	/** @type {Props} */
	let {
		chart,
		selectedGroup,
		seriesLoadsIds = [],
		onhover,
		onhoverend
	} = $props();

	let gridColClass = $derived(
		selectedGroup === 'homepage_preview'
			? 'grid-cols-2 md:grid-cols-7'
			: 'grid-cols-2'
	);

	// Normalise overlay to number for MiniCharts
	let overlayStartValue = $derived.by(() => {
		const overlay = chart.chartStyles.chartOverlayLine;
		if (!overlay) return undefined;
		return /** @type {number} */ (+new Date(/** @type {any} */ (overlay).date));
	});

	let bgShadingData = $derived(chart.bgShadingData);
	let bgShadingFill = $derived(chart.bgShadingFill);

	// Battery (discharging) is tiny historically, so it rounds to "0 TWh" at the
	// default integer precision. Give just that tile's headline one decimal place;
	// every other tile keeps the chart's standard formatter.
	/**
	 * @param {number} value
	 * @param {string} key
	 */
	function formatHeadlineValue(value, key) {
		const label = chart.seriesLabels[key] || '';
		if (!label.toLowerCase().includes('battery')) {
			return chart.convertAndFormatValue(value);
		}
		const converted = convert(chart.chartOptions.prefix, chart.chartOptions.displayPrefix, value);
		return isNaN(converted) ? '—' : getNumberFormat(1).format(converted);
	}
</script>

{#if chart.seriesData.length > 0}
	<div class="border-t border-b md:border-x border-mid-warm-grey">
		<MiniCharts
			seriesNames={chart.seriesNames}
			seriesLabels={withScenarioLabels(chart.seriesLabels)}
			seriesColours={chart.seriesColours}
			seriesData={chart.seriesData}
			{seriesLoadsIds}
			displayUnit={chart.chartOptions.displayUnit}
			xTicks={chart.xTicks}
			formatTickX={chart.formatTickX}
			formatTickY={chart.convertAndFormatValue}
			formatValue={formatHeadlineValue}
			overlayStart={overlayStartValue}
			shadingData={bgShadingData}
			shadingFill={bgShadingFill}
			hoverTime={chart.hoverTime}
			focusTime={chart.focusTime}
			{gridColClass}
			gridGapClass="gap-0"
			sectionBorderClass="p-8 border-r border-mid-warm-grey last:border-r-0 [&:nth-child(-n+6)]:border-b md:[&:nth-child(-n+6)]:border-b-0"
			showIcon={true}
			{onhover}
			{onhoverend}
		/>
	</div>
{:else}
	<div class="border-t border-b md:border-x border-mid-warm-grey grid {gridColClass} gap-0">
		{#each { length: 7 } as _, i (i)}
			<div class="p-8 border-r border-mid-warm-grey animate-pulse">
				<div class="h-4 w-2/3 bg-warm-grey rounded mb-4"></div>
				<div class="h-8 w-1/3 bg-warm-grey rounded mb-6"></div>
				<div class="h-[150px] bg-warm-grey rounded"></div>
			</div>
		{/each}
	</div>
{/if}
