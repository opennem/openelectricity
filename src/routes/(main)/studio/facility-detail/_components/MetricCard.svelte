<script>
	/**
	 * @type {{
	 *   label: string,
	 *   value: string,
	 *   unit?: string,
	 *   subtitle?: string,
	 *   size?: 'sm' | 'md' | 'lg'
	 * }}
	 */
	let { label, value, unit = '', subtitle = '', size = 'md' } = $props();

	const valueSizeClasses = {
		sm: 'text-base',
		md: 'text-xl',
		lg: 'text-2xl'
	};

	const unitSizeClasses = {
		sm: 'text-xxs',
		md: 'text-xs',
		lg: 'text-sm'
	};
</script>

<div class="flex flex-col gap-0.5">
	<span class="text-xxs font-medium uppercase tracking-wider text-mid-grey">
		{label}
	</span>

	<span class="flex items-baseline gap-1">
		<span class="font-mono font-bold tabular-nums text-dark-grey {valueSizeClasses[size]}">
			{value}
		</span>

		{#if unit}
			<span class="font-mono text-mid-grey {unitSizeClasses[size]}">
				{unit}
			</span>
		{/if}
	</span>

	{#if subtitle}
		<span class="text-xxs text-mid-grey leading-tight">
			{subtitle}
		</span>
	{/if}
</div>
