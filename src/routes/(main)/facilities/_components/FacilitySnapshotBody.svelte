<script>
	/**
	 * FacilitySnapshotBody — renders the Generation + Price snapshot charts, or a
	 * single empty state once the generation fetch confirms there's no data.
	 *
	 * Kept separate from FacilitySnapshotCharts (which owns the date maths) so the
	 * parent can wrap it in `{#key facility.code}`: a facility switch remounts this
	 * body and its load-tracking state resets for free — no reset effect needed.
	 */

	import { LineChart } from '@lucide/svelte';
	import {
		FacilityChart,
		FacilityPriceChart,
		FacilityFinancialDataProvider
	} from '$lib/components/charts/facility';
	import { capYTicks } from '$lib/components/charts/facility/helpers.js';

	/**
	 * @type {{
	 *   facility: any,
	 *   timeZone: string,
	 *   dateStart: string,
	 *   dateEnd: string,
	 *   viewStart: number,
	 *   viewEnd: number,
	 *   days: number,
	 *   generationHeight?: string,
	 *   priceHeight?: string
	 * }}
	 */
	let {
		facility,
		timeZone,
		dateStart,
		dateEnd,
		viewStart,
		viewEnd,
		days,
		generationHeight = 'h-[250px]',
		priceHeight = 'h-[200px]'
	} = $props();

	let powerLoaded = $state(false);
	let powerHasData = $state(false);

	/** @param {{ hasData: boolean }} state */
	function handleLoadComplete({ hasData }) {
		powerLoaded = true;
		powerHasData = hasData;
	}

	let noData = $derived(powerLoaded && !powerHasData);

	// Shared hover + focus time so the Generation and Price snapshots track each
	// other: hovering or pinning one moves the crosshair/tooltip on both.
	/** @type {number | undefined} */
	let hoverTime = $state(undefined);
	/** @type {number | undefined} */
	let focusTime = $state(undefined);

	/** @param {number | undefined} time */
	function handleHoverChange(time) {
		hoverTime = time;
	}

	/** @param {number | undefined} time */
	function handleFocusChange(time) {
		focusTime = time;
	}
</script>

{#if noData}
	<div
		class="flex flex-col items-center justify-center gap-3 rounded-lg border border-mid-warm-grey/40 bg-white px-6 py-10 text-center"
	>
		<div class="rounded-full bg-light-warm-grey p-4 text-mid-grey">
			<LineChart size={24} strokeWidth={1.5} />
		</div>
		<p class="m-0 text-sm font-medium text-dark-grey">No recent generation data</p>
	</div>
{:else}
	<div class="space-y-6">
		<section>
			<h3 class="m-0 mb-2 text-xs font-semibold uppercase tracking-wide text-mid-grey">
				Generation · last {days} days
			</h3>
			<FacilityChart
				{facility}
				powerData={null}
				{timeZone}
				{dateStart}
				{dateEnd}
				interval="5m"
				metric="power"
				displayInterval="30m"
				chartHeight={generationHeight}
				title="Power"
				showHeader={false}
				showOptions={false}
				showZoomControls={false}
				enablePan={false}
				resizable={false}
				yTicks={capYTicks}
				showContainer={false}
				tooltipMode="floating"
				{hoverTime}
				onhoverchange={handleHoverChange}
				{focusTime}
				onfocuschange={handleFocusChange}
				onloadcomplete={handleLoadComplete}
				bundleDerivedMetrics
			/>
		</section>

		<section>
			<h3 class="m-0 mb-2 text-xs font-semibold uppercase tracking-wide text-mid-grey">
				Price · last {days} days
			</h3>
			<FacilityFinancialDataProvider
				{facility}
				{timeZone}
				interval="5m"
				displayInterval="30m"
				{viewStart}
				{viewEnd}
				priceChartHeight={priceHeight}
				{hoverTime}
				onhoverchange={handleHoverChange}
				{focusTime}
				onfocuschange={handleFocusChange}
			>
				<FacilityPriceChart showContainer={false} showHeader={false} resizable={false} />
			</FacilityFinancialDataProvider>
		</section>
	</div>
{/if}
