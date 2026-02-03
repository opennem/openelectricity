<script>
	import { onMount, tick } from 'svelte';
	import { fade } from 'svelte/transition';
	import { browser } from '$app/environment';

	import FormSelect from '$lib/components/form-elements/Select.svelte';
	import Meta from '$lib/components/Meta.svelte';
	import Skeleton from '$lib/components/Skeleton.svelte';
	import LogoMarkLoader from '$lib/components/LogoMarkLoader.svelte';
	import InfoGraphicNem7DayGenerationV2 from '$lib/components/info-graphics/nem-7-day-generation-v2/index.svelte';
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

	// All data now comes from server load - no client-side fetches needed
	let homepageData = $derived(data.homepageData);
	let historyEnergyNemData = $derived(data.historyEnergyNemData);
	let articles = $derived(data.articles);
	let flows = $derived(data.flows);
	let prices = $derived(data.prices);
	let pinnedRecords = $derived(data.pinnedRecords);
	let regionPower = $derived(data.regionPower);
	let regionEnergy = $derived(data.regionEnergy);
	let regionEmissions = $derived(data.regionEmissions);
	let tracker7dProcessed = $derived(data.tracker7dProcessed);

	// Derived loading states
	let hasRegionData = $derived(regionPower && regionEnergy && regionEmissions);
	let hasArticles = $derived(articles && articles.length > 0);

	// Staggered chart rendering - load charts one at a time to avoid blocking
	let heroChartReady = $state(false);
	let trackerChartReady = $state(false);

	// const milestones = articles.filter((article) => article.article_type === 'milestone');
	let analysisArticles = $derived(
		articles?.filter((article) => article.article_type === 'analysis').slice(0, 6) ?? []
	);

	// Lazy load ScenariosPreview when it comes into view
	/** @type {HTMLElement} */
	let scenariosSection;
	let showScenarios = $state(false);
	/** @type {any} */
	let ScenariosPreviewComponent = $state(null);

	onMount(() => {
		if (!browser) return;

		// Load hero chart immediately
		heroChartReady = true;

		// Load tracker chart after hero chart line animation completes
		setTimeout(() => {
			trackerChartReady = true;
		}, 4000);

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting) {
					// Dynamically import the heavy component when visible
					import('$lib/components/info-graphics/scenarios-explorer/homepage/Preview.svelte').then(
						(module) => {
							ScenariosPreviewComponent = module.default;
							showScenarios = true;
						}
					);
					observer.disconnect();
				}
			},
			{ rootMargin: '200px' } // Start loading 200px before it comes into view
		);

		if (scenariosSection) {
			observer.observe(scenariosSection);
		}

		return () => observer.disconnect();
	});

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

