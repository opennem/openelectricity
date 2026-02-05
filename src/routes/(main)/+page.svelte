<script>
	import { onMount, tick } from 'svelte';
	import { fade } from 'svelte/transition';
	import { browser } from '$app/environment';
	import { isSafari } from '$lib/utils/browser-detect';

	import FormSelect from '$lib/components/form-elements/Select.svelte';
	import Meta from '$lib/components/Meta.svelte';
	import Skeleton from '$lib/components/Skeleton.svelte';
	import LogoMarkLoader from '$lib/components/LogoMarkLoader.svelte';
	import InfoGraphicNem7DayGenerationV2 from '$lib/components/info-graphics/nem-7-day-generation-v2/index.svelte';
	import InfoGraphicFossilFuelsRenewables from '$lib/components/info-graphics/fossil-fuels-renewables/index.svelte';
	import ArticleCard from '$lib/components/articles/ArticleCard.svelte';
	import PinnedRecords from './records/components/PinnedRecords.svelte';
	import { regions } from './records/page-data-options/filters.js';

	/**
	 * @typedef {Object} Props
	 * @property {import('./$types').PageData} data
	 */

	/** @type {Props} */
	let { data } = $props();

	// Server-side data
	let homepageData = $derived(data.homepageData);
	let historyEnergyNemData = $derived(data.historyEnergyNemData);
	let articles = $derived(data.articles);
	let flows = $derived(data.flows);
	let prices = $derived(data.prices);
	let tracker7dProcessed = $derived(data.tracker7dProcessed);

	// Client-side fetched data (these APIs make multiple external calls that can timeout on Cloudflare SSR)
	/** @type {any} */
	let regionPower = $state(null);
	/** @type {any} */
	let regionEnergy = $state(null);
	/** @type {any} */
	let regionEmissions = $state(null);

	// Derived loading states
	let hasRegionData = $derived(regionPower && regionEnergy && regionEmissions);
	let hasArticles = $derived(articles && articles.length > 0);

	// Staggered chart rendering - load charts one at a time to avoid blocking
	let heroChartReady = $state(false);
	let trackerChartReady = $state(false);

	// Skip hero animation if user has visited before (localStorage with 1 month expiry)
	const HERO_ANIMATION_KEY = 'oe_hero_animation_seen';
	const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000;
	let skipHeroAnimation = $state(false);

	function checkHeroAnimationSeen() {
		if (!browser) return false;
		try {
			const stored = localStorage.getItem(HERO_ANIMATION_KEY);
			if (stored) {
				const expiry = parseInt(stored, 10);
				if (Date.now() < expiry) {
					return true;
				}
				// Expired, remove it
				localStorage.removeItem(HERO_ANIMATION_KEY);
			}
		} catch {
			// localStorage not available
		}
		return false;
	}

	function markHeroAnimationSeen() {
		if (!browser) return;
		try {
			const expiry = Date.now() + ONE_MONTH_MS;
			localStorage.setItem(HERO_ANIMATION_KEY, expiry.toString());
		} catch {
			// localStorage not available
		}
	}

	// const milestones = articles.filter((article) => article.article_type === 'milestone');
	let analysisArticles = $derived(
		articles?.filter((article) => article.article_type === 'analysis').slice(0, 6) ?? []
	);

	// Lazy load Notable Records when section comes into view
	/** @type {HTMLElement} */
	let recordsSection;
	/** @type {any} */
	let pinnedRecords = $state(null);

	// Lazy load System Snapshot when section comes into view
	/** @type {HTMLElement} */
	let snapshotSection;
	/** @type {any} */
	let SystemSnapshotComponent = $state(null);

	// Lazy load ScenariosPreview when it comes into view
	/** @type {HTMLElement} */
	let scenariosSection;
	let showScenarios = $state(false);
	/** @type {any} */
	let ScenariosPreviewComponent = $state(null);

	onMount(() => {
		if (!browser) return;

		// Always skip animation on Safari, or if user has seen it before
		skipHeroAnimation = isSafari() || checkHeroAnimationSeen();

		// Load hero chart immediately
		heroChartReady = true;

		// Mark animation as seen and load tracker chart
		// If skipping animation, load tracker immediately; otherwise wait for animation
		const trackerDelay = skipHeroAnimation ? 100 : 4000;
		setTimeout(() => {
			markHeroAnimationSeen();
			trackerChartReady = true;
		}, trackerDelay);

		// Lazy load System Snapshot when section comes into view
		const snapshotObserver = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting) {
					Promise.all([
						fetch('/api/region-power').then((r) => r.ok ? r.json() : null),
						fetch('/api/region-energy').then((r) => r.ok ? r.json() : null),
						fetch('/api/region-emissions').then((r) => r.ok ? r.json() : null),
						import('$lib/components/info-graphics/system-snapshot/index.svelte')
					]).then(([power, energy, emissions, module]) => {
						regionPower = power;
						regionEnergy = energy;
						regionEmissions = emissions;
						SystemSnapshotComponent = module.default;
					}).catch((e) => {
						console.error('Failed to fetch system snapshot:', e);
					});
					snapshotObserver.disconnect();
				}
			},
			{ rootMargin: '200px' }
		);

		if (snapshotSection) {
			snapshotObserver.observe(snapshotSection);
		}

		// Lazy load pinned records when section comes into view
		const recordsObserver = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting) {
					fetch('/api/notable-records')
						.then((r) => r.ok ? r.json() : null)
						.then((data) => {
							pinnedRecords = data;
						})
						.catch(() => {
							pinnedRecords = null;
						});
					recordsObserver.disconnect();
				}
			},
			{ rootMargin: '200px' }
		);

		if (recordsSection) {
			recordsObserver.observe(recordsSection);
		}

		// Lazy load ScenariosPreview when section comes into view
		const scenariosObserver = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting) {
					import('$lib/components/info-graphics/scenarios-explorer/homepage/Preview.svelte').then(
						(module) => {
							ScenariosPreviewComponent = module.default;
							showScenarios = true;
						}
					);
					scenariosObserver.disconnect();
				}
			},
			{ rootMargin: '200px' }
		);

		if (scenariosSection) {
			scenariosObserver.observe(scenariosSection);
		}

		return () => {
			snapshotObserver.disconnect();
			recordsObserver.disconnect();
			scenariosObserver.disconnect();
		};
	});

	// Derived CMS content - uses $derived to stay reactive
	let banner_title = $derived(homepageData?.[0]?.banner_title ?? '');
	let banner_statement = $derived(homepageData?.[0]?.banner_statement ?? '');
	let map_title = $derived(homepageData?.[0]?.map_title ?? '');
	let analysis_title = $derived(homepageData?.[0]?.analysis_title ?? '');

	let selectedRecordRegion = $state('');
	let selectedRegions = $derived(selectedRecordRegion ? [selectedRecordRegion] : []);
	let regionOptions = $derived(
		regions
			.filter((r) => r.value && r.longLabel)
			.map((r) => ({
				label: /** @type {string} */ (r.longLabel),
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
				skipAnimation={skipHeroAnimation}
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
<div bind:this={recordsSection} class="bg-light-warm-grey py-16 md:py-32 border-b border-warm-grey">
	<div class="max-w-none md:container">
		<h3 class="md:text-center px-10 md:px-0">Notable records</h3>

		<div class="mb-3 mt-5 px-7 md:px-5 text-base">
			<FormSelect
				paddingY="py-2"
				paddingX="px-3"
				options={[{ label: 'All regions', value: '' }, ...regionOptions]}
				selected={selectedRecordRegion}
				formLabel="All regions"
				onchange={(opt) => (selectedRecordRegion = /** @type {string} */ (opt.value))}
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
<div bind:this={snapshotSection} class="md:bg-light-warm-grey">
	<div class="container max-w-none lg:container">
		<div class="flex flex-col md:flex-row justify-between py-16 md:py-32">
			{#if hasRegionData && SystemSnapshotComponent}
				<SystemSnapshotComponent
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
		<ScenariosPreviewComponent />
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
