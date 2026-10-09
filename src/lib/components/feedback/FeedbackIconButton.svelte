<script>
	import { MessageSquareShare } from '@lucide/svelte';
	import Tooltip from '$lib/components/ui/Tooltip.svelte';
	import { feedback } from '$lib/feedback/feedback.svelte.js';
	import FeedbackGate from './FeedbackGate.svelte';

	/**
	 * Icon-only "Feedback" button, placed beside each page's navigation: after
	 * About in the main nav, beside the mobile menu toggle, before the options
	 * menu in the fullscreen filter bars, and floating once the nav scrolls
	 * away. Each placement passes classes that match its neighbour, and can
	 * drop the app tooltip (`tooltip={false}`). Hidden when feedback isn't
	 * configured (`FeedbackGate`).
	 * @type {{
	 *   class?: string,
	 *   iconClass?: string,
	 *   tooltip?: boolean,
	 *   side?: 'top' | 'bottom' | 'left' | 'right'
	 * }}
	 */
	let {
		class: className = 'p-2 rounded-lg hover:bg-light-warm-grey transition-colors cursor-pointer',
		iconClass = 'size-6 text-mid-grey',
		tooltip = true,
		side = 'bottom'
	} = $props();
</script>

<!-- `props` are the tooltip trigger's, when there is one. -->
{#snippet button(/** @type {Record<string, any>} */ props)}
	<button
		{...props}
		type="button"
		class="{className} disabled:cursor-wait"
		disabled={feedback.status === 'loading'}
		aria-label={feedback.label}
		onclick={(event) => {
			// Keep any click handling the tooltip trigger brings.
			props.onclick?.(event);
			feedback.open(event.currentTarget);
		}}
	>
		<!-- OE red when the form failed to load; `color` beats the icon's text class. -->
		<MessageSquareShare
			class={iconClass}
			color={feedback.status === 'error' ? '#c74523' : undefined}
			aria-hidden="true"
		/>
	</button>
{/snippet}

<FeedbackGate>
	{#if tooltip}
		<Tooltip text={feedback.label} {side}>
			{#snippet trigger({ props })}
				{@render button(props)}
			{/snippet}
		</Tooltip>
	{:else}
		{@render button({})}
	{/if}
</FeedbackGate>