<!-- Hero Section: Fossil Fuels vs Renewables -->
<div class="bg-light-warm-grey py-12" in:fade={{ duration: 400 }}>
	<div class="container max-w-none lg:container relative">
		{#if historyEnergyNemData && heroChartReady}
			<InfoGraphicFossilFuelsRenewables
				data={historyEnergyNemData}
				title={banner_title}
				description={banner_statement}
			/>
		{:else}
			<!-- Hero placeholder -->
			<div class="relative">
				<Skeleton variant="chart" />
				<div class="absolute inset-0 flex items-center justify-center">
					<LogoMarkLoader />
				</div>
			</div>
		{/if}
	</div>
</div>

<!-- NEM 7-Day Generation (v2 with server-side processing) -->
<div class="bg-white py-16 md:py-32 border-t border-b border-warm-grey">
	{#if tracker7dProcessed?.data && trackerChartReady}
		<InfoGraphicNem7DayGenerationV2 initialData={tracker7dProcessed} />
	{:else}
		<!-- 7-day chart placeholder -->
		<div class="container max-w-none lg:container">
			<div class="relative">
				<Skeleton variant="chart" />
				<div class="absolute inset-0 flex items-center justify-center">
					<LogoMarkLoader />
				</div>
			</div>
		</div>
	{/if}
</div>

<!-- Notable Records -->
<div class="bg-light-warm-grey py-16 md:py-32 border-b border-warm-grey">
	<div class="max-w-none md:container">
		<h3 class="md:text-center px-10 md:px-0">Notable records</h3>

		<div class="mb-3 mt-5 px-7 md:px-5 text-base">
			<FormSelect
				paddingY="py-2"
				paddingX="px-3"
				options={[{ label: 'All regions', value: '' }, ...regionOptions]}
				selected={selectedRecordRegion}
				formLabel="All regions"
				onchange={(opt) => (selectedRecordRegion = opt.value)}
			/>
		</div>

		<PinnedRecords
			{selectedRegions}
			showRegionLabel={selectedRecordRegion === ''}
			initialData={pinnedRecords}
		/>

		<div class="flex justify-end mt-5 md:mt-16 px-10 md:px-0">
			<a
				href="/records"
				class="text-base mt-12 md:mt-0 block w-full md:w-auto text-center rounded-xl font-space border border-black border-solid p-6 transition-all text-white bg-black hover:bg-dark-grey hover:no-underline"
			>
				View records
			</a>
		</div>
	</div>
</div>

<!-- System Snapshot Map -->
<div class="md:bg-light-warm-grey">
	<div class="container max-w-none lg:container">
		<div class="flex flex-col md:flex-row justify-between py-16 md:py-32">
			{#if hasRegionData}
				<InfoGraphicSystemSnapshot
					title={map_title}
					{flows}
					{prices}
					{regionPower}
					{regionEnergy}
					{regionEmissions}
				/>
			{:else}
				<!-- Map skeleton -->
				<div class="w-full md:w-1/2 space-y-4">
					<Skeleton variant="card" class="h-[400px]" />
				</div>
				<div class="w-full md:w-1/2 md:pl-8 space-y-4 mt-8 md:mt-0">
					<Skeleton variant="text" class="w-48" />
					<div class="space-y-3">
						{#each Array(5) as _}
							<div class="flex justify-between items-center gap-4">
								<Skeleton variant="text" class="w-16" />
								<Skeleton variant="text" class="w-24" />
								<Skeleton variant="text" class="w-20" />
							</div>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>

<!-- Lazy-loaded Scenarios Preview section -->
<div
	bind:this={scenariosSection}
	class="bg-white py-16 md:py-32 border-t border-b border-warm-grey text-base"
>
	{#if showScenarios && ScenariosPreviewComponent}
		<svelte:component this={ScenariosPreviewComponent} />
	{:else}
		<!-- Scenarios skeleton -->
		<div class="container max-w-none lg:container">
			<div class="text-center mb-8">
				<Skeleton variant="text" class="w-64 mx-auto mb-4" />
				<Skeleton variant="text" class="w-96 mx-auto" />
			</div>
			<Skeleton variant="chart" class="h-[350px] rounded-xl" />
		</div>
	{/if}
</div>

<!-- Analysis Articles -->
<div class="bg-white py-16 md:py-32">
	<div class="container max-w-none lg:container">
		<header class="flex justify-between items-center mb-8">
			<h3>{analysis_title}</h3>
		</header>

		{#if hasArticles && analysisArticles.length > 0}
			<div class="overflow-auto flex items-stretch snap-x snap-mandatory gap-8">
				{#each analysisArticles as article (article._id)}
					<div class="snap-start shrink-0 w-[290px]">
						<ArticleCard {article} />
					</div>
				{/each}
			</div>
		{:else}
			<!-- Articles skeleton -->
			<div class="overflow-auto flex items-stretch snap-x snap-mandatory gap-8">
				{#each Array(4) as _, i (i)}
					<div class="snap-start shrink-0 w-[290px] space-y-4">
						<Skeleton variant="card" class="h-40 rounded-lg" />
						<Skeleton variant="text" class="w-full" />
						<Skeleton variant="text" class="w-3/4" />
						<Skeleton variant="text" class="w-1/2" />
					</div>
				{/each}
			</div>
		{/if}

		<div class="flex justify-end mt-5 md:mt-16 lg:mr-8">
			<a
				href="/analysis"
				class="text-base mt-12 md:mt-0 block w-full md:w-auto text-center rounded-xl font-space border border-black border-solid p-6 transition-all text-white bg-black hover:bg-dark-grey hover:no-underline"
			>
				View analysis
			</a>
		</div>
	</div>
</div>
