/**
 * Chart downloads — the "Download data" registry and its downloads. Every
 * chart card and panel a page renders registers its download while mounted,
 * so the dialog (`DownloadDataModal`) lists exactly what is on screen — a
 * chart that isn't drawn can't be offered, and a drawn one can't be missed.
 * A page creates one with `setChartDownloads(createChartDownloads(…))`;
 * cards find it through context and register from an attachment on their
 * element (`ChartCard`'s `download`, or `chartDownload`).
 *
 * Sources are getters, read when the dialog shows: the label, state and
 * dataset always describe the card as it is now, and a dataset is only
 * built when its download is clicked.
 *
 * The registry also downloads: a source's CSV (from the dialog or a card's
 * own header) and the "All charts" workbook (a Summary sheet, then a sheet
 * per chart with data). The page supplies its time zone, file names and the
 * workbook's Summary rows.
 */
import { getContext, setContext, untrack } from 'svelte';
import { downloadCsv } from '$lib/utils/download-csv.js';
import { downloadXlsx } from '$lib/utils/download-xlsx.js';
import { formatNetworkTimestamp } from '$lib/components/charts/v2/network-time.js';
import { orderByDocument } from './chart-downloads.js';
import { buildWorkbookSheets, datasetToCsv, uniqueSheetNames } from './export-dataset.js';

/** @typedef {import('./types.js').DownloadSource} DownloadSource */
/** @typedef {{ element: Element, get: () => DownloadSource }} DownloadEntry */

const KEY = Symbol('chart-downloads');

/**
 * @param {{
 *   timeZone?: () => string,
 *   fileName?: (id: string | null, extension: 'csv' | 'xlsx') => string,
 *   summary?: () => Array<[string, string]>,
 *   sourceUrl?: () => string,
 *   onnotice?: (message: string) => void
 * }} [options] - `fileName` names a CSV by its source id (null names the
 *   workbook); `summary` leads the workbook's Summary sheet, `sourceUrl`
 *   ends it; `onnotice` reports a CSV that can't download while the dialog
 *   is closed (a card's header button).
 */
export function createChartDownloads({
	timeZone = () => '+10:00',
	fileName = (id, extension) => `${id ?? 'charts'}.${extension}`,
	summary = () => [],
	sourceUrl,
	onnotice
} = {}) {
	let entries = $state.raw(/** @type {DownloadEntry[]} */ ([]));
	let open = $state(false);
	let building = $state(false);
	let error = $state('');

	return {
		/** The network offset the page shows times in (`+10:00`). */
		get timeZone() {
			return timeZone();
		},
		/** Whether the "Download data" dialog shows. */
		get open() {
			return open;
		},
		set open(value) {
			if (value) error = '';
			open = value;
		},
		/** The workbook is being built. */
		get building() {
			return building;
		},
		/** Why the last download failed, shown in the dialog. */
		get error() {
			return error;
		},
		/** The mounted downloads, in screen order. */
		get entries() {
			return orderByDocument(entries.filter((entry) => entry.element.isConnected));
		},
		/**
		 * Register an element's download until the returned cleanup runs.
		 * Entries are keyed by identity: a keyed `{#each}` can mount a card's
		 * replacement before the old one is torn down.
		 * @param {Element} element
		 * @param {() => DownloadSource} get
		 */
		register(element, get) {
			/** @type {DownloadEntry} */
			const entry = { element, get };
			// Untracked, so an attachment registering doesn't depend on the list.
			entries = [...untrack(() => entries), entry];
			return () => {
				entries = untrack(() => entries).filter((other) => other !== entry);
			};
		},
		/** Download a source's CSV, from the dialog or a card's header; a
		 * failure shows where it was asked.
		 * @param {DownloadSource} source */
		csv(source) {
			error = '';
			const dataset = source.dataset();
			if (!dataset) {
				const message = `${source.label}: nothing to download yet.`;
				if (open || !onnotice) error = message;
				else onnotice(message);
				return;
			}
			downloadCsv(
				datasetToCsv(dataset, timeZone()),
				source.fileName?.('csv') ?? fileName(source.id, 'csv')
			);
		},
		/** The "All charts" workbook: Summary, then a sheet per chart with
		 * data, named as the dialog lists it.
		 * @param {DownloadSource[]} sources */
		async workbook(sources) {
			error = '';
			const datasets = sources.flatMap((source) => {
				const dataset = source.state === 'ready' ? source.dataset() : null;
				return dataset ? [{ ...dataset, title: source.label }] : [];
			});
			if (!datasets.length) {
				error = 'Nothing to download yet.';
				return;
			}
			const zone = timeZone();
			const empty = sources.filter((source) => source.state === 'empty');
			/** @type {Array<[string, string]>} */
			const rows = [
				...summary(),
				['Sheets', uniqueSheetNames(datasets.map((dataset) => dataset.title)).join(', ')],
				...(empty.length
					? /** @type {Array<[string, string]>} */ ([
							['No data', empty.map((source) => source.label).join(', ')]
						])
					: []),
				['Generated', formatNetworkTimestamp(Date.now(), zone)],
				...(sourceUrl ? /** @type {Array<[string, string]>} */ ([['Source', sourceUrl()]]) : [])
			];
			building = true;
			try {
				await downloadXlsx(
					buildWorkbookSheets({ summary: rows, datasets, timeZone: zone }),
					fileName(null, 'xlsx')
				);
			} catch (cause) {
				console.error('Workbook export failed', cause);
				error = 'Could not build the workbook.';
			} finally {
				building = false;
			}
		}
	};
}

/** @typedef {ReturnType<typeof createChartDownloads>} ChartDownloads */

/** @param {ChartDownloads} registry */
export function setChartDownloads(registry) {
	return setContext(KEY, registry);
}

/** The page's registry, or null outside one (cards still render, without
 * their Table and CSV buttons). */
export function getChartDownloads() {
	return /** @type {ChartDownloads | undefined} */ (getContext(KEY)) ?? null;
}

/**
 * An attachment registering its element's download while mounted. `get`
 * is read lazily, so the attachment itself reads no state and never re-runs;
 * cards toggle registration by attaching it or not.
 * @param {ChartDownloads | null} registry
 * @param {() => DownloadSource} get
 * @returns {import('svelte/attachments').Attachment<Element> | undefined}
 */
export function chartDownload(registry, get) {
	if (!registry) return undefined;
	return (element) => untrack(() => registry.register(element, get));
}
