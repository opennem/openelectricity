<script>
	import { run } from 'svelte/legacy';

	import { parseISO } from 'date-fns';

	import { browser } from '$app/environment';
	import Icon from '$lib/components/Icon.svelte';
	import { fuelTechColourMap } from '$lib/fuel_techs';

	import { formatRecordValue } from '../../page-data-options/formatters';
	import recordDescription from '../../page-data-options/record-description';
	import getRelativeTime from '../../page-data-options/relative-time';

	let { data } = $props();

	const id = data.id;
	/** @type {MilestoneRecord} */
	let currentRecord = $state();



	/**
	 * Format a date
	 * @param {string} interval
	 * @param {string} period
	 */
	function formatDate(interval, period) {
		const date = parseISO(interval);
		// return format(date, formatStrings[period] || 'd MMM yyyy, h:mma');
		return getRelativeTime(date);
	}

	/**
	 * Fetch a single record
	 * @param {string} recordId
	 */
	async function fetchRecord(recordId) {
		const id = encodeURIComponent(recordId);
		const res = await fetch(`/api/records/${id}?pageSize=1`);
		const jsonData = await res.json();

		if (jsonData.error) {
			return [];
		}
		const data = jsonData.data && jsonData.data.length ? jsonData.data[0] : {};
		return data;
	}
	run(() => {
		if (browser) {
			fetchRecord(id).then((record) => {
				console.log('record', record);

				currentRecord = record;
			});
		}
	});
	let fuelTech = $derived(currentRecord?.fueltech_id || '');
</script>

<div class="py-12">
	{#if currentRecord}
		<div
			class="max-w-[350px] mx-auto text-black bg-white border border-mid-warm-grey rounded-xl p-6 h-full grid grid-cols-1 gap-4 content-between"
		>
			<div>
				<!-- <h6>{label}</h6> -->
				<Icon icon={fuelTech} size={32} />
				<!-- {recordData.recordId} -->

				<div class="leading-base my-6">
					<!-- <small>{recordData.period} / {recordData.aggregate}</small> -->
					{recordDescription(
						currentRecord.period,
						currentRecord.aggregate,
						currentRecord.metric,
						fuelTech
					)}
				</div>
			</div>

			<div
				class="border-t-4 flex justify-between items-baseline pt-2"
				style="border-color: {fuelTechColourMap[fuelTech]}"
			>
				<div>
					{formatRecordValue(currentRecord.value, fuelTech)}
					<small class="text-mid-grey">{currentRecord.value_unit}</small>
				</div>
				<time class="text-xxs text-mid-grey">
					{formatDate(currentRecord.interval, currentRecord.period)}
				</time>
			</div>
		</div>
	{/if}
</div>
