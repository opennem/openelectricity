<script>
	import { getNumberFormat, formatDateTime } from '$lib/utils/formatters';
	import FacilityStatusIcon from './FacilityStatusIcon.svelte';
	let { unit, isCommissioning = false } = $props();

	const numberFormatter = getNumberFormat(0);

	let capMax = $derived(Number(unit.capacity_maximum));
	let capReg = $derived(Number(unit.capacity_registered));
	let genMax = $derived(Number(unit.max_generation));

	let percentage = $derived((genMax / (capMax || capReg)) * 100);
</script>

<div class="bg-black rounded-lg px-4 py-2 shadow-sm text-white">
	<div class="text-xs capitalize flex items-baseline gap-1">
		<FacilityStatusIcon status={unit.status_id} {isCommissioning} />
		{unit.status_id}
	</div>

	{#if (isCommissioning || unit.status_id === 'operating' || unit.status_id === 'retired') && unit.max_generation}
		<div class="text-xs">
			<span class="font-mono font-bold" title="Max generation">
				{numberFormatter.format(unit.max_generation)}
			</span>
			/
			<span
				class="font-mono font-bold"
				title={unit.capacity_maximum ? 'Maximum Capacity' : 'Registered Capacity'}
			>
				{numberFormatter.format(unit.capacity_maximum || unit.capacity_registered)}
			</span>
			<span class="text-xxs">MW</span>

			<span>({percentage.toFixed(0)}%)</span>
		</div>
	{/if}

	{#if unit.max_generation_interval}
		<div class="text-xs">
			Max generated on
			<span>
				{formatDateTime({
					date: unit.max_generation_interval ? new Date(unit.max_generation_interval) : new Date(),
					hour: 'numeric',
					minute: '2-digit',
					hour12: true
				})
					.split(' ')
					.join('')},

				{formatDateTime({
					date: unit.max_generation_interval ? new Date(unit.max_generation_interval) : new Date(),
					month: 'short',
					day: 'numeric',
					year: 'numeric'
				})}
			</span>
		</div>
	{/if}

	{#if (unit.status_id === 'operating' || isCommissioning) && unit.data_first_seen}
		<div class="text-xs">
			First seen on
			<span>
				{formatDateTime({
					date: unit.data_first_seen ? new Date(unit.data_first_seen) : new Date(),
					hour: 'numeric',
					minute: '2-digit',
					hour12: true
				})
					.split(' ')
					.join('')},

				{formatDateTime({
					date: unit.data_first_seen ? new Date(unit.data_first_seen) : new Date(),
					month: 'short',
					day: 'numeric',
					year: 'numeric'
				})}
			</span>
		</div>
	{/if}

	{#if unit.status_id === 'retired' && unit.data_last_seen}
		<div class="text-xs">
			Last seen on
			<span>
				{formatDateTime({
					date: unit.data_last_seen ? new Date(unit.data_last_seen) : new Date(),
					hour: 'numeric',
					minute: '2-digit',
					hour12: true
				})
					.split(' ')
					.join('')},

				{formatDateTime({
					date: unit.data_last_seen ? new Date(unit.data_last_seen) : new Date(),
					month: 'short',
					day: 'numeric',
					year: 'numeric'
				})}
			</span>
		</div>
	{/if}
</div>
