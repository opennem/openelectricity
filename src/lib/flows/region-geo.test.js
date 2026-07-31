import { describe, expect, it } from 'vitest';
import {
	INTERCONNECTORS,
	corridorLiveStatus,
	directionLabel,
	getInterconnector,
	icFromSlug,
	icSlug,
	interconnectorsForRegion
} from './region-geo.js';

const qni = /** @type {import('./region-geo.js').InterconnectorDef} */ (
	getInterconnector('NSW1->QLD1')
);

describe('icSlug / icFromSlug', () => {
	it('round-trips every corridor key', () => {
		for (const ic of INTERCONNECTORS) {
			expect(icFromSlug(icSlug(ic.key))).toBe(ic.key);
		}
	});

	it('slugs the directed key into URL form', () => {
		expect(icSlug('NSW1->QLD1')).toBe('nsw1-qld1');
	});

	it('resolves unknown or absent slugs to null', () => {
		expect(icFromSlug('nsw1-wem')).toBeNull();
		expect(icFromSlug(null)).toBeNull();
		expect(icFromSlug('')).toBeNull();
	});
});

describe('interconnectorsForRegion', () => {
	it('matches corridors touching either end', () => {
		expect(interconnectorsForRegion('VIC1').map((ic) => ic.key)).toEqual([
			'NSW1->VIC1',
			'SA1->VIC1',
			'TAS1->VIC1'
		]);
		expect(interconnectorsForRegion('QLD1').map((ic) => ic.key)).toEqual(['NSW1->QLD1']);
	});
});

describe('corridorLiveStatus', () => {
	// The capability denominators are direction-aware: a negative flow runs
	// against the key direction, so the fraction is over the reverse rating.
	it('reports a reverse flow against the reverse capability', () => {
		const status = corridorLiveStatus({ 'NSW1->QLD1': -650 }, qni);
		expect(status.value).toBe(-650);
		expect(status.mw).toBe(650);
		expect(status.idle).toBe(false);
		expect(status.capacity).toBe(qni.capacityMW.reverse);
		expect(status.fraction).toBeCloseTo(650 / qni.capacityMW.reverse, 6);
	});

	it('reports a forward flow against the forward capability', () => {
		const status = corridorLiveStatus({ 'NSW1->QLD1': 650 }, qni);
		expect(status.capacity).toBe(qni.capacityMW.forward);
		expect(status.fraction).toBeCloseTo(650 / qni.capacityMW.forward, 6);
	});

	it('clamps the fraction at full capability', () => {
		const status = corridorLiveStatus({ 'NSW1->QLD1': qni.capacityMW.forward * 2 }, qni);
		expect(status.fraction).toBe(1);
	});

	it('treats near-zero flows as idle', () => {
		expect(corridorLiveStatus({ 'NSW1->QLD1': 4 }, qni).idle).toBe(true);
	});

	it('treats missing or non-finite values as awaiting dispatch', () => {
		const missing = corridorLiveStatus({}, qni);
		expect(missing.value).toBeUndefined();
		expect(missing.idle).toBe(true);
		expect(missing.fraction).toBe(0);
		expect(corridorLiveStatus({ 'NSW1->QLD1': NaN }, qni).value).toBeUndefined();
	});
});

describe('directionLabel', () => {
	it('follows the sign of the flow', () => {
		expect(directionLabel(qni, 500)).toBe('NSW1 → QLD1');
		expect(directionLabel(qni, -500)).toBe('QLD1 → NSW1');
	});

	it('renders display codes in short mode', () => {
		expect(directionLabel(qni, 500, { short: true })).toBe('NSW → QLD');
		expect(directionLabel(qni, -500, { short: true })).toBe('QLD → NSW');
	});
});
