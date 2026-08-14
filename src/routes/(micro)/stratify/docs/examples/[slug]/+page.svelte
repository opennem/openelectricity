<script>
	import { browser } from '$app/environment';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import ArrowUpRightIcon from '@lucide/svelte/icons/arrow-up-right';
	import CheckIcon from '@lucide/svelte/icons/check';
	import CopyIcon from '@lucide/svelte/icons/copy';
	import Meta from '$lib/components/Meta.svelte';
	import Button from '$lib/components/form-elements/Button.svelte';
	import Button2 from '$lib/components/form-elements/Button2.svelte';
	import StrataChartView from '$lib/stratify/StrataChartView.svelte';
	import { getChartTypeGuidance } from '$lib/stratify/example-catalogue.js';

	/** @type {{ data: { example: Record<string, any> } }} */
	let { data } = $props();

	let example = $derived(data.example);
	let chart = $derived(example.chart);
	let guidance = $derived(getChartTypeGuidance(example.chartType));
	let copied = $state(false);
	let previewLines = $derived((chart.csvText ?? '').split('\n').slice(0, 9));
	let hasMoreRows = $derived((chart.csvText ?? '').split('\n').length > previewLines.length);
	let config = $derived.by(() => {
		const { csvText: _csvText, _id, ...settings } = chart;
		return JSON.stringify(settings, null, 2);
	});

	async function copyData() {
		if (!browser) return;
		await navigator.clipboard.writeText(chart.csvText ?? '');
		copied = true;
		setTimeout(() => (copied = false), 1800);
	}
</script>

<Meta title={`${example.name} — Stratify example`} description={example.summary} />

