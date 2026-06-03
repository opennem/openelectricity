import { describe, it, expect } from 'vitest';
import { detectLatColumn, detectLngColumn, detectLabelColumn } from './map-detection.js';

const facilities = [
	{ name: 'Bayswater', lat: -32.394, lng: 150.949, capacity: 2640 },
	{ name: 'Hornsdale', lat: -33.105, lng: 138.31, capacity: 150 }
];

const facilityColumns = [
	{ key: 'name', label: 'name', isNumeric: false },
	{ key: 'lat', label: 'lat', isNumeric: true },
	{ key: 'lng', label: 'lng', isNumeric: true },
	{ key: 'capacity', label: 'capacity', isNumeric: true }
];

describe('detectLatColumn', () => {
	it('matches a "lat" header with values in [-90, 90]', () => {
		expect(detectLatColumn(facilityColumns, facilities)).toBe('lat');
	});

	it('matches "latitude" case-insensitively', () => {
		const cols = [{ key: 'latitude', label: 'Latitude', isNumeric: true }];
		const data = [{ latitude: -25 }];
		expect(detectLatColumn(cols, data)).toBe('latitude');
	});

	it('rejects "lat" when values fall outside [-90, 90]', () => {
		const cols = [{ key: 'lat', label: 'lat', isNumeric: true }];
		const data = [{ lat: 1500 }];
		expect(detectLatColumn(cols, data)).toBeNull();
	});

	it('returns null when no header matches', () => {
		const cols = [{ key: 'capacity', label: 'capacity', isNumeric: true }];
		const data = [{ capacity: 100 }];
		expect(detectLatColumn(cols, data)).toBeNull();
	});

	it('skips non-numeric columns even if the header matches', () => {
		const cols = [{ key: 'lat', label: 'lat', isNumeric: false }];
		const data = [{ lat: 'unknown' }];
		expect(detectLatColumn(cols, data)).toBeNull();
	});
});

describe('detectLngColumn', () => {
	it('matches a "lng" header with values in [-180, 180]', () => {
		expect(detectLngColumn(facilityColumns, facilities)).toBe('lng');
	});

	it('accepts "long" / "lon" / "longitude" / "x"', () => {
		for (const header of ['long', 'lon', 'longitude', 'x']) {
			const cols = [{ key: header, label: header, isNumeric: true }];
			expect(detectLngColumn(cols, [{ [header]: 134 }])).toBe(header);
		}
	});

	it('rejects values outside [-180, 180]', () => {
		const cols = [{ key: 'lng', label: 'lng', isNumeric: true }];
		expect(detectLngColumn(cols, [{ lng: 360 }])).toBeNull();
	});
});

describe('detectLabelColumn', () => {
	it('returns the first non-numeric column key', () => {
		expect(detectLabelColumn(facilityColumns)).toBe('name');
	});

	it('returns null when every column is numeric', () => {
		const cols = [
			{ key: 'lat', label: 'lat', isNumeric: true },
			{ key: 'lng', label: 'lng', isNumeric: true }
		];
		expect(detectLabelColumn(cols)).toBeNull();
	});

	it('returns null for an empty column list', () => {
		expect(detectLabelColumn([])).toBeNull();
	});
});
