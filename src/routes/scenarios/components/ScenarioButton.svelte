<script>
	import Checkbox from '$lib/components/form-elements/Checkbox.svelte';
	import RadioBigButton from '$lib/components/form-elements/RadioBigButton.svelte';
	import { modelLogoPath } from '../page-data-options/models';

	/** @type {{label: string, id: string} | null} */
	export let scenario = null;
	/** @type {{year: number, draft: Boolean, organisation: string} | null} */
	export let model = null;

	export let isRadioMode = false;
	export let highlightBg = false;
	export let highlightBorder = false;
	export let isChecked = false;
</script>

{#if model && scenario}
	<button
		class="min-h-24 text-left w-full md:border md:rounded-lg p-4 grid grid-cols-1 gap-6 place-content-between md:hover:border-black"
		class:bg-light-warm-grey={highlightBg}
		class:border-black={highlightBorder}
		class:border-warm-grey={!highlightBorder}
		on:click
	>
		{#if isRadioMode}
			<div class="flex justify-between items-start text-sm font-medium text-dark-grey gap-3">
				<span>{scenario.label}</span>
				<RadioBigButton
					radioOnly={true}
					name="peak_low"
					label={scenario.label}
					value={'12'}
					checked={highlightBorder}
				/>
			</div>
		{:else}
			<Checkbox
				label={scenario.label}
				checked={isChecked}
				class="w-full justify-between !items-start flex-row-reverse text-sm font-semibold text-dark-grey"
				on:change
			/>
		{/if}

		<slot />

		<div class="flex items-center text-mid-grey justify-between text-xs">
			<span class="w-20 grayscale">
				<img src={modelLogoPath[model.organisation]} alt="{model.organisation} logo" />
			</span>
			<div>
				{model.year}
				{#if model.draft}
					<span>Draft</span>
				{/if}
			</div>
		</div>
	</button>
{/if}
