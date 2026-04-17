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
</script>

{#snippet markerContent()}
	<div
		class="size-6 rounded-full border-2 border-white shadow-lg ring-2 ring-black/20"
		style:background-color={color}
	></div>
{/snippet}

{#key `${lat},${lng}`}
	<div class="w-full h-full min-h-[120px] rounded-lg overflow-hidden border border-warm-grey">
		<MapLibre
			style="/map-styles/satellite.json"
			class="w-full h-full"
			center={{ lng, lat }}
			{zoom}
			scrollZoom={false}
			cooperativeGestures={true}
			attributionControl={false}
		>
			<Marker lnglat={[lng, lat]} content={markerContent} />
		</MapLibre>
	</div>
{/key}
