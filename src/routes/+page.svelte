<script>
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';

	import ispData from '$lib/isp';

	import Meta from '$lib/components/Meta.svelte';
	import InfoGraphicScenariosPreview from '$lib/components/info-graphics/scenarios-explorer/homepage/Preview.svelte';

	import InfoGraphicNem7DayGeneration from '$lib/components/info-graphics/nem-7-day-generation/index.svelte';
	import InfoGraphicFossilFuelsRenewables from '$lib/components/info-graphics/fossil-fuels-renewables/index.svelte';
	import InfoGraphicSystemSnapshot from '$lib/components/info-graphics/system-snapshot/index.svelte';
	import ArticleCard from '$lib/components/articles/ArticleCard.svelte';

	/**
	 * @typedef {Object} Props
	 * @property {import('./$types').PageData} data
	 */

	/** @type {Props} */
	let { data } = $props();

	let regionPower = $state();
	let regionEnergy = $state();
	let regionEmissions = $state();
	let homepageData = $derived(data.homepageData);
	let historyEnergyNemData = $derived(data.historyEnergyNemData);
	let articles = $derived(data.articles);
	let flows = $derived(data.flows);
	let prices = $derived(data.prices);

	onMount(async () => {
		regionPower = await fetch('/api/region-power').then(async (res) => {
			const jsonData = await res.json();
			return jsonData;
		});

		regionEnergy = await fetch('/api/region-energy').then(async (res) => {
			const jsonData = await res.json();
			return jsonData;
		});

		regionEmissions = await fetch('/api/region-emissions').then(async (res) => {
			const jsonData = await res.json();
			return jsonData;
		});
	});

	// const milestones = articles.filter((article) => article.article_type === 'milestone');
	const analysisArticles = articles.filter((article) => article.article_type === 'analysis');

	// const { outlookEnergyNem, pathways, scenarios, fuelTechs } = ispData();

	let outlookEnergyNem = $state(null);

	setTimeout(() => {
		outlookEnergyNem = ispData.aemo2024.outlookEnergyNem;
	}, 250);

	if (!homepageData || homepageData.length === 0) {
		throw new Error('No homepage data found');
	}

	const { banner_title, banner_statement, map_title, analysis_title } = homepageData[0];
</script>

<Meta image="/img/preview.jpg" />

<div class="bg-light-warm-grey py-12" transition:fade={{ duration: 500 }}>
	<div class="container max-w-none lg:container relative">
		<InfoGraphicFossilFuelsRenewables
			data={historyEnergyNemData}
			title={banner_title}
			description={banner_statement}
		/>
	</div>
</div>

<div class="bg-white py-16 md:py-32 border-t border-b border-warm-grey">
	<InfoGraphicNem7DayGeneration />
</div>
{#if regionPower && regionEnergy && regionEmissions}
	<div class="md:bg-light-warm-grey">
		<div class="container max-w-none lg:container">
			<div class="flex flex-col md:flex-row justify-between py-16 md:py-32">
				<InfoGraphicSystemSnapshot
					title={map_title}
					{flows}
					{prices}
					{regionPower}
					{regionEnergy}
					{regionEmissions}
				/>
			</div>
		</div>
	</div>
{/if}

<!-- <div class="bg-white py-16 md:py-32">
		<div class="container max-w-none lg:container">
			<header class="flex justify-between">
				<h3>{milestones_title}</h3>
				<SectionLink href="/analysis" title="View all" />
			</header>
			<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
				{#each milestones as article}
					<ArticleCard {article} />
				{/each}
			</div>
		</div>
	</div> -->

<div class="bg-white py-16 md:py-32 border-t border-b border-warm-grey">
	{#if outlookEnergyNem}
		<InfoGraphicScenariosPreview />
	{/if}
</div>

<div class="bg-white py-16 md:py-32">
	<div class="container max-w-none lg:container">
		<header class="flex justify-between items-center mb-8">
			<h3>{analysis_title}</h3>
			<!-- <SectionLink href="/analysis" title="View all analyses" /> -->
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
