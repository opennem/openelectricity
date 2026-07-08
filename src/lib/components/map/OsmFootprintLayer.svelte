<script>
	import { GeoJSONSource, FillLayer, LineLayer } from 'svelte-maplibre-gl';
	import chroma from 'chroma-js';

	/**
	 * Renders an OSM facility footprint (a polygon from `fetchOsmPolygon`) as a
	 * translucent fill + outline. Must be placed inside a `<MapLibre>`
	 * (svelte-maplibre-gl) — it relies on the map context its layer children read.
	 *
	 * `emphasise` (default on) is the satellite/dark-imagery treatment: the
	 * colour is blended toward white and the boundary gains a white casing
	 * stroke, so dark fuel-tech colours (coal black #121212) stay legible.
	 * Callers rendering over a light base style should pass `emphasise={false}`
	 * — there the raw colour has contrast and the white casing would wash out.
	 *
	 * @type {{
	 *   feature: GeoJSON.Feature | null,
	 *   color?: string,
	 *   id?: string,
	 *   fillOpacity?: number,
	 *   lineWidth?: number,
	 *   emphasise?: boolean
	 * }}
	 */
	let {
		feature,
		color = '#3b82f6',
		id = 'osm-polygon',
		fillOpacity = 0.3,
		lineWidth = 2,
		emphasise = true
	} = $props();

	let displayColor = $derived(emphasise ? chroma.mix(color, 'white', 0.4, 'lab').hex() : color);

	let data = $derived(
		/** @type {GeoJSON.FeatureCollection} */ ({
			type: 'FeatureCollection',
			features: feature ? [feature] : []
		})
	);
</script>

{#if feature}
	<GeoJSONSource {id} {data}>
		<FillLayer paint={{ 'fill-color': displayColor, 'fill-opacity': fillOpacity }} />
		{#if emphasise}
			<!-- White casing under the colour line — keeps the boundary legible even
			     where the (possibly dark) colour sits over dark imagery. -->
			<LineLayer
				paint={{ 'line-color': '#ffffff', 'line-width': lineWidth + 2, 'line-opacity': 0.7 }}
			/>
		{/if}
		<LineLayer paint={{ 'line-color': displayColor, 'line-width': lineWidth }} />
	</GeoJSONSource>
{/if}
