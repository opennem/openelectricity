<script>
	/**
	 * TableFootnotes — the dashed note box under a tracker table panel, one
	 * bullet per `<li>` the caller renders. It sits outside the table: a colspan
	 * footnote would scroll with the value columns.
	 *
	 * @type {{ children: import('svelte').Snippet }}
	 */
	let { children } = $props();
</script>

<footer
	class="m-4 rounded-md border border-dashed border-mid-warm-grey bg-light-warm-grey px-4 py-3 text-[11px] leading-relaxed text-mid-grey"
>
	<ul class="m-0 list-disc space-y-2 pl-4">
		{@render children()}
	</ul>
</footer>
