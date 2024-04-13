<script>
	import IconChevronTripleRight from '$lib/icons/ChevronTripleRight.svelte';

	export let regions = '';
	export let value = 0;

	const absRound = (val) => auNumber.format(Math.abs(Math.round(val)));
	const auNumber = new Intl.NumberFormat('en-AU', {
		maximumFractionDigits: 0
	});

	$: regionArr = regions.split('->').map((region) => region.slice(0, -1));
	$: console.log('regionArr', regionArr);
	$: isReversed = value < 0;
</script>

<div class="rounded-lg border border-warm-grey p-4 bg-white">
	<div class="flex items-center gap-2 font-semibold text-xs leading-xs text-dark-grey">
		{#if isReversed}
			<span>{regionArr[1]}</span> <IconChevronTripleRight /> <span>{regionArr[0]}</span>
		{:else}
			<span>{regionArr[0]}</span> <IconChevronTripleRight /> <span>{regionArr[1]}</span>
		{/if}
	</div>

	<div class="text-dark-grey text-left flex items-end gap-1">
		<span class="font-space text-sm leading-sm">{absRound(value)}</span>
		<small class="text-mid-warm-grey text-xs leading-xs font-light">MW</small>
	</div>
</div>
