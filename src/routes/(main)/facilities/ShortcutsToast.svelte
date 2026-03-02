<script>
	import { fly } from 'svelte/transition';
	import { X } from '@lucide/svelte';

	let { visible = false, ondismiss } = $props();
</script>

{#if visible}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-[10000] hidden md:flex items-center justify-center"
		onclick={() => ondismiss?.()}
	>
		<!-- Backdrop -->
		<div class="absolute inset-0 bg-black/20"></div>

		<!-- Panel -->
		<div
			class="relative bg-white border border-warm-grey rounded-2xl shadow-xl px-8 py-6 min-w-[320px]"
			onclick={(e) => e.stopPropagation()}
			transition:fly={{ y: 20, duration: 300 }}
		>
			<!-- Header -->
			<div class="flex items-center justify-between pb-4 mb-5 border-b border-warm-grey">
				<h3 class="text-base font-semibold text-dark-grey mb-0">Keyboard shortcuts</h3>
				<button
					onclick={() => ondismiss?.()}
					class="p-1.5 -mr-1.5 rounded-lg hover:bg-light-warm-grey transition-colors cursor-pointer"
				>
					<X class="size-5 text-mid-grey" />
				</button>
			</div>

			<!-- Shortcuts list -->
			<div class="flex flex-col gap-3">
				<div class="flex items-center justify-between gap-8">
					<span class="text-sm text-mid-grey">Enter / exit full screen</span>
					<kbd
						class="text-xs font-sans text-dark-grey bg-light-warm-grey border border-warm-grey rounded px-2 py-1 leading-none"
					>F</kbd>
				</div>

				<div class="flex items-center justify-between gap-8">
					<span class="text-sm text-mid-grey">Browser full screen</span>
					<div class="flex items-center gap-1">
						<kbd
							class="text-xs font-sans text-dark-grey bg-light-warm-grey border border-warm-grey rounded px-2 py-1 leading-none"
						>Shift</kbd>
						<span class="text-xs text-mid-grey">+</span>
						<kbd
							class="text-xs font-sans text-dark-grey bg-light-warm-grey border border-warm-grey rounded px-2 py-1 leading-none"
						>F</kbd>
					</div>
				</div>

				<div class="flex items-center justify-between gap-8">
					<span class="text-sm text-mid-grey">Search</span>
					<kbd
						class="text-xs font-sans text-dark-grey bg-light-warm-grey border border-warm-grey rounded px-2 py-1 leading-none"
					>/</kbd>
				</div>

				<div class="flex items-center justify-between gap-8">
					<span class="text-sm text-mid-grey">Show shortcuts</span>
					<kbd
						class="text-xs font-sans text-dark-grey bg-light-warm-grey border border-warm-grey rounded px-2 py-1 leading-none"
					>?</kbd>
				</div>

				<div class="flex items-center justify-between gap-8">
					<span class="text-sm text-mid-grey">Exit</span>
					<kbd
						class="text-xs font-sans text-dark-grey bg-light-warm-grey border border-warm-grey rounded px-2 py-1 leading-none"
					>Esc</kbd>
				</div>
			</div>
		</div>
	</div>
{/if}
