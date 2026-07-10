<script>
	/**
	 * FacilityPanelHeader — header for the facility detail panel / page.
	 * The whole header is a dominant fuel-tech colour wash (the no-image
	 * FacilityCardTile background). All content overlays it — the fuel-tech badge
	 * stack + name, then a two-column row with the metadata (status, region,
	 * commissioned year, links) on the left and the total-capacity metric +
	 * per-fueltech/status breakdown on the right. Text + chrome switch between
	 * light and dark for contrast against the colour.
	 */

	import { Battery, BookOpen, ExternalLink, Globe, Zap } from '@lucide/svelte';
	import { groupUnits, hasBidirectionalBattery, filterDerivedBatteryUnits } from '../_utils/units';
	import { getRegionLabel, getRegionLongLabel } from '../_utils/filters';
	import formatValue from '../_utils/format-value';
	import FuelTechBadge from '$lib/components/FuelTechBadge.svelte';
	import FuelTechBadgeStack from '$lib/components/FuelTechBadgeStack.svelte';
	import FacilityStatusIcon from '$lib/components/facilities/FacilityStatusIcon.svelte';
	import Tooltip from '$lib/components/ui/Tooltip.svelte';
	import { Tooltip as BitsTooltip } from 'bits-ui';
	import { CAPACITY_TOOLTIP } from '../_utils/capacity-tooltip.js';
	import { EXTERNAL_LINKS } from '$lib/constants/external-links.js';
	import { getFueltechColor, needsDarkText } from '$lib/utils/fueltech-display';
	import { sortByDetailedOrder } from '$lib/fuel-tech-groups/detailed';
	import { deriveCard } from '$lib/og/facility-card-data.js';
	import { facilityPhotoSrc } from '../_utils/facility-photo.js';

	/**
	 * `topBar` renders chrome flush at the top of the colour wash, above the
	 * identity — the detail panel's action bar, or the standalone
	 * /facility/[code] page's mobile spacer that clears its floating buttons.
	 * It receives `darkText` so callers can colour their controls for contrast
	 * against the banner.
	 *
	 * `card`/`dominantColour`/`darkText` let a caller that already ran `deriveCard`
	 * (the /facilities page derives it for the surrounding chrome) pass it in so it
	 * isn't computed a second time per selection. Omitted on the standalone page,
	 * where they're derived here from `facility`.
	 *
	 * `photoUrl` swaps the colour wash for the facility photo (the Grid-tile
	 * treatment) — used by the mobile detail sheet and the standalone page on
	 * mobile; the colour remains the fallback while the photo loads or when
	 * there is none.
	 * @type {{
	 *   facility: any,
	 *   sanityFacility?: any | null,
	 *   topBar?: import('svelte').Snippet<[boolean]>,
	 *   card?: any | null,
	 *   dominantColour?: string,
	 *   darkText?: boolean,
	 *   photoUrl?: string | null
	 * }}
	 */
	let {
		facility,
		sanityFacility = null,
		topBar = undefined,
		card: cardProp = undefined,
		dominantColour: dominantColourProp = undefined,
		darkText: darkTextProp = undefined,
		photoUrl = null
	} = $props();

	// Mobile tap-to-toggle for the capacity breakdown (hover popover on desktop).
	let mobileExpanded = $state(false);

	let websiteUrl = $derived(sanityFacility?.website ?? null);
	let wikipediaUrl = $derived(sanityFacility?.wikipedia ?? null);
	let wikidataId = $derived(sanityFacility?.wikidata_id ?? null);
	let wikidataUrl = $derived(
		wikidataId ? `${EXTERNAL_LINKS.wikidata.baseUrl}/${wikidataId}` : null
	);
	let hasLinks = $derived(Boolean(websiteUrl || wikipediaUrl || wikidataUrl));

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
	// Total battery storage (MWh) over the same groups as the capacity headline,
	// so both stats agree on active-vs-retired semantics. 0 for non-storage
	// facilities — the headline only renders when there is something to show.
	let totalStorage = $derived(
		totalCapacityGroups.reduce((/** @type {number} */ sum, g) => sum + (g.capacity_storage || 0), 0)
	);

	// Fuel-tech proportions for the capacity donut — each active group's share of
	// total capacity, with a running offset so the arcs stack around the ring.
	let donutSegments = $derived.by(() => {
		if (!totalCapacity) return [];
		let cumulative = 0;
		/** @type {{ key: string, colour: string, fraction: number, offset: number }[]} */
		const out = [];
		for (const g of activeUnitGroups) {
			const cap = g.totalCapacity;
			if (cap <= 0) continue;
			const fraction = cap / totalCapacity;
			out.push({
				key: `${g.fueltech_id}|||${g.status_id}`,
				colour: getFueltechColor(g.fueltech_id),
				fraction,
				offset: cumulative
			});
			cumulative += fraction;
		}
		return out;
	});

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

	// Identity banner — mirrors FacilityCardTile. `deriveCard` gives the ordered,
	// de-duplicated fuel techs and the dominant fuel tech (drives the colour wash);
	// reuse the caller's values when provided so they aren't computed twice.
	let card = $derived(cardProp ?? (facility ? deriveCard(facility) : null));
	let bannerGroups = $derived(
		(card?.fuelTechs ?? []).map((/** @type {string} */ ft) => ({ fueltech_id: ft }))
	);
	let dominantColour = $derived(
		dominantColourProp ?? (card ? getFueltechColor(card.dominant) : 'transparent')
	);
	// Photo banner is darkened by a scrim, so its text is always white. Plain
	// colour washes flip to dark text for the light fuel techs (solar, OCGT…),
	// matching the no-image card tile.
	let photoSrc = $derived(photoUrl ? facilityPhotoSrc(photoUrl, { w: 1200 }) : null);
	let darkText = $derived(
		photoSrc ? false : (darkTextProp ?? (!!card && needsDarkText(card.dominant)))
	);

	// Content overlays the full-height banner, so text + chrome switch between
	// light (on photos / dark colour washes) and dark (on light colour washes).
	let onColourText = $derived(darkText ? 'text-black' : 'text-white');
	let onColourMuted = $derived(darkText ? 'text-black/65' : 'text-white/70');
	let onColourBorder = $derived(darkText ? 'border-black/20' : 'border-white/30');
	let sepColour = $derived(
		darkText ? 'tablet:before:text-black/40' : 'tablet:before:text-white/50'
	);
	// Mobile: bordered grid tile matching the metadata row. Desktop: rounded pill.
	let pillClasses = $derived(
		`inline-flex items-center gap-1 px-2 py-1 -mr-px -mb-px text-[11px] no-underline border transition-colors tablet:m-0 tablet:py-0.5 tablet:rounded-full ${onColourText} ${onColourBorder} ${darkText ? 'hover:bg-black/10' : 'hover:bg-white/15'}`
	);

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
			const cap = g.totalCapacity;
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
	<a {href} target="_blank" rel="noopener noreferrer" class={pillClasses}>
		<Icon size={11} class="shrink-0" />
		{label}
	</a>
{/snippet}

