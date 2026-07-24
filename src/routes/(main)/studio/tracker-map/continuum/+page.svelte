<script>
	/**
	 * Continuum — tracker-map design exploration where the camera IS the mode
	 * switch. Zoom alone decides what the map means: zoomed out it reads as the
	 * national grid (flow arcs + region badges), zoomed in it reads as
	 * facilities, and the hand-off is a continuous cross-fade over the hybrid
	 * window (`_lib/zoom-bands.js`). There is no explicit mode UI anywhere.
	 *
	 * The dock is the "haunted panels" experiment: its content follows the
	 * band and the dominant region under the camera, so panning and zooming
	 * quietly re-theme the dashboard beside the map.
	 *
	 * Desktop-only — zoom-semantic transitions need a trackpad/mouse.
	 */

	import { onMount, untrack } from 'svelte';
	import { fly } from 'svelte/transition';
	import { MediaQuery } from 'svelte/reactivity';
	import { page } from '$app/state';
	import { replaceState } from '$app/navigation';

	import Meta from '$lib/components/Meta.svelte';
	import FullscreenLayout from '$lib/components/fullscreen/FullscreenLayout.svelte';
	import FullscreenContainer from '$lib/components/fullscreen/FullscreenContainer.svelte';
	import FullscreenNavDropdown from '$lib/components/fullscreen/FullscreenNavDropdown.svelte';
	import OptionsMenu from '$lib/components/ui/options-menu/OptionsMenu.svelte';
	import ShortcutsToast from '$lib/components/ShortcutsToast.svelte';
	import { ChartRangeBar } from '$lib/components/charts/v2';
	import NetworkChart from '$lib/components/charts/network/NetworkChart.svelte';
	import { createEchoGuard } from '$lib/components/charts/v2/echo-guard.js';
	import { createDragHandler, DragHandle } from '$lib/components/ui/panel';
	import { priceColour } from '$lib/components/info-graphics/system-snapshot/helpers.js';
	import { getFacilityCapacity } from '$lib/facilities/units.js';
	import { regionOptions } from '$lib/regions.js';
	import {
		BELOW_TABLET_QUERY,
		isFullscreenUrl,
		toggleFullscreenMode
	} from '$lib/utils/fullscreen-mode.js';
	import {
		getIntervalSpec,
		getPresetByDays,
		getDefaultIntervalForRange,
		getIntervalOptionsForDays
	} from '$lib/components/charts/facility/range-interval-config.js';
	import {
		getMetricIntervalForDays,
		getHysteresisTarget,
		getDisplayIntervalForDays
	} from '$lib/utils/metric-interval.js';
	import { MIN_DATE } from '$lib/utils/date-range.js';

	import GridMap from '../_shared/GridMap.svelte';
	import PrototypeSwitcherSection from '../_shared/PrototypeSwitcherSection.svelte';
	import FlowArcsLayer from '../_shared/FlowArcsLayer.svelte';
	import RegionBadges from '../_shared/RegionBadges.svelte';
	import FacilitiesLayer from '../_shared/FacilitiesLayer.svelte';
	import StatTiles from '../_shared/StatTiles.svelte';
	import { createGridLive } from '../_shared/grid-live.svelte.js';
	import { fetchAllFacilities } from '../_shared/facilities-data.js';
	import { contrastText, displayCode, formatPrice } from '../_shared/format.js';
	import {
		REGION_BOUNDS,
		NEM_BOUNDS,
		INTERCONNECTORS,
		flowDestination,
		interconnectorsForRegion
	} from '../_shared/region-geo.js';
	import { metricForPanel } from '../_shared/panels.js';
	import { COARSE_PICKER_INTERVALS, DAYS_TO_TOKEN } from '../_shared/route-state.js';
	import InterconnectorList from './_lib/InterconnectorList.svelte';
	import FacilitiesInView from './_lib/FacilitiesInView.svelte';
	import { nextBand, gridOpacity, facilitiesOpacity, dominantRegion } from './_lib/zoom-bands.js';

	/** @type {{ data: import('../_shared/route-state.js').DashboardParams }} */
	let { data } = $props();

	const DAY_MS = 24 * 60 * 60 * 1000;

	/** Debounce for dominant-region changes reaching the dock (see below). */
	const REGION_DEBOUNCE_MS = 400;

	// ============================================
	// Dashboard state (explorer scheme)
	// ============================================

	// The loader's dashboard params seed local state ONCE (explorer
	// convention): later shallow URL writes come from this state, so
	// re-deriving from `data` would loop.
	// svelte-ignore state_referenced_locally
	const initialParams = data;

	/** Range in days (-1 = All), or null when a custom/panned range is active. */
	let selectedRange = $state(/** @type {number | null} */ (initialParams.selectedRange));

	/** Initial viewport seed (from the loader) — NetworkChart reads these once. */
	const dateStart = initialParams.startDate;
	const dateEnd = initialParams.endDate;

	const initialSpec = getIntervalSpec(initialParams.intervalId);
	let activeMetric = $state(/** @type {'power' | 'energy'} */ (initialSpec?.metric ?? 'power'));
	let activeInterval = $state(initialSpec?.apiInterval ?? '5m');
	let displayInterval = $state(initialParams.intervalId);

	let viewStart = $state(0);
	let viewEnd = $state(0);

	/** Shared hover time — syncs crosshairs across the dock's panels. */
	let hoverTime = $state(/** @type {number | undefined} */ (undefined));

	/** Panel chart instances keyed by panel id (bind:this into the record). */
	/** @type {Record<string, NetworkChart | undefined>} */
	let chartRefs = $state({});

	let mounted = $state(false);
	let showShortcutsToast = $state(false);

	// ============================================
	// Camera state — the mode switch
	// ============================================

	/** @type {GridMap | undefined} */
	let gridMap = $state();

	let mapZoom = $state(4);
	/** @type {[number, number]} */
	let mapCenter = $state.raw([134, -28]);
	/** @type {import('./_lib/zoom-bands.js').ZoomBand} */
	let band = $state('national');
	/** Current map bounds as [west, south, east, north] — facilities band only. */
	/** @type {[number, number, number, number] | null} */
	let viewBounds = $state.raw(null);

	/** rAF id for the throttled 'move' handler (cancelled on unmount). */
	let moveRaf = 0;

	// ============================================
	// Live + reference data
	// ============================================

	const gridLive = createGridLive();

	// Full facilities dataset — a large array, so $state.raw (no deep proxy);
	// loaded once after mount through the shared session cache.
	/** @type {any[]} */
	let facilities = $state.raw([]);

	/** @type {any} */
	let selectedFacility = $state.raw(null);

	async function loadFacilities() {
		try {
			facilities = await fetchAllFacilities();
		} catch {
			// Dots and the in-view list simply stay empty — not worth a banner
			// in a prototype.
		}
	}

	// ============================================
	// Derived camera semantics
	// ============================================

	let isFullscreen = $derived(isFullscreenUrl(page.url));

	const belowTablet = new MediaQuery(BELOW_TABLET_QUERY);
	let isDesktop = $derived(!belowTablet.current);

	/** Continuous layer opacities — recomputed every camera frame, never stepped. */
	let arcsBadgesOpacity = $derived(gridOpacity(mapZoom));
	let facilityDotsOpacity = $derived(facilitiesOpacity(mapZoom));

	/** Instantaneous dominant region — drives the context pill and badge ring. */
	let dominantRegionCode = $derived(dominantRegion(mapCenter));

	/**
	 * The dock's region trails the camera's dominant region by ~400ms: panning
	 * along a border would otherwise flip the three region charts — and their
	 * ChartDataManagers, each with in-flight fetches — on every frame the
	 * nearest anchor changes. A timer-based debounce is a genuine side effect,
	 * so this is one of the few legitimate `$effect`s here.
	 */
	let dockRegionCode = $state(dominantRegion([134, -28]));
	$effect(() => {
		const code = dominantRegionCode;
		if (code === untrack(() => dockRegionCode)) return;
		const timer = setTimeout(() => (dockRegionCode = code), REGION_DEBOUNCE_MS);
		return () => clearTimeout(timer);
	});

	/** Explorer-style region value for the dock's charts ('nsw1', 'wem'…). */
	let dockRegionValue = $derived(dockRegionCode.toLowerCase());
	let dockRegionOption = $derived(regionOptions.find((r) => r.value === dockRegionValue));

	let timeZone = $derived(band !== 'national' && dockRegionValue === 'wem' ? '+08:00' : '+10:00');

	let dockTitle = $derived(
		band === 'national'
			? 'National Electricity Market'
			: (dockRegionOption?.label ?? displayCode(dockRegionCode))
	);
	let dockSubtitle = $derived(
		band === 'national'
			? 'Grid overview — zoom in for a region, further for facilities'
			: band === 'hybrid'
				? 'Regional dashboard — keep zooming for facilities'
				: 'Facilities in frame — zoom out to return to the grid'
	);

	// ============================================
	// Camera sync
	// ============================================

	/**
	 * Mirror the camera into reactive state and resolve the band. Runs on a
	 * rAF-throttled 'move' listener (the opacity ramps want per-frame zoom)
	 * and again on moveend to catch the settled tail of eased motion.
	 *
	 * Deliberately does NOT touch `viewBounds`: bounds feed the
	 * facilities-in-view filter+sort over the full dataset, which must
	 * re-run per gesture, not per frame — see `syncViewBounds` (moveend only).
	 * @param {any} map
	 */
	function syncCamera(map) {
		mapZoom = map.getZoom();
		const centre = map.getCenter();
		mapCenter = [centre.lng, centre.lat];
		const next = nextBand(band, mapZoom);
		if (next !== band) {
			band = next;
			// Camera-first: zooming back out of facility range drops the selection.
			if (next !== 'facilities') selectedFacility = null;
		}
	}

	/**
	 * Refresh the facilities-band view bounds once the camera settles, so the
	 * in-view list re-filters per gesture rather than per animation frame.
	 * @param {any} map
	 */
	function syncViewBounds(map) {
		if (band !== 'facilities') return;
		const bounds = map.getBounds();
		viewBounds = [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()];
	}

	/** @param {any} ev maplibre 'load' event */
	function handleMapLoad(ev) {
		const map = ev.target;
		map.fitBounds(NEM_BOUNDS, { padding: 40, duration: 0 });
		// Per-frame camera feed, rAF-throttled: one state write per frame is
		// enough for the opacity ramps, and coalescing avoids re-running the
		// derived graph for every intermediate maplibre 'move' tick.
		map.on('move', () => {
			if (moveRaf) return;
			moveRaf = requestAnimationFrame(() => {
				moveRaf = 0;
				syncCamera(map);
			});
		});
		syncCamera(map);
		syncViewBounds(map);
	}

	/** @param {any} ev maplibre 'moveend' event */
	function handleMoveEnd(ev) {
		syncCamera(ev.target);
		syncViewBounds(ev.target);
	}

	// ============================================
	// Camera-first interactions
	// ============================================

	/**
	 * A badge click just MOVES THE CAMERA to the region's bounds; the band,
	 * dock and pill all follow the zoom — never the other way round.
	 * @param {string} code
	 */
	function handleRegionSelect(code) {
		const bounds = REGION_BOUNDS[code];
		if (bounds) gridMap?.fitBounds(bounds, { padding: 40 });
	}

	/**
	 * Facility pick (map dot or list row): fly the camera in; selection state
	 * follows the camera rather than driving a mode.
	 * @param {any} facility
	 */
	function handleFacilityPick(facility) {
		selectedFacility = facility;
		gridMap?.flyTo({ center: [facility.location.lng, facility.location.lat], zoom: 9.5 });
	}

	/** Context pill: one step back out — reframe the dominant region. */
	function handleContextPillClick() {
		handleRegionSelect(dominantRegionCode);
	}

	// ============================================
	// Scroll-zoom guard experiment
	// ============================================

	/**
	 * While the pointer is over the dock, the map must not scroll-zoom — the
	 * dock needs native DOM scrolling. The dock is a flex sibling of the map,
	 * so wheel events over it never reach the canvas anyway; disabling
	 * `scrollZoom` as well covers the drag-handle strip that overhangs the map
	 * edge and makes the guard explicit. Over the map itself scroll zooms with
	 * NO extra guard (no modifier key, no focus gate): an accidental scroll
	 * flipping the band is exactly the risk this prototype exists to measure,
	 * so softening it would invalidate the comparison.
	 */
	let dockHover = $state(false);

	// ============================================
	// Dock geometry
	// ============================================

	const dockDrag = createDragHandler({
		axis: 'x',
		min: 360,
		max: 620,
		initial: 440,
		invert: true,
		storageKey: 'tracker-map:continuum:dock'
	});

	// ============================================
	// Dock panels (band + region driven)
	// ============================================

	/**
	 * @typedef {Object} DockPanel
	 * @property {string} id
	 * @property {string} title
	 * @property {'power' | 'price' | 'demand'} metric
	 * @property {'stacked' | 'line'} chartKind
	 * @property {string} heightClass
	 * @property {string} region
	 * @property {boolean} [grouped]
	 * @property {boolean} [diverging]
	 * @property {string} [unitLabel]
	 */

	/** @type {DockPanel[]} */
	let dockPanels = $derived.by(() => {
		if (band === 'national') {
			return [
				{
					id: 'generation',
					title: 'Generation mix',
					metric: 'power',
					chartKind: 'stacked',
					heightClass: 'h-[260px]',
					region: '_all',
					grouped: true,
					diverging: true
				}
			];
		}
		const region = dockRegionValue;
		return [
			{
				id: 'generation',
				title: 'Generation',
				metric: 'power',
				chartKind: 'stacked',
				heightClass: 'h-[220px]',
				region,
				grouped: true,
				diverging: true
			},
			{
				id: 'price',
				title: 'Price',
				metric: 'price',
				chartKind: 'line',
				heightClass: 'h-[130px]',
				region,
				unitLabel: '$/MWh'
			},
			{
				id: 'demand',
				title: 'Demand',
				metric: 'demand',
				chartKind: 'line',
				heightClass: 'h-[120px]',
				region,
				unitLabel: 'MW'
			}
		];
	});

	// ============================================
	// Facilities in view (facilities band)
	// ============================================

	let facilitiesInView = $derived.by(() => {
		if (band !== 'facilities' || !viewBounds) return { rows: [], total: 0 };
		const [west, south, east, north] = viewBounds;
		const inView = facilities.filter((f) => {
			const loc = f.location;
			return (
				loc &&
				typeof loc.lat === 'number' &&
				typeof loc.lng === 'number' &&
				loc.lng >= west &&
				loc.lng <= east &&
				loc.lat >= south &&
				loc.lat <= north
			);
		});
		const rows = inView
			.map((facility) => ({ facility, capacity: getFacilityCapacity(facility) }))
			.sort((a, b) => b.capacity - a.capacity)
			.slice(0, 20);
		return { rows, total: inView.length };
	});

	// ============================================
	// Stat tiles
	// ============================================

	/** @param {string} str ISO-ish dispatch datetime */
	function formatDispatchTime(str) {
		if (!str) return '';
		const d = new Date(str);
		if (isNaN(d.getTime())) return '';
		// NEM dispatch time — Brisbane is +10:00 year-round.
		return new Intl.DateTimeFormat('en-AU', {
			hour: 'numeric',
			minute: '2-digit',
			timeZone: 'Australia/Brisbane'
		}).format(d);
	}

	/**
	 * Net interconnector position for a region: positive = importing.
	 * Returns null when no touching corridor has live data (e.g. WEM).
	 * @param {string} code
	 * @param {Record<string, number>} flows
	 * @returns {number | null}
	 */
	function netPositionMW(code, flows) {
		let net = 0;
		let seen = false;
		for (const ic of interconnectorsForRegion(code)) {
			const value = flows[ic.key];
			if (typeof value !== 'number' || !Number.isFinite(value)) continue;
			seen = true;
			net += ic.to === code ? value : -value;
		}
		return seen ? net : null;
	}

	let statTiles = $derived.by(() => {
		const flows = gridLive.flows;
		const prices = gridLive.prices;

		if (band === 'national') {
			/** @type {{ ic: (typeof INTERCONNECTORS)[number], value: number } | null} */
			let biggest = null;
			for (const ic of INTERCONNECTORS) {
				const value = flows[ic.key];
				if (typeof value !== 'number' || !Number.isFinite(value)) continue;
				if (!biggest || Math.abs(value) > Math.abs(biggest.value)) biggest = { ic, value };
			}

			/** @type {{ code: string, price: number } | null} */
			let priciest = null;
			for (const [code, price] of Object.entries(prices)) {
				if (!Number.isFinite(price)) continue;
				if (!priciest || price > priciest.price) priciest = { code, price };
			}

			const dispatch = formatDispatchTime(gridLive.dispatchDateTimeString);

			return [
				{
					id: 'biggest-flow',
					label: 'Biggest flow',
					value: biggest ? `${Math.round(Math.abs(biggest.value))}` : '—',
					unit: biggest ? 'MW' : undefined,
					sub: biggest
						? `${biggest.ic.label.split(' ')[0]} → ${displayCode(
								flowDestination(biggest.ic, biggest.value)
							)}`
						: 'No live flows'
				},
				{
					id: 'priciest-region',
					label: 'Priciest region',
					value: priciest ? formatPrice(priciest.price) : '—',
					unit: priciest ? '/MWh' : undefined,
					sub: priciest ? displayCode(priciest.code) : 'No live prices',
					accent: priciest ? priceColour(priciest.price) : undefined
				},
				{
					id: 'dispatch-time',
					label: 'Dispatch',
					value: dispatch || '—',
					sub: 'NEM time'
				}
			];
		}

		const code = dockRegionCode;
		const price = prices[code];
		const hasPrice = typeof price === 'number' && Number.isFinite(price);
		const net = netPositionMW(code, flows);

		return [
			{
				id: 'region-price',
				label: `${displayCode(code)} price`,
				value: hasPrice ? formatPrice(price) : '—',
				unit: hasPrice ? '/MWh' : undefined,
				accent: hasPrice ? priceColour(price) : undefined
			},
			{
				id: 'net-position',
				label: 'Net position',
				value: net === null ? '—' : `${Math.round(Math.abs(net))}`,
				unit: net === null ? undefined : 'MW',
				sub: net === null ? 'No interconnector data' : net >= 0 ? 'Importing' : 'Exporting'
			}
		];
	});

	/** Context pill price + chip colours (instantaneous dominant region). */
	let pillPrice = $derived.by(() => {
		const price = gridLive.prices[dominantRegionCode];
		return typeof price === 'number' && Number.isFinite(price) ? price : undefined;
	});
	let pillChipBg = $derived(pillPrice !== undefined ? priceColour(pillPrice) : '#C6C6C6');

	// ============================================
	// Viewport sync (explorer machinery over mounted panels)
	// ============================================

	const echo = createEchoGuard();

	let defaultStart = $derived(new Date(dateStart + 'T00:00:00' + timeZone).getTime());
	let defaultEnd = $derived(new Date(dateEnd + 'T23:59:59' + timeZone).getTime());

	/** @param {number} ms */
	function toDateString(ms) {
		const offsetMs = timeZone === '+08:00' ? 8 * 3600_000 : 10 * 3600_000;
		return new Date(ms + offsetMs).toISOString().slice(0, 10);
	}

	let pickerStartDate = $derived(toDateString(viewStart || defaultStart));
	let pickerEndDate = $derived(toDateString(viewEnd || defaultEnd));
	let maxDate = $derived(toDateString(defaultEnd));

	let customDays = $derived(
		Math.max(1, Math.ceil(((viewEnd || defaultEnd) - (viewStart || defaultStart)) / DAY_MS))
	);

	/** @param {number} startMs @param {number} endMs @param {string} intervalId */
	function applyRangeSwitch(startMs, endMs, intervalId) {
		const spec = getIntervalSpec(intervalId);
		if (!spec) return;
		activeMetric = spec.metric;
		activeInterval = spec.apiInterval;
		displayInterval = intervalId;
		viewStart = startMs;
		viewEnd = endMs;
		echo.run(() => {
			for (const panel of dockPanels) chartRefs[panel.id]?.setViewport(startMs, endMs);
		});
		scheduleUrlUpdate();
	}

	/** @param {number} days */
	function handleRangeSelect(days) {
		selectedRange = days;
		const endMs = Date.now();
		let actualDays = days;
		if (days === -1) {
			actualDays = Math.max(1, Math.ceil((endMs - new Date(MIN_DATE).getTime()) / DAY_MS));
		}
		const startMs = endMs - actualDays * DAY_MS;
		const preset = getPresetByDays(days);
		const intervalId = preset
			? getDefaultIntervalForRange(preset.id)
			: getMetricIntervalForDays(actualDays).interval;
		applyRangeSwitch(startMs, endMs, intervalId);
	}

	/** @param {{ start: string, end: string }} range */
	function handleDateRangeChange(range) {
		selectedRange = null;
		const startMs = new Date(range.start).getTime();
		const endMs = new Date(range.end).getTime();
		const days = Math.max(1, Math.ceil((endMs - startMs) / DAY_MS));
		applyRangeSwitch(startMs, endMs, getIntervalOptionsForDays(days).default);
	}

	/** @param {string} value */
	function handleIntervalChange(value) {
		applyRangeSwitch(viewStart || defaultStart, viewEnd || defaultEnd, value);
	}

	/** Hysteresis-aware metric/interval switch — once per gesture, at settle. */
	/** @param {{ start: number, end: number }} range */
	function applyMetricSwitch(range) {
		const durationDays = (range.end - range.start) / DAY_MS;
		const next = getHysteresisTarget(activeMetric, activeInterval, durationDays);
		if (!next && COARSE_PICKER_INTERVALS.has(displayInterval)) return;
		displayInterval = getDisplayIntervalForDays(
			next?.metric ?? activeMetric,
			next?.interval ?? activeInterval,
			durationDays
		);
		if (next) {
			activeMetric = /** @type {'power' | 'energy'} */ (next.metric);
			activeInterval = next.interval;
		}
	}

	/**
	 * Mid-gesture display-interval adaptation (no fetch) — point counts stay
	 * bounded while zooming; explicit coarse picker choices are preserved.
	 * @param {{ start: number, end: number }} range
	 */
	function updateLiveDisplayInterval(range) {
		if (COARSE_PICKER_INTERVALS.has(displayInterval)) return;
		const durationDays = (range.end - range.start) / DAY_MS;
		displayInterval = getDisplayIntervalForDays(activeMetric, activeInterval, durationDays);
	}

	/**
	 * Pan/zoom on any panel drives the shared viewport into the others with
	 * the echo suppressed. `selectedRange` only resets when the range actually
	 * moved — a chart's initial seed report (or a peer echoing an identical
	 * range) must not clear the preset highlight.
	 * @param {{ start: number, end: number }} range
	 * @param {string} sourceId
	 */
	function handlePanelViewport(range, sourceId) {
		if (echo.suppressed) return;
		if (viewStart && viewEnd && (range.start !== viewStart || range.end !== viewEnd)) {
			selectedRange = null;
		}
		viewStart = range.start;
		viewEnd = range.end;
		updateLiveDisplayInterval(range);
		echo.run(() => {
			for (const panel of dockPanels) {
				if (panel.id === sourceId) continue;
				chartRefs[panel.id]?.setViewport(range.start, range.end);
			}
		});
		scheduleUrlUpdate();
	}

	/**
	 * A gesture settled: evaluate the hysteresis switch once with the final
	 * viewport, then prune the peer panels' stale in-flight fetches.
	 * Deliberately not echo-guarded — settles only originate from user
	 * gestures, and the guard's microtask release would swallow the
	 * synchronous zoom-button settle (same reasoning as the Explorer).
	 * @param {{ start: number, end: number }} range
	 * @param {string} sourceId
	 */
	function handlePanelSettle(range, sourceId) {
		applyMetricSwitch(range);
		scheduleUrlUpdate();
		for (const panel of dockPanels) {
			if (panel.id === sourceId) continue;
			chartRefs[panel.id]?.reconcileFetches();
		}
	}

	/** @param {number | undefined} time */
	function handleHoverChange(time) {
		hoverTime = time;
	}

	/**
	 * When the band (or dock region) swaps the panel set, newly mounted charts
	 * seed from the loader dates — push the live shared viewport into them so
	 * the dock keeps one timeline across mode hand-offs. `chartRefs` reads are
	 * tracked, so the effect re-runs as each new chart binds its ref.
	 */
	$effect(() => {
		const panels = dockPanels;
		const start = untrack(() => viewStart);
		const end = untrack(() => viewEnd);
		if (!start || !end) return;
		echo.run(() => {
			for (const panel of panels) chartRefs[panel.id]?.setViewport(start, end);
		});
	});

	// ============================================
	// URL state (shareable dashboard params only)
	// ============================================

	/** @type {ReturnType<typeof setTimeout> | null} */
	let urlTimer = null;
	function scheduleUrlUpdate() {
		if (urlTimer) clearTimeout(urlTimer);
		urlTimer = setTimeout(updateUrl, 400);
	}

	/**
	 * Range/interval only — the camera (zoom/centre → band/region/selection)
	 * is deliberately NOT URL-encoded: whether shareable links should capture
	 * the camera is a production decision out of this prototype's scope.
	 * @param {boolean} fullscreen
	 */
	function buildParams(fullscreen) {
		const params = new URLSearchParams();
		params.set('interval', displayInterval);
		if (selectedRange != null && DAYS_TO_TOKEN[String(selectedRange)]) {
			params.set('range', DAYS_TO_TOKEN[String(selectedRange)]);
		} else if (viewStart && viewEnd) {
			params.set('start', toDateString(viewStart));
			params.set('end', toDateString(viewEnd));
		}
		// Fullscreen is the default — only the windowed opt-out is serialised.
		if (!fullscreen) params.set('fullscreen', 'false');
		return params;
	}

	function updateUrl() {
		if (!mounted) return;
		// Shallow update — keeps the address bar shareable without re-running load.
		replaceState(`?${buildParams(isFullscreen).toString()}`, {});
	}

	function toggleFullscreen() {
		// Shared helper — rebuilds from window.location (authoritative even after
		// the shallow replaceState URL syncs), so the dashboard params survive.
		toggleFullscreenMode(isFullscreen);
	}

	// ============================================
	// Keyboard shortcuts
	// ============================================

	/** @param {KeyboardEvent} e */
	function handleKeydown(e) {
		if (e.key === 'Escape') {
			if (showShortcutsToast) {
				e.preventDefault();
				showShortcutsToast = false;
			}
			return;
		}

		if (e.metaKey || e.ctrlKey || e.altKey) return;
		if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

		if (e.key === '?') {
			showShortcutsToast = !showShortcutsToast;
			return;
		}

		// Shift+F is reserved for the browser's native fullscreen.
		if ((e.key === 'f' || e.key === 'F') && !e.shiftKey) {
			e.preventDefault();
			toggleFullscreen();
			showShortcutsToast = false;
		}
	}

	// ============================================
	// Lifecycle
	// ============================================

	onMount(() => {
		mounted = true;
		gridLive.start();
		loadFacilities();
		return () => {
			gridLive.stop();
			if (moveRaf) cancelAnimationFrame(moveRaf);
			if (urlTimer) clearTimeout(urlTimer);
		};
	});
