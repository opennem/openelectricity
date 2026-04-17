<script>
	/**
	 * SanityFacilityDetail — displays Sanity CMS facility data
	 * for side-by-side comparison with OE API data.
	 *
	 * Read-only display of all facility fields, photos,
	 * owners, metadata and units from Sanity.
	 */

	import { urlFor } from '$lib/sanity';
	import { fuelTechColourMap } from '$lib/theme/openelectricity';
	import { EXTERNAL_LINKS } from '$lib/constants/external-links';
	import PortableTextBody from '$lib/components/PortableTextBody.svelte';
	import { ExternalLink } from '@lucide/svelte';

	/** @type {{ facility: any | null, expandedUnits?: boolean }} */
	let { facility, expandedUnits = false } = $props();

	/**
	 * Format a capacity value for display
	 * @param {number | null | undefined} val
	 * @returns {string}
	 */
	function fmtCapacity(val) {
		if (val == null) return '\u2014';
		return val.toLocaleString('en-AU', { maximumFractionDigits: 1 });
	}

	/**
	 * Get fuel tech colour for a given code
	 * @param {string | undefined} code
	 * @returns {string}
	 */
	function ftColour(code) {
		if (!code) return '#ccc';
		return fuelTechColourMap[/** @type {keyof typeof fuelTechColourMap} */ (code)] || '#888';
	}

	let description = $derived(facility?.description ?? []);
</script>

