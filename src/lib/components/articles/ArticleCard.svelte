<script>
	import AnalysisCard from './AnalysisCard.svelte';
	import MilestoneCard from './MilestoneCard.svelte';

	/** @type {import('$lib/types/article.types').Article} */
	export let article;
	$: isMilestone = article.article_type === 'milestone';
</script>

{#if isMilestone}
	<MilestoneCard {article} class={$$restProps.class} />
{:else}
	<AnalysisCard {article} class={$$restProps.class} />
{/if}
