<script>
	/**
	 * @type {{
	 *   count: number,
	 *   size?: 'sm' | 'md',
	 *   darkMode?: boolean,
	 *   zIndex?: number
	 * }}
	 */
	let { count, size = 'md', darkMode = false, zIndex = 1 } = $props();

	let sizeClasses = $derived(
		size === 'sm'
			? {
					padding: 'p-1.5',
					iconSize: 'w-4 h-4',
					fontSize: 'text-[10px]',
					overlapMargin: '-ml-3'
				}
			: {
					padding: 'p-2',
					iconSize: 'w-6 h-6',
					fontSize: 'text-xs',
					overlapMargin: '-ml-5'
				}
	);

	let colorClasses = $derived(
		darkMode
			? 'border border-white/30 bg-white/20 text-white'
			: 'border-2 border-white bg-light-warm-grey text-mid-grey'
	);
</script>

<span
	class="rounded-full {sizeClasses.padding} flex items-center justify-center relative shadow-sm {sizeClasses.fontSize} font-medium transition-all duration-200 ease-out {sizeClasses.overlapMargin} group-hover/badges:opacity-0 group-hover/badges:scale-0 group-hover/badges:w-0 group-hover/badges:p-0 group-hover/badges:border-0 group-hover/badges:ml-0 {colorClasses}"
	style="z-index: {zIndex};"
	title="{count} more fuel types"
>
	<span class="{sizeClasses.iconSize} flex items-center justify-center">+{count}</span>
</span>
