<script>
	/**
	 * ExpandableDescription — Portable Text body clamped to `maxHeight` with a
	 * gradient fade and a Read more / Show less toggle once the content overflows.
	 * Shared by the /facility/[code] About panel and the /facilities detail pane.
	 * Wrap in `{#key facilityCode}` to collapse it again on selection change.
	 */
	import PortableTextBody from '$lib/components/PortableTextBody.svelte';

	/** @type {{ value: any, maxHeight?: number }} */
	let { value, maxHeight = 160 } = $props();

	let expanded = $state(false);
	let needsExpand = $state(false);

	/**
	 * Attachment: after layout, flag whether the rendered content overflows
	 * `maxHeight` so the toggle appears. Re-runs when `value` / `maxHeight` change
	 * (both read synchronously); scrollHeight is an imperative DOM read.
	 * @param {Element} node
	 */
	function measureOverflow(node) {
		const _value = value;
		const limit = maxHeight;
		const raf = requestAnimationFrame(() => {
			needsExpand = node.scrollHeight > limit;
		});
		return () => cancelAnimationFrame(raf);
	}
</script>

<div class="relative overflow-hidden" style:max-height={expanded ? 'none' : `${maxHeight}px`}>
	<div {@attach measureOverflow}>
		<PortableTextBody {value} class="text-sm leading-relaxed text-dark-grey/80" />
	</div>

	{#if needsExpand && !expanded}
		<div
			class="pointer-events-none absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent"
		></div>
	{/if}
</div>

{#if needsExpand}
	<button
		class="mt-2 cursor-pointer text-xs text-mid-grey/60 transition-colors hover:text-mid-grey"
		onclick={() => (expanded = !expanded)}
	>
		{expanded ? 'Show less' : 'Read more'}
	</button>
{/if}
