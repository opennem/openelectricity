<script>
	import { createEventDispatcher } from 'svelte';
	import FormCheckbox from '$lib/components/form-elements/Checkbox2.svelte';

	const dispatch = createEventDispatcher();

	/** @typedef {{label: string, value: string, children?: {label: string, value: string}[]}} Node */

	/** @type {Node[]} */
	export let nodes = [];

	/** @type {string[]} */
	export let checked = [];

	/** @type {string[]} */
	export let indeterminate = [];

	/**
	 * Handle node change
	 * @param {string} node
	 */
	function handleNodeChange(node) {
		dispatch('change', { node });
	}
</script>

{#key checked}
	<ul class="pl-9">
		{#each nodes as node (node.value)}
			<li>
				<FormCheckbox
					name={node.value}
					label={node.label}
					checked={checked.includes(node.value)}
					indeterminate={indeterminate.includes(node.value)}
					on:change={() => handleNodeChange(node.value)}
				/>
				{#if node.children}
					<svelte:self nodes={node.children} {checked} {indeterminate} on:change />
				{/if}
			</li>
		{/each}
	</ul>
{/key}
