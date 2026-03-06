<script>
	/**
	 * WindMetrics -- fuel-tech-specific metrics panel for wind facilities.
	 *
	 * Displays capacity factor, total energy, average price received,
	 * revenue, peak output, and optional turbine specification details
	 * sourced from Sanity CMS data.
	 */

	import {
		sumSeries,
		getHoursInRange,
		capacityFactor,
		avgPriceReceived,
		peakOutput
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
	 *       unit_types?: string[],
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

	const fmtEnergy = getNumberFormat(0);
	const fmtCf = getNumberFormat(1);
	const fmtPrice = getNumberFormat(2);
	const fmtPeak = getNumberFormat(0);

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

	/**
	 * Unique turbine specifications derived from Sanity unit_types data.
	 * Groups by brand+model, aggregates counts and shows key specs.
	 * @type {string[]}
	 */
	let turbineSpecs = $derived.by(() => {
		if (!sanityFacility?.units?.length) return [];

		/** @type {Record<string, { count: number, size: number | null, height: number | null }>} */
		const specMap = {};

		for (const unit of sanityFacility.units) {
			if (!unit.unit_types?.length) continue;
			for (const ut of unit.unit_types) {
				const brand = ut.unit_brand || '';
				const model = ut.unit_model || '';
				if (!brand && !model) continue;

				const key = `${brand}|${model}`;
				if (!specMap[key]) {
					specMap[key] = {
						count: ut.unit_number || 1,
						size: ut.unit_size || ut.capacity || null,
						height: ut.unit_height || null
					};
				} else {
					specMap[key].count += ut.unit_number || 1;
				}
			}
		}

		/** @type {string[]} */
		const specs = [];
		for (const [key, info] of Object.entries(specMap)) {
			const [brand, model] = key.split('|');
			let label = `${info.count} \u00d7`;
			if (brand) label += ` ${brand}`;
			if (model) label += ` ${model}`;
			if (info.size) label += ` ${info.size} MW`;
			if (info.height) label += `, ${info.height}m`;
			specs.push(label);
		}

		return specs;
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
				label="Total Energy"
				value={fmtEnergy.format(metrics.totalEnergy)}
				unit="MWh"
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

			<MetricCard
				label="Peak Output"
				value="{fmtPeak.format(metrics.peak)} / {fmtPeak.format(totalCapacity)}"
				unit="MW"
			/>
		</div>
	{:else}
		<div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
			{#each ['Capacity Factor', 'Total Energy', 'Avg Price Received', 'Revenue', 'Peak Output'] as label (label)}
				<MetricCard {label} value="--" />
			{/each}
		</div>
	{/if}

	{#if turbineSpecs.length > 0}
		<div class="border-t border-warm-grey pt-3">
			<span class="text-xxs font-medium uppercase tracking-wider text-mid-grey">
				Turbine Specs
			</span>
			<div class="mt-1 flex flex-col gap-0.5">
				{#each turbineSpecs as spec (spec)}
					<span class="text-xs text-dark-grey">{spec}</span>
				{/each}
			</div>
		</div>
	{/if}

	{#if dailyProfile}
		<DailyProfileChart profile={dailyProfile} colour={fuelTechColourMap.wind} />
	{/if}
</div>
