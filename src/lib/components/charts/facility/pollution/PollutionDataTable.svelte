<script>
	import { CATEGORY_META } from './pollution-constants.js';

	/** @type {{ data: import('./transform-pollution.js').PollutionData }} */
	let { data } = $props();

	const SPARKLINE_WIDTH = 80;
	const SPARKLINE_HEIGHT = 20;

	/** @type {string[]} */
	let categoryOrder = $derived(
		Object.keys(CATEGORY_META).filter((key) => data.byCategory[key]?.length)
	);

	let totalColumns = $derived(3 + data.years.length);

	/**
	 * Format a numeric value for display
	 * @param {number | null} value
	 * @returns {string}
	 */
	function formatValue(value) {
		if (value == null) return '\u2014';
		return value.toLocaleString('en-AU', { maximumFractionDigits: 2 });
	}

	/**
	 * Build an SVG path for the sparkline area fill
	 * @param {(number | null)[]} values
	 * @returns {{ linePath: string, areaPath: string, singlePoint: { x: number, y: number } | null }}
	 */
	function buildSparkline(values) {
		const validEntries = values
			.map((v, i) => ({ v, i }))
			.filter((d) => d.v != null);

		if (validEntries.length === 0) {
			return { linePath: '', areaPath: '', singlePoint: null };
		}

		if (validEntries.length === 1) {
			const entry = validEntries[0];
			const x = values.length > 1 ? entry.i * (SPARKLINE_WIDTH / (values.length - 1)) : SPARKLINE_WIDTH / 2;
			return { linePath: '', areaPath: '', singlePoint: { x, y: SPARKLINE_HEIGHT / 2 } };
		}

		const numericValues = /** @type {number[]} */ (values.filter((v) => v != null));
		const min = Math.min(...numericValues);
		const max = Math.max(...numericValues);
		const range = max - min || 1;
		const padding = 2;
		const plotHeight = SPARKLINE_HEIGHT - padding * 2;
		const xStep = SPARKLINE_WIDTH / (values.length - 1);

		/**
		 * @param {number} index
		 * @param {number} value
		 * @returns {{ x: number, y: number }}
		 */
		function toPoint(index, value) {
			return {
				x: index * xStep,
				y: padding + plotHeight - ((value - min) / range) * plotHeight
			};
		}

		/** @type {string[]} */
		const lineSegments = [];
		/** @type {string[]} */
		const areaSegments = [];

		let inSegment = false;
		/** @type {{ x: number, y: number }[]} */
		let currentSegment = [];

		for (let i = 0; i < values.length; i++) {
			if (values[i] != null) {
				const pt = toPoint(i, /** @type {number} */ (values[i]));
				if (!inSegment) {
					lineSegments.push(`M${pt.x},${pt.y}`);
					currentSegment = [pt];
					inSegment = true;
				} else {
					lineSegments.push(`L${pt.x},${pt.y}`);
					currentSegment.push(pt);
				}
			} else {
				if (currentSegment.length > 1) {
					areaSegments.push(buildAreaSegment(currentSegment));
				}
				inSegment = false;
				currentSegment = [];
			}
		}

		if (currentSegment.length > 1) {
			areaSegments.push(buildAreaSegment(currentSegment));
		}

		return {
			linePath: lineSegments.join(''),
			areaPath: areaSegments.join(''),
			singlePoint: null
		};
	}

	/**
	 * Build a closed area path from a segment of points
	 * @param {{ x: number, y: number }[]} points
	 * @returns {string}
	 */
	function buildAreaSegment(points) {
		if (points.length < 2) return '';
		let d = `M${points[0].x},${SPARKLINE_HEIGHT}`;
		for (const pt of points) {
			d += `L${pt.x},${pt.y}`;
		}
		d += `L${points[points.length - 1].x},${SPARKLINE_HEIGHT}Z`;
		return d;
	}
</script>

<div class="overflow-x-auto">
	<table class="w-full text-[11px] font-mono">
		<thead>
			<tr>
				<th class="py-1.5 pr-3 text-left text-mid-grey font-normal whitespace-nowrap">Pollutant</th>
				<th class="py-1.5 pr-3 text-left text-mid-grey font-normal whitespace-nowrap">Unit</th>
				<th class="py-1.5 pr-3 text-left text-mid-grey font-normal whitespace-nowrap">Trend</th>
				{#each data.years as year (year)}
					<th class="py-1.5 px-2 text-right text-mid-grey font-normal whitespace-nowrap border-l border-warm-grey/30">
						{year}
					</th>
				{/each}
			</tr>
		</thead>
		<tbody>
			{#each categoryOrder as catKey (catKey)}
				{@const catMeta = CATEGORY_META[catKey]}
				{@const pollutants = data.byCategory[catKey]}

				<!-- Category sub-header -->
				<tr>
					<td
						colspan={totalColumns}
						class="text-[10px] text-mid-grey uppercase tracking-widest pt-4 pb-1 border-b border-dark-grey font-sans"
					>
						{catMeta.label}
					</td>
				</tr>

				<!-- Pollutant rows -->
				{#each pollutants as pollutant (pollutant.code)}
					{@const yearValues = data.years.map((y) => pollutant.values[y] ?? null)}
					{@const sparkline = buildSparkline(yearValues)}

					<tr class="border-b border-warm-grey/40">
						<td class="py-1.5 pr-3 text-dark-grey whitespace-nowrap">
							<span class="inline-flex items-center gap-1.5">
								<span
									class="inline-block w-1.5 h-1.5 rounded-full shrink-0"
									style:background-color={catMeta.colour}
								></span>
								{pollutant.label}
							</span>
						</td>
						<td class="py-1.5 pr-3 text-mid-grey whitespace-nowrap">{pollutant.unit}</td>
						<td class="py-1.5 pr-3 whitespace-nowrap">
							<svg
								width={SPARKLINE_WIDTH}
								height={SPARKLINE_HEIGHT}
								class="block"
								aria-label="Trend for {pollutant.label}"
							>
								{#if sparkline.areaPath}
									<path
										d={sparkline.areaPath}
										fill={catMeta.colour}
										fill-opacity="0.2"
									/>
								{/if}
								{#if sparkline.linePath}
									<path
										d={sparkline.linePath}
										fill="none"
										stroke={catMeta.colour}
										stroke-width="1.5"
									/>
								{/if}
								{#if sparkline.singlePoint}
									<circle
										cx={sparkline.singlePoint.x}
										cy={sparkline.singlePoint.y}
										r="2.5"
										fill={catMeta.colour}
									/>
								{/if}
							</svg>
						</td>
						{#each data.years as year (year)}
							<td class="py-1.5 px-2 text-right tabular-nums text-dark-grey whitespace-nowrap border-l border-warm-grey/30">
								{formatValue(pollutant.values[year] ?? null)}
							</td>
						{/each}
					</tr>
				{/each}
			{/each}
		</tbody>
	</table>
</div>
