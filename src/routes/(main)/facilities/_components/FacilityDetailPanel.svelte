<script>
	import { fuelTechColourMap } from '$lib/theme/openelectricity';
	import { fuelTechName } from '$lib/fuel_techs';
	import FuelTechIcon from '$lib/components/FuelTechIcon.svelte';
	import {
		FacilityPowerChart,
		FacilityUnitsTable,
		getNetworkTimezone
	} from '$lib/components/charts/facility';
	import FacilityStatusIcon from './FacilityStatusIcon.svelte';
	import GenCapViz from './GenCapViz.svelte';
	import { getRegionLabel, statusColours } from '../_utils/filters';
	import formatValue from '../_utils/format-value';
	import { ExternalLink, MapPin } from '@lucide/svelte';

	/** Fueltechs that need dark text for contrast */
	const LIGHT_FUELTECHS = ['solar_utility', 'gas_ocgt', 'gas_recip'];

	/**
	 * @type {{
	 *   facility: any | null,
	 *   powerData: any | null
	 * }}
	 */
	let { facility, powerData = null } = $props();

	let timeZone = $derived(facility ? getNetworkTimezone(facility.network_id) : '+10:00');

	/**
	 * Check if fueltech needs dark text (for light backgrounds)
	 * @param {string} fueltech
	 * @returns {boolean}
	 */
	function needsDarkText(fueltech) {
		return LIGHT_FUELTECHS.includes(fueltech);
	}

	/**
	 * Get the background color for a fueltech
	 * @param {string} fueltech
	 * @returns {string}
	 */
	function getFueltechColor(fueltech) {
		return fuelTechColourMap[fueltech] || '#FFFFFF';
	}

	/**
	 * Sum a numeric field across units
	 * @param {any[]} units
	 * @param {string} field
	 * @returns {number}
	 */
	function sumField(units, field) {
		return units.reduce((sum, unit) => sum + (Number(unit[field]) || 0), 0);
	}

	/**
	 * Group units by fueltech_id and status_id
	 * @param {any} fac
	 * @returns {any[]}
	 */
	function groupUnits(fac) {
		if (!fac?.units || fac.units.length === 0) return [];

		/** @type {Map<string, {fueltech_id: string, status_id: string, units: any[]}>} */
		const groups = new Map();

		for (const unit of fac.units) {
			// Skip battery_charging and battery_discharging
			if (unit.fueltech_id === 'battery_charging' || unit.fueltech_id === 'battery_discharging') {
				continue;
			}

			const key = `${unit.fueltech_id}|||${unit.status_id}`;

			if (!groups.has(key)) {
				groups.set(key, {
					fueltech_id: unit.fueltech_id,
					status_id: unit.status_id,
					units: []
				});
			}
			groups.get(key)?.units.push({ ...unit, isCommissioning: unit.isCommissioning });
		}

		return Array.from(groups.values()).map((group) => {
			const capacity_maximum = sumField(group.units, 'capacity_maximum');
			const capacity_registered = sumField(group.units, 'capacity_registered');
			const max_generation = sumField(group.units, 'max_generation');

			return {
				fueltech_id: group.fueltech_id,
				status_id: group.status_id,
				units: group.units,
				isCommissioning: group.units.some((unit) => unit.isCommissioning),
				totalCapacity: capacity_maximum || capacity_registered,
				bgColor: getFueltechColor(group.fueltech_id),
				capacity_maximum,
				capacity_registered,
				max_generation
			};
		});
	}

	let unitGroups = $derived(groupUnits(facility));
	let totalCapacity = $derived(unitGroups.reduce((sum, g) => sum + g.totalCapacity, 0));
	let explorePath = $derived(
		facility
			? `https://explore.openelectricity.org.au/facility/au/${facility.network_id}/${facility.code}/`
			: ''
	);

	/**
	 * Get status label
	 * @param {string} status
	 * @returns {string}
	 */
	function getStatusLabel(status) {
		const labels = {
			operating: 'Operating',
			commissioning: 'Commissioning',
			committed: 'Committed',
			retired: 'Retired'
		};
		return labels[status] || status;
	}
</script>

