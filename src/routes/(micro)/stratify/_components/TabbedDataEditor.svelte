<script>
	import { Maximize2 } from '@lucide/svelte';

	/**
	 * @type {{
	 *   hasData: boolean,
	 *   activeTab?: 'csv' | 'parsed',
	 *   expandedView?: boolean,
	 *   expandLabel: string,
	 *   onexpand: () => void,
	 *   csv: import('svelte').Snippet<[boolean]>,
	 *   parsed: import('svelte').Snippet<[boolean]>,
	 *   messages?: import('svelte').Snippet<[boolean]>
	 * }}
	 */
	let {
		hasData,
		activeTab = $bindable('csv'),
		expandedView = false,
		expandLabel,
		onexpand,
		csv,
		parsed,
		messages
	} = $props();
</script>

<div class={expandedView ? 'flex min-h-0 flex-1 flex-col' : ''}>
	<div class="flex items-end justify-between gap-3">
		{#if hasData}
			<div class="flex gap-0.5">
				<button
					type="button"
					class="cursor-pointer rounded-t-lg px-4 py-2 font-space font-medium uppercase tracking-wider transition-colors {expandedView
						? 'text-sm'
						: 'text-xxs'}
						{activeTab === 'csv' ? 'bg-warm-grey/50 text-dark-grey' : 'text-mid-grey hover:text-dark-grey'}"
					onclick={() => (activeTab = 'csv')}
				>
					CSV
				</button>
				<button
					type="button"
					class="cursor-pointer rounded-t-lg px-4 py-2 font-space font-medium uppercase tracking-wider transition-colors {expandedView
						? 'text-sm'
						: 'text-xxs'}
						{activeTab === 'parsed' ? 'bg-warm-grey/50 text-dark-grey' : 'text-mid-grey hover:text-dark-grey'}"
					onclick={() => (activeTab = 'parsed')}
				>
					Parsed
				</button>
			</div>
		{/if}

		{#if !expandedView}
			<button
				type="button"
				class="mb-2 ml-auto inline-flex items-center rounded-md p-1.5 text-mid-grey transition-colors hover:bg-light-warm-grey hover:text-dark-grey focus:outline-none focus:ring-2 focus:ring-red"
				onclick={onexpand}
				aria-label={expandLabel}
				title={expandLabel}
			>
				<Maximize2 size={13} />
			</button>
		{/if}
	</div>

	{#if !hasData || activeTab === 'csv'}
		{@render csv(expandedView)}
	{:else}
		{@render parsed(expandedView)}
	{/if}

	{#if messages}
		<div class="mt-2 space-y-1">
			{@render messages(expandedView)}
		</div>
	{/if}
</div>
