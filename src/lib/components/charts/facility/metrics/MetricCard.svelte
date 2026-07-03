<script>
	import Tooltip from '$lib/components/ui/Tooltip.svelte';

	/**
	 * A single metric: uppercase label, large value in the site's normal font,
	 * optional unit + subtitle. `description` makes the label a hover tooltip
	 * explaining what the metric is and how it's derived.
	 *
	 * @type {{
	 *   label: string,
	 *   value: string,
	 *   unit?: string,
	 *   subtitle?: string,
	 *   description?: string,
	 *   size?: 'sm' | 'md' | 'lg'
	 * }}
	 */
	let { label, value, unit = '', subtitle = '', description = '', size = 'md' } = $props();

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
		{#if description}
			<Tooltip text={description} class="cursor-help">{label}</Tooltip>
		{:else}
			{label}
		{/if}
	</span>

	<span class="flex items-baseline gap-1">
		<span class="font-semibold tabular-nums text-dark-grey {valueSizeClasses[size]}">
			{value}
		</span>

		{#if unit}
			<span class="text-mid-grey {unitSizeClasses[size]}">{unit}</span>
		{/if}
	</span>

	{#if subtitle}
		<span class="text-xxs text-mid-grey leading-tight">{subtitle}</span>
	{/if}
</div>
