import { describe, it, expect } from 'vitest';
import { buildNpiFacilityUrl, networkRegionToNpiState } from './npi-url.js';

describe('networkRegionToNpiState', () => {
	it('maps NEM regions by stripping the trailing "1"', () => {
		expect(networkRegionToNpiState('NSW1')).toBe('NSW');
		expect(networkRegionToNpiState('QLD1')).toBe('QLD');
		expect(networkRegionToNpiState('VIC1')).toBe('VIC');
		expect(networkRegionToNpiState('SA1')).toBe('SA');
		expect(networkRegionToNpiState('TAS1')).toBe('TAS');
	});

	it('maps WEM to WA', () => {
		expect(networkRegionToNpiState('WEM')).toBe('WA');
	});

	it('returns null for unknown regions', () => {
		expect(networkRegionToNpiState('UNKNOWN')).toBeNull();
		expect(networkRegionToNpiState('')).toBeNull();
		expect(networkRegionToNpiState(null)).toBeNull();
		expect(networkRegionToNpiState(undefined)).toBeNull();
	});
});

describe('buildNpiFacilityUrl', () => {
	it('assembles the standard NPI individual-facility-detail URL', () => {
		expect(
			buildNpiFacilityUrl({
				npiId: '00004611',
				networkRegion: 'VIC1',
				year: '2023'
			})
		).toBe(
			'https://www.npi.gov.au/npidata/action/load/individual-facility-detail/criteria/state/VIC/year/2023/jurisdiction-facility/00004611'
		);
	});

	it('handles WA via WEM', () => {
		expect(
			buildNpiFacilityUrl({ npiId: 'WA1729', networkRegion: 'WEM', year: 2022 })
		).toContain('/state/WA/year/2022/jurisdiction-facility/WA1729');
	});

	it('truncates a financial-year timestamp to its leading 4 digits', () => {
		expect(
			buildNpiFacilityUrl({
				npiId: 'SA0748',
				networkRegion: 'SA1',
				year: '2023-07-01'
			})
		).toContain('/year/2023/');
	});

	it('returns null when any required input is missing', () => {
		expect(buildNpiFacilityUrl({ npiId: null, networkRegion: 'NSW1', year: '2023' })).toBeNull();
		expect(buildNpiFacilityUrl({ npiId: 'X', networkRegion: null, year: '2023' })).toBeNull();
		expect(buildNpiFacilityUrl({ npiId: 'X', networkRegion: 'NSW1', year: null })).toBeNull();
	});

	it('returns null when the network region cannot be mapped to a state', () => {
		expect(
			buildNpiFacilityUrl({ npiId: 'X', networkRegion: 'BOGUS', year: '2023' })
		).toBeNull();
	});

	it('URL-encodes the npi id', () => {
		expect(
			buildNpiFacilityUrl({ npiId: 'Q063 ACO/002', networkRegion: 'QLD1', year: '2022' })
		).toContain('jurisdiction-facility/Q063%20ACO%2F002');
	});
});
