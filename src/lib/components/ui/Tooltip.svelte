<script>
	import { Tooltip as T } from 'bits-ui';

	/**
	 * @type {{
	 *   text: string,
	 *   children: import('svelte').Snippet,
	 *   side?: 'top' | 'bottom' | 'left' | 'right',
	 *   sideOffset?: number,
	 *   delayDuration?: number,
	 *   class?: string,
	 *   learnMoreHref?: string
	 * }}
	 */
	let {
		text,
		children,
		side = 'top',
		sideOffset = 4,
		delayDuration = 100,
		class: className = '',
		learnMoreHref
	} = $props();
</script>

<T.Provider>
	<T.Root {delayDuration}>
		<T.Trigger>
			{#snippet child({ props })}
				<span {...props} class={className}>
					{@render children()}
				</span>
			{/snippet}
		</T.Trigger>
		<T.Portal>
			<T.Content {side} {sideOffset} class="z-[9999]">
				<div
					class="bg-dark-grey rounded-lg py-3 px-4 shadow text-white text-xs font-space max-w-xs leading-snug"
				>
					{text}
					{#if learnMoreHref}
						<a
							href={learnMoreHref}
							target="_blank"
							rel="noopener noreferrer"
							class="inline-block mt-1.5 underline text-white visited:text-white hover:opacity-80"
						>
							Learn more →
						</a>
					{/if}
				</div>
			</T.Content>
		</T.Portal>
	</T.Root>
</T.Provider>
