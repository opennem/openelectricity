import { describe, expect, it } from 'vitest';
import {
	buildDailyProfile,
	averageDayTableRows,
	hourlyProfile,
	profilePercentiles,
	profileRange,
	dailyAverages,
	formatProfileDay,
	buildAverageDayStack,
	normaliseProfileDays,
	normaliseProfileEnd,
	profileChartPart,
	profileDataset,
	profileFocusColumns,
	profileWindow,
	todayWindow
} from './time-of-day.js';
import { datasetToCsv } from './tracker-export.js';
import { applyTrackerUrl, parseTrackerUrl } from './tracker-url.js';
import { PROFILE_DAY_START, PROFILE_SLOT_MS } from './profile-chart.js';

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
	it('profiles the current, incomplete day only up to its latest reading', () => {
		const current = todayWindow(window);
		expect(window.today).toBe('2026-09-07');
		expect(current).toMatchObject({
			start: window.end,
			end: window.end + day,
			dates: ['2026-09-07'],
			slots: 48
		});
		const profile = buildDailyProfile(
			[
				{ time: current.start, wind: 40 },
				{ time: current.start + 1_800_000, wind: 60 }
			],
			'wind',
			current
		);
		expect(profile[0]).toMatchObject({ average: 40, days: 1 });
		expect(profile[1]).toMatchObject({ average: 60, days: 1 });
		expect(profile[2].average).toBeNull();
		// A picked historical last day leaves today unchanged.
		expect(profileWindow(nowMs, '+10:00', 7, '2026-08-31').todayStart).toBe(window.end);
	});
	it('averages 5-minute slots when the interval asks for them', () => {
		const fine = profileWindow(nowMs, '+10:00', 7, '', '5m');
		expect(fine).toMatchObject({ slotMs: 300_000, slots: 288 });
		const rows = [
			{ time: fine.start + 300_000, wind: 10 },
			{ time: fine.start + 600_000, wind: 30 }
		];
		const profile = buildDailyProfile(rows, 'wind', fine);
		expect(profile).toHaveLength(288);
		expect(profile[1]).toMatchObject({ minute: 5, label: '00:05', average: 10, days: 1 });
		expect(profile[2]).toMatchObject({ label: '00:10', average: 30 });
		// The same readings share one half-hour by default.
		expect(buildDailyProfile(rows, 'wind', window)[0].average).toBe(20);
		expect(buildAverageDayStack(rows, ['wind'], fine)[0].points).toHaveLength(288);
	});
	it('handles empty responses without fabricated generation', () => {
		expect(buildAverageDayStack([], [], window)).toEqual([]);
		expect(
			buildAverageDayStack([], ['wind'], window)[0].points.every((point) => point.y1 === null)
		).toBe(true);
	});
});

