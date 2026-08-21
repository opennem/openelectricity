import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	deleteLocalTrackerView,
	listLocalTrackerViews,
	loadLocalTrackerView,
	saveLocalTrackerView
} from './tracker-view-storage.js';

function storageMock() {
	/** @type {Map<string,string>} */
	const values = new Map();
	return {
		getItem: (/** @type {string} */ key) => values.get(key) ?? null,
		setItem: (/** @type {string} */ key, /** @type {string} */ value) => values.set(key, value),
		removeItem: (/** @type {string} */ key) => values.delete(key)
	};
}

describe('local tracker views', () => {
	beforeEach(() => vi.stubGlobal('localStorage', storageMock()));

	it('creates, updates, lists, loads and deletes a named view', () => {
		const created = saveLocalTrackerView({ name: 'First', items: [] });
		expect(created.ok).toBe(true);
		if (!created.record) throw new Error('Expected a saved record');
		expect(listLocalTrackerViews()[0].name).toBe('First');
		expect(loadLocalTrackerView(created.record.id)?.snapshot.name).toBe('First');

		const updated = saveLocalTrackerView({ name: 'Renamed', items: [] }, created.record.id);
		if (!updated.record) throw new Error('Expected an updated record');
		expect(updated.record.createdAt).toBe(created.record.createdAt);
		expect(listLocalTrackerViews()[0].name).toBe('Renamed');
		expect(deleteLocalTrackerView(created.record.id)).toBe(true);
		expect(listLocalTrackerViews()).toEqual([]);
	});

	it('survives corrupt storage and quota failures', () => {
		globalThis.localStorage.setItem('oe:tracker-explore:index:v1', 'bad json');
		expect(listLocalTrackerViews()).toEqual([]);
		vi.stubGlobal('localStorage', {
			getItem: () => null,
			setItem: () => {
				throw new Error('quota');
			},
			removeItem: () => {}
		});
		expect(saveLocalTrackerView({ name: 'No room' }).ok).toBe(false);
	});
});
