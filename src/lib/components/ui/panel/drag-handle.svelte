<script>
	import { cn } from '$lib/utils';

	/**
	 * `alwaysShowGrip` keeps the five-dot grip visible at every width; by
	 * default it only appears on hover from `md:` up, where the handle sits in
	 * an otherwise empty gap.
	 * @type {{ axis: 'x' | 'y', onstart: (e: PointerEvent) => void, active?: boolean, alwaysShowGrip?: boolean, class?: string, el?: HTMLElement | undefined } & import('svelte/elements').HTMLAttributes<HTMLDivElement>}
	 */
	let {
		axis,
		onstart,
		active = false,
		alwaysShowGrip = false,
		class: className = '',
		el = $bindable(undefined),
		...restProps
	} = $props();

	let isVertical = $derived(axis === 'x');
</script>

<div
	bind:this={el}
	data-slot="drag-handle"
	class={cn(
		'shrink-0 flex items-center justify-center group bg-light-warm-grey md:bg-transparent hover:bg-warm-grey active:bg-mid-warm-grey transition-colors',
		isVertical ? 'w-3 h-full cursor-col-resize' : 'h-3 cursor-row-resize',
		active ? 'bg-mid-warm-grey' : '',
		className
	)}
	onpointerdown={onstart}
	style="touch-action: none;"
	{...restProps}
>
	<div
		class={cn(
			isVertical ? 'flex flex-col gap-1' : 'flex gap-1',
			'transition-opacity',
			alwaysShowGrip ? '' : 'md:opacity-0 md:group-hover:opacity-100',
			active ? 'md:opacity-100' : ''
		)}
	>
		{#each { length: 5 } as _, i (i)}
			<span
				class="block w-1 h-1 rounded-full bg-mid-grey group-hover:bg-dark-grey transition-colors"
			></span>
		{/each}
	</div>
</div>
