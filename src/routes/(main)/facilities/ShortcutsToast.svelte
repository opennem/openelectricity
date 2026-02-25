<script>
	import { fly } from 'svelte/transition';

	let { visible = false, ondismiss } = $props();

	/** @type {ReturnType<typeof setTimeout> | undefined} */
	let timer;

	$effect(() => {
		if (visible) {
			clearTimeout(timer);
			timer = setTimeout(() => {
				ondismiss?.();
			}, 5000);
		}

		return () => clearTimeout(timer);
	});
</script>

{#if visible}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 hidden md:flex items-center gap-4 bg-white border border-warm-grey rounded-full shadow-md px-5 py-2.5 cursor-pointer"
		onclick={() => ondismiss?.()}
		transition:fly={{ y: 20, duration: 300 }}
	>
		<div class="flex items-center gap-1.5">
			<kbd
				class="text-[10px] font-sans text-dark-grey bg-light-warm-grey border border-warm-grey rounded px-1.5 py-0.5 leading-none"
				>F</kbd
			>
			<span class="text-xs text-mid-grey">fullscreen</span>
		</div>

		<div class="flex items-center gap-1.5">
			<kbd
				class="text-[10px] font-sans text-dark-grey bg-light-warm-grey border border-warm-grey rounded px-1.5 py-0.5 leading-none"
				>/</kbd
			>
			<span class="text-xs text-mid-grey">search</span>
		</div>

		<div class="flex items-center gap-1.5">
			<kbd
				class="text-[10px] font-sans text-dark-grey bg-light-warm-grey border border-warm-grey rounded px-1.5 py-0.5 leading-none"
				>Esc</kbd
			>
			<span class="text-xs text-mid-grey">exit fullscreen</span>
		</div>

		<div class="flex items-center gap-1.5 pl-2 border-l border-warm-grey">
			<kbd
				class="text-[10px] font-sans text-dark-grey bg-light-warm-grey border border-warm-grey rounded px-1.5 py-0.5 leading-none"
				>?</kbd
			>
			<span class="text-xs text-mid-grey">show shortcuts</span>
		</div>
	</div>
{/if}
