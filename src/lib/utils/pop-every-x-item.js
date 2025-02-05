/**
 * @param {*[]} array
 * @param {number} x
 */
export default function (array, x = 3) {
	if (!array || array.length === 0) return [];

	// Add the first element
	const result = [array[0]];

	// Loop through the array, skipping the first and last elements
	for (let i = 1; i < array.length - 1; i++) {
		if (i % x === 0) {
			result.push(array[i]);
		}
	}

	// Add the last element back
	result.push(array[array.length - 1]);

	return result;
}
