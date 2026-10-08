import { afterEach, describe, expect, it, vi } from 'vitest';
import { load } from './+layout.js';
import { load as redirectLoad } from './+page.js';

describe('tracker layout load', () => {
	it('seeds analytical state before charts and emissions exclusions initialise', () => {
		const data = load(
			/** @type {Parameters<typeof load>[0]} */ ({
				route: { id: '/(main)/tracker/timeline' },
				url: new URL(
					'https://example.test/tracker/timeline?hidden=coal&contribution=demand&transform=proportion&market-transform=changeSince'
				)
			})
		);
		expect(data).toMatchObject({
			hiddenSeries: ['coal'],
			contributionMode: 'demand',
			generationTransform: 'proportion',
			marketValueTransform: 'changeSince'
		});
	});
	afterEach(() => vi.restoreAllMocks());

	it('serialises the range anchor used by the hydrating client', () => {
		vi.spyOn(Date, 'now').mockReturnValue(1_765_432_100_000);

		const data = load(
			/** @type {Parameters<typeof load>[0]} */ ({
				route: { id: '/(main)/tracker/timeline' },
				url: new URL('https://example.test/tracker/timeline')
			})
		);

		expect(data.nowMs).toBe(1_765_432_100_000);
		expect(data.range).toEqual({ kind: 'preset', days: 3, intervalId: '30m' });
		expect(data.region).toBe('_all');
		expect(data.group).toBe('simple');
		expect(data.overlays).toEqual([]);
		expect(data.tablePanelOpen).toBe(true);
	});

	it('reads the route, so a view switch re-runs it with the current time', () => {
		let routeRead = false;
		load(
			/** @type {Parameters<typeof load>[0]} */ ({
				route: {
					get id() {
						routeRead = true;
						return '/(main)/tracker/profile';
					}
				},
				url: new URL('https://example.test/tracker/profile')
			})
		);
		expect(routeRead).toBe(true);
	});

	it('parses chart overlays into the initial page state', () => {
		const data = load(
			/** @type {Parameters<typeof load>[0]} */ ({
				route: { id: '/(main)/tracker/timeline' },
				url: new URL(
					'https://example.test/tracker/timeline?overlay=curtailment-wind,demand,renewables'
				)
			})
		);

		expect(data.overlays).toEqual(['demand', 'renewables', 'curtailment-wind']);
	});
});

describe('tracker index redirect', () => {
	/** @param {string} href */
	function redirectFor(href) {
		try {
			redirectLoad(/** @type {Parameters<typeof redirectLoad>[0]} */ ({ url: new URL(href) }));
		} catch (error) {
			return /** @type {{ status: number, location: string }} */ (error);
		}
		throw new Error('expected a redirect');
	}

	it('sends /tracker to the Timeline route', () => {
		expect(redirectFor('https://example.test/tracker')).toMatchObject({
			status: 307,
			location: '/tracker/timeline'
		});
	});

	it('moves retired view links onto their route and keeps the rest of the query', () => {
		expect(redirectFor('https://example.test/tracker?view=compare&range=30d')).toMatchObject({
			location: '/tracker/compare?range=30d'
		});
		expect(redirectFor('https://example.test/tracker?view=broken&region=nsw1')).toMatchObject({
			location: '/tracker/timeline?region=nsw1'
		});
	});
});
