// @ts-nocheck
import { describe, expect, it, vi } from 'vitest';
import { builtinLayout, createSavedDashboard } from './dashboard-model.js';
import {
	SAVED_VIEWS_KEY,
	deleteSavedView,
	loadSavedViews,
	persistSavedViews,
	upsertSavedView
} from './dashboard-storage.js';

function dashboard(id = 'one', name = 'One') {
	return createSavedDashboard({
		id,
		name,
		region: '_all',
		group: 'detailed',
		range: { kind: 'preset', days: 7, intervalId: '30m' },
		panels: builtinLayout().panels,
		now: '2026-08-13T00:00:00.000Z'
	});
}

describe('Tracker dashboard saved view storage', () => {
	it('loads, updates and deletes saved views', () => {
		const storage = {
			value: '',
			getItem() {
				return this.value || null;
			},
			setItem(_key, value) {
				this.value = value;
			}
		};
		let views = upsertSavedView([], dashboard());
		views = upsertSavedView(views, dashboard('one', 'Updated'));
		expect(views).toHaveLength(1);
		expect(persistSavedViews(storage, views)).toBe(true);
		expect(JSON.parse(storage.value)).toMatchObject({ version: 1 });
		expect(loadSavedViews(storage).views[0].name).toBe('Updated');
		expect(deleteSavedView(views, 'one')).toEqual([]);
	});

	it('migrates a legacy array and tolerates corrupt or blocked storage', () => {
		const saved = dashboard();
		expect(loadSavedViews({ getItem: () => JSON.stringify([saved]) }).views).toHaveLength(1);
		expect(loadSavedViews({ getItem: () => '{broken' })).toEqual({ views: [], available: false });
		const blocked = {
			getItem: vi.fn(() => {
				throw new Error('blocked');
			})
		};
		expect(loadSavedViews(blocked)).toEqual({ views: [], available: false });
		expect(
			persistSavedViews(
				{
					setItem: () => {
						throw new Error('blocked');
					}
				},
				[saved]
			)
		).toBe(false);
	});

	it('uses the versioned key', () => {
		const setItem = vi.fn();
		persistSavedViews({ setItem }, [dashboard()]);
		expect(setItem).toHaveBeenCalledWith(SAVED_VIEWS_KEY, expect.any(String));
	});

	it('migrates views saved under the former v2 key', () => {
		const saved = dashboard();
		const storage = {
			getItem(key) {
				return key === 'oe.tracker.v2.views.v1'
					? JSON.stringify({ version: 1, views: [saved] })
					: null;
			}
		};
		expect(loadSavedViews(storage).views).toHaveLength(1);
	});
});
