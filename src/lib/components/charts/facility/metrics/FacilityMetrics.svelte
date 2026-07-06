<script>
	/**
	 * FacilityMetrics — at-a-glance metrics for a facility, computed for the
	 * chart's current date range.
	 *
	 * A single, declarative renderer (not one component per fuel tech): the fuel
	 * group selects an ordered list of metric descriptors from
	 * `metric-definitions.js`, all reading a shared `ctx` built here from the
	 * visible-range data. Coal adds its expected-closure date as a final cell;
	 * per-unit fuel-tech, turbine and equipment detail lives in the units panel.
	 *
	 * Data sources (all already produced by the facility data layer, all keyed on
	 * the visible viewStart/viewEnd so the numbers track the chart):
	 *   • summaryData   — FacilityFinancialDataProvider.onsummarydata (energy + market value)
	 *   • emissionsData — FacilityEmissionsDataProvider.onsummarydata (reported tCO₂)
	 *   • intervalData  — FacilityChart.onvisibledata (raw power, for profile/running hours)
	 */

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
		dcAcRatio,
		isChargingSideUnit,
		storageDurationHours
	} from './metrics-calc.js';
	import { METRICS, resolveMetricKeys } from './metric-definitions.js';
	import { formatTooltipDateTime } from '$lib/components/charts/v2/formatters.js';
	import { ianaFromOffset } from '../../v2/network-time.js';

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

	let ianaTimeZone = $derived(ianaFromOffset(timeZone));

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

	// ── Storage duration (any facility with storage units) ────────────
	// Discharge duration in hours: storage (MWh) ÷ discharge power (MW), scoped
	// to the storage-carrying units so hybrids (e.g. solar + battery) don't
	// dilute the denominator with the co-located tech's capacity. Covers pumped
	// hydro the same way — reservoir energy over turbine capacity. Charging-side
	// units (battery_*_charging, pumps) are skipped: a charge/discharge pair
	// describes one store, and duration means time at full discharge. OE
	// `capacity_storage` is preferred, with the matching Sanity unit's
	// `storage_capacity` as fallback.
	let storageDuration = $derived.by(() => {
		const sanityByCode = new Map(
			(sanityFacility?.units ?? []).map((/** @type {any} */ u) => [u?.code, u])
		);
		let storage = 0;
		let power = 0;
		for (const unit of facility?.units ?? []) {
			const ft = unit.fueltech_id ?? '';
			if (isChargingSideUnit(ft)) continue;
			const unitStorage =
				Number(unit.capacity_storage ?? sanityByCode.get(unit.code)?.storage_capacity) || 0;
			// Battery discharge units always count (a sibling may carry the storage
			// figure); other techs count only when they carry storage themselves.
			if (!ft.startsWith('battery') && unitStorage <= 0) continue;
			storage += unitStorage;
			power += Number(unit.capacity_registered || unit.capacity_maximum) || 0;
		}
		return storageDurationHours(storage, power);
	});

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
		// Storage facilities (batteries, pumped hydro) consume more than they
		// generate — the signed net is negative by physics (round-trip losses),
		// so their headline energy is throughput (|charge| + |discharge|).
		const isStorageFacility = isBattery || pumpedHydro;

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

		const generationEnergy = isStorageFacility ? absEnergy : signedEnergy;
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
			netRevenue: totalMV,
			roundTripEfficiency: charge > 0 ? (discharge / charge) * 100 : null,
			storageDuration,
			dcAc
		};
	});

	let metricKeys = $derived(
		resolveMetricKeys(group, {
			isPeaker,
			hasDcAc: dcAc != null,
			hasStorage: storageDuration != null,
			isPumpedHydro: pumpedHydro
		})
	);

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

	// Fillers keep the 3-col last row full (metric cells + coal's optional
	// expected-closure cell). `closureInfo` is already null unless this is a coal
	// facility; other groups keep their fuel-tech detail in the units panel.
	let fillerCount = $derived((3 - ((metricKeys.length + (closureInfo ? 1 : 0)) % 3)) % 3);
</script>

<!-- Metric grid — flush; the parent (page card / panel wrapper) supplies the
     outer border. Cells carry border-r/border-b; the -mr/-mb pull + overflow
     clip drop the outer right/bottom so they don't double the parent border.
     Coal's expected-closure cell + fillers keep the last row full. -->
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
					description={METRICS[key].description}
				/>
			</div>
		{/each}

		{#if closureInfo}
			<div class="border-r border-b border-mid-warm-grey/40 px-6 py-4">
				<MetricCard
					label="Expected Closure"
					value={formatClosureDate(closureInfo)}
					description="Earliest expected closure date across the facility's units."
				/>
			</div>
		{/if}

		{#each Array.from({ length: fillerCount }) as _filler, i (i)}
			<div class="border-r border-b border-mid-warm-grey/40 px-6 py-4" aria-hidden="true"></div>
		{/each}
	</div>
</div>
