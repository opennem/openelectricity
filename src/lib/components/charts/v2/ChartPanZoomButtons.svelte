<script>
	import { MediaQuery } from 'svelte/reactivity';
	import Move from '@lucide/svelte/icons/move';
	import Tooltip from '$lib/components/ui/Tooltip.svelte';
	import StaticZoomButtons from './StaticZoomButtons.svelte';

	/**
	 * ChartPanZoomButtons — a chart's ✥ tap-to-engage toggle and its − / +
	 * zoom pair, in the flat icon-button style. While engaged the toggle shows
	 * the dark active state and the zoom buttons hide (wheel zoom covers
	 * them), unless `keepZoomWhileEngaged`. Shared by the grey `ChartHeader` bar and headers that
	 * host a chart's toolbar (`size="md"`).
	 *
	 * @type {{
	 *   onzoomin?: () => void,
	 *   onzoomout?: () => void,
	 *   isAtMinZoom?: boolean,
	 *   isAtMaxZoom?: boolean,
	 *   showPanZoomToggle?: boolean,
	 *   panZoomEngaged?: boolean,
	 *   onpanzoomtoggle?: () => void,
	 *   keepZoomWhileEngaged?: boolean,
	 *   size?: 'sm' | 'md'
	 * }}
	 */
	let {
		onzoomin,
		onzoomout,
		isAtMinZoom = false,
		isAtMaxZoom = false,
		showPanZoomToggle = false,
		panZoomEngaged = false,
		onpanzoomtoggle,
		keepZoomWhileEngaged = false,
		size = 'sm'
	} = $props();

	let showZoomButtons = $derived(Boolean(onzoomin && onzoomout));
	// Touch pans and pinches with two fingers without engaging, so the toggle
	// is for mice and trackpads only (an iPad with a trackpad keeps it).
	const finePointer = new MediaQuery('(any-pointer: fine)', true);
	let showToggle = $derived(showPanZoomToggle && finePointer.current);
</script>

{#if showToggle}
	<Tooltip
		text={panZoomEngaged ? 'Done (Esc)' : 'Enable pan & zoom — drag to pan, scroll to zoom'}
		class="inline-flex"
	>
		<button
			class="{size === 'md'
				? 'inline-flex size-[28px] items-center justify-center rounded-md'
				: 'p-1 rounded'} touch-hit transition-colors {panZoomEngaged
				? 'bg-dark-grey text-white hover:bg-black'
				: 'text-mid-grey hover:text-dark-grey hover:bg-warm-grey'}"
			onclick={onpanzoomtoggle}
			aria-label={panZoomEngaged ? 'Disable pan and zoom' : 'Enable pan and zoom'}
			aria-pressed={panZoomEngaged}
		>
			<Move size={size === 'md' ? 14 : 12} />
		</button>
	</Tooltip>
{/if}

{#if showZoomButtons && (keepZoomWhileEngaged || !panZoomEngaged)}
	{#if showToggle}
		<div class="mx-0.5 h-4 w-px bg-mid-warm-grey/60" aria-hidden="true"></div>
	{/if}
	<StaticZoomButtons {onzoomin} {onzoomout} {isAtMinZoom} {isAtMaxZoom} {size} />
{/if}
