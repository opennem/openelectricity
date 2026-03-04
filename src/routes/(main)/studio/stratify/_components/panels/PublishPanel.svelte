<script>
	import { getStratifyContext } from '../../_state/context.js';
	import {
		saveChart,
		loadChart,
		listCharts,
		deleteChart,
		exportToFile,
		importFromFile
	} from '../../_utils/storage.js';

	const project = getStratifyContext();

	/** @type {import('../../_utils/storage.js').SavedChartMeta[]} */
	let savedCharts = $state([]);

	/** @type {string | null} */
	let currentChartId = $state(null);

	/** @type {string} */
	let statusMessage = $state('');

	function refreshList() {
		savedCharts = listCharts();
	}

	// Load list on mount
	$effect(() => {
		refreshList();
	});

	function handleSave() {
		if (!project.hasData) return;
		statusMessage = '';

		try {
			const id = saveChart(project.toJSON(), currentChartId ?? undefined);
			currentChartId = id;
			statusMessage = 'Saved';
			refreshList();
		} catch (e) {
			statusMessage = `Error: ${e instanceof Error ? e.message : 'Failed to save'}`;
		}
	}

	/**
	 * Load a saved chart by ID.
	 * @param {string} id
	 */
	function handleLoad(id) {
		statusMessage = '';

		try {
			const chart = loadChart(id);
			if (chart) {
				project.csvText = chart.csvText ?? '';
				project.title = chart.title ?? '';
				project.description = chart.description ?? '';
				project.dataSource = chart.dataSource ?? '';
				project.notes = chart.notes ?? '';
				project.chartType = /** @type {'stacked-area' | 'area' | 'line'} */ (
					chart.chartType ?? 'stacked-area'
				);
				project.hiddenSeries = chart.hiddenSeries ?? [];
				project.userSeriesColours = chart.userSeriesColours ?? {};
				project.userSeriesLabels = chart.userSeriesLabels ?? {};
				currentChartId = id;
				statusMessage = 'Loaded';
			}
		} catch (e) {
			statusMessage = `Error: ${e instanceof Error ? e.message : 'Failed to load'}`;
		}
	}

	/**
	 * Delete a saved chart by ID.
	 * @param {string} id
	 */
	function handleDelete(id) {
		deleteChart(id);
		if (currentChartId === id) currentChartId = null;
		refreshList();
	}

	function handleExportJSON() {
		if (!project.hasData) return;
		exportToFile(project.toJSON());
	}

	async function handleImportJSON() {
		statusMessage = '';
		const snapshot = await importFromFile();
		if (!snapshot) return;

		project.csvText = snapshot.csvText ?? '';
		project.title = snapshot.title ?? '';
		project.description = snapshot.description ?? '';
		project.dataSource = snapshot.dataSource ?? '';
		project.notes = snapshot.notes ?? '';
		project.chartType = /** @type {'stacked-area' | 'area' | 'line'} */ (
			snapshot.chartType ?? 'stacked-area'
		);
		project.hiddenSeries = snapshot.hiddenSeries ?? [];
		project.userSeriesColours = snapshot.userSeriesColours ?? {};
		project.userSeriesLabels = snapshot.userSeriesLabels ?? {};
		currentChartId = null;
		statusMessage = 'Imported';
	}

	async function handleExportSVG() {
		const { captureSVG, downloadSVG } = await import('../../_utils/export.js');
		const container = document.querySelector('.chart-preview');
		if (!container) return;
		const svg = captureSVG(/** @type {HTMLElement} */ (container));
		if (svg) downloadSVG(svg, `${project.title || 'chart'}.svg`);
	}

	async function handleExportPNG() {
		const { downloadPNG } = await import('../../_utils/export.js');
		const container = document.querySelector('.chart-preview');
		if (!container) return;
		await downloadPNG(/** @type {HTMLElement} */ (container), `${project.title || 'chart'}.png`);
	}
</script>

<div class="space-y-6">
	<!-- Image Export -->
	<div>
		<span class="block text-xs font-semibold mb-2 text-mid-grey uppercase tracking-wider"
			>Export image</span
		>
		<div class="flex gap-2">
			<button
				type="button"
				onclick={handleExportSVG}
				disabled={!project.hasData}
				class="rounded-lg border border-mid-warm-grey px-3 py-1.5 text-xs text-dark-grey hover:border-dark-grey hover:bg-light-warm-grey disabled:opacity-40 disabled:pointer-events-none"
			>
				Download SVG
			</button>
			<button
				type="button"
				onclick={handleExportPNG}
				disabled={!project.hasData}
				class="rounded-lg border border-mid-warm-grey px-3 py-1.5 text-xs text-dark-grey hover:border-dark-grey hover:bg-light-warm-grey disabled:opacity-40 disabled:pointer-events-none"
			>
				Download PNG
			</button>
		</div>
	</div>

	<!-- JSON Export/Import -->
	<div class="border-t border-mid-warm-grey pt-6">
		<span class="block text-xs font-semibold mb-2 text-mid-grey uppercase tracking-wider"
			>Export / Import config</span
		>
		<div class="flex gap-2">
			<button
				type="button"
				onclick={handleExportJSON}
				disabled={!project.hasData}
				class="rounded-lg border border-mid-warm-grey px-3 py-1.5 text-xs text-dark-grey hover:border-dark-grey hover:bg-light-warm-grey disabled:opacity-40 disabled:pointer-events-none"
			>
				Export JSON
			</button>
			<button
				type="button"
				onclick={handleImportJSON}
				class="rounded-lg border border-mid-warm-grey px-3 py-1.5 text-xs text-dark-grey hover:border-dark-grey hover:bg-light-warm-grey"
			>
				Import JSON
			</button>
		</div>
		<p class="text-xs text-mid-grey mt-2">
			Export chart config as JSON to share between browsers or import into Sanity CMS.
		</p>
	</div>

	<!-- Local Save -->
	<div class="border-t border-mid-warm-grey pt-6">
		<span class="block text-xs font-semibold mb-2 text-mid-grey uppercase tracking-wider"
			>Browser storage</span
		>

		<button
			type="button"
			onclick={handleSave}
			disabled={!project.hasData}
			class="w-full rounded-lg bg-black px-3 py-2 text-xs text-white hover:bg-dark-grey disabled:opacity-40 disabled:pointer-events-none"
		>
			{currentChartId ? 'Update' : 'Save'}
		</button>

		{#if statusMessage}
			<p
				class="text-xs mt-1 {statusMessage.startsWith('Error')
					? 'text-dark-red'
					: 'text-mid-grey'}"
			>
				{statusMessage}
			</p>
		{/if}
	</div>

	<!-- Saved charts list -->
	{#if savedCharts.length > 0}
		<div class="border-t border-mid-warm-grey pt-6">
			<span class="block text-xs font-semibold mb-2 text-mid-grey uppercase tracking-wider"
				>Saved charts</span
			>
			<div class="space-y-1">
				{#each savedCharts as chart (chart.id)}
					<div
						class="flex items-center justify-between gap-2 rounded px-2 py-1.5 hover:bg-light-warm-grey {currentChartId ===
						chart.id
							? 'bg-light-warm-grey'
							: ''}"
					>
						<button
							type="button"
							onclick={() => handleLoad(chart.id)}
							class="flex-1 text-left text-xs truncate"
						>
							<span class="font-medium">{chart.title || 'Untitled'}</span>
						</button>
						<button
							type="button"
							onclick={() => handleDelete(chart.id)}
							class="text-xs text-mid-warm-grey hover:text-dark-red shrink-0"
							title="Delete"
						>
							&times;
						</button>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>
