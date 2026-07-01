<script>
	import { GeoJSONSource, FillLayer, LineLayer } from 'svelte-maplibre-gl';

	/**
	 * Renders an OSM facility footprint (a polygon from `fetchOsmPolygon`) as a
	 * translucent fill + outline. Must be placed inside a `<MapLibre>`
	 * (svelte-maplibre-gl) — it relies on the map context its layer children read.
	 *
	 * @type {{
	 *   feature: GeoJSON.Feature | null,
	 *   color?: string,
	 *   id?: string,
	 *   fillOpacity?: number,
	 *   lineWidth?: number
	 * }}
	 */
	let {
		feature,
		color = '#3b82f6',
		id = 'osm-polygon',
		fillOpacity = 0.25,
		lineWidth = 2
	} = $props();

	let data = $derived(
		/** @type {GeoJSON.FeatureCollection} */ ({
			type: 'FeatureCollection',
			features: feature ? [feature] : []
		})
	);
</script>

{#if feature}
	<GeoJSONSource {id} {data}>
		<FillLayer paint={{ 'fill-color': color, 'fill-opacity': fillOpacity }} />
		<LineLayer paint={{ 'line-color': color, 'line-width': lineWidth }} />
	</GeoJSONSource>
{/if}
