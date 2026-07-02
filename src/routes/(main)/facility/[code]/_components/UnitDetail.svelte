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
	import { statusColours } from '$lib/theme/openelectricity';
	import { getFueltechColor, needsDarkText } from '$lib/utils/fueltech-display';
	import { fuelTechNameMap } from '$lib/fuel_techs';
	import { getNumberFormat, formatCapacity, formatDateTime } from '$lib/utils/formatters';
	import { formatDateBySpecificity, stripDateTimezone } from '$lib/utils/date-format.js';
	import { fuelTechToGroup } from '$lib/fuel-tech-groups/facility-group.js';
	import { RENEWABLE_FUEL_TECHS } from '$lib/oe-api/calculate-renewables.js';
	import { dcAcRatio } from '$lib/components/charts/facility/metrics/metrics-calc.js';

	/**
	 * @type {{
	 *   unit: any,
	 *   sanityUnit?: any | null,
	 *   timeZone?: string
	 * }}
	 */
	let { unit, sanityUnit = null, timeZone = '+10:00' } = $props();

	const fmt0 = getNumberFormat(0);
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
	let isRenewable = $derived(/** @type {string[]} */ (RENEWABLE_FUEL_TECHS).includes(ft));
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

	let storageDuration = $derived.by(() => {
		if (!has(storage) || !has(capacityReg) || capacityReg <= 0) return null;
		return storage / capacityReg;
	});

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
	let coalFuel = $derived(ft === 'coal_brown' ? 'Brown coal' : 'Black coal');
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

