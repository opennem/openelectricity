import { describe, expect, it } from 'vitest';
import { createTrackerData } from './tracker-data.svelte.js';
import { createTrackerSession } from './tracker-session.svelte.js';
import { parseTrackerUrl } from './tracker-url.js';

describe('Tracker snapshot publication', () => {
	it('rejects stale bounds, interval, filters and exclusions even after a fetch settles', () => {
		const nowMs = Date.now();
		const session = createTrackerSession(
			{ ...parseTrackerUrl(new URLSearchParams(), { nowMs }), nowMs },
			() => {}
		);
		/** @type {string[]} */
		let hidden = [];
		const data = createTrackerData({
			session,
			priceMetric: () => 'price',
			emissionsMetric: () => 'emissions_intensity',
			hidden: () => hidden,
			charts: () =>
				/** @type {const} */ (['generation', 'market', 'emissions']).map((name) => ({
					getQueryState: () => ({ key: data.queryKey(name), pending: false, error: null })
				}))
		});
		/** @param {import('./tracker-data.svelte.js').ChartKey} name */
		const snapshot = (name) => ({
			queryKey: data.queryKey(name),
			...session.window,
			data: [],
			nativeData: [],
			seriesNames: [],
			seriesLabels: {},
			seriesColours: {}
		});
		const old = snapshot('generation');
		data.publish('generation', old);
		expect(data.ready('generation')).toBe(true); // A confirmed empty dataset is ready.
		session.selectRange(30);
		expect(data.settled).toBe(true);
		expect(data.ready('generation')).toBe(false); // Load-complete is not publication.
		data.publish('generation', old);
		expect(data.current('generation')).toBeNull();
		data.publish('generation', snapshot('generation'));
		expect(data.ready('generation')).toBe(true);
		session.selectInterval('1d');
		data.publish('generation', snapshot('generation'));
		// Calendar filters only exist in the All tier; the session validates them.
		session.selectRange(-1);
		session.selectInterval('1M');
		data.publish('generation', snapshot('generation'));
		expect(data.ready('generation')).toBe(true);
		session.select('bucketFilter', 'jan');
		expect(session.selection.bucketFilter).toBe('jan');
		expect(data.ready('generation')).toBe(false);
		data.publish('emissions', snapshot('emissions'));
		hidden = ['coal'];
		expect(data.ready('emissions')).toBe(false);
	});
});