describe('average-day fuel technology table', () => {
	const window = profileWindow(nowMs, '+10:00', 7);
	const names = ['coal', 'wind', 'charging'];
	// One complete day: wind is missing from the 00:30 slot only.
	const rows = Array.from({ length: 48 }, (_, slot) => ({
		time: window.start + slot * PROFILE_SLOT_MS,
		coal: 100,
		...(slot === 1 ? {} : { wind: 50 }),
		charging: -20
	}));
	const layers = buildAverageDayStack(rows, names, window);
	const meta = {
		seriesNames: names,
		seriesLabels: { coal: 'Coal', wind: 'Wind', charging: 'Charging' },
		seriesColours: { coal: '#000', wind: '#0f0', charging: '#00f' }
	};
	const table = (
		/** @type {{hidden?: string[], time?: number, span?: number, mode?: 'demand' | 'generation',
		 * demand?: ReturnType<typeof buildDailyProfile> | null}} */ options = {}
	) =>
		averageDayTableRows({
			layers,
			meta,
			loadSeriesIds: ['charging'],
			hidden: options.hidden ?? [],
			mode: options.mode ?? 'generation',
			demand: options.demand,
			slotMs: PROFILE_SLOT_MS,
			range:
				options.time === undefined
					? undefined
					: { start: options.time, end: options.time + (options.span ?? PROFILE_SLOT_MS) }
		});

	it('summarises the average day in stack order, through slots the stack cannot draw', () => {
		const [charging, wind, coal] = table();
		expect(coal).toMatchObject({ id: 'coal', label: 'Coal', avPowerMW: 100, energyMWh: 2400 });
		expect(wind).toMatchObject({ avPowerMW: 50, energyMWh: 1175 });
		expect(coal.contributionPct).toBeCloseTo((2400 / 3575) * 100);
		expect(charging).toMatchObject({ isLoad: true, avPowerMW: 20, contributionPct: null });
		expect(coal).toMatchObject({ vwPrice: null, emissionsT: null, intensityKgPerMWh: null });
	});
	it('reports one inspected half-hour, leaving a missing technology unavailable', () => {
		const [, wind, coal] = table({ time: PROFILE_DAY_START + PROFILE_SLOT_MS });
		expect(coal).toMatchObject({ avPowerMW: 100, energyMWh: 50, contributionPct: 100 });
		expect(wind).toMatchObject({ avPowerMW: null, energyMWh: null, contributionPct: null });
	});
	it("covers a radial clock's whole hour: both of its half-hours", () => {
		// 00:00 has every technology; 00:30 lacks wind.
		const [, wind, coal] = table({ time: PROFILE_DAY_START, span: 3_600_000 });
		expect(coal).toMatchObject({ avPowerMW: 100, energyMWh: 100 });
		expect(wind).toMatchObject({ avPowerMW: 50, energyMWh: 25 });
	});
	it('flags hidden technologies without changing their values', () => {
		const [, wind] = table({ hidden: ['wind'] });
		expect(wind).toMatchObject({ hidden: true, avPowerMW: 50 });
	});
	it("shares the average day's gross demand, or reports no share without it", () => {
		const demand = buildDailyProfile(
			rows.map((row) => ({ time: row.time, demand_gross: 200 })),
			'demand_gross',
			window
		);
		const [charging, wind, coal] = table({ mode: 'demand', demand });
		expect(coal.contributionPct).toBeCloseTo(50);
		expect(wind.contributionPct).toBeCloseTo((1175 / 4800) * 100);
		expect(charging.contributionPct).toBeNull();
		const [, , inspected] = table({ mode: 'demand', demand, time: PROFILE_DAY_START });
		expect(inspected.contributionPct).toBeCloseTo(50);
		expect(table({ mode: 'demand', demand: null })[2].contributionPct).toBeNull();
	});
});

