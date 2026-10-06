import { describe, expect, it } from 'vitest';
import { groupRevisionsByDay } from './history.js';

/**
 * Local-time ISO string, so grouping is independent of the test machine's zone.
 * @param {number} year
 * @param {number} month - 1-based
 * @param {number} day
 * @param {number} [hour]
 */
function local(year, month, day, hour = 12) {
	return new Date(year, month - 1, day, hour).toISOString();
}

describe('groupRevisionsByDay', () => {
	it('groups newest-first revisions under today, yesterday and dated headings', () => {
		const now = new Date(2026, 9, 6, 15);
		const revisions = [
			{ _id: 'a', createdAt: local(2026, 10, 6, 14) },
			{ _id: 'b', createdAt: local(2026, 10, 6, 9) },
			{ _id: 'c', createdAt: local(2026, 10, 5) },
			{ _id: 'd', createdAt: local(2026, 9, 28) }
		];

		const groups = groupRevisionsByDay(revisions, now);

		expect(groups.map((group) => group.label)).toEqual([
			'Today',
			'Yesterday',
			expect.stringContaining('28 Sept 2026')
		]);
		expect(groups.map((group) => group.revisions.map((revision) => revision._id))).toEqual([
			['a', 'b'],
			['c'],
			['d']
		]);
	});

	it('returns no groups for no revisions', () => {
		expect(groupRevisionsByDay([])).toEqual([]);
	});
});
