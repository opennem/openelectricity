// @ts-nocheck
import { describe, expect, it } from 'vitest';
import { builtinLayout } from './dashboard-model.js';
import { applyDashboardUrl, copiedDashboardUrl, parseDashboardUrl } from './dashboard-url.js';

const validRegions = ['_all', 'au', 'wem', 'nsw1'];

describe('Tracker dashboard URLs', () => {
	it('round trips compact navigation state without serialising the layout', () => {
		const state = {
			region: '_all',
			group: 'simple',
			range: { kind: 'preset', days: 7, intervalId: '30m' },
			viewId: 'local-1'
		};
		const url = applyDashboardUrl(new URL('https://example.test/tracker/dashboard'), state);
		const parsed = parseDashboardUrl(url.searchParams, { nowMs: Date.now(), validRegions });
		expect(parsed).toMatchObject({
			region: '_all',
			group: 'simple',
			range: state.range,
			viewId: 'local-1'
		});
		expect(url.searchParams.has('layout')).toBe(false);
		expect(parsed.panels.map((panel) => panel.type)).toEqual(
			builtinLayout('analysis').panels.map((panel) => panel.type)
		);
	});

	it('round trips exact custom bounds', () => {
		const state = {
			region: 'nsw1',
			group: 'detailed',
			range: {
				kind: 'custom',
				startMs: 1_700_000_000_000,
				endMs: 1_700_086_400_000,
				intervalId: '30m'
			}
		};
		const url = applyDashboardUrl(new URL('https://example.test/tracker/dashboard'), state);
		const parsed = parseDashboardUrl(url.searchParams, { nowMs: 2_000_000_000_000, validRegions });
		expect(parsed.range).toEqual(state.range);
	});

	it('removes legacy layouts and local view IDs from copied links', () => {
		const url = copiedDashboardUrl(
			new URL('https://example.test/tracker/dashboard?view=old&layout=1.payload'),
			{
				region: '_all',
				group: 'detailed',
				range: { kind: 'preset', days: 7, intervalId: '30m' },
				viewId: 'local-1'
			}
		);
		expect(url.searchParams.has('view')).toBe(false);
		expect(url.searchParams.has('layout')).toBe(false);
	});
});
