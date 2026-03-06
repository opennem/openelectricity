<script>
	/**
	 * BatteryMetrics -- fuel-tech-specific metrics panel for battery facilities.
	 *
	 * Batteries have both GENERATOR (discharge) and LOAD (charge) units. In the
	 * facility explorer, battery units are already filtered to `fueltech_id: 'battery'`
	 * with `dispatch_type: 'GENERATOR'`. The summary data treats the single battery
	 * unit as bidirectional -- energy can be positive (discharge) or negative (charge)
	 * in the same series.
	 */

	import {
		sumSeries,
		getHoursInRange,
		capacityFactor
	} from '../_utils/compute-metrics.js';
	import { getNumberFormat } from '$lib/utils/formatters';
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
	 *       storage_capacity?: number,
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
	const fmtDuration = getNumberFormat(1);

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
	 * Total registered capacity across generator units (MW).
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
	 * Storage capacity from Sanity -- first unit that has it.
	 */
	let storageCapacity = $derived.by(() => {
		if (!sanityFacility?.units?.length) return null;
		for (const unit of sanityFacility.units) {
			if (unit.storage_capacity != null && unit.storage_capacity > 0) {
				return unit.storage_capacity;
			}
		}
		return null;
	});

	/**
	 * Storage duration in hours: storageCapacity / totalCapacity.
	 */
	let storageDuration = $derived.by(() => {
		if (storageCapacity == null || totalCapacity <= 0) return null;
		return storageCapacity / totalCapacity;
	});

	/**
	 * Equipment specs from Sanity unit_types.
	 */
	let equipmentSpecs = $derived.by(() => {
		if (!sanityFacility?.units?.length) return [];

		/** @type {Array<{ brand: string, model: string }>} */
		const specs = [];
		/** @type {Record<string, true>} */
		const seen = {};

		for (const unit of sanityFacility.units) {
			if (!unit.unit_types?.length) continue;
			for (const ut of unit.unit_types) {
				const brand = ut.unit_brand ?? '';
				const model = ut.unit_model ?? '';
				if (!brand && !model) continue;
				const key = `${brand}|${model}`;
				if (seen[key]) continue;
				seen[key] = true;
				specs.push({ brand, model });
			}
		}

		return specs;
	});

	/**
	 * Computed battery metrics from summary data.
	 */
	let metrics = $derived.by(() => {
		if (!summaryData?.energyData?.length) return null;

		const { energyData, mvData, energySeriesNames, mvSeriesNames } = summaryData;

		// Sum total energy (absolute) and net market value
		let totalEnergy = 0;
		let netMV = 0;

		for (const name of energySeriesNames) {
			const seriesTotal = sumSeries(energyData, name);
			totalEnergy += Math.abs(seriesTotal);
		}

		for (const name of mvSeriesNames) {
			netMV += sumSeries(mvData, name);
		}

		const hours = getHoursInRange(energyData);
		const cf = capacityFactor(totalEnergy, totalCapacity, hours);

		return {
			netMV,
			totalEnergy,
			cf,
			hours
		};
	});
</script>

<div class="flex flex-col gap-4">
	{#if metrics}
		<div class="grid grid-cols-2 gap-4 sm:grid-cols-3">
			<MetricCard
				label="Net Revenue"
				value={formatRevenue(metrics.netMV)}
				subtitle="Energy arbitrage only -- FCAS not included"
			/>

			<MetricCard
				label="Storage Duration"
				value={storageDuration != null ? fmtDuration.format(storageDuration) : '--'}
				unit={storageDuration != null ? 'hours' : ''}
			/>

			<MetricCard
				label="Round-trip Efficiency"
				value="--"
				subtitle="Requires interval data"
			/>

			<MetricCard
				label="Total Energy"
				value={fmtEnergy.format(metrics.totalEnergy)}
				unit="MWh"
			/>

			<MetricCard
				label="Capacity Factor"
				value={fmtCf.format(metrics.cf)}
				unit="%"
			/>
		</div>
	{:else}
		<div class="grid grid-cols-2 gap-4 sm:grid-cols-3">
			{#each ['Net Revenue', 'Storage Duration', 'Round-trip Efficiency', 'Total Energy', 'Capacity Factor'] as label (label)}
				<MetricCard {label} value="--" />
			{/each}
		</div>
	{/if}

	{#if equipmentSpecs.length > 0}
		<div class="border-t border-light-warm-grey pt-3">
			<span class="text-xxs font-medium uppercase tracking-wider text-mid-grey">
				Equipment
			</span>

			<div class="mt-1.5 flex flex-wrap gap-2">
				{#each equipmentSpecs as spec (spec.brand + spec.model)}
					<span class="inline-flex items-center gap-1 rounded bg-light-warm-grey px-2 py-0.5 text-[11px] font-mono text-dark-grey">
						{#if spec.brand}
							<span class="font-semibold">{spec.brand}</span>
						{/if}
						{#if spec.model}
							<span>{spec.model}</span>
						{/if}
					</span>
				{/each}
			</div>
		</div>
	{/if}
</div>
