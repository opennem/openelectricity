<script>
	import { fly } from 'svelte/transition';
	import { clickoutside } from '@svelte-put/clickoutside';
	import EllipsisVertical from '$lib/icons/EllipsisVertical.svelte';
	import Tooltip from '$lib/components/ui/Tooltip.svelte';
	import ChartControls from './ChartControls.svelte';

	/**
	 * ChartOptionsMenu — the ⋮ button and the chart-options flyout under it
	 * (`ChartControls`: data transform, chart type, curve, units). The flyout
	 * is absolutely positioned against the nearest positioned ancestor — the
	 * header it sits in — under that header's left or right edge (`align`).
	 * Clicking anywhere else closes it. `size="md"` is the 28px button of a
	 * chart card header, with a tooltip.
	 *
	 * @type {{
	 *   chart: import('./ChartStore.svelte.js').default,
	 *   align?: 'left' | 'right',
	 *   size?: 'sm' | 'md'
	 * }}
	 */
	let { chart, align = 'left', size = 'sm' } = $props();

	let open = $state(false);
</script>

{#snippet toggle()}
	<button
		class={size === 'md'
			? 'inline-flex size-[28px] items-center justify-center rounded-md transition-colors ' +
				(open
					? 'bg-warm-grey text-dark-grey'
					: 'text-mid-grey hover:bg-warm-grey hover:text-dark-grey')
			: 'text-mid-warm-grey hover:text-dark-grey'}
		onclick={() => (open = !open)}
		aria-label="Toggle chart options"
		aria-expanded={open}
	>
		<EllipsisVertical class={size === 'md' ? 'size-[18px]' : 'size-8'} />
	</button>
{/snippet}

<div class="contents" use:clickoutside onclickoutside={() => (open = false)}>
	{#if size === 'md'}
		<Tooltip text="Chart options" class="inline-flex">{@render toggle()}</Tooltip>
	{:else}
		{@render toggle()}
	{/if}

	{#if open}
		<div
			in:fly={{ y: -20, duration: 240 }}
			out:fly={{ y: -20, duration: 240 }}
			class="absolute top-full z-10 bg-white/70 backdrop-blur-md backdrop-saturate-150 border border-mid-warm-grey/40 {align ===
			'right'
				? 'right-0 rounded-bl-lg'
				: 'left-0 rounded-b-lg'}"
		>
			<ChartControls {chart} />
		</div>
	{/if}
</div>
