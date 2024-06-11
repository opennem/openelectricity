/**
 * Returns an array of objects with value and label properties for selection use
 * @param {string[]} items
 * @returns
 */
const mapOptions = (items) =>
	items.map((item) => {
		return {
			value: item,
			label: item.split('_').join(' ')
		};
	});

export default mapOptions;
