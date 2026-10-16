import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/** @returns {Promise<typeof import('./api-status.js')>} */
async function freshModule() {
	vi.resetModules();
	return import('./api-status.js');
}

describe('fetchApiStatus', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.unstubAllGlobals();
	});

	it('shares one request between callers within the cache window', async () => {
		const summary = { status: 'ok', statusColor: '#0f0', statusLabel: 'Operational' };
		const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => summary });
		vi.stubGlobal('fetch', fetchMock);
		const { fetchApiStatus, API_STATUS_URL } = await freshModule();

		expect(await fetchApiStatus()).toEqual(summary);
		expect(await fetchApiStatus()).toEqual(summary);
		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(fetchMock).toHaveBeenCalledWith(`${API_STATUS_URL}/api/summary`);
	});

	it('refetches once the cache window has passed', async () => {
		const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
		vi.stubGlobal('fetch', fetchMock);
		const { fetchApiStatus } = await freshModule();

		await fetchApiStatus();
		vi.advanceTimersByTime(5 * 60 * 1000 + 1);
		await fetchApiStatus();
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	it('resolves to null on an error response or a network failure', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
		let { fetchApiStatus } = await freshModule();
		expect(await fetchApiStatus()).toBeNull();

		vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
		({ fetchApiStatus } = await freshModule());
		expect(await fetchApiStatus()).toBeNull();
	});
});

describe('apiStatusLabel', () => {
	it("names a check's state: the summary's label, checking or unavailable", async () => {
		const { apiStatusLabel } = await freshModule();
		const summary = /** @type {import('./api-status.js').ApiStatusSummary} */ ({
			statusLabel: 'Operational'
		});
		expect(apiStatusLabel(summary)).toBe('Operational');
		expect(apiStatusLabel(undefined)).toBe('Checking…');
		expect(apiStatusLabel(null)).toBe('Unavailable');
	});
});
