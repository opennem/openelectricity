/**
 * price-y-scale.js — hybrid linear/log y-scale for the facility price chart.
 *
 * NEM spot prices sit mostly in $0–$300 but spike to the market cap (~$23,200)
 * and go negative (~−$1,000). A plain linear axis flattens the whole chart on a
 * single spike and hides negatives. This scale keeps $0–$300 linear (the readable
 * everyday band) and log-compresses the tails: log above $300, log below $0. The
 * structure is fixed (domain [-1000, 23200]) so the axis is identical across
 * facilities and time ranges, keeping prices comparable.
 *
 * It implements the minimal d3-scale surface LayerCake needs: a callable
 * `scale(value) -> pixel` with `.domain()`/`.range()` (get + set), `.invert()`,
 * `.ticks()` and `.copy()`. It deliberately has no `.bandwidth`, so AxisY and the
 * stacked-area/line elements treat it as a continuous numeric scale.
 */

/** Fixed value breakpoints. */
const NEG_MIN = -1000;
const LIN_MAX = 300;
const POS_MAX = 23200;

/** Fraction of the plot height given to each region (bottom → top); sums to 1. */
const F_NEG = 0.16; // [-1000, 0]    log
const F_LIN = 0.54; // [0, 300]      linear
const F_POS = 0.3; //  [300, 23200]  log

/** Fixed domain + the always-on gridlines (shared with the price chart store). */
export const PRICE_Y_DOMAIN = /** @type {[number, number]} */ ([NEG_MIN, POS_MAX]);
export const PRICE_Y_TICKS = [-1000, -100, 0, 100, 200, 300, 1000, 3000, 10000, 15000, 20000];

/** The linear band [$0, $300]. The price line is drawn solid within it and dotted
 *  in the log tails (above $300 / below $0). */
export const PRICE_LINEAR_RANGE = /** @type {[number, number]} */ ([0, LIN_MAX]);

const LN_POS_SPAN = Math.log(POS_MAX) - Math.log(LIN_MAX);
const LN_NEG_SPAN = Math.log(1 - NEG_MIN); // ln(1 + 1000)

/** @param {number} t */
const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);

/**
 * Forward transform: value → fraction in [0,1] (0 = NEG_MIN at the bottom, 1 =
 * POS_MAX at the top). Monotonically increasing and continuous across the domain.
 * @param {number} v
 */
function valueToFraction(v) {
	if (v >= LIN_MAX) {
		const t = (Math.log(v) - Math.log(LIN_MAX)) / LN_POS_SPAN;
		return F_NEG + F_LIN + clamp01(t) * F_POS;
	}
	if (v >= 0) {
		return F_NEG + (v / LIN_MAX) * F_LIN;
	}
	const t = Math.log(1 - v) / LN_NEG_SPAN; // ln(1 + |v|) / ln(1001)
	return F_NEG - clamp01(t) * F_NEG;
}

/**
 * Inverse of {@link valueToFraction}: fraction in [0,1] → value.
 * @param {number} p
 */
function fractionToValue(p) {
	if (p >= F_NEG + F_LIN) {
		const t = (p - F_NEG - F_LIN) / F_POS;
		return LIN_MAX * Math.exp(t * LN_POS_SPAN);
	}
	if (p >= F_NEG) {
		return ((p - F_NEG) / F_LIN) * LIN_MAX;
	}
	const t = (F_NEG - p) / F_NEG;
	return -(Math.exp(t * LN_NEG_SPAN) - 1); // -( 1001^t − 1 )
}

/**
 * Build a hybrid price y-scale — a d3-style scale object LayerCake can drive.
 * @returns {((value: number) => number) & Record<string, any>}
 */
export function createPriceYScale() {
	let domain = /** @type {[number, number]} */ ([...PRICE_Y_DOMAIN]);
	let range = /** @type {[number, number]} */ ([0, 1]);

	const scale = /** @type {any} */ (
		/** @param {number} value */ (value) => {
			const [r0, r1] = range;
			return r0 + valueToFraction(value) * (r1 - r0);
		}
	);

	/** @param {[number, number]} [d] */
	scale.domain = (d) => {
		if (!d) return domain;
		domain = [d[0], d[1]];
		return scale;
	};

	/** @param {[number, number]} [r] */
	scale.range = (r) => {
		if (!r) return range;
		range = [r[0], r[1]];
		return scale;
	};

	/** @param {number} px */
	scale.invert = (px) => {
		const [r0, r1] = range;
		if (r1 === r0) return domain[0];
		return fractionToValue((px - r0) / (r1 - r0));
	};

	scale.ticks = () => PRICE_Y_TICKS;

	scale.copy = () => {
		const next = createPriceYScale();
		next.domain(domain);
		next.range(range);
		return next;
	};

	return scale;
}

/**
 * Y-axis label formatter. Only the linear $0–$300 band is labelled ($0 / $100 /
 * $200 / $300); the log tails above $300 and below $0 render their gridlines
 * without labels to keep the compact axis uncluttered. The hover tooltip keeps
 * the exact $/MWh value (formatted elsewhere).
 * @param {number} d
 */
export function formatPriceTick(d) {
	if (d < 0 || d > LIN_MAX) return '';
	return `$${d}`;
}
