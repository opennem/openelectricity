<script>
	import { arc as d3Arc, lineRadial } from 'd3-shape';
	import { scaleLinear } from 'd3-scale';
	import { OE_RED } from './tracker-overlays.js';
	import { dialAngle, dialValue, meanOfHours } from './dial.js';
	import DialReadout from './DialReadout.svelte';
	import DialFace, { dialMargin } from './DialFace.svelte';
	import DialNight from './DialNight.svelte';
	import { hoverFade } from '$lib/components/charts/v2/hover-fade.js';

	/**
	 * RadialClock — averages by hour around a 24-hour dial: noon at the top,
	 * running clockwise (`dial.js`), with the window's average night shaded
	 * behind (`DialNight`). Each hour is a slice growing out from the baseline
	 * ring (inward for negative hours, such as charging or negative prices).
	 * With several `layers` (the Stacked display) each hour stacks them in
	 * order, positives outward and negatives inward, and the readout gives the
	 * hour's net total. An optional `today` series (one layer only) draws
	 * today's hourly averages as an OE red radial line, and the hovered hour's
	 * today value centred below the dial. While nothing is hovered, the readout
	 * and the today line show the average across the hours ("Av."). Hovering an hour reads
	 * it out on the heatmap's band (`DialReadout`); the hovered hour (`active`)
	 * is bindable, so sibling dials and the table share it. So is the layer
	 * under the pointer (`activeLayer`, picked by the pointer's radius within
	 * the hour): its slices stay solid while the other layers' fade, so a
	 * sibling chart's hovered series reads here too. Every value also sits in a
	 * visually hidden table; the hour sectors carry no `<title>`, so hovering
	 * shows no browser tooltip. The SVG carries
	 * `data-png-layer` so PNG export captures it.
	 *
	 * @type {{
	 *   layers: Array<{key: string, label: string, colour: string, hours: import('./types.js').ProfileHour[]}>,
	 *   today?: import('./types.js').ProfileHour[] | null,
	 *   unit: string,
	 *   label: string,
	 *   daylight?: import('./types.js').Daylight | null,
	 *   large?: boolean,
	 *   active?: number | null,
	 *   activeLayer?: string | null
	 * }}
	 */
	let {
		layers,
		today = null,
		unit,
		label,
		daylight = null,
		large = false,
		active = $bindable(null),
		activeLayer = $bindable(null)
	} = $props();

	/** @param {number} value */
	const format = (value) => value.toLocaleString('en-AU', { maximumFractionDigits: 1 });
	/** @param {number} hour */
	const hourLabel = (hour) => `${String(hour % 24).padStart(2, '0')}:00`;

	let width = $state(0);
	// Square, filling its card's width: the cards flow in as many columns as fit.
	let size = $derived(Math.max(160, width));
	let outer = $derived(size / 2 - dialMargin(large));
	/** The empty hub, as a fraction of the radius. */
	const HOLE = 0.32;
	let inner = $derived(outer * HOLE);
	/** Each hour's net total across the layers (the one layer's value alone). */
	let hours = $derived(
		Array.from({ length: 24 }, (_, hour) => {
			const values = layers
				.map((layer) => layer.hours[hour]?.average ?? null)
				.filter((value) => value !== null);
			return {
				hour,
				label: hourLabel(hour),
				average: values.length ? values.reduce((sum, value) => sum + value, 0) : null
			};
		})
	);
	/** Each layer's slice per hour, stacked from the baseline: positives
	 *  outward from the running positive total, negatives inward. */
	let stacks = $derived(
		Array.from({ length: 24 }, (_, hour) => {
			let up = 0;
			let down = 0;
			return layers.map((layer) => {
				const value = layer.hours[hour]?.average ?? 0;
				const from = value >= 0 ? up : down;
				if (value >= 0) up += value;
				else down += value;
				return { key: layer.key, colour: layer.colour, from, to: from + value };
			});
		})
	);
	let extent = $derived.by(() => {
		const ends = stacks.flatMap((hour) => hour.flatMap(({ from, to }) => [from, to]));
		const todays = (today ?? []).map(({ average }) => average).filter((value) => value !== null);
		return [Math.min(0, ...ends, ...todays), Math.max(0, ...ends, ...todays) || 1];
	});
	let radius = $derived(scaleLinear().domain(extent).range([inner, outer]));
	let wedge = $derived(d3Arc().padAngle(0.015).cornerRadius(1));
	/** Each hour's whole sector, centre to just past the dial: the hover target,
	 *  so an hour is reachable however short its bar. No padding, no gaps. */
	const sector = d3Arc();
	/** @param {number} hour @param {{from: number, to: number}} segment */
	function slice(hour, { from, to }) {
		return wedge({
			innerRadius: radius(Math.min(from, to)),
			outerRadius: radius(Math.max(from, to)),
			startAngle: dialAngle(hour),
			endAngle: dialAngle(hour + 1)
		});
	}
	let todayPath = $derived(
		today
			? lineRadial()
					.angle((/** @type {any} */ d) => dialAngle(d.hour + 0.5))
					.radius((/** @type {any} */ d) => radius(d.average))
					.defined((/** @type {any} */ d) => d.average !== null)(/** @type {any} */ (today))
			: null
	);
	/** Pick the layer whose slice in `hour` lies under the pointer, from its
	 * distance to the dial's centre; none in the hub or past the bars.
	 * @param {PointerEvent} event @param {number} hour */
	function pickLayer(event, hour) {
		const svg = /** @type {SVGElement} */ (event.currentTarget).ownerSVGElement;
		if (!svg) return;
		const box = svg.getBoundingClientRect();
		const r =
			Math.hypot(
				event.clientX - box.left - box.width / 2,
				event.clientY - box.top - box.height / 2
			) *
			(size / box.width);
		const segment = stacks[hour].find(({ from, to }) => {
			const [low, high] = [radius(Math.min(from, to)), radius(Math.max(from, to))];
			return from !== to && r >= low && r <= high;
		});
		activeLayer = segment?.key ?? null;
	}
	/** @param {number} hour @param {string} key */
	const sliceOpacity = (hour, key) =>
		(active === null || active === hour ? 1 : 0.45) *
		(activeLayer === null || activeLayer === key ? 1 : 0.4);
	let activeHour = $derived(active === null ? null : hours[active]);
	/** While nothing is hovered, the readout and today line show averages
	 * across the hours ("Av."): the day's hourly mean, and today's so far. */
	let average = $derived(meanOfHours(hours));
	let todayValue = $derived(
		active === null ? (today ? meanOfHours(today) : null) : (today?.[active]?.average ?? null)
	);
