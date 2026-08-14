<script module>
	/**
	 * Shared Tailwind class string for form inputs in the Stratify builder
	 * panels. Append width / layout utilities at the call site
	 * (`flex-1`, `w-20`, etc.).
	 */
	export const CONTROL_INPUT_CLASS =
		'bg-light-warm-grey/50 border border-warm-grey rounded-lg px-3 py-2 text-xs text-dark-grey focus:outline-none focus:border-red focus:ring-1 focus:ring-red';
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

<label class="flex items-center gap-3">
	<span class="w-[34%] max-w-[110px] shrink-0 text-xs text-mid-grey">{label}</span>
	{@render children()}
	{#if suffix}
		<span class="text-xs text-mid-grey">{suffix}</span>
	{/if}
</label>
