<script>
	/**
	 * @type {{
	 *   children: import('svelte').Snippet
	 * }}
	 */
	let { children } = $props();
</script>

<div class="mt-3 pt-3 border-t border-warm-grey flex flex-col gap-6">
	{@render children()}
</div>
