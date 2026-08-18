<script>
	import { portal } from '$lib/actions/portal.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Backdrop } from '$lib/components/ui/backdrop';
	import * as Card from '$lib/components/ui/card/index.js';

	/**
	 * @type {{
	 *   open: boolean,
	 *   title: string,
	 *   message: string,
	 *   confirmLabel?: string,
	 *   loading?: boolean,
	 *   loadingConfirmLabel?: string,
	 *   secondaryLabel?: string,
	 *   onconfirm: () => void,
	 *   onsecondary?: () => void,
	 *   oncancel: () => void
	 * }}
	 */
	let {
		open,
		title,
		message,
		confirmLabel = 'Delete',
		loading = false,
		loadingConfirmLabel = '...',
		secondaryLabel,
		onconfirm,
		onsecondary,
		oncancel
	} = $props();

	/** @param {KeyboardEvent} e */
	function handleKeydown(e) {
		if (open && e.key === 'Escape') {
			oncancel();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<Backdrop {open} onclick={oncancel} />

{#if open}
	<div
		use:portal
		class="pointer-events-none fixed inset-0 z-[9999] flex items-center justify-center"
	>
		<Card.Root
			class="pointer-events-auto mx-4 w-full max-w-[440px] gap-0 bg-white"
			role="dialog"
			aria-modal="true"
			aria-labelledby="stratify-confirm-title"
		>
			<Card.Content class="px-6 sm:px-8">
				<h2 id="stratify-confirm-title" class="mb-3 font-sans text-xl leading-xl font-semibold">
					{title}
				</h2>
				<p class="mb-6 text-sm leading-sm text-mid-grey">{message}</p>

				<div class="flex flex-wrap items-center justify-end gap-3">
					<Button variant="outline" onclick={oncancel} disabled={loading}>Cancel</Button>
					{#if onsecondary && secondaryLabel}
						<Button variant="outline" onclick={onsecondary} disabled={loading}>
							{secondaryLabel}
						</Button>
					{/if}
					<Button onclick={onconfirm} disabled={loading}>
						{loading ? loadingConfirmLabel : confirmLabel}
					</Button>
				</div>
			</Card.Content>
		</Card.Root>
	</div>
{/if}
