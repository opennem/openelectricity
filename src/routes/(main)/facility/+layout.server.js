import { OpenElectricityClient } from 'openelectricity';
import { PUBLIC_OE_API_KEY, PUBLIC_OE_API_URL } from '$env/static/public';
import { hasBidirectionalBattery, filterDerivedBatteryUnits } from '../facilities/_utils/units.js';

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

export function load() {
	const facilities = client
		.getFacilities()
		.then((r) =>
			(r.response.data || [])
				.map((f) => {
					const units = filterDerivedBatteryUnits(f.units || [], hasBidirectionalBattery(f));
					const capacity = units.reduce(
						(/** @type {number} */ sum, /** @type {any} */ u) =>
							sum + (Number(u.capacity_maximum ?? u.capacity_registered) || 0),
						0
					);
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
						capacity
					};
				})
				.sort((a, b) => a.name.localeCompare(b.name))
		)
		.catch(() => /** @type {FacilityListItem[]} */ ([]));

	return {
		facilities
	};
}
