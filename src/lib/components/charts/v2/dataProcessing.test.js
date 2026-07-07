import { describe, it, expect } from 'vitest';
import { aggregateByBoundary, aggregateForDisplay, aggregateToInterval } from './dataProcessing.js';

const HOUR = 60 * 60 * 1000;
const MIN = 60 * 1000;

/**
 * `n` 5-minute rows on series `a`, all value `v`, starting at `startMs`.
 * @param {number} startMs @param {number} n @param {number} [v]
 */
function fiveMinRows(startMs, n, v = 1) {
	return Array.from({ length: n }, (_, i) => {
		const time = startMs + i * 5 * MIN;
		return { time, date: new Date(time), a: v };
	});
}
const NEM_TZ = 'Australia/Brisbane';
const NEM = 10;

/**
 * A monthly row at the local (network) start of month, value `v` on series `a`.
 * @param {number} year @param {number} month0 @param {number} v @param {number} [offsetHours]
 */
function monthRow(year, month0, v, offsetHours = NEM) {
	const time = Date.UTC(year, month0, 1) - offsetHours * HOUR;
	return { time, date: new Date(time), a: v };
}

describe('aggregateByBoundary', () => {
	it('sums months into AU seasons (summer spans the year boundary)', () => {
		const data = [
			monthRow(2025, 11, 1), // Dec 2025 → summer
			monthRow(2026, 0, 2), // Jan 2026 → summer (prior Dec)
			monthRow(2026, 1, 3), // Feb 2026 → summer
			monthRow(2026, 2, 4), // Mar 2026 → autumn
			monthRow(2026, 3, 5) // Apr 2026 → autumn
		];
		const result = aggregateByBoundary(data, ['a'], 'season', NEM_TZ, 'sum');
		expect(result).toHaveLength(2);
		// Summer bucket starts 1 Dec 2025, sums Dec+Jan+Feb = 6.
		expect(result[0].time).toBe(Date.UTC(2025, 11, 1) - NEM * HOUR);
		expect(result[0].a).toBe(6);
		// Autumn bucket starts 1 Mar 2026, sums Mar+Apr = 9.
		expect(result[1].time).toBe(Date.UTC(2026, 2, 1) - NEM * HOUR);
		expect(result[1].a).toBe(9);
	});

	it('buckets months into financial years (July–June)', () => {
		const data = [
			monthRow(2025, 5, 1), // Jun 2025 → FY 2024–25
			monthRow(2025, 6, 2), // Jul 2025 → FY 2025–26
			monthRow(2026, 0, 3), // Jan 2026 → FY 2025–26
			monthRow(2026, 5, 4) // Jun 2026 → FY 2025–26
		];
		const result = aggregateByBoundary(data, ['a'], 'fy', NEM_TZ, 'sum');
		expect(result).toHaveLength(2);
		expect(result[0].time).toBe(Date.UTC(2024, 6, 1) - NEM * HOUR); // FY 2024–25
		expect(result[0].a).toBe(1);
		expect(result[1].time).toBe(Date.UTC(2025, 6, 1) - NEM * HOUR); // FY 2025–26
		expect(result[1].a).toBe(9); // 2+3+4
	});

	it('averages with method=mean', () => {
		const data = [monthRow(2026, 0, 10), monthRow(2026, 1, 20), monthRow(2026, 2, 30)];
		// Jan+Feb → one half (H1), mean = 15; Mar also H1 → mean of 10,20,30 = 20.
		const result = aggregateByBoundary(data, ['a'], 'half', NEM_TZ, 'mean');
		expect(result).toHaveLength(1);
		expect(result[0].a).toBe(20);
	});

	it('respects the WEM offset for bucketing', () => {
		const WEM = 8;
		const data = [
			{ time: Date.UTC(2026, 2, 1) - WEM * HOUR, date: new Date(), a: 5 } // Mar local AWST
		];
		const result = aggregateByBoundary(data, ['a'], 'season', 'Australia/Perth', 'sum');
		expect(result[0].time).toBe(Date.UTC(2026, 2, 1) - WEM * HOUR); // autumn start
	});
});

