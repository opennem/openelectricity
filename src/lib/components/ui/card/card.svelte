<script>
	import { cn } from '$lib/utils';

	/**
	 * @param {Object} props
	 * @param {HTMLDivElement} [props.ref] - Reference to the card element
	 * @param {string} [props.class] - Additional CSS classes
	 * @param {import('svelte').Snippet} [props.children] - Card content
	 * @param {Object} props.restProps - Additional HTML attributes
	 */
	let { ref = $bindable(null), class: className, children, ...restProps } = $props();
</script>

<div
	bind:this={ref}
	data-slot="card"
	class={cn(
		'bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm',
		className
	)}
	{...restProps}
>
	{@render children?.()}
</div>
