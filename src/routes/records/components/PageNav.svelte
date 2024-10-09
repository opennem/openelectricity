<script>
	import { getContext } from 'svelte';
	import { writeToClipboard } from '$lib/utils/clipboard';
	import IconChevronLeft from '$lib/icons/ChevronLeft.svelte';
	import IconShare from '$lib/icons/Share.svelte';
	import IconClipboardDocumentCheck from '$lib/icons/ClipboardDocumentCheck.svelte';
	import IconArrowDownTray from '$lib/icons/ArrowDownTray.svelte';

	const { title, seriesCsvData } = getContext('record-history-data-viz');

	let copying = false;
	function copyLink() {
		copying = true;
		const url = window.location.href;
		writeToClipboard(url);
		setTimeout(() => {
			copying = false;
		}, 1000);
	}

	$: file = new Blob([$seriesCsvData], { type: 'text/plain' });
	$: fileUrl = URL.createObjectURL(file);
	$: fileName = `${$title.split(' ').join('-')}.csv`;
</script>

<div class="flex justify-between items-center">
	<a href="/records" class="flex items-center gap-2 text-dark-grey font-space text-sm">
		<span class="rounded-full border border-dark-grey p-1 block">
			<IconChevronLeft class="size-4 relative -left-[1px]" stroke-width="3" />
		</span>
		Back
	</a>

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
			on:click={copyLink}
		>
			{#if copying}
				<IconClipboardDocumentCheck class="size-8" />
			{:else}
				<IconShare class="size-8" />
			{/if}
		</button>
	</div>
</div>
