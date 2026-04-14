<script>
	/**
	 * FacilityOeDetail — renders an OE API facility object in the standard
	 * panel layout (name, description, fuel-tech badges, map, units table,
	 * external link).
	 */

	import { MapPin, ExternalLink } from '@lucide/svelte';
	import { fuelTechColourMap } from '$lib/theme/openelectricity';
	import { FacilityUnitsTable } from '$lib/components/charts/facility';
	import { analyzeUnits } from '$lib/components/charts/facility/unit-analysis.js';
	import { groupUnits, getExploreUrl } from '../../../facilities/_utils/units';
	import FuelTechBadge from '../../../facilities/_components/FuelTechBadge.svelte';
	import FacilityLocationMap from './FacilityLocationMap.svelte';

	/**
	 * @typedef {Object} Props
	 * @property {string} label          Panel label (e.g. "OE API", "Single facility call")
	 * @property {any | null} facility   Facility object from OE API
	 */

	/** @type {Props} */
	let { label, facility } = $props();

	/**
	 * @param {string} ftCode
	 */
	function getFuelTechColor(ftCode) {
		return fuelTechColourMap[/** @type {keyof typeof fuelTechColourMap} */ (ftCode)] || '#888888';
	}

	let analysis = $derived.by(() => {
		if (!facility) return null;
		return analyzeUnits(facility, getFuelTechColor);
	});

	let unitColours = $derived(analysis?.unitColours ?? {});
	let unitGroups = $derived(facility ? groupUnits(facility) : []);
	let explorePath = $derived(getExploreUrl(facility));

	let primaryFuelTechColor = $derived.by(() => {
		if (!facility?.units?.length) return '#353535';
		/** @type {Record<string, number>} */
		const counts = {};
		for (const unit of facility.units) {
			const ft = unit.fueltech_id;
			if (ft) counts[ft] = (counts[ft] || 0) + 1;
		}
		let maxFt = null;
		let maxCount = 0;
		for (const [ft, count] of Object.entries(counts)) {
			if (count > maxCount) {
				maxCount = count;
				maxFt = ft;
			}
		}
		return maxFt ? getFuelTechColor(maxFt) : '#353535';
	});
</script>

<div class="p-4">
	<div
		class="text-[10px] text-mid-grey uppercase tracking-widest mb-3 pb-1 border-b border-dark-grey"
	>
		{label}
	</div>

	{#if !facility}
		<p class="text-sm text-mid-grey">No facility data.</p>
	{:else}
		<h2 class="text-lg font-semibold text-dark-grey leading-snug">
			{facility.name}
		</h2>

		<!-- Description -->
		{#if facility.description}
			<div
				class="text-sm leading-relaxed text-mid-grey mt-3 [&_a]:text-dark-grey [&_a]:underline [&_p]:mb-[1em] [&_ul]:list-disc [&_ul]:ml-8 [&_ol]:list-decimal [&_ol]:ml-8"
			>
				{@html facility.description}
			</div>
		{/if}

		<!-- Fuel tech badges -->
		{#if unitGroups.length}
			<div class="flex items-center gap-1 mt-3 flex-wrap">
				{#each unitGroups as group (`${group.fueltech_id}-${group.status_id}`)}
					<FuelTechBadge
						fueltech_id={group.fueltech_id}
						status_id={group.status_id}
						isCommissioning={group.isCommissioning}
						size="sm"
					/>
				{/each}
			</div>
		{/if}

		<!-- Map -->
		{#if facility.location?.lat && facility.location?.lng}
			<div class="mt-4">
				<FacilityLocationMap
					lat={facility.location.lat}
					lng={facility.location.lng}
					color={primaryFuelTechColor}
				/>
				<div class="flex items-center gap-1 text-xxs text-mid-grey mt-1.5">
					<MapPin size={10} />
					<span>
						{facility.location.lat.toFixed(4)}, {facility.location.lng.toFixed(4)}
					</span>
				</div>
			</div>
		{/if}

		<!-- Units table -->
		{#if facility.units?.length}
			<div class="mt-4 border border-warm-grey rounded-lg">
				<FacilityUnitsTable units={facility.units} {unitColours} compact detailed />
			</div>
			<p class="text-xxs text-mid-grey mt-1.5">
				Capacity shown is maximum capacity where available, otherwise registered capacity.
			</p>
		{/if}

		<!-- External link -->
		{#if explorePath}
			<div class="mt-3">
				<a
					href={explorePath}
					target="_blank"
					rel="noopener noreferrer"
					class="inline-flex items-center gap-1.5 text-xs text-mid-grey hover:text-dark-grey transition-colors"
				>
					<ExternalLink size={12} />
					View on OpenElectricity
				</a>
			</div>
		{/if}
	{/if}
</div>
