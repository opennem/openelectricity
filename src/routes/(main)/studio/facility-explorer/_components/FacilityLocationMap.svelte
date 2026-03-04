<script>
	import {
		MapLibre,
		Marker,
		NavigationControl,
		AttributionControl
	} from 'svelte-maplibre-gl';

	/**
	 * @type {{
	 *   lat: number,
	 *   lng: number,
	 *   color?: string,
	 *   zoom?: number
	 * }}
	 */
	let { lat, lng, color = '#353535', zoom = 10 } = $props();

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
		class="size-4 rounded-full border-2 border-white shadow-md"
		style:background-color={color}
	></div>
{/snippet}

<div class="w-full h-[200px] rounded-lg overflow-hidden">
	<MapLibre
		style="/map-styles/positron.json"
		class="w-full h-full"
		center={{ lng, lat }}
		{zoom}
		scrollZoom={false}
		cooperativeGestures={true}
		attributionControl={false}
		bind:map={mapInstance}
	>
		<NavigationControl position="top-right" showCompass={false} />
		<AttributionControl position="bottom-right" compact={true} />

		<Marker lnglat={[lng, lat]} content={markerContent} />
	</MapLibre>
</div>
