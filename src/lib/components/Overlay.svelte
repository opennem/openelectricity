<script>
	import { fade } from 'svelte/transition';
</script>

<div
	transition:fade={{
		duration: 25
	}}
	class="relative z-50"
	role="dialog"
	aria-modal="true"
>
	<div class="fixed z-20 inset-0 backdrop-blur-md bg-black bg-opacity-25 transition-opacity" />

	<div class="fixed inset-0 z-20 overflow-y-auto">
		<div class="flex min-h-full items-center justify-center p-4 sm:p-0">
			<slot />
		</div>
	</div>
</div>
