import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ChartDataManager from '../ChartDataManager.svelte.js';

// ============================================
// Test Helpers
// ============================================

/**
 * Build a minimal power API response that transformFacilityPowerData can process.
 * Each unit gets a series of [timestamp, value] pairs at 5-minute intervals.
 *
 * @param {Object} opts
 * @param {string} opts.networkId
 * @param {string[]} opts.unitCodes - e.g. ['UNIT1', 'UNIT2']
 * @param {string} opts.startISO - ISO timestamp for first point (e.g. '2026-02-08T04:50:00+10:00')
 * @param {number} opts.pointCount - number of 5-min data points
 * @param {(unitCode: string, index: number) => number} [opts.valueFn] - generate value per unit/index
 * @returns {any} - shape matching the OE API response
 */
function buildPowerResponse({ networkId, unitCodes, startISO, pointCount, valueFn }) {
	const startMs = new Date(startISO).getTime();
	const intervalMs = 5 * 60 * 1000;
	const defaultValueFn = valueFn || ((_code, i) => 100 + i);

	return {
		data: [
			{
				metric: 'power',
				interval: '5m',
				unit: 'MW',
				results: unitCodes.map((code) => ({
					name: `power_${code}`,
					columns: { unit_code: code },
					data: Array.from({ length: pointCount }, (_, i) => {
						const ts = new Date(startMs + i * intervalMs).toISOString();
						return [ts, defaultValueFn(code, i)];
					})
				}))
			}
		]
	};
}

/**
 * Create a ChartDataManager with sensible defaults for testing.
 * @param {Partial<import('../ChartDataManager.svelte.js').ChartDataManagerConfig>} [overrides]
 * @returns {ChartDataManager}
 */
function createManager(overrides = {}) {
	return new ChartDataManager({
		facilityCode: 'TESTFAC',
		networkId: 'NEM',
		interval: '5m',
		metric: 'power',
		unitFuelTechMap: { UNIT1: 'solar_utility', UNIT2: 'wind' },
		unitOrder: ['power_UNIT1', 'power_UNIT2'],
		loadsToInvert: [],
		...overrides
	});
}

// ============================================
// Tests
// ============================================

