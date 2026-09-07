import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CHART_RETRY_DELAY_MS, fetchChartResponse } from './fetch-chart-response.js';

const url = '/api/network/data?metric=market_value';
const success = () => Response.json({ response: { data: ['ready'] } });

describe('fetchChartResponse', () => {
	beforeEach(() => vi.useFakeTimers());
	afterEach(() => {
		vi.useRealTimers();
		vi.unstubAllGlobals();
	});

	it.each([408, 500, 502, 503, 504])('retries HTTP %s once after a delay', async (status) => {
		const fetcher = vi
			.fn()
			.mockResolvedValueOnce(Response.json({ error: 'Upstream unavailable' }, { status }))
			.mockResolvedValue(success());
		vi.stubGlobal('fetch', fetcher);
		const pending = fetchChartResponse(url, { signal: new AbortController().signal });
		await vi.advanceTimersByTimeAsync(CHART_RETRY_DELAY_MS - 1);
		expect(fetcher).toHaveBeenCalledTimes(1);
		await vi.advanceTimersByTimeAsync(1);
		await expect(pending).resolves.toEqual({ data: ['ready'] });
		expect(fetcher).toHaveBeenCalledTimes(2);
	});

	it('surfaces the final server message when the bounded retry also fails', async () => {
		const fetcher = vi
			.fn()
			.mockImplementation(() =>
				Response.json(
					{ error: '  Upstream\n query timed out  ', details: { private: 'ignored' } },
					{ status: 500 }
				)
			);
		vi.stubGlobal('fetch', fetcher);
		const assertion = expect(
			fetchChartResponse(url, { signal: new AbortController().signal })
		).rejects.toThrow('Data request failed (500): Upstream query timed out');
		await vi.runAllTimersAsync();
		await assertion;
		expect(fetcher).toHaveBeenCalledTimes(2);
	});

	it.each([400, 401, 403, 404, 422, 429])('does not retry HTTP %s', async (status) => {
		const fetcher = vi
			.fn()
			.mockResolvedValue(Response.json({ error: 'Request rejected' }, { status }));
		vi.stubGlobal('fetch', fetcher);
		await expect(fetchChartResponse(url, { signal: new AbortController().signal })).rejects.toThrow(
			`Data request failed (${status}): Request rejected`
		);
		expect(fetcher).toHaveBeenCalledTimes(1);
	});

	it('never automatically retries background work', async () => {
		const fetcher = vi.fn().mockResolvedValue(Response.json({ error: 'Busy' }, { status: 503 }));
		vi.stubGlobal('fetch', fetcher);
		await expect(
			fetchChartResponse(url, { signal: new AbortController().signal, priority: 'low' })
		).rejects.toThrow('Data request failed (503): Busy');
		expect(fetcher).toHaveBeenCalledTimes(1);
		expect(vi.getTimerCount()).toBe(0);
	});

	it('cancels backoff without starting a retry', async () => {
		const controller = new AbortController();
		const fetcher = vi.fn().mockResolvedValue(Response.json({ error: 'Busy' }, { status: 500 }));
		vi.stubGlobal('fetch', fetcher);
		const assertion = expect(
			fetchChartResponse(url, { signal: controller.signal })
		).rejects.toMatchObject({ name: 'AbortError' });
		await vi.advanceTimersByTimeAsync(10);
		controller.abort();
		await assertion;
		await vi.runAllTimersAsync();
		expect(fetcher).toHaveBeenCalledTimes(1);
		expect(vi.getTimerCount()).toBe(0);
	});

	it('does not start an already cancelled request', async () => {
		const fetcher = vi.fn();
		vi.stubGlobal('fetch', fetcher);
		const controller = new AbortController();
		controller.abort();
		await expect(fetchChartResponse(url, { signal: controller.signal })).rejects.toMatchObject({
			name: 'AbortError'
		});
		expect(fetcher).not.toHaveBeenCalled();
	});

	it.each([
		() => new Response('<html>Gateway failure</html>', { status: 502 }),
		() => Response.json({ error: '<h1>Gateway failure</h1>' }, { status: 502 }),
		() => Response.json({ error: { message: 'Not a public message' } }, { status: 502 })
	])('falls back to the status for HTML or non-string errors', async (response) => {
		vi.stubGlobal('fetch', vi.fn().mockImplementation(response));
		await expect(
			fetchChartResponse(url, { signal: new AbortController().signal, priority: 'low' })
		).rejects.toThrow(/^Data request failed \(502\)$/);
	});
});
