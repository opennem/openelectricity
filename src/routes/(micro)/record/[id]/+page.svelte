<script>
	import { regionsWithLabels } from '$lib/regions';
	import { getNumberFormat } from '$lib/utils/formatters';
	import FuelTechIcon from '../../../(main)/records/components/FuelTechIcon.svelte';
	import recordDescription from '../../../(main)/records/page-data-options/record-description';
	import { xTickValueFormatters } from '../../../(main)/records/[id]/RecordHistory/helpers/config';
	import MiniTracker from './components/MiniTracker.svelte';

	let { data } = $props();
	let { record, timeSeries, focusRecord, timeZone, period, focusTime, fuelTechId, metric } =
		$derived(data);

	/** @type {MilestoneRecord} */
	let currentRecord = $derived(record);
	let formatX = $derived(xTickValueFormatters[period].format);
	let recordSetOnDate = $derived(formatX(focusRecord.date, timeZone));

	let pageTitle = $derived.by(() => {
		if (!currentRecord) return 'Record';

		let desc = recordDescription(
			currentRecord.period || '',
			currentRecord.aggregate || '',
			currentRecord.metric || '',
			currentRecord.fueltech_id || ''
		);
		let networkId = currentRecord.network_id?.toLowerCase();

		if (currentRecord.network_region) {
			desc += ` in ${regionsWithLabels[currentRecord.network_region.toLowerCase()]}`;
		} else if (networkId && regionsWithLabels[networkId]) {
			desc += ` in ${regionsWithLabels[networkId]}`;
		} else {
			desc += ` in the ${networkId?.toUpperCase()}`;
		}

		return desc;
	});
</script>

{#if currentRecord}
	{@const ftId = fuelTechId || 'demand'}
	<div
		class="w-[1100px] h-full m-[50px] text-black bg-white grid grid-cols-1 gap-4 content-between"
	>
		<div class="border-b border-mid-warm-grey p-6">
			<header class="flex gap-12 justify-between items-center mb-10">
				<div class="flex flex-col gap-6 pt-5 md:pt-0">
					<span
						class="bg-{ftId} rounded-full p-3 place-self-start"
						class:text-black={ftId === 'solar'}
						class:text-white={ftId !== 'solar'}
					>
						<FuelTechIcon fuelTech={ftId} sizeClass={16} />
					</span>

					<h2 class="leading-3xl text-3xl font-medium mb-0">
						{pageTitle}
					</h2>
				</div>

				<div
					class="flex md:flex-col md:justify-end rounded-2xl px-8 pt-6 pb-4 bg-light-warm-grey md:ml-2"
				>
					<div
						class="md:text-right text-lg text-mid-grey font-space uppercase w-full text-left border-b border-mid-warm-grey pb-2 mb-2"
					>
						Record set on
					</div>

					<div class="text-right w-full whitespace-nowrap">
						<span class="text-2xl font-medium text-mid-grey">
							{recordSetOnDate}
						</span>
						<div class="text-7xl leading-none font-semibold text-dark-grey">
							{getNumberFormat(0).format(focusRecord.value)}
							<small class="text-xl font-mono">
								{focusRecord.value_unit}
							</small>
						</div>
					</div>
				</div>
			</header>

			<MiniTracker record={currentRecord} {focusTime} {timeSeries} {metric} {period} {timeZone} />
		</div>

		<div class="p-6 pt-0 flex justify-end">
			<img src="/img/logo.svg" alt="Open Electricity logo" class="block h-10 w-auto my-5" />
		</div>
	</div>
{/if}
