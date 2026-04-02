<script>
	/**
	 * @type {{
	 *   href?: string,
	 *   onclick?: () => void,
	 *   variant?: 'default' | 'primary',
	 *   disabled?: boolean,
	 *   target?: string,
	 *   title?: string,
	 *   children: import('svelte').Snippet
	 * }}
	 */
	let {
		href = '',
		onclick,
		variant = 'default',
		disabled = false,
		target = '',
		title = '',
		children
	} = $props();

	const base = 'inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[10px] transition-colors disabled:opacity-40 disabled:pointer-events-none';
	const variants = {
		default: 'border border-warm-grey text-mid-grey hover:text-dark-grey hover:border-dark-grey',
		primary: 'bg-dark-grey text-white hover:bg-black'
	};
	let className = $derived(`${base} ${variants[variant]}`);
</script>

{#if href}
	<a {href} class="{className} no-underline" {target} {title}>
		{@render children()}
	</a>
{:else}
	<button type="button" {onclick} {disabled} class={className} {title}>
		{@render children()}
	</button>
{/if}
