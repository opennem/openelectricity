<script>
	import { browser } from '$app/environment';

	import getModels from '$lib/models/index2';
	import getHistory from '$lib/opennem';

	import PageHeader from '$lib/components/PageHeader.svelte';

	import Explorer from '$lib/components/info-graphics/integrated-system-plan/Explorer/index.svelte';
	import ArticleCard from '$lib/components/articles/ArticleCard.svelte';
	import Meta from '$lib/components/Meta.svelte';

	/** @type {*} */
	export let data;
	const { historyEnergyNemData, articles } = data;

	const analysisArticles = articles.filter(
		(article) => article.tags && article.tags.find((tag) => tag.title === 'ISP')
	);

	let selectedModel = 'aemo2024';
	let selectedRegion = '';
	let selectedDataView = 'energy';
	let modelsData;
	let historyData = historyEnergyNemData;

	$: if (browser && selectedModel) {
		getModels(selectedModel, selectedRegion, selectedDataView).then((data) => (modelsData = data));
	}
	$: if (browser && selectedRegion) {
		getHistory(selectedRegion).then((data) => (historyData = data));
	}
</script>

<Meta
	title="Scenarios"
	description="Open Electricity is a platform for exploring Australia's electricity system."
	image="/img/preview.jpg"
/>

<!-- <PageHeader>
	<div slot="main-heading">
		<div class="lg:my-36">
			<strong class="block py-8 font-space uppercase text-mid-grey font-medium text-sm">
				Scenarios
			</strong>
			<h1>Explore the future of Australia's national electricity market</h1>
		</div>
	</div>
	<div slot="sub-heading">
		<p class="lg:mt-24">
			A range of modelled scenarios exist which envision the evolution of Australia's National
			Electricity Market (NEM) over the coming decades.
		</p>
		<p>
			These scenarios aim to steer Australia towards a cost-effective, reliable and safe energy
			system en route to a zero-emissions electricity network.
		</p>
	</div>
</PageHeader> -->
<div class="bg-light-warm-grey py-6 md:py-4">
	<div class="container max-w-none lg:container md:flex items-center gap-3 md:gap-6">
		<span
			class="inline-block whitespace-nowrap uppercase font-space font-medium tracking-widest text-xs bg-warm-grey py-2 px-4 rounded-full mb-2 md:mb-0"
		>
			Public Beta
		</span>
		<div class="text-mid-grey text-sm font-light">
			This feature is in development. A more detailed Scenarios explorer will be available soon.
		</div>
	</div>
</div>

<div class="mt-12 md:mt-24">
	<Explorer
		{historyData}
		{modelsData}
		on:selected-model={(evt) => (selectedModel = evt.detail)}
		on:selected-region={(evt) => (selectedRegion = evt.detail)}
		on:selected-data-view={(evt) => (selectedDataView = evt.detail)}
	/>
	<!-- <IspExplorer data={{ ispData: dataModels, outlookEnergyNem, historyEnergyNemData }} /> -->
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