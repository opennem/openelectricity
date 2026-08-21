<script>
	import { onMount, tick } from 'svelte';
	import { beforeNavigate, goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { LayoutGrid, Layers3, ListFilter, Plus, Settings2, X } from '@lucide/svelte';
	import { MediaQuery } from 'svelte/reactivity';
	import { ChartRangeBar, formatDateRange } from '$lib/components/charts/v2';
	import SwitchTabs from '$lib/components/SwitchTabs.svelte';
	import NetworkChart from '$lib/components/charts/network/NetworkChart.svelte';
	import { createChartRangeControl } from '$lib/components/charts/facility/chart-range-control.svelte.js';
	import { ianaFromOffset, toNetworkDateString } from '$lib/components/charts/v2/network-time.js';
	import { regionToNetwork } from '$lib/components/charts/network/region-to-network.js';
	import { MIN_DATE } from '$lib/utils/date-range.js';
	import { Sheet } from '$lib/components/ui/sheet';
	import RegionDropdown from '../RegionDropdown.svelte';
	import { TRACKER_REGION_OPTIONS } from '../tracker-regions.js';
	import ExploreBuilder from './ExploreBuilder.svelte';
	import ExploreCardsPanel from './ExploreCardsPanel.svelte';
	import ExploreChartCard from './ExploreChartCard.svelte';
	import ExploreConfirmModal from './ExploreConfirmModal.svelte';
	import ExploreCreatePanel from './ExploreCreatePanel.svelte';
	import ExploreLayoutPanel from './ExploreLayoutPanel.svelte';
	import ExploreSavePanel from './ExploreSavePanel.svelte';
	import ExploreTechnologyPanel from './ExploreTechnologyPanel.svelte';
	import {
		EXPLORE_RECIPES,
		MAX_EXPLORE_CHARTS,
		createExploreChart,
		defaultExploreConfig,
		exploreRecipeSupportsScope,
		validateExploreConfig
	} from './explore-model.js';
	import {
		DEFAULT_TRACKER_VIEW_DESCRIPTION,
		DEFAULT_TRACKER_VIEW_ID,
		DEFAULT_TRACKER_VIEW_NAME,
		createDefaultTrackerControls,
		createDefaultTrackerCharts,
		createDefaultTrackerViewSnapshot,
		createTrackerViewSnapshot,
		defaultTrackerItemLayout,
		materialiseTrackerViewSnapshot,
		moveTrackerChart,
		parseTrackerViewJSON,
		updateTrackerChartLayout
	} from './tracker-view-model.js';
	import {
		deleteLocalTrackerView,
		listLocalTrackerViews,
		loadLocalTrackerView,
		saveLocalTrackerView
	} from './tracker-view-storage.js';

	/** @type {{ facilities:any[], oncontrolschange?:(patch:Record<string,any>)=>void }} */
	let { facilities, oncontrolschange } = $props();

	/** @type {Array<any>} */
	let charts = $state(createDefaultTrackerCharts());
	let viewName = $state(DEFAULT_TRACKER_VIEW_NAME);
	let viewDescription = $state(DEFAULT_TRACKER_VIEW_DESCRIPTION);
	/** @type {1|2|3} */
	let columns = $state(1);
	let controls = $state(/** @type {any} */ (createDefaultTrackerControls()));
	let activeViewId = $state(DEFAULT_TRACKER_VIEW_ID);
	/** @type {any[]} */
	let localViews = $state([]);
	let lastSavedSnapshotJSON = $state('');
	let statusMessage = $state('');
	let jsonText = $state('');
	/** @type {string[]} */
	let importErrors = $state([]);
	let drawerTab = $state(/** @type {'cards'|'layout'|'view'} */ ('cards'));
	let drawerMode = $state(/** @type {'tabs'|'create'|'editor'} */ ('tabs'));
	let drawerOpen = $state(false);
	let technologyOpen = $state(false);

	let recipeId = $state('');
	/** @type {'chart'|'metric'} */
	let presentation = $state('chart');
	/** @type {any} */
	let draftConfig = $state(null);
	let editingId = $state('');
	/** @type {string[]} */
	let errors = $state([]);
	const compactBuilder = new MediaQuery('(max-width: 1023px)');
	const mobileCanvas = new MediaQuery('(max-width: 767px)');

	let draggedChartId = $state('');
	/** @type {'unsaved'|'delete'|''} */
	let confirmMode = $state('');
	/** @type {any} */
	let pendingAction = $state(null);
	let pendingDeleteId = $state('');
	/** @type {HTMLElement|null} */
	let drawerTrigger = null;
	const DAY_MS = 86_400_000;
	const initialAnchorEnd = Date.now();
	const initialAnchorStart = initialAnchorEnd - 7 * DAY_MS;
	let viewStart = $state(0);
	let viewEnd = $state(0);
	/** @type {Record<string, any>} */
	let chartRefs = $state({});
	/** @type {Record<string, any>} */
	let generationDatasets = $state.raw({});
	/** @type {any} */
	let technologyProvider = $state(null);

	let sharedMode = $derived(controls.mode === 'shared');
	let sharedNetwork = $derived(regionToNetwork(controls.shared.scope));
	let sharedTimeZone = $derived(sharedNetwork.timeZone);
	let sharedIanaTimeZone = $derived(ianaFromOffset(sharedTimeZone));

	const range = createChartRangeControl({
		viewport: () => ({ start: viewStart, end: viewEnd }),
		defaultViewport: () => ({ start: initialAnchorStart, end: initialAnchorEnd }),
		setViewport: (start, end) => {
			viewStart = start;
			viewEnd = end;
		},
		charts: () => [...Object.values(chartRefs), technologyProvider],
		timeZone: () => sharedTimeZone,
		initialRangeDays: 7
	});

	let boundedViewStart = $derived(viewStart || initialAnchorStart);
	let boundedViewEnd = $derived(viewEnd || initialAnchorEnd);
	let sharedRangeLabel = $derived(
		formatDateRange(new Date(boundedViewStart), new Date(boundedViewEnd), sharedIanaTimeZone, {
			yearIfNotCurrent: true
		})
	);
	let sharedRuntimeControls = $derived(
		sharedMode
			? {
					scope: controls.shared.scope,
					group: controls.shared.group,
					hiddenFuelTechGroups: controls.shared.hiddenFuelTechGroups,
					startMs: boundedViewStart,
					endMs: boundedViewEnd,
					interval: range.activeInterval,
					metric: range.activeMetric,
					displayInterval: range.displayInterval,
					rangeLabel: sharedRangeLabel
				}
			: null
	);
	let technologyDataset = $derived.by(() => {
		for (const chart of charts) {
			if (chart.recipeId === 'generation' && generationDatasets[chart.instanceId]) {
				return generationDatasets[chart.instanceId];
			}
		}
		return generationDatasets.__provider ?? null;
	});
	let technologyVisibleCount = $derived(
		Math.max(
			0,
			(technologyDataset?.seriesNames?.length ?? 0) - controls.shared.hiddenFuelTechGroups.length
		)
	);
	let sharedRegionOptions = $derived(
		TRACKER_REGION_OPTIONS.filter((option) =>
			charts.every(
				(chart) =>
					chart.recipeId.startsWith('facility') ||
					exploreRecipeSupportsScope(chart.recipeId, chart.config, option.value)
			)
		)
	);

	let editing = $derived(Boolean(editingId));
	let currentSnapshot = $derived(
		createTrackerViewSnapshot({
			name: viewName,
			description: viewDescription,
			columns,
			controls,
			charts
		})
	);
	let currentSnapshotJSON = $derived(JSON.stringify(currentSnapshot));
	let isDirty = $derived(
		lastSavedSnapshotJSON !== '' && currentSnapshotJSON !== lastSavedSnapshotJSON
	);
	let isBuiltInView = $derived(activeViewId === DEFAULT_TRACKER_VIEW_ID);
	let drawerTitle = $derived(
		drawerMode === 'create'
			? 'Create view'
			: drawerMode === 'editor'
				? editing
					? 'Configure card'
					: 'Add data'
				: drawerTab === 'cards'
					? 'Cards'
					: drawerTab === 'layout'
						? 'Layout'
						: 'Views'
	);
	let layoutMode = $derived(
		drawerOpen && drawerMode === 'tabs' && drawerTab === 'layout' && !isBuiltInView
	);

	/** @param {any} value */
	function clone(value) {
		return value == null ? value : JSON.parse(JSON.stringify(value));
	}

	function refreshLocalViews() {
		localViews = [
			{
				id: DEFAULT_TRACKER_VIEW_ID,
				name: DEFAULT_TRACKER_VIEW_NAME,
				builtIn: true,
				createdAt: '',
				updatedAt: ''
			},
			...listLocalTrackerViews()
		];
	}

	/** @param {'cards'|'layout'|'view'} tab */
	function openDrawer(tab) {
		technologyOpen = false;
		drawerTrigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
		drawerMode = 'tabs';
		drawerTab = tab;
		drawerOpen = true;
	}

	function openCreate() {
		technologyOpen = false;
		drawerTrigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
		drawerMode = 'create';
		drawerOpen = true;
	}

	function closeDrawer() {
		drawerOpen = false;
		cancelEditing(false);
		requestAnimationFrame(() => drawerTrigger?.focus());
	}

	function openTechnologies() {
		closeDrawer();
		technologyOpen = true;
	}

	/** @param {'shared'|'individual'} mode */
	function setControlMode(mode) {
		if (controls.mode === mode) return;
		controls = { ...controls, mode };
		if (mode === 'shared') void applySharedRangeSnapshot(controls.shared.range);
	}

	/** @param {string} scope */
	function setSharedScope(scope) {
		if (!sharedRegionOptions.some((option) => option.value === scope)) return;
		controls = {
			...controls,
			shared: { ...controls.shared, scope, hiddenFuelTechGroups: [] }
		};
		generationDatasets = {};
	}

	/** @param {string} group */
	function setSharedGroup(group) {
		controls = {
			...controls,
			shared: { ...controls.shared, group, hiddenFuelTechGroups: [] }
		};
		generationDatasets = {};
	}

	/** @param {string} series */
	function toggleSharedSeries(series) {
		/** @type {string[]} */
		const current = controls.shared.hiddenFuelTechGroups;
		controls = {
			...controls,
			shared: {
				...controls.shared,
				hiddenFuelTechGroups: current.includes(series)
					? current.filter((item) => item !== series)
					: [...current, series]
			}
		};
	}

	function showAllSharedSeries() {
		controls = {
			...controls,
			shared: { ...controls.shared, hiddenFuelTechGroups: [] }
		};
	}

	/** @param {any} snapshot */
	async function applySharedRangeSnapshot(snapshot) {
		if (snapshot?.kind === 'custom') {
			range.handleDateRangeChange({ start: snapshot.start, end: snapshot.end });
		} else {
			range.handleRangeSelect(snapshot?.days ?? 7);
		}
		if (snapshot?.intervalId && snapshot.intervalId !== range.displayInterval) {
			range.handleIntervalChange(snapshot.intervalId);
		}
		await tick();
	}

	/** @param {string} id @param {any} payload */
	function setGenerationDataset(id, payload) {
		generationDatasets = { ...generationDatasets, [id]: payload };
	}

	/** @param {{start:number,end:number}} next @param {any} source */
	function handleSharedViewportChange(next, source) {
		range.handleDerivedViewportChange(next, source);
	}

	/** @param {any} snapshot */
	function markSaved(snapshot = currentSnapshot) {
		lastSavedSnapshotJSON = JSON.stringify(snapshot);
		jsonText = JSON.stringify(snapshot, null, 2);
	}

	/** @param {string} nextRecipeId */
	function chooseRecipe(nextRecipeId) {
		recipeId = nextRecipeId;
		if (!nextRecipeId) {
			draftConfig = null;
		} else {
			const next = defaultExploreConfig(nextRecipeId, presentation);
			draftConfig = sharedMode
				? {
						...next,
						scope: controls.shared.scope,
						group: controls.shared.group,
						...(controls.shared.range.kind === 'preset'
							? {
									range: {
										days: controls.shared.range.days,
										intervalId: controls.shared.range.intervalId
									}
								}
							: {})
					}
				: next;
		}
		errors = [];
	}

	/** @param {'chart'|'metric'} nextPresentation */
	function choosePresentation(nextPresentation) {
		presentation = nextPresentation;
		const recipe = recipeId ? EXPLORE_RECIPES.find((item) => item.id === recipeId) : null;
		if (nextPresentation === 'metric' && recipe && !recipe.supportsMetric) {
			recipeId = '';
			draftConfig = null;
		} else if (draftConfig) {
			draftConfig = {
				...draftConfig,
				presentation: nextPresentation,
				...(nextPresentation === 'metric' &&
				recipeId === 'renewables' &&
				draftConfig.renewableMeasure === 'share'
					? { includeStorage: false }
					: {})
			};
		}
		errors = [];
	}

	function startNewChart() {
		technologyOpen = false;
		presentation = 'chart';
		recipeId = '';
		draftConfig = null;
		editingId = '';
		errors = [];
		drawerMode = 'editor';
		drawerOpen = true;
	}

	/** @param {any} chart */
	function editChart(chart) {
		technologyOpen = false;
		presentation = chart.config.presentation ?? 'chart';
		recipeId = chart.recipeId;
		draftConfig = clone(chart.config);
		editingId = chart.instanceId;
		errors = [];
		drawerMode = 'editor';
		drawerOpen = true;
	}

	/** @param {boolean} [close] */
	function cancelEditing(close = true) {
		recipeId = '';
		draftConfig = null;
		editingId = '';
		errors = [];
		if (close) closeDrawer();
	}

	function submitChart() {
		const result = validateExploreConfig(recipeId, draftConfig, facilities);
		if (!result.config || result.errors.length) {
			errors = result.errors;
			return;
		}
		if (editingId) {
			charts = charts.map((chart) =>
				chart.instanceId === editingId
					? { ...chart, recipeId, config: result.config, unavailableErrors: [] }
					: chart
			);
		} else {
			if (charts.length >= MAX_EXPLORE_CHARTS) {
				errors = [`A canvas can contain up to ${MAX_EXPLORE_CHARTS} charts.`];
				return;
			}
			const chart = createExploreChart(crypto.randomUUID(), recipeId, result.config, facilities);
			if (!chart) {
				errors = ['This chart configuration is not valid.'];
				return;
			}
			charts = [
				...charts,
				{
					...chart,
					layout: defaultTrackerItemLayout(recipeId, result.config.presentation),
					unavailableErrors: []
				}
			];
		}
		recipeId = '';
		draftConfig = null;
		editingId = '';
		errors = [];
		closeDrawer();
	}

	/** @param {string} instanceId */
	function removeChart(instanceId) {
		charts = charts.filter((chart) => chart.instanceId !== instanceId);
		if (editingId === instanceId) cancelEditing();
	}

	/** @param {string} id @param {-1|1} direction */
	function moveChart(id, direction) {
		charts = moveTrackerChart(charts, id, direction);
	}

	/** @param {string} sourceId @param {string} targetId */
	function reorderCharts(sourceId, targetId) {
		if (!sourceId || sourceId === targetId) return;
		const next = [...charts];
		const source = next.findIndex((chart) => chart.instanceId === sourceId);
		const target = next.findIndex((chart) => chart.instanceId === targetId);
		if (source < 0 || target < 0) return;
		const [moved] = next.splice(source, 1);
		next.splice(target, 0, moved);
		charts = next;
	}

	/** @param {string} id @param {{columnSpan?:number,heightPx?:number}} patch */
	function updateLayout(id, patch) {
		charts = updateTrackerChartLayout(charts, id, patch);
	}

	/** @param {PointerEvent} event @param {any} chart */
	function startHeightResize(event, chart) {
		if (mobileCanvas.current || !drawerOpen || drawerTab !== 'layout') return;
		event.preventDefault();
		const startY = event.clientY;
		const startHeight = chart.layout?.heightPx ?? 420;
		function move(/** @type {PointerEvent} */ moveEvent) {
			updateLayout(chart.instanceId, { heightPx: startHeight + moveEvent.clientY - startY });
		}
		function finish() {
			window.removeEventListener('pointermove', move);
			window.removeEventListener('pointerup', finish);
			window.removeEventListener('pointercancel', finish);
		}
		window.addEventListener('pointermove', move);
		window.addEventListener('pointerup', finish);
		window.addEventListener('pointercancel', finish);
	}

	function snapshotForSave() {
		return createTrackerViewSnapshot({
			name: viewName,
			description: viewDescription,
			columns,
			controls,
			charts
		});
	}

	/** @param {boolean} [asCopy] */
	function saveView(asCopy = false) {
		if (isBuiltInView) {
			duplicateSavedView(DEFAULT_TRACKER_VIEW_ID);
			return true;
		}
		if (!viewName.trim()) {
			statusMessage = 'Error: Add a view name before saving.';
			return false;
		}
		if (asCopy) viewName = `${viewName.replace(/ copy$/, '')} copy`.slice(0, 80);
		const snapshot = snapshotForSave();
		const result = saveLocalTrackerView(snapshot, asCopy ? undefined : activeViewId || undefined);
		if (!result.ok) {
			statusMessage = `Error: ${result.error}`;
			return false;
		}
		if (!result.record) return false;
		activeViewId = result.record.id;
		refreshLocalViews();
		markSaved(snapshot);
		statusMessage = asCopy ? 'Saved as a new view.' : 'Saved.';
		return true;
	}

	function applyNewView() {
		charts = [];
		viewName = 'Untitled view';
		viewDescription = '';
		columns = 1;
		controls = createDefaultTrackerControls();
		if (controls.mode === 'shared') void applySharedRangeSnapshot(controls.shared.range);
		activeViewId = '';
		cancelEditing();
		lastSavedSnapshotJSON = '__new-unsaved__';
		jsonText = JSON.stringify(snapshotForSave(), null, 2);
		statusMessage = '';
		importErrors = [];
	}

	/** @param {string} id */
	function applyLocalView(id) {
		if (id === DEFAULT_TRACKER_VIEW_ID) {
			const snapshot = createDefaultTrackerViewSnapshot();
			charts = createDefaultTrackerCharts();
			viewName = snapshot.name;
			viewDescription = snapshot.description;
			columns = 1;
			controls = clone(snapshot.controls);
			if (controls.mode === 'shared') void applySharedRangeSnapshot(controls.shared.range);
			activeViewId = DEFAULT_TRACKER_VIEW_ID;
			cancelEditing();
			markSaved(snapshot);
			statusMessage = 'Overview loaded.';
			return;
		}
		const record = loadLocalTrackerView(id);
		if (!record) {
			statusMessage = 'Error: That saved view could not be loaded.';
			refreshLocalViews();
			return;
		}
		const result = materialiseTrackerViewSnapshot(record.snapshot, facilities);
		if (!result.snapshot) {
			statusMessage = `Error: ${result.errors.join(' ')}`;
			return;
		}
		charts = result.charts;
		viewName = result.snapshot.name;
		viewDescription = result.snapshot.description;
		columns = result.snapshot.layout.columns;
		controls = clone(result.snapshot.controls);
		if (controls.mode === 'shared') void applySharedRangeSnapshot(controls.shared.range);
		activeViewId = id;
		cancelEditing();
		markSaved(result.snapshot);
		statusMessage = 'View loaded.';
	}

	/** @param {any} result */
	function applyImportedView(result) {
		charts = result.charts;
		viewName = result.snapshot.name;
		viewDescription = result.snapshot.description;
		columns = result.snapshot.layout.columns;
		controls = clone(result.snapshot.controls);
		if (controls.mode === 'shared') void applySharedRangeSnapshot(controls.shared.range);
		activeViewId = '';
		cancelEditing();
		lastSavedSnapshotJSON = '__imported-unsaved__';
		jsonText = JSON.stringify(result.snapshot, null, 2);
		statusMessage = 'Imported as a new unsaved view.';
		importErrors = [];
	}

	/** @param {any} action */
	function requestAction(action) {
		if (isDirty) {
			pendingAction = action;
			confirmMode = 'unsaved';
			return;
		}
		executeAction(action);
	}

	/** @param {any} action */
	function executeAction(action) {
		if (action?.type === 'new') applyNewView();
		else if (action?.type === 'blank') {
			applyNewView();
			startNewChart();
		} else if (action?.type === 'duplicate') duplicateSavedView(action.id);
		else if (action?.type === 'load') applyLocalView(action.id);
		else if (action?.type === 'import') applyImportedView(action.result);
		else if (action?.type === 'navigate') {
			lastSavedSnapshotJSON = currentSnapshotJSON;
			goto(resolve(action.url));
		}
		pendingAction = null;
		confirmMode = '';
	}

	function saveThenContinue() {
		if (saveView()) executeAction(pendingAction);
	}

	function discardThenContinue() {
		executeAction(pendingAction);
	}

	/** @param {string} id */
	function duplicateSavedView(id) {
		const sourceSnapshot =
			id === DEFAULT_TRACKER_VIEW_ID
				? activeViewId === DEFAULT_TRACKER_VIEW_ID
					? snapshotForSave()
					: createDefaultTrackerViewSnapshot()
				: loadLocalTrackerView(id)?.snapshot;
		if (!sourceSnapshot) return;
		const result = materialiseTrackerViewSnapshot(sourceSnapshot, facilities);
		if (!result.snapshot) return;
		const copy = {
			...result.snapshot,
			name: `${result.snapshot.name.replace(/ copy$/, '')} copy`.slice(0, 80)
		};
		const saved = saveLocalTrackerView(copy);
		refreshLocalViews();
		if (saved.ok && saved.record) {
			applyLocalView(saved.record.id);
			statusMessage = 'View duplicated. You can now edit this copy.';
			drawerMode = 'tabs';
			drawerTab = 'cards';
			drawerOpen = true;
		} else {
			statusMessage = `Error: ${saved.error}`;
		}
	}

	/** @param {string} id */
	function requestDelete(id) {
		if (id === DEFAULT_TRACKER_VIEW_ID) return;
		pendingDeleteId = id;
		confirmMode = 'delete';
	}

	function confirmDelete() {
		if (deleteLocalTrackerView(pendingDeleteId)) {
			if (pendingDeleteId === activeViewId) {
				activeViewId = '';
				lastSavedSnapshotJSON = '__deleted-unsaved__';
			}
			statusMessage = 'Saved view deleted.';
		}
		pendingDeleteId = '';
		confirmMode = '';
		refreshLocalViews();
	}

	async function copyJSON() {
		const text = JSON.stringify(snapshotForSave(), null, 2);
		jsonText = text;
		try {
			await navigator.clipboard.writeText(text);
			statusMessage = 'JSON copied.';
		} catch {
			statusMessage = 'Select and copy the JSON below.';
		}
	}

	function importJSON() {
		const result = parseTrackerViewJSON(jsonText, facilities);
		if (!result.snapshot) {
			importErrors = result.errors;
			return;
		}
		requestAction({ type: 'import', result });
	}

	/** @param {'cards'|'layout'|'view'} tab */
	function selectDrawerTab(tab) {
		drawerMode = 'tabs';
		drawerTab = tab;
		if (tab === 'view') {
			jsonText = JSON.stringify(snapshotForSave(), null, 2);
			importErrors = [];
		}
	}

	function startBlankView() {
		requestAction({ type: 'blank' });
	}

	/** @param {KeyboardEvent} event */
	function handleDrawerKeydown(event) {
		if (event.key === 'Escape' && drawerOpen && !confirmMode) {
			event.preventDefault();
			closeDrawer();
		}
	}

	function gridClass() {
		return {
			1: 'md:grid-cols-1 xl:grid-cols-1',
			2: 'md:grid-cols-2 xl:grid-cols-2',
			3: 'md:grid-cols-2 xl:grid-cols-3'
		}[columns];
	}

	/** @param {number} span */
	function spanClass(span) {
		const tablet = Math.min(span, 2);
		const desktop = Math.min(span, columns);
		const tabletClass = tablet === 2 ? 'md:col-span-2' : 'md:col-span-1';
		const desktopClass =
			desktop === 3 ? 'xl:col-span-3' : desktop === 2 ? 'xl:col-span-2' : 'xl:col-span-1';
		return `${tabletClass} ${desktopClass}`;
	}

	$effect(() => {
		if (!sharedMode || !viewStart || !viewEnd) return;
		/** @type {any} */
		const nextRange =
			range.selectedRange == null
				? {
						kind: 'custom',
						start: new Date(viewStart).toISOString(),
						end: new Date(viewEnd).toISOString(),
						intervalId: range.displayInterval
					}
				: {
						kind: 'preset',
						days: range.selectedRange,
						intervalId: range.displayInterval
					};
		if (JSON.stringify(nextRange) === JSON.stringify(controls.shared.range)) return;
		controls = { ...controls, shared: { ...controls.shared, range: nextRange } };
	});

	onMount(() => {
		refreshLocalViews();
		markSaved(snapshotForSave());
		if (controls.mode === 'shared') void applySharedRangeSnapshot(controls.shared.range);
		oncontrolschange?.({
			openViews: () => openDrawer('view'),
			openCreate,
			openEdit: () => openDrawer('cards'),
			save: () => {
				if (saveView()) closeDrawer();
			},
			ready: true
		});
		const beforeUnload = (/** @type {BeforeUnloadEvent} */ event) => {
			if (!isDirty) return;
			event.preventDefault();
			event.returnValue = '';
		};
		window.addEventListener('beforeunload', beforeUnload);
		return () => {
			window.removeEventListener('beforeunload', beforeUnload);
			oncontrolschange?.({ ready: false });
		};
	});

	$effect(() => {
		oncontrolschange?.({
			activeName: isBuiltInView ? 'Overview' : viewName,
			isBuiltIn: isBuiltInView,
			isDirty
		});
	});

	beforeNavigate((navigation) => {
		if (!isDirty || !navigation.to || pendingAction) return;
		pendingAction = {
			type: 'navigate',
			url: `${navigation.to.url.pathname}${navigation.to.url.search}${navigation.to.url.hash}`
		};
		confirmMode = 'unsaved';
		navigation.cancel();
	});
</script>

{#snippet drawerTabs()}
	<nav
		class="grid grid-cols-3 border-b border-warm-grey bg-light-warm-grey/60"
		aria-label="View editor"
	>
		{#each [{ id: 'cards', label: 'Cards', icon: Layers3 }, { id: 'layout', label: 'Layout', icon: LayoutGrid }, { id: 'view', label: 'View', icon: Settings2 }] as tab (tab.id)}
			{@const Icon = tab.icon}
			<button
				type="button"
				class="flex items-center justify-center gap-2 border-b-2 px-3 py-3 text-xs font-semibold transition {drawerTab ===
				tab.id
					? 'border-dark-grey bg-white text-dark-grey'
					: 'border-transparent text-mid-grey hover:bg-white/70 hover:text-dark-grey'}"
				onclick={() => selectDrawerTab(/** @type {any} */ (tab.id))}
				aria-current={drawerTab === tab.id ? 'page' : undefined}
			>
				<Icon class="size-4" />
				{tab.label}
			</button>
		{/each}
	</nav>
{/snippet}

{#snippet drawerContent()}
	{#if drawerMode === 'create'}
		<ExploreCreatePanel
			onoverview={() => requestAction({ type: 'duplicate', id: DEFAULT_TRACKER_VIEW_ID })}
			onblank={startBlankView}
		/>
	{:else if drawerMode === 'editor'}
		<ExploreBuilder
			{presentation}
			{recipeId}
			config={draftConfig}
			{facilities}
			{editing}
			{errors}
			sharedControls={sharedRuntimeControls}
			onrecipechange={chooseRecipe}
			onpresentationchange={choosePresentation}
			onconfigchange={(config) => {
				draftConfig = config;
				errors = [];
			}}
			onsubmit={submitChart}
			oncancel={() => cancelEditing()}
		/>
	{:else}
		{#if !isBuiltInView}{@render drawerTabs()}{/if}
		<div class="min-h-0 flex-1 overflow-hidden">
			{#if drawerTab === 'cards' && !isBuiltInView}
				<ExploreCardsPanel
					{charts}
					{sharedMode}
					onadd={startNewChart}
					onedit={editChart}
					onremove={removeChart}
				/>
			{:else if drawerTab === 'layout' && !isBuiltInView}
				<ExploreLayoutPanel
					{columns}
					{charts}
					oncolumnschange={(value) => (columns = value)}
					onlayoutchange={updateLayout}
					onmove={moveChart}
				/>
			{:else}
				<ExploreSavePanel
					name={viewName}
					description={viewDescription}
					{localViews}
					{activeViewId}
					{isDirty}
					builtIn={isBuiltInView}
					{statusMessage}
					{jsonText}
					{importErrors}
					onnamechange={(value) => (viewName = value)}
					ondescriptionchange={(value) => (viewDescription = value)}
					onsave={() => {
						if (saveView()) closeDrawer();
					}}
					onsaveas={() => saveView(true)}
					onnew={openCreate}
					onload={(id) => requestAction({ type: 'load', id })}
					onduplicate={(id) => requestAction({ type: 'duplicate', id })}
					ondelete={requestDelete}
					oncopyjson={copyJSON}
					onjsonchange={(value) => {
						jsonText = value;
						importErrors = [];
					}}
					onimportjson={importJSON}
				/>
			{/if}
		</div>
	{/if}
{/snippet}

<svelte:window onkeydown={handleDrawerKeydown} />

<div class="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-light-warm-grey">
	<div class="relative z-20 shrink-0 border-b border-warm-grey bg-white/95 backdrop-blur-sm">
		<div class="mx-auto flex max-w-[1800px] flex-wrap items-end gap-3 px-4 py-3 md:gap-x-6 md:px-8">
			<div class="shrink-0">
				<span
					class="mb-1.5 block font-space text-xxs font-medium uppercase tracking-wider text-mid-grey"
				>
					Controls
				</span>
				<SwitchTabs
					buttons={[
						{ label: 'Shared', value: 'shared' },
						{ label: 'Per card', value: 'individual' }
					]}
					selected={controls.mode}
					onChange={(value) => setControlMode(/** @type {'shared'|'individual'} */ (value))}
				/>
			</div>

			{#if sharedMode}
				<div class="min-w-[150px] shrink-0">
					<span
						class="mb-1.5 block font-space text-xxs font-medium uppercase tracking-wider text-mid-grey"
					>
						Region
					</span>
					<RegionDropdown
						selected={controls.shared.scope}
						options={sharedRegionOptions}
						compact
						onchange={setSharedScope}
					/>
				</div>
				<div class="min-w-0 flex-1 basis-[500px]">
					<div class="mb-1.5 flex items-baseline gap-3">
						<span class="font-space text-xxs font-medium uppercase tracking-wider text-mid-grey">
							Range and interval
						</span>
						<span class="hidden text-xs text-mid-grey lg:inline">{sharedRangeLabel}</span>
					</div>
					<div class="max-w-full overflow-x-auto pb-0.5">
						<ChartRangeBar
							selectedRange={range.selectedRange}
							customDays={range.customDays}
							displayInterval={range.displayInterval}
							startDate={range.pickerStartDate}
							endDate={range.pickerEndDate}
							minDate={MIN_DATE}
							maxDate={range.maxDate}
							showIntervalDropdown
							compact
							raised
							pending={range.rangeSwitchPending}
							onrangeselect={range.handleRangeSelect}
							ondaterangechange={range.handleDateRangeChange}
							onintervalchange={range.handleIntervalChange}
						/>
					</div>
				</div>
				<div class="shrink-0">
					<span
						class="mb-1.5 block font-space text-xxs font-medium uppercase tracking-wider text-mid-grey"
					>
						Fuel technologies
					</span>
					<button
						type="button"
						class="flex items-center gap-2 rounded-lg border border-mid-warm-grey bg-white px-3 py-2 text-sm font-semibold text-dark-grey hover:bg-warm-grey"
						onclick={openTechnologies}
					>
						<ListFilter class="size-4" /> Technologies
						{#if technologyDataset}<span class="font-mono text-xxs text-mid-grey">
								{technologyVisibleCount}/{technologyDataset.seriesNames.length}
							</span>{/if}
					</button>
				</div>
			{:else}
				<p class="m-0 self-center text-xs text-mid-grey">
					Each card keeps its own region, range, interval and technology options.
				</p>
			{/if}
		</div>
	</div>

	<div class="relative flex min-h-0 flex-1 overflow-hidden">
		<main class="min-w-0 flex-1 overflow-y-auto p-4 md:p-8">
			<div class="mx-auto max-w-[1800px]">
				{#if charts.length}
					<div class="grid grid-cols-1 gap-5 {gridClass()}">
						{#each charts as chart (chart.instanceId)}
							{@const layout =
								chart.layout ?? defaultTrackerItemLayout(chart.recipeId, chart.config.presentation)}
							{@const renderHeight = mobileCanvas.current
								? Math.min(layout.heightPx, 480)
								: layout.heightPx}
							{@const renderKey = `${chart.instanceId}:${JSON.stringify(chart.config)}`}
							<div
								role="group"
								class="relative min-w-0 {spanClass(layout.columnSpan)} {layoutMode
									? 'rounded-xl outline outline-1 outline-mid-warm-grey'
									: ''}"
								ondragover={layoutMode ? (event) => event.preventDefault() : undefined}
								ondrop={(event) => {
									event.preventDefault();
									reorderCharts(draggedChartId, chart.instanceId);
									draggedChartId = '';
								}}
							>
								{#if layoutMode && !mobileCanvas.current}
									<button
										type="button"
										draggable="true"
										ondragstart={(event) => {
											draggedChartId = chart.instanceId;
											event.dataTransfer?.setData('text/plain', chart.instanceId);
										}}
										ondragend={() => (draggedChartId = '')}
										class="absolute left-3 top-3 z-20 cursor-grab rounded-md bg-dark-grey px-2 py-1 font-mono text-[9px] text-white shadow"
										aria-label="Drag card to reorder"
									>
										Drag
									</button>
								{/if}
								{#key renderKey}
									<ExploreChartCard
										bind:this={chartRefs[chart.instanceId]}
										{chart}
										{facilities}
										sharedControls={sharedRuntimeControls}
										heightPx={renderHeight}
										readOnly={isBuiltInView}
										selected={editingId === chart.instanceId}
										onedit={() => editChart(chart)}
										onremove={() => removeChart(chart.instanceId)}
										onviewportchange={sharedMode
											? (next) => handleSharedViewportChange(next, chartRefs[chart.instanceId])
											: undefined}
										onviewportsettle={sharedMode ? range.handleViewportSettle : undefined}
										ongenerationdata={(payload) => setGenerationDataset(chart.instanceId, payload)}
										onloadcomplete={sharedMode ? range.settle : undefined}
									/>
								{/key}
								{#if layoutMode && !mobileCanvas.current}
									<button
										type="button"
										class="absolute -bottom-1 left-1/2 z-20 h-3 w-14 -translate-x-1/2 cursor-ns-resize rounded-full bg-mid-warm-grey hover:bg-mid-grey"
										aria-label="Resize card height"
										onpointerdown={(event) => startHeightResize(event, chart)}
										onkeydown={(event) => {
											if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
												event.preventDefault();
												updateLayout(chart.instanceId, {
													heightPx: layout.heightPx + (event.key === 'ArrowDown' ? 10 : -10)
												});
											}
										}}
									></button>
								{/if}
							</div>
						{/each}
					</div>
				{:else}
					<div
						class="flex min-h-[520px] items-center justify-center rounded-2xl border border-dashed border-mid-warm-grey bg-white/50 p-8 text-center"
					>
						<div class="max-w-md">
							<div
								class="mx-auto flex size-12 items-center justify-center rounded-full bg-white text-dark-grey shadow-sm"
							>
								<Plus class="size-5" />
							</div>
							<h2 class="m-0 mt-5 text-xl font-semibold text-dark-grey">
								Start with a chart or metric
							</h2>
							<p class="m-0 mt-2 text-sm leading-relaxed text-mid-grey">
								Pick data, choose its options, then add it to this view.
							</p>
							{#if !isBuiltInView}<button
									type="button"
									class="mt-5 inline-flex items-center gap-2 rounded-lg bg-dark-grey px-4 py-2 text-sm font-semibold text-white"
									onclick={startNewChart}><Plus class="size-4" /> Add</button
								>
							{/if}
						</div>
					</div>
				{/if}
			</div>
		</main>

		{#if compactBuilder.current}
			<Sheet
				open={drawerOpen}
				onclose={closeDrawer}
				title={drawerTitle}
				side="bottom"
				align="stretch"
				height="min(92vh, 820px)"
				backdrop
			>
				<div class="flex h-full min-h-0 flex-col">{@render drawerContent()}</div>
			</Sheet>
		{:else}
			<aside
				class="absolute inset-y-0 left-0 z-30 flex w-[440px] max-w-[calc(100vw-2rem)] flex-col border-r border-warm-grey bg-white shadow-xl transition-transform duration-300 ease-out motion-reduce:transition-none {drawerOpen
					? 'translate-x-0'
					: 'pointer-events-none -translate-x-full'}"
				aria-hidden={!drawerOpen}
				inert={!drawerOpen}
			>
				<header
					class="flex shrink-0 items-center justify-between border-b border-warm-grey px-5 py-3.5"
				>
					<h2 class="m-0 text-base font-semibold text-dark-grey">{drawerTitle}</h2>
					<button
						type="button"
						class="rounded-lg p-2 text-mid-grey hover:bg-warm-grey hover:text-dark-grey"
						onclick={closeDrawer}
						aria-label="Close panel"
					>
						<X class="size-5" />
					</button>
				</header>
				<div class="flex min-h-0 flex-1 flex-col">{@render drawerContent()}</div>
			</aside>
		{/if}

		{#if sharedMode && technologyOpen && !charts.some((chart) => chart.recipeId === 'generation')}
			<div
				class="pointer-events-none fixed -left-[10000px] top-0 h-[240px] w-[720px]"
				aria-hidden="true"
			>
				<NetworkChart
					bind:this={technologyProvider}
					region={controls.shared.scope}
					metric={range.activeMetric}
					interval={range.activeInterval}
					displayInterval={range.displayInterval}
					group={controls.shared.group}
					chartKind="stacked"
					timeZone={sharedTimeZone}
					dateStart={toNetworkDateString(boundedViewStart, sharedTimeZone)}
					dateEnd={toNetworkDateString(boundedViewEnd, sharedTimeZone)}
					showContainer={false}
					showHeader={false}
					chartHeightPx={220}
					tooltipMode="none"
					onvisibledata={(payload) => setGenerationDataset('__provider', payload)}
					onloadcomplete={range.settle}
				/>
			</div>
		{/if}

		<Sheet
			open={technologyOpen}
			onclose={() => (technologyOpen = false)}
			title="Fuel technologies"
			side={compactBuilder.current ? 'bottom' : 'right'}
			align="stretch"
			width={compactBuilder.current ? undefined : '420px'}
			height={compactBuilder.current ? 'min(88vh, 760px)' : undefined}
			backdrop={compactBuilder.current}
		>
			<ExploreTechnologyPanel
				dataset={technologyDataset}
				hiddenSeries={controls.shared.hiddenFuelTechGroups}
				group={controls.shared.group}
				metric={range.activeMetric}
				ontoggle={toggleSharedSeries}
				ongroupchange={setSharedGroup}
				onshowall={showAllSharedSeries}
			/>
		</Sheet>
	</div>
</div>

<ExploreConfirmModal
	open={confirmMode !== ''}
	title={confirmMode === 'delete' ? 'Delete saved view?' : 'Unsaved changes'}
	message={confirmMode === 'delete'
		? 'This removes the saved copy from this browser. This cannot be undone.'
		: 'Save your changes before continuing?'}
	confirmLabel={confirmMode === 'delete' ? 'Delete' : 'Save'}
	secondaryLabel={confirmMode === 'delete' ? 'Keep view' : "Don't save"}
	onconfirm={confirmMode === 'delete' ? confirmDelete : saveThenContinue}
	onsecondary={confirmMode === 'delete'
		? () => {
				confirmMode = '';
				pendingDeleteId = '';
			}
		: discardThenContinue}
	oncancel={() => {
		confirmMode = '';
		pendingAction = null;
		pendingDeleteId = '';
	}}
/>