</script>

<svelte:window onkeydown={handleKeydown} />

<Meta
	title="Tracker map — Continuum"
	description="Design exploration: a zoom-continuum tracker map where the camera is the mode switch — the grid at national zoom, facilities up close."
/>

{#snippet optionsSections(/** @type {{ close: () => void }} */ { close })}
	<PrototypeSwitcherSection current="continuum" windowed={!isFullscreen} {close} />
{/snippet}

<FullscreenLayout {isFullscreen} onexitfullscreen={toggleFullscreen}>
	{#snippet filterBar()}
		<div
			class="relative z-40 max-tablet:hidden shrink-0 border-b border-warm-grey bg-white flex items-center gap-3 flex-nowrap overflow-x-auto px-4 py-2"
		>
			{#if isFullscreen}
				<FullscreenNavDropdown />
			{/if}

			<span
				class="shrink-0 rounded-md bg-light-warm-grey px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-dark-grey"
			>
				Continuum
			</span>

			<div class="h-6 w-px bg-warm-grey"></div>

			<ChartRangeBar
				{selectedRange}
				{customDays}
				{displayInterval}
				startDate={pickerStartDate}
				endDate={pickerEndDate}
				minDate={MIN_DATE}
				{maxDate}
				earliestDate={MIN_DATE}
				showIntervalDropdown={true}
				onrangeselect={handleRangeSelect}
				ondaterangechange={handleDateRangeChange}
				onintervalchange={handleIntervalChange}
			/>

			{#if band !== 'national'}
				<!-- Context pill: the camera's dominant region + its live price.
				     In the facilities band this is the primary orientation cue.
				     Clicking it steps the camera one level back out. -->
				<button
					type="button"
					class="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-mid-warm-grey bg-white py-1 pr-1 pl-2.5 transition-shadow hover:shadow-md"
					onclick={handleContextPillClick}
					title="Zoom back out to {dockRegionOption?.label ?? displayCode(dominantRegionCode)}"
					transition:fly={{ x: -6, duration: 150 }}
				>
					<span class="text-[11px] leading-none font-semibold tracking-wide text-dark-grey">
						{displayCode(dominantRegionCode)}
					</span>
					<span
						class="rounded-full px-1.5 py-0.5 font-mono text-[10px] leading-none"
						style:background-color={pillChipBg}
						style:color={contrastText(pillChipBg)}
					>
						{pillPrice !== undefined ? `${formatPrice(pillPrice)}/MWh` : 'no price'}
					</span>
				</button>
			{/if}

			<div class="ml-auto shrink-0">
				<OptionsMenu
					{isFullscreen}
					onfullscreenchange={toggleFullscreen}
					onshowshortcuts={() => (showShortcutsToast = !showShortcutsToast)}
					sections={optionsSections}
				/>
			</div>
		</div>
	{/snippet}

	{#snippet content()}
		{#if isDesktop}
			<FullscreenContainer {isFullscreen} class="max-tablet:hidden">
				<div class="flex min-h-0 flex-1">
					<!-- Map — the mode switch. Scroll over it zooms (and can flip the
					     band); see the scroll-zoom guard note in the script. -->
					<div class="relative min-w-0 flex-1">
						<GridMap
							bind:this={gridMap}
							mapTheme="light"
							scrollZoom={!dockHover}
							onload={handleMapLoad}
							onmoveend={handleMoveEnd}
						>
							<FlowArcsLayer
								flows={gridLive.flows}
								opacity={arcsBadgesOpacity}
								showLabels={band === 'national'}
							/>
							<RegionBadges
								prices={gridLive.prices}
								compact={band !== 'national'}
								opacity={arcsBadgesOpacity}
								selectedRegion={band === 'national' ? undefined : dominantRegionCode}
								onselect={handleRegionSelect}
							/>
							<FacilitiesLayer
								{facilities}
								opacity={facilityDotsOpacity}
								selectedCode={selectedFacility?.code}
								onselect={handleFacilityPick}
							/>
						</GridMap>

						<!-- Band/zoom readout — dev-ish but tidy; this is a judged
						     prototype and the observer needs the state legible. -->
						<div
							class="pointer-events-none absolute top-3 left-3 z-10 rounded-full border border-mid-warm-grey/60 bg-white/85 px-2.5 py-1 font-mono text-[11px] text-dark-grey shadow-sm backdrop-blur-sm"
						>
							{band} · z{mapZoom.toFixed(1)}
						</div>
					</div>

					<!-- Dock: the haunted panels. Content follows the band + the
					     dominant region under the camera. -->
					<aside
						class="relative flex shrink-0 border-l border-warm-grey bg-white"
						style:width="{dockDrag.value}px"
						onpointerenter={() => (dockHover = true)}
						onpointerleave={() => (dockHover = false)}
					>
						<DragHandle axis="x" onstart={dockDrag.start} active={dockDrag.isDragging} />

						<div class="min-h-0 min-w-0 flex-1 space-y-4 overflow-y-auto p-4">
							<header>
								<h2 class="m-0 text-sm font-semibold text-dark-grey">{dockTitle}</h2>
								<p class="m-0 mt-0.5 text-xs text-mid-grey">{dockSubtitle}</p>
							</header>

							<StatTiles tiles={statTiles} />

							{#if band === 'facilities'}
								{#if selectedFacility}
									<div class="rounded-lg border border-warm-grey bg-light-warm-grey/40 p-3">
										<div class="flex items-baseline justify-between gap-2">
											<h3 class="m-0 truncate text-sm font-semibold text-dark-grey">
												{selectedFacility.name}
											</h3>
											<span class="shrink-0 font-mono text-xs text-dark-grey">
												{Math.round(getFacilityCapacity(selectedFacility))} MW
											</span>
										</div>
										<div class="mt-1 flex items-center justify-between gap-2 text-xs text-mid-grey">
											<span>{selectedFacility.network_region ?? ''}</span>
											<a class="text-dark-grey underline" href="/facility/{selectedFacility.code}">
												Full detail →
											</a>
										</div>
									</div>
								{/if}

								<FacilitiesInView
									rows={facilitiesInView.rows}
									total={facilitiesInView.total}
									selectedCode={selectedFacility?.code}
									onpick={handleFacilityPick}
								/>
							{/if}

							{#each dockPanels as panel (panel.id)}
								<section class="rounded-lg border border-mid-warm-grey/40 bg-white">
									<div
										class="flex items-center justify-between gap-4 border-b border-mid-warm-grey/40 px-4 py-2"
									>
										<h3 class="m-0 text-xs font-semibold text-dark-grey">{panel.title}</h3>
										{#if panel.grouped}
											<span
												class="rounded bg-light-warm-grey px-2 py-0.5 text-[10px] tracking-wider text-dark-grey uppercase"
											>
												{getIntervalSpec(displayInterval)?.label ?? displayInterval}
											</span>
										{:else if panel.unitLabel}
											<span class="text-[10px] text-mid-grey">{panel.unitLabel}</span>
										{/if}
									</div>
									<NetworkChart
										bind:this={chartRefs[panel.id]}
										region={panel.region}
										metric={metricForPanel(panel, activeMetric)}
										interval={activeInterval}
										{displayInterval}
										group={panel.grouped ? 'simple' : undefined}
										chartKind={panel.chartKind}
										{timeZone}
										{dateStart}
										{dateEnd}
										title={panel.title}
										chartHeight={panel.heightClass}
										showContainer={false}
										showHeader={false}
										tooltipMode="floating"
										useDivergingStack={panel.diverging ?? false}
										{hoverTime}
										onhoverchange={handleHoverChange}
										onviewportchange={(range) => handlePanelViewport(range, panel.id)}
										onviewportsettle={(range) => handlePanelSettle(range, panel.id)}
									/>
								</section>
							{/each}

							{#if band === 'national'}
								<InterconnectorList flows={gridLive.flows} />
							{/if}
						</div>
					</aside>
				</div>
			</FullscreenContainer>
		{:else}
			<!-- Mobile: the continuum interaction model needs a trackpad/mouse. -->
			<div class="hidden max-tablet:flex flex-1 items-center justify-center px-6 py-16">
				<div class="max-w-sm rounded-xl border border-warm-grey bg-white p-6 text-center shadow-sm">
					<h2 class="m-0 text-base font-semibold text-dark-grey">Desktop only</h2>
					<p class="m-0 mt-2 text-sm leading-relaxed text-mid-grey">
						The Continuum prototype is desktop-only — zoom-semantic transitions need a
						trackpad/mouse. Try the Lens prototype on mobile.
					</p>
					<a
						class="mt-4 inline-block rounded-lg border border-dark-grey px-4 py-2 text-sm font-medium text-dark-grey transition-colors hover:bg-light-warm-grey"
						href="/studio/tracker-map/modes"
					>
						Open the Modes prototype
					</a>
				</div>
			</div>
		{/if}
	{/snippet}
</FullscreenLayout>

<ShortcutsToast
	visible={showShortcutsToast}
	ondismiss={() => (showShortcutsToast = false)}
	shortcuts={[
		{ label: 'Enter / exit full screen', keys: ['F'] },
		{ label: 'Toggle navigation menu', keys: ['G'] },
		{ label: 'Show shortcuts', keys: ['?'] }
	]}
/>
