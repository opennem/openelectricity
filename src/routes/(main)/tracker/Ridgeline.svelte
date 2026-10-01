<script>
	import { area as d3Area, curveMonotoneX, curveStepAfter } from 'd3-shape';
	import { scaleLinear } from 'd3-scale';
	import { rgb } from 'd3-color';
	import { PROFILE_DAY_END, PROFILE_DAY_START, profileClock } from './profile-chart.js';
	import { OE_RED } from './tracker-overlays.js';
	import { formatProfileDay } from './time-of-day.js';

	/**
	 * Ridgeline — one offset curve per day for comparing the shapes of a
	 * series' days: the oldest at the top, each later day in front of and
	 * overlapping the one above (an opaque tint hides the ridges behind, and each
	 * casts a soft shadow up onto the one behind it for depth), all on one
	 * shared amplitude scale over the
	 * whole synthetic day. An optional `today` ridge sits at the front, outlined
	 * in OE red. Hovering reports the slot through `onhoverchange`, and the day
	 * whose ridge is under the pointer through `onhoverday`. That day's ridge
	 * (or a sibling's, through `activeDay`) is highlighted. The strip
	 * reads its average; `syncHoverTime` draws a sibling chart's hover. Custom
	 * SVG (d3-shape) because Stratum has no offset baselines; the SVG carries
	 * `data-png-layer` inside a `data-chart-area` root for PNG export.
	 *
	 * @type {{
	 *   days: Array<{date: string, values: Array<number | null>}>,
	 *   today?: Array<number | null> | null,
	 *   average: Array<number | null>,
	 *   slotMs: number,
	 *   colour: string,
	 *   unit: string,
	 *   label: string,
	 *   heightPx: number,
	 *   step?: boolean,
	 *   syncHoverTime?: number,
	 *   onhoverchange?: (time: number | undefined) => void,
	 *   onhoverday?: (date: string | null) => void,
	 *   activeDay?: string | null
	 * }}
	 */
	let {
		days,
		today = null,
		average,
		slotMs,
		colour,
		unit,
		label,
		heightPx,
		step = false,
		syncHoverTime = undefined,
		onhoverchange = undefined,
		onhoverday = undefined,
		activeDay = null
	} = $props();

	const PAD = { top: 6, right: 12, bottom: 22, left: 52 };
	/** Each ridge may rise this many row steps above its baseline. */
	const OVERLAP = 2.2;
	/** The least room between baselines: longer windows grow the chart past
	 *  the card's height (14 days a little, 28 days a lot) rather than
	 *  squashing their ridges flat. */
	const MIN_ROW = 18;
	const TICKS = [0, 6, 12, 18, 24];
	/** @param {number} value */
	const format = (value) => value.toLocaleString('en-AU', { maximumFractionDigits: 1 });

	let width = $state(0);
	let ridges = $derived([
		...days.map(({ date, values }) => ({
			key: date,
			label: formatProfileDay(date),
			values,
			today: false
		})),
		...(today ? [{ key: 'today', label: 'Today', values: today, today: true }] : [])
	]);
	let chartHeight = $derived(
		Math.max(heightPx, PAD.top + PAD.bottom + (Math.max(1, ridges.length - 1) + OVERLAP) * MIN_ROW)
	);
	let plotHeight = $derived(Math.max(60, chartHeight - PAD.top - PAD.bottom));
	let rowStep = $derived(plotHeight / (Math.max(1, ridges.length - 1) + OVERLAP));
	let amplitude = $derived(rowStep * OVERLAP);
	/** @param {number} index */
	const baseline = (index) => PAD.top + amplitude + index * rowStep;
	let peak = $derived(
		Math.max(
			...ridges.flatMap(({ values }) =>
				values.filter((value) => value !== null).map((value) => Math.abs(value))
			),
			0
		) || 1
	);
	let x = $derived(
		scaleLinear()
			.domain([PROFILE_DAY_START, PROFILE_DAY_END])
			.range([PAD.left, Math.max(PAD.left + 1, width - PAD.right)])
	);
	/** @param {number} slot */
	const slotTime = (slot) => PROFILE_DAY_START + slot * slotMs;
	/** @param {Array<number | null>} values @param {number} index */
	function ridgePath(values, index) {
		const base = baseline(index);
		return (
			d3Area()
				.defined((/** @type {any} */ value) => value !== null)
				.x((_, slot) => x(slotTime(slot)))
				.y0(base)
				.y1((/** @type {any} */ value) => base - (value / peak) * amplitude)
				.curve(step ? curveStepAfter : curveMonotoneX)(/** @type {any} */ (values)) ?? ''
		);
	}
	/** An opaque tint of the series colour (`strength` of the way from white),
	 * so each ridge hides the ones behind.
	 * @param {number} strength */
	function tintOf(strength) {
		const { r, g, b } = rgb(colour);
		/** @param {number} channel */
		const mix = (channel) => Math.round(255 - (255 - channel) * strength);
		return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
	}
	let tint = $derived(tintOf(0.3));
	/** The hovered day's ridge reads stronger. */
	let activeTint = $derived(tintOf(0.55));
	const uid = $props.id();
	const shadowId = `ridge-shadow-${uid}`;

	let ownHover = $state(/** @type {number | undefined} */ (undefined));
	let hoverTime = $derived(ownHover ?? syncHoverTime);
	let hoverSlot = $derived(
		hoverTime === undefined ? undefined : Math.round((hoverTime - PROFILE_DAY_START) / slotMs)
	);
	let ownDay = $state(/** @type {string | null} */ (null));
	/** @param {PointerEvent} event */
	function hover(event) {
		const svg = /** @type {SVGSVGElement} */ (event.currentTarget);
		const bounds = svg.getBoundingClientRect();
		// Each ridge owns the band just above its baseline: the first baseline
		// at or below the pointer. Today's ridge has no table column.
		const top = event.clientY - bounds.top;
		const index = ridges.findIndex((_, ridge) => baseline(ridge) >= top);
		const ridge = ridges[index === -1 ? ridges.length - 1 : index];
		const day = ridge && !ridge.today ? ridge.key : null;
		if (day !== ownDay) {
			ownDay = day;
			onhoverday?.(day);
		}
		const left = event.clientX - bounds.left;
		const slot = Math.max(
			0,
			Math.min(average.length - 1, Math.floor((x.invert(left) - PROFILE_DAY_START) / slotMs))
		);
		const time = slotTime(slot);
		if (time === ownHover) return;
		ownHover = time;
		onhoverchange?.(time);
	}
	function leave() {
		ownHover = undefined;
		onhoverchange?.(undefined);
		ownDay = null;
		onhoverday?.(null);
	}
