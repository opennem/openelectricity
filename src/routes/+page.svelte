<script>
	import ButtonGroup from '$lib/components/ButtonGroup.svelte';
	// import Goal from '$lib/components/Goal.svelte';
	import Map from '$lib/components/Map.svelte';
	import SectionLink from '$lib/components/SectionLink.svelte';
	import RecordCard from '$lib/components/records/RecordCard.svelte';
	import { recordsByDay } from '$lib/records';
	import ButtonLink from '$lib/components/ButtonLink.svelte';
	import GenerationMixSparkline from '$lib/components/homepage/GenerationMixSparkline.svelte';
	import FossilIconAnim from '$lib/components/homepage/FossilIconAnim.svelte';
	import RenewableIconAnim from '$lib/components/homepage/RenewableIconAnim.svelte';

	/** @type {import('./$types').PageData} */
	export let data;
	const dailyRecords = recordsByDay(data.records);
</script>

<div class="bg-light-warm-grey">
	<div class="container max-w-none lg:container">
		<div class="flex py-20 justify-between items-center">
			<div class="w-6/12">
				<h2 class="md:text-9xl md:leading-9xl">{data.banner_title}</h2>
				<p>{@html data.banner_statement}</p>
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
		</div>
	</div>
</div>
<div class="bg-white py-16">
	<div class="container max-w-none lg:container">
		<header class="flex justify-between">
			<h3>{data.chart_title}</h3>
			<SectionLink href="https://data.openelectricity.org.au/" title="Data Tracker" />
		</header>
	</div>
</div>
<div class="bg-light-warm-grey">
	<div class="container max-w-none lg:container">
		<div class="grid grid-cols-2 gap-40 py-16">
			<Map classes="w-full block h-auto" />
			<div class="bg-white rounded-lg p-12">
				<h3>{data.map_title}</h3>
				<ButtonGroup
					buttons={[
						{ label: '1D', value: 1 },
						{ label: '3D', value: 3 },
						{ label: '7D', value: 7 }
					]}
					selected={1}
				/>
			</div>
		</div>
	</div>
</div>
<div class="bg-white py-16">
	<div class="container max-w-none lg:container">
		<h3>ISP Explorer</h3>
	</div>
</div>
<div class="bg-light-warm-grey py-40">
	<div class="container max-w-none lg:container">
		<header class="text-center">
			<h3>{data.records_title}</h3>
		</header>
		<div class="my-14">
			<div class="mx-auto max-w-[51rem]">
				{#each dailyRecords[0] as record}
					<RecordCard {record} class="mb-4" />
				{/each}
			</div>
		</div>
		<footer class="text-center mt-20">
			<ButtonLink href="/records">View all records</ButtonLink>
		</footer>
	</div>
</div>
<div class="bg-white py-16">
	<div class="container max-w-none lg:container">
		<header class="flex justify-between">
			<h3>{data.analysis_title}</h3>
			<SectionLink href="/analysis" title="View all Analysis" />
		</header>
		<div class="grid grid-cols-4">
			{#each data.articles as { title, slug }}
				<div>
					<h3>{title}</h3>
					<a href="/analysis/{slug.current}">Read more</a>
				</div>
			{/each}
		</div>
	</div>
</div>

<!-- <div class="bg-white py-16">
	<div class="container max-w-none lg:container">
		<header class="flex justify-between">
			<h3>{data.goals_title}</h3>
			<SectionLink href="/content/about" title="About" />
		</header>
		<div class={`grid grid-cols-1 md:grid-cols-3 gap-16 mt-16`}>
			{#each data.goals as goal, i}
				<Goal {goal} index={i + 1} />
			{/each}
		</div>
	</div>
</div> -->

<style>
	.key-numbers-grid {
		grid-template-columns: 1fr minmax(5rem, 25%) minmax(5rem, 25%);
	}
</style>
