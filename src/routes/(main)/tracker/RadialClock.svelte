<script>
	import { arc as d3Arc, lineRadial } from 'd3-shape';
	import { scaleLinear } from 'd3-scale';
	import { OE_RED } from './tracker-overlays.js';
	import { dialAngle, dialValueText } from './dial.js';
	import DialReadout from './DialReadout.svelte';
	import DialFace, { dialMargin } from './DialFace.svelte';
	import DialNight from './DialNight.svelte';

	/**
	 * RadialClock — averages by hour around a 24-hour dial: noon at the top,
	 * running clockwise (`dial.js`), with the window's average night shaded
	 * behind (`DialNight`). Each hour is a slice growing out from the baseline
	 * ring (inward for negative hours, such as charging or negative prices).
	 * With several `layers` (the Stacked display) each hour stacks them in
	 * order, positives outward and negatives inward, and the readout gives the
	 * hour's net total. An optional `today` series (one layer only) draws
	 * today's hourly averages as an OE red radial line. Hovering an hour reads
	 * it out on the heatmap's band (`DialReadout`); the hovered hour (`active`)
	 * is bindable, so sibling dials and the table share it. Every value also sits in the
	 * hour's `<title>` and a visually hidden table. The SVG carries
	 * `data-png-layer` so PNG export captures it.
	 *
	 * @type {{
	 *   layers: Array<{key: string, label: string, colour: string, hours: import('./types.js').ProfileHour[]}>,
	 *   today?: import('./types.js').ProfileHour[] | null,
	 *   unit: string,
	 *   label: string,
	 *   daylight?: import('./types.js').Daylight | null,
	 *   large?: boolean,
	 *   active?: number | null
	 * }}
	 */
	let {
		layers,
		today = null,
		unit,
		label,
		daylight = null,
		large = false,
		active = $bindable(null)
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
	let activeHour = $derived(active === null ? null : hours[active]);
	let activeToday = $derived(active === null ? null : (today?.[active] ?? null));
</script>

<div class="relative">
	<DialReadout
		label={activeHour ? `${activeHour.label}–${hourLabel(activeHour.hour + 1)}` : null}
		value={activeHour?.average ?? null}
		{unit}
		note={layers.length > 1 ? 'net' : ''}
		today={activeToday?.average ?? null}
		{large}
	/>
	<!-- The dial pads itself, so the readout band runs flush to the card's
	     edges; at most `--dial-max` wide (the lightbox's viewport cap) and
	     pulled up into the dial margin's slack above 12:00, as on the heatmap. -->
	<div class="px-6">
		<div
			bind:clientWidth={width}
			class="mx-auto flex max-w-(--dial-max) justify-center {large ? '-mt-[26px]' : '-mt-[18px]'}"
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
					<!-- The hovered hour's sector, lightly shaded behind its bar. -->
					{#if active !== null}
						<path
							d={sector({
								innerRadius: inner,
								outerRadius: outer + 8,
								startAngle: dialAngle(active),
								endAngle: dialAngle(active + 1)
							})}
							class="fill-warm-grey"
							pointer-events="none"
							data-testid="radial-hover"
						/>
					{/if}
					{#each stacks as segments, hour (hour)}
						{#each segments as segment (segment.key)}
							<path
								d={slice(hour, segment)}
								fill={segment.colour}
								opacity={active === null || active === hour ? 1 : 0.45}
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
					<DialFace {outer} {large} />
					<!-- On top: invisible whole-hour sectors take the hover; leaving the
			     dial (not moving between sectors) clears it. -->
					<g role="presentation" onpointerleave={() => (active = null)}>
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
								><title
									>{hour.label}–{hourLabel(hour.hour + 1)}: {hour.average === null
										? 'no data'
										: dialValueText(hour.average, unit)}</title
								></path
							>
						{/each}
					</g>
				</svg>
			</div>
		</div>
	</div>
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
