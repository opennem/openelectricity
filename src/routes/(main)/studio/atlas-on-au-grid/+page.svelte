<script>
	import { goto } from '$app/navigation';
	// import FacilityStatusTable from './FacilityStatusTable.svelte';
	import FacilitiesMap from './FacilitiesMap.svelte';
	import Timeline from './Timeline.svelte';
	import Filters from './Filters.svelte';

	let { data } = $props();
	let { view, statuses } = data;

	let { facilities } = $derived(data);

	$inspect('view', view);
	$inspect('statuses', statuses);
	$inspect('facilities', facilities);

	/**
	 * Filter out battery_charging and battery_discharging units from facilities
	 * @param {any[]} facilityList
	 * @returns {any[]}
	 */
	function filterBatteryUnits(facilityList) {
		return facilityList
			.map((facility) => ({
				...facility,
				units: facility.units?.filter(
					(/** @type {any} */ unit) =>
						unit.fueltech_id !== 'battery_charging' && unit.fueltech_id !== 'battery_discharging'
				)
			}))
			.filter((facility) => facility.units && facility.units.length > 0);
	}

	let filteredFacilities = $derived(filterBatteryUnits(facilities));
	$inspect('filteredFacilities', filteredFacilities);

	/**
	 * Check if facility has valid location data
	 * @param {any} facility
	 * @returns {boolean}
	 */
	function hasValidLocation(facility) {
		return (
			facility.location &&
			typeof facility.location.lat === 'number' &&
			typeof facility.location.lng === 'number' &&
			!isNaN(facility.location.lat) &&
			!isNaN(facility.location.lng)
		);
	}

	/**
	 * Filter facilities with valid location data
	 * @param {any[]} facilityList
	 * @returns {any[]}
	 */
	function filterWithLocation(facilityList) {
		return facilityList.filter(hasValidLocation);
	}

	let filteredWithLocation = $derived(filterWithLocation(filteredFacilities));

	let uniqueFuelTechs = $derived([
		...new Set(facilities.map((facility) => facility.units.map((unit) => unit.fueltech_id)).flat())
	]);
	let uniqueStatuses = $derived([
		...new Set(facilities.map((facility) => facility.units.map((unit) => unit.status_id)).flat())
	]);
	let uniqueRegions = $derived([
		...new Set(facilities.map((facility) => facility.network_region).flat())
	]);
	let uniqueNetworkIds = $derived([
		...new Set(facilities.map((facility) => facility.network_id).flat())
	]);

	$inspect('uniqueFuelTechs', uniqueFuelTechs);
	$inspect('uniqueStatuses', uniqueStatuses);
	$inspect('uniqueRegions', uniqueRegions);
	$inspect('uniqueNetworkIds', uniqueNetworkIds);

	function handleRegionsChange(values) {
		console.log('regions', values);
	}

	function handleFuelTechsChange(values) {
		console.log('fuel techs', values);
	}

	function handleStatusesChange(values) {
		console.log('statuses', values);
		// update the url

		goto(`/studio/atlas-on-au-grid?statuses=${values.join(',')}`, {
			noScroll: true,
			invalidateAll: true
		});
	}
</script>

<section class="mb-4">
	<div class="md:container">
		<Filters
			initialStatuses={statuses}
			onstatuseschange={handleStatusesChange}
			onregionschange={handleRegionsChange}
			onfueltechschange={handleFuelTechsChange}
		/>
	</div>
	<FacilitiesMap facilities={filteredWithLocation} />
</section>

<div class="relative z-20 bg-white">
	<div class="max-w-[95vw] mx-auto px-4 py-8">
		<Timeline facilities={filteredFacilities} />

		<!-- <FacilityStatusTable
			facilities={filteredCommittedFacilities}
			statusLabel="Committed"
			statusType="committed"
		/>

		<FacilityStatusTable
			facilities={filteredOperationalFacilities}
			statusLabel="Operating"
			statusType="operating"
		/>

		<FacilityStatusTable
			facilities={filteredRetiredFacilities}
			statusLabel="Retired"
			statusType="retired"
		/> -->
	</div>
</div>