<main>
	<header class="border-b border-warm-grey bg-light-warm-grey py-12 md:py-18">
		<div class="container max-w-6xl">
			<a
				href="/stratify/docs"
				class="mb-8 inline-flex items-center gap-2 font-space text-xxs font-medium uppercase tracking-wider text-mid-grey hover:text-red hover:no-underline"
			>
				<ArrowLeftIcon size={14} /> All examples
			</a>
			<div class="grid gap-8 md:grid-cols-[minmax(0,1fr)_280px] md:items-end">
				<div>
					<div class="mb-4 flex flex-wrap items-center gap-3">
						<span class="font-space text-xs font-medium uppercase tracking-wider text-red">
							{guidance?.label ?? example.chartType}
						</span>
						{#if example.sourceKind === 'community'}
							<span
								class="rounded-full bg-warm-grey px-3 py-1 text-xxxs uppercase tracking-wider text-mid-grey"
							>
								Community example
							</span>
						{/if}
					</div>
					<h1
						class="mb-5 max-w-4xl font-sans text-3xl leading-3xl font-semibold md:text-4xl md:leading-4xl"
					>
						{example.name}
					</h1>
					<p class="max-w-3xl text-base leading-relaxed text-mid-grey">{example.summary}</p>
				</div>
				<div class="flex flex-col gap-3">
					<Button href={example.templateHref} class="w-full">
						Use this example <ArrowUpRightIcon size={16} />
					</Button>
					<p class="text-center text-xs text-mid-grey">Loads an unsaved copy after sign-in.</p>
				</div>
			</div>
		</div>
	</header>

	<div class="container max-w-6xl py-12 md:py-18">
		<section class="mb-18 overflow-hidden rounded-lg border border-warm-grey bg-white p-5 md:p-8">
			<StrataChartView {chart} headingTag="h2" />
		</section>

		<div class="grid gap-12 lg:grid-cols-[minmax(0,1fr)_320px]">
			<div class="space-y-16">
				<section aria-labelledby="why-heading">
					<div class="mb-6 border-t-2 border-dark-grey pt-5">
						<p class="mb-2 font-space text-xxs font-medium uppercase tracking-wider text-red">
							Choose it deliberately
						</p>
						<h2 id="why-heading" class="font-sans font-semibold">When this chart works</h2>
					</div>
					<div class="grid gap-4 md:grid-cols-2">
						<div class="rounded-lg border border-warm-grey bg-light-warm-grey p-6">
							<h3 class="mb-2 font-sans text-sm font-semibold">Best for</h3>
							<p class="text-sm leading-relaxed text-mid-grey">{example.bestFor}</p>
						</div>
						<div class="rounded-lg border border-warm-grey p-6">
							<h3 class="mb-2 font-sans text-sm font-semibold">Avoid when</h3>
							<p class="text-sm leading-relaxed text-mid-grey">{example.avoidWhen}</p>
						</div>
					</div>
				</section>

				<section aria-labelledby="steps-heading">
					<div class="mb-6 border-t-2 border-dark-grey pt-5">
						<p class="mb-2 font-space text-xxs font-medium uppercase tracking-wider text-red">
							Builder steps
						</p>
						<h2 id="steps-heading" class="font-sans font-semibold">Make it in Stratify</h2>
					</div>
					<ol class="space-y-4">
						<li class="grid grid-cols-[34px_1fr] gap-4 rounded-lg border border-warm-grey p-5">
							<span
								class="flex size-8 items-center justify-center rounded-full bg-dark-grey font-mono text-xs text-white"
								>1</span
							>
							<div>
								<h3 class="mb-1 font-sans text-sm font-semibold">Add data</h3>
								<p class="text-sm text-mid-grey">
									Paste the CSV shown below and check the parsed column types.
								</p>
							</div>
						</li>
						<li class="grid grid-cols-[34px_1fr] gap-4 rounded-lg border border-warm-grey p-5">
							<span
								class="flex size-8 items-center justify-center rounded-full bg-dark-grey font-mono text-xs text-white"
								>2</span
							>
							<div>
								<h3 class="mb-1 font-sans text-sm font-semibold">Choose a chart</h3>
								<p class="text-sm text-mid-grey">
									Select {guidance?.label ?? example.chartType}; then apply the highlighted
									settings.
								</p>
							</div>
						</li>
						<li class="grid grid-cols-[34px_1fr] gap-4 rounded-lg border border-warm-grey p-5">
							<span
								class="flex size-8 items-center justify-center rounded-full bg-dark-grey font-mono text-xs text-white"
								>3</span
							>
							<div>
								<h3 class="mb-1 font-sans text-sm font-semibold">Make it clear</h3>
								<p class="text-sm text-mid-grey">
									Add the title, units, source, colours and legend shown in the preview.
								</p>
							</div>
						</li>
						<li class="grid grid-cols-[34px_1fr] gap-4 rounded-lg border border-warm-grey p-5">
							<span
								class="flex size-8 items-center justify-center rounded-full bg-dark-grey font-mono text-xs text-white"
								>4</span
							>
							<div>
								<h3 class="mb-1 font-sans text-sm font-semibold">Add context</h3>
								<p class="text-sm text-mid-grey">
									Add annotations only when an event or exact value needs explanation.
								</p>
							</div>
						</li>
						<li class="grid grid-cols-[34px_1fr] gap-4 rounded-lg border border-warm-grey p-5">
							<span
								class="flex size-8 items-center justify-center rounded-full bg-dark-grey font-mono text-xs text-white"
								>5</span
							>
							<div>
								<h3 class="mb-1 font-sans text-sm font-semibold">Share</h3>
								<p class="text-sm text-mid-grey">
									Save the draft, publish a link or export SVG, PNG or JSON.
								</p>
							</div>
						</li>
					</ol>
				</section>

				<section aria-labelledby="data-heading">
					<div
						class="mb-6 flex flex-wrap items-end justify-between gap-4 border-t-2 border-dark-grey pt-5"
					>
						<div>
							<p class="mb-2 font-space text-xxs font-medium uppercase tracking-wider text-red">
								Working data
							</p>
							<h2 id="data-heading" class="mb-0 font-sans font-semibold">CSV to paste</h2>
						</div>
						<Button2 onclick={copyData} class="inline-flex items-center gap-2">
							{#if copied}<CheckIcon size={14} /> Copied{:else}<CopyIcon size={14} /> Copy CSV{/if}
						</Button2>
					</div>
					<div class="overflow-x-auto rounded-lg bg-dark-grey p-5 text-white">
						<pre class="m-0 font-mono text-xs leading-relaxed">{previewLines.join('\n')}{hasMoreRows
								? '\n…'
								: ''}</pre>
					</div>
				</section>
			</div>

			<aside class="space-y-8">
				<section class="rounded-lg border border-warm-grey p-6">
					<p class="mb-4 font-space text-xxs font-medium uppercase tracking-wider text-red">
						Key settings
					</p>
					<dl class="space-y-5">
						{#each example.highlights as highlight (highlight.label)}
							<div>
								<dt class="mb-1 text-xs text-mid-grey">{highlight.label}</dt>
								<dd class="mb-1 font-space text-sm font-medium">{highlight.value}</dd>
								<p class="text-xs leading-relaxed text-mid-grey">{highlight.explanation}</p>
							</div>
						{/each}
					</dl>
				</section>

				<section class="rounded-lg bg-light-warm-grey p-6">
					<p class="mb-4 font-space text-xxs font-medium uppercase tracking-wider text-red">
						What to notice
					</p>
					<ul class="space-y-3">
						{#each example.learningPoints as point (point)}
							<li class="flex gap-3 text-sm leading-relaxed text-mid-grey">
								<CheckIcon class="mt-0.5 size-4 shrink-0 text-red" />
								{point}
							</li>
						{/each}
					</ul>
				</section>

				{#if example.communityHref}
					<a
						href={example.communityHref}
						target="_blank"
						rel="noopener noreferrer"
						class="inline-flex items-center gap-2 font-space text-xs font-medium text-dark-grey hover:text-red hover:no-underline"
					>
						Open the published chart <ArrowUpRightIcon size={15} />
					</a>
				{/if}

				<details class="rounded-lg border border-warm-grey p-5">
					<summary class="cursor-pointer font-space text-xs font-medium"
						>Advanced configuration</summary
					>
					<pre
						class="mt-4 max-h-96 overflow-auto whitespace-pre-wrap font-mono text-xxs leading-relaxed text-mid-grey">{config}</pre>
				</details>
			</aside>
		</div>
	</div>
</main>
