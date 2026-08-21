<script>
	import { ChartNoAxesCombined, Check, Gauge, Plus, Search, X } from '@lucide/svelte';
	import { GROUP_OPTIONS } from '$lib/components/charts/network/groups.js';
	import {
		RANGE_PRESETS,
		getIntervalsForRange,
		getIntervalSpec,
		getPresetByDays
	} from '$lib/components/charts/facility/range-interval-config.js';
	import { TRACKER_REGION_OPTIONS } from '../tracker-regions.js';
	import { EXPLORE_RECIPES, exploreRecipeSupportsScope, recipeById } from './explore-model.js';

	/** @type {{ presentation:'chart'|'metric', recipeId:string, config:any, facilities:any[], editing?:boolean, errors?:string[], sharedControls?:any, onpresentationchange?:(value:'chart'|'metric')=>void, onrecipechange?:(id:string)=>void, onconfigchange?:(config:any)=>void, onsubmit?:()=>void, oncancel?:()=>void }} */
	let {
		presentation,
		recipeId,
		config,
		facilities,
		editing = false,
		errors = [],
		sharedControls = null,
		onpresentationchange,
		onrecipechange,
		onconfigchange,
		onsubmit,
		oncancel
	} = $props();

	let search = $state('');
	/** @type {Array<{value:'chart'|'metric',label:string,description:string,icon:any}>} */
	const presentationOptions = [
		{ value: 'chart', label: 'Chart', description: 'Time series', icon: ChartNoAxesCombined },
		{ value: 'metric', label: 'Metric', description: 'Range summary', icon: Gauge }
	];
	const recipeGroups = [
		{
			label: 'Market and system',
			recipes: EXPLORE_RECIPES.filter((item) => item.kind === 'network')
		},
		{ label: 'Facilities', recipes: EXPLORE_RECIPES.filter((item) => item.kind === 'facility') }
	];
	let recipe = $derived(recipeById(recipeId));
	let isFacility = $derived(recipe?.kind === 'facility');
	let usesSharedControls = $derived(Boolean(sharedControls));
	let sharedScopeCompatible = $derived(
		!usesSharedControls ||
			isFacility ||
			exploreRecipeSupportsScope(recipeId, config, sharedControls.scope)
	);
	let availableRegions = $derived.by(() => {
		if (
			recipeId === 'price' ||
			(recipeId === 'renewables' &&
				config?.renewableMeasure === 'share' &&
				presentation === 'chart')
		)
			return TRACKER_REGION_OPTIONS.filter((option) => option.value !== 'au');
		if (recipeId === 'curtailment' || recipeId === 'flows') {
			return TRACKER_REGION_OPTIONS.filter(
				(option) => !['au', '_all', 'wem'].includes(option.value)
			);
		}
		return TRACKER_REGION_OPTIONS;
	});
	let intervalOptions = $derived.by(() => {
		const preset = getPresetByDays(config?.range?.days ?? 7);
		return getIntervalsForRange(preset?.id ?? '7D').options.map((id) => ({
			value: id,
			label: getIntervalSpec(id)?.label ?? id
		}));
	});
	let networkFacilities = $derived(
		facilities.filter((facility) => facility.network_id === (config?.networkId ?? 'NEM'))
	);
	let filteredFacilities = $derived(
		networkFacilities
			.filter((facility) => {
				const query = search.trim().toLowerCase();
				return !query || `${facility.name} ${facility.code}`.toLowerCase().includes(query);
			})
			.slice(0, 80)
	);
	let selectedFacility = $derived(
		facilities.find((facility) => facility.code === config?.facilityCodes?.[0]) ?? null
	);

	/** @param {Record<string, unknown>} patch */
	function update(patch) {
		onconfigchange?.({ ...config, ...patch });
	}

	/** @param {string} key @param {string} value */
	function updateString(key, value) {
		update({ [key]: value });
	}

	/** @param {number} days */
	function updateRange(days) {
		const preset = getPresetByDays(days);
		const rangeConfig = getIntervalsForRange(preset?.id ?? '7D');
		const current = config?.range?.intervalId;
		update({
			range: {
				days,
				intervalId: rangeConfig.options.includes(current) ? current : rangeConfig.default
			}
		});
	}

	/** @param {string} code */
	function toggleFacility(code) {
		const current = config.facilityCodes ?? [];
		if (recipeId === 'facility') {
			update({ facilityCodes: current.includes(code) ? [] : [code], unitCodes: [] });
			return;
		}
		update({
			facilityCodes: current.includes(code)
				? current.filter((/** @type {string} */ item) => item !== code)
				: current.length < 6
					? [...current, code]
					: current
		});
	}

	/** @param {string} code */
	function toggleUnit(code) {
		if (!selectedFacility) return;
		const all = selectedFacility.units.map((/** @type {any} */ unit) => unit.code);
		const current = config.unitCodes?.length ? config.unitCodes : all;
		const next = current.includes(code)
			? current.filter((/** @type {string} */ item) => item !== code)
			: [...current, code];
		update({ unitCodes: next.length === all.length ? [] : next });
	}
