<script>
	/**
	 * FullscreenFilterBar — shared chrome for the filter bar at the top of
	 * /facilities, /facility/[code] and /tracker. Owns the outer flex
	 * wrapper, the common spacing and fullscreen rounded-card styling, the
	 * desktop divider in front of the options menu, and the
	 * `view-transition-name` hooks used to animate cross-route transitions
	 * between these pages:
	 *
	 *   - `filter-bar-back`       → back button, only on /facility/[code].
	 *     Unpaired: slides in from the left on entry, back out on exit.
	 *   - `{stableName}`          → logo + first crumb. The two facilities
	 *     routes share the default `filter-bar-stable`, so it pairs: the
	 *     group's position animates (slides sideways to make room for the
	 *     back button) and the images don't cross-fade. Pages whose stable
	 *     content ISN'T pixel-identical to that pair (e.g. /tracker's
	 *     "logo + Tracker") pass their own `stableName` — unpaired regions
	 *     get the default cross-fade instead of rendering both texts stacked.
	 *   - `filter-bar-rest-{key}` → page-specific middle content. Unpaired
	 *     so it slides without zooming.
	 *   - `filter-bar-options`    → options dropdown on the right. Paired
	 *     across all routes, animation: none.
	 *
	 * The animation keyframes live in `(main)/+layout.svelte`.
	 *
	 * @type {{
	 *   isFullscreen: boolean,
	 *   routeKey: string,
	 *   stableName?: string,
	 *   paddingX?: string,
	 *   bgClass?: string,
	 *   back?: import('svelte').Snippet,
	 *   stable?: import('svelte').Snippet,
	 *   rest?: import('svelte').Snippet,
	 *   options?: import('svelte').Snippet
	 * }}
	 */
	let {
		isFullscreen,
		routeKey,
		stableName = 'filter-bar-stable',
		paddingX = 'px-4',
		bgClass = 'tablet:bg-light-warm-grey/75',
		back,
		stable,
		rest,
		options
	} = $props();
</script>

<div
	class="flex items-center justify-between relative z-10 gap-4 pt-3 pb-3 min-h-[46.5px] {paddingX} {isFullscreen
		? `tablet:py-3 tablet:px-4 ${bgClass}`
		: ''}"
>
	<div class="flex flex-1 items-center gap-4 min-w-0">
		{#if back || stable}
			<div class="flex items-center gap-1 shrink-0">
				{#if back}
					<div class="flex items-center" style="view-transition-name: filter-bar-back">
						{@render back()}
					</div>
				{/if}
				{#if stable}
					<div class="flex items-center gap-1 shrink-0" style="view-transition-name: {stableName}">
						{@render stable()}
					</div>
				{/if}
			</div>
		{/if}
		{#if rest}
			<div
				class="flex flex-1 items-center gap-4 min-w-0"
				style="view-transition-name: filter-bar-rest-{routeKey}"
			>
				{@render rest()}
			</div>
		{/if}
	</div>
	{#if options}
		<div
			class="flex items-center tablet:border-l tablet:border-warm-grey {isFullscreen
				? 'tablet:pl-2 tablet:ml-2'
				: 'tablet:pl-4 tablet:ml-4'}"
			style="view-transition-name: filter-bar-options"
		>
			{@render options()}
		</div>
	{/if}
</div>
