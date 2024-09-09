<script>
	import ArticleCard from '$lib/components/articles/ArticleCard.svelte';

	/** @type {*} */
	export let analysisArticles = [];
</script>

<div class="bg-white py-16 md:py-32">
	<div class="container max-w-none lg:container">
		<header class="flex justify-between items-center mb-8">
			<h3>Related analysis</h3>
		</header>
		<div class="overflow-auto flex items-stretch snap-x snap-mandatory gap-8">
			{#each analysisArticles as article}
				<div class="snap-start shrink-0 w-[290px]">
					<ArticleCard {article} />
				</div>
			{/each}
		</div>
	</div>
</div>
