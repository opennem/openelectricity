import { describe, expect, it, vi } from 'vitest';
import { listRevisions, revertedSettings, revisionKind, summariseRevision } from './revisions.js';

describe('revisionKind', () => {
	it('classifies publish state changes', () => {
		expect(revisionKind({ status: 'published' }, 'draft')).toBe('publish');
		expect(revisionKind({ status: 'draft' }, 'published')).toBe('unpublish');
		expect(revisionKind({ status: 'published' }, 'published')).toBe('edit');
		expect(revisionKind({ title: 'A' }, 'published')).toBe('edit');
	});
});

describe('summariseRevision', () => {
	it('names up to three fields by label', () => {
		expect(summariseRevision('edit', ['title'])).toBe('Title');
		expect(summariseRevision('edit', ['title', 'chartType', 'userSeriesColours'])).toBe(
			'Title, Chart type, Series colours'
		);
		expect(summariseRevision('edit', ['title', 'chartType', 'notes', 'xLabel', 'yLabel'])).toBe(
			'Title, Chart type, Notes and 2 more'
		);
	});

	it('leaves publish fields out of the list', () => {
		expect(summariseRevision('publish', ['status', 'publishedAt'])).toBe('Published');
		expect(summariseRevision('unpublish', ['status', 'publishedAt', 'title'])).toBe(
			'Unpublished with changes to Title'
		);
		expect(summariseRevision('baseline', [])).toBe('History starts');
		expect(summariseRevision('restore', ['title'])).toBe('Restored Title');
	});
});

describe('revertedSettings', () => {
	it('takes the oldest newer before value per setting, skipping publish state', () => {
		expect(
			revertedSettings([
				{
					changes: [
						{ field: 'title', before: 'B', after: 'C' },
						{ field: 'status', before: 'draft', after: 'published' }
					]
				},
				{ changes: [{ field: 'title', before: 'A', after: 'B' }] },
				{ changes: [{ field: 'userSeriesColours', before: {}, after: { solar: '#ff0' } }] }
			])
		).toEqual({ title: 'A', userSeriesColours: {} });
	});

	it('falls back to the default for values the chart never stored', () => {
		expect(
			revertedSettings([
				{
					// Values the chart never stored have no `before` once JSON-encoded.
					changes: /** @type {any[]} */ ([
						{ field: 'y2Label', after: 'Price' },
						{ field: 'x', after: 1 }
					])
				}
			])
		).toEqual({ y2Label: '' });
	});
});

describe('listRevisions', () => {
	/** @param {number} count */
	function revisionDocs(count) {
		return Array.from({ length: count }, (_, i) => ({
			_id: `r${i}`,
			kind: 'edit',
			summary: 'Title',
			fields: ['title'],
			userEmail: 'a@example.com',
			createdAt: `2026-10-0${9 - i}T00:00:00.000Z`
		}));
	}

	it('pages newest first with a cursor when more remain', async () => {
		const fetch = vi.fn().mockResolvedValue(revisionDocs(3));

		const page = await listRevisions(/** @type {any} */ ({ fetch }), 'chart-1', { limit: 2 });

		expect(page.revisions.map((revision) => revision._id)).toEqual(['r0', 'r1']);
		expect(page.nextBefore).toBe('2026-10-08T00:00:00.000Z');
		expect(page.revisions[0]).toMatchObject({ restoredFrom: null });
		expect(fetch.mock.calls[0][0]).toContain('[0...3]');
	});

	it('filters by the cursor and ends without one', async () => {
		const fetch = vi.fn().mockResolvedValue(revisionDocs(1));

		const page = await listRevisions(/** @type {any} */ ({ fetch }), 'chart-1', {
			before: '2026-10-08T00:00:00.000Z',
			limit: 2
		});

		expect(page.nextBefore).toBeNull();
		expect(fetch.mock.calls[0][0]).toContain('createdAt < $before');
		expect(fetch.mock.calls[0][1]).toMatchObject({ before: '2026-10-08T00:00:00.000Z' });
	});
});
