<script>
	import { fly } from 'svelte/transition';
	import { goto, replaceState, afterNavigate } from '$app/navigation';
	import { untrack } from 'svelte';
	import { page } from '$app/state';
	import { building } from '$app/environment';
	import { Flag, X, Zap } from '@lucide/svelte';
	import MapOptionsDropdown from './_components/MapOptionsDropdown.svelte';
	import TransmissionLinesLegend from './_components/TransmissionLinesLegend.svelte';
	import DataCentresLegend from './_components/DataCentresLegend.svelte';
	import { normaliseMetric } from './_utils/normalise-metric.js';
	import Meta from '$lib/components/Meta.svelte';
	import Skeleton from '$lib/components/Skeleton.svelte';
	import LogoMarkLoader from '$lib/components/LogoMarkLoader.svelte';
	import formatValue from './_utils/format-value';
	import getUnitYear from './_utils/get-unit-year';
	import {
		statusColours,
		DEFAULT_STATUSES,
		DEFAULT_LOAD_STATUSES,
		ALL_LOAD_STATUSES,
		ALL_REGIONS,
		FUEL_TECH_VALUES,
		parseFuelTechsParam,
		normaliseViewParam
	} from '$lib/facilities/filters.js';
	import { serialiseSelection, parseSelection } from '$lib/facilities/filter-options.js';
	import { facilitiesToCsv } from './_utils/facilities-csv.js';
	import { sortFacilities } from './_utils/sort-facilities';
	import { downloadCsv } from '$lib/utils/download-csv.js';

	import Timeline from './Timeline.svelte';
	import Filters from './Filters.svelte';
	import List from './List.svelte';
	import Grid from './Grid.svelte';
	import StatusCapacityBadge from './StatusCapacityBadge.svelte';
	import YearAnimationOverlay from './_components/YearAnimationOverlay.svelte';
	import MobileFacilitiesSheet from './_components/MobileFacilitiesSheet.svelte';
	import FacilityDetailPanel from './_components/FacilityDetailPanel.svelte';
	import FacilityPanelHeader from './_components/FacilityPanelHeader.svelte';
	import FacilityPanelFooter from './_components/FacilityPanelFooter.svelte';
	import DataCentreDetailPanel from './_components/DataCentreDetailPanel.svelte';
	import DataCentrePanelHeader from './_components/DataCentrePanelHeader.svelte';
	import { loadDataCentreFacilities } from '$lib/facilities/data-centres.js';
	import {
		FullscreenLayout,
		FullscreenContainer,
		FullscreenFooter
	} from '$lib/components/fullscreen';
	import { ResizablePanel } from '$lib/components/ui/resizable-panel';
	import { BottomSheet } from '$lib/components/ui/bottom-sheet';
	import IconChevronLeft from '$lib/icons/ChevronLeft.svelte';
	import IconPlus from '$lib/icons/Plus.svelte';
	import IconMinus from '$lib/icons/Minus.svelte';
	import { createDragHandler, DragHandle } from '$lib/components/ui/panel';
	import ShortcutsToast from '$lib/components/ShortcutsToast.svelte';
	import {
		hasBidirectionalBattery,
		filterDerivedBatteryUnits,
		getFacilityCapacity,
		withMarkedUnits
	} from '$lib/facilities/units.js';
	import { getUnitCapacity, sumUnitCapacities } from '$lib/utils/capacity';
	import { fetchFacilityProfile, peekFacilityProfile } from './_utils/fetch-facility-profile.js';
	import { fetchFacilityDetail, peekFacilityDetail } from './_utils/fetch-facility-detail.js';
	import { fetchAllFacilities } from './_utils/fetch-all-facilities.js';
	import {
		filterFacilitiesByPlayYear,
		computePlayCapacityByYear,
		getFacilityPlayYear
	} from './_utils/play-filter.js';
	import { computeYearBounds, computePlayYearBounds } from './_utils/year-bounds.js';
	import { MediaQuery } from 'svelte/reactivity';
	import {
		BELOW_TABLET_QUERY,
		isFullscreenUrl,
		toggleFullscreenMode,
		windowedHref
	} from '$lib/utils/fullscreen-mode.js';
	import { deriveCard } from '$lib/og/facility-card-data.js';
	import { isFeatureEnabled } from '$lib/stores/app.js';
	import { getFueltechColor, needsDarkText } from '$lib/utils/fueltech-display';

	let { data } = $props();

	// Single reactive breakpoint — gates the desktop panel vs the mobile sheets.
	let windowWidth = $state(0);
	let isDesktop = $derived(windowWidth >= 768);

	// /facilities is fullscreen by default — the global Nav/Footer is hidden (the
	// page's load returns `fullscreen: true`, read by the layout) and the in-page
	// fullscreen layout owns the whole viewport. An explicit `?fullscreen=false`
	// opts back into windowed mode (F shortcut toggles it) — desktop only: below
	// the tablet breakpoint (768px, matching the `tablet:`/`max-tablet:` CSS
	// gates and `isDesktop` above — see BELOW_TABLET_QUERY) the param is ignored
	// and the page is always fullscreen. On the server the query resolves false,
	// so the URL is honoured first (the root layout hides the global chrome
	// below the same breakpoint via CSS either way). The param only ever changes
	// via a real `goto` (never shallow replaceState), so deriving from page.url
	// is safe here. `building` guard: reading searchParams during prerender
	// crashes the build.
	const belowTablet = new MediaQuery(BELOW_TABLET_QUERY);
	let isFullscreen = $derived(building ? true : belowTablet.current || isFullscreenUrl(page.url));

	// facility_loads feature flag: gates the whole loads (data centres) UI —
	// the Loads group in the Type filter, the Loads statuses, ACT/NT regions,
	// the map layer and its legend. URL/server semantics are unchanged either
	// way; with the flag off the datacentres param is simply never honoured.
	// Enable via PUBLIC_FEATURE_FLAGS ('facility_loads': true) or, for a
	// testing session, the ?facility_loads=true URL override.
	const loadsFeature =
		isFeatureEnabled('facility_loads') ||
		(!building && page.url.searchParams.get('facility_loads') === 'true');
	// URL-enabled overrides must survive filter navigations (buildUrl
	// reconstructs the URL from scratch).
	const loadsFeatureViaUrl = loadsFeature && !isFeatureEnabled('facility_loads');

	// URL parsers for the client-side filter state — shared between the $state
	// initialisers below and the afterNavigate re-sync, so the two can't drift.
	/** @param {URLSearchParams} params */
	const parseShowLoads = (params) => loadsFeature && params.get('datacentres') === 'true';
	/** @param {URLSearchParams} params */
	const parseLoadStatuses = (params) =>
		parseSelection(params.get('load_statuses'), DEFAULT_LOAD_STATUSES).filter((s) =>
			ALL_LOAD_STATUSES.includes(s)
		);

	// The Type filter's generator side: the literal ticked technology leaves
	// ([] = generators hidden, every leaf = no technology filter). The
	// empty-means-all wire convention lives only at the URL/API boundary
	// (buildUrl serialises via the codec; the server parses its inverse).
	let selectedTechs = $state(parseFuelTechsParam(page.url.searchParams));
	// The Loads side — data centres, persisted as datacentres=true.
	let showLoads = $state(parseShowLoads(page.url.searchParams));

	// Data centres (loads) — pseudo-facility objects mixed into the views when
	// the Loads layer is on. Fetched lazily on first toggle; $state.raw because
	// the array is read-only here (no deep proxying of ~300 records).
	/** @type {any[] | null} */
	let loadFacilitiesRaw = $state.raw(null);
	// No cancellation needed: the data is static and the promise is cached
	// module-wide, so a late resolve can never write a stale value.
	$effect(() => {
		if (showLoads && !loadFacilitiesRaw) {
			loadDataCentreFacilities().then((loads) => (loadFacilitiesRaw = loads));
		}
	});
	// True while the Loads side is on but its dataset hasn't arrived yet — the
	// views show a loader rather than a premature "no facilities" empty state.
	let loadsPending = $derived(showLoads && !loadFacilitiesRaw);

	// Loads filter on their own status dimension (the Loads section of the
	// Status filter — DC buckets, not OE facility statuses) plus the shared
	// region filter, applied client-side. Selections are literal ("ticked =
	// shown"): an empty selection shows nothing. Loads without a mappable
	// state (4 records) pass the region filter while any region is ticked.
	let loadFacilities = $derived.by(() => {
		if (!showLoads || !loadFacilitiesRaw) return [];
		return loadFacilitiesRaw.filter(
			(f) =>
				loadStatuses.includes(f.units[0]?.status_id) &&
				regions.length > 0 &&
				(!f.network_region || regions.includes(f.network_region.toLowerCase()))
		);
	});

	// Server data (updates when server responds) + client-side loads mix-in.
	// Generators are filtered entirely server-side (an empty technology
	// selection already yields an empty data.facilities); loads mix in
	// client-side — everything downstream (views, map, bounds, summary)
	// derives from this combined set.
	let facilities = $derived([...(data.facilities ?? []), ...loadFacilities]);

	// Optimistic local state for filters - updates immediately on user interaction
	// Initialize empty and sync via $effect to avoid capturing stale initial values
	/** @type {string[]} */
	let statuses = $state([]);
	/** @type {string[]} */
	let regions = $state([]);

	// Type filter selection: the ticked technology leaves plus the Loads leaf.
	let selectedTypes = $derived([...selectedTechs, ...(showLoads ? ['data_centres'] : [])]);

	/**
	 * Type selection covers dispatch type AND technology. Tech changes need a
	 * server round-trip (fuel_techs param); a loads-only toggle is client-side
	 * and only syncs the URL.
	 * @param {string[]} values
	 */
	function handleTypesChange(values) {
		const techSelection = values.filter((v) => v !== 'data_centres');
		showLoads = values.includes('data_centres');

		if (techSelection.join(',') !== selectedTechs.join(',')) {
			selectedTechs = techSelection;
			navigateWithRefetch({
				statuses,
				regions,
				fuelTechs: techSelection,
				capacityRange,
				yearRange,
				view: selectedView,
				facility: selectedFacility?.code ?? null
			});
		} else {
			updateMapOptionsUrl();
		}
	}
	// Loads (data centre) statuses — the Loads section of the Status filter.
	// Client-side only (no server round-trip), so it initialises straight from
	// the URL rather than syncing from server data like the filters above.
	/** @type {string[]} */
	let loadStatuses = $state(parseLoadStatuses(page.url.searchParams));
	/** @type {[number, number]} */
	let capacityRange = $state(/** @type {[number, number]} */ ([0, 10000]));
	/** @type {[number, number]} */
	let yearRange = $state(/** @type {[number, number]} */ ([1900, 2040]));
	// View follows the `view` URL param — canonical, so it survives reload and
	// browser back/forward (mirroring the `facility` selection below). Like the
	// selection, view switches sync the URL via replaceState, which doesn't re-run
	// load or reactively update page.url/data, so an optimistic override gives an
	// instant switch and afterNavigate reconciles it from window.location.
	//   undefined → no override, use data.view (the load's value) ·
	//   string → optimistically selected view
	/** @type {'list' | 'timeline' | 'grid' | undefined} */
	let optimisticView = $state(undefined);
	/** @type {'list' | 'timeline' | 'grid'} */
	let selectedView = $derived(
		/** @type {'list' | 'timeline' | 'grid'} */ (optimisticView ?? data.view)
	);
	// The switcher, URL and map react to a view change instantly, but mounting
	// the new view (hundreds of list rows, the full timeline) blocks the main
	// thread — so the heavy render lags one painted frame behind `selectedView`
	// (gated by `viewLoading`) and a loader fills the gap, keeping the tap
	// feedback snappy.
	/** @type {'list' | 'timeline' | 'grid'} */
	let displayedView = $state(/** @type {'list' | 'timeline' | 'grid'} */ (data.view));
	let viewLoading = $derived(displayedView !== selectedView);
	$effect(() => {
		const view = selectedView;
		if (view === displayedView) return;
		// Double rAF: the first fires before the loader paints, the second after
		// — guaranteeing the loader is visible before the heavy mount starts.
		let raf = requestAnimationFrame(() => {
			raf = requestAnimationFrame(() => {
				displayedView = view;
			});
		});
		return () => cancelAnimationFrame(raf);
	});
	// Selection follows the `facility` URL param — canonical, so it survives
	// reload, sharing and browser back/forward (real navigations update page.url
	// reactively). Clicks additionally set an optimistic override for an instant
	// response, because replaceState only mirrors the URL — it doesn't reactively
	// update page.url. The override is dropped after the next real navigation
	// (afterNavigate), when the URL is authoritative again.
	//   undefined → no override, use the URL · null → optimistically deselected ·
	//   string → optimistically selected code
	/** @type {string | null | undefined} */
	let optimisticCode = $state(undefined);

	// The set that selection lookups and marker metrics resolve against: during
	// play the map shows the full unfiltered set, so facilities revealed outside
	// the active filters must still resolve. ($derived.by: the play-mode state
	// is declared further down; the closure defers evaluation past its TDZ.)
	// Loads are appended unfiltered so a data centre clicked on the map always
	// resolves, even when the status/region filters exclude it from the views.
	let lookupFacilities = $derived.by(() => {
		const base = playModeActive && allFacilities ? allFacilities : facilities;
		return loadFacilitiesRaw ? [...base, ...loadFacilitiesRaw] : base;
	});

	/** @type {any | null} */
	let selectedFacility = $derived.by(() => {
		const code =
			optimisticCode !== undefined ? optimisticCode : page.url.searchParams.get('facility');
		return code ? (lookupFacilities?.find((f) => f.code === code) ?? null) : null;
	});

	// Editorial profile (description, photos, owners, unit garnishes) for the
	// selected facility — fetched client-side so opening the detail preview never
	// blocks on a full page load. `peek`/`fetch` memoise per code.
	/** @type {any | null} */
	let selectedProfile = $state(null);
	let profileLoading = $state(false);

	// Complete facility (every unit, all fuel techs + statuses) for the selected
	// code — fetched client-side, independent of the list's fuel-tech/status
	// filters, so the detail panel shows the whole facility (mirroring the
	// /facility/[code] page it morphs into) rather than only the filtered units.
	/** @type {any | null} */
	let selectedFacilityFull = $state(null);

	// What the detail panel renders: the complete facility once fetched (matched by
	// code so a stale in-flight result for a previous selection is never shown),
	// else the filtered list row so units still appear instantly on selection.
	/** @type {any | null} */
	let detailFacility = $derived.by(() => {
		if (!selectedFacility) return null;
		return selectedFacilityFull?.code === selectedFacility.code
			? withMarkedUnits(selectedFacilityFull)
			: selectedFacility;
	});

	// Dominant fuel-tech colour of the selection — matches FacilityPanelHeader's
	// banner so the panel's drag-grip chrome can extend the colour to the top edge.
	// The grip pill flips light/dark to stay legible on the colour, like the header.
	let detailCard = $derived(detailFacility ? deriveCard(detailFacility) : null);
	let detailColour = $derived(detailCard ? getFueltechColor(detailCard.dominant) : 'transparent');
	let detailDarkText = $derived(!!detailCard && needsDarkText(detailCard.dominant));
	let detailGripClass = $derived(detailDarkText ? 'bg-black/30' : 'bg-white/55');

	// Codes with a committed `static/og/facility/<code>.jpg` — the map card popup
	// shows the build-generated card for these and a live card for everything else.
	let cardCodeSet = $derived(new Set(data.cardCodes ?? []));
	// Facility code → Sanity photo URL, for the card-grid tiles.
	let facilityPhotos = $derived(data.facilityPhotos ?? {});

	// Sync optimistic filter state when server data changes (e.g. browser
	// back/forward, direct URL navigation). Selection is handled separately by the
	// `selectedFacility` derived above (URL-driven).
	$effect(() => {
		statuses = data.statuses;
		regions = data.regions;
		// Value-compare like the afterNavigate re-sync: the server returns a
		// fresh array on every refetch even when the values are identical.
		if (data.fuelTechs.join(',') !== selectedTechs.join(',')) {
			selectedTechs = data.fuelTechs;
		}
	});

	// Load the selected facility's auxiliary data — editorial profile (photos,
	// description, owners) and the complete facility (all units) — whenever the
	// selection changes (initial URL param, click, or back/forward). Both memoise
	// per code, so cached values resolve synchronously with no flash; the profile
	// shows a skeleton on a miss, the units fall back to the filtered row until the
	// full facility arrives.
	$effect(() => {
		const code = selectedFacility?.code ?? null;
		// Loads have no OE profile/detail — render straight from the pseudo-facility.
		if (!code || selectedFacility?.isLoad) {
			selectedProfile = null;
			profileLoading = false;
			selectedFacilityFull = null;
			return;
		}

		const cachedProfile = peekFacilityProfile(code);
		if (cachedProfile !== undefined) {
			selectedProfile = cachedProfile;
			profileLoading = false;
		} else {
			selectedProfile = null;
			profileLoading = true;
		}

		const cachedFull = peekFacilityDetail(code);
		selectedFacilityFull = cachedFull !== undefined ? cachedFull : null;

		let cancelled = false;
		if (cachedProfile === undefined) {
			fetchFacilityProfile(code).then((profile) => {
				if (cancelled) return;
				selectedProfile = profile;
				profileLoading = false;
			});
		}
		if (cachedFull === undefined) {
			fetchFacilityDetail(code).then((facility) => {
				if (cancelled) return;
				selectedFacilityFull = facility;
			});
		}
		return () => {
			cancelled = true;
		};
	});

	// Whether the user (or a shared URL) explicitly narrowed the capacity/year
	// range. While untouched, the range tracks the data bounds — bounds move
	// whenever the facility set changes (region refetch, loads mixing in/out),
	// and a stale full-width range would otherwise read as an active filter
	// and get serialised into the URL on the next navigation.
	let capacityTouched = $state(false);
	let yearTouched = $state(false);

	// Sync capacity range: URL params win (and mark the range as touched);
	// otherwise an untouched range follows the bounds as they move. The
	// value-compare keeps a no-op bounds change from minting a new range array
	// (which would re-run the whole filteredFacilities → map chain a second
	// time per interaction).
	$effect(() => {
		const minFromUrl = data.capacityMin;
		const maxFromUrl = data.capacityMax;
		const bounds = capacityBounds;
		if (minFromUrl != null || maxFromUrl != null) {
			capacityRange = [minFromUrl ?? bounds.min, maxFromUrl ?? bounds.max];
			capacityTouched = true;
		} else if (!untrack(() => capacityTouched)) {
			const current = untrack(() => capacityRange);
			if (current[0] !== bounds.min || current[1] !== bounds.max) {
				capacityRange = [bounds.min, bounds.max];
			}
		}
	});

	// Same for the year range.
	$effect(() => {
		const minFromUrl = data.yearMin;
		const maxFromUrl = data.yearMax;
		const bounds = yearBounds;
		if (minFromUrl != null || maxFromUrl != null) {
			yearRange = [minFromUrl ?? bounds.min, maxFromUrl ?? bounds.max];
			yearTouched = true;
		} else if (!untrack(() => yearTouched)) {
			const current = untrack(() => yearRange);
			if (current[0] !== bounds.min || current[1] !== bounds.max) {
				yearRange = [bounds.min, bounds.max];
			}
		}
	});

	let showTodayButton = $state(false);
	let todayButtonPosition = $state('bottom');
	/** @type {*} */
	let timelineRef = $state(null);
	/** @type {HTMLElement | null} */
	let timelineScrollContainer = $state(null);
	let hasInitiallyScrolledToToday = $state(false);

	let searchTerm = $state('');
	/** @type {any | null} */
	let hoveredFacility = $state(null);
	/** @type {any | null} */
	let clickedFacility = $state(null);

	// List sorting state (persists across view changes)
	/** @type {'name' | 'region' | 'storage' | 'capacity'} */
	let listSortBy = $state('name');
	/** @type {'asc' | 'desc'} */
	let listSortOrder = $state('asc');

	// Timeline's visual order — codes of facilities in the order the Timeline
	// displays them (first-appearance, sorted desc by commissioning/retired
	// date). Populated via Timeline's `onorderchange` callback and used for
	// keyboard navigation in timeline view.
	/** @type {string[]} */
	let timelineOrderedCodes = $state([]);

	// Map options - read initial values from URL params
	// satellite: default false, transmission: default true, clustering: default false, golf: default false
	const VALID_THEMES = /** @type {const} */ (['light', 'dark', 'satellite']);

	const initialTheme = page.url.searchParams.get('theme') ?? 'light';

	let mapTheme = $state(
		/** @type {'light' | 'dark' | 'satellite'} */ (
			VALID_THEMES.includes(/** @type {any} */ (initialTheme)) ? initialTheme : 'light'
		)
	);
	let mapShowTransmissionLines = $state(page.url.searchParams.get('transmission') !== 'false');
	let mapClustering = $state(page.url.searchParams.get('clustering') === 'true');
	let mapShowGolfCourses = $state(page.url.searchParams.get('golf') === 'true');

	// Capacity per facility (maximum falling back to registered), normalised to
	// 0..1 — sizes the map markers (circle radius). Sourced from the play set
	// during play so full-set markers get a size too.
	let capacityValuesByCode = $derived.by(() => {
		const m = new Map();
		for (const f of lookupFacilities ?? []) m.set(f.code, getFacilityCapacity(f));
		return m;
	});
	let metricValues = $derived(normaliseMetric(capacityValuesByCode));

	/** @type {{ high: boolean, medium: boolean, low: boolean, lowest: boolean }} */
	let transmissionLineVisibility = $state({ high: true, medium: true, low: true, lowest: true });

	// Map loading state
	let mapLoaded = $state(false);

	// Container height for responsive detail panel
	let containerHeight = $state(0);

	// Draggable divider between the list/timeline column and the map column.
	const mainDrag = createDragHandler({
		axis: 'x',
		min: 320,
		max: 720,
		initial: 480,
		storageKey: 'facilities-list-width'
	});

	// Circular white floating buttons over the mobile map (zoom, back) — one
	// definition so the FABs can't drift apart. Size is set per button (the
	// back button matches the nav-bar controls, the zoom stack is smaller).
	const mapFabClass =
		'rounded-full bg-white border-2 border-warm-grey shadow-lg flex items-center justify-center hover:bg-light-warm-grey transition-colors cursor-pointer';

	// The detail panel opens to ~2/3 of the map height on both breakpoints
	// (desktop: drag-resizable ResizablePanel; mobile: the detail bottom sheet's
	// peek). The selected marker (and its OSM footprint) is then centred in the
	// remaining third of map visible above it — shift the view up by half the
	// panel's height.
	const FACILITY_PANEL_FRACTION = 2 / 3;
	let facilityMarkerOffsetY = $derived(selectedFacility ? -FACILITY_PANEL_FRACTION / 2 : 0);

	// Shortcuts toast
	let showShortcutsToast = $state(false);

	// ============================================
	// Play mode (year animation)
	// ============================================
	// The overlay owns the playback engine; the page owns `playModeActive`
	// (dims/inerts the filter bar and gates the display swap below) and lazily
	// fetches the full dataset the animation runs over — play always animates
	// the complete grid history regardless of the active filters.
	let playModeActive = $state(false);
	let isYearPlaying = $state(false);
	// Full facilities set (PLAY_STATUSES, no region/fueltech filter), fetched on
	// first play. $state.raw: large immutable dataset — never deep-proxy it.
	/** @type {any[] | null} */
	let allFacilities = $state.raw(null);
	let allFacilitiesLoading = $state(false);
	let allFacilitiesError = $state(false);
	// Pre-play facility selection (from the URL), snapshotted on open so closing
	// play can restore it. Never rendered — a plain variable, not state.
	/** @type {string | null} */
	let playRestoreCode = null;

	function handlePlayOpen() {
		playModeActive = true;
		// The detail panel would cover the map during play — snapshot the
		// URL-held selection and clear it, restored in handlePlayClose.
		playRestoreCode = selectedFacility?.code ?? null;
		if (selectedFacility) closeFacilityDetail();

		if (allFacilities) {
			// Zoom out to the full dataset so the markers pop up in frame.
			mapRef?.fitFacilities(allFacilities);
			return;
		}
		if (allFacilitiesLoading) return;
		allFacilitiesLoading = true;
		allFacilitiesError = false;
		fetchAllFacilities().then((data) => {
			allFacilitiesLoading = false;
			if (data) {
				allFacilities = data;
				if (playModeActive) mapRef?.fitFacilities(data);
			} else {
				allFacilitiesError = true;
			}
		});
	}

	/**
	 * @param {boolean} restore — false for navigation closes, where the new URL
	 * defines the state and the map should be left alone.
	 */
	function handlePlayClose(restore) {
		playModeActive = false;
		const restoreCode = playRestoreCode;
		playRestoreCode = null;
		if (!restore) return;

		// Restore the pre-play map state from the URL-held selection: a facility
		// selected *during* play wins (the URL already points there and the map is
		// on it); otherwise re-select the snapshotted facility, which flies the
		// map back to it — or just re-frame the filtered set.
		if (new URLSearchParams(window.location.search).get('facility')) return;
		const facility = restoreCode ? facilities?.find((f) => f.code === restoreCode) : null;
		if (facility) {
			handleFacilitySelect(facility);
		} else {
			mapRef?.resetView();
		}
	}

	// When a facility is selected in list view, collapse the list pane (drop the
	// Storage + Capacity + Region columns, overlap the fuel-tech badges) to give
	// the map/detail more room — animated. 320 fits name + overlapped badges.
	const LIST_COMPACT_WIDTH = 320;
	let listCompact = $derived(isDesktop && selectedView === 'list' && !!selectedFacility);
	let listPaneWidth = $derived(
		listCompact ? Math.min(mainDrag.value, LIST_COMPACT_WIDTH) : mainDrag.value
	);
	/** @type {number | null} */
	let playYear = $state(null);

	// Golf courses easter egg - show option with 'G' key or ?golf=true
	let showGolfOption = $derived(page.url.searchParams.get('golf') === 'true');
	let golfUnlocked = $state(false);
	let showGolf = $derived(showGolfOption || golfUnlocked);

	// Guard against calling replaceState before the client router is initialised
	// (e.g. during hydration when a facility is already selected via URL param).
	// `afterNavigate` is dispatched during the initial navigation commit — the
	// router isn't fully ready yet at that moment, so we flip the flag on the
	// next microtask. Any state changes during hydration will be picked up by
	// the next user interaction and synced to the URL then.
	let routerReady = $state(false);
	afterNavigate(() => {
		// Any real navigation (back/forward, filter refetch) ends play mode so
		// the restored URL's filters take effect again — without restoring the
		// pre-play map state, since the navigated-to URL defines it. Facility
		// selection uses shallow replaceState, which doesn't fire afterNavigate,
		// so selecting facilities mid-play doesn't interrupt playback.
		if (playModeActive) handlePlayClose(false);
		// Reconcile selection *and* view from the *actual* browser URL after every
		// navigation (back/forward, filter change). We can't trust page.url /
		// navigation.to.url here: after a shallow replaceState (how selection and
		// view sync the URL) followed by back/forward, the browser restores the real
		// URL but SvelteKit reports an older snapshot. window.location is
		// authoritative. The overrides drive the deriveds: a code/view selects it,
		// null deselects the facility.
		const params = new URLSearchParams(window.location.search);
		optimisticCode = params.get('facility');
		// Raw param (mirrors optimisticCode); `selectedView` owns the single
		// `?? data.view` fallback rather than hardcoding the default twice.
		optimisticView = /** @type {'list' | 'timeline' | 'grid' | undefined} */ (
			normaliseViewParam(params.get('view')) ?? undefined
		);

		// Re-derive the URL-initialised filter state too: same-route navigation
		// doesn't remount the component, so without this a nav-bar "Facilities"
		// click (or back/forward) changes the URL but leaves the Type filter,
		// load statuses and touched ranges where they were. Statuses/regions
		// sync from `data`; map chrome (theme, transmission, clustering) stays
		// sticky by design — it's display preference, not a filter. Array
		// writes are value-compared first: afterNavigate fires on every filter
		// refetch, and an identical-but-fresh array would re-run the whole
		// filteredFacilities → map chain a second time for nothing.
		showLoads = parseShowLoads(params);
		const parsedTechs = parseFuelTechsParam(params);
		if (parsedTechs.join(',') !== selectedTechs.join(',')) {
			selectedTechs = parsedTechs;
		}
		const parsedLoadStatuses = parseLoadStatuses(params);
		if (parsedLoadStatuses.join(',') !== loadStatuses.join(',')) {
			loadStatuses = parsedLoadStatuses;
		}
		if (!params.has('capacity_min') && !params.has('capacity_max')) {
			capacityTouched = false;
			if (capacityRange[0] !== capacityBounds.min || capacityRange[1] !== capacityBounds.max) {
				capacityRange = [capacityBounds.min, capacityBounds.max];
			}
		}
		if (!params.has('year_min') && !params.has('year_max')) {
			yearTouched = false;
			if (yearRange[0] !== yearBounds.min || yearRange[1] !== yearBounds.max) {
				yearRange = [yearBounds.min, yearBounds.max];
			}
		}

		if (routerReady) return;
		queueMicrotask(() => {
			routerReady = true;
		});
	});

	/**
	 * Update map options in URL without refetch
	 */
	function updateMapOptionsUrl() {
		if (!routerReady) return;
		const params = new URLSearchParams(page.url.searchParams);

		// theme: only include if non-default (default is light)
		if (mapTheme !== 'light') {
			params.set('theme', mapTheme);
		} else {
			params.delete('theme');
		}
		// Drop the legacy satellite=… param if a previous URL had it.
		params.delete('satellite');

		// Drop legacy marker/metric params (the map experiments feature was removed).
		params.delete('markers');
		params.delete('hex');

		// transmission: only include if false (default is true)
		if (!mapShowTransmissionLines) {
			params.set('transmission', 'false');
		} else {
			params.delete('transmission');
		}

		// clustering: only include if true (default is false)
		if (mapClustering) {
			params.set('clustering', 'true');
		} else {
			params.delete('clustering');
		}

		// golf: only include if true (default is false)
		if (mapShowGolfCourses) {
			params.set('golf', 'true');
		} else {
			params.delete('golf');
		}

		// Drop the legacy generators=… param (superseded by fuel_techs=none).
		params.delete('generators');

		// data centres: only include if true (default is false)
		if (showLoads) {
			params.set('datacentres', 'true');
		} else {
			params.delete('datacentres');
		}

		// load statuses: re-sourced from local state (like `facility` below) so a
		// stale page.url after replaceState can't clobber it; only when non-default
		const loadStatusesSerialised = serialiseSelection(loadStatuses, DEFAULT_LOAD_STATUSES);
		if (loadStatusesSerialised !== null) {
			params.set('load_statuses', loadStatusesSerialised);
		} else {
			params.delete('load_statuses');
		}

		params.delete('metric');
		params.delete('pollutant');
		params.delete('mode');

		// facility: re-source from local state rather than the (potentially
		// stale) URL params. `page.url` updates async after replaceState,
		// so reading from it here can re-introduce a facility param that
		// closeFacilityDetail just removed.
		if (selectedFacility?.code) {
			params.set('facility', selectedFacility.code);
		} else {
			params.delete('facility');
		}

		const newUrl = `${page.url.pathname}?${params.toString()}`;
		replaceState(newUrl, {});
	}
	/** @type {*} */
	let mapRef = $state(null);

	/**
	 * Get all unit capacities from facilities (excluding battery charging/discharging)
	 * @param {any[]} facilityList
	 * @returns {number[]}
	 */
	function getAllUnitCapacities(facilityList) {
		return facilityList.flatMap((facility) =>
			filterDerivedBatteryUnits(facility.units ?? [], hasBidirectionalBattery(facility))
				.map((/** @type {any} */ unit) => getUnitCapacity(unit))
				.filter((/** @type {number} */ c) => c > 0)
		);
	}

	// Calculate capacity bounds based on view (unit capacity for Timeline, facility capacity for List/Grid)
	let capacityBounds = $derived.by(() => {
		if (!facilities || facilities.length === 0) return { min: 0, max: 10000 };

		let capacities;
		if (selectedView === 'timeline') {
			// Timeline: use individual unit capacities
			capacities = getAllUnitCapacities(facilities);
		} else {
			// List/Grid: use total facility capacities
			capacities = facilities.map(getFacilityCapacity).filter((c) => c > 0);
		}

		if (capacities.length === 0) return { min: 0, max: 10000 };

		const min = Math.floor(Math.min(...capacities));
		const max = Math.ceil(Math.max(...capacities));
		return { min, max };
	});

	// Year bounds from all unit dates (drives the Years filter). Play mode's
	// range comes from the full set's commencement years instead.
	let yearBounds = $derived(computeYearBounds(facilities));
	let playYearBounds = $derived(computePlayYearBounds(allFacilities));
	// Total-capacity-per-year data for the play overlay's Capacity readout.
	let playCapacitySeries = $derived(
		allFacilities
			? computePlayCapacityByYear(allFacilities, playYearBounds.min, playYearBounds.max)
			: []
	);
	// Facility code → first-connection year, precomputed once from the stable
	// full set (the map's facilities prop rebuilds every play tick, but appear
	// years never change) — drives the marker scale-in.
	let playAppearYears = $derived.by(() => {
		const m = new Map();
		for (const f of allFacilities ?? []) m.set(f.code, getFacilityPlayYear(f));
		return m;
	});

	/**
	 * Check if a unit's year falls within the year range.
	 * @param {any} unit
	 * @param {[number, number]} yearRangeFilter
	 * @param {boolean} isYearFiltered
	 * @returns {boolean}
	 */
	function unitMatchesYearRange(unit, yearRangeFilter, isYearFiltered) {
		if (!isYearFiltered) return true;
		const unitYear = getUnitYear(unit);
		if (unitYear === null) return false;
		return unitYear >= yearRangeFilter[0] && unitYear <= yearRangeFilter[1];
	}

	/**
	 * Filter facilities - in Timeline view, filter by unit capacity/year; in List/Grid view, filter by facility capacity/year
	 * @param {any[]} facilityList
	 * @param {string} searchTerm
	 * @param {[number, number]} capacityRangeFilter
	 * @param {[number, number]} yearRangeFilter
	 * @param {{ min: number, max: number }} yearBoundsRef
	 * @param {'list' | 'timeline' | 'grid'} view
	 * @returns {any[]}
	 */
	function filterFacilities(
		facilityList,
		searchTerm,
		capacityRangeFilter,
		yearRangeFilter,
		yearBoundsRef,
		view
	) {
		const isYearFiltered =
			yearRangeFilter[0] > yearBoundsRef.min || yearRangeFilter[1] < yearBoundsRef.max;

		if (view === 'timeline') {
			// Timeline: filter units by individual capacity and year, keep facilities with matching units
			return facilityList
				.map((facility) => ({
					...facility,
					units: filterDerivedBatteryUnits(
						facility.units ?? [],
						hasBidirectionalBattery(facility)
					).filter(
						(/** @type {any} */ unit) =>
							(searchTerm
								? facility.name.toLowerCase().includes(searchTerm.toLowerCase())
								: true) &&
							getUnitCapacity(unit) >= capacityRangeFilter[0] &&
							getUnitCapacity(unit) <= capacityRangeFilter[1] &&
							unitMatchesYearRange(unit, yearRangeFilter, isYearFiltered)
					)
				}))
				.filter((facility) => facility.units && facility.units.length > 0);
		} else {
			// List/Grid: filter by total facility capacity and year
			return facilityList
				.map((facility) => ({
					...facility,
					units: filterDerivedBatteryUnits(
						facility.units ?? [],
						hasBidirectionalBattery(facility)
					).filter((/** @type {any} */ unit) =>
						searchTerm ? facility.name.toLowerCase().includes(searchTerm.toLowerCase()) : true
					)
				}))
				.filter((facility) => facility.units && facility.units.length > 0)
				.filter((facility) => {
					const totalCapacity = sumUnitCapacities(facility.units);
					return totalCapacity >= capacityRangeFilter[0] && totalCapacity <= capacityRangeFilter[1];
				})
				.filter((facility) => {
					if (!isYearFiltered) return true;
					return facility.units.some((/** @type {any} */ unit) =>
						unitMatchesYearRange(unit, yearRangeFilter, isYearFiltered)
					);
				});
		}
	}

	let filteredFacilities = $derived.by(() => {
		if (!facilities) return [];
		return filterFacilities(
			facilities,
			searchTerm,
			capacityRange,
			yearRange,
			yearBounds,
			selectedView
		);
	});

	/**
	 * Check if facility has valid location data
	 * @param {any} facility
	 * @returns {boolean}
	 */
	function hasValidLocation(facility) {
		return (
			facility.location &&
			typeof facility.location.lat === 'number' &&
			typeof facility.location.lng === 'number' &&
			!isNaN(facility.location.lat) &&
			!isNaN(facility.location.lng)
		);
	}

	/**
	 * Filter facilities with valid location data
	 * @param {any[]} facilityList
	 * @returns {any[]}
	 */
	function filterWithLocation(facilityList) {
		return facilityList.filter(hasValidLocation);
	}

	// While play mode is showing a frame, the play set replaces the filtered
	// set everywhere the page displays facilities (map, views, footer badges);
	// null otherwise, letting the filtered set show through.
	/** @type {any[] | null} */
	let playFacilities = $derived.by(() => {
		if (!playModeActive || !allFacilities || playYear === null) return null;
		return filterFacilitiesByPlayYear(allFacilities, playYear, selectedView);
	});
	let displayFacilities = $derived(playFacilities ?? filteredFacilities);
	let displayWithLocation = $derived(filterWithLocation(displayFacilities));
	// The map draws loads via its own DataCentresLayer (status-opacity encoding,
	// purple identity) — exclude them from the generator marker pipeline so they
	// don't render twice. Timeline keeps the full located set.
	let mapFacilities = $derived(displayWithLocation.filter((f) => !f.isLoad));

	// Calculate totals for displayed facilities. Loads are excluded — their MW
	// is consumption, so folding it into the generation capacity badges (and
	// the units count) would misstate the totals.
	let filteredUnits = $derived(
		displayFacilities?.filter((f) => !f.isLoad).flatMap((f) => f.units) ?? []
	);
	let totalCapacityMW = $derived(sumUnitCapacities(filteredUnits));
	let totalFacilitiesCount = $derived(displayFacilities?.length ?? 0);
	let totalUnitsCount = $derived(filteredUnits?.length ?? 0);

	// Calculate capacity by status
	/**
	 * @param {string} status
	 * @returns {number}
	 */
	function getCapacityByStatus(status) {
		return sumUnitCapacities(filteredUnits.filter((u) => u.status_id === status));
	}
	let capacityByStatus = $derived({
		operating: getCapacityByStatus('operating'),
		commissioning: getCapacityByStatus('commissioning'),
		committed: getCapacityByStatus('committed'),
		retired: getCapacityByStatus('retired')
	});

	/**
	 * @typedef {{statuses: string[], regions: string[], fuelTechs: string[], capacityRange: [number, number], yearRange: [number, number], view: string, facility?: string | null}} NavParams
	 */

	/**
	 * Build URL from params
	 * @param {NavParams} params
	 * @returns {string}
	 */
	function buildUrl({
		statuses: s,
		regions: r,
		fuelTechs: ft,
		capacityRange: cr,
		yearRange: yr,
		view: v,
		facility: f = null
	}) {
		let url = `/facilities?view=${v}`;
		// Literal "ticked = shown" selections: default → omitted, none → 'none',
		// otherwise the ticked subset (see serialiseSelection).
		const techsSerialised = serialiseSelection(ft, FUEL_TECH_VALUES);
		if (techsSerialised !== null) {
			url += `&fuel_techs=${techsSerialised}`;
		}
		const statusesSerialised = serialiseSelection(s, DEFAULT_STATUSES);
		if (statusesSerialised !== null) {
			url += `&statuses=${statusesSerialised}`;
		}
		const regionsSerialised = serialiseSelection(r, ALL_REGIONS);
		if (regionsSerialised !== null) {
			url += `&regions=${regionsSerialised}`;
		}
		// Only include the capacity/year ranges when the user explicitly set
		// them. Comparing against the live bounds alone is not enough: bounds
		// move whenever the facility set changes, so an untouched range can
		// transiently differ from them and would self-serialise as a filter.
		if (capacityTouched && (cr[0] > capacityBounds.min || cr[1] < capacityBounds.max)) {
			url += `&capacity_min=${cr[0]}&capacity_max=${cr[1]}`;
		}
		if (yearTouched && (yr[0] > yearBounds.min || yr[1] < yearBounds.max)) {
			url += `&year_min=${yr[0]}&year_max=${yr[1]}`;
		}
		if (f) {
			url += `&facility=${f}`;
		}
		// Preserve map layer options
		if (mapTheme !== 'light') {
			url += `&theme=${mapTheme}`;
		}
		if (!mapShowTransmissionLines) {
			url += '&transmission=false';
		}
		if (mapClustering) {
			url += '&clustering=true';
		}
		if (mapShowGolfCourses) {
			url += '&golf=true';
		}
		if (showLoads) {
			url += '&datacentres=true';
		}
		if (loadsFeatureViaUrl) {
			url += '&facility_loads=true';
		}
		const loadStatusesSerialised = serialiseSelection(loadStatuses, DEFAULT_LOAD_STATUSES);
		if (loadStatusesSerialised !== null) {
			url += `&load_statuses=${loadStatusesSerialised}`;
		}
		// Preserve windowed mode (fullscreen is the default and never serialised)
		return windowedHref(url, !isFullscreen);
	}

	/**
	 * Navigate and refetch data (for filter changes that affect API query)
	 * @param {NavParams} params
	 */
	function navigateWithRefetch(params) {
		goto(buildUrl(params), {
			noScroll: true,
			invalidateAll: true
		});
	}

	/**
	 * Update URL without refetch (for view/facility/capacity changes that use cached data)
	 * Uses replaceState to avoid triggering the load function
	 * @param {NavParams} params
	 */
	function navigateWithoutRefetch(params) {
		replaceState(buildUrl(params), {});
	}

	/** Toggle app fullscreen (hide/show the global Nav/Footer chrome). Desktop
	 * only — below the tablet breakpoint is always fullscreen. */
	function toggleFullscreen() {
		if (belowTablet.current) return;
		toggleFullscreenMode(isFullscreen);
	}

	function handleDownloadCsv() {
		if (displayFacilities?.length) {
			// Loads are excluded — their consumption MW under capacity columns
			// would misstate a dataset users treat as OE generator data (same
			// gate as the summary-bar totals).
			downloadCsv(facilitiesToCsv(displayFacilities.filter((f) => !f.isLoad)), 'facilities.csv');
		}
	}

	/**
	 * Facilities in the order the active view displays them. Used by
	 * up/down arrow-key navigation so pressing an arrow moves selection
	 * along the same visible order the user sees.
	 */
	let orderedFacilities = $derived.by(() => {
		if (selectedView === 'list') {
			return sortFacilities(displayFacilities, listSortBy, listSortOrder, null);
		}
		if (selectedView === 'timeline' && timelineOrderedCodes.length) {
			/** @type {Record<string, any>} */
			const lookup = {};
			for (const f of displayFacilities ?? []) lookup[f.code] = f;
			/** @type {any[]} */
			const ordered = [];
			for (const code of timelineOrderedCodes) {
				const f = lookup[code];
				if (f) ordered.push(f);
			}
			return ordered;
		}
		return displayFacilities ?? [];
	});

	/**
	 * Move selection to the previous/next facility in the current view.
	 * @param {1 | -1} direction
	 */
	function moveSelection(direction) {
		const list = orderedFacilities;
		if (!list?.length) return;

		if (!selectedFacility) {
			handleFacilitySelect(list[0]);
			return;
		}

		const idx = list.findIndex((f) => f.code === selectedFacility.code);
		const nextIdx = idx < 0 ? 0 : Math.max(0, Math.min(list.length - 1, idx + direction));
		if (nextIdx === idx) return;
		handleFacilitySelect(list[nextIdx]);
	}

	/**
	 * Handle keyboard shortcuts
	 * @param {KeyboardEvent} e
	 */
	function handleKeydown(e) {
		// Esc: close the shortcuts toast if it's showing. (Fullscreen exit is NOT
		// bound to Esc — use the options menu or F shortcut.)
		if (e.key === 'Escape') {
			if (showShortcutsToast) {
				e.preventDefault();
				showShortcutsToast = false;
			}
			return;
		}

		// Arrow up/down: navigate through facilities in the List/Timeline view
		if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
			if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
			if (selectedView !== 'list' && selectedView !== 'timeline') return;
			e.preventDefault();
			moveSelection(e.key === 'ArrowDown' ? 1 : -1);
			return;
		}

		// '?' key toggles shortcuts toast
		if (e.key === '?') {
			if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
			showShortcutsToast = !showShortcutsToast;
			return;
		}

		// 'G' key toggles golf courses (easter egg)
		if (e.key === 'g' || e.key === 'G') {
			// Don't trigger if typing in an input
			if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
			golfUnlocked = true;
			mapShowGolfCourses = !mapShowGolfCourses;
			updateMapOptionsUrl();
			showShortcutsToast = false;
		}
	}

	/**
	 * @param {string[]} values
	 */
	function handleRegionsChange(values) {
		// Optimistic update - immediately update local state
		regions = values;
		// Then navigate to fetch new data (filter change requires refetch)
		navigateWithRefetch({
			statuses,
			regions: values,
			fuelTechs: selectedTechs,
			capacityRange,
			yearRange,
			view: selectedView
		});
	}

	/**
	 * Loads (data centre) status selection — client-side only, so it syncs the
	 * URL via replaceState instead of a server round-trip.
	 * @param {string[]} values
	 */
	function handleLoadStatusesChange(values) {
		loadStatuses = values;
		updateMapOptionsUrl();
	}

	/**
	 * @param {string[]} values
	 */
	function handleStatusesChange(values) {
		// Optimistic update
		statuses = values;
		// Filter change requires refetch
		navigateWithRefetch({
			statuses: values,
			regions,
			fuelTechs: selectedTechs,
			capacityRange,
			yearRange,
			view: selectedView
		});
	}

	/**
	 * @param {[number, number]} range
	 */
	function handleCapacityRangeChange(range) {
		// Optimistic update. Selecting the full bounds counts as clearing.
		capacityRange = range;
		capacityTouched = range[0] > capacityBounds.min || range[1] < capacityBounds.max;
		// Capacity is client-side filtered, no refetch needed. Preserve the
		// selection in the URL so it survives back/forward.
		navigateWithoutRefetch({
			statuses,
			regions,
			fuelTechs: selectedTechs,
			capacityRange: range,
			yearRange,
			view: selectedView,
			facility: selectedFacility?.code ?? null
		});
	}

	/**
	 * @param {[number, number]} range
	 */
	function handleYearRangeChange(range) {
		// Optimistic update. Selecting the full bounds counts as clearing.
		yearRange = range;
		yearTouched = range[0] > yearBounds.min || range[1] < yearBounds.max;
		// Year is client-side filtered, no refetch needed. Preserve the selection
		// in the URL so it survives back/forward.
		navigateWithoutRefetch({
			statuses,
			regions,
			fuelTechs: selectedTechs,
			capacityRange,
			yearRange: range,
			view: selectedView,
			facility: selectedFacility?.code ?? null
		});
	}

	/**
	 * @param {'list' | 'timeline' | 'grid'} value
	 */
	function handleSelectedViewChange(value) {
		// Optimistic override for an instant switch (replaceState only mirrors the
		// URL; it doesn't reactively update page.url/data). afterNavigate reconciles.
		optimisticView = value;

		// Reset capacity range to match new view's bounds
		// (timeline uses unit capacities, list/grid uses facility capacities)
		capacityRange = [capacityBounds.min, capacityBounds.max];
		yearRange = [yearBounds.min, yearBounds.max];
		capacityTouched = false;
		yearTouched = false;

		// View change uses cached data, no refetch needed
		navigateWithoutRefetch({
			statuses,
			regions,
			fuelTechs: selectedTechs,
			capacityRange,
			yearRange,
			view: value,
			facility: selectedFacility?.code ?? null
		});
	}

	/**
	 * @param {boolean} visible
	 * @param {string} position
	 */
	function handleTodayButtonVisible(visible, position) {
		showTodayButton = visible;
		todayButtonPosition = position;
	}

	/**
	 * @param {string} value
	 */
	function handleSearchChange(value) {
		searchTerm = value;
	}

	/** Reset every filter (and search) back to defaults. */
	function handleResetAll() {
		statuses = [...DEFAULT_STATUSES];
		loadStatuses = [...DEFAULT_LOAD_STATUSES];
		selectedTechs = [...FUEL_TECH_VALUES];
		showLoads = false;
		regions = [...ALL_REGIONS];
		capacityRange = [capacityBounds.min, capacityBounds.max];
		yearRange = [yearBounds.min, yearBounds.max];
		capacityTouched = false;
		yearTouched = false;
		searchTerm = '';
		navigateWithRefetch({
			statuses,
			regions,
			fuelTechs: selectedTechs,
			capacityRange,
			yearRange,
			view: selectedView,
			facility: selectedFacility?.code ?? null
		});
	}

	/**
	 * Handle facility selection - toggles selection if already selected
	 * @param {any} facility
	 */
	function handleFacilitySelect(facility) {
		if (facility) {
			// Mobile skips the detail preview sheet — selecting a facility goes
			// straight to its page (same destination as the sheet's View facility
			// button). The sheet still renders for URL-driven selection, e.g. a
			// shared /facilities?facility=… link opened on a phone. Loads have no
			// /facility/[code] page, so they fall through to the sheet selection.
			if (!isDesktop && !facility.isLoad) {
				goto(windowedHref(`/facility/${facility.code}`, !isFullscreen));
				return;
			}
			if (selectedFacility?.code === facility.code) {
				// Toggle off - clear selection and close popups
				closeFacilityDetail();
			} else {
				// Optimistic override for an instant open (replaceState only mirrors
				// the URL; it doesn't reactively update page.url), then sync the URL.
				// No server round-trip — the preview renders from the facility object
				// we hold plus the streamed profile.
				optimisticCode = facility.code;
				navigateWithoutRefetch({
					statuses,
					regions,
					fuelTechs: selectedTechs,
					capacityRange,
					yearRange,
					view: selectedView,
					facility: facility.code
				});
			}
		}
	}

	/**
	 * Handle a data centre marker click from the map layer — resolve the
	 * pseudo-facility by the feature's id (same `dc-*` code scheme) and run it
	 * through the normal selection flow.
	 * @param {any} properties
	 */
	function handleDataCentreSelect(properties) {
		const code = properties?.id;
		if (!code) return;
		const load = lookupFacilities?.find((f) => f.code === code);
		if (load) handleFacilitySelect(load);
	}

	/**
	 * Close facility detail panel
	 */
	function closeFacilityDetail() {
		// Optimistic deselect (null override) so the panel closes immediately;
		// the URL sync below drops the facility param for back/forward consistency.
		optimisticCode = null;
		mapRef?.closePopups();
		navigateWithoutRefetch({
			statuses,
			regions,
			fuelTechs: selectedTechs,
			capacityRange,
			yearRange,
			view: selectedView,
			facility: null
		});
	}
