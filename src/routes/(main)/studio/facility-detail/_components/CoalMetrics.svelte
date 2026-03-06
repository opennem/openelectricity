<script>
	/**
	 * CoalMetrics -- fuel-tech-specific metrics panel for coal facilities.
	 *
	 * Displays capacity factor, CO2 emissions, emissions intensity, revenue,
	 * and average price received. Also shows coal type badge, expected closure
	 * date, and minimum stable generation if available from Sanity.
	 */

	import {
		sumSeries,
		getHoursInRange,
		capacityFactor,
		avgPriceReceived,
		totalEmissions
	} from '../_utils/compute-metrics.js';
	import { computeUnitAvailability } from '../_utils/unit-availability.js';
	import { isSubDailyData } from '../_utils/daily-profile.js';
	import { getNumberFormat } from '$lib/utils/formatters';
	import { fuelTechColourMap } from '$lib/theme/openelectricity';
	import MetricCard from './MetricCard.svelte';

	/**
	 * @type {{
	 *   facility: {
	 *     units?: Array<{
	 *       fueltech_id?: string,
	 *       capacity_registered?: number,
	 *       dispatch_type?: string,
	 *       code?: string
	 *     }>
	 *   },
	 *   sanityFacility?: {
	 *     units?: Array<{
	 *       code?: string,
	 *       emissions_factor_co2?: number,
	 *       expected_closure_date?: string,
	 *       expected_closure_date_specificity?: 'year' | 'month' | 'day',
	 *       min_generation_capacity?: number,
	 *       unit_types?: Array<{ brand?: string, model?: string }>
	 *     }>
	 *   } | null,
	 *   summaryData?: {
	 *     mvData: Array<Record<string, any>>,
	 *     energyData: Array<Record<string, any>>,
	 *     mvSeriesNames: string[],
	 *     energySeriesNames: string[],
	 *     mvChartStore: any
	 *   } | null,
	 *   intervalData?: { data: Array<Record<string, any>>, seriesNames: string[], seriesLabels: Record<string, string> } | null
	 * }}
	 */
	let { facility, sanityFacility = null, summaryData = null, intervalData = null } = $props();

	const fmtEnergy = getNumberFormat(0);
	const fmtCf = getNumberFormat(1);
	const fmtPrice = getNumberFormat(2);
	const fmtEmissions = getNumberFormat(0);
	const fmtIntensity = getNumberFormat(0);

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
	 * Dominant coal type: 'black' or 'brown' based on capacity-weighted fueltech_id.
	 */
	let coalType = $derived.by(() => {
		if (!facility?.units?.length) return null;

		let blackCap = 0;
		let brownCap = 0;

		for (const unit of facility.units) {
			const cap = unit.capacity_registered || 0;
			if (unit.fueltech_id === 'coal_black') blackCap += cap;
			else if (unit.fueltech_id === 'coal_brown') brownCap += cap;
		}

		if (blackCap === 0 && brownCap === 0) return null;
		return blackCap >= brownCap ? 'black' : 'brown';
	});

	/**
	 * Build a map of unitCode -> emissions factor from Sanity units.
	 * @type {Record<string, number>}
	 */
	let emissionsFactors = $derived.by(() => {
		/** @type {Record<string, number>} */
		const map = {};
		if (!sanityFacility?.units?.length) return map;

		for (const unit of sanityFacility.units) {
			if (unit.code && unit.emissions_factor_co2 != null) {
				map[unit.code] = unit.emissions_factor_co2;
			}
		}
		return map;
	});

	/**
	 * Capacity-weighted average emissions factor (tCO2/MWh).
	 */
	let avgEmissionsFactor = $derived.by(() => {
		if (!sanityFacility?.units?.length || !facility?.units?.length) return null;

		let totalWeight = 0;
		let weightedSum = 0;

		for (const unit of facility.units) {
			const cap = unit.capacity_registered || 0;
			const factor = emissionsFactors[unit.code ?? ''];
			if (factor != null && cap > 0) {
				weightedSum += factor * cap;
				totalWeight += cap;
			}
		}

		if (totalWeight === 0) return null;
		return weightedSum / totalWeight;
	});

	/**
	 * Earliest expected closure date from Sanity units.
	 */
	let closureInfo = $derived.by(() => {
		if (!sanityFacility?.units?.length) return null;

		/** @type {string | null} */
		let earliest = null;
		/** @type {'year' | 'month' | 'day' | undefined} */
		let specificity;

		for (const unit of sanityFacility.units) {
			const d = unit.expected_closure_date;
			if (d && (!earliest || d < earliest)) {
				earliest = d;
				specificity = unit.expected_closure_date_specificity;
			}
		}

		if (!earliest) return null;
		return { date: earliest, specificity: specificity ?? 'year' };
	});

	/**
	 * Format closure date based on specificity.
	 * @param {{ date: string, specificity: 'year' | 'month' | 'day' }} info
	 * @returns {string}
	 */
	function formatClosureDate(info) {
		const d = new Date(info.date);
		if (isNaN(d.getTime())) return info.date;

		const months = [
			'January', 'February', 'March', 'April', 'May', 'June',
			'July', 'August', 'September', 'October', 'November', 'December'
		];

		switch (info.specificity) {
			case 'day':
				return `${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
			case 'month':
				return `${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
			case 'year':
			default:
				return `${d.getUTCFullYear()}`;
		}
	}

	/**
	 * Minimum stable generation from Sanity units -- take the first non-null value.
	 */
	let minGeneration = $derived.by(() => {
		if (!sanityFacility?.units?.length) return null;
		for (const unit of sanityFacility.units) {
			if (unit.min_generation_capacity != null && unit.min_generation_capacity > 0) {
				return unit.min_generation_capacity;
			}
		}
		return null;
	});

	/**
	 * Per-unit availability computed from sub-daily interval data.
	 */
	let unitAvailability = $derived.by(() => {
		if (!intervalData?.data?.length || !isSubDailyData(intervalData.data)) return null;
		return computeUnitAvailability(intervalData.data, intervalData.seriesNames);
	});

	/**
	 * Computed metrics from summary data.
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
		const avgPrice = avgPriceReceived(totalMV, totalEnergy);

		const co2 = totalEmissions(energyData, energySeriesNames, emissionsFactors);

		// Emissions intensity: capacity-weighted avg factor * 1000 to convert tCO2/MWh -> kgCO2/MWh
		const intensity = avgEmissionsFactor != null ? avgEmissionsFactor * 1000 : null;

		return {
			cf,
			totalEnergy,
			totalMV,
			avgPrice,
			co2,
			intensity
		};
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
				label="CO2 Emissions"
				value={Object.keys(emissionsFactors).length > 0
					? fmtEmissions.format(metrics.co2)
					: '--'}
				unit={Object.keys(emissionsFactors).length > 0 ? 'tCO2' : ''}
				subtitle={Object.keys(emissionsFactors).length === 0
					? 'No emissions factors available'
					: ''}
			/>

			<MetricCard
				label="Emissions Intensity"
				value={metrics.intensity != null ? fmtIntensity.format(metrics.intensity) : '--'}
				unit={metrics.intensity != null ? 'kgCO2/MWh' : ''}
			/>

			<MetricCard
				label="Revenue"
				value={formatRevenue(metrics.totalMV)}
			/>

			<MetricCard
				label="Avg Price Received"
				value={fmtPrice.format(metrics.avgPrice)}
				unit="$/MWh"
			/>
		</div>
	{:else}
		<div class="grid grid-cols-2 gap-4 sm:grid-cols-3">
			{#each ['Capacity Factor', 'CO\u2082 Emissions', 'Emissions Intensity', 'Revenue', 'Avg Price Received'] as label (label)}
				<MetricCard {label} value="--" />
			{/each}
		</div>
	{/if}

	<!-- Coal type badge, closure date, min generation -->
	<div class="flex flex-wrap items-center gap-2">
		{#if coalType}
			{@const colour = coalType === 'black' ? fuelTechColourMap.coal_black : fuelTechColourMap.coal_brown}
			<span
				class="inline-flex items-center rounded px-2 py-0.5 text-[11px] font-mono font-semibold"
				style="background-color: {colour}; color: #fff"
			>
				{coalType === 'black' ? 'Black Coal' : 'Brown Coal'}
			</span>
		{/if}

		{#if closureInfo}
			<span class="text-[11px] text-mid-grey">
				Expected closure: {formatClosureDate(closureInfo)}
			</span>
		{/if}

		{#if minGeneration != null}
			<span class="text-[11px] text-mid-grey font-mono tabular-nums">
				Min stable generation: {minGeneration} MW
			</span>
		{/if}
	</div>

	{#if unitAvailability?.length}
		<div class="border-t border-warm-grey pt-3">
			<span class="text-xxs font-medium uppercase tracking-wider text-mid-grey">
				Unit Availability
			</span>
			<div class="mt-1.5 flex flex-col gap-1.5">
				{#each unitAvailability as ua (ua.unit)}
					<div class="flex items-center gap-2">
						<span class="text-xxs font-mono text-mid-grey w-20 truncate" title={ua.unit}>{ua.unit}</span>
						<div class="flex-1 h-4 bg-light-warm-grey rounded-sm overflow-hidden">
							<div
								class="h-full rounded-sm transition-all"
								style="width: {ua.availability}%; background-color: {fuelTechColourMap.coal}"
							></div>
						</div>
						<span class="text-xxs font-mono tabular-nums text-dark-grey w-10 text-right">
							{ua.availability.toFixed(0)}%
						</span>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>
