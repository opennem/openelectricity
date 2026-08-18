<script>
	import { onMount } from 'svelte';
	import { goto, beforeNavigate, replaceState } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import Meta from '$lib/components/Meta.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { DragHandle, createDragHandler } from '$lib/components/ui/panel';

	import ExternalLinkIcon from '@lucide/svelte/icons/external-link';
	import FileSpreadsheet from '@lucide/svelte/icons/file-spreadsheet';
	import ChartNoAxesCombined from '@lucide/svelte/icons/chart-no-axes-combined';
	import Palette from '@lucide/svelte/icons/palette';
	import ScanText from '@lucide/svelte/icons/scan-text';
	import Share2 from '@lucide/svelte/icons/share-2';
	import StratifyPlotProject from '../_state/StratifyPlotProject.svelte.js';
	import { setStratifyContext } from '../_state/context.js';

	import DataPanel from './panels/DataPanel.svelte';
	import ChartPanel from './panels/ChartPanel.svelte';
	import AnnotatePanel from './panels/AnnotatePanel.svelte';
	import ChartConfig from './ChartConfig.svelte';

	import SeriesPanel from './panels/SeriesPanel.svelte';
	import PublishPanel from './panels/PublishPanel.svelte';
	import ChartPreview from './ChartPreview.svelte';
	import StylePresetPicker from './StylePresetPicker.svelte';
	import ColourPalettePicker from './ColourPalettePicker.svelte';
	import SectionHeader from './SectionHeader.svelte';
	import ExamplePicker from './ExamplePicker.svelte';
	import StratifyHeader from './StratifyHeader.svelte';
	import StratifyButton from './StratifyButton.svelte';
	import ConfirmModal from './ConfirmModal.svelte';
	import { createChart, updateChart, getChart } from '../_utils/api.js';
	import { loadExampleTemplate } from '../_utils/templates.js';

	/** @type {{ initialChartId?: string, templateSlug?: string }} */
	let { initialChartId = '', templateSlug = '' } = $props();

	const project = new StratifyPlotProject();
	setStratifyContext(project);

	const steps = [
		{
			id: 'data',
			icon: FileSpreadsheet,
			label: 'Add data',
			shortLabel: 'Data',
			description: 'Paste CSV or tab-separated data, then check that every column was understood.'
		},
		{
			id: 'chart',
			icon: ChartNoAxesCombined,
			label: 'Choose a chart',
			shortLabel: 'Chart',
			description: 'Pick the chart that answers your question, then map the columns and axes.'
		},
		{
			id: 'theme',
			icon: Palette,
			label: 'Choose a theme',
			shortLabel: 'Theme',
			description: 'Choose the typography and colour palette for your chart.'
		},
		{
			id: 'clarity',
			icon: ScanText,
			label: 'Make it clear',
			shortLabel: 'Clarity',
			description:
				'Write the title and source, refine series and tooltips, then add rules or point callouts.'
		},
		{
			id: 'share',
			icon: Share2,
			label: 'Share',
			shortLabel: 'Share',
			description: 'Save a draft, publish a public link, embed the chart or export a file.'
		}
	];

	const requestedStep = page.url.searchParams.get('step');
	let activeStep = $state(
		steps.some((step) => step.id === requestedStep) ? /** @type {string} */ (requestedStep) : 'data'
	);
	let activeStepIndex = $derived(steps.findIndex((step) => step.id === activeStep));
	let currentStep = $derived(steps[activeStepIndex] ?? steps[0]);
	let completedSteps = $derived(
		/** @type {Record<string, boolean>} */ ({
			data: project.hasData,
			chart: project.hasData,
			theme: project.hasData,
			clarity: project.hasData && Boolean(project.title.trim()),
			share: project.status === 'published'
		})
	);

	let mounted = $state(false);
	let loadingChart = $state(false);

	onMount(async () => {
		mounted = true;
		setActiveStep(activeStep);
		loadingChart = Boolean(initialChartId || templateSlug);

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
		} else if (templateSlug) {
			try {
				await loadExampleTemplate(project, templateSlug, getChart);
			} catch {
				// Missing or unpublished template — stay on an empty builder.
			} finally {
				loadingChart = false;
			}
		}

		markSaved();
	});

	// --- Save to Sanity ---
	/** @type {'idle' | 'saving' | 'saved' | 'error'} */
	let saveStatus = $state('idle');

	/** @type {string | null} JSON of the project state at the last save (or initial load). */
	let lastSavedSnapshotJSON = $state(null);

	const currentSnapshotJSON = $derived(project.hasData ? JSON.stringify(project.toJSON()) : '');
	const isDirty = $derived(
		project.hasData &&
			lastSavedSnapshotJSON !== null &&
			currentSnapshotJSON !== lastSavedSnapshotJSON
	);

	function markSaved() {
		lastSavedSnapshotJSON = JSON.stringify(project.toJSON());
	}

	/** Persist to Sanity. Returns true on success. */
	async function saveProject() {
		if (!project.hasData) return false;
		saveStatus = 'saving';
		try {
			if (project.currentChartId) {
				await updateChart(project.currentChartId, project.toJSON());
			} else {
				const result = await createChart(project.toJSON());
				project.currentChartId = result._id;
			}
			markSaved();
			saveStatus = 'saved';
			setTimeout(() => {
				if (saveStatus === 'saved') saveStatus = 'idle';
			}, 2000);
			return true;
		} catch {
			saveStatus = 'error';
			setTimeout(() => {
				if (saveStatus === 'error') saveStatus = 'idle';
			}, 3000);
			return false;
		}
	}

	/** Manual save via the toolbar button — also routes to the new chart on create. */
	async function handleSave() {
		const wasNew = !project.currentChartId;
		const success = await saveProject();
		if (success && wasNew && project.currentChartId) {
			goto(resolve(`/(micro)/stratify/[id]?step=${activeStep}`, { id: project.currentChartId }), {
				replaceState: true
			});
		}
	}

	// --- Unsaved-changes guards ---

	/** @type {URL | null} */
	let pendingNavigation = $state(null);
	let savingFromModal = $state(false);

	beforeNavigate((navigation) => {
		if (!isDirty) return;
		// Tab close / external nav: trigger the browser's native warning. We
		// can't show a custom modal because the dialog has to be synchronous.
		if (navigation.type === 'leave') {
			navigation.cancel();
			return;
		}
		if (!navigation.to || pendingNavigation) return;
		pendingNavigation = navigation.to.url;
		navigation.cancel();
	});

	/** @param {BeforeUnloadEvent} e */
	function handleBeforeUnload(e) {
		if (!isDirty) return;
		e.preventDefault();
		// Some older browsers still require returnValue to be set.
		e.returnValue = '';
	}

	async function modalSave() {
		savingFromModal = true;
		const success = await saveProject();
		savingFromModal = false;
		if (success) resumePendingNavigation();
	}

	function modalDiscard() {
		markSaved();
		resumePendingNavigation();
	}

	function modalCancel() {
		pendingNavigation = null;
	}

	function resumePendingNavigation() {
		const url = pendingNavigation;
		pendingNavigation = null;
		if (url) goto(url);
	}

	let publishing = $state(false);

	async function handlePublish() {
		if (!project.hasData) return;
		publishing = true;
		try {
			if (!project.currentChartId) {
				const result = await createChart(project.toJSON());
				project.currentChartId = result._id;
				markSaved();
				goto(resolve(`/(micro)/stratify/[id]?step=${activeStep}`, { id: result._id }), {
					replaceState: true
				});
			}
			await updateChart(project.currentChartId, {
				...project.toJSON(),
				status: 'published',
				publishedAt: new Date().toISOString()
			});
			project.status = 'published';
			markSaved();
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
			markSaved();
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
		min: 480,
		max: 780,
		initial: 600,
		storageKey: 'stratify-plot-left-width'
	});

	/** @param {string} stepId */
	function setActiveStep(stepId) {
		if (!steps.some((step) => step.id === stepId)) return;
		activeStep = stepId;
		if (initialChartId) {
			replaceState(
				resolve(`/(micro)/stratify/[id]?step=${stepId}`, { id: initialChartId }),
				page.state
			);
		} else if (templateSlug) {
			replaceState(
				resolve(
					`/(micro)/stratify/new?template=${encodeURIComponent(templateSlug)}&step=${stepId}`
				),
				page.state
			);
		} else {
			replaceState(resolve(`/(micro)/stratify/new?step=${stepId}`), page.state);
		}
	}

	function previousStep() {
		if (activeStepIndex > 0) setActiveStep(steps[activeStepIndex - 1].id);
	}

	function nextStep() {
		if (activeStepIndex < steps.length - 1) setActiveStep(steps[activeStepIndex + 1].id);
	}
