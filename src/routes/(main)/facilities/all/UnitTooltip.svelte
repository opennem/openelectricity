<script>
	import { parseAbsolute, parseDate } from '@internationalized/date';
	import { getNumberFormat, formatDateTime } from '$lib/utils/formatters';
	import { fuelTechName } from '$lib/fuel_techs';
	import FacilityStatusIcon from './FacilityStatusIcon.svelte';
	import GenCapViz from './GenCapViz.svelte';

	let { network_id, unit, isCommissioning = false, fill = '#000000' } = $props();

	const numberFormatter = getNumberFormat(0);
	const offset = network_id === 'WEM' ? '+08:00' : '+10:00';

	let capMax = $derived(Number(unit.capacity_maximum));
	let capReg = $derived(Number(unit.capacity_registered));
	let genMax = $derived(Number(unit.max_generation));

	let percentage = $derived((genMax / (capMax || capReg)) * 100);

	/**
	 * Get the parsed date from the date value
	 * @param {string} dateValue
	 * @returns {Date}
	 */
	function getParsedDate(dateValue) {
		if (!dateValue) {
			console.log('dateValue is null, returning today');
			return new Date();
		}

		// inconsistent date format:
		// max_generation_interval: "2025-12-16T14:25:00"
		// data_first_seen: "2025-12-16T14:15:00+10:00"
		// data_last_seen: "2025-12-18T15:00:00+10:00"
		// - so append the offset if it's not there
		const dateStr = dateValue.includes('+') ? dateValue : dateValue + offset;
		return new Date(dateStr);
	}
</script>

<div class="bg-black rounded-lg px-4 py-2 shadow-sm text-white">
	<div class="flex items-center justify-between text-xs gap-6">
		<div>
			<span class="font-bold">{fuelTechName(unit.fueltech_id)}</span>
		</div>

		<div class="capitalize flex items-baseline gap-1">
			<FacilityStatusIcon status={unit.status_id} {isCommissioning} />
			{unit.status_id}
		</div>
	</div>

	<!-- {#if (isCommissioning || unit.status_id === 'operating' || unit.status_id === 'retired') && unit.max_generation} -->
	{#if unit.capacity_maximum || unit.capacity_registered}
		<div class="text-sm my-2">
			<div class="flex items-center justify-end">
				<div>
					<span class="text-xxs">Capacity:</span>

					{#if unit.max_generation && isCommissioning}
						<span class="font-mono font-bold" title="Max generation">
							{numberFormatter.format(unit.max_generation)}
						</span>
						/
					{/if}

					<span
						class="font-mono font-bold"
						title={unit.capacity_maximum ? 'Maximum Capacity' : 'Registered Capacity'}
					>
						{numberFormatter.format(unit.capacity_maximum || unit.capacity_registered)}
					</span>
					<span class="text-xxs">MW</span>

					{#if unit.max_generation && isCommissioning}
						<span>({percentage.toFixed(0)}%)</span>
					{/if}
				</div>
			</div>

			{#if isCommissioning}
				<div class="mt-2 mb-4">
					<GenCapViz {unit} {fill} />
				</div>
			{/if}
		</div>
	{/if}

	{#if unit.max_generation_interval && isCommissioning}
		{@const maxGenDate = getParsedDate(unit.max_generation_interval)}
		<div class="text-xxs text-right">
			Max generated at
			<span>
				{formatDateTime({
					date: maxGenDate,
					hour: 'numeric',
					minute: '2-digit',
					hour12: true
				})
					.split(' ')
					.join('')} on
				{formatDateTime({
					date: maxGenDate,
					month: 'short',
					day: 'numeric',
					year: 'numeric'
				})}
			</span>
		</div>
	{/if}

	{#if (unit.status_id === 'operating' || isCommissioning) && unit.data_first_seen}
		{@const firstGenDate = getParsedDate(unit.data_first_seen)}
		<div class="text-xxs text-right">
			First generated at
			<span>
				{formatDateTime({
					date: firstGenDate,
					hour: 'numeric',
					minute: '2-digit',
					hour12: true
				})
					.split(' ')
					.join('')} on
				{formatDateTime({
					date: firstGenDate,
					month: 'short',
					day: 'numeric',
					year: 'numeric'
				})}
			</span>
		</div>
	{/if}

	{#if unit.status_id === 'retired' && unit.data_last_seen}
		{@const lastSeenDate = getParsedDate(unit.data_last_seen)}
		<div class="text-xxs text-right">
			Last generated at
			<span>
				{formatDateTime({
					date: lastSeenDate,
					hour: 'numeric',
					minute: '2-digit',
					hour12: true
				})
					.split(' ')
					.join('')} on
				{formatDateTime({
					date: lastSeenDate,
					month: 'short',
					day: 'numeric',
					year: 'numeric'
				})}
			</span>
		</div>
	{/if}
</div>
