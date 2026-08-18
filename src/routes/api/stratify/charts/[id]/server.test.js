import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	fetch: vi.fn(),
	set: vi.fn(),
	commit: vi.fn(),
	verifyAdmin: vi.fn()
}));

vi.mock('$lib/sanity-cms.js', () => ({
	createCmsClient: () => ({
		fetch: mocks.fetch,
		patch: () => ({ set: mocks.set })
	})
}));

vi.mock('$lib/auth/clerk-server.js', () => ({
	verifyAdmin: mocks.verifyAdmin
}));

import { PATCH } from './+server.js';

describe('PATCH /api/stratify/charts/:id chart-field persistence', () => {
	beforeEach(() => {
		mocks.fetch.mockReset().mockResolvedValue({ _id: 'chart-1', userId: 'user-1' });
		mocks.commit.mockReset().mockResolvedValue({ _id: 'chart-1' });
		mocks.set.mockReset().mockReturnValue({ commit: mocks.commit });
		mocks.verifyAdmin.mockReset().mockResolvedValue({
			isAdmin: true,
			isSuperAdmin: false,
			authenticated: true,
			userId: 'user-1'
		});
	});

	it('patches nullable and zero-valued scatter fields without dropping them', async () => {
		const request = new Request('http://localhost/api/stratify/charts/chart-1', {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				scatterSizeColumn: null,
				scatterPointRadius: 0,
				scatterMinRadius: 0,
				scatterMaxRadius: 0,
				scatterPointOpacity: 0
			})
		});

		const response = await PATCH(/** @type {any} */ ({ request, params: { id: 'chart-1' } }));

		expect(response.status).toBe(200);
		expect(mocks.set).toHaveBeenCalledWith({
			scatterSizeColumn: null,
			scatterPointRadius: 0,
			scatterMinRadius: 0,
			scatterMaxRadius: 0,
			scatterPointOpacity: 0
		});
	});

	it('patches nullable and zero-valued line range fields without dropping them', async () => {
		const request = new Request('http://localhost/api/stratify/charts/chart-1', {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				lineRangeMinColumn: null,
				lineRangeMaxColumn: null,
				lineRangeOpacity: 0,
				tooltipDateFormat: 'time'
			})
		});

		const response = await PATCH(/** @type {any} */ ({ request, params: { id: 'chart-1' } }));

		expect(response.status).toBe(200);
		expect(mocks.set).toHaveBeenCalledWith({
			lineRangeMinColumn: null,
			lineRangeMaxColumn: null,
			lineRangeOpacity: 0,
			tooltipDateFormat: 'time'
		});
	});

	it('patches structured annotation data and preserves explicit zero values', async () => {
		const request = new Request('http://localhost/api/stratify/charts/chart-1', {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				annotationStyle: { lineWidth: 0, pointRadius: 0 },
				annotationItems: [],
				annotations: []
			})
		});

		const response = await PATCH(/** @type {any} */ ({ request, params: { id: 'chart-1' } }));

		expect(response.status).toBe(200);
		expect(mocks.set).toHaveBeenCalledWith({
			annotationStyle: JSON.stringify({ lineWidth: 0, pointRadius: 0 }),
			annotationItems: JSON.stringify([]),
			annotations: JSON.stringify([])
		});
	});
});
