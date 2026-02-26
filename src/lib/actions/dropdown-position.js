/**
 * @typedef {{ trigger?: HTMLElement, align?: string, position?: string, gap?: number }} DropdownPositionOpts
 */

/**
 * Svelte action that positions a fixed-position dropdown relative to a trigger element.
 * @param {HTMLElement} node - The dropdown element (should have position: fixed)
 * @param {DropdownPositionOpts} opts
 */
export function dropdownPosition(node, opts) {
	function update() {
		if (!opts.trigger) return;

		const rect = opts.trigger.getBoundingClientRect();
		const gap = opts.gap ?? 8;

		if (opts.position === 'top') {
			node.style.bottom = `${window.innerHeight - rect.top + gap}px`;
			node.style.top = '';
		} else {
			node.style.top = `${rect.bottom + gap}px`;
			node.style.bottom = '';
		}

		if (opts.align === 'right') {
			node.style.right = `${window.innerWidth - rect.right}px`;
			node.style.left = '';
		} else {
			node.style.left = `${rect.left}px`;
			node.style.right = '';
		}
	}

	update();

	window.addEventListener('scroll', update, true);
	window.addEventListener('resize', update);

	return {
		/** @param {DropdownPositionOpts} newOpts */
		update(newOpts) {
			opts = newOpts;
			update();
		},
		destroy() {
			window.removeEventListener('scroll', update, true);
			window.removeEventListener('resize', update);
		}
	};
}
