<script>
	/**
	 * Focus stack — tracker-map design exploration.
	 *
	 * A selection-driven drill-down: the dashboard is always ABOUT one focus
	 * object (NEM → region → facility), the breadcrumb is the spine, and
	 * facilities are simply the contents of a region. The map (left) and dock
	 * (right, ~480px) both re-frame around the focus; the time range / interval
	 * machinery is the Explorer's — one viewport shared across every mounted
	 * chart via the echo-guarded sync + settle-time hysteresis ladder — and it
	 * deliberately survives push/pop, so drilling in never resets the range.
	 *
	 * History model: focus LEVEL changes navigate with `goto` (a real history
	 * entry) so browser back/forward pops/replays the focus stack, while
	 * micro-changes (viewport pans, range tweaks) use the debounced shallow
	 * `replaceState`. `data.focus` re-derives from the URL on every navigation,
	 * so back/forward needs no extra bookkeeping. Codec: see `focus-state.js`.
	 */

	import { onMount, untrack } from 'svelte';
	import { page } from '$app/state';
	import { goto, replaceState } from '$app/navigation';

	import Meta from '$lib/components/Meta.svelte';
	import FullscreenLayout from '$lib/components/fullscreen/FullscreenLayout.svelte';
	import FullscreenNavDropdown from '$lib/components/fullscreen/FullscreenNavDropdown.svelte';
	import OptionsMenu from '$lib/components/ui/options-menu/OptionsMenu.svelte';
	import ShortcutsToast from '$lib/components/ShortcutsToast.svelte';
	import { ChartRangeBar } from '$lib/components/charts/v2';
	import NetworkChart from '$lib/components/charts/network/NetworkChart.svelte';
	import { createEchoGuard } from '$lib/components/charts/v2/echo-guard.js';
	import { createDragHandler, DragHandle } from '$lib/components/ui/panel';
	import { regionToNetwork } from '$lib/components/charts/network/region-to-network.js';
	import { regionsWithLabels } from '$lib/regions.js';
	import { priceColour } from '$lib/components/info-graphics/system-snapshot/helpers.js';
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
	import { isFullscreenUrl, toggleFullscreenMode } from '$lib/utils/fullscreen-mode.js';

	import GridMap from '../_shared/GridMap.svelte';
	import PrototypeSwitcherSection from '../_shared/PrototypeSwitcherSection.svelte';
	import FlowArcsLayer from '../_shared/FlowArcsLayer.svelte';
	import RegionBadges from '../_shared/RegionBadges.svelte';
	import FacilitiesLayer from '../_shared/FacilitiesLayer.svelte';
	import StatTiles from '../_shared/StatTiles.svelte';
	import { createGridLive } from '../_shared/grid-live.svelte.js';
	import { fetchAllFacilities } from '../_shared/facilities-data.js';
	import { formatPrice } from '../_shared/format.js';
	import {
		NEM_BOUNDS,
		REGION_BOUNDS,
		INTERCONNECTORS,
		directionLabel,
		interconnectorsForRegion
	} from '../_shared/region-geo.js';
	import { metricForPanel } from '../_shared/panels.js';
	import { COARSE_PICKER_INTERVALS, DAYS_TO_TOKEN } from '../_shared/route-state.js';

	import { encodeFocus, focusRegionOf, isFocusRegion, FOCUS_REGIONS } from './focus-state.js';
	import Breadcrumb from './components/Breadcrumb.svelte';
	import RegionPriceChips from './components/RegionPriceChips.svelte';
	import InterconnectorList from './components/InterconnectorList.svelte';
	import FacilityPreview from './components/FacilityPreview.svelte';

	/**
	 * @type {{ data: import('../_shared/route-state.js').DashboardParams &
	 *   { focus: import('./focus-state.js').Focus } }}
	 */
	let { data } = $props();

	const DAY_MS = 24 * 60 * 60 * 1000;

	/** No grouping selector in this prototype — the mix reads simplified. */
	const FOCUS_GROUP = 'simple';

	// ============================================
	// Focus (URL-derived — see the history model note above)
	// ============================================

	let focus = $derived(data.focus);
	let focusRegion = $derived(focusRegionOf(focus));
	/** NetworkChart / dashboard-param region value for the current focus. */
	let chartRegion = $derived(focusRegion ? focusRegion.toLowerCase() : '_all');

	// ============================================
	// Range / interval / viewport state (Explorer conventions)
	// ============================================

	// The initial-value captures below are deliberate: focus push/pop re-runs
	// the loader (goto), and the current range/interval must survive it — only
	// the first load seeds them.
	/** Range in days (-1 = All), or null when a custom/panned range is active. */
	// svelte-ignore state_referenced_locally
	let selectedRange = $state(/** @type {number | null} */ (data.selectedRange));

	/** Initial viewport seed — captured once; push/pop must NOT reset the range. */
	// svelte-ignore state_referenced_locally
	const seedStartDate = data.startDate;
	// svelte-ignore state_referenced_locally
	const seedEndDate = data.endDate;

	// svelte-ignore state_referenced_locally
	const initialSpec = getIntervalSpec(data.intervalId);
	let activeMetric = $state(/** @type {'power' | 'energy'} */ (initialSpec?.metric ?? 'power'));
	let activeInterval = $state(initialSpec?.apiInterval ?? '5m');
	// svelte-ignore state_referenced_locally
	let displayInterval = $state(data.intervalId);

	let viewStart = $state(0);
	let viewEnd = $state(0);

	/** Shared hover time — one crosshair across the supply-balance stack. */
	let hoverTime = $state(/** @type {number | undefined} */ (undefined));

	/** Mounted chart instances keyed by panel id (whichever panels the level shows). */
	/** @type {Record<string, NetworkChart | undefined>} */
	let chartRefs = $state({});

	let mounted = $state(false);
	let showShortcutsToast = $state(false);

	let isFullscreen = $derived(isFullscreenUrl(page.url));
	let target = $derived(regionToNetwork(chartRegion));
	let timeZone = $derived(target.timeZone);

	let defaultStart = $derived(new Date(seedStartDate + 'T00:00:00' + timeZone).getTime());
	let defaultEnd = $derived(new Date(seedEndDate + 'T23:59:59' + timeZone).getTime());

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

	const echo = createEchoGuard();

	// ============================================
	// Panels per focus level
	// ============================================

	/**
	 * @typedef {Object} FocusPanel
	 * @property {'generation' | 'demand' | 'curtailment' | 'price'} id - Shared panel-registry id
	 * @property {string} label
	 * @property {'power' | 'demand' | 'curtailment' | 'price'} metric - Base metric
	 *   (mirrors the shared registry entry; resolved via `metricForPanel`)
	 * @property {'stacked' | 'line'} chartKind
	 * @property {string} heightClass
	 * @property {boolean} [grouped]
	 * @property {boolean} [diverging]
	 * @property {boolean} [ghost] - Render dimmed (curtailment reads as context)
	 * @property {string} [unitLabel]
	 */

	/** @type {Record<string, FocusPanel>} */
	const PANEL_DEFS = {
		generation: {
			id: 'generation',
			label: 'Generation',
			metric: 'power',
			chartKind: 'stacked',
			heightClass: 'h-[240px]',
			grouped: true,
			diverging: true
		},
		demand: {
			id: 'demand',
			label: 'Demand',
			metric: 'demand',
			chartKind: 'line',
			heightClass: 'h-[120px]',
			unitLabel: 'MW'
		},
		curtailment: {
			id: 'curtailment',
			label: 'Curtailment',
			metric: 'curtailment',
			chartKind: 'stacked',
			heightClass: 'h-[120px]',
			ghost: true,
			unitLabel: 'MW'
		},
		price: {
			id: 'price',
			label: 'Price',
			metric: 'price',
			chartKind: 'line',
			heightClass: 'h-[140px]',
			unitLabel: '$/MWh'
		}
	};

	let activePanels = $derived.by(() => {
		if (focus.level === 'region') {
			return [PANEL_DEFS.generation, PANEL_DEFS.demand, PANEL_DEFS.curtailment, PANEL_DEFS.price];
		}
		if (focus.level === 'facility') return [PANEL_DEFS.price];
		return [PANEL_DEFS.generation];
	});

	/** The supply-balance trio (region level) — rendered as one composite. */
	let trioPanels = $derived(
		focus.level === 'region'
			? [PANEL_DEFS.generation, PANEL_DEFS.demand, PANEL_DEFS.curtailment]
			: []
	);

	// ============================================
	// Range / interval handlers (Explorer machinery over activePanels)
	// ============================================

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
			for (const panel of activePanels) chartRefs[panel.id]?.setViewport(startMs, endMs);
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
	 * Mid-gesture display-grain adaptation (no fetch); explicit coarse picker
	 * choices are preserved.
	 * @param {{ start: number, end: number }} range
	 */
	function updateLiveDisplayInterval(range) {
		if (COARSE_PICKER_INTERVALS.has(displayInterval)) return;
		const durationDays = (range.end - range.start) / DAY_MS;
		displayInterval = getDisplayIntervalForDays(activeMetric, activeInterval, durationDays);
	}

	/**
	 * Pan/zoom on any panel drives the shared viewport: mirror into the other
	 * mounted panels with the echo suppressed.
	 * @param {{ start: number, end: number }} range
	 * @param {string} sourceId
	 */
	function handlePanelViewport(range, sourceId) {
		if (echo.suppressed) return;
		viewStart = range.start;
		viewEnd = range.end;
		selectedRange = null;
		updateLiveDisplayInterval(range);
		echo.run(() => {
			for (const panel of activePanels) {
				if (panel.id === sourceId) continue;
				chartRefs[panel.id]?.setViewport(range.start, range.end);
			}
		});
		scheduleUrlUpdate();
	}

	/**
	 * Gesture settled: evaluate the hysteresis switch once, then prune the peer
	 * panels' stale in-flight fetches. Deliberately not echo-guarded — settles
	 * only originate from user gestures.
	 * @param {{ start: number, end: number }} range
	 * @param {string} sourceId
	 */
	function handlePanelSettle(range, sourceId) {
		applyMetricSwitch(range);
		scheduleUrlUpdate();
		for (const panel of activePanels) {
			if (panel.id === sourceId) continue;
			chartRefs[panel.id]?.reconcileFetches();
		}
	}

	/** @param {number | undefined} time */
	function handleHoverChange(time) {
		hoverTime = time;
	}

	// Charts mounted by a focus-level change seed from day-granular dates; snap
	// each new instance to the exact live viewport once, so drill-in/pop keeps
	// the pan/zoom position to the millisecond.
	const alignedCharts = new WeakSet();
	$effect(() => {
		for (const panel of activePanels) {
			const ref = chartRefs[panel.id];
			if (!ref || alignedCharts.has(ref)) continue;
			alignedCharts.add(ref);
			const start = untrack(() => viewStart);
			const end = untrack(() => viewEnd);
			if (start && end) echo.run(() => ref.setViewport(start, end));
		}
	});

	// ============================================
	// Live grid data (flows + prices)
	// ============================================

	const grid = createGridLive();

	let dispatchTime = $derived.by(() => {
		const iso = grid.dispatchDateTimeString;
		if (!iso) return '';
		const t = iso.indexOf('T');
		return t > 0 ? iso.slice(t + 1, t + 6) : '';
	});

	// ============================================
	// Facilities (lazy — fetched on first region push; big array stays raw)
	// ============================================

	/** @type {any[]} */
	let facilities = $state.raw([]);

	async function ensureFacilities() {
		try {
			facilities = await fetchAllFacilities();
		} catch {
			// The shared loader clears its slot on failure — the next push retries.
		}
	}

	$effect(() => {
		if (focus.level !== 'nem') ensureFacilities();
	});

	/**
	 * Display metadata per facility code (name + coords) gathered from pushes
	 * and the preview fetch — resolves the breadcrumb label and the camera for
	 * deep-linked facilities before/without the full list.
	 * @type {Record<string, { name?: string, lat?: number, lng?: number }>}
	 */
	let facilityMeta = $state({});

	let facilityLabel = $derived.by(() => {
		if (focus.level !== 'facility') return '';
		return (
			facilityMeta[focus.code]?.name ??
			facilities.find((f) => f.code === focus.code)?.name ??
			focus.code
		);
	});

	/** @param {any} facility */
	function rememberFacility(facility) {
		if (!facility?.code) return;
		facilityMeta[facility.code] = {
			name: facility.name,
			lat: facility.location?.lat,
			lng: facility.location?.lng
		};
	}

	// ============================================
	// Focus push / pop (real history entries — see header note)
	// ============================================

	/** @param {import('./focus-state.js').Focus} nextFocus */
	function pushFocus(nextFocus) {
		goto(`${page.url.pathname}?${buildParams(isFullscreen, nextFocus).toString()}`, {
			noScroll: true,
			keepFocus: true
		});
	}

	/** @param {string} regionCode */
	function pushRegion(regionCode) {
		if (!isFocusRegion(regionCode)) return;
		pushFocus({ level: 'region', region: regionCode });
	}

	/** @param {any} facility */
	function pushFacility(facility) {
		if (!facility?.code) return;
		rememberFacility(facility);
		const region = isFocusRegion(facility.network_region) ? facility.network_region : focusRegion;
		if (!region) return;
		pushFocus({ level: 'facility', region, code: facility.code });
	}

	function popFocus() {
		if (focus.level === 'facility') pushFocus({ level: 'region', region: focus.region });
		else if (focus.level === 'region') pushFocus({ level: 'nem' });
	}

	// ============================================
	// Map camera
	// ============================================

	/** @type {GridMap | undefined} */
	let mapRef = $state();
	let mapReady = $state(false);

	let winWidth = $state(0);
	let isDesktop = $derived(winWidth >= 768);

	const dockDrag = createDragHandler({
		axis: 'x',
		min: 360,
		max: 720,
		initial: 480,
		storageKey: 'tracker-map:focus:dock',
		invert: true
	});

	function cameraPadding() {
		return {
			top: 48,
			bottom: 48,
			left: 48,
			// The dock overlays the map's right edge on desktop — keep the focus
			// object framed in the visible portion.
			right: isDesktop ? dockDrag.value + 56 : 48
		};
	}

	// Re-frame the camera on focus changes. Dock-width/viewport reads are
	// untracked (a resize shouldn't re-fit); the facility branch tracks the
	// facilities list + meta so a deep link upgrades from region framing to the
	// facility flyTo once coordinates resolve.
	$effect(() => {
		const f = focus;
		if (!mapReady || !mapRef) return;
		const padding = untrack(() => cameraPadding());
		if (f.level === 'nem') {
			mapRef.fitBounds(NEM_BOUNDS, { padding });
		} else if (f.level === 'region') {
			mapRef.fitBounds(REGION_BOUNDS[f.region], { padding });
		} else {
			const meta = facilityMeta[f.code];
			const listed = facilities.find((fac) => fac.code === f.code);
			const lat = meta?.lat ?? listed?.location?.lat;
			const lng = meta?.lng ?? listed?.location?.lng;
			if (typeof lat === 'number' && typeof lng === 'number') {
				mapRef.flyTo({ center: [lng, lat], zoom: 9.5, padding });
			} else {
				mapRef.fitBounds(REGION_BOUNDS[f.region], { padding });
			}
		}
	});

	// ============================================
	// Map layer inputs per level
	// ============================================

	/** Arcs: full grid at NEM; only the focus region's corridors otherwise
	 *  (missing keys render as idle/dim in FlowArcsLayer). */
	let arcFlows = $derived.by(() => {
		if (focus.level === 'nem') return grid.flows;
		/** @type {Record<string, number>} */
		const filtered = {};
		for (const ic of interconnectorsForRegion(/** @type {string} */ (focusRegion))) {
			const v = grid.flows[ic.key];
			if (typeof v === 'number') filtered[ic.key] = v;
		}
		return filtered;
	});

	/** Badges: everyone at NEM; the focus region + its neighbours otherwise. */
	let badgeRegions = $derived.by(() => {
		if (focus.level === 'nem') return FOCUS_REGIONS;
		const region = /** @type {string} */ (focusRegion);
		const list = [region];
		for (const ic of interconnectorsForRegion(region)) {
			for (const code of [ic.from, ic.to]) {
				if (!list.includes(code)) list.push(code);
			}
		}
		return list;
	});

	let dockInterconnectors = $derived(
		focus.level === 'nem'
			? INTERCONNECTORS
			: interconnectorsForRegion(/** @type {string} */ (focusRegion))
	);

	// ============================================
	// Stat tiles
	// ============================================

	let nemTiles = $derived.by(() => {
		/** @type {{ ic: import('../_shared/region-geo.js').InterconnectorDef, value: number } | null} */
		let biggest = null;
		for (const ic of INTERCONNECTORS) {
			const v = grid.flows[ic.key];
			if (typeof v !== 'number' || !Number.isFinite(v)) continue;
			if (!biggest || Math.abs(v) > Math.abs(biggest.value)) biggest = { ic, value: v };
		}
		/** @type {{ code: string, price: number } | null} */
		let priciest = null;
		/** @type {{ code: string, price: number } | null} */
		let cheapest = null;
		for (const code of FOCUS_REGIONS) {
			const p = grid.prices[code];
			if (typeof p !== 'number' || !Number.isFinite(p)) continue;
			if (!priciest || p > priciest.price) priciest = { code, price: p };
			if (!cheapest || p < cheapest.price) cheapest = { code, price: p };
		}
		return [
			{
				id: 'flow',
				label: 'Biggest flow',
				value: biggest ? String(Math.round(Math.abs(biggest.value))) : '—',
				unit: biggest ? 'MW' : undefined,
				sub: biggest
					? `${directionLabel(biggest.ic, biggest.value)}${dispatchTime ? ` · ${dispatchTime}` : ''}`
					: 'awaiting dispatch'
			},
			{
				id: 'priciest',
				label: 'Priciest region',
				value: priciest ? formatPrice(priciest.price) : '—',
				unit: priciest ? '/MWh' : undefined,
				sub: priciest?.code,
				accent: priciest ? priceColour(priciest.price) : undefined
			},
			{
				id: 'cheapest',
				label: 'Cheapest region',
				value: cheapest ? formatPrice(cheapest.price) : '—',
				unit: cheapest ? '/MWh' : undefined,
				sub: cheapest?.code,
				accent: cheapest ? priceColour(cheapest.price) : undefined
			}
		];
	});

	let regionTiles = $derived.by(() => {
		const region = focusRegion;
		if (!region) return [];
		const price = grid.prices[region];
		const hasPrice = typeof price === 'number' && Number.isFinite(price);
		// Net interconnector position, signed relative to this region: a
		// positive flow runs from→to, so it counts as import when the region is
		// the receiving end. Positive net = importing.
		let net = 0;
		let hasNet = false;
		for (const ic of interconnectorsForRegion(region)) {
			const v = grid.flows[ic.key];
			if (typeof v !== 'number' || !Number.isFinite(v)) continue;
			hasNet = true;
			net += ic.to === region ? v : -v;
		}
		return [
			{
				id: 'price',
				label: 'Spot price',
				value: hasPrice ? formatPrice(price) : '—',
				unit: hasPrice ? '/MWh' : undefined,
				sub: dispatchTime ? `Dispatch ${dispatchTime}` : undefined,
				accent: hasPrice ? priceColour(price) : undefined
			},
			{
				id: 'net',
				label: 'Net position',
				value: hasNet ? String(Math.round(Math.abs(net))) : '—',
				unit: hasNet ? 'MW' : undefined,
				sub: hasNet
					? Math.abs(net) < 10
						? 'Balanced'
						: net > 0
							? 'Importing'
							: 'Exporting'
					: 'awaiting dispatch'
			}
		];
	});

	let dockTitle = $derived.by(() => {
		if (focus.level === 'nem') return 'National Electricity Market';
		if (focus.level === 'region') {
			return regionsWithLabels[focus.region.toLowerCase()] ?? focus.region;
		}
		return facilityLabel;
	});

	// ============================================
	// URL state (shareable) — dashboard params + focus codec
	// ============================================

	/** @type {ReturnType<typeof setTimeout> | null} */
	let urlTimer = null;
	function scheduleUrlUpdate() {
		if (urlTimer) clearTimeout(urlTimer);
		urlTimer = setTimeout(updateUrl, 400);
	}

	/**
	 * Build the query params from the current dashboard state; the `region`
	 * param derives from the focus (there is no separate region selector).
	 * @param {boolean} fullscreen
	 * @param {import('./focus-state.js').Focus} [focusArg]
	 */
	function buildParams(fullscreen, focusArg = focus) {
		const params = new URLSearchParams();
		params.set('region', focusArg.level === 'nem' ? '_all' : focusArg.region.toLowerCase());
		params.set('interval', displayInterval);
		if (selectedRange != null && DAYS_TO_TOKEN[String(selectedRange)]) {
			params.set('range', DAYS_TO_TOKEN[String(selectedRange)]);
		} else if (viewStart && viewEnd) {
			params.set('start', toDateString(viewStart));
			params.set('end', toDateString(viewEnd));
		}
		const focusToken = encodeFocus(focusArg);
		if (focusToken) params.set('focus', focusToken);
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

	/** @param {KeyboardEvent} e */
	function handleKeydown(e) {
		if (e.key === 'Escape') {
			if (showShortcutsToast) {
				e.preventDefault();
				showShortcutsToast = false;
				return;
			}
			if (focus.level !== 'nem') {
				e.preventDefault();
				popFocus();
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

	onMount(() => {
		mounted = true;
		grid.start();
		return () => grid.stop();
	});
</script>

<svelte:window onkeydown={handleKeydown} bind:innerWidth={winWidth} />

<Meta
	title="Tracker map — Focus stack"
	description="Design exploration: a selection-driven tracker where the map and dashboard drill from the NEM into regions and facilities."
/>

{#snippet panelChart(/** @type {FocusPanel} */ panel)}
	<NetworkChart
		bind:this={chartRefs[panel.id]}
		region={chartRegion}
		metric={metricForPanel(panel, activeMetric)}
		interval={activeInterval}
		{displayInterval}
		group={panel.grouped ? FOCUS_GROUP : undefined}
		chartKind={panel.chartKind}
		{timeZone}
		dateStart={pickerStartDate}
		dateEnd={pickerEndDate}
		title={panel.label}
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
{/snippet}

{#snippet panelChip(
	/** @type {FocusPanel} */ panel,
	label = panel.label,
	unitLabel = panel.unitLabel
)}
	<div class="flex items-baseline justify-between px-3 pt-2">
		<span
			class="rounded bg-light-warm-grey px-1.5 py-0.5 text-[10px] leading-none font-semibold tracking-wider text-mid-grey uppercase"
		>
			{label}
		</span>
		{#if unitLabel}
			<span class="text-[10px] text-mid-warm-grey">{unitLabel}</span>
		{/if}
	</div>
{/snippet}

{#snippet optionsSections(/** @type {{ close: () => void }} */ { close })}
	<PrototypeSwitcherSection current="focus" windowed={!isFullscreen} {close} />
{/snippet}

<FullscreenLayout
	{isFullscreen}
	onexitfullscreen={toggleFullscreen}
	class="flex flex-col min-h-dvh"
>
	{#snippet filterBar()}
		<div
			class="relative z-40 flex shrink-0 flex-nowrap items-center gap-3 overflow-x-auto border-b border-warm-grey bg-white px-4 py-2"
		>
			{#if isFullscreen}
				<FullscreenNavDropdown />
			{/if}

			<!-- The breadcrumb IS the region selector — no Select here. -->
			<Breadcrumb {focus} {facilityLabel} onnavigate={pushFocus} />

			<div class="h-6 w-px shrink-0 bg-warm-grey"></div>

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
		<div
			class="relative min-h-0 flex-1 bg-light-warm-grey max-tablet:flex max-tablet:flex-col max-tablet:overflow-y-auto"
		>
			<!-- Map fills the whole stage; the dock overlays its right edge on
			     desktop (camera padding keeps the focus framed left of it). On
			     mobile the map collapses to a ~40vh band with the dock below. -->
			<div class="absolute inset-0 max-tablet:static max-tablet:h-[40vh] max-tablet:shrink-0">
				<GridMap bind:this={mapRef} center={[146, -30]} zoom={4} onload={() => (mapReady = true)}>
					<FlowArcsLayer flows={arcFlows} showLabels={focus.level !== 'facility'} />
					{#if facilities.length}
						<FacilitiesLayer
							{facilities}
							opacity={focus.level === 'nem' ? 0 : 1}
							regionFilter={focusRegion ?? undefined}
							selectedCode={focus.level === 'facility' ? focus.code : undefined}
							onselect={pushFacility}
						/>
					{/if}
					<RegionBadges
						prices={grid.prices}
						regions={badgeRegions}
						compact={focus.level !== 'nem'}
						selectedRegion={focusRegion ?? undefined}
						onselect={pushRegion}
					/>
				</GridMap>
			</div>

			<!-- Dock -->
			<aside
				class="absolute top-0 right-0 bottom-0 z-10 flex border-l border-warm-grey bg-white shadow-[-4px_0_16px_rgba(0,0,0,0.06)] max-tablet:static max-tablet:w-full max-tablet:border-l-0 max-tablet:shadow-none"
				style:width={isDesktop ? `${dockDrag.value}px` : undefined}
			>
				<DragHandle
					axis="x"
					onstart={dockDrag.start}
					active={dockDrag.isDragging}
					class="max-tablet:hidden"
				/>

				<div class="flex min-w-0 flex-1 flex-col overflow-y-auto">
					<header class="border-b border-warm-grey px-4 py-3">
						<h1 class="m-0 text-base leading-tight font-semibold text-dark-grey">{dockTitle}</h1>
						<p class="m-0 mt-0.5 text-[11px] text-mid-grey">
							{#if focus.level === 'facility'}
								Facility in {focusRegion}
							{:else if dispatchTime}
								Live · dispatch {dispatchTime}
							{:else}
								Live grid view
							{/if}
						</p>
					</header>

					<div class="flex flex-col gap-4 p-4">
						{#if focus.level === 'nem'}
							<StatTiles tiles={nemTiles} />

							<section>
								<h2 class="m-0 mb-1.5 text-xs font-semibold text-dark-grey">Region prices</h2>
								<RegionPriceChips prices={grid.prices} onselect={pushRegion} />
							</section>

							<section class="rounded-lg border border-warm-grey bg-white">
								{@render panelChip(PANEL_DEFS.generation)}
								{@render panelChart(PANEL_DEFS.generation)}
							</section>

							<section>
								<h2 class="m-0 mb-1.5 text-xs font-semibold text-dark-grey">Interconnectors</h2>
								<InterconnectorList interconnectors={dockInterconnectors} flows={grid.flows} />
							</section>
						{:else if focus.level === 'region'}
							<StatTiles tiles={regionTiles} />

							<!-- Supply-balance stack: the exploratory centrepiece — three
							     tightly-stacked charts sharing hover + viewport, read as
							     one composite. -->
							<section class="rounded-lg border border-warm-grey bg-white">
								<div class="divide-y divide-light-warm-grey">
									{#each trioPanels as panel (panel.id)}
										<div class={panel.ghost ? 'opacity-75' : ''}>
											{@render panelChip(panel)}
											{@render panelChart(panel)}
										</div>
									{/each}
								</div>
								<p
									class="m-0 border-t border-warm-grey px-3 py-2 text-[11px] leading-snug text-mid-grey"
								>
									Supply balance — generation vs demand, with curtailed VRE
								</p>
							</section>

							<section class="rounded-lg border border-warm-grey bg-white">
								{@render panelChip(PANEL_DEFS.price)}
								{@render panelChart(PANEL_DEFS.price)}
							</section>

							<section>
								<h2 class="m-0 mb-1.5 text-xs font-semibold text-dark-grey">Interconnectors</h2>
								<InterconnectorList
									interconnectors={dockInterconnectors}
									flows={grid.flows}
									relativeTo={focusRegion ?? undefined}
								/>
							</section>
						{:else}
							<FacilityPreview
								code={focus.code}
								regionCode={focus.region}
								onloaded={rememberFacility}
							/>

							<section class="rounded-lg border border-warm-grey bg-white">
								{@render panelChip(PANEL_DEFS.price, `${focus.region} price`)}
								{@render panelChart(PANEL_DEFS.price)}
								<p
									class="m-0 border-t border-warm-grey px-3 py-2 text-[11px] leading-snug text-mid-grey"
								>
									Regional price for context — facility charts live on the full detail page.
								</p>
							</section>
						{/if}
					</div>
				</div>
			</aside>
		</div>
	{/snippet}
</FullscreenLayout>

<ShortcutsToast
	visible={showShortcutsToast}
	ondismiss={() => (showShortcutsToast = false)}
	shortcuts={[
		{ label: 'Pop focus level', keys: ['Esc'] },
		{ label: 'Enter / exit full screen', keys: ['F'] },
		{ label: 'Toggle navigation menu', keys: ['G'] },
		{ label: 'Show shortcuts', keys: ['?'] }
	]}
/>
