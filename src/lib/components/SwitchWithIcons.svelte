<script>
	/**
	 * Segmented switcher with a thumb that slides to the selected option.
	 * The thumb is inset from the track via the container padding.
	 * @typedef {Object} Props
	 * @property {{ label?: string, ariaLabel?: string, value: string | number, icon?: *, size?: string }[]} [buttons]
	 * @property {string | number } [selected]
	 * @property {boolean} [compact]
	 * @property {string} [rounded] - Tailwind radius class for the container, thumb and buttons
	 * @property {boolean} [darkSelected] - Thumb uses a dark fill (matches active filter pills)
	 * @property {string} [trackClass] - Fill + border colour classes for the track (default: light grey chip; pass white for placement on a recessed tray)
	 * @property {(option: {value: string, element: HTMLButtonElement}) => void} [onchange]
	 */

	/** @type {Props & { [key: string]: any }} */
	let {
		buttons = [],
		selected = '',
		compact = false,
		rounded = 'rounded-xl',
		darkSelected = false,
		trackClass = 'bg-light-warm-grey border-mid-warm-grey',
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
	{...rest}
	class={`relative flex md:inline-flex p-1 ${rounded} ${trackClass} border border-solid ${compact ? 'text-xs' : 'text-sm'} ${className}`}
>
	{#if thumbVisible}
		<div
			class="absolute shadow-lg transition-all duration-200 ease-out {rounded} {darkSelected
				? 'bg-dark-grey border border-dark-grey'
				: 'bg-white border border-black'}"
			style="left: {thumbLeft}px; top: {thumbTop}px; width: {thumbWidth}px; height: {thumbHeight}px;"
		></div>
	{/if}

	{#each buttons as { label, ariaLabel, value, icon, size } (value)}
		<button
			type="button"
			bind:this={buttonEls[value]}
			onclick={handleClick}
			{value}
			aria-label={ariaLabel ?? label}
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
	{/each}
</div>
