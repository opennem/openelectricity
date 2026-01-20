<script>
	import { fade } from 'svelte/transition';
	import { X } from '@lucide/svelte';

	/**
	 * @type {{
	 *   open?: boolean,
	 *   onclose?: () => void,
	 *   title?: string,
	 *   backdrop?: boolean,
	 *   side?: 'top' | 'bottom' | 'left' | 'right',
	 *   size?: string,
	 *   width?: string,
	 *   height?: string,
	 *   align?: 'start' | 'center' | 'end',
	 *   children?: import('svelte').Snippet
	 * }}
	 */
	let {
		open = false,
		onclose,
		title = '',
		backdrop = false,
		side = 'right',
		size = '400px',
		width,
		height,
		align = 'end',
		children
	} = $props();

	/**
	 * Handle keydown for escape key
	 * @param {KeyboardEvent} e
	 */
	function handleKeydown(e) {
		if (e.key === 'Escape' && open) {
			onclose?.();
		}
	}

	// Compute horizontal alignment for top/bottom
	let horizontalAlign = $derived.by(() => {
		switch (align) {
			case 'start':
				return 'left-0';
			case 'center':
				return 'left-1/2 -translate-x-1/2';
			case 'end':
			default:
				return 'right-0';
		}
	});

	// Compute vertical alignment for left/right
	let verticalAlign = $derived.by(() => {
		switch (align) {
			case 'start':
				return 'top-0';
			case 'center':
				return 'top-1/2 -translate-y-1/2';
			case 'end':
			default:
				return 'bottom-0';
		}
	});

	// Compute position classes based on side
	let positionClasses = $derived.by(() => {
		switch (side) {
			case 'top':
				return `top-0 ${horizontalAlign}`;
			case 'bottom':
				return `bottom-0 ${horizontalAlign}`;
			case 'left':
				return `left-0 ${verticalAlign}`;
			case 'right':
			default:
				return `right-0 ${verticalAlign}`;
		}
	});

	// Compute border classes based on side
	let borderClasses = $derived.by(() => {
		switch (side) {
			case 'top':
				return 'border-b';
			case 'bottom':
				return 'border-t';
			case 'left':
				return 'border-r';
			case 'right':
			default:
				return 'border-l';
		}
	});

	// Compute rounded corner classes based on side and alignment
	let roundedClasses = $derived.by(() => {
		switch (side) {
			case 'top':
				if (align === 'start') return 'rounded-br-xl';
				if (align === 'end') return 'rounded-bl-xl';
				return 'rounded-b-xl';
			case 'bottom':
				if (align === 'start') return 'rounded-tr-xl';
				if (align === 'end') return 'rounded-tl-xl';
				return 'rounded-t-xl';
			case 'left':
				if (align === 'start') return 'rounded-br-xl';
				if (align === 'end') return 'rounded-tr-xl';
				return 'rounded-r-xl';
			case 'right':
			default:
				if (align === 'start') return 'rounded-bl-xl';
				if (align === 'end') return 'rounded-tl-xl';
				return 'rounded-l-xl';
		}
	});

	// Compute slide transform for closed state
	let slideTransform = $derived.by(() => {
		switch (side) {
			case 'top':
				return 'translateY(-100%)';
			case 'bottom':
				return 'translateY(100%)';
			case 'left':
				return 'translateX(-100%)';
			case 'right':
			default:
				return 'translateX(100%)';
		}
	});

	// Compute size style based on side and explicit width/height
	let sizeStyle = $derived.by(() => {
		let styles = [];

		if (side === 'top' || side === 'bottom') {
			styles.push(`height: ${height || size};`);
			if (width) styles.push(`width: ${width};`);
		} else {
			styles.push(`width: ${width || size};`);
			if (height) styles.push(`height: ${height};`);
		}

		return styles.join(' ');
	});
</script>

<svelte:window onkeydown={handleKeydown} />

{#if backdrop && open}
	<!-- Backdrop -->
	<button
		class="fixed inset-0 bg-black/20 z-40 cursor-default"
		transition:fade={{ duration: 200 }}
		onclick={() => onclose?.()}
		aria-label="Close panel"
	></button>
{/if}

<!-- Sheet panel -->
<div
	class="fixed bg-white shadow-xl z-50 flex flex-col border-warm-grey transition-transform duration-300 ease-out {positionClasses} {borderClasses} {roundedClasses}"
	style="{sizeStyle} transform: {open ? 'translate(0, 0)' : slideTransform};"
>
	<!-- Header -->
	<header class="flex items-center justify-between px-6 py-4 border-b border-warm-grey shrink-0">
		<h2 class="text-lg font-medium text-dark-grey m-0">{title}</h2>
		<button
			onclick={() => onclose?.()}
			class="p-2 rounded-lg hover:bg-warm-grey transition-colors text-mid-grey hover:text-dark-grey"
			aria-label="Close panel"
		>
			<X size={20} />
		</button>
	</header>

	<!-- Content -->
	<div class="flex-1 overflow-y-auto min-h-0">
		{@render children?.()}
	</div>
</div>
