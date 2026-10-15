<script module>
	/** From here up the panel docks beside the charts; below it overlays
	 * them (tablets, when the config says so) or sits in the phone sheet. */
	export const WIDE_QUERY = '(min-width: 1024px)';

	/** The fuel-tech table beside Timeline and Profile charts: 30% by default,
	 * never narrower than 320px, leaving a 376px chart column (padding and
	 * divider included) on wide layouts; over the charts on tablets.
	 * @type {Readonly<import('./types.js').TrackerSplitConfig>} */
	export const FUEL_TECH_SPLIT = Object.freeze({
		initial: 30,
		minPx: 320,
		reservedPx: 376,
		maxPct: 80,
		narrowMaxPct: 80,
		narrowOverlay: true
	});
</script>

<script>
	import { onMount, untrack } from 'svelte';
	import { MediaQuery } from 'svelte/reactivity';
	import { cubicOut } from 'svelte/easing';
	import { clickoutside } from '@svelte-put/clickoutside';
	import PanelRail from './PanelRail.svelte';
	import DragHandle from '$lib/components/ui/panel/drag-handle.svelte';
	import { createDockedPanel } from '$lib/components/ui/panel/docked-panel.svelte.js';
	import { percentPanelBounds } from '$lib/components/ui/panel/panel-bounds.js';
	import ResizablePanel from '$lib/components/ui/resizable-panel/resizable-panel.svelte';
	import { BottomSheet } from '$lib/components/ui/bottom-sheet';
	import { BELOW_TABLET_QUERY } from '$lib/utils/fullscreen-mode.js';
	import { setTrackerSheet } from './tracker-sheet.js';

	/**
	 * TrackerSplitLayout — every tracker view's charts-and-table shell: a
	 * scrolling chart column beside a resizable docked panel, or the 48px rail
	 * that reopens it. The panel's width is a percentage of the container,
	 * bounded so the charts keep a usable column; its open state belongs to the
	 * caller (URL state).
	 *
	 * The panel snippets receive the docked-panel controller so the panel's
	 * close control and the rail's opener can take part in the focus hand-off
	 * (`bind:closeButton={dock.closer}`). `canvasHeight` reports the chart
	 * column's visible height inside its padding, for charts that fill it.
	 *
	 * Phones (below 768px) get no side panel: the panel sits in a persistent
	 * bottom sheet, minimised to its header while the table is closed and at
	 * the peek height (or full) while open, so the charts keep the full width.
	 * Tablets (below 1024px) overlay the charts when the config says so. The
	 * rail is hidden by CSS on phones and the docked (not overlaid) panel below
	 * 1024px, where neither is used, so the server render (which can't know
	 * the width) never flashes a crushed layout there.
	 *
	 * @type {{
	 *   config: import('./types.js').TrackerSplitConfig,
	 *   open: boolean,
	 *   onopenchange: (open: boolean) => void,
	 *   controls: string,
	 *   resizeLabel: string,
	 *   railLabel: string,
	 *   engaged?: boolean,
	 *   canvasHeight?: number,
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
		canvasHeight = $bindable(0),
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
	let containerHeight = $state(0);
	const wide = new MediaQuery(WIDE_QUERY, true);
	const phone = new MediaQuery(BELOW_TABLET_QUERY);
	let overlaid = $derived(!!narrowOverlay && !wide.current && !phone.current);
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

	// The phone sheet: closed table → minimised to the panel header (grip +
	// 48px header); open → peek, or full once pulled up. The snap is derived
	// from `open`, and the sheet's snap changes write back through it.
	const SHEET_MIN_PX = 62;
	const SHEET_PEEK = 0.55;
	let sheetFull = $state(false);
	let sheetSnap = $derived(
		/** @type {'min' | 'peek' | 'full'} */ (!open ? 'min' : sheetFull ? 'full' : 'peek')
	);
	/** @param {'min' | 'peek' | 'full'} next */
	function setSheetSnap(next) {
		if (next === 'min') {
			if (open) onopenchange(false);
			return;
		}
		sheetFull = next === 'full';
		if (!open) onopenchange(true);
	}
	setTrackerSheet({
		get active() {
			return phone.current;
		},
		get minimised() {
			return !open;
		},
		toggle: () => setSheetSnap(open ? 'min' : 'peek')
	});
	// Keep the last chart clear of the sheet (its peek, at most).
	let sheetClearance = $derived(
		!phone.current
			? undefined
			: `${sheetSnap === 'min' ? SHEET_MIN_PX : Math.round(containerHeight * SHEET_PEEK)}px`
	);
	const reducedMotion = new MediaQuery('(prefers-reduced-motion: reduce)');
	// The page may close the table as it hydrates (narrow screens default it
	// closed); that isn't the reader's doing, so it doesn't slide.
	let settled = false;
	onMount(() => {
		requestAnimationFrame(() => (settled = true));
	});

	/**
	 * Slide the panel in from (or out to) the container's right edge: its
	 * column's width eases between nothing and its size, so the charts give
	 * way smoothly, while the panel keeps its full width (`--panel-slide-width`)
	 * and is clipped rather than squeezed. A closing panel is inert while it
	 * slides away, so only the rail that replaces it can be used or announced;
	 * reopened mid-slide, it becomes live again.
	 * @param {HTMLElement} node
	 * @param {unknown} _params
	 * @param {{ direction: 'in' | 'out' | 'both' }} options
	 */
	function slidePanel(node, _params, { direction }) {
		// Reopening mid-slide reverses the same element, so opening clears it.
		const closing = direction === 'out';
		node.inert = closing;
		if (closing) node.setAttribute('aria-hidden', 'true');
		else node.removeAttribute('aria-hidden');
		const width = node.getBoundingClientRect().width;
		const panelWidth = node.lastElementChild?.getBoundingClientRect().width ?? width;
		node.style.setProperty('--panel-slide-width', `${panelWidth}px`);
		return {
			// Crossing into phone width swaps the panel for the sheet at once.
			duration: reducedMotion.current || !settled || phone.current ? 0 : 250,
			easing: cubicOut,
			// clip, not hidden: the opening focus hand-off would scroll a hidden
			// box to the panel's close button, shifting the panel left.
			css: (/** @type {number} */ t) => `width: ${t * width}px; overflow: clip;`
		};
	}
	/** @param {Event & { currentTarget: HTMLElement }} event */
	const settlePanel = (event) => event.currentTarget.style.removeProperty('--panel-slide-width');
