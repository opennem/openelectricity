<script>
	import FuelTechTag from '$lib/components/FuelTechTag.svelte';
	import { formatRecordInterval, recordDescription } from '$lib/records';
	import { format, parseISO } from 'date-fns';
	import { formatInTimeZone } from 'date-fns-tz';

	
	/**
	 * @typedef {Object} Props
	 * @property {import('$lib/types/record.types').Record[]} record - $: console.log('record', record);
	 */

	/** @type {Props & { [key: string]: any }} */
	let { record, ...rest } = $props();

	
</script>

<div
	class={`bg-white border-[0.05rem] border-mid-warm-grey border-solid rounded relative grid record-layout ${rest.class}`}
>
	<div class="flex p-6 relative record-desc">
		{#if record[0].fueltech}
			<FuelTechTag fueltech={record[0].fueltech} />
		{/if}
		<h5 class="font-medium">{record[0].description}</h5>
	</div>
	<div class="p-6">
		{#each record as instance, i}
			<div
				class={`grid record-value gap-4 leading-base ${i === 0 ? 'text-base' : ' text-mid-grey'}`}
			>
				<div class="self-end">
					<span>{instance.unit === '$' ? '$' : ''}{instance.value.toLocaleString('en-AU')}</span>
					{#if instance.unit !== '$' && i === 0}
						<span class="text-xs text-mid-grey">{instance.value_unit}</span>
					{/if}
				</div>
				<div class="self-end text-right text-xs">
					{formatRecordInterval(instance.interval, 'K:mm aaa')}
				</div>
			</div>
		{/each}
	</div>
</div>

<style lang="postcss">
	.record-desc:after {
		content: '';
		display: block;
		position: absolute;
		width: 0.05rem;
		height: calc(100% - 3rem);
		right: 0;
		top: 50%;
		transform: translateY(-50%);
		background-color: theme(colors.mid-warm-grey);
	}
	.record-layout {
		grid-template-columns: 62% 38%;
	}
	.record-value {
		grid-template-columns: auto auto;
	}
</style>
