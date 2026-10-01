import { describe, expect, it } from 'vitest';
import {
	PROFILE_DAY_START,
	PROFILE_DAY_END,
	profileClock,
	profileTicks,
	profileRows,
	dailyProfileRows,
	stackedProfileRows,
	averageProfileRows,
	clampProfileViewport
} from './profile-chart.js';
import { buildDailyProfile, buildAverageDayStack, profileWindow } from './time-of-day.js';

describe('Stratum profile adapter', () => {
	const window = profileWindow(Date.parse('2026-09-07T00:00Z'), '+10:00', 7);
	it('maps half-hours to a synthetic day without changing values or missing readings', () => {
		const profile = buildDailyProfile([{ time: window.start, wind: 0 }], 'wind', window);
		const rows = profileRows(profile, 'wind');
		expect(rows[0]).toMatchObject({ time: PROFILE_DAY_START, wind: 0 });
		expect(rows[47].time).toBe(PROFILE_DAY_END - 1_800_000);
		expect(rows[1].wind).toBeNull();
		const daily = dailyProfileRows(profile, window.dates);
		expect(daily[0]).toMatchObject({ average: 0, [window.dates[0]]: 0, [window.dates[1]]: null });
	});
	it('passes signed values to Stratum, not cumulative stack bounds, and preserves whole-stack gaps', () => {
		const stack = buildAverageDayStack(
			[
				{ time: window.start, wind: 100, load: -10 },
				{ time: window.start + 1_800_000, wind: 200 }
			],
			['wind', 'load'],
			window
		);
		const rows = stackedProfileRows(stack);
		expect(rows[0]).toMatchObject({ wind: 100, load: -10 });
		expect(rows[1]).toMatchObject({ wind: null, load: null });
		expect(stackedProfileRows([])).toEqual([]);
		// The table reads each technology's own averages through the stack gap.
		expect(averageProfileRows(stack)[1]).toMatchObject({ wind: 200, load: null });
		expect(averageProfileRows([])).toEqual([]);
	});
	it('formats clock time only, including the 24:00 boundary', () => {
		expect(profileClock(PROFILE_DAY_START)).toBe('00:00');
		expect(profileClock(new Date(PROFILE_DAY_START + 1_800_000))).toBe('00:30');
		expect(profileClock(PROFILE_DAY_END)).toBe('24:00');
	});
	it('anchors axis ticks to midnight, independently of browser DST', () => {
		expect(profileTicks(PROFILE_DAY_START, PROFILE_DAY_END).map(profileClock)).toEqual([
			'00:00',
			'04:00',
			'08:00',
			'12:00',
			'16:00',
			'20:00',
			'24:00'
		]);
		expect(
			profileTicks(PROFILE_DAY_START, PROFILE_DAY_START + 3_600_000).map(profileClock)
		).toEqual(['00:00', '00:30', '01:00']);
	});
	it('clamps pan and zoom to one hour–one day within the synthetic day', () => {
		expect(clampProfileViewport(PROFILE_DAY_START - 1000, PROFILE_DAY_END + 1000)).toEqual({
			start: PROFILE_DAY_START,
			end: PROFILE_DAY_END
		});
		expect(clampProfileViewport(PROFILE_DAY_END, PROFILE_DAY_END + 1)).toEqual({
			start: PROFILE_DAY_END - 3_600_000,
			end: PROFILE_DAY_END
		});
	});
});
