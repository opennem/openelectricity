import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getScenarios, getScenarioJson } from './index.js';

function mockResponse(body) {
	return { json: () => Promise.resolve(body) };
}

beforeEach(() => {
	vi.restoreAllMocks();
});

describe('getScenarios', () => {
	it('passes signal to fetch', async () => {
		const controller = new AbortController();
		vi.stubGlobal(
			'fetch',
			vi.fn(() => Promise.resolve(mockResponse({ data: [] })))
		);

		await getScenarios('aemo2024', 'step_change', {}, { signal: controller.signal });

		expect(fetch).toHaveBeenCalledOnce();
		const [, fetchOpts] = /** @type {any} */ (fetch).mock.calls[0];
		expect(fetchOpts.signal).toBe(controller.signal);
	});

	it('works without options (backwards compatible)', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(() => Promise.resolve(mockResponse({ data: [] })))
		);

		await getScenarios('aemo2024', 'step_change');

		expect(fetch).toHaveBeenCalledOnce();
		const [, fetchOpts] = /** @type {any} */ (fetch).mock.calls[0];
		expect(fetchOpts.signal).toBeUndefined();
	});

	it('rejects with AbortError when signal is aborted', async () => {
		const controller = new AbortController();
		vi.stubGlobal(
			'fetch',
			vi.fn(() => Promise.reject(new DOMException('The operation was aborted.', 'AbortError')))
		);

		controller.abort();

		await expect(
			getScenarios('aemo2024', 'step_change', {}, { signal: controller.signal })
		).rejects.toMatchObject({ name: 'AbortError' });
	});
});

describe('getScenarioJson', () => {
	it('passes signal to fetch', async () => {
		const controller = new AbortController();
		vi.stubGlobal(
			'fetch',
			vi.fn(() => Promise.resolve(mockResponse({ data: [] })))
		);

		await getScenarioJson('aemo2024', 'step_change', {}, { signal: controller.signal });

		expect(fetch).toHaveBeenCalledOnce();
		const [, fetchOpts] = /** @type {any} */ (fetch).mock.calls[0];
		expect(fetchOpts.signal).toBe(controller.signal);
	});

	it('works without options (backwards compatible)', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(() => Promise.resolve(mockResponse({ data: [] })))
		);

		await getScenarioJson('aemo2024', 'step_change');

		expect(fetch).toHaveBeenCalledOnce();
		const [, fetchOpts] = /** @type {any} */ (fetch).mock.calls[0];
		expect(fetchOpts.signal).toBeUndefined();
	});
});
