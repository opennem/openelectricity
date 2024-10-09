<script>
	import IconChevronLeft from '$lib/icons/ChevronLeft.svelte';
	import PageButtons from './PageButtons.svelte';
</script>

<div class="flex justify-between items-center">
	<a href="/records" class="flex items-center gap-2 text-dark-grey font-space text-sm">
		<span class="rounded-full border border-dark-grey p-1 block">
			<IconChevronLeft class="size-4 relative -left-[1px]" stroke-width="3" />
		</span>
		Back
	</a>

	<PageButtons />
</div>
