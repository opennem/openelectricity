<script module>
	/** The fuel-tech table beside Timeline and Profile charts: 30% by default,
	 * never narrower than 320px, leaving a 376px chart column (padding and
	 * divider included) on wide layouts.
	 * @type {Readonly<import('./types.js').TrackerSplitConfig>} */
	export const FUEL_TECH_SPLIT = Object.freeze({
		initial: 30,
		minPx: 320,
		reservedPx: 376,
		maxPct: 80,
		narrowMaxPct: 80
	});
</script>

<script>
	import { untrack } from 'svelte';
	import { MediaQuery } from 'svelte/reactivity';
	import { clickoutside } from '@svelte-put/clickoutside';
	import PanelRail from './PanelRail.svelte';
	import DragHandle from '$lib/components/ui/panel/drag-handle.svelte';
	import { createDockedPanel } from '$lib/components/ui/panel/docked-panel.svelte.js';
	import { percentPanelBounds } from '$lib/components/ui/panel/panel-bounds.js';
	import ResizablePanel from '$lib/components/ui/resizable-panel/resizable-panel.svelte';

	/**
	 * TrackerSplitLayout — every tracker view's charts-and-table shell: a
	 * scrolling chart column beside a resizable docked panel, or the 48px rail
	 * that reopens it. The panel's width is a percentage of the container,
	 * bounded so the charts keep a usable column; its open state belongs to the
	 * caller (URL state).
	 *
	 * The panel snippets receive the docked-panel controller so the panel's
	 * close control and the rail's opener can take part in the focus hand-off
	 * (`bind:closeButton={dock.closer}`).
	 *
	 * @type {{
	 *   config: import('./types.js').TrackerSplitConfig,
	 *   open: boolean,
	 *   onopenchange: (open: boolean) => void,
	 *   controls: string,
	 *   resizeLabel: string,
	 *   railLabel: string,
	 *   engaged?: boolean,
	 *   pngContext?: string,
	 *   children: import('svelte').Snippet,
	 *   panel: import('svelte').Snippet<[import('./types.js').TrackerDock]>,
	 *   panelHeader?: import('svelte').Snippet<[import('./types.js').TrackerDock]>,
	 *   rail?: import('svelte').Snippet
	 * }}
	 */
	let {
		config,
		open,
		onopenchange,
		controls,
		resizeLabel,
		railLabel,
		engaged = $bindable(false),
		pngContext = undefined,
		children,
		panel,
		panelHeader = undefined,
		rail = undefined
	} = $props();

	const { initial, minPx, reservedPx, maxPct, narrowMaxPct, storageKey, narrowOverlay } = untrack(
		() => config
	);
	let containerWidth = $state(0);
	const wide = new MediaQuery('(min-width: 1024px)', true);
	let overlaid = $derived(!!narrowOverlay && !wide.current);
	let bounds = $derived(
		percentPanelBounds({
			containerWidth,
			minPx,
			reservedPx,
			maxPct,
			wide: wide.current,
			narrowMaxPct
		})
	);
	const dock = createDockedPanel({
		initial,
		min: () => bounds.min,
		max: () => bounds.max,
		storageKey,
		scale: () => (containerWidth ? 100 / containerWidth : 0),
		inverted: true,
		step: 2,
		setOpen: (next) => onopenchange(next)
	});
	let size = $derived(overlaid ? narrowMaxPct : dock.size);
</script>

<svelte:window
	onkeydown={(event) => {
		if (event.key === 'Escape' && overlaid && open) dock.close();
	}}
/>

<div
	class="relative flex min-h-0 flex-1 flex-row overflow-hidden"
	bind:clientWidth={containerWidth}
	data-png-context={pngContext}
>
	<!-- No space-y: each card's full-gap drag handle is the spacer between cards.
	     Right padding yields to the open panel's drag handle — the handle IS
	     the page-background gap between the white columns. -->
	<div
		class="min-w-0 flex-1 overflow-y-auto py-4 pl-4 md:py-6 md:pl-6 {open && !overlaid
			? ''
			: 'pr-4 md:pr-6'}"
		use:clickoutside={{ event: 'pointerdown', options: true }}
		onclickoutside={() => (engaged = false)}
	>
		{@render children()}
	</div>

	{#if open}
		{#if !overlaid}
			<!-- w-4: same gap length as the chart cards' h-4 drag handles. -->
			<DragHandle
				axis="x"
				onstart={dock.start}
				onkeydown={dock.keydown}
				tabindex={0}
				aria-valuemin={bounds.min}
				aria-valuemax={bounds.max}
				aria-valuenow={Math.round(size)}
				active={dock.dragging}
				alwaysShowGrip
				class="w-4 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-dark-grey"
				role="separator"
				aria-orientation="vertical"
				aria-label={resizeLabel}
				title="Drag to resize, or use the arrow keys"
			/>
		{/if}
		<ResizablePanel
			open
			direction="left"
			defaultSize={size}
			minSize={minPx}
			containerSize={containerWidth}
			showDragHandle={false}
			externalResizing={dock.dragging}
			onclose={dock.close}
			class="z-20 flex shrink-0 bg-white {overlaid
				? 'absolute inset-y-0 right-0 border-l border-warm-grey shadow-xl'
				: 'relative'}"
		>
			{#snippet header()}
				{#if panelHeader}{@render panelHeader(dock)}{:else}<span class="hidden"></span>{/if}
			{/snippet}
			{@render panel(dock)}
		</ResizablePanel>
	{:else}
		<!-- Keep the reopen action at the panel edge. -->
		<PanelRail
			side="right"
			label={railLabel}
			{controls}
			onopen={dock.open}
			bind:opener={dock.opener}
		>
			{@render rail?.()}
		</PanelRail>
	{/if}
</div>
