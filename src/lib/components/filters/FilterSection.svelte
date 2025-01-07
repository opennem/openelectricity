<script>
	/**
	 * @typedef {Object} Props
	 * @property {import('svelte').Snippet} [children]
	 */

	/** @type {Props} */
	let { children } = $props();
</script>

<div class="border-solid border-b-[0.05rem] border-mid-warm-grey last:border-none">
	{@render children?.()}
</div>
