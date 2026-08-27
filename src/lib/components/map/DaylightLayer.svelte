<script>
	import { GeoJSONSource, FillLayer } from 'svelte-maplibre-gl';
	import { twilightPolygon } from '$lib/utils/solar-terminator.js';

	/**
	 * Local day/night overlay. Four translucent twilight polygons overlap to
	 * deepen the shade from dusk to full night.
	 *
	 * @type {{ visible?: boolean, mapTheme?: 'voyager' | 'light' | 'dark' | 'satellite' }}
	 */
	let { visible = false, mapTheme = 'light' } = $props();

	const TWILIGHT_ALTITUDES = [0, -6, -12, -18];

	// Per-band opacity accumulates across the four twilight polygons.
	const SHADES = {
		light: { colour: '#0b1026', opacity: 0.09 },
		dark: { colour: '#050f5a', opacity: 0.14 },
		satellite: { colour: '#01060f', opacity: 0.12 }
	};
	let shade = $derived(
		mapTheme === 'dark' ? SHADES.dark : mapTheme === 'satellite' ? SHADES.satellite : SHADES.light
	);

	let now = $state(new Date());

	// Update only while the overlay is visible.
	$effect(() => {
		if (!visible) return;
		now = new Date();
		const id = setInterval(() => (now = new Date()), 60_000);
		return () => clearInterval(id);
	});

	let data = $derived({
		type: /** @type {'FeatureCollection'} */ ('FeatureCollection'),
		features: TWILIGHT_ALTITUDES.map((altitude) => twilightPolygon(now, altitude))
	});
</script>

<GeoJSONSource id="daylight-night" {data}>
	<FillLayer
		id="daylight-night-layer"
		paint={{ 'fill-color': shade.colour, 'fill-opacity': shade.opacity }}
		layout={{ visibility: visible ? 'visible' : 'none' }}
	/>
</GeoJSONSource>
