# Chart cards

The card every chart sits in on the Tracker (`/tracker/*`) and facility pages
(`/facility/[code]`): one header over the chart, with its downloads, a table
view and compare mode. Pages bring their charts and data; this folder brings
the card, the "Download data" dialog and the comparison.

| File                        | What it is                                                                                                                                                                                                                                                                                                                                                                                           |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ChartCard.svelte`          | The card: title (with an optional ⓘ `info` tooltip), badge, the chart's hosted toolbar (a sliders button for the chart options, title and unit, ✥ pan/zoom, − / +), Compare / Table / CSV / Enlarge buttons, a controls row, a legend in a footer under the chart, a drag-to-resize height, and the compare panel. In a touch-controls subtree (the Tracker), phones fold the actions into a ⋮ menu. |
| `ChartDataTable.svelte`     | The table view: the card's download dataset over the chart, windowed, with the header row and first column pinned.                                                                                                                                                                                                                                                                                   |
| `LoadingOverlay.svelte`     | The fading loading veil over a card's body.                                                                                                                                                                                                                                                                                                                                                          |
| `chart-downloads.svelte.js` | The page's download registry and its downloads: cards register while mounted (`ChartCard`'s `download`, or the `chartDownload` attachment); a source's CSV and the "All charts" workbook.                                                                                                                                                                                                            |
| `chart-downloads.js`        | Pure helpers: screen order, a row's status line, workbook availability.                                                                                                                                                                                                                                                                                                                              |
| `DownloadDataModal.svelte`  | The "Download data" dialog: a CSV row per registered card, then the workbook. Opened through the registry's `open`.                                                                                                                                                                                                                                                                                  |
| `export-dataset.js`         | The `ExportDataset` shape's serialisers (CSV, XLSX sheets, the workbook), the table view's cell formatting and `seriesDataset` (a chart's visible series as drawn).                                                                                                                                                                                                                                  |
| `cell-format.js`            | Shared cell formatters: the em dash, percentages, fixed decimals, compact dollars, tonnes' prefix, a label's qualifier.                                                                                                                                                                                                                                                                              |
| `types.js`                  | `ExportDataset`, `DownloadSource`, `ChartSnapshot`, `CompareSource` and friends.                                                                                                                                                                                                                                                                                                                     |
| `compare/`                  | Compare mode: the engine (`chart-compare.js`), the panel (`ComparePanel` with `ComparePicker`, `CompareChangeList`, `CompareValueTiles`, `CompareSlopeChart`), snapshot sources (`snapshot-sources.js`), pins (`compare-pins.svelte.js`) and the page controller (`compare-mode.svelte.js`).                                                                                                         |

## Using it on a page

1. **Downloads.** Create the registry once and put it in context, then render
   the dialog:

   ```js
   const downloads = setChartDownloads(
   	createChartDownloads({ timeZone, fileName, summary, sourceUrl, onnotice })
   );
   ```

   `<DownloadDataModal {downloads} />`, and open it with
   `downloads.open = true` (an options menu item). Each card's
   `download={{ id, state, dataset }}` lists it; `id` names its file
   through `fileName(id, 'csv')`. Without a registry the Table and CSV
   buttons hide.

2. **Charts report what they draw** — a `ChartSnapshot` (visible rows at the
   display grain, plus series names, labels and colours): `NetworkChart` and
   `FacilityChart`'s `onvisibledata`, and the facility market and emissions
   charts' `onvisibledata`. Downloads (`seriesDataset`) and comparisons read
   it.
3. **Compare mode.** Give a card `compare={{ open, onopenchange, panel }}`.
   The page keeps one comparison (`{cards, a, b}`) where it likes and hands
   it to `createCompareMode({ read, write, times })`, which holds the armed
   slot, defaults A and B to a comparing card's first and last buckets until
   they are chosen, and gives each chart `timeMarkers={compare.timeMarkers(card)}`
   and `onpick={compare.onpick(card)}` (props, not a spread: a spread would
   make every prop the chart reads track the comparison). The panel snippet
   renders `ComparePanel` with a `CompareSource`:
   - `stackCompareSource(snapshot, …)` for a stack (a net total and one
     change list, loads read as consumption; a drawn bucket's missing
     reading compares as 0);
   - `lineCompareSource(snapshot, …)` for one line (A and B tiles over the
     window) or several (a slope chart and a list);
   - or a page's own (the Tracker's regions).

   Hold A and B through pans with `createComparePins` (keyed on everything
   but the window) and pass its rows as `held`. Close the comparison on
   anything that redraws the charts over other periods or as other charts:
   a range, interval or filter pick, a chart switch, another scope — and a
   pan or zoom that switches the grain (5 min → 30 min, power → energy),
   which leaves A and B on buckets the charts no longer draw.

Pages: `src/routes/(main)/tracker/` (Timeline, Profile, Compare) and
`src/routes/(main)/facility/[code]/+page.svelte` (Generation, Curtailment,
Market, Emissions; its builders are
`$lib/components/charts/facility/facility-cards.js`).

## Tests

`chart-downloads` (node and runes), `export-dataset`,
`compare/chart-compare`, `compare/snapshot-sources` and
`compare/compare-pins.svelte`, colocated. End to end:
`tests/e2e/tracker-*.spec.js` and `tests/e2e/facility-chart-cards.spec.js`.
