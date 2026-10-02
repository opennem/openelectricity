import { formatPrice, formatWithUnit } from '$lib/utils/formatters';

/** A dollar unit's per-quantity tail: `$/MWh` → `/MWh`. */
const DOLLAR = /^[kMGT]?\$(\/.+)?$/;

/**
 * The Profile view's 24-hour dials put noon at the top and midnight at the
 * bottom, running clockwise, so day fills the upper half like the sun's path
 * (sunrise towards the left, sunset towards the right).
 */

/** A time of day (in hours) as a d3-shape angle: radians clockwise from the top.
 * @param {number} hours */
export const dialAngle = (hours) => (hours / 24 + 0.5) * 2 * Math.PI;

const NUMBER = new Intl.NumberFormat('en-AU', { maximumFractionDigits: 1 });

/** The unit shown after a dial value: a dollar unit's per-quantity tail
 * ("/MWh"; none for plain `$`), since its `$` leads the value; others as is.
 * @param {string} unit */
export function dialUnit(unit) {
	const dollar = DOLLAR.exec(unit);
	return dollar ? (dollar[1] ?? '') : unit;
}

/**
 * A dial readout's value and the unit to show after it, formatted as across
 * the app (`formatWithUnit`): dollars lead with `$` — prices with cents
 * always shown (`formatPrice`) — keeping any per-quantity tail as the unit
 * ("$85.30" + "/MWh"); other units trail ("12.3" + "MW").
 * @param {number} value
 * @param {string} unit
 */
export function dialValue(value, unit) {
	if (!DOLLAR.test(unit)) return { value: NUMBER.format(value), unit };
	const number = unit === '$/MWh' ? formatPrice(value) : NUMBER.format(value);
	return { value: formatWithUnit(number, unit), unit: dialUnit(unit) };
}

/** The mean of the hours that have a value — the dial's "Av." while nothing
 * is hovered — or null when none has one.
 * @param {ReadonlyArray<{average: number | null}>} hours */
export function meanOfHours(hours) {
	const values = hours.map(({ average }) => average).filter((value) => value !== null);
	return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}
