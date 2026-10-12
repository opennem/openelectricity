/**
 * Pure helpers behind the "Download data" dialog's registry
 * (`chart-downloads.svelte.js`): screen order, a download's status line
 * and workbook availability.
 */

/** `Node.DOCUMENT_POSITION_FOLLOWING`, without the DOM global (node tests). */
const FOLLOWING = 4;

/**
 * Registered downloads in the order their elements appear on screen, so the
 * dialog lists the charts as the page shows them whatever order they
 * mounted in. A container sorts before what it contains.
 * @template {{ element: Pick<Element, 'compareDocumentPosition'> }} T
 * @param {T[]} entries
 * @returns {T[]}
 */
export function orderByDocument(entries) {
	return [...entries].sort((a, b) => {
		if (a.element === b.element) return 0;
		return a.element.compareDocumentPosition(/** @type {Node} */ (b.element)) & FOLLOWING ? -1 : 1;
	});
}

/**
 * Whether the "All charts" workbook can build: nothing still loading or
 * failed, and at least one chart with data. Charts without data are left
 * out of the workbook (its Summary names them) rather than blocking it.
 * @param {Array<import('./types.js').DownloadState>} states
 * @returns {{ enabled: boolean, reason: string }}
 */
export function workbookAvailability(states) {
	if (states.includes('loading')) return { enabled: false, reason: 'Waiting for charts to load' };
	if (states.includes('error')) return { enabled: false, reason: 'Some charts could not load' };
	if (!states.includes('ready')) return { enabled: false, reason: 'No chart data to download' };
	return { enabled: true, reason: '' };
}

/**
 * What a download's row (or a card's table view) says while it can't
 * download: the source's own message, else its state. Empty when ready.
 * @param {Pick<import('./types.js').DownloadSource, 'state' | 'message'>} source
 * @returns {string}
 */
export function downloadStatus(source) {
	if (source.message) return source.message;
	if (source.state === 'loading') return 'Loading…';
	if (source.state === 'empty') return 'No data';
	if (source.state === 'error') return 'Couldn’t load';
	return '';
}
