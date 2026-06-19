<script>
	/**
	 * FacilityPanelHeader — two-column header for the facility detail panel.
	 * Left column: fuel-tech icons, name, region, links. Right column: capacity
	 * metric + per-fueltech/status unit breakdown.
	 */

	import { Battery, BookOpen, ExternalLink, Globe, Zap } from '@lucide/svelte';
	import {
		groupUnits,
		getOrderedFuelTechGroups,
		hasBidirectionalBattery,
		filterDerivedBatteryUnits
	} from '../_utils/units';
	import { getRegionLabel, getRegionLongLabel } from '../_utils/filters';
	import formatValue from '../_utils/format-value';
	import FuelTechBadge from '$lib/components/FuelTechBadge.svelte';
	import FuelTechBadgeStack from '$lib/components/FuelTechBadgeStack.svelte';
	import FacilityStatusIcon from '$lib/components/facilities/FacilityStatusIcon.svelte';
	import Tooltip from '$lib/components/ui/Tooltip.svelte';
	import { Tooltip as BitsTooltip } from 'bits-ui';
	import { CAPACITY_TOOLTIP } from '../_utils/capacity-tooltip.js';
	import { EXTERNAL_LINKS } from '$lib/constants/external-links.js';
	import { getFueltechColor } from '$lib/utils/fueltech-display';
	import { sortByDetailedOrder } from '$lib/fuel-tech-groups/detailed';

	/**
	 * @type {{
	 *   facility: any,
	 *   sanityFacility?: any | null
	 * }}
	 */
	let { facility, sanityFacility = null } = $props();

	// Mobile tap-to-toggle for the capacity breakdown (hover popover on desktop).
	let mobileExpanded = $state(false);

	let websiteUrl = $derived(sanityFacility?.website ?? null);
	let wikipediaUrl = $derived(sanityFacility?.wikipedia ?? null);
	let wikidataId = $derived(sanityFacility?.wikidata_id ?? null);
	let wikidataUrl = $derived(
		wikidataId ? `${EXTERNAL_LINKS.wikidata.baseUrl}/${wikidataId}` : null
	);
	let owners = $derived(sanityFacility?.owners ?? []);
	let hasLinks = $derived(Boolean(websiteUrl || wikipediaUrl || wikidataUrl));

	let primaryOwner = $derived(owners[0] ?? null);
	let primaryOwnerName = $derived(
		primaryOwner ? primaryOwner.name || primaryOwner.legal_name : null
	);
	let primaryOwnerWebsite = $derived(primaryOwner?.website ?? null);

	/** Earliest commencement year across units. */
	let commissionedYear = $derived.by(() => {
		let earliest = /** @type {string | null} */ (null);
		for (const u of filteredUnits) {
			const d = /** @type {string | null | undefined} */ (u.commencement_date);
			if (!d) continue;
			if (!earliest || d < earliest) earliest = d;
		}
		return earliest ? earliest.slice(0, 4) : null;
	});

	/** Latest closure_date across units — only meaningful when fully retired. */
	let retiredDateLabel = $derived.by(() => {
		let latest = /** @type {string | null} */ (null);
		for (const u of filteredUnits) {
			const d = /** @type {string | null | undefined} */ (u.closure_date);
			if (!d) continue;
			if (!latest || d > latest) latest = d;
		}
		if (!latest) return null;
		const parsed = new Date(latest);
		if (Number.isNaN(parsed.getTime())) return latest;
		return parsed.toLocaleDateString('en-AU', {
			day: 'numeric',
			month: 'short',
			year: 'numeric'
		});
	});

	// Mobile: bordered grid tile matching the metadata row. Desktop: rounded pill.
	const PILL_CLASSES =
		'inline-flex items-center gap-1 px-2 py-1 -mr-px -mb-px text-[11px] text-dark-grey bg-white border border-warm-grey hover:bg-warm-grey hover:text-black transition-colors no-underline md:py-0.5 md:m-0 md:rounded-full';

	let regionLabel = $derived(
		facility ? getRegionLongLabel(facility.network_id, facility.network_region) : ''
	);
	let regionShortLabel = $derived(
		facility ? getRegionLabel(facility.network_id, facility.network_region) : ''
	);
	// Ignore derived battery_charging/discharging units when the facility has a
	// bidirectional battery — they're duplicates of the real `battery` unit and
	// would double-count in icons and capacity sums.
	let filteredUnits = $derived(
		filterDerivedBatteryUnits(facility?.units ?? [], hasBidirectionalBattery(facility))
	);
	// Top-of-stack first so icons, proportion bar, and per-group rows mirror
	// what the chart paints on top.
	let unitGroups = $derived(
		facility
			? sortByDetailedOrder(groupUnits(facility, { skipBattery: true }), { reverse: true })
			: []
	);
	let activeUnitGroups = $derived(
		unitGroups.filter((/** @type {any} */ g) => g.status_id !== 'retired')
	);
	// Fall back to the full set when every group is retired so a fully-retired
	// facility still surfaces its historical capacity rather than '—'.
	let totalCapacityGroups = $derived(activeUnitGroups.length ? activeUnitGroups : unitGroups);
	let totalCapacity = $derived(
		totalCapacityGroups.reduce((/** @type {number} */ sum, g) => sum + g.totalCapacity, 0)
	);

	/**
	 * Rollup status for the whole facility:
	 *  - any unit operating → `operating`
	 *  - all units retired → `retired`
	 *  - otherwise → most common non-retired status (so a few stragglers can't
	 *    pull the facility into `retired` unless every unit is retired)
	 */
	let facilityStatus = $derived.by(() => {
		if (!filteredUnits.length) return null;
		if (filteredUnits.some((/** @type {any} */ u) => u.status_id === 'operating')) {
			return 'operating';
		}
		if (filteredUnits.every((/** @type {any} */ u) => u.status_id === 'retired')) {
			return 'retired';
		}
		/** @type {Record<string, number>} */
		const counts = {};
		for (const u of filteredUnits) {
			if (u.status_id === 'retired' || !u.status_id) continue;
			counts[u.status_id] = (counts[u.status_id] || 0) + 1;
		}
		let top = /** @type {string | null} */ (null);
		let topCount = 0;
		for (const [s, c] of Object.entries(counts)) {
			if (c > topCount) {
				top = s;
				topCount = c;
			}
		}
		return top;
	});

	// Ordered + de-duplicated fuel techs for the overlapped icon row — shared with
	// the facilities list via `getOrderedFuelTechGroups` so the two always match.
	let headerFuelTechs = $derived(getOrderedFuelTechGroups(facility));

	// One row per group. When a facility models its battery as separate
	// `battery_charging` + `battery_discharging` units (no bidirectional
	// `battery` parent), flag them as a pair so the bracket renders.
	let displayRows = $derived.by(() => {
		/** @type {any[]} */
		const rows = [];
		const hasBidirectional = unitGroups.some((/** @type {any} */ g) => g.fueltech_id === 'battery');
		const hasBatteryPair =
			!hasBidirectional &&
			unitGroups.some((/** @type {any} */ g) => g.fueltech_id === 'battery_discharging') &&
			unitGroups.some((/** @type {any} */ g) => g.fueltech_id === 'battery_charging');
		for (const g of unitGroups) {
			const cap = g.capacity_maximum || g.capacity_registered;
			const isPair =
				hasBatteryPair &&
				(g.fueltech_id === 'battery_discharging' || g.fueltech_id === 'battery_charging');
			rows.push({
				fueltechId: g.fueltech_id,
				cap,
				storage: g.capacity_storage,
				status: g.status_id,
				isCommissioning: g.isCommissioning,
				isRetired: g.status_id === 'retired',
				key: `${g.fueltech_id}|||${g.status_id}`,
				pairPosition: /** @type {'top' | 'bottom' | null} */ (
					isPair ? (g.fueltech_id === 'battery_discharging' ? 'top' : 'bottom') : null
				)
			});
		}
		return rows;
	});

	/**
	 * Split a fueltech_id into primary + subtype labels.
	 *   solar_utility → { primary: 'Solar', subtype: 'Utility' }
	 *   battery_discharging → { primary: 'Battery', subtype: 'Discharging' }
	 *   wind → { primary: 'Wind', subtype: '' }
	 * @param {string} ftId
	 */
	function splitFuelTechId(ftId) {
		if (!ftId) return { primary: '', subtype: '' };
		const parts = ftId.split('_');
		const cap = (/** @type {string} */ s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
		return {
			primary: cap(parts[0]),
			subtype: parts.slice(1).map(cap).join(' ')
		};
	}
</script>

{#snippet linkPill(
	/** @type {string} */ href,
	/** @type {any} */ Icon,
	/** @type {string} */ label
)}
	<a {href} target="_blank" rel="noopener noreferrer" class={PILL_CLASSES}>
		<Icon size={11} class="shrink-0" />
		{label}
	</a>
{/snippet}

