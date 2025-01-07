<script>
	import { format, isToday } from 'date-fns';
	import { recordsByDay } from '$lib/records';
	import RecordCard from '$lib/components/records/RecordCard.svelte';
	import ButtonLink from '$lib/components/ButtonLink.svelte';

	
	/**
	 * @typedef {Object} Props
	 * @property {*} [records]
	 * @property {string} [recordsTitle]
	 */

	/** @type {Props} */
	let { records = [], recordsTitle = 'Latest Records' } = $props();

	// Process records
	const dailyRecords = recordsByDay(records);
	/** @type {*}*/
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
</script>

<div class="bg-light-warm-grey py-40">
	<div class="container max-w-none lg:container">
		<header class="text-center">
			<h3>{recordsTitle}</h3>
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
