<script>
	import { goto } from '$app/navigation';
	import FormSelect from '$lib/components/form-elements/Select.svelte';
	import {
		regions,
		fuelTechOptions,
		milestoneTypeOptions,
		periodOptions,
		aggregateOptions
	} from '../../page-data-options/filters.js';
	// import { recordState } from './stores/state.svelte.js';
	import LinkCopyButton from '$lib/components/LinkCopyButton.svelte';

	let { record_id, network_id, network_region, fueltech_id, metric, period, aggregate, recordIds } =
		$props();

	/**
	 * @param {MilestoneRecord | undefined} record
	 * @returns {string}
	 */
	function getRegionLongValue(record) {
		if (!record) return '';
		let network_region = record.network_region ? `.${record.network_region.toLowerCase()}` : '';
		return `au.${record.network_id.toLowerCase()}${network_region}`;
	}

	let regionLongValue = $derived(
		`au.${network_id ? network_id.toLowerCase() : ''}${network_region ? `.${network_region.toLowerCase()}` : ''}`
	);
	let region = $derived(regions.find((r) => r.longValue === regionLongValue)?.longValue || '');
	let fuelTech = $derived(fueltech_id || null);

	let removeDuplicateOptions =
		/** @type {(r: { value: string | undefined }, index: number, self: { value: string | undefined }[]) => boolean} */ (
			r,
			index,
			self
		) => index === self.findIndex((t) => t.value === r.value);

	let orderByLabel =
		/** @type {(a: { label: string | undefined }, b: { label: string | undefined }) => number} */ (
			a,
			b
		) => (a.label || '').localeCompare(b.label || '');

	// check the recordIds and return as options (i.e. { label: 'NSW', value: 'au.nem.nsw1' 	})
	let availableRegions = $derived(
		recordIds
			?.filter((r) =>
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
	let availableRegionsOptions = $derived(
		regions.map((r) => ({
			label: r.label,
			value: r.longValue,
			divider: r.divider,
			labelClassName: availableRegions?.find((m) => m.value === r.longValue)
				? ''
				: 'italic text-mid-warm-grey'
		}))
	);

	let availableFuelTechs = $derived(
		recordIds
			?.filter(
				(r) =>
					getRegionLongValue(r) === region &&
					r.metric === metric &&
					r.period === period &&
					r.aggregate === aggregate
			)
			.map((r) => ({
				label: fuelTechOptions.find((ft) => ft.value === r.fueltech_id)?.label || r.fueltech_id,
				value: r.fueltech_id
			}))
			.filter(removeDuplicateOptions)
			.sort(orderByLabel)
	);
	let availableFuelTechsOptions = $derived(
		fuelTechOptions.map((r) => ({
			...r,
			labelClassName: availableFuelTechs?.find((m) => m.value === r.value)
				? ''
				: 'italic text-mid-warm-grey'
		}))
	);

	let availableMetrics = $derived(
		recordIds
			?.filter((r) =>
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
	let availableMetricsOptions = $derived(
		milestoneTypeOptions.map((r) => ({
			...r,
			labelClassName: availableMetrics?.find((m) => m.value === r.value)
				? ''
				: 'italic text-mid-warm-grey'
		}))
	);

	let availablePeriods = $derived(
		recordIds
			?.filter((r) =>
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
	let availablePeriodsOptions = $derived(
		periodOptions.map((r) => ({
			...r,
			labelClassName: availablePeriods?.find((m) => m.value === r.value)
				? ''
				: 'italic text-mid-warm-grey'
		}))
	);

	let availableAggregates = $derived(
		recordIds
			?.filter((r) =>
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
	let availableAggregatesOptions = $derived(
		aggregateOptions.map((r) => ({
			...r,
			labelClassName: availableAggregates?.find((m) => m.value === r.value)
				? ''
				: 'italic text-mid-warm-grey'
		}))
	);

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
		goToRecord({
			region,
			fuelTech: evt.detail.value,
			metric,
			period,
			aggregate
		});
	}

	/**
	 * @param {CustomEvent} evt
	 */
	function handleMetricChange(evt) {
		let recordPeriod = period;
		if (evt.detail.value === 'power' && recordPeriod !== 'interval') {
			recordPeriod = 'interval';
		}
		if (evt.detail.value !== 'power' && recordPeriod === 'interval') {
			recordPeriod = 'day';
		}
		goToRecord({
			region,
			fuelTech,
			metric: evt.detail.value,
			period: recordPeriod,
			aggregate
		});
	}

	/**
	 * @param {CustomEvent} evt
	 */
	function handlePeriodChange(evt) {
		let recordMetric = metric;
		if (evt.detail.value === 'interval' && recordMetric !== 'power') {
			recordMetric = 'power';
		}
		if (evt.detail.value !== 'interval' && recordMetric === 'power') {
			recordMetric = 'energy';
		}
		goToRecord({
			region,
			fuelTech,
			metric: recordMetric,
			period: evt.detail.value,
			aggregate
		});
	}

	/**
	 * @param {CustomEvent} evt
	 */
	function handleAggregateChange(evt) {
		goToRecord({
			region,
			fuelTech,
			metric,
			period,
			aggregate: evt.detail.value
		});
	}

	/**
	 * Go to records page
	 * @param {{region: string |null, fuelTech: string |null, metric: string |null, period: string |null, aggregate: string |null}} param0
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

{#if record_id}
	{@const px = 'px-4'}
	{@const py = 'py-3'}
	<div class="text-sm flex justify-between gap-6 items-center px-6 py-2 md:px-12 auto">
		<div class="flex gap-6 items-center">
			<div class="text-nowrap">
				<FormSelect
					options={availableRegionsOptions}
					selected={region}
					formLabel="Region"
					paddingX={px}
					paddingY={py}
					on:change={handleRegionChange}
				/>
			</div>

			<div class="text-nowrap">
				<FormSelect
					options={availableFuelTechsOptions}
					selected={fuelTech}
					formLabel="Technology"
					paddingX={px}
					paddingY={py}
					on:change={handleFuelTechChange}
				/>
			</div>

			<div class="text-nowrap">
				<FormSelect
					options={availableMetricsOptions}
					selected={metric}
					formLabel="Metric"
					paddingX={px}
					paddingY={py}
					on:change={handleMetricChange}
				/>
			</div>

			<div class="text-nowrap">
				<FormSelect
					options={availablePeriodsOptions}
					selected={period}
					formLabel="Period"
					paddingX={px}
					paddingY={py}
					on:change={handlePeriodChange}
				/>
			</div>

			<div class="text-nowrap">
				<FormSelect
					options={availableAggregatesOptions}
					selected={aggregate}
					formLabel="Aggregate"
					paddingX={px}
					paddingY={py}
					on:change={handleAggregateChange}
				/>
			</div>
		</div>

		{#if record_id}
			<div class="pr-4">
				<LinkCopyButton />
			</div>
		{/if}
	</div>
{/if}
