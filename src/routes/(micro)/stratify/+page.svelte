<script>
	import { onMount } from 'svelte';
	import Meta from '$lib/components/Meta.svelte';
	import { getClerkState } from '$lib/auth/clerk.svelte.js';
	import LoginGate from '$lib/components/auth/LoginGate.svelte';
	import { DragHandle, createDragHandler } from '$lib/components/ui/panel';

	import StratifyPlotProject from './_state/StratifyPlotProject.svelte.js';
	import { setStratifyContext } from './_state/context.js';

	import DataPanel from './_components/panels/DataPanel.svelte';
	import ChartPanel from './_components/panels/ChartPanel.svelte';
	import AnnotatePanel from './_components/panels/AnnotatePanel.svelte';
	import SeriesPanel from './_components/panels/SeriesPanel.svelte';
	import PublishPanel from './_components/panels/PublishPanel.svelte';
	import ChartPreview from './_components/ChartPreview.svelte';
	import ExamplePicker from './_components/ExamplePicker.svelte';
	import AccordionSection from './_components/AccordionSection.svelte';
	import ChartManager from './_components/ChartManager.svelte';
	import { createChart, updateChart, getChart } from './_utils/api.js';

	const clerkState = getClerkState();

	// Centralised project state
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

	// Toggle between accordion and chart manager in the left panel
	let showChartManager = $state(false);

	// Prevent SSR/hydration flash from localStorage-driven widths
	let mounted = $state(false);
	onMount(async () => {
		mounted = true;

		// Load chart from ?chart= query param if present
		const params = new URLSearchParams(window.location.search);
		const chartId = params.get('chart');
		if (chartId) {
			try {
				const chart = await getChart(chartId);
				if (chart) {
					project.loadFromSnapshot(chart);
					project.currentChartId = chart._id;
				}
			} catch {
				// Chart not found or not accessible
			}
			// Clean the URL without reloading
			window.history.replaceState({}, '', '/stratify');
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

		// Skip auto-save if nothing changed
		if (trigger === 'auto' && snapshotJSON === lastSnapshotJSON) return;

		saveStatus = 'saving';

		try {
			if (project.currentChartId) {
				await updateChart(project.currentChartId, snapshot);
			} else {
				const result = await createChart(snapshot);
				project.currentChartId = result._id;
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

	// Debounced auto-save: triggers 3s after any project change
	$effect(() => {
		// Read reactive deps to trigger on any project data change
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

<LoginGate redirectUrl="/stratify">
	{#if mounted}
		<div class="flex flex-col h-dvh overflow-hidden font-mono">
			<!-- Header bar -->
			<div class="flex items-center gap-3 px-4 py-2 border-b border-warm-grey bg-light-warm-grey/50">
				<span class="text-[11px] font-medium text-dark-grey tracking-wide uppercase">Stratify</span>

				{#if project.currentChartId}
					<span class="text-[10px] px-1.5 py-0.5 rounded {project.status === 'published'
						? 'bg-green-100 text-green-700'
						: 'bg-warm-grey text-mid-grey'}">
						{project.status === 'published' ? 'Published' : 'Draft'}
					</span>
				{/if}

				<div class="flex items-center gap-1 ml-auto">
					<button
						type="button"
						onclick={() => (showChartManager = !showChartManager)}
						class="rounded border px-2 py-1 text-[11px] transition-colors {showChartManager
							? 'border-dark-grey text-dark-grey bg-white'
							: 'border-transparent text-mid-grey hover:text-dark-grey hover:border-mid-warm-grey'}"
					>
						Charts
					</button>
					<button
						type="button"
						onclick={() => project.reset()}
						class="rounded border border-transparent px-2 py-1 text-[11px] text-mid-grey transition-colors hover:text-dark-grey hover:border-mid-warm-grey"
					>
						New Chart
					</button>
					<button
						type="button"
						onclick={() => handleSave('manual')}
						disabled={!project.hasData || saveStatus === 'saving'}
						class="rounded border border-transparent px-2 py-1 text-[11px] text-mid-grey transition-colors hover:text-dark-grey hover:border-mid-warm-grey disabled:opacity-40 disabled:pointer-events-none"
					>
						{saveButtonLabel}
					</button>

					<!-- User info + sign out -->
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
				<!-- Left panel: accordion sections or chart manager -->
				<div
					class="flex-shrink-0 flex flex-col min-h-0"
					style="width: {leftDrag.value}px;"
				>
					{#if showChartManager}
						<ChartManager onclose={() => (showChartManager = false)} />
					{:else}
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
					{/if}
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
</LoginGate>
