<script>
	/**
	 * @typedef {Object} Props
	 * @property {((event: MouseEvent) => void) | null} [clickHandler]
	 * @property {boolean} [secondary]
	 * @property {boolean} [active]
	 * @property {boolean} [disabled]
	 * @property {string} [href]
	 * @property {string} [target]
	 * @property {string} [title]
	 * @property {import('svelte').Snippet} [children]
	 */

	/** @type {Props & { [key: string]: any }} */
	let {
		clickHandler = null,
		secondary = false,
		active = false,
		disabled = false,
		href = '',
		target = '',
		title = '',
		children,
		...rest
	} = $props();

	const buttonClass =
		'button rounded-md border-solid border-[0.1rem] border-black p-4 font-space appearance-none text-sm font-medium bg-black text-white';
</script>

{#if href}
	<a
		href={disabled ? undefined : href}
		{target}
		{title}
		onclick={clickHandler}
		aria-disabled={disabled}
		tabindex={disabled ? -1 : undefined}
		class="{buttonClass} {rest.class ??
			''} inline-flex items-center justify-center no-underline hover:no-underline"
		class:secondary
		class:active
		class:pointer-events-none={disabled}
		class:opacity-50={disabled}
	>
		{@render children?.()}
	</a>
{:else}
	<button
		onclick={clickHandler}
		{title}
		class="{buttonClass} {rest.class ?? ''}"
		class:secondary
		class:active
		{disabled}>{@render children?.()}</button
	>
{/if}

<style lang="postcss">
	.button,
	.button:active {
		transition:
			background-color 0.15s ease,
			border-color 0.15s ease,
			color 0.15s ease;
	}
	.button:hover,
	.button.active {
		background-color: theme(colors.dark-grey);
		color: #fff;
	}
	.button:disabled {
		background-color: theme(colors.light-warm-grey);
	}
	.secondary {
		background-color: #fff;
		border-color: theme(colors.dark-grey);
		color: #000;
	}
	.secondary:hover,
	.secondary.active {
		background-color: theme(colors.light-warm-grey);
		color: #000;
	}
</style>
