import { setContext, getContext } from 'svelte';

/**
 * @typedef {{
 *  code: string,
 *  dispatch_type: string,
 *  emissions_factor_co2: number,
 *  fueltech_id: string,
 *  status_id: string,
 *  capacity_registered: number,
 *  data_first_seen?: string,
 *  data_last_seen?: string
 * }} Unit
 */

/**
 * @typedef {{
 *  code: string,
 *  name: string,
 *  network_id: string,
 *  network_region: string,
 *  description: string,
 *  units: Unit[],
 *  hasDataSeen: boolean // derived
 * }} Facility
 */

export class FacilitiesState {
	/** @type {Facility[]} */
	facilities = $state([]);

	facilitiesWithDataSeen = $derived(
		this.facilities.map((facility) => {
			return {
				...facility,
				hasDataSeen: facility.units.some((unit) => unit.data_first_seen && unit.data_last_seen)
			};
		})
	);
}
