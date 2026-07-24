<script>
	/**
	 * Named saved-views dropdown for the Lens prototype.
	 *
	 * Lists the stored views (load on click, ✕ to delete), highlights the
	 * active one, and offers "Save current view…" via a small inline name
	 * input (no window.prompt) plus an "Update" action when the active view
	 * has unsaved changes — signalled by a dot on the trigger.
	 */
	import { fly } from 'svelte/transition';
	import { Bookmark, X, Check } from '@lucide/svelte';
	import { portal } from '$lib/actions/portal.js';
	import { dropdownPosition } from '$lib/actions/dropdown-position.js';

	/**
	 * @type {{
	 *   views?: import('../../_shared/views-store.js').SavedViewMeta[],
	 *   activeViewId?: string | null,
	 *   dirty?: boolean,
	 *   onload?: (id: string) => void,
	 *   onsave?: (name: string) => void,
	 *   onupdate?: () => void,
	 *   ondelete?: (id: string) => void
	 * }}
	 */
	let {
		views = [],
		activeViewId = null,
		dirty = false,
		onload = undefined,
		onsave = undefined,
		onupdate = undefined,
		ondelete = undefined
	} = $props();

	let isOpen = $state(false);
	let naming = $state(false);
	let draftName = $state('');

	/** @type {HTMLElement | undefined} */
	let triggerRef = $state();
	/** @type {HTMLElement | undefined} */
	let dropdownRef = $state();

	let activeView = $derived(views.find((v) => v.id === activeViewId));

	function close() {
		isOpen = false;
		naming = false;
		draftName = '';
	}

	/** @param {MouseEvent} e */
	function handleDocumentClick(e) {
		const target = /** @type {Node} */ (e.target);
		if (triggerRef?.contains(target) || dropdownRef?.contains(target)) return;
		close();
	}

	function commitSave() {
		const name = draftName.trim();
		if (!name) return;
		onsave?.(name);
		close();
	}

	/** @param {KeyboardEvent} e */
	function handleNameKeydown(e) {
		if (e.key === 'Enter') {
			e.preventDefault();
			commitSave();
		} else if (e.key === 'Escape') {
			e.stopPropagation();
			naming = false;
			draftName = '';
		}
	}

	/** Focus the name input as soon as it appears. @param {HTMLInputElement} node */
	function focusOnMount(node) {
		node.focus();
	}
</script>

<svelte:document onclick={handleDocumentClick} />

<div class="relative">
	<button
		bind:this={triggerRef}
		onclick={() => (isOpen = !isOpen)}
		class="relative flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs lg:text-sm hover:bg-warm-grey transition-colors cursor-pointer"
		aria-haspopup="menu"
		aria-expanded={isOpen}
		title="Saved views"
	>
		<Bookmark class="size-4 text-mid-grey" />
		<span class="font-semibold whitespace-nowrap">{activeView ? activeView.name : 'Views'}</span>
		{#if dirty && activeViewId}
			<span class="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-red" title="Unsaved changes"
			></span>
		{/if}
	</button>

	{#if isOpen}
		<div
			bind:this={dropdownRef}
			use:portal
			use:dropdownPosition={{ trigger: triggerRef, align: 'right', position: 'bottom' }}
			class="fixed bg-white rounded-lg shadow-lg border border-mid-warm-grey z-50 w-64 py-1 text-sm"
			in:fly={{ y: -5, duration: 150 }}
			out:fly={{ y: -5, duration: 150 }}
			role="menu"
		>
			{#if views.length === 0}
				<p class="px-3 py-2 text-xs text-mid-grey m-0">No saved views yet.</p>
			{:else}
				<ul class="max-h-64 overflow-y-auto m-0 p-0 list-none">
					{#each views as view (view.id)}
						<li class="flex items-center group">
							<button
								class="flex-1 min-w-0 text-left px-3 py-1.5 hover:bg-warm-grey rounded-md mx-1 truncate {view.id ===
								activeViewId
									? 'font-semibold text-black'
									: 'text-mid-grey'}"
								onclick={() => {
									onload?.(view.id);
									close();
								}}
							>
								{view.name}
							</button>
							<button
								class="shrink-0 p-1 mr-2 rounded text-mid-warm-grey hover:text-red hover:bg-light-warm-grey opacity-0 group-hover:opacity-100 transition-opacity"
								title="Delete view"
								aria-label="Delete {view.name}"
								onclick={() => ondelete?.(view.id)}
							>
								<X class="size-3.5" />
							</button>
						</li>
					{/each}
				</ul>
			{/if}

			<div class="h-px bg-warm-grey my-1"></div>

			{#if dirty && activeViewId && activeView}
				<button
					class="w-full text-left px-3 py-1.5 hover:bg-warm-grey rounded-md flex items-center gap-2 text-dark-grey"
					onclick={() => {
						onupdate?.();
						close();
					}}
				>
					<Check class="size-3.5 text-mid-grey" />
					<span class="truncate">Update “{activeView.name}”</span>
				</button>
			{/if}

			{#if naming}
				<div class="flex items-center gap-1.5 px-3 py-1.5">
					<input
						use:focusOnMount
						type="text"
						bind:value={draftName}
						onkeydown={handleNameKeydown}
						placeholder="View name"
						class="flex-1 min-w-0 border border-mid-warm-grey rounded px-2 py-1 text-xs focus:outline-none focus:border-dark-grey"
					/>
					<button
						class="shrink-0 px-2 py-1 rounded bg-dark-grey text-white text-xs disabled:opacity-40"
						disabled={!draftName.trim()}
						onclick={commitSave}
					>
						Save
					</button>
				</div>
			{:else}
				<button
					class="w-full text-left px-3 py-1.5 hover:bg-warm-grey rounded-md text-dark-grey"
					onclick={() => (naming = true)}
				>
					Save current view…
				</button>
			{/if}
		</div>
	{/if}
</div>
