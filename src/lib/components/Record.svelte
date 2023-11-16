<script>
	import Icon from './Icon.svelte';
	import { format } from 'date-fns';

	/** @type {import('$lib/types/record.types').Record[]} */
	export let record;
</script>

<div
	class={`bg-white p-6 pl-24 border-[0.05rem] border-mid-warm-grey border-solid rounded relative ${$$restProps.class}`}
>
	<span
		class={`flex justify-center items-center w-12 h-12 bg-warm-grey rounded-full absolute top-5 left-6`}
	>
		<Icon icon={record[0].fuel_tech} size={16} />
	</span>
	<div class="grid record-layout gap-8">
		<div class="pr-8 border-r-[0.05rem] border-solid border-mid-warm-grey">
			<h5 class="font-medium">{record[0].description}</h5>
		</div>
		<div>
			{#each record as instance, i}
				<div class={`grid record-value gap-4 ${i === 0 ? 'text-base' : 'text-sm text-mid-grey'}`}>
					<div>
						<span>{instance.unit === '$' ? '$' : ''}{instance.value.toLocaleString('en-US')}</span>
						{#if instance.unit !== '$' && i === 0}
							<span class="text-sm text-mid-grey">{instance.unit}</span>
						{/if}
					</div>
					<div class="text-right text-sm">{format(Date.parse(instance.time), 'K:mm aaa')}</div>
				</div>
			{/each}
		</div>
	</div>
</div>

<style>
	.record-layout {
		grid-template-columns: 6fr 4fr;
	}
	.record-value {
		grid-template-columns: auto auto;
	}
</style>
