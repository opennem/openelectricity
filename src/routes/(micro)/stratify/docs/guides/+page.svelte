<script>
	import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
	import BookOpenIcon from '@lucide/svelte/icons/book-open';
	import Meta from '$lib/components/Meta.svelte';
	import { stratifyGuides } from '$lib/stratify/guide-catalogue.js';
</script>

<Meta
	title="Stratify guides"
	description="Plain-language guides to preparing data, choosing chart settings, annotating and publishing with Stratify."
/>

<header class="border-b border-warm-grey bg-light-warm-grey py-18 md:py-24">
	<div class="container max-w-5xl">
		<p class="mb-4 font-space text-xs font-medium uppercase tracking-widest text-red">
			Stratify guides
		</p>
		<h1
			class="mb-6 max-w-4xl font-sans text-3xl leading-3xl font-semibold md:text-4xl md:leading-4xl"
		>
			Make a clear chart, one decision at a time
		</h1>
		<p class="max-w-3xl text-base leading-relaxed text-mid-grey">
			Short explanations for the settings that matter, written for people who do not work with
			charts every day.
		</p>
	</div>
</header>

<main class="container py-12 md:py-18">
	<div class="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
		{#each stratifyGuides as guide, index (guide.slug)}
			<a
				href="/stratify/docs/guides/{guide.slug}"
				class="group flex min-h-64 flex-col rounded-lg border border-warm-grey p-7 text-dark-grey hover:border-mid-warm-grey hover:no-underline hover:shadow-sm"
			>
				<div class="mb-8 flex items-center justify-between">
					<BookOpenIcon class="size-5 text-red" />
					<span class="font-mono text-xs text-mid-grey">{String(index + 1).padStart(2, '0')}</span>
				</div>
				<h2 class="mb-3 font-sans text-lg leading-lg font-semibold">{guide.title}</h2>
				<p class="mb-6 text-sm leading-relaxed text-mid-grey">{guide.summary}</p>
				<span class="mt-auto inline-flex items-center gap-2 font-space text-xs font-medium"
					>Read guide <ArrowRightIcon size={15} /></span
				>
			</a>
		{/each}
	</div>
</main>
