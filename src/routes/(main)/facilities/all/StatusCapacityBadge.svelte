<script>
	import { Tooltip } from 'bits-ui';
	import formatValue from '../_utils/format-value';

	/**
	 * @typedef {Object} Props
	 * @property {number} capacity
	 * @property {string} colour
	 * @property {string} label
	 */

	/** @type {Props} */
	let { capacity, colour, label } = $props();
</script>

{#if capacity > 0}
	<Tooltip.Provider>
		<Tooltip.Root delayDuration={100}>
			<Tooltip.Trigger>
				<div
					class="flex items-center gap-1.5 cursor-default rounded-full px-2 py-1 -mx-2 -my-1 hover:bg-warm-grey transition-colors"
				>
					<span class="w-2 h-2 rounded-full" style="background-color: {colour};"></span>
					<span class="font-mono text-dark-grey">{formatValue(capacity)}</span>
				</div>
			</Tooltip.Trigger>
			<Tooltip.Content sideOffset={4} side="top">
				<div class="bg-dark-grey rounded-lg py-1.5 px-3 shadow text-white text-xs font-space">
					{label}
				</div>
			</Tooltip.Content>
		</Tooltip.Root>
	</Tooltip.Provider>
{/if}
