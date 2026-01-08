<script>
	import CheckboxTree from './CheckboxTree.svelte';
	import { createEventDispatcher } from 'svelte';
	import FormCheckbox from '$lib/components/form-elements/Checkbox2.svelte';

	const dispatch = createEventDispatcher();

	/**
	 * @typedef {Object} Props
	 * @property {string} [name]
	 * @property {Node[]} [nodes]
	 * @property {string[]} [checked]
	 * @property {string[]} [indeterminate]
	 */

	/** @type {Props} */
	let { name = 'checkbox-tree', nodes = [], checked = [], indeterminate = [] } = $props();

	/**
	 * Handle node change
	 * @param {string} node
	 */
	function handleNodeChange(node) {
		dispatch('change', { node });
	}
</script>

{#key checked}
	<ul class="pl-3">
		{#each nodes as node (node.value)}
			<li>
				<FormCheckbox
					name={`${name}-${node.value}`}
					label={node.label}
					checked={checked.includes(node.value)}
					indeterminate={indeterminate.includes(node.value)}
					on:change={() => handleNodeChange(node.value)}
				/>
				{#if node.children}
					<CheckboxTree nodes={node.children} {checked} {indeterminate} on:change />
				{/if}
			</li>
		{/each}
	</ul>
{/key}
