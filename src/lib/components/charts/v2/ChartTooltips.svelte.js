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

	/** Render multi-series rows in the opposite order to the chart's series list. */
	/** @type {boolean} */
	reverseSeriesOrder = $state(false);

	/** @type {string | undefined} */
	valueKey = $state();

	/** @type {string | undefined} */
	valueColour = $state();

	/**
	 * @param {Object} [config]
	 * @param {boolean} [config.showTotal]
	 * @param {boolean} [config.showDate]
	 * @param {boolean} [config.reverseSeriesOrder]
	 * @param {string} [config.valueKey]
	 * @param {string} [config.valueColour]
	 */
	constructor(config = {}) {
		if (config.showTotal !== undefined) this.showTotal = config.showTotal;
		if (config.showDate !== undefined) this.showDate = config.showDate;
		if (config.reverseSeriesOrder !== undefined)
			this.reverseSeriesOrder = config.reverseSeriesOrder;
		if (config.valueKey) this.valueKey = config.valueKey;
		if (config.valueColour) this.valueColour = config.valueColour;
	}
}
