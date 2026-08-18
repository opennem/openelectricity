<script>
	import { Button } from '$lib/components/ui/button/index.js';

	/**
	 * @type {{
	 *   href?: string,
	 *   onclick?: () => void,
	 *   variant?: 'default' | 'primary' | 'accent',
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

	let buttonVariant = $derived(variant === 'default' ? 'outline' : 'default');
</script>

<Button
	{href}
	{target}
	{title}
	{disabled}
	{onclick}
	variant={buttonVariant}
	class="inline-flex items-center gap-2"
>
	{@render children()}
</Button>
