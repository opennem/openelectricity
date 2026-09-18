/** Shared order for the table and its visibility controls. Technology stays visible. */
export const TABLE_COLUMNS = [
	{ key: 'energy', label: 'Energy' },
	{ key: 'power', label: 'Av power' },
	{ key: 'contribution', label: 'Contribution' },
	{ key: 'price', label: 'Av price' },
	{ key: 'emissions', label: 'Emissions' },
	{ key: 'intensity', label: 'Intensity' }
];
export const DEFAULT_TABLE_COLUMNS = TABLE_COLUMNS.map((column) => column.key);

/** Empty means technology only; absent means all value columns.
 * @param {unknown} value */
export function normaliseTableColumns(value) {
	return Array.isArray(value)
		? DEFAULT_TABLE_COLUMNS.filter((key) => value.includes(key))
		: [...DEFAULT_TABLE_COLUMNS];
}
