<script>
	import {
		FacilityChart,
		FacilityPriceChart,
		FacilityMarketValueChart,
		FacilityFinancialDataProvider,
		FacilityPollutionPanel
	} from '$lib/components/charts/facility';
	import { formatDateRange } from '$lib/components/charts/v2';
	import FacilityPanelHeader from '../../facilities/_components/FacilityPanelHeader.svelte';
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

	let hasNpi = $derived(Boolean(selectedFacility?.npi_id));

	let ianaTimeZone = $derived(timeZone === '+08:00' ? 'Australia/Perth' : 'Australia/Brisbane');
	let dateRangeLabel = $derived.by(() => {
		const start = viewStart || defaultStart;
		const end = viewEnd || defaultEnd;
		return formatDateRange(new Date(start), new Date(end), ianaTimeZone);
	});

	/** Shared hover time — syncs crosshair/tooltip across all three charts. */
	/** @type {number | undefined} */
	let hoverTime = $state(undefined);
	/** @param {number | undefined} time */
	function handleHoverChange(time) {
		hoverTime = time;
	}

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

</script>

<svelte:head>
	<title>{selectedFacility?.name ?? 'Facility'} — Open Electricity</title>
</svelte:head>

<FacilityPanelHeader facility={selectedFacility} showViewButtons={false} />

<div class="flex-1 min-h-0 overflow-y-auto bg-light-warm-grey p-8 space-y-8">
	{#if selectedFacility}
		{#if hasPowerData}
			<FacilityFinancialDataProvider
				active={true}
				facility={selectedFacility}
				{timeZone}
				interval={activeInterval}
				{displayInterval}
				{viewStart}
				{viewEnd}
				{hoverTime}
				onhoverchange={handleHoverChange}
				onviewportchange={handlePriceViewportChange}
			>
				<div class="space-y-4">
					<div class="rounded-lg border border-mid-warm-grey/40 bg-white">
						<div
							class="flex items-center justify-between gap-4 px-6 py-3 border-b border-mid-warm-grey/40"
						>
							<h3 class="text-sm font-semibold text-dark-grey m-0">Generation &amp; Market</h3>
							<div class="flex items-center gap-3 text-xs text-mid-grey">
								<span>{dateRangeLabel}</span>
								<span
									class="px-2 py-0.5 rounded bg-light-warm-grey text-dark-grey uppercase tracking-wider"
								>
									{displayInterval}
								</span>
							</div>
						</div>
						<div class="divide-y divide-mid-warm-grey/40">
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
								tooltipMode="floating"
								showContainer={false}
								{hoverTime}
								onhoverchange={handleHoverChange}
								onviewportchange={handlePowerViewportChange}
							/>

							{#if viewStart && viewEnd}
								<FacilityPriceChart showContainer={false} />
								<FacilityMarketValueChart showContainer={false} />
							{/if}
						</div>
					</div>

					{#if hasNpi}
						<FacilityPollutionPanel facility={selectedFacility} />
					{/if}
				</div>
			</FacilityFinancialDataProvider>
		{:else}
			<div
				class="flex items-center justify-center rounded-lg border border-light-warm-grey bg-light-warm-grey/30 min-h-[240px]"
			>
				<p class="text-sm text-mid-grey m-0">No data available</p>
			</div>
		{/if}

		<div class="border-t border-warm-grey pt-4">
			<FacilityDescriptionPanel
				sanityFacility={data.sanityFacility}
				facility={selectedFacility}
			/>
		</div>
	{/if}
</div>
