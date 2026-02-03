<script>
	import { parseISO } from 'date-fns';
	import { browser } from '$app/environment';
	import { formatRecordValue } from '../page-data-options/formatters';
	import getRelativeTime from '../page-data-options/relative-time';
	import recordDescription from '../page-data-options/record-description';
	import FuelTechIcon from '$lib/components/FuelTechIcon.svelte';
	import dateTimeQuery from '../page-data-options/date-time-query';
	import {
		PINNED_CONFIG as pinned,
		PINNED_REGIONS as regions,
		createEmptyRecordMap
	} from '$lib/records/pinned-records.js';

	/**
	 * @typedef {Object} Props
	 * @property {string[]} [selectedRegions] - Selected region codes
	 * @property {boolean} [showRegionLabel] - Show region label on cards
	 * @property {Record<string, any> | null} [initialData] - Server-prefetched pinned records
	 */

	/** @type {Props} */
	let { selectedRegions = [], showRegionLabel = true, initialData = null } = $props();

	/** @type {{ id: string, data: Promise<any> }[]} */
	let records = $state([]);

	/** @type {{ [key: string]: * }} */
	let recordMap = $state(createEmptyRecordMap());

	// Sync recordMap when initialData is provided
	$effect(() => {
		if (initialData) {
			recordMap = initialData;
		}
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
		return selectedRegions
			.map((region) => {
				let regionData = regions.find((r) => r.value === region);
				return regionData;
			})
			.filter((r) => r !== undefined);
	});

	$effect(() => {
		if (browser) {
			// If no regions selected, use server-prefetched data (don't fetch)
			if (selectedRegions.length === 0) {
				if (initialData) {
					recordMap = initialData;
					records = [];
				}
				return;
			}

			// Fetch for specific selected regions
			/** @type {{ id: string, data: Promise<any> }[]} */
			let newRecords = [];
			recordMap = createEmptyRecordMap();
			loading = true;
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
		// Skip if no records to fetch (using server-prefetched data)
		if (!records.length || !regionOptions.length) {
			return;
		}

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

<div
	class="text-base overflow-auto flex items-stretch snap-x snap-mandatory md:grid grid-cols-5 md:gap-4"
>
	{#each pinned as { fuelTech } (fuelTech)}
		{@const recordData = recordMap[fuelTech]}
		<div
			class="snap-start px-2 pr-2 first:pl-10 last:pr-10 md:p-0 md:first:pl-5 md:last:pr-0 shrink-0 w-[190px] md:w-auto"
		>
			{#if !loading}
				{#if recordData}
					{@const path = `/records/${encodeURIComponent(recordData.recordId)}?${dateTimeQuery(recordData.interval)}&focus=${recordData.time}`}
					<a
						href={path}
						class="text-black bg-white border border-mid-warm-grey hover:border-dark-grey no-underline! rounded-xl p-6 h-full min-h-[200px] grid grid-cols-1 gap-4 content-between transition-all"
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