describe('breakdown styles', () => {
	const window = profileWindow(nowMs, '+10:00', 7);
	// Day d reads 10 × (d + 1) at 00:00 and nothing at 00:30.
	const rows = window.dates.map((_, d) => ({ time: window.start + d * day, wind: 10 * (d + 1) }));
	const profile = buildDailyProfile(rows, 'wind', window);
	it('summarises each slot by percentiles of its days', () => {
		const [first, second] = profilePercentiles(profile);
		expect(first).toMatchObject({ label: '00:00', p50: 40, p25: 25, p75: 55 });
		expect(first.p10).toBeCloseTo(16);
		expect(first.p90).toBeCloseTo(64);
		expect(second).toMatchObject({ p10: null, p50: null, p90: null });
	});
	it("ranges a series across one slot's days, or across each day's average", () => {
		// The 00:00 slot: 10, 20 … 70 across the seven days.
		expect(profileRange(profile, 0)).toMatchObject({ p25: 25, p50: 40, p75: 55 });
		expect(profileRange(profile, 30)).toEqual({
			p10: null,
			p25: null,
			p50: null,
			p75: null,
			p90: null
		});
		// Each day has only the 00:00 reading, so its average is that value.
		expect(profileRange(profile).p50).toBe(40);
		const twoSlots = buildDailyProfile(
			[
				{ time: window.start, wind: 10 },
				{ time: window.start + 1_800_000, wind: 30 },
				{ time: window.start + day, wind: 50 }
			],
			'wind',
			window
		);
		// Day one averages 20 and day two 50; the other days are empty.
		expect(profileRange(twoSlots)).toMatchObject({ p50: 35, p10: 23 });
	});
	it('averages each day and labels it briefly', () => {
		const twoSlots = buildDailyProfile(
			[
				{ time: window.start, wind: 10 },
				{ time: window.start + 1_800_000, wind: 30 }
			],
			'wind',
			window
		);
		expect(dailyAverages(twoSlots)).toEqual([20, null, null, null, null, null, null]);
		expect(formatProfileDay('2026-09-24')).toBe('24 Sept');
	});
	it('averages the available slots of each hour', () => {
		const hours = hourlyProfile(profile);
		expect(hours).toHaveLength(24);
		// 00:00 averages 40 and 00:30 is empty, so the hour reads 40.
		expect(hours[0]).toMatchObject({ hour: 0, label: '00:00', average: 40 });
		expect(hours[1].average).toBeNull();
		const fine = profileWindow(nowMs, '+10:00', 7, '', '5m');
		const fiveMinute = buildDailyProfile(
			[
				{ time: fine.start + 13 * 3_600_000, wind: 10 },
				{ time: fine.start + 13 * 3_600_000 + 300_000, wind: 30 }
			],
			'wind',
			fine
		);
		expect(hourlyProfile(fiveMinute)[13].average).toBe(20);
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
	it('exports each picked series, every day in multi-line, without zero-filling blanks', () => {
		const coal = buildDailyProfile([{ time: window.start, coal: 100 }], 'coal', window);
		const price = buildDailyProfile([{ time: window.start, price: 50 }], 'price', window);
		const series = [
			{ label: 'Coal, black', unit: 'MW', profile: coal },
			{ label: 'Spot price', unit: '$/MWh', profile: price }
		];
		const average = datasetToCsv(
			profileDataset({
				series,
				dates: window.dates,
				daily: false,
				region: 'NEM',
				timeZone: '+10:00'
			}),
			'+10:00'
		);
		expect(average.split('\n')).toHaveLength(49);
		expect(average.split('\n')[0]).toBe(
			'Region,Network time,Time of day,"Coal, black average (MW)","Coal, black days",Spot price average ($/MWh),Spot price days'
		);
		expect(average).toContain('NEM,AEST (UTC+10:00),00:00,100,1,50,1');
		expect(average).toContain('NEM,AEST (UTC+10:00),00:30,,0,,0');
		const daily = profileDataset({
			series,
			dates: window.dates,
			daily: true,
			region: 'NEM',
			timeZone: '+10:00'
		});
		expect(daily.columns).toHaveLength(3 + 2 * (2 + window.dates.length));
		expect(daily.columns[5].header).toBe(`Coal, black ${window.dates[0]} (MW)`);
		expect(daily.rows[0]).toMatchObject({ '0:average': 100, '0:0': 100, '0:1': null });
	});
});

describe('time-of-day URLs', () => {
	it('round-trips analysis without changing the timeline selection', () => {
		const params = new URLSearchParams(
			'region=wem&profile-display=breakdown&profile-style=lines&profile-today=1&profile-interval=5m&profile-days=28&profile-end=2026-08-31&range=30d&hidden=coal'
		);
		const state = parseTrackerUrl(params, { nowMs });
		expect(state).toMatchObject({
			profileDisplay: 'breakdown',
			profileStyle: 'lines',
			profileInterval: '5m',
			profileToday: true,
			profileDays: 28,
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
			profileDisplay: 'stacked',
			profileStyle: 'bands',
			profileInterval: '30m',
			profileToday: false,
			profileDays: 7,
			profileEnd: ''
		});
		const url = applyTrackerUrl(
			new URL('https://example.test/tracker?view=broken&profile-days=999&profile-metric=price'),
			state
		);
		expect(url.search).toBe('?region=au');
	});
});

describe('breakdown hover parts', () => {
	it('focuses a percentile band on its two bounds and the median on its own', () => {
		expect(profileFocusColumns('bands', 'midLow')).toEqual(['p25', 'p50']);
		expect(profileFocusColumns('bands', 'p50')).toEqual(['p50']);
		expect(profileFocusColumns('bands', null)).toEqual([]);
	});

	it("mirrors a load's bands, which the table reads as magnitudes", () => {
		expect(profileChartPart('bands', 'low', true)).toBe('high');
		expect(profileChartPart('bands', 'midHigh', true)).toBe('midLow');
		expect(profileChartPart('bands', 'p50', true)).toBe('p50');
		expect(profileChartPart('bands', 'low', false)).toBe('low');
	});

	it('ignores band keys without a table column', () => {
		expect(profileChartPart('bands', 'base', false)).toBeNull();
		expect(profileChartPart('bands', 'today', false)).toBeNull();
	});

	it('passes days and the average through on the other styles', () => {
		expect(profileChartPart('lines', '2026-09-01', true)).toBe('2026-09-01');
		expect(profileFocusColumns('lines', '2026-09-01')).toEqual(['2026-09-01']);
		expect(profileFocusColumns('ridgeline', 'average')).toEqual(['average']);
	});
});
