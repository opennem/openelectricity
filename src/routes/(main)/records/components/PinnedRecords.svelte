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

	/** @type {{ [key: string]: * }} */
	let recordMap = $state(createEmptyRecordMap());

	let loading = $state(false);
	let waitingForInitialData = $derived(initialData === null && selectedRegions.length === 0);
	let showSkeleton = $derived(loading || waitingForInitialData);

	// Sync recordMap when initialData is provided
	$effect(() => {
		if (initialData) {
			recordMap = initialData;
		}
	});

	/**
	 * Format a date
	 * @param {string} interval
	 * @param {string} period
	 */
	function formatDate(interval, period) {
		const date = parseISO(interval);
		return getRelativeTime(date);
	}

	$effect(() => {
		if (!browser) return;

		// If no regions selected, use prefetched initialData
		if (selectedRegions.length === 0) {
			if (initialData) {
				recordMap = initialData;
			}
			return;
		}

		// Fetch for specific selected regions via API
		recordMap = createEmptyRecordMap();
		loading = true;

		const params = new URLSearchParams({ regions: selectedRegions.join(',') });
		fetch(`/api/notable-records?${params}`)
			.then((r) => (r.ok ? r.json() : null))
			.then((data) => {
				if (data && !data.error) {
					recordMap = data;
				}
				loading = false;
			})
			.catch(() => {
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
			{#if !showSkeleton}
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
