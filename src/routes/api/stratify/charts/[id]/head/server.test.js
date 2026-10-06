import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ fetch: vi.fn(), verifyAdmin: vi.fn() }));

vi.mock('$lib/sanity-cms.js', () => ({
	createCmsClient: () => ({ fetch: mocks.fetch })
}));

vi.mock('$lib/auth/clerk-server.js', () => ({
	verifyAdmin: mocks.verifyAdmin
}));

import { GET } from './+server.js';

function get() {
	const request = new Request('http://localhost/api/stratify/charts/chart-1/head');
	return GET(/** @type {any} */ ({ request, params: { id: 'chart-1' } }));
}

beforeEach(() => {
	mocks.verifyAdmin.mockReset().mockResolvedValue({
		isAdmin: true,
		isSuperAdmin: false,
		authenticated: true,
		userId: 'user-1'
	});
	mocks.fetch.mockReset();
});

describe('GET /api/stratify/charts/:id/head', () => {
	it('returns the current revision and latest change, uncached', async () => {
		mocks.fetch
			.mockResolvedValueOnce({ _id: 'chart-1', _rev: 'rev-7', userId: 'user-1', status: 'draft' })
			.mockResolvedValueOnce({
				userEmail: 'b@example.com',
				kind: 'edit',
				summary: 'Title',
				createdAt: '2026-10-06T05:00:00.000Z',
				updatedAt: '2026-10-06T05:04:00.000Z'
			});

		const response = await get();

		expect(response.headers.get('cache-control')).toBe('no-store');
		expect(await response.json()).toEqual({
			rev: 'rev-7',
			latest: {
				userEmail: 'b@example.com',
				kind: 'edit',
				summary: 'Title',
				at: '2026-10-06T05:04:00.000Z'
			}
		});
	});

	it('has no latest change for a chart without history', async () => {
		mocks.fetch
			.mockResolvedValueOnce({ _id: 'chart-1', _rev: 'rev-1', userId: 'user-1' })
			.mockResolvedValueOnce(null);

		expect(await (await get()).json()).toEqual({ rev: 'rev-1', latest: null });
	});

	it('returns 404 once the caller lost access', async () => {
		mocks.fetch.mockResolvedValueOnce({ _id: 'chart-1', _rev: 'rev-1', userId: 'user-9' });

		expect((await get()).status).toBe(404);
	});
});
