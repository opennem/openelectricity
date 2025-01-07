<script>
	import { getContext } from 'svelte';
	import { writeToClipboard } from '$lib/utils/clipboard';
	import IconShare from '$lib/icons/Share.svelte';
	import IconClipboardDocumentCheck from '$lib/icons/ClipboardDocumentCheck.svelte';
	import IconArrowDownTray from '$lib/icons/ArrowDownTray.svelte';

	const { title, seriesCsvData } = getContext('record-history-data-viz');

	let copying = $state(false);
	function copyLink() {
		copying = true;
		const url = window.location.href;
		writeToClipboard(url);
		setTimeout(() => {
			copying = false;
		}, 1000);
	}

	let file = $derived(new Blob([$seriesCsvData], { type: 'text/plain' }));
	let fileUrl = $derived(URL.createObjectURL(file));
	let fileName = $derived(`${$title.split(' ').join('-')}.csv`);
</script>

<div class="flex gap-3">
	<a
		href={fileUrl}
		download={fileName}
		class="bg-black block text-white p-3 rounded-lg transition-all hover:bg-dark-grey"
	>
		<IconArrowDownTray class="size-8" />
	</a>

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
