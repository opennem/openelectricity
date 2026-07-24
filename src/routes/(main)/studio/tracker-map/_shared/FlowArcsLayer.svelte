<script>
	/**
	 * Interconnector flow arcs — render inside a `<MapLibre>` subtree.
	 *
	 * Draws the hand-authored corridors from `region-geo.js` as a base line
	 * (width scaled by MW), an animated ant-march dash overlay encoding flow
	 * direction (geometry is reversed for negative flows), and optional
	 * line-centre MW labels. Clicking an arc reports its flow key.
	 */
	import { GeoJSONSource, LineLayer, SymbolLayer, getMapContext } from 'svelte-maplibre-gl';
	import { INTERCONNECTORS, NEAR_ZERO_MW } from './region-geo.js';

	/**
	 * @type {{
	 *   flows?: Record<string, number | null | undefined>,
	 *   opacity?: number,
	 *   showLabels?: boolean,
	 *   onarcclick?: (key: string) => void
	 * }}
	 */
	let { flows = {}, opacity = 1, showLabels = true, onarcclick = undefined } = $props();

	const mapCtx = getMapContext();

	/** ~15fps is plenty for the dash march and keeps the GPU quiet. */
	const DASH_FPS = 15;

	// Standard MapLibre ant-march sequence: the dash pattern phase-shifts one
	// half-step per frame, reading as movement along the line's direction.
	const DASH_SEQUENCE = [
		[0, 4, 3],
		[0.5, 4, 2.5],
		[1, 4, 2],
		[1.5, 4, 1.5],
		[2, 4, 1],
		[2.5, 4, 0.5],
		[3, 4, 0],
		[0, 0.5, 3, 3.5],
		[0, 1, 3, 3],
		[0, 1.5, 3, 2.5],
		[0, 2, 3, 2],
		[0, 2.5, 3, 1.5],
		[0, 3, 3, 1],
		[0, 3.5, 3, 0.5]
	];

	const DASH_LAYER_ID = 'flow-arcs-dash';

	/** Fully faded out ⇒ pause the march. Derived so the effect below only
	 *  re-runs on the 0 ↔ non-0 transition — continuum's per-frame opacity
	 *  ramp must not tear down/rebuild the rAF loop every zoom frame. */
	let paused = $derived(opacity === 0);

	// Ant-march clock: step the overlay's dasharray phase at ~DASH_FPS by
	// setting the paint property directly on the map — cheaper than routing a
	// 15fps tick through reactive paint objects, and svelte-maplibre-gl's
	// per-key diffing never touches keys we don't declare. Paused entirely
	// while the layer is faded out; cancelled on destroy.
	$effect(() => {
		if (paused) return;
		const map = mapCtx.map;
		if (!map) return;
		let lastStep = -1;
		let raf = requestAnimationFrame(function tick(now) {
			const step = Math.floor((now / 1000) * DASH_FPS) % DASH_SEQUENCE.length;
			if (step !== lastStep && map.getLayer(DASH_LAYER_ID)) {
				lastStep = step;
				map.setPaintProperty(DASH_LAYER_ID, 'line-dasharray', DASH_SEQUENCE[step]);
			}
			raf = requestAnimationFrame(tick);
		});
		return () => cancelAnimationFrame(raf);
	});

	let arcsGeoJSON = $derived.by(() => {
		/** @type {GeoJSON.FeatureCollection} */
		const collection = {
			type: 'FeatureCollection',
			features: INTERCONNECTORS.map((ic) => {
				const raw = flows[ic.key];
				const value = typeof raw === 'number' && Number.isFinite(raw) ? raw : 0;
				const mw = Math.abs(value);
				return {
					type: 'Feature',
					geometry: {
						type: 'LineString',
						// Direction is encoded in coordinate order: positive flows walk
						// the corridor from -> to, negative flows walk it in reverse.
						coordinates: value >= 0 ? ic.path : [...ic.path].reverse()
					},
					properties: {
						key: ic.key,
						label: ic.label,
						mw,
						capFraction: Math.min(1, mw / ic.capacityMW),
						mwLabel: `${Math.round(mw)} MW`
					}
				};
			})
		};
		return collection;
	});

	/** @typedef {NonNullable<import('svelte').ComponentProps<typeof LineLayer>['paint']>} LinePaintSpec */

	// Static expression parts, hoisted so the paint deriveds below only swap
	// the opacity-bearing keys — continuum ramps `opacity` every zoom frame,
	// and rebuilding the interpolate/case expressions each frame would defeat
	// svelte-maplibre-gl's per-key paint diffing.
	/** Idle test shared by the colour/opacity case expressions. @type {any} */
	const IDLE_MW_TEST = ['<', ['get', 'mw'], NEAR_ZERO_MW];
	/** @type {LinePaintSpec['line-color']} */
	const BASE_LINE_COLOUR = ['case', IDLE_MW_TEST, '#aab6c2', '#5f7690'];
	/** @type {LinePaintSpec['line-width']} */
	const BASE_LINE_WIDTH = ['interpolate', ['linear'], ['get', 'mw'], 0, 1.5, 1700, 6];
	/** @type {LinePaintSpec['line-width']} */
	const DASH_LINE_WIDTH = ['interpolate', ['linear'], ['get', 'mw'], 0, 1, 1700, 4];

	let basePaint = $derived(
		/** @type {import('svelte').ComponentProps<typeof LineLayer>['paint']} */ ({
			'line-color': BASE_LINE_COLOUR,
			'line-width': BASE_LINE_WIDTH,
			'line-opacity': opacity
		})
	);

	let dashPaint = $derived(
		/** @type {import('svelte').ComponentProps<typeof LineLayer>['paint']} */ ({
			'line-color': '#eef3f8',
			'line-width': DASH_LINE_WIDTH,
			// Idle corridors get no march — direction is meaningless at ~0 MW.
			// 'line-dasharray' is applied imperatively by the rAF clock above and
			// kept out of the declared paint so opacity updates can't clobber the
			// dash phase mid-march.
			'line-opacity': ['case', IDLE_MW_TEST, 0, opacity]
		})
	);

	let labelPaint = $derived(
		/** @type {import('svelte').ComponentProps<typeof SymbolLayer>['paint']} */ ({
			'text-color': '#39485a',
			'text-halo-color': '#ffffff',
			'text-halo-width': 1.5,
			'text-opacity': opacity
		})
	);

	/** @param {any} e */
	function handleArcClick(e) {
		const key = e?.features?.[0]?.properties?.key;
		if (key) onarcclick?.(key);
	}

	function handleMouseEnter() {
		if (!onarcclick) return;
		const canvas = mapCtx.map?.getCanvas();
		if (canvas) canvas.style.cursor = 'pointer';
	}

	function handleMouseLeave() {
		if (!onarcclick) return;
		const canvas = mapCtx.map?.getCanvas();
		if (canvas) canvas.style.cursor = '';
	}
</script>

<GeoJSONSource id="flow-arcs" data={arcsGeoJSON}>
	<LineLayer
		id="flow-arcs-base"
		paint={basePaint}
		layout={{ 'line-cap': 'round', 'line-join': 'round' }}
		onclick={handleArcClick}
		onmouseenter={handleMouseEnter}
		onmouseleave={handleMouseLeave}
	/>

	<LineLayer
		id={DASH_LAYER_ID}
		paint={dashPaint}
		layout={{ 'line-cap': 'round', 'line-join': 'round' }}
	/>

	{#if showLabels}
		<SymbolLayer
			id="flow-arcs-labels"
			paint={labelPaint}
			layout={{
				'symbol-placement': 'line-center',
				'text-field': ['get', 'mwLabel'],
				'text-font': ['DM_Mono'],
				'text-size': 11,
				'text-allow-overlap': true
			}}
		/>
	{/if}
</GeoJSONSource>
