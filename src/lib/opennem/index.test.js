import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getHistory } from './index.js';

/** Create a mock Response with .json() */
function mockResponse(body) {
	return { json: () => Promise.resolve(body) };
}

beforeEach(() => {
	vi.restoreAllMocks();
});

describe('getHistory', () => {
	it('passes signal to fetch for energy requests', async () => {
		const controller = new AbortController();
		vi.stubGlobal(
			'fetch',
			vi.fn(() => Promise.resolve(mockResponse({ data: [] })))
		);

		await getHistory('NSW', 'energy', { signal: controller.signal });

		expect(fetch).toHaveBeenCalledOnce();
		const [, fetchOpts] = /** @type {any} */ (fetch).mock.calls[0];
		expect(fetchOpts.signal).toBe(controller.signal);
	});

	it('passes signal to fetch for capacity requests', async () => {
		const controller = new AbortController();
		vi.stubGlobal(
			'fetch',
			vi.fn(() => Promise.resolve(mockResponse([])))
		);

		await getHistory('NSW', 'capacity', { signal: controller.signal });

		expect(fetch).toHaveBeenCalledOnce();
		const [, fetchOpts] = /** @type {any} */ (fetch).mock.calls[0];
		expect(fetchOpts.signal).toBe(controller.signal);
	});

	it('works without options (backwards compatible)', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(() => Promise.resolve(mockResponse({ data: [] })))
		);

		await getHistory('NSW', 'energy');

		expect(fetch).toHaveBeenCalledOnce();
		const [, fetchOpts] = /** @type {any} */ (fetch).mock.calls[0];
		expect(fetchOpts.signal).toBeUndefined();
	});

	it('rejects with AbortError when signal is aborted', async () => {
		const controller = new AbortController();
		vi.stubGlobal(
			'fetch',
			vi.fn(() => {
				const err = new DOMException('The operation was aborted.', 'AbortError');
				return Promise.reject(err);
			})
		);

		controller.abort();

		await expect(getHistory('NSW', 'energy', { signal: controller.signal })).rejects.toMatchObject({
			name: 'AbortError'
		});
	});
});
