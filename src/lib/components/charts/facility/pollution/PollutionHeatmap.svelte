<script>
	import chroma from 'chroma-js';
	import { CATEGORY_META } from './pollution-constants.js';

	/** @type {{ data: import('./transform-pollution.js').PollutionData }} */
	let { data } = $props();

	const LABEL_WIDTH = 120;
	const ROW_HEIGHT = 24;
	const HEADER_HEIGHT = 28;
	const YEAR_HEADER_HEIGHT = 40;
	const CELL_PAD = 1;

	let containerWidth = $state(0);

	let colWidth = $derived(
		data.years.length > 0 ? (containerWidth - LABEL_WIDTH) / data.years.length : 0
	);

	/**
	 * @typedef {Object} HeatmapRow
	 * @property {'header' | 'pollutant'} type
	 * @property {string} label
	 * @property {string} [category]
	 * @property {import('./transform-pollution.js').PollutantSeries} [series]
	 * @property {number} [maxValue]
	 */

	/** @type {HeatmapRow[]} */
	let rows = $derived.by(() => {
		/** @type {HeatmapRow[]} */
		const result = [];
		const categoryOrder = Object.keys(CATEGORY_META);

		for (const catKey of categoryOrder) {
			const pollutants = data.byCategory[catKey];
			if (!pollutants?.length) continue;

			const meta = CATEGORY_META[catKey];
			result.push({ type: 'header', label: meta?.label ?? catKey, category: catKey });

			for (const series of pollutants) {
				const vals = Object.values(series.values).filter(
					/** @param {number | null} v */ (v) => v != null
				);
				const maxValue = vals.length > 0 ? Math.max(.../** @type {number[]} */ (vals)) : 0;
				result.push({ type: 'pollutant', label: series.label, category: catKey, series, maxValue });
			}
		}

		return result;
	});

	let svgHeight = $derived(
		YEAR_HEADER_HEIGHT +
			rows.reduce((sum, r) => sum + (r.type === 'header' ? HEADER_HEIGHT : ROW_HEIGHT), 0)
	);

	/**
	 * @param {string} category
	 * @param {number} value
	 * @param {number} maxValue
	 * @returns {string}
	 */
	function getCellColour(category, value, maxValue) {
		const base = CATEGORY_META[category]?.colour ?? '#888';
		if (maxValue === 0) return '#f5f5f5';
		const t = value / maxValue;
		return chroma.scale(['#f5f5f5', base])(t).hex();
	}

	/**
	 * @param {number | null | undefined} value
	 * @returns {string}
	 */
	function formatValue(value) {
		if (value == null) return 'No data';
		if (value === 0) return '0';
		if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
		if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
		if (value < 0.01) return value.toExponential(2);
		return value.toLocaleString('en-AU', { maximumFractionDigits: 3 });
	}

	/** @type {{ pollutant: string, year: string, value: number | null, unit: string, x: number, y: number } | null} */
	let hoveredCell = $state(null);

	/**
	 * @param {import('./transform-pollution.js').PollutantSeries} series
	 * @param {string} year
	 * @param {number} x
	 * @param {number} y
	 */
	function handleCellEnter(series, year, x, y) {
		hoveredCell = {
			pollutant: series.label,
			year,
			value: series.values[year] ?? null,
			unit: series.unit,
			x,
			y
		};
	}

	function handleCellLeave() {
		hoveredCell = null;
	}
</script>

