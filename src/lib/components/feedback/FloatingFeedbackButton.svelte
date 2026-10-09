<script>
	import { fly } from 'svelte/transition';
	import { MediaQuery, createSubscriber } from 'svelte/reactivity';
	import FeedbackIconButton from './FeedbackIconButton.svelte';

	/**
	 * Floating "Feedback" icon for windowed pages: slides in from the right at
	 * the bottom-right once the main nav (and its Feedback icon) has scrolled
	 * out of view, and back out when the nav returns. The main nav marks its
	 * header with `data-main-nav`.
	 */

	const reducedMotion = new MediaQuery('(prefers-reduced-motion: reduce)');

	/** Last observed visibility of the main nav; read through `navOutOfView`. */
	let outOfView = false;
	// Observe only while something reads it; the observer is the source.
	const subscribe = createSubscriber((update) => {
		const nav = document.querySelector('[data-main-nav]');
		if (!nav) return;
		const observer = new IntersectionObserver(([entry]) => {
			outOfView = !entry.isIntersecting;
			update();
		});
		observer.observe(nav);
		return () => observer.disconnect();
	});
	const navOutOfView = () => {
		subscribe();
		return outOfView;
	};
</script>

{#if navOutOfView()}
	<div
		class="fixed bottom-6 right-6 z-50"
		transition:fly={{ x: 96, duration: reducedMotion.current ? 0 : 250 }}
	>
		<FeedbackIconButton
			class="flex size-[56px] items-center justify-center rounded-full bg-black text-white shadow-md transition-colors hover:bg-dark-grey cursor-pointer"
			iconClass="size-[24px] text-white"
			tooltip={false}
		/>
	</div>
{/if}
