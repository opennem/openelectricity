<script>
	/**
	 * SolarMetrics -- fuel-tech-specific metrics panel for solar facilities.
	 *
	 * Displays capacity factor, peak output, average price received,
	 * revenue, and an optional DC:AC ratio computed from Sanity CMS data
	 * (capacity_registered as DC, capacity_maximum as AC).
	 */

	import {
		sumSeries,
		getHoursInRange,
		capacityFactor,
		avgPriceReceived,
		peakOutput,
		dcAcRatio
	} from '../_utils/compute-metrics.js';
	import { computeDailyProfile, isSubDailyData } from '../_utils/daily-profile.js';
	import { getNumberFormat } from '$lib/utils/formatters';
	import { fuelTechColourMap } from '$lib/theme/openelectricity';
	import MetricCard from './MetricCard.svelte';
	import DailyProfileChart from './DailyProfileChart.svelte';

	/**
	 * @type {{
	 *   facility: {
	 *     units?: Array<{
	 *       code?: string,
	 *       fueltech_id?: string,
	 *       capacity_registered?: number,
	 *       dispatch_type?: string
	 *     }>
	 *   },
	 *   sanityFacility?: {
	 *     units?: Array<{
	 *       code?: string,
	 *       capacity_registered?: number,
	 *       capacity_maximum?: number
	 *     }>
	 *   } | null,
	 *   summaryData?: {
	 *     mvData: Array<Record<string, any>>,
	 *     energyData: Array<Record<string, any>>,
	 *     mvSeriesNames: string[],
	 *     energySeriesNames: string[],
	 *     mvChartStore: any
	 *   } | null,
	 *   intervalData?: { data: Array<Record<string, any>>, seriesNames: string[], seriesLabels: Record<string, string> } | null,
	 *   timeZone?: string
	 * }}
	 */
	let { facility, sanityFacility = null, summaryData = null, intervalData = null, timeZone = '+10:00' } = $props();

	const fmtCf = getNumberFormat(1);
	const fmtPrice = getNumberFormat(2);
	const fmtPeak = getNumberFormat(0);
	const fmtRatio = getNumberFormat(2);
	const fmtMW = getNumberFormat(1);

	/**
	 * Format revenue as "$Xk" or "$X.Xm" depending on magnitude.
	 * @param {number} value - Revenue in dollars
	 * @returns {string}
	 */
	function formatRevenue(value) {
		const abs = Math.abs(value);
		const sign = value < 0 ? '-' : '';

		if (abs >= 1_000_000) {
			const millions = abs / 1_000_000;
			return `${sign}$${millions.toFixed(1)}m`;
		}
		if (abs >= 1_000) {
			const thousands = abs / 1_000;
			return `${sign}$${Math.round(thousands)}k`;
		}
		return `${sign}$${Math.round(abs)}`;
	}

	/**
	 * Total registered capacity across all facility units (MW).
	 */
	let totalCapacity = $derived.by(() => {
		if (!facility?.units?.length) return 0;
		let sum = 0;
		for (const unit of facility.units) {
			sum += unit.capacity_registered || 0;
		}
		return sum;
	});

	/**
	 * DC:AC ratio and associated capacity values from Sanity CMS data.
	 * Aggregates capacity_registered (DC) and capacity_maximum (AC) across
	 * all solar units, then computes the ratio.
	 */
	let dcAcInfo = $derived.by(() => {
		if (!sanityFacility?.units?.length) return null;

		let totalDC = 0;
		let totalAC = 0;

		for (const unit of sanityFacility.units) {
			totalDC += unit.capacity_registered || 0;
			totalAC += unit.capacity_maximum || 0;
		}

		const ratio = dcAcRatio(totalDC, totalAC);
		if (ratio === null) return null;

		return { ratio, dcMW: totalDC, acMW: totalAC };
	});

	/**
	 * Computed metrics from summary data.
	 * Returns null when summaryData is not yet available.
	 */
	let metrics = $derived.by(() => {
		if (!summaryData?.energyData?.length) return null;

		const { energyData, mvData, energySeriesNames, mvSeriesNames } = summaryData;

		let totalEnergy = 0;
		for (const name of energySeriesNames) {
			totalEnergy += sumSeries(energyData, name);
		}

		let totalMV = 0;
		for (const name of mvSeriesNames) {
			totalMV += sumSeries(mvData, name);
		}

		const hours = getHoursInRange(energyData);
		const cf = capacityFactor(totalEnergy, totalCapacity, hours);
		const price = avgPriceReceived(totalMV, totalEnergy);
		const peak = peakOutput(energyData, energySeriesNames);

		return {
			totalEnergy,
			totalMV,
			cf,
			price,
			peak
		};
	});

	let dailyProfile = $derived.by(() => {
		if (!intervalData?.data?.length || !isSubDailyData(intervalData.data)) return null;
		return computeDailyProfile(intervalData.data, intervalData.seriesNames, timeZone);
	});
</script>

<div class="flex flex-col gap-4">
	{#if metrics}
		<div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
			<MetricCard
				label="Capacity Factor"
				value={fmtCf.format(metrics.cf)}
				unit="%"
			/>

			<MetricCard
				label="Peak Output"
				value="{fmtPeak.format(metrics.peak)} / {fmtPeak.format(totalCapacity)}"
				unit="MW"
			/>

			<MetricCard
				label="Avg Price Received"
				value={fmtPrice.format(metrics.price)}
				unit="$/MWh"
			/>

			<MetricCard
				label="Revenue"
				value={formatRevenue(metrics.totalMV)}
			/>

			{#if dcAcInfo}
				<MetricCard
					label="DC:AC Ratio"
					value={fmtRatio.format(dcAcInfo.ratio)}
					unit="ratio"
				/>
			{/if}
		</div>
	{:else}
		<div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
			{#each ['Capacity Factor', 'Peak Output', 'Avg Price Received', 'Revenue'] as label (label)}
				<MetricCard {label} value="--" />
			{/each}

			{#if dcAcInfo}
				<MetricCard label="DC:AC Ratio" value="--" />
			{/if}
		</div>
	{/if}

	{#if dcAcInfo}
		<div class="border-t border-warm-grey pt-3">
			<span class="text-xs text-mid-grey">
				DC array {fmtMW.format(dcAcInfo.dcMW)} MW / AC connection {fmtMW.format(dcAcInfo.acMW)} MW
			</span>
		</div>
	{/if}

	{#if dailyProfile}
		<DailyProfileChart profile={dailyProfile} colour={fuelTechColourMap.solar} />
	{/if}
</div>
