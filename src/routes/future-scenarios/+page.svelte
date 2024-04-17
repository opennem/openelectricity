<script>
	import ispData from '$lib/isp';
	import InfoGraphicISP from '$lib/components/info-graphics/integrated-system-plan/index.svelte';
	import ArticleCard from '$lib/components/articles/ArticleCard.svelte';
	import Meta from '$lib/components/Meta.svelte';

	/** @type {*} */
	export let data;
	const { historyEnergyNemData, articles } = data;
	const isp = ispData();
	const outlookEnergyNem = isp.aemo2024.outlookEnergyNem;
	const analysisArticles = articles.filter(
		(article) => article.tags && article.tags.find((tag) => tag.title === 'ISP')
	);
</script>

<Meta
	title="Future Scenarios"
	description="Open Electricity is a platform for exploring Australia's electricity system."
	image="/img/preview.jpg"
/>

<div class="bg-light-warm-grey py-6 md:py-4">
	<div class="container max-w-none lg:container md:flex items-center gap-3 md:gap-6">
		<span
			class="inline-block whitespace-nowrap uppercase font-space font-medium tracking-widest text-xs bg-warm-grey py-2 px-4 rounded-full mb-2 md:mb-0"
		>
			Public Beta
		</span>
		<div class="text-mid-grey text-sm font-light">
			This feature is in development. A more detailed Future Scenarios explorer will be available
			soon.
		</div>
	</div>
</div>

<div class="mt-12 md:mt-24">
	<InfoGraphicISP data={{ ispData: isp, outlookEnergyNem, historyEnergyNemData }} />
</div>

<div class="bg-white py-16 md:py-32">
	<div class="container max-w-none lg:container">
		<header class="flex justify-between items-center mb-8">
			<h3>Related analysis</h3>
		</header>
		<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
			{#each analysisArticles as article}
				<ArticleCard {article} />
			{/each}
		</div>
	</div>
</div>
