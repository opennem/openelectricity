<script>
	import { getContrastedTextCss } from '$lib/colours.js';

	/**
	 * @typedef {Object} Props
	 * @property {{ name: string, hex: string, note?: string }[]} items
	 */

	/** @type {Props} */
	let { items } = $props();
</script>

<div class="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3">
	{#each items as item (item.name)}
		<div class="border border-warm-grey rounded-lg overflow-hidden bg-white">
			<div class="h-16 flex items-end px-3 py-2" style:background-color={item.hex}>
				<span class="font-mono text-xxs" style:color={getContrastedTextCss(item.hex)}
					>{item.hex}</span
				>
			</div>
			<div class="px-3 py-2">
				<div class="font-space text-xs font-medium leading-xs">{item.name}</div>
				{#if item.note}
					<div class="font-mono text-xxs text-mid-grey mt-1">{item.note}</div>
				{/if}
			</div>
		</div>
	{/each}
</div>
