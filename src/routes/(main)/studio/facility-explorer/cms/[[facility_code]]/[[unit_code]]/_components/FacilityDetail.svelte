<script>
	/**
	 * FacilityDetail — inspector panel for a single facility.
	 *
	 * Shows all facility fields (header, photos, KV fields, description,
	 * owners, metadata, units list) plus a slide-in unit detail panel.
	 */

	import { PanelHeader, DragHandle } from '$lib/components/ui/panel';
	import { EXTERNAL_LINKS } from '$lib/constants/external-links';
	import { urlFor } from '$lib/sanity';
	import { fuelTechColourMap } from '$lib/theme/openelectricity';
	import { ChevronRight, ExternalLink, X } from '@lucide/svelte';
	import { fade, fly } from 'svelte/transition';
	import FacilityStatusIcon from '../../../../../../facilities/_components/FacilityStatusIcon.svelte';
	import { createDragHandler } from '../_utils/drag-resize.svelte.js';

	/** @type {{ facility: any, selectedUnitCode?: string | null, osmStatus?: 'idle' | 'loading' | 'ok' | 'not-found' | 'error', onclose?: () => void, onselectunit?: (code: string | null) => void, onfetchosm?: () => void }} */
	let { facility, selectedUnitCode = null, osmStatus = 'idle', onclose, onselectunit, onfetchosm } = $props();

	// Resizable unit panel width (right-anchored — drag left to widen)
	const unitPanelDrag = createDragHandler({
		axis: 'x',
		min: 360,
		max: 800,
		initial: 480,
		storageKey: 'cms-explorer-unit-panel-width',
		invert: true
	});


	// Selected unit object (matched by code from URL param)
	let selectedUnit = $derived.by(() => {
		if (!selectedUnitCode || !facility?.units) return null;
		return facility.units.find((/** @type {any} */ u) => u.code === selectedUnitCode) ?? null;
	});

	// Retain last selected unit data so the fly-out transition can still
	// read properties while the panel animates away
	/** @type {any} */
	let displayUnit = $state(null);

	/** Index of the photo shown in the lightbox (-1 = closed) */
	let lightboxIndex = $state(-1);

	let lightboxPhoto = $derived(lightboxIndex >= 0 ? facility.photos?.[lightboxIndex] : null);
	$effect(() => {
		if (selectedUnit) displayUnit = selectedUnit;
	});

	/**
	 * @param {number | null | undefined} val
	 * @returns {string}
	 */
	function fmtCap(val) {
		if (val == null) return '—';
		return val.toLocaleString('en-AU', { maximumFractionDigits: 1 });
	}

	/**
	 * Get fuel tech colour for a code
	 * @param {string | undefined} code
	 * @returns {string}
	 */
	function ftColour(code) {
		if (!code) return '#ccc';
		return (
			fuelTechColourMap[/** @type {keyof typeof fuelTechColourMap} */ (code)] || '#888'
		);
	}
</script>

