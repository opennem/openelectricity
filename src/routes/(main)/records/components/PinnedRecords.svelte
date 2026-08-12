<script>
	import { parseISO } from 'date-fns';
	import { browser } from '$app/environment';
	import { formatRecordValue } from '../page-data-options/formatters';
	import getRelativeTime from '../page-data-options/relative-time';
	import recordDescription from '../page-data-options/record-description';
	import FuelTechBadge from '$lib/components/FuelTechBadge.svelte';
	import RecordCard from '$lib/components/records/RecordCard.svelte';
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
	 */
	function formatDate(interval) {
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
					<RecordCard
						href={path}
						{fuelTech}
						regionLabel={showRegionLabel
							? getRegionLabel(recordData.networkId, recordData.networkRegion)
							: ''}
						description={recordDescription(
							recordData.period,
							recordData.aggregate,
							recordData.metric,
							fuelTech
						)}
						value={formatRecordValue(recordData.value, /** @type {FuelTechCode} */ (fuelTech))}
						unit={recordData.unit}
						timeLabel={formatDate(recordData.interval)}
					/>
				{:else}
					<div class="text-black block border border-mid-warm-grey rounded-xl h-full p-6">
						<span
							class="bg-{fuelTech} rounded-full p-3 inline-block"
							class:text-black={fuelTech === 'solar'}
							class:text-white={fuelTech !== 'solar'}
						>
							<FuelTechBadge {fuelTech} iconOnly iconSize={12} />
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
						<FuelTechBadge {fuelTech} iconOnly iconSize={12} />
					</span>

					<div role="status" class="text-black animate-pulse">
						<div class="bg-mid-warm-grey h-full w-full rounded-full"></div>
					</div>
				</div>
			{/if}
		</div>
	{/each}
</div>
