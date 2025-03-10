<script>
	import { run } from 'svelte/legacy';

	import { parseISO } from 'date-fns';
	import { browser } from '$app/environment';
	import Icon from '$lib/components/Icon.svelte';
	import { fuelTechColourMap } from '$lib/fuel_techs';

	import { formatRecordValue } from '../page-data-options/formatters';
	import getRelativeTime from '../page-data-options/relative-time';
	import recordDescription from '../page-data-options/record-description';

	let { region } = $props();

	/**
	 * @type {{ fuelTech: FuelTechCode, label: string, ids: string[] }[]}
	 */
	const pinned = [
		{
			fuelTech: 'solar',
			label: 'Solar',
			ids: ['power.interval.high', 'energy.day.high']
		},
		{
			fuelTech: 'wind',
			label: 'Wind',
			ids: ['power.interval.high', 'energy.day.high']
		},
		{
			fuelTech: 'battery_discharging',
			label: 'Battery',
			ids: ['power.interval.high', 'energy.day.high']
		},
		{
			fuelTech: 'renewables',
			label: 'Renewables',
			ids: ['proportion.interval.high', 'proportion.day.high']
		},
		{
			fuelTech: 'coal',
			label: 'Coal',
			ids: ['power.interval.low', 'energy.day.low']
		}
	];

	/** @type {{ id: string, data: Promise<any> }[]} */
	let records = $state([]);

	/** @type {{ [key: string]: * }} */
	let recordMap = $state({
		solar: null,
		wind: null,
		battery_discharging: null,
		renewables: null,
		coal: null
	});

	let loading = $state(false);

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
		const data = jsonData.data;
		return data;
	}

	$effect(() => {
		if (region && browser) {
			/** @type {{ id: string, data: Promise<any> }[]} */
			let newRecords = [];
			recordMap = {
				solar: null,
				wind: null,
				battery_discharging: null,
				renewables: null,
				coal: null
			};
			pinned.forEach(({ fuelTech, ids }) => {
				ids.forEach((id) => {
					const recordId = `${region}.${fuelTech}.${id}`;
					newRecords.push({ id: recordId, data: fetchRecord(recordId) });
				});
			});

			records = newRecords;
		}
	});

	let recordMapCache = $derived(recordMap);

	$effect(() => {
		if (region && records.length) {
			const promises = records.map((record) => record.data);

			loading = true;
			Promise.all(promises).then((responses) => {
				responses.forEach((data) => {
					if (data.length) {
						// console.log('data', data[0]);
						const value = data[0].value;
						const unit = data[0].value_unit;
						const interval = data[0].interval;
						const period = data[0].period;
						const fuelTech = data[0].fueltech_id;
						const recordId = data[0].record_id;
						const aggregate = data[0].aggregate;
						const description = data[0].description;
						const metric = data[0].metric;

						const date = parseISO(interval);
						const time = date.getTime();

						if (recordMapCache[fuelTech] === null || time > recordMapCache[fuelTech].time) {
							recordMap[fuelTech] = {
								recordId,
								aggregate,
								value,
								unit,
								interval,
								period,
								description,
								metric,
								date,
								time
							};
						}
					}
				});

				loading = false;
			});
		}
	});
</script>

<div class="overflow-auto flex items-stretch snap-x snap-mandatory md:grid grid-cols-5 md:gap-4">
	{#each pinned as { fuelTech }}
		{@const recordData = recordMap[fuelTech]}
		<div class="snap-start px-10 pr-5 last:pr-10 md:p-0 md:last:pr-0 shrink-0 w-[320px] md:w-auto">
			{#if !loading}
				{#if recordData}
					<a
						href="/records/{recordData.recordId}"
						class="text-black bg-white border border-mid-warm-grey hover:border-dark-grey !no-underline rounded-xl p-8 md:p-6 h-full min-h-[300px] md:min-h-96 grid grid-cols-1 gap-4 content-between transition-all"
					>
						<div>
							<Icon icon={fuelTech} size={32} />

							<div class="text-2xl leading-2xl md:text-base md:leading-base my-6">
								{recordDescription(
									recordData.period,
									recordData.aggregate,
									recordData.metric,
									fuelTech
								)}
							</div>
						</div>

						<div
							class="border-t-4 flex justify-between items-baseline pt-2"
							style="border-color: {fuelTechColourMap[fuelTech]}"
						>
							<div class="text-lg md:text-base">
								{formatRecordValue(recordData.value, fuelTech)}
								<small class="text-mid-grey">{recordData.unit}</small>
							</div>
							<time class="md:text-xxs text-mid-grey">
								{formatDate(recordData.interval, recordData.period)}
							</time>
						</div>
					</a>
				{:else}
					<div class="text-black block border border-mid-warm-grey rounded-xl h-full p-6">
						<Icon icon={fuelTech} size={32} />
					</div>
				{/if}
			{:else}
				<div class="text-black block border border-mid-warm-grey rounded-xl h-72 p-6 animate-pulse">
					<Icon icon={fuelTech} size={32} />

					<div role="status" class="text-black animate-pulse">
						<div class="bg-mid-warm-grey h-full w-full rounded-full"></div>
					</div>
				</div>
			{/if}
		</div>
	{/each}
</div>
