import { describe, expect, it } from 'vitest';
import { HIGHLIGHT_DIMMED_OPACITY, highlightOpacity } from './highlight.js';

describe('highlightOpacity', () => {
	it('keeps every mark at its own opacity with nothing highlighted', () => {
		expect(highlightOpacity(null, 'demand')).toBe(1);
		expect(highlightOpacity(undefined, 'demand', 0.6)).toBe(0.6);
	});

	it('keeps the highlighted mark and dims the rest', () => {
		expect(highlightOpacity('demand', 'demand')).toBe(1);
		expect(highlightOpacity('coal', 'demand')).toBe(HIGHLIGHT_DIMMED_OPACITY);
	});
});
