<script module>
	import { cn } from '$lib/utils';
	import { tv } from 'tailwind-variants';

	export const buttonVariants = tv({
		base: "focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium outline-none transition-all focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
		variants: {
			variant: {
				default: 'bg-primary text-primary-foreground shadow-xs hover:bg-primary/90',
				destructive:
					'bg-destructive shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60 text-white',
				outline:
					'bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 border',
				secondary: 'bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80',
				ghost: 'hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50',
				link: 'text-primary underline-offset-4 hover:underline'
			},
			size: {
				default: 'px-5 py-3 text-base has-[>svg]:px-4',
				sm: 'gap-1.5 rounded-md px-4 py-2 text-sm has-[>svg]:px-3',
				lg: 'rounded-md px-7 py-3 text-lg has-[>svg]:px-5',
				icon: 'size-9'
			}
		},
		defaultVariants: {
			variant: 'default',
			size: 'default'
		}
	});
</script>

<script>
	/**
	 * @typedef {'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'} ButtonVariant
	 * @typedef {'default' | 'sm' | 'lg' | 'icon'} ButtonSize
	 * @typedef {'button' | 'submit' | 'reset'} ButtonType
	 */

	/**
	 * @param {Object} props
	 * @param {string} [props.class] - Additional CSS classes
	 * @param {ButtonVariant} [props.variant='default'] - Button variant style
	 * @param {ButtonSize} [props.size='default'] - Button size
	 * @param {HTMLButtonElement | HTMLAnchorElement} [props.ref] - Reference to the button element
	 * @param {string} [props.href] - URL for link button
	 * @param {ButtonType} [props.type='button'] - Button type
	 * @param {boolean} [props.disabled] - Whether button is disabled
	 * @param {import('svelte').Snippet} [props.children] - Button content
	 * @param {Object} props.restProps - Additional HTML attributes
	 */
	let {
		class: className = '',
		variant = 'default',
		size = 'default',
		ref = $bindable(null),
		href = undefined,
		type = 'button',
		disabled = false,
		children,
		...restProps
	} = $props();

	/** @type {ButtonType} */
	let buttonType = /** @type {ButtonType} */ (type);
</script>

{#if href}
	<a
		bind:this={ref}
		data-slot="button"
		class={cn(
			buttonVariants({
				variant: /** @type {ButtonVariant} */ (variant),
				size: /** @type {ButtonSize} */ (size)
			}),
			className ?? ''
		)}
		href={disabled ? undefined : href}
		aria-disabled={disabled}
		role={disabled ? 'link' : undefined}
		tabindex={disabled ? -1 : undefined}
		{...restProps}
	>
		{@render children?.()}
	</a>
{:else}
	<button
		bind:this={ref}
		data-slot="button"
		class={cn(
			buttonVariants({
				variant: /** @type {ButtonVariant} */ (variant),
				size: /** @type {ButtonSize} */ (size)
			}),
			className ?? ''
		)}
		type={buttonType}
		{disabled}
		{...restProps}
	>
		{@render children?.()}
	</button>
{/if}
