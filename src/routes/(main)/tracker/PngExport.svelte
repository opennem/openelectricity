<script>
	import { onMount, untrack } from 'svelte';
	import { downloadBlob } from '$lib/utils/download-csv.js';
	import { renderPng } from './png-export.js';

	/** @type {{snapshot: import('./png-export.js').PngSnapshot, onclose: () => void}} */
	let { snapshot, onclose } = $props();
	let selected = $state(
		untrack(() => snapshot.charts.filter((chart) => chart.ready).map((chart) => chart.id))
	);
	let title = $state('Electricity tracker');
	let description = $state('');
	let preview = $state('');
	let blob = $state.raw(/** @type {Blob | null} */ (null));
	let error = $state('');
	let pending = $state(true);
	let revision = $state(0);
	/** @type {HTMLDialogElement} */
	let dialog;
	onMount(() => dialog.showModal());
	// Canvas rendering is an imperative browser bridge. Dispose stale async work
	// and object URLs when options change or the dialog closes.
	$effect(() => {
		const options = { selected: [...selected], title, description };
		void revision;
		let active = true;
		let url = '';
		pending = true;
		blob = null;
		preview = '';
		error = '';
		const timer = setTimeout(() => {
			renderPng(snapshot, options)
				.then((result) => {
					if (!active) return;
					url = URL.createObjectURL(result);
					blob = result;
					preview = url;
				})
				.catch((reason) => {
					if (active)
						error = reason instanceof Error ? reason.message : 'Unable to create the PNG.';
				})
				.finally(() => {
					if (active) pending = false;
				});
		}, 150);
		return () => {
			active = false;
			clearTimeout(timer);
			if (url) URL.revokeObjectURL(url);
		};
	});
</script>

<dialog
	bind:this={dialog}
	{onclose}
	aria-labelledby="png-export-title"
	class="m-auto max-h-[90dvh] w-[min(1100px,calc(100%-2rem))] overflow-auto rounded-xl border border-warm-grey bg-white p-5 text-dark-grey shadow-xl backdrop:bg-black/40"
>
	<header class="mb-4 flex items-center justify-between gap-4">
		<h2 id="png-export-title" class="m-0 font-space text-xl">Export PNG</h2>
		<button class="rounded border px-3 py-1 text-sm" onclick={() => dialog.close()}>Close</button>
	</header>
	<div class="grid gap-6 md:grid-cols-[260px_minmax(0,1fr)]">
		<div class="space-y-4 text-sm">
			<p>
				A frozen image of the current view, including legends and attribution. Close and reopen to
				capture updated data.
			</p>
			<fieldset class="space-y-2">
				<legend class="mb-2 font-semibold">Charts</legend>
				{#each snapshot.charts as chart (chart.id)}
					<label class="flex items-start gap-2">
						<input
							type="checkbox"
							value={chart.id}
							bind:group={selected}
							disabled={!chart.ready}
							class="mt-1"
						/>
						<span
							>{chart.label}{#if !chart.ready}<span class="block text-xs text-mid-grey"
									>Unavailable — wait for data, then reopen.</span
								>{/if}</span
						>
					</label>
				{/each}
			</fieldset>
			<label class="block"
				>Title<input
					class="mt-1 w-full rounded border border-warm-grey p-2"
					bind:value={title}
					maxlength="140"
				/></label
			>
			<label class="block"
				>Description<textarea
					class="mt-1 w-full rounded border border-warm-grey p-2"
					bind:value={description}
					maxlength="600"
					rows="4"
				></textarea></label
			>
			<button
				class="w-full rounded bg-dark-grey px-4 py-2 text-white disabled:opacity-40"
				disabled={pending || !blob}
				onclick={() => {
					if (blob)
						downloadBlob(blob, `openelectricity-tracker-${snapshot.generatedAt.slice(0, 10)}.png`);
				}}>Download PNG</button
			>
			{#if error}<p role="alert">{error}</p>
				{#if selected.length}<button class="underline" onclick={() => revision++}
						>Retry preview</button
					>{/if}{/if}
			{#if !snapshot.charts.length}<p>
					No charts are ready. Close the export and wait for the view to finish loading.
				</p>{/if}
		</div>
		<div class="min-w-0 rounded border border-warm-grey bg-light-warm-grey p-2" aria-busy={pending}>
			{#if pending}<p role="status" class="p-4 text-sm">Preparing preview…</p>{:else if preview}<img
					src={preview}
					alt={`PNG preview: ${title || 'Electricity tracker'}`}
					class="h-auto w-full"
				/>{/if}
		</div>
	</div>
</dialog>