{#snippet stat(
	/** @type {string} */ label,
	/** @type {string | number} */ value,
	/** @type {string} */ unitLabel = ''
)}
	<div>
		<dt class="text-xxs uppercase tracking-wider text-mid-grey">{label}</dt>
		<dd class="m-0 mt-0.5 flex items-baseline gap-1">
			<span class="font-mono text-sm font-medium text-dark-grey">{value}</span>
			{#if unitLabel}<span class="text-xxs text-mid-grey">{unitLabel}</span>{/if}
		</dd>
	</div>
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

<div>
	<!-- Hero: fuel tech identity + status -->
	<div class="flex items-center gap-3 px-6 py-5">
		<span
			class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full {isDarkText
				? 'text-black'
				: 'text-white'}"
			style="background-color: {bgColor};"
		>
			<FuelTechBadge fuelTech={ft} iconOnly iconSize={6} />
		</span>
		<div class="min-w-0">
			<div class="flex flex-wrap items-center gap-2">
				<span class="text-base font-semibold text-dark-grey">{ftName}</span>
				{#if isRenewable}
					<span
						class="rounded-full bg-[#52A972]/15 px-2 py-0.5 text-xxs font-medium text-[#3d8159]"
					>
						Renewable
					</span>
				{/if}
			</div>
			{#if status}
				<div class="mt-1 inline-flex items-center gap-1.5">
					<span
						class="h-2 w-2 rounded-full"
						style="background-color: {statusColours[status] || statusColours.operating};"
					></span>
					<span class="text-xs capitalize text-mid-grey">{status}</span>
				</div>
			{/if}
		</div>
	</div>

	<!-- Fuel-tech highlight -->
	{#if group === 'solar' && (has(capacityReg) || has(capacityMax))}
		<div class="border-t border-mid-warm-grey/40 px-6 py-4">
			<dl class="grid grid-cols-3 gap-4">
				{#if has(capacityReg)}{@render stat('DC array', formatCapacity(capacityReg), 'MW')}{/if}
				{#if has(capacityMax)}{@render stat(
						'AC connection',
						formatCapacity(capacityMax),
						'MW'
					)}{/if}
				{#if dcac}{@render stat('DC:AC', fmt2.format(dcac))}{/if}
			</dl>
			{#if solarMounting}
				<p class="mt-2 text-xxs capitalize text-mid-grey">Mounting: {solarMounting}</p>
			{/if}
		</div>
	{:else if group === 'battery' && (storageDuration || gridForming !== null)}
		<div class="border-t border-mid-warm-grey/40 px-6 py-4">
			<dl class="grid grid-cols-2 gap-4">
				{#if storageDuration}{@render stat(
						'Storage duration',
						fmt1.format(storageDuration),
						'h'
					)}{/if}
				{#if gridForming !== null}{@render stat('Grid forming', gridForming ? 'Yes' : 'No')}{/if}
			</dl>
		</div>
	{:else if group === 'wind' && (turbineCount || hubHeight)}
		<div class="border-t border-mid-warm-grey/40 px-6 py-4">
			<dl class="grid grid-cols-2 gap-4">
				{#if turbineCount}{@render stat('Turbines', fmt0.format(turbineCount))}{/if}
				{#if hubHeight}{@render stat('Hub height', fmt0.format(hubHeight), 'm')}{/if}
			</dl>
		</div>
	{:else if group === 'coal'}
		<div class="border-t border-mid-warm-grey/40 px-6 py-4">
			<dl class="grid grid-cols-2 gap-4">
				{@render stat('Fuel', coalFuel)}
				{#if has(minGen)}{@render stat('Min stable gen', formatCapacity(minGen), 'MW')}{/if}
			</dl>
		</div>
	{:else if group === 'gas' && gasSubtype}
		<div class="border-t border-mid-warm-grey/40 px-6 py-4">
			<dl class="grid grid-cols-2 gap-4">
				{@render stat('Configuration', gasSubtype)}
				{@render stat('Role', isPeaker ? 'Peaker' : 'Baseload / mid-merit')}
			</dl>
		</div>
	{:else if group === 'hydro'}
		<div class="border-t border-mid-warm-grey/40 px-6 py-4">
			<dl class="grid grid-cols-2 gap-4">
				{@render stat('Type', hydroLabel)}
				{#if has(minGen)}{@render stat('Min stable gen', formatCapacity(minGen), 'MW')}{/if}
			</dl>
		</div>
	{/if}

	<!-- Key stats -->
	<div class="border-t border-mid-warm-grey/40 px-6 py-4">
		<dl class="grid grid-cols-2 gap-4">
			{#if group !== 'solar'}
				<!-- Solar capacity is shown in full (DC array + AC connection) above. -->
				{@render stat('Capacity', formatCapacity(capacityMax ?? capacityReg), 'MW')}
			{/if}
			{#if has(storage)}{@render stat('Storage', formatCapacity(storage), 'MWh')}{/if}
			{#if has(emissions) && emissions > 0}
				{@render stat('Emissions', formatEmissions(emissions), 'kg CO₂/MWh')}
			{/if}
			{#if has(dispatch)}{@render stat('Type', dispatchLabel(dispatch))}{/if}
			{#if has(mlf)}{@render stat('Loss factor', fmt2.format(mlf), 'MLF')}{/if}
		</dl>
		{#if has(emissions) && emissions > 0 && sanityUnit?.emissions_factor_source}
			{@render sourceNote('Emissions source', sanityUnit.emissions_factor_source)}
		{/if}
	</div>

	<!-- Lifecycle -->
	{#if hasLifecycle}
		<div class="border-t border-mid-warm-grey/40 px-6 py-4">
			<h4 class="m-0 text-xxs font-semibold uppercase tracking-wider text-mid-grey">Lifecycle</h4>
			<dl class="mt-2">
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
		<div class="border-t border-mid-warm-grey/40 px-6 py-4">
			<h4 class="m-0 text-xxs font-semibold uppercase tracking-wider text-mid-grey">Data</h4>
			<dl class="mt-2">
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
		<div class="border-t border-mid-warm-grey/40 px-6 py-4">
			<h4 class="m-0 text-xxs font-semibold uppercase tracking-wider text-mid-grey">
				Development &amp; approvals
			</h4>
			{#if has(sanityUnit?.construction_cost) || sanityUnit?.commissioning_confirmed === true}
				<dl class="mt-2">
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
				<div class="mt-4 grid grid-cols-[1fr_auto_auto] items-baseline gap-x-4 gap-y-2">
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
	{/if}

	<!-- Equipment -->
	{#if unitTypes.length}
		<div class="border-t border-mid-warm-grey/40 px-6 py-4">
			<h4 class="m-0 mb-2 text-xxs font-semibold uppercase tracking-wider text-mid-grey">
				Equipment
			</h4>
			<div class="flex flex-col gap-2">
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
