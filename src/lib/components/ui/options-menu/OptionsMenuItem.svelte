<script>
	import { hasTouchControls } from '$lib/components/ui/touch-controls.js';

	/**
	 * One row of an OptionsMenu. Pass `selected` to render the row as a radio
	 * choice within its heading's group: the selected row is bold on a tinted
	 * background and carries `aria-checked`; the icon gutter stays blank on
	 * every row so labels align with the icon rows around them. In a
	 * touch-controls subtree, phones get 36px rows, 14px type and 18px icons,
	 * and no keyboard hints. `leading` fills the icon gutter in place of
	 * `icon` (a status dot, say).
	 *
	 * @type {{
	 *   icon?: any,
	 *   onclick?: import('svelte/elements').HTMLButtonAttributes['onclick'],
	 *   kbd?: string | string[],
	 *   href?: string,
	 *   selected?: boolean,
	 *   disabled?: boolean,
	 *   children: import('svelte').Snippet,
	 *   leading?: import('svelte').Snippet
	 * } & Omit<import('svelte/elements').HTMLButtonAttributes, 'children'>}
	 */
	let {
		icon,
		onclick,
		kbd,
		href,
		selected = undefined,
		disabled = false,
		children,
		leading,
		...rest
	} = $props();

	const Icon = $derived(icon);
	const kbdKeys = $derived(kbd ? (Array.isArray(kbd) ? kbd : [kbd]) : null);
	const isRadio = $derived(selected !== undefined);

	const touch = hasTouchControls();
	const baseRowClass = `w-full px-3 py-2 text-xs flex items-center gap-3 transition-colors text-left no-underline hover:no-underline ${
		touch ? 'max-tablet:min-h-[36px] max-tablet:px-4 max-tablet:py-0 max-tablet:text-sm' : ''
	}`;
	const rowClass = $derived(
		selected
			? `${baseRowClass} bg-warm-grey font-semibold text-black hover:bg-mid-warm-grey data-[highlighted]:bg-mid-warm-grey`
			: `${baseRowClass} font-medium text-dark-grey hover:bg-light-warm-grey data-[highlighted]:bg-light-warm-grey`
	);
</script>

{#snippet inner()}
	{#if leading}
		<span
			class="flex size-4 shrink-0 items-center justify-center {touch
				? 'max-tablet:size-[18px]'
				: ''}">{@render leading()}</span
		>
	{:else if Icon}
		<Icon class="size-4 shrink-0 text-mid-grey {touch ? 'max-tablet:size-[18px]' : ''}" />
	{:else}
		<span class="size-4 shrink-0 {touch ? 'max-tablet:size-[18px]' : ''}" aria-hidden="true"></span>
	{/if}
	<span class="flex-1">{@render children()}</span>
	{#if kbdKeys}
		<span class="flex items-center gap-0.5 shrink-0 {touch ? 'max-tablet:hidden' : ''}">
			{#each kbdKeys as key, i (key)}
				{#if i > 0}
					<span class="text-[10px] text-mid-grey">+</span>
				{/if}
				<kbd
					class="text-[10px] text-dark-grey bg-light-warm-grey border border-warm-grey rounded px-1.5 py-0.5 leading-none"
					>{key}</kbd
				>
			{/each}
		</span>
	{/if}
{/snippet}

{#if href}
	<a {href} target="_blank" rel="noopener noreferrer" class={rowClass}>
		{@render inner()}
	</a>
{:else}
	<button
		{...rest}
		{onclick}
		{disabled}
		class={`${rowClass} disabled:cursor-not-allowed disabled:opacity-40`}
		role={isRadio ? 'menuitemradio' : undefined}
		aria-checked={isRadio ? selected : undefined}
	>
		{@render inner()}
	</button>
{/if}
