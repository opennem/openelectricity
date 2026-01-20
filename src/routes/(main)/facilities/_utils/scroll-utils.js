/**
 * Check if element is visible in its scroll container
 * @param {Element} el
 * @returns {boolean}
 */
export function isElementInView(el) {
	const rect = el.getBoundingClientRect();
	const container = el.closest('.overflow-y-auto');
	if (!container) return true;
	const containerRect = container.getBoundingClientRect();
	return rect.top >= containerRect.top && rect.bottom <= containerRect.bottom;
}

/**
 * Scroll to a facility element if not in view
 * @param {string} code - Facility code
 * @param {'smooth' | 'auto'} behavior - Scroll behavior
 * @param {'nearest' | 'center' | 'start' | 'end'} block - Scroll block position
 */
export function scrollToFacilityIfNeeded(code, behavior = 'smooth', block = 'nearest') {
	const el = document.querySelector(`[data-facility-code="${code}"]`);
	if (el && !isElementInView(el)) {
		el.scrollIntoView({ behavior, block });
	}
}
