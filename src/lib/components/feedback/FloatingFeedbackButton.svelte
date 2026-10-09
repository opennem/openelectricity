<script>
	import { MessageSquareShare } from '@lucide/svelte';
	import { feedback } from '$lib/feedback/feedback.svelte.js';
	import FeedbackGate from './FeedbackGate.svelte';

	/**
	 * Corner "Feedback" button: icon only on small screens, labelled from `md`
	 * up. The layout decides where it shows (`showsFloatingFeedback`).
	 * @type {{ class?: string }}
	 */
	let { class: className = '' } = $props();
</script>

<FeedbackGate>
	<button
		type="button"
		class="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full font-space text-sm font-medium text-white shadow-md transition-colors disabled:cursor-wait px-4 py-3 md:px-5 {feedback.status ===
		'error'
			? 'bg-red hover:bg-red/90'
			: 'bg-black hover:bg-dark-grey'} {className}"
		disabled={feedback.status === 'loading'}
		aria-label={feedback.label}
		title={feedback.label}
		onclick={(event) => feedback.open(event.currentTarget)}
	>
		<MessageSquareShare size={18} aria-hidden="true" />
		<span class="hidden md:inline">{feedback.label}</span>
	</button>
</FeedbackGate>
