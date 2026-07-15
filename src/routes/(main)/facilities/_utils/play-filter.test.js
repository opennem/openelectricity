import { describe, it, expect } from 'vitest';
import {
	getUnitPlayYear,
	getFacilityPlayYear,
	unitVisibleAtPlayYear,
	filterFacilitiesByPlayYear,
	computePlayCapacityByYear
} from './play-filter.js';

/**
 * @param {string} code
 * @param {any[]} units
 */
function facility(code, units) {
	return { code, name: code, units };
}

describe('getUnitPlayYear', () => {
	it('returns the commencement year for any status', () => {
		expect(getUnitPlayYear({ status_id: 'operating', commencement_date: '2004-06-01' })).toBe(2004);
		expect(
			getUnitPlayYear({
				status_id: 'retired',
				commencement_date: '1971-03-15',
				closure_date: '2017-03-31'
			})
		).toBe(1971);
	});

	it('falls back to the expected operation year for committed units', () => {
		expect(getUnitPlayYear({ status_id: 'committed', expected_operation_date: '2028-01-01' })).toBe(
			2028
		);
	});

	it('returns null when there is no usable date', () => {
		expect(getUnitPlayYear({ status_id: 'operating' })).toBeNull();
		expect(getUnitPlayYear({ status_id: 'operating', commencement_date: null })).toBeNull();
		expect(getUnitPlayYear({ status_id: 'committed' })).toBeNull();
		// The expected-operation fallback is committed-only.
		expect(
			getUnitPlayYear({ status_id: 'operating', expected_operation_date: '2028-01-01' })
		).toBeNull();
	});
});

describe('getFacilityPlayYear', () => {
	it('returns the earliest unit play year, null when none have one', () => {
		expect(
			getFacilityPlayYear(
				facility('A', [
					{ status_id: 'operating', commencement_date: '2010-01-01' },
					{ status_id: 'operating', commencement_date: '1998-01-01' },
					{ status_id: 'operating' }
				])
			)
		).toBe(1998);
		expect(getFacilityPlayYear(facility('B', [{ status_id: 'operating' }]))).toBeNull();
	});
});

describe('unitVisibleAtPlayYear', () => {
	const retired = {
		status_id: 'retired',
		commencement_date: '1971-03-15',
		closure_date: '2017-03-31'
	};

	it('shows a unit from its commencement year onwards', () => {
		const unit = { status_id: 'operating', commencement_date: '2004-06-01' };
		expect(unitVisibleAtPlayYear(unit, 2003)).toBe(false);
		expect(unitVisibleAtPlayYear(unit, 2004)).toBe(true);
		expect(unitVisibleAtPlayYear(unit, 2026)).toBe(true);
	});

	it('hides a retired unit once the playhead reaches its closure year', () => {
		expect(unitVisibleAtPlayYear(retired, 1970)).toBe(false);
		expect(unitVisibleAtPlayYear(retired, 1971)).toBe(true);
		expect(unitVisibleAtPlayYear(retired, 2016)).toBe(true);
		expect(unitVisibleAtPlayYear(retired, 2017)).toBe(false);
		expect(unitVisibleAtPlayYear(retired, 2026)).toBe(false);
	});

	it('shows committed units from their expected operation year', () => {
		const committed = { status_id: 'committed', expected_operation_date: '2028-01-01' };
		expect(unitVisibleAtPlayYear(committed, 2027)).toBe(false);
		expect(unitVisibleAtPlayYear(committed, 2028)).toBe(true);
	});

	it('never shows units without a usable date', () => {
		expect(unitVisibleAtPlayYear({ status_id: 'committed' }, 2030)).toBe(false);
	});
});

