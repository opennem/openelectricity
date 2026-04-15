<script>
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { onMount } from 'svelte';

	import FullscreenLayout from '$lib/components/fullscreen/FullscreenLayout.svelte';
	import { FacilityChart, FacilityPriceChart } from '$lib/components/charts/facility';
	import FacilityPanelHeader from '../../facilities/_components/FacilityPanelHeader.svelte';
	import ShortcutsToast from '$lib/components/ShortcutsToast.svelte';
	import FacilitySpotlight from '$lib/components/facility/FacilitySpotlight.svelte';
	import {
		hasBidirectionalBattery,
		filterDerivedBatteryUnits
	} from '../../facilities/_utils/units';
	import { regions as regionDefs } from '../../facilities/_utils/filters.js';

	import { computeMetricSwitch } from '$lib/components/charts/facility/metric-switch.js';

	import FacilityPickerBar from './_components/FacilityPickerBar.svelte';
	import FacilityDescriptionPanel from './_components/FacilityDescriptionPanel.svelte';
	import { createViewportSync } from './_utils/viewport-sync.js';

	/**
	 * @typedef {Object} FacilityListItem
	 * @property {string} code
	 * @property {string} name
	 * @property {string} network_id
	 * @property {string} network_region
	 */

	/** @type {{ data: any }} */
	let { data } = $props();

	// Strip derived battery_charging/discharging units when a bidirectional battery exists
	let selectedFacility = $derived.by(() => {
		const f = data.facility;
		if (!f?.units) return f;
		return {
			...f,
			units: filterDerivedBatteryUnits(f.units, hasBidirectionalBattery(f))
		};
	});

	/** @type {FacilityListItem[]} */
	let facilitiesList = $state.raw([]);

	$effect(() => {
		let cancelled = false;
		Promise.resolve(data.facilities).then((list) => {
			if (!cancelled) facilitiesList = list || [];
		});
		return () => {
			cancelled = true;
		};
	});

	let timeZone = $derived(data.timeZone);
	let rangeDays = $derived(data.rangeDays ?? 7);

	// Default viewport: last 7 days ending now
	let defaultEnd = $state(Date.now());
	let defaultStart = $derived(defaultEnd - rangeDays * 24 * 60 * 60 * 1000);

	// Compute YYYY-MM-DD strings for FacilityChart's initial viewport seed
	function toDateString(/** @type {number} */ ms) {
		const offsetMs = timeZone === '+08:00' ? 8 * 3600_000 : 10 * 3600_000;
		return new Date(ms + offsetMs).toISOString().slice(0, 10);
	}
	let dateStart = $derived(toDateString(defaultStart));
	let dateEnd = $derived(toDateString(defaultEnd));

	// Viewport state shared across charts
	let viewStart = $state(0);
	let viewEnd = $state(0);

	const sync = createViewportSync();

	/** @type {import('$lib/components/charts/facility/FacilityChart.svelte').default | undefined} */
	let powerChart = $state(undefined);

	// Auto-switch between power (5m) and energy (1d/1M) based on zoom duration
	let activeInterval = $state('5m');
	let activeMetric = $state('power');
	let displayInterval = $state('30m');

	/** @type {ReturnType<typeof setTimeout> | null} */
	let metricSwitchTimer = null;

	// Reset when facility changes
	$effect(() => {
		const _code = data.facility?.code;
		activeInterval = '5m';
		activeMetric = 'power';
		displayInterval = '30m';
	});

	/** @param {{ start: number, end: number }} range */
	function applyMetricSwitch(range) {
		const durationDays = (range.end - range.start) / (24 * 60 * 60 * 1000);
		const next = computeMetricSwitch({
			metric: activeMetric,
			interval: activeInterval,
			durationDays
		});

		displayInterval = next.displayInterval;

		if (next.changed) {
			if (metricSwitchTimer) clearTimeout(metricSwitchTimer);
			metricSwitchTimer = setTimeout(() => {
				activeMetric = next.metric;
				activeInterval = next.interval;
			}, 300);
		}
	}

	/** @param {{ start: number, end: number }} range */
	function handlePowerViewportChange(range) {
		if (sync.isSuppressed()) return;
		viewStart = range.start;
		viewEnd = range.end;
		applyMetricSwitch(range);
	}

	/** @param {{ start: number, end: number }} range */
	function handlePriceViewportChange(range) {
		if (sync.isSuppressed()) return;
		viewStart = range.start;
		viewEnd = range.end;
		applyMetricSwitch(range);
		if (powerChart) {
			sync.runSuppressed(() => powerChart?.setViewport(range.start, range.end));
		}
	}

	/** @param {string} code */
	function handleFacilitySelect(code) {
		if (code === data.facility.code) return;
		goto(`/facility/${code}`);
	}

	let regionValue = $derived(selectedFacility?.network_region?.toLowerCase() ?? null);
	let regionLabel = $derived(
		regionValue ? regionDefs.find((r) => r.value === regionValue)?.longLabel ?? '' : ''
	);

	let hasPowerData = $derived(
		Boolean(
			data.powerData?.data?.length && data.powerData.data[0].results?.some(
				(/** @type {any} */ r) => r.data?.length
			)
		)
	);

	// Description panel: open on desktop, closed on mobile
	let showDescription = $state(true);
	let mounted = $state(false);

	onMount(() => {
		const isMobile = window.matchMedia('(max-width: 767px)').matches;
		showDescription = !isMobile;
		mounted = true;
	});

	// Fullscreen state driven by ?fullscreen=true URL param
	let isFullscreen = $derived(page.url.searchParams.get('fullscreen') === 'true');

	function toggleFullscreen() {
		const url = new URL(page.url);
		if (isFullscreen) url.searchParams.delete('fullscreen');
		else url.searchParams.set('fullscreen', 'true');
		goto(`${url.pathname}${url.search}`, { noScroll: true, replaceState: true, keepFocus: true });
	}

	let showShortcutsToast = $state(false);
	let spotlightOpen = $state(false);

	/** @param {KeyboardEvent} e */
	function handleKeydown(e) {
		// Esc: close the shortcuts toast. (Spotlight handles its own Esc; fullscreen
		// exit is NOT bound to Esc — use the logo mark, options menu, or F shortcut.)
		if (e.key === 'Escape') {
			if (spotlightOpen) return;
			if (showShortcutsToast) {
				e.preventDefault();
				showShortcutsToast = false;
			}
			return;
		}

		if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
		if (spotlightOpen) return;

		if (e.key === '/') {
			e.preventDefault();
			spotlightOpen = true;
			return;
		}

		if (e.key === '?') {
			showShortcutsToast = !showShortcutsToast;
			return;
		}

		if (e.key === 'f' || e.key === 'F') {
			if (e.shiftKey) return;
			e.preventDefault();
			toggleFullscreen();
			showShortcutsToast = false;
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<svelte:head>
	<title>{selectedFacility?.name ?? 'Facility'} — Open Electricity</title>
</svelte:head>

<FullscreenLayout {isFullscreen} onexitfullscreen={toggleFullscreen}>
	{#snippet filterBar()}
		<div
			class="shrink-0 border-b border-warm-grey {isFullscreen
				? 'md:border-0 md:px-6 md:pt-6'
				: 'px-4'}"
		>
			<FacilityPickerBar
				selectedLabel={selectedFacility?.name ?? ''}
				{regionValue}
				{regionLabel}
				{isFullscreen}
				{showDescription}
				ontoggledescription={() => (showDescription = !showDescription)}
				onfullscreenchange={toggleFullscreen}
				onshowshortcuts={() => (showShortcutsToast = !showShortcutsToast)}
			/>
		</div>
	{/snippet}

	{#snippet content()}
		<section
			class="relative flex flex-col md:flex-row {isFullscreen
				? 'flex-1 min-h-0'
				: 'h-[calc(100dvh-214px)] md:h-[calc(100dvh-300px)] md:min-h-[700px]'}"
		>
			<div class="flex-1 min-w-0 flex flex-col min-h-0">
				<FacilityPanelHeader facility={selectedFacility} showViewButtons={false} />

				<div class="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
					{#if selectedFacility}
						{#if hasPowerData}
							<FacilityChart
								bind:this={powerChart}
								facility={selectedFacility}
								powerData={data.powerData}
								{timeZone}
								{dateStart}
								{dateEnd}
								interval={activeInterval}
								metric={activeMetric}
								{displayInterval}
								chartHeight="h-[267px]"
								title={activeMetric === 'energy' ? 'Energy' : 'Power'}
								onviewportchange={handlePowerViewportChange}
							/>

							{#if viewStart && viewEnd}
								<FacilityPriceChart
									facility={selectedFacility}
									{timeZone}
									interval={activeInterval}
									{displayInterval}
									{viewStart}
									{viewEnd}
									onviewportchange={handlePriceViewportChange}
								/>
							{/if}
						{:else}
							<div
								class="flex items-center justify-center rounded-lg border border-light-warm-grey bg-light-warm-grey/30 h-full min-h-[240px]"
							>
								<p class="text-sm text-mid-grey m-0">No data available</p>
							</div>
						{/if}
					{/if}
				</div>
			</div>

			<aside
				class="shrink-0 overflow-hidden bg-white transition-[width,border-width] duration-250 ease-out {mounted &&
				showDescription
					? 'w-full md:w-1/2 border-t md:border-t-0 md:border-l border-warm-grey'
					: 'w-0 border-0'}"
				aria-hidden={!showDescription}
			>
				<div class="w-screen md:w-[50vw] h-full">
					<FacilityDescriptionPanel
						sanityFacility={data.sanityFacility}
						onclose={() => (showDescription = false)}
					/>
				</div>
			</aside>
		</section>
	{/snippet}
</FullscreenLayout>

<FacilitySpotlight
	facilities={facilitiesList}
	bind:open={spotlightOpen}
	onselect={handleFacilitySelect}
/>

<ShortcutsToast
	visible={showShortcutsToast}
	ondismiss={() => (showShortcutsToast = false)}
	shortcuts={[
		{ label: 'Search facilities', keys: ['/'] },
		{ label: 'Enter / exit full screen', keys: ['F'] },
		{ label: 'Show shortcuts', keys: ['?'] }
	]}
/>
