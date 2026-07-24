<script>
	/**
	 * WebGL facility dots — render inside a `<MapLibre>` subtree.
	 *
	 * A single CircleLayer (no clustering, no popups) mirroring the facilities
	 * map's marker treatment: colour from each facility's primary fuel tech,
	 * radius on a sqrt capacity scale, white stroke. The selected facility
	 * grows and takes an accent stroke; clicks report the raw facility object.
	 */
	import { CircleLayer, GeoJSONSource, getMapContext } from 'svelte-maplibre-gl';
	import { primaryFuelTechColour } from '$lib/utils/fueltech-display.js';
	import { getFacilityCapacity } from '$lib/facilities/units.js';

	/**
	 * @type {{
	 *   facilities?: any[],
	 *   opacity?: number,
	 *   selectedCode?: string,
	 *   onselect?: (facility: any) => void,
	 *   regionFilter?: string
	 * }}
	 */
	let {
		facilities = [],
		opacity = 1,
		selectedCode = undefined,
		onselect = undefined,
		regionFilter = undefined
	} = $props();

	const mapCtx = getMapContext();

	// Sqrt capacity scale: 0 MW -> 3px, CAPACITY_REF_MW+ -> 10px (≈ the largest
	// NEM facilities), matching the facilities map's normalised-metric approach.
	const CAPACITY_REF_MW = 3000;
	const RADIUS_MIN = 3;
	const RADIUS_MAX = 10;
	const SELECTED_RADIUS_BONUS = 3;
	const SELECTED_STROKE_COLOUR = '#C74523';

	/**
	 * Marker colour from the facility's most common unit fuel tech.
	 * `primaryFuelTechColour`'s white fallback (a mini-map tint) would vanish
	 * against the white stroke, so unknowns get the facilities map's grey.
	 * @param {any} facility
	 * @returns {string}
	 */
	function facilityColour(facility) {
		const colour = primaryFuelTechColour(facility.units);
		return colour === '#ffffff' ? '#6A6A6A' : colour;
	}

	let located = $derived(
		facilities.filter(
			(f) =>
				f.location &&
				typeof f.location.lat === 'number' &&
				typeof f.location.lng === 'number' &&
				!Number.isNaN(f.location.lat) &&
				!Number.isNaN(f.location.lng) &&
				(!regionFilter || f.network_region === regionFilter)
		)
	);

	let facilitiesByCode = $derived(new Map(located.map((f) => [f.code, f])));

	let facilitiesGeoJSON = $derived.by(() => {
		/** @type {GeoJSON.FeatureCollection} */
		const collection = {
			type: 'FeatureCollection',
			features: located.map((facility) => {
				const capacity = getFacilityCapacity(facility);
				return {
					type: 'Feature',
					geometry: {
						type: 'Point',
						coordinates: [facility.location.lng, facility.location.lat]
					},
					properties: {
						code: facility.code,
						colour: facilityColour(facility),
						capacity_norm: Math.min(1, Math.sqrt(Math.max(0, capacity) / CAPACITY_REF_MW))
					}
				};
			})
		};
		return collection;
	});

	// The radius interpolations are left inline (rather than extracted to a
	// helper) because an extracted expression widens to a loose array type and
	// breaks the paint cast's precise tuple inference — same gotcha as the
	// facilities Map.svelte.
	let circlePaint = $derived(
		/** @type {import('svelte').ComponentProps<typeof CircleLayer>['paint']} */ ({
			'circle-color': ['get', 'colour'],
			'circle-radius': [
				'case',
				['==', ['get', 'code'], selectedCode ?? ''],
				[
					'interpolate',
					['linear'],
					['get', 'capacity_norm'],
					0,
					RADIUS_MIN + SELECTED_RADIUS_BONUS,
					1,
					RADIUS_MAX + SELECTED_RADIUS_BONUS
				],
				['interpolate', ['linear'], ['get', 'capacity_norm'], 0, RADIUS_MIN, 1, RADIUS_MAX]
			],
			'circle-stroke-width': ['case', ['==', ['get', 'code'], selectedCode ?? ''], 2, 1],
			'circle-stroke-color': [
				'case',
				['==', ['get', 'code'], selectedCode ?? ''],
				SELECTED_STROKE_COLOUR,
				'#ffffff'
			],
			'circle-opacity': 0.85 * opacity,
			'circle-stroke-opacity': 0.9 * opacity
		})
	);

	// Draw the selected facility above its neighbours.
	let circleLayout = $derived(
		/** @type {import('svelte').ComponentProps<typeof CircleLayer>['layout']} */ ({
			'circle-sort-key': ['case', ['==', ['get', 'code'], selectedCode ?? ''], 1, 0]
		})
	);

	/** @param {any} e */
	function handleClick(e) {
		const code = e?.features?.[0]?.properties?.code;
		if (!code) return;
		const facility = facilitiesByCode.get(code);
		if (facility) onselect?.(facility);
	}

	function handleMouseEnter() {
		if (!onselect) return;
		const canvas = mapCtx.map?.getCanvas();
		if (canvas) canvas.style.cursor = 'pointer';
	}

	function handleMouseLeave() {
		if (!onselect) return;
		const canvas = mapCtx.map?.getCanvas();
		if (canvas) canvas.style.cursor = '';
	}
</script>

<GeoJSONSource id="tracker-facilities" data={facilitiesGeoJSON}>
	<CircleLayer
		id="tracker-facility-points"
		paint={circlePaint}
		layout={circleLayout}
		onclick={handleClick}
		onmouseenter={handleMouseEnter}
		onmouseleave={handleMouseLeave}
	/>
</GeoJSONSource>
