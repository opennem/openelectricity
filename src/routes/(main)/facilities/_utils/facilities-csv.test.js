import { describe, it, expect } from 'vitest';
import { facilitiesToCsv } from './facilities-csv.js';

describe('facilitiesToCsv', () => {
	it('returns header-only CSV for empty array', () => {
		const csv = facilitiesToCsv([]);
		const lines = csv.split('\n');
		expect(lines).toHaveLength(1);
		expect(lines[0]).toContain('facility_code');
		expect(lines[0]).toContain('unit_code');
	});

	it('generates correct CSV headers', () => {
		const csv = facilitiesToCsv([]);
		const headers = csv.split('\n')[0].split(',');
		expect(headers).toEqual([
			'facility_code',
			'facility_name',
			'network_id',
			'network_region',
			'latitude',
			'longitude',
			'unit_code',
			'unit_code_display',
			'fueltech_id',
			'status_id',
			'capacity_registered',
			'capacity_maximum',
			'capacity_storage',
			'max_generation',
			'registered_date',
			'expected_closure_date',
			'data_first_seen',
			'data_last_seen'
		]);
	});

	it('produces one row per unit across multiple facilities', () => {
		const facilities = [
			{
				code: 'FAC1',
				name: 'Facility One',
				network_id: 'au.nem',
				network_region: 'nsw1',
				location: { lat: -33.8, lng: 151.2 },
				units: [
					{ code: 'U1', fueltech_id: 'solar_utility', status_id: 'operating' },
					{ code: 'U2', fueltech_id: 'wind', status_id: 'operating' }
				]
			},
			{
				code: 'FAC2',
				name: 'Facility Two',
				network_id: 'au.wem',
				network_region: 'wem',
				location: { lat: -31.9, lng: 115.8 },
				units: [{ code: 'U3', fueltech_id: 'gas_ccgt', status_id: 'committed' }]
			}
		];

		const csv = facilitiesToCsv(facilities);
		const lines = csv.split('\n');
		// header + 3 unit rows
		expect(lines).toHaveLength(4);
		expect(lines[1]).toContain('FAC1');
		expect(lines[1]).toContain('U1');
		expect(lines[2]).toContain('FAC1');
		expect(lines[2]).toContain('U2');
		expect(lines[3]).toContain('FAC2');
		expect(lines[3]).toContain('U3');
	});

	it('includes location data', () => {
		const facilities = [
			{
				code: 'FAC1',
				name: 'Test',
				network_id: 'au.nem',
				network_region: 'nsw1',
				location: { lat: -33.8688, lng: 151.2093 },
				units: [{ code: 'U1', fueltech_id: 'solar_utility', status_id: 'operating' }]
			}
		];

		const csv = facilitiesToCsv(facilities);
		const dataRow = csv.split('\n')[1];
		expect(dataRow).toContain('-33.8688');
		expect(dataRow).toContain('151.2093');
	});

	it('handles missing/null fields gracefully', () => {
		const facilities = [
			{
				code: 'FAC1',
				name: 'Test',
				network_id: 'au.nem',
				network_region: 'nsw1',
				units: [
					{
						code: 'U1',
						fueltech_id: 'solar_utility',
						status_id: 'operating'
						// no location, no capacity, no dates
					}
				]
			}
		];

		const csv = facilitiesToCsv(facilities);
		const lines = csv.split('\n');
		expect(lines).toHaveLength(2);
		// Should not throw and should have empty values for missing fields
		const values = lines[1].split(',');
		// latitude and longitude should be empty (indices 4,5)
		expect(values[4]).toBe('');
		expect(values[5]).toBe('');
	});

	it('quotes values containing commas', () => {
		const facilities = [
			{
				code: 'FAC1',
				name: 'Solar Farm, Phase 1',
				network_id: 'au.nem',
				network_region: 'nsw1',
				location: { lat: -33.8, lng: 151.2 },
				units: [{ code: 'U1', fueltech_id: 'solar_utility', status_id: 'operating' }]
			}
		];

		const csv = facilitiesToCsv(facilities);
		const dataRow = csv.split('\n')[1];
		expect(dataRow).toContain('"Solar Farm, Phase 1"');
	});

	it('skips facilities with no units', () => {
		const facilities = [
			{
				code: 'FAC1',
				name: 'Empty',
				network_id: 'au.nem',
				network_region: 'nsw1',
				units: []
			},
			{
				code: 'FAC2',
				name: 'Has Units',
				network_id: 'au.nem',
				network_region: 'nsw1',
				units: [{ code: 'U1', fueltech_id: 'wind', status_id: 'operating' }]
			}
		];

		const csv = facilitiesToCsv(facilities);
		const lines = csv.split('\n');
		expect(lines).toHaveLength(2); // header + 1 row
		expect(lines[1]).toContain('FAC2');
	});
});
