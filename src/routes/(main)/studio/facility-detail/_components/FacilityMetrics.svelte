<script>
	/**
	 * FacilityMetrics -- router component that renders the correct fuel-tech-specific
	 * metrics panel based on the facility's primary fuel technology group.
	 *
	 * Delegates to WindMetrics, SolarMetrics, BatteryMetrics, CoalMetrics,
	 * GasMetrics, or HydroMetrics for known fuel tech groups. Falls back to
	 * generic universal metrics for unrecognised groups.
	 */

	import { getPrimaryFuelTechGroup } from '../_utils/fuel-tech-group.js';
	import {
		sumSeries,
		getHoursInRange,
		capacityFactor,
		avgPriceReceived
	} from '../_utils/compute-metrics.js';
	import { getNumberFormat } from '$lib/utils/formatters';
	import { fuelTechColourMap } from '$lib/theme/openelectricity';
	import MetricCard from './MetricCard.svelte';
	import SharedContextBar from './SharedContextBar.svelte';
	import WindMetrics from './WindMetrics.svelte';
	import SolarMetrics from './SolarMetrics.svelte';
	import BatteryMetrics from './BatteryMetrics.svelte';
	import CoalMetrics from './CoalMetrics.svelte';
	import GasMetrics from './GasMetrics.svelte';
	import HydroMetrics from './HydroMetrics.svelte';

	/**
	 * @type {{
	 *   facility: {
	 *     network_region?: string,
	 *     units?: Array<{
	 *       code?: string,
	 *       fueltech_id?: string,
	 *       capacity_registered?: number,
	 *       dispatch_type?: string,
	 *       emissions_factor_co2?: number,
	 *       data_first_seen?: string,
	 *       marginal_loss_factor?: number
	 *     }>
	 *   },
	 *   sanityFacility?: Record<string, any> | null,
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

	/** @type {Record<string, string>} Representative colour for each fuel tech group */
	const groupColourMap = {
		wind: fuelTechColourMap.wind,
		solar: fuelTechColourMap.solar,
		battery: fuelTechColourMap.battery,
		coal: fuelTechColourMap.coal,
		gas: fuelTechColourMap.gas,
		hydro: fuelTechColourMap.hydro,
		other: '#7F7F7F'
	};

	/** @type {Record<string, string>} Display label for each fuel tech group */
	const groupLabelMap = {
		wind: 'Wind',
		solar: 'Solar',
		battery: 'Battery',
		coal: 'Coal',
		gas: 'Gas',
		hydro: 'Hydro',
		other: 'Other'
	};

	let fuelTechGroup = $derived(getPrimaryFuelTechGroup(facility?.units ?? []));

	// --- Generic fallback metrics (only used for 'other' fuel tech group) ---

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
	 * Computed universal metrics from summary data.
	 * Returns null when summaryData is not yet available.
	 * Only used for the 'other' fallback panel.
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

		return {
			totalEnergy,
			totalMV,
			cf,
			avgPrice
		};
	});

	/**
	 * Whether the fuel tech group badge should use light text (for dark backgrounds).
	 * @param {string} colour - Hex colour
	 * @returns {boolean}
	 */
	function needsLightText(colour) {
		if (!colour) return false;
		const hex = colour.replace('#', '');
		const r = parseInt(hex.substring(0, 2), 16);
		const g = parseInt(hex.substring(2, 4), 16);
		const b = parseInt(hex.substring(4, 6), 16);
		// Relative luminance approximation
		const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
		return luminance < 0.5;
	}
</script>

<div class="flex flex-col gap-4">
	<div class="flex items-center justify-between gap-2">
		<SharedContextBar {facility} {sanityFacility} />

		{#if fuelTechGroup !== 'other'}
			{@const bgColour = groupColourMap[fuelTechGroup] ?? '#7F7F7F'}
			<span
				class="inline-flex shrink-0 items-center px-2 py-0.5 rounded text-[11px] font-mono font-semibold"
				style="background-color: {bgColour}; color: {needsLightText(bgColour) ? '#fff' : '#1a1a1a'}"
			>
				{groupLabelMap[fuelTechGroup] ?? fuelTechGroup}
			</span>
		{/if}
	</div>

	{#if fuelTechGroup === 'wind'}
		<div class="border border-dashed border-mid-grey rounded p-2">
			<WindMetrics {facility} {sanityFacility} {summaryData} {intervalData} {timeZone} />
		</div>
	{:else if fuelTechGroup === 'solar'}
		<div class="border border-dashed border-mid-grey rounded p-2">
			<SolarMetrics {facility} {sanityFacility} {summaryData} {intervalData} {timeZone} />
		</div>
	{:else if fuelTechGroup === 'battery'}
		<div class="border border-dashed border-mid-grey rounded p-2">
			<BatteryMetrics {facility} {sanityFacility} {summaryData} {intervalData} />
		</div>
	{:else if fuelTechGroup === 'coal'}
		<div class="border border-dashed border-mid-grey rounded p-2">
			<CoalMetrics {facility} {sanityFacility} {summaryData} {intervalData} />
		</div>
	{:else if fuelTechGroup === 'gas'}
		<div class="border border-dashed border-mid-grey rounded p-2">
			<GasMetrics {facility} {sanityFacility} {summaryData} {intervalData} {timeZone} />
		</div>
	{:else if fuelTechGroup === 'hydro'}
		<div class="border border-dashed border-mid-grey rounded p-2">
			<HydroMetrics {facility} {sanityFacility} {summaryData} {intervalData} {timeZone} />
		</div>
	{:else if metrics}
		<div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
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
		<div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
			{#each ['Capacity Factor', 'Total Energy', 'Revenue', 'Avg Price Received'] as label (label)}
				<MetricCard {label} value="--" />
			{/each}
		</div>
	{/if}
</div>
