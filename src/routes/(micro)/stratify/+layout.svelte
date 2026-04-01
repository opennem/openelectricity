<script>
	import LoginGate from '$lib/components/auth/LoginGate.svelte';

	/** @type {{ children: import('svelte').Snippet }} */
	let { children } = $props();
</script>

<LoginGate redirectUrl="/stratify">
	{@render children?.()}
</LoginGate>
