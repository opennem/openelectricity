import { describe, it, expect, vi } from 'vitest';
import { absCpiFixture, cpiSnapshot } from '../comparison-cpi.fixtures.js';
import { validateCpiSnapshot } from '../comparison-cpi.js';
import { refreshCpi } from './cpi-refresh.js';

const options = () => ({
	baseline: validateCpiSnapshot(cpiSnapshot()),
	publish: true,
	accountId: 'a'.repeat(32),
	namespaceId: 'b'.repeat(32),
	token: 'test-token'
});
describe('scheduled CPI refresh', () => {
	it('validates ABS data without needing Cloudflare credentials in local mode', async () => {
		const fetcher = vi.fn().mockResolvedValue(Response.json(absCpiFixture()));
		const result = await refreshCpi({ baseline: validateCpiSnapshot(cpiSnapshot()), fetcher });
		expect(result.published).toBe(false);
		expect(fetcher).toHaveBeenCalledTimes(1);
	});
	it('does not rewrite unchanged data', async () => {
		const fetcher = vi
			.fn()
			.mockResolvedValueOnce(Response.json(absCpiFixture()))
			.mockResolvedValueOnce(Response.json(cpiSnapshot()));
		expect(await refreshCpi({ ...options(), fetcher })).toMatchObject({
			changed: false,
			published: false
		});
		expect(fetcher).toHaveBeenCalledTimes(2);
	});
	it('publishes a complete revision in one write without expiry', async () => {
		const payload = absCpiFixture();
		payload.data.dataSets[0].series['0:0:0:0:0'].observations['0'][0] += 0.1;
		const fetcher = vi
			.fn()
			.mockResolvedValueOnce(Response.json(payload))
			.mockResolvedValueOnce(Response.json(cpiSnapshot()))
			.mockResolvedValueOnce(Response.json({ success: true }));
		expect((await refreshCpi({ ...options(), fetcher })).published).toBe(true);
		const [url, request] = fetcher.mock.calls[2];
		expect(request.method).toBe('PUT');
		expect(url).not.toContain('expiration');
		expect(JSON.parse(request.body).observations).toHaveLength(cpiSnapshot().observations.length);
	});
	it('initialises a missing key', async () => {
		const fetcher = vi
			.fn()
			.mockResolvedValueOnce(Response.json(absCpiFixture()))
			.mockResolvedValueOnce(new Response('', { status: 404 }))
			.mockResolvedValueOnce(Response.json({ success: true }));
		expect((await refreshCpi({ ...options(), fetcher })).published).toBe(true);
	});
	it.each([503, 403])('never writes after an ABS error (%s)', async (status) => {
		const fetcher = vi.fn().mockResolvedValue(new Response('error', { status }));
		await expect(refreshCpi({ ...options(), fetcher })).rejects.toThrow();
		expect(fetcher).toHaveBeenCalledTimes(1);
	});
	it('never writes a partial response or after a failed KV read', async () => {
		const partial = absCpiFixture();
		delete partial.data.dataSets[0].series['0:0:0:0:0'].observations['0'];
		const fetcher = vi.fn().mockResolvedValue(Response.json(partial));
		await expect(refreshCpi({ ...options(), fetcher })).rejects.toThrow('discard');
		expect(fetcher).toHaveBeenCalledTimes(1);
		fetcher
			.mockReset()
			.mockResolvedValueOnce(Response.json(absCpiFixture()))
			.mockResolvedValueOnce(new Response('', { status: 403 }));
		await expect(refreshCpi({ ...options(), fetcher })).rejects.toThrow();
		expect(fetcher).toHaveBeenCalledTimes(2);
	});
});
