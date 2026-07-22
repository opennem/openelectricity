<script>
	import { Zap, Globe, FileText } from '@lucide/svelte';
	import FuelTechBadge from '$lib/components/FuelTechBadge.svelte';
	import FacilityStatusIcon from '$lib/components/facilities/FacilityStatusIcon.svelte';
	import { getRegionLabel } from '$lib/facilities/filters.js';
	import { getFueltechColor } from '$lib/utils/fueltech-display';
	import { formatCapacity } from '$lib/utils/formatters';
	import { bestMw, asUrl, isEstimated, STATUS_LABELS } from '$lib/facilities/data-centres.js';

	/**
	 * Header for the data centre (load) detail pane — mirrors
	 * FacilityPanelHeader's colour-wash layout, on the data_centre purple.
	 * The wash is light, so all text is fixed to the dark scheme.
	 *
	 * @type {{
	 *   facility?: any | null,
	 *   topBar?: import('svelte').Snippet<[boolean]>
	 * }}
	 */
	let { facility = null, topBar = undefined } = $props();

	let record = $derived(facility?.dataCentre ?? null);
	// The synthesised unit's status_id IS the DC status bucket (see
	// toLoadFacilities), so it keys both the dot colour and the label.
	/** @type {import('$lib/facilities/data-centres.js').DataCentreStatusBucket | null} */
	let statusId = $derived(facility?.units?.[0]?.status_id ?? null);
	let regionLabel = $derived(
		facility ? getRegionLabel(facility.network_id, facility.network_region ?? '') : ''
	);
	let locationLabel = $derived(
		record ? [record.city, record.state].filter(Boolean).join(', ') : ''
	);
	let load = $derived(record ? bestMw(record) : { mw: null, mwField: null, sourceLabel: null });
	let loadIsEstimate = $derived(!!record && isEstimated(record, load.mwField));
	let websiteUrl = $derived(asUrl(record?.website));
	let planningUrl = $derived(asUrl(record?.planning_url));

	const washColour = getFueltechColor('data_centre');
</script>

{#snippet linkPill(
	/** @type {string} */ href,
	/** @type {any} */ Icon,
	/** @type {string} */ label
)}
	<a
		{href}
		target="_blank"
		rel="noopener noreferrer"
		class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium bg-black/10 text-black/70 hover:bg-black/20 hover:text-black transition-colors"
	>
		<Icon size={12} />
		{label}
	</a>
{/snippet}

{#if facility && record}
	<header class="relative shrink-0 overflow-hidden" style="background-color: {washColour}">
		<!-- Same subtle diagonal sheen as the facility header's colour wash. -->
		<div
			class="absolute inset-0"
			style="background: linear-gradient(135deg, rgba(255,255,255,0.07), rgba(0,0,0,0.24));"
		></div>

		<div class="relative z-10 flex flex-col gap-5 px-6 py-6 tablet:gap-7 tablet:px-10 tablet:py-8">
			{#if topBar}
				<div class="-mx-6 -mt-6 tablet:-mx-10 tablet:-mt-8">{@render topBar(true)}</div>
			{/if}

			<!-- Identity: data centre badge + name. Mirrors FuelTechBadgeStack's
			     wrapper (flex row so the block-level badge shrinks to content, and
			     a white ring so the purple badge reads against the same-purple
			     header wash — cf. FacilityPanelHeader's ring="ring-1 ring-white"). -->
			<div class="space-y-2 min-w-0">
				<div class="flex">
					<span class="rounded-full block ring-1 ring-white">
						<FuelTechBadge fuelTech="data_centre" size="lg" showStatus={false} />
					</span>
				</div>
				<h2 class="m-0 max-w-full truncate text-xl font-semibold tablet:text-2xl text-black">
					{facility.name}
				</h2>
				{#if record.company}
					<div class="text-sm text-black/65">{record.company}</div>
				{/if}
			</div>

			<!-- Metadata (left) + load headline (right) -->
			<div
				class="grid grid-cols-1 gap-6 tablet:grid-cols-[minmax(0,1fr)_auto] tablet:items-end tablet:gap-8"
			>
				<div class="space-y-2 min-w-0">
					<div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-space text-black">
						{#if statusId}
							<span class="inline-flex items-center gap-1.5 font-medium shrink-0">
								<FacilityStatusIcon status={statusId} />
								{STATUS_LABELS[statusId]}
							</span>
						{/if}
						{#if regionLabel}
							<span class="shrink-0 before:content-['·'] before:mr-4 before:text-black/40">
								{regionLabel}
							</span>
						{/if}
						{#if locationLabel}
							<span class="shrink-0 before:content-['·'] before:mr-4 before:text-black/40">
								{locationLabel}
							</span>
						{/if}
					</div>

					{#if websiteUrl || planningUrl}
						<div class="flex flex-wrap items-center gap-1.5">
							{#if websiteUrl}
								{@render linkPill(websiteUrl, Globe, 'Website')}
							{/if}
							{#if planningUrl}
								{@render linkPill(planningUrl, FileText, 'Planning application')}
							{/if}
						</div>
					{/if}
				</div>

				<div class="flex flex-col items-start gap-1 tablet:items-end">
					<span
						class="text-[10px] uppercase tracking-wider inline-flex items-center gap-1 text-black/65"
					>
						<Zap size={10} />
						{load.sourceLabel ? `Load (${load.sourceLabel})` : 'Load'}
					</span>
					<span class="text-xl font-mono font-bold leading-none tabular-nums text-black">
						{#if load.mw !== null}
							{loadIsEstimate ? '~' : ''}{formatCapacity(load.mw)}<span
								class="ml-1 text-xs font-normal text-black/65">MW</span
							>
						{:else}
							—
						{/if}
					</span>
				</div>
			</div>
		</div>
	</header>
{/if}
