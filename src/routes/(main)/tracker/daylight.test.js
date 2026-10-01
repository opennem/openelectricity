import { describe, expect, it } from 'vitest';
import { averageDaylight, daylightNote, formatDaylightClock, sunTimes } from './daylight.js';

const AEST = 10 * 3_600_000;

describe('sunTimes', () => {
	it('matches published Sydney sunrise and sunset at the solstices', () => {
		// Sydney, 21 Jun 2026: about 07:00 and 16:54 AEST.
		const winter = /** @type {{sunrise: number, sunset: number}} */ (
			sunTimes('2026-06-21', { lat: -33.87, lon: 151.21 })
		);
		expect(winter.sunrise + 10).toBeCloseTo(7.0, 1);
		expect(winter.sunset + 10).toBeCloseTo(16.9, 1);
		// 21 Dec 2026: about 05:41 and 20:05 AEDT, so 04:41 and 19:05 AEST.
		const summer = /** @type {{sunrise: number, sunset: number}} */ (
			sunTimes('2026-12-21', { lat: -33.87, lon: 151.21 })
		);
		expect(summer.sunrise + 10).toBeCloseTo(4.68, 1);
		expect(summer.sunset + 10).toBeCloseTo(19.1, 1);
	});

	it('reports no times when the sun neither rises nor sets', () => {
		expect(sunTimes('2026-06-21', { lat: 80, lon: 0 })).toBeNull();
	});
});

describe('averageDaylight', () => {
	it("reads a region's capital on the network clock, averaged over the days", () => {
		const day = averageDaylight('nsw1', ['2026-06-21'], AEST);
		const days = averageDaylight('nsw1', ['2026-06-20', '2026-06-21', '2026-06-22'], AEST);
		expect(day?.place).toBe('Sydney');
		expect(days?.sunrise).toBeCloseTo(day?.sunrise ?? 0, 1);
	});

	it("keeps South Australia's day later on market time, which never shifts", () => {
		const sydney = averageDaylight('nsw1', ['2026-06-21'], AEST);
		const adelaide = averageDaylight('sa1', ['2026-06-21'], AEST);
		// Adelaide's solar noon is about 50 minutes after Sydney's on AEST.
		const noon = (/** @type {any} */ d) => (d.sunrise + d.sunset) / 2;
		expect(noon(adelaide) - noon(sydney)).toBeCloseTo(0.83, 1);
	});

	it('averages the capitals for combined scopes and ignores unknown regions', () => {
		expect(averageDaylight('_all', ['2026-06-21'], AEST)?.place).toBe('the NEM capitals');
		expect(averageDaylight('au', ['2026-06-21'], AEST)?.place).toBe('the state capitals');
		expect(averageDaylight('nowhere', ['2026-06-21'], AEST)).toBeNull();
		expect(averageDaylight('nsw1', [], AEST)).toBeNull();
	});
});

describe('formatDaylightClock', () => {
	it('formats fractional hours as a 24-hour clock', () => {
		expect(formatDaylightClock(6.5)).toBe('06:30');
		expect(formatDaylightClock(17.999)).toBe('18:00');
		expect(formatDaylightClock(23.999)).toBe('00:00');
	});
});

describe('daylightNote', () => {
	it('names the capitals behind the night shading and the market clock', () => {
		const nem = /** @type {import('./types.js').Daylight} */ (
			averageDaylight('_all', ['2026-06-21'], AEST)
		);
		expect(daylightNote(nem, AEST)).toBe(
			'Night shading: average sunset to sunrise over the window, a plain average of Sydney, Brisbane, Melbourne, Adelaide and Hobart, in market time (AEST all year).'
		);
		const perth = /** @type {import('./types.js').Daylight} */ (
			averageDaylight('wem', ['2026-06-21'], 8 * 3_600_000)
		);
		expect(daylightNote(perth, 8 * 3_600_000)).toBe(
			'Night shading: average sunset to sunrise over the window, at Perth, in market time (AWST all year).'
		);
	});
});
