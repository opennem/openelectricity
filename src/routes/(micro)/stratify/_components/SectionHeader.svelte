<script>
	/**
	 * @type {{
	 *   label: string,
	 *   children: import('svelte').Snippet
	 * }}
	 */
	let { label, children } = $props();
</script>

<section class="py-8 first:pt-2">
	<div class="mb-6 flex items-center gap-3">
		<p
			class="mb-0 shrink-0 font-space text-xxs font-medium uppercase tracking-wider text-dark-grey"
		>
			{label}
		</p>
		<span class="flex-1 border-t border-dashed border-mid-warm-grey" aria-hidden="true"></span>
	</div>
	<div>
		{@render children()}
	</div>
</section>
