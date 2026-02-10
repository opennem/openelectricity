<script>
	import { untrack } from 'svelte';
	import { X } from '@lucide/svelte';

	/**
	 * @typedef {import('svelte').Snippet} Snippet
	 */

	let {
		open = false,
		onclose,
		title = '',
		direction = 'top',
		defaultSize = 50,
		minSize = 250,
		snapThreshold = 85,
		containerSize = 0,
		class: className = '',
		header = undefined,
		footer = undefined,
		children
	} = $props();

	let currentSize = $state(50);
	let isResizing = $state(false);

	let isVertical = $derived(direction === 'top' || direction === 'bottom');

	// Reset size when open becomes true or defaultSize changes
	$effect(() => {
		// Track these dependencies
		const isOpen = open;
		const size = defaultSize;

		untrack(() => {
			if (isOpen) {
				currentSize = size;
			}
		});
	});

	/** @type {string} */
	let closedTransform = $derived.by(() => {
		switch (direction) {
			case 'top':
				return 'translateY(100%)';
			case 'bottom':
				return 'translateY(-100%)';
			case 'left':
				return 'translateX(100%)';
			case 'right':
				return 'translateX(-100%)';
			default:
				return 'translateY(100%)';
		}
	});

	let sizeStyle = $derived.by(() => {
		const prop = isVertical ? 'height' : 'width';
		const transition = isResizing ? '' : `; transition: ${prop} 0.15s ease-out`;
		return `${prop}: ${currentSize}%${transition}`;
	});

	let transformStyle = $derived(
		open ? 'transform: translate(0, 0)' : `transform: ${closedTransform}`
	);

	let combinedStyle = $derived(`${sizeStyle}; ${transformStyle}`);

	/** Start panel resize drag
	 * @param {PointerEvent} e
	 */
	function onResizePointerDown(e) {
		if (!containerSize) return;

		const startPos = isVertical ? e.clientY : e.clientX;
		const startSize = currentSize;
		isResizing = true;

		/** @type {HTMLElement} */
		const target = /** @type {HTMLElement} */ (e.currentTarget);
		target.setPointerCapture(e.pointerId);

		/** @param {PointerEvent} ev */
		function onPointerMove(ev) {
			const currentPos = isVertical ? ev.clientY : ev.clientX;
			let delta;

			// For top/left: moving toward the edge increases size
			// For bottom/right: moving away from the edge increases size
			if (direction === 'top' || direction === 'left') {
				delta = startPos - currentPos;
			} else {
				delta = currentPos - startPos;
			}

			const deltaPct = (delta / containerSize) * 100;
			const minPct = (minSize / containerSize) * 100;
			let newPct = Math.min(100, Math.max(minPct, startSize + deltaPct));

			if (newPct >= snapThreshold) {
				newPct = 100;
			}

			currentSize = newPct;
		}

		function onPointerUp() {
			isResizing = false;
			target.removeEventListener('pointermove', onPointerMove);
			target.removeEventListener('pointerup', onPointerUp);
		}

		target.addEventListener('pointermove', onPointerMove);
		target.addEventListener('pointerup', onPointerUp);
	}
</script>

{#snippet dragHandle()}
	{#if isVertical}
		<div
			class="shrink-0 flex items-center justify-center cursor-ns-resize select-none touch-none py-1.5 group"
			onpointerdown={onResizePointerDown}
			role="separator"
			aria-orientation="horizontal"
			aria-label="Resize panel"
			tabindex="-1"
		>
			<div
				class="w-8 h-1 rounded-full bg-mid-warm-grey group-hover:bg-mid-grey transition-colors"
			></div>
		</div>
	{:else}
		<div
			class="shrink-0 flex items-center justify-center cursor-ew-resize select-none touch-none px-1.5 group"
			onpointerdown={onResizePointerDown}
			role="separator"
			aria-orientation="vertical"
			aria-label="Resize panel"
			tabindex="-1"
		>
			<div
				class="h-8 w-1 rounded-full bg-mid-warm-grey group-hover:bg-mid-grey transition-colors"
			></div>
		</div>
	{/if}
{/snippet}

{#snippet defaultHeader()}
	<header class="flex items-center justify-between px-6 pb-4 border-b border-warm-grey shrink-0">
		<h2 class="text-lg font-medium text-dark-grey m-0 truncate pr-4">{title}</h2>
		<button
			onclick={onclose}
			class="p-2 rounded-lg hover:bg-warm-grey transition-colors text-mid-grey hover:text-dark-grey cursor-pointer"
			aria-label="Close panel"
		>
			<X size={20} />
		</button>
	</header>
{/snippet}

{#if isVertical}
	<div
		class="flex-col overflow-hidden transition-transform duration-250 ease-out {className}"
		style={combinedStyle}
	>
		{#if direction === 'top'}
			{@render dragHandle()}
		{/if}

		{#if header}
			{@render header()}
		{:else}
			{@render defaultHeader()}
		{/if}

		<div class="flex-1 overflow-y-auto min-h-0">
			{#if children}
				{@render children()}
			{/if}
		</div>

		{#if footer}
			{@render footer()}
		{/if}

		{#if direction === 'bottom'}
			{@render dragHandle()}
		{/if}
	</div>
{:else}
	<div
		class="flex-row overflow-hidden transition-transform duration-250 ease-out {className}"
		style={combinedStyle}
	>
		{#if direction === 'left'}
			{@render dragHandle()}
		{/if}

		<div class="flex flex-col flex-1 min-h-0 min-w-0 overflow-hidden">
			{#if header}
				{@render header()}
			{:else}
				{@render defaultHeader()}
			{/if}

			<div class="flex-1 overflow-y-auto min-h-0">
				{#if children}
					{@render children()}
				{/if}
			</div>

			{#if footer}
				{@render footer()}
			{/if}
		</div>

		{#if direction === 'right'}
			{@render dragHandle()}
		{/if}
	</div>
{/if}
