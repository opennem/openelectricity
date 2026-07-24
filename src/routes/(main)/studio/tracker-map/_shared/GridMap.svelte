<!--
	GridMap — draft generic base map for the unified map app.
	Zero domain knowledge: it resolves a style URL, mounts MapLibre filling its
	parent, and renders whatever children it's given inside the map context.
	Domain layers arrive via `children` (in the shell spike: portal snippets).
-->
<script>
	import { MapLibre, NavigationControl, AttributionControl } from 'svelte-maplibre-gl';

	/**
	 * maplibre-gl is a transitive dep of svelte-maplibre-gl (not directly
	 * installed), so its types aren't importable here — map/event types are
	 * `any`, consistent with PointMap and the facilities Map.
	 * @type {{
	 *   mapTheme?: 'light' | 'dark' | 'satellite',
	 *   center?: [number, number],
	 *   zoom?: number,
	 *   scrollZoom?: boolean,
	 *   children?: import('svelte').Snippet,
	 *   onload?: (ev: any) => void,
	 *   onmoveend?: (ev: any) => void
	 * }}
	 */
	let {
		mapTheme = 'light',
		center = [134, -28],
		zoom = 4,
		scrollZoom = true,
		children = undefined,
		onload = undefined,
		onmoveend = undefined
	} = $props();

	/** @type {any} */
	let map = $state.raw(null);

	// Same style resolution as PointMap: self-hosted style JSONs in /static.
	let mapStyle = $derived(
		mapTheme === 'satellite'
			? '/map-styles/satellite.json'
			: mapTheme === 'dark'
				? '/map-styles/dark-matter.json'
				: '/map-styles/positron.json'
	);

	/** @returns {any} The underlying maplibre Map instance (null until mounted) */
	export function getMap() {
		return map;
	}

	export function zoomIn() {
		map?.zoomIn();
	}

	export function zoomOut() {
		map?.zoomOut();
	}

	/** @param {any} opts maplibre FlyToOptions */
	export function flyTo(opts) {
		map?.flyTo(opts);
	}

	/**
	 * @param {any} bounds maplibre LngLatBoundsLike
	 * @param {any} [opts] maplibre FitBoundsOptions
	 */
	export function fitBounds(bounds, opts) {
		map?.fitBounds(bounds, opts);
	}
</script>

<div class="h-full w-full">
	<MapLibre
		style={mapStyle}
		class="h-full w-full"
		{center}
		{zoom}
		maxZoom={18}
		minZoom={1}
		{scrollZoom}
		touchZoomRotate={true}
		attributionControl={false}
		fadeDuration={0}
		bind:map
		{onload}
		{onmoveend}
	>
		<NavigationControl position="top-right" showCompass={false} />
		<AttributionControl position="bottom-right" compact={true} />

		{@render children?.()}
	</MapLibre>
</div>
