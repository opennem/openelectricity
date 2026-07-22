import { describe, it, expect } from 'vitest';
import { normaliseStatus, bestMw, toGeoJSON, toLoadFacilities } from './data-centres.js';

describe('normaliseStatus', () => {
	it('maps construction variants to construction', () => {
		expect(normaliseStatus('Construction')).toBe('construction');
		expect(normaliseStatus('Commenced/Construction')).toBe('construction');
	});

	it('maps commenced to operating', () => {
		expect(normaliseStatus('Commenced')).toBe('operating');
	});

	it('maps planning-pipeline statuses to announced', () => {
		for (const status of [
			'Planning',
			'Planned',
			'Approved',
			'Awaiting approval',
			'Development',
			'Assessment',
			'Pre-application',
			'Announced',
			'Approval'
		]) {
			expect(normaliseStatus(status)).toBe('announced');
		}
	});

	it('maps retired variants to retired', () => {
		expect(normaliseStatus('Retired')).toBe('retired');
		expect(normaliseStatus('retired')).toBe('retired');
	});

	it('falls back to announced for junk and missing values', () => {
		expect(normaliseStatus('?')).toBe('announced');
		expect(normaliseStatus('***')).toBe('announced');
		expect(normaliseStatus(null)).toBe('announced');
		expect(normaliseStatus(undefined)).toBe('announced');
	});
});

describe('bestMw', () => {
	it('prefers operational IT load', () => {
		expect(
			bestMw({ operational_it_load_mw: 70, max_it_load_mw: 100, max_total_load_mw: 150 })
		).toEqual({ mw: 70, mwField: 'operational_it_load_mw', sourceLabel: 'IT load' });
	});

	it('falls back to max IT load, then max total load', () => {
		expect(bestMw({ operational_it_load_mw: null, max_it_load_mw: 100 }).mw).toBe(100);
		expect(
			bestMw({ operational_it_load_mw: null, max_it_load_mw: null, max_total_load_mw: 150 })
				.sourceLabel
		).toBe('max total load');
	});

	it('returns nulls when no figure is available', () => {
		expect(bestMw({})).toEqual({ mw: null, mwField: null, sourceLabel: null });
	});
});

describe('toGeoJSON', () => {
	const record = (overrides = {}) => ({
		id: 1,
		name: 'DC One',
		company: 'Acme',
		status: 'Commenced',
		city: 'Sydney',
		state: 'NSW',
		latitude: -33.87,
		longitude: 151.21,
		operational_it_load_mw: 70,
		estimated_fields: [],
		...overrides
	});

	it('drops records without coordinates', () => {
		const geojson = toGeoJSON({
			data_centres: [record(), record({ id: 2, latitude: null, longitude: null })]
		});
		expect(geojson.features).toHaveLength(1);
		expect(geojson.features[0].properties?.id).toBe('dc-1');
	});

	it('builds point geometry and status/MW properties', () => {
		const [feature] = toGeoJSON({ data_centres: [record()] }).features;
		expect(feature.geometry).toEqual({ type: 'Point', coordinates: [151.21, -33.87] });
		expect(feature.properties).toMatchObject({
			status_bucket: 'operating',
			status_label: 'Operating',
			mw: 70,
			mw_label: '70 MW (IT load)',
			has_mw: true
		});
		expect(feature.properties?.size).toBeCloseTo(Math.sqrt(70) / Math.sqrt(1200));
	});

	it('marks estimated figures with a tilde', () => {
		const [feature] = toGeoJSON({
			data_centres: [record({ estimated_fields: ['operational_it_load_mw'] })]
		}).features;
		expect(feature.properties?.mw_label).toBe('~70 MW (IT load)');
	});

	it('handles records with no MW figure', () => {
		const [feature] = toGeoJSON({
			data_centres: [record({ operational_it_load_mw: null })]
		}).features;
		expect(feature.properties).toMatchObject({ mw: null, has_mw: false, size: 0 });
	});

	it('only accepts URL-shaped website/planning links', () => {
		const [junk, planning] = toGeoJSON({
			data_centres: [
				record({ website: 'Listed by 5g, but not listed by Vocus' }),
				record({ id: 2, website: null, planning_url: 'https://planning.nsw.gov.au/x' })
			]
		}).features;
		expect(junk.properties?.link).toBe(null);
		expect(planning.properties?.link).toBe('https://planning.nsw.gov.au/x');
	});
});

