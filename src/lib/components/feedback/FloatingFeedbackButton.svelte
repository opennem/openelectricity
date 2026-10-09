<script>
	import { fly } from 'svelte/transition';
	import { MediaQuery, createSubscriber } from 'svelte/reactivity';
	import { feedback } from '$lib/feedback/feedback.svelte.js';
	import FeedbackIconButton from './FeedbackIconButton.svelte';

	/**
	 * Floating "Feedback" icon for windowed pages: slides in from the right at
	 * the bottom-right once the main nav (and its Feedback icon) has scrolled
	 * out of view, and back out when it returns. While the form is open it
	 * slides back off to the right, returning once the form is cancelled or
	 * sent.
	 * Rendered by `Nav.svelte`, which passes its own header.
	 * @type {{ target: HTMLElement }}
	 */
	let { target } = $props();

	const reducedMotion = new MediaQuery('(prefers-reduced-motion: reduce)');

	/** Last observed visibility of the main nav; read through `navOutOfView`. */
	let outOfView = false;
	// Observe only while something reads it; the observer is the source.
	const subscribe = createSubscriber((update) => {
		const observer = new IntersectionObserver(([entry]) => {
			outOfView = !entry.isIntersecting;
			update();
		});
		observer.observe(target);
		return () => observer.disconnect();
	});
	const navOutOfView = () => {
		subscribe();
		return outOfView;
	};

	/** Out of the way from the click until the form is cancelled or sent. */
	let formShowing = $derived(feedback.status === 'loading' || feedback.status === 'open');
</script>

{#if navOutOfView()}
	<div
		class="fixed bottom-6 right-6 z-50"
		transition:fly={{ x: 96, duration: reducedMotion.current ? 0 : 250 }}
	>
		<!-- Kept mounted while hidden, so focus can return to it when the form closes. -->
		<div
			class="transition duration-250 motion-reduce:transition-none"
			class:translate-x-24={formShowing}
			class:opacity-0={formShowing}
			inert={formShowing}
		>
			<FeedbackIconButton
				class="flex size-[56px] items-center justify-center rounded-full bg-black text-white shadow-md transition-colors hover:bg-dark-grey cursor-pointer"
				iconClass="size-[24px] text-white"
				tooltip={false}
			/>
		</div>
	</div>
{/if}