{#if facility}
	<header class="relative shrink-0 overflow-hidden" style="background-color: {dominantColour}">
		{#if photoSrc}
			<!-- Facility photo banner (the Grid-tile treatment) with a scrim so the
			     overlaid content stays legible; the colour shows while it loads. -->
			<img src={photoSrc} alt="" class="absolute inset-0 h-full w-full object-cover" />
			<div class="absolute inset-0 bg-gradient-to-b from-black/30 via-black/45 to-black/60"></div>
		{:else}
			<!-- Dominant fuel-tech colour wash behind all header content, mirroring the
			     no-image FacilityCardTile (with the same subtle diagonal sheen). -->
			<div
				class="absolute inset-0"
				style="background: linear-gradient(135deg, rgba(255,255,255,0.07), rgba(0,0,0,0.24));"
			></div>
		{/if}

		<div class="relative z-10 flex flex-col gap-5 px-6 py-6 tablet:gap-7 tablet:px-10 tablet:py-8">
			{#if topBar}
				<!-- Panel chrome (action bar), pulled flush to the top edge and full-bleed
				     to the side edges so it sits on the colour wash and its controls can
				     hug the card corners rather than the content padding. -->
				<div class="-mx-6 -mt-6 tablet:-mx-10 tablet:-mt-8">{@render topBar(darkText)}</div>
			{/if}
			<!-- Identity: fuel-tech badges + name -->
			<div class="space-y-2 min-w-0">
				<FuelTechBadgeStack
					groups={bannerGroups}
					size="lg"
					showStatus={false}
					ring="ring-1 ring-white"
				/>
				<h2 class="m-0 max-w-full truncate text-xl font-semibold tablet:text-2xl {onColourText}">
					{facility.name}
				</h2>
			</div>

			<!-- Metadata (left) + total capacity (right) -->
			<div
				class="grid grid-cols-1 gap-6 tablet:grid-cols-[minmax(0,1fr)_auto] tablet:items-end tablet:gap-8"
			>
				<!-- Left column: status · region · commissioned · links -->
				<div class="space-y-2 min-w-0">
					<div
						class="flex flex-wrap items-center gap-0 text-xs font-space tablet:items-baseline tablet:gap-x-4 tablet:gap-y-1"
					>
						{#if facilityStatus}
							<span
								class="inline-flex items-center gap-1.5 font-medium shrink-0 border px-2 py-1 -mr-px -mb-px tablet:border-0 tablet:px-0 tablet:py-0 tablet:m-0 {onColourText} {onColourBorder}"
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
							class="shrink-0 border px-2 py-1 -mr-px -mb-px tablet:border-0 tablet:px-0 tablet:py-0 tablet:m-0 {onColourText} {onColourBorder} {facilityStatus
								? `tablet:before:content-['·'] tablet:before:mr-4 ${sepColour}`
								: ''}"
						>
							<span class="tablet:hidden">{regionShortLabel}</span>
							<span class="hidden tablet:inline">{regionLabel}</span>
						</span>

						{#if commissionedYear}
							<Tooltip
								text="Commissioned"
								class="font-medium cursor-help shrink-0 border px-2 py-1 -mr-px -mb-px tablet:border-0 tablet:px-0 tablet:py-0 tablet:m-0 tablet:before:content-['·'] tablet:before:mr-4 tablet:before:font-normal {onColourText} {onColourBorder} {sepColour}"
							>
								{commissionedYear}
							</Tooltip>
						{/if}
					</div>

					{#if hasLinks}
						<div class="flex flex-wrap items-center gap-0 tablet:gap-1.5">
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
					<div class="flex flex-col items-start gap-1 tablet:items-end">
						<span
							class="text-[10px] uppercase tracking-wider inline-flex items-center gap-1 {onColourMuted}"
						>
							<Zap size={10} />
							<Tooltip
								text={CAPACITY_TOOLTIP.text}
								learnMoreHref={CAPACITY_TOOLTIP.learnMoreHref}
								class="cursor-help"
							>
								Total Capacity
							</Tooltip>
						</span>
						<span class="text-xl font-mono font-bold leading-none tabular-nums {onColourText}">
							{totalCapacity ? formatValue(totalCapacity) : '—'}<span
								class="ml-1 text-xs font-normal {onColourMuted}">MW</span
							>
						</span>
					</div>
				{/snippet}

				{#snippet storageHeadline()}
					<div class="flex flex-col items-start gap-1 tablet:items-end">
						<span
							class="text-[10px] uppercase tracking-wider inline-flex items-center gap-1 {onColourMuted}"
						>
							<Battery size={10} />
							<Tooltip text="Total energy the facility's batteries can store" class="cursor-help">
								Storage
							</Tooltip>
						</span>
						<span class="text-xl font-mono font-bold leading-none tabular-nums {onColourText}">
							{formatValue(totalStorage)}<span class="ml-1 text-xs font-normal {onColourMuted}"
								>MWh</span
							>
						</span>
					</div>
				{/snippet}

				<!-- Capacity + (for batteries) storage, side by side. -->
				{#snippet headlineStats()}
					<div class="flex items-end gap-5 tablet:justify-end">
						{@render capacityHeadline()}
						{#if totalStorage > 0}
							{@render storageHeadline()}
						{/if}
					</div>
				{/snippet}

				{#snippet capacityDonut()}
					{@const size = 60}
					{@const seg = 10}
					{@const r = (size - seg) / 2 - 3}
					{@const c = 2 * Math.PI * r}
					<!-- SVG donut of the fuel-tech capacity mix; a slightly wider white ring behind the segments peeks ~1px each edge as a thin border. -->
					<svg
						width={size}
						height={size}
						viewBox="0 0 {size} {size}"
						class="shrink-0 -rotate-90"
						aria-hidden="true"
					>
						<circle
							cx={size / 2}
							cy={size / 2}
							{r}
							fill="none"
							stroke-width={seg + 2}
							stroke="white"
						/>
						{#each donutSegments as s (s.key)}
							<circle
								cx={size / 2}
								cy={size / 2}
								{r}
								fill="none"
								stroke={s.colour}
								stroke-width={seg}
								stroke-dasharray="{s.fraction * c} {c}"
								stroke-dashoffset={-s.offset * c}
							/>
						{/each}
					</svg>
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

				<!-- Right column: headline + donut inline; rows in a popover/expand (on a
				     solid card so the dark-text breakdown stays legible over the banner). -->
				<div
					class="min-w-0 w-full rounded-lg border p-4 tablet:w-[360px] tablet:rounded-none tablet:border-0 tablet:bg-transparent tablet:p-0 {onColourBorder} {darkText
						? 'bg-black/5'
						: 'bg-white/10'} {activeUnitGroups.length > 1 ? '' : 'tablet:self-center'}"
				>
					{#if activeUnitGroups.length > 1 && totalCapacity > 0}
						<!-- Mobile: tap to toggle inline breakdown -->
						<div class="tablet:hidden">
							<button
								type="button"
								class="flex w-full items-center justify-between gap-4 text-left cursor-pointer"
								onclick={() => (mobileExpanded = !mobileExpanded)}
								aria-expanded={mobileExpanded}
							>
								{@render headlineStats()}
								{@render capacityDonut()}
							</button>
							{#if mobileExpanded}
								<div class="mt-3 rounded-lg bg-white p-3">
									{@render breakdownRows()}
								</div>
							{/if}
						</div>

						<!-- Desktop: hover popover -->
						<div class="hidden tablet:block">
							<BitsTooltip.Provider>
								<BitsTooltip.Root delayDuration={100}>
									<BitsTooltip.Trigger>
										{#snippet child({ props })}
											<div
												{...props}
												class="flex w-full items-center justify-end gap-4 text-left cursor-pointer"
											>
												{@render headlineStats()}
												{@render capacityDonut()}
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
						{@render headlineStats()}
					{/if}
				</div>
			</div>
		</div>
	</header>
{/if}
