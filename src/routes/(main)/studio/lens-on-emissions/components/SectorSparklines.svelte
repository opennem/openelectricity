<script>
	/**
	 * SectorSparklines Component
	 *
	 * Displays a grid of mini sparkline charts showing trends for each sector.
	 * Each sparkline shows the sector's emissions trajectory over time.
	 */
	import { LayerCake, Svg } from 'layercake';
	import { scaleLinear } from 'd3-scale';
	import Line from '$lib/components/charts/elements/Line.svelte';
	import Area from '$lib/components/charts/elements/Area.svelte';
	import { formatEmissionsValue } from '../helpers/formatters.js';

	/**
	 * @typedef {import('../helpers/csv-parser.js').EmissionsDataPoint} EmissionsDataPoint
	 */

	/**
	 * @typedef {Object} Props
	 * @property {EmissionsDataPoint[]} chartData - Processed emissions data
	 * @property {string[]} sectors - Array of sector keys in order
	 * @property {Record<string, string>} sectorColors - Map of sector key to color
	 * @property {Record<string, string>} sectorLabels - Map of sector key to display label
	 * @property {Set<string>} [hiddenSectors] - Set of hidden sector keys
	 */

	/** @type {Props} */
	let { chartData, sectors, sectorColors, sectorLabels, hiddenSectors = new Set() } = $props();

	// Filter out hidden sectors
	let visibleSectors = $derived(sectors.filter((s) => !hiddenSectors.has(s)));

	/**
	 * Get the latest value for a sector
	 * @param {string} sector
	 * @returns {number}
	 */
	function getLatestValue(sector) {
		if (chartData.length === 0) return 0;
		return Number(chartData.at(-1)?.[sector]) || 0;
	}

	/**
	 * Transform chart data into sparkline format for a sector
	 * @param {string} sector
	 * @returns {Array<{index: number, value: number}>}
	 */
	function getSectorData(sector) {
		return chartData.map((d, index) => ({
			index,
			value: Number(d[sector]) || 0
		}));
	}

	/**
	 * Get y-domain for a sector (handles negative values like LULUCF)
	 * @param {string} sector
	 * @returns {[number, number]}
	 */
	function getYDomain(sector) {
		const values = chartData.map((d) => Number(d[sector]) || 0);
		const min = Math.min(0, ...values);
		const max = Math.max(0, ...values);
		// Add 10% padding
		const padding = (max - min) * 0.1;
		return [min - padding, max + padding];
	}
</script>

<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
	{#each visibleSectors as sector (sector)}
		{@const latestValue = getLatestValue(sector)}
		{@const sectorData = getSectorData(sector)}
		{@const yDomain = getYDomain(sector)}
		{@const isNegative = latestValue < 0}
		{@const color = sectorColors[sector]}

		<div class="bg-white border border-light-warm-grey rounded-lg p-3">
			<!-- Header with color swatch and label -->
			<div class="flex items-center gap-2 mb-1">
				<span class="w-3 h-3 rounded-full flex-shrink-0" style="background-color: {color}"></span>
				<span class="text-sm font-medium text-dark-grey truncate">{sectorLabels[sector]}</span>
			</div>

			<!-- Current value -->
			<p class="text-lg font-bold text-dark-grey font-mono tabular-nums mb-2">
				{isNegative ? '-' : ''}{formatEmissionsValue(latestValue)}
				<span class="text-xs font-normal text-mid-warm-grey">MtCO₂e</span>
			</p>

			<!-- Mini sparkline chart -->
			<div class="h-[50px]">
				{#if sectorData.length > 0}
					<LayerCake
						padding={{ top: 2, right: 0, bottom: 2, left: 0 }}
						x="index"
						y="value"
						xScale={scaleLinear()}
						xDomain={[0, sectorData.length - 1]}
						{yDomain}
						data={sectorData}
					>
						<Svg>
							<Area fill={color} fillOpacity={0.2} />
							<Line stroke={color} strokeWidth="1.5px" />
						</Svg>
					</LayerCake>
				{/if}
			</div>
		</div>
	{/each}
</div>
