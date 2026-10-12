import {
	compareTimeMarkers,
	defaultComparePair,
	pickCompareTime,
	toggleCompareCard
} from './chart-compare.js';

/** @typedef {import('./chart-compare.js').ComparePair} ComparePair */
/** @typedef {import('./chart-compare.js').CompareSlot} CompareSlot */

/**
 * A page's compare mode: one comparison its cards share — the cards
 * comparing and their A and B — plus the slot the next click sets. Pages
 * keep the comparison where they like (the Tracker in its URL, the facility
 * page in local state) and hand it in through `read` / `write`.
 *
 * Until A and B are chosen they are the first and last buckets the first
 * comparing card offers (`times`), so a comparison opened before its chart
 * reported, or from a link without dates, fills in once it does. A click on
 * a comparing chart (`onpick(card)`) sets the armed slot and arms
 * the other, so two clicks set A then B.
 *
 * @template {string} Card
 * @param {{
 *   read: () => {cards: Card[], a: number | null, b: number | null} | null,
 *   write: (next: {cards: Card[], a: number | null, b: number | null} | null, history: 'push' | 'replace') => void,
 *   times: (card: Card) => number[],
 *   viewport?: () => {start: number, end: number},
 *   reveal?: (range: {start: number, end: number}) => void
 * }} options - `times`: a card's selectable buckets, ascending; `reveal`
 *   moves the charts to a range (with `viewport`, the current one)
 */
export function createCompareMode(options) {
	let armed = $state(/** @type {CompareSlot} */ ('a'));
	const comparison = $derived(options.read());
	const defaults = $derived(
		comparison && comparison.a === null && comparison.b === null
			? defaultComparePair(options.times(comparison.cards[0]))
			: null
	);
	// Kept as numbers so a republished snapshot with the same buckets leaves
	// the pair, its markers and the charts reading them untouched.
	const a = $derived(defaults ? defaults.a : (comparison?.a ?? null));
	const b = $derived(defaults ? defaults.b : (comparison?.b ?? null));
	/** @type {ComparePair} */
	const pair = $derived({ a, b });
	const markers = $derived(compareTimeMarkers(pair, armed));

	/** @param {ComparePair} next @param {'push' | 'replace'} history */
	function change(next, history) {
		if (comparison) options.write({ ...comparison, ...next }, history);
	}
	/** @param {Card} card */
	function comparing(card) {
		return !!comparison?.cards.includes(card);
	}
	/** A click (or Enter) on a comparing chart. @param {number} time */
	function pick(time) {
		const next = pickCompareTime(pair, armed, time);
		armed = next.armed;
		change(next.pair, 'push');
	}

	return {
		/** A and B, chosen or defaulted. */
		get pair() {
			return pair;
		},
		/** The slot the next click sets. */
		get armed() {
			return armed;
		},
		/** @param {CompareSlot} slot */
		arm(slot) {
			armed = slot;
		},
		comparing,
		/** Open or close a card's comparison; opening the first arms A.
		 * @param {Card} card @param {boolean} open */
		toggle(card, open) {
			if (open && !comparison) armed = 'a';
			options.write(
				toggleCompareCard(comparison, card, open, defaultComparePair(options.times(card))),
				'push'
			);
		},
		change,
		pick,
		/** Pan and zoom the charts to show A and B, keeping the span when it
		 * fits. Undefined where the page can't move its charts. */
		reveal:
			options.reveal &&
			(() => {
				const times = [pair.a, pair.b].filter((time) => time !== null);
				const view = options.viewport?.();
				if (!times.length || !view) return;
				const low = Math.min(...times);
				const high = Math.max(...times);
				const span = Math.max(view.end - view.start, (high - low) * 1.2);
				const centre = (low + high) / 2;
				options.reveal?.({ start: centre - span / 2, end: centre + span / 2 });
			}),
		/** A card's chart markers: A and B while it compares. Separate props
		 * rather than a spread object, so the chart's other props don't track
		 * the comparison. @param {Card} card */
		timeMarkers(card) {
			return comparing(card) ? markers : null;
		},
		/** A card's chart click handler: picks while it compares. @param {Card} card */
		onpick(card) {
			return comparing(card) ? pick : undefined;
		}
	};
}
