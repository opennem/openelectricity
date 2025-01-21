export default class DataViz {
	/** @type {string} */
	title = $state('');

	/** @type {string[]} */
	allowedPrefixes = $state([]);

	/** @type {boolean} */
	allowPrefixSwitch = $derived(this.allowedPrefixes && this.allowedPrefixes.length > 1);

	/** @type {string} */
	baseUnit = $state('');

	constructor() {}
}
