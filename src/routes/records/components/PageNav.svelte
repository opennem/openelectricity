<script>
	import { goto } from '$app/navigation';
	import IconChevronLeft from '$lib/icons/ChevronLeft.svelte';
	import FormSelect from '$lib/components/form-elements/Select.svelte';

	import {
		fuelTechOptions,
		milestoneTypeOptions,
		periodOptions,
		aggregateOptions
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
	 * @property {MilestoneRecord} record
	 * @property {*} recordIds
	 */

	/** @type {Props} */
	let { record, recordIds } = $props();

	/**
	 * @param {MilestoneRecord} record
	 * @returns {string}
	 */
	function getRegionLongValue(record) {
		let network_region = record.network_region ? `.${record.network_region.toLowerCase()}` : '';
		return `au.${record.network_id.toLowerCase()}${network_region}`;
	}

	let region = $derived(
		regions.find((r) => r.longValue === getRegionLongValue(record))?.longValue || ''
	);
	let fuelTech = $derived(record.fueltech_id || null);
	let metric = $derived(record.metric);
	let period = $derived(record.period);
	let aggregate = $derived(record.aggregate);

	let removeDuplicateOptions =
		/** @type {(r: { value: string }, index: number, self: { value: string }[]) => boolean} */ (
			r,
			index,
			self
		) => index === self.findIndex((t) => t.value === r.value);

	let orderByLabel = /** @type {(a: { label: string }, b: { label: string }) => number} */ (a, b) =>
		a.label.localeCompare(b.label);

	// check the recordIds and return as options (i.e. { label: 'NSW', value: 'au.nem.nsw1' 	})
	let availableRegionsOptions = $derived(
		recordIds
			.filter((r) =>
				fuelTech
					? r.fueltech_id === fuelTech &&
						r.metric === metric &&
						r.period === period &&
						r.aggregate === aggregate
					: r.metric === metric && r.period === period && r.aggregate === aggregate
			)
			.map((r) => {
				let checkRegionId = getRegionLongValue(r);
				return {
					label: regions.find((r) => r.longValue === checkRegionId)?.label || '',
					value: checkRegionId
				};
			})
			.filter(removeDuplicateOptions)
	);

	let availableFuelTechsOptions = $derived(
		recordIds
			.filter(
				(r) =>
					getRegionLongValue(r) === region &&
					r.metric === metric &&
					r.period === period &&
					r.aggregate === aggregate
			)
			.map((r) => ({
				label: fuelTechOptions.find((ft) => ft.value === r.fueltech_id)?.label || '',
				value: r.fueltech_id
			}))
			.filter(removeDuplicateOptions)
			.sort(orderByLabel)
	);

	let availableMetricsOptions = $derived(
		recordIds
			.filter((r) =>
				fuelTech
					? r.fueltech_id === fuelTech &&
						getRegionLongValue(r) === region &&
						r.period === period &&
						r.aggregate === aggregate
					: !r.fueltech_id &&
						getRegionLongValue(r) === region &&
						r.period === period &&
						r.aggregate === aggregate
			)
			.map((r) => ({
				label: milestoneTypeOptions.find((mt) => mt.value === r.metric)?.label || r.metric,
				value: r.metric
			}))
			.filter(removeDuplicateOptions)
			.sort(orderByLabel)
	);

	let availablePeriodsOptions = $derived(
		recordIds
			.filter((r) =>
				fuelTech
					? r.fueltech_id === fuelTech &&
						getRegionLongValue(r) === region &&
						r.metric === metric &&
						r.aggregate === aggregate
					: !r.fueltech_id &&
						getRegionLongValue(r) === region &&
						r.metric === metric &&
						r.aggregate === aggregate
			)
			.map((r) => ({
				label: periodOptions.find((p) => p.value === r.period)?.label || r.period,
				value: r.period
			}))
			.filter(removeDuplicateOptions)
			.sort(orderByLabel)
	);

	let availableAggregatesOptions = $derived(
		recordIds
			.filter((r) =>
				fuelTech
					? r.fueltech_id === fuelTech &&
						getRegionLongValue(r) === region &&
						r.metric === metric &&
						r.period === period
					: !r.fueltech_id &&
						getRegionLongValue(r) === region &&
						r.metric === metric &&
						r.period === period
			)
			.map((r) => ({
				label: aggregateOptions.find((a) => a.value === r.aggregate)?.label || r.aggregate,
				value: r.aggregate
			}))
			.filter(removeDuplicateOptions)
			.sort(orderByLabel)
	);

	// $effect(() => {
	// 	console.log('region', region);
	// 	console.log('availableRegionsOptions', availableRegionsOptions);
	// 	console.log('availableFuelTechsOptions', availableFuelTechsOptions);
	// 	console.log('availableMetricsOptions', availableMetricsOptions);
	// 	console.log('availablePeriodsOptions', availablePeriodsOptions);
	// });

	/**
	 * @param {CustomEvent} evt
	 */
	function handleRegionChange(evt) {
		// const findRegion = regions.find((r) => r.value === evt.detail.value);
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
	 * @param {CustomEvent} evt
	 */
	function handleAggregateChange(evt) {
		if (region) {
			goToRecord({
				region,
				fuelTech,
				metric,
				period,
				aggregate: evt.detail.value
			});
		}
	}

	/**
	 * Go to records page
	 * @param {{region: string, fuelTech: string, metric: string, period: string, aggregate: string}} param0
	 */
	function goToRecord({ region, fuelTech, metric, period, aggregate }) {
		// const findRegion = regions.find((r) => r.value === region);
		let fuelTechId = fuelTech ? `.${fuelTech}` : '';
		console.log(`/records/${region}${fuelTechId}.${metric}.${period}.${aggregate}`);

		// window.location = `/records/${
		// 	region
		// }.${fuelTech}.${metric}.${period}.${aggregate}`;

		goto(`/records/${region}${fuelTechId}.${metric}.${period}.${aggregate}`);
	}
</script>

<div class="flex px-10 py-8 md:px-16">
	<a href="/records" class="flex items-center gap-2 text-dark-grey font-space text-sm">
		<span class="rounded-full border border-dark-grey p-1 block">
			<IconChevronLeft class="size-4 relative -left-[1px]" stroke-width="3" />
		</span>
		Back to records
	</a>
</div>

<div class="flex justify-between gap-6 items-center bg-white px-10 py-5 md:px-16 auto">
	<div class="flex gap-6 items-center">
		<div class="text-nowrap">
			<FormSelect
				options={availableRegionsOptions}
				selected={region}
				formLabel="Region"
				paddingX="px-4"
				paddingY="py-3"
				on:change={handleRegionChange}
			/>
		</div>

		<div class="text-nowrap">
			<FormSelect
				options={availableFuelTechsOptions}
				selected={fuelTech}
				formLabel="Technology"
				paddingX="px-4"
				paddingY="py-3"
				on:change={handleFuelTechChange}
			/>
		</div>

		<div class="text-nowrap">
			<FormSelect
				options={availableMetricsOptions}
				selected={metric}
				formLabel="Metric"
				paddingX="px-4"
				paddingY="py-3"
				on:change={handleMetricChange}
			/>
		</div>

		<div class="text-nowrap">
			<FormSelect
				options={availablePeriodsOptions}
				selected={period}
				formLabel="Period"
				paddingX="px-4"
				paddingY="py-3"
				on:change={handlePeriodChange}
			/>
		</div>

		<div class="text-nowrap">
			<FormSelect
				options={availableAggregatesOptions}
				selected={aggregate}
				formLabel="Aggregate"
				paddingX="px-4"
				paddingY="py-3"
				on:change={handleAggregateChange}
			/>
		</div>
	</div>

	{#if record}
		<PageButtons />
	{/if}
</div>
