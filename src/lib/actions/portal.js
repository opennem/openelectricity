/**
 * Svelte action that moves an element to document.body.
 * Useful for dropdown menus that need to escape overflow containers.
 * @param {HTMLElement} node
 */
export function portal(node) {
	document.body.appendChild(node);

	return {
		destroy() {
			node.remove();
		}
	};
}
