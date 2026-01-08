<script>
	import { formatDateTime } from '$lib/utils/formatters';
	import { fuelTechName } from '$lib/fuel_techs';
	import FuelTechIcon from '$lib/components/FuelTechIcon.svelte';
	import FacilityStatusIcon from './FacilityStatusIcon.svelte';
	import GenCapViz from './GenCapViz.svelte';
	import formatValue from '../_utils/format-value';

	/**
	 * @type {{
	 *   fueltech_id: string,
	 *   status_id: string,
	 *   isCommissioning: boolean,
	 *   capacity_maximum: number,
	 *   capacity_registered: number,
	 *   max_generation: number,
	 *   bgColor: string,
	 *   max_generation_interval?: string,
	 *   data_first_seen?: string,
	 *   data_last_seen?: string,
	 *   network_id?: string
	 * }}
	 */
	let {
		fueltech_id,
		status_id,
		isCommissioning,
		capacity_maximum,
		capacity_registered,
		max_generation,
		bgColor,
		max_generation_interval,
		data_first_seen,
		data_last_seen,
		network_id = 'NEM'
	} = $props();

	/** Fueltechs that need dark text for contrast */
	const LIGHT_FUELTECHS = ['solar_utility', 'gas_ocgt', 'gas_recip'];

	let capacity = $derived(capacity_maximum || capacity_registered);
	let offset = $derived(network_id === 'WEM' ? '+08:00' : '+10:00');

	/**
	 * Calculate commissioning percentage
	 * @param {number} maxGen
	 * @param {number} cap
	 * @returns {string}
	 */
	function getPercentage(maxGen, cap) {
		if (!cap || cap === 0) return '0';
		return ((maxGen / cap) * 100).toFixed(0);
	}

	/**
	 * Get the parsed date from the date value
	 * @param {string} dateValue
	 * @returns {Date}
	 */
	function getParsedDate(dateValue) {
		if (!dateValue) return new Date();
		const dateStr = dateValue.includes('+') ? dateValue : dateValue + offset;
		return new Date(dateStr);
	}

	// Create unit object for GenCapViz
	let unitForViz = $derived({
		capacity_maximum,
		capacity_registered,
		max_generation
	});
</script>

<div>
	<div class="flex items-center justify-between text-xs gap-4">
		<div class="flex items-center gap-2">
			<span
				class="rounded-full p-1.5 block border border-white/40"
				class:text-black={LIGHT_FUELTECHS.includes(fueltech_id)}
				class:text-white={!LIGHT_FUELTECHS.includes(fueltech_id)}
				style="background-color: {bgColor};"
			>
				<FuelTechIcon fuelTech={fueltech_id} sizeClass={5} border={true} />
			</span>
			<span class="font-medium">{fuelTechName(fueltech_id)}</span>
		</div>

		<div class="capitalize flex items-center gap-1 text-white/70">
			<FacilityStatusIcon status={status_id} {isCommissioning} />
			{status_id}
		</div>
	</div>

	<div class="flex items-center justify-end mt-1">
		<div class="text-xs">
			<span class="text-xxs text-white/60">Capacity:</span>
			{#if max_generation && isCommissioning}
				<span class="font-mono font-bold ml-1">
					{formatValue(max_generation)}
				</span>
				<span class="text-white/60">/</span>
			{/if}
			<span class="font-mono font-bold ml-1">
				{formatValue(capacity)}
			</span>
			<span class="text-xxs text-white/60">MW</span>
			{#if max_generation && isCommissioning}
				<span class="text-white/60 ml-1">
					({getPercentage(max_generation, capacity)}%)
				</span>
			{/if}
		</div>
	</div>

	{#if isCommissioning}
		<div class="mt-2">
			<GenCapViz unit={unitForViz} fill={bgColor} />
		</div>
	{/if}

	{#if max_generation_interval || data_first_seen || data_last_seen}
		<div class="mt-2">
			{#if max_generation_interval && isCommissioning}
				{@const maxGenDate = getParsedDate(max_generation_interval)}
				<div class="text-xxs text-right text-white/60">
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

			{#if (status_id === 'operating' || isCommissioning) && data_first_seen}
				{@const firstGenDate = getParsedDate(data_first_seen)}
				<div class="text-xxs text-right text-white/60">
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

			{#if status_id === 'retired' && data_last_seen}
				{@const lastSeenDate = getParsedDate(data_last_seen)}
				<div class="text-xxs text-right text-white/60">
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
	{/if}
</div>
