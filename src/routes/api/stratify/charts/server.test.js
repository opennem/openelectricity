import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	create: vi.fn(),
	verifyAdmin: vi.fn()
}));

vi.mock('$lib/sanity-cms.js', () => ({
	createCmsClient: () => ({ create: mocks.create })
}));

vi.mock('$lib/auth/clerk-server.js', () => ({
	verifyAdmin: mocks.verifyAdmin
}));

import { POST } from './+server.js';

describe('POST /api/stratify/charts chart-field persistence', () => {
	beforeEach(() => {
		mocks.create.mockReset().mockResolvedValue({ _id: 'new-chart' });
		mocks.verifyAdmin.mockReset().mockResolvedValue({
			isAdmin: true,
			isSuperAdmin: false,
			authenticated: true,
			userId: 'user-1',
			userEmail: 'user@example.com'
		});
	});

	it('persists scatter fields and preserves explicit zero values', async () => {
		const request = new Request('http://localhost/api/stratify/charts', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				csvText: 'x,y,size\n1,2,3',
				chartType: 'scatter',
				scatterSizeColumn: 'size',
				scatterPointRadius: 0,
				scatterMinRadius: 0,
				scatterMaxRadius: 20,
				scatterPointOpacity: 0
			})
		});

		const response = await POST(/** @type {any} */ ({ request }));
		const document = mocks.create.mock.calls[0][0];

		expect(response.status).toBe(201);
		expect(document).toMatchObject({
			chartType: 'scatter',
			scatterSizeColumn: 'size',
			scatterPointRadius: 0,
			scatterMinRadius: 0,
			scatterMaxRadius: 20,
			scatterPointOpacity: 0
		});
	});

	it('persists line range fields and preserves zero opacity', async () => {
		const request = new Request('http://localhost/api/stratify/charts', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				csvText: 'date,mean,minimum,maximum\n2025-01-01,20,10,30',
				chartType: 'line',
				lineRangeMinColumn: 'minimum',
				lineRangeMaxColumn: 'maximum',
				lineRangeOpacity: 0,
				tooltipDateFormat: 'date-time'
			})
		});

		const response = await POST(/** @type {any} */ ({ request }));
		const document = mocks.create.mock.calls[0][0];

		expect(response.status).toBe(201);
		expect(document).toMatchObject({
			chartType: 'line',
			lineRangeMinColumn: 'minimum',
			lineRangeMaxColumn: 'maximum',
			lineRangeOpacity: 0,
			tooltipDateFormat: 'date-time'
		});
	});
});
