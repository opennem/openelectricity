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

	/**
	 * @type {{
	 *   facility: any,
	 *   timeZone: string,
	 *   dateStart: string,
	 *   dateEnd: string,
	 *   viewStart: number,
	 *   viewEnd: number,
	 *   days: number
	 * }}
	 */
	let { facility, timeZone, dateStart, dateEnd, viewStart, viewEnd, days } = $props();

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

	/**
	 * Cap the y-axis at 3 ticks (endpoints + middle) so the compact snapshot axes
	 * never crowd. AxisY calls this with the scale's default ticks; d3's
	 * `ticks(3)` only targets ~3 and can overshoot, so we thin explicitly.
	 * @param {any[]} ticks
	 */
	function capYTicks(ticks) {
		if (ticks.length <= 3) return ticks;
		return [ticks[0], ticks[Math.round((ticks.length - 1) / 2)], ticks[ticks.length - 1]];
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
				chartHeight="h-[250px]"
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
				priceChartHeight="h-[200px]"
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
