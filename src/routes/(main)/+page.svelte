<script>
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';

	import ispData from '$lib/isp';

	import FormSelect from '$lib/components/form-elements/Select.svelte';
	import Meta from '$lib/components/Meta.svelte';
	import InfoGraphicScenariosPreview from '$lib/components/info-graphics/scenarios-explorer/homepage/Preview.svelte';
	import InfoGraphicNem7DayGeneration from '$lib/components/info-graphics/nem-7-day-generation/index.svelte';
	import InfoGraphicFossilFuelsRenewables from '$lib/components/info-graphics/fossil-fuels-renewables/index.svelte';
	import InfoGraphicSystemSnapshot from '$lib/components/info-graphics/system-snapshot/index.svelte';
	import ArticleCard from '$lib/components/articles/ArticleCard.svelte';
	import PinnedRecords from './records/components/PinnedRecords.svelte';
	import { regions } from './records/page-data-options/filters.js';

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
	let allNemEnergyData = $derived(data.allNemEnergyData);
	let dailyNemEnergyData = $derived(data.dailyNemEnergyData);
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
	const analysisArticles = articles
		.filter((article) => article.article_type === 'analysis')
		.slice(0, 4);

	// const { outlookEnergyNem, pathways, scenarios, fuelTechs } = ispData();

	let outlookEnergyNem = $state(null);

	setTimeout(() => {
		outlookEnergyNem = ispData.aemo2024.outlookEnergyNem;
	}, 250);

	if (!homepageData || homepageData.length === 0) {
		throw new Error('No homepage data found');
	}

	const { banner_title, banner_statement, map_title, analysis_title } = homepageData[0];

	let selectedRecordRegion = $state('');
	let selectedRegions = $derived(selectedRecordRegion ? [selectedRecordRegion] : []);
	let regionOptions = $derived(
		regions
			.filter((r) => r.value && r.longLabel)
			.map((r) => ({
				label: r.longLabel,
				value: r.value
			}))
	);
</script>

<Meta image="/img/preview.jpg" />

<div class="bg-light-warm-grey py-12" in:fade={{ duration: 400 }}>
	<div class="container max-w-none lg:container relative">
		<InfoGraphicFossilFuelsRenewables
			{dailyNemEnergyData}
			{allNemEnergyData}
			title={banner_title}
			description={banner_statement}
		/>
	</div>
</div>

<div class="bg-white py-16 md:py-32 border-t border-b border-warm-grey">
	<InfoGraphicNem7DayGeneration />
</div>

<div class="bg-light-warm-grey py-16 md:py-32 border-b border-warm-grey">
	<div class="max-w-none md:container">
		<h3 class="md:text-center px-10 md:px-0">Notable records</h3>

		<div class="mb-3 mt-5 px-7 md:px-5">
			<FormSelect
				paddingY="py-2"
				paddingX="px-3"
				options={[{ label: 'All regions', value: '' }, ...regionOptions]}
				selected={selectedRecordRegion}
				formLabel="All regions"
				on:change={(evt) => (selectedRecordRegion = evt.detail.value)}
			/>
		</div>

		<PinnedRecords {selectedRegions} showRegionLabel={selectedRecordRegion === ''} />

		<div class="flex justify-end mt-5 md:mt-16 px-10 md:px-0">
			<a
				href="/records"
				class="mt-12 md:mt-0 block w-full md:w-auto text-center rounded-xl font-space border border-black border-solid p-6 transition-all text-white bg-black hover:bg-dark-grey hover:no-underline"
			>
				View records
			</a>
		</div>
	</div>
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
