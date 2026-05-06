<script>
	import { onDestroy } from 'svelte';
	import { getMapContext } from 'svelte-maplibre-gl';
	import { MapboxOverlay } from '@deck.gl/mapbox';
	import { ColumnLayer, ScatterplotLayer } from '@deck.gl/layers';
	import { HeatmapLayer } from '@deck.gl/aggregation-layers';
	import { clusterByGrid } from '../_utils/cluster-by-grid.js';

	/**
	 * deck.gl overlay for the facilities map. Single component owns the
	 * deck.gl chunk — code-split via dynamic import in `Map.svelte` so the
	 * ~200 KB bundle only loads when the user picks a non-default marker
	 * mode.
	 *
	 * Modes:
	 *   - `column` (default): one hexagonal column per facility (`ColumnLayer`
	 *     with `diskResolution: 6`). Height = facility weight × elevationScale.
	 *   - `aggregate`: facilities clustered into a coarse lat/lng grid.
	 *     Each cell renders as one hex column — radius scaled by facility
	 *     count, height by summed metric (capacity / generation / etc).
	 *   - `heatmap`: smooth 2D density heatmap (`HeatmapLayer`). Flat —
	 *     pairs well with top-down camera.
	 *
	 * @type {{
	 *   data: Array<{ position: [number, number], weight: number, code?: string, color?: [number, number, number] }>,
	 *   visible?: boolean,
	 *   mode?: 'column' | 'aggregate' | 'heatmap',
	 *   radius?: number,
	 *   elevationScale?: number
	 * }}
	 */
	let {
		data,
		visible = false,
		mode = 'column',
		radius = 8000,
		elevationScale = 1
	} = $props();

	const mapCtx = getMapContext();

	/** @type {InstanceType<typeof MapboxOverlay> | null} */
	let overlay = null;

	function ensureOverlay() {
		const map = mapCtx.map;
		if (!map || overlay) return;
		overlay = new MapboxOverlay({ interleaved: false, layers: [] });
		map.addControl(/** @type {any} */ (overlay));
	}

	function teardownOverlay() {
		const map = mapCtx.map;
		if (!overlay) return;
		if (map) map.removeControl(/** @type {any} */ (overlay));
		overlay = null;
	}

	function buildLayers() {
		if (mode === 'heatmap') {
			return [
				new HeatmapLayer({
					id: 'facilities-heatmap',
					data,
					getPosition: (d) => d.position,
					getWeight: (d) => d.weight,
					aggregation: 'SUM',
					// radiusPixels controls how wide each facility's
					// Gaussian kernel paints on screen. Bigger = blobs
					// merge further apart, denser-looking overall heat.
					radiusPixels: 90,
					intensity: 1.4,
					// threshold is the alpha cutoff (relative to peak)
					// below which pixels render transparent — lower
					// extends the soft tail outward.
					threshold: 0.02,
					colorRange: [
						[0, 0, 0, 0],
						[10, 30, 80, 120],
						[40, 80, 180, 180],
						[120, 200, 220, 220],
						[255, 230, 120, 240],
						[255, 110, 50, 255]
					],
					pickable: false
				})
			];
		}

		if (mode === 'aggregate') {
			// Cluster facilities into a coarse lat/lng grid; each non-empty
			// cell becomes one column whose hex radius scales with the
			// facility count and whose height scales (sqrt) with the
			// summed metric. We sqrt-compress because linear sums blow
			// out fast — Hunter Valley alone sums to ~9 GW which would
			// otherwise render as a 3,500 km needle that dominates the
			// view. Sqrt keeps the relative ordering monotonic but maps
			// the range into something readable on a continental map.
			const clustered = clusterByGrid(data, 0.5);
			// Radius scales with sqrt(count) off the per-facility radius
			// so a count=1 cell is visually similar to a single hex under
			// non-clustered mode, and a count=4 cell is 2× the footprint
			// (4× area).
			const aggregateRadius = (/** @type {number} */ count) =>
				Math.sqrt(Math.max(count, 1)) * radius;
			// Sqrt of weight × an amplified scale. With the default
			// elevationScale=400, scale here = 6000 — that lands a 200 MW
			// single facility at ~85 km (close to its per-facility column
			// height of 80 km), Bayswater (2.6 GW) at ~310 km, and the
			// Hunter Valley aggregate (~9 GW) at ~570 km. Clean ordering,
			// no stratospheric needles.
			const AGGREGATE_HEIGHT_SCALE = elevationScale * 15;
			/** @typedef {ReturnType<typeof clusterByGrid>[number]} ClusterCell */
			return [
				new ScatterplotLayer({
					id: 'facilities-hex-aggregate-glow',
					data: clustered,
					pickable: false,
					stroked: false,
					filled: true,
					radiusUnits: 'meters',
					getPosition: (/** @type {ClusterCell} */ d) => d.position,
					getRadius: (/** @type {ClusterCell} */ d) => aggregateRadius(d.count) * 2.5,
					getFillColor: (/** @type {ClusterCell} */ d) => [
						d.color[0],
						d.color[1],
						d.color[2],
						50
					]
				}),
				new ColumnLayer({
					id: 'facilities-hex-aggregate',
					data: clustered,
					diskResolution: 6,
					extruded: true,
					pickable: true,
					material: false,
					getPosition: (/** @type {ClusterCell} */ d) => d.position,
					getRadius: (/** @type {ClusterCell} */ d) => aggregateRadius(d.count),
					getElevation: (/** @type {ClusterCell} */ d) =>
						Math.sqrt(Math.max(d.weight, 0)) * AGGREGATE_HEIGHT_SCALE,
					getFillColor: (/** @type {ClusterCell} */ d) => [
						d.color[0],
						d.color[1],
						d.color[2],
						230
					],
					stroked: true,
					getLineColor: (/** @type {ClusterCell} */ d) => [
						Math.min(255, d.color[0] + 40),
						Math.min(255, d.color[1] + 40),
						Math.min(255, d.color[2] + 40),
						220
					],
					lineWidthUnits: 'pixels',
					lineWidthMinPixels: 1
				})
			];
		}

		// Brighten the fuel-tech RGB by mixing 35 % toward white. Dark coal
		// browns / wind greens read better as glowing pillars when bumped up
		// in lightness; subtle enough that fuel identity stays intact.
		const BRIGHT_MIX = 0.35;
		/** @param {[number, number, number] | undefined} c */
		function brighten(c) {
			if (!c) return /** @type {[number, number, number]} */ ([255, 200, 90]);
			return /** @type {[number, number, number]} */ ([
				Math.round(c[0] + (255 - c[0]) * BRIGHT_MIX),
				Math.round(c[1] + (255 - c[1]) * BRIGHT_MIX),
				Math.round(c[2] + (255 - c[2]) * BRIGHT_MIX)
			]);
		}

		return [
			// Flat halo / ground glow underneath every column. Wide and faint
			// so columns look like they're radiating onto the basemap.
			new ScatterplotLayer({
				id: 'facilities-hex-glow',
				data,
				pickable: false,
				stroked: false,
				filled: true,
				radiusUnits: 'meters',
				getPosition: (d) => d.position,
				getRadius: radius * 2.5,
				getFillColor: (d) => {
					const b = brighten(d.color);
					return [b[0], b[1], b[2], 60];
				}
			}),
			new ColumnLayer({
				id: 'facilities-hex-columns',
				data,
				diskResolution: 6, // 6 = hexagon
				radius,
				extruded: true,
				elevationScale,
				pickable: true,
				// `material: false` disables PBR lighting so each face renders
				// at full colour intensity — much brighter against the dark
				// basemap than the default lit shading.
				material: false,
				getPosition: (d) => d.position,
				getElevation: (d) => d.weight,
				getFillColor: (d) => {
					const b = brighten(d.color);
					return [b[0], b[1], b[2], 240];
				},
				getLineColor: (d) => {
					const b = brighten(d.color);
					return [
						Math.min(255, b[0] + 30),
						Math.min(255, b[1] + 30),
						Math.min(255, b[2] + 30),
						220
					];
				},
				lineWidthUnits: 'pixels',
				lineWidthMinPixels: 1,
				stroked: true
			})
		];
	}

	$effect(() => {
		// Reactive deps
		const _data = data;
		const _radius = radius;
		const _elevationScale = elevationScale;
		const _mode = mode;
		const isVisible = visible;
		const map = mapCtx.map;
		if (!map) return;

		if (!isVisible || _data.length === 0) {
			teardownOverlay();
			return;
		}

		ensureOverlay();
		if (!overlay) return;
		// `_radius`/`_elevationScale`/`_mode` are read inside buildLayers via
		// the closures — referenced here to make the $effect track them.
		void _radius;
		void _elevationScale;
		void _mode;

		overlay.setProps({ layers: buildLayers() });
	});

	onDestroy(teardownOverlay);
</script>
