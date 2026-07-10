<script>
	import Tooltip from '$lib/components/ui/Tooltip.svelte';

	/**
	 * A single metric: uppercase label, large value in the site's normal font,
	 * optional unit + subtitle. `description` makes the label a hover tooltip
	 * explaining what the metric is and how it's derived.
	 *
	 * `columns` swaps the single value for side-by-side sub-headed values
	 * (e.g. the unit sheet's Capacity cell showing Maximum and Registered);
	 * `value`/`unit` are ignored when it's provided.
	 *
	 * @type {{
	 *   label: string,
	 *   value?: string,
	 *   unit?: string,
	 *   subtitle?: string,
	 *   description?: string,
	 *   size?: 'sm' | 'md' | 'lg',
	 *   columns?: { header: string, value: string, unit?: string }[]
	 * }}
	 */
	let {
		label,
		value = '',
		unit = '',
		subtitle = '',
		description = '',
		size = 'md',
		columns = []
	} = $props();

	/**
	 * @param {string} v
	 * @returns {boolean}
	 */
	function isEmptyValue(v) {
		return v === '--' || v === '-';
	}

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

	{#snippet valueUnit(/** @type {string} */ v, /** @type {string | undefined} */ u)}
		<span class="flex items-baseline gap-1">
			<span
				class="font-semibold tabular-nums {isEmptyValue(v)
					? 'text-mid-grey'
					: 'text-dark-grey'} {valueSizeClasses[size]}"
			>
				{v}
			</span>

			{#if u}
				<span class="text-mid-grey {unitSizeClasses[size]}">{u}</span>
			{/if}
		</span>
	{/snippet}

	{#if columns.length}
		<span class="flex gap-4">
			{#each columns as col (col.header)}
				<span class="flex min-w-0 flex-1 flex-col gap-0.5">
					<span class="text-xxs text-mid-grey">{col.header}</span>
					{@render valueUnit(col.value, col.unit)}
				</span>
			{/each}
		</span>
	{:else}
		{@render valueUnit(value, unit)}
	{/if}

	{#if subtitle}
		<span class="text-xxs text-mid-grey leading-tight">{subtitle}</span>
	{/if}
</div>
