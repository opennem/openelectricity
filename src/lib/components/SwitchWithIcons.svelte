<script>
	import Tooltip from '$lib/components/ui/Tooltip.svelte';
	/**
	 * Segmented switcher with a thumb that slides to the selected option.
	 * The thumb is inset from the track via the container padding.
	 * An option with a `tooltip` shows it in the app's `Tooltip` on hover, in
	 * place of the browser's `title` (e.g. icon-only options naming themselves).
	 * @typedef {{ label?: string, ariaLabel?: string, title?: string, tooltip?: string, value: string | number, icon?: *, size?: string }} Option
	 * @typedef {Object} Props
	 * @property {Option[]} [buttons]
	 * @property {string | number } [selected]
	 * @property {boolean} [compact]
	 * @property {string} [rounded] - Tailwind radius class for the container, thumb and buttons
	 * @property {boolean} [darkSelected] - Thumb uses a dark fill (matches active filter pills)
	 * @property {string} [trackClass] - Fill + border colour classes for the track (default: white chip with the filter pills' subtle border)
	 * @property {string} [transitionName] - Names the track, thumb and options for
	 *   view transitions, so a switcher that remounts across a route change holds
	 *   still while its thumb slides to the new option
	 * @property {(option: {value: string, element: HTMLButtonElement}) => void} [onchange]
	 */

	/** @type {Props & { [key: string]: any }} */
	let {
		buttons = [],
		selected = '',
		compact = false,
		rounded = 'rounded-xl',
		darkSelected = false,
		trackClass = 'bg-white border-warm-grey',
		transitionName,
		class: className = '',
		onchange,
		...rest
	} = $props();

	let isSelected = $derived((/** @type {string | number} */ value) => selected === value);
	/** @type {Record<string, HTMLElement | undefined>} */
	let buttonEls = $state({});
	/** @type {HTMLElement | undefined} */
	let containerEl = $state();

	let thumbLeft = $state(0);
	let thumbTop = $state(0);
	let thumbWidth = $state(0);
	let thumbHeight = $state(0);
	let thumbVisible = $state(false);

	function measureThumb() {
		const buttonEl = buttonEls[String(selected)];
		if (!buttonEl) {
			thumbVisible = false;
			return;
		}
		thumbLeft = buttonEl.offsetLeft;
		thumbTop = buttonEl.offsetTop;
		thumbWidth = buttonEl.offsetWidth;
		thumbHeight = buttonEl.offsetHeight;
		thumbVisible = true;
	}

	// Re-measure whenever the selection or layout inputs change.
	$effect(() => {
		void selected;
		void compact;
		void buttons;
		measureThumb();
	});

	// Re-measure when the container resizes (viewport changes, font load, etc.).
	$effect(() => {
		if (!containerEl) return;
		const observer = new ResizeObserver(() => measureThumb());
		observer.observe(containerEl);
		return () => observer.disconnect();
	});

	/**
	 * @param {MouseEvent} e
	 */
	function handleClick(e) {
		const element = /** @type {HTMLButtonElement} */ (e.currentTarget);
		onchange?.({ value: element.value, element });
	}
</script>

<div
	bind:this={containerEl}
	style:view-transition-name={transitionName}
	{...rest}
	class={`relative flex md:inline-flex p-1 ${rounded} ${trackClass} border border-solid ${compact ? 'text-xs' : 'text-sm'} ${className}`}
>
	{#if thumbVisible}
		<div
			class="absolute shadow-lg transition-all duration-200 ease-out {rounded} {darkSelected
				? 'bg-dark-grey border border-dark-grey'
				: 'bg-white border border-black'}"
			style="left: {thumbLeft}px; top: {thumbTop}px; width: {thumbWidth}px; height: {thumbHeight}px;"
			style:view-transition-name={transitionName && `${transitionName}-thumb`}
		></div>
	{/if}

	{#each buttons as option (option.value)}
		{#if option.tooltip}
			<!-- The app's tooltip, not the browser's: the button is its trigger. -->
			<Tooltip text={option.tooltip}>
				{#snippet trigger({ props })}{@render optionButton(option, props)}{/snippet}
			</Tooltip>
		{:else}
			{@render optionButton(option)}
		{/if}
	{/each}
</div>

{#snippet optionButton(
	/** @type {Option} */ { label, ariaLabel, title, tooltip, value, icon, size },
	/** @type {Record<string, unknown>} */ triggerProps = {}
)}
	<button
		{...triggerProps}
		type="button"
		bind:this={buttonEls[value]}
		style:view-transition-name={transitionName && `${transitionName}-${value}`}
		onclick={handleClick}
		{value}
		title={tooltip ? undefined : title}
		aria-label={ariaLabel ?? label}
		aria-pressed={isSelected(value)}
		class="relative z-10 flex w-full gap-3 md:w-auto items-center justify-center whitespace-nowrap cursor-pointer transition-colors duration-200 {rounded} {compact
			? 'px-3 py-1.5 md:px-4 md:py-1.5'
			: 'px-4 py-4 md:px-8 md:py-4'} {isSelected(value)
			? darkSelected
				? 'text-white'
				: 'text-black'
			: 'text-mid-grey hover:text-black'}"
	>
		{#if icon}
			{@const SvelteComponent = icon}
			<SvelteComponent class={size} />
		{/if}
		{#if label}
			{label}
		{/if}
	</button>
{/snippet}
