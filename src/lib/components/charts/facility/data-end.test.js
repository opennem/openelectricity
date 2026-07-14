import { describe, it, expect } from 'vitest';
import { isFullyRetired, retiredAnchorMs, dataEndMs } from './data-end.js';

const NOW_TOLERANCE_MS = 5_000;

describe('isFullyRetired', () => {
	it('is true only when every unit is retired', () => {
		expect(isFullyRetired([{ status_id: 'retired' }, { status_id: 'retired' }])).toBe(true);
		expect(isFullyRetired([{ status_id: 'retired' }, { status_id: 'operating' }])).toBe(false);
		expect(isFullyRetired([{ status_id: 'committed' }])).toBe(false);
	});

	it('is false for an empty unit list', () => {
		expect(isFullyRetired([])).toBe(false);
	});
});

describe('retiredAnchorMs', () => {
	it('returns null when any unit is still operating', () => {
		const units = [
			{ status_id: 'retired', data_last_seen: '2020-01-01T00:00:00+10:00' },
			{ status_id: 'operating', data_last_seen: '2026-01-01T00:00:00+10:00' }
		];
		expect(retiredAnchorMs(units)).toBeNull();
	});

	it('returns null for an empty unit list', () => {
		expect(retiredAnchorMs([])).toBeNull();
	});

	it('anchors to the latest data_last_seen across retired units', () => {
		const units = [
			{ status_id: 'retired', data_last_seen: '2019-06-01T00:00:00+10:00' },
			{ status_id: 'retired', data_last_seen: '2021-03-15T00:00:00+10:00' }
		];
		expect(retiredAnchorMs(units)).toBe(new Date('2021-03-15T00:00:00+10:00').getTime());
	});

	it('falls back to the latest closure_date when no unit has data_last_seen', () => {
		const units = [
			{ status_id: 'retired', closure_date: '2018-01-01' },
			{ status_id: 'retired', closure_date: '2019-12-31' }
		];
		expect(retiredAnchorMs(units)).toBe(new Date('2019-12-31').getTime());
	});

	it('returns null when retired units carry no dates at all', () => {
		expect(retiredAnchorMs([{ status_id: 'retired' }])).toBeNull();
	});
});

describe('dataEndMs', () => {
	it('returns ~now for an operating facility', () => {
		const units = [{ status_id: 'operating', data_last_seen: '2020-01-01T00:00:00+10:00' }];
		expect(Math.abs(dataEndMs(units) - Date.now())).toBeLessThan(NOW_TOLERANCE_MS);
	});

	it('returns the retired anchor for a fully-retired facility', () => {
		const units = [{ status_id: 'retired', data_last_seen: '2021-03-15T00:00:00+10:00' }];
		expect(dataEndMs(units)).toBe(new Date('2021-03-15T00:00:00+10:00').getTime());
	});

	it('clamps a future anchor to now', () => {
		const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
		const units = [{ status_id: 'retired', data_last_seen: future }];
		expect(Math.abs(dataEndMs(units) - Date.now())).toBeLessThan(NOW_TOLERANCE_MS);
	});

	it('returns ~now when retired units carry no dates', () => {
		expect(Math.abs(dataEndMs([{ status_id: 'retired' }]) - Date.now())).toBeLessThan(
			NOW_TOLERANCE_MS
		);
	});
});
