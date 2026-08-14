<script>
	import SearchIcon from '@lucide/svelte/icons/search';
	import BookOpenIcon from '@lucide/svelte/icons/book-open';
	import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
	import Meta from '$lib/components/Meta.svelte';
	import { CHART_TYPES } from '$lib/stratify/chart-types.js';
	import { CHART_TYPE_GUIDANCE, getChartTypeGuidance } from '$lib/stratify/example-catalogue.js';
	import { buildDocumentationCatalogue } from '$lib/stratify/example-docs.js';
	import { stratifyGuides } from '$lib/stratify/guide-catalogue.js';
	import ExampleCard from './_components/ExampleCard.svelte';

	/** @type {{ data: { communityCharts: Array<Record<string, any>> } }} */
	let { data } = $props();

	let search = $state('');
	let selectedType = $state('all');
	let catalogue = $derived(buildDocumentationCatalogue(data.communityCharts));
	let filteredExamples = $derived.by(() => {
		const query = search.trim().toLowerCase();
		return catalogue.filter((example) => {
			if (selectedType !== 'all' && example.chartType !== selectedType) return false;
			if (!query) return true;
			return [
				example.name,
				example.summary,
				example.purpose,
				getChartTypeGuidance(example.chartType)?.label,
				...(example.learningPoints ?? [])
			]
				.join(' ')
				.toLowerCase()
				.includes(query);
		});
	});
</script>

<Meta
	title="Stratify chart examples"
	description="Learn to make clear, publishable charts with Stratify through practical examples and plain-language guidance."
/>

<header class="border-b border-warm-grey bg-light-warm-grey py-18 md:py-24">
	<div class="container max-w-5xl text-center">
		<p class="mb-4 font-space text-xs font-medium uppercase tracking-widest text-red">
			Stratify documentation
		</p>
		<h1
			class="mx-auto mb-6 max-w-4xl font-sans text-3xl leading-3xl font-semibold md:text-4xl md:leading-4xl"
		>
			Start with a chart you can understand
		</h1>
		<p class="mx-auto max-w-3xl text-base leading-relaxed text-mid-grey">
			Choose a chart type, see working data and settings, then open an unsaved copy in Stratify. No
			charting vocabulary required.
		</p>
	</div>
</header>

<main class="container py-12 md:py-18">
	<section aria-labelledby="examples-heading">
		<div class="mb-8 border-t-2 border-dark-grey pt-6">
			<p class="mb-2 font-space text-xs font-medium uppercase tracking-wider text-red">
				Examples by chart type
			</p>
			<div class="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
				<div>
					<h2 id="examples-heading" class="mb-2 font-sans font-semibold">Choose a chart</h2>
					<p class="max-w-2xl text-sm text-mid-grey">
						Not sure which one to use? Start with the question your data needs to answer.
					</p>
				</div>
				<label class="relative block w-full md:max-w-sm">
					<span class="sr-only">Search examples</span>
					<SearchIcon class="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-mid-grey" />
					<input
						type="search"
						bind:value={search}
						placeholder="Search examples and features"
						class="w-full rounded-lg border border-warm-grey bg-white py-3 pl-11 pr-4 text-sm focus:border-red focus:outline-none focus:ring-1 focus:ring-red"
					/>
				</label>
			</div>
		</div>

		<div class="mb-8 flex gap-2 overflow-x-auto pb-2" aria-label="Filter by chart type">
			<button
				type="button"
				onclick={() => (selectedType = 'all')}
				class="whitespace-nowrap rounded-full px-5 py-2 font-space text-xxs font-medium uppercase tracking-wider {selectedType ===
				'all'
					? 'bg-dark-grey text-white'
					: 'border border-warm-grey text-mid-grey hover:border-dark-grey hover:text-dark-grey'}"
			>
				All
			</button>
			{#each CHART_TYPES as type (type.value)}
				<button
					type="button"
					onclick={() => (selectedType = type.value)}
					class="whitespace-nowrap rounded-full px-5 py-2 font-space text-xxs font-medium uppercase tracking-wider {selectedType ===
					type.value
						? 'bg-dark-grey text-white'
						: 'border border-warm-grey text-mid-grey hover:border-dark-grey hover:text-dark-grey'}"
				>
					{CHART_TYPE_GUIDANCE[type.value]?.label ?? type.label}
				</button>
			{/each}
		</div>

		{#if filteredExamples.length}
			<div class="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
				{#each filteredExamples as example (example.slug)}
					<ExampleCard {example} />
				{/each}
			</div>
		{:else}
			<div class="rounded-lg border border-dashed border-mid-warm-grey py-20 text-center">
				<p class="mb-2 font-sans text-base font-semibold">No examples match that search</p>
				<button
					type="button"
					onclick={() => {
						search = '';
						selectedType = 'all';
					}}
					class="text-sm text-red hover:underline"
				>
					Clear filters
				</button>
			</div>
		{/if}
	</section>

	<section class="mt-24 border-t-2 border-dark-grey pt-6" aria-labelledby="guides-heading">
		<div class="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
			<div>
				<p class="mb-2 font-space text-xs font-medium uppercase tracking-wider text-red">
					Plain-language guides
				</p>
				<h2 id="guides-heading" class="mb-2 font-sans font-semibold">Learn one part at a time</h2>
			</div>
			<a
				href="/stratify/docs/guides"
				class="inline-flex items-center gap-2 font-space text-xs font-medium text-dark-grey hover:text-red hover:no-underline"
			>
				Browse all guides <ArrowRightIcon size={15} />
			</a>
		</div>
		<div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
			{#each stratifyGuides.slice(0, 6) as guide (guide.slug)}
				<a
					href="/stratify/docs/guides/{guide.slug}"
					class="group rounded-lg border border-warm-grey p-6 text-dark-grey hover:border-mid-warm-grey hover:no-underline hover:shadow-sm"
				>
					<BookOpenIcon class="mb-5 size-5 text-red" />
					<h3 class="mb-2 font-sans text-base font-semibold">{guide.title}</h3>
					<p class="text-sm leading-relaxed text-mid-grey">{guide.summary}</p>
				</a>
			{/each}
		</div>
	</section>
</main>
