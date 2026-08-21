<script>
	import { Clipboard, Copy, Plus, Save, Trash2 } from '@lucide/svelte';

	/** @type {{name:string,description:string,localViews:any[],activeViewId:string,isDirty:boolean,builtIn?:boolean,statusMessage:string,jsonText:string,importErrors:string[],onnamechange?:(value:string)=>void,ondescriptionchange?:(value:string)=>void,onsave?:()=>void,onsaveas?:()=>void,onnew?:()=>void,onload?:(id:string)=>void,onduplicate?:(id:string)=>void,ondelete?:(id:string)=>void,oncopyjson?:()=>void,onjsonchange?:(value:string)=>void,onimportjson?:()=>void}} */
	let {
		name,
		description,
		localViews,
		activeViewId,
		isDirty,
		builtIn = false,
		statusMessage,
		jsonText,
		importErrors,
		onnamechange,
		ondescriptionchange,
		onsave,
		onsaveas,
		onnew,
		onload,
		onduplicate,
		ondelete,
		oncopyjson,
		onjsonchange,
		onimportjson
	} = $props();
</script>

<div class="flex min-h-full flex-col">
	<div class="flex-1 space-y-6 overflow-y-auto p-5">
		<div>
			<p class="m-0 font-space text-xxs font-medium uppercase tracking-wider text-red">View</p>
			<h2 class="m-0 mt-1 text-lg font-semibold text-dark-grey">Manage your views</h2>
			<p class="m-0 mt-2 text-xs leading-relaxed text-mid-grey">
				Saved views stay in this browser. Switch views here or copy the JSON to move one.
			</p>
		</div>

		{#if builtIn}
			<div class="rounded-xl border border-mid-warm-grey bg-light-warm-grey/40 p-4">
				<p class="m-0 text-sm font-semibold text-dark-grey">Overview</p>
				<p class="m-0 mt-1 text-xs leading-relaxed text-mid-grey">
					This starting overview stays unchanged. Make a copy to customise its cards or layout.
				</p>
				<button
					type="button"
					class="mt-4 rounded-lg bg-dark-grey px-3 py-2 text-xs font-semibold text-white"
					onclick={() => onduplicate?.(activeViewId)}
				>
					<Copy class="mr-1 inline size-3.5" /> Duplicate to edit
				</button>
			</div>
		{:else}
			<div class="space-y-3">
				<div class="flex items-center justify-between gap-3">
					<p class="m-0 text-xs font-medium text-dark-grey">Current view</p>
					<span class="font-mono text-[10px] text-mid-grey">
						{isDirty ? 'Unsaved changes' : 'Saved'}
					</span>
				</div>
				<label class="block">
					<span class="mb-1.5 block text-xs font-medium text-dark-grey">Name</span>
					<input
						type="text"
						maxlength="80"
						class="w-full rounded-lg border border-mid-warm-grey px-3 py-2 text-sm"
						value={name}
						oninput={(event) => onnamechange?.(event.currentTarget.value)}
					/>
				</label>
				<label class="block">
					<span class="mb-1.5 block text-xs font-medium text-dark-grey">Description</span>
					<textarea
						rows="3"
						maxlength="280"
						class="w-full resize-none rounded-lg border border-mid-warm-grey px-3 py-2 text-sm"
						value={description}
						oninput={(event) => ondescriptionchange?.(event.currentTarget.value)}
					></textarea>
				</label>
				<div class="flex flex-wrap gap-2">
					<button
						type="button"
						class="rounded-lg bg-dark-grey px-3 py-2 text-xs font-semibold text-white"
						onclick={onsave}
					>
						<Save class="mr-1 inline size-3.5" /> Save
					</button>
					<button
						type="button"
						class="rounded-lg border border-mid-warm-grey px-3 py-2 text-xs font-semibold"
						onclick={onsaveas}
					>
						<Copy class="mr-1 inline size-3.5" /> Save as copy
					</button>
				</div>
			</div>
		{/if}

		{#if statusMessage}
			<p
				class="m-0 text-xs {statusMessage.startsWith('Error') ? 'text-red' : 'text-mid-grey'}"
				role="status"
			>
				{statusMessage}
			</p>
		{/if}

		<div class="border-t border-warm-grey pt-5">
			<div class="mb-3 flex items-center justify-between gap-3">
				<p class="m-0 text-xs font-medium text-dark-grey">All views</p>
				<button
					type="button"
					class="flex items-center gap-1 rounded-lg border border-mid-warm-grey px-2.5 py-1.5 text-xs font-semibold"
					onclick={onnew}
				>
					<Plus class="size-3.5" /> Create view
				</button>
			</div>
			<div class="space-y-2">
				{#each localViews as view (view.id)}
					<div
						class="flex items-center gap-2 rounded-lg border border-warm-grey bg-white p-2 {activeViewId ===
						view.id
							? 'ring-1 ring-dark-grey'
							: ''}"
					>
						<button
							type="button"
							class="min-w-0 flex-1 px-1 text-left"
							onclick={() => onload?.(view.id)}
						>
							<span class="block truncate text-xs font-semibold text-dark-grey">{view.name}</span>
							<span class="block font-mono text-[9px] text-mid-grey">
								{view.builtIn
									? 'OpenElectricity overview'
									: new Date(view.updatedAt).toLocaleString()}
							</span>
						</button>
						<button
							type="button"
							class="rounded p-1.5 text-mid-grey hover:bg-warm-grey"
							onclick={() => onduplicate?.(view.id)}
							aria-label="Duplicate {view.name}"
						>
							<Copy class="size-3.5" />
						</button>
						{#if !view.builtIn}
							<button
								type="button"
								class="rounded p-1.5 text-mid-grey hover:bg-red/10 hover:text-red"
								onclick={() => ondelete?.(view.id)}
								aria-label="Delete {view.name}"
							>
								<Trash2 class="size-3.5" />
							</button>
						{/if}
					</div>
				{/each}
			</div>
		</div>

		<details class="border-t border-warm-grey pt-5">
			<summary class="cursor-pointer text-xs font-semibold text-dark-grey"
				>Import or export JSON</summary
			>
			<div class="mt-3">
				<div class="mb-2 flex justify-end">
					<button
						type="button"
						class="rounded-lg border border-mid-warm-grey px-2.5 py-1.5 text-xs font-semibold"
						onclick={oncopyjson}
					>
						<Clipboard class="mr-1 inline size-3.5" /> Copy JSON
					</button>
				</div>
				<textarea
					rows="10"
					spellcheck="false"
					class="w-full resize-y rounded-lg border border-mid-warm-grey bg-light-warm-grey/40 p-3 font-mono text-[10px] leading-relaxed"
					value={jsonText}
					oninput={(event) => onjsonchange?.(event.currentTarget.value)}
				></textarea>
				<button
					type="button"
					class="mt-2 w-full rounded-lg bg-dark-grey px-3 py-2 text-xs font-semibold text-white"
					onclick={onimportjson}
				>
					Paste as new view
				</button>
				{#if importErrors.length}
					<div
						class="mt-2 rounded-lg border border-red/30 bg-red/5 p-3 text-xs text-red"
						role="alert"
					>
						{#each importErrors as error (error)}<p class="m-0">{error}</p>{/each}
					</div>
				{/if}
			</div>
		</details>
	</div>
</div>
