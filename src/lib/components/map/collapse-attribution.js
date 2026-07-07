/**
 * Collapse MapLibre's compact attribution control to just its ⓘ button.
 *
 * MapLibre always mounts the compact control expanded — it adds `compact-show`
 * once the style's attributions populate, which lands a tick *after* the `load`
 * event, and it offers no option to start closed. So watch for the class and
 * strip it the moment it appears, then stop observing (the ⓘ button still
 * expands it). Re-arms on `style.load` so switching base style doesn't re-expand
 * it. The observer is scoped to the static control container to avoid reacting
 * to canvas/marker/layer churn.
 *
 * @param {{ getContainer: () => HTMLElement, on: (event: string, fn: () => void) => unknown, off: (event: string, fn: () => void) => unknown }} map MapLibre map instance
 * @returns {() => void} cleanup that disconnects the observer and removes the listener
 */
export function collapseMapAttribution(map) {
	const container = map.getContainer();
	const target = container.querySelector('.maplibregl-control-container') ?? container;
	/** @type {MutationObserver | undefined} */
	let observer;
	const collapse = () => {
		const attrib = container.querySelector('.maplibregl-ctrl-attrib.maplibregl-compact-show');
		if (!attrib) return false;
		attrib.classList.remove('maplibregl-compact-show');
		attrib.setAttribute('open', '');
		return true;
	};
	const arm = () => {
		observer?.disconnect();
		if (collapse()) return;
		observer = new MutationObserver(() => {
			if (collapse()) observer?.disconnect();
		});
		observer.observe(target, { subtree: true, childList: true, attributeFilter: ['class'] });
	};
	arm();
	map.on('style.load', arm);
	return () => {
		observer?.disconnect();
		map.off('style.load', arm);
	};
}
