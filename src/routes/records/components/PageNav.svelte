<script>
	import { goto } from '$app/navigation';
	import IconChevronLeft from '$lib/icons/ChevronLeft.svelte';
	import FormSelect from '$lib/components/form-elements/Select.svelte';

	import {
		fuelTechOptions,
		milestoneTypeOptions,
		periodOptions
	} from '../page-data-options/filters.js';
	import PageButtons from './PageButtons.svelte';

	// TODO: refactor to store
	const regions = [
		{ longValue: 'au.nem', value: 'nem', label: 'NEM', longLabel: 'National Electricity Market' },
		{ longValue: 'au.nem.nsw1', value: 'nsw1', label: 'NSW', longLabel: 'New South Wales' },
		{ longValue: 'au.nem.qld1', value: 'qld1', label: 'QLD', longLabel: 'Queensland' },
		{ longValue: 'au.nem.sa1', value: 'sa1', label: 'SA', longLabel: 'South Australia' },
		{ longValue: 'au.nem.tas1', value: 'tas1', label: 'TAS', longLabel: 'Tasmania' },
		{ longValue: 'au.nem.vic1', value: 'vic1', label: 'VIC', longLabel: 'Victoria' },
		{ longValue: 'au.wem', value: 'wem', label: 'WA', longLabel: 'Western Australia' }
	];

	/** @type {MilestoneRecord} */
	export let record;

	$: fuelTech = record?.fueltech_id;
	$: region = record?.network_region || record?.network_id;
	$: metric = record?.metric;
	$: period = record?.period;
	$: aggregate = record?.aggregate;

	$: regionId = region ? region.toLowerCase() : '';

	/**
	 * @param {CustomEvent} evt
	 */
	function handleRegionChange(evt) {
		goToRecord({
			region: evt.detail.value,
			fuelTech,
			metric,
			period,
			aggregate
		});
	}

	/**
	 * @param {CustomEvent} evt
	 */
	function handleFuelTechChange(evt) {
		if (regionId) {
			goToRecord({
				region: regionId,
				fuelTech: evt.detail.value,
				metric,
				period,
				aggregate
			});
		}
	}

	/**
	 * @param {CustomEvent} evt
	 */
	function handleMetricChange(evt) {
		if (regionId) {
			goToRecord({
				region: regionId,
				fuelTech,
				metric: evt.detail.value,
				period,
				aggregate
			});
		}
	}

	/**
	 * @param {CustomEvent} evt
	 */
	function handlePeriodChange(evt) {
		if (regionId) {
			goToRecord({
				region: regionId,
				fuelTech,
				metric,
				period: evt.detail.value,
				aggregate
			});
		}
	}

	/**
	 * Go to records page
	 * @param {{region: string, fuelTech: string, metric: string, period: string, aggregate: string}} param0
	 */
	function goToRecord({ region, fuelTech, metric, period, aggregate }) {
		const findRegion = regions.find((r) => r.value === region);

		console.log(
			`/records/${findRegion?.longValue || ''}.${fuelTech}.${metric}.${period}.${aggregate}`
		);

		goto(`/records/${findRegion?.longValue || ''}.${fuelTech}.${metric}.${period}.${aggregate}`, {
			replaceState: true
		});
	}
</script>

<div class="flex justify-between items-center">
	<div class="flex gap-6 items-center divide-x divide-warm-grey">
		<a href="/records" class="flex items-center gap-2 text-dark-grey font-space text-sm">
			<span class="rounded-full border border-dark-grey p-1 block">
				<IconChevronLeft class="size-4 relative -left-[1px]" stroke-width="3" />
			</span>
			Back
		</a>

		{#if record}
			<div class="flex gap-1 items-center pl-6">
				<FormSelect
					options={regions.map((r) => ({ label: r.label, value: r.value }))}
					selected={regionId}
					paddingX="px-4"
					paddingY="py-3"
					on:change={handleRegionChange}
				/>

				<FormSelect
					options={fuelTechOptions}
					selected={fuelTech}
					paddingX="px-4"
					paddingY="py-3"
					on:change={handleFuelTechChange}
				/>

				<FormSelect
					options={milestoneTypeOptions}
					selected={metric}
					paddingX="px-4"
					paddingY="py-3"
					on:change={handleMetricChange}
				/>

				<FormSelect
					options={periodOptions}
					selected={period}
					paddingX="px-4"
					paddingY="py-3"
					on:change={handlePeriodChange}
				/>
			</div>
		{/if}
	</div>

	{#if record}
		<PageButtons />
	{/if}
</div>
