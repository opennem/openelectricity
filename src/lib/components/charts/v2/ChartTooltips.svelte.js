/**
 * Chart Tooltips Store
 *
 * Manages tooltip display configuration.
 */

export default class ChartTooltips {
	/** @type {boolean} */
	showTotal = $state(true);

	/** @type {string | undefined} */
	valueKey = $state();

	/** @type {string | undefined} */
	valueColour = $state();

	/**
	 * @param {Object} [config]
	 * @param {boolean} [config.showTotal]
	 * @param {string} [config.valueKey]
	 * @param {string} [config.valueColour]
	 */
	constructor(config = {}) {
		if (config.showTotal !== undefined) this.showTotal = config.showTotal;
		if (config.valueKey) this.valueKey = config.valueKey;
		if (config.valueColour) this.valueColour = config.valueColour;
	}
}
