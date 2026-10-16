import { afterEach, describe, expect, it, vi } from 'vitest';

const fetchApiStatus = vi.fn();
vi.mock('./api-status.js', () => ({ API_STATUS_TTL_MS: 300_000, fetchApiStatus }));

const { createApiStatusState } = await import('./api-status-state.svelte.js');

/** A promise with its resolver, so a test settles checks in its own order. */
function deferred() {
	/** @type {(value: any) => void} */
	let resolve = () => {};
	const promise = new Promise((r) => (resolve = r));
	return { promise, resolve };
}

const operational = { statusLabel: 'Operational', statusColor: '#2C7629' };
const degraded = { statusLabel: 'Degraded', statusColor: '#E15C34' };

describe('createApiStatusState', () => {
	afterEach(() => {
		fetchApiStatus.mockReset();
		vi.useRealTimers();
	});

	it('is undefined until the first check answers, then holds the summary', async () => {
		fetchApiStatus.mockResolvedValue(operational);
		const status = createApiStatusState();
		expect(status.current).toBeUndefined();
		status.refresh();
		await vi.waitFor(() => expect(status.current).toEqual(operational));
	});

	it('keeps a failed check as null', async () => {
		fetchApiStatus.mockResolvedValue(null);
		const status = createApiStatusState();
		status.refresh();
		await vi.waitFor(() => expect(status.current).toBeNull());
	});

	it('never lets an older, slower check overwrite a newer one', async () => {
		const older = deferred();
		const newer = deferred();
		fetchApiStatus.mockReturnValueOnce(older.promise).mockReturnValueOnce(newer.promise);
		const status = createApiStatusState();
		status.refresh();
		status.refresh();
		newer.resolve(operational);
		await vi.waitFor(() => expect(status.current).toEqual(operational));
		older.resolve(degraded);
		await older.promise;
		await Promise.resolve();
		expect(status.current).toEqual(operational);
	});

	it('checks on start and each time the shared answer expires, until stopped', () => {
		vi.useFakeTimers();
		fetchApiStatus.mockResolvedValue(operational);
		const stop = createApiStatusState().start();
		expect(fetchApiStatus).toHaveBeenCalledTimes(1);
		vi.advanceTimersByTime(300_000);
		expect(fetchApiStatus).toHaveBeenCalledTimes(2);
		stop();
		vi.advanceTimersByTime(600_000);
		expect(fetchApiStatus).toHaveBeenCalledTimes(2);
	});
});
