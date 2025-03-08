export default class ChartTooltipsState {
	/** @type {boolean} */
	showTotal = $state(true);

	/** @type {string | undefined} */
	valueKey = $state();

	/** replace seriesColours
	 * @type {string | undefined} */
	valueColour = $state();
}
