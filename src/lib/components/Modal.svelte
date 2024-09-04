<script>
	import { fade } from 'svelte/transition';

	export let maxWidthClass = 'max-w-screen-md';

	$: classProps = $$restProps.class;
</script>

<div
	transition:fade={{ duration: 200 }}
	class={`grid grid-cols-1 content-between relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 shadow-xl transition-all w-full sm:my-8 sm:p-6 ${maxWidthClass} ${classProps}`}
>
	<div class="overflow-y-auto">
		<slot />
	</div>
	<div class="mt-0 border-t border-warm-grey px-10 py-6">
		<slot name="buttons" />
	</div>
</div>
