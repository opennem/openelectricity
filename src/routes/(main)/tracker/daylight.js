/**
 * Daylight for the Profile view's 24-hour dials: average sunrise and sunset
 * over the window's days at a region's reference place, as hours on the
 * network's clock (AEST or AWST all year — market time never shifts for
 * daylight saving, so South Australia's day sits visibly later than noon).
 * Low-precision NOAA solar equations: well within a minute for Australian
 * latitudes, which is far finer than a dial can show.
 */

const RAD = Math.PI / 180;
const DAY = 86_400_000;

/** Each region's reference place: its capital. */
const CAPITALS = {
	nsw1: { name: 'Sydney', lat: -33.87, lon: 151.21 },
	qld1: { name: 'Brisbane', lat: -27.47, lon: 153.03 },
	vic1: { name: 'Melbourne', lat: -37.81, lon: 144.96 },
	sa1: { name: 'Adelaide', lat: -34.93, lon: 138.6 },
	tas1: { name: 'Hobart', lat: -42.88, lon: 147.33 },
	wem: { name: 'Perth', lat: -31.95, lon: 115.86 }
};

/** Combined scopes average their regions' capitals rather than picking one. */
const SCOPES = {
	_all: { name: 'the NEM capitals', regions: ['nsw1', 'qld1', 'vic1', 'sa1', 'tas1'] },
	au: { name: 'the state capitals', regions: ['nsw1', 'qld1', 'vic1', 'sa1', 'tas1', 'wem'] }
};

/**
 * Sunrise and sunset on a UTC date at a place, in UTC hours (either may fall
 * outside 0–24), or null when the sun neither rises nor sets.
 * @param {string} date - YYYY-MM-DD
 * @param {{lat: number, lon: number}} place
 */
export function sunTimes(date, { lat, lon }) {
	const start = Date.parse(`${date}T00:00:00Z`);
	const dayOfYear = Math.round((start - Date.UTC(new Date(start).getUTCFullYear(), 0, 1)) / DAY);
	// Fractional year at midday, in radians.
	const g = ((2 * Math.PI) / 365) * (dayOfYear + 0.5);
	const equation =
		229.18 *
		(0.000075 +
			0.001868 * Math.cos(g) -
			0.032077 * Math.sin(g) -
			0.014615 * Math.cos(2 * g) -
			0.040849 * Math.sin(2 * g));
	const declination =
		0.006918 -
		0.399912 * Math.cos(g) +
		0.070257 * Math.sin(g) -
		0.006758 * Math.cos(2 * g) +
		0.000907 * Math.sin(2 * g) -
		0.002697 * Math.cos(3 * g) +
		0.00148 * Math.sin(3 * g);
	// The sun's centre 0.833° below the horizon: refraction plus its radius.
	const cosHour =
		Math.cos(90.833 * RAD) / (Math.cos(lat * RAD) * Math.cos(declination)) -
		Math.tan(lat * RAD) * Math.tan(declination);
	if (Math.abs(cosHour) > 1) return null;
	const hourAngle = Math.acos(cosHour) / RAD;
	return {
		sunrise: (720 - 4 * (lon + hourAngle) - equation) / 60,
		sunset: (720 - 4 * (lon - hourAngle) - equation) / 60
	};
}

/**
 * A region's average sunrise and sunset over `dates`, as hours on the
 * network clock (`offsetMs` east of UTC), with the place they describe; null
 * for an unknown region or no dates.
 * @param {string} region
 * @param {string[]} dates - YYYY-MM-DD
 * @param {number} offsetMs
 * @returns {import('./types.js').Daylight | null}
 */
export function averageDaylight(region, dates, offsetMs) {
	const scope = SCOPES[/** @type {keyof typeof SCOPES} */ (region)];
	const capital = CAPITALS[/** @type {keyof typeof CAPITALS} */ (region)];
	const places = scope
		? scope.regions.map((key) => CAPITALS[/** @type {keyof typeof CAPITALS} */ (key)])
		: capital
			? [capital]
			: [];
	const times = places.flatMap((place) =>
		dates.map((date) => sunTimes(date, place)).filter((time) => time !== null)
	);
	if (!times.length) return null;
	const offset = offsetMs / 3_600_000;
	/** @param {'sunrise' | 'sunset'} key */
	const mean = (key) =>
		(((times.reduce((sum, time) => sum + time[key], 0) / times.length + offset) % 24) + 24) % 24;
	return {
		sunrise: mean('sunrise'),
		sunset: mean('sunset'),
		place: scope?.name ?? capital.name,
		capitals: places.map((place) => place.name)
	};
}

/**
 * The table footnote for the dials' night shading: where and on what clock
 * its sunset and sunrise were taken.
 * @param {import('./types.js').Daylight} daylight
 * @param {number} offsetMs - The network clock, east of UTC
 */
export function daylightNote({ capitals }, offsetMs) {
	const clock = offsetMs === 8 * 3_600_000 ? 'AWST' : 'AEST';
	const where =
		capitals.length > 1
			? `a plain average of ${capitals.slice(0, -1).join(', ')} and ${capitals.at(-1)}`
			: `at ${capitals[0]}`;
	return `Night shading: average sunset to sunrise over the window, ${where}, in market time (${clock} all year).`;
}

/** @param {number} hours */
export function formatDaylightClock(hours) {
	const minutes = Math.round(hours * 60) % (24 * 60);
	return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}
