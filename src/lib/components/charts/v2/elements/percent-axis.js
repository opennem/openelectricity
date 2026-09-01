import { scaleLinear } from 'd3-scale';

const STANDARD_STEP = 20;
const MAX_STANDARD_TICKS = 8;
const ADAPTIVE_TICK_COUNT = 6;

/**
 * Keep the familiar 20% lattice for ordinary renewable-share ranges, but
 * avoid flooding the chart when an upstream outlier stretches the domain.
 * The upper-bound label is omitted because it crowds the chart edge.
 *
 * @param {number} domainMax
 * @returns {number[]}
 */
export function percentAxisTicks(domainMax) {
	if (!Number.isFinite(domainMax) || domainMax <= 0) return [0];
	const standardCount = Math.max(1, Math.floor(domainMax / STANDARD_STEP));
	if (standardCount <= MAX_STANDARD_TICKS) {
		return Array.from({ length: standardCount }, (_, i) => i * STANDARD_STEP);
	}

	const adaptive = scaleLinear()
		.domain([0, domainMax])
		.ticks(ADAPTIVE_TICK_COUNT)
		.filter((tick) => tick < domainMax);
	if (adaptive.length <= ADAPTIVE_TICK_COUNT) return adaptive;
	const stride = Math.ceil(adaptive.length / ADAPTIVE_TICK_COUNT);
	return adaptive.filter((_, index) => index % stride === 0).slice(0, ADAPTIVE_TICK_COUNT);
}
