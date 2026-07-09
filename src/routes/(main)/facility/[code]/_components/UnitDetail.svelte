<script>
	/**
	 * UnitDetail — the per-unit slide-out body rendered inside the units `Sheet`.
	 *
	 * Joins the live OE-API unit (status, live capacity, data dates) with the
	 * Sanity enrichment record (equipment, lifecycle dates, approvals, emissions
	 * provenance) and surfaces a comprehensive, fuel-tech-aware detail view.
	 * Sanity fields may be absent — every section guards its own visibility.
	 */

	import { ExternalLink } from '@lucide/svelte';
	import FuelTechBadge from '$lib/components/FuelTechBadge.svelte';
	import FacilityStatusIcon from '$lib/components/facilities/FacilityStatusIcon.svelte';
	import { getFueltechColor, needsDarkText } from '$lib/utils/fueltech-display';
	import { fuelTechNameMap } from '$lib/fuel_techs';
	import { getNumberFormat, formatCapacity, formatDateTime } from '$lib/utils/formatters';
	import { formatDateBySpecificity, stripDateTimezone } from '$lib/utils/date-format.js';
	import { fuelTechToGroup } from '$lib/fuel-tech-groups/facility-group.js';
	import {
		dcAcRatio,
		isChargingSideUnit,
		storageDurationHours
	} from '$lib/components/charts/facility/metrics/metrics-calc.js';
	import { METRICS } from '$lib/components/charts/facility/metrics/metric-definitions.js';
	import MetricCard from '$lib/components/charts/facility/metrics/MetricCard.svelte';
	import UnitCharts from './UnitCharts.svelte';
	import { sectionCardClass } from '../_utils/section-card.js';

	/**
	 * `facility` powers the per-unit snapshot charts — the unit is charted by
	 * handing the facility-page charts a clone containing just this unit
	 * (processFacilityPower only plots units present in unitFuelTechMap).
	 * @type {{
	 *   unit: any,
	 *   facility?: any | null,
	 *   sanityUnit?: any | null,
	 *   timeZone?: string
	 * }}
	 */
	let { unit, facility = null, sanityUnit = null, timeZone = '+10:00' } = $props();

	const fmt0 = getNumberFormat(0);

	// Tooltip copy shared with the facility metrics grid so the two never drift.
	const STORAGE_DURATION_DESCRIPTION = METRICS.storageDuration.description;
	const MIN_STABLE_GEN_DESCRIPTION = 'The lowest output the unit can hold stably while running.';
	const fmt1 = getNumberFormat(1);
	const fmt2 = getNumberFormat(2);

	/**
	 * Gas sub-technology labels keyed by fueltech code.
	 * @type {Record<string, string>}
	 */
	const GAS_SUBTYPE = {
		gas_ccgt: 'Combined cycle (CCGT)',
		gas_ccgt_ccs: 'CCGT + carbon capture',
		gas_ocgt: 'Open cycle (OCGT)',
		gas_recip: 'Reciprocating engine',
		gas_steam: 'Steam turbine',
		gas_wcmg: 'Waste coal mine gas',
		gas_hydrogen: 'Hydrogen',
		distillate: 'Distillate'
	};

	/**
	 * @param {any} v
	 * @returns {boolean}
	 */
	function has(v) {
		return v !== null && v !== undefined && v !== '';
	}

	/**
	 * Emissions factor tCO₂/MWh → kgCO₂/MWh.
	 * @param {number | null | undefined} v
	 * @returns {string}
	 */
	function formatEmissions(v) {
		if (!has(v)) return '-';
		return fmt0.format(Number(v) * 1000);
	}

	/**
	 * @param {string | null | undefined} date
	 * @param {string | null | undefined} [specificity]
	 * @returns {string}
	 */
	function fmtDate(date, specificity) {
		return formatDateBySpecificity(date, specificity ?? 'day', timeZone);
	}

	/** Human timezone label for the network offset (NEM → AEST, WEM → AWST). */
	const TZ_LABEL = /** @type {Record<string, string>} */ ({ '+10:00': 'AEST', '+08:00': 'AWST' });

	/**
	 * Format a data timestamp with time and timezone, in network-local wall-clock —
	 * mirrors the facilities-page convention of stripping the source offset and
	 * re-applying the network offset.
	 * @param {string | null | undefined} dateValue
	 * @returns {string}
	 */
	function fmtDateTime(dateValue) {
		if (!has(dateValue)) return '-';
		const d = new Date(stripDateTimezone(/** @type {string} */ (dateValue)) + timeZone);
		if (isNaN(d.getTime())) return '-';
		const formatted = formatDateTime({
			date: d,
			timeZone,
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit',
			hour12: true
		});
		return `${formatted} ${TZ_LABEL[timeZone] ?? `UTC${timeZone}`}`;
	}

	/**
	 * @param {string | null | undefined} d
	 * @returns {string}
	 */
	function dispatchLabel(d) {
		if (!d) return '-';
		return d.charAt(0).toUpperCase() + d.slice(1).toLowerCase();
	}

	/**
	 * Construction cost is stored in millions of AUD (e.g. 150 → "$150m").
	 * @param {number | null | undefined} v
	 * @returns {string}
	 */
	function formatCost(v) {
		if (!has(v)) return '-';
		const n = /** @type {number} */ (v);
		return n >= 1000 ? '$' + fmt1.format(n / 1000) + 'b' : '$' + fmt0.format(n) + 'm';
	}

	/**
	 * A source value is a link when it's an http(s) URL; otherwise it's a free-text citation.
	 * @param {any} v
	 * @returns {boolean}
	 */
	function isUrl(v) {
		return typeof v === 'string' && /^https?:\/\//i.test(v.trim());
	}

	// The Sanity `epbc_id` is the EPBC Public Portal referral GUID, so it deep-links
	// straight to the referral summary (with `epbc_number` as the visible reference).
	const EPBC_PORTAL_BASE =
		'https://epbcpublicportal.environment.gov.au/all-referrals/project-referral-summary/?id=';

	/**
	 * @param {string} id
	 * @returns {string}
	 */
	function epbcUrl(id) {
		return EPBC_PORTAL_BASE + encodeURIComponent(id);
	}

	let ft = $derived(unit?.fueltech_id ?? '');
	let group = $derived(fuelTechToGroup(ft));
	let ftName = $derived(fuelTechNameMap[ft] || ft);
	let bgColor = $derived(getFueltechColor(ft));
	let isDarkText = $derived(needsDarkText(ft));
	let status = $derived(unit?.status_id ?? sanityUnit?.status ?? null);

	// Prefer live OE values, fall back to Sanity.
	let capacityMax = $derived(unit?.capacity_maximum ?? sanityUnit?.capacity_maximum ?? null);
	let capacityReg = $derived(unit?.capacity_registered ?? sanityUnit?.capacity_registered ?? null);
	let storage = $derived(unit?.capacity_storage ?? sanityUnit?.storage_capacity ?? null);
	let emissions = $derived(unit?.emissions_factor_co2 ?? sanityUnit?.emissions_factor_co2 ?? null);
	let dispatch = $derived(unit?.dispatch_type ?? sanityUnit?.dispatch_type ?? null);
	let mlf = $derived(sanityUnit?.marginal_loss_factor ?? null);
	let minGen = $derived(sanityUnit?.min_generation_capacity ?? null);
	let gridForming = $derived(sanityUnit?.grid_forming ?? null);
	let unitTypes = $derived(sanityUnit?.unit_types ?? []);

	// --- fuel-tech highlight derivations ---
	// DC:AC (inverter loading) ratio — dcAcRatio nulls out ratios that aren't a
	// meaningful oversizing signal (≤1.05 or >3), shared with the facility metrics.
	let dcac = $derived(group === 'solar' ? dcAcRatio(capacityReg, capacityMax) : null);

	// Same formula and capacity precedence as the facility-level metric.
	let storageDuration = $derived(
		storageDurationHours(Number(storage) || 0, Number(capacityReg || capacityMax) || 0)
	);

	let turbineCount = $derived.by(() => {
		if (!unitTypes.length) return null;
		let n = 0;
		let any = false;
		for (const ut of unitTypes) {
			if (has(ut.unit_number)) {
				n += Number(ut.unit_number) || 0;
				any = true;
			}
		}
		return any ? n : null;
	});

	let hubHeight = $derived.by(() => {
		for (const ut of unitTypes) if (has(ut.unit_height)) return ut.unit_height;
		return null;
	});

	let solarMounting = $derived.by(() => {
		for (const ut of unitTypes) if (has(ut.mounting_type)) return ut.mounting_type;
		return null;
	});

	let gasSubtype = $derived(GAS_SUBTYPE[ft] ?? null);
	let isPeaker = $derived(ft === 'gas_ocgt' || ft === 'gas_recip' || ft === 'distillate');
	let hydroLabel = $derived(
		ft === 'pumps' ? 'Pumped storage' : has(storage) ? 'Reservoir' : 'Run-of-river'
	);

	// --- section visibility ---
	let hasLifecycle = $derived(
		has(sanityUnit?.construction_start_date) ||
			has(sanityUnit?.commencement_date) ||
			has(sanityUnit?.expected_operation_date) ||
			has(sanityUnit?.expected_closure_date) ||
			has(sanityUnit?.closure_date)
	);

	// First/last seen describe the observed data window, not the plant lifecycle.
	let hasData = $derived(has(unit?.data_first_seen) || has(unit?.data_last_seen));

	// Approvals grouped by jurisdiction (row) with lodged/approved dates (columns).
	// The federal row IS the EPBC referral — `project_approval_date_source` is the
	// EPBC portal link (built from the same `epbc_id`), so the two are merged.
	let approvalRows = $derived.by(() => {
		if (!sanityUnit) return [];
		/** @type {Array<{ label: string, href: string, lodged: any, approved: any }>} */
		const rows = [];
		if (
			has(sanityUnit.epbc_number) ||
			has(sanityUnit.epbc_id) ||
			has(sanityUnit.project_approval_date) ||
			has(sanityUnit.project_approval_lodgement_date)
		) {
			rows.push({
				label: has(sanityUnit.epbc_number) ? `EPBC ${sanityUnit.epbc_number}` : 'Federal',
				href:
					sanityUnit.project_approval_date_source ||
					(has(sanityUnit.epbc_id) ? epbcUrl(sanityUnit.epbc_id) : ''),
				lodged: sanityUnit.project_approval_lodgement_date,
				approved: sanityUnit.project_approval_date
			});
		}
		if (
			has(sanityUnit.state_approval_date) ||
			has(sanityUnit.state_lodgement_date) ||
			has(sanityUnit.state_approval_source)
		) {
			rows.push({
				label: 'State',
				href: sanityUnit.state_approval_source || '',
				lodged: sanityUnit.state_lodgement_date,
				approved: sanityUnit.state_approval_date
			});
		}
		return rows;
	});

	let hasApprovals = $derived(
		has(sanityUnit?.construction_cost) ||
			sanityUnit?.commissioning_confirmed === true ||
			approvalRows.length > 0
	);

	// ── Metric grid (fuel-tech highlights + key stats, facility-metrics style) ──
	/** @type {{ label: string, value: string, unit?: string, source?: string, description?: string }[]} */
	let highlightStats = $derived.by(() => {
		/** @type {{ label: string, value: string, unit?: string, source?: string, description?: string }[]} */
		const out = [];
		if (group === 'solar') {
			if (has(capacityReg))
				out.push({ label: 'DC array', value: formatCapacity(capacityReg), unit: 'MW' });
			if (has(capacityMax))
				out.push({ label: 'AC connection', value: formatCapacity(capacityMax), unit: 'MW' });
			if (dcac)
				out.push({
					label: 'DC:AC',
					value: fmt2.format(dcac),
					description: METRICS.dcac.description
				});
		} else if (group === 'battery') {
			if (storageDuration)
				out.push({
					label: 'Storage duration',
					value: fmt1.format(storageDuration),
					unit: 'h',
					description: STORAGE_DURATION_DESCRIPTION
				});
			if (gridForming !== null)
				out.push({
					label: 'Grid forming',
					value: gridForming ? 'Yes' : 'No',
					description:
						'Whether the inverter can set grid voltage and frequency itself rather than only following the grid.'
				});
		} else if (group === 'wind') {
			if (turbineCount) out.push({ label: 'Turbines', value: fmt0.format(turbineCount) });
			if (hubHeight) out.push({ label: 'Hub height', value: fmt0.format(hubHeight), unit: 'm' });
		} else if (group === 'coal') {
			if (has(minGen))
				out.push({
					label: 'Min stable gen',
					value: formatCapacity(minGen),
					unit: 'MW',
					description: MIN_STABLE_GEN_DESCRIPTION
				});
		} else if (group === 'gas' && gasSubtype) {
			out.push({ label: 'Configuration', value: gasSubtype });
			out.push({ label: 'Role', value: isPeaker ? 'Peaker' : 'Baseload / mid-merit' });
		} else if (group === 'hydro') {
			out.push({ label: 'Type', value: hydroLabel });
			if (has(minGen))
				out.push({
					label: 'Min stable gen',
					value: formatCapacity(minGen),
					unit: 'MW',
					description: MIN_STABLE_GEN_DESCRIPTION
				});
		}
		return out;
	});

	/** @type {{ label: string, value: string, unit?: string, source?: string, description?: string }[]} */
	let keyStats = $derived.by(() => {
		/** @type {{ label: string, value: string, unit?: string, source?: string, description?: string }[]} */
		const out = [];
		if (group !== 'solar') {
			// Solar capacity is shown in full (DC array + AC connection) above.
			out.push({
				label: 'Capacity',
				value: formatCapacity(capacityMax ?? capacityReg),
				unit: 'MW',
				description: 'Maximum where available, otherwise registered.'
			});
		}
		if (has(storage)) out.push({ label: 'Storage', value: formatCapacity(storage), unit: 'MWh' });
		// Storage duration applies to any storage-carrying discharge unit (pumped
		// hydro reservoirs included) — but not to the pumping/charging side, whose
		// capacity is fill power, not discharge power. Battery units already show
		// it in their highlight row.
		if (group !== 'battery' && storageDuration && !isChargingSideUnit(ft))
			out.push({
				label: 'Storage duration',
				value: fmt1.format(storageDuration),
				unit: 'h',
				description: STORAGE_DURATION_DESCRIPTION
			});
		if (has(emissions) && emissions > 0)
			out.push({
				label: 'Emissions',
				value: formatEmissions(emissions),
				unit: 'kg CO₂/MWh',
				source: sanityUnit?.emissions_factor_source ?? undefined,
				description:
					'Emissions factor: kilograms of CO₂-equivalent emitted per megawatt hour generated.'
			});
		if (has(dispatch))
			out.push({
				label: 'Dispatch',
				value: dispatchLabel(dispatch),
				description:
					'How the unit participates in the market: a generator sells energy, a load consumes it, bidirectional units do both.'
			});
		if (has(mlf))
			out.push({
				label: 'Loss factor',
				value: fmt2.format(mlf),
				unit: 'MLF',
				description:
					'Marginal loss factor: the transmission-loss adjustment applied to output when settled at the regional reference node.'
			});
		return out;
	});

	let metricStats = $derived([...highlightStats, ...keyStats]);

	// Facility clone carrying only this unit — drives the per-unit snapshot charts.
	let unitFacility = $derived(facility && unit ? { ...facility, units: [unit] } : null);
