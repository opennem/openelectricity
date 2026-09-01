<script>
	/**
	 * OverlayArea — hatched area bands stacked ON TOP of the rendered stack,
	 * from an independently-fetched row set (e.g. solar/wind curtailment over
	 * the generation stack: "what could have been generated"). Each band fills
	 * with a diagonal hatch of its series colour, mirroring the legacy explore
	 * tool's curtailment treatment.
	 *
	 * The bands ride the visible stack's drawn top — the signed total for a
	 * standard stack (loads pull it down), or the positive sum for a diverging
	 * one — interpolated between rendered rows; bands accumulate above it in
	 * the order given.
	 *
	 * Must be rendered inside a LayerCake context.
	 */
	import { getContext } from 'svelte';
	import { area as d3Area, curveLinear } from 'd3-shape';
	import { nearestIndexOfTime } from '../binary-search.js';
	import { perfSpan } from '../perf.js';

	const { xScale, yScale } = getContext('LayerCake');

	/**
	 * @typedef {Object} Props
	 * @property {any[]} dataset - Overlay rows with `time` and the series keys
	 * @property {Array<{ id: string, colour: string }>} series - Bands, bottom-up
	 * @property {any[]} baseRows - The chart's rendered (aggregated) rows
	 * @property {string[]} baseKeys - Visible series keys forming the stack top
	 * @property {boolean} [divergingBase] - The chart stacks divergingly, so its
	 *   top is the positive sum; a standard stack's top is the signed total
	 *   (loads pull it down), and the bands must ride whichever is drawn
	 * @property {any} [curveType] - d3 curve factory, matching the host chart
	 * @property {string} patternPrefix - Unique id prefix for the hatch patterns
	 */

	/** @type {Props} */
	let {
		dataset = [],
		series = [],
		baseRows = [],
		baseKeys = [],
		divergingBase = false,
		curveType = curveLinear,
		patternPrefix
	} = $props();

	/** Drawn stack-top per rendered row, matching the chart's stacking mode. */
	let baseTops = $derived.by(() => {
		const keys = baseKeys;
		const diverging = divergingBase;
		return baseRows.map((row) => {
			let top = 0;
			for (const key of keys) {
				const val = row?.[key];
				if (typeof val !== 'number' || Number.isNaN(val)) continue;
				if (diverging) {
					if (val > 0) top += val;
				} else {
					top += val;
				}
			}
			return { time: row.time, top };
		});
	});

	/** Stack-top value at `time`, linearly interpolated between rendered rows —
	 *  the drawn stack interpolates between its (coarser) samples, so a
	 *  step-nearest join would detach the bands from the solar area on steep
	 *  ramps. Clamped to the end rows outside the rendered range. */
	let baseAt = $derived.by(() => {
		const tops = baseTops;
		return (/** @type {number} */ time) => {
			if (!tops.length) return 0;
			const idx = nearestIndexOfTime(tops, time);
			const at = tops[Math.max(0, Math.min(idx, tops.length - 1))];
			const neighbour = time < at.time ? tops[idx - 1] : tops[idx + 1];
			if (!neighbour || neighbour.time === at.time) return at.top;
			const t = (time - at.time) / (neighbour.time - at.time);
			return at.top + (neighbour.top - at.top) * Math.max(0, Math.min(1, t));
		};
	});

	// Reuse one generator and reset its accessors for each band.
	const bandGen = d3Area();

	let bands = $derived.by(() => {
		if (!dataset.length || !series.length || !$xScale || !$yScale) return [];
		return perfSpan('chart:overlay-area', () => {
			/** @type {Array<{ id: string, colour: string, path: string }>} */
			const out = [];
			// Running lower edge per row index, starting at the stack top.
			const lower = dataset.map((row) => baseAt(row.time));
			for (const { id, colour } of series) {
				const upper = dataset.map((row, i) => {
					const val = row[id];
					return lower[i] + (typeof val === 'number' && val > 0 ? val : 0);
				});
				bandGen
					.defined((/** @type {any} */ row, /** @type {number} */ i) =>
						Number.isFinite(lower[i] + upper[i])
					)
					.x((/** @type {any} */ row) => $xScale(row.time))
					.y0((/** @type {any} */ row, /** @type {number} */ i) => $yScale(lower[i]))
					.y1((/** @type {any} */ row, /** @type {number} */ i) => $yScale(upper[i]))
					.curve(curveType ?? curveLinear);
				const path = bandGen(/** @type {any} */ (dataset)) || '';
				if (path) out.push({ id, colour, path });
				for (let i = 0; i < lower.length; i++) lower[i] = upper[i];
			}
			return out;
		});
	});
</script>

<defs>
	{#each bands as band (band.id)}
		<pattern
			id="{patternPrefix}-{band.id}"
			patternUnits="userSpaceOnUse"
			width="6"
			height="6"
			patternTransform="rotate(45)"
		>
			<rect width="6" height="6" fill={band.colour} fill-opacity="0.85" />
			<line x1="0" y1="0" x2="0" y2="6" stroke="white" stroke-opacity="0.65" stroke-width="2.5" />
		</pattern>
	{/each}
</defs>

{#each bands as band (band.id)}
	<path
		d={band.path}
		class="overlay-area"
		data-series-id={band.id}
		fill="url(#{patternPrefix}-{band.id})"
		stroke={band.colour}
		stroke-width="0.5"
		pointer-events="none"
	/>
{/each}
