<script>
	import { arc as d3Arc } from 'd3-shape';
	import { interpolateRgb } from 'd3-interpolate';
	import { PROFILE_DAY_START, profileClock } from './profile-chart.js';
	import { formatProfileDay } from './time-of-day.js';
	import { dialAngle } from './dial.js';
	import DialReadout from './DialReadout.svelte';
	import DialFace, { dialMargin } from './DialFace.svelte';
	import { hoverFade } from '$lib/components/charts/v2/hover-fade.js';
	import DialNight from './DialNight.svelte';

	/**
	 * RadialHeatmap — each ring is a day on a 24-hour dial (noon at the top,
	 * running clockwise — `dial.js`; the oldest day innermost, the latest
	 * outermost). Each cell is one slot, shaded from
	 * near-white to the series colour by value; missing readings stay blank.
	 * Cells paint to a canvas (thousands at 5-minute slots); the window's
	 * average night (`DialNight`, a translucent wash the cells read through),
	 * the dial, labels and hover outline are SVG above it, and both carry
	 * `data-png-layer` inside a
	 * `data-chart-area` root for PNG export. Hover reports the slot
	 * (`onhoverchange`) and the ring's day (`onhoverday`), drawing a sibling's
	 * hovered slot (`syncHoverTime`) and day (`activeDay`).
	 *
	 * @type {{
	 *   days: Array<{date: string, values: Array<number | null>}>,
	 *   slotMs: number,
	 *   colour: string,
	 *   unit: string,
	 *   label: string,
	 *   daylight?: import('./types.js').Daylight | null,
	 *   large?: boolean,
	 *   syncHoverTime?: number,
	 *   activeDay?: string | null,
	 *   onhoverchange?: (time: number | undefined) => void,
	 *   onhoverday?: (date: string | null) => void
	 * }}
	 */
	let {
		days,
		slotMs,
		colour,
		unit,
		label,
		daylight = null,
		large = false,
		syncHoverTime = undefined,
		activeDay = null,
		onhoverchange = undefined,
		onhoverday = undefined
	} = $props();

	const TAU = 2 * Math.PI;
	const EMPTY = '#F1F0ED';

	let width = $state(0);
	let size = $derived(Math.max(160, width));
	let outer = $derived(size / 2 - dialMargin(large));
	let inner = $derived(outer * 0.22);
	let rings = $derived(
		days.map(({ date, values }) => ({ key: date, label: formatProfileDay(date), values }))
	);
	let ringWidth = $derived((outer - inner) / Math.max(1, rings.length));
	let slots = $derived(rings[0]?.values.length ?? 0);
	/** @param {number} slot */
	const slotAngle = (slot) => dialAngle((slot / Math.max(1, slots)) * 24);
	let range = $derived.by(() => {
		const values = rings.flatMap(({ values }) => values.filter((value) => value !== null));
		return { min: Math.min(0, ...values), max: Math.max(0, ...values) || 1 };
	});
	let shade = $derived(interpolateRgb('#FAF9F6', colour));
	/** @param {number | null} value */
	const fill = (value) =>
		value === null ? EMPTY : shade((value - range.min) / (range.max - range.min || 1));

	let canvas = $state(/** @type {HTMLCanvasElement | undefined} */ (undefined));
	// Paint the cells: a canvas draw is a DOM side effect, so an effect.
	$effect(() => {
		if (!canvas) return;
		const ratio = window.devicePixelRatio || 1;
		canvas.width = size * ratio;
		canvas.height = size * ratio;
		const context = canvas.getContext('2d');
		if (!context) return;
		// Scale to device pixels and centre the dial; the translation is in device
		// pixels too, so it scales with the ratio.
		context.setTransform(ratio, 0, 0, ratio, (size / 2) * ratio, (size / 2) * ratio);
		context.clearRect(-size / 2, -size / 2, size, size);
		rings.forEach(({ values }, ring) => {
			const r0 = inner + ring * ringWidth;
			values.forEach((value, slot) => {
				// Canvas angles start at 3 o'clock; dial angles at the top.
				const start = slotAngle(slot) - Math.PI / 2;
				const end = slotAngle(slot + 1) - Math.PI / 2;
				context.beginPath();
				context.arc(0, 0, r0 + ringWidth, start, end);
				context.arc(0, 0, r0, end, start, true);
				context.closePath();
				const colour = fill(value);
				context.fillStyle = colour;
				context.fill();
				// A hairline in the cell's own colour closes anti-aliasing seams.
				context.strokeStyle = colour;
				context.lineWidth = 0.5;
				context.stroke();
			});
		});
	});

	let ownHover = $state(/** @type {{slot: number, ring: number} | null} */ (null));
	let hoverSlot = $derived(
		ownHover?.slot ??
			(syncHoverTime === undefined
				? undefined
				: Math.round((syncHoverTime - PROFILE_DAY_START) / slotMs))
	);
	let hoverRing = $derived(
		ownHover?.ring ?? (activeDay ? rings.findIndex((ring) => ring.key === activeDay) : -1)
	);
	/** @param {PointerEvent} event */
	function hover(event) {
		const bounds = /** @type {HTMLElement} */ (event.currentTarget).getBoundingClientRect();
		const dx = event.clientX - bounds.left - size / 2;
		const dy = event.clientY - bounds.top - size / 2;
		const radius = Math.hypot(dx, dy);
		const ring = Math.floor((radius - inner) / ringWidth);
		if (radius < inner || ring >= rings.length) return leave();
		// Clockwise from the top, as a fraction of the day from midnight.
		const turn = ((Math.atan2(dx, -dy) + TAU) % TAU) / TAU;
		const slot = Math.min(slots - 1, Math.floor(((turn + 0.5) % 1) * slots));
		if (ownHover?.slot === slot && ownHover.ring === ring) return;
		if (ownHover?.ring !== ring) onhoverday?.(rings[ring].key);
		if (ownHover?.slot !== slot) onhoverchange?.(PROFILE_DAY_START + slot * slotMs);
		ownHover = { slot, ring };
	}
	function leave() {
		if (!ownHover) return;
		ownHover = null;
		onhoverchange?.(undefined);
		onhoverday?.(null);
	}
	const sector = d3Arc();
	let outline = $derived(
		hoverSlot === undefined
			? null
			: sector({
					innerRadius: hoverRing >= 0 ? inner + hoverRing * ringWidth : inner,
					outerRadius: hoverRing >= 0 ? inner + (hoverRing + 1) * ringWidth : outer,
					startAngle: slotAngle(hoverSlot),
					endAngle: slotAngle(hoverSlot + 1)
				})
	);
	let readout = $derived(
		hoverSlot === undefined || hoverRing < 0
			? null
			: { ring: rings[hoverRing], value: rings[hoverRing]?.values[hoverSlot] ?? null }
	);
	let hoverStart = $derived(hoverSlot === undefined ? 0 : PROFILE_DAY_START + hoverSlot * slotMs);
