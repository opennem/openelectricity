<script>
	import { getContext } from 'svelte';
	import lzString from 'lz-string';

	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';

	import Switch from '$lib/components/Switch.svelte';
	import FormSelect from '$lib/components/form-elements/Select.svelte';
	import IconPlus from '$lib/icons/Plus.svelte';
	import IconMinus from '$lib/icons/Minus.svelte';

	import Selection from './Selection.svelte';

	import { regionOptions, dataViewOptions, displayViewOptions } from './options';
	import { scenarioLabels } from './descriptions';
	import { dataTechnologyGroupOptions, dataRegionCompareOptions } from './helpers';

	const {
		selectedModel,
		selectedRegion,
		selectedDataView,
		selectedDisplayView,
		selectedScenario,
		selectedPathway,

		showScenarioOptions,

		selectedMultipleScenarios,

		isTechnologyDisplay,
		isScenarioDisplay,
		isRegionDisplay
	} = getContext('scenario-filters');

	const { selectedGroup } = getContext('scenario-data');

	// $selectedGroup = dataTechnologyGroupOptions[0].value;

	$: queryObj = {
		model: $selectedModel,
		region: $selectedRegion,
		dataView: $selectedDataView,
		displayView: $selectedDisplayView,
		scenario: $selectedScenario,
		pathway: $selectedPathway,
		group: $selectedGroup,
		multipleScenarios: $selectedMultipleScenarios
	};
	$: compressedQuery = lzString.compressToEncodedURIComponent(JSON.stringify(queryObj));
	$: decompressedQuery = JSON.parse(lzString.decompressFromEncodedURIComponent(compressedQuery));
	$: if (browser) {
		let query = new URLSearchParams($page.url.searchParams.toString());
		query.set('filters', compressedQuery);
		goto(`?${query.toString()}`);
	}

	function handleDisplayViewChange(prevView, view) {
		$selectedDisplayView = view;

		const keepSelectedGroup =
			(prevView === 'region' && view === 'scenario') ||
			(prevView === 'scenario' && view === 'region');
		console.log('prev', prevView, 'view', view, 'shouldUpdate', keepSelectedGroup);

		if (keepSelectedGroup) return;
		if (view === 'technology') {
			$selectedGroup = dataTechnologyGroupOptions[0].value;
		} else {
			$selectedGroup = dataRegionCompareOptions[0].value;
		}
	}
</script>

<div class="container max-w-none flex gap-16 divide-x divide-warm-grey">
	<Switch
		buttons={displayViewOptions}
		selected={$selectedDisplayView}
		on:change={(evt) => handleDisplayViewChange($selectedDisplayView, evt.detail.value)}
		class="justify-center my-4"
	/>
	<div class="py-2 flex items-center gap-6 pl-10 relative z-40">
		<div class="text-sm">
			<FormSelect
				options={dataViewOptions}
				selected={$selectedDataView}
				on:change={(evt) => ($selectedDataView = evt.detail.value)}
			/>
		</div>

		{#if $isTechnologyDisplay || $isScenarioDisplay}
			<div class="text-sm">
				<FormSelect
					options={regionOptions}
					selected={$selectedRegion}
					on:change={(evt) => ($selectedRegion = evt.detail.value)}
				/>
			</div>
		{/if}

		{#if $selectedModel && $selectedScenario}
			<button
				class="text-sm flex items-center gap-3 justify-center px-8 py-4 border rounded-xl whitespace-nowrap bg-white text-dark-grey"
				class:border-dark-grey={$showScenarioOptions}
				class:border-mid-warm-grey={!$showScenarioOptions}
				on:click={() => ($showScenarioOptions = !$showScenarioOptions)}
			>
				{#if $isScenarioDisplay}
					Update Scenarios
				{:else}
					{scenarioLabels[$selectedModel][$selectedScenario]}
				{/if}

				{#if $showScenarioOptions}
					<IconMinus />
				{:else}
					<IconPlus />
				{/if}
			</button>
		{/if}
	</div>
</div>
