<script module>
	import { CLOUD_TILE_SCHEME, loadCloudTile } from './cloud-tile-protocol.js';

	// GIBS uses tile row before column: {z}/{y}/{x}.
	const GIBS_TILE_URL =
		'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/Himawari_AHI_Band13_Clean_Infrared/default/default/GoogleMapsCompatible_Level6/{z}/{y}/{x}.png';
</script>

<script>
	import { Protocol, RasterTileSource, RasterLayer } from 'svelte-maplibre-gl';
	import { isLightMapTheme } from './map-style.js';

	/**
	 * Near-real-time Himawari infrared cloud cover from NASA GIBS. The custom
	 * protocol makes clear sky transparent and adjusts clouds for the basemap.
	 *
	 * Theme changes update the source URL; hidden layers fetch no tiles.
	 *
	 * @type {{ visible?: boolean, mapTheme?: 'voyager' | 'light' | 'dark' | 'satellite' }}
	 */
	let { visible = false, mapTheme = 'light' } = $props();

	let cloudStyle = $derived(isLightMapTheme(mapTheme) ? 'shaded' : 'white');
	let tiles = $derived([`${CLOUD_TILE_SCHEME}://${cloudStyle}/${GIBS_TILE_URL}`]);
</script>

<Protocol scheme={CLOUD_TILE_SCHEME} loadFn={loadCloudTile} />
<RasterTileSource
	id="cloud-cover"
	{tiles}
	tileSize={256}
	minzoom={0}
	maxzoom={6}
	attribution="NASA GIBS · JMA Himawari"
>
	<RasterLayer
		id="cloud-cover-layer"
		paint={{
			'raster-opacity': 0.8,
			'raster-opacity-transition': { duration: 200, delay: 0 }
		}}
		layout={{ visibility: visible ? 'visible' : 'none' }}
	/>
</RasterTileSource>