describe('ChartDataManager', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	// ------------------------------------------
	// seedCache + basic cache operations
	// ------------------------------------------

	describe('seedCache', () => {
		it('should populate cache from power response', () => {
			const manager = createManager();
			const response = buildPowerResponse({
				networkId: 'NEM',
				unitCodes: ['UNIT1', 'UNIT2'],
				startISO: '2026-02-08T04:50:00+10:00',
				pointCount: 10
			});

			manager.seedCache(response);

			expect(manager.cacheStart).not.toBeNull();
			expect(manager.cacheEnd).not.toBeNull();
			const cache = manager.processedCache;
			expect(cache).not.toBeNull();
			expect(cache?.data.length).toBeGreaterThan(0);
			expect(cache?.seriesNames).toContain('power_UNIT1');
			expect(cache?.seriesNames).toContain('power_UNIT2');
		});

		it('should set cacheStart/cacheEnd to first/last data point timestamps', () => {
			const manager = createManager();
			const startISO = '2026-02-08T04:50:00+10:00';
			const startMs = new Date(startISO).getTime();
			const pointCount = 10;
			const intervalMs = 5 * 60 * 1000;

			const response = buildPowerResponse({
				networkId: 'NEM',
				unitCodes: ['UNIT1'],
				startISO,
				pointCount
			});

			manager.seedCache(response);

			expect(manager.cacheStart).toBe(startMs);
			expect(manager.cacheEnd).toBe(startMs + (pointCount - 1) * intervalMs);
		});

		it('should ignore response with no data', () => {
			const manager = createManager();
			manager.seedCache(null);
			expect(manager.processedCache).toBeNull();

			manager.seedCache({ data: [] });
			expect(manager.processedCache).toBeNull();
		});
	});

	// ------------------------------------------
	// getDataForRange
	// ------------------------------------------

	describe('getDataForRange', () => {
		it('should return only data within the requested range', () => {
			const manager = createManager();
			const startISO = '2026-02-08T00:00:00+10:00';
			const startMs = new Date(startISO).getTime();
			const intervalMs = 5 * 60 * 1000;

			const response = buildPowerResponse({
				networkId: 'NEM',
				unitCodes: ['UNIT1'],
				startISO,
				pointCount: 100 // ~8.3 hours of data
			});

			manager.seedCache(response);

			// Request a 1-hour slice in the middle
			const sliceStart = startMs + 30 * intervalMs; // 2.5 hours in
			const sliceEnd = startMs + 42 * intervalMs; // 3.5 hours in
			const slice = manager.getDataForRange(sliceStart, sliceEnd);

			expect(slice.length).toBe(13); // 12 intervals + 1 inclusive
			for (const row of slice) {
				expect(row.time).toBeGreaterThanOrEqual(sliceStart);
				expect(row.time).toBeLessThanOrEqual(sliceEnd);
			}
		});

		it('should return empty array when cache is empty', () => {
			const manager = createManager();
			expect(manager.getDataForRange(0, Date.now())).toEqual([]);
		});
	});

	// ------------------------------------------
	// Bug: Timezone conversion for API fetches
	// ------------------------------------------

	describe('timezone conversion (NEM +10:00)', () => {
		it('should format API dates in network local time, not UTC', async () => {
			const fetchSpy = vi.fn().mockResolvedValue({
				ok: true,
				json: async () => ({
					response: buildPowerResponse({
						networkId: 'NEM',
						unitCodes: ['UNIT1'],
						startISO: '2026-02-07T00:00:00+10:00',
						pointCount: 12
					})
				})
			});
			vi.stubGlobal('fetch', fetchSpy);

			const manager = createManager({ networkId: 'NEM' });

			// Seed cache with data starting at Feb 8, 4:50am AEST
			const cacheStartAEST = '2026-02-08T04:50:00+10:00';
			const cacheStartUTC = new Date(cacheStartAEST).getTime(); // Feb 7, 18:50 UTC

			const response = buildPowerResponse({
				networkId: 'NEM',
				unitCodes: ['UNIT1'],
				startISO: cacheStartAEST,
				pointCount: 20
			});
			manager.seedCache(response);

			// Request data before the cache (panning backward)
			const oneHourMs = 60 * 60 * 1000;
			manager.requestRange(cacheStartUTC - 6 * oneHourMs, cacheStartUTC);

			// Advance past debounce timer (150ms)
			await vi.advanceTimersByTimeAsync(200);

			expect(fetchSpy).toHaveBeenCalledOnce();
			const url = new URL(fetchSpy.mock.calls[0][0], 'http://localhost');
			const dateEnd = url.searchParams.get('date_end');

			// The date_end should be in AEST (Feb 8, ~04:50), NOT UTC (Feb 7, ~18:50)
			// Key check: the date portion should be 2026-02-08, not 2026-02-07
			expect(dateEnd).toMatch(/^2026-02-08/);
		});

		it('should use +08:00 offset for WEM network', async () => {
			const fetchSpy = vi.fn().mockResolvedValue({
				ok: true,
				json: async () => ({
					response: buildPowerResponse({
						networkId: 'WEM',
						unitCodes: ['UNIT1'],
						startISO: '2026-02-08T04:50:00+08:00',
						pointCount: 12
					})
				})
			});
			vi.stubGlobal('fetch', fetchSpy);

			const manager = createManager({
				networkId: 'WEM',
				unitFuelTechMap: { UNIT1: 'wind' },
				unitOrder: ['power_UNIT1']
			});

			const cacheStartAWST = '2026-02-08T04:50:00+08:00';
			const cacheStartUTC = new Date(cacheStartAWST).getTime(); // Feb 7, 20:50 UTC

			const response = buildPowerResponse({
				networkId: 'WEM',
				unitCodes: ['UNIT1'],
				startISO: cacheStartAWST,
				pointCount: 20
			});
			manager.seedCache(response);

			const oneHourMs = 60 * 60 * 1000;
			manager.requestRange(cacheStartUTC - 6 * oneHourMs, cacheStartUTC);
			await vi.advanceTimersByTimeAsync(200);

			expect(fetchSpy).toHaveBeenCalledOnce();
			const url = new URL(fetchSpy.mock.calls[0][0], 'http://localhost');
			const dateEnd = url.searchParams.get('date_end');

			// With +8 offset, date_end should still be Feb 8 (AWST), not Feb 7 (UTC)
			expect(dateEnd).toMatch(/^2026-02-08/);
		});
	});

	// ------------------------------------------
	// Bug: Gap overlap buffer at cache boundary
	// ------------------------------------------

	describe('gap overlap at cache boundary', () => {
		it('should fetch data that overlaps with cache boundary to prevent seam gaps', async () => {
			const fetchSpy = vi.fn().mockResolvedValue({
				ok: true,
				json: async () => ({
					response: buildPowerResponse({
						networkId: 'NEM',
						unitCodes: ['UNIT1'],
						startISO: '2026-02-07T00:00:00+10:00',
						pointCount: 12
					})
				})
			});
			vi.stubGlobal('fetch', fetchSpy);

			const manager = createManager();

			// Seed cache: Feb 8 00:00 to 08:00 AEST
			const cacheStartAEST = '2026-02-08T00:00:00+10:00';
			const cacheStartMs = new Date(cacheStartAEST).getTime();

			const response = buildPowerResponse({
				networkId: 'NEM',
				unitCodes: ['UNIT1'],
				startISO: cacheStartAEST,
				pointCount: 96 // 8 hours
			});
			manager.seedCache(response);

			// Request range that straddles the cache start (typical pan scenario:
			// viewport shifts left so viewStart < cacheStart < viewEnd)
			const threeHoursMs = 3 * 60 * 60 * 1000;
			manager.requestRange(cacheStartMs - threeHoursMs, cacheStartMs + threeHoursMs);
			await vi.advanceTimersByTimeAsync(200);

			expect(fetchSpy).toHaveBeenCalledOnce();
			const url = new URL(fetchSpy.mock.calls[0][0], 'http://localhost');
			const dateEnd = url.searchParams.get('date_end');

			// The fetch date_end should extend PAST the cache start (10-min overlap buffer)
			// Cache starts at 00:00 AEST, so date_end should be ~00:10 AEST, not 00:00
			const fetchEndMs = Date.parse(dateEnd + '+10:00');
			expect(fetchEndMs).toBeGreaterThan(cacheStartMs);

			// Verify the overlap is ~10 minutes
			const overlapMs = fetchEndMs - cacheStartMs;
			expect(overlapMs).toBe(10 * 60 * 1000);
		});
	});

	// ------------------------------------------
	// Bug: Merge deduplication by timestamp
	// ------------------------------------------

	describe('merge deduplication', () => {
		it('should not create duplicate rows when fetched data overlaps with cache', async () => {
			const manager = createManager({ unitFuelTechMap: { UNIT1: 'solar_utility' }, unitOrder: ['power_UNIT1'] });

			// Seed with 20 points starting at T0
			const startISO = '2026-02-08T00:00:00+10:00';
			const startMs = new Date(startISO).getTime();
			const intervalMs = 5 * 60 * 1000;

			const response1 = buildPowerResponse({
				networkId: 'NEM',
				unitCodes: ['UNIT1'],
				startISO,
				pointCount: 20,
				valueFn: () => 100
			});
			manager.seedCache(response1);

			const originalLength = /** @type {NonNullable<typeof manager.processedCache>} */ (manager.processedCache).data.length;

			// Build overlapping data: starts 5 points earlier, overlaps 10 points
			const overlapStartISO = new Date(startMs - 5 * intervalMs).toISOString();
			const fetchResponse = buildPowerResponse({
				networkId: 'NEM',
				unitCodes: ['UNIT1'],
				startISO: overlapStartISO,
				pointCount: 15, // 5 before cache + 10 overlapping
				valueFn: () => 200
			});

			// Mock fetch to return overlapping data
			vi.stubGlobal(
				'fetch',
				vi.fn().mockResolvedValue({
					ok: true,
					json: async () => ({ response: fetchResponse })
				})
			);

			// Request a range that triggers a fetch
			manager.requestRange(startMs - 10 * intervalMs, startMs);
			await vi.advanceTimersByTimeAsync(200);

			// Wait for the async fetch to complete
			await vi.advanceTimersByTimeAsync(100);

			const allData = /** @type {NonNullable<typeof manager.processedCache>} */ (manager.processedCache).data;

			// Check no duplicate timestamps
			const timestamps = allData.map((/** @type {any} */ row) => row.time);
			const uniqueTimestamps = new Set(timestamps);
			expect(timestamps.length).toBe(uniqueTimestamps.size);

			// Should have more data than before (5 new points added)
			expect(allData.length).toBe(originalLength + 5);

			// Data should be sorted by time
			for (let i = 1; i < allData.length; i++) {
				expect(allData[i].time).toBeGreaterThanOrEqual(allData[i - 1].time);
			}
		});
	});

	// ------------------------------------------
	// Cache gap detection
	// ------------------------------------------

	describe('requestRange gap detection', () => {
		it('should not fetch when range is fully cached', async () => {
			const fetchSpy = vi.fn();
			vi.stubGlobal('fetch', fetchSpy);

			const manager = createManager();
			const startISO = '2026-02-08T00:00:00+10:00';
			const startMs = new Date(startISO).getTime();
			const intervalMs = 5 * 60 * 1000;

			const response = buildPowerResponse({
				networkId: 'NEM',
				unitCodes: ['UNIT1'],
				startISO,
				pointCount: 100
			});
			manager.seedCache(response);

			// Request a sub-range of the cache
			manager.requestRange(startMs + 10 * intervalMs, startMs + 50 * intervalMs);
			await vi.advanceTimersByTimeAsync(200);

			expect(fetchSpy).not.toHaveBeenCalled();
		});

		it('should fetch when range extends before cache', async () => {
			const fetchSpy = vi.fn().mockResolvedValue({
				ok: true,
				json: async () => ({
					response: buildPowerResponse({
						networkId: 'NEM',
						unitCodes: ['UNIT1'],
						startISO: '2026-02-07T00:00:00+10:00',
						pointCount: 12
					})
				})
			});
			vi.stubGlobal('fetch', fetchSpy);

			const manager = createManager();
			const response = buildPowerResponse({
				networkId: 'NEM',
				unitCodes: ['UNIT1'],
				startISO: '2026-02-08T00:00:00+10:00',
				pointCount: 50
			});
			manager.seedCache(response);

			const cacheStart = /** @type {number} */ (manager.cacheStart);
			const oneHour = 60 * 60 * 1000;
			manager.requestRange(cacheStart - 3 * oneHour, cacheStart + oneHour);
			await vi.advanceTimersByTimeAsync(200);

			expect(fetchSpy).toHaveBeenCalledOnce();
		});
	});

	// ------------------------------------------
	// clearCache
	// ------------------------------------------

	describe('clearCache', () => {
		it('should reset all state', () => {
			const manager = createManager();
			const response = buildPowerResponse({
				networkId: 'NEM',
				unitCodes: ['UNIT1'],
				startISO: '2026-02-08T00:00:00+10:00',
				pointCount: 20
			});
			manager.seedCache(response);

			expect(manager.processedCache).not.toBeNull();

			manager.clearCache();

			expect(manager.processedCache).toBeNull();
			expect(manager.cacheStart).toBeNull();
			expect(manager.cacheEnd).toBeNull();
			expect(manager.isLoading).toBe(false);
		});
	});
});
