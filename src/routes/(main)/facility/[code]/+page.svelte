<script>
	import { onMount } from 'svelte';

	import { FacilityChart, FacilityPriceChart } from '$lib/components/charts/facility';
	import FacilityPanelHeader from '../../facilities/_components/FacilityPanelHeader.svelte';
	import { createDragHandler, DragHandle } from '$lib/components/ui/panel';
	import {
		hasBidirectionalBattery,
		filterDerivedBatteryUnits
	} from '../../facilities/_utils/units';
	import isCommissioningCheck from '../../facilities/_utils/is-commissioning';

	import { computeMetricSwitch } from '$lib/components/charts/facility/metric-switch.js';

	import FacilityDescriptionPanel from './_components/FacilityDescriptionPanel.svelte';
	import { createViewportSync } from './_utils/viewport-sync.js';

	/** @type {{ data: any }} */
	let { data } = $props();

	let selectedFacility = $derived.by(() => {
		const f = data.facility;
		if (!f?.units) return f;
		const hasBidirectional = hasBidirectionalBattery(f);
		const filtered = filterDerivedBatteryUnits(f.units, hasBidirectional);
		// Mark commissioning units client-side (same as /facilities page)
		const units = filtered.map((/** @type {any} */ unit) => {
			if (isCommissioningCheck(unit, { hasBidirectionalBattery: hasBidirectional })) {
				return { ...unit, isCommissioning: true, status_id: 'commissioning' };
			}
			return unit;
		});
		return { ...f, units };
	});

	let timeZone = $derived(data.timeZone);
	let rangeDays = $derived(data.rangeDays ?? 7);

	let defaultEnd = $state(Date.now());
	let defaultStart = $derived(defaultEnd - rangeDays * 24 * 60 * 60 * 1000);

	function toDateString(/** @type {number} */ ms) {
		const offsetMs = timeZone === '+08:00' ? 8 * 3600_000 : 10 * 3600_000;
		return new Date(ms + offsetMs).toISOString().slice(0, 10);
	}
	let dateStart = $derived(toDateString(defaultStart));
	let dateEnd = $derived(toDateString(defaultEnd));

	let viewStart = $state(0);
	let viewEnd = $state(0);

	const sync = createViewportSync();

	/** @type {import('$lib/components/charts/facility/FacilityChart.svelte').default | undefined} */
	let powerChart = $state(undefined);

	let activeInterval = $state('5m');
	let activeMetric = $state('power');
	let displayInterval = $state('30m');

	/** @type {ReturnType<typeof setTimeout> | null} */
	let metricSwitchTimer = null;

	$effect(() => {
		// Reset chart-viewport-driven state when the underlying facility changes.
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

	let hasPowerData = $derived(
		Boolean(
			data.powerData?.data?.length &&
			data.powerData.data[0].results?.some((/** @type {any} */ r) => r.data?.length)
		)
	);

	const middleDrag = createDragHandler({
		axis: 'x',
		min: 320,
		max: 720,
		initial: 450,
		storageKey: 'facility-detail-middle-width'
	});

	let isMobile = $state(false);

	onMount(() => {
		const mq = window.matchMedia('(max-width: 767px)');
		isMobile = mq.matches;
		const update = (/** @type {MediaQueryListEvent} */ e) => (isMobile = e.matches);
		mq.addEventListener('change', update);
		return () => mq.removeEventListener('change', update);
	});
</script>

<svelte:head>
	<title>{selectedFacility?.name ?? 'Facility'} — Open Electricity</title>
</svelte:head>

<FacilityPanelHeader facility={selectedFacility} showViewButtons={false} />

<!-- order swap: on mobile, charts above description; on md+, description left of charts -->
<div class="flex-1 flex flex-col md:flex-row min-h-0">
	<div
		class="order-2 md:order-1 md:shrink-0 overflow-hidden border-t md:border-t-0 md:border-r border-warm-grey"
		style:width={isMobile ? '' : `${middleDrag.value}px`}
	>
		<FacilityDescriptionPanel sanityFacility={data.sanityFacility} facility={selectedFacility} />
	</div>

	<DragHandle
		axis="x"
		onstart={middleDrag.start}
		active={middleDrag.isDragging}
		class="hidden md:flex md:order-2"
	/>

	<div class="order-1 md:order-3 flex-1 min-w-0 min-h-0 overflow-y-auto p-4 space-y-4">
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
