import { describe, expect, it } from 'vitest';
import { WIKIDATA_ENTITY, buildFacilityJsonLd } from './facility-jsonld.js';
import { jsonLdToString } from './jsonld.js';

const URL = 'https://openelectricity.org.au/facility/BAYSW';
const IMAGE = 'https://openelectricity.org.au/og/facility/BAYSW.jpg';

const facility = {
	code: 'BAYSW',
	name: 'Bayswater',
	network_id: 'NEM',
	network_region: 'NSW1',
	location: { lat: -32.39, lng: 150.95 },
	units: Array.from({ length: 4 }, () => ({ fueltech_id: 'coal_black', capacity_registered: 660 }))
};

const sanityFacility = {
	wikipedia: 'https://en.wikipedia.org/wiki/Bayswater_Power_Station',
	wikidata_id: 'Q808522',
	osm_way_id: '104204275',
	website: 'https://www.agl.com.au/'
};

function build(overrides = {}) {
	return buildFacilityJsonLd({
		facility,
		sanityFacility,
		url: URL,
		image: IMAGE,
		description: 'A power station.',
		...overrides
	});
}

/**
 * @param {any} jsonLd
 * @param {string} type
 */
function nodeOf(jsonLd, type) {
	return jsonLd['@graph'].find((/** @type {any} */ n) => n['@type'] === type);
}

describe('buildFacilityJsonLd', () => {
	it('returns null without a facility', () => {
		expect(build({ facility: null })).toBeNull();
	});

	it('builds a Place with the fueltech-specific Wikidata class', () => {
		const place = nodeOf(build(), 'Place');
		expect(place.additionalType).toBe(`${WIKIDATA_ENTITY}Q6558431`);
		expect(place.name).toBe('Bayswater');
		expect(place.geo).toEqual({
			'@type': 'GeoCoordinates',
			latitude: -32.39,
			longitude: 150.95
		});
		expect(place.address).toEqual({
			'@type': 'PostalAddress',
			addressRegion: 'NSW',
			addressCountry: 'AU'
		});
	});

	it('falls back to the generic power station class for unmapped fueltechs', () => {
		const place = nodeOf(
			build({ facility: { ...facility, units: [{ fueltech_id: 'distillate' }] } }),
			'Place'
		);
		expect(place.additionalType).toBe(`${WIKIDATA_ENTITY}Q159719`);
	});

	it('uses the most common unit fueltech as the primary class', () => {
		const place = nodeOf(
			build({
				facility: {
					...facility,
					units: [
						{ fueltech_id: 'wind' },
						{ fueltech_id: 'wind' },
						{ fueltech_id: 'battery_discharging' }
					]
				}
			}),
			'Place'
		);
		expect(place.additionalType).toBe(`${WIKIDATA_ENTITY}Q194356`);
	});

	it('collects sameAs links from the Sanity profile', () => {
		const place = nodeOf(build(), 'Place');
		expect(place.sameAs).toEqual([
			'https://en.wikipedia.org/wiki/Bayswater_Power_Station',
			`${WIKIDATA_ENTITY}Q808522`,
			'https://www.openstreetmap.org/way/104204275',
			'https://www.agl.com.au/'
		]);
	});

	it('omits sameAs entirely without a Sanity profile', () => {
		const place = nodeOf(build({ sanityFacility: null }), 'Place');
		expect(place.sameAs).toBeUndefined();
	});

	it('rejects malformed wikidata ids and non-http links', () => {
		const place = nodeOf(
			build({
				sanityFacility: { wikidata_id: 'not-a-qid', wikipedia: 'javascript:alert(1)' }
			}),
			'Place'
		);
		expect(place.sameAs).toBeUndefined();
	});

	it('sums unit capacities into a PropertyValue', () => {
		const place = nodeOf(build(), 'Place');
		expect(place.additionalProperty).toContainEqual({
			'@type': 'PropertyValue',
			name: 'Nameplate capacity',
			value: 2640,
			unitText: 'MW'
		});
		expect(place.additionalProperty).toContainEqual({
			'@type': 'PropertyValue',
			name: 'Fuel technology',
			value: 'Coal (Black)'
		});
	});

	it('survives null unit entries', () => {
		const place = nodeOf(
			build({ facility: { ...facility, units: [null, { fueltech_id: 'wind' }, undefined] } }),
			'Place'
		);
		expect(place.additionalType).toBe(`${WIKIDATA_ENTITY}Q194356`);
	});

	it('falls back to the Sanity location when the OE one is malformed', () => {
		const place = nodeOf(
			build({
				facility: { ...facility, location: { lat: null, lng: null } },
				sanityFacility: { ...sanityFacility, location: { lat: -33.8, lng: 151.2 } }
			}),
			'Place'
		);
		expect(place.geo).toEqual({
			'@type': 'GeoCoordinates',
			latitude: -33.8,
			longitude: 151.2
		});
	});

	it('omits geo entirely when no usable location exists', () => {
		const place = nodeOf(
			build({ facility: { ...facility, location: null }, sanityFacility: null }),
			'Place'
		);
		expect(place.geo).toBeUndefined();
	});

	it('maps WEM to WA', () => {
		const place = nodeOf(build({ facility: { ...facility, network_region: 'WEM' } }), 'Place');
		expect(place.address.addressRegion).toBe('WA');
	});

	it('includes a breadcrumb trail ending at the facility', () => {
		const crumbs = nodeOf(build(), 'BreadcrumbList');
		expect(crumbs.itemListElement).toHaveLength(3);
		expect(crumbs.itemListElement[2]).toEqual({
			'@type': 'ListItem',
			position: 3,
			name: 'Bayswater',
			item: URL
		});
	});
});

describe('jsonLdToString', () => {
	it('escapes < so content cannot close the script tag', () => {
		const out = jsonLdToString({ description: 'bad </script><script>alert(1)</script>' });
		expect(out).not.toContain('</script>');
		expect(out).toContain('\\u003c/script>');
	});
});