{#snippet kv(/** @type {string} */ label, /** @type {any} */ value)}
	<div class="grid grid-cols-3 gap-2 py-[3px] border-b border-warm-grey/60">
		<span class="text-[11px] text-mid-grey font-mono truncate" title={label}>{label}</span>
		{#if value != null && value !== ''}
			<span class="text-[12px] text-dark-grey font-mono break-all col-span-2">{value}</span>
		{:else}
			<span class="text-[12px] text-mid-grey/50 font-mono col-span-2">—</span>
		{/if}
	</div>
{/snippet}

{#snippet kvLink(/** @type {string} */ label, /** @type {any} */ displayText, /** @type {string | null} */ href, /** @type {string} */ description)}
	<div class="grid grid-cols-3 gap-2 py-[3px] border-b border-warm-grey/60">
		<span class="text-[11px] text-mid-grey font-mono truncate" title={label}>{label}</span>
		{#if displayText != null && displayText !== '' && href}
			<a {href} target="_blank" rel="noopener noreferrer" title="Open on {description} (new tab)" class="text-[12px] text-dark-grey font-mono col-span-2 inline-flex items-center gap-1 underline decoration-dotted decoration-mid-grey underline-offset-2 hover:text-black hover:decoration-solid hover:decoration-dark-grey focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dark-grey rounded-sm">{displayText}<ExternalLink size={10} class="flex-shrink-0" /></a>
		{:else if displayText != null && displayText !== ''}
			<span class="text-[12px] text-dark-grey font-mono break-all col-span-2">{displayText}</span>
		{:else}
			<span class="text-[12px] text-mid-grey/50 font-mono col-span-2">—</span>
		{/if}
	</div>
{/snippet}

<div class="relative flex-1 flex flex-col min-h-0">
	<PanelHeader>
		<span
			class="w-2.5 h-2.5 rounded-full flex-shrink-0"
			style="background: {ftColour(facility.units?.[0]?.fuel_technology?.code)}"
		></span>
		<span class="text-[12px] font-medium text-dark-grey flex-1 truncate">{facility.name || 'Unnamed'}</span>
		{#if facility.website}
			<a
				href={facility.website}
				target="_blank"
				rel="noopener noreferrer"
				class="text-[10px] text-mid-grey hover:text-dark-grey flex items-center gap-0.5"
			>
				<ExternalLink size={10} /> web
			</a>
		{/if}
		{#if facility.wikipedia}
			<a
				href={facility.wikipedia}
				target="_blank"
				rel="noopener noreferrer"
				class="text-[10px] text-mid-grey hover:text-dark-grey flex items-center gap-0.5"
			>
				<ExternalLink size={10} /> wiki
			</a>
		{/if}
		{#if onclose}
			<button
				onclick={onclose}
				class="p-1 hover:bg-warm-grey rounded transition-colors"
				title="Close"
			>
				<X size={12} class="text-mid-grey" />
			</button>
		{/if}
	</PanelHeader>

	<div class="flex-1 overflow-y-auto">
	<div class="p-5">

		<!-- Photos -->
		{#if facility.photos?.length > 0}
			<div class="flex gap-2 mb-5 overflow-x-auto pb-1">
				{#each facility.photos as photo, i (photo._key || i)}
					<button class="flex-shrink-0 text-left cursor-zoom-in" onclick={() => (lightboxIndex = i)}>
						<img
							src={photo.asset
								? urlFor(photo).width(400).height(240).url()
								: photo.url}
							alt={photo.alt ||
								photo.caption ||
								`${facility.name} photo ${i + 1}`}
							class="rounded border border-warm-grey object-cover h-[120px] max-w-[200px]"
						/>
						{#if photo.caption || photo.attribution}
							<p class="text-[9px] text-mid-grey mt-1 truncate max-w-[200px]">
								{photo.caption || ''}{#if photo.attribution}{photo.caption
									? ' — '
									: ''}{photo.attribution}{/if}
							</p>
						{/if}
					</button>
				{/each}
			</div>
		{/if}

		<!-- Facility section -->
		<div class="mb-5">
			<div
				class="text-[10px] text-mid-grey uppercase tracking-widest mb-2 pb-1 border-b border-dark-grey"
			>
				Facility
			</div>
			{@render kv('code', facility.code)}
			{@render kv('network', facility.network?.name)}
			{@render kv('region', facility.region?.name)}
			{@render kv(
				'location',
				facility.location?.lat && facility.location?.lng
					? `${facility.location.lat.toFixed(5)}, ${facility.location.lng.toFixed(5)}`
					: null
			)}
			{@render kvLink('website', facility.website ? 'facility website' : null, facility.website, 'Website')}
			{@render kvLink('wikipedia', facility.wikipedia, facility.wikipedia, EXTERNAL_LINKS.wikipedia.label)}
			{@render kvLink('wikidata_id', facility.wikidata_id, facility.wikidata_id ? `${EXTERNAL_LINKS.wikidata.baseUrl}/${facility.wikidata_id}` : null, EXTERNAL_LINKS.wikidata.label)}
			<!-- osm_way_id with fetch/view button -->
		<div class="grid grid-cols-3 gap-2 py-[3px] border-b border-warm-grey/60">
			<span class="text-[11px] text-mid-grey font-mono truncate" title="osm_way_id">osm_way_id</span>
			{#if facility.osm_way_id}
				<span class="text-[12px] text-dark-grey font-mono col-span-2 inline-flex items-center gap-1.5">
					<a href="{EXTERNAL_LINKS.openStreetMap.baseUrl}/way/{facility.osm_way_id}" target="_blank" rel="noopener noreferrer" title="Open on {EXTERNAL_LINKS.openStreetMap.label} (new tab)" class="inline-flex items-center gap-1 underline decoration-dotted decoration-mid-grey underline-offset-2 hover:text-black hover:decoration-solid hover:decoration-dark-grey">{facility.osm_way_id}<ExternalLink size={10} class="flex-shrink-0" /></a>
					{#if osmStatus === 'loading'}
						<button disabled class="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border border-warm-grey text-mid-grey cursor-not-allowed">
							<span class="w-3 h-3 border-[1.5px] border-mid-grey/60 border-t-dark-grey rounded-full animate-spin"></span>
							Fetching
						</button>
					{:else if osmStatus === 'ok'}
						<button onclick={onfetchosm} class="text-[10px] px-1.5 py-0.5 rounded border border-warm-grey text-dark-grey hover:bg-warm-grey/50 hover:border-dark-grey transition-colors cursor-pointer">View</button>
					{:else if osmStatus === 'not-found'}
						<span class="text-[10px] text-amber-500" title="No polygon found for this OSM ID">&#9888;</span>
					{:else if osmStatus === 'error'}
						<button onclick={onfetchosm} class="text-[10px] px-1.5 py-0.5 rounded border border-red-300 text-red-500 hover:bg-red-50 hover:border-red-400 transition-colors cursor-pointer">Retry</button>
					{:else}
						<button onclick={onfetchosm} class="text-[10px] px-1.5 py-0.5 rounded border border-warm-grey text-dark-grey hover:bg-warm-grey/50 hover:border-dark-grey transition-colors cursor-pointer">Fetch</button>
					{/if}
				</span>
			{:else}
				<span class="text-[12px] text-mid-grey/50 font-mono col-span-2">—</span>
			{/if}
		</div>
			{@render kv('npi_id', facility.npiId)}
		</div>

		<!-- Description -->
		{#if facility.description?.length > 0}
			<div class="mb-5">
				<div
					class="text-[10px] text-mid-grey uppercase tracking-widest mb-2 pb-1 border-b border-dark-grey"
				>
					Description
				</div>
				<div class="text-[12px] text-dark-grey leading-relaxed font-sans">
					{#each facility.description as block, i (block._key || i)}
						{#if block._type === 'block'}
							<p class="mb-1.5">
								{block.children
									?.map((/** @type {any} */ c) => c.text)
									.join('') || ''}
							</p>
						{/if}
					{/each}
				</div>
			</div>
		{/if}

		<!-- Owners -->
		{#if facility.owners?.length > 0}
			<div class="mb-5">
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
								title="Open website (new tab)"
								class="text-[12px] text-dark-grey hover:text-black inline-flex items-center gap-1 underline decoration-dotted decoration-mid-grey underline-offset-2 hover:decoration-solid hover:decoration-dark-grey focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dark-grey rounded-sm"
							>{owner.name || owner.legal_name}<ExternalLink size={10} class="flex-shrink-0" /></a>
						{:else}
							<span class="text-[12px] text-dark-grey">{owner.name || owner.legal_name}</span>
						{/if}
						{#if owner.contact_email}
							<a
								href="mailto:{owner.contact_email}"
								title="Send email to {owner.contact_email}"
								class="text-[10px] text-mid-grey hover:text-dark-grey underline decoration-dotted decoration-mid-grey underline-offset-2 hover:decoration-solid hover:decoration-dark-grey focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dark-grey rounded-sm"
							>{owner.contact_email}</a>
						{/if}
					</div>
				{/each}
			</div>
		{/if}

		<!-- Metadata -->
		{#if facility.metadata_array?.length > 0}
			<div class="mb-5">
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
			<div>
				<div
					class="text-[10px] text-mid-grey uppercase tracking-widest mb-2 pb-1 border-b border-dark-grey"
				>
					Units ({facility.units.length})
				</div>
				{#each facility.units as unit (unit._id)}
					<button
						onclick={() => onselectunit?.(unit.code)}
						class="w-full text-left grid grid-cols-[16px_8px_1fr_50px_14px] items-center gap-2 py-1.5 px-1 hover:bg-warm-grey/50 rounded transition-colors {selectedUnitCode === unit.code ? 'bg-warm-grey/30' : ''}"
					>
						<FacilityStatusIcon status={unit.status || 'operating'} />
						<span
							class="w-2 h-2 rounded-full"
							style="background: {ftColour(unit.fuel_technology?.code)}"
						></span>
						<span class="text-[11px] text-dark-grey truncate"
							>{unit.code || '—'}</span
						>
						<span class="text-[10px] text-mid-grey tabular-nums text-right"
							>{fmtCap(unit.capacity_registered)}</span
						>
						<ChevronRight
							size={10}
							class="text-mid-grey/50"
						/>
					</button>
				{/each}
			</div>
		{/if}
	</div>
	</div>

	<!-- Unit detail slide-in panel -->
	{#if selectedUnit}
		<div
			class="absolute inset-y-0 right-0 flex z-20 shadow-lg"
			style="width: {unitPanelDrag.value}px;"
			transition:fly={{ x: unitPanelDrag.value, duration: 200 }}
		>
			<DragHandle axis="x" onstart={unitPanelDrag.start} active={unitPanelDrag.isDragging} class="border-l border-warm-grey" />
			<div class="flex-1 bg-white border-l border-warm-grey flex flex-col overflow-hidden">
				<PanelHeader>
					<FacilityStatusIcon status={displayUnit?.status || 'operating'} />
					<span
						class="w-2.5 h-2.5 rounded-full flex-shrink-0"
						style="background: {ftColour(displayUnit?.fuel_technology?.code)}"
					></span>
					<span class="text-[12px] font-medium text-dark-grey flex-1 truncate"
						>{displayUnit?.code}</span
					>
					<button
						onclick={() => onselectunit?.(null)}
						class="p-1 hover:bg-warm-grey rounded transition-colors"
					>
						<X size={12} class="text-mid-grey" />
					</button>
				</PanelHeader>

				<!-- Scrollable content -->
				<div class="flex-1 overflow-y-auto p-4">
					<!-- Unit fields -->
					{@render kv('code', displayUnit?.code)}
					{@render kv('fuel_technology', displayUnit?.fuel_technology?.name)}
					{@render kv('ft_code', displayUnit?.fuel_technology?.code)}
					{@render kv(
						'renewable',
						displayUnit?.fuel_technology?.renewable != null
							? String(displayUnit.fuel_technology.renewable)
							: null
					)}
					{@render kv('dispatch_type', displayUnit?.dispatch_type)}
					{@render kv(
						'ft_dispatch_type',
						displayUnit?.fuel_technology?.dispatch_type
					)}
					{@render kv('status', displayUnit?.status)}
					{@render kv(
						'capacity_registered',
						displayUnit?.capacity_registered != null
							? `${displayUnit.capacity_registered} MW`
							: null
					)}
					{@render kv(
						'capacity_maximum',
						displayUnit?.capacity_maximum != null
							? `${displayUnit.capacity_maximum} MW`
							: null
					)}
					{@render kv(
						'storage_capacity',
						displayUnit?.storage_capacity != null
							? `${displayUnit.storage_capacity} MWh`
							: null
					)}
					{@render kv(
						'min_generation',
						displayUnit?.min_generation_capacity != null
							? `${displayUnit.min_generation_capacity} MW`
							: null
					)}
					{@render kv(
						'grid_forming',
						displayUnit?.grid_forming != null
							? String(displayUnit.grid_forming)
							: null
					)}
					{@render kv('marginal_loss_factor', displayUnit?.marginal_loss_factor)}
					{@render kv('emissions_co2', displayUnit?.emissions_factor_co2)}
					{@render kv('emissions_source', displayUnit?.emissions_factor_source)}
					{@render kv('data_first_seen', displayUnit?.data_first_seen)}
					{@render kv('data_last_seen', displayUnit?.data_last_seen)}
					{@render kv(
						'commissioning_confirmed',
						displayUnit?.commissioning_confirmed != null
							? String(displayUnit.commissioning_confirmed)
							: null
					)}
					{@render kv('expected_operation', displayUnit?.expected_operation_date)}
					{@render kv(
						'expected_op_specificity',
						displayUnit?.expected_operation_date_specificity
					)}
					{@render kv('expected_closure', displayUnit?.expected_closure_date)}
					{@render kv(
						'expected_cl_specificity',
						displayUnit?.expected_closure_date_specificity
					)}
					{@render kv('commencement_date', displayUnit?.commencement_date)}
					{@render kv(
						'commencement_specificity',
						displayUnit?.commencement_date_specificity
					)}
					{@render kv('closure_date', displayUnit?.closure_date)}
					{@render kv(
						'closure_specificity',
						displayUnit?.closure_date_specificity
					)}
					{@render kv('construction_start', displayUnit?.construction_start_date)}
					{@render kv('construction_cost', displayUnit?.construction_cost)}
					{@render kv(
						'cis_tender_recipient',
						displayUnit?.cis_tender_recipient != null
							? String(displayUnit.cis_tender_recipient)
							: null
					)}

					<!-- Unit types -->
					{#if displayUnit?.unit_types?.length > 0}
						<div class="mt-3 pt-3 border-t border-warm-grey/60">
							<div
								class="text-[9px] text-mid-grey uppercase tracking-widest mb-1"
							>
								Unit Types ({displayUnit.unit_types.length})
							</div>
							{#each displayUnit.unit_types as ut, i (ut._id || i)}
								{#if i > 0}
									<div class="border-t border-warm-grey/40 mt-1 pt-1"></div>
								{/if}
								{@render kv('unit_number', ut.unit_number)}
								{@render kv('unit_size', ut.unit_size)}
								{@render kv(
									'capacity',
									ut.capacity != null ? `${ut.capacity} MW` : null
								)}
								{@render kv('brand', ut.unit_brand)}
								{@render kv('model', ut.unit_model)}
								{@render kv('model_year', ut.unit_model_year)}
								{@render kvLink('model_url', ut.unit_model_url ? 'model website' : null, ut.unit_model_url, 'Manufacturer')}
								{@render kv(
									'height',
									ut.unit_height != null ? `${ut.unit_height} m` : null
								)}
								{@render kv(
									'weight',
									ut.unit_weight != null ? `${ut.unit_weight} t` : null
								)}
								{@render kv('mounting_type', ut.mounting_type)}
								{@render kv(
									'efficiency',
									ut.unit_efficiency != null
										? `${ut.unit_efficiency}%`
										: null
								)}
							{/each}
						</div>
					{/if}

					<!-- Unit metadata -->
					{#if displayUnit?.metadata_array?.length > 0}
						<div class="mt-3 pt-3 border-t border-warm-grey/60">
							<div
								class="text-[9px] text-mid-grey uppercase tracking-widest mb-1"
							>
								Metadata
							</div>
							{#each displayUnit.metadata_array as meta, i (i)}
								{@render kv(meta.key, meta.value)}
							{/each}
						</div>
					{/if}
				</div>
			</div>
		</div>
	{/if}

	<!-- Photo lightbox -->
	{#if lightboxPhoto}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
			transition:fade={{ duration: 150 }}
			onclick={() => (lightboxIndex = -1)}
			onkeydown={(e) => {
				if (e.key === 'Escape') lightboxIndex = -1;
				else if (e.key === 'ArrowLeft' && lightboxIndex > 0) lightboxIndex--;
				else if (e.key === 'ArrowRight' && lightboxIndex < (facility.photos?.length ?? 1) - 1) lightboxIndex++;
			}}
		>
			<!-- Close button -->
			<button
				class="absolute top-4 right-4 p-2 text-white/70 hover:text-white transition-colors"
				onclick={() => (lightboxIndex = -1)}
			>
				<X size={20} />
			</button>

			<!-- Navigation arrows -->
			{#if facility.photos?.length > 1}
				{#if lightboxIndex > 0}
					<button
						class="absolute left-4 top-1/2 -translate-y-1/2 p-2 text-white/50 hover:text-white transition-colors"
						onclick={(e) => { e.stopPropagation(); lightboxIndex--; }}
					>
						<ChevronRight size={24} class="rotate-180" />
					</button>
				{/if}
				{#if lightboxIndex < (facility.photos?.length ?? 1) - 1}
					<button
						class="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-white/50 hover:text-white transition-colors"
						onclick={(e) => { e.stopPropagation(); lightboxIndex++; }}
					>
						<ChevronRight size={24} />
					</button>
				{/if}
			{/if}

			<!-- Image + caption -->
			<!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
			<div class="flex flex-col items-center gap-3" onclick={(e) => e.stopPropagation()}>
				<img
					src={lightboxPhoto.asset
						? urlFor(lightboxPhoto).url()
						: lightboxPhoto.url}
					alt={lightboxPhoto.alt ||
						lightboxPhoto.caption ||
						`${facility.name} photo`}
					class="max-h-[85vh] max-w-[90vw] object-contain rounded"
				/>
				{#if lightboxPhoto.caption || lightboxPhoto.attribution}
					<p class="text-xs text-white/70 text-center max-w-[60vw]">
						{lightboxPhoto.caption || ''}{#if lightboxPhoto.attribution}{lightboxPhoto.caption ? ' — ' : ''}{lightboxPhoto.attribution}{/if}
					</p>
				{/if}
				{#if facility.photos?.length > 1}
					<p class="text-[10px] text-white/40">
						{lightboxIndex + 1} / {facility.photos.length}
					</p>
				{/if}
			</div>
		</div>
	{/if}
</div>
