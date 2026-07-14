<script>
	/**
	 * Explorer — a reimagined, customisable Tracker dashboard.
	 *
	 * Network-level Generation + Price for a chosen region/range/interval/grouping,
	 * reusing the facility chart stack (NetworkChart → ChartStore + ChartDataManager
	 * → StratumChart). v1 is a fixed panel stack + fuel-tech table, but the panel
	 * registry (`panels.js`) and URL-encoded state are the seams the customiser,
	 * multi-region compare and shareable dashboards extend later.
	 */

	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { goto, replaceState } from '$app/navigation';

	import Meta from '$lib/components/Meta.svelte';
	import FullscreenLayout from '$lib/components/fullscreen/FullscreenLayout.svelte';
	import FullscreenNavDropdown from '$lib/components/fullscreen/FullscreenNavDropdown.svelte';
	import OptionsMenu from '$lib/components/ui/options-menu/OptionsMenu.svelte';
	import ShortcutsToast from '$lib/components/ShortcutsToast.svelte';
	import { ChartRangeBar } from '$lib/components/charts/v2';
	import Select from '$lib/components/form-elements/Select.svelte';
	import ResizablePanel from '$lib/components/ui/resizable-panel/resizable-panel.svelte';
	import NetworkChart from '$lib/components/charts/network/NetworkChart.svelte';
	import FuelTechTable from './components/FuelTechTable.svelte';

	import { regionOptions } from '$lib/regions.js';
	import { GROUP_OPTIONS } from '$lib/components/charts/network/groups.js';
	import { regionToNetwork } from '$lib/components/charts/network/region-to-network.js';
	import { createEchoGuard } from '$lib/components/charts/v2/echo-guard.js';
	import { PANELS } from './panels.js';
	import {
		getIntervalSpec,
		getPresetByDays,
		getDefaultIntervalForRange,
		getIntervalOptionsForDays
	} from '$lib/components/charts/facility/range-interval-config.js';
	import {
		getMetricIntervalForDays,
		getHysteresisSwitch,
		getDisplayIntervalForDays
	} from '$lib/utils/metric-interval.js';

	/** @type {{ data: { region: string, selectedRange: number | null, intervalId: string, group: string, startDate: string, endDate: string } }} */
	let { data } = $props();

	const DAY_MS = 24 * 60 * 60 * 1000;
	/** NEM dispatch begins Dec 1998 — the floor for the "All" range + date picker. */
	const FLOOR_DATE = '1998-12-01';

	// ============================================
	// State
	// ============================================

	let selectedRegion = $state(data.region);
	let selectedGroup = $state(data.group);
	/** Range in days (-1 = All), or null when a custom/panned range is active. */
	let selectedRange = $state(/** @type {number | null} */ (data.selectedRange));

	/** Initial viewport seed (from the loader) — NetworkChart reads these once. */
	const dateStart = data.startDate;
	const dateEnd = data.endDate;

	const initialSpec = getIntervalSpec(data.intervalId);
	let activeMetric = $state(/** @type {'power' | 'energy'} */ (initialSpec?.metric ?? 'power'));
	let activeInterval = $state(initialSpec?.apiInterval ?? '5m');
	let displayInterval = $state(data.intervalId);

	let viewStart = $state(0);
	let viewEnd = $state(0);

	/** Shared hover time — syncs crosshair/table across panels. */
	let hoverTime = $state(/** @type {number | undefined} */ (undefined));

	/** Panel chart instances keyed by panel id (bind:this into the record). */
	/** @type {Record<string, NetworkChart | undefined>} */
	let chartRefs = $state({});

	/** @type {{ data: any[], seriesNames: string[], seriesLabels: Record<string, string> } | null} */
	let tableData = $state(null);

	let mounted = $state(false);
	let tableContainerHeight = $state(0);
	let showShortcutsToast = $state(false);

	// ============================================
	// Derived
	// ============================================

	let isFullscreen = $derived(page.url.searchParams.get('fullscreen') === 'true');
	let target = $derived(regionToNetwork(selectedRegion));
	let timeZone = $derived(target.timeZone);

	const regionSelectOptions = regionOptions.map((r) => ({ label: r.label, value: r.value }));

	let selectedRegionOption = $derived(
		regionSelectOptions.find((o) => o.value === selectedRegion) ?? regionSelectOptions[0]
	);
	let selectedGroupOption = $derived(
		GROUP_OPTIONS.find((o) => o.value === selectedGroup) ?? GROUP_OPTIONS[0]
	);

	/** Fallback viewport (the loader's seed dates) used until the charts report
	 *  their live viewport. */
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

	const COARSE_PICKER_INTERVALS = new Set(['7d', 'season', 'quarter', 'half', 'fy']);

	// ============================================
	// Viewport sync (prevent panel ↔ panel echo)
	// ============================================

	const echo = createEchoGuard();

	// ============================================
	// Range / interval handlers
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
			for (const panel of PANELS) chartRefs[panel.id]?.setViewport(startMs, endMs);
		});
		scheduleUrlUpdate();
	}

	/** @param {number} days */
	function handleRangeSelect(days) {
		selectedRange = days;
		const endMs = Date.now();
		let actualDays = days;
		if (days === -1) {
			actualDays = Math.max(1, Math.ceil((endMs - new Date(FLOOR_DATE).getTime()) / DAY_MS));
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

	/** Hysteresis-aware metric/interval switch on pan/zoom. */
	/** @param {{ start: number, end: number }} range */
	function applyMetricSwitch(range) {
		const durationDays = (range.end - range.start) / DAY_MS;
		const next = getHysteresisSwitch(activeMetric, activeInterval, durationDays);
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
	 * Pan/zoom on any panel drives the shared viewport: mirror the new range
	 * into every other panel with the echo suppressed.
	 * @param {{ start: number, end: number }} range
	 * @param {string} sourceId
	 */
	function handlePanelViewport(range, sourceId) {
		if (echo.suppressed) return;
		viewStart = range.start;
		viewEnd = range.end;
		selectedRange = null;
		applyMetricSwitch(range);
		echo.run(() => {
			for (const panel of PANELS) {
				if (panel.id === sourceId) continue;
				chartRefs[panel.id]?.setViewport(range.start, range.end);
			}
		});
		scheduleUrlUpdate();
	}

	/** @param {{ value: string | number | null | undefined }} option */
	function handleRegionChange(option) {
		selectedRegion = String(option.value);
		scheduleUrlUpdate();
	}

	/** @param {{ value: string | number | null | undefined }} option */
	function handleGroupChange(option) {
		selectedGroup = String(option.value);
		scheduleUrlUpdate();
	}

	/** @param {number | undefined} time */
	function handleHoverChange(time) {
		hoverTime = time;
	}

	/** @param {{ data: any[], seriesNames: string[], seriesLabels: Record<string, string> }} payload */
	function handleVisibleData(payload) {
		tableData = payload;
	}

	// ============================================
	// URL state (shareable)
	// ============================================

	const DAYS_TO_TOKEN = /** @type {Record<string, string>} */ ({
		'1': '1d',
		'3': '3d',
		'7': '7d',
		'30': '30d',
		'365': '1y',
		'-1': 'all'
	});

	/** @type {ReturnType<typeof setTimeout> | null} */
	let urlTimer = null;
	function scheduleUrlUpdate() {
		if (urlTimer) clearTimeout(urlTimer);
		urlTimer = setTimeout(updateUrl, 400);
	}

	/**
	 * Build the query params from the current dashboard state (not `page.url`,
	 * which goes stale because `updateUrl` writes it shallowly).
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
		if (fullscreen) params.set('fullscreen', 'true');
		return params;
	}

	function updateUrl() {
		if (!mounted) return;
		// Shallow update — keeps the address bar shareable without re-running load.
		replaceState(`?${buildParams(isFullscreen).toString()}`, {});
	}

	function toggleFullscreen() {
		// `goto` (not shallow replaceState) so `page.url` updates and the
		// `isFullscreen` derived actually flips — matching the facility layout.
		goto(`${page.url.pathname}?${buildParams(!isFullscreen).toString()}`, {
			noScroll: true,
			replaceState: true,
			keepFocus: true
		});
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
	});
</script>

<svelte:window onkeydown={handleKeydown} />

<Meta
	title="Explorer"
	description="Explore Australia's electricity generation and price across regions, ranges and fuel-tech groupings."
/>

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
				minDate={FLOOR_DATE}
				{maxDate}
				earliestDate={FLOOR_DATE}
				showIntervalDropdown={true}
				onrangeselect={handleRangeSelect}
				ondaterangechange={handleDateRangeChange}
				onintervalchange={handleIntervalChange}
			/>

			<div class="h-6 w-px bg-warm-grey"></div>

			<Select
				selected={selectedGroupOption}
				options={GROUP_OPTIONS}
				onchange={handleGroupChange}
				formLabel="Grouping"
				compact
			/>

			<div class="ml-auto shrink-0">
				<OptionsMenu
					{isFullscreen}
					onfullscreenchange={toggleFullscreen}
					onshowshortcuts={() => (showShortcutsToast = !showShortcutsToast)}
				/>
			</div>
		</div>
	{/snippet}

	{#snippet content()}
		<div
			class="flex-1 min-h-0 flex flex-col relative bg-light-warm-grey"
			bind:clientHeight={tableContainerHeight}
		>
			<!-- Panel stack — rendered from the PANELS registry so the customiser
			     (add/remove/reorder) can drop in by changing the list -->
			<div class="flex-1 min-h-0 overflow-y-auto p-4 space-y-6">
				{#each PANELS as panel (panel.id)}
					<div class="rounded-lg border border-mid-warm-grey/40 bg-white">
						<div
							class="flex items-center justify-between gap-4 px-6 py-3 border-b border-mid-warm-grey/40"
						>
							<h3 class="text-sm font-semibold text-dark-grey m-0">{panel.title}</h3>
							{#if panel.grouped}
								<span
									class="px-2 py-0.5 rounded bg-light-warm-grey text-dark-grey text-xs uppercase tracking-wider"
								>
									{getIntervalSpec(displayInterval)?.label ?? displayInterval}
								</span>
							{:else if panel.unitLabel}
								<span class="text-xs text-mid-grey">{panel.unitLabel}</span>
							{/if}
						</div>
						<NetworkChart
							bind:this={chartRefs[panel.id]}
							region={selectedRegion}
							metric={panel.metric === 'power' ? activeMetric : panel.metric}
							interval={activeInterval}
							{displayInterval}
							group={panel.grouped ? selectedGroup : undefined}
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
							onvisibledata={panel.feedsTable ? handleVisibleData : undefined}
						/>
					</div>
				{/each}
			</div>

			<!-- Resizable fuel-tech table -->
			<ResizablePanel
				open={true}
				direction="top"
				defaultSize={36}
				minSize={160}
				containerSize={tableContainerHeight}
				onclose={() => {}}
				class="bg-white border-t border-warm-grey shadow-[0_-4px_16px_rgba(0,0,0,0.04)] z-20"
			>
				{#snippet header()}
					<header
						class="flex items-center justify-between px-6 py-3 border-b border-warm-grey shrink-0"
					>
						<h2 class="text-sm font-semibold text-dark-grey m-0">Fuel tech breakdown</h2>
						<span class="text-xs text-mid-grey">
							{hoverTime ? 'At cursor' : 'Latest'}
						</span>
					</header>
				{/snippet}
				<FuelTechTable {tableData} {hoverTime} metric={activeMetric} />
			</ResizablePanel>
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
