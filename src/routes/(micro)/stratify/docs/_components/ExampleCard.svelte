<script>
	import ArrowUpRight from '@lucide/svelte/icons/arrow-up-right';
	import ExamplePreview from './ExamplePreview.svelte';
	import { getChartTypeGuidance } from '$lib/stratify/example-catalogue.js';
	import * as Card from '$lib/components/ui/card/index.js';

	/** @type {{ example: Record<string, any> }} */
	let { example } = $props();

	let guidance = $derived(getChartTypeGuidance(example.chartType));
</script>

<Card.Root
	class="group flex h-full flex-col gap-0 overflow-hidden bg-white py-0 shadow-none transition hover:border-mid-warm-grey hover:shadow-sm"
>
	<a href={example.href} class="block border-b border-warm-grey" aria-label={example.name}>
		<ExamplePreview chart={example.chart} />
	</a>
	<div class="flex flex-1 flex-col p-6">
		<div class="mb-4 flex items-center justify-between gap-3">
			<span class="font-space text-xxs font-medium uppercase tracking-wider text-red">
				{guidance?.label ?? example.chartType}
			</span>
			{#if example.sourceKind === 'community'}
				<span
					class="rounded-full bg-warm-grey px-3 py-1 text-xxxs uppercase tracking-wider text-mid-grey"
				>
					Community
				</span>
			{/if}
		</div>
		<h2 class="mb-2 font-sans text-lg leading-lg font-semibold">{example.name}</h2>
		<p class="mb-6 text-sm leading-relaxed text-mid-grey">{example.summary}</p>
		<a
			href={example.href}
			class="mt-auto inline-flex items-center gap-2 font-space text-xs font-medium text-dark-grey hover:text-red hover:no-underline"
		>
			See how it is made
			<ArrowUpRight size={15} />
		</a>
	</div>
</Card.Root>
