<script>
	import RecordCard from '$lib/components/records/RecordCard.svelte';
	import { recordsByDay } from '$lib/records';
	import { format, isToday } from 'date-fns';

	/** @type {import('./$types').PageData} */
	export let data;
	const dailyRecords = recordsByDay(data.records);
</script>

<div class="bg-warm-grey">
	<div class="container max-w-none lg:container">
		<div class="flex gap-8">
			<div class="min-w-[27rem] w-3/12 bg-white py-14 records-sidebar relative">
				<h1 class="text-2xl leading-2xl md:text-3xl md:leading-3xl">Records</h1>
			</div>
			<div class="flex-grow pt-6 pb-16">
				{#each dailyRecords as day}
					<div class="max-w-[51rem] mx-auto">
						<header class="font-space text-sm uppercase py-8 sticky top-0 z-10 bg-warm-grey">
							{isToday(Date.parse(day[0][0].time))
								? 'Today'
								: format(Date.parse(day[0][0].time), 'dd LLL, yyyy')}
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
	</div>
</div>

<style>
	.records-sidebar:before {
		content: '';
		display: block;
		width: 100vh;
		height: 100%;
		position: absolute;
		right: 100%;
		top: 0;
		background-color: white;
	}
</style>