</script>

<svelte:window
	onkeydown={(event) => {
		if (event.key !== 'Escape' || !open) return;
		// Esc closes the overlay, or minimises the phone sheet.
		if (overlaid) dock.close();
		else if (phone.current) onopenchange(false);
	}}
/>

<div
	class="relative flex min-h-0 flex-1 flex-row overflow-hidden"
	bind:clientWidth={containerWidth}
	bind:clientHeight={containerHeight}
	data-png-context={pngContext}
>
	<!-- No space-y: each card's full-gap drag handle is the spacer between cards.
	     Right padding yields to the open panel's drag handle — the handle IS
	     the page-background gap between the white columns. -->
	<div
		class="min-w-0 flex-1 overflow-y-auto py-4 pl-4 md:py-6 md:pl-6 {open &&
		!overlaid &&
		!phone.current
			? 'max-md:pr-4'
			: 'pr-4 md:pr-6'}"
		style:padding-bottom={sheetClearance}
		use:clickoutside={{ event: 'pointerdown', options: true }}
		onclickoutside={() => (engaged = false)}
		bind:contentRect={
			null, (/** @type {DOMRectReadOnly | undefined} */ rect) => (canvasHeight = rect?.height ?? 0)
		}
	>
		{@render children()}
	</div>

	{#if phone.current}
		<BottomSheet
			open
			{containerHeight}
			dismissable={false}
			peekFraction={SHEET_PEEK}
			minHeight={SHEET_MIN_PX}
			bind:snap={() => sheetSnap, setSheetSnap}
			defaultSnap={sheetSnap}
			class="z-20"
		>
			<div class="flex h-full min-h-0 flex-col">
				{#if panelHeader}{@render panelHeader(dock)}{/if}
				{@render panel(dock)}
			</div>
		</BottomSheet>
	{:else if open}
		{#if overlaid}
			<!-- Tap outside the overlaid panel to close it. -->
			<div class="absolute inset-0 z-10 bg-black/5" aria-hidden="true" onclick={dock.close}></div>
		{/if}
		<!-- The panel's column: the drag handle (docked) and the panel, sized to
		     the panel's share plus the handle, sliding in and out as one. -->
		<div
			class="z-20 flex shrink-0 {overlaid
				? 'absolute inset-y-0 right-0'
				: 'relative max-md:hidden'}"
			style:width={overlaid ? `${size}%` : `calc(${size}% + 1rem)`}
			in:slidePanel
			out:slidePanel
			onintroend={settlePanel}
		>
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
					class="w-4 shrink-0 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-dark-grey"
					role="separator"
					aria-orientation="vertical"
					aria-label={resizeLabel}
					title="Drag to resize, or use the arrow keys"
				/>
			{/if}
			<ResizablePanel
				open
				direction="left"
				defaultSize={100}
				minSize={minPx}
				containerSize={containerWidth}
				showDragHandle={false}
				externalResizing={dock.dragging}
				onclose={dock.close}
				class="flex min-w-[var(--panel-slide-width,0)] flex-1 bg-white {overlaid
					? 'border-l border-warm-grey shadow-xl'
					: 'border-l border-mid-warm-grey/40'}"
			>
				{#snippet header()}
					{#if panelHeader}{@render panelHeader(dock)}{:else}<span class="hidden"></span>{/if}
				{/snippet}
				{@render panel(dock)}
			</ResizablePanel>
		</div>
	{:else}
		<!-- Keep the reopen action at the panel edge. -->
		<div class="contents max-tablet:hidden">
			<PanelRail
				side="right"
				label={railLabel}
				{controls}
				onopen={dock.open}
				bind:opener={dock.opener}
			>
				{@render rail?.()}
			</PanelRail>
		</div>
	{/if}
</div>