describe('toLoadFacilities', () => {
	const record = (overrides = {}) => ({
		id: 7,
		name: 'DC Seven',
		company: 'Acme',
		status: 'Commenced',
		city: 'Sydney',
		state: 'NSW',
		latitude: -33.87,
		longitude: 151.21,
		commencement_date: '2018',
		operational_it_load_mw: 42,
		estimated_fields: [],
		...overrides
	});

	it('builds a facility-shaped object with one synthesised load unit', () => {
		const [f] = toLoadFacilities({ data_centres: [record()] });
		expect(f).toMatchObject({
			code: 'dc-7',
			name: 'DC Seven',
			isLoad: true,
			network_id: 'NEM',
			network_region: 'NSW1',
			location: { lat: -33.87, lng: 151.21 }
		});
		expect(f.units).toHaveLength(1);
		expect(f.units[0]).toMatchObject({
			fueltech_id: 'data_centre',
			dispatch_type: 'LOAD',
			status_id: 'operating',
			capacity_maximum: 42,
			commencement_date: '2018-01-01T00:00:00',
			commencement_date_specificity: 'year'
		});
		expect(f.dataCentre).toEqual(record());
	});

	it('keeps DC-native status buckets on the unit and dates on commencement_date', () => {
		const [announced, construction, retired] = toLoadFacilities({
			data_centres: [
				record({ id: 1, status: 'Awaiting approval', commencement_date: '2028' }),
				record({
					id: 2,
					status: 'Construction',
					commencement_date: null,
					construction_date: '2024-10-25'
				}),
				record({ id: 3, status: 'Retired' })
			]
		});
		expect(announced.units[0]).toMatchObject({
			status_id: 'announced',
			commencement_date: '2028-01-01T00:00:00',
			commencement_date_specificity: 'year'
		});
		expect(construction.units[0]).toMatchObject({
			status_id: 'construction',
			commencement_date: '2024-10-25T00:00:00'
		});
		expect(construction.units[0].commencement_date_specificity).toBeUndefined();
		expect(retired.units[0].status_id).toBe('retired');
	});

	it('tolerates missing name, state, coordinates, MW and junk dates', () => {
		const [f] = toLoadFacilities({
			data_centres: [
				record({
					id: 9,
					name: null,
					company: null,
					state: null,
					latitude: null,
					longitude: null,
					commencement_date: '10.0',
					operational_it_load_mw: null
				})
			]
		});
		expect(f.name).toBe('Unnamed data centre');
		expect(f.network_region).toBe(null);
		expect(f.location).toBe(null);
		expect(f.units[0].capacity_maximum).toBe(0);
		expect(f.units[0].commencement_date).toBeUndefined();
	});

	it('maps states to regions, keeping ACT and NT as their own regions', () => {
		const [wa, act, nt, syd] = toLoadFacilities({
			data_centres: [
				record({ id: 1, state: 'WA' }),
				record({ id: 2, state: 'ACT' }),
				record({ id: 3, state: 'NT' }),
				record({ id: 4, state: 'SYD' })
			]
		});
		expect(wa).toMatchObject({ network_id: 'WEM', network_region: 'WEM' });
		expect(act).toMatchObject({ network_id: 'NEM', network_region: 'ACT' });
		expect(nt).toMatchObject({ network_id: null, network_region: 'NT' });
		expect(syd).toMatchObject({ network_id: 'NEM', network_region: 'NSW1' });
	});
});
