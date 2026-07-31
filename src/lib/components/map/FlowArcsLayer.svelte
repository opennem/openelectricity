<script>
	/**
	 * Interconnector flow arcs — render inside a `<MapLibre>` subtree.
	 *
	 * Draws the hand-authored corridors from `$lib/flows/region-geo.js` as a
	 * base line (width scaled by MW), an animated ant-march dash overlay
	 * encoding flow direction (geometry is reversed for negative flows), and
	 * line-centre MW labels. Clicking an arc reports its flow key.
	 *
	 * `selectedKey` emphasises one corridor; `highlightRegion` dims corridors
	 * that don't touch the given region (uppercase code, e.g. 'NSW1').
	 */
	import { GeoJSONSource, LineLayer, SymbolLayer, getMapContext } from 'svelte-maplibre-gl';
	import {
		INTERCONNECTORS,
		NEAR_ZERO_MW,
		interconnectorsForRegion
	} from '$lib/flows/region-geo.js';
	import { CORRIDOR_COLOUR } from '$lib/flows/format.js';

	/**
	 * @type {{
	 *   flows?: Record<string, number | null | undefined>,
	 *   mapTheme?: 'light' | 'dark' | 'satellite',
	 *   selectedKey?: string | null,
	 *   highlightRegion?: string | null,
	 *   onarcclick?: (key: string) => void
	 * }}
	 */
	let {
		flows = {},
		mapTheme = 'light',
		selectedKey = null,
		highlightRegion = null,
		onarcclick = undefined
	} = $props();

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

	// Arc styling per basemap theme; dark/satellite need brighter strokes and a
	// dark label halo to stay legible.
	const PALETTES = {
		light: {
			base: CORRIDOR_COLOUR,
			idle: '#aab6c2',
			selected: '#33475c',
			dash: '#eef3f8',
			label: '#39485a',
			halo: '#ffffff',
			haloWidth: 1.5
		},
		dark: {
			base: '#8fa6c0',
			idle: '#4a5560',
			selected: '#c9d9ec',
			dash: '#f4f7fa',
			label: '#e6edf4',
			halo: '#1c2128',
			haloWidth: 1.5
		},
		satellite: {
			base: '#8fa6c0',
			idle: '#5a646e',
			selected: '#c9d9ec',
			dash: '#f4f7fa',
			label: '#eef3f8',
			halo: '#10151a',
			haloWidth: 2
		}
	};
	let palette = $derived(PALETTES[mapTheme] ?? PALETTES.light);

	// Ant-march clock: step the overlay's dasharray phase at ~DASH_FPS by
	// setting the paint property directly on the map — cheaper than routing a
	// 15fps tick through reactive paint objects, and svelte-maplibre-gl's
	// per-key diffing never touches keys we don't declare. Cancelled on
	// destroy.
	$effect(() => {
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

	let highlightedKeys = $derived(
		highlightRegion ? new Set(interconnectorsForRegion(highlightRegion).map((ic) => ic.key)) : null
	);

	let arcsGeoJSON = $derived.by(() => {
		/** @type {GeoJSON.FeatureCollection} */
		const collection = {
			type: 'FeatureCollection',
			features: INTERCONNECTORS.map((ic) => {
				const raw = flows[ic.key];
				const value = typeof raw === 'number' && Number.isFinite(raw) ? raw : 0;
				const mw = Math.abs(value);
				const selected = ic.key === selectedKey;
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
						mwLabel: `${Math.round(mw)} MW`,
						selected,
						dimmed: !selected && highlightedKeys !== null && !highlightedKeys.has(ic.key)
					}
				};
			})
		};
		return collection;
	});

	/** @typedef {NonNullable<import('svelte').ComponentProps<typeof LineLayer>['paint']>} LinePaintSpec */

	// Static expression parts, hoisted so the paint deriveds below only swap
	// the palette/opacity-bearing keys — rebuilding the interpolate/case
	// expressions on unrelated updates would defeat svelte-maplibre-gl's
	// per-key paint diffing.
	/** Idle test shared by the colour/opacity case expressions. @type {any} */
	const IDLE_MW_TEST = ['<', ['get', 'mw'], NEAR_ZERO_MW];
	/** @type {any} */
	const SELECTED_TEST = ['boolean', ['get', 'selected'], false];
	/** @type {any} */
	const DIMMED_TEST = ['boolean', ['get', 'dimmed'], false];
	/** @type {LinePaintSpec['line-width']} */
	const BASE_LINE_WIDTH = [
		'case',
		SELECTED_TEST,
		['interpolate', ['linear'], ['get', 'mw'], 0, 3, 1700, 7.5],
		['interpolate', ['linear'], ['get', 'mw'], 0, 1.5, 1700, 6]
	];
	/** @type {LinePaintSpec['line-width']} */
	const DASH_LINE_WIDTH = ['interpolate', ['linear'], ['get', 'mw'], 0, 1, 1700, 4];

	let basePaint = $derived(
		/** @type {import('svelte').ComponentProps<typeof LineLayer>['paint']} */ ({
			'line-color': [
				'case',
				SELECTED_TEST,
				palette.selected,
				IDLE_MW_TEST,
				palette.idle,
				palette.base
			],
			'line-width': BASE_LINE_WIDTH,
			'line-opacity': ['case', DIMMED_TEST, 0.25, 1]
		})
	);

	let dashPaint = $derived(
		/** @type {import('svelte').ComponentProps<typeof LineLayer>['paint']} */ ({
			'line-color': palette.dash,
			'line-width': DASH_LINE_WIDTH,
			// Idle corridors get no march — direction is meaningless at ~0 MW.
			// 'line-dasharray' is applied imperatively by the rAF clock above and
			// kept out of the declared paint so paint updates can't clobber the
			// dash phase mid-march.
			'line-opacity': ['case', IDLE_MW_TEST, 0, DIMMED_TEST, 0.25, 1]
		})
	);

	let labelPaint = $derived(
		/** @type {import('svelte').ComponentProps<typeof SymbolLayer>['paint']} */ ({
			'text-color': palette.label,
			'text-halo-color': palette.halo,
			'text-halo-width': palette.haloWidth,
			'text-opacity': ['case', DIMMED_TEST, 0.4, 1]
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
</GeoJSONSource>
