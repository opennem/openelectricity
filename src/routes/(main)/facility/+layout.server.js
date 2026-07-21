import { OpenElectricityClient } from 'openelectricity';
import { PUBLIC_OE_API_KEY, PUBLIC_OE_API_URL } from '$env/static/public';
import {
	hasBidirectionalBattery,
	filterDerivedBatteryUnits,
	getFacilityCapacity
} from '$lib/facilities/units.js';

const client = new OpenElectricityClient({
	apiKey: PUBLIC_OE_API_KEY,
	baseUrl: PUBLIC_OE_API_URL
});

/**
 * @typedef {Object} FacilityListItem
 * @property {string} code
 * @property {string} name
 * @property {string} network_id
 * @property {string} network_region
 * @property {string[]} fuel_techs - Unique fueltech_ids across the facility's units
 * @property {number} capacity - Total facility capacity in MW (max per unit, falling back to registered; battery dedup applied)
 */

/**
 * The picker list is identical across every facility page, so memoise it: one OE
 * call serves the whole prerender (and is reused across requests in dev/SSR).
 * @type {Promise<FacilityListItem[]> | null}
 */
let facilitiesPromise = null;
function getFacilitiesList() {
	if (!facilitiesPromise) {
		facilitiesPromise = client
			.getFacilities()
			.then((r) =>
				(r.response.data || [])
					.map((f) => {
						const units = filterDerivedBatteryUnits(f.units || [], hasBidirectionalBattery(f));
						return {
							code: f.code,
							name: f.name,
							network_id: f.network_id,
							network_region: f.network_region,
							fuel_techs: Array.from(
								new Set(
									units
										.map((/** @type {any} */ u) => u.fueltech_id)
										.filter((/** @type {any} */ v) => Boolean(v))
								)
							),
							capacity: getFacilityCapacity(f)
						};
					})
					.sort((a, b) => a.name.localeCompare(b.name))
			)
			.catch(() => /** @type {FacilityListItem[]} */ ([]));
	}
	return facilitiesPromise;
}

export async function load() {
	// Awaited (not streamed) so the layout resolves during prerender — a pending
	// promise would hang the static build.
	return {
		facilities: await getFacilitiesList(),
		// Hide the global Nav/Footer chrome — facility pages are immersive always,
		// matching /facilities. Read by (main)/+layout.svelte; SSR-available so
		// there's no first-paint flash.
		fullscreen: true
	};
}
