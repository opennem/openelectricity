<script>
	import Icon from '$lib/components/Icon.svelte';
	import { fuelTechName } from '$lib/fuel_techs';
	import { formatRecordInterval } from '$lib/records';
	import { format } from 'date-fns';
	import { formatInTimeZone } from 'date-fns-tz';

	/** @type {import('$lib/types/record.types').Record[]} */
	export let record;

	$: highlightTextColor =
		record[0].fueltech === 'gas' || record[0].fueltech === 'solar' ? 'text-black' : 'text-white';
</script>

<div
	class={`bg-white border-[0.05rem] border-mid-warm-grey border-solid rounded relative grid record-layout ${$$restProps.class}`}
>
	<div class="p-6 relative">
		<span
			class={`inline-flex flex-shrink-0 justify-center items-center h-12 px-4 bg-${record[0].fueltech} rounded-full mr-6 mb-8 text-xs ${highlightTextColor}`}
		>
			<Icon icon={record[0].fueltech} size={16} class="mr-2" />
			{fuelTechName(record[0].fueltech)}
		</span>
		<h5 class="font-medium text-lg leading-lg pr-2">{record[0].description}</h5>
	</div>
	<div class={`grain-bg bg-${record[0].fueltech} ${highlightTextColor}`}>
		<div class="p-6">
			{#each record as instance, i}
				<div
					class={`grid record-value gap-4 relative z-20 ${
						i === 0 ? 'text-base leading-lg' : 'leading-base'
					}`}
				>
					<div class="self-end">
						<span class={i === 0 ? 'text-lg leading-lg' : ''}
							>{instance.unit === '$' ? '$' : ''}{instance.value.toLocaleString('en-US')}</span
						>
						{#if instance.unit !== '$' && i === 0}
							<span class="text-xs">{instance.unit}</span>
						{/if}
					</div>
					<div class="self-end text-right text-xs">
						{formatRecordInterval(instance.interval, 'K:mm aaa')}
					</div>
				</div>
			{/each}
		</div>
		<div class="h-32 bg-[url('/img/significant-record.png')] bg-no-repeat bg-top bg-cover" />
	</div>
</div>

<style lang="postcss">
	.record-layout {
		grid-template-columns: 62% 38%;
	}
	.record-value {
		grid-template-columns: auto auto;
	}
</style>
