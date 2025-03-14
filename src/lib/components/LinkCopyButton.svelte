<script>
	import { writeToClipboard } from '$lib/utils/clipboard';
	import IconShare from '$lib/icons/Share.svelte';
	import IconClipboardDocumentCheck from '$lib/icons/ClipboardDocumentCheck.svelte';
	let copying = $state(false);
	function copyLink() {
		copying = true;
		const url = window.location.href;
		writeToClipboard(url);
		setTimeout(() => {
			copying = false;
		}, 1000);
	}
</script>

<div class="relative">
	<button
		class="bg-black text-white p-3 rounded-lg transition-all hover:bg-dark-grey"
		onclick={copyLink}
	>
		{#if copying}
			<IconClipboardDocumentCheck class="size-8" />
		{:else}
			<IconShare class="size-8" />
		{/if}
	</button>
</div>
