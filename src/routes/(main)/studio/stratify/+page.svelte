<script>
	import { getContext, onMount, onDestroy } from 'svelte';
	import Meta from '$lib/components/Meta.svelte';

	import StratifyProject from '$lib/stratify/StratifyProject.svelte.js';
	import { setStratifyContext } from './_state/context.js';

	import DataPanel from './_components/panels/DataPanel.svelte';
	import ChartPanel from './_components/panels/ChartPanel.svelte';
	import AnnotatePanel from './_components/panels/AnnotatePanel.svelte';
	import SeriesPanel from './_components/panels/SeriesPanel.svelte';
	import PublishPanel from './_components/panels/PublishPanel.svelte';
	import ChartPreview from './_components/ChartPreview.svelte';
	import ExamplePicker from './_components/ExamplePicker.svelte';
	import { DragHandle } from '$lib/components/ui/panel';
	import { createDragHandler } from './_utils/drag-resize.svelte.js';
	import AccordionSection from './_components/AccordionSection.svelte';

	// Hide nav/footer for full-screen builder layout
	const layout = getContext('layout-fullscreen');
	onMount(() => layout.setFullscreen(true));
	onDestroy(() => layout.setFullscreen(false));

	// Centralised project state — all builder state lives here
	const project = new StratifyProject();
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

	// Prevent SSR/hydration flash from localStorage-driven widths
	let mounted = $state(false);
	onMount(() => {
		mounted = true;
	});

	// Resizable left panel
	const leftDrag = createDragHandler({
		axis: 'x',
		min: 280,
		max: 600,
		initial: 380,
		storageKey: 'stratify-left-width'
	});
</script>

<Meta title="Stratify" description="Create and embed data charts" />

{#if mounted}
<div class="flex flex-col h-dvh overflow-hidden font-mono">
	<!-- Header bar -->
	<div class="flex items-center gap-3 px-4 py-2 border-b border-warm-grey bg-light-warm-grey/50">
		<a
			href="/studio"
			class="text-mid-grey transition-colors hover:text-dark-grey"
			title="Back to Studio"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="14"
				height="14"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<path d="M19 12H5" />
				<path d="m12 19-7-7 7-7" />
			</svg>
		</a>
		<span class="text-[11px] font-medium text-dark-grey tracking-wide uppercase">Stratify</span>
	</div>

	<!-- Split pane -->
	<div class="flex flex-1 min-h-0">
		<!-- Left panel: accordion sections -->
		<div
			class="flex-shrink-0 flex flex-col min-h-0 overflow-y-auto"
			style="width: {leftDrag.value}px;"
		>
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
