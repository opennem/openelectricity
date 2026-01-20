<script>
	import Checkbox from '$lib/components/form-elements/Checkbox.svelte';
	import RadioBigButton from '$lib/components/form-elements/RadioBigButton.svelte';
	import { modelLogoPath } from '../page-data-options/models';

	/**
	 * @typedef {Object} Props
	 * @property {{label: string, id: string} | null} [scenario]
	 * @property {{year: number, draft: Boolean, organisation: string} | null} [model]
	 * @property {boolean} [isRadioMode]
	 * @property {boolean} [highlightBg]
	 * @property {boolean} [highlightBorder]
	 * @property {boolean} [isChecked]
	 * @property {() => void} [onclick]
	 * @property {(checked: boolean) => void} [onchange]
	 * @property {import('svelte').Snippet} [children]
	 */

	/** @type {Props} */
	let {
		scenario = null,
		model = null,
		isRadioMode = false,
		highlightBg = false,
		highlightBorder = false,
		isChecked = false,
		onclick,
		onchange,
		children
	} = $props();
</script>

{#if model && scenario}
	<button
		class="min-h-24 text-left w-full md:border md:rounded-lg p-4 grid grid-cols-1 gap-6 place-content-between md:hover:border-black"
		class:bg-light-warm-grey={highlightBg}
		class:border-black={highlightBorder}
		class:border-warm-grey={!highlightBorder}
		{onclick}
	>
		{#if isRadioMode}
			<div class="flex justify-between items-start text-sm font-medium text-dark-grey gap-3">
				<span>{scenario.label}</span>
				<RadioBigButton
					radioOnly={true}
					name="peak_low"
					label={scenario.label}
					value="12"
					checked={highlightBorder}
				/>
			</div>
		{:else}
			<Checkbox
				label={scenario.label}
				checked={isChecked}
				class="w-full justify-between items-start! flex-row-reverse text-sm font-semibold text-dark-grey"
				{onchange}
			/>
		{/if}

		{@render children?.()}

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
