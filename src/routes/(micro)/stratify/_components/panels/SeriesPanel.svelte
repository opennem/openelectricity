<script>
	import { dndzone } from 'svelte-dnd-action';
	import { flip } from 'svelte/animate';
	import SeriesConfig from '../SeriesConfig.svelte';
	import SectionHeader from '../SectionHeader.svelte';
	import { getStratifyContext } from '../../_state/context.js';

	const project = getStratifyContext();
	const FLIP_DURATION = 150;

	/** @type {Array<{id: string, key: string, label: string}>} */
	let tooltipDndItems = $state([]);

	$effect(() => {
		const all = project.allColumns;
		const ordered =
			project.tooltipColumns.length > 0
				? [
						...project.tooltipColumns.map((key) => all.find((c) => c.key === key)).filter(Boolean),
						...all.filter((c) => !project.tooltipColumns.includes(c.key))
					]
				: all;
		tooltipDndItems = ordered.map((col) => ({
			id: col.key,
			key: col.key,
			label: col === all[0] && !project.isCategory ? 'Date' : col.label
		}));
	});

	/** @param {CustomEvent} e */
	function handleTooltipConsider(e) {
		tooltipDndItems = e.detail.items;
	}

	/** @param {CustomEvent} e */
	function handleTooltipFinalize(e) {
		tooltipDndItems = e.detail.items;
		const selected =
			project.tooltipColumns.length > 0
				? new Set(project.tooltipColumns)
				: new Set(project.allColumns.map((c) => c.key));
		project.tooltipColumns = tooltipDndItems
			.filter((item) => selected.has(item.key))
			.map((item) => item.key);
	}
</script>

<SectionHeader label="Series">
	<label class="flex items-center gap-2 mb-3">
		<input
			type="checkbox"
			checked={project.showLegend}
			onchange={(e) => {
				project.showLegend = e.currentTarget.checked;
			}}
			class="accent-dark-grey"
		/>
		<span class="text-[10px] text-mid-grey">Show legend</span>
	</label>
	<SeriesConfig />
</SectionHeader>

{#if project.hasData}
	<SectionHeader label="Tooltip">
		<div
			class="flex flex-col gap-1"
			use:dndzone={{
				items: tooltipDndItems,
				flipDurationMs: FLIP_DURATION,
				type: 'tooltip-cols'
			}}
			onconsider={handleTooltipConsider}
			onfinalize={handleTooltipFinalize}
		>
			{#each tooltipDndItems as item (item.id)}
				{@const isSelected =
					project.tooltipColumns.length === 0 || project.tooltipColumns.includes(item.key)}
				<div class="flex items-center gap-1.5" animate:flip={{ duration: FLIP_DURATION }}>
					<div
						class="shrink-0 cursor-grab active:cursor-grabbing text-mid-warm-grey hover:text-mid-grey"
						title="Drag to reorder"
					>
						<svg width="8" height="12" viewBox="0 0 10 14" fill="currentColor">
							<circle cx="3" cy="3" r="1.2" />
							<circle cx="7" cy="3" r="1.2" />
							<circle cx="3" cy="7" r="1.2" />
							<circle cx="7" cy="7" r="1.2" />
							<circle cx="3" cy="11" r="1.2" />
							<circle cx="7" cy="11" r="1.2" />
						</svg>
					</div>
					<label class="flex items-center gap-2 flex-1 min-w-0">
						<input
							type="checkbox"
							checked={isSelected}
							onchange={() => {
								const all = project.allColumns.map((c) => c.key);
								if (project.tooltipColumns.length === 0) {
									project.tooltipColumns = all.filter((k) => k !== item.key);
								} else if (isSelected) {
									const next = project.tooltipColumns.filter((k) => k !== item.key);
									project.tooltipColumns = next.length === 0 ? [] : next;
								} else {
									project.tooltipColumns = [...project.tooltipColumns, item.key];
								}
							}}
							class="accent-dark-grey"
						/>
						<span class="text-[11px] text-dark-grey truncate">{item.label}</span>
					</label>
				</div>
			{/each}
		</div>
	</SectionHeader>
{/if}
