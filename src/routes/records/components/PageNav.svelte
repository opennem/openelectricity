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

	
	/**
	 * @typedef {Object} Props
	 * @property {MilestoneRecord | undefined} record
	 * @property {any} id
	 */

	/** @type {Props} */
	let { record, id } = $props();

	// $: console.log('id', id);
	let idArr = $derived(id.split('.'));
	let isNetwork = $derived(idArr.length === 6);
	let region = $derived(isNetwork ? [idArr[0], idArr[1]].join('.') : [idArr[0], idArr[1], idArr[2]].join('.'));
	let fuelTech = $derived(isNetwork ? idArr[2] : idArr[3]);
	let metric = $derived(isNetwork ? idArr[3] : idArr[4]);
	let period = $derived(isNetwork ? idArr[4] : idArr[5]);
	let aggregate = $derived(isNetwork ? idArr[5] : idArr[6]);
	// $: console.log('check', region, fuelTech, metric, period, aggregate);
	let regionId = $derived(regions.find((r) => r.longValue === region)?.value || '');

	/**
	 * @param {CustomEvent} evt
	 */
	function handleRegionChange(evt) {
		const findRegion = regions.find((r) => r.value === evt.detail.value);
		if (findRegion) {
			goToRecord({
				region: findRegion.longValue,
				fuelTech,
				metric,
				period,
				aggregate
			});
		}
	}

	/**
	 * @param {CustomEvent} evt
	 */
	function handleFuelTechChange(evt) {
		if (region) {
			goToRecord({
				region,
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
		if (region) {
			goToRecord({
				region,
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
		if (region) {
			goToRecord({
				region,
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
		// const findRegion = regions.find((r) => r.value === region);

		console.log(`/records/${region}.${fuelTech}.${metric}.${period}.${aggregate}`);

		// window.location = `/records/${
		// 	region
		// }.${fuelTech}.${metric}.${period}.${aggregate}`;

		goto(`/records/${region}.${fuelTech}.${metric}.${period}.${aggregate}`);
	}
</script>

<div class="hidden md:flex gap-2 items-center px-10 py-5 md:px-16">
	<div class="text-nowrap">
		<FormSelect
			options={regions.map((r) => ({ label: r.label, value: r.value }))}
			selected={regionId}
			formLabel="Region"
			paddingX="px-4"
			paddingY="py-3"
			on:change={handleRegionChange}
		/>
	</div>

	<div class="text-nowrap">
		<FormSelect
			options={fuelTechOptions}
			selected={fuelTech}
			formLabel="Technology"
			paddingX="px-4"
			paddingY="py-3"
			on:change={handleFuelTechChange}
		/>
	</div>

	<div class="text-nowrap">
		<FormSelect
			options={milestoneTypeOptions}
			selected={metric}
			formLabel="Metric"
			paddingX="px-4"
			paddingY="py-3"
			on:change={handleMetricChange}
		/>
	</div>

	<div class="text-nowrap">
		<FormSelect
			options={periodOptions}
			selected={period}
			formLabel="Period"
			paddingX="px-4"
			paddingY="py-3"
			on:change={handlePeriodChange}
		/>
	</div>
</div>

<div class="flex justify-between items-center bg-white px-10 py-5 md:px-16">
	<div class="flex gap-6 items-center divide-x divide-warm-grey">
		<a href="/records" class="flex items-center gap-2 text-dark-grey font-space text-sm">
			<span class="rounded-full border border-dark-grey p-1 block">
				<IconChevronLeft class="size-4 relative -left-[1px]" stroke-width="3" />
			</span>
			Back to records
		</a>

		<!-- <div class="flex gap-2 items-center pl-6">
			<div class="text-nowrap">
				<FormSelect
					options={regions.map((r) => ({ label: r.label, value: r.value }))}
					selected={regionId}
					formLabel="Region"
					paddingX="px-4"
					paddingY="py-3"
					on:change={handleRegionChange}
				/>
			</div>

			<div class="text-nowrap">
				<FormSelect
					options={fuelTechOptions}
					selected={fuelTech}
					formLabel="Technology"
					paddingX="px-4"
					paddingY="py-3"
					on:change={handleFuelTechChange}
				/>
			</div>

			<div class="text-nowrap">
				<FormSelect
					options={milestoneTypeOptions}
					selected={metric}
					formLabel="Metric"
					paddingX="px-4"
					paddingY="py-3"
					on:change={handleMetricChange}
				/>
			</div>

			<div class="text-nowrap">
				<FormSelect
					options={periodOptions}
					selected={period}
					formLabel="Period"
					paddingX="px-4"
					paddingY="py-3"
					on:change={handlePeriodChange}
				/>
			</div>
		</div> -->
	</div>

	{#if record}
		<PageButtons />
	{/if}
</div>
