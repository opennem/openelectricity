<script>
	/**
	 * StackedArea Component (v2)
	 *
	 * Renders stacked area or line charts with optional highlighting.
	 * Supports mouse interactions for identifying hovered series.
	 */
	import { getContext } from 'svelte';
	import { area, line, curveLinear } from 'd3-shape';
	import { closestTo } from 'date-fns';

	const { data, xGet, xScale, yScale, yGet, z } = getContext('LayerCake');

	/**
	 * @typedef {'area' | 'line'} DisplayType
	 */

	/**
	 * @typedef {Object} Props
	 * @property {TimeSeriesData[]} [dataset] - Raw dataset for event lookups
	 * @property {DisplayType} [display] - Chart display type
	 * @property {*} [curveType] - D3 curve type
	 * @property {Object.<string, string>} [seriesColours] - Map of series id to colour
	 * @property {string | null} [highlightId] - Currently highlighted series id
	 * @property {string} [strokeWidth] - Line stroke width
	 * @property {boolean} [showLineDots] - Show dots on line chart
	 * @property {number} [dotRadius] - Dot radius
	 * @property {string} [dotFill] - Dot fill colour
	 * @property {string} [dotStroke] - Dot stroke colour
	 * @property {string} [dotStrokeWidth] - Dot stroke width
	 * @property {(evt: { data: TimeSeriesData, key?: string }) => void} [onmousemove]
	 * @property {() => void} [onmouseout]
	 * @property {(data: TimeSeriesData) => void} [onpointerup]
	 */

	/** @type {Props} */
	let {
		dataset = [],
		display = 'area',
		curveType = curveLinear,
		seriesColours = {},
		highlightId = null,
		strokeWidth = '1.5',
		showLineDots = false,
		dotRadius = 3,
		dotFill = 'white',
		dotStroke = 'black',
		dotStrokeWidth = '1px',
		onmousemove,
		onmouseout,
		onpointerup
	} = $props();

	// Extract unique dates for event lookups
	let compareDates = $derived([...new Set(dataset.map((d) => d.date))]);

	// Area generator for stacked areas
	let areaGen = $derived(
		area()
			.x((d) => $xGet(d))
			.y0((d) => $yScale(d[0]))
			.y1((d) => $yScale(d[1]))
			.curve(curveType)
			.defined((d) => !isNaN(d[0]) && !isNaN(d[1]))
	);

	// Line generator for line charts
	let lineGen = $derived(
		line(
			(d) => $xGet(d),
			(d) => $yGet(d)
		)
			.curve(curveType)
			.defined((d) => d.value !== null && !isNaN(d.value))
	);

	/**
	 * Calculate opacity based on highlight state
	 * @param {any} d - Data item with key or group
	 * @param {number} normalOpacity - Opacity when not dimmed
	 * @param {number} dimmedOpacity - Opacity when dimmed
	 */
	function getOpacity(d, normalOpacity, dimmedOpacity) {
		if (!highlightId) return normalOpacity;
		return highlightId === d.key || highlightId === d.group ? normalOpacity : dimmedOpacity;
	}

	/**
	 * Find closest data point by x position
	 * @param {MouseEvent|TouchEvent} evt
	 * @returns {TimeSeriesData | undefined}
	 */
	function findClosestDataPoint(evt) {
		let offsetX = 0;

		if ('offsetX' in evt) {
			offsetX = evt.offsetX;
		} else if ('touches' in evt && evt.touches.length > 0) {
			const rect = /** @type {Element} */ (evt.target).getBoundingClientRect();
			offsetX = evt.touches[0].clientX - rect.left;
		}

		const xInvert = $xScale.invert(offsetX);
		const closest = closestTo(new Date(xInvert), compareDates);

		if (!closest) return undefined;

		return dataset.find((d) => d.time === closest.getTime());
	}

	/**
	 * Handle pointer move with series key
	 * @param {MouseEvent|TouchEvent} evt
	 * @param {string} key
	 */
	function handlePointerMove(evt, key) {
		const item = findClosestDataPoint(evt);
		if (item) {
			onmousemove?.({ data: item, key });
		}
	}

	/**
	 * Handle pointer up with series key
	 * @param {MouseEvent|TouchEvent} evt
	 * @param {string} _key
	 */
	function handlePointerUp(evt, _key) {
		const item = findClosestDataPoint(evt);
		if (item) {
			onpointerup?.(item);
		}
	}

	/**
	 * Handle mouse out
	 */
	function handleMouseOut() {
		onmouseout?.();
	}
</script>

{#if display === 'line'}
	<g class="line-group" role="group">
		{#each $data as d, i (i)}
			{@const seriesKey = d.key || d.group}

			<!-- Optional dots for line chart -->
			{#if showLineDots && d.values?.length > 1}
				{#each d.values as point (point.time)}
					<circle
						class="line-dot"
						role="presentation"
						cx={$xGet(point)}
						cy={$yGet(point)}
						r={dotRadius}
						fill={dotFill}
						stroke={dotStroke}
						stroke-width={dotStrokeWidth}
						onmousemove={(e) => handlePointerMove(e, seriesKey)}
						onmouseout={handleMouseOut}
						ontouchmove={(e) => handlePointerMove(e, seriesKey)}
						onblur={handleMouseOut}
						onpointerup={(e) => handlePointerUp(e, seriesKey)}
					/>
				{/each}
			{/if}

			<!-- Line path -->
			<path
				class="path-line"
				role="presentation"
				d={lineGen(d.values)}
				fill="transparent"
				stroke={seriesColours[$z(d)]}
				stroke-width={strokeWidth}
				opacity={getOpacity(d, 1, 0.3)}
			/>
		{/each}
	</g>
{/if}

{#if display === 'area'}
	<g class="area-group" role="group">
		{#each $data as d, i (i)}
			{@const seriesKey = d.key || d.group}

			<path
				class="path-area"
				role="presentation"
				d={areaGen(d)}
				fill={seriesColours[$z(d)]}
				stroke="none"
				opacity={getOpacity(d, 1, 0.5)}
				onmousemove={(e) => handlePointerMove(e, seriesKey)}
				onmouseout={handleMouseOut}
				ontouchmove={(e) => handlePointerMove(e, seriesKey)}
				onblur={handleMouseOut}
				onpointerup={(e) => handlePointerUp(e, seriesKey)}
			/>
		{/each}
	</g>
{/if}

<style>
	.line-path {
		pointer-events: none;
	}

	.line-dot:focus,
	.area-path:focus {
		outline: none;
	}
</style>
