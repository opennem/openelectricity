<script>
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';

	import ispData from '$lib/isp';
	import { parsedFeatureFlags } from '$lib/stores/app';

	import FormMultiSelect from '$lib/components/form-elements/MultiSelect.svelte';
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

	let selectedRegions = $state([]);
	let regionOptions = $derived(
		regions.map((r) => ({
			label: r.label,
			value: r.value,
			divider: r.divider,
			labelClassName: regions?.find((m) => m.value === r.longValue)
				? ''
				: 'italic text-mid-warm-grey'
		}))
	);

	/**
	 * @param {string} value
	 * @param {boolean} isMetaPressed
	 */
	function handleRegionChange(value, isMetaPressed) {
		if (isMetaPressed) {
			selectedRegions = [value];
		} else if (selectedRegions.includes(value)) {
			selectedRegions = selectedRegions.filter((item) => item !== value);
		} else {
			selectedRegions = [...selectedRegions, value];
		}
	}
</script>

<Meta image="/img/preview.jpg" />

<div class="bg-light-warm-grey py-12" in:fade={{ duration: 400 }}>
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

{#if parsedFeatureFlags['show_records']}
	<div class="bg-light-warm-grey py-16 md:py-32 border-b border-warm-grey">
		<div class="container max-w-none lg:container">
			<h3 class="text-center">Notable records</h3>

			<div class="inline-flex mb-3">
				<FormMultiSelect
					options={regionOptions}
					selected={selectedRegions}
					label={selectedRegions.length ? `Region (${selectedRegions.length})` : 'Region'}
					paddingX="pl-5 pr-4"
					paddingY="py-3"
					on:change={(evt) => handleRegionChange(evt.detail.value, evt.detail.isMetaPressed)}
				/>
			</div>

			<PinnedRecords {selectedRegions} />

			<div class="flex justify-end mt-16">
				<a
					href="/records"
					class="mt-12 md:mt-0 block text-center rounded-xl font-space border border-black border-solid p-6 transition-all text-white bg-black hover:bg-dark-grey hover:no-underline"
				>
					View records
				</a>
			</div>
		</div>
	</div>
{/if}

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
