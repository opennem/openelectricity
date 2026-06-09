import { parseISO } from 'date-fns';
import { stripDateTimezone } from '$lib/utils/date-format.js';
import generateDescription from '../page-data-options/record-description.js';
import { formatRecordValue } from '../page-data-options/formatters.js';
import { networkRegionsOnly } from '../page-data-options/filters.js';

const FEED_SIZE = 100;

/** @type {Record<string, string>} */
const XML_ENTITIES = { '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' };

/**
 * Escape a string for safe inclusion in XML text/attribute content.
 * @param {string} str
 */
function escapeXml(str) {
	return str.replace(/[<>&'"]/g, (c) => XML_ENTITIES[c]);
}

/**
 * The OE API returns interval timestamps in the network's local time with no
 * timezone suffix. Re-apply the network offset so the feed publishes correct
 * UTC pubDates (matches the page's NEM +10:00 / WEM +08:00 handling).
 * @param {string} interval
 * @param {string} networkId
 */
function intervalToDate(interval, networkId) {
	const offset = networkId === 'WEM' ? '+08:00' : '+10:00';
	// The API is inconsistent — some intervals already carry a `Z`/`+HH:MM`
	// suffix. Strip it before re-applying the network offset.
	return new Date(`${stripDateTimezone(interval)}${offset}`);
}

/**
 * Build a one-line human title for a record, e.g.
 * "Highest wind generation over a day: 4,210 MW (NSW1)".
 * @param {import('$lib/types/record.types').MilestoneRecord} record
 */
function recordTitle(record) {
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

export async function GET({ fetch, url, setHeaders }) {
	// Mirror the /records page: one call for network-wide (NEM/WEM) records and
	// one for per-region records, since the API can't return both at once.
	const [networkRes, regionRes] = await Promise.all([
		fetch(`/api/records?page=1&pageSize=${FEED_SIZE}`),
		fetch(`/api/records?page=1&pageSize=${FEED_SIZE}&regions=${networkRegionsOnly.join(',')}`)
	]);

	const networkJson = networkRes.ok ? await networkRes.json() : { data: [] };
	const regionJson = regionRes.ok ? await regionRes.json() : { data: [] };

	/** @type {import('$lib/types/record.types').MilestoneRecord[]} */
	const rawRecords = [...(networkJson.data || []), ...(regionJson.data || [])];

	const records = rawRecords
		// renewable_proportion isn't yet supported by the OE API — hidden in the UI too.
		.filter((d) => d.metric !== 'renewable_proportion')
		.map((d) => ({
			...d,
			// `date` (parseISO, no offset) mirrors the /records page for sort order and
			// the deep-link `focus` time; `pubDate` carries the correct network offset.
			date: parseISO(d.interval ?? ''),
			pubDate: intervalToDate(d.interval ?? '', d.network_id).toUTCString()
		}))
		.sort((a, b) => b.date.getTime() - a.date.getTime())
		.slice(0, FEED_SIZE);

	const feedUrl = `${url.origin}/records/rss.xml`;
	const lastBuildDate = (records[0]?.date ?? new Date(0)).toUTCString();

	const items = records
		.map((record) => {
			const link = `${url.origin}/records/${encodeURIComponent(record.record_id)}?focus=${record.date.getTime()}`;
			const guid = record.instance_id || `${record.record_id}-${record.date.getTime()}`;
			return `		<item>
			<title>${escapeXml(recordTitle(record))}</title>
			<link>${escapeXml(link)}</link>
			<guid isPermaLink="false">${escapeXml(guid)}</guid>
			<pubDate>${record.pubDate}</pubDate>
		</item>`;
		})
		.join('\n');

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
	<channel>
		<title>OpenElectricity — Latest Records</title>
		<link>${url.origin}/records</link>
		<description>The ${FEED_SIZE} most recent electricity records for the Australian grid.</description>
		<language>en-au</language>
		<lastBuildDate>${lastBuildDate}</lastBuildDate>
		<atom:link href="${feedUrl}" rel="self" type="application/rss+xml" />
${items}
	</channel>
</rss>`;

	setHeaders({
		'content-type': 'application/rss+xml; charset=utf-8',
		'cache-control': 'public, max-age=300'
	});

	return new Response(xml);
}