<div class="relative" bind:clientWidth={containerWidth}>
	{#if containerWidth > 0}
		<svg
			width={containerWidth}
			height={svgHeight}
			class="block select-none"
			role="img"
			aria-label="Pollution heatmap"
		>
			<defs>
				<pattern id="null-pattern" width="6" height="6" patternUnits="userSpaceOnUse">
					<rect width="6" height="6" fill="#eee" />
					<line x1="0" y1="6" x2="6" y2="0" stroke="#ddd" stroke-width="0.75" />
				</pattern>
			</defs>

			<!-- Year headers -->
			{#each data.years as year, i (year)}
				{@const x = LABEL_WIDTH + i * colWidth + colWidth / 2}
				<text
					{x}
					y={YEAR_HEADER_HEIGHT - 8}
					text-anchor="middle"
					class="fill-mid-grey"
					font-size="10"
				>
					{year}
				</text>
			{/each}

			<!-- Rows -->
			{#each rows as row, rowIdx (row.type === 'header' ? `hdr-${row.category}` : `p-${row.series?.code}`)}
				{@const yOffset =
					YEAR_HEADER_HEIGHT +
					rows
						.slice(0, rowIdx)
						.reduce((s, r) => s + (r.type === 'header' ? HEADER_HEIGHT : ROW_HEIGHT), 0)}

				{#if row.type === 'header'}
					<!-- Category header row -->
					<text
						x={4}
						y={yOffset + HEADER_HEIGHT / 2 + 4}
						font-size="10"
						class="fill-mid-grey uppercase"
						letter-spacing="0.1em"
					>
						{row.label}
					</text>
					<line
						x1={0}
						y1={yOffset + HEADER_HEIGHT}
						x2={containerWidth}
						y2={yOffset + HEADER_HEIGHT}
						stroke="currentColor"
						class="text-warm-grey"
						stroke-width="0.5"
					/>
				{:else if row.series}
					<!-- Pollutant label -->
					<text
						x={LABEL_WIDTH - 8}
						y={yOffset + ROW_HEIGHT / 2 + 4}
						text-anchor="end"
						font-size="11"
						class="fill-dark-grey"
					>
						{row.label}
					</text>

					<!-- Value cells -->
					{#each data.years as year, colIdx (year)}
						{@const cellX = LABEL_WIDTH + colIdx * colWidth + CELL_PAD}
						{@const cellY = yOffset + CELL_PAD}
						{@const cellW = colWidth - CELL_PAD * 2}
						{@const cellH = ROW_HEIGHT - CELL_PAD * 2}
						{@const value = row.series.values[year]}

						{#if value == null}
							<rect
								role="gridcell"
								tabindex="-1"
								aria-label="{row.label} {year}: No data"
								x={cellX}
								y={cellY}
								width={cellW}
								height={cellH}
								rx="2"
								fill="url(#null-pattern)"
								onmouseenter={() =>
									handleCellEnter(
										/** @type {import('./transform-pollution.js').PollutantSeries} */ (row.series),
										year,
										cellX + cellW / 2,
										cellY
									)}
								onmouseleave={handleCellLeave}
							/>
						{:else}
							<rect
								role="gridcell"
								tabindex="-1"
								aria-label="{row.label} {year}: {formatValue(value)} {row.series.unit}"
								x={cellX}
								y={cellY}
								width={cellW}
								height={cellH}
								rx="2"
								fill={getCellColour(
									/** @type {string} */ (row.category),
									value,
									/** @type {number} */ (row.maxValue)
								)}
								onmouseenter={() =>
									handleCellEnter(
										/** @type {import('./transform-pollution.js').PollutantSeries} */ (row.series),
										year,
										cellX + cellW / 2,
										cellY
									)}
								onmouseleave={handleCellLeave}
							/>
						{/if}
					{/each}
				{/if}
			{/each}
		</svg>
	{/if}

	<!-- Tooltip -->
	{#if hoveredCell}
		<div
			class="absolute pointer-events-none z-10 bg-white border border-warm-grey shadow-sm rounded px-2 py-1.5 text-[11px] leading-snug whitespace-nowrap"
			style:left="{hoveredCell.x}px"
			style:top="{hoveredCell.y - 8}px"
			style:transform="translate(-50%, -100%)"
		>
			<div class="font-medium text-dark-grey">{hoveredCell.pollutant}</div>
			<div class="text-mid-grey">
				{hoveredCell.year}: {formatValue(hoveredCell.value)}{hoveredCell.value != null
					? ` ${hoveredCell.unit}`
					: ''}
			</div>
		</div>
	{/if}
</div>
