<script>
	import { format, isToday } from 'date-fns';

	import Map from '$lib/components/map/Map.svelte';
	import SectionLink from '$lib/components/SectionLink.svelte';
	import RecordCard from '$lib/components/records/RecordCard.svelte';
	import { recordsByDay } from '$lib/records';
	import ButtonLink from '$lib/components/ButtonLink.svelte';
	import GenerationMixSparkline from '$lib/components/homepage/GenerationMixSparkline.svelte';
	import FossilIconAnim from '$lib/components/homepage/FossilIconAnim.svelte';
	import RenewableIconAnim from '$lib/components/homepage/RenewableIconAnim.svelte';
	import Switch from '$lib/components/Switch.svelte';
	import IspOverview from '$lib/components/isp/Overview.svelte';
	import DataTrackerOverview from '$lib/components/data-tracker/Overview.svelte';
	import FossilFuelsVsRenewables from '$lib/components/homepage/FossilFuelsVsRenewables.svelte';
	import MapHeader from '$lib/components/homepage/MapHeader.svelte';
	import ArticleCard from '$lib/components/articles/ArticleCard.svelte';

	/** @type {import('./$types').PageData} */
	export let data;
	const {
		records,
		banner_title,
		banner_statement,
		milestones_title,
		chart_title,
		map_title,
		records_title,
		analysis_title,
		articles,
		outlookEnergyNem,
		fuelTechs,
		scenarios,
		milestones,
		dataTrackerData,
		historyEnergyNemData
	} = data;

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

	// Track map mode and data
	$: mapMode = 'live';
	$: mapData = data[mapMode];

	// $: console.log('scenarios', scenarios);

	$: onMapModeChange = (/** @type {string} */ value) => {
		mapMode = value;
	};
</script>

<div class="container max-w-none lg:container">
	<FossilFuelsVsRenewables
		data={historyEnergyNemData}
		title={banner_title}
		description={banner_statement}
	/>

	<!-- <div class="flex py-20 justify-between items-center">
		<div class="w-6/12">
			<h2 class="md:text-9xl md:leading-9xl">{banner_title}</h2>
			<p>{@html banner_statement}</p>
		</div>

		<div class="w-5/12 p-8 font-medium text-sm">
			<div class="flex gap-8 justify-between bg-white p-20 font-medium text-sm rounded-md">
				<div class="flex-grow">
					<GenerationMixSparkline class="block w-full" />
					<div class="text-xs text-mid-grey text-right">October 2023</div>
				</div>
				<div class="flex flex-col gap-8 flex-shrink">
					<div class="flex gap-4 items-center">
						<FossilIconAnim />
						<div>
							<h5 class="mb-0">Fossil</h5>
							<h3 class="mb-0">61.4%</h3>
						</div>
					</div>
					<div class="flex gap-4 items-center">
						<RenewableIconAnim />
						<div>
							<h5 class="mb-0">Renewables</h5>
							<h3 class="mb-0">38.6%</h3>
						</div>
					</div>
				</div>
			</div>
			<div class="mt-8 text-xs text-mid-grey text-right">
				Contribution to demand. Rolling 12 month average. View data.
			</div>
		</div>
	</div> -->
</div>

<div class="bg-white py-16">
	<div class="container max-w-none lg:container">
		<header class="flex justify-between">
			<h3>{chart_title}</h3>
			<SectionLink href="https://data.openelectricity.org.au/" title="Data Tracker" />
		</header>

		<section class="my-16">
			<DataTrackerOverview data={dataTrackerData} />
		</section>
	</div>
</div>
<div class="bg-white py-16">
	<div class="container max-w-none lg:container">
		<header class="flex justify-between">
			<h3>{milestones_title}</h3>
			<SectionLink href="/analysis" title="View all" />
		</header>
		<div class="grid grid-cols-4 gap-8">
			{#each milestones as article}
				<ArticleCard {article} />
			{/each}
		</div>
	</div>
</div>
<div class="md:bg-light-warm-grey">
	<div class="container max-w-none lg:container">
		<div class="md:grid grid-cols-2 gap-36 py-16">
			<MapHeader
				{mapMode}
				mapTitle={map_title}
				onChange={onMapModeChange}
				dispatch={mapData.dispatch}
				class="md:hidden"
			/>
			<Map mode={mapMode} data={mapData} class="w-full block h-auto pt-8 md:pt-0" />
			<div>
				<div class="bg-white rounded-lg md:p-16 text-center">
					<MapHeader
						{mapMode}
						mapTitle={map_title}
						onChange="{onMapModeChange}x"
						dispatch={mapData.dispatch}
						class="hidden md:block"
					/>
					<section class="mt-12">
						<table class="text-left w-full">
							<thead>
								<tr class="border-b-[0.05rem] border-mid-grey border-solid align-bottom text-xxs">
									{#each mapData.columns as column}
										<td class="pb-3 text-left">
											{#if column.unit}
												<div class="text-mid-warm-grey">{column.unit}</div>
											{/if}
											{column.label}
										</td>
									{/each}
								</tr>
							</thead>
							<tbody>
								{#each mapData.rows as row}
									<tr class="border-b-[0.05rem] border-mid-warm-grey border-solid">
										{#each mapData.columns as column, cidx}
											<td class="py-3 text-sm text-left" class:font-medium={cidx > 0}>
												{row[column.id]}
											</td>
										{/each}
									</tr>
								{/each}
							</tbody>
						</table>
						{#if mapData.notes}
							<div class="text-mid-grey pt-8 px-8 text-xs">
								{#each mapData.notes as note}<div>{note}</div>{/each}
							</div>
						{/if}
					</section>
				</div>
			</div>
		</div>
	</div>
</div>
<div class="bg-white py-16">
	<div class="container max-w-none lg:container">
		<IspOverview data={{ fuelTechs, outlookEnergyNem, historyEnergyNemData }} />
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
<div class="bg-white py-16">
	<div class="container max-w-none lg:container">
		<header class="flex justify-between">
			<h3>{analysis_title}</h3>
			<SectionLink href="/analysis" title="View all Analysis" />
		</header>
		<div class="grid grid-cols-4 gap-8">
			{#each articles as article}
				<ArticleCard {article} />
			{/each}
		</div>
	</div>
</div>
