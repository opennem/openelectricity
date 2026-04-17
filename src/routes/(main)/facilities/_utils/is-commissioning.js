/**
 * Check if a unit has reached more than 90% of its capacity
 * @param {any} unit
 * @param {{ hasBidirectionalBattery?: boolean }} [options]
 * @returns {boolean}
 */
export default function isCommissioning(unit, options = {}) {
	if (unit.status_id !== 'operating') {
		return false;
	}

	// When a bidirectional battery unit exists, the charging/discharging units
	// are derived splits — their low max_generation ratio is an artefact, not commissioning
	if (
		options.hasBidirectionalBattery &&
		(unit.fueltech_id === 'battery_charging' || unit.fueltech_id === 'battery_discharging')
	) {
		return false;
	}

	const cap = Number(unit.capacity_maximum || unit.capacity_registered);
	const gen = Number(unit.max_generation);

	if (gen) {
		const percentage = (gen / cap) * 100;
		return percentage <= 90;
	}

	return false;
}
