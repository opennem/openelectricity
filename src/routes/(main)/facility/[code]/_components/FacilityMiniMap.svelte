<script>
	import { MapLibre, Marker } from 'svelte-maplibre-gl';

	/**
	 * @type {{
	 *   lat: number,
	 *   lng: number,
	 *   color?: string,
	 *   zoom?: number
	 * }}
	 */
	let { lat, lng, color = '#ffffff', zoom = 14 } = $props();

	/** @type {any | null} */
	let mapInstance = $state(null);

	$effect(() => {
		if (mapInstance && lat && lng) {
			mapInstance.flyTo({
				center: [lng, lat],
				zoom,
				duration: 400
			});
		}
	});
</script>

{#snippet markerContent()}
	<div
		class="size-6 rounded-full border-2 border-white shadow-lg ring-2 ring-black/20"
		style:background-color={color}
	></div>
{/snippet}

<div class="w-full h-[180px] rounded-lg overflow-hidden border border-warm-grey">
	<MapLibre
		style="/map-styles/satellite.json"
		class="w-full h-full"
		center={{ lng, lat }}
		{zoom}
		scrollZoom={false}
		cooperativeGestures={true}
		attributionControl={false}
		bind:map={mapInstance}
	>
		<Marker lnglat={[lng, lat]} content={markerContent} />
	</MapLibre>
</div>
