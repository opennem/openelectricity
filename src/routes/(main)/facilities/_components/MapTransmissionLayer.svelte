<script>
	import { onDestroy } from 'svelte';
	import { getMapContext } from 'svelte-maplibre-gl';
	import { MapboxOverlay } from '@deck.gl/mapbox';
	import { LineLayer } from '@deck.gl/layers';
	import { segmentTransmission } from '../_utils/segment-transmission.js';

	/**
	 * deck.gl LineLayer overlay for the transmission grid. Replaces the maplibre
	 * native LineLayer with anti-aliased per-segment rendering and screen-space
	 * widths. Lazy-loads `transmission-lines.geojson` on first mount.
	 *
	 * `facilities` (optional) tints each segment's hue toward `NEAR_RGB` based
	 * on its midpoint's distance to the nearest facility. Clusters of
	 * facilities produce hotter regions of the grid.
	 *
	 * @type {{
	 *   visible?: boolean,
	 *   voltageVisibility?: { high: boolean, medium: boolean, low: boolean, lowest: boolean },
	 *   facilities?: any[]
	 * }}
	 */
	let {
		visible = true,
		voltageVisibility = { high: true, medium: true, low: true, lowest: true },
		facilities = []
	} = $props();

	const mapCtx = getMapContext();

	/** @type {InstanceType<typeof MapboxOverlay> | null} */
	let overlay = null;
	/** @type {{ features: any[] } | null} */
	let geojson = $state(null);

	$effect(() => {
		let cancelled = false;
		fetch('/data/transmission-lines.geojson')
			.then((r) => r.json())
			.then((data) => {
				if (!cancelled) geojson = data;
			})
			.catch(() => {
				// Silent: a failed fetch leaves the overlay empty, which is
				// acceptable behaviour (no lines render). Map still works.
			});
		return () => {
			cancelled = true;
		};
	});

	let facilityPoints = $derived.by(() => {
		/** @type {[number, number][]} */
		const pts = [];
		for (const f of facilities) {
			const lng = f?.location?.lng;
			const lat = f?.location?.lat;
			if (typeof lng === 'number' && typeof lat === 'number') pts.push([lng, lat]);
		}
		return pts;
	});

	let segments = $derived(
		geojson ? segmentTransmission(geojson, voltageVisibility, facilityPoints) : []
	);

	function ensureOverlay() {
		const map = mapCtx.map;
		if (!map || overlay) return;
		// `interleaved: false` so the overlay rides its own canvas; canvases
		// stack by `addControl` order, and `MapTransmissionLayer` mounts
		// before `MapHexLayer` in `Map.svelte` so transmission sits below
		// the deck.gl marker canvas. (Interleaved + `beforeId` was tried
		// but errors when the target maplibre layer doesn't yet exist.)
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
		return [
			new LineLayer({
				id: 'transmission-lines',
				data: segments,
				pickable: true,
				widthUnits: 'pixels',
				widthMinPixels: 1,
				getSourcePosition: (/** @type {any} */ d) => d.from,
				getTargetPosition: (/** @type {any} */ d) => d.to,
				getColor: (/** @type {any} */ d) => d.color,
				getWidth: (/** @type {any} */ d) => d.width
			})
		];
	}

	$effect(() => {
		const map = mapCtx.map;
		if (!map) return;

		if (!visible || segments.length === 0) {
			teardownOverlay();
			return;
		}

		ensureOverlay();
		if (!overlay) return;

		overlay.setProps({ layers: buildLayers() });
	});

	onDestroy(teardownOverlay);
</script>
