<script>
	import { ArrowDown, ArrowUp, Copy, GripVertical, Trash2 } from '@lucide/svelte';
	import { sectionCardClass } from '$lib/components/charts/v2/section-card.js';
	import FormSelect from '$lib/components/form-elements/Select.svelte';

	const WIDTH_OPTIONS = [
		{ label: 'Half width', value: 'half' },
		{ label: 'Full width', value: 'full' }
	];
	const HEIGHT_OPTIONS = [
		{ label: 'Compact', value: 'compact' },
		{ label: 'Standard', value: 'standard' },
		{ label: 'Tall', value: 'tall' }
	];

	/** @type {{ panel: any, title: string, editing?: boolean, canDuplicate?: boolean, index: number, count: number, onmove?: (direction: -1 | 1) => void, onduplicate?: () => void, onremove?: () => void, onresize?: (size: {width?: string, height?: string}) => void, ondragstart?: (event: DragEvent) => void, ondrop?: (event: DragEvent) => void, actions?: import('svelte').Snippet, children?: import('svelte').Snippet }} */
	let {
		panel,
		title,
		editing = false,
		canDuplicate = true,
		index,
		count,
		onmove,
		onduplicate,
		onremove,
		onresize,
		ondragstart,
		ondrop,
		actions,
		children
	} = $props();

	let spanClass = $derived(panel.width === 'half' ? 'md:col-span-6' : 'md:col-span-12');
</script>

<section
	role="group"
	class="{spanClass} {sectionCardClass} min-w-0 {editing
		? 'outline outline-1 outline-mid-warm-grey'
		: ''}"
	draggable={editing}
	{ondragstart}
	ondragover={editing ? (event) => event.preventDefault() : undefined}
	{ondrop}
>
	<header class="border-b border-mid-warm-grey/40">
		<div class="flex min-h-12 items-center gap-2 px-6 py-3">
			{#if editing}
				<GripVertical class="size-4 shrink-0 cursor-grab text-mid-grey" aria-hidden="true" />
			{/if}
			<h2 class="m-0 min-w-0 flex-1 truncate text-sm font-semibold text-dark-grey">{title}</h2>
			{#if actions}
				{@render actions()}
			{/if}
		</div>
		{#if editing}
			<div
				class="flex flex-wrap items-center gap-2 border-t border-mid-warm-grey/40 bg-light-warm-grey px-3 py-2"
			>
				{#if panel.type === 'metrics' || panel.type === 'map'}
					<span
						class="rounded-md border border-mid-warm-grey bg-white px-3 py-1.5 font-space text-xs text-mid-grey"
						>Full width</span
					>
				{:else}
					<div class="rounded-md border border-mid-warm-grey bg-white">
						<FormSelect
							selected={panel.width}
							options={WIDTH_OPTIONS}
							onchange={(option) => onresize?.({ width: String(option.value) })}
							formLabel="Panel width"
							compact
							widthClass="w-auto"
						/>
					</div>
				{/if}
				<div class="rounded-md border border-mid-warm-grey bg-white">
					<FormSelect
						selected={panel.height}
						options={HEIGHT_OPTIONS}
						onchange={(option) => onresize?.({ height: String(option.value) })}
						formLabel="Panel height"
						compact
						widthClass="w-auto"
					/>
				</div>
				<button
					type="button"
					disabled={index === 0}
					onclick={() => onmove?.(-1)}
					class="rounded-md p-1.5 text-mid-grey hover:bg-white hover:text-dark-grey disabled:opacity-30"
					aria-label="Move {title} earlier"
					title="Move earlier"><ArrowUp class="size-4" /></button
				>
				<button
					type="button"
					disabled={index === count - 1}
					onclick={() => onmove?.(1)}
					class="rounded-md p-1.5 text-mid-grey hover:bg-white hover:text-dark-grey disabled:opacity-30"
					aria-label="Move {title} later"
					title="Move later"><ArrowDown class="size-4" /></button
				>
				{#if canDuplicate}
					<button
						type="button"
						onclick={onduplicate}
						class="rounded-md p-1.5 text-mid-grey hover:bg-white hover:text-dark-grey"
						aria-label="Duplicate {title}"
						title="Duplicate"><Copy class="size-4" /></button
					>
				{/if}
				<button
					type="button"
					onclick={onremove}
					class="rounded-md p-1.5 text-mid-grey hover:bg-white hover:text-red"
					aria-label="Remove {title}"
					title="Remove"><Trash2 class="size-4" /></button
				>
			</div>
		{/if}
	</header>
	<div class="min-w-0">
		{@render children?.()}
	</div>
</section>
