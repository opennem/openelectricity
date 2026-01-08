/**
 * Check if a unit has reached more than 90% of its capacity
 * @param {any} unit
 * @returns {boolean}
 */
export default function isCommissioning(unit) {
	if (unit.status_id !== 'operating') {
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
