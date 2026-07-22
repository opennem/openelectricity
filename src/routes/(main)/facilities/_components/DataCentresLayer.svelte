<script>
	import { GeoJSONSource, CircleLayer, Popup } from 'svelte-maplibre-gl';
	import { toGeoJSON, DC_MARKER } from '$lib/facilities/data-centres.js';

	/**
	 * Data centres (large loads) overlay for the facilities map. Renders purple
	 * circles sized by best-available MW, with status encoded as fill opacity
	 * (announced sites read as faint rings). Must be placed inside a `<MapLibre>`
	 * (svelte-maplibre-gl) — it relies on the map context its layer children read.
	 *
	 * Fed the page's FILTERED load pseudo-facilities (`loads`) so the markers
	 * respect the region and load-status filters exactly like the views do —
	 * features are rebuilt from each load's raw `dataCentre` record; records
	 * without coordinates are dropped by `toGeoJSON`.
	 *
	 * Clicking a marker reports the feature's properties via `onselect` — the
	 * page opens its load detail pane (mirroring facility selection). While a
	 * load is selected its marker stays bright and grows; the rest dim.
	 *
	 * @type {{
	 *   visible?: boolean,
	 *   loads?: any[],
	 *   satelliteView?: boolean,
	 *   map?: any,
	 *   selectedId?: string | null,
	 *   onselect?: (properties: any) => void
	 * }}
	 */
	let {
		visible = false,
		loads = [],
		satelliteView = false,
		map = null,
		selectedId = null,
		onselect
	} = $props();

	let geojson = $derived(toGeoJSON({ data_centres: loads.map((f) => f.dataCentre) }));

	/** @type {{ properties: any, lnglat: [number, number] } | null} */
	let hovered = $state(null);

	/**
	 * @param {any} e
	 */
	function handleMouseEnter(e) {
		const feature = e.features?.[0];
		if (!feature) return;
		if (map) map.getCanvas().style.cursor = 'pointer';
		hovered = {
			properties: feature.properties,
			lnglat: /** @type {[number, number]} */ (feature.geometry.coordinates)
		};
	}

	function handleMouseLeave() {
		if (map) map.getCanvas().style.cursor = '';
		hovered = null;
	}

	/**
	 * @param {any} e
	 */
	function handleClick(e) {
		const feature = e.features?.[0];
		if (!feature) return;
		hovered = null;
		onselect?.(feature.properties);
	}

	// No hover popup while a load is selected — the detail pane carries the info.
	/** @type {{ properties: any, lnglat: [number, number] } | null} */
	let popup = $derived.by(() => (selectedId ? null : hovered));

	// Fixed purple fill + thick dark stroke — the inverse of the generator
	// markers' fuel-tech fill + thin white stroke, so loads read as a distinct
	// class. Status dims the fill only (stroke stays solid), so announced sites
	// render as hollow rings rather than vanishing. The selected marker stays at
	// full opacity and grows while the rest dim, matching facility behaviour.
	// Colours and the status→opacity scale come from DC_MARKER (shared with the
	// legend).
	let circlePaint = $derived.by(() => {
		const selectedMatch = /** @type {any} */ (['==', ['get', 'id'], selectedId ?? '']);
		const baseRadius = /** @type {any} */ ([
			'case',
			['get', 'has_mw'],
			['interpolate', ['linear'], ['get', 'size'], 0, 3, 1, 22],
			4
		]);
		return /** @type {import('svelte').ComponentProps<typeof CircleLayer>['paint']} */ ({
			'circle-color': satelliteView ? DC_MARKER.satelliteFill : DC_MARKER.fill,
			'circle-radius': selectedId
				? ['case', selectedMatch, ['+', baseRadius, 2], baseRadius]
				: baseRadius,
			'circle-stroke-color': DC_MARKER.stroke,
			'circle-stroke-width': selectedId ? ['case', selectedMatch, 3, 2] : 2,
			'circle-stroke-opacity': selectedId ? ['case', selectedMatch, 1, 0.3] : 0.9,
			'circle-opacity': [
				'case',
				selectedMatch,
				1,
				[
					'*',
					selectedId ? 0.35 : 1,
					[
						'match',
						['get', 'status_bucket'],
						'operating',
						DC_MARKER.statusOpacity.operating,
						'construction',
						DC_MARKER.statusOpacity.construction,
						'retired',
						DC_MARKER.statusOpacity.retired,
						DC_MARKER.statusOpacity.announced
					]
				]
			]
		});
	});
</script>

{#if visible}
	<GeoJSONSource id="data-centres" data={geojson}>
		<CircleLayer
			id="data-centre-points"
			paint={circlePaint}
			onmouseenter={handleMouseEnter}
			onmouseleave={handleMouseLeave}
			onclick={handleClick}
		/>
	</GeoJSONSource>

	{#if popup}
		<Popup lnglat={popup.lnglat} offset={[0, -15]} closeOnClick={false} anchor="bottom">
			<div class="bg-black rounded-lg px-4 py-3 shadow-lg text-white min-w-[220px]">
				<div class="font-semibold text-sm">{popup.properties.name}</div>
				<div class="text-xs text-white/60 mb-3 border-b border-white/20 pb-3">
					{[
						popup.properties.company,
						[popup.properties.city, popup.properties.state].filter(Boolean).join(', ')
					]
						.filter(Boolean)
						.join(' · ')}
				</div>
				<div class="text-xs flex flex-col gap-1">
					<div>
						{popup.properties.status_label}{popup.properties.status_bucket === 'announced' &&
						popup.properties.status_raw
							? ` (${popup.properties.status_raw})`
							: ''}
					</div>
					<div class="text-white/80">
						{popup.properties.has_mw ? popup.properties.mw_label : 'Load: —'}
					</div>
				</div>
			</div>
		</Popup>
	{/if}
{/if}
