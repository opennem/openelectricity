<script module>
	// Overview width/opacity profile (continent-level zooms) — module-scoped so
	// the arrays are built once, not per instance.
	const OVERVIEW_LINE_WIDTH = [
		'interpolate',
		['linear'],
		['zoom'],
		3,
		[
			'case',
			['>=', ['get', 'capacitykv'], 400],
			1.5,
			['>=', ['get', 'capacitykv'], 220],
			1,
			['>=', ['get', 'capacitykv'], 110],
			0.7,
			0.5
		],
		8,
		[
			'case',
			['>=', ['get', 'capacitykv'], 400],
			4,
			['>=', ['get', 'capacitykv'], 220],
			3,
			['>=', ['get', 'capacitykv'], 110],
			2,
			1.5
		],
		14,
		[
			'case',
			['>=', ['get', 'capacitykv'], 400],
			6,
			['>=', ['get', 'capacitykv'], 220],
			5,
			['>=', ['get', 'capacitykv'], 110],
			4,
			3
		]
	];
	const OVERVIEW_LINE_OPACITY = ['interpolate', ['linear'], ['zoom'], 3, 0.5, 8, 0.7, 12, 0.85];
</script>

<script>
	import { GeoJSONSource, LineLayer } from 'svelte-maplibre-gl';
	import { BAND_MIN, bandColours } from '$lib/facilities/transmission-bands.js';
	import { isLightMapTheme } from './map-style.js';

	/**
	 * Transmission-lines overlay — the single source + line layer every map
	 * surface renders (/facilities, /facility/[code], /tracker), so the band
	 * colours and geojson wiring can't drift between them.
	 *
	 * The source geojson is large, so nothing mounts until the layer is first
	 * shown; after that it stays mounted and toggles via layout visibility, so
	 * switching it back on is instant and a caller's band `filter` keeps
	 * applying to a live layer.
	 *
	 * `lineWidth`/`lineOpacity` default to the overview profile (continent-level
	 * zooms); the facility detail map passes its own zoomed-in profile.
	 *
	 * `highlightObjectIds`/`selectedObjectIds` draw a casing beneath the named
	 * features (matched by `objectid` — the geojson has no interconnector flag)
	 * so the tracker can emphasise the physical interconnector lines while the
	 * band colours stay on top. Defaults keep every other map unchanged.
	 *
	 * @type {{
	 *   mapTheme?: 'voyager' | 'light' | 'dark' | 'satellite',
	 *   visible?: boolean,
	 *   filter?: any,
	 *   lineWidth?: any,
	 *   lineOpacity?: any,
	 *   highlightObjectIds?: number[],
	 *   selectedObjectIds?: number[]
	 * }}
	 */
	let {
		mapTheme = 'light',
		visible = true,
		filter = undefined,
		lineWidth = OVERVIEW_LINE_WIDTH,
		lineOpacity = OVERVIEW_LINE_OPACITY,
		highlightObjectIds = [],
		selectedObjectIds = []
	} = $props();

	// Band colours for the active basemap, indexed highest → lowest voltage.
	// Keyed on the theme, not satellite alone — the dark style needs the bright
	// set too, and the map key resolves its swatches through the same function.
	let lineColours = $derived(bandColours(mapTheme));

	// Lazy-once mount ratchet (see the component doc above). `everVisible` is a
	// plain non-reactive variable flipped during derivation — path-dependent
	// state a $derived alone can't express, without reaching for $effect.
	let everVisible = false;
	let mounted = $derived.by(() => {
		if (visible) everVisible = true;
		return visible || everVisible;
	});

	// Casing under the highlighted features. Matched by objectid only — some
	// `operationalstatus` values carry trailing spaces, so status filters would
	// silently drop features. Expressions typed `any` like the base layer's
	// filter/width props — the MapLibre spec types reject hand-built arrays.
	let casingIds = $derived([...new Set([...highlightObjectIds, ...selectedObjectIds])]);
	/** @type {any} */
	let casingFilter = $derived(['in', ['get', 'objectid'], ['literal', casingIds]]);
	/** @type {any} */
	let selectedTest = $derived(['in', ['get', 'objectid'], ['literal', selectedObjectIds]]);
	let casingColour = $derived(isLightMapTheme(mapTheme) ? '#33475c' : '#c9d9ec');
	/** @type {any} */
	let casingPaint = $derived({
		'line-color': casingColour,
		'line-width': [
			'interpolate',
			['linear'],
			['zoom'],
			3,
			['case', selectedTest, 3, 2],
			8,
			['case', selectedTest, 7, 5],
			14,
			['case', selectedTest, 10, 7]
		],
		'line-opacity': ['case', selectedTest, 0.9, 0.4]
	});
</script>

{#if mounted}
	<GeoJSONSource id="transmission-lines" data="/data/transmission-lines.geojson">
		{#if casingIds.length > 0}
			<LineLayer
				id="transmission-lines-casing"
				filter={casingFilter}
				paint={casingPaint}
				layout={{
					'line-cap': 'round',
					'line-join': 'round',
					visibility: visible ? 'visible' : 'none'
				}}
			/>
		{/if}
		<LineLayer
			id="transmission-lines-layer"
			{filter}
			paint={{
				// Colours and thresholds come from TRANSMISSION_BANDS, highest band
				// first — the same table the map keys read.
				'line-color': [
					'case',
					['>=', ['get', 'capacitykv'], BAND_MIN[0]],
					lineColours[0],
					['>=', ['get', 'capacitykv'], BAND_MIN[1]],
					lineColours[1],
					['>=', ['get', 'capacitykv'], BAND_MIN[2]],
					lineColours[2],
					lineColours[3]
				],
				'line-width': lineWidth,
				'line-opacity': lineOpacity
			}}
			layout={{
				'line-cap': 'round',
				'line-join': 'round',
				visibility: visible ? 'visible' : 'none'
			}}
		/>
	</GeoJSONSource>
{/if}
