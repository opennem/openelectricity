<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import Meta from '$lib/components/Meta.svelte';
	import { DragHandle, createDragHandler } from '$lib/components/ui/panel';

	import StratifyPlotProject from '../_state/StratifyPlotProject.svelte.js';
	import { setStratifyContext } from '../_state/context.js';

	import DataPanel from './panels/DataPanel.svelte';
	import ChartPanel from './panels/ChartPanel.svelte';
	import AnnotatePanel from './panels/AnnotatePanel.svelte';
	import SeriesPanel from './panels/SeriesPanel.svelte';
	import PublishPanel from './panels/PublishPanel.svelte';
	import ChartPreview from './ChartPreview.svelte';
	import ExamplePicker from './ExamplePicker.svelte';
	import AccordionSection from './AccordionSection.svelte';
	import StratifyHeader from './StratifyHeader.svelte';
	import { createChart, updateChart, getChart } from '../_utils/api.js';

	/** @type {{ initialChartId?: string }} */
	let { initialChartId = '' } = $props();

	const project = new StratifyPlotProject();
	setStratifyContext(project);

	const sections = [
		{ id: 'data', label: 'Data' },
		{ id: 'chart', label: 'Chart' },
		{ id: 'annotate', label: 'Annotate' },
		{ id: 'series', label: 'Series' },
		{ id: 'publish', label: 'Publish' }
	];

	/** @type {Record<string, boolean>} */
	let openSections = $state({ data: true, chart: true, annotate: true, series: true, publish: true });

	let mounted = $state(false);
	let loadingChart = $state(!!initialChartId);

	onMount(async () => {
		mounted = true;

		if (initialChartId) {
			try {
				const chart = await getChart(initialChartId);
				if (chart) {
					project.loadFromSnapshot(chart);
					project.currentChartId = chart._id;
				}
			} catch {
				// Chart not found — stay on empty builder
			} finally {
				loadingChart = false;
			}
		}
	});

	// --- Save to Sanity ---
	/** @type {'idle' | 'saving' | 'saved' | 'error'} */
	let saveStatus = $state('idle');

	/** @type {ReturnType<typeof setTimeout> | null} */
	let autoSaveTimer = null;

	/** @type {string} */
	let lastSnapshotJSON = '';

	/**
	 * Save (create or update) the current chart to Sanity.
	 * @param {'auto' | 'manual'} trigger
	 */
	async function handleSave(trigger = 'manual') {
		if (!project.hasData) return;

		const snapshot = project.toJSON();
		const snapshotJSON = JSON.stringify(snapshot);

		if (trigger === 'auto' && snapshotJSON === lastSnapshotJSON) return;

		saveStatus = 'saving';

		try {
			if (project.currentChartId) {
				await updateChart(project.currentChartId, snapshot);
			} else {
				const result = await createChart(snapshot);
				project.currentChartId = result._id;
				// Navigate to the edit route for the new chart
				goto(`/stratify/${result._id}`, { replaceState: true });
			}
			lastSnapshotJSON = snapshotJSON;
			saveStatus = 'saved';
			setTimeout(() => {
				if (saveStatus === 'saved') saveStatus = 'idle';
			}, 2000);
		} catch {
			saveStatus = 'error';
			setTimeout(() => {
				if (saveStatus === 'error') saveStatus = 'idle';
			}, 3000);
		}
	}

	// Debounced auto-save
	$effect(() => {
		const _ = project.toJSON();
		const chartId = project.currentChartId;

		if (!project.hasData || !chartId) return;

		if (autoSaveTimer) clearTimeout(autoSaveTimer);
		autoSaveTimer = setTimeout(() => handleSave('auto'), 3000);
	});

	let publishing = $state(false);

	async function handlePublish() {
		if (!project.hasData) return;
		publishing = true;
		try {
			if (!project.currentChartId) {
				const result = await createChart(project.toJSON());
				project.currentChartId = result._id;
				goto(`/stratify/${result._id}`, { replaceState: true });
			}
			await updateChart(project.currentChartId, {
				...project.toJSON(),
				status: 'published',
				publishedAt: new Date().toISOString()
			});
			project.status = 'published';
		} catch {
			// handled silently
		} finally {
			publishing = false;
		}
	}

	async function handleUnpublish() {
		if (!project.currentChartId) return;
		publishing = true;
		try {
			await updateChart(project.currentChartId, {
				status: 'draft',
				publishedAt: null
			});
			project.status = 'draft';
		} catch {
			// handled silently
		} finally {
			publishing = false;
		}
	}

	/** @type {string} */
	let saveButtonLabel = $derived.by(() => {
		if (saveStatus === 'saving') return 'Saving...';
		if (saveStatus === 'saved') return 'Saved';
		if (saveStatus === 'error') return 'Error';
		return project.currentChartId ? 'Update' : 'Save';
	});

	const leftDrag = createDragHandler({
		axis: 'x',
		min: 280,
		max: 600,
		initial: 380,
		storageKey: 'stratify-plot-left-width'
	});
