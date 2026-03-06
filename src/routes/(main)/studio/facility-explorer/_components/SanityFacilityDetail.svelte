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
	import { ExternalLink } from '@lucide/svelte';

	/** @type {{ facility: any | null }} */
	let { facility } = $props();

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
		return (
			fuelTechColourMap[/** @type {keyof typeof fuelTechColourMap} */ (code)] || '#888'
		);
	}

	/**
	 * Extract plain text from a portable text description array
	 * @param {any[] | undefined} blocks
	 * @returns {string[]}
	 */
	function extractParagraphs(blocks) {
		if (!blocks?.length) return [];
		return blocks
			.filter((/** @type {any} */ b) => b._type === 'block')
			.map(
				(/** @type {any} */ b) =>
					b.children?.map((/** @type {any} */ c) => c.text).join('') || ''
			)
			.filter(Boolean);
	}

	let paragraphs = $derived(extractParagraphs(facility?.description));
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

	{#snippet kvLink(/** @type {string} */ label, /** @type {string | null | undefined} */ displayText, /** @type {string | null | undefined} */ href, /** @type {string} */ description)}
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

	<div class="p-5 space-y-5">
		<!-- Header -->
		<div class="text-[10px] text-mid-grey uppercase tracking-widest pb-1 border-b border-dark-grey">
			Sanity CMS
		</div>

		<!-- Facility fields -->
		<div>
			<div class="text-[10px] text-mid-grey uppercase tracking-widest mb-2 pb-1 border-b border-dark-grey">
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
			{@render kvLink('website', facility.website ? 'facility website' : null, facility.website, 'Website')}
			{@render kvLink('wikipedia', facility.wikipedia, facility.wikipedia, EXTERNAL_LINKS.wikipedia.label)}
			{@render kvLink(
				'wikidata_id',
				facility.wikidata_id,
				facility.wikidata_id ? `${EXTERNAL_LINKS.wikidata.baseUrl}/${facility.wikidata_id}` : null,
				EXTERNAL_LINKS.wikidata.label
			)}
			{@render kvLink(
				'osm_way_id',
				facility.osm_way_id ? String(facility.osm_way_id) : null,
				facility.osm_way_id ? `${EXTERNAL_LINKS.openStreetMap.baseUrl}/way/${facility.osm_way_id}` : null,
				EXTERNAL_LINKS.openStreetMap.label
			)}
			{@render kv('npi_id', facility.npiId)}
		</div>

		<!-- Description -->
		{#if paragraphs.length > 0}
			<div>
				<div class="text-[10px] text-mid-grey uppercase tracking-widest mb-2 pb-1 border-b border-dark-grey">
					Description
				</div>
				<div class="text-[12px] text-dark-grey leading-relaxed font-sans">
					{#each paragraphs as text, i (i)}
						<p class="mb-1.5">{text}</p>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Photos -->
		{#if facility.photos?.length > 0}
			<div>
				<div class="text-[10px] text-mid-grey uppercase tracking-widest mb-2 pb-1 border-b border-dark-grey">
					Photos ({facility.photos.length})
				</div>
				<div class="flex gap-2 overflow-x-auto pb-1">
					{#each facility.photos as photo, i (photo._key || i)}
						<div class="flex-shrink-0">
							<img
								src={photo.asset
									? urlFor(photo).width(200).height(120).url()
									: photo.url}
								alt={photo.alt || photo.caption || `${facility.name} photo ${i + 1}`}
								class="rounded border border-warm-grey object-cover h-[60px] max-w-[100px]"
							/>
							{#if photo.caption || photo.attribution}
								<p class="text-[9px] text-mid-grey mt-0.5 truncate max-w-[100px]">
									{photo.caption || ''}{#if photo.attribution}{photo.caption ? ' \u2014 ' : ''}{photo.attribution}{/if}
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
				<div class="text-[10px] text-mid-grey uppercase tracking-widest mb-2 pb-1 border-b border-dark-grey">
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
								{owner.name || owner.legal_name}<ExternalLink size={10} class="flex-shrink-0" />
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
				<div class="text-[10px] text-mid-grey uppercase tracking-widest mb-2 pb-1 border-b border-dark-grey">
					Metadata
				</div>
				{#each facility.metadata_array as meta, i (i)}
					{@render kv(meta.key, meta.value)}
				{/each}
			</div>
		{/if}

		<!-- Units -->
		{#if facility.units?.length > 0}
			<div>
				<div class="text-[10px] text-mid-grey uppercase tracking-widest mb-2 pb-1 border-b border-dark-grey">
					Units ({facility.units.length})
				</div>

				<!-- Units header -->
				<div class="grid grid-cols-[1fr_8px_auto_60px_50px_50px] items-center gap-2 py-1 px-1 text-[9px] text-mid-grey uppercase tracking-wider">
					<span>Code</span>
					<span></span>
					<span>Fuel Tech</span>
					<span>Status</span>
					<span class="text-right">Reg</span>
					<span class="text-right">Max</span>
				</div>

				{#each facility.units as unit (unit._id)}
					<div class="grid grid-cols-[1fr_8px_auto_60px_50px_50px] items-center gap-2 py-1.5 px-1 border-b border-warm-grey/40">
						<span class="text-[11px] text-dark-grey font-mono truncate" title={unit.code}>
							{unit.code || '\u2014'}
						</span>
						<span
							class="w-2 h-2 rounded-full flex-shrink-0"
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
	</div>
{/if}