describe('filterFacilitiesByPlayYear', () => {
	const facilities = [
		facility('OLD_COAL', [
			{ status_id: 'retired', commencement_date: '1971-01-01', closure_date: '2017-01-01' }
		]),
		facility('NEW_SOLAR', [
			{ status_id: 'operating', commencement_date: '2015-01-01' },
			{ status_id: 'operating', commencement_date: '2022-01-01' }
		]),
		facility('PLANNED', [{ status_id: 'committed', expected_operation_date: '2028-01-01' }])
	];

	it('timeline view filters units individually and drops empty facilities', () => {
		const out = filterFacilitiesByPlayYear(facilities, 2015, 'timeline');
		expect(out.map((f) => f.code)).toEqual(['OLD_COAL', 'NEW_SOLAR']);
		expect(out.find((f) => f.code === 'NEW_SOLAR')?.units).toHaveLength(1);
	});

	it('list view keeps all units of a facility with any visible unit', () => {
		const out = filterFacilitiesByPlayYear(facilities, 2015, 'list');
		expect(out.map((f) => f.code)).toEqual(['OLD_COAL', 'NEW_SOLAR']);
		expect(out.find((f) => f.code === 'NEW_SOLAR')?.units).toHaveLength(2);
	});

	it('drops retired facilities after their closure year', () => {
		const out = filterFacilitiesByPlayYear(facilities, 2018, 'list');
		expect(out.map((f) => f.code)).toEqual(['NEW_SOLAR']);
	});

	it('reveals committed facilities once the playhead reaches their expected year', () => {
		expect(filterFacilitiesByPlayYear(facilities, 2027, 'list').map((f) => f.code)).toEqual([
			'NEW_SOLAR'
		]);
		expect(filterFacilitiesByPlayYear(facilities, 2028, 'list').map((f) => f.code)).toEqual([
			'NEW_SOLAR',
			'PLANNED'
		]);
	});

	it('excludes derived battery units when the facility has a bidirectional battery', () => {
		const battery = facility('BATTERY', [
			{ status_id: 'operating', fueltech_id: 'battery', commencement_date: '2021-01-01' },
			{
				status_id: 'operating',
				fueltech_id: 'battery_charging',
				commencement_date: '2021-01-01'
			},
			{
				status_id: 'operating',
				fueltech_id: 'battery_discharging',
				commencement_date: '2021-01-01'
			}
		]);
		const out = filterFacilitiesByPlayYear([battery], 2022, 'timeline');
		expect(out[0].units.map((/** @type {any} */ u) => u.fueltech_id)).toEqual(['battery']);
	});

	it('does not mutate the source facilities', () => {
		filterFacilitiesByPlayYear(facilities, 2020, 'timeline');
		expect(facilities.find((f) => f.code === 'NEW_SOLAR')?.units).toHaveLength(2);
	});
});

describe('computePlayCapacityByYear', () => {
	it('returns empty for missing facilities or an inverted range', () => {
		expect(computePlayCapacityByYear(null, 2000, 2010)).toEqual([]);
		expect(computePlayCapacityByYear([], 2010, 2000)).toEqual([]);
	});

	it('accumulates capacity from each unit commencement year', () => {
		const out = computePlayCapacityByYear(
			[
				facility('A', [
					{ status_id: 'operating', commencement_date: '2000-01-01', capacity_registered: 100 },
					{ status_id: 'operating', commencement_date: '2002-01-01', capacity_maximum: 50 }
				])
			],
			2000,
			2003
		);
		expect(out).toEqual([100, 100, 150, 150]);
	});

	it('drops retired capacity on the closure year, matching unitVisibleAtPlayYear', () => {
		const out = computePlayCapacityByYear(
			[
				facility('OLD', [
					{
						status_id: 'retired',
						commencement_date: '2000-01-01',
						closure_date: '2002-01-01',
						capacity_registered: 100
					}
				])
			],
			2000,
			2003
		);
		expect(out).toEqual([100, 100, 0, 0]);
	});

	it('counts committed capacity from its expected operation year', () => {
		const out = computePlayCapacityByYear(
			[
				facility('PLANNED', [
					{
						status_id: 'committed',
						expected_operation_date: '2002-01-01',
						capacity_registered: 500
					}
				])
			],
			2000,
			2003
		);
		expect(out).toEqual([0, 0, 500, 500]);
	});

	it('ignores dateless units and derived battery duplicates', () => {
		const out = computePlayCapacityByYear(
			[
				facility('NO_DATES', [{ status_id: 'operating', capacity_registered: 500 }]),
				facility('BATTERY', [
					{
						status_id: 'operating',
						fueltech_id: 'battery',
						commencement_date: '2001-01-01',
						capacity_registered: 30
					},
					{
						status_id: 'operating',
						fueltech_id: 'battery_discharging',
						commencement_date: '2001-01-01',
						capacity_registered: 30
					}
				])
			],
			2000,
			2002
		);
		expect(out).toEqual([0, 30, 30]);
	});
});
