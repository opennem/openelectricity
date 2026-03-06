<script>
	/**
	 * GasMetrics -- fuel-tech-specific metrics panel for gas facilities.
	 *
	 * Displays capacity factor, running hours, start count, avg price received,
	 * and revenue. Also shows gas subtype badge and peaker indicator.
	 */

	import { isGasPeaker } from '../_utils/fuel-tech-group.js';
	import {
		sumSeries,
		getHoursInRange,
		capacityFactor,
		avgPriceReceived
	} from '../_utils/compute-metrics.js';
	import { getNumberFormat } from '$lib/utils/formatters';
	import { computeDailyProfile, isSubDailyData } from '../_utils/daily-profile.js';
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

	/** @type {Record<string, string>} Map gas fueltech codes to display labels */
	const gasSubtypeLabels = {
		gas_ccgt: 'CCGT',
		gas_ocgt: 'OCGT',
		gas_steam: 'Gas Steam',
		gas_recip: 'Reciprocating',
		gas_wcmg: 'Waste Coal Mine Gas',
		distillate: 'Distillate'
	};

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

	/**
	 * Whether the badge background colour needs light text.
	 * @param {string} colour - Hex colour
	 * @returns {boolean}
	 */
	function needsLightText(colour) {
		if (!colour) return false;
		const hex = colour.replace('#', '');
		const r = parseInt(hex.substring(0, 2), 16);
		const g = parseInt(hex.substring(2, 4), 16);
		const b = parseInt(hex.substring(4, 6), 16);
		const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
		return luminance < 0.5;
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
			cf,
			totalMV,
			avgPrice
		};
	});

	/**
	 * Determine the dominant gas subtype by registered capacity.
	 * Returns the fueltech_id with the highest capacity share.
	 */
	let dominantSubtype = $derived.by(() => {
		if (!facility?.units?.length) return null;

		/** @type {Record<string, number>} */
		const capacityByType = {};
		const gasTypes = Object.keys(gasSubtypeLabels);

		for (const unit of facility.units) {
			const ft = unit.fueltech_id ?? '';
			if (gasTypes.includes(ft)) {
				capacityByType[ft] = (capacityByType[ft] || 0) + (unit.capacity_registered || 0);
			}
		}

		let maxType = /** @type {string | null} */ (null);
		let maxCap = 0;
		for (const [ft, cap] of Object.entries(capacityByType)) {
			if (cap > maxCap) {
				maxCap = cap;
				maxType = ft;
			}
		}

		return maxType;
	});

	let isPeaker = $derived(isGasPeaker(facility?.units ?? []));

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
				label="Running Hours"
				value="--"
				subtitle="Requires power data"
			/>

			<MetricCard
				label="Start Count"
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
			{#each ['Capacity Factor', 'Running Hours', 'Start Count', 'Avg Price Received', 'Revenue'] as label (label)}
				<MetricCard {label} value="--" />
			{/each}
		</div>
	{/if}

	<div class="flex flex-wrap items-center gap-2">
		{#if dominantSubtype}
			{@const bgColour = fuelTechColourMap[dominantSubtype] ?? '#7F7F7F'}
			<span
				class="inline-flex items-center rounded px-2 py-0.5 text-[11px] font-mono font-semibold"
				style="background-color: {bgColour}; color: {needsLightText(bgColour) ? '#fff' : '#1a1a1a'}"
			>
				{gasSubtypeLabels[dominantSubtype] ?? dominantSubtype}
			</span>
		{/if}

		{#if isPeaker}
			<span class="text-xxs text-mid-grey">
				Peaker plant
			</span>
		{/if}
	</div>

	{#if dailyProfile}
		<DailyProfileChart profile={dailyProfile} colour={fuelTechColourMap.gas} />
	{/if}
</div>