</script>

<svelte:window onkeydown={handleKeydown} bind:innerWidth={windowWidth} />

<Meta
	title="Facilities"
	description="Power generation facilities in Australia."
	image="/img/facilities-preview.jpg"
/>

{#snippet facilityActionBar(/** @type {boolean} */ darkText)}
	<!-- Sits on the header colour wash; the close button aligns with the header
	     content's padding and adapts to the wash's light/dark scheme for contrast. -->
	<div class="flex items-center justify-end pt-8 pr-8">
		<button
			onclick={closeFacilityDetail}
			class="shrink-0 p-1.5 rounded-full transition-colors cursor-pointer {darkText
				? 'bg-black/10 text-black/60 hover:bg-black/20 hover:text-black'
				: 'bg-white/15 text-white/80 hover:bg-white/25 hover:text-white'}"
			aria-label="Close panel"
		>
			<X size={16} />
		</button>
	</div>
{/snippet}

{#snippet summaryBar()}
	<!-- Horizontally scrollable so the stats never stick out of a narrow list pane:
	     the inner row is `min-w-full` (spreads with justify-between when it fits) and
	     `w-max` (grows to its content and scrolls when it doesn't). -->
	<div class="z-20 bg-white border-t border-mid-warm-grey overflow-x-auto">
		<div class="flex w-max min-w-full items-center justify-between gap-4 px-4 py-3 text-xs">
			<div class="flex items-center gap-4 font-space shrink-0">
				<div class="flex items-center gap-1.5">
					<span class="text-mid-grey">{totalFacilitiesCount.toLocaleString()}</span>
					<span class="text-mid-grey">facilities</span>
				</div>
				<div class="flex items-center gap-1.5">
					<span class="text-mid-grey">{totalUnitsCount.toLocaleString()}</span>
					<span class="text-mid-grey">units</span>
				</div>
				{#if mapShowGolfCourses}
					<div class="flex items-center gap-1.5 pl-2 border-l border-warm-grey">
						<Flag class="size-5" style="color: #16a34a;" />
						<span class="text-green-600 font-medium">1,573</span>
						<span class="text-mid-grey">golf courses</span>
					</div>
				{/if}
			</div>
			<div class="flex items-center gap-5 shrink-0">
				<StatusCapacityBadge
					capacity={capacityByStatus.operating}
					colour={statusColours.operating}
					label="Operating"
				/>
				<StatusCapacityBadge
					capacity={capacityByStatus.commissioning}
					colour={statusColours.commissioning}
					label="Commissioning"
				/>
				<StatusCapacityBadge
					capacity={capacityByStatus.committed}
					colour={statusColours.committed}
					label="Committed"
				/>
				<StatusCapacityBadge
					capacity={capacityByStatus.retired}
					colour={statusColours.retired}
					label="Retired"
				/>
				<div class="flex items-center gap-1.5 pl-5 border-l border-warm-grey">
					<Zap size={14} class="text-mid-grey" />
					<span class="font-mono font-medium text-dark-grey">{formatValue(totalCapacityMW)}</span>
					<span class="text-mid-grey">MW</span>
				</div>
			</div>
		</div>
	</div>
{/snippet}

<FullscreenLayout {isFullscreen}>
	{#snippet filterBar()}
		<!-- The bar itself is desktop-only (Filters renders a floating nav over
		     the map on mobile), so the border is too — otherwise an empty strip
		     would sit above the full-bleed map. -->
		<!-- During play mode the bar is dimmed and inert: the map shows the full
		     unfiltered dataset, so filter interactions would have no visible
		     effect. `inert` blocks pointer, keyboard and focus in one go. -->
		<div
			class="relative z-40 shrink-0 tablet:border-b tablet:border-warm-grey transition-opacity duration-300 {playModeActive
				? 'opacity-40'
				: ''} {isFullscreen ? '' : 'px-4'}"
			inert={playModeActive}
		>
			<Filters
				{searchTerm}
				{selectedView}
				{isFullscreen}
				{loadsFeature}
				facilitySelected={!!selectedFacility}
				darkMap={mapTheme !== 'light'}
				showShortcuts={showShortcutsToast}
				selectedStatuses={statuses}
				selectedLoadStatuses={loadStatuses}
				{selectedTypes}
				selectedRegions={regions}
				{capacityRange}
				capacityMin={capacityBounds.min}
				capacityMax={capacityBounds.max}
				{yearRange}
				yearMin={yearBounds.min}
				yearMax={yearBounds.max}
				onsearchchange={handleSearchChange}
				onstatuseschange={handleStatusesChange}
				onloadstatuseschange={handleLoadStatusesChange}
				ontypeschange={handleTypesChange}
				onregionschange={handleRegionsChange}
				oncapacityrangechange={handleCapacityRangeChange}
				onyearrangechange={handleYearRangeChange}
				onviewchange={handleSelectedViewChange}
				onfullscreenchange={toggleFullscreen}
				ondownloadcsv={handleDownloadCsv}
				onshowshortcuts={() => (showShortcutsToast = !showShortcutsToast)}
				onshortcutinvoked={() => (showShortcutsToast = false)}
			/>
		</div>
	{/snippet}

	{#snippet content()}
		<FullscreenContainer {isFullscreen} class="[view-transition-name:page-body]">
			<div
				bind:clientHeight={containerHeight}
				class="flex-1 flex flex-col tablet:flex-row min-h-0 relative"
			>
				<!-- Left panel: List, Timeline or Grid (desktop only — mobile shows
				     these views inside the bottom sheet instead). Width is driven by
				     a CSS variable + `tablet:` class rather than a JS-gated inline style,
				     so the desktop list/map split is reserved from the first paint
				     (no full-width flash before hydration). -->
				<div
					class="relative bg-white hidden tablet:flex flex-col min-h-0 z-10 tablet:w-[var(--list-w)] tablet:shrink-0 {mainDrag.isDragging
						? ''
						: 'tablet:transition-[width] tablet:duration-300 tablet:ease-out'}"
					style="--list-w: {listPaneWidth}px"
				>
					{#if viewLoading || (displayFacilities.length === 0 && loadsPending)}
						<div class="flex-1 flex items-center justify-center">
							<LogoMarkLoader />
						</div>
					{:else if displayFacilities.length === 0 && !playModeActive}
						<!-- Under "ticked = shown" semantics an empty selection is a
						     legitimate dead end — make it legible and easy to leave. -->
						<div class="flex-1 flex flex-col items-center justify-center gap-4 px-8 text-center">
							<p class="m-0 text-sm text-mid-grey">
								No facilities or loads match the current filters.
							</p>
							<button
								onclick={handleResetAll}
								class="rounded-lg border-2 border-warm-grey bg-white px-4 py-2 text-sm font-medium text-dark-grey hover:bg-light-warm-grey transition-colors cursor-pointer"
							>
								Reset all filters
							</button>
						</div>
					{:else if selectedView === 'grid'}
						<div class="flex-1 overflow-y-auto min-h-0">
							<Grid
								facilities={displayFacilities}
								selectedFacilityCode={selectedFacility?.code ?? null}
								{facilityPhotos}
								onhover={(/** @type {any} */ f) => (hoveredFacility = f)}
								onclick={(/** @type {any} */ f) => {
									handleFacilitySelect(f);
								}}
							/>
						</div>
					{:else if selectedView === 'list'}
						<div class="flex-1 overflow-y-auto min-h-0 mt-4">
							<List
								facilities={displayFacilities}
								{hoveredFacility}
								{clickedFacility}
								selectedFacilityCode={selectedFacility?.code ?? null}
								compact={listCompact}
								sortBy={listSortBy}
								sortOrder={listSortOrder}
								{isFullscreen}
								onhover={(/** @type {any} */ f) => (hoveredFacility = f)}
								onclick={(/** @type {any} */ f) => {
									handleFacilitySelect(f);
								}}
								onsortchange={(by, order) => {
									listSortBy = by;
									listSortOrder = order;
								}}
							/>
						</div>
					{:else if selectedView === 'timeline'}
						{#if showTodayButton && searchTerm.length === 0}
							<div
								class="absolute z-20 w-full flex justify-center pointer-events-none"
								class:top-4={todayButtonPosition === 'top'}
								class:bottom-28={todayButtonPosition === 'bottom'}
								transition:fly={{ y: -10, duration: 300 }}
							>
								<button
									class="flex items-center gap-2 bg-chart-1 cursor-pointer text-white rounded-full text-xxs px-4 py-2 font-space shadow-sm hover:bg-chart-1/80 transition-all duration-300 pointer-events-auto"
									onclick={() => timelineRef?.jumpToToday()}
								>
									{#if todayButtonPosition === 'bottom'}
										<span class="text-xxs">↓</span>
									{:else}
										<span class="text-xxs">↑</span>
									{/if}
									Jump to today
								</button>
							</div>
						{/if}
						<div class="flex-1 overflow-y-auto min-h-0" bind:this={timelineScrollContainer}>
							<div class="p-6">
								<Timeline
									bind:this={timelineRef}
									facilities={displayWithLocation}
									{hoveredFacility}
									{clickedFacility}
									selectedFacilityCode={selectedFacility?.code ?? null}
									{isFullscreen}
									ontodaybuttonvisible={handleTodayButtonVisible}
									scrollContainer={timelineScrollContainer}
									scrollToToday={!hasInitiallyScrolledToToday}
									onscrolledtotoday={() => (hasInitiallyScrolledToToday = true)}
									onhover={(/** @type {any} */ f) => (hoveredFacility = f)}
									onclick={(/** @type {any} */ f) => {
										handleFacilitySelect(f);
									}}
									onorderchange={(/** @type {string[]} */ codes) => (timelineOrderedCodes = codes)}
								/>
							</div>
						</div>
					{/if}
					{@render summaryBar()}
				</div>

				<!-- Resizable divider (desktop only; hidden via CSS rather than
				     {#if} so its width is reserved from the first paint). -->
				<DragHandle
					axis="x"
					onstart={mainDrag.start}
					active={mainDrag.isDragging}
					class="hidden tablet:flex"
				/>

				<!-- Right panel: Map (always visible — full-bleed on mobile, right
				     column on desktop; flex-1 fills height on mobile [flex-col] and
				     width on desktop [flex-row], so the h-full map container always
				     has a real size to render into). -->
				<div class="relative flex-1 min-h-0 tablet:min-w-0">
					<!-- Map container -->
					<div class="relative h-full overflow-hidden">
						{#if !mapLoaded}
							<div
								class="absolute inset-0 z-10 bg-[#D5D8DC]/50 flex items-center justify-center tablet:rounded-lg"
							>
								<LogoMarkLoader />
							</div>
						{/if}
						{#await import('./Map.svelte') then { default: Map }}
							<Map
								bind:this={mapRef}
								facilities={mapFacilities}
								boundsFacilities={displayWithLocation}
								{hoveredFacility}
								selectedFacilityCode={selectedFacility && !selectedFacility.isLoad
									? selectedFacility.code
									: null}
								selectedDataCentreId={selectedFacility?.isLoad ? selectedFacility.code : null}
								ondatacentreselect={handleDataCentreSelect}
								osmWayId={selectedProfile?.osm_way_id ?? null}
								{selectedView}
								cardCodes={cardCodeSet}
								clustering={mapClustering}
								{mapTheme}
								showTransmissionLines={mapShowTransmissionLines}
								{transmissionLineVisibility}
								showGolfCourses={mapShowGolfCourses}
								showDataCentres={showLoads}
								dataCentres={loadFacilities}
								{playYear}
								appearYears={playAppearYears}
								scrollZoom={!isYearPlaying}
								cooperativeGestures={!isFullscreen}
								flyToOffsetX={0}
								flyToOffsetY={facilityMarkerOffsetY}
								{metricValues}
								onhover={(f) => (hoveredFacility = f)}
								onclick={(f) => (clickedFacility = f)}
								onselect={handleFacilitySelect}
								onload={() => setTimeout(() => (mapLoaded = true), 250)}
							/>
						{/await}

						{#snippet mapOptionsDropdown(/** @type {boolean} */ iconOnly)}
							<MapOptionsDropdown
								{iconOnly}
								{mapTheme}
								showTransmissionLines={mapShowTransmissionLines}
								showGolfCourses={mapShowGolfCourses}
								showGolfOption={showGolf}
								showMagicIndicator={showGolf}
								clustering={mapClustering}
								onmapthemechange={(v) => {
									mapTheme = v;
									updateMapOptionsUrl();
								}}
								ontransmissionlineschange={(v) => {
									mapShowTransmissionLines = v;
									updateMapOptionsUrl();
								}}
								ongolfcourseschange={(v) => {
									mapShowGolfCourses = v;
									updateMapOptionsUrl();
								}}
								onclusteringchange={(v) => {
									mapClustering = v;
									updateMapOptionsUrl();
								}}
							/>
						{/snippet}

						<!-- Map controls (desktop) -->
						<div class="absolute top-3 right-20 z-20 hidden tablet:flex items-center gap-2">
							<button
								onclick={() => {
									mapRef?.resetView();
									if (selectedFacility) {
										closeFacilityDetail();
									}
								}}
								class="bg-white rounded-lg px-3 py-2 text-xs font-medium flex items-center gap-2 hover:bg-light-warm-grey transition-colors border-2 border-warm-grey"
								title="Reset map to show all facilities"
							>
								Reset Map
							</button>
							{@render mapOptionsDropdown(false)}
						</div>

						<!-- Map controls (mobile) — a floating stack below the nav bar:
						     layers + zoom in/out (the built-in NavigationControl is
						     hidden below the tablet breakpoint). -->
						<div
							class="tablet:hidden absolute top-20 right-3 z-20 flex flex-col items-center gap-2"
						>
							{@render mapOptionsDropdown(true)}
							<button
								onclick={() => mapRef?.zoomIn()}
								class="size-11 {mapFabClass}"
								aria-label="Zoom in"
							>
								<IconPlus class="size-5" />
							</button>
							<button
								onclick={() => mapRef?.zoomOut()}
								class="size-11 {mapFabClass}"
								aria-label="Zoom out"
							>
								<IconMinus class="size-5" />
							</button>
						</div>

						<!-- Back to the facilities list (mobile) — replaces the floating
						     nav while a facility is selected. -->
						{#if !isDesktop && selectedFacility}
							<button
								onclick={closeFacilityDetail}
								class="tablet:hidden absolute top-3 left-3 z-30 size-13 {mapFabClass}"
								aria-label="Back to facilities list"
							>
								<IconChevronLeft class="size-6" />
							</button>
						{/if}

						<!-- Year animation controls (desktop only) -->
						<YearAnimationOverlay
							active={playModeActive}
							bind:playYear
							bind:isPlaying={isYearPlaying}
							minYear={playYearBounds.min}
							maxYear={playYearBounds.max}
							loading={allFacilitiesLoading}
							error={allFacilitiesError}
							capacitySeries={playCapacitySeries}
							onopen={handlePlayOpen}
							onclose={handlePlayClose}
						/>

						{#if mapShowTransmissionLines}
							<TransmissionLinesLegend
								satelliteView={mapTheme !== 'light'}
								visibility={transmissionLineVisibility}
								onvisibilitychange={(v) => (transmissionLineVisibility = v)}
							/>
						{/if}

						{#if showLoads}
							<DataCentresLegend
								satelliteView={mapTheme !== 'light'}
								raised={mapShowTransmissionLines}
							/>
						{/if}

						<!-- Facility detail panel (desktop only) -->
						{#if isDesktop}
							<ResizablePanel
								open={!!selectedFacility}
								onclose={closeFacilityDetail}
								direction="top"
								defaultSize={FACILITY_PANEL_FRACTION * 100}
								minSize={250}
								dismissThreshold={160}
								containerSize={containerHeight}
								closedOffset="2rem"
								class="hidden tablet:flex absolute bottom-8 left-8 right-8 max-h-[calc(100%_-_4rem)] bg-white tablet:rounded-lg tablet:border tablet:border-mid-warm-grey shadow-lg z-20 {selectedFacility
									? '[view-transition-name:facility-hero]'
									: ''}"
								dragHandleStyle={`background-color: ${detailColour}`}
								gripClass={detailGripClass}
							>
								{#snippet header()}
									{#if detailFacility?.isLoad}
										<DataCentrePanelHeader facility={detailFacility}>
											{#snippet topBar(/** @type {boolean} */ darkText)}
												{#if selectedFacility}
													{@render facilityActionBar(darkText)}
												{/if}
											{/snippet}
										</DataCentrePanelHeader>
									{:else}
										<FacilityPanelHeader
											facility={detailFacility}
											sanityFacility={selectedProfile}
											card={detailCard}
											dominantColour={detailColour}
											darkText={detailDarkText}
										>
											{#snippet topBar(/** @type {boolean} */ darkText)}
												{#if selectedFacility}
													{@render facilityActionBar(darkText)}
												{/if}
											{/snippet}
										</FacilityPanelHeader>
									{/if}
								{/snippet}
								{#snippet footer()}
									{#if !detailFacility?.isLoad}
										<FacilityPanelFooter
											owners={selectedProfile?.owners ?? []}
											facilityCode={selectedFacility?.code ?? null}
											buttonColour={detailColour}
											darkText={detailDarkText}
											loading={profileLoading && !selectedProfile}
											{isFullscreen}
										/>
									{/if}
								{/snippet}
								{#if detailFacility?.isLoad}
									<DataCentreDetailPanel facility={detailFacility} fillHeight={isFullscreen} />
								{:else}
									<FacilityDetailPanel
										facility={detailFacility}
										profile={selectedProfile}
										{profileLoading}
										fillHeight={isFullscreen}
									/>
								{/if}
							</ResizablePanel>
						{/if}
					</div>
				</div>

				<!-- Facilities list (mobile only) — a persistent bottom sheet peeking
				     over the full-bleed map; slides away while a facility is selected
				     and the detail sheet takes its place. -->
				{#if !isDesktop}
					<MobileFacilitiesSheet
						open={!selectedFacility}
						{containerHeight}
						facilities={displayFacilities}
						facilitiesWithLocation={displayWithLocation}
						{facilityPhotos}
						{selectedView}
						{viewLoading}
						sortBy={listSortBy}
						sortOrder={listSortOrder}
						{totalFacilitiesCount}
						{totalUnitsCount}
						{totalCapacityMW}
						onviewchange={handleSelectedViewChange}
						onsortchange={(by, order) => {
							listSortBy = by;
							listSortOrder = order;
						}}
						onselect={handleFacilitySelect}
					/>
				{/if}

				<!-- Facility detail panel (mobile only) — a drag-resizable bottom sheet
				     that leaves the list/map behind it visible and interactive. -->
				{#if !isDesktop}
					<BottomSheet
						open={!!selectedFacility}
						onclose={closeFacilityDetail}
						{containerHeight}
						peekFraction={FACILITY_PANEL_FRACTION}
						gripStyle={`background-color: ${detailColour}`}
						gripClass={detailGripClass}
						class="tablet:hidden z-30 [view-transition-name:facility-hero]"
					>
						{#snippet header()}
							{#if selectedFacility && detailFacility?.isLoad}
								<DataCentrePanelHeader facility={detailFacility}>
									{#snippet topBar(/** @type {boolean} */ darkText)}
										{@render facilityActionBar(darkText)}
									{/snippet}
								</DataCentrePanelHeader>
							{:else if selectedFacility}
								<FacilityPanelHeader
									facility={detailFacility}
									sanityFacility={selectedProfile}
									card={detailCard}
									dominantColour={detailColour}
									darkText={detailDarkText}
									photoUrl={facilityPhotos[selectedFacility.code] ?? null}
								>
									{#snippet topBar(/** @type {boolean} */ darkText)}
										{@render facilityActionBar(darkText)}
									{/snippet}
								</FacilityPanelHeader>
							{/if}
						{/snippet}
						{#if selectedFacility && detailFacility?.isLoad}
							<DataCentreDetailPanel facility={detailFacility} />
						{:else if selectedFacility}
							<FacilityDetailPanel
								facility={detailFacility}
								profile={selectedProfile}
								{profileLoading}
							/>
						{/if}
						{#snippet footer()}
							{#if selectedFacility && !detailFacility?.isLoad}
								<FacilityPanelFooter
									owners={selectedProfile?.owners ?? []}
									facilityCode={selectedFacility?.code ?? null}
									buttonColour={detailColour}
									darkText={detailDarkText}
									loading={profileLoading && !selectedProfile}
									{isFullscreen}
								/>
							{/if}
						{/snippet}
					</BottomSheet>
				{/if}
			</div>

			{#snippet footer()}
				<!-- Desktop only — the mobile map is full-bleed to the bottom edge. -->
				<div class="hidden tablet:block">
					<FullscreenFooter {isFullscreen} onenterfullscreen={toggleFullscreen} />
				</div>
			{/snippet}
		</FullscreenContainer>
	{/snippet}
</FullscreenLayout>

<ShortcutsToast
	visible={showShortcutsToast}
	ondismiss={() => (showShortcutsToast = false)}
	shortcuts={[
		{ label: 'Search', keys: ['/'] },
		{ label: 'Previous / next facility', keys: ['↑', '↓'] },
		{ label: 'Toggle navigation menu', keys: ['G'] },
		...(belowTablet.current
			? []
			: [
					{ label: 'Enter / exit full screen', keys: ['F'] },
					{ label: 'Browser full screen', keys: ['Shift', 'F'] }
				]),
		{ label: 'Show shortcuts', keys: ['?'] }
	]}
/>
