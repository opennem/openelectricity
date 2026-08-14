<script>
	import Button from '$lib/components/form-elements/Button.svelte';

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

	let secondary = $derived(variant === 'default');
</script>

<Button
	{href}
	{target}
	{title}
	{disabled}
	{secondary}
	clickHandler={onclick}
	class="inline-flex items-center gap-2"
>
	{@render children()}
</Button>
