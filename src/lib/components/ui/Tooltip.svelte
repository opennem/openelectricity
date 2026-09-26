<script>
	import { Tooltip as T } from 'bits-ui';

	/**
	 * @type {{
	 *   text?: string,
	 *   lines?: string[],
	 *   children?: import('svelte').Snippet,
	 *   trigger?: import('bits-ui').Tooltip.TriggerProps['child'],
	 *   side?: 'top' | 'bottom' | 'left' | 'right',
	 *   sideOffset?: number,
	 *   delayDuration?: number,
	 *   class?: string,
	 *   learnMoreHref?: string,
	 *   linkLabel?: string
	 * }}
	 */
	let {
		text = '',
		lines = /** @type {string[]} */ ([]),
		children,
		trigger,
		side = 'top',
		sideOffset = 4,
		delayDuration = 100,
		class: className = '',
		learnMoreHref,
		linkLabel = 'Learn more →'
	} = $props();
</script>

<T.Provider>
	<T.Root {delayDuration}>
		<T.Trigger>
			{#snippet child({ props })}
				{#if trigger}
					{@render trigger({ props })}
				{:else}
					<span {...props} class={className}>
						{@render children?.()}
					</span>
				{/if}
			{/snippet}
		</T.Trigger>
		<T.Portal>
			<T.Content {side} {sideOffset} class="z-[9999]">
				<div
					class="bg-dark-grey rounded-lg py-3 px-4 shadow text-white text-xs font-space max-w-sm leading-relaxed"
				>
					{#if lines.length}
						{#each lines as line (line)}
							<div>{line}</div>
						{/each}
					{:else}
						{text}
					{/if}
					{#if learnMoreHref}
						<a
							href={learnMoreHref}
							target="_blank"
							rel="noopener noreferrer"
							class="block mt-1.5 underline text-white visited:text-white hover:opacity-80"
						>
							{linkLabel}
						</a>
					{/if}
				</div>
			</T.Content>
		</T.Portal>
	</T.Root>
</T.Provider>
