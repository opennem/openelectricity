import { subYears } from 'date-fns';

/** How long after commencement a unit can still be considered commissioning. */
const COMMISSIONING_MAX_AGE_YEARS = 1;

/**
 * Check whether a unit commenced operation too long ago to still be commissioning.
 * Compares `YYYY-MM-DD` prefixes lexicographically to sidestep the API's
 * inconsistent timezone suffixes — day-level imprecision is immaterial at a
 * one-year threshold.
 * @param {string | null | undefined} dateStr
 * @param {Date} [now] - injectable for tests
 * @returns {boolean}
 */
function isPastCommissioningWindow(dateStr, now = new Date()) {
	if (!dateStr) return false;
	const cutoff = subYears(now, COMMISSIONING_MAX_AGE_YEARS);
	return dateStr.slice(0, 10) < cutoff.toISOString().slice(0, 10);
}

/**
 * Check if an operating unit should be re-labelled as commissioning: it
 * commenced operation within the last year but its max generation is still at
 * or below 90% of its capacity.
 * @param {any} unit
 * @param {{ hasBidirectionalBattery?: boolean, now?: Date }} [options]
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

	// Low max-gen on a unit outside the window just means it never runs at
	// full capacity (e.g. peakers)
	if (isPastCommissioningWindow(unit.commencement_date, options.now)) {
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
