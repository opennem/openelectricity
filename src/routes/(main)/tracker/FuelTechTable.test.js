import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import FuelTechTable from './FuelTechTable.svelte';

/** @type {import('./types.js').FuelTechTableRow} */
const coal = {
	id: 'coal',
	label: 'Coal',
	colour: '#131313',
	isLoad: false,
	hidden: false,
	energyMWh: 200,
	avPowerMW: 100,
	contributionPct: 50,
	vwPrice: 100,
	vwPricePartial: true,
	emissionsT: 180,
	intensityKgPerMWh: 900,
	intensityPartial: false,
	fuelTechs: ['coal_black']
};

/** @param {string[]} tableColumns @param {Partial<typeof coal>} [row] */
const body = (tableColumns, row = {}) =>
	render(FuelTechTable, { props: { rows: [{ ...coal, ...row }], tableColumns } }).body;

describe('partial coverage marker', () => {
	it('marks a partial price and links the row to its note', () => {
		const html = body(['price', 'intensity']);
		expect(html).toContain('id="partial-coverage-note"');
		expect(html).toContain('aria-describedby="partial-coverage-note"');
		expect(html.match(/, partial</g)).toHaveLength(1);
	});

	it('marks nothing while the partial column is hidden', () => {
		const html = body(['energy', 'intensity']);
		expect(html).not.toContain('partial-coverage-note');
		expect(html).not.toContain(', partial');
	});

	it('marks nothing for complete values', () => {
		const html = body(['price', 'intensity'], { vwPricePartial: false });
		expect(html).not.toContain('partial-coverage-note');
	});
});
