/**
 * Collapse MapLibre's compact attribution control.
 *
 * MapLibre always mounts the compact control expanded with no option to start
 * closed, so this mirrors the collapse branch of its own toggle button once
 * the map has loaded (the attribution text is populated by then).
 *
 * @param {{ getContainer: () => HTMLElement, loaded: () => boolean, once: (event: string, fn: () => void) => unknown, off: (event: string, fn: () => void) => unknown }} map MapLibre map instance
 * @returns {() => void} cleanup that removes the pending load listener
 */
export function collapseMapAttribution(map) {
	const collapse = () => {
		const attrib = map.getContainer().querySelector('.maplibregl-ctrl-attrib');
		if (attrib?.classList.contains('maplibregl-compact-show')) {
			attrib.classList.remove('maplibregl-compact-show');
			attrib.setAttribute('open', '');
		}
	};
	if (map.loaded()) collapse();
	else map.once('load', collapse);
	return () => map.off('load', collapse);
}
