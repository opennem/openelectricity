<script>
	import { getContext } from 'svelte';
	import { fade } from 'svelte/transition';

	const { xScale, yScale } = getContext('LayerCake');

	/**
	 * @typedef {{ time: number, value: number }} TrendPoint
	 * @typedef {{ key: string, points: TrendPoint[] }} Trend
	 *
	 * @typedef {Object} Props
	 * @property {Trend[]} [trends]
	 * @property {Object.<string, string>} [colours] series key → stroke colour
	 * @property {TimeSeriesData | undefined} [hoverData]
	 * @property {string} [strokeWidth]
	 * @property {string} [dash] stroke-dasharray pattern
	 * @property {number} [opacity] foreground (drawn-to-cursor) opacity
	 * @property {number} [faintOpacity] background full-line opacity
	 * @property {any} [fadeTransition]
	 */

	/** @type {Props} */
	let {
		trends = [],
		colours = {},
		hoverData = undefined,
		strokeWidth = '4px',
		dash = '1,10',
		opacity = 0.85,
		faintOpacity = 0.15,
		fadeTransition = { duration: 300 }
	} = $props();

	let hoverTime = $derived(/** @type {any} */ (hoverData)?.time ?? null);

	/**
	 * Clip a trend polyline to everything at or before `t`, interpolating the cut
	 * point so the bright line ends exactly under the cursor. Returns the full line
	 * when not hovering, and an empty array when the cursor sits before the trend
	 * starts (i.e. hovering the historical region) — mirroring how the historical
	 * lines fade everything past the hover point.
	 *
	 * @param {TrendPoint[]} points
	 * @param {number | null} t
	 * @returns {TrendPoint[]}
	 */
	function clip(points, t) {
		if (t == null) return points;
		const out = [];
		for (let i = 0; i < points.length; i++) {
			const p = points[i];
			if (p.time <= t) {
				out.push(p);
			} else {
				const prev = points[i - 1];
				if (prev) {
					const fraction = (t - prev.time) / (p.time - prev.time);
					out.push({ time: t, value: prev.value + fraction * (p.value - prev.value) });
				}
				break;
			}
		}
		return out;
	}

	/** @param {TrendPoint[]} points */
	const pathFor = (points) =>
		points
			.map((p, i) => `${i ? 'L' : 'M'}${$xScale(new Date(p.time))},${$yScale(p.value)}`)
			.join('');
</script>

<g class="trend-group" transition:fade={fadeTransition}>
	{#each trends as trend (trend.key)}
		{@const colour = colours[trend.key] ?? '#777'}
		{@const bright = clip(trend.points, hoverTime)}
		<path
			class="trend-line"
			d={pathFor(trend.points)}
			stroke={colour}
			stroke-width={strokeWidth}
			stroke-dasharray={dash}
			style="opacity:{faintOpacity};"
		/>
		{#if bright.length > 1}
			<path
				class="trend-line"
				d={pathFor(bright)}
				stroke={colour}
				stroke-width={strokeWidth}
				stroke-dasharray={dash}
				style="opacity:{opacity};"
			/>
		{/if}
	{/each}
</g>

<style>
	.trend-line {
		fill: none;
		stroke-linecap: round;
	}
</style>
