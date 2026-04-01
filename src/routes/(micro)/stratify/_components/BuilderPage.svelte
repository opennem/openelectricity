<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import Meta from '$lib/components/Meta.svelte';
	import { getClerkState } from '$lib/auth/clerk.svelte.js';
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
	import { createChart, updateChart, getChart } from '../_utils/api.js';

	/** @type {{ initialChartId?: string }} */
	let { initialChartId = '' } = $props();

	const clerkState = getClerkState();

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

{#if mounted}
	<div class="flex flex-col h-dvh overflow-hidden font-mono">
		<!-- Header bar -->
		<div class="flex items-center gap-3 px-4 py-2 border-b border-warm-grey bg-light-warm-grey/50">
			<a href="/stratify" class="text-[11px] font-medium text-dark-grey tracking-wide uppercase hover:underline">
				Stratify
			</a>

			{#if project.currentChartId}
				<span class="text-[10px] px-1.5 py-0.5 rounded {project.status === 'published'
					? 'bg-green-100 text-green-700'
					: 'bg-warm-grey text-mid-grey'}">
					{project.status === 'published' ? 'Published' : 'Draft'}
				</span>
			{/if}

			<div class="flex items-center gap-1 ml-auto">
				<a
					href="/stratify"
					class="rounded border border-transparent px-2 py-1 text-[11px] text-mid-grey transition-colors hover:text-dark-grey hover:border-mid-warm-grey"
				>
					Charts
				</a>
				<a
					href="/stratify/new"
					class="rounded border border-transparent px-2 py-1 text-[11px] text-mid-grey transition-colors hover:text-dark-grey hover:border-mid-warm-grey"
				>
					New Chart
				</a>
				<button
					type="button"
					onclick={() => handleSave('manual')}
					disabled={!project.hasData || saveStatus === 'saving'}
					class="rounded border border-transparent px-2 py-1 text-[11px] text-mid-grey transition-colors hover:text-dark-grey hover:border-mid-warm-grey disabled:opacity-40 disabled:pointer-events-none"
				>
					{saveButtonLabel}
				</button>

				{#if clerkState.user}
					<span class="text-[10px] text-mid-grey ml-2">
						{clerkState.user.primaryEmailAddress?.emailAddress ?? ''}
					</span>
					<button
						type="button"
						onclick={() => clerkState.instance?.signOut({ redirectUrl: '/stratify' })}
						class="rounded border border-transparent px-2 py-1 text-[11px] text-mid-grey transition-colors hover:text-dark-grey hover:border-mid-warm-grey"
					>
						Sign out
					</button>
				{/if}
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
