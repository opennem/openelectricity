import { describe, expect, it } from 'vitest';
import {
	buildDailyProfile,
	buildAverageDayStack,
	normaliseProfileDays,
	normaliseProfileEnd,
	profileDataset,
	profileWindow
} from './time-of-day.js';
import { datasetToCsv } from './tracker-export.js';
import { applyTrackerUrl, parseTrackerUrl } from './tracker-url.js';

const nowMs = Date.parse('2026-09-06T15:00:00Z');
const day = 86_400_000;

describe('average-day fuel technology stack', () => {
	const window = profileWindow(nowMs, '+10:00', 7);
	it('stacks averages in group order, with negative power pulling the stack down', () => {
		const rows = [
			{ time: window.start, coal: 100, wind: 50, charging: -20, pumping: -10 },
			{ time: window.start + day, coal: 300, wind: 150, charging: -40, pumping: -30 }
		];
		const stack = buildAverageDayStack(rows, ['coal', 'charging', 'wind', 'pumping'], window);
		expect(stack.map((layer) => layer.points[0])).toMatchObject([
			{ value: 200, y0: 0, y1: 200, days: 2 },
			{ value: -30, y0: 200, y1: 170 },
			{ value: 100, y0: 170, y1: 270 },
			{ value: -20, y0: 270, y1: 250 }
		]);
	});
	it('keeps valid zero layers and gaps the whole stack for missing technologies', () => {
		const rows = [
			{ time: window.start, coal: 10, wind: 0 },
			{ time: window.start + 1_800_000, coal: 20 }
		];
		const stack = buildAverageDayStack(rows, ['coal', 'wind'], window);
		expect(stack[1].points[0]).toMatchObject({ value: 0, y0: 10, y1: 10 });
		expect(stack[0].points[1]).toMatchObject({ value: 20, y0: null, y1: null, days: 1 });
		expect(stack[1].points[1]).toMatchObject({ value: null, y0: null, y1: null, days: 0 });
	});
	it('uses the same equal-day averaging as individual profiles', () => {
		const rows = [
			{ time: window.start, wind: 10 },
			{ time: window.start + 300_000, wind: 30 },
			{ time: window.start + day, wind: 100 }
		];
		expect(buildAverageDayStack(rows, ['wind'], window)[0].points[0]).toMatchObject({
			value: 60,
			days: 2,
			y1: 60
		});
	});
	it('handles empty responses without fabricated generation', () => {
		expect(buildAverageDayStack([], [], window)).toEqual([]);
		expect(
			buildAverageDayStack([], ['wind'], window)[0].points.every((point) => point.y1 === null)
		).toBe(true);
	});
});

describe('complete network-local profile windows', () => {
	it.each([7, 14, 28])('bounds %s complete days without including today', (days) => {
		const window = profileWindow(nowMs, '+10:00', days);
		expect(window.end).toBe(Date.parse('2026-09-06T14:00:00Z'));
		expect(window.end - window.start).toBe(days * day);
		expect(window.dates).toHaveLength(days);
		expect(window.lastDate).toBe('2026-09-06');
	});
	it('uses WEM local midnight rather than NEM or browser time', () => {
		const window = profileWindow(nowMs, '+08:00', 7);
		expect(window.end).toBe(Date.parse('2026-09-05T16:00:00Z'));
		expect(window.lastDate).toBe('2026-09-05');
	});
	it('keeps network days at 24 hours across civil daylight saving', () => {
		const window = profileWindow(Date.parse('2026-10-07T00:00Z'), '+10:00', 7);
		expect(window.end - window.start).toBe(7 * day);
		expect(new Set(window.dates).size).toBe(7);
	});
	it('supports exact historical dates and clamps future days', () => {
		expect(profileWindow(nowMs, '+10:00', 7, '2024-02-29').lastDate).toBe('2024-02-29');
		expect(profileWindow(nowMs, '+10:00', 7, '2099-01-01').lastDate).toBe('2026-09-06');
	});
	it('validates dates and window presets', () => {
		for (const value of ['bad', '2026-02-29', '2026-13-01', '1998-12-01', null])
			expect(normaliseProfileEnd(value)).toBe('');
		expect(normaliseProfileEnd('2024-02-29')).toBe('2024-02-29');
		expect(normaliseProfileDays('28')).toBe(28);
		expect(normaliseProfileDays(1000)).toBe(7);
	});
});

