<script>
	import { onDestroy } from 'svelte';
	import { getMapContext } from 'svelte-maplibre-gl';
	import { MapboxOverlay } from '@deck.gl/mapbox';
	import { ColumnLayer, ScatterplotLayer } from '@deck.gl/layers';
	import { HeatmapLayer } from '@deck.gl/aggregation-layers';

	/**
	 * deck.gl overlay for the facilities map. Single component owns the
	 * deck.gl chunk — code-split via dynamic import in `Map.svelte` so the
	 * ~200 KB bundle only loads when the user picks a non-default marker
	 * mode.
	 *
	 * Modes:
	 *   - `column` (default): one hexagonal column per facility (`ColumnLayer`
	 *     with `diskResolution: 6`). Height = facility weight × elevationScale.
	 *   - `heatmap`: smooth 2D density heatmap (`HeatmapLayer`). Flat —
	 *     pairs well with top-down camera.
	 *   - `scatter`: per-facility deck.gl `ScatterplotLayer` circles. Drop-in
	 *     for the maplibre `CircleLayer` with smoother anti-aliasing.
	 *
	 * @type {{
	 *   data: Array<{ position: [number, number], weight: number, code?: string, color?: [number, number, number] }>,
	 *   visible?: boolean,
	 *   mode?: 'column' | 'heatmap' | 'scatter',
	 *   radius?: number,
	 *   elevationScale?: number,
	 *   hexDiskResolution?: number,
	 *   hexBrightMix?: number,
	 *   hexFillAlpha?: number,
	 *   hexGlowRadiusMultiplier?: number,
	 *   hexGlowAlpha?: number,
	 *   hexOutlineAlpha?: number,
	 *   hexExtruded?: boolean,
	 *   hexMaterial?: boolean,
	 *   heatmapRadiusPixels?: number,
	 *   heatmapIntensity?: number,
	 *   heatmapThreshold?: number,
	 *   heatmapDebounceMs?: number,
	 *   heatmapTextureSize?: number,
	 *   circleMin?: number,
	 *   circleMax?: number
	 * }}
	 */
	let {
		data,
		visible = false,
		mode = 'column',
		radius = 8000,
		elevationScale = 1,
		hexDiskResolution = 6,
		hexBrightMix = 0.35,
		hexFillAlpha = 240,
		hexGlowRadiusMultiplier = 2.5,
		hexGlowAlpha = 60,
		hexOutlineAlpha = 220,
		hexExtruded = true,
		hexMaterial = false,
		heatmapRadiusPixels = 75,
		heatmapIntensity = 1.4,
		heatmapThreshold = 0.02,
		heatmapDebounceMs = 300,
		heatmapTextureSize = 512,
		circleMin = 4,
		circleMax = 28
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
		if (mode === 'scatter') {
			// Per-facility circles drawn as three stacked discs to fake a
			// radial gradient — wide faint halo + mid blend + bright core.
			// `weight` is sqrt-normalised metric × HEX_WEIGHT_SCALE upstream
			// (0..10000); we map it onto the user-tunable [circleMin,
			// circleMax] pixel range, then scale per disc.
			const range = Math.max(0.1, circleMax - circleMin);
			/** @param {any} d */
			const baseRadius = (d) => circleMin + (d.weight / 10000) * range;
			const stack = [
				{ mult: 2.2, alpha: 20 },
				{ mult: 1.7, alpha: 55 },
				{ mult: 1.3, alpha: 115 },
				{ mult: 1.0, alpha: 235 }
			];
			return stack.map(
				({ mult, alpha }, i) =>
					new ScatterplotLayer({
						id: `facilities-scatter-${i}`,
						data,
						// Picking only on the bright top disc — avoids
						// overlapping picks per facility.
						pickable: i === stack.length - 1,
						stroked: false,
						filled: true,
						radiusUnits: 'pixels',
						radiusMinPixels: 2,
						getPosition: (/** @type {any} */ d) => d.position,
						getRadius: (/** @type {any} */ d) => baseRadius(d) * mult,
						getFillColor: (/** @type {any} */ d) => {
							const c = d.color ?? [136, 136, 136];
							return [c[0], c[1], c[2], alpha];
						},
						// Without explicit triggers, deck.gl reuses cached
						// per-feature radius from previous renders even when
						// the accessor closure changes, so dragging the
						// min/max sliders looked like it had no effect.
						updateTriggers: {
							getRadius: [circleMin, circleMax]
						}
					})
			);
		}
		if (mode === 'heatmap') {
			return [
				new HeatmapLayer({
					id: 'facilities-heatmap',
					data,
					getPosition: (d) => d.position,
					getWeight: (d) => d.weight,
					aggregation: 'SUM',
					radiusPixels: heatmapRadiusPixels,
					// `debounceTimeout` defers re-aggregation during continuous
					// zoom/pan gestures (renders a stretched last frame mid-
					// gesture, recomputes when the user settles). Default 2048
					// `weightsTextureSize` is overkill for AU-scale data; 512
					// is 16× cheaper per frame.
					debounceTimeout: heatmapDebounceMs,
					weightsTextureSize: heatmapTextureSize,
					intensity: heatmapIntensity,
					// `threshold` is the alpha cutoff (relative to peak) below
					// which pixels render transparent — lower extends the soft
					// tail outward.
					threshold: heatmapThreshold,
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

		// Brighten the fuel-tech RGB by mixing toward white. Dark coal browns
		// / wind greens read better as glowing pillars when bumped up in
		// lightness. Mix amount is tunable via `hexBrightMix` (0 = raw fuel
		// colour, 1 = solid white).
		/** @param {[number, number, number] | undefined} c */
		function brighten(c) {
			if (!c) return /** @type {[number, number, number]} */ ([255, 200, 90]);
			return /** @type {[number, number, number]} */ ([
				Math.round(c[0] + (255 - c[0]) * hexBrightMix),
				Math.round(c[1] + (255 - c[1]) * hexBrightMix),
				Math.round(c[2] + (255 - c[2]) * hexBrightMix)
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
				getRadius: radius * hexGlowRadiusMultiplier,
				getFillColor: (d) => {
					const b = brighten(d.color);
					return [b[0], b[1], b[2], hexGlowAlpha];
				}
			}),
			new ColumnLayer({
				id: 'facilities-hex-columns',
				data,
				diskResolution: hexDiskResolution,
				radius,
				extruded: hexExtruded,
				elevationScale,
				pickable: true,
				// `material: false` disables PBR lighting so each face renders
				// at full colour intensity — much brighter against the dark
				// basemap than the default lit shading. Toggle via
				// `hexMaterial` for the lit look.
				material: hexMaterial,
				getPosition: (d) => d.position,
				getElevation: (d) => d.weight,
				getFillColor: (d) => {
					const b = brighten(d.color);
					return [b[0], b[1], b[2], hexFillAlpha];
				},
				getLineColor: (d) => {
					const b = brighten(d.color);
					return [
						Math.min(255, b[0] + 30),
						Math.min(255, b[1] + 30),
						Math.min(255, b[2] + 30),
						hexOutlineAlpha
					];
				},
				lineWidthUnits: 'pixels',
				lineWidthMinPixels: 1,
				stroked: true
			})
		];
	}

	$effect(() => {
		const map = mapCtx.map;
		if (!map) return;

		if (!visible || data.length === 0) {
			teardownOverlay();
			return;
		}

		ensureOverlay();
		if (!overlay) return;

		// Heatmap mode caps the deck canvas at 1× DPR — the GPU pipeline is
		// ~4× cheaper on Retina and the smooth Gaussian blobs absorb the
		// resolution drop without looking soft. Column / aggregate modes
		// keep full DPR so hex outlines stay crisp.
		overlay.setProps({
			useDevicePixels: mode === 'heatmap' ? false : true,
			layers: buildLayers()
		});
	});

	onDestroy(teardownOverlay);
</script>
