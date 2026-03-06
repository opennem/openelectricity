<script>
	import { cn } from '$lib/utils';

	/** @type {{ axis: 'x' | 'y', onstart: (e: PointerEvent) => void, active?: boolean, class?: string }} */
	let { axis, onstart, active = false, class: className = '', ...restProps } = $props();

	let isVertical = $derived(axis === 'x');
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	data-slot="drag-handle"
	class={cn(
		'flex-shrink-0 flex items-center justify-center group bg-light-warm-grey hover:bg-warm-grey active:bg-mid-warm-grey transition-colors',
		isVertical ? 'w-3 h-full cursor-col-resize' : 'h-3 cursor-row-resize',
		active ? 'bg-mid-warm-grey' : '',
		className
	)}
	onpointerdown={onstart}
	style="touch-action: none;"
	{...restProps}
>
	<div class={isVertical ? 'flex flex-col gap-1' : 'flex gap-1'}>
		{#each { length: 5 } as _, i (i)}
			<span class="block w-1 h-1 rounded-full bg-mid-grey group-hover:bg-dark-grey transition-colors"></span>
		{/each}
	</div>
</div>
