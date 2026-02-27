<script>
	/**
	 * Area Component (v2)
	 *
	 * Renders non-stacked (overlay) area charts where each series
	 * is filled independently from the zero baseline.
	 * Uses semi-transparency so overlapping areas remain visible.
	 */
	import { getContext } from 'svelte';
	import { area, curveLinear } from 'd3-shape';
	import { closestTo } from 'date-fns';

	const { data, xGet, xScale, yScale, z } = getContext('LayerCake');

	/**
	 * @typedef {Object} Props
	 * @property {TimeSeriesData[]} [dataset] - Raw dataset for event lookups
	 * @property {*} [curveType] - D3 curve type
	 * @property {Object.<string, string>} [seriesColours] - Map of series id to colour
	 * @property {string | null} [highlightId] - Currently highlighted series id
	 * @property {boolean} [stepMode] - Use floor-based band detection (for step curves)
	 * @property {(evt: { data: TimeSeriesData, key?: string }) => void} [onmousemove]
	 * @property {() => void} [onmouseout]
	 * @property {(data: TimeSeriesData) => void} [onpointerup]
	 */

	/** @type {Props} */
	let {
		dataset = [],
		curveType = curveLinear,
		seriesColours = {},
		highlightId = null,
		stepMode = false,
		onmousemove,
		onmouseout,
		onpointerup
	} = $props();

	// Extract unique dates for event lookups
	let compareDates = $derived([...new Set(dataset.map((d) => d.date))]);

	// Area generator — each series goes from zero baseline to its value
	let areaGen = $derived(
		area()
			.x((/** @type {any} */ d) => $xGet(d))
			.y0(() => $yScale(0))
			.y1((/** @type {any} */ d) => $yScale(d.value))
			.curve(curveType)
			.defined((/** @type {any} */ d) => d.value !== null && !isNaN(d.value))
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

		if (stepMode) {
			// Floor-based: find last data point with time <= cursor
			const cursorTime = new Date(xInvert).getTime();
			let found = undefined;
			for (const d of dataset) {
				if (d.time <= cursorTime) {
					found = d;
				} else {
					break;
				}
			}
			return found;
		}

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
	 * Handle pointer up
	 * @param {MouseEvent|TouchEvent} evt
	 * @param {string} _key
	 */
	function handlePointerUp(evt, _key) {
		// Cmd/Ctrl+click is used for zoom — don't trigger focus
		if ('metaKey' in evt && (evt.metaKey || evt.ctrlKey)) return;
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

<g class="area-overlay-group" role="group">
	{#each $data as d, i (i)}
		{@const seriesKey = d.key || d.group}
		{@const baseColor = seriesColours[$z(d)]}

		<path
			class="path-area-overlay"
			role="presentation"
			d={areaGen(d.values)}
			fill={baseColor}
			stroke={baseColor}
			stroke-width="1"
			opacity={getOpacity(d, 0.6, 0.2)}
			onmousemove={(e) => handlePointerMove(e, seriesKey)}
			onmouseout={handleMouseOut}
			ontouchmove={(e) => handlePointerMove(e, seriesKey)}
			onblur={handleMouseOut}
			onpointerup={(e) => handlePointerUp(e, seriesKey)}
		/>
	{/each}
</g>

<style>
	.path-area-overlay:focus {
		outline: none;
	}
</style>
