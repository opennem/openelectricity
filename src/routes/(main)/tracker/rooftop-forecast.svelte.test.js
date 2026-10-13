import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync } from 'svelte';
import { FORECAST_RETRY_MS, createRooftopForecast } from './rooftop-forecast.svelte.js';

/** 13 October 2026 13:05 AEST: the 13:00 slot covers now. */
const NOW = Date.parse('2026-10-13T13:05:00+10:00');

/** @param {string[]} slots - Local HH:mm period starts on 13 October */
function forecastResponse(slots) {
	return {
		response: {
			data: [
				{
					metric: 'solar_rooftop_forecast',
					forecast_run_time: '2026-10-13T12:30:00+10:00',
					results: [{ data: slots.map((hhmm) => [`2026-10-13T${hhmm}:00+10:00`, 1_000]) }]
				}
			]
		}
	};
}

/** @param {...string[]} replies - Slots per successive response; the last repeats */
function stubForecastFetch(...replies) {
	/** @type {Array<RequestCache | undefined>} */
	const caches = [];
	vi.stubGlobal(
		'fetch',
		vi.fn(async (/** @type {string} */ _url, /** @type {RequestInit} */ init) => {
			caches.push(init?.cache);
			const slots = replies[Math.min(caches.length, replies.length) - 1];
			return { ok: true, json: async () => forecastResponse(slots) };
		})
	);
	return caches;
}

function harness() {
	/** @type {ReturnType<typeof createRooftopForecast>} */
	let forecast;
	const stop = $effect.root(() => {
		forecast = createRooftopForecast({
			region: () => 'nsw1',
			enabled: () => true,
			clock: () => NOW,
			timeZone: () => '+10:00'
		});
	});
	flushSync();
	// @ts-expect-error assigned synchronously inside the root
	return { forecast, stop };
}

/** @param {ReturnType<typeof createRooftopForecast>} forecast */
const lastSlot = (forecast) =>
	new Date(/** @type {number} */ (forecast.rows.at(-1)?.time)).toISOString();

describe('createRooftopForecast', () => {
	beforeEach(() => {
		vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
		vi.setSystemTime(NOW);
	});
	afterEach(() => {
		vi.unstubAllGlobals();
		vi.useRealTimers();
	});

	it('fetches once when the slot covering now is already published', async () => {
		const caches = stubForecastFetch(['12:30', '13:00']);
		const { forecast, stop } = harness();
		await vi.advanceTimersByTimeAsync(5 * FORECAST_RETRY_MS);
		expect(caches).toEqual(['default']);
		expect(lastSlot(forecast)).toBe('2026-10-13T03:00:00.000Z');
		stop();
	});

	it('retries each minute, past the browser copy, until the slot covering now lands', async () => {
		const caches = stubForecastFetch(['12:00', '12:30'], ['12:00', '12:30'], ['12:30', '13:00']);
		const { forecast, stop } = harness();
		await vi.advanceTimersByTimeAsync(0);
		expect(lastSlot(forecast)).toBe('2026-10-13T02:30:00.000Z');

		await vi.advanceTimersByTimeAsync(2 * FORECAST_RETRY_MS);
		expect(caches).toEqual(['default', 'no-cache', 'no-cache']);
		expect(lastSlot(forecast)).toBe('2026-10-13T03:00:00.000Z');

		await vi.advanceTimersByTimeAsync(5 * FORECAST_RETRY_MS);
		expect(caches).toHaveLength(3);
		stop();
	});

	it('stops retrying when the half-hour ends or the reader leaves', async () => {
		const caches = stubForecastFetch(['12:00', '12:30']);
		const { stop } = harness();
		// 13:05 to 13:30 leaves room for 24 retries after the first request.
		await vi.advanceTimersByTimeAsync(60 * FORECAST_RETRY_MS);
		expect(caches).toHaveLength(25);

		const again = stubForecastFetch(['12:00', '12:30']);
		vi.setSystemTime(NOW);
		const second = harness();
		await vi.advanceTimersByTimeAsync(FORECAST_RETRY_MS);
		second.stop();
		await vi.advanceTimersByTimeAsync(10 * FORECAST_RETRY_MS);
		expect(again).toHaveLength(2);
		stop();
	});
});
