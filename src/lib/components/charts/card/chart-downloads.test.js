import { describe, expect, it } from 'vitest';
import { orderByDocument, workbookAvailability } from './chart-downloads.js';

/** A stand-in element at a position in the document. @param {number} position */
const at = (position) => ({
	position,
	/** @param {any} other */
	compareDocumentPosition: (other) => (other.position > position ? 4 : 2)
});

describe('orderByDocument', () => {
	it('lists entries in screen order, whatever order they registered in', () => {
		const entries = [3, 1, 2].map((position) => ({ element: at(position), id: position }));
		expect(orderByDocument(entries).map((entry) => entry.id)).toEqual([1, 2, 3]);
		// The input is left as it was.
		expect(entries.map((entry) => entry.id)).toEqual([3, 1, 2]);
	});
});

describe('workbookAvailability', () => {
	it('waits for loading charts and refuses failed ones', () => {
		expect(workbookAvailability(['ready', 'loading'])).toEqual({
			enabled: false,
			reason: 'Waiting for charts to load'
		});
		expect(workbookAvailability(['ready', 'error']).enabled).toBe(false);
	});
	it('builds from the charts with data, skipping empty ones', () => {
		expect(workbookAvailability(['ready', 'empty'])).toEqual({ enabled: true, reason: '' });
		expect(workbookAvailability(['empty']).enabled).toBe(false);
		expect(workbookAvailability([]).reason).toBe('No chart data to download');
	});
});
