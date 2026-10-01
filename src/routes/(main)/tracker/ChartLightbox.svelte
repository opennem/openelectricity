<script>
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import X from '@lucide/svelte/icons/x';
	import Modal from '$lib/components/Modal.svelte';

	/**
	 * ChartLightbox — one chart enlarged over the page, like a photo lightbox:
	 * the bindable `active` key opens it (null closes it), `children` renders
	 * that key's chart at the dialog's width, and Previous / Next (or ← / →)
	 * step through `items`, wrapping at the ends. Esc, the overlay or Close
	 * dismisses it. The charts keep the page's shared hover state, so the
	 * readout and table follow them. Styled like the mini cards it enlarges:
	 * bordered, a medium-weight title on the left over a header rule, and an
	 * unpadded body whose chart pads itself.
	 *
	 * @type {{
	 *   items: Array<{key: string, label: string}>,
	 *   active?: string | null,
	 *   children: import('svelte').Snippet<[string]>
	 * }}
	 */
	let { items, active = $bindable(null), children } = $props();

	let index = $derived(items.findIndex((item) => item.key === active));
	let item = $derived(index === -1 ? null : items[index]);

	/** @param {number} step */
	function go(step) {
		if (index === -1 || items.length < 2) return;
		active = items[(index + step + items.length) % items.length].key;
	}

	/** @param {KeyboardEvent} event */
	function keydown(event) {
		if (!item) return;
		if (event.key === 'ArrowLeft') go(-1);
		else if (event.key === 'ArrowRight') go(1);
	}

	const BUTTON =
		'inline-flex size-[40px] items-center justify-center rounded-md text-mid-grey transition-colors hover:bg-light-warm-grey hover:text-dark-grey';
</script>

<svelte:window onkeydown={keydown} />

<Modal
	open={item !== null}
	title={item?.label ?? ''}
	titleLevel={3}
	titleClass="m-0 text-base font-medium text-dark-grey"
	headerClass="border-b border-warm-grey px-6 py-3"
	maxWidthClass="max-w-[720px]"
	class="border border-warm-grey p-0! pb-6!"
	onclose={() => (active = null)}
>
	{#snippet header()}
		<div class="flex items-center gap-1">
			{#if items.length > 1}
				<span class="mr-2 text-sm tabular-nums text-mid-grey">{index + 1} / {items.length}</span>
				<button type="button" class={BUTTON} aria-label="Previous chart" onclick={() => go(-1)}>
					<ChevronLeft class="size-[20px]" aria-hidden="true" />
				</button>
				<button type="button" class={BUTTON} aria-label="Next chart" onclick={() => go(1)}>
					<ChevronRight class="size-[20px]" aria-hidden="true" />
				</button>
			{/if}
			<button type="button" class={BUTTON} aria-label="Close" onclick={() => (active = null)}>
				<X class="size-[20px]" aria-hidden="true" />
			</button>
		</div>
	{/snippet}
	{#if item}
		<!-- Unpadded, so a chart's readout band runs flush to the dialog's edges;
		     the dial itself (plus the header, readout and padding) is capped by
		     `--dial-max` to fit the viewport's height with room to spare. px,
		     since the app's rem is 10px. -->
		<div class="w-full [--dial-max:calc(100dvh-260px)]">
			{#key item.key}
				{@render children(item.key)}
			{/key}
		</div>
	{/if}
</Modal>
