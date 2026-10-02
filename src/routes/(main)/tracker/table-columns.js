/** Shared order for the table and its visibility controls. Technology stays visible. */
export const TABLE_COLUMNS = [
	{ key: 'energy', label: 'Energy' },
	{ key: 'power', label: 'Av power' },
	{ key: 'contribution', label: 'Contribution' },
	{ key: 'price', label: 'Av price' },
	{ key: 'emissions', label: 'Emissions' },
	{ key: 'intensity', label: 'Intensity' }
];
export const ALL_TABLE_COLUMNS = TABLE_COLUMNS.map((column) => column.key);
/** The percentile range the Profile's percentile bands show as `powerColumns`
 * in place of the window columns. Not a viewer choice, so it stays out of
 * `ALL_TABLE_COLUMNS`. */
export const PERCENTILE_TABLE_COLUMNS = [
	{ key: 'p10', label: '10%' },
	{ key: 'p25', label: '25%' },
	{ key: 'p50', label: 'Median' },
	{ key: 'p75', label: '75%' },
	{ key: 'p90', label: '90%' }
];
/** Shown until the viewer chooses otherwise; price, emissions and intensity are opt-in. */
export const DEFAULT_TABLE_COLUMNS = ['energy', 'power', 'contribution'];

/** Empty means technology only; absent means the default columns.
 * @param {unknown} value */
export function normaliseTableColumns(value) {
	return Array.isArray(value)
		? ALL_TABLE_COLUMNS.filter((key) => value.includes(key))
		: [...DEFAULT_TABLE_COLUMNS];
}

/**
 * The table column a Timeline chart card plots, which hovering the card
 * outlines (as a Profile breakdown card highlights its row), or null where the
 * table has none (market value).
 * @param {'generation' | 'market' | 'emissions'} card
 * @param {{ energy: boolean, proportion: boolean, marketValue: boolean, intensity: boolean }} modes
 * @returns {string | null}
 */
export function chartTableColumn(card, { energy, proportion, marketValue, intensity }) {
	if (card === 'generation') return proportion ? 'contribution' : energy ? 'energy' : 'power';
	if (card === 'market') return marketValue ? null : 'price';
	return intensity ? 'intensity' : 'emissions';
}
