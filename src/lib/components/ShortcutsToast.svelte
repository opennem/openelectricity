<script>
	import { fly } from 'svelte/transition';
	import { X } from '@lucide/svelte';
	import { portal } from '$lib/actions/portal.js';
	import { Backdrop } from '$lib/components/ui/backdrop';

	/**
	 * @typedef {{ label: string, keys: string[] }} Shortcut
	 */

	/**
	 * @type {{
	 *   visible?: boolean,
	 *   ondismiss?: () => void,
	 *   shortcuts?: Shortcut[]
	 * }}
	 */
	let { visible = false, ondismiss, shortcuts = [] } = $props();
</script>

<Backdrop open={visible} onclick={() => ondismiss?.()} />

{#if visible}
	<div
		use:portal
		class="fixed inset-0 z-[9999] hidden md:flex items-center justify-center pointer-events-none"
	>
		<!-- Panel -->
		<div
			class="bg-white border border-warm-grey rounded-2xl shadow-xl px-8 py-6 min-w-[320px] pointer-events-auto"
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
				{#each shortcuts as shortcut (shortcut.label)}
					<div class="flex items-center justify-between gap-8">
						<span class="text-sm text-mid-grey">{shortcut.label}</span>
						{#if shortcut.keys.length === 1}
							<kbd
								class="text-xs font-sans text-dark-grey bg-light-warm-grey border border-warm-grey rounded px-2 py-1 leading-none"
								>{shortcut.keys[0]}</kbd
							>
						{:else}
							<div class="flex items-center gap-1">
								{#each shortcut.keys as key, i (key)}
									{#if i > 0}
										<span class="text-xs text-mid-grey">+</span>
									{/if}
									<kbd
										class="text-xs font-sans text-dark-grey bg-light-warm-grey border border-warm-grey rounded px-2 py-1 leading-none"
										>{key}</kbd
									>
								{/each}
							</div>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	</div>
{/if}
