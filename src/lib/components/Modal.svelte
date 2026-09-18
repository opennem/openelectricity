<script>
	import { Dialog } from 'bits-ui';

	/** @type {{
	 * open?: boolean, title: string, titleLevel?: 1 | 2 | 3 | 4 | 5 | 6, titleClass?: string,
	 * headerClass?: string, fullscreen?: boolean, maxWidthClass?: string, class?: string,
	 * children?: import('svelte').Snippet, header?: import('svelte').Snippet,
	 * buttons?: import('svelte').Snippet, onclose?: () => void
	 * }} */
	let {
		open = $bindable(false),
		title,
		titleLevel = 2,
		titleClass = 'm-0 font-space text-xl',
		headerClass,
		fullscreen = false,
		maxWidthClass = 'max-w-(--breakpoint-md)',
		class: className = '',
		children,
		header,
		buttons,
		onclose
	} = $props();

	// The header row sits above the scrolling body, so a fullscreen modal's
	// header carries the page gutter its sections use.
	let headerClasses = $derived(
		headerClass ?? (fullscreen ? 'border-b border-warm-grey px-10 pb-2 pt-6' : 'mb-5')
	);
</script>

<Dialog.Root
	bind:open
	onOpenChange={(value) => {
		if (!value) onclose?.();
	}}
>
	<Dialog.Portal>
		<Dialog.Overlay class="fixed inset-0 z-[9998] bg-black/40" />
		<Dialog.Content
			aria-describedby={undefined}
			class={`fixed z-[9999] grid grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden bg-white text-dark-grey shadow-xl outline-none ${
				fullscreen
					? 'inset-0 h-dvh w-full'
					: `left-1/2 top-1/2 max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 rounded-lg px-4 pb-4 pt-5 sm:p-6 ${maxWidthClass}`
			} ${className}`}
		>
			<header class={`flex items-center justify-between gap-4 ${headerClasses}`}>
				<Dialog.Title level={titleLevel}>
					<!-- A real heading element picks up the global heading styles. -->
					{#snippet child({ props })}
						<svelte:element this={`h${titleLevel}`} {...props} class={titleClass}>
							{title}
						</svelte:element>
					{/snippet}
				</Dialog.Title>
				{@render header?.()}
			</header>
			<div class="min-h-0 overflow-y-auto overscroll-contain">
				{@render children?.()}
			</div>
			{#if buttons}
				<div class="border-t border-warm-grey px-10 py-6">
					{@render buttons()}
				</div>
			{/if}
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
