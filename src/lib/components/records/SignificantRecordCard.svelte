<script>
	import { formatRecordInterval, recordDescription } from '$lib/records';
	import { format } from 'date-fns';
	import { formatInTimeZone } from 'date-fns-tz';
	import FuelTechTag from '$lib/components/FuelTechTag.svelte';

	/** @type {import('$lib/types/record.types').Record[]} */
	export let record;

	$: highlightTextColor =
		record[0].fueltech === 'gas' || record[0].fueltech === 'solar' ? 'text-black' : 'text-white';
</script>

<div
	class={`bg-white border-[0.05rem] border-mid-warm-grey border-solid rounded relative grid record-layout ${$$restProps.class}`}
>
	<div class="p-6 relative">
		<FuelTechTag fueltech={record[0].fueltech} />
		<h5 class="font-medium text-lg leading-lg pr-2 mt-8">{recordDescription(record[0])}</h5>
	</div>
	<div class={`grain-bg bg-${record[0].fueltech} ${highlightTextColor}`}>
		<div class="p-6">
			{#each record as instance, i}
				<div
					class={`grid record-value gap-4 relative z-[15] ${
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
		<div
			style={`background-image: url(/img/records/${record[0].fueltech}.png)`}
			class={`h-44 bg-no-repeat bg-top bg-cover`}
		/>
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
