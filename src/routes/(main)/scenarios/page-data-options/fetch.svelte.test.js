import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchTechnologyViewData, clearCaches } from './fetch.svelte.js';

/**
 * Build a mock fetch that routes by URL prefix and respects AbortSignal.
 * Captures all calls for assertion.
 */
function createMockFetch() {
	const calls = [];

	/** @param {string} url */
	/** @param {RequestInit} [opts] */
	const mockFetch = vi.fn((url, opts) => {
		calls.push({ url, signal: opts?.signal });

		if (opts?.signal?.aborted) {
			return Promise.reject(new DOMException('The operation was aborted.', 'AbortError'));
		}

		// Legacy historical energy+emissions (default)
		if (url.startsWith('/api/energy')) {
			return Promise.resolve({
				json: () =>
					Promise.resolve({
						data: [
							{
								fuel_tech: 'coal_black',
								data_type: 'energy',
								history: {
									start: '2020-01-01T00:00:00+10:00',
									last: '2024-01-01T00:00:00+10:00',
									interval: '1M',
									data: [100, 200]
								}
							}
						]
					})
			});
		}

		if (url.startsWith('/api/capacity')) {
			return Promise.resolve({ json: () => Promise.resolve([]) });
		}

		if (url.startsWith('/api/scenarios')) {
			return Promise.resolve({
				json: () =>
					Promise.resolve({
						data: [
							{ type: 'energy', fuel_tech: 'solar_utility', region: 'nsw' },
							{ type: 'capacity', fuel_tech: 'solar_utility', region: 'nsw' },
							{ type: 'emissions', fuel_tech: 'solar_utility', region: 'nsw' }
						]
					})
			});
		}

		return Promise.resolve({ json: () => Promise.resolve({}) });
	});

	return { mockFetch, calls };
}

beforeEach(() => {
	vi.restoreAllMocks();
	clearCaches();
});

describe('fetchTechnologyViewData', () => {
	it('passes signal to all underlying fetch calls', async () => {
		const { mockFetch, calls } = createMockFetch();
		vi.stubGlobal('fetch', mockFetch);

		const controller = new AbortController();

		await fetchTechnologyViewData({
			model: 'aemo2024',
			region: 'NSW',
			scenario: 'step_change',
			pathway: 'default',
			signal: controller.signal
		});

		// Should have made 3 parallel fetches: scenarios/history, capacity, scenarios
		expect(calls.length).toBe(3);

		for (const call of calls) {
			expect(call.signal).toBe(controller.signal);
		}
	});

	it('does not pass signal when none provided', async () => {
		const { mockFetch, calls } = createMockFetch();
		vi.stubGlobal('fetch', mockFetch);

		await fetchTechnologyViewData({
			model: 'aemo2024',
			region: 'NSW',
			scenario: 'step_change',
			pathway: 'default'
		});

		expect(calls.length).toBe(3);
		for (const call of calls) {
			expect(call.signal).toBeUndefined();
		}
	});

	it('rejects with AbortError when aborted before fetch resolves', async () => {
		const controller = new AbortController();

		vi.stubGlobal(
			'fetch',
			vi.fn((_, opts) => {
				return new Promise((resolve, reject) => {
					// Simulate real fetch behaviour: listen for abort
					if (opts?.signal?.aborted) {
						reject(new DOMException('The operation was aborted.', 'AbortError'));
						return;
					}
					opts?.signal?.addEventListener('abort', () => {
						reject(new DOMException('The operation was aborted.', 'AbortError'));
					});
				});
			})
		);

		const promise = fetchTechnologyViewData({
			model: 'aemo2024',
			region: 'NSW',
			scenario: 'step_change',
			pathway: 'default',
			signal: controller.signal
		});

		// Abort after the fetch calls have been initiated
		controller.abort();

		await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
	});

	it('returns expected data shape on success', async () => {
		const { mockFetch } = createMockFetch();
		vi.stubGlobal('fetch', mockFetch);

		const result = await fetchTechnologyViewData({
			model: 'aemo2024',
			region: 'NSW',
			scenario: 'step_change',
			pathway: 'default'
		});

		expect(result).toHaveProperty('projectionEnergyData');
		expect(result).toHaveProperty('projectionCapacityData');
		expect(result).toHaveProperty('projectionEmissionsData');
		expect(result).toHaveProperty('historyEnergyData');
		expect(result).toHaveProperty('historyCapacityData');
		expect(result).toHaveProperty('historyEmisssionsData');
		expect(Array.isArray(result.projectionEnergyData)).toBe(true);
	});

	it('cancelling first request does not affect a subsequent request', async () => {
		const { mockFetch } = createMockFetch();
		vi.stubGlobal('fetch', mockFetch);

		const controller1 = new AbortController();
		const controller2 = new AbortController();

		// Abort the first controller immediately
		controller1.abort();

		const promise1 = fetchTechnologyViewData({
			model: 'aemo2024',
			region: 'NSW',
			scenario: 'step_change',
			pathway: 'default',
			signal: controller1.signal
		});

		const promise2 = fetchTechnologyViewData({
			model: 'aemo2024',
			region: 'NSW',
			scenario: 'progressive_change',
			pathway: 'default',
			signal: controller2.signal
		});

		await expect(promise1).rejects.toMatchObject({ name: 'AbortError' });

		const result2 = await promise2;
		expect(result2).toHaveProperty('projectionEnergyData');
	});

	it('defaults to fetching from /api/energy (legacy endpoint)', async () => {
		const { mockFetch, calls } = createMockFetch();
		vi.stubGlobal('fetch', mockFetch);

		await fetchTechnologyViewData({
			model: 'aemo2024',
			region: 'NSW',
			scenario: 'step_change',
			pathway: 'default'
		});

		const legacyCall = calls.find((c) => c.url.startsWith('/api/energy'));
		expect(legacyCall).toBeDefined();
	});
});