</script>

<div bind:clientWidth={width} class="relative">
	<div
		data-testid="chart-tooltip-strip"
		class="flex h-[21px] items-center justify-end gap-2 whitespace-nowrap text-xs"
	>
		{#if hoverSlot !== undefined && hoverTime !== undefined}
			<span class="bg-white/40 px-3 py-1 font-light"
				>{profileClock(hoverTime)}–{profileClock(hoverTime + slotMs)}</span
			>
			<span class="flex items-center gap-2 bg-light-warm-grey px-2 py-1">
				<span class="size-2.5 rounded-sm" style:background-color={colour}></span>
				<span class="text-mid-grey">Average</span>
				<strong class="font-semibold"
					>{average[hoverSlot] == null ? '—' : `${format(average[hoverSlot] ?? 0)} ${unit}`}</strong
				>
				{#if today && today[hoverSlot] != null}
					<span style:color={OE_RED}>Today {format(today[hoverSlot] ?? 0)}</span>
				{/if}
			</span>
		{/if}
	</div>
	<div data-chart-area class="relative">
		<svg
			data-png-layer
			width={width || undefined}
			height={chartHeight}
			role="img"
			aria-label="{label}: one curve per day"
			onpointermove={hover}
			onpointerleave={leave}
		>
			<defs>
				<!-- Each ridge casts a very subtle shadow up onto the one behind it. -->
				<filter id={shadowId} x="-5%" y="-40%" width="110%" height="160%">
					<feDropShadow dx="0" dy="-1" stdDeviation="1.5" flood-color="#000" flood-opacity="0.08" />
				</filter>
			</defs>
			{#each ridges as ridge, index (ridge.key)}
				{@const active = ridge.key === (activeDay ?? ownDay)}
				<g>
					<path
						d={ridgePath(ridge.values, index)}
						fill={active ? activeTint : tint}
						filter="url(#{shadowId})"
						stroke={ridge.today ? OE_RED : colour}
						stroke-width={ridge.today || active ? 2.25 : 1.25}
						data-active={active || undefined}
					/>
					<line
						x1={PAD.left}
						x2={x(PROFILE_DAY_END)}
						y1={baseline(index)}
						y2={baseline(index)}
						class="stroke-warm-grey"
					/>
					{#if rowStep >= 9 || ridge.today || active || index === 0 || index === ridges.length - 1}
						<text
							x={PAD.left - 6}
							y={baseline(index)}
							text-anchor="end"
							dominant-baseline="middle"
							class="text-xxs {ridge.today
								? ''
								: active
									? 'fill-dark-grey font-semibold'
									: 'fill-mid-grey'}"
							fill={ridge.today ? OE_RED : undefined}>{ridge.label}</text
						>
					{/if}
				</g>
			{/each}
			{#if hoverTime !== undefined}
				<line
					x1={x(hoverTime)}
					x2={x(hoverTime)}
					y1={PAD.top}
					y2={baseline(ridges.length - 1)}
					class="stroke-dark-grey"
					pointer-events="none"
				/>
			{/if}
			{#each TICKS as hour (hour)}
				<text
					x={x(PROFILE_DAY_START + hour * 3_600_000)}
					y={chartHeight - 6}
					text-anchor={hour === 0 ? 'start' : hour === 24 ? 'end' : 'middle'}
					class="fill-mid-grey text-xxs">{profileClock(PROFILE_DAY_START + hour * 3_600_000)}</text
				>
			{/each}
		</svg>
	</div>
</div>