describe('time-of-day aggregation', () => {
	const window = profileWindow(nowMs, '+10:00', 7);
	it('weights daily half-hour means equally despite unequal sample coverage', () => {
		const rows = [
			{ time: window.start, power: 10 },
			{ time: window.start + 300_000, power: 30 },
			{ time: window.start + day, power: 100 }
		];
		const profile = buildDailyProfile(rows, 'power', window);
		expect(profile[0]).toMatchObject({
			average: 60,
			days: 2,
			values: [20, 100, null, null, null, null, null],
			samples: [2, 1, 0, 0, 0, 0, 0]
		});
		expect(profile[1]).toMatchObject({ average: null, days: 0 });
		expect(profile).toHaveLength(48);
		expect(profile[47].label).toBe('23:30');
	});
	it('retains zero and negative readings, excludes missing/non-finite values', () => {
		const rows = [0, -100, null, undefined, NaN, Infinity].map((power, i) => ({
			time: window.start + i * day,
			power
		}));
		expect(buildDailyProfile(rows, 'power', window)[0]).toMatchObject({ average: -50, days: 2 });
	});
	it('deduplicates timestamps and excludes both out-of-window endpoints', () => {
		const rows = [
			{ time: window.start - 1, power: 999 },
			{ time: window.start, power: 1 },
			{ time: window.start, power: 20 },
			{ time: window.end, power: 999 }
		];
		expect(buildDailyProfile(rows, 'power', window)[0]).toMatchObject({
			average: 20,
			days: 1,
			samples: [1, 0, 0, 0, 0, 0, 0]
		});
	});
	it('retains empty days and ignores other series', () => {
		const profile = buildDailyProfile([{ time: window.start, other: 100 }], 'power', window);
		expect(profile.every((row) => row.average === null && row.days === 0)).toBe(true);
	});
	it('exports values, network time and native coverage without zero-filling blanks', () => {
		const profile = buildDailyProfile([{ time: window.start, power: 0 }], 'power', window);
		const dataset = profileDataset(profile, window, {
			label: 'Wind, offshore',
			unit: 'MW',
			region: 'NEM',
			timeZone: '+10:00'
		});
		const csv = datasetToCsv(dataset, '+10:00');
		expect(csv.split('\n')).toHaveLength(49);
		expect(csv).toContain('Average (MW),Days available');
		expect(csv).toContain('NEM,AEST (UTC+10:00),"Wind, offshore",00:00,0,1,0,1,,0');
	});
});

describe('time-of-day URLs', () => {
	it('round-trips analysis without changing the timeline selection', () => {
		const params = new URLSearchParams(
			'region=wem&view=daily&profile-days=28&profile-metric=price&profile-series=wind&profile-end=2026-08-31&range=30d&hidden=coal'
		);
		const state = parseTrackerUrl(params, { nowMs });
		expect(state).toMatchObject({
			profileView: 'daily',
			profileDays: 28,
			profileMetric: 'price',
			profileSeries: 'wind',
			profileEnd: '2026-08-31',
			hiddenSeries: ['coal']
		});
		const url = applyTrackerUrl(new URL('https://example.test/tracker'), state);
		expect(parseTrackerUrl(url.searchParams, { nowMs })).toEqual(state);
	});
	it('old links keep timeline defaults and malformed selections are normalised', () => {
		const state = parseTrackerUrl(
			new URLSearchParams(
				'region=au&view=broken&profile-days=999&profile-metric=price&profile-series=unknown&profile-end=2026-02-30'
			),
			{ nowMs }
		);
		expect(state).toMatchObject({
			profileView: 'timeline',
			profileDays: 7,
			profileMetric: 'power',
			profileSeries: '',
			profileEnd: ''
		});
		const url = applyTrackerUrl(
			new URL('https://example.test/tracker?view=broken&profile-days=999'),
			state
		);
		expect(url.search).toBe('?region=au');
	});
});
