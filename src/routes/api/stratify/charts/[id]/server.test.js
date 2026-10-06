import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	fetch: vi.fn(),
	verifyAdmin: vi.fn(),
	saveChartFields: vi.fn()
}));

vi.mock('$lib/sanity-cms.js', () => ({
	createCmsClient: () => ({ fetch: mocks.fetch })
}));

vi.mock('$lib/auth/clerk-server.js', () => ({
	verifyAdmin: mocks.verifyAdmin
}));

vi.mock('$lib/server/stratify/save-chart.js', async (importOriginal) => ({
	...(await importOriginal()),
	saveChartFields: mocks.saveChartFields
}));

import { PATCH } from './+server.js';

/** @param {unknown} body */
async function patch(body) {
	const request = new Request('http://localhost/api/stratify/charts/chart-1', {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	});
	return PATCH(/** @type {any} */ ({ request, params: { id: 'chart-1' } }));
}

describe('PATCH /api/stratify/charts/:id', () => {
	beforeEach(() => {
		mocks.fetch.mockReset().mockResolvedValue({ _id: 'chart-1', userId: 'user-1' });
		mocks.saveChartFields.mockReset().mockResolvedValue({
			outcome: 'saved',
			rev: 'rev-2',
			chart: { _id: 'chart-1', _rev: 'rev-2' },
			merged: false
		});
		mocks.verifyAdmin.mockReset().mockResolvedValue({
			isAdmin: true,
			isSuperAdmin: false,
			authenticated: true,
			userId: 'user-1',
			userEmail: 'a@example.com'
		});
	});

	it('saves changed fields against the base revision, keeping null and zero values', async () => {
		const response = await patch({
			baseRev: 'rev-1',
			fields: {
				scatterSizeColumn: null,
				scatterPointRadius: 0,
				annotationItems: [],
				userId: 'user-2'
			}
		});

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({
			chart: { _id: 'chart-1', _rev: 'rev-2' },
			latest: null
		});
		expect(mocks.saveChartFields).toHaveBeenCalledWith(expect.anything(), {
			id: 'chart-1',
			baseRev: 'rev-1',
			values: { scatterSizeColumn: null, scatterPointRadius: 0, annotationItems: [] },
			author: { userId: 'user-1', userEmail: 'a@example.com' }
		});
	});

	it('requires a base revision with changed fields', async () => {
		const response = await patch({ fields: { title: 'A' } });

		expect(response.status).toBe(400);
		expect(mocks.saveChartFields).not.toHaveBeenCalled();
	});

	it('saves an earlier whole-snapshot body without conflict checks', async () => {
		const response = await patch({ title: 'Mix', version: 2, _id: 'chart-9' });

		expect(response.status).toBe(200);
		expect(mocks.saveChartFields).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ baseRev: null, values: { title: 'Mix', version: 2 } })
		);
	});

	it('rejects a body with no registry fields', async () => {
		const response = await patch({ baseRev: 'rev-1', fields: { userId: 'user-2' } });

		expect(response.status).toBe(400);
		expect(mocks.saveChartFields).not.toHaveBeenCalled();
	});

	it('returns 409 with the conflicts and current chart', async () => {
		const latest = { _id: 'chart-1', _rev: 'rev-3', title: 'Theirs' };
		const conflicts = [{ field: 'title', changedBy: null }];
		mocks.saveChartFields.mockResolvedValue({ outcome: 'conflict', conflicts, latest });

		const response = await patch({ baseRev: 'rev-1', fields: { title: 'Mine' } });

		expect(response.status).toBe(409);
		expect(await response.json()).toEqual({ error: 'Conflict', conflicts, chart: latest });
	});

	it('forbids saves to a published chart by someone other than the owner', async () => {
		mocks.fetch.mockResolvedValue({ _id: 'chart-1', userId: 'user-9', status: 'published' });

		const response = await patch({ baseRev: 'rev-1', fields: { title: 'A' } });

		expect(response.status).toBe(403);
		expect(mocks.saveChartFields).not.toHaveBeenCalled();
	});

	it("hides someone else's draft", async () => {
		mocks.fetch.mockResolvedValue({ _id: 'chart-1', userId: 'user-9', status: 'draft' });

		const response = await patch({ baseRev: 'rev-1', fields: { title: 'A' } });

		expect(response.status).toBe(404);
	});

	it('lets a superadmin save any chart', async () => {
		mocks.fetch.mockResolvedValue({ _id: 'chart-1', userId: 'user-9', status: 'draft' });
		mocks.verifyAdmin.mockResolvedValue({
			isAdmin: true,
			isSuperAdmin: true,
			authenticated: true,
			userId: 'user-1'
		});

		const response = await patch({ baseRev: 'rev-1', fields: { title: 'A' } });

		expect(response.status).toBe(200);
	});
});
