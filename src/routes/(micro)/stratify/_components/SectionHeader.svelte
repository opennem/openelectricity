<script>
	/**
	 * @type {{
	 *   label: string,
	 *   children: import('svelte').Snippet
	 * }}
	 */
	let { label, children } = $props();
</script>

<div class="pt-6 border-t border-warm-grey first:pt-0 first:border-t-0">
	<p class="text-[10px] text-dark-grey font-bold uppercase tracking-wide mb-2">{label}</p>
	<div class="pl-3">
		{@render children()}
	</div>
</div>
