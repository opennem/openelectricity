<script>
	/**
	 * ApiStatusDot — the status page's colour for the current API status, as a
	 * small round mark, grey while the status is unknown (no `color`).
	 * Decorative: whatever shows it names the status in text.
	 *
	 * @type {{ color?: string, class?: string } & Omit<import('svelte/elements').HTMLAttributes<HTMLSpanElement>, 'class'>}
	 */
	let { color, class: className = 'size-2.5', ...rest } = $props();
</script>

<span
	{...rest}
	class="inline-block shrink-0 rounded-full bg-mid-warm-grey {className}"
	style:background-color={color}
	aria-hidden="true"
></span>
