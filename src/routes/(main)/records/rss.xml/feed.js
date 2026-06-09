import { parseISO } from 'date-fns';
import { stripDateTimezone } from '$lib/utils/date-format.js';
import generateDescription from '../page-data-options/record-description.js';
import { formatRecordValue } from '../page-data-options/formatters.js';

/** @typedef {import('$lib/types/record.types').MilestoneRecord} MilestoneRecord */

/** Number of records the feed exposes (also the API page size). */
export const FEED_SIZE = 100;

/** @type {Record<string, string>} */
const XML_ENTITIES = { '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' };

/**
 * Escape a string for safe inclusion in XML text/attribute content.
 * @param {string} str
 */
export function escapeXml(str) {
	return str.replace(/[<>&'"]/g, (c) => XML_ENTITIES[c]);
}

/**
 * The OE API returns interval timestamps in the network's local time, but the
 * suffix is inconsistent — some carry a `Z`, some a `+HH:MM`, some nothing.
 * Strip whatever is there, then re-apply the network offset (NEM +10:00 /
 * WEM +08:00) so the feed publishes a correct, unambiguous UTC pubDate.
 * @param {string} interval
 * @param {string} networkId
 */
export function intervalToDate(interval, networkId) {
	const offset = networkId === 'WEM' ? '+08:00' : '+10:00';
	return new Date(`${stripDateTimezone(interval)}${offset}`);
}

/**
 * Build a one-line human title for a record, e.g.
 * "Highest wind generation over a day: 4,210 MW (NSW1)".
 * @param {MilestoneRecord} record
 */
export function recordTitle(record) {
	const description =
		generateDescription(record.period, record.aggregate, record.metric, record.fueltech_id) ||
		record.record_id;
	const region = record.network_region || record.network_id;
	const value =
		record.value === null || record.value === undefined
			? ''
			: `: ${formatRecordValue(record.value, /** @type {*} */ (record.fueltech_id))}${
					record.value_unit ? ` ${record.value_unit}` : ''
				}`;
	return `${description}${value} (${region})`;
}

/**
 * Turn the merged raw records into a complete RSS 2.0 document: filter
 * unsupported metrics, sort newest-first, cap at FEED_SIZE, and serialise.
 * @param {object} params
 * @param {MilestoneRecord[]} params.records - merged records from /api/records
 * @param {string} params.origin - request origin, for absolute item URLs
 * @returns {string} RSS 2.0 XML
 */
export function buildRecordsFeed({ records, origin }) {
	const processed = records
		// renewable_proportion isn't yet supported by the OE API — hidden in the UI too.
		.filter((d) => d.metric !== 'renewable_proportion')
		.map((d) => ({
			...d,
			// `date` (parseISO, no offset) mirrors the /records page for sort order
			// and the deep-link `focus` time; `pubDate` carries the network offset.
			date: parseISO(d.interval ?? ''),
			pubDate: intervalToDate(d.interval ?? '', d.network_id).toUTCString()
		}))
		.sort((a, b) => b.date.getTime() - a.date.getTime())
		.slice(0, FEED_SIZE);

	const feedUrl = `${origin}/records/rss.xml`;
	const lastBuildDate = (processed[0]?.date ?? new Date(0)).toUTCString();

	const items = processed
		.map((record) => {
			const link = `${origin}/records/${encodeURIComponent(record.record_id)}?focus=${record.date.getTime()}`;
			const guid = record.instance_id || `${record.record_id}-${record.date.getTime()}`;
			return `		<item>
			<title>${escapeXml(recordTitle(record))}</title>
			<link>${escapeXml(link)}</link>
			<guid isPermaLink="false">${escapeXml(guid)}</guid>
			<pubDate>${record.pubDate}</pubDate>
		</item>`;
		})
		.join('\n');

	return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
	<channel>
		<title>OpenElectricity — Latest Records</title>
		<link>${origin}/records</link>
		<description>The ${FEED_SIZE} most recent electricity records for the Australian grid.</description>
		<language>en-au</language>
		<lastBuildDate>${lastBuildDate}</lastBuildDate>
		<atom:link href="${feedUrl}" rel="self" type="application/rss+xml" />
${items}
	</channel>
</rss>`;
}
