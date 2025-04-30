<script>
	import AnalysisCard from './AnalysisCard.svelte';
	import MilestoneCard from './MilestoneCard.svelte';

	/**
	 * @typedef {Object} Props
	 * @property {import('$lib/types/article.types').Article} article
	 */

	/** @type {Props & { [key: string]: any }} */
	let { article, preview = false, ...rest } = $props();
	let isMilestone = $derived(article.article_type === 'milestone');
</script>

{#if isMilestone}
	<MilestoneCard {article} {preview} class={rest.class} />
{:else}
	<AnalysisCard {article} {preview} class={rest.class} />
{/if}
