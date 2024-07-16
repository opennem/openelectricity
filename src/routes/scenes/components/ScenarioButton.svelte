<script>
	import Checkbox from '$lib/components/form-elements/Checkbox.svelte';
	import RadioBigButton from '$lib/components/form-elements/RadioBigButton.svelte';

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
		class="min-h-36 text-left w-full border rounded-lg p-4 grid grid-cols-1 gap-6 place-content-between hover:border-black"
		class:bg-light-warm-grey={highlightBg}
		class:border-black={highlightBorder}
		class:border-warm-grey={!highlightBorder}
		on:click
	>
		{#if isRadioMode}
			<div class="flex justify-between items-start text-sm font-semibold text-dark-grey gap-3">
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

		<div class="flex justify-between text-xs">
			<div>
				{model.year}
				{#if model.draft}
					<span>Draft</span>
				{/if}
			</div>

			<span>{model.organisation}</span>
		</div>
	</button>
{/if}
