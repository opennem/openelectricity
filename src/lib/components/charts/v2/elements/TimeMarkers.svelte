<script>
	/**
	 * TimeMarkers Element
	 *
	 * Labelled vertical markers at exact times (a comparison's A and B, or a
	 * picked reading such as "Max net power 32.1 GW"): a dark line with a chip
	 * at the top of the plot, as wide as its label. With `band`, the
	 * span between the first two markers is faintly shaded. A marker outside
	 * the plot becomes a chip pinned to that edge with an arrow, so the reader
	 * knows which way it lies.
	 *
	 * `armed` names the marker the next click sets: while `hoverTime` is set,
	 * a dashed ghost of it follows the pointer. The ghost is `data-png-exclude`;
	 * the markers themselves are exported, so an image explains its comparison.
	 * On a step chart (`stepData`) each marker sits in the middle of its
	 * bucket's step.
	 */
	import { getContext } from 'svelte';
	import { stepBandCentre } from './step-band.js';

	const { xScale, width, height } = getContext('LayerCake');

	/**
	 * @typedef {Object} Props
	 * @property {Array<{id: string, time: number, label: string}>} markers
	 * @property {string | null} [armed] - The marker id the next click sets
	 * @property {{time: number, label: string} | null} [preview] - A ghost at a time
	 *   named elsewhere (a hovered metric), in place of the armed one
	 * @property {number | undefined} [hoverTime] - Where the ghost marker sits: the
	 *   pointer's own hover only (not a synced peer's or a pinned time)
	 * @property {boolean} [band] - Shade between the first two markers
	 * @property {string} [colour] - Line and chip colour
	 * @property {Array<{time: number}> | null} [stepData] - On a step chart, its rows:
	 *   a marker then sits in the middle of its bucket's step, not at its start
	 */

	/** @type {Props} */
	let {
		markers,
		armed = null,
		preview = null,
		hoverTime,
		band = false,
		colour = '#353535',
		stepData = null
	} = $props();

	const CHIP_W = 16;
	const CHIP_H = 15;
	/** Room an edge chip's arrow takes beside its label. */
	const ARROW_W = 8;
	/** Approximate advance (px) of one character of the 10px semibold chip text. */
	const CHAR_PX = 6;

	/** A chip's width: a letter's square, or its label's length.
	 * @param {string} label */
	const chipWidth = (label) => Math.max(CHIP_W, Math.ceil(label.length * CHAR_PX + 8));

	/** Where a bucket's marker sits: its time, or its step's middle.
	 * @param {number} time */
	const xOf = (time) =>
		/** @type {number} */ ($xScale(stepData?.length ? stepBandCentre(time, stepData) : time));
	/** A chip's left edge: centred on its line, kept inside the plot.
	 * @param {number} x @param {number} w */
	const chipLeft = (x, w) => Math.min(Math.max(0, x - w / 2), Math.max(0, $width - w));

	let placed = $derived(
		markers.map((marker) => {
			const x = xOf(marker.time);
			const side = x < 0 ? 'left' : x > $width ? 'right' : null;
			return { ...marker, x, side };
		})
	);

	let shaded = $derived.by(() => {
		if (!band || placed.length < 2) return null;
		const [first, second] = placed;
		const left = Math.max(0, Math.min(first.x, second.x));
		const right = Math.min($width, Math.max(first.x, second.x));
		return right > left ? { left, right } : null;
	});

	let ghost = $derived.by(() => {
		if (preview) {
			const x = xOf(preview.time);
			return x >= 0 && x <= $width ? { x, label: preview.label } : null;
		}
		if (!armed || hoverTime === undefined) return null;
		const marker = markers.find((entry) => entry.id === armed);
		if (!marker || marker.time === hoverTime) return null;
		const x = xOf(hoverTime);
		return x >= 0 && x <= $width ? { x, label: marker.label } : null;
	});
</script>

<g class="time-markers pointer-events-none" aria-hidden="true">
	{#if shaded}
		<rect
			x={shaded.left}
			y="0"
			width={shaded.right - shaded.left}
			height={$height}
			fill={colour}
			opacity="0.05"
		/>
	{/if}

	{#each placed as marker (marker.id)}
		{@const chipW = chipWidth(marker.label)}
		{#if marker.side}
			{@const edgeW = chipW + ARROW_W}
			{@const x = marker.side === 'left' ? 0 : $width - edgeW}
			<g transform="translate({x}, 2)">
				<rect width={edgeW} height={CHIP_H} rx="3" fill={colour} opacity="0.7" />
				<text
					x={edgeW / 2}
					y={CHIP_H / 2}
					dy="0.35em"
					text-anchor="middle"
					fill="white"
					font-size="10"
					font-weight="600"
					>{marker.side === 'left' ? `‹ ${marker.label}` : `${marker.label} ›`}</text
				>
			</g>
		{:else}
			<line
				x1={marker.x}
				x2={marker.x}
				y1={CHIP_H + 2}
				y2={$height}
				stroke={colour}
				stroke-width={marker.id === armed ? 1.5 : 1}
			/>
			<g transform="translate({chipLeft(marker.x, chipW)}, 2)">
				<rect width={chipW} height={CHIP_H} rx="3" fill={colour} />
				<text
					x={chipW / 2}
					y={CHIP_H / 2}
					dy="0.35em"
					text-anchor="middle"
					fill="white"
					font-size="10"
					font-weight="600">{marker.label}</text
				>
			</g>
		{/if}
	{/each}

	{#if ghost}
		{@const ghostW = chipWidth(ghost.label)}
		<!-- Muted strokes and text, but an opaque chip: the hover line beneath
		     never shows through it. -->
		<g data-png-exclude>
			<line
				x1={ghost.x}
				x2={ghost.x}
				y1={CHIP_H + 2}
				y2={$height}
				stroke={colour}
				stroke-opacity="0.55"
				stroke-dasharray="3 3"
			/>
			<g transform="translate({chipLeft(ghost.x, ghostW)}, 2)">
				<rect
					width={ghostW}
					height={CHIP_H}
					rx="3"
					fill="white"
					stroke={colour}
					stroke-opacity="0.55"
					stroke-dasharray="2 2"
				/>
				<text
					x={ghostW / 2}
					y={CHIP_H / 2}
					dy="0.35em"
					text-anchor="middle"
					fill={colour}
					fill-opacity="0.7"
					font-size="10"
					font-weight="600">{ghost.label}</text
				>
			</g>
		</g>
	{/if}
</g>
