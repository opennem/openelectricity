/**
 * Chart Tooltips Store
 *
 * Manages tooltip display configuration.
 */

export default class ChartTooltips {
	/** @type {boolean} */
	showTotal = $state(true);

	/** Whether the tooltip renders its date/time header. Default on. */
	/** @type {boolean} */
	showDate = $state(true);

	/** @type {string | undefined} */
	valueKey = $state();

	/** @type {string | undefined} */
	valueColour = $state();

	/**
	 * @param {Object} [config]
	 * @param {boolean} [config.showTotal]
	 * @param {boolean} [config.showDate]
	 * @param {string} [config.valueKey]
	 * @param {string} [config.valueColour]
	 */
	constructor(config = {}) {
		if (config.showTotal !== undefined) this.showTotal = config.showTotal;
		if (config.showDate !== undefined) this.showDate = config.showDate;
		if (config.valueKey) this.valueKey = config.valueKey;
		if (config.valueColour) this.valueColour = config.valueColour;
	}
}
