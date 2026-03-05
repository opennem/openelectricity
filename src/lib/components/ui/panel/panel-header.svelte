<script>
	import { cn } from '$lib/utils';
	/** @type {{ ref?: HTMLDivElement | null, class?: string, children?: import('svelte').Snippet, [key: string]: any }} */
	let { ref = $bindable(null), class: className, children, ...restProps } = $props();
</script>

<div
	bind:this={ref}
	data-slot="panel-header"
	class={cn(
		'flex items-center gap-2 px-4 py-3 border-b border-warm-grey bg-light-warm-grey/50 flex-shrink-0',
		className
	)}
	{...restProps}
>
	{@render children?.()}
</div>
