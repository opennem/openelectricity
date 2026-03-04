<script>
	import StratumChart from '$lib/components/charts/v2/StratumChart.svelte';

	/**
	 * @type {{
	 *   project: import('./StratifyProject.svelte.js').default,
	 *   height?: string,
	 *   class?: string
	 * }}
	 */
	let { project, height = 'h-[400px]', class: className = '' } = $props();

	let chart = $derived(project.chartStore);

	$effect(() => {
		chart.chartStyles.chartHeightClasses = height;
	});
</script>

<div class={className}>
	<StratumChart {chart} showOptions={false} enablePan={false}>
		{#snippet header()}
			{#if project.title || project.description}
				<div class="mb-2 px-1">
					{#if project.title}
						<h3 class="text-base font-semibold leading-tight">{project.title}</h3>
					{/if}
					{#if project.description}
						<p class="text-xs text-mid-grey mt-1">{project.description}</p>
					{/if}
				</div>
			{/if}
		{/snippet}

		{#snippet footer()}
			{#if project.dataSource || project.notes}
				<div class="mt-3 px-1 space-y-1">
					{#if project.notes}
						<p class="text-xs text-mid-grey italic">{project.notes}</p>
					{/if}
					{#if project.dataSource}
						<p class="text-xs text-mid-warm-grey">Source: {project.dataSource}</p>
					{/if}
				</div>
			{/if}
		{/snippet}
	</StratumChart>
</div>
