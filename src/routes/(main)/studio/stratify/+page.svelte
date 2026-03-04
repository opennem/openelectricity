<script>
	import { getContext, onMount, onDestroy } from 'svelte';
	import Meta from '$lib/components/Meta.svelte';

	import StratifyProject from '$lib/stratify/StratifyProject.svelte.js';
	import { setStratifyContext } from './_state/context.js';

	import TabBar from './_components/TabBar.svelte';
	import DataPanel from './_components/panels/DataPanel.svelte';
	import ChartPanel from './_components/panels/ChartPanel.svelte';
	import AnnotatePanel from './_components/panels/AnnotatePanel.svelte';
	import SeriesPanel from './_components/panels/SeriesPanel.svelte';
	import PublishPanel from './_components/panels/PublishPanel.svelte';
	import ChartPreview from './_components/ChartPreview.svelte';
	import ExamplePicker from './_components/ExamplePicker.svelte';

	// Hide nav/footer for full-screen builder layout
	const layout = getContext('layout-fullscreen');
	onMount(() => layout.setFullscreen(true));
	onDestroy(() => layout.setFullscreen(false));

	// Centralised project state — all builder state lives here
	const project = new StratifyProject();
	setStratifyContext(project);

	const tabs = [
		{ id: 'data', label: 'Data' },
		{ id: 'chart', label: 'Chart' },
		{ id: 'annotate', label: 'Annotate' },
		{ id: 'series', label: 'Series' },
		{ id: 'publish', label: 'Publish' }
	];

	/** @type {string} */
	let activeTab = $state('data');
</script>

<Meta title="Stratify" description="Create and embed data charts" />

<div class="flex h-[calc(100vh-64px)] flex-col">
	<!-- Top bar -->
	<div class="flex items-center justify-between border-b border-mid-warm-grey px-6 py-3">
		<div class="flex items-center gap-3">
			<a
				href="/studio"
				class="text-mid-grey transition-colors hover:text-black"
				title="Back to Studio"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="18"
					height="18"
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
			<h1 class="text-lg font-semibold tracking-wide">Stratify</h1>
		</div>
	</div>

	<!-- Split pane -->
	<div class="flex flex-1 overflow-hidden">
		<!-- Left panel: tabs + content -->
		<div class="flex w-[380px] shrink-0 flex-col border-r border-mid-warm-grey">
			<div class="px-4 pt-3">
				<TabBar {tabs} bind:active={activeTab} />
			</div>

			<div class="flex-1 overflow-y-auto p-6">
				{#if activeTab === 'data'}
					<DataPanel />
				{:else if activeTab === 'chart'}
					<ChartPanel />
				{:else if activeTab === 'annotate'}
					<AnnotatePanel />
				{:else if activeTab === 'series'}
					<SeriesPanel />
				{:else if activeTab === 'publish'}
					<PublishPanel />
				{/if}
			</div>
		</div>

		<!-- Right panel: chart preview -->
		<div class="flex flex-1 flex-col overflow-y-auto p-6">
			{#if project.hasData}
				<div class="flex-1">
					<ChartPreview />
				</div>
			{:else}
				<ExamplePicker />
			{/if}
		</div>
	</div>
</div>
