<script module>
	/**
	 * Shared Tailwind class string for form inputs in the Stratify builder
	 * panels. Append width / layout utilities at the call site
	 * (`flex-1`, `w-20`, etc.).
	 */
	export const CONTROL_INPUT_CLASS =
		'bg-light-warm-grey/50 border border-warm-grey rounded px-2 py-1 text-[11px] text-dark-grey focus:outline-none focus:border-dark-grey';
</script>

<script>
	/**
	 * One labelled row in a builder panel. Wraps an input/select/checkbox
	 * passed as default children with the panel's standard label-on-left
	 * layout. Use `suffix` for trailing text (e.g. "ms / frame", or the
	 * inline label that follows a checkbox when `label` is empty).
	 *
	 * @type {{ label?: string, suffix?: string, children: () => any }}
	 */
	let { label = '', suffix = '', children } = $props();
</script>

<label class="flex items-center gap-2">
	<span class="text-[10px] text-mid-grey w-[30%] max-w-[80px] shrink-0">{label}</span>
	{@render children()}
	{#if suffix}
		<span class="text-[10px] text-mid-grey">{suffix}</span>
	{/if}
</label>
