import { describe, it, expect } from 'vitest';
import { escapeXml, intervalToDate, recordTitle, buildRecordsFeed, FEED_SIZE } from './feed.js';

describe('escapeXml', () => {
	it('escapes the five XML special characters', () => {
		expect(escapeXml(`<a href="x" data='y'> & </a>`)).toBe(
			'&lt;a href=&quot;x&quot; data=&apos;y&apos;&gt; &amp; &lt;/a&gt;'
		);
	});

	it('leaves plain text untouched', () => {
		expect(escapeXml('Highest wind generation (NSW1)')).toBe('Highest wind generation (NSW1)');
	});
});

describe('intervalToDate', () => {
	// 14:30 NEM-local is 04:30 UTC; 14:30 WEM-local is 06:30 UTC.
	const NEM_UTC = 'Sun, 08 Jun 2025 04:30:00 GMT';

	it('treats a suffix-less NEM interval as +10:00', () => {
		expect(intervalToDate('2025-06-08T14:30:00', 'NEM').toUTCString()).toBe(NEM_UTC);
	});

	it('normalises a Z-suffixed interval before applying the network offset', () => {
		expect(intervalToDate('2025-06-08T14:30:00Z', 'NEM').toUTCString()).toBe(NEM_UTC);
	});

	it('normalises an already-offset interval rather than double-appending', () => {
		expect(intervalToDate('2025-06-08T14:30:00+10:00', 'NEM').toUTCString()).toBe(NEM_UTC);
	});

	it('applies +08:00 for WEM', () => {
		expect(intervalToDate('2025-06-08T14:30:00', 'WEM').toUTCString()).toBe(
			'Sun, 08 Jun 2025 06:30:00 GMT'
		);
	});

	it('never yields an Invalid Date for the formats the API emits', () => {
		for (const interval of [
			'2025-06-08T14:30:00',
			'2025-06-08T14:30:00Z',
			'2025-06-08T14:30:00+10:00'
		]) {
			expect(intervalToDate(interval, 'NEM').toUTCString()).not.toBe('Invalid Date');
		}
	});
});

describe('recordTitle', () => {
	/** @type {import('$lib/types/record.types').MilestoneRecord} */
	const base = {
		record_id: 'au.nem.nsw1.wind.power.interval.high',
		period: 'day',
		aggregate: 'high',
		metric: 'power',
		fueltech_id: 'wind',
		network_id: 'NEM',
		network_region: 'NSW1',
		value: 4210,
		value_unit: 'MW'
	};

	it('combines description, value, unit and region', () => {
		expect(recordTitle(base)).toBe('Highest instantaneous wind generation: 4,210 MW (NSW1)');
	});

	it('omits the value segment when value is null', () => {
		// value is typed number|undefined but the API returns null at runtime.
		expect(recordTitle(/** @type {*} */ ({ ...base, value: null }))).toBe(
			'Highest instantaneous wind generation (NSW1)'
		);
	});

	it('falls back to the network id when there is no region', () => {
		expect(recordTitle({ ...base, network_region: null })).toContain('(NEM)');
	});

	it('falls back to the record id when no description can be built', () => {
		expect(
			recordTitle(/** @type {*} */ ({ ...base, period: '', aggregate: '', metric: '' }))
		).toContain(base.record_id);
	});
});

describe('buildRecordsFeed', () => {
	const origin = 'https://openelectricity.org.au';

	/**
	 * @param {Partial<import('$lib/types/record.types').MilestoneRecord>} over
	 * @returns {import('$lib/types/record.types').MilestoneRecord}
	 */
	const record = (over) => ({
		record_id: 'au.nem.nsw1.wind.power.day.high',
		instance_id: 'inst-1',
		period: 'day',
		aggregate: 'high',
		metric: 'power',
		fueltech_id: 'wind',
		network_id: 'NEM',
		network_region: 'NSW1',
		value: 100,
		value_unit: 'MW',
		interval: '2025-06-08T14:30:00',
		...over
	});

	it('emits a well-formed RSS 2.0 envelope with a self link', () => {
		const xml = buildRecordsFeed({ records: [record({})], origin });
		expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
		expect(xml).toContain('<rss version="2.0"');
		expect(xml).toContain(
			`<atom:link href="${origin}/records/rss.xml" rel="self" type="application/rss+xml" />`
		);
		expect(xml).toContain('</rss>');
	});

	it('renders one <item> per record with a deep link and guid', () => {
		const xml = buildRecordsFeed({ records: [record({})], origin });
		expect((xml.match(/<item>/g) || []).length).toBe(1);
		expect(xml).toContain(`${origin}/records/au.nem.nsw1.wind.power.day.high?focus=`);
		expect(xml).toContain('<guid isPermaLink="false">inst-1</guid>');
	});

	it('drops renewable_proportion records', () => {
		const xml = buildRecordsFeed({
			records: [record({ metric: 'renewable_proportion', instance_id: 'rp' })],
			origin
		});
		expect((xml.match(/<item>/g) || []).length).toBe(0);
	});

	it('sorts items newest-first', () => {
		const xml = buildRecordsFeed({
			records: [
				record({ instance_id: 'older', interval: '2025-06-01T00:00:00' }),
				record({ instance_id: 'newer', interval: '2025-06-09T00:00:00' })
			],
			origin
		});
		expect(xml.indexOf('newer')).toBeLessThan(xml.indexOf('older'));
	});

	it('caps the feed at FEED_SIZE items', () => {
		const records = Array.from({ length: FEED_SIZE + 25 }, (_, i) =>
			record({ instance_id: `inst-${i}` })
		);
		const xml = buildRecordsFeed({ records, origin });
		expect((xml.match(/<item>/g) || []).length).toBe(FEED_SIZE);
	});

	it('escapes XML special characters that appear in titles', () => {
		// network_region flows into the title untouched, so an ampersand there must escape.
		const xml = buildRecordsFeed({ records: [record({ network_region: 'A & B' })], origin });
		expect(xml).toContain('(A &amp; B)');
		expect(xml).not.toContain('(A & B)');
	});

	it('produces valid pubDates, never Invalid Date', () => {
		const xml = buildRecordsFeed({
			records: [record({ interval: '2025-06-08T14:30:00Z' })],
			origin
		});
		expect(xml).toContain('<pubDate>Sun, 08 Jun 2025 04:30:00 GMT</pubDate>');
		expect(xml).not.toContain('Invalid Date');
	});
});