</script>

<div class="relative">
	<DialReadout
		label={readout
			? `${readout.ring.label} · ${profileClock(hoverStart)}–${profileClock(hoverStart + slotMs)}`
			: null}
		value={readout?.value ?? null}
		{unit}
		{large}
	/>
	<!-- The dial keeps the card's side padding and is measured inside it, at
	     most `--dial-max` wide (the lightbox's viewport cap). Pulled up into
	     the dial margin's slack above 12:00 (the margin is sized for the wider
	     side labels), so it sits close to the readout. -->
	<div class="px-6">
		<div
			bind:clientWidth={width}
			class="mx-auto flex max-w-(--dial-max) justify-center {large ? '-mt-[26px]' : '-mt-[18px]'}"
		>
			<div
				data-chart-area
				class="relative"
				style:width="{size}px"
				style:height="{size}px"
				role="presentation"
				onpointermove={hover}
				onpointerleave={leave}
			>
				<canvas
					bind:this={canvas}
					data-png-layer
					class="absolute inset-0"
					style:width="{size}px"
					style:height="{size}px"
					aria-hidden="true"
				></canvas>
				<svg
					data-png-layer
					class="absolute inset-0"
					width={size}
					height={size}
					viewBox="{-size / 2} {-size / 2} {size} {size}"
					role="img"
					aria-label="{label}: each ring is a day on a 24-hour dial"
					pointer-events="none"
				>
					<!-- Over the cells, which read through it, and under the strokes; the overlay never takes
				     the pointer, so hover reaches the chart area beneath. -->
					{#if daylight}
						<DialNight radius={outer + 8} {daylight} overlay />
					{/if}
					<circle r={outer} fill="none" class="stroke-mid-warm-grey" />
					<circle r={inner} fill="none" class="stroke-mid-grey" />
					{#if outline}
						<path
							d={outline}
							fill="none"
							class="stroke-dark-grey"
							stroke-width="1.5"
							transition:hoverFade
						/>
					{/if}
					<DialFace
						{outer}
						{large}
						hover={hoverSlot === undefined
							? null
							: { hours: (hoverSlot * slotMs) / 3_600_000, label: profileClock(hoverStart) }}
					/>
				</svg>
			</div>
		</div>
	</div>
</div>
