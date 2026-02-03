<script>
	/**
	 * @typedef {Object} Props
	 * @property {string} [class] - Additional CSS classes
	 * @property {'text' | 'card' | 'chart' | 'circle'} [variant] - Skeleton variant
	 */

	/** @type {Props} */
	let { class: className = '', variant = 'text' } = $props();
</script>

{#if variant === 'text'}
	<div class="bg-warm-grey animate-pulse h-4 rounded w-full {className}"></div>
{:else if variant === 'card'}
	<div class="bg-warm-grey animate-pulse h-48 rounded-xl w-full {className}"></div>
{:else if variant === 'chart'}
	<div
		class="bg-warm-grey animate-pulse h-[300px] md:h-[500px] rounded-xl w-full {className}"
	></div>
{:else if variant === 'circle'}
	<div class="bg-warm-grey animate-pulse h-12 w-12 rounded-full {className}"></div>
{:else}
	<div class="bg-warm-grey animate-pulse h-4 rounded w-full {className}"></div>
{/if}
