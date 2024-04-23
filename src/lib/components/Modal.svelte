<script>
	import { fade } from 'svelte/transition';

	export let maxWidthClass = 'max-w-screen-md';
</script>

<div
	transition:fade={{ duration: 200 }}
	class={`relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 shadow-xl transition-all w-full sm:my-8 sm:p-6 ${maxWidthClass}`}
>
	<slot />
	<div class="mt-5 sm:mt-6 flex justify-end gap-2">
		<slot name="buttons" />
	</div>
</div>
