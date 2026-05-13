<script>
	/**
	 * FacilityPanelHeader — two-column header for the facility detail panel.
	 * Left column: fuel-tech icons, name, region, links. Right column: capacity
	 * metric + per-fueltech/status unit breakdown.
	 */

	import { BatteryMedium, BookOpen, ExternalLink, Globe, X, Zap } from '@lucide/svelte';
	import {
		getExploreUrl,
		groupUnits,
		hasBidirectionalBattery,
		filterDerivedBatteryUnits
	} from '../_utils/units';
	import { getRegionLabel, getRegionLongLabel } from '../_utils/filters';
	import formatValue from '../_utils/format-value';
	import FuelTechBadge from '$lib/components/FuelTechBadge.svelte';
	import FacilityStatusIcon from '$lib/components/facilities/FacilityStatusIcon.svelte';
	import Tooltip from '$lib/components/ui/Tooltip.svelte';
	import { CAPACITY_TOOLTIP } from '../_utils/capacity-tooltip.js';
	import { EXTERNAL_LINKS } from '$lib/constants/external-links.js';
	import { fuelTechNameMap } from '$lib/fuel_techs.js';
	import { getFueltechColor } from '$lib/utils/fueltech-display';
	import { sortByDetailedOrder } from '$lib/fuel-tech-groups/detailed';

	/**
	 * @type {{
	 *   facility: any,
	 *   sanityFacility?: any | null,
	 *   onclose?: () => void,
	 *   showViewButtons?: boolean
	 * }}
	 */
	let { facility, sanityFacility = null, onclose, showViewButtons = true } = $props();

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

	let explorePath = $derived(getExploreUrl(facility));
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
		facility ? sortByDetailedOrder(groupUnits(facility, { skipBattery: true }), { reverse: true }) : []
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

	// De-duplicate by fueltech_id for the overlapped icon row. Inherits the
	// reversed order from `unitGroups` (top-of-stack first).
	let headerFuelTechs = $derived.by(() => {
		/** @type {Map<string, any>} */
		const seen = new Map();
		for (const group of unitGroups) {
			if (!seen.has(group.fueltech_id)) {
				seen.set(group.fueltech_id, group);
			}
		}
		return Array.from(seen.values());
	});
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
					{#if headerFuelTechs.length}
						<div class="flex items-center shrink-0 gap-1 md:gap-0">
							{#each headerFuelTechs as group, i (group.fueltech_id)}
								<span
									class="rounded-full ring-2 ring-white block {i > 0 ? 'md:-ml-2.5' : ''}"
									style="z-index: {headerFuelTechs.length - i};"
								>
									<FuelTechBadge
										fuelTech={group.fueltech_id}
										status={group.status_id}
										isCommissioning={group.isCommissioning}
										size="lg"
									/>
								</span>
							{/each}
						</div>
					{/if}

					<h2
						class="basis-full order-last text-lg font-semibold text-dark-grey truncate m-0 md:basis-auto md:order-none md:flex-1 md:min-w-0"
					>
						{facility.name}
					</h2>

					{#if showViewButtons}
						<a
							href={explorePath}
							target="_blank"
							rel="noopener noreferrer"
							class="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-dark-grey hover:bg-black rounded-md transition-colors no-underline hover:no-underline"
						>
							<ExternalLink size={12} />
							View
						</a>
					{/if}

					{#if onclose}
						<button
							onclick={onclose}
							class="shrink-0 p-1.5 rounded-lg hover:bg-warm-grey transition-colors text-mid-grey hover:text-dark-grey cursor-pointer"
							aria-label="Close panel"
						>
							<X size={18} />
						</button>
					{/if}
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

			<!-- Right column: total capacity headline + proportion bar + per-group breakdown -->
			<div
				class="min-w-0 w-full rounded-lg border border-warm-grey bg-light-warm-grey/40 p-4 md:w-[360px] md:rounded-none md:border-0 md:bg-transparent md:p-0 {activeUnitGroups.length >
				1
					? ''
					: 'md:self-center'}"
			>
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

				{#if activeUnitGroups.length > 1 && totalCapacity > 0}
					<div class="mt-3 flex h-1.5 w-full overflow-hidden rounded-full bg-warm-grey/40">
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

					<div class="mt-3 space-y-1.5">
						{#each unitGroups as group (group.fueltech_id + '|||' + group.status_id)}
							{@const cap = group.capacity_maximum || group.capacity_registered}
							<div
								class="flex items-center gap-2 text-xs {group.status_id === 'retired'
									? 'opacity-50'
									: ''}"
							>
								<Tooltip text={group.status_id} class="capitalize cursor-help shrink-0">
									<FuelTechBadge
										fuelTech={group.fueltech_id}
										status={group.status_id}
										isCommissioning={group.isCommissioning}
										size="md"
									/>
								</Tooltip>
								<span class="text-dark-grey font-medium truncate">
									{fuelTechNameMap[group.fueltech_id] ?? group.fueltech_id}
								</span>
								<div class="ml-auto flex items-center gap-3 shrink-0">
									{#if group.capacity_storage > 0}
										<span
											class="inline-flex items-center gap-1 font-mono text-dark-grey tabular-nums"
										>
											<BatteryMedium size={11} class="text-mid-grey shrink-0" />
											{formatValue(group.capacity_storage)}<span
												class="ml-0.5 text-[10px] font-normal text-mid-grey">MWh</span
											>
										</span>
									{/if}
									<span
										class="font-mono text-dark-grey tabular-nums {group.capacity_storage > 0
											? `before:content-['·'] before:mr-3 before:text-mid-grey`
											: ''}"
									>
										{formatValue(cap)}<span class="ml-1 text-[10px] font-normal text-mid-grey"
											>MW</span
										>
									</span>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	</header>
{/if}
