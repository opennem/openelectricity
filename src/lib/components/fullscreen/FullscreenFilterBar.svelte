<script>
	/**
	 * FullscreenFilterBar — shared chrome for the filter bar at the top of
	 * /facilities and /facility/[code]. Owns the outer flex wrapper, the
	 * common spacing and fullscreen rounded-card styling, the desktop
	 * divider in front of the options menu, and the `view-transition-name`
	 * hooks used to animate cross-route transitions between the two pages:
	 *
	 *   - `filter-bar-stable`     → logo + first crumb. Paired across both
	 *     routes, animation: none.
	 *   - `filter-bar-rest-{key}` → page-specific middle content. Unpaired
	 *     so it slides without zooming.
	 *   - `filter-bar-options`    → options dropdown on the right. Paired
	 *     across both routes, animation: none.
	 *
	 * The animation keyframes live in `(main)/+layout.svelte`.
	 *
	 * @type {{
	 *   isFullscreen: boolean,
	 *   routeKey: string,
	 *   paddingX?: string,
	 *   bgClass?: string,
	 *   stable?: import('svelte').Snippet,
	 *   rest?: import('svelte').Snippet,
	 *   options?: import('svelte').Snippet
	 * }}
	 */
	let {
		isFullscreen,
		routeKey,
		paddingX = 'px-4',
		bgClass = 'md:bg-light-warm-grey/75',
		stable,
		rest,
		options
	} = $props();
</script>

<div
	class="flex items-center justify-between relative z-10 gap-4 pt-3 pb-3 min-h-[46.5px] {paddingX} {isFullscreen
		? `md:py-3 md:px-4 ${bgClass}`
		: ''}"
>
	<div class="flex items-center gap-4 min-w-0">
		{#if stable}
			<div
				class="flex items-center gap-1 shrink-0"
				style="view-transition-name: filter-bar-stable"
			>
				{@render stable()}
			</div>
		{/if}
		{#if rest}
			<div
				class="flex items-center gap-4 min-w-0"
				style="view-transition-name: filter-bar-rest-{routeKey}"
			>
				{@render rest()}
			</div>
		{/if}
	</div>
	{#if options}
		<div
			class="flex items-center md:border-l md:border-warm-grey {isFullscreen
				? 'md:pl-2 md:ml-2'
				: 'md:pl-4 md:ml-4'}"
			style="view-transition-name: filter-bar-options"
		>
			{@render options()}
		</div>
	{/if}
</div>
