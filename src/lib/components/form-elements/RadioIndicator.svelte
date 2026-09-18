<script>
	/**
	 * Decorative radio dot for controls that already carry their own semantics
	 * (Bits UI radio and select items, the scenario cards). It renders no input.
	 * @type {{ checked?: boolean, class?: string }}
	 */
	let { checked = false, class: className = '' } = $props();
</script>

<span
	aria-hidden="true"
	class={`flex size-[15px] shrink-0 items-center justify-center rounded-full border ${
		checked ? 'border-mid-grey' : 'border-mid-warm-grey'
	} ${className}`}
>
	{#if checked}
		<span class="size-[9px] rounded-full bg-dark-grey"></span>
	{/if}
</span>
