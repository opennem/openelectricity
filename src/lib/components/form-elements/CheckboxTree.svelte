<script>
	import CheckboxTree from './CheckboxTree.svelte';
	import FormCheckbox from '$lib/components/form-elements/Checkbox2.svelte';

	/**
	 * @typedef {{ value: string, label: string, children?: TreeNode[] }} TreeNode
	 */

	/**
	 * @typedef {Object} Props
	 * @property {string} [name]
	 * @property {TreeNode[]} [nodes]
	 * @property {string[]} [checked]
	 * @property {string[]} [indeterminate]
	 * @property {(detail: { node: string }) => void} [onchange]
	 */

	/** @type {Props} */
	let { name = 'checkbox-tree', nodes = [], checked = [], indeterminate = [], onchange } = $props();

	/**
	 * Handle node change
	 * @param {string} node
	 */
	function handleNodeChange(node) {
		onchange?.({ node });
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
					onchange={() => handleNodeChange(node.value)}
				/>
				{#if node.children}
					<CheckboxTree nodes={node.children} {checked} {indeterminate} {onchange} />
				{/if}
			</li>
		{/each}
	</ul>
{/key}
