<script>
	import { parseISO, format, formatRelative } from 'date-fns';

	import { browser } from '$app/environment';
	import { getNumberFormat } from '$lib/utils/formatters';

	import { formatStrings } from '../page-data-options/formatters';
	import getRelativeTime from '../page-data-options/relative-time';
	import recordDescription from '../page-data-options/record-description';

	export let region;

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
	let records = [];

	/** @type {{ [key: string]: * }} */
	let recordMap = {
		solar: null,
		wind: null,
		battery_discharging: null,
		renewables: null,
		coal: null
	};

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

	$: console.log('region', region);

	$: if (region && browser) {
		records = [];
		recordMap = {
			solar: null,
			wind: null,
			battery_discharging: null,
			renewables: null,
			coal: null
		};
		pinned.forEach(({ fuelTech, ids }) => {
			ids.forEach((id) => {
				// console.log('fetching', `${region}.${fuelTech}.${id}`);
				const recordId = `${region}.${fuelTech}.${id}`;
				records.push({ id: recordId, data: fetchRecord(recordId) });
			});
		});
	}

	$: if (region && records.length) {
		const promises = records.map((record) => record.data);

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

					if (recordMap[fuelTech] === null) {
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
							time: date.getTime()
						};
					} else {
						// check if the date is newer
						if (date.getTime() > recordMap[fuelTech].time) {
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
								time: date.getTime()
							};
						}
					}
				}
			});
		});
	}
</script>

<div class="grid grid-cols-5 gap-4">
	{#each pinned as { fuelTech, label }}
		{@const recordData = recordMap[fuelTech]}

		{#if recordData}
			<a
				href="/records/{recordData.recordId}"
				class="text-black bg-white border border-mid-warm-grey rounded-xl min-h-48 p-6 flex flex-col justify-between"
			>
				<div>
					<h6>{label}</h6>
					<!-- {recordData.recordId} -->
					<div class="leading-base">
						<!-- <small>{recordData.period} / {recordData.aggregate}</small> -->
						{recordDescription(
							recordData.period,
							recordData.aggregate,
							recordData.metric,
							fuelTech
						)}
					</div>
				</div>

				<div class="border-t flex justify-between items-center">
					<div class="text-sm">
						{getNumberFormat().format(recordData.value)}
						<small>{recordData.unit}</small>
					</div>
					<time class="text-xxs">{formatDate(recordData.interval, recordData.period)}</time>
				</div>
			</a>
		{:else}
			<div class="text-black bg-white block border border-mid-warm-grey rounded-xl min-h-48 p-6">
				<h6>{label}</h6>
				<!-- <div>no record data</div> -->
			</div>
		{/if}
	{/each}
</div>
<!-- 
<div class="grid grid-cols-5 gap-4">
	{#each pinned as { fuelTech, label, ids }}
		<div class="border border-mid-warm-grey rounded-xl h-[200px] p-6">
			<h6>{label}</h6>
			{#each ids as id}
				{@const recordId = `${region}.${fuelTech}.${id}`}
				{@const recordData = records.find((record) => record.id === recordId)}

				<a href="/records/{recordId}" class="text-black block text-xxs">{recordId}</a>

				{#if recordData}
					{#await recordData.data}
						<p>Loading...</p>
					{:then data}
						{#if data.length}
							{@const value = data[0].value}
							{@const unit = data[0].value_unit}
							{@const interval = data[0].interval}
							{@const period = data[0].period}

							<div class="text-sm">
								<small>{period}</small>
								<div>
									{getNumberFormat().format(value)}
									<small>{unit}</small>
								</div>
								<time>{formatDate(interval, period)}</time>
							</div>
						{/if}
					{:catch error}
						<p class="text-xxs text-dark-red">{error.message}</p>
					{/await}
				{/if}
			{/each}
		</div>
	{/each}
</div> -->
