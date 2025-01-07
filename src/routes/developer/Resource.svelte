<script>
	/**
	 * @typedef {Object} Props
	 * @property {import('svelte').Snippet} [icon]
	 * @property {import('svelte').Snippet} [children]
	 */

	/** @type {Props} */
	let { icon, children } = $props();
</script>

<div class="pt-12 md:pt-0 md:grid md:grid-cols-8 md:divide-x divide-dotted divide-mid-warm-grey">
	<dt class="col-span-2 place-self-center">
		{@render icon?.()}
	</dt>

	<dd class="text-dark-grey col-span-6 md:pl-12 pt-6 font-light">
		{@render children?.()}
	</dd>
</div>
