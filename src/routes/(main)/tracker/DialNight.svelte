<svelte:options namespace="svg" />

<script>
	import { arc as d3Arc } from 'd3-shape';
	import { dialAngle } from './dial.js';
	import { formatDaylightClock } from './daylight.js';

	/**
	 * DialNight — the 24-hour dials' night, from the window's average sunset
	 * round to its sunrise (noon at the top; see `dial.js`), out to `radius`,
	 * inside the dial's centred SVG. By default a light shade drawn first,
	 * behind the data; `overlay` makes it a translucent dark wash drawn over
	 * data that fills the dial (the heatmap's cells), which still read through.
	 * It never takes the pointer, so hover passes to the chart beneath.
	 *
	 * @type {{ radius: number, daylight: import('./types.js').Daylight, overlay?: boolean }}
	 */
	let { radius, daylight, overlay = false } = $props();

	const sector = d3Arc();
	let title = $derived(
		`Night ${formatDaylightClock(daylight.sunset)}–${formatDaylightClock(daylight.sunrise)}, average sunset to sunrise at ${daylight.place}`
	);
	let path = $derived(
		sector({
			innerRadius: 0,
			outerRadius: radius,
			startAngle: dialAngle(daylight.sunset),
			endAngle: dialAngle(daylight.sunrise + 24)
		})
	);
</script>

<path
	d={path}
	fill={overlay ? '#2B3245' : '#EDEFF3'}
	fill-opacity={overlay ? 0.1 : 1}
	pointer-events="none"
	data-testid="dial-night"><title>{title}</title></path
>
