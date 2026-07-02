<script>
	import IconChevronDown from '$lib/icons/ChevronDown.svelte';

	/**
	 * Collapsible section for the mobile filter sheet. The selected options show
	 * as tags under the title (capped, with a "+N more" overflow). The Clear
	 * action renders inside the expanded body (the header is a single toggle
	 * button, and nesting buttons is invalid HTML).
	 * @type {{
	 *   title: string,
	 *   tags?: string[],
	 *   count?: number,
	 *   clearLabel?: string,
	 *   onclear?: () => void,
	 *   children: import('svelte').Snippet
	 * }}
	 */
	let { title, tags = [], count = 0, clearLabel = 'Clear', onclear, children } = $props();

	let open = $state(false);

	const MAX_TAGS = 3;
	let shownTags = $derived(tags.slice(0, MAX_TAGS));
	let overflowCount = $derived(Math.max(0, tags.length - MAX_TAGS));
</script>

<div class="border-b border-warm-grey">
	<button
		type="button"
		class="w-full py-4 flex items-center justify-between gap-3 text-left cursor-pointer"
		onclick={() => (open = !open)}
		aria-expanded={open}
	>
		<span class="flex flex-col gap-1.5 min-w-0">
			<span class="font-space font-medium text-xs uppercase text-dark-grey">{title}</span>
			{#if shownTags.length}
				<span class="flex flex-wrap items-center gap-1">
					{#each shownTags as tag, i (i)}
						<span
							class="inline-flex items-center rounded-full bg-dark-grey px-2.5 py-0.5 text-xxs font-medium text-white"
						>
							{tag}
						</span>
					{/each}
					{#if overflowCount > 0}
						<span class="text-xxs text-mid-grey">+{overflowCount} more</span>
					{/if}
				</span>
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
