<script>
	import { MessageSquare } from '@lucide/svelte';
	import { feedback } from '$lib/feedback/feedback.svelte.js';
	import FeedbackGate from './FeedbackGate.svelte';

	/**
	 * Corner "Feedback" button. Labelled from `md` up on content pages; icon
	 * only (`compact`) on the Tracker, where it sits over the table panel's
	 * corner. The layout decides where it shows (`floatingFeedbackMode`).
	 * @type {{ compact?: boolean, class?: string }}
	 */
	let { compact = false, class: className = '' } = $props();
</script>

<FeedbackGate>
	<button
		type="button"
		class="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full border border-mid-warm-grey bg-white text-sm font-medium shadow-md transition-colors hover:bg-light-warm-grey disabled:cursor-wait {compact
			? 'p-3'
			: 'px-4 py-3 md:px-5'} {feedback.status === 'error'
			? 'text-red'
			: 'text-dark-grey'} {className}"
		disabled={feedback.status === 'loading'}
		aria-label={feedback.label}
		title={feedback.label}
		onclick={(event) => feedback.open(event.currentTarget)}
	>
		<MessageSquare size={18} aria-hidden="true" />
		{#if !compact}<span class="hidden md:inline">{feedback.label}</span>{/if}
	</button>
</FeedbackGate>
