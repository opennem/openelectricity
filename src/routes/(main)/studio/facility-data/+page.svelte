<script>
	import { goto } from '$app/navigation';
	import { CircleAlert, ExternalLink, SearchX } from '@lucide/svelte';
	import IconChevronLeft from '$lib/icons/ChevronLeft.svelte';
	import { EXTERNAL_LINKS } from '$lib/constants/external-links';
	import { urlFor } from '$lib/sanity';
	import { fuelTechColourMap } from '$lib/theme/openelectricity';
	import FacilitySearchPopover from '../facility-explorer/_components/FacilitySearchPopover.svelte';
	import { PollutionSection } from '$lib/components/charts/facility';

	/** @type {{ data: any }} */
	let { data } = $props();

	let searchOpen = $state(false);

	let currentIndex = $derived(
		data.facilities.findIndex((/** @type {any} */ f) => f.code === data.selectedCode)
	);

	let prevFacility = $derived(
		data.facilities.length > 0
			? data.facilities[(currentIndex - 1 + data.facilities.length) % data.facilities.length]
			: null
	);

	let nextFacility = $derived(
		data.facilities.length > 0 ? data.facilities[(currentIndex + 1) % data.facilities.length] : null
	);

	/** @param {string} code */
	function handleFacilitySelect(code) {
		goto(`/studio/facility-data?facility=${code}`);
	}

	/** @param {string} value */
	function stripHtml(value) {
		return value.replace(/<[^>]*>/g, '');
	}

	/**
	 * Check if a value is non-null and non-empty
	 * @param {any} v
	 * @returns {boolean}
	 */
	function hasVal(v) {
		return v != null && v !== '';
	}

	/**
	 * Extract plain text from portable text blocks
	 * @param {any[] | undefined} blocks
	 * @returns {string}
	 */
	function extractText(blocks) {
		if (!blocks?.length) return '';
		return blocks
			.filter((/** @type {any} */ b) => b._type === 'block')
			.map(
				(/** @type {any} */ b) => b.children?.map((/** @type {any} */ c) => c.text).join('') || ''
			)
			.filter(Boolean)
			.join(' ');
	}

	// Build merged unit list keyed by code, preserving order from OE API
	let unitPairs = $derived.by(() => {
		const oeUnits = data.facility?.units ?? [];
		const sanityUnits = data.sanityFacility?.units ?? [];

		/** @type {Map<string, any>} */
		const sanityMap = new Map();
		for (const u of sanityUnits) {
			if (u.code) sanityMap.set(u.code, u);
		}

		/** @type {Set<string>} */
		const seen = new Set();

		/** @type {Array<{ code: string, oe: any, sanity: any }>} */
		const pairs = [];

		// OE API units first
		for (const u of oeUnits) {
			seen.add(u.code);
			pairs.push({ code: u.code, oe: u, sanity: sanityMap.get(u.code) ?? null });
		}

		// Any Sanity-only units
		for (const u of sanityUnits) {
			if (u.code && !seen.has(u.code)) {
				pairs.push({ code: u.code, oe: null, sanity: u });
			}
		}

		return pairs.sort((a, b) => a.code.localeCompare(b.code));
	});

	const sf = $derived(data.sanityFacility);

</script>

<svelte:head>
	<title>{data.facility ? `${data.facility.name} — ` : ''}Facility Data</title>
</svelte:head>

