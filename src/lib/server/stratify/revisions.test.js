import { describe, expect, it } from 'vitest';
import { revisionKind, summariseRevision } from './revisions.js';

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
	});
});
