/**
 * Default colour palette for Stratify charts.
 * Uses Tableau 10 — a well-established palette designed for
 * distinguishability in data visualisation.
 */

const TABLEAU_10 = [
	'#4e79a7',
	'#f28e2b',
	'#e15759',
	'#76b7b2',
	'#59a14f',
	'#edc948',
	'#b07aa1',
	'#ff9da7',
	'#9c755f',
	'#bab0ac'
];

/**
 * Assign colours to series names from the default palette.
 * Cycles through the palette if there are more series than colours.
 * @param {string[]} seriesNames
 * @returns {Record<string, string>}
 */
export function assignColours(seriesNames) {
	return Object.fromEntries(
		seriesNames.map((name, i) => [name, TABLEAU_10[i % TABLEAU_10.length]])
	);
}

/**
 * Get a colour from the palette by index.
 * @param {number} index
 * @returns {string}
 */
export function getColour(index) {
	return TABLEAU_10[index % TABLEAU_10.length];
}

export { TABLEAU_10 };