describe('aggregateForDisplay', () => {
	const monthly = [monthRow(2026, 0, 1), monthRow(2026, 1, 2), monthRow(2026, 2, 3)];

	it('returns data unchanged for native grains', () => {
		for (const di of ['1d', '7d', '3M', '1y']) {
			expect(
				aggregateForDisplay(monthly, ['a'], {
					apiInterval: di,
					displayInterval: di,
					ianaTimeZone: NEM_TZ
				})
			).toBe(monthly);
		}
	});

	it('does not re-aggregate native 1M', () => {
		const out = aggregateForDisplay(monthly, ['a'], {
			apiInterval: '1M',
			displayInterval: '1M',
			ianaTimeZone: NEM_TZ
		});
		expect(out).toBe(monthly);
	});

	it('aggregates season/half/fy from a monthly fetch', () => {
		const season = aggregateForDisplay(monthly, ['a'], {
			apiInterval: '1M',
			displayInterval: 'season',
			ianaTimeZone: NEM_TZ
		});
		// Jan/Feb → summer (prior Dec), Mar → autumn.
		expect(season).toHaveLength(2);

		const half = aggregateForDisplay(monthly, ['a'], {
			apiInterval: '1M',
			displayInterval: 'half',
			ianaTimeZone: NEM_TZ
		});
		expect(half).toHaveLength(1); // all in H1 2026
		expect(half[0].a).toBe(6);
	});

	it('does not aggregate quarter when fetched natively at 3M', () => {
		const out = aggregateForDisplay(monthly, ['a'], {
			apiInterval: '3M',
			displayInterval: 'quarter',
			ianaTimeZone: NEM_TZ
		});
		expect(out).toBe(monthly);
	});

	it('no-ops on empty data', () => {
		expect(
			aggregateForDisplay([], ['a'], {
				apiInterval: '1M',
				displayInterval: 'season',
				ianaTimeZone: NEM_TZ
			})
		).toEqual([]);
	});
});

describe('aggregateToInterval — trimPartialEdges', () => {
	const trim = { trimPartialEdges: true };

	it('drops the partial trailing bucket (the current, in-progress period)', () => {
		// 6 five-minute samples fill the first 30m bucket; the next bucket has
		// only 2 so far.
		const out = aggregateToInterval(fiveMinRows(0, 8), '30m', ['a'], 'sum', trim);
		expect(out).toHaveLength(1);
		expect(out[0].time).toBe(0);
		expect(out[0].a).toBe(6);
	});

	it('drops the partial leading bucket (viewport starts mid-bucket)', () => {
		// First 30m bucket holds only 3 samples (data starts 15m in); the second
		// bucket is full.
		const out = aggregateToInterval(fiveMinRows(15 * MIN, 9), '30m', ['a'], 'sum', trim);
		expect(out).toHaveLength(1);
		expect(out[0].time).toBe(30 * MIN);
		expect(out[0].a).toBe(6);
	});

	it('drops both partial edge buckets', () => {
		// 3 (partial) + 6 (full) + 2 (partial) across three 30m buckets.
		const out = aggregateToInterval(fiveMinRows(15 * MIN, 11), '30m', ['a'], 'sum', trim);
		expect(out).toHaveLength(1);
		expect(out[0].time).toBe(30 * MIN);
		expect(out[0].a).toBe(6);
	});

	it('keeps complete edge buckets', () => {
		// Two full 30m buckets (6 samples each) — nothing is in progress.
		const out = aggregateToInterval(fiveMinRows(0, 12), '30m', ['a'], 'sum', trim);
		expect(out).toHaveLength(2);
		expect(out[1].a).toBe(6);
	});

	it('does not trim unless requested', () => {
		// Plain aggregation must never silently discard data.
		const out = aggregateToInterval(fiveMinRows(0, 8), '30m', ['a'], 'sum');
		expect(out).toHaveLength(2);
		expect(out[1].a).toBe(2);
	});

	it('does not trim when there is no real aggregation (one sample per bucket)', () => {
		const data = [0, 30, 60].map((m) => {
			const time = m * MIN;
			return { time, date: new Date(time), a: 1 };
		});
		expect(aggregateToInterval(data, '30m', ['a'], 'sum', trim)).toHaveLength(3);
	});
});

describe('aggregateForDisplay — 30m partial-edge policy', () => {
	it('trims partial edge buckets for summed (volume) series', () => {
		const out = aggregateForDisplay(fiveMinRows(0, 8), ['a'], {
			apiInterval: '5m',
			displayInterval: '30m',
			ianaTimeZone: NEM_TZ,
			method: 'sum'
		});
		expect(out).toHaveLength(1);
		expect(out[0].a).toBe(6);
	});

	it('keeps partial edge buckets for averaged (rate) series', () => {
		// A partial bucket still averages to the right level (e.g. generation MW).
		const out = aggregateForDisplay(fiveMinRows(0, 8, 100), ['a'], {
			apiInterval: '5m',
			displayInterval: '30m',
			ianaTimeZone: NEM_TZ,
			method: 'mean'
		});
		expect(out).toHaveLength(2);
		expect(out[0].a).toBe(100);
		expect(out[1].a).toBe(100);
	});
});
