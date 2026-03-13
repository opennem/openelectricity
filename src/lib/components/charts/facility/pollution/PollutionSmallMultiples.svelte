<script>
	import { scaleBand, scaleLinear } from 'd3-scale';
	import { SvelteMap } from 'svelte/reactivity';
	import { CATEGORY_META } from './pollution-constants.js';

	/** @type {{ data: import('./transform-pollution.js').PollutionData }} */
	let { data } = $props();

	const padding = { top: 5, right: 5, bottom: 15, left: 5 };
	const chartHeight = 100;
	const svgWidth = 200;
	const innerWidth = svgWidth - padding.left - padding.right;
	const innerHeight = chartHeight - padding.top - padding.bottom;

	/** @type {{ pollutantCode: string, barIndex: number } | null} */
	let hover = $state(null);

	/**
	 * Pollutants that have at least one non-null value
	 */
	let activePollutants = $derived(
		data.pollutants.filter((p) => Object.values(p.values).some((v) => v != null))
	);

	/**
	 * Pre-computed chart data for each active pollutant
	 */
	let chartData = $derived.by(() => {
		const years = data.years;
		const xScale = scaleBand().domain(years).range([0, innerWidth]).padding(0.2);
		const bandwidth = xScale.bandwidth();

		/** @type {Map<string, { maxVal: number, colour: string, xScale: typeof xScale, yScale: ReturnType<typeof scaleLinear>, bandwidth: number, bars: Array<{ year: string, index: number, x: number, y: number, width: number, height: number, value: number } | null> }>} */
		const map = new SvelteMap();

		for (const pollutant of activePollutants) {
			const maxVal = Math.max(
				...years.map((y) => pollutant.values[y] ?? 0).filter((v) => v > 0),
				0
			);
			const yScale = scaleLinear()
				.domain([0, maxVal || 1])
				.range([innerHeight, 0]);
			const colour = CATEGORY_META[pollutant.category]?.colour ?? '#888';

			const bars = years.map((year, i) => {
				const val = pollutant.values[year];
				if (val == null) return null;
				const x = xScale(year) ?? 0;
				const y = yScale(val);
				return {
					year,
					index: i,
					x,
					y,
					width: bandwidth,
					height: innerHeight - y,
					value: val
				};
			});

			map.set(pollutant.code, { maxVal, colour, xScale, yScale, bandwidth, bars });
		}

		return map;
	});

	/**
	 * Format a numeric value for tooltip display
	 * @param {number} value
	 * @returns {string}
	 */
	function formatValue(value) {
		return value.toLocaleString('en-AU', { maximumFractionDigits: 2 });
	}
</script>

<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
	{#each activePollutants as pollutant (pollutant.code)}
		{@const cd = chartData.get(pollutant.code)}

		{#if cd}
			<div class="border border-warm-grey/60 rounded-lg p-3">
				<div class="text-[11px] font-mono text-dark-grey">{pollutant.label}</div>
				<div class="text-[9px] text-mid-grey">{pollutant.unit}</div>

				<svg
					viewBox="0 0 {svgWidth} {chartHeight}"
					width="100%"
					height={chartHeight}
					class="mt-1"
					preserveAspectRatio="xMidYMid meet"
				>
					<g transform="translate({padding.left},{padding.top})">
						{#each cd.bars as bar, i (i)}
							{#if bar}
								{@const isHovered =
									hover?.pollutantCode === pollutant.code && hover?.barIndex === bar.index}

								<rect
									x={bar.x}
									y={bar.y}
									width={bar.width}
									height={bar.height}
									fill={cd.colour}
									opacity={isHovered ? 1 : 0.8}
									role="presentation"
									onmouseenter={() =>
										(hover = { pollutantCode: pollutant.code, barIndex: bar.index })}
									onmouseleave={() => (hover = null)}
								/>

								{#if isHovered}
									<g
										transform="translate({bar.x + bar.width / 2},{bar.y - 4})"
										pointer-events="none"
									>
										<rect
											x={-28}
											y={-20}
											width={56}
											height={18}
											rx={3}
											fill="rgba(0,0,0,0.8)"
										/>
										<text text-anchor="middle" y={-7} fill="white" font-size="8">
											{bar.year}: {formatValue(bar.value)}
										</text>
									</g>
								{/if}
							{/if}
						{/each}

						<!-- X-axis: first and last year labels only -->
						{#if data.years.length > 0}
							{@const firstYear = data.years[0]}
							{@const lastYear = data.years[data.years.length - 1]}
							{@const firstX = cd.xScale(firstYear) ?? 0}
							{@const lastX = (cd.xScale(lastYear) ?? 0) + cd.bandwidth}

							<text x={firstX} y={innerHeight + 12} font-size="8" fill="currentColor"
								class="text-mid-grey"
							>
								{firstYear}
							</text>

							{#if data.years.length > 1}
								<text
									x={lastX}
									y={innerHeight + 12}
									font-size="8"
									fill="currentColor"
									text-anchor="end"
									class="text-mid-grey"
								>
									{lastYear}
								</text>
							{/if}
						{/if}
					</g>
				</svg>
			</div>
		{/if}
	{/each}
</div>
