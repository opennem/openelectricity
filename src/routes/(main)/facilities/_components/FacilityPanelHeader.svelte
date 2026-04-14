<script>
	/**
	 * FacilityPanelHeader — dense two-row header for the facility detail panel.
	 * Used in both the desktop ResizablePanel's header slot and the mobile overlay.
	 */

	import { BatteryMedium, ExternalLink, X, Zap } from '@lucide/svelte';
	import {
		getExploreUrl,
		groupUnits,
		hasBidirectionalBattery,
		filterDerivedBatteryUnits
	} from '../_utils/units';
	import { getRegionLongLabel } from '../_utils/filters';
	import formatValue from '../_utils/format-value';
	import FuelTechBadge from './FuelTechBadge.svelte';

	/**
	 * @type {{
	 *   facility: any,
	 *   onclose?: () => void
	 * }}
	 */
	let { facility, onclose } = $props();

	let explorePath = $derived(getExploreUrl(facility));
	let regionLabel = $derived(
		facility ? getRegionLongLabel(facility.network_id, facility.network_region) : ''
	);
	// Ignore derived battery_charging/discharging units when the facility has a
	// bidirectional battery — they're duplicates of the real `battery` unit and
	// would double-count in icons, unit count, and capacity/storage sums.
	let filteredUnits = $derived(
		filterDerivedBatteryUnits(facility?.units ?? [], hasBidirectionalBattery(facility))
	);
	let unitGroups = $derived(facility ? groupUnits(facility, { skipBattery: true }) : []);
	let totalCapacity = $derived(unitGroups.reduce((sum, g) => sum + g.totalCapacity, 0));
	let totalStorage = $derived(
		filteredUnits.reduce(
			(/** @type {number} */ sum, /** @type {any} */ u) => sum + (Number(u.capacity_storage) || 0),
			0
		)
	);
	let unitCount = $derived(filteredUnits.length);

	// De-duplicate by fueltech_id for the overlapped icon row
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

{#if facility}
	<header class="shrink-0 bg-light-warm-grey/40 border-b border-warm-grey">
		<!-- Row 1: icons · name · view button · close -->
		<div class="flex items-center gap-3 px-6 py-2">
			{#if headerFuelTechs.length}
				<div class="flex items-center shrink-0">
					{#each headerFuelTechs as group, i (group.fueltech_id)}
						<span
							class="rounded-full ring-2 ring-white block"
							style="z-index: {headerFuelTechs.length - i}; {i > 0
								? 'margin-left: -0.625rem;'
								: ''}"
						>
							<FuelTechBadge
								fueltech_id={group.fueltech_id}
								status_id={group.status_id}
								isCommissioning={group.isCommissioning}
								size="md"
							/>
						</span>
					{/each}
				</div>
			{/if}

			<h2 class="text-lg font-semibold text-dark-grey truncate flex-1 min-w-0 m-0">
				{facility.name}
			</h2>

			<a
				href={explorePath}
				target="_blank"
				rel="noopener noreferrer"
				class="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-dark-grey hover:bg-black rounded-md transition-colors no-underline hover:no-underline"
			>
				<ExternalLink size={12} />
				View
			</a>

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

		<!-- Row 2: stat strip — matches the List footer style (+page.svelte:809) -->
		<div class="flex items-center gap-4 px-6 py-2 text-xs font-space flex-wrap border-t border-warm-grey">
			<div class="flex items-center gap-1.5">
				<span class="text-dark-grey">{regionLabel}</span>
			</div>

			<div class="flex items-center gap-1.5 pl-4 border-l border-warm-grey">
				<span class="text-mid-grey">{unitCount}</span>
				<span class="text-mid-grey">unit{unitCount === 1 ? '' : 's'}</span>
			</div>

			<div class="ml-auto flex items-center gap-4">
				{#if totalStorage > 0}
					<div class="flex items-baseline gap-1.5">
						<BatteryMedium size={14} class="text-mid-grey self-center" />
						<span class="text-mid-grey">Storage</span>
						<span class="font-mono font-medium text-dark-grey">{formatValue(totalStorage)}</span>
						<span class="text-mid-grey text-xxs">MWh</span>
					</div>
				{/if}

				<div class="flex items-baseline gap-1.5 {totalStorage > 0 ? 'pl-4 border-l border-warm-grey' : ''}">
					<Zap size={14} class="text-mid-grey self-center" />
					<span class="text-mid-grey">Capacity</span>
					<span class="font-mono font-medium text-dark-grey">{formatValue(totalCapacity)}</span>
					<span class="text-mid-grey text-xxs">MW</span>
				</div>
			</div>

		</div>
	</header>
{/if}