</script>

<Meta title="Stratify" description="Create and embed data charts" />

{#if !mounted || loadingChart}
	<div class="flex items-center justify-center h-dvh font-mono">
		<p class="text-[11px] text-mid-grey">Loading chart...</p>
	</div>
{:else}
	<div class="flex flex-col h-dvh overflow-hidden font-mono">
		<StratifyHeader />

		<!-- Sub-header: chart info + actions -->
		<div class="flex items-center gap-3 px-4 py-1.5 border-b border-warm-grey">
			<div class="flex items-center gap-2">
				{#if project.currentChartId}
					{#if project.status === 'published'}
						<a
							href="/strata/{project.currentChartId}"
							target="_blank"
							class="inline-flex items-center gap-1 text-[10px] text-mid-grey hover:text-dark-grey"
						>
							Published link
							<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
						</a>
					{:else}
						<span class="text-[9px] px-1.5 py-0.5 rounded bg-warm-grey text-mid-grey">Draft</span>
					{/if}
				{:else}
					<span class="text-[10px] text-mid-grey">New chart</span>
				{/if}
			</div>

			<div class="flex items-center gap-2 ml-auto">
				{#if project.currentChartId}
					{#if project.status === 'published'}
						<button
							type="button"
							onclick={handleUnpublish}
							disabled={publishing}
							class="rounded border border-warm-grey px-2.5 py-1 text-[10px] text-mid-grey transition-colors hover:text-dark-grey hover:border-dark-grey disabled:opacity-40"
						>
							{publishing ? '...' : 'Unpublish'}
						</button>
					{:else}
						<button
							type="button"
							onclick={handlePublish}
							disabled={!project.hasData || publishing}
							class="rounded border border-warm-grey px-2.5 py-1 text-[10px] text-mid-grey transition-colors hover:text-dark-grey hover:border-dark-grey disabled:opacity-40"
						>
							{publishing ? '...' : 'Publish'}
						</button>
					{/if}
				{/if}

				<button
					type="button"
					onclick={() => handleSave('manual')}
					disabled={!project.hasData || saveStatus === 'saving'}
					class="rounded bg-dark-grey px-2.5 py-1 text-[10px] text-white transition-colors hover:bg-black disabled:opacity-40 disabled:pointer-events-none"
				>
					{saveButtonLabel}
				</button>
			</div>
		</div>

		<!-- Split pane -->
		<div class="flex flex-1 min-h-0">
			<!-- Left panel: accordion sections -->
			<div
				class="flex-shrink-0 flex flex-col min-h-0"
				style="width: {leftDrag.value}px;"
			>
				<div class="flex flex-col min-h-0 overflow-y-auto">
					{#each sections as section (section.id)}
						<AccordionSection
							label={section.label}
							open={openSections[section.id]}
							ontoggle={() => (openSections[section.id] = !openSections[section.id])}
						>
							{#if section.id === 'data'}
								<DataPanel />
							{:else if section.id === 'chart'}
								<ChartPanel />
							{:else if section.id === 'annotate'}
								<AnnotatePanel />
							{:else if section.id === 'series'}
								<SeriesPanel />
							{:else if section.id === 'publish'}
								<PublishPanel />
							{/if}
						</AccordionSection>
					{/each}
				</div>
			</div>

			<DragHandle axis="x" onstart={leftDrag.start} active={leftDrag.isDragging} />

			<!-- Right panel: chart preview -->
			<div class="flex-1 flex flex-col min-h-0 overflow-hidden">
				{#if project.hasData}
					<div class="flex-1 min-h-0 p-6">
						<ChartPreview />
					</div>
				{:else}
					<ExamplePicker />
				{/if}
			</div>
		</div>
	</div>
{/if}

