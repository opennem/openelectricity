<script>
	import { onMount } from 'svelte';
	import { feedback } from '$lib/feedback/feedback.svelte.js';

	/**
	 * Renders its children only in the browser, after mount, and only when
	 * feedback is configured — so server-rendered and prerendered pages never
	 * read the feedback environment, and hydration matches the server output.
	 * @type {{ children: import('svelte').Snippet }}
	 */
	let { children } = $props();

	let mounted = $state(false);
	onMount(() => {
		mounted = true;
	});
</script>

{#if mounted && feedback.configured}
	{@render children()}
{/if}
