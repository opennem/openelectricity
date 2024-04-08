<script>
	import { fade } from 'svelte/transition';
	import { format, isToday } from 'date-fns';

	import ispData from '$lib/isp';
	import { recordsByDay } from '$lib/records';
	import { dataTrackerLink } from '$lib/stores/app';

	import SectionLink from '$lib/components/SectionLink.svelte';
	import RecordCard from '$lib/components/records/RecordCard.svelte';
	import ButtonLink from '$lib/components/ButtonLink.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import InfoGraphicISP from '$lib/components/info-graphics/integrated-system-plan/index.svelte';
	import InfoGraphicNem7DayGeneration from '$lib/components/info-graphics/nem-7-day-generation/index.svelte';
	import InfoGraphicFossilFuelsRenewables from '$lib/components/info-graphics/fossil-fuels-renewables/index.svelte';
	import InfoGraphicSystemSnapshot from '$lib/components/info-graphics/system-snapshot/index.svelte';
	import ArticleCard from '$lib/components/articles/ArticleCard.svelte';

	import LogoMark from '$lib/images/logo-mark.svelte';

	/** @type {import('./$types').PageData} */
	export let data;
	const {
		records,
		flows,
		articles,
		// outlookEnergyNem,
		// fuelTechs,
		// scenarios,
		dataTrackerData,
		historyEnergyNemData,
		mapAllData,
		homepageData
	} = data;

	const milestones = articles.filter((article) => article.article_type === 'milestone');
	const analysisArticles = articles.filter((article) => article.article_type === 'analysis');

	// const { outlookEnergyNem, pathways, scenarios, fuelTechs } = ispData();

	let outlookEnergyNem = null;
	let fuelTechs = [];

	setTimeout(() => {
		outlookEnergyNem = ispData().outlookEnergyNem;
		fuelTechs = ispData().fuelTechs;
	}, 250);

	if (!homepageData || homepageData.length === 0) {
		throw new Error('No homepage data found');
	}

	const {
		banner_title,
		banner_statement,
		milestones_title,
		chart_title,
		map_title,
		records_title,
		analysis_title
	} = homepageData[0];

	// Process records
	const dailyRecords = recordsByDay(records);
	const recordsSlice = [];
	let remaining = 5;
	dailyRecords.every((day) => {
		if (remaining > day.length) {
			recordsSlice.push(day);
			remaining -= day.length;
		} else {
			recordsSlice.push(day.slice(0, remaining));
			remaining = 0;
		}

		return remaining > 0;
	});

	// TEST map data
	const mapJsons = mapAllData.originalJsons;
	const mapDataCached = mapAllData.cached;
	console.log('mapJsons', mapJsons, 'cached', mapDataCached);

	console.log('flows', flows);

	$: allReady =
		articles.length > 0 &&
		records.length > 0 &&
		dataTrackerData.length > 0 &&
		historyEnergyNemData.length > 0 &&
		fuelTechs.length > 0;
</script>

{#if allReady}
	<div class="md:bg-light-warm-grey">
		<div class="container max-w-none lg:container">
			<div class="md:grid grid-cols-2 gap-36 py-32">
				<InfoGraphicSystemSnapshot data={mapAllData} title={map_title} {flows} />
			</div>
		</div>
	</div>

	<div class="bg-light-warm-grey pt-3 pb-6" transition:fade={{ duration: 500 }}>
		<div class="container max-w-none lg:container relative">
			<InfoGraphicFossilFuelsRenewables
				data={historyEnergyNemData}
				title={banner_title}
				description={banner_statement}
			/>
		</div>
	</div>

	<div class="bg-white py-32">
		<div class="container max-w-none lg:container">
			<header class="text-center">
				<h3>{chart_title}</h3>
			</header>

			<section class="my-16">
				<InfoGraphicNem7DayGeneration data={dataTrackerData} />
			</section>

			<footer class="flex justify-center">
				<ButtonLink href={$dataTrackerLink}>
					View full data tracker
					<Icon icon="arrow-right-circle" size={24} />
				</ButtonLink>
			</footer>
		</div>
	</div>

	<hr class="w-[90%] mx-auto bg-mid-warm-grey border-0 h-px" />

	<div class="bg-white py-32">
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
	</div>

	<div class="bg-white py-32">
		<div class="container max-w-none lg:container">
			{#if outlookEnergyNem}
				<InfoGraphicISP data={{ fuelTechs, outlookEnergyNem, historyEnergyNemData }} />
			{/if}
		</div>
	</div>

	<div class="bg-light-warm-grey py-40">
		<div class="container max-w-none lg:container">
			<header class="text-center">
				<h3>{records_title}</h3>
			</header>
			<div class="my-14">
				<div class="mx-auto max-w-[51rem]">
					{#each recordsSlice as day}
						<div class="max-w-[51rem] mx-auto">
							<header class="font-space text-sm uppercase py-8 z-5">
								{isToday(Date.parse(day[0][0].interval))
									? 'Today'
									: format(Date.parse(day[0][0].interval), 'dd LLL, yyyy')}
							</header>
							<div>
								{#each day as record}
									<RecordCard {record} class="mb-4" />
								{/each}
							</div>
						</div>
					{/each}
				</div>
			</div>
			<footer class="text-center mt-20">
				<ButtonLink href="/records" class="inline-flex">View all records</ButtonLink>
			</footer>
		</div>
	</div>
	<div class="bg-white py-32">
		<div class="container max-w-none lg:container">
			<header class="flex justify-between items-center">
				<h3>{analysis_title}</h3>
				<SectionLink href="/analysis" title="View all analyses" />
			</header>
			<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
				{#each analysisArticles as article}
					<ArticleCard {article} />
				{/each}
			</div>
		</div>
	</div>
{:else}
	<div
		class="h-screen bg-light-warm-grey flex justify-center items-center"
		transition:fade={{ duration: 250 }}
	>
		<LogoMark />
	</div>
{/if}
