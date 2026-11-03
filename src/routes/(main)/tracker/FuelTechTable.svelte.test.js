import { afterEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import FuelTechTable from './FuelTechTable.svelte';
import { DEMAND_LINE_ID, RENEWABLES_LINE_ID } from './tracker-overlays.js';

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
	vwPricePartial: false,
	emissionsT: 180,
	intensityKgPerMWh: 900,
	intensityPartial: false,
	fuelTechs: ['coal_black']
};
const charging = { ...coal, id: 'battery_charging', label: 'Battery (Charging)', isLoad: true };

/** @type {ReturnType<typeof mount> | undefined} */
let table;
afterEach(() => {
	if (table) unmount(table);
	table = undefined;
	document.body.innerHTML = '';
});

/** @param {import('svelte').ComponentProps<typeof FuelTechTable>} props */
function render(props) {
	table = mount(FuelTechTable, { target: document.body, props });
	flushSync();
	return Array.from(document.querySelectorAll('[data-testid="fuel-tech-row"]'));
}

/** @param {Element} row @param {string} type @param {string} pointerType */
function pointer(row, type, pointerType = 'mouse') {
	row.dispatchEvent(Object.assign(new Event(type), { pointerType }));
}

describe('row hover', () => {
	it('reports the hovered source or load row, then clears it', () => {
		const onrowhover = vi.fn();
		const [, load] = render({ rows: [coal, charging], onrowhover });
		pointer(load, 'pointerenter');
		pointer(load, 'pointerleave');
		expect(onrowhover.mock.calls).toEqual([['battery_charging'], [undefined]]);
	});

	it('reports curtailment bands and the demand and renewables lines by their chart ids', () => {
		const onrowhover = vi.fn();
		render({
			rows: [coal],
			curtailmentRows: [
				{
					id: 'curtailment_solar',
					label: 'Curtailment (Solar)',
					energyMWh: 10,
					avPowerMW: 5,
					contributionPct: 2
				}
			],
			overlaySummary: {
				demandEnergyMWh: 400,
				demandAvMW: 200,
				renewablesEnergyMWh: 100,
				renewablesAvMW: 50,
				renewablesSharePct: 25
			},
			onrowhover
		});
		const rows = Array.from(document.querySelectorAll('tbody tr')).slice(1);
		for (const row of rows) pointer(row, 'pointerenter');
		expect(onrowhover.mock.calls.map(([key]) => key)).toEqual([
			'curtailment_solar',
			DEMAND_LINE_ID,
			RENEWABLES_LINE_ID
		]);
	});

	it('ignores touch, which toggles the row instead', () => {
		const onrowhover = vi.fn();
		const [row] = render({ rows: [coal], onrowhover });
		pointer(row, 'pointerenter', 'touch');
		pointer(row, 'pointerleave', 'touch');
		expect(onrowhover).not.toHaveBeenCalled();
	});

	it('lets go when the hovered row unmounts', () => {
		const onrowhover = vi.fn();
		const [row] = render({ rows: [coal], onrowhover });
		pointer(row, 'pointerenter');
		if (table) unmount(table);
		table = undefined;
		expect(onrowhover).toHaveBeenLastCalledWith(undefined);
	});
});