{#if !facility}
	<div class="flex items-center justify-center h-full p-8">
		<p class="text-sm text-mid-grey">No Sanity data found for this facility</p>
	</div>
{:else}
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
					{displayText}<ExternalLink size={10} class="shrink-0" />
				</a>
			{:else if displayText}
				<span class="text-[12px] text-dark-grey font-mono break-all col-span-2">{displayText}</span>
			{:else}
				<span class="text-[12px] text-mid-grey/50 font-mono col-span-2">&mdash;</span>
			{/if}
		</div>
	{/snippet}

	<div class="p-5 space-y-5">
		<!-- Header -->
		<div class="text-[10px] text-mid-grey uppercase tracking-widest pb-1 border-b border-dark-grey">
			Sanity CMS
		</div>

		<!-- Facility fields -->
		<div>
			<div
				class="text-[10px] text-mid-grey uppercase tracking-widest mb-2 pb-1 border-b border-dark-grey"
			>
				Facility
			</div>

			{@render kv('code', facility.code)}
			{@render kv('name', facility.name)}
			{@render kv('network', facility.network?.name)}
			{@render kv('region', facility.region?.name)}
			{@render kv(
				'location',
				facility.location?.lat != null && facility.location?.lng != null
					? `${facility.location.lat.toFixed(5)}, ${facility.location.lng.toFixed(5)}`
					: null
			)}
			{@render kvLink(
				'website',
				facility.website ? 'facility website' : null,
				facility.website,
				'Website'
			)}
			{@render kvLink(
				'wikipedia',
				facility.wikipedia,
				facility.wikipedia,
				EXTERNAL_LINKS.wikipedia.label
			)}
			{@render kvLink(
				'wikidata_id',
				facility.wikidata_id,
				facility.wikidata_id ? `${EXTERNAL_LINKS.wikidata.baseUrl}/${facility.wikidata_id}` : null,
				EXTERNAL_LINKS.wikidata.label
			)}
			{@render kvLink(
				'osm_way_id',
				facility.osm_way_id ? String(facility.osm_way_id) : null,
				facility.osm_way_id
					? `${EXTERNAL_LINKS.openStreetMap.baseUrl}/way/${facility.osm_way_id}`
					: null,
				EXTERNAL_LINKS.openStreetMap.label
			)}
			{@render kv('npi_id', facility.npiId)}
		</div>

		<!-- Description -->
		{#if description.length > 0}
			<div>
				<div
					class="text-[10px] text-mid-grey uppercase tracking-widest mb-2 pb-1 border-b border-dark-grey"
				>
					Description
				</div>
				<PortableTextBody value={description} class="text-[12px] text-dark-grey leading-relaxed font-sans" />
			</div>
		{/if}

		<!-- Photos -->
		{#if facility.photos?.length > 0}
			<div>
				<div
					class="text-[10px] text-mid-grey uppercase tracking-widest mb-2 pb-1 border-b border-dark-grey"
				>
					Photos ({facility.photos.length})
				</div>
				<div class="flex gap-2 overflow-x-auto pb-1">
					{#each facility.photos as photo, i (photo._key || i)}
						<div class="shrink-0">
							<img
								src={photo.asset ? urlFor(photo).width(200).height(120).url() : photo.url}
								alt={photo.alt || photo.caption || `${facility.name} photo ${i + 1}`}
								class="rounded border border-warm-grey object-cover h-[60px] max-w-[100px]"
							/>
							{#if photo.caption || photo.attribution}
								<p class="text-[9px] text-mid-grey mt-0.5 truncate max-w-[100px]">
									{photo.caption || ''}{#if photo.attribution}{photo.caption
											? ' \u2014 '
											: ''}{photo.attribution}{/if}
								</p>
							{/if}
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Owners -->
		{#if facility.owners?.length > 0}
			<div>
				<div
					class="text-[10px] text-mid-grey uppercase tracking-widest mb-2 pb-1 border-b border-dark-grey"
				>
					Owners
				</div>
				{#each facility.owners as owner (owner._id)}
					<div class="flex items-center gap-2 py-[3px] border-b border-warm-grey/60">
						{#if owner.website}
							<a
								href={owner.website}
								target="_blank"
								rel="noopener noreferrer"
								class="text-[12px] text-dark-grey hover:text-black inline-flex items-center gap-1 underline decoration-dotted decoration-mid-grey underline-offset-2 hover:decoration-solid hover:decoration-dark-grey"
							>
								{owner.name || owner.legal_name}<ExternalLink size={10} class="shrink-0" />
							</a>
						{:else}
							<span class="text-[12px] text-dark-grey">{owner.name || owner.legal_name}</span>
						{/if}
						{#if owner.contact_email}
							<a
								href="mailto:{owner.contact_email}"
								class="text-[10px] text-mid-grey hover:text-dark-grey underline decoration-dotted decoration-mid-grey underline-offset-2 hover:decoration-solid hover:decoration-dark-grey"
							>
								{owner.contact_email}
							</a>
						{/if}
					</div>
				{/each}
			</div>
		{/if}

		<!-- Metadata -->
		{#if facility.metadata_array?.length > 0}
			<div>
				<div
					class="text-[10px] text-mid-grey uppercase tracking-widest mb-2 pb-1 border-b border-dark-grey"
				>
					Metadata
				</div>
				{#each facility.metadata_array as meta, i (i)}
					{@render kv(meta.key, meta.value)}
				{/each}
			</div>
		{/if}

		<!-- Units -->
		{#if facility.units?.length > 0}
			{#if expandedUnits}
				{#each facility.units as unit (unit._id)}
					<div>
						<div
							class="text-[10px] text-mid-grey uppercase tracking-widest mb-2 pb-1 border-b border-dark-grey"
						>
							Unit: {unit.code || '\u2014'}
						</div>

						{@render kv('code', unit.code)}
						{@render kv('fuel_technology', unit.fuel_technology?.name)}
						{@render kv('ft_code', unit.fuel_technology?.code)}
						{@render kv(
							'renewable',
							unit.fuel_technology?.renewable != null
								? String(unit.fuel_technology.renewable)
								: null
						)}
						{@render kv('dispatch_type', unit.dispatch_type)}
						{@render kv('ft_dispatch_type', unit.fuel_technology?.dispatch_type)}
						{@render kv('status', unit.status)}
						{@render kv(
							'capacity_registered',
							unit.capacity_registered != null ? `${unit.capacity_registered} MW` : null
						)}
						{@render kv(
							'capacity_maximum',
							unit.capacity_maximum != null ? `${unit.capacity_maximum} MW` : null
						)}
						{@render kv(
							'storage_capacity',
							unit.storage_capacity != null ? `${unit.storage_capacity} MWh` : null
						)}
						{@render kv(
							'min_generation',
							unit.min_generation_capacity != null ? `${unit.min_generation_capacity} MW` : null
						)}
						{@render kv(
							'grid_forming',
							unit.grid_forming != null ? String(unit.grid_forming) : null
						)}
						{@render kv('marginal_loss_factor', unit.marginal_loss_factor)}
						{@render kv('emissions_co2', unit.emissions_factor_co2)}
						{@render kv('emissions_source', unit.emissions_factor_source)}
						{@render kv('data_first_seen', unit.data_first_seen)}
						{@render kv('data_last_seen', unit.data_last_seen)}
						{@render kv(
							'commissioning_confirmed',
							unit.commissioning_confirmed != null ? String(unit.commissioning_confirmed) : null
						)}
						{@render kv('expected_operation', unit.expected_operation_date)}
						{@render kv('expected_op_specificity', unit.expected_operation_date_specificity)}
						{@render kv('expected_closure', unit.expected_closure_date)}
						{@render kv('expected_cl_specificity', unit.expected_closure_date_specificity)}
						{@render kv('commencement_date', unit.commencement_date)}
						{@render kv('commencement_specificity', unit.commencement_date_specificity)}
						{@render kv('closure_date', unit.closure_date)}
						{@render kv('closure_specificity', unit.closure_date_specificity)}
						{@render kv('construction_start', unit.construction_start_date)}
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
					</div>
				{/each}
			{:else}
				<div>
					<div
						class="text-[10px] text-mid-grey uppercase tracking-widest mb-2 pb-1 border-b border-dark-grey"
					>
						Units ({facility.units.length})
					</div>

					<!-- Units header -->
					<div
						class="grid grid-cols-[1fr_8px_auto_60px_50px_50px] items-center gap-2 py-1 px-1 text-[9px] text-mid-grey uppercase tracking-wider"
					>
						<span>Code</span>
						<span></span>
						<span>Fuel Tech</span>
						<span>Status</span>
						<span class="text-right">Reg</span>
						<span class="text-right">Max</span>
					</div>

					{#each facility.units as unit (unit._id)}
						<div
							class="grid grid-cols-[1fr_8px_auto_60px_50px_50px] items-center gap-2 py-1.5 px-1 border-b border-warm-grey/40"
						>
							<span class="text-[11px] text-dark-grey font-mono truncate" title={unit.code}>
								{unit.code || '\u2014'}
							</span>
							<span
								class="w-2 h-2 rounded-full shrink-0"
								style="background: {ftColour(unit.fuel_technology?.code)}"
							></span>
							<span class="text-[11px] text-dark-grey truncate" title={unit.fuel_technology?.name}>
								{unit.fuel_technology?.name || '\u2014'}
							</span>
							<span class="text-[10px] text-mid-grey truncate">
								{unit.status || '\u2014'}
							</span>
							<span class="text-[10px] text-mid-grey tabular-nums text-right">
								{fmtCapacity(unit.capacity_registered)}
							</span>
							<span class="text-[10px] text-mid-grey tabular-nums text-right">
								{fmtCapacity(unit.capacity_maximum)}
							</span>
						</div>
					{/each}

					<p class="text-[9px] text-mid-grey mt-1.5">
						Capacity values in MW. Reg = registered, Max = maximum.
					</p>
				</div>
			{/if}
		{/if}
	</div>
{/if}