</script>

<div class="flex min-h-full flex-col">
	<div class="flex-1 space-y-5 overflow-y-auto p-5">
		<nav aria-label="Card builder steps">
			<ol class="m-0 grid list-none grid-cols-2 gap-2 p-0">
				<li>
					{#if recipe}
						<button
							type="button"
							class="flex w-full items-center gap-2 rounded-lg bg-light-warm-grey px-3 py-2 text-left text-xs font-semibold text-dark-grey hover:bg-warm-grey"
							onclick={() => onrecipechange?.('')}
						>
							<span
								class="flex size-5 items-center justify-center rounded-full bg-dark-grey font-mono text-[9px] text-white"
								>1</span
							>
							Data
						</button>
					{:else}
						<div
							class="flex items-center gap-2 rounded-lg bg-dark-grey px-3 py-2 text-xs font-semibold text-white"
							aria-current="step"
						>
							<span
								class="flex size-5 items-center justify-center rounded-full bg-white font-mono text-[9px] text-dark-grey"
								>1</span
							>
							Data
						</div>
					{/if}
				</li>
				<li>
					<div
						class="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold {recipe
							? 'bg-dark-grey text-white'
							: 'bg-light-warm-grey text-mid-grey'}"
						aria-current={recipe ? 'step' : undefined}
					>
						<span
							class="flex size-5 items-center justify-center rounded-full font-mono text-[9px] {recipe
								? 'bg-white text-dark-grey'
								: 'bg-white text-mid-grey'}">2</span
						>
						Options
					</div>
				</li>
			</ol>
		</nav>

		<div>
			<p class="m-0 font-space text-xxs font-medium uppercase tracking-wider text-red">
				{recipe ? 'Options' : 'Data'}
			</p>
			<h2 class="m-0 mt-1 text-lg font-semibold text-dark-grey">
				{recipe?.label ?? 'Choose data'}
			</h2>
			<p class="m-0 mt-2 text-xs leading-relaxed text-mid-grey">
				{recipeId
					? usesSharedControls
						? `Choose the output and ${recipe?.label.toLowerCase()} options. Region and time follow this view.`
						: `Choose the output, location, time range and ${recipe?.label.toLowerCase()} options.`
					: 'Pick the question this card should answer. You will configure it before any data is fetched.'}
			</p>
		</div>

		{#if !recipe}
			<div class="space-y-5" aria-label="Data options">
				{#each recipeGroups as group (group.label)}
					<div class="space-y-2">
						<p class="m-0 text-xs font-medium text-dark-grey">{group.label}</p>
						{#each group.recipes as option (option.id)}
							<button
								type="button"
								class="w-full rounded-xl border border-warm-grey bg-white px-3 py-2.5 text-left transition hover:border-mid-grey hover:bg-light-warm-grey/40"
								onclick={() => {
									search = '';
									onrecipechange?.(option.id);
								}}
							>
								<span class="block text-sm font-semibold text-dark-grey">{option.label}</span>
								<span class="mt-0.5 block text-xs leading-snug text-mid-grey">
									{option.description}
								</span>
							</button>
						{/each}
					</div>
				{/each}
			</div>
		{:else}
			<div class="space-y-2">
				<div class="flex items-center justify-between gap-3">
					<p class="m-0 text-xs font-medium text-dark-grey">Selected data</p>
					<button
						type="button"
						class="text-xxs font-medium text-mid-grey underline hover:text-dark-grey"
						onclick={() => onrecipechange?.('')}>Change</button
					>
				</div>
				<div class="rounded-xl border border-warm-grey bg-light-warm-grey/50 p-3">
					<span class="block text-sm font-semibold text-dark-grey">{recipe.label}</span>
					<span class="mt-0.5 block text-xs leading-snug text-mid-grey">{recipe.description}</span>
				</div>
			</div>
		{/if}

		{#if recipeId && config}
			<div class="space-y-4 border-t border-warm-grey pt-5">
				<div>
					<p class="m-0 mb-2 text-xs font-medium text-dark-grey">Choose output</p>
					<div
						class="grid gap-2 {recipe?.supportsMetric ? 'grid-cols-2' : 'grid-cols-1'}"
						aria-label="Output type"
					>
						{#each presentationOptions as output (output.value)}
							{#if output.value === 'chart' || recipe?.supportsMetric}
								{@const Icon = output.icon}
								<button
									type="button"
									class="flex min-h-20 flex-col items-center justify-center rounded-lg border px-2 py-3 text-center transition {presentation ===
									output.value
										? 'border-dark-grey bg-white text-dark-grey shadow-sm'
										: 'border-warm-grey bg-white/70 text-mid-grey hover:border-mid-grey hover:text-dark-grey'}"
									onclick={() => onpresentationchange?.(output.value)}
								>
									<Icon class="size-8" strokeWidth={1.6} />
									<span class="mt-1.5 text-xs font-semibold">{output.label}</span>
									<span class="text-[10px] leading-tight text-mid-grey">{output.description}</span>
								</button>
							{/if}
						{/each}
					</div>
				</div>
				{#if !isFacility && !usesSharedControls}
					<label class="block">
						<span class="mb-1.5 block text-xs font-medium text-dark-grey">Region</span>
						<select
							class="w-full rounded-lg border border-mid-warm-grey bg-white px-3 py-2 text-sm"
							value={config.scope}
							onchange={(event) => updateString('scope', event.currentTarget.value)}
						>
							{#each availableRegions as option (option.value)}
								<option value={option.value}>{option.label}</option>
							{/each}
						</select>
					</label>
				{:else if !isFacility}
					<div class="rounded-xl border border-warm-grey bg-light-warm-grey/50 p-3">
						<span class="block text-xs font-semibold text-dark-grey">Uses view controls</span>
						<span class="mt-1 block font-mono text-[10px] text-mid-grey">
							{TRACKER_REGION_OPTIONS.find((option) => option.value === sharedControls.scope)
								?.shortLabel ?? sharedControls.scope}
							· {sharedControls.rangeLabel} · {getIntervalSpec(sharedControls.displayInterval)
								?.label ?? sharedControls.displayInterval}
						</span>
					</div>
				{:else}
					<label class="block">
						<span class="mb-1.5 block text-xs font-medium text-dark-grey">Network</span>
						<select
							class="w-full rounded-lg border border-mid-warm-grey bg-white px-3 py-2 text-sm"
							value={config.networkId}
							onchange={(event) => {
								search = '';
								update({ networkId: event.currentTarget.value, facilityCodes: [], unitCodes: [] });
							}}
						>
							<option value="NEM">National Electricity Market</option>
							<option value="WEM">Western Australia</option>
						</select>
					</label>

					<div>
						<div class="mb-1.5 flex items-center justify-between gap-3">
							<span class="text-xs font-medium text-dark-grey">
								{recipeId === 'facility' ? 'Facility' : 'Facilities'}
							</span>
							<span class="font-mono text-xxs text-mid-grey">
								{config.facilityCodes?.length ?? 0}{recipeId === 'facility-comparison' ? '/6' : ''}
							</span>
						</div>
						<label class="relative block">
							<Search class="absolute left-3 top-2.5 size-4 text-mid-grey" />
							<input
								type="search"
								class="w-full rounded-lg border border-mid-warm-grey py-2 pl-9 pr-3 text-sm"
								placeholder="Search name or code"
								bind:value={search}
							/>
						</label>
						<div class="mt-2 max-h-56 overflow-y-auto rounded-lg border border-warm-grey">
							{#each filteredFacilities as facility (facility.code)}
								{@const checked = config.facilityCodes?.includes(facility.code)}
								<button
									type="button"
									class="flex w-full items-center gap-3 border-b border-warm-grey px-3 py-2 text-left last:border-b-0 hover:bg-light-warm-grey"
									onclick={() => toggleFacility(facility.code)}
								>
									<span
										class="flex size-4 shrink-0 items-center justify-center rounded border {checked
											? 'border-dark-grey bg-dark-grey text-white'
											: 'border-mid-warm-grey'}"
									>
										{#if checked}<Check class="size-3" />{/if}
									</span>
									<span class="min-w-0">
										<span class="block truncate text-xs font-medium text-dark-grey"
											>{facility.name}</span
										>
										<span class="block font-mono text-[10px] text-mid-grey">{facility.code}</span>
									</span>
								</button>
							{/each}
							{#if !filteredFacilities.length}
								<p class="m-0 px-3 py-5 text-center text-xs text-mid-grey">No facilities found.</p>
							{/if}
						</div>
					</div>

					{#if recipeId === 'facility' && selectedFacility?.units?.length}
						<div>
							<span class="mb-1.5 block text-xs font-medium text-dark-grey">Units</span>
							<div class="space-y-1 rounded-lg border border-warm-grey p-2">
								{#each selectedFacility.units as unit (unit.code)}
									<label
										class="flex items-center gap-2 rounded px-2 py-1 text-xs hover:bg-light-warm-grey"
									>
										<input
											type="checkbox"
											checked={!config.unitCodes?.length || config.unitCodes.includes(unit.code)}
											onchange={() => toggleUnit(unit.code)}
										/>
										<span>{unit.code}</span>
										<span class="ml-auto text-mid-grey">{unit.fueltech_id ?? ''}</span>
									</label>
								{/each}
							</div>
						</div>
					{/if}
				{/if}

				{#if !usesSharedControls}<div class="grid grid-cols-2 gap-3">
						<label class="block">
							<span class="mb-1.5 block text-xs font-medium text-dark-grey">Range</span>
							<select
								class="w-full rounded-lg border border-mid-warm-grey bg-white px-3 py-2 text-sm"
								value={config.range.days}
								onchange={(event) => updateRange(Number(event.currentTarget.value))}
							>
								{#each RANGE_PRESETS as preset (preset.id)}
									<option value={preset.days}>{preset.label}</option>
								{/each}
							</select>
						</label>
						<label class="block">
							<span class="mb-1.5 block text-xs font-medium text-dark-grey">Interval</span>
							<select
								class="w-full rounded-lg border border-mid-warm-grey bg-white px-3 py-2 text-sm"
								value={config.range.intervalId}
								onchange={(event) =>
									update({ range: { ...config.range, intervalId: event.currentTarget.value } })}
							>
								{#each intervalOptions as option (option.value)}
									<option value={option.value}>{option.label}</option>
								{/each}
							</select>
						</label>
					</div>{/if}

				{#if !usesSharedControls && ['generation', 'emissions', 'market-value'].includes(recipeId)}
					<label class="block">
						<span class="mb-1.5 block text-xs font-medium text-dark-grey">Technology grouping</span>
						<select
							class="w-full rounded-lg border border-mid-warm-grey bg-white px-3 py-2 text-sm"
							value={config.group}
							onchange={(event) => updateString('group', event.currentTarget.value)}
						>
							{#each GROUP_OPTIONS as option (option.value)}
								<option value={option.value}>{option.label}</option>
							{/each}
						</select>
					</label>
				{/if}

				{#if recipeId === 'demand'}
					<label class="block">
						<span class="mb-1.5 block text-xs font-medium text-dark-grey">Demand definition</span>
						<select
							class="w-full rounded-lg border border-mid-warm-grey bg-white px-3 py-2 text-sm"
							value={config.demand}
							onchange={(event) => updateString('demand', event.currentTarget.value)}
						>
							<option value="operational">Operational demand</option>
							<option value="gross">Gross demand including rooftop solar</option>
						</select>
					</label>
				{/if}

				{#if recipeId === 'emissions'}
					<label class="block">
						<span class="mb-1.5 block text-xs font-medium text-dark-grey">Measure</span>
						<select
							class="w-full rounded-lg border border-mid-warm-grey bg-white px-3 py-2 text-sm"
							value={config.emissionsMode}
							onchange={(event) => updateString('emissionsMode', event.currentTarget.value)}
						>
							<option value="volume">Emissions volume</option>
							<option value="intensity">Emissions intensity</option>
						</select>
					</label>
				{/if}

				{#if recipeId === 'renewables'}
					<label class="block">
						<span class="mb-1.5 block text-xs font-medium text-dark-grey">Measure</span>
						<select
							class="w-full rounded-lg border border-mid-warm-grey bg-white px-3 py-2 text-sm"
							value={config.renewableMeasure}
							onchange={(event) => {
								const renewableMeasure = event.currentTarget.value;
								update({
									renewableMeasure,
									...(renewableMeasure === 'share' &&
									config.scope === 'au' &&
									presentation === 'chart'
										? { scope: '_all' }
										: {}),
									...(renewableMeasure === 'share' && presentation === 'metric'
										? { includeStorage: false }
										: {})
								});
							}}
						>
							<option value="share">Share of gross demand</option>
							<option value="generation">Renewable generation</option>
						</select>
					</label>
					{#if presentation === 'chart' || config.renewableMeasure === 'generation'}
						<label class="flex items-center gap-2 text-xs text-dark-grey">
							<input
								type="checkbox"
								checked={config.includeStorage}
								onchange={(event) => update({ includeStorage: event.currentTarget.checked })}
							/>
							Include storage in the renewable definition
						</label>
					{/if}
				{/if}

				{#if recipeId === 'curtailment'}
					<label class="block">
						<span class="mb-1.5 block text-xs font-medium text-dark-grey">Source</span>
						<select
							class="w-full rounded-lg border border-mid-warm-grey bg-white px-3 py-2 text-sm"
							value={config.curtailmentSource}
							onchange={(event) => updateString('curtailmentSource', event.currentTarget.value)}
						>
							<option value="total">Wind and solar</option>
							<option value="wind">Wind</option>
							<option value="solar">Utility solar</option>
						</select>
					</label>
				{/if}

				{#if !sharedScopeCompatible}
					<div class="rounded-lg border border-red/30 bg-red/5 p-3 text-xs text-red" role="alert">
						This data is not available for the current view region. Close this panel and choose a
						compatible region from the shared controls before adding it.
					</div>
				{/if}

				{#if errors.length}
					<div class="rounded-lg border border-red/30 bg-red/5 p-3 text-xs text-red" role="alert">
						{#each errors as error (error)}<p class="m-0">{error}</p>{/each}
					</div>
				{/if}
			</div>
		{/if}
	</div>

	<div class="flex shrink-0 items-center gap-2 border-t border-warm-grey bg-white p-4">
		<button
			type="button"
			class="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-mid-grey hover:bg-warm-grey"
			onclick={oncancel}
		>
			<X class="size-4" /> Cancel
		</button>
		{#if recipeId && config && sharedScopeCompatible}
			<button
				type="button"
				class="ml-auto flex items-center gap-1.5 rounded-lg bg-dark-grey px-4 py-2 text-sm font-semibold text-white hover:bg-black"
				onclick={onsubmit}
			>
				{#if editing}<Check class="size-4" /> Apply{:else}<Plus class="size-4" /> Add{/if}
			</button>
		{/if}
	</div>
</div>
