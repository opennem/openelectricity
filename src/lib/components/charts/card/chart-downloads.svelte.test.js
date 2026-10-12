import { describe, expect, it, vi } from 'vitest';
import { flushSync } from 'svelte';
import { createChartDownloads, chartDownload } from './chart-downloads.svelte.js';

const { downloadCsv, downloadXlsx } = vi.hoisted(() => ({
	downloadCsv: vi.fn(),
	downloadXlsx: vi.fn(async () => {})
}));
vi.mock('$lib/utils/download-csv.js', async (original) => ({
	.../** @type {object} */ (await original()),
	downloadCsv
}));
vi.mock('$lib/utils/download-xlsx.js', async (original) => ({
	.../** @type {object} */ (await original()),
	downloadXlsx
}));

/** @type {import('./types.js').ExportDataset} */
const DATASET = {
	key: 'generation',
	title: 'Generation',
	columns: [
		{ key: 'time', header: 'date', type: 'time' },
		{ key: 'coal', header: 'Coal (MW)', type: 'number' }
	],
	rows: [{ time: Date.UTC(2026, 6, 1, 4, 30), coal: 100 }]
};

/** @typedef {import('./types.js').DownloadSource} DownloadSource */

/** @param {string} id @param {Partial<DownloadSource>} [overrides] @returns {DownloadSource} */
const source = (id, overrides = {}) => ({
	id,
	label: id,
	state: 'ready',
	dataset: () => null,
	...overrides
});

/** Elements in document order, attached to the body. @param {string[]} ids */
function elements(ids) {
	const root = document.createElement('div');
	document.body.append(root);
	const nodes = ids.map((id) => {
		const node = document.createElement('section');
		node.id = id;
		root.append(node);
		return node;
	});
	return { root, nodes };
}

describe('chart downloads registry', () => {
	it('lists mounted downloads in screen order and drops them on cleanup', () => {
		const registry = createChartDownloads();
		const { root, nodes } = elements(['generation', 'market', 'table']);
		const cleanups = [2, 0, 1].map((index) =>
			registry.register(nodes[index], () => source(nodes[index].id))
		);
		expect(registry.entries.map((entry) => entry.get().id)).toEqual([
			'generation',
			'market',
			'table'
		]);
		cleanups[0]();
		expect(registry.entries.map((entry) => entry.get().id)).toEqual(['generation', 'market']);
		// An element already gone from the page is never listed.
		nodes[1].remove();
		expect(registry.entries.map((entry) => entry.get().id)).toEqual(['generation']);
		root.remove();
	});

	it('keeps a remounted card and its outgoing copy apart', () => {
		const registry = createChartDownloads();
		const { root, nodes } = elements(['old', 'new']);
		const dropOld = registry.register(nodes[0], () => source('profile-coal'));
		registry.register(nodes[1], () => source('profile-coal', { label: 'new' }));
		dropOld();
		expect(registry.entries.map((entry) => entry.get().label)).toEqual(['new']);
		root.remove();
	});

	it('reads each source when listed, so it follows the card’s state', () => {
		let state = $state(/** @type {DownloadSource['state']} */ ('loading'));
		const stop = $effect.root(() => {
			const registry = createChartDownloads();
			const { root, nodes } = elements(['generation']);
			registry.register(nodes[0], () => source('generation', { state }));
			const states = $derived(registry.entries.map((entry) => entry.get().state));
			expect(states).toEqual(['loading']);
			state = 'ready';
			flushSync();
			expect(states).toEqual(['ready']);
			root.remove();
		});
		stop();
	});

	it('registers from an attachment without re-running it or looping', () => {
		let label = $state('Generation');
		let attached = 0;
		let listed = 0;
		const registry = createChartDownloads();
		const { root, nodes } = elements(['generation']);
		const attach = /** @type {import('svelte/attachments').Attachment<Element>} */ (
			chartDownload(registry, () => source('generation', { label }))
		);
		const stop = $effect.root(() => {
			// The dialog reads the list while a card attaches, as on the page.
			$effect(() => {
				listed++;
				void registry.entries.map((entry) => entry.get().label);
			});
			$effect(() => {
				attached++;
				return attach(nodes[0]);
			});
		});
		flushSync();
		expect(registry.entries).toHaveLength(1);
		label = 'Energy';
		flushSync();
		expect(attached).toBe(1);
		expect(listed).toBe(3);
		expect(registry.entries[0].get().label).toBe('Energy');
		stop();
		expect(registry.entries).toHaveLength(0);
		root.remove();
	});

	it('offers no attachment outside a page with downloads', () => {
		expect(chartDownload(null, () => source('generation'))).toBeUndefined();
	});

	it('follows the page’s time zone', () => {
		let zone = $state('+10:00');
		const stop = $effect.root(() => {
			const registry = createChartDownloads({ timeZone: () => zone });
			expect(registry.timeZone).toBe('+10:00');
			zone = '+08:00';
			expect(registry.timeZone).toBe('+08:00');
		});
		stop();
		// Without a page's options (unit-rendered cards) the registry still answers.
		expect(createChartDownloads().timeZone).toBe('+10:00');
	});

	it('downloads a source’s CSV under its own or the page’s file name', () => {
		downloadCsv.mockClear();
		const registry = createChartDownloads({
			timeZone: () => '+10:00',
			fileName: (id, extension) => `page-${id}.${extension}`
		});
		registry.csv(source('generation', { dataset: () => DATASET }));
		expect(downloadCsv).toHaveBeenCalledWith(
			'date,Coal (MW)\n2026-07-01 14:30:00+10:00,100',
			'page-generation.csv'
		);
		registry.csv(source('market', { dataset: () => DATASET, fileName: () => 'own.csv' }));
		expect(downloadCsv).toHaveBeenLastCalledWith(expect.any(String), 'own.csv');
	});

	it('reports a CSV with nothing yet in the dialog, or to the page while it is closed', () => {
		const notices = /** @type {string[]} */ ([]);
		const registry = createChartDownloads({ onnotice: (message) => notices.push(message) });
		registry.csv(source('generation'));
		expect(notices).toEqual(['generation: nothing to download yet.']);
		registry.open = true;
		registry.csv(source('market'));
		expect(registry.error).toBe('market: nothing to download yet.');
		registry.open = true;
		expect(registry.error).toBe('');
	});

	it('builds the workbook from ready charts, naming the empty ones on its Summary', async () => {
		downloadXlsx.mockClear();
		const registry = createChartDownloads({
			fileName: (id, extension) => `page-${id ?? 'all'}.${extension}`,
			summary: () => [['Facility', 'Bayswater']],
			sourceUrl: () => 'https://example.test/facility/BW'
		});
		await registry.workbook([
			source('generation', { label: 'Generation', dataset: () => DATASET }),
			source('market', { label: 'Market', state: 'empty' })
		]);
		const [sheets, name] = /** @type {[any[], string]} */ (
			/** @type {unknown} */ (downloadXlsx.mock.calls[0])
		);
		expect(name).toBe('page-all.xlsx');
		expect(sheets.map((/** @type {any} */ sheet) => sheet.sheet)).toEqual([
			'Summary',
			'Generation'
		]);
		const summary = sheets[0].data.map((/** @type {any} */ row) => row[0].value);
		expect(summary).toEqual(['Facility', 'Sheets', 'No data', 'Generated', 'Source']);
		await registry.workbook([source('market', { state: 'empty' })]);
		expect(registry.error).toBe('Nothing to download yet.');
	});
});
