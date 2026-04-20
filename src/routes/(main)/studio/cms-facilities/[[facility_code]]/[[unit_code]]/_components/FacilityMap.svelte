<script>
	import {
		MapLibre,
		GeoJSONSource,
		CircleLayer,
		FillLayer,
		LineLayer,
		NavigationControl
	} from 'svelte-maplibre-gl';
	import { DragHandle } from '$lib/components/ui/panel';

	/**
	 * @type {{
	 *   mapStyle: string,
	 *   geojson: GeoJSON.FeatureCollection,
	 *   osmGeoJson: GeoJSON.FeatureCollection,
	 *   circleFilter: any,
	 *   facilityCode: string | null,
	 *   mapDrag: any,
	 *   map?: any,
	 *   onload: () => void,
	 *   onclickmarker: (e: any) => void
	 * }}
	 */
	let {
		mapStyle,
		geojson,
		osmGeoJson,
		circleFilter,
		facilityCode,
		mapDrag,
		map = $bindable(null),
		onload,
		onclickmarker
	} = $props();
</script>

<div style="height: {mapDrag.value}px;">
	<MapLibre
		style={mapStyle}
		center={{ lng: 134, lat: -25 }}
		zoom={3.5}
		class="w-full h-full"
		bind:map
		{onload}
	>
		<NavigationControl position="top-right" />
		<GeoJSONSource data={geojson}>
			<CircleLayer
				paint={{
					'circle-radius': facilityCode ? 6 : 4,
					'circle-color': ['get', 'colour'],
					'circle-stroke-width': facilityCode ? 2 : 1,
					'circle-stroke-color': '#fff'
				}}
				filter={circleFilter}
				onclick={onclickmarker}
			/>
		</GeoJSONSource>

		<!-- OSM polygon -->
		<GeoJSONSource id="osm-polygon" data={osmGeoJson}>
			<FillLayer
				paint={{
					'fill-color': '#3b82f6',
					'fill-opacity': 0.3
				}}
			/>
			<LineLayer
				paint={{
					'line-color': '#2563eb',
					'line-width': 2
				}}
			/>
		</GeoJSONSource>
	</MapLibre>
</div>

<DragHandle
	axis="y"
	onstart={mapDrag.start}
	active={mapDrag.isDragging}
	class="border-b border-warm-grey"
/>