{#if facility}
	<div class="p-6">
		<!-- Location info -->
		<div class="flex items-center gap-2 text-sm text-mid-grey mb-6">
			<MapPin size={16} />
			<span>{getRegionLabel(facility.network_id, facility.network_region)}</span>
			<span class="text-warm-grey">•</span>
			<span class="uppercase text-xs">{facility.network_id}</span>
		</div>

		<!-- Total capacity summary -->
		<div class="bg-light-warm-grey rounded-lg p-4 mb-6">
			<div class="flex items-baseline justify-between">
				<span class="text-sm text-mid-grey">Total Capacity</span>
				<div class="flex items-baseline gap-1">
					<span class="font-mono text-2xl font-medium text-dark-grey">
						{formatValue(totalCapacity)}
					</span>
					<span class="text-sm text-mid-grey">MW</span>
				</div>
			</div>
		</div>

		<!-- Power Chart -->
		{#if powerData}
			<div class="mb-6">
				<h3 class="text-sm font-medium text-dark-grey mb-3">Power Generation (Last 3 Days)</h3>
				<FacilityPowerChart {facility} {powerData} {timeZone} chartHeight="h-[250px]" />
			</div>
		{/if}

		<!-- Units grouped by fuel tech and status -->
		<div class="space-y-4">
			<h3 class="text-sm font-medium text-dark-grey">Units</h3>

			{#each unitGroups as group (group.fueltech_id + '|||' + group.status_id)}
				<div class="border border-warm-grey rounded-lg p-4">
					<!-- Header with fuel tech icon and status -->
					<div class="flex items-center justify-between mb-3">
						<div class="flex items-center gap-3">
							<span
								class="rounded-full p-2 block relative border-2 border-white shadow-sm"
								class:text-black={needsDarkText(group.fueltech_id)}
								class:text-white={!needsDarkText(group.fueltech_id)}
								style="background-color: {group.bgColor};"
							>
								<FuelTechIcon fuelTech={group.fueltech_id} sizeClass={5} />
								<div class="absolute top-[0.1rem] left-[0.1rem] z-10">
									<FacilityStatusIcon
										status={group.status_id}
										isCommissioning={group.isCommissioning}
										size="small"
									/>
								</div>
							</span>
							<div>
								<div class="font-medium text-dark-grey">{fuelTechName(group.fueltech_id)}</div>
								<div class="flex items-center gap-1 text-xs text-mid-grey">
									<span
										class="w-2 h-2 rounded-full"
										style="background-color: {statusColours[group.status_id]};"
									></span>
									{getStatusLabel(group.status_id)}
									{#if group.isCommissioning}
										<span class="text-orange-500">(commissioning)</span>
									{/if}
								</div>
							</div>
						</div>

						<div class="text-right">
							<div class="flex items-baseline gap-1">
								<span class="font-mono text-lg font-medium text-dark-grey">
									{formatValue(group.totalCapacity)}
								</span>
								<span class="text-xs text-mid-grey">MW</span>
							</div>
							<div class="text-xs text-mid-grey">
								{group.units.length} unit{group.units.length !== 1 ? 's' : ''}
							</div>
						</div>
					</div>

					<!-- Commissioning progress bar -->
					{#if group.isCommissioning && group.max_generation}
						<div class="mt-2">
							<div class="flex items-center justify-between text-xs text-mid-grey mb-1">
								<span>Generation progress</span>
								<span class="font-mono">
									{formatValue(group.max_generation)} / {formatValue(group.totalCapacity)} MW
								</span>
							</div>
							<GenCapViz
								unit={{
									capacity_maximum: group.capacity_maximum,
									capacity_registered: group.capacity_registered,
									max_generation: group.max_generation
								}}
								fill={group.bgColor}
							/>
						</div>
					{/if}
				</div>
			{/each}
		</div>

		<!-- Units Table (with chart-matching colors) -->
		{#if facility.units?.length}
			<div class="mt-6">
				<h3 class="text-sm font-medium text-dark-grey mb-3">All Units</h3>
				<FacilityUnitsTable units={facility.units} compact />
			</div>
		{/if}

		<!-- External link -->
		<div class="mt-6 pt-6 border-t border-warm-grey">
			<a
				href={explorePath}
				target="_blank"
				rel="noopener noreferrer"
				class="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-lg bg-dark-grey text-white hover:bg-black transition-colors text-sm font-medium"
			>
				<ExternalLink size={16} />
				View on OpenElectricity
			</a>
		</div>
	</div>
{/if}
