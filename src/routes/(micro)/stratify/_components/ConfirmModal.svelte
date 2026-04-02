<script>
	/**
	 * @type {{
	 *   open: boolean,
	 *   title: string,
	 *   message: string,
	 *   confirmLabel?: string,
	 *   onconfirm: () => void,
	 *   oncancel: () => void
	 * }}
	 */
	let { open, title, message, confirmLabel = 'Delete', onconfirm, oncancel } = $props();

	/** @param {KeyboardEvent} e */
	function handleKeydown(e) {
		if (open && e.key === 'Escape') {
			oncancel();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<!-- Backdrop -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
		role="presentation"
		onclick={oncancel}
	>
		<!-- Modal card -->
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="bg-white rounded-lg shadow-lg w-80 mx-4 font-mono"
			onclick={(e) => e.stopPropagation()}
		>
			<div class="px-4 pt-4 pb-3">
				<h3 class="text-[11px] font-bold text-dark-grey uppercase tracking-wide">{title}</h3>
				<p class="text-[11px] text-mid-grey mt-2 leading-relaxed">{message}</p>
			</div>

			<div class="flex items-center justify-end gap-2 px-4 pb-4 pt-1">
				<button
					type="button"
					onclick={oncancel}
					class="rounded border border-warm-grey px-3 py-1.5 text-[10px] text-mid-grey hover:text-dark-grey hover:border-dark-grey transition-colors"
				>
					Cancel
				</button>
				<button
					type="button"
					onclick={onconfirm}
					class="rounded bg-dark-grey px-3 py-1.5 text-[10px] text-white hover:bg-black transition-colors"
				>
					{confirmLabel}
				</button>
			</div>
		</div>
	</div>
{/if}
