<script>
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
	import Meta from '$lib/components/Meta.svelte';

	/** @type {{ data: { guide: Record<string, any>, previous: Record<string, any> | null, next: Record<string, any> | null } }} */
	let { data } = $props();
</script>

<Meta title={`${data.guide.title} — Stratify guide`} description={data.guide.summary} />

<main class="container max-w-5xl py-12 md:py-18">
	<a
		href="/stratify/docs/guides"
		class="mb-10 inline-flex items-center gap-2 font-space text-xxs font-medium uppercase tracking-wider text-mid-grey hover:text-red hover:no-underline"
	>
		<ArrowLeftIcon size={14} /> All guides
	</a>

	<header class="mb-14 border-t-2 border-dark-grey pt-6">
		<p class="mb-3 font-space text-xs font-medium uppercase tracking-wider text-red">
			Plain-language guide
		</p>
		<h1
			class="mb-6 max-w-4xl font-sans text-3xl leading-3xl font-semibold md:text-4xl md:leading-4xl"
		>
			{data.guide.title}
		</h1>
		<p class="max-w-3xl text-lg leading-relaxed text-mid-grey">{data.guide.introduction}</p>
	</header>

	<article class="max-w-3xl space-y-14">
		{#each data.guide.sections as section, index (section.heading)}
			<section>
				<div class="mb-5 flex items-center gap-4">
					<span
						class="flex size-9 shrink-0 items-center justify-center rounded-full bg-dark-grey font-mono text-xs text-white"
						>{index + 1}</span
					>
					<h2 class="mb-0 font-sans text-xl leading-xl font-semibold">{section.heading}</h2>
				</div>
				<p class="text-base leading-relaxed text-mid-grey">{section.body}</p>
				{#if section.points}
					<ul class="mt-5 list-disc space-y-2 pl-7 text-sm leading-relaxed text-mid-grey">
						{#each section.points as point (point)}<li>{point}</li>{/each}
					</ul>
				{/if}
			</section>
		{/each}
	</article>

	<nav
		class="mt-20 grid gap-4 border-t border-warm-grey pt-8 md:grid-cols-2"
		aria-label="Guide navigation"
	>
		{#if data.previous}
			<a
				href="/stratify/docs/guides/{data.previous.slug}"
				class="rounded-lg border border-warm-grey p-5 text-dark-grey hover:border-mid-warm-grey hover:no-underline"
			>
				<span
					class="mb-2 flex items-center gap-2 font-space text-xxs uppercase tracking-wider text-mid-grey"
					><ArrowLeftIcon size={14} /> Previous</span
				>
				<strong class="font-sans text-sm font-semibold">{data.previous.title}</strong>
			</a>
		{:else}<span></span>{/if}
		{#if data.next}
			<a
				href="/stratify/docs/guides/{data.next.slug}"
				class="rounded-lg border border-warm-grey p-5 text-right text-dark-grey hover:border-mid-warm-grey hover:no-underline"
			>
				<span
					class="mb-2 flex items-center justify-end gap-2 font-space text-xxs uppercase tracking-wider text-mid-grey"
					>Next <ArrowRightIcon size={14} /></span
				>
				<strong class="font-sans text-sm font-semibold">{data.next.title}</strong>
			</a>
		{/if}
	</nav>
</main>
