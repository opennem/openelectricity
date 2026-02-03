<script>
	/**
	 * CategoryAxisX Component (v2)
	 *
	 * Renders the X axis for category-based charts using a band scale.
	 * Gets the band scale from LayerCake's custom prop.
	 * Automatically shows alternate labels when viewport is too small.
	 */
	import { getContext } from 'svelte';

	const { width, height, yRange, custom } = getContext('LayerCake');

	/**
	 * @typedef {Object} Props
	 * @property {boolean} [gridlines] - Show vertical gridlines
	 * @property {boolean} [tickMarks] - Show tick marks below axis
	 * @property {boolean} [tickLabel] - Show tick labels
	 * @property {string} [stroke] - Gridline stroke colour
	 * @property {string} [strokeArray] - Gridline dash pattern
	 * @property {(d: any) => any} [formatTick] - Tick formatter function
	 * @property {number} [xTick] - X offset for tick labels
	 * @property {number} [yTick] - Y offset for tick labels
	 * @property {string} [fill] - Background fill colour
	 * @property {string} [textClass] - CSS class for tick labels
	 * @property {number} [minLabelWidth] - Minimum width per label before alternating (default: 50)
	 */

	/** @type {Props} */
	let {
		gridlines = false,
		tickMarks = true,
		tickLabel = true,
		stroke = '#e5e5e5',
		strokeArray = '3',
		formatTick = (d) => String(d),
		xTick = 0,
		yTick = 16,
		fill = 'white',
		textClass = 'text-xxs font-light text-mid-warm-grey',
		minLabelWidth = 50
	} = $props();

	// Get the band scale and categories from custom prop
	let bandScale = $derived($custom?.bandScale);
	let categories = $derived($custom?.categories ?? []);
	let chartWidth = $derived($width || 1);

	// Calculate label skip interval based on available width
	// Uses a simple calculation that's efficient enough without throttling
	// The skip value only changes at discrete breakpoints anyway
	let labelSkip = $derived.by(() => {
		if (categories.length === 0) return 1;
		const bandwidthPixels = chartWidth / categories.length;
		// Calculate how many labels to skip to maintain minimum width
		const skip = Math.max(1, Math.ceil(minLabelWidth / bandwidthPixels));
		return skip;
	});

	/**
	 * Check if a label should be shown based on skip interval
	 * @param {number} index
	 * @returns {boolean}
	 */
	function shouldShowLabel(index) {
		return index % labelSkip === 0;
	}

	// Convert band scale position (0-100) to pixel position
	function toPixels(bandPosition) {
		return (bandPosition / 100) * chartWidth;
	}
</script>

<g class="axis x-axis category-axis pointer-events-none">
	<!-- Background rect for axis area -->
	<rect class="axis-background" x="0" y={$height + 1} width={$width} height={24} {fill} />

	<!-- Top gridline -->
	{#if gridlines}
		{@const yPosTop = Math.min(...$yRange)}
		<line
			class="gridline topline"
			{stroke}
			stroke-dasharray={strokeArray}
			y1={yPosTop}
			y2={yPosTop}
			x1={0}
			x2={$width}
		/>
	{/if}

	<!-- Bottom gridline (baseline) -->
	{#if gridlines}
		{@const yPos = Math.max(...$yRange)}
		<line
			class="gridline baseline"
			{stroke}
			stroke-dasharray={strokeArray}
			y1={yPos}
			y2={yPos}
			x1={0}
			x2={$width}
		/>
	{/if}

	<!-- Gridlines and tick marks at step transitions (band starts) -->
	{#each categories as category, i (category)}
		{@const bandX = bandScale?.(category) ?? 0}
		{@const xPos = toPixels(bandX)}
		{@const yPos = Math.max(...$yRange)}

		{#if gridlines}
			<line
				class="gridline"
				{stroke}
				stroke-dasharray={strokeArray}
				y1={yPos - $height}
				y2={yPos}
				x1={xPos}
				x2={xPos}
			/>
		{/if}

		{#if tickMarks}
			<line class="tick-mark" {stroke} y1={yPos} y2={yPos + 6} x1={xPos} x2={xPos} />
		{/if}
	{/each}

	<!-- Tick labels - positioned at center of each band, skip when overlapping -->
	{#each categories as category, i (category)}
		{@const bandX = bandScale?.(category) ?? 0}
		{@const bandwidth = bandScale?.bandwidth?.() ?? 0}
		{@const xPos = toPixels(bandX + bandwidth / 2)}
		{@const yPos = Math.max(...$yRange)}

		{#if tickLabel && shouldShowLabel(i)}
			<text x={xPos + xTick} y={yPos + yTick} dx="0" dy="2" text-anchor="middle" class={textClass}>
				{formatTick(category)}
			</text>
		{/if}
	{/each}

	<!-- Final gridline at the end of the last band -->
	{#if gridlines && categories.length > 0}
		{@const lastCategory = categories[categories.length - 1]}
		{@const lastBandX = bandScale?.(lastCategory) ?? 0}
		{@const bandwidth = bandScale?.bandwidth?.() ?? 0}
		{@const endXPos = toPixels(lastBandX + bandwidth)}
		{@const yPos = Math.max(...$yRange)}
		<line
			class="gridline"
			{stroke}
			stroke-dasharray={strokeArray}
			y1={yPos - $height}
			y2={yPos}
			x1={endXPos}
			x2={endXPos}
		/>
	{/if}
</g>
