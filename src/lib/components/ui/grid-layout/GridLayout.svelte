<script>
	/**
	 * Reusable drag-and-drop grid layout.
	 *
	 * Renders its items into one or more columns via `svelte-dnd-action`. Each
	 * item gets a grip handle (top-left) that activates dragging — the rest of
	 * the item is interactive as normal (so charts remain usable). When the
	 * same `type` is used across columns, items can be dragged between them.
	 *
	 * Optional `storageKey` persists the layout to localStorage.
	 *
	 * @typedef {{ id: string }} GridItem
	 */

	import { dndzone, SHADOW_ITEM_MARKER_PROPERTY_NAME } from 'svelte-dnd-action';
	import { flip } from 'svelte/animate';
	import { untrack } from 'svelte';
	import { normalizeLayout, loadLayout, saveLayout } from './grid-layout-state.js';

	/**
	 * @typedef {Object} Props
	 * @property {GridItem[]} items - The items to render. Order here only matters for initial placement (when no layout is stored); drag-ordering takes over from there.
	 * @property {1 | 2} [columns] - Number of columns (defaults to 1).
	 * @property {string} [storageKey] - If set, layout is persisted to localStorage under this key.
	 * @property {number} [flipDurationMs] - Flip animation duration in ms.
	 * @property {string} [dndType] - `svelte-dnd-action` zone type — matching type across columns enables cross-column dragging.
	 * @property {string} [class] - Optional class applied to the grid container.
	 * @property {import('svelte').Snippet<[GridItem]>} children
	 */

	/** @type {Props} */
	let {
		items,
		columns = 1,
		storageKey,
		flipDurationMs = 200,
		dndType = 'grid-layout',
		class: className = '',
		children
	} = $props();

	/**
	 * The library mutates `items` passed to `use:dndzone` and wants the same
	 * array reference back between events. We keep each column's items as a
	 * separate `$state` array and only replace them via the dnd lifecycle or
	 * when props change (`items` or `columns`).
	 *
	 * @type {GridItem[][]}
	 */
	let columnItems = $state([[]]);
	let hasInitialised = $state(false);

	// Track the last ids+columnCount we synchronised from to avoid redundant rebuilds
	let lastSignature = $state('');

	function currentIds() {
		return columnItems.flatMap((col) => col.map((i) => i.id));
	}

	/**
	 * @param {string[]} availableIds
	 * @param {number} columnCount
	 */
	function rebuildFromProps(availableIds, columnCount) {
		const byId = Object.fromEntries(items.map((i) => [i.id, i]));

		/** @type {import('./grid-layout-state.js').GridLayoutState | null} */
		let source = null;
		if (!hasInitialised) {
			source = storageKey ? loadLayout(storageKey) : null;
		} else {
			source = { columns: columnItems.map((col) => col.map((i) => i.id)) };
		}

		const normalised = normalizeLayout(source, availableIds, columnCount);
		columnItems = normalised.columns.map((col) => col.map((id) => byId[id]).filter(Boolean));
		hasInitialised = true;
	}

	// Sync when items or columns change. We key by ids+columnCount so that
	// unrelated re-renders (e.g. item object identity change without id set
	// change) don't cause the columns to reset mid-drag.
	$effect(() => {
		const availableIds = items.map((i) => i.id);
		const columnCount = columns;
		const signature = columnCount + ':' + availableIds.join(',');

		if (signature === untrack(() => lastSignature)) return;
		lastSignature = signature;

		untrack(() => rebuildFromProps(availableIds, columnCount));
	});

	let dragDisabled = $state(true);

	/**
	 * Enable dragging when the user mouse/touch-downs on the grip handle.
	 * @param {Event} e
	 */
	function startDrag(e) {
		e.preventDefault();
		dragDisabled = false;
	}

	/**
	 * Filter out the library's shadow placeholders before persisting, so the
	 * saved layout never contains transient drag artefacts.
	 * @param {GridItem[]} list
	 */
	function stripShadows(list) {
		return list.filter((i) => !(/** @type {any} */ (i)[SHADOW_ITEM_MARKER_PROPERTY_NAME]));
	}

	function persist() {
		if (!storageKey) return;
		saveLayout(storageKey, {
			columns: columnItems.map((col) => stripShadows(col).map((i) => i.id))
		});
	}

	/**
	 * @param {number} columnIndex
	 * @param {CustomEvent<{ items: GridItem[] }>} e
	 */
	function handleConsider(columnIndex, e) {
		columnItems[columnIndex] = e.detail.items;
	}

	/**
	 * @param {number} columnIndex
	 * @param {CustomEvent<{ items: GridItem[] }>} e
	 */
	function handleFinalize(columnIndex, e) {
		columnItems[columnIndex] = e.detail.items;
		dragDisabled = true;
		// Update our signature cache so the sync effect doesn't clobber the new order
		lastSignature = columns + ':' + currentIds().join(',');
		persist();
	}
</script>

<div class="grid-layout {className}" style:--gl-cols={columns}>
	{#each columnItems as columnList, columnIndex (columnIndex)}
		<div
			class="grid-layout__column"
			use:dndzone={{
				items: columnList,
				flipDurationMs,
				type: dndType,
				dragDisabled,
				dropTargetStyle: {}
			}}
			onconsider={(/** @type {any} */ e) => handleConsider(columnIndex, e)}
			onfinalize={(/** @type {any} */ e) => handleFinalize(columnIndex, e)}
		>
			{#each columnList as item (item.id)}
				<div class="grid-layout__item" animate:flip={{ duration: flipDurationMs }}>
					<button
						type="button"
						class="grid-layout__grip"
						title="Drag to reorder"
						aria-label="Drag handle"
						onmousedown={startDrag}
						ontouchstart={startDrag}
					>
						<svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor" aria-hidden="true">
							<circle cx="3" cy="3" r="1.2" />
							<circle cx="7" cy="3" r="1.2" />
							<circle cx="3" cy="7" r="1.2" />
							<circle cx="7" cy="7" r="1.2" />
							<circle cx="3" cy="11" r="1.2" />
							<circle cx="7" cy="11" r="1.2" />
						</svg>
					</button>
					<div class="grid-layout__body">
						{@render children(item)}
					</div>
				</div>
			{/each}
		</div>
	{/each}
</div>

<style>
	.grid-layout {
		display: grid;
		grid-template-columns: 1fr;
		gap: 1rem;
		align-items: start;
	}

	@media (min-width: 768px) {
		.grid-layout {
			grid-template-columns: repeat(var(--gl-cols, 1), minmax(0, 1fr));
		}
	}

	.grid-layout__column {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		min-height: 40px;
	}

	.grid-layout__item {
		position: relative;
	}

	.grid-layout__grip {
		position: absolute;
		top: 0.5rem;
		left: 0.5rem;
		z-index: 10;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.25rem;
		border-radius: 0.25rem;
		background: transparent;
		border: 0;
		color: var(--color-mid-warm-grey, #b8ad9b);
		cursor: grab;
		transition:
			color 100ms ease,
			background-color 100ms ease;
	}

	.grid-layout__grip:hover {
		color: var(--color-mid-grey, #6b6b6b);
		background-color: rgba(0, 0, 0, 0.04);
	}

	.grid-layout__grip:active {
		cursor: grabbing;
	}

	.grid-layout__body {
		/* Leave room for the grip without clipping chart content */
	}
</style>
