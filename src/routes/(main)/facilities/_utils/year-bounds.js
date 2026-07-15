import getUnitYear from './get-unit-year';
import { getUnitPlayYear } from './play-filter';
import { filterDerivedBatteryUnits, hasBidirectionalBattery } from './units';

/** Fallback when no facilities are loaded or no unit has a usable date. */
const FALLBACK_BOUNDS = { min: 1900, max: 2040 };

/**
 * Min/max year across a facility set's units, by the given year getter.
 * @param {any[] | null | undefined} facilities
 * @param {(unit: any) => number | null} getYear
 * @returns {{ min: number, max: number }}
 */
function boundsBy(facilities, getYear) {
	if (!facilities || facilities.length === 0) return FALLBACK_BOUNDS;

	let min = Infinity;
	let max = -Infinity;
	for (const facility of facilities) {
		const units = filterDerivedBatteryUnits(
			facility.units ?? [],
			hasBidirectionalBattery(facility)
		);
		for (const unit of units) {
			const year = getYear(unit);
			if (year === null) continue;
			if (year < min) min = year;
			if (year > max) max = year;
		}
	}

	if (min === Infinity) return FALLBACK_BOUNDS;
	return { min, max };
}

/**
 * Bounds from getUnitYear (status-appropriate date) — drives the Years filter.
 * @param {any[] | null | undefined} facilities
 * @returns {{ min: number, max: number }}
 */
export function computeYearBounds(facilities) {
	return boundsBy(facilities, getUnitYear);
}

/**
 * Bounds from commencement years — drives the play animation's range.
 * @param {any[] | null | undefined} facilities
 * @returns {{ min: number, max: number }}
 */
export function computePlayYearBounds(facilities) {
	return boundsBy(facilities, getUnitPlayYear);
}
