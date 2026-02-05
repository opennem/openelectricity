import { format as d3Format } from 'd3-format';

export default class PerfTime {
	/** @param {string} label */
	constructor(label) {
		/** @type {number | null} */
		this.t0 = null;
		this.label = label;
		this.formatString = d3Format(',.0f');
	}

	time() {
		if (typeof performance !== 'undefined') {
			this.t0 = performance.now();
		}
	}

	/** @param {string} label */
	timeEnd(label) {
		const formatted =
			typeof performance !== 'undefined' && this.t0 !== null
				? this.formatString(performance.now() - this.t0)
				: 0;
		console.info(`${label}: ${formatted}ms`);
		this.t0 = null;
	}
}
