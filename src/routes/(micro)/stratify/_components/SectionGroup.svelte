<script>
	/**
	 * @type {{
	 *   children: import('svelte').Snippet
	 * }}
	 */
	let { children } = $props();
</script>

<div class="mt-8 flex flex-col gap-8 border-t border-warm-grey pt-8">
	{@render children()}
</div>
