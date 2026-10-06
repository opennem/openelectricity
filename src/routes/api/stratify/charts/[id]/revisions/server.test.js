import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	fetch: vi.fn(),
	verifyAdmin: vi.fn(),
	listRevisions: vi.fn(),
	restoreChartVersion: vi.fn()
}));

vi.mock('$lib/sanity-cms.js', () => ({
	createCmsClient: () => ({ fetch: mocks.fetch })
}));

vi.mock('$lib/auth/clerk-server.js', () => ({
	verifyAdmin: mocks.verifyAdmin
}));

vi.mock('$lib/server/stratify/revisions.js', () => ({
	listRevisions: mocks.listRevisions
}));

vi.mock('$lib/server/stratify/save-chart.js', () => ({
	restoreChartVersion: mocks.restoreChartVersion
}));

import { GET, POST } from './+server.js';

const CHART = { _id: 'chart-1', _rev: 'rev-1', userId: 'user-1', status: 'draft', title: 'A' };

/** @param {string} [query] */
function get(query = '') {
	const url = new URL(`http://localhost/api/stratify/charts/chart-1/revisions${query}`);
	return GET(/** @type {any} */ ({ request: new Request(url), params: { id: 'chart-1' }, url }));
}

/** @param {unknown} body */
function post(body) {
	const request = new Request('http://localhost/api/stratify/charts/chart-1/revisions', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	});
	return POST(/** @type {any} */ ({ request, params: { id: 'chart-1' } }));
}

beforeEach(() => {
	mocks.fetch.mockReset().mockResolvedValue(CHART);
	mocks.listRevisions.mockReset().mockResolvedValue({ revisions: [], nextBefore: null });
	mocks.restoreChartVersion.mockReset();
	mocks.verifyAdmin.mockReset().mockResolvedValue({
		isAdmin: true,
		isSuperAdmin: false,
		authenticated: true,
		userId: 'user-1',
		userEmail: 'a@example.com'
	});
});

describe('GET /api/stratify/charts/:id/revisions', () => {
	it('lists a page of history, uncached', async () => {
		const response = await get('?before=2026-10-06T05:00:00.000Z');

		expect(response.status).toBe(200);
		expect(response.headers.get('cache-control')).toBe('no-store');
		expect(mocks.listRevisions).toHaveBeenCalledWith(expect.anything(), 'chart-1', {
			before: '2026-10-06T05:00:00.000Z'
		});
	});

	it('rejects a malformed cursor', async () => {
		expect((await get('?before=yesterday')).status).toBe(400);
	});

	it('keeps history from readers of a published chart', async () => {
		mocks.fetch.mockResolvedValue({ ...CHART, userId: 'user-9', status: 'published' });

		expect((await get()).status).toBe(403);
	});
});

describe('POST /api/stratify/charts/:id/revisions', () => {
	it('restores a revision and returns the restored chart', async () => {
		const restored = { ...CHART, _rev: 'rev-2', title: 'Old' };
		mocks.restoreChartVersion.mockResolvedValue({
			outcome: 'saved',
			rev: 'rev-2',
			chart: restored,
			merged: false
		});

		const response = await post({ restoreTo: 'revision-1' });

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({
			chart: { _id: 'chart-1', _rev: 'rev-2' },
			latest: restored
		});
		expect(mocks.restoreChartVersion).toHaveBeenCalledWith(expect.anything(), {
			chart: CHART,
			revisionId: 'revision-1',
			author: { userId: 'user-1', userEmail: 'a@example.com' }
		});
	});

	it('returns the current chart when it already matches the version', async () => {
		mocks.restoreChartVersion.mockResolvedValue({ outcome: 'unchanged', rev: 'rev-1' });

		const body = await (await post({ restoreTo: 'revision-1' })).json();

		expect(body).toMatchObject({ chart: { _id: 'chart-1', _rev: 'rev-1' }, latest: CHART });
	});

	it('requires a revision and reports unknown ones', async () => {
		expect((await post({})).status).toBe(400);

		mocks.restoreChartVersion.mockResolvedValue({ outcome: 'not-found' });
		expect((await post({ restoreTo: 'missing' })).status).toBe(404);
	});
});
