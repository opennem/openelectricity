<script>
	import { fade } from 'svelte/transition';
	import { portal } from '$lib/actions/portal.js';

	/**
	 * Full-page modal backdrop. Portalled to <body> so it always sits above
	 * page chrome regardless of ancestor stacking contexts (e.g. parents with
	 * `view-transition-name`, `transform`, or `filter` create stacking traps
	 * that can't be escaped with z-index alone).
	 *
	 * Pair with a panel/sheet/dialog that is also portalled (or rendered at
	 * the document root) and given a higher z-index than the backdrop.
	 *
	 * Variants:
	 *   - `modal` (default): translucent dim + light blur — used for sheets,
	 *     dialogs, and command palettes.
	 *   - `lightbox`: heavy black for image viewers where the backdrop *is*
	 *     the focus surface.
	 *
	 * @type {{
	 *   open: boolean,
	 *   onclick?: () => void,
	 *   variant?: 'modal' | 'lightbox',
	 *   z?: string,
	 *   duration?: number
	 * }}
	 */
	let { open, onclick, variant = 'modal', z = 'z-[9998]', duration = 200 } = $props();

	const VARIANT_CLASS = {
		modal: 'bg-black/40 backdrop-blur-sm',
		lightbox: 'bg-black/90'
	};
</script>

{#if open}
	<button
		use:portal
		type="button"
		class="fixed inset-0 cursor-default {VARIANT_CLASS[variant]} {z}"
		transition:fade={{ duration }}
		onclick={() => onclick?.()}
		aria-label="Close"
	></button>
{/if}
