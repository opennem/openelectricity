<script>
	import FuelTechTag from '$lib/components/FuelTechTag.svelte';
	import { formatRecordInterval, recordDescription } from '$lib/records';
	import { format, parseISO } from 'date-fns';
	import { formatInTimeZone } from 'date-fns-tz';

	/** @type {import('$lib/types/record.types').Record[]} */
	export let record;

	$: console.log('record', record);
</script>

<div
	class={`bg-white border-[0.05rem] border-mid-warm-grey border-solid rounded relative grid record-layout ${$$restProps.class}`}
>
	<div class="flex p-6 relative record-desc">
		<FuelTechTag fueltech={record[0].fueltech} />
		<h5 class="font-medium">{recordDescription(record[0])}</h5>
	</div>
	<div class="p-6">
		{#each record as instance, i}
			<div
				class={`grid record-value gap-4 leading-base ${i === 0 ? 'text-base' : ' text-mid-grey'}`}
			>
				<div class="self-end">
					<span>{instance.unit === '$' ? '$' : ''}{instance.value.toLocaleString('en-AU')}</span>
					{#if instance.unit !== '$' && i === 0}
						<span class="text-xs text-mid-grey">{instance.unit}</span>
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
