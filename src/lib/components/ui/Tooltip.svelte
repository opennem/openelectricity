<script>
	import { mergeProps, Tooltip as T } from 'bits-ui';

	/**
	 * Hover/focus tooltip. bits-ui tooltips ignore touch, so a purely
	 * informational one (a title's ⓘ, a label's description) passes
	 * `tapToOpen`: on touch a tap on it toggles the tooltip and a tap
	 * elsewhere closes it. Leave it off for tooltips on buttons, whose tap
	 * should just act.
	 *
	 * @type {{
	 *   text?: string,
	 *   lines?: string[],
	 *   children?: import('svelte').Snippet,
	 *   trigger?: import('bits-ui').Tooltip.TriggerProps['child'],
	 *   side?: 'top' | 'bottom' | 'left' | 'right',
	 *   sideOffset?: number,
	 *   delayDuration?: number,
	 *   class?: string,
	 *   learnMoreHref?: string,
	 *   linkLabel?: string,
	 *   tapToOpen?: boolean
	 * }}
	 */
	let {
		text = '',
		lines = /** @type {string[]} */ ([]),
		children,
		trigger,
		side = 'top',
		sideOffset = 4,
		delayDuration = 100,
		class: className = '',
		learnMoreHref,
		linkLabel = 'Learn more →',
		tapToOpen = false
	} = $props();

	let open = $state(false);
	/** @type {HTMLElement | null} */
	let triggerEl = $state(null);
	/** @type {HTMLElement | null} */
	let contentEl = $state(null);

	/** Opened by a tap: bits-ui's hover tracking (a mouse's) may not close it. */
	let tapPinned = false;

	/** @param {boolean} next */
	function setOpen(next) {
		if (!next && tapPinned) return;
		open = next;
	}

	/** @param {PointerEvent} event */
	function toggleOnTap(event) {
		if (!tapToOpen || event.pointerType !== 'touch') return;
		tapPinned = !open;
		open = !open;
	}

	// A tooltip a tap opened stays until a tap outside it and its trigger.
	$effect(() => {
		if (!tapToOpen || !open) return;
		/** @param {PointerEvent} event */
		const closeOutside = (event) => {
			const target = /** @type {Node} */ (event.target);
			if (triggerEl?.contains(target) || contentEl?.contains(target)) return;
			tapPinned = false;
			open = false;
		};
		window.addEventListener('pointerdown', closeOutside, true);
		return () => window.removeEventListener('pointerdown', closeOutside, true);
	});
</script>

<T.Provider>
	<T.Root {delayDuration} bind:open={() => open, setOpen} disableCloseOnTriggerClick={tapToOpen}>
		<T.Trigger>
			{#snippet child({ props })}
				{#if trigger}
					{@render trigger({ props })}
				{:else}
					<span
						{...mergeProps(props, { onpointerup: toggleOnTap })}
						class={className}
						bind:this={triggerEl}
					>
						{@render children?.()}
					</span>
				{/if}
			{/snippet}
		</T.Trigger>
		<T.Portal>
			<T.Content {side} {sideOffset} class="z-[9999]">
				<div
					bind:this={contentEl}
					class="bg-dark-grey rounded-lg py-3 px-4 shadow text-white text-xs font-space max-w-sm leading-relaxed"
				>
					{#if lines.length}
						{#each lines as line (line)}
							<div>{line}</div>
						{/each}
					{:else}
						{text}
					{/if}
					{#if learnMoreHref}
						<a
							href={learnMoreHref}
							target="_blank"
							rel="noopener noreferrer"
							class="block mt-1.5 underline text-white visited:text-white hover:opacity-80"
						>
							{linkLabel}
						</a>
					{/if}
				</div>
			</T.Content>
		</T.Portal>
	</T.Root>
</T.Provider>
