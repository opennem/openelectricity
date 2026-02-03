<script>
	/**
	 * CategoryHoverLayer Component (v2)
	 *
	 * A transparent overlay that captures mouse events for category-based charts.
	 * Uses scaleBand to determine which category column the mouse is over.
	 * Renders a highlight rectangle over the hovered category.
	 */
	import { getContext } from 'svelte';

	const { xScale, yScale, width, height, custom } = getContext('LayerCake');

	/**
	 * @typedef {Object} Props
	 * @property {any[]} [dataset] - The dataset to search
	 * @property {string} [xKey] - The key to use for x values (category)
	 * @property {string[]} [seriesNames] - List of series names for hit detection
	 * @property {boolean} [useDivergingStack] - Whether chart uses diverging stack
	 * @property {(evt: { data: any, key?: string }) => void} [onmousemove] - Mouse move callback
	 * @property {() => void} [onmouseout] - Mouse out callback
	 * @property {(data: any) => void} [onpointerup] - Pointer up (click) callback
	 * @property {string} [highlightFill] - Fill color for highlight rectangle
	 * @property {string | number | undefined} [highlightCategory] - Currently highlighted category
	 * @property {string | number | undefined} [focusCategory] - Currently focused category (shows border)
	 * @property {string} [focusStroke] - Stroke color for focus border
	 */

	/** @type {Props} */
	let {
		dataset = [],
		xKey = 'fy',
		seriesNames = [],
		useDivergingStack = false,
		onmousemove,
		onmouseout,
		onpointerup,
		highlightFill = 'rgba(0, 0, 0, 0.1)',
		highlightCategory,
		focusCategory,
		focusStroke = '#374151'
	} = $props();

	// Store width for use in functions
	let chartWidth = $derived($width || 1);
	let customData = $derived($custom);

	/**
	 * Find the category at a given x position
	 * @param {number} offsetX
	 * @returns {string | number | undefined}
	 */
	function findCategoryAtPosition(offsetX) {
		const scale = customData?.bandScale;
		if (!scale?.bandwidth) return undefined;

		const domain = scale.domain();
		const bandwidth = scale.bandwidth();

		// Convert pixel position to the 0-100 scale that bandScale uses
		const scaledX = (offsetX / chartWidth) * 100;

		// Calculate which band the x position falls into
		for (const category of domain) {
			const bandStart = scale(category);
			const bandEnd = bandStart + bandwidth;

			if (scaledX >= bandStart && scaledX <= bandEnd) {
				return category;
			}
		}

		return undefined;
	}

	/**
	 * Find the data point for a category
	 * @param {string | number} category
	 * @returns {any | undefined}
	 */
	function findDataForCategory(category) {
		return dataset.find((d) => d[xKey] === category);
	}

	// Store yScale for use in functions
	let yScaleValue = $derived($yScale);

	/**
	 * Find which series is at a given y position for a data point
	 * @param {any} dataPoint - The data point for the hovered category
	 * @param {number} offsetY - Mouse y position in pixels
	 * @returns {string | undefined}
	 */
	function findSeriesAtPosition(dataPoint, offsetY) {
		if (!dataPoint || !yScaleValue?.invert || seriesNames.length === 0) return undefined;

		// Convert pixel y to data value
		const yValue = yScaleValue.invert(offsetY);

		if (useDivergingStack) {
			// For diverging stack: positive values stack up from 0, negative stack down
			let positiveStack = 0;
			let negativeStack = 0;

			for (const name of seriesNames) {
				const value = Number(dataPoint[name]) || 0;

				if (value >= 0) {
					const stackStart = positiveStack;
					const stackEnd = positiveStack + value;
					positiveStack = stackEnd;

					if (yValue >= stackStart && yValue <= stackEnd) {
						return name;
					}
				} else {
					const stackStart = negativeStack;
					const stackEnd = negativeStack + value;
					negativeStack = stackEnd;

					if (yValue <= stackStart && yValue >= stackEnd) {
						return name;
					}
				}
			}
		} else {
			// For regular stack: all values stack from 0
			let stackPosition = 0;

			for (const name of seriesNames) {
				const value = Number(dataPoint[name]) || 0;
				const stackStart = stackPosition;
				const stackEnd = stackPosition + value;
				stackPosition = stackEnd;

				if (yValue >= stackStart && yValue <= stackEnd) {
					return name;
				}
			}
		}

		return undefined;
	}

	/**
	 * Handle pointer move
	 * @param {MouseEvent|TouchEvent} evt
	 */
	function handlePointerMove(evt) {
		let offsetX = 0;
		let offsetY = 0;

		if ('offsetX' in evt) {
			offsetX = evt.offsetX;
			offsetY = evt.offsetY;
		} else if ('touches' in evt && evt.touches.length > 0) {
			const rect = /** @type {Element} */ (evt.target).getBoundingClientRect();
			offsetX = evt.touches[0].clientX - rect.left;
			offsetY = evt.touches[0].clientY - rect.top;
		}

		const category = findCategoryAtPosition(offsetX);
		if (category !== undefined) {
			const item = findDataForCategory(category);
			if (item) {
				const seriesKey = findSeriesAtPosition(item, offsetY);
				onmousemove?.({ data: item, key: seriesKey });
			}
		}
	}

	/**
	 * Handle pointer up (click)
	 * @param {MouseEvent|TouchEvent} evt
	 */
	function handlePointerUp(evt) {
		let offsetX = 0;

		if ('offsetX' in evt) {
			offsetX = evt.offsetX;
		} else if ('touches' in evt && evt.touches.length > 0) {
			const rect = /** @type {Element} */ (evt.target).getBoundingClientRect();
			offsetX = evt.touches[0].clientX - rect.left;
		}

		const category = findCategoryAtPosition(offsetX);
		if (category !== undefined) {
			const item = findDataForCategory(category);
			if (item) {
				onpointerup?.(item);
			}
		}
	}

	/**
	 * Handle mouse out
	 */
	function handleMouseOut() {
		onmouseout?.();
	}

	// Derived values for highlight calculations
	let chartHeight = $derived($height || 0);
	let yScaleRange = $derived($yScale?.range() ?? [0, chartHeight]);

	// Calculate highlight rectangle position (convert from 0-100 scale to pixels)
	let highlightX = $derived.by(() => {
		const scale = customData?.bandScale;
		if (highlightCategory === undefined || !scale?.bandwidth) return 0;
		const bandX = scale(highlightCategory) ?? 0;
		return (bandX / 100) * chartWidth;
	});

	let highlightWidth = $derived.by(() => {
		const scale = customData?.bandScale;
		if (!scale?.bandwidth) return 0;
		return (scale.bandwidth() / 100) * chartWidth;
	});

	// Get y range for full height highlight
	let highlightY = $derived(Math.min(yScaleRange[0], yScaleRange[1]));
	let highlightHeight = $derived(Math.abs(yScaleRange[1] - yScaleRange[0]));

	// Calculate focus rectangle position
	let focusX = $derived.by(() => {
		const scale = customData?.bandScale;
		if (focusCategory === undefined || !scale?.bandwidth) return 0;
		const bandX = scale(focusCategory) ?? 0;
		return (bandX / 100) * chartWidth;
	});

	let focusWidth = $derived.by(() => {
		const scale = customData?.bandScale;
		if (!scale?.bandwidth) return 0;
		return (scale.bandwidth() / 100) * chartWidth;
	});
</script>

<!-- Transparent interaction layer - covers full chart area -->
<rect
	class="hover-layer"
	x={0}
	y={0}
	width={$width}
	height={$height}
	fill="transparent"
	role="presentation"
	onmousemove={handlePointerMove}
	onmouseout={handleMouseOut}
	ontouchmove={handlePointerMove}
	onpointerup={handlePointerUp}
	onblur={handleMouseOut}
/>

<!-- Highlight rectangle for hovered category -->
{#if highlightCategory !== undefined && highlightWidth > 0}
	<rect
		class="highlight-rect"
		x={highlightX}
		y={highlightY}
		width={highlightWidth}
		height={highlightHeight}
		fill={highlightFill}
		pointer-events="none"
	/>
{/if}

<!-- Focus border for focused category -->
{#if focusCategory !== undefined && focusWidth > 0}
	<rect
		class="focus-rect"
		x={focusX}
		y={highlightY}
		width={focusWidth}
		height={highlightHeight}
		fill="none"
		stroke={focusStroke}
		stroke-width="2"
		pointer-events="none"
	/>
{/if}

<style>
	.hover-layer:focus {
		outline: none;
	}
</style>