{#if facility}
	<header class="shrink-0 bg-white border-b border-warm-grey">
		<div class="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto] gap-8 px-10 py-8">
			<!-- Left column: icons · name · region · links -->
			<div class="space-y-2 min-w-0">
				<div class="flex flex-wrap items-center gap-3">
					<FuelTechBadgeStack groups={headerFuelTechs} />

					<h2
						class="basis-full order-last text-lg font-semibold text-dark-grey truncate m-0 md:basis-auto md:order-none md:flex-1 md:min-w-0"
					>
						{facility.name}
					</h2>
				</div>

				<div
					class="!mt-2 flex flex-wrap items-center gap-0 text-xs font-space md:!mt-4 md:items-baseline md:gap-x-4 md:gap-y-1"
				>
					{#if facilityStatus}
						<span
							class="inline-flex items-center gap-1.5 font-medium text-dark-grey shrink-0 border border-warm-grey px-2 py-1 -mr-px -mb-px md:border-0 md:px-0 md:py-0 md:m-0"
						>
							<FacilityStatusIcon status={facilityStatus} />
							{#if facilityStatus === 'retired' && retiredDateLabel}
								Retired on {retiredDateLabel}
							{:else}
								<span class="capitalize">{facilityStatus}</span>
							{/if}
						</span>
					{/if}

					<span
						class="text-dark-grey shrink-0 border border-warm-grey px-2 py-1 -mr-px -mb-px md:border-0 md:px-0 md:py-0 md:m-0 {facilityStatus
							? `md:before:content-['·'] md:before:mr-4 md:before:text-mid-grey`
							: ''}"
					>
						<span class="md:hidden">{regionShortLabel}</span>
						<span class="hidden md:inline">{regionLabel}</span>
					</span>

					{#if commissionedYear}
						<Tooltip
							text="Commissioned"
							class="font-medium text-black cursor-help shrink-0 border border-warm-grey px-2 py-1 -mr-px -mb-px md:border-0 md:px-0 md:py-0 md:m-0 md:before:content-['·'] md:before:mr-4 md:before:text-mid-grey md:before:font-normal"
						>
							{commissionedYear}
						</Tooltip>
					{/if}

					{#if primaryOwnerName}
						<Tooltip
							text="Owner"
							class="inline-flex items-center cursor-help shrink-0 border border-warm-grey px-2 py-1 -mr-px -mb-px md:border-0 md:px-0 md:py-0 md:m-0 md:before:content-['·'] md:before:mr-4 md:before:text-mid-grey md:before:font-normal"
						>
							{#if primaryOwnerWebsite}
								<a
									href={primaryOwnerWebsite}
									target="_blank"
									rel="noopener noreferrer"
									class="font-medium text-black underline hover:underline hover:text-black"
								>
									{primaryOwnerName}
								</a>
							{:else}
								<span class="font-medium text-black">{primaryOwnerName}</span>
							{/if}
						</Tooltip>
					{/if}
				</div>

				{#if hasLinks}
					<div class="flex flex-wrap items-center gap-0 md:gap-1.5">
						{#if websiteUrl}
							{@render linkPill(websiteUrl, Globe, 'Website')}
						{/if}
						{#if wikipediaUrl}
							{@render linkPill(wikipediaUrl, BookOpen, 'Wikipedia')}
						{/if}
						{#if wikidataUrl}
							{@render linkPill(wikidataUrl, ExternalLink, 'Wikidata')}
						{/if}
					</div>
				{/if}
			</div>

			<!-- Right column: total capacity headline + proportion bar; rows live in a hover tooltip -->
			{#snippet capacityHeadline()}
				<div class="flex flex-col items-start gap-1 md:items-end">
					<span
						class="text-[10px] uppercase tracking-wider text-mid-grey inline-flex items-center gap-1"
					>
						<Zap size={10} class="text-mid-grey" />
						<Tooltip
							text={CAPACITY_TOOLTIP.text}
							learnMoreHref={CAPACITY_TOOLTIP.learnMoreHref}
							class="cursor-help"
						>
							Total Capacity
						</Tooltip>
					</span>
					<span class="text-xl font-mono font-bold text-dark-grey leading-none tabular-nums">
						{totalCapacity ? formatValue(totalCapacity) : '—'}<span
							class="ml-1 text-xs font-normal text-mid-grey">MW</span
						>
					</span>
				</div>
			{/snippet}

			{#snippet proportionBar()}
				<div class="mt-3 flex h-3 w-full overflow-hidden rounded-full bg-warm-grey/40">
					{#each activeUnitGroups as group (group.fueltech_id + '|||' + group.status_id)}
						{@const cap = group.capacity_maximum || group.capacity_registered}
						{#if cap > 0}
							<span
								class="block h-full"
								style="width: {(cap / totalCapacity) * 100}%; background-color: {getFueltechColor(
									group.fueltech_id
								)};"
							></span>
						{/if}
					{/each}
				</div>
			{/snippet}

			{#snippet breakdownRows()}
				<div class="divide-y divide-dashed divide-mid-warm-grey/60">
					{#each displayRows as row (row.key)}
						{@const split = splitFuelTechId(row.fueltechId)}
						<div
							class="relative flex items-center gap-2 text-xs py-2 {row.pairPosition
								? 'pl-5'
								: ''} {row.isRetired ? 'opacity-50' : ''}"
						>
							{#if row.pairPosition === 'top'}
								<span
									class="absolute left-1 top-1/2 bottom-0 w-2 border-l border-t border-mid-warm-grey rounded-tl-sm pointer-events-none"
									aria-hidden="true"
								></span>
							{:else if row.pairPosition === 'bottom'}
								<span
									class="absolute left-1 top-0 bottom-1/2 w-2 border-l border-b border-mid-warm-grey rounded-bl-sm pointer-events-none"
									aria-hidden="true"
								></span>
							{/if}
							<Tooltip text={row.status} class="capitalize cursor-help shrink-0">
								<FuelTechBadge
									fuelTech={row.fueltechId}
									status={row.status}
									isCommissioning={row.isCommissioning}
									size="md"
								/>
							</Tooltip>
							<span class="text-dark-grey truncate">
								<span class="font-semibold">{split.primary}</span>
								{#if split.subtype}
									<span class="ml-1 font-normal text-mid-grey">{split.subtype}</span>
								{/if}
							</span>
							<div
								class="ml-auto flex items-center gap-2 shrink-0 font-mono text-dark-grey tabular-nums"
							>
								{#if row.storage > 0}
									<span class="inline-flex items-center gap-1" title="Storage Capacity">
										<Battery size={11} class="text-mid-grey shrink-0" />
										{formatValue(row.storage)}<span
											class="ml-0.5 text-[10px] font-normal text-mid-grey">MWh</span
										>
									</span>
									<span class="text-mid-grey">·</span>
								{/if}
								<span>
									{formatValue(row.cap)}<span class="ml-0.5 text-[10px] font-normal text-mid-grey"
										>MW</span
									>
								</span>
							</div>
						</div>
					{/each}
				</div>
			{/snippet}

			<!-- Right column: headline + bar inline; rows in a hover popover when there's a breakdown -->
			<div
				class="min-w-0 w-full rounded-lg border border-warm-grey bg-light-warm-grey/40 p-4 md:w-[360px] md:rounded-none md:border-0 md:bg-transparent md:p-0 {activeUnitGroups.length >
				1
					? ''
					: 'md:self-center'}"
			>
				{#if activeUnitGroups.length > 1 && totalCapacity > 0}
					<!-- Mobile: tap to toggle inline breakdown -->
					<div class="md:hidden">
						<button
							type="button"
							class="block w-full text-left cursor-pointer"
							onclick={() => (mobileExpanded = !mobileExpanded)}
							aria-expanded={mobileExpanded}
						>
							{@render capacityHeadline()}
							{@render proportionBar()}
						</button>
						{#if mobileExpanded}
							<div class="mt-3">
								{@render breakdownRows()}
							</div>
						{/if}
					</div>

					<!-- Desktop: hover popover -->
					<div class="hidden md:block">
						<BitsTooltip.Provider>
							<BitsTooltip.Root delayDuration={100}>
								<BitsTooltip.Trigger>
									{#snippet child({ props })}
										<div {...props} class="block w-full text-left cursor-pointer">
											{@render capacityHeadline()}
											{@render proportionBar()}
										</div>
									{/snippet}
								</BitsTooltip.Trigger>
								<BitsTooltip.Portal>
									<BitsTooltip.Content sideOffset={8} side="bottom" class="z-[9999]">
										<div
											class="bg-white border border-mid-warm-grey/60 rounded-lg shadow-lg px-4 py-2 min-w-[360px]"
										>
											{@render breakdownRows()}
										</div>
									</BitsTooltip.Content>
								</BitsTooltip.Portal>
							</BitsTooltip.Root>
						</BitsTooltip.Provider>
					</div>
				{:else}
					{@render capacityHeadline()}
				{/if}
			</div>
		</div>
	</header>
{/if}
