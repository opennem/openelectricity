<script>
	/**
	 * FacilityMetrics — at-a-glance metrics for a facility, computed for the
	 * chart's current date range.
	 *
	 * A single, declarative renderer (not one component per fuel tech): the fuel
	 * group selects an ordered list of metric descriptors from
	 * `metric-definitions.js`, all reading a shared `ctx` built here from the
	 * visible-range data. Group-specific "garnishes" (badges, DC:AC detail,
	 * turbine/equipment specs, unit availability) hang off the same context.
	 *
	 * Data sources (all already produced by the facility data layer, all keyed on
	 * the visible viewStart/viewEnd so the numbers track the chart):
	 *   • summaryData   — FacilityFinancialDataProvider.onsummarydata (energy + market value)
	 *   • emissionsData — FacilityEmissionsDataProvider.onsummarydata (reported tCO₂)
	 *   • intervalData  — FacilityChart.onvisibledata (raw power, for profile/running hours)
	 */

	import { fuelTechColourMap } from '$lib/theme/openelectricity';
	import MetricCard from './MetricCard.svelte';
	import { getPrimaryFuelTechGroup, isGasPeaker, isPumpedHydro } from './fuel-group.js';
	import {
		sumAllSeries,
		getHoursInRange,
		getIntervalHours,
		isSubDailyData,
		capacityFactor,
		avgPriceReceived,
		peakBucket,
		runningHours,
		startCount,
		dcAcRatio,
		computeUnitAvailability
	} from './metrics-calc.js';
	import { METRICS, resolveMetricKeys } from './metric-definitions.js';
	import { formatTooltipDateTime } from '$lib/components/charts/v2/formatters.js';

	/**
	 * `onpeakhighlight` is called with the peak bucket's timestamp (ms) when the
	 * Peak Output / Peak Energy cell is hovered, and `undefined` on leave — the
	 * page wires it to the shared chart hover time so the peak period is annotated
	 * on the chart. `displayInterval` is used to label the peak period (matching
	 * the chart's own tooltip date).
	 * @type {{
	 *   facility: any,
	 *   sanityFacility?: any | null,
	 *   summaryData?: { mvData: any[], energyData: any[], mvSeriesNames: string[], energySeriesNames: string[] } | null,
	 *   emissionsData?: { rows: any[], seriesNames: string[] } | null,
	 *   intervalData?: { data: any[], seriesNames: string[], seriesLabels: Record<string, string> } | null,
	 *   timeZone?: string,
	 *   displayInterval?: string,
	 *   onpeakhighlight?: (time: number | undefined) => void
	 * }}
	 */
	let {
		facility,
		sanityFacility = null,
		summaryData = null,
		emissionsData = null,
		intervalData = null,
		timeZone = '+10:00',
		displayInterval = '30m',
		onpeakhighlight
	} = $props();

	let ianaTimeZone = $derived(timeZone === '+08:00' ? 'Australia/Perth' : 'Australia/Brisbane');

	let group = $derived(getPrimaryFuelTechGroup(facility?.units ?? []));

	let totalCapacity = $derived.by(() => {
		let sum = 0;
		for (const unit of facility?.units ?? []) sum += unit.capacity_registered || 0;
		return sum;
	});

	// ── DC:AC ratio (solar, Sanity-sourced) ──────────────────────────
	let dcAc = $derived.by(() => {
		if (group !== 'solar' || !sanityFacility?.units?.length) return null;
		let totalDC = 0;
		let totalAC = 0;
		for (const unit of sanityFacility.units) {
			totalDC += unit.capacity_registered || 0;
			totalAC += unit.capacity_maximum || 0;
		}
		const ratio = dcAcRatio(totalDC, totalAC);
		return ratio == null ? null : { ratio, dcMW: totalDC, acMW: totalAC };
	});

	// ── Storage capacity / duration (battery, Sanity-sourced) ─────────
	let storageCapacity = $derived.by(() => {
		for (const unit of sanityFacility?.units ?? []) {
			if (unit.storage_capacity != null && unit.storage_capacity > 0) return unit.storage_capacity;
		}
		return null;
	});
	let storageDuration = $derived(
		storageCapacity != null && totalCapacity > 0 ? storageCapacity / totalCapacity : null
	);

	let isPeaker = $derived(group === 'gas' && isGasPeaker(facility?.units ?? []));
	let pumpedHydro = $derived(group === 'hydro' && isPumpedHydro(facility?.units ?? []));

	// ── Shared metrics context ────────────────────────────────────────
	/** @type {import('./metric-definitions.js').MetricsContext} */
	let ctx = $derived.by(() => {
		const eData = summaryData?.energyData ?? [];
		const eNames = summaryData?.energySeriesNames ?? [];
		const mData = summaryData?.mvData ?? [];
		const mNames = summaryData?.mvSeriesNames ?? [];
		const hasSummary = eData.length > 0;
		const isBattery = group === 'battery';

		// Split signed energy so batteries can report throughput + round-trip.
		let signedEnergy = 0;
		let absEnergy = 0;
		let discharge = 0;
		let charge = 0;
		for (const row of eData) {
			for (const name of eNames) {
				const v = row[name];
				if (typeof v === 'number' && !isNaN(v)) {
					signedEnergy += v;
					absEnergy += Math.abs(v);
					if (v > 0) discharge += v;
					else charge += -v;
				}
			}
		}

		const generationEnergy = isBattery ? absEnergy : signedEnergy;
		const hours = getHoursInRange(eData);
		const totalMV = sumAllSeries(mData, mNames);

		// Emissions come from reported tCO₂ over the visible range (energy-weighted
		// intensity), not a static factor — accurate without Sanity.
		const em = emissionsData;
		const hasEmissions = (em?.rows?.length ?? 0) > 0;
		const totalEmissions = em && hasEmissions ? sumAllSeries(em.rows, em.seriesNames) : 0;
		const emissionsIntensity =
			hasEmissions && signedEnergy > 0 ? (totalEmissions * 1000) / signedEnergy : null;

		// Interval-derived metrics need sub-daily (power) data.
		const iData = intervalData?.data ?? [];
		const iNames = intervalData?.seriesNames ?? [];
		const hasSubDaily = iData.length > 1 && isSubDailyData(iData);
		const intervalMinutes = hasSubDaily ? getIntervalHours(iData) * 60 : 0;

		// Peak bucket: when the energy series is sub-daily (power mode) report the
		// peak instantaneous power (MW, energy ÷ interval); otherwise the bucket is
		// already energy, so report the highest-energy period raw (MWh).
		const peakIsPower = isSubDailyData(eData);
		const pk = peakBucket(eData, eNames, peakIsPower ? getIntervalHours(eData) : 0);
		const peak =
			pk && pk.value > 0
				? {
						value: pk.value,
						time: pk.time,
						isPower: peakIsPower,
						periodLabel: formatTooltipDateTime(pk.date, ianaTimeZone, displayInterval)
					}
				: null;

		return {
			hasSummary,
			hasEmissions,
			hasSubDaily,
			totalCapacity,
			totalEnergy: generationEnergy,
			totalMV,
			capacityFactor: capacityFactor(generationEnergy, totalCapacity, hours),
			avgPrice: avgPriceReceived(totalMV, generationEnergy),
			peak,
			totalEmissions,
			emissionsIntensity,
			runningHours: hasSubDaily ? runningHours(iData, iNames, intervalMinutes) : 0,
			startCount: hasSubDaily ? startCount(iData, iNames) : 0,
			netRevenue: totalMV,
			roundTripEfficiency: charge > 0 ? (discharge / charge) * 100 : null,
			storageDuration,
			dcAc
		};
	});

	let metricKeys = $derived(resolveMetricKeys(group, { isPeaker, hasDcAc: dcAc != null }));

	// ── Garnish: fuel-specific badges ─────────────────────────────────
	/** @type {Record<string, string>} */
	const gasSubtypeLabels = {
		gas_ccgt: 'CCGT',
		gas_ocgt: 'OCGT',
		gas_steam: 'Gas Steam',
		gas_recip: 'Reciprocating',
		gas_wcmg: 'Waste Coal Mine Gas',
		distillate: 'Distillate'
	};

	let coalType = $derived.by(() => {
		if (group !== 'coal') return null;
		let black = 0;
		let brown = 0;
		for (const unit of facility?.units ?? []) {
			const cap = unit.capacity_registered || 0;
			if (unit.fueltech_id === 'coal_black') black += cap;
			else if (unit.fueltech_id === 'coal_brown') brown += cap;
		}
		if (black === 0 && brown === 0) return null;
		return black >= brown ? 'black' : 'brown';
	});

	let gasSubtype = $derived.by(() => {
		if (group !== 'gas') return null;
		/** @type {Record<string, number>} */
		const byType = {};
		for (const unit of facility?.units ?? []) {
			const ft = unit.fueltech_id ?? '';
			if (gasSubtypeLabels[ft]) byType[ft] = (byType[ft] || 0) + (unit.capacity_registered || 0);
		}
		let maxType = null;
		let maxCap = 0;
		for (const [ft, cap] of Object.entries(byType)) {
			if (cap > maxCap) {
				maxCap = cap;
				maxType = ft;
			}
		}
		return maxType;
	});

	let closureInfo = $derived.by(() => {
		if (group !== 'coal' || !sanityFacility?.units?.length) return null;
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
		return earliest ? { date: earliest, specificity: specificity ?? 'year' } : null;
	});

	/** @param {{ date: string, specificity: 'year' | 'month' | 'day' }} info */
	function formatClosureDate(info) {
		const d = new Date(info.date);
		if (isNaN(d.getTime())) return info.date;
		const months = [
			'January',
			'February',
			'March',
			'April',
			'May',
			'June',
			'July',
			'August',
			'September',
			'October',
			'November',
			'December'
		];
		switch (info.specificity) {
			case 'day':
				return `${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
			case 'month':
				return `${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
			default:
				return `${d.getUTCFullYear()}`;
		}
	}

	// ── Garnish: equipment specs (wind / battery, Sanity-sourced) ─────
	let turbineSpecs = $derived.by(() => {
		if (group !== 'wind' || !sanityFacility?.units?.length) return [];
		/** @type {Record<string, { count: number, size: number | null, height: number | null }>} */
		const specMap = {};
		for (const unit of sanityFacility.units) {
			for (const ut of unit.unit_types ?? []) {
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
			let label = `${info.count} ×`;
			if (brand) label += ` ${brand}`;
			if (model) label += ` ${model}`;
			if (info.size) label += ` ${info.size} MW`;
			if (info.height) label += `, ${info.height}m`;
			specs.push(label);
		}
		return specs;
	});

	let equipmentSpecs = $derived.by(() => {
		if (group !== 'battery' || !sanityFacility?.units?.length) return [];
		/** @type {Array<{ brand: string, model: string }>} */
		const specs = [];
		/** @type {Record<string, true>} */
		const seen = {};
		for (const unit of sanityFacility.units) {
			for (const ut of unit.unit_types ?? []) {
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

	// ── Garnish: unit availability (coal) ─────────────────────────────
	let unitAvailability = $derived.by(() => {
		if (group !== 'coal' || !intervalData?.data?.length || !isSubDailyData(intervalData.data))
			return null;
		return computeUnitAvailability(intervalData.data, intervalData.seriesNames);
	});

	/**
	 * Whether a badge background needs light text.
	 * @param {string} colour
	 */
	function needsLightText(colour) {
		if (!colour) return false;
		const hex = colour.replace('#', '');
		const r = parseInt(hex.substring(0, 2), 16);
		const g = parseInt(hex.substring(2, 4), 16);
		const b = parseInt(hex.substring(4, 6), 16);
		return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.5;
	}

	// Coal/gas get a fuel badge in the grid (last cell, before fillers): coal type
	// + expected closure, or gas subtype + peaker. Other groups have no badge cell.
	let badgeCell = $derived.by(() => {
		if (group === 'coal' && coalType)
			return { kind: /** @type {'coal'} */ ('coal'), coalType, closure: closureInfo };
		if (group === 'gas' && gasSubtype)
			return { kind: /** @type {'gas'} */ ('gas'), subtype: gasSubtype, isPeaker };
		return null;
	});

	// Fillers keep the 3-col last row full (metric cells + optional badge cell).
	let fillerCount = $derived((3 - ((metricKeys.length + (badgeCell ? 1 : 0)) % 3)) % 3);
</script>

<div>
	<!-- Metric grid — flush; the parent (page card / panel wrapper) supplies the
	     outer border. Cells carry border-r/border-b; the -mr/-mb pull + overflow
	     clip drop the outer right/bottom so they don't double the parent border.
	     A coal/gas badge cell + fillers keep the last row full. -->
	<div class="overflow-hidden">
		<div class="grid grid-cols-2 sm:grid-cols-3 -mr-px -mb-px">
			{#each metricKeys as key (key)}
				{@const result = METRICS[key].compute(ctx)}
				{@const interactive = result.highlightTime != null}
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div
					class="border-r border-b border-mid-warm-grey/40 px-6 py-4 {interactive
						? 'cursor-help transition-colors hover:bg-light-warm-grey/40'
						: ''}"
					onmouseenter={interactive ? () => onpeakhighlight?.(result.highlightTime) : undefined}
					onmouseleave={interactive ? () => onpeakhighlight?.(undefined) : undefined}
				>
					<MetricCard
						label={result.label ?? METRICS[key].label}
						value={result.value}
						unit={result.unit ?? ''}
						subtitle={result.subtitle ?? ''}
					/>
				</div>
			{/each}

			{#if badgeCell}
				<div class="flex items-center gap-3 border-r border-b border-mid-warm-grey/40 px-6 py-4">
					{#if badgeCell.kind === 'coal'}
						{@const colour =
							badgeCell.coalType === 'black'
								? fuelTechColourMap.coal_black
								: fuelTechColourMap.coal_brown}
						<span
							class="inline-flex shrink-0 items-center rounded px-2 py-1 text-xs font-semibold"
							style="background-color: {colour}; color: #fff"
						>
							{badgeCell.coalType === 'black' ? 'Black Coal' : 'Brown Coal'}
						</span>
						{#if badgeCell.closure}
							<span class="flex flex-col leading-tight">
								<span class="text-xxs text-mid-grey">Closure</span>
								<span class="text-xs text-dark-grey">{formatClosureDate(badgeCell.closure)}</span>
							</span>
						{/if}
					{:else}
						{@const bg = fuelTechColourMap[badgeCell.subtype] ?? '#7F7F7F'}
						<span
							class="inline-flex shrink-0 items-center rounded px-2 py-1 text-xs font-semibold"
							style="background-color: {bg}; color: {needsLightText(bg) ? '#fff' : '#1a1a1a'}"
						>
							{gasSubtypeLabels[badgeCell.subtype] ?? badgeCell.subtype}
						</span>
						{#if badgeCell.isPeaker}<span class="text-xs text-mid-grey">Peaker plant</span>{/if}
					{/if}
				</div>
			{/if}

			{#each Array.from({ length: fillerCount }) as _filler, i (i)}
				<div class="border-r border-b border-mid-warm-grey/40 px-6 py-4" aria-hidden="true"></div>
			{/each}
		</div>
	</div>

	{#if pumpedHydro}
		<div class="border-t border-mid-warm-grey/40 px-6 py-3">
			<span
				class="inline-flex items-center rounded px-2 py-0.5 text-[11px] font-mono font-semibold"
				style="background-color: #88AFD0; color: #1a1a1a">Pumped Hydro</span
			>
		</div>
	{/if}

	{#if turbineSpecs.length}
		<div class="border-t border-mid-warm-grey/40 px-6 py-4">
			<span class="text-xxs font-medium uppercase tracking-wider text-mid-grey">Turbine Specs</span>
			<div class="mt-1 flex flex-col gap-0.5">
				{#each turbineSpecs as spec (spec)}
					<span class="text-xs text-dark-grey">{spec}</span>
				{/each}
			</div>
		</div>
	{/if}

	{#if equipmentSpecs.length}
		<div class="border-t border-mid-warm-grey/40 px-6 py-4">
			<span class="text-xxs font-medium uppercase tracking-wider text-mid-grey">Equipment</span>
			<div class="mt-1.5 flex flex-wrap gap-2">
				{#each equipmentSpecs as spec (spec.brand + spec.model)}
					<span
						class="inline-flex items-center gap-1 rounded bg-light-warm-grey px-2 py-0.5 text-[11px] font-mono text-dark-grey"
					>
						{#if spec.brand}<span class="font-semibold">{spec.brand}</span>{/if}
						{#if spec.model}<span>{spec.model}</span>{/if}
					</span>
				{/each}
			</div>
		</div>
	{/if}

	{#if unitAvailability?.length}
		<div class="border-t border-mid-warm-grey/40 px-6 py-4">
			<span class="text-xxs font-medium uppercase tracking-wider text-mid-grey"
				>Unit Availability</span
			>
			<div class="mt-1.5 flex flex-col gap-1.5">
				{#each unitAvailability as ua (ua.seriesName)}
					<div class="flex items-center gap-2">
						<span class="text-xxs font-mono text-mid-grey w-20 truncate" title={ua.unit}
							>{ua.unit}</span
						>
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
