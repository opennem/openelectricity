import { describe, it, expect } from 'vitest';
import isCommissioning from './is-commissioning.js';

const NOW = new Date('2026-07-07T00:00:00Z');

/** @param {any} overrides */
function makeUnit(overrides = {}) {
	return {
		fueltech_id: 'solar_utility',
		status_id: 'operating',
		capacity_maximum: 100,
		max_generation: 40,
		commencement_date: '2026-05-01T00:00:00',
		...overrides
	};
}

describe('isCommissioning', () => {
	it('marks an operating unit at or below 90% of capacity with a recent commencement_date', () => {
		expect(isCommissioning(makeUnit(), { now: NOW })).toBe(true);
	});

	it('does not mark a unit that commenced more than a year ago', () => {
		const unit = makeUnit({ commencement_date: '2008-01-31T00:00:00' });
		expect(isCommissioning(unit, { now: NOW })).toBe(false);
	});

	it('keeps a unit that commenced exactly one year ago', () => {
		const unit = makeUnit({ commencement_date: '2025-07-07T00:00:00' });
		expect(isCommissioning(unit, { now: NOW })).toBe(true);
	});

	it('does not mark a unit that commenced one year and a day ago', () => {
		const unit = makeUnit({ commencement_date: '2025-07-06T00:00:00' });
		expect(isCommissioning(unit, { now: NOW })).toBe(false);
	});

	it('ignores timezone suffixes on commencement_date', () => {
		const unit = makeUnit({ commencement_date: '2008-01-31T00:00:00+10:00' });
		expect(isCommissioning(unit, { now: NOW })).toBe(false);
	});

	it('keeps current behaviour when commencement_date is missing', () => {
		const unit = makeUnit({ commencement_date: undefined });
		expect(isCommissioning(unit, { now: NOW })).toBe(true);
	});

	it('does not mark a non-operating unit', () => {
		const unit = makeUnit({ status_id: 'committed' });
		expect(isCommissioning(unit, { now: NOW })).toBe(false);
	});

	it('does not mark a unit above 90% of capacity', () => {
		const unit = makeUnit({ max_generation: 95 });
		expect(isCommissioning(unit, { now: NOW })).toBe(false);
	});

	it('does not mark a unit without max_generation', () => {
		const unit = makeUnit({ max_generation: undefined });
		expect(isCommissioning(unit, { now: NOW })).toBe(false);
	});

	it('falls back to capacity_registered when capacity_maximum is missing', () => {
		const unit = makeUnit({ capacity_maximum: undefined, capacity_registered: 100 });
		expect(isCommissioning(unit, { now: NOW })).toBe(true);
	});

	it('excludes derived battery charging/discharging units when a bidirectional battery exists', () => {
		const charging = makeUnit({ fueltech_id: 'battery_charging' });
		const discharging = makeUnit({ fueltech_id: 'battery_discharging' });
		expect(isCommissioning(charging, { hasBidirectionalBattery: true, now: NOW })).toBe(false);
		expect(isCommissioning(discharging, { hasBidirectionalBattery: true, now: NOW })).toBe(false);
		// Without a bidirectional battery they are real units and stay eligible
		expect(isCommissioning(charging, { hasBidirectionalBattery: false, now: NOW })).toBe(true);
	});
});
