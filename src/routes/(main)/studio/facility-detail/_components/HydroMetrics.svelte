<script>
	/**
	 * HydroMetrics -- fuel-tech-specific metrics panel for hydro facilities.
	 *
	 * Displays capacity factor, total energy, running hours, avg price received,
	 * and revenue. Also shows pumped hydro indicator when applicable.
	 */

	import { isPumpedHydro } from '../_utils/fuel-tech-group.js';
	import {
		sumSeries,
		getHoursInRange,
		capacityFactor,
		avgPriceReceived
	} from '../_utils/compute-metrics.js';
	import { computeDailyProfile, isSubDailyData } from '../_utils/daily-profile.js';
	import { getNumberFormat } from '$lib/utils/formatters';
	import { fuelTechColourMap } from '$lib/theme/openelectricity';
	import MetricCard from './MetricCard.svelte';
	import DailyProfileChart from './DailyProfileChart.svelte';

	/**
	 * @type {{
	 *   facility: {
	 *     network_region?: string,
	 *     units?: Array<{
	 *       fueltech_id?: string,
	 *       capacity_registered?: number,
	 *       dispatch_type?: string,
	 *       emissions_factor_co2?: number,
	 *       data_first_seen?: string,
	 *       marginal_loss_factor?: number
	 *     }>
	 *   },
	 *   sanityFacility?: {
	 *     units?: Array<{
	 *       storage_capacity?: number,
	 *       marginal_loss_factor?: number,
	 *       unit_types?: string[],
	 *       commencement_date?: string,
	 *       expected_closure_date?: string,
	 *       capacity_registered?: number
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

	const fmtEnergy = getNumberFormat(0);
	const fmtCf = getNumberFormat(1);
	const fmtPrice = getNumberFormat(2);

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

	/** Total registered capacity across all facility units (MW). */
	let totalCapacity = $derived.by(() => {
		if (!facility?.units?.length) return 0;
		let sum = 0;
		for (const unit of facility.units) {
			sum += unit.capacity_registered || 0;
		}
		return sum;
	});

	/** Computed metrics from summary data. Null when summaryData is not yet available. */
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
		const avgPrice = avgPriceReceived(totalMV, totalEnergy);

		return {
			totalEnergy,
			totalMV,
			cf,
			avgPrice
		};
	});

	let hasPumpedHydro = $derived(isPumpedHydro(facility?.units ?? []));

	let dailyProfile = $derived.by(() => {
		if (!intervalData?.data?.length || !isSubDailyData(intervalData.data)) return null;
		return computeDailyProfile(intervalData.data, intervalData.seriesNames, timeZone);
	});
</script>

<div class="flex flex-col gap-4">
	{#if metrics}
		<div class="grid grid-cols-2 gap-4 sm:grid-cols-3">
			<MetricCard
				label="Capacity Factor"
				value={fmtCf.format(metrics.cf)}
				unit="%"
			/>

			<MetricCard
				label="Total Energy"
				value={fmtEnergy.format(metrics.totalEnergy)}
				unit="MWh"
			/>

			<MetricCard
				label="Running Hours"
				value="--"
				subtitle="Requires power data"
			/>

			<MetricCard
				label="Avg Price Received"
				value={fmtPrice.format(metrics.avgPrice)}
				unit="$/MWh"
			/>

			<MetricCard
				label="Revenue"
				value={formatRevenue(metrics.totalMV)}
			/>
		</div>
	{:else}
		<div class="grid grid-cols-2 gap-4 sm:grid-cols-3">
			{#each ['Capacity Factor', 'Total Energy', 'Running Hours', 'Avg Price Received', 'Revenue'] as label (label)}
				<MetricCard {label} value="--" />
			{/each}
		</div>
	{/if}

	{#if hasPumpedHydro}
		<div class="flex flex-col gap-1">
			<span
				class="inline-flex w-fit items-center rounded px-2 py-0.5 text-[11px] font-mono font-semibold"
				style="background-color: #88AFD0; color: #1a1a1a"
			>
				Pumped Hydro
			</span>

			<span class="text-xxs text-mid-grey leading-tight">
				Net revenue and efficiency metrics available with interval power data
			</span>
		</div>
	{/if}

	{#if dailyProfile}
		<DailyProfileChart profile={dailyProfile} colour={fuelTechColourMap.hydro} />
	{/if}
</div>
