<script>
	import IconChevronDown from '$lib/icons/ChevronDown.svelte';

	/**
	 * Collapsible section for the mobile filter sheet. The Clear action renders
	 * inside the expanded body (the header is a single toggle button, and
	 * nesting buttons is invalid HTML).
	 * @type {{
	 *   title: string,
	 *   summary?: string,
	 *   count?: number,
	 *   clearLabel?: string,
	 *   onclear?: () => void,
	 *   children: import('svelte').Snippet
	 * }}
	 */
	let { title, summary = '', count = 0, clearLabel = 'Clear', onclear, children } = $props();

	let open = $state(false);
</script>

<div class="border-b border-warm-grey">
	<button
		type="button"
		class="w-full py-4 flex items-center justify-between gap-3 text-left cursor-pointer"
		onclick={() => (open = !open)}
		aria-expanded={open}
	>
		<span class="flex flex-col gap-0.5 min-w-0">
			<span class="font-medium text-dark-grey">{title}</span>
			{#if summary}
				<span class="text-xs text-mid-grey truncate">{summary}</span>
			{/if}
		</span>

		<span class="flex items-center gap-2 shrink-0">
			{#if count}
				<span
					class="rounded-full bg-dark-grey text-white text-xxs font-medium min-w-[1.8rem] h-[1.8rem] px-1 flex items-center justify-center"
				>
					{count}
				</span>
			{/if}
			<IconChevronDown
				class="size-5 text-mid-grey transition-transform duration-200 {open ? 'rotate-180' : ''}"
			/>
		</span>
	</button>

	{#if open}
		<div class="pb-4">
			{#if onclear && count > 0}
				<div class="flex justify-end pb-1">
					<button
						type="button"
						class="text-xs text-mid-grey hover:text-dark-grey underline underline-offset-2 transition-colors cursor-pointer"
						onclick={onclear}
					>
						{clearLabel}
					</button>
				</div>
			{/if}
			{@render children()}
		</div>
	{/if}
</div>