{#snippet kv(/** @type {string} */ label, /** @type {any} */ value)}
	<div class="grid grid-cols-3 gap-2 py-[3px] border-b border-warm-grey/60">
		<span class="text-[11px] text-mid-grey font-mono truncate" title={label}>{label}</span>
		{#if value != null && value !== ''}
			<span class="text-[12px] text-dark-grey font-mono break-all col-span-2">{value}</span>
		{:else}
			<span class="text-[12px] text-mid-grey/50 font-mono col-span-2">&mdash;</span>
		{/if}
	</div>
{/snippet}

{#snippet kvCmp(/** @type {string} */ label, /** @type {any} */ value, /** @type {any} */ counterpartValue)}
	<div
		class="grid grid-cols-3 gap-2 py-[3px] border-b border-warm-grey/60"
		style={hasVal(value) && !hasVal(counterpartValue) ? 'background: #C7452312' : ''}
	>
		<span class="text-[11px] text-mid-grey font-mono truncate" title={label}>{label}</span>
		{#if value != null && value !== ''}
			<span class="text-[12px] text-dark-grey font-mono break-all col-span-2">{value}</span>
		{:else}
			<span class="text-[12px] text-mid-grey/50 font-mono col-span-2">&mdash;</span>
		{/if}
	</div>
{/snippet}

{#snippet kvLink(
	/** @type {string} */ label,
	/** @type {string | null | undefined} */ displayText,
	/** @type {string | null | undefined} */ href,
	/** @type {string} */ description
)}
	<div class="grid grid-cols-3 gap-2 py-[3px] border-b border-warm-grey/60">
		<span class="text-[11px] text-mid-grey font-mono truncate" title={label}>{label}</span>
		{#if displayText && href}
			<a
				{href}
				target="_blank"
				rel="noopener noreferrer"
				title="Open on {description} (new tab)"
				class="text-[12px] text-dark-grey font-mono col-span-2 inline-flex items-center gap-1 underline decoration-dotted decoration-mid-grey underline-offset-2 hover:text-black hover:decoration-solid hover:decoration-dark-grey"
			>
				{displayText}<ExternalLink size={10} class="flex-shrink-0" />
			</a>
		{:else if displayText}
			<span class="text-[12px] text-dark-grey font-mono break-all col-span-2">{displayText}</span>
		{:else}
			<span class="text-[12px] text-mid-grey/50 font-mono col-span-2">&mdash;</span>
		{/if}
	</div>
{/snippet}

{#snippet sectionHeader(/** @type {string} */ text)}
	<div
		class="text-[10px] text-mid-grey uppercase tracking-widest mb-2 pb-1 border-b border-dark-grey"
	>
		{text}
	</div>
{/snippet}

{#snippet oeUnitFields(/** @type {any} */ unit, /** @type {any} */ sanityUnit)}
	{@render kvCmp('code', unit.code, sanityUnit?.code)}
	{@render kvCmp('fueltech_id', unit.fueltech_id, sanityUnit?.fuel_technology?.code)}
	{@render kvCmp('status_id', unit.status_id, sanityUnit?.status)}
	{@render kvCmp('dispatch_type', unit.dispatch_type, sanityUnit?.dispatch_type)}
	{@render kvCmp('capacity_registered', unit.capacity_registered, sanityUnit?.capacity_registered)}
	{@render kvCmp('capacity_maximum', unit.capacity_maximum, sanityUnit?.capacity_maximum)}
	{@render kvCmp('capacity_storage', unit.capacity_storage, sanityUnit?.storage_capacity)}
	{@render kvCmp('emissions_factor_co2', unit.emissions_factor_co2, sanityUnit?.emissions_factor_co2)}
	{@render kvCmp('data_first_seen', unit.data_first_seen, sanityUnit?.data_first_seen)}
	{@render kvCmp('data_last_seen', unit.data_last_seen, sanityUnit?.data_last_seen)}
	{@render kvCmp('commencement_date', unit.commencement_date_display, sanityUnit?.commencement_date)}
	{@render kvCmp('closure_date', unit.closure_date_display, sanityUnit?.closure_date)}
	{@render kvCmp('expected_operation_date', unit.expected_operation_date_display, sanityUnit?.expected_operation_date)}
	{@render kvCmp('expected_closure_date', unit.expected_closure_date_display, sanityUnit?.expected_closure_date)}
	{@render kvCmp('construction_start_date', unit.construction_start_date_display, sanityUnit?.construction_start_date)}
	{@render kv('project_approval_date', unit.project_approval_date_display)}
	{@render kv('project_lodgement_date', unit.project_lodgement_date)}
	{@render kv('created_at', unit.created_at)}
	{@render kv('updated_at', unit.updated_at)}
{/snippet}

{#snippet sanityUnitFields(/** @type {any} */ unit, /** @type {any} */ oeUnit)}
	{@render kvCmp('code', unit.code, oeUnit?.code)}
	{@render kv('fuel_technology', unit.fuel_technology?.name)}
	{@render kvCmp('ft_code', unit.fuel_technology?.code, oeUnit?.fueltech_id)}
	{@render kv(
		'renewable',
		unit.fuel_technology?.renewable != null ? String(unit.fuel_technology.renewable) : null
	)}
	{@render kvCmp('dispatch_type', unit.dispatch_type, oeUnit?.dispatch_type)}
	{@render kv('ft_dispatch_type', unit.fuel_technology?.dispatch_type)}
	{@render kvCmp('status', unit.status, oeUnit?.status_id)}
	{@render kvCmp(
		'capacity_registered',
		unit.capacity_registered != null ? `${unit.capacity_registered} MW` : null,
		oeUnit?.capacity_registered
	)}
	{@render kvCmp(
		'capacity_maximum',
		unit.capacity_maximum != null ? `${unit.capacity_maximum} MW` : null,
		oeUnit?.capacity_maximum
	)}
	{@render kvCmp(
		'storage_capacity',
		unit.storage_capacity != null ? `${unit.storage_capacity} MWh` : null,
		oeUnit?.capacity_storage
	)}
	{@render kv(
		'min_generation',
		unit.min_generation_capacity != null ? `${unit.min_generation_capacity} MW` : null
	)}
	{@render kv('grid_forming', unit.grid_forming != null ? String(unit.grid_forming) : null)}
	{@render kv('marginal_loss_factor', unit.marginal_loss_factor)}
	{@render kvCmp('emissions_co2', unit.emissions_factor_co2, oeUnit?.emissions_factor_co2)}
	{@render kv('emissions_source', unit.emissions_factor_source)}
	{@render kvCmp('data_first_seen', unit.data_first_seen, oeUnit?.data_first_seen)}
	{@render kvCmp('data_last_seen', unit.data_last_seen, oeUnit?.data_last_seen)}
	{@render kv(
		'commissioning_confirmed',
		unit.commissioning_confirmed != null ? String(unit.commissioning_confirmed) : null
	)}
	{@render kvCmp('expected_operation', unit.expected_operation_date, oeUnit?.expected_operation_date_display)}
	{@render kv('expected_op_specificity', unit.expected_operation_date_specificity)}
	{@render kvCmp('expected_closure', unit.expected_closure_date, oeUnit?.expected_closure_date_display)}
	{@render kv('expected_cl_specificity', unit.expected_closure_date_specificity)}
	{@render kvCmp('commencement_date', unit.commencement_date, oeUnit?.commencement_date_display)}
	{@render kv('commencement_specificity', unit.commencement_date_specificity)}
	{@render kvCmp('closure_date', unit.closure_date, oeUnit?.closure_date_display)}
	{@render kv('closure_specificity', unit.closure_date_specificity)}
	{@render kvCmp('construction_start', unit.construction_start_date, oeUnit?.construction_start_date_display)}
	{@render kv('construction_cost', unit.construction_cost)}
	{@render kv(
		'cis_tender_recipient',
		unit.cis_tender_recipient != null ? String(unit.cis_tender_recipient) : null
	)}

	{#if unit.unit_types?.length > 0}
		<div class="mt-2">
			<div class="text-[9px] text-mid-grey uppercase tracking-wider mb-1">
				Unit Types ({unit.unit_types.length})
			</div>
			{#each unit.unit_types as ut, i (ut._id || i)}
				{@render kv('unit_number', ut.unit_number)}
				{@render kv('unit_size', ut.unit_size)}
				{@render kv('capacity', ut.capacity != null ? `${ut.capacity} MW` : null)}
				{@render kv('unit_brand', ut.unit_brand)}
				{@render kv('unit_model', ut.unit_model)}
				{@render kv('unit_model_year', ut.unit_model_year)}
				{@render kv('unit_height', ut.unit_height)}
				{@render kv('unit_weight', ut.unit_weight)}
				{@render kv('mounting_type', ut.mounting_type)}
				{@render kv('unit_efficiency', ut.unit_efficiency)}
				{#if i < unit.unit_types.length - 1}
					<div class="border-b border-warm-grey/30 my-1"></div>
				{/if}
			{/each}
		</div>
	{/if}

	{#if unit.metadata_array?.length > 0}
		<div class="mt-2">
			<div class="text-[9px] text-mid-grey uppercase tracking-wider mb-1">Metadata</div>
			{#each unit.metadata_array as meta, i (i)}
				{@render kv(meta.key, meta.value)}
			{/each}
		</div>
	{/if}
{/snippet}

<div class="flex flex-col h-dvh overflow-hidden">
	<!-- Top bar -->
	<div class="flex items-center px-4 py-2 border-b border-warm-grey bg-white flex-shrink-0">
		<div class="flex items-center w-full justify-center">
			<button
				class="p-1 rounded-lg hover:bg-warm-grey text-dark-grey transition-colors"
				onclick={() => prevFacility && handleFacilitySelect(prevFacility.code)}
				title={prevFacility?.name}
			>
				<IconChevronLeft class="w-8 h-8" />
			</button>

			<div class="flex-1 flex justify-center sm:flex-initial sm:flex-none">
				<FacilitySearchPopover
					facilities={data.facilities}
					label={data.facility?.name || 'Select facility'}
					bind:open={searchOpen}
					onselect={handleFacilitySelect}
				/>
			</div>

			<button
				class="p-1 rounded-lg hover:bg-warm-grey text-dark-grey transition-colors"
				onclick={() => nextFacility && handleFacilitySelect(nextFacility.code)}
				title={nextFacility?.name}
			>
				<IconChevronLeft class="w-8 h-8 rotate-180" />
			</button>
		</div>
	</div>

	<!-- Main content -->
	{#if data.error && !data.facility}
		<div class="flex-1 flex items-center justify-center p-8">
			<div class="flex flex-col items-center gap-2 text-mid-grey">
				<CircleAlert size={24} />
				<p class="text-sm">{data.error}</p>
			</div>
		</div>
	{:else if data.facilities.length === 0}
		<div class="flex-1 flex items-center justify-center p-8">
			<p class="text-sm text-mid-grey">No facilities available</p>
		</div>
	{:else if !data.facility}
		<div class="flex-1 flex items-center justify-center p-8">
			<div class="flex flex-col items-center gap-2 text-mid-grey">
				<SearchX size={24} />
				<p class="text-sm">Select a facility</p>
			</div>
		</div>
	{:else}
		<!-- Column headers (fixed, not scrollable) -->
		<div class="grid grid-cols-2 border-b border-warm-grey flex-shrink-0">
			<div
				class="px-5 py-2 text-[10px] text-mid-grey uppercase tracking-widest border-r border-warm-grey"
			>
				OE API
			</div>
			<div class="px-5 py-2 text-[10px] text-mid-grey uppercase tracking-widest">Sanity CMS</div>
		</div>

		<div class="flex-1 overflow-y-auto">
			<!-- Facility fields -->
			<div class="grid grid-cols-2 border-b border-warm-grey">
				<!-- OE API facility -->
				<div class="p-5 border-r border-warm-grey space-y-1">
					{@render sectionHeader('Facility')}
					{@render kv('code', data.facility.code)}
					{@render kv('name', data.facility.name)}
					{@render kv('network_id', data.facility.network_id)}
					{@render kv('network_region', data.facility.network_region)}
					{@render kv(
						'description',
						data.facility.description ? stripHtml(data.facility.description) : null
					)}
					{@render kv('npi_id', data.facility.npi_id)}
					{@render kv(
						'location',
						data.facility.location?.lat != null && data.facility.location?.lng != null
							? `${data.facility.location.lat.toFixed(5)}, ${data.facility.location.lng.toFixed(5)}`
							: null
					)}
					{@render kv('created_at', data.facility.created_at)}
					{@render kv('updated_at', data.facility.updated_at)}
				</div>

				<!-- Sanity facility -->
				<div class="p-5 space-y-1">
					{@render sectionHeader('Facility')}
					{#if sf}
						{@render kv('code', sf.code)}
						{@render kv('name', sf.name)}
						{@render kv('network', sf.network?.name)}
						{@render kv('region', sf.region?.name)}
						{@render kv(
							'location',
							sf.location?.lat != null && sf.location?.lng != null
								? `${sf.location.lat.toFixed(5)}, ${sf.location.lng.toFixed(5)}`
								: null
						)}
						{@render kvLink(
							'website',
							sf.website ? 'facility website' : null,
							sf.website,
							'Website'
						)}
						{@render kvLink(
							'wikipedia',
							sf.wikipedia,
							sf.wikipedia,
							EXTERNAL_LINKS.wikipedia.label
						)}
						{@render kvLink(
							'wikidata_id',
							sf.wikidata_id,
							sf.wikidata_id ? `${EXTERNAL_LINKS.wikidata.baseUrl}/${sf.wikidata_id}` : null,
							EXTERNAL_LINKS.wikidata.label
						)}
						{@render kvLink(
							'osm_way_id',
							sf.osm_way_id ? String(sf.osm_way_id) : null,
							sf.osm_way_id ? `${EXTERNAL_LINKS.openStreetMap.baseUrl}/way/${sf.osm_way_id}` : null,
							EXTERNAL_LINKS.openStreetMap.label
						)}
						{@render kv('npi_id', sf.npiId)}

						{#if extractText(sf.description)}
							<div class="mt-2">
								<div class="text-[9px] text-mid-grey uppercase tracking-wider mb-1">
									Description
								</div>
								<p class="text-[12px] text-dark-grey leading-relaxed">
									{extractText(sf.description)}
								</p>
							</div>
						{/if}

						{#if sf.owners?.length > 0}
							<div class="mt-2">
								<div class="text-[9px] text-mid-grey uppercase tracking-wider mb-1">Owners</div>
								{#each sf.owners as owner (owner._id)}
									{@render kv(
										owner.name || owner.legal_name,
										owner.website || owner.contact_email || '—'
									)}
								{/each}
							</div>
						{/if}

						{#if sf.metadata_array?.length > 0}
							<div class="mt-2">
								<div class="text-[9px] text-mid-grey uppercase tracking-wider mb-1">Metadata</div>
								{#each sf.metadata_array as meta, i (i)}
									{@render kv(meta.key, meta.value)}
								{/each}
							</div>
						{/if}
					{:else}
						<p class="text-sm text-mid-grey">No Sanity data found</p>
					{/if}
				</div>
			</div>

			<!-- Units — paired by code -->
			{#each unitPairs as pair (pair.code)}
				<div class="grid grid-cols-2 border-b border-warm-grey">
					<!-- OE API unit -->
					<div class="p-5 border-r border-warm-grey space-y-1">
						{@render sectionHeader(`Unit: ${pair.code}`)}
						{#if pair.oe}
							{@render oeUnitFields(pair.oe, pair.sanity)}
						{:else}
							<p class="text-[11px] text-mid-grey/50 font-mono">Not in OE API</p>
						{/if}
					</div>

					<!-- Sanity unit -->
					<div class="p-5 space-y-1">
						{@render sectionHeader(`Unit: ${pair.code}`)}
						{#if pair.sanity}
							{@render sanityUnitFields(pair.sanity, pair.oe)}
						{:else}
							<p class="text-[11px] text-mid-grey/50 font-mono">Not in Sanity</p>
						{/if}
					</div>
				</div>
			{/each}

			{#if data.pollutionData?.length}
				<div class="border-t border-warm-grey">
					<PollutionSection pollutionData={data.pollutionData} />
				</div>
			{/if}
		</div>
	{/if}
</div>
