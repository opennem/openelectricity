import { describe, expect, it } from 'vitest';
import { currentIncompleteInterval } from './incomplete-interval.js';

const NEM = 'Australia/Brisbane';
const HOUR_MS = 60 * 60 * 1000;

describe('currentIncompleteInterval', () => {
	it('returns the current daily bucket in network time', () => {
		const start = Date.parse('2026-09-01T14:00:00Z'); // 2 Sep, midnight AEST
		expect(currentIncompleteInterval([{ time: start }], '1d', start + 12 * HOUR_MS, NEM)).toEqual({
			start,
			end: start + 24 * HOUR_MS
		});
	});

	it('uses the data row phase for a current weekly bucket', () => {
		const start = Date.parse('2026-08-30T14:00:00Z');
		expect(
			currentIncompleteInterval([{ time: start }], '7d', start + 3 * 24 * HOUR_MS, NEM)
		).toEqual({ start, end: start + 7 * 24 * HOUR_MS });
	});

	it('uses the exact calendar end for a current month', () => {
		const start = Date.parse('2026-08-31T14:00:00Z'); // 1 Sep AEST
		const end = Date.parse('2026-09-30T14:00:00Z'); // 1 Oct AEST
		expect(currentIncompleteInterval([{ time: start }], '1M', start + HOUR_MS, NEM)).toEqual({
			start,
			end
		});
	});

	it('uses exact boundaries for coarser calendar buckets', () => {
		const start = Date.parse('2026-06-30T14:00:00Z'); // 1 Jul AEST
		const end = Date.parse('2026-09-30T14:00:00Z'); // 1 Oct AEST
		expect(currentIncompleteInterval([{ time: start }], 'quarter', start + HOUR_MS, NEM)).toEqual({
			start,
			end
		});
	});

	it('uses a rolling interval sampling grain instead of its twelve-month window', () => {
		const start = Date.parse('2026-08-31T14:00:00Z');
		const end = Date.parse('2026-09-30T14:00:00Z');
		expect(currentIncompleteInterval([{ time: start }], '12mr', start + HOUR_MS, NEM)).toEqual({
			start,
			end
		});
	});

	it('does not mark a stale completed bucket or a future row', () => {
		const start = Date.parse('2026-08-31T14:00:00Z');
		const afterEnd = Date.parse('2026-10-01T00:00:00Z');
		expect(currentIncompleteInterval([{ time: start }], '1M', afterEnd, NEM)).toBeNull();
		expect(
			currentIncompleteInterval([{ time: afterEnd + HOUR_MS }], '1M', afterEnd, NEM)
		).toBeNull();
	});
});