</script>

<div class="relative">
	<DialReadout
		label={activeHour
			? `${activeHour.label}–${hourLabel(activeHour.hour + 1)}`
			: average === null
				? null
				: 'Av.'}
		value={activeHour ? activeHour.average : average}
		{unit}
		note={layers.length > 1 ? 'net' : ''}
		{large}
	/>
	<!-- The dial pads itself, so the readout band runs flush to the card's
	     edges; at most `--dial-max` wide (the lightbox's viewport cap) and
	     pulled up a little into the dial margin's slack above 12:00, leaving
	     more air under the band than the heatmap does. -->
	<div class="px-6">
		<div
			bind:clientWidth={width}
			class="mx-auto flex max-w-(--dial-max) justify-center {large ? '-mt-[10px]' : '-mt-[6px]'}"
			style:height="{size}px"
		>
			<div data-chart-area class="relative" style:width="{size}px" style:height="{size}px">
				<svg
					data-png-layer
					width={size}
					height={size}
					viewBox="{-size / 2} {-size / 2} {size} {size}"
					role="img"
					aria-label="{label} average by hour of day"
				>
					{#if daylight}
						<DialNight radius={outer + 8} {daylight} />
					{/if}
					<circle r={outer} fill="none" class="stroke-mid-warm-grey" stroke-dasharray="3 4" />
					<!-- The hovered hour's sector, shaded behind its bar: translucent, so
					     it reads darker over the night shade as well as the day. -->
					{#if active !== null}
						<path
							d={sector({
								innerRadius: inner,
								outerRadius: outer + 8,
								startAngle: dialAngle(active),
								endAngle: dialAngle(active + 1)
							})}
							class="fill-mid-warm-grey/50"
							pointer-events="none"
							transition:hoverFade
							data-testid="radial-hover"
						/>
					{/if}
					{#each stacks as segments, hour (hour)}
						{#each segments as segment (segment.key)}
							<path
								d={slice(hour, segment)}
								fill={segment.colour}
								opacity={sliceOpacity(hour, segment.key)}
								pointer-events="none"
							/>
						{/each}
					{/each}
					<circle r={radius(0)} fill="none" class="stroke-mid-grey" stroke-width="1.5" />
					{#if todayPath}
						<path
							d={todayPath}
							fill="none"
							stroke={OE_RED}
							stroke-width="2.5"
							pointer-events="none"
						/>
					{/if}
					<DialFace
						{outer}
						{large}
						hover={active === null ? null : { hours: active, label: hourLabel(active) }}
					/>
					<!-- On top: invisible whole-hour sectors take the hover; leaving the
			     dial (not moving between sectors) clears it. -->
					<g
						role="presentation"
						onpointerleave={() => {
							active = null;
							activeLayer = null;
						}}
					>
						{#each hours as hour (hour.hour)}
							<path
								d={sector({
									innerRadius: 0,
									outerRadius: outer + 8,
									startAngle: dialAngle(hour.hour),
									endAngle: dialAngle(hour.hour + 1)
								})}
								fill="transparent"
								role="presentation"
								onpointerenter={() => (active = hour.hour)}
								onpointermove={(event) => pickLayer(event, hour.hour)}
							></path>
						{/each}
					</g>
				</svg>
			</div>
		</div>
	</div>
	<!-- Today's value for the hovered hour (its average while idle), centred
	     below the dial in OE red;
	     reserved while the today line shows, so the card never jumps, and
	     tucked into the card's bottom padding so it doesn't add a full line. -->
	{#if today}
		<p
			data-testid="dial-today"
			class="text-center {large ? 'h-[24px] text-sm' : '-mb-3 h-[20px] text-xs'}"
			style:color={OE_RED}
		>
			{#if todayValue !== null}
				{@const shown = dialValue(todayValue, unit)}
				{`Today${active === null ? ' Av.' : ''} `}<strong class="font-semibold"
					>{shown.value}</strong
				>{shown.unit.startsWith('/') ? shown.unit : ` ${shown.unit}`}
			{/if}
		</p>
	{/if}
	<table class="sr-only">
		<caption>{label} average by hour ({unit})</caption>
		{#if layers.length > 1}
			<thead>
				<tr>
					<th scope="col">Hour</th>
					<th scope="col">Net</th>
					{#each layers as layer (layer.key)}<th scope="col">{layer.label}</th>{/each}
				</tr>
			</thead>
		{/if}
		<tbody>
			{#each hours as hour (hour.hour)}
				<tr>
					<th scope="row">{hour.label}</th>
					<td>{hour.average === null ? '—' : format(hour.average)}</td>
					{#if layers.length > 1}
						{#each layers as layer (layer.key)}
							{@const value = layer.hours[hour.hour]?.average ?? null}
							<td>{value === null ? '—' : format(value)}</td>
						{/each}
					{/if}
					{#if today}<td
							>{today[hour.hour]?.average == null ? '—' : format(today[hour.hour].average ?? 0)}</td
						>{/if}
				</tr>
			{/each}
		</tbody>
	</table>
</div>
