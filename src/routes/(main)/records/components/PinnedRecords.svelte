<script>
	import { parseISO } from 'date-fns';
	import { browser } from '$app/environment';
	import { formatRecordValue } from '../page-data-options/formatters';
	import getRelativeTime from '../page-data-options/relative-time';
	import recordDescription from '../page-data-options/record-description';
	import FuelTechIcon from './FuelTechIcon.svelte';
	import dateTimeQuery from '../page-data-options/date-time-query';

	let { selectedRegions = [], showRegionLabel = true } = $props();

	const regions = [
		{ longValue: 'au.nem', value: 'nem', label: 'NEM', longLabel: 'National Electricity Market' },
		{ longValue: 'au.nem.nsw1', value: 'nsw1', label: 'NSW', longLabel: 'New South Wales' },
		{ longValue: 'au.nem.qld1', value: 'qld1', label: 'QLD', longLabel: 'Queensland' },
		{ longValue: 'au.nem.sa1', value: 'sa1', label: 'SA', longLabel: 'South Australia' },
		{ longValue: 'au.nem.tas1', value: 'tas1', label: 'TAS', longLabel: 'Tasmania' },
		{ longValue: 'au.nem.vic1', value: 'vic1', label: 'VIC', longLabel: 'Victoria' },
		{ longValue: 'au.wem', value: 'wem', label: 'WA', longLabel: 'Western Australia' }
	];

	/**
	 * @type {{ fuelTech: FuelTechCode, label: string, ids: string[] }[]}
	 */
	const pinned = [
		{
			fuelTech: 'solar',
			label: 'Solar',
			ids: [
				'power.interval.high',
				'energy.day.high',
				'energy.month.high',
				'energy.quarter.high',
				'energy.year.high'
			]
		},
		{
			fuelTech: 'wind',
			label: 'Wind',
			ids: [
				'power.interval.high',
				'energy.day.high',
				'energy.month.high',
				'energy.quarter.high',
				'energy.year.high'
			]
		},
		{
			fuelTech: 'battery_discharging',
			label: 'Battery',
			ids: [
				'power.interval.high',
				'energy.day.high',
				'energy.month.high',
				'energy.quarter.high',
				'energy.year.high'
			]
		},
		{
			fuelTech: 'renewables',
			label: 'Renewables',
			ids: [
				'power.interval.high',
				'energy.day.high',
				'energy.month.high',
				'energy.quarter.high',
				'energy.year.high'
			]
		},
		{
			fuelTech: 'coal',
			label: 'Coal',
			ids: ['power.interval.low']
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

	let regionOptions = $derived.by(() => {
		if (selectedRegions.length === 0) {
			return regions;
		}
		return selectedRegions.map((region) => {
			let regionData = regions.find((r) => r.value === region);
			return regionData;
		});
	});

	$effect(() => {
		if (browser) {
			/** @type {{ id: string, data: Promise<any> }[]} */
			let newRecords = [];
			recordMap = {
				solar: null,
				wind: null,
				battery_discharging: null,
				renewables: null,
				coal: null
			};
			regionOptions.forEach(({ longValue }) => {
				pinned.forEach(({ fuelTech, ids }) => {
					ids.forEach((id) => {
						const recordId = `${longValue}.${fuelTech}.${id}`;
						newRecords.push({ id: recordId, data: fetchRecord(recordId) });
					});
				});
			});

			records = newRecords;
		}
	});

	let recordMapCache = $derived(recordMap);

	$effect(() => {
		if (regionOptions.length) {
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
						const networkRegion = data[0].network_region;
						const networkId = data[0].network_id;

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
								time,
								networkRegion,
								networkId
							};
						}
					}
				});

				loading = false;
			});
		}
	});

	/**
	 * Get the region label
	 * @param {string} networkId
	 * @param {string | undefined} networkRegion
	 * @returns {string}
	 */
	function getRegionLabel(networkId, networkRegion) {
		if (networkRegion) {
			return (
				regions.find(({ value }) => value === networkRegion.toLowerCase())?.label || networkRegion
			);
		}
		return regions.find(({ value }) => value === networkId.toLowerCase())?.label || networkId;
	}
</script>

<div class="overflow-auto flex items-stretch snap-x snap-mandatory md:grid grid-cols-5 md:gap-4">
	{#each pinned as { fuelTech }}
		{@const recordData = recordMap[fuelTech]}
		<div
			class="snap-start px-2 pr-2 first:pl-10 last:pr-10 md:p-0 md:first:pl-5 md:last:pr-0 shrink-0 w-[190px] md:w-auto"
		>
			{#if !loading}
				{#if recordData}
					{@const path = `/records/${encodeURIComponent(recordData.recordId)}?${dateTimeQuery(recordData.interval)}&focus=${recordData.time}`}
					<a
						href={path}
						class="text-black bg-white border border-mid-warm-grey hover:border-dark-grey !no-underline rounded-xl p-6 h-full min-h-[200px] grid grid-cols-1 gap-4 content-between transition-all"
					>
						<div>
							<div class="flex items-center gap-2 justify-between">
								<span
									class="bg-{fuelTech} rounded-full p-3 inline-block"
									class:text-black={fuelTech === 'solar'}
									class:text-white={fuelTech !== 'solar'}
								>
									<FuelTechIcon {fuelTech} sizeClass={12} />
								</span>

								{#if showRegionLabel}
									<div class="text-sm text-mid-grey">
										{getRegionLabel(recordData.networkId, recordData.networkRegion)}
									</div>
								{/if}
							</div>

							<div class="my-8 leading-base">
								{recordDescription(
									recordData.period,
									recordData.aggregate,
									recordData.metric,
									fuelTech
								)}
							</div>
						</div>

						<div
							class="flex flex-col items-start lg:flex-row lg:items-center lg:justify-between border-t border-mid-warm-grey pt-6"
						>
							<div class="font-mono">
								{formatRecordValue(recordData.value, fuelTech)}
								<small class="text-mid-grey">{recordData.unit}</small>
							</div>

							<time class="text-xxs text-mid-grey">
								{formatDate(recordData.interval, recordData.period)}
							</time>
						</div>
					</a>
				{:else}
					<div class="text-black block border border-mid-warm-grey rounded-xl h-full p-6">
						<span
							class="bg-{fuelTech} rounded-full p-3 inline-block"
							class:text-black={fuelTech === 'solar'}
							class:text-white={fuelTech !== 'solar'}
						>
							<FuelTechIcon {fuelTech} sizeClass={12} />
						</span>
					</div>
				{/if}
			{:else}
				<div class="text-black block border border-mid-warm-grey rounded-xl h-72 p-6 animate-pulse">
					<span
						class="bg-{fuelTech} rounded-full p-3 inline-block"
						class:text-black={fuelTech === 'solar'}
						class:text-white={fuelTech !== 'solar'}
					>
						<FuelTechIcon {fuelTech} sizeClass={12} />
					</span>

					<div role="status" class="text-black animate-pulse">
						<div class="bg-mid-warm-grey h-full w-full rounded-full"></div>
					</div>
				</div>
			{/if}
		</div>
	{/each}
</div>