</script>

<Meta title="Stratify" description="Create and embed data charts" />

<svelte:window onbeforeunload={handleBeforeUnload} />

<ConfirmModal
	open={pendingNavigation !== null}
	title="Unsaved changes"
	message="You have unsaved changes to this chart. What would you like to do?"
	confirmLabel="Save"
	loading={savingFromModal}
	loadingConfirmLabel="Saving…"
	secondaryLabel="Don't save"
	onconfirm={modalSave}
	onsecondary={modalDiscard}
	oncancel={modalCancel}
/>

{#if !mounted || loadingChart}
	<div class="flex items-center justify-center h-dvh font-mono">
		<p class="text-sm text-mid-grey">Loading chart...</p>
	</div>
{:else}
	<div class="flex h-dvh flex-col overflow-hidden bg-white font-sans">
		<StratifyHeader />

		<!-- Split pane -->
		<div class="flex min-h-0 flex-1 flex-col md:flex-row">
			<!-- Left panel -->
			<div
				class="builder-controls flex min-h-0 shrink-0 flex-col border-b border-warm-grey md:border-b-0"
				style="--builder-panel-width: {leftDrag.value}px;"
			>
				<div class="flex min-h-0 flex-1 flex-col md:flex-row">
					<nav
						class="flex shrink-0 overflow-x-auto border-b border-warm-grey bg-light-warm-grey md:w-56 md:flex-col md:overflow-y-auto md:border-b-0 md:border-r"
						aria-label="Chart-building steps"
					>
						{#each steps as step, index (step.id)}
							{@const StepIcon = step.icon}
							<button
								type="button"
								onclick={() => setActiveStep(step.id)}
								aria-current={activeStep === step.id ? 'step' : undefined}
								class="group relative flex min-w-36 items-center gap-3 border-r border-warm-grey px-4 py-4 text-left text-sm transition-colors md:min-w-0 md:border-b md:border-r-0 md:px-5 md:py-5 {activeStep ===
								step.id
									? 'border-dark-grey bg-dark-grey text-white'
									: 'text-mid-grey hover:bg-white/70 hover:text-dark-grey'}"
							>
								<span
									class="flex size-6 shrink-0 items-center justify-center transition-colors {activeStep ===
									step.id
										? 'text-white'
										: completedSteps[step.id]
											? 'text-red'
											: 'text-mid-grey'}"
								>
									<StepIcon size={18} strokeWidth={1.75} />
									<span class="sr-only">Step {index + 1}</span>
								</span>
								<span class="min-w-0 whitespace-nowrap text-sm font-medium md:whitespace-normal">
									{step.shortLabel}
								</span>
							</button>
						{/each}
					</nav>

					<div class="flex min-h-0 min-w-0 flex-1 flex-col bg-white">
						<header class="border-b border-warm-grey px-6 py-6">
							<div class="mb-3 flex items-start justify-between gap-4">
								<div>
									<p class="mb-1 font-space text-xs font-medium uppercase tracking-wider text-red">
										Step {activeStepIndex + 1} of {steps.length}
									</p>
									<h1 class="mb-0 font-sans text-xl leading-xl font-semibold">
										{currentStep.label}
									</h1>
								</div>
							</div>
							<p class="mb-0 text-sm leading-relaxed text-mid-grey">{currentStep.description}</p>
						</header>

						<div class="min-h-0 flex-1 overflow-y-auto px-6 py-6 md:px-8">
							{#if activeStep === 'data'}
								<DataPanel />
							{:else if activeStep === 'chart'}
								<ChartPanel />
							{:else if activeStep === 'theme'}
								<SectionHeader label="Theme">
									<StylePresetPicker />
								</SectionHeader>
								<SectionHeader label="Colours">
									<ColourPalettePicker />
								</SectionHeader>
							{:else if activeStep === 'clarity'}
								<ChartConfig />
								<SeriesPanel />
								<AnnotatePanel />
							{:else if activeStep === 'share'}
								<PublishPanel />
							{/if}
						</div>

						<footer class="flex items-center justify-between border-t border-warm-grey px-5 py-4">
							<Button variant="outline" onclick={previousStep} disabled={activeStepIndex === 0}>
								Back
							</Button>
							{#if activeStepIndex < steps.length - 1}
								<Button onclick={nextStep}>Next</Button>
							{/if}
						</footer>
					</div>
				</div>
			</div>

			<div class="hidden md:block">
				<DragHandle axis="x" onstart={leftDrag.start} active={leftDrag.isDragging} />
			</div>

			<!-- Right panel: chart bar + preview -->
			<div
				class="flex min-h-0 flex-1 flex-col overflow-hidden bg-light-warm-grey/40 md:border-l md:border-warm-grey"
			>
				<!-- Chart action bar -->
				<div class="flex items-center gap-3 border-b border-warm-grey bg-white px-5 py-3">
					<div class="flex items-center gap-2">
						{#if project.currentChartId}
							{#if project.status === 'published'}
								<a
									href={resolve('/(main)/strata/[id]', { id: project.currentChartId })}
									target="_blank"
									class="inline-flex items-center gap-1 font-space text-xxs font-medium uppercase tracking-wider text-mid-grey hover:text-red hover:no-underline"
								>
									Published link
									<ExternalLinkIcon size={10} />
								</a>
							{:else}
								<span
									class="rounded-full bg-warm-grey px-3 py-1 font-space text-xxxs uppercase tracking-wider text-mid-grey"
									>Draft</span
								>
							{/if}
						{/if}
					</div>

					<div class="ml-auto flex items-center gap-2">
						{#if project.currentChartId}
							{#if project.status === 'published'}
								<StratifyButton onclick={handleUnpublish} disabled={publishing}>
									{publishing ? '...' : 'Unpublish'}
								</StratifyButton>
							{:else}
								<StratifyButton onclick={handlePublish} disabled={!project.hasData || publishing}>
									{publishing ? '...' : 'Publish'}
								</StratifyButton>
							{/if}
						{/if}

						<StratifyButton
							variant="primary"
							onclick={() => handleSave()}
							disabled={!project.hasData || saveStatus === 'saving'}
						>
							{saveButtonLabel}
						</StratifyButton>
					</div>
				</div>

				{#if project.hasData}
					<div class="min-h-0 flex-1 overflow-y-auto p-5 md:p-8">
						<ChartPreview />
					</div>
				{:else}
					<ExamplePicker />
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	.builder-controls {
		width: 100%;
		height: 52%;
	}

	/* Builder controls previously mixed 8–12px utility sizes. Keep every
	   control and supporting label at a readable 14px minimum. */
	.builder-controls :global(.text-xxxs),
	.builder-controls :global(.text-xxs),
	.builder-controls :global(.text-xs),
	.builder-controls :global([class~='text-[8px]']),
	.builder-controls :global([class~='text-[9px]']),
	.builder-controls :global([class~='text-[10px]']) {
		font-size: 1.4rem;
		line-height: 1.8rem;
	}

	/* Native number steppers consume part of the input's content box. The
	   previous 40–50px widths clipped decimal and four-digit values at the
	   builder's larger control type size. */
	.builder-controls :global(input[type='number']) {
		min-width: 8rem;
		font-variant-numeric: tabular-nums;
	}

	@media (min-width: 1024px) {
		.builder-controls {
			width: var(--builder-panel-width);
			height: auto;
		}
	}
</style>
