<script>
	export let yValue;
	export let xValue;
</script>

<div class="h-6">
	{#if xValue}
		<div class="h-full items-center flex justify-end gap-1 text-xs leading-xs whitespace-nowrap">
			<span class="px-2 py-1 font-light"> {xValue} </span>

			<div class="bg-light-warm-grey px-4 py-1 flex gap-6 items-center">
				<div class="flex items-center gap-2">
					<!-- <div class="flex items-center gap-2">Label</div> -->

					<strong class="font-semibold">{yValue}</strong>
				</div>
			</div>
		</div>
	{:else}
		<!-- <div class="h-full text-right text-xs text-mid-grey py-1">default text</div> -->
	{/if}
</div>
