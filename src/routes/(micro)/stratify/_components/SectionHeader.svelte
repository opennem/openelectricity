<script>
	/**
	 * @type {{
	 *   label: string,
	 *   children: import('svelte').Snippet
	 * }}
	 */
	let { label, children } = $props();
</script>

<section class="border-t border-warm-grey py-8 first:border-t-0 first:pt-2">
	<p class="mb-6 font-space text-xxs font-medium uppercase tracking-wider text-dark-grey">
		{label}
	</p>
	<div>
		{@render children()}
	</div>
</section>
