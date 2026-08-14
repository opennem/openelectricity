import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	fetch: vi.fn(),
	create: vi.fn(),
	verifyAdmin: vi.fn()
}));

vi.mock('$lib/sanity-cms.js', () => ({
	createCmsClient: () => ({ fetch: mocks.fetch, create: mocks.create })
}));

vi.mock('$lib/auth/clerk-server.js', () => ({
	verifyAdmin: mocks.verifyAdmin
}));

import { POST } from './+server.js';

describe('POST /api/stratify/charts/:id/fork annotation persistence', () => {
	beforeEach(() => {
		mocks.verifyAdmin.mockReset().mockResolvedValue({
			isAdmin: true,
			isSuperAdmin: false,
			authenticated: true,
			userId: 'fork-user',
			userEmail: 'fork@example.com'
		});
		mocks.fetch.mockReset().mockResolvedValue({
			_id: 'source-chart',
			_type: 'stratifyChart',
			userId: 'source-user',
			status: 'published',
			title: 'Annotated wind chart',
			csvText: 'date,value\n2026-07-01,10',
			annotationCsvText: 'date,label\n2026-07-01,Start',
			annotationMappings: JSON.stringify({ xColumn: 'date', labelColumn: 'label' }),
			annotationStyle: JSON.stringify({ lineWidth: 2 }),
			annotationRowOptions: JSON.stringify({ 2: { colour: '#f00', positionBy: 'y' } })
		});
		mocks.create.mockReset().mockResolvedValue({ _id: 'forked-chart' });
	});

	it('copies the annotation dataset and configuration into the fork', async () => {
		const response = await POST(
			/** @type {any} */ ({
				request: new Request('http://localhost/api/stratify/charts/source-chart/fork', {
					method: 'POST'
				}),
				params: { id: 'source-chart' }
			})
		);
		const document = mocks.create.mock.calls[0][0];

		expect(response.status).toBe(201);
		expect(document).toMatchObject({
			annotationCsvText: 'date,label\n2026-07-01,Start',
			annotationMappings: JSON.stringify({ xColumn: 'date', labelColumn: 'label' }),
			annotationStyle: JSON.stringify({ lineWidth: 2 }),
			annotationRowOptions: JSON.stringify({ 2: { colour: '#f00', positionBy: 'y' } }),
			userId: 'fork-user',
			status: 'draft',
			forkedFrom: 'source-chart'
		});
	});
});
