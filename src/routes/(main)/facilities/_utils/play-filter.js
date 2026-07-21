import { filterDerivedBatteryUnits, hasBidirectionalBattery } from '$lib/facilities/units.js';
import { getUnitCapacity } from '$lib/utils/capacity';
import parseYear from './parse-year';

/**
 * Play-mode (year animation) filtering.
 * =====================================
 *
 * Play mode animates the full grid history, so it has its own year semantics
 * rather than reusing getUnitYear(), which dates retired units by their
 * closure_date (they'd pop onto the map in the year they shut down). Here a
 * unit appears in the year it commenced operation and — if it has since
 * closed — disappears once the playhead passes its closure year. Committed
 * units haven't connected yet, so they appear at their expected operation
 * date instead, extending the timeline into the future (the overlay carries
 * a note explaining this).
 */

/**
 * The year a unit connects to the grid: its commencement year, or — for
 * committed units, which have no commencement date yet — the year of its
 * expected operation date.
 * @param {any} unit
 * @returns {number | null}
 */
export function getUnitPlayYear(unit) {
	const year = parseYear(unit.commencement_date);
	if (year !== null) return year;
	if (unit.status_id === 'committed') return parseYear(unit.expected_operation_date);
	return null;
}

/**
 * The year a facility first connects to the grid — its earliest unit play
 * year. Used by the map to scale in markers appearing at the playhead year.
 * @param {any} facility
 * @returns {number | null}
 */
export function getFacilityPlayYear(facility) {
	let min = null;
	for (const unit of facility.units ?? []) {
		const year = getUnitPlayYear(unit);
		if (year !== null && (min === null || year < min)) min = year;
	}
	return min;
}

/**
 * Whether a unit is connected to the grid at the given playhead year.
 * @param {any} unit
 * @param {number} playYear
 * @returns {boolean}
 */
export function unitVisibleAtPlayYear(unit, playYear) {
	const startYear = getUnitPlayYear(unit);
	if (startYear === null || startYear > playYear) return false;
	const closureYear = parseYear(unit.closure_date);
	return closureYear === null || playYear < closureYear;
}

/**
 * Total connected capacity (MW) for every year of the play range — one entry
 * per year from minYear to maxYear inclusive. Uses the same visibility
 * semantics as unitVisibleAtPlayYear (connect at commencement, drop at
 * closure), via per-unit deltas + a running sum rather than a per-year scan.
 * @param {any[] | null | undefined} facilityList
 * @param {number} minYear
 * @param {number} maxYear
 * @returns {number[]}
 */
export function computePlayCapacityByYear(facilityList, minYear, maxYear) {
	const span = maxYear - minYear + 1;
	if (!facilityList || span <= 0) return [];

	const deltas = new Array(span).fill(0);
	for (const facility of facilityList) {
		const units = filterDerivedBatteryUnits(
			facility.units ?? [],
			hasBidirectionalBattery(facility)
		);
		for (const unit of units) {
			const start = getUnitPlayYear(unit);
			if (start === null || start > maxYear) continue;
			const capacity = getUnitCapacity(unit);
			if (!capacity) continue;

			const startIndex = Math.max(0, start - minYear);
			deltas[startIndex] += capacity;
			const closure = parseYear(unit.closure_date);
			if (closure !== null && closure <= maxYear) {
				// Visible while playYear < closure, so the drop lands ON the
				// closure year. Clamped so bad data (closure ≤ start) nets to zero.
				deltas[Math.max(startIndex, closure - minYear)] -= capacity;
			}
		}
	}

	const series = new Array(span);
	let total = 0;
	for (let i = 0; i < span; i++) {
		total += deltas[i];
		series[i] = total;
	}
	return series;
}

/**
 * Filter the full facilities set down to what's connected at the playhead
 * year, preserving the per-view shape of the page's filterFacilities():
 * - timeline: units are filtered individually
 * - list/grid: units stay intact; the facility is kept if any unit is visible
 * @param {any[]} facilityList
 * @param {number} playYear
 * @param {'list' | 'timeline' | 'grid'} view
 * @returns {any[]}
 */
export function filterFacilitiesByPlayYear(facilityList, playYear, view) {
	if (view === 'timeline') {
		return facilityList
			.map((facility) => ({
				...facility,
				units: filterDerivedBatteryUnits(
					facility.units ?? [],
					hasBidirectionalBattery(facility)
				).filter((/** @type {any} */ unit) => unitVisibleAtPlayYear(unit, playYear))
			}))
			.filter((facility) => facility.units.length > 0);
	}

	return facilityList
		.map((facility) => ({
			...facility,
			units: filterDerivedBatteryUnits(facility.units ?? [], hasBidirectionalBattery(facility))
		}))
		.filter((facility) =>
			facility.units.some((/** @type {any} */ unit) => unitVisibleAtPlayYear(unit, playYear))
		);
}
