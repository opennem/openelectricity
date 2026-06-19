import { describe, it, expect } from 'vitest';
import { deriveCard, formatMw, formatCardSubtitle } from './facility-card-data.js';

describe('formatMw', () => {
	it('returns an em-dash for falsy values', () => {
		expect(formatMw(0)).toBe('—');
		expect(formatMw(/** @type {any} */ (null))).toBe('—');
	});

	it('keeps one decimal below 10', () => {
		expect(formatMw(4.25)).toBe('4.3');
	});

	it('rounds and groups thousands at or above 10', () => {
		expect(formatMw(12)).toBe('12');
		expect(formatMw(1234.5)).toBe('1,235');
	});
});

describe('deriveCard', () => {
	it('dedupes and orders fueltechs top-of-stack first, independent of capacity', () => {
		const card = deriveCard({
			name: 'Mixed',
			network_region: 'VIC1',
			units: [
				{ fueltech_id: 'gas_ccgt', capacity_maximum: 200, status_id: 'operating' },
				{ fueltech_id: 'solar_utility', capacity_maximum: 50, status_id: 'operating' },
				{ fueltech_id: 'gas_ccgt', capacity_maximum: 100, status_id: 'operating' }
			]
		});
		// Reversed detailed order puts solar ahead of gas (matching the detail
		// panel + list) even though gas has more capacity...
		expect(card.fuelTechs).toEqual(['solar_utility', 'gas_ccgt']);
		// ...while `dominant` still tracks capacity (it drives the card background).
		expect(card.dominant).toBe('gas_ccgt');
		expect(card.capacity).toBe(350);
	});

	it('drops derived battery_charging/discharging when a bidirectional battery exists', () => {
		const card = deriveCard({
			name: 'Battery',
			network_region: 'SA1',
			units: [
				{ fueltech_id: 'battery', capacity_maximum: 100, status_id: 'operating' },
				{ fueltech_id: 'battery_charging', capacity_maximum: 100, status_id: 'operating' },
				{ fueltech_id: 'battery_discharging', capacity_maximum: 100, status_id: 'operating' }
			]
		});
		expect(card.fuelTechs).toEqual(['battery']);
		expect(card.capacity).toBe(100);
	});

	it('excludes retired units from capacity unless every unit is retired', () => {
		const partlyRetired = deriveCard({
			name: 'Partial',
			network_region: 'NSW1',
			units: [
				{ fueltech_id: 'coal_black', capacity_maximum: 500, status_id: 'retired' },
				{ fueltech_id: 'coal_black', capacity_maximum: 500, status_id: 'operating' }
			]
		});
		expect(partlyRetired.capacity).toBe(500);
		expect(partlyRetired.status).toBe('operating');

		const allRetired = deriveCard({
			name: 'Closed',
			network_region: 'NSW1',
			units: [{ fueltech_id: 'coal_black', capacity_maximum: 500, status_id: 'retired' }]
		});
		expect(allRetired.capacity).toBe(500);
		expect(allRetired.status).toBe('retired');
	});

	it('rolls status up to the most common non-retired status when none are operating', () => {
		const card = deriveCard({
			name: 'Pipeline',
			network_region: 'QLD1',
			units: [
				{ fueltech_id: 'solar_utility', capacity_maximum: 10, status_id: 'committed' },
				{ fueltech_id: 'solar_utility', capacity_maximum: 10, status_id: 'committed' },
				{ fueltech_id: 'wind', capacity_maximum: 10, status_id: 'commissioning' }
			]
		});
		expect(card.status).toBe('committed');
	});

	it('normalises region (strips trailing digits, uppercases) and falls back to code for name', () => {
		const card = deriveCard({
			code: 'ABC1',
			network_region: 'nsw1',
			units: [{ fueltech_id: 'wind', capacity_maximum: 5, status_id: 'operating' }]
		});
		expect(card.region).toBe('NSW');
		expect(card.name).toBe('ABC1');
	});

	it('handles a facility with no units', () => {
		const card = deriveCard({ name: 'Empty', network_region: 'TAS1', units: [] });
		expect(card.fuelTechs).toEqual([]);
		expect(card.dominant).toBe('renewables');
		expect(card.capacity).toBe(0);
		expect(card.status).toBeNull();
	});
});

describe('formatCardSubtitle', () => {
	it('joins capacity, region and capitalised status', () => {
		expect(formatCardSubtitle({ capacity: 100, region: 'NSW', status: 'operating' })).toBe(
			'100 MW  ·  NSW  ·  Operating'
		);
	});

	it('omits an empty status segment', () => {
		expect(formatCardSubtitle({ capacity: 100, region: 'NSW', status: null })).toBe(
			'100 MW  ·  NSW'
		);
	});
});
