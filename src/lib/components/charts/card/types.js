/**
 * Shared types for chart cards (`ChartCard`): downloads, export datasets and
 * compare mode. JSDoc-only module — import these via
 * `@typedef {import('$lib/components/charts/card/types.js').X} X`.
 */

/**
 * One export column. `time` columns hold epoch ms and are formatted per
 * output (network-local text in CSV, a date-time cell in XLSX).
 * @typedef {Object} ExportColumn
 * @property {string} key - Row property
 * @property {string} header - Column header, unit included
 * @property {'time' | 'number' | 'string' | 'boolean'} type
 */

/**
 * A tabular dataset ready for either serialiser (`export-dataset.js`). Every
 * card download goes through this shape — a chart's data as drawn, a table,
 * an open comparison.
 * @typedef {Object} ExportDataset
 * @property {string} key
 * @property {string} title
 * @property {ExportColumn[]} columns
 * @property {Array<Record<string, any>>} rows
 */

/**
 * Where a registered download stands: still loading, ready to download,
 * drawn without data, or failed.
 * @typedef {'loading' | 'ready' | 'empty' | 'error'} DownloadState
 */

/**
 * One row of the "Download data" dialog: a chart or panel on screen
 * (`chart-downloads.svelte.js`). The dataset is built when clicked.
 * @typedef {Object} DownloadSource
 * @property {string} id - Stable per chart; matches its PNG id where it has one
 * @property {string} label - The dialog row and the workbook sheet name
 * @property {DownloadState} state
 * @property {string} [message] - Why it can't download, when not obvious
 * @property {() => ExportDataset | null} dataset
 * @property {(extension: 'csv') => string} [fileName] - Overrides the page's name
 */

/**
 * What a chart card draws, as the chart reports it (its visible rows at the
 * display grain, and its series): the source of the card's download and
 * comparison. The tracker's `GenerationSnapshot` is one.
 * @typedef {Object} ChartSnapshot
 * @property {Array<Record<string, any>>} data - Rows with `time` (epoch ms) and a value per series
 * @property {string[]} seriesNames - Bottom of the stack first
 * @property {Record<string, string>} seriesLabels
 * @property {Record<string, string>} seriesColours
 * @property {number} [start] - The window shown, epoch ms
 * @property {number} [end]
 */

/**
 * How a comparison reads the change from A to B (`compareValues`):
 * relative change, percentage points (for shares) or places moved (ranks).
 * @typedef {'relative' | 'points' | 'rank'} CompareDeltaMode
 */

/**
 * One series a comparison lists: a technology, a unit, a region or the
 * card's one line. `isLoad` files it under Loads; `dashed` marks a reference
 * line (the NEM among ranked states).
 * @typedef {Object} CompareSeries
 * @property {string} id
 * @property {string} label
 * @property {string} colour
 * @property {boolean} [isLoad]
 * @property {boolean} [dashed]
 */

/**
 * What a chart card hands its compare panel: the buckets A and B can take,
 * the series it draws and how to read and format their values. Values are in
 * the export's base units; `format` renders them as the chart does.
 * - `composition`: additive series (a stack) — a net total and a change list.
 * - `single`: one line — A and B value tiles over the window's range.
 * - `lines`: independent lines (one per region, or a direction) — a slope
 *   chart and a change list.
 * @typedef {Object} CompareSource
 * @property {'composition' | 'single' | 'lines'} kind
 * @property {string} title - The comparison's name, e.g. "Generation comparison"
 * @property {string} rowHeader - What a row is: Technology, Unit, Region, Metric
 * @property {number[]} times - Selectable buckets, ascending
 * @property {CompareSeries[]} series - In display order (top of the stack first)
 * @property {(time: number, id: string) => number | null} value
 * @property {CompareDeltaMode} deltaMode
 * @property {string} unit - The display unit, e.g. "GW", "$/MWh", "%"
 * @property {string} baseUnit - The export's unit, e.g. "MW"
 * @property {(value: number | null) => string} format - A value as displayed, without its unit
 * @property {(value: number | null) => string} formatDelta - A signed change, without its unit
 * @property {(time: number) => string} formatTime - A bucket as the chart's tooltip names it
 * @property {(time: number) => string} [formatExportTime] - The same, always with its
 *   year, for the download (`formatTime` when absent)
 * @property {(value: number | null) => string} [colourOf] - The colour a value takes (heatmap chips)
 * @property {{min: number, max: number, reference: number | null, referenceLabel: string} | null} [window]
 *   - A single line's visible range and reference (mean or window ratio)
 * @property {(time: number) => boolean} [has] - Whether a bucket has values: one in
 *   `times`, or one the chart drew before, held while it pans (without it, `times`
 *   answers)
 * @property {string} [note] - What the values are, under the comparison
 * @property {Array<{key: string, header: string, value: string}>} [context] - Leading export columns
 */

export {};