</script>

{#snippet extLink(/** @type {string} */ href, /** @type {string} */ label)}
	<a
		{href}
		target="_blank"
		rel="noopener noreferrer"
		class="inline-flex items-center gap-0.5 underline hover:text-dark-grey"
	>
		{label}
		<ExternalLink size={10} />
	</a>
{/snippet}

{#snippet defRow(
	/** @type {string} */ label,
	/** @type {string | number} */ value,
	/** @type {string} */ source = ''
)}
	<div class="flex items-baseline justify-between gap-4 py-1">
		<dt class="text-xs text-mid-grey">
			{#if isUrl(source)}{@render extLink(source, label)}{:else}{label}{/if}
		</dt>
		<dd class="m-0 text-right text-sm text-dark-grey">{value}</dd>
	</div>
{/snippet}

{#snippet sourceNote(/** @type {string} */ label, /** @type {string} */ value)}
	<p class="mt-2 text-xxs text-mid-grey">
		{#if isUrl(value)}{@render extLink(value, label)}{:else}{label}: {value}{/if}
	</p>
{/snippet}

{#snippet cardHeader(/** @type {string} */ title)}
	<div class="border-b border-mid-warm-grey/40 px-6 py-3">
		<h3 class="m-0 text-sm font-semibold text-dark-grey">{title}</h3>
	</div>
{/snippet}

<!-- Card stack matching the facility page's main column: standalone card
     sections on a light-warm-grey backdrop. -->
<div class="min-h-full space-y-4 bg-light-warm-grey p-4">
	<!-- Metrics — same bordered-cell grid as the facility page metrics section
	     (cells carry border-r/border-b; the -mr/-mb pull + overflow clip drop the
	     outer edges; a filler keeps an odd last row full). Fuel identity and
	     status lead the grid as metrics of their own. The inner wrapper keeps
	     clipping at every breakpoint so the pulled borders never show. -->
	<div class={sectionCardClass}>
		<div class="overflow-hidden">
			<div class="grid grid-cols-2 -mb-px -mr-px">
				<div class="border-r border-b border-mid-warm-grey/40 px-6 py-4">
					<div class="flex flex-col gap-0.5">
						<span class="text-xxs font-medium uppercase tracking-wider text-mid-grey">Fuel</span>
						<span class="flex items-center gap-2">
							<span
								class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full {isDarkText
									? 'text-black'
									: 'text-white'}"
								style="background-color: {bgColor};"
							>
								<FuelTechBadge fuelTech={ft} iconOnly iconSize={4} />
							</span>
							<span class="text-base font-semibold text-dark-grey">{ftName}</span>
						</span>
					</div>
				</div>

				<div class="border-r border-b border-mid-warm-grey/40 px-6 py-4">
					<div class="flex flex-col gap-0.5">
						<span class="text-xxs font-medium uppercase tracking-wider text-mid-grey">Status</span>
						<span class="flex items-center gap-1.5">
							<FacilityStatusIcon {status} isCommissioning={unit?.isCommissioning ?? false} />
							<span class="text-base font-semibold capitalize text-dark-grey">{status ?? '—'}</span>
						</span>
					</div>
				</div>

				{#each metricStats as s (s.label)}
					<div class="border-r border-b border-mid-warm-grey/40 px-6 py-4">
						<MetricCard
							size="sm"
							label={s.label}
							value={s.value}
							unit={s.unit ?? ''}
							description={s.description ?? ''}
						/>
						{#if s.source}
							{@render sourceNote('Source', s.source)}
						{/if}
					</div>
				{/each}
				{#if metricStats.length % 2 === 1}
					<div class="border-r border-b border-mid-warm-grey/40 px-6 py-4" aria-hidden="true"></div>
				{/if}
			</div>
		</div>
		{#if group === 'solar' && solarMounting}
			<p class="m-0 px-6 py-3 text-xxs capitalize text-mid-grey">Mounting: {solarMounting}</p>
		{/if}
	</div>

	<!-- Charts — the facility page's charts scoped to just this unit, with their
	     own range/interval/date controls and tap-to-engage pan/zoom in a single
	     card. Keyed on the unit so viewport + load state reset when a different
	     unit opens. -->
	{#if unitFacility}
		<div class="{sectionCardClass} px-6 py-4">
			{#key unit.code}
				<UnitCharts facility={unitFacility} {timeZone} />
			{/key}
		</div>
	{/if}

	<!-- Lifecycle -->
	{#if hasLifecycle}
		<div class={sectionCardClass}>
			{@render cardHeader('Lifecycle')}
			<dl class="m-0 px-6 py-3">
				{#if has(sanityUnit?.construction_start_date)}
					{@render defRow(
						'Construction start',
						fmtDate(
							sanityUnit.construction_start_date,
							sanityUnit.construction_start_date_specificity
						),
						sanityUnit.construction_start_date_source
					)}
				{/if}
				{#if has(sanityUnit?.commencement_date)}
					{@render defRow(
						'Commenced',
						fmtDate(sanityUnit.commencement_date, sanityUnit.commencement_date_specificity)
					)}
				{/if}
				{#if has(sanityUnit?.expected_operation_date)}
					{@render defRow(
						'Expected operation',
						fmtDate(
							sanityUnit.expected_operation_date,
							sanityUnit.expected_operation_date_specificity
						)
					)}
				{/if}
				{#if has(sanityUnit?.expected_closure_date)}
					{@render defRow(
						'Expected closure',
						fmtDate(sanityUnit.expected_closure_date, sanityUnit.expected_closure_date_specificity),
						sanityUnit.expected_closure_date_source
					)}
				{/if}
				{#if has(sanityUnit?.closure_date)}
					{@render defRow(
						'Closed',
						fmtDate(sanityUnit.closure_date, sanityUnit.closure_date_specificity)
					)}
				{/if}
			</dl>
		</div>
	{/if}

	<!-- Data -->
	{#if hasData}
		<div class={sectionCardClass}>
			{@render cardHeader('Data')}
			<dl class="m-0 px-6 py-3">
				{#if has(unit?.data_first_seen)}
					{@render defRow('First seen', fmtDateTime(unit.data_first_seen))}
				{/if}
				{#if has(unit?.data_last_seen)}
					{@render defRow('Last seen', fmtDateTime(unit.data_last_seen))}
				{/if}
			</dl>
		</div>
	{/if}

	<!-- Development & approvals -->
	{#if hasApprovals}
		<div class={sectionCardClass}>
			{@render cardHeader('Development & approvals')}
			<div class="space-y-4 px-6 py-3">
				{#if has(sanityUnit?.construction_cost) || sanityUnit?.commissioning_confirmed === true}
					<dl class="m-0">
						{#if has(sanityUnit?.construction_cost)}
							{@render defRow(
								'Construction cost',
								formatCost(sanityUnit.construction_cost),
								sanityUnit.construction_cost_source
							)}
						{/if}
						{#if sanityUnit?.commissioning_confirmed === true}
							{@render defRow('Commissioning', 'Confirmed')}
						{/if}
					</dl>
				{/if}

				{#if approvalRows.length}
					<div class="grid grid-cols-[1fr_auto_auto] items-baseline gap-x-4 gap-y-2">
						<span></span>
						<span class="text-right text-xxs uppercase tracking-wider text-mid-grey">Lodged</span>
						<span class="text-right text-xxs uppercase tracking-wider text-mid-grey">Approved</span>
						{#each approvalRows as row (row.label)}
							<div class="min-w-0 text-xs text-mid-grey">
								{#if isUrl(row.href)}{@render extLink(row.href, row.label)}{:else}{row.label}{/if}
							</div>
							<div class="text-right text-sm text-dark-grey">
								{has(row.lodged) ? fmtDate(row.lodged, 'day') : '—'}
							</div>
							<div class="text-right text-sm text-dark-grey">
								{has(row.approved) ? fmtDate(row.approved, 'day') : '—'}
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	{/if}

	<!-- Equipment -->
	{#if unitTypes.length}
		<div class={sectionCardClass}>
			{@render cardHeader('Equipment')}
			<div class="flex flex-col gap-2 px-6 py-4">
				{#each unitTypes as ut, i (ut._id ?? i)}
					{@const title = [ut.unit_brand, ut.unit_model].filter(Boolean).join(' ')}
					<div class="rounded-lg bg-light-warm-grey px-3 py-2">
						<div class="flex items-baseline justify-between gap-2">
							<span class="text-sm font-medium text-dark-grey">
								{title || 'Unit type'}{#if ut.unit_model_year}
									<span class="font-normal text-mid-grey"> ({ut.unit_model_year})</span>
								{/if}
							</span>
							{#if has(ut.unit_number)}
								<span class="shrink-0 font-mono text-xs text-mid-grey"
									>{fmt0.format(ut.unit_number)}×</span
								>
							{/if}
						</div>
						<div class="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xxs text-mid-grey">
							{#if has(ut.unit_size)}<span>{formatCapacity(ut.unit_size)} MW each</span>{/if}
							{#if has(ut.capacity)}<span>{formatCapacity(ut.capacity)} MW total</span>{/if}
							{#if has(ut.unit_height)}<span>Hub {fmt0.format(ut.unit_height)} m</span>{/if}
							{#if has(ut.unit_weight)}<span>{fmt0.format(ut.unit_weight)} t</span>{/if}
							{#if has(ut.mounting_type)}<span class="capitalize">{ut.mounting_type}</span>{/if}
							{#if has(ut.unit_efficiency)}<span>{fmt1.format(ut.unit_efficiency)}% eff.</span>{/if}
						</div>
						{#if ut.unit_model_url}
							{@render sourceNote('Spec sheet', ut.unit_model_url)}
						{/if}
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>
