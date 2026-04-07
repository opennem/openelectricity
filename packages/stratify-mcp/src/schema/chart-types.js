/** @type {Array<{ value: string, label: string, description: string }>} */
export const CHART_TYPES = [
	{ value: 'line', label: 'Line Chart', description: 'Multi-series line chart. Works with time-series, category, and linear data.' },
	{ value: 'area', label: 'Area Chart', description: 'Stacked area chart. Best for time-series or linear data showing composition over time.' },
	{ value: 'column', label: 'Column Chart', description: 'Stacked vertical bar chart.' },
	{ value: 'column-stacked', label: 'Stacked Columns', description: 'Explicitly stacked vertical bars.' },
	{ value: 'column-grouped', label: 'Grouped Columns', description: 'Side-by-side vertical bars for comparison.' },
	{ value: 'bar', label: 'Bar Chart', description: 'Horizontal stacked bar chart. Best for category data.' },
	{ value: 'bar-stacked', label: 'Stacked Bars', description: 'Horizontal stacked bars.' },
	{ value: 'bar-grouped', label: 'Grouped Bars', description: 'Horizontal side-by-side bars.' }
];

export const CHART_TYPE_VALUES = CHART_TYPES.map((t) => t.value);

export const DISPLAY_MODES = [
	{ value: 'auto', description: 'Auto-detect from first column: dates → time-series, numbers → linear, text → category' },
	{ value: 'time-series', description: 'First column is dates/timestamps' },
	{ value: 'category', description: 'First column is ordinal text categories' },
	{ value: 'linear', description: 'First column is continuous numeric values' }
];

export const DATA_TRANSFORMS = [
	{ value: 'none', description: 'No transform — use raw values' },
	{ value: 'cumulative', description: 'Running sum per series' }
];

export const CATEGORY_SORTS = [
	{ value: 'default', description: 'Data order (as in CSV)' },
	{ value: 'x-asc', description: 'Category A to Z' },
	{ value: 'x-desc', description: 'Category Z to A' },
	{ value: 'value-asc', description: 'Value low to high' },
	{ value: 'value-desc', description: 'Value high to low' }
];
