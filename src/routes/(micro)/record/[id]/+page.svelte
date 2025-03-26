<script>
	import { parseISO } from 'date-fns';

	import { browser } from '$app/environment';
	import { regionsWithLabels } from '$lib/regions';
	import { getNumberFormat } from '$lib/utils/formatters';

	import Icon from '$lib/components/Icon.svelte';
	import { fuelTechColourMap } from '$lib/fuel_techs';
	import FuelTechIcon from '../../../(main)/records/components/FuelTechIcon.svelte';

	import { formatRecordValue } from '../../../(main)/records/page-data-options/formatters';
	import recordDescription from '../../../(main)/records/page-data-options/record-description';
	import getRelativeTime from '../../../(main)/records/page-data-options/relative-time';
	import { xTickValueFormatters } from '../../../(main)/records/[id]/RecordHistory/helpers/config';

	import MiniTracker from './components/MiniTracker.svelte';

	let { data } = $props();
	let { record_id, fueltech_id, period, network_id, network_region } = $derived(data);

	const id = record_id;

	/** @type {MilestoneRecord} */
	let currentRecord = $state();

	$inspect('period', period);

	let formatX = $derived(xTickValueFormatters[period].format);
	$inspect('formatX', formatX);

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
		const data = jsonData.data && jsonData.data.length ? jsonData.data[0] : {};
		return data;
	}
	$effect(() => {
		if (browser && id) {
			fetchRecord(id).then((record) => {
				console.log('record', record);
				let date = new Date(record.interval);

				currentRecord = record;
				currentRecord.date = date;
				currentRecord.time = date.getTime();
			});
		}
	});

	let pageTitle = $derived.by(() => {
		if (!data) return 'Record';

		let desc = recordDescription(
			data.period || '',
			data.aggregate || '',
			data.metric || '',
			data.fueltech_id || ''
		);
		let networkId = data.network_id?.toLowerCase();

		if (data.network_region) {
			desc += ` in ${regionsWithLabels[data.network_region.toLowerCase()]}`;
		} else if (networkId && regionsWithLabels[networkId]) {
			desc += ` in ${regionsWithLabels[networkId]}`;
		} else {
			desc += ` in the ${networkId?.toUpperCase()}`;
		}

		return desc;
	});

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

{#if currentRecord}
	{@const ftId = fueltech_id || 'demand'}
	<div
		class="max-w-[1180px] h-full m-[10px] p-6 text-black bg-white border border-mid-warm-grey rounded-xl grid grid-cols-1 gap-4 content-between"
	>
		<header>
			<div class="flex items-center gap-6 pt-5 md:pt-0">
				<span
					class="bg-{ftId} rounded-full p-3 place-self-start"
					class:text-black={ftId === 'solar'}
					class:text-white={ftId !== 'solar'}
				>
					<FuelTechIcon fuelTech={ftId} sizeClass={10} />
				</span>

				<h2 class="leading-lg text-lg font-medium mb-0">
					{pageTitle}
				</h2>
			</div>

			<div
				class="flex md:flex-col md:justify-end text-dark-grey rounded-2xl px-8 pt-6 pb-4 bg-light-warm-grey md:ml-2"
			>
				<div class="text-xs text-mid-grey font-space uppercase w-full text-left">
					Current record
				</div>

				<div class="text-right w-full">
					<div class="text-2xl leading-none font-semibold">
						{getNumberFormat(0).format(currentRecord.value || 0)}
						<small class="text-xs font-mono">
							{currentRecord.value_unit}
						</small>
					</div>

					<span class="text-xs font-light text-mid-grey">
						{formatX(currentRecord.date)}
					</span>
				</div>
			</div>
		</header>

		<MiniTracker record={currentRecord} />
	</div>
{/if}
