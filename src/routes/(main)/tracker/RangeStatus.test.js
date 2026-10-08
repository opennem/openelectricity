import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import RangeStatus from './RangeStatus.svelte';

/** @param {Partial<import('./types.js').TrackerRangeStatus>} props */
const body = (props) =>
	render(RangeStatus, { props: { label: '5–8 Oct 2026', loading: false, ...props } }).body;

describe('range readout', () => {
	it('shows at every width, truncating instead of hiding', () => {
		const html = body({ onrefresh: () => {} });
		expect(html).toContain('data-testid="tracker-range-status"');
		expect(html).toContain('data-testid="tracker-range-label"');
		// A bare `hidden` (not `overflow-hidden`) would drop it at some width.
		expect(html).not.toMatch(/class="range-status[^"]*\s(?:\w+:)?hidden[\s"]/);
		expect(html).toContain('<span class="truncate">5–8 Oct 2026</span>');
	});

	it('leads its refresh name with the visible date', () => {
		expect(body({ onrefresh: () => {} })).toContain('<span class="sr-only">, refresh data</span>');
	});

	it('shows the inspected period, and stays focusable while loading', () => {
		expect(body({ inspectLabel: '14:00–14:30' })).toContain('14:00–14:30');
		const loading = body({ loading: true, onrefresh: () => {} });
		expect(loading).toContain('data-testid="tracker-loading"');
		expect(loading).toContain('aria-disabled="true"');
		expect(loading).not.toMatch(/<button[^>]* disabled/);
	});
});
