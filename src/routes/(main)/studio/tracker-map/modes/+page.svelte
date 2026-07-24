<script>
	/**
	 * Lens — the "modes" tracker-map prototype.
	 *
	 * Hypothesis: an explicit Grid | Facilities toggle over ONE persistent map,
	 * plus a predictable customisable chart dock, beats spatial cleverness. The
	 * map mounts once and never remounts on mode flips — layers crossfade via
	 * their opacity props (MapLibre paint transitions + the badges' CSS
	 * transition) and the camera never moves on toggle.
	 *
	 * The dashboard harness (filter bar, echo-guarded cross-panel viewport
	 * sync, hysteresis metric/interval ladder, debounced URL replaceState,
	 * F/? shortcuts) is cloned from the Explorer (`studio/explorer`); the dock
	 * adds panel add/remove/reorder (GridLayout) and named saved views.
	 */

	import { onMount, tick } from 'svelte';
	import { page } from '$app/state';
	import { replaceState } from '$app/navigation';
	import { ArrowRight, X } from '@lucide/svelte';

	import Meta from '$lib/components/Meta.svelte';
	import FullscreenLayout from '$lib/components/fullscreen/FullscreenLayout.svelte';
	import FullscreenNavDropdown from '$lib/components/fullscreen/FullscreenNavDropdown.svelte';
	import OptionsMenu from '$lib/components/ui/options-menu/OptionsMenu.svelte';
	import ShortcutsToast from '$lib/components/ShortcutsToast.svelte';
	import SwitchWithIcons from '$lib/components/SwitchWithIcons.svelte';
	import { ChartRangeBar } from '$lib/components/charts/v2';
	import Select from '$lib/components/form-elements/Select.svelte';
	import NetworkChart from '$lib/components/charts/network/NetworkChart.svelte';
	import GridLayout from '$lib/components/ui/grid-layout/GridLayout.svelte';
	import { loadLayout, saveLayout } from '$lib/components/ui/grid-layout/grid-layout-state.js';
	import { createDragHandler, DragHandle } from '$lib/components/ui/panel';

	import GridMap from '../_shared/GridMap.svelte';
	import PrototypeSwitcherSection from '../_shared/PrototypeSwitcherSection.svelte';
	import FlowArcsLayer from '../_shared/FlowArcsLayer.svelte';
	import RegionBadges from '../_shared/RegionBadges.svelte';
	import FacilitiesLayer from '../_shared/FacilitiesLayer.svelte';
	import StatTiles from '../_shared/StatTiles.svelte';
	import { createGridLive } from '../_shared/grid-live.svelte.js';
	import { AU_BOUNDS, INTERCONNECTORS } from '../_shared/region-geo.js';
	import {
		TRACKER_PANELS,
		DEFAULT_PANEL_IDS,
		getPanelDef,
		resolvePanels,
		metricForPanel
	} from '../_shared/panels.js';
	import { COARSE_PICKER_INTERVALS, DAYS_TO_TOKEN, TOKEN_TO_DAYS } from '../_shared/route-state.js';
	import { saveView, loadView, listViews, deleteView } from '../_shared/views-store.js';
	import { fetchAllFacilities } from '../_shared/facilities-data.js';

	import ViewsDropdown from './_components/ViewsDropdown.svelte';
	import AddChartMenu from './_components/AddChartMenu.svelte';
	import FacilitiesDock from './_components/FacilitiesDock.svelte';

	import { regionOptions } from '$lib/regions.js';
	import { GROUP_OPTIONS } from '$lib/components/charts/network/groups.js';
	import { regionToNetwork } from '$lib/components/charts/network/region-to-network.js';
	import { createEchoGuard } from '$lib/components/charts/v2/echo-guard.js';
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
	import { priceColour } from '$lib/components/info-graphics/system-snapshot/helpers.js';
	import { getNumberFormat } from '$lib/utils/formatters';

	/** @type {{ data: { region: string, selectedRange: number | null, intervalId: string, group: string, startDate: string, endDate: string, mode: 'grid' | 'facilities', viewId: string | null } }} */
	let { data } = $props();

	const DAY_MS = 24 * 60 * 60 * 1000;
	const LAYOUT_KEY_PREFIX = 'tracker-map:modes:layout:';
	const mwFormatter = getNumberFormat(0);

	// ============================================
	// State
	// ============================================

	/** @type {'grid' | 'facilities'} */
	let mode = $state(data.mode);
	let selectedRegion = $state(data.region);
	let selectedGroup = $state(data.group);
	/** Range in days (-1 = All), or null when a custom/panned range is active. */
	let selectedRange = $state(/** @type {number | null} */ (data.selectedRange));

	const initialSpec = getIntervalSpec(data.intervalId);
	let activeMetric = $state(/** @type {'power' | 'energy'} */ (initialSpec?.metric ?? 'power'));
	let activeInterval = $state(initialSpec?.apiInterval ?? '5m');
	let displayInterval = $state(data.intervalId);

	let viewStart = $state(0);
	let viewEnd = $state(0);

	/** Shared hover time — syncs crosshairs across panels. */
	let hoverTime = $state(/** @type {number | undefined} */ (undefined));

	/** Panel chart instances keyed by panel id (bind:this into the record). */
	/** @type {Record<string, NetworkChart | undefined>} */
	let chartRefs = $state({});

	/** Active panel ids, in add-order (display order is GridLayout's concern). */
	let activePanelIds = $state([...DEFAULT_PANEL_IDS]);

	// Full facilities dataset — large, so raw (never deep-proxied). Fetched
	// lazily on the first flip to facilities mode.
	/** @type {any[]} */
	let facilities = $state.raw([]);
	let facilitiesLoading = $state(false);
	/** @type {string | null} */
	let facilitiesError = $state(null);
	/** @type {any} */
	let selectedFacility = $state.raw(null);

	// Saved views
	/** @type {import('../_shared/views-store.js').SavedViewMeta[]} */
	let views = $state([]);
	/** @type {string | null} */
	let activeViewId = $state(null);
	let viewDirty = $state(false);
	/** Remount key for GridLayout — bumped on view load/delete so it re-reads
	 *  the per-view layout storage key (it only reads storage on init). */
	let layoutEpoch = $state(0);
	/** Guards programmatic state application (initial mount, view load, panel
	 *  add): a freshly mounted chart fires one unsuppressed viewport event as
	 *  it seeds, which would otherwise clear the selected range preset and
	 *  flag the view dirty. */
	let restoringState = true;

	let mounted = $state(false);
	let showShortcutsToast = $state(false);

	// Live grid data — one instance for badges, arcs and stat tiles.
	const live = createGridLive();

	// Dock width (desktop) — handle sits on the dock's left edge, so leftward
	// drag grows the dock (invert).
	const dockResize = createDragHandler({
		axis: 'x',
		min: 360,
		max: 760,
		initial: 480,
		invert: true,
		storageKey: 'tracker-map:modes:dock'
	});

	// ============================================
	// Derived
	// ============================================

	let isFullscreen = $derived(isFullscreenUrl(page.url));
	let target = $derived(regionToNetwork(selectedRegion));
	let timeZone = $derived(target.timeZone);

	const regionSelectOptions = regionOptions.map((r) => ({ label: r.label, value: r.value }));

	let selectedRegionOption = $derived(
		regionSelectOptions.find((o) => o.value === selectedRegion) ?? regionSelectOptions[0]
	);
	let selectedGroupOption = $derived(
		GROUP_OPTIONS.find((o) => o.value === selectedGroup) ?? GROUP_OPTIONS[0]
	);

	let activePanels = $derived(resolvePanels(activePanelIds));
	let availablePanels = $derived(TRACKER_PANELS.filter((p) => !activePanelIds.includes(p.id)));

	/** Uppercase network_region code for map layers/facility filtering, or undefined for NEM-wide. */
	let regionFilterForFacilities = $derived(
		selectedRegion === '_all' ? undefined : selectedRegion.toUpperCase()
	);

	// Mode crossfade — MapLibre transitions the paint opacities (~300ms) and
	// RegionBadges transitions its DOM opacity; no layer is ever unmounted.
	let gridOpacity = $derived(mode === 'grid' ? 1 : 0);
	let facilitiesOpacity = $derived(mode === 'facilities' ? 1 : 0);

	let layoutStorageKey = $derived(`${LAYOUT_KEY_PREFIX}${activeViewId ?? 'default'}`);

	let facilitiesInRegionCount = $derived(
		regionFilterForFacilities
			? facilities.filter((f) => f.network_region === regionFilterForFacilities).length
			: facilities.length
	);

	/** Fallback viewport (the loader's seed dates) used until the charts report
	 *  their live viewport. */
	let defaultStart = $derived(new Date(data.startDate + 'T00:00:00' + timeZone).getTime());
	let defaultEnd = $derived(new Date(data.endDate + 'T23:59:59' + timeZone).getTime());

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

	/** @param {number} value */
	function formatDollars(value) {
		const rounded = Math.round(value);
		return rounded < 0
			? `-$${mwFormatter.format(Math.abs(rounded))}`
			: `$${mwFormatter.format(rounded)}`;
	}

	/** Live stat tiles for the grid dock — spot price(s) + biggest corridor flow. */
	let statTiles = $derived.by(() => {
		/** @type {{ id: string, label: string, value: string, unit?: string, sub?: string, accent?: string, title?: string }[]} */
		const tiles = [];
		const prices = live.prices;
		const selectedCode = regionFilterForFacilities;

		if (selectedCode && typeof prices[selectedCode] === 'number') {
			tiles.push({
				id: 'price',
				label: `${selectedCode} spot price`,
				value: formatDollars(prices[selectedCode]),
				unit: '/MWh',
				accent: priceColour(prices[selectedCode])
			});
		} else if (!selectedCode) {
			const entries = Object.entries(prices).filter(
				([, v]) => typeof v === 'number' && Number.isFinite(v)
			);
			if (entries.length) {
				const hi = entries.reduce((a, b) => (b[1] > a[1] ? b : a));
				const lo = entries.reduce((a, b) => (b[1] < a[1] ? b : a));
				tiles.push({
					id: 'price-hi',
					label: 'Highest price',
					value: formatDollars(hi[1]),
					unit: '/MWh',
					sub: hi[0],
					accent: priceColour(hi[1])
				});
				tiles.push({
					id: 'price-lo',
					label: 'Lowest price',
					value: formatDollars(lo[1]),
					unit: '/MWh',
					sub: lo[0],
					accent: priceColour(lo[1])
				});
			}
		}

		const flowEntries = Object.entries(live.flows).filter(
			([, v]) => typeof v === 'number' && Number.isFinite(v)
		);
		if (flowEntries.length) {
			const biggest = flowEntries.reduce((a, b) => (Math.abs(b[1]) > Math.abs(a[1]) ? b : a));
			const ic = INTERCONNECTORS.find((i) => i.key === biggest[0]);
			const from = biggest[1] >= 0 ? ic?.from : ic?.to;
			const to = biggest[1] >= 0 ? ic?.to : ic?.from;
			tiles.push({
				id: 'flow',
				label: 'Biggest flow',
				value: mwFormatter.format(Math.abs(biggest[1])),
				unit: 'MW',
				sub: ic ? `${ic.label} · ${from} → ${to}` : biggest[0],
				title: ic?.label
			});
		}
		return tiles;
	});

	// ============================================
	// Viewport sync (prevent panel ↔ panel echo)
	// ============================================

	const echo = createEchoGuard();

	// ============================================
	// Range / interval handlers (cloned from the Explorer)
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
		markViewDirty();
		applyRangeSwitch(startMs, endMs, intervalId);
	}

	/** @param {{ start: string, end: string }} range */
	function handleDateRangeChange(range) {
		selectedRange = null;
		const startMs = new Date(range.start).getTime();
		const endMs = new Date(range.end).getTime();
		const days = Math.max(1, Math.ceil((endMs - startMs) / DAY_MS));
		markViewDirty();
		applyRangeSwitch(startMs, endMs, getIntervalOptionsForDays(days).default);
	}

	/** @param {string} value */
	function handleIntervalChange(value) {
		markViewDirty();
		applyRangeSwitch(viewStart || defaultStart, viewEnd || defaultEnd, value);
	}

	/** Hysteresis-aware metric/interval switch — evaluated once per gesture, at
	 *  settle, walking the ladder to convergence. */
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
	 * Mid-gesture display-interval adaptation — re-aggregate the current grain
	 * so point counts stay bounded while zooming (no fetch).
	 * @param {{ start: number, end: number }} range
	 */
	function updateLiveDisplayInterval(range) {
		if (COARSE_PICKER_INTERVALS.has(displayInterval)) return;
		const durationDays = (range.end - range.start) / DAY_MS;
		displayInterval = getDisplayIntervalForDays(activeMetric, activeInterval, durationDays);
	}

	/**
	 * Pan/zoom on any panel drives the shared viewport: mirror the new range
	 * into every other panel with the echo suppressed.
	 * @param {{ start: number, end: number }} range
	 * @param {string} sourceId
	 */
	function handlePanelViewport(range, sourceId) {
		if (echo.suppressed) return;
		viewStart = range.start;
		viewEnd = range.end;
		// A chart's mount/seed event mirrors the viewport but must not deselect
		// the active range preset — only user pans/zooms do that.
		if (!restoringState) selectedRange = null;
		markViewDirty();
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
	 * A gesture came to rest: evaluate the hysteresis switch once with the
	 * final viewport, then prune the peer panels' stale in-flight fetches.
	 * Deliberately not echo-guarded (see the Explorer's notes).
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

	// ============================================
	// Region / group / mode
	// ============================================

	/** @param {string} value */
	function setSelectedRegion(value) {
		if (!regionSelectOptions.some((o) => o.value === value)) return;
		selectedRegion = value;
		const filter = value === '_all' ? undefined : value.toUpperCase();
		if (selectedFacility && filter && selectedFacility.network_region !== filter) {
			selectedFacility = null;
		}
		markViewDirty();
		scheduleUrlUpdate();
	}

	/** @param {{ value: string | number | null | undefined }} option */
	function handleRegionChange(option) {
		setSelectedRegion(String(option.value));
	}

	/** @param {{ value: string | number | null | undefined }} option */
	function handleGroupChange(option) {
		selectedGroup = String(option.value);
		markViewDirty();
		scheduleUrlUpdate();
	}

	/**
	 * The single mode switch — everything (toggle, cross-links, view loads)
	 * funnels through here so the URL and lazy facilities fetch stay in step.
	 * @param {'grid' | 'facilities'} next
	 */
	function setMode(next) {
		if (mode === next) return;
		mode = next;
		if (next === 'facilities') ensureFacilitiesLoaded();
		markViewDirty();
		scheduleUrlUpdate();
	}

	/** Grid-mode cross-link: badge click selects the region (click again to clear). @param {string} code */
	function handleRegionBadgeSelect(code) {
		const value = code.toLowerCase();
		setSelectedRegion(regionFilterForFacilities === code ? '_all' : value);
	}

	/** Facilities-mode cross-link: back to grid mode with the facility's region selected. @param {string} regionCode */
	function handleGridContext(regionCode) {
		setSelectedRegion(regionCode.toLowerCase());
		setMode('grid');
	}

	/** Arc click cross-link: surface the corridor's chart in the dock. */
	function handleArcClick() {
		if (!activePanelIds.includes('flows')) addPanel('flows');
	}

	function ensureFacilitiesLoaded() {
		if (facilities.length || facilitiesLoading) return;
		facilitiesLoading = true;
		facilitiesError = null;
		fetchAllFacilities()
			.then((all) => {
				facilities = all;
			})
			.catch((e) => {
				facilitiesError = e instanceof Error ? e.message : String(e);
			})
			.finally(() => {
				facilitiesLoading = false;
			});
	}

	// ============================================
	// Panel add / remove
	// ============================================

	/** @param {string} id */
	async function addPanel(id) {
		if (activePanelIds.includes(id)) return;
		activePanelIds = [...activePanelIds, id];
		markViewDirty(); // before the guard raises — adding genuinely dirties the view
		// The new chart seeds day-granular from the picker dates (its mount event
		// is guarded so it can't clear the range preset); snap it to the exact
		// shared viewport once it has mounted.
		restoringState = true;
		await tick();
		const start = viewStart || defaultStart;
		const end = viewEnd || defaultEnd;
		if (start && end) echo.run(() => chartRefs[id]?.setViewport(start, end));
		restoringState = false;
	}

	/** @param {string} id */
	function removePanel(id) {
		activePanelIds = activePanelIds.filter((p) => p !== id);
		delete chartRefs[id];
		markViewDirty();
	}

	// ============================================
	// Saved views
	// ============================================

	function markViewDirty() {
		if (restoringState || !activeViewId) return;
		viewDirty = true;
	}

	function refreshViews() {
		views = listViews();
	}

	function snapshotFilters() {
		/** @type {import('../_shared/views-store.js').SavedViewFilters} */
		const filters = {
			region: selectedRegion,
			group: selectedGroup,
			range: selectedRange != null ? (DAYS_TO_TOKEN[String(selectedRange)] ?? null) : null,
			interval: displayInterval
		};
		if (filters.range == null && viewStart && viewEnd) {
			filters.start = toDateString(viewStart);
			filters.end = toDateString(viewEnd);
		}
		return filters;
	}

	function currentViewPayload() {
		// layout: null by design — panel ORDER is persisted live by GridLayout
		// itself under the per-view storage key (`tracker-map:modes:layout:<id>`),
		// so the view record only needs to carry the panel SET + filters.
		return {
			mode,
			panelIds: [...activePanelIds],
			layout: null,
			filters: snapshotFilters()
		};
	}

	/** @param {string} name */
	function handleSaveNewView(name) {
		const previousKey = layoutStorageKey;
		const id = saveView({ name, ...currentViewPayload() });
		if (!id) return;
		// Carry the current drag order across to the new view's layout key so
		// saving doesn't reset the arrangement.
		const currentLayout = loadLayout(previousKey);
		if (currentLayout) saveLayout(`${LAYOUT_KEY_PREFIX}${id}`, currentLayout);
		activeViewId = id;
		viewDirty = false;
		refreshViews();
		scheduleUrlUpdate();
	}

	function handleUpdateView() {
		if (!activeViewId) return;
		const name = views.find((v) => v.id === activeViewId)?.name ?? 'Untitled view';
		saveView({ name, ...currentViewPayload() }, activeViewId);
		viewDirty = false;
		refreshViews();
	}

	/** @param {string} id */
	function handleDeleteView(id) {
		deleteView(id);
		if (typeof localStorage !== 'undefined') localStorage.removeItem(`${LAYOUT_KEY_PREFIX}${id}`);
		if (activeViewId === id) {
			activeViewId = null;
			viewDirty = false;
			layoutEpoch += 1; // fall back to the default layout key
			scheduleUrlUpdate();
		}
		refreshViews();
	}

	/**
	 * Apply a saved view: mode, panel set, filters, then the range through the
	 * Explorer's applyRangeSwitch pathway so metric/interval land consistently.
	 * @param {string} id
	 */
	async function handleLoadView(id) {
		const view = loadView(id);
		if (!view) return;
		restoringState = true;
		activeViewId = id;
		mode = view.mode === 'facilities' ? 'facilities' : 'grid';
		if (mode === 'facilities') ensureFacilitiesLoaded();
		const resolvedIds = resolvePanels(view.panelIds).map((p) => p.id);
		activePanelIds = resolvedIds.length ? resolvedIds : [...DEFAULT_PANEL_IDS];
		if (regionSelectOptions.some((o) => o.value === view.filters.region)) {
			selectedRegion = view.filters.region;
		}
		if (GROUP_OPTIONS.some((o) => o.value === view.filters.group)) {
			selectedGroup = view.filters.group;
		}
		applyViewRange(view.filters);
		layoutEpoch += 1; // remount GridLayout so it reads this view's stored order
		scheduleUrlUpdate();
		await syncPanelsToViewport();
		viewDirty = false;
		restoringState = false;
	}

	/** @param {import('../_shared/views-store.js').SavedViewFilters} filters */
	function applyViewRange(filters) {
		if (filters.range != null && TOKEN_TO_DAYS[filters.range] != null) {
			const days = TOKEN_TO_DAYS[filters.range];
			selectedRange = days;
			const endMs = Date.now();
			const actualDays =
				days === -1
					? Math.max(1, Math.ceil((endMs - new Date(MIN_DATE).getTime()) / DAY_MS))
					: days;
			const intervalId = getIntervalSpec(filters.interval)
				? filters.interval
				: getMetricIntervalForDays(actualDays).interval;
			applyRangeSwitch(endMs - actualDays * DAY_MS, endMs, intervalId);
		} else if (filters.start && filters.end) {
			const startMs = new Date(filters.start + 'T00:00:00').getTime();
			const endMs = new Date(filters.end + 'T23:59:59').getTime();
			if (isNaN(startMs) || isNaN(endMs) || endMs <= startMs) return;
			selectedRange = null;
			const days = Math.max(1, Math.ceil((endMs - startMs) / DAY_MS));
			const intervalId = getIntervalSpec(filters.interval)
				? filters.interval
				: getIntervalOptionsForDays(days).default;
			applyRangeSwitch(startMs, endMs, intervalId);
		}
	}

	/** Snap every mounted panel to the exact shared viewport (post-remount). */
	async function syncPanelsToViewport() {
		await tick();
		const start = viewStart || defaultStart;
		const end = viewEnd || defaultEnd;
		if (!start || !end) return;
		echo.run(() => {
			for (const panel of activePanels) chartRefs[panel.id]?.setViewport(start, end);
		});
	}

	// ============================================
	// Map
	// ============================================

	/** @type {GridMap | undefined} */
	let mapRef = $state();

	function handleMapLoad() {
		// One framing for both modes (NEM + WEM) — the camera never moves after
		// this, on toggle or selection: predictability is the prototype's bet.
		mapRef?.fitBounds(AU_BOUNDS, { padding: 40, animate: false });
	}

	/** @param {any} facility */
	function handleFacilitySelect(facility) {
		selectedFacility = facility;
	}

	// ============================================
	// URL state (shareable)
	// ============================================

	/** @type {ReturnType<typeof setTimeout> | null} */
	let urlTimer = null;
	function scheduleUrlUpdate() {
		if (urlTimer) clearTimeout(urlTimer);
		urlTimer = setTimeout(updateUrl, 400);
	}

	/**
	 * Build the query params from current state (not `page.url`, which goes
	 * stale because `updateUrl` writes it shallowly).
	 * @param {boolean} fullscreen
	 */
	function buildParams(fullscreen) {
		const params = new URLSearchParams();
		params.set('region', selectedRegion);
		params.set('group', selectedGroup);
		params.set('interval', displayInterval);
		if (selectedRange != null && DAYS_TO_TOKEN[String(selectedRange)]) {
			params.set('range', DAYS_TO_TOKEN[String(selectedRange)]);
		} else if (viewStart && viewEnd) {
			params.set('start', toDateString(viewStart));
			params.set('end', toDateString(viewEnd));
		}
		if (mode === 'facilities') params.set('mode', 'facilities');
		if (activeViewId) params.set('view', activeViewId);
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
		live.start();
		refreshViews();
		// A shared URL carries both the view id and the concrete filters (the
		// filters are fresher — written on every change), so restore the active
		// id for the dropdown/Update affordance without re-applying the view.
		if (data.viewId && views.some((v) => v.id === data.viewId)) {
			activeViewId = data.viewId;
		}
		if (mode === 'facilities') ensureFacilitiesLoaded();
		// Release the dirty guard once the initial mount/seed events have flushed.
		tick().then(() => {
			restoringState = false;
		});
		return () => live.stop();
	});
</script>

<svelte:window onkeydown={handleKeydown} />

<Meta
	title="Tracker map — Lens (modes)"
	description="Design exploration: an explicit Grid | Facilities mode toggle over one persistent map, with a customisable chart dock and named saved views."
/>

{#snippet optionsSections(/** @type {{ close: () => void }} */ { close })}
	<PrototypeSwitcherSection current="modes" windowed={!isFullscreen} {close} />
{/snippet}

<FullscreenLayout
	{isFullscreen}
	onexitfullscreen={toggleFullscreen}
	class="flex flex-col min-h-dvh"
>
	{#snippet filterBar()}
		<div
			class="relative z-40 shrink-0 border-b border-warm-grey bg-white flex items-center gap-3 flex-nowrap overflow-x-auto px-4 py-2"
		>
			{#if isFullscreen}
				<FullscreenNavDropdown />
			{/if}

			<SwitchWithIcons
				compact
				class="shrink-0"
				rounded="rounded-lg"
				buttons={[
					{ label: 'Grid', value: 'grid' },
					{ label: 'Facilities', value: 'facilities' }
				]}
				selected={mode}
				onchange={(opt) => setMode(/** @type {'grid' | 'facilities'} */ (opt.value))}
			/>

			<div class="h-6 w-px bg-warm-grey"></div>

			<Select
				selected={selectedRegionOption}
				options={regionSelectOptions}
				onchange={handleRegionChange}
				formLabel="Region"
				compact
			/>

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

			{#if mode === 'grid'}
				<div class="h-6 w-px bg-warm-grey"></div>

				<Select
					selected={selectedGroupOption}
					options={GROUP_OPTIONS}
					onchange={handleGroupChange}
					formLabel="Grouping"
					compact
				/>
			{/if}

			<div class="ml-auto shrink-0 flex items-center gap-1">
				<ViewsDropdown
					{views}
					{activeViewId}
					dirty={viewDirty}
					onload={handleLoadView}
					onsave={handleSaveNewView}
					onupdate={handleUpdateView}
					ondelete={handleDeleteView}
				/>
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
		<div class="flex-1 min-h-0 flex max-tablet:flex-col tablet:flex-row bg-light-warm-grey">
			<!-- ONE persistent map — mounted once, never keyed on mode. -->
			<div class="relative min-w-0 tablet:flex-1 max-tablet:h-[45dvh] max-tablet:shrink-0">
				<GridMap bind:this={mapRef} onload={handleMapLoad}>
					<FlowArcsLayer
						flows={live.flows}
						opacity={gridOpacity}
						onarcclick={mode === 'grid' ? handleArcClick : undefined}
					/>
					<FacilitiesLayer
						{facilities}
						opacity={facilitiesOpacity}
						selectedCode={selectedFacility?.code}
						regionFilter={regionFilterForFacilities}
						onselect={mode === 'facilities' ? handleFacilitySelect : undefined}
					/>
					<RegionBadges
						prices={live.prices}
						opacity={gridOpacity}
						selectedRegion={regionFilterForFacilities}
						onselect={mode === 'grid' ? handleRegionBadgeSelect : undefined}
					/>
				</GridMap>
			</div>

			<DragHandle
				axis="x"
				onstart={dockResize.start}
				active={dockResize.isDragging}
				class="max-tablet:hidden"
			/>

			<!-- Dock -->
			<div
				class="flex flex-col min-h-0 bg-white border-warm-grey max-tablet:flex-1 max-tablet:border-t tablet:border-l tablet:shrink-0 tablet:w-[var(--dock-w)]"
				style:--dock-w="{dockResize.value}px"
			>
				<div
					class="shrink-0 flex items-center justify-between gap-3 px-4 py-3 border-b border-warm-grey"
				>
					<div class="min-w-0">
						<h2 class="text-sm font-semibold text-dark-grey m-0">
							{mode === 'grid' ? 'Grid dashboard' : 'Facilities'}
						</h2>
						<p class="text-xs text-mid-grey m-0 truncate">
							{#if mode === 'grid'}
								{live.dispatchDateTimeString
									? `Dispatch ${live.dispatchDateTimeString}`
									: 'Live grid snapshot'}
							{:else if facilitiesLoading}
								Loading…
							{:else}
								{facilitiesInRegionCount} facilities{regionFilterForFacilities
									? ` in ${regionFilterForFacilities}`
									: ''}
							{/if}
						</p>
					</div>
					{#if mode === 'grid' && regionFilterForFacilities}
						<!-- Cross-link: explicit hop into facilities mode for the selected region -->
						<button
							class="shrink-0 inline-flex items-center gap-1 text-xs text-dark-grey underline hover:no-underline"
							onclick={() => setMode('facilities')}
						>
							View facilities in {regionFilterForFacilities}
							<ArrowRight class="size-3" />
						</button>
					{/if}
				</div>

				<div class="flex-1 min-h-0 overflow-y-auto">
					<!-- Grid dock stays mounted across mode flips (collapsed rather than
					     display:none — LayerCake warns on zero-size containers) so the
					     charts keep their data and viewport. -->
					<div class={mode === 'grid' ? 'p-4 space-y-4' : 'h-0 overflow-hidden'}>
						<StatTiles tiles={statTiles} />

						<!-- Keyed remount on view load/delete so GridLayout re-reads the
						     per-view order from its storage key; saved views store
						     layout: null and lean entirely on that key. -->
						{#key layoutEpoch}
							<GridLayout
								items={activePanels}
								columns={1}
								dndType="modes-dock"
								storageKey={layoutStorageKey}
							>
								{#snippet children(item)}
									{@const panel = getPanelDef(item.id)}
									{#if panel}
										<div class="rounded-lg border border-mid-warm-grey/40 bg-white">
											<div
												class="flex items-center justify-between gap-4 pl-8 pr-3 py-3 border-b border-mid-warm-grey/40"
											>
												<h3 class="text-sm font-semibold text-dark-grey m-0">{panel.title}</h3>
												<div class="flex items-center gap-2">
													{#if panel.grouped}
														<span
															class="px-2 py-0.5 rounded bg-light-warm-grey text-dark-grey text-xs uppercase tracking-wider"
														>
															{getIntervalSpec(displayInterval)?.label ?? displayInterval}
														</span>
													{:else if panel.unitLabel}
														<span class="text-xs text-mid-grey">{panel.unitLabel}</span>
													{/if}
													<button
														class="p-1 rounded text-mid-warm-grey hover:text-dark-grey hover:bg-light-warm-grey transition-colors"
														title="Remove chart"
														aria-label="Remove {panel.title}"
														onclick={() => removePanel(panel.id)}
													>
														<X class="size-3.5" />
													</button>
												</div>
											</div>
											<NetworkChart
												bind:this={chartRefs[panel.id]}
												region={selectedRegion}
												metric={metricForPanel(panel, activeMetric)}
												interval={activeInterval}
												{displayInterval}
												group={panel.grouped ? selectedGroup : undefined}
												chartKind={panel.chartKind}
												{timeZone}
												dateStart={pickerStartDate}
												dateEnd={pickerEndDate}
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
										</div>
									{/if}
								{/snippet}
							</GridLayout>
						{/key}

						<AddChartMenu available={availablePanels} onadd={addPanel} />
					</div>

					{#if mode === 'facilities'}
						<div class="p-4">
							<FacilitiesDock
								{facilities}
								loading={facilitiesLoading}
								error={facilitiesError}
								regionFilter={regionFilterForFacilities}
								{selectedFacility}
								onselect={(f) => (selectedFacility = f)}
								ongridcontext={handleGridContext}
							/>
						</div>
					{/if}
				</div>
			</div>
		</div>
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
