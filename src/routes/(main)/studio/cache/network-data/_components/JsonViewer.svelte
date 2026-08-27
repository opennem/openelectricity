<script>
	import { writeToClipboard } from '$lib/utils/clipboard.js';
	import { onDestroy } from 'svelte';
	import { jsonSearchMatches } from '../_lib/cache-dashboard.js';

	/**
	 * @typedef {Object} Props
	 * @property {any} value - The cached JSON payload
	 * @property {string} filename - Download filename
	 */

	/** @type {Props} */
	let { value, filename } = $props();

	let raw = $state(false);
	let searchTerm = $state('');
	let copied = $state(false);
	/** @type {ReturnType<typeof setTimeout> | undefined} */
	let copiedTimeout;
	onDestroy(() => clearTimeout(copiedTimeout));

	let prettyText = $derived(JSON.stringify(value, null, 2));
	let lines = $derived(prettyText.split('\n'));
	let matches = $derived(jsonSearchMatches(lines, searchTerm));
	let displayText = $derived(raw ? JSON.stringify(value) : prettyText);

	async function copy() {
		await writeToClipboard(displayText);
		copied = true;
		clearTimeout(copiedTimeout);
		copiedTimeout = setTimeout(() => (copied = false), 1500);
	}

	function download() {
		const blob = new Blob([prettyText], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const anchor = document.createElement('a');
		anchor.href = url;
		anchor.download = filename;
		anchor.click();
		URL.revokeObjectURL(url);
	}
</script>

<div class="rounded-md border border-warm-grey bg-white">
	<div class="flex flex-wrap items-center gap-2 border-b border-light-warm-grey px-3 py-2">
		<input
			type="search"
			bind:value={searchTerm}
			placeholder="Search JSON…"
			class="w-44 rounded-md border border-mid-warm-grey/50 px-2 py-1 text-xs focus:border-dark-grey focus:outline-none"
		/>
		{#if searchTerm.trim()}
			<span class="text-xs text-mid-grey">
				{matches.length === 500 ? '500+' : matches.length} matching line{matches.length === 1
					? ''
					: 's'}
			</span>
		{/if}
		<div class="ml-auto flex items-center gap-2">
			<button
				type="button"
				class="rounded-md border border-mid-warm-grey/50 px-2 py-1 text-xs transition-colors {raw
					? 'bg-dark-grey text-white'
					: 'bg-white text-dark-grey hover:bg-light-warm-grey'}"
				onclick={() => (raw = !raw)}
			>
				Raw
			</button>
			<button
				type="button"
				class="rounded-md border border-mid-warm-grey/50 bg-white px-2 py-1 text-xs text-dark-grey transition-colors hover:bg-light-warm-grey"
				onclick={copy}
			>
				{copied ? 'Copied' : 'Copy'}
			</button>
			<button
				type="button"
				class="rounded-md border border-mid-warm-grey/50 bg-white px-2 py-1 text-xs text-dark-grey transition-colors hover:bg-light-warm-grey"
				onclick={download}
			>
				Download
			</button>
		</div>
	</div>

	{#if searchTerm.trim()}
		<div class="max-h-96 overflow-auto p-3">
			{#if matches.length === 0}
				<p class="m-0 text-xs text-mid-grey">No lines match the search.</p>
			{:else}
				{#each matches as lineNumber (lineNumber)}
					<div class="flex gap-3 font-mono text-xxs leading-relaxed">
						<span class="w-12 shrink-0 select-none text-right text-mid-warm-grey"
							>{lineNumber + 1}</span
						>
						<span class="whitespace-pre-wrap break-all text-dark-grey">{lines[lineNumber]}</span>
					</div>
				{/each}
			{/if}
		</div>
	{:else}
		<pre
			class="m-0 max-h-96 overflow-auto whitespace-pre-wrap break-all p-3 font-mono text-xxs leading-relaxed text-dark-grey">{displayText}</pre>
	{/if}
</div>
