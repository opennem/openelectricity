<script>
	/**
	 * StepHoverBand Component
	 *
	 * Renders highlight and focus rectangle bands for step/category-like hover
	 * in time-series charts using step curves. Each band spans from the data
	 * point's time to the next data point's time, covering the full chart height.
	 */
	import { getContext } from 'svelte';

	const { xScale, yScale, height } = getContext('LayerCake');

	/**
	 * @typedef {Object} Props
	 * @property {any[]} [dataset] - Dataset with time property (sorted by time)
	 * @property {number | undefined} [hoverTime] - Currently hovered time
	 * @property {number | undefined} [focusTime] - Currently focused (locked) time
	 * @property {string} [highlightFill] - Fill color for hover highlight
	 * @property {string} [focusStroke] - Stroke color for focus border
	 */

	/** @type {Props} */
	let {
		dataset = [],
		hoverTime,
		focusTime,
		highlightFill = 'rgba(0, 0, 0, 0.08)',
		focusStroke = '#374151'
	} = $props();

	/**
	 * Get the pixel x and width for a band at the given time
	 * @param {number | undefined} time
	 * @returns {{ x: number, width: number } | null}
	 */
	function getBandPixels(time) {
		if (time === undefined || !dataset?.length) return null;

		const idx = dataset.findIndex((d) => d.time === time);
		if (idx === -1) return null;

		const start = time;
		let end;

		if (idx < dataset.length - 1) {
			end = dataset[idx + 1].time;
		} else if (idx > 0) {
			// Last point: extrapolate using previous interval
			const prevInterval = time - dataset[idx - 1].time;
			end = time + prevInterval;
		} else {
			return null;
		}

		const x1 = $xScale(start);
		const x2 = $xScale(end);
		return { x: Math.min(x1, x2), width: Math.abs(x2 - x1) };
	}

	let hoverBand = $derived.by(() => getBandPixels(hoverTime));
	let focusBand = $derived.by(() => getBandPixels(focusTime));

	let yRange = $derived($yScale?.range() ?? [0, $height]);
	let bandY = $derived(Math.min(yRange[0], yRange[1]));
	let bandHeight = $derived(Math.abs(yRange[1] - yRange[0]));
</script>

<!-- Hover highlight band -->
{#if hoverBand && hoverBand.width > 0}
	<rect
		x={hoverBand.x}
		y={bandY}
		width={hoverBand.width}
		height={bandHeight}
		fill={highlightFill}
		pointer-events="none"
	/>
{/if}

<!-- Focus border band -->
{#if focusBand && focusBand.width > 0}
	<rect
		x={focusBand.x}
		y={bandY}
		width={focusBand.width}
		height={bandHeight}
		fill="none"
		stroke={focusStroke}
		stroke-width="2"
		pointer-events="none"
	/>
{/if}
