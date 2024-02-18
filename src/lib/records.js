import { addMinutes, format, subMinutes } from 'date-fns';
import { formatInTimeZone, utcToZonedTime } from 'date-fns-tz';

import { v4 as uuidv4 } from 'uuid';
import { regionFilters } from './filters';
import { fuelTechNameMap } from './fuel_techs';

/** @typedef {import('$lib/types/record.types').Record} Record */
/** @typedef {import('$lib/types/record.types').DailyRecords} DailyRecords */

export const recordDescription = (/** @type {Record} */ record) => {
	const regionLabel = regionFilters[record.network_region || record.network]?.label;
	const typeLabel = record.record_type === 'high' ? 'Highest' : 'Lowest';
	const fueltechLabel = fuelTechNameMap[record.fueltech];
	const activity = 'generation';
	const period = 'of all time';

	return `${typeLabel} ${fueltechLabel} ${activity} in ${regionLabel} ${period}`;
};

export const intervalDate = (/** @type {string} */ interval) => {
	const date = new Date(interval);
	const offset = date.getTimezoneOffset();
	return Math.sign(offset) !== -1 ? addMinutes(date, offset) : subMinutes(date, Math.abs(offset));
};

export const formatRecordInterval = (
	/** @type {string} */ interval,
	/** @type {string} */ formatString
) => {
	const parts = interval.split('+');

	if (parts.length > 1) {
		return formatInTimeZone(Date.parse(interval), `+${parts.pop()}`, formatString);
	}

	return format(Date.parse(interval), formatString);
};

/**
 * Takes an array of records and sorts them into days,
 * and groups together commom record types within the days
 * @param {Record[]} records
 * @returns {Record[][][]}
 */
export const recordsByDay = (records) => {
	// Bin each record into days
	/** @type {DailyRecords} */
	const days = {};
	records.forEach((record) => {
		const day = formatRecordInterval(record.interval, 'yyyy-MM-dd');

		// create a bin for the day if there isn't one
		if (!days[day]) {
			days[day] = {};
		}

		// create a bin in the current day for the record type if there isn't one
		if (!days[day][record.record_id]) {
			days[day][record.record_id] = [];
		}

		days[day][record.record_id].push(record);
	});

	// Sort for most recent day first
	const ordered = Object.keys(days)
		.sort((a, b) => {
			return Date.parse(b) - Date.parse(a);
		})
		.reduce(
			(/** @type {Record[][][]} */ obj, key) => {
				// Sort the record types within the day so the record type with the most recent activity is at the top
				const orderedDay = Object.keys(days[key])
					.sort((a, b) => {
						return Date.parse(days[key][b][0].interval) - Date.parse(days[key][a][0].interval);
					})
					.map((orderedRecordId) =>
						// Sort the records within each unique type into order so newest is first
						days[key][orderedRecordId]
							.sort((a, b) => Date.parse(b.interval) - Date.parse(a.interval))
							.slice(0, 3)
					);

				obj.push(orderedDay);
				return obj;
			},
			/** @type {Record[][][]} */ []
		);

	return ordered;
};

/**
 * Sample record templates for generating mock record data
 */
const sampleRecordTemplates = [
	(/** @type {string} */ time, /** @type {string} */ region) => ({
		instance_id: uuidv4(),
		record_id: 'r01',
		time,
		value: Math.round(23000 + Math.random() * 1000),
		unit: 'MW',
		country: 'AU',
		network: 'NEM',
		region,
		fuel_tech: 'solar',
		type: 'peak',
		description: `Highest total solar generation in ${region} of all time`,
		significance: 3 + Math.round(Math.random() * 7)
	}),
	(/** @type {string} */ time, /** @type {string} */ region) => ({
		instance_id: uuidv4(),
		record_id: 'r02',
		time,
		value: Math.round(23000 + Math.random() * 1000),
		unit: 'MW',
		country: 'AU',
		network: 'NEM',
		region: 'All',
		fuel_tech: 'solar',
		type: 'peak',
		description: 'Highest total solar generation of all time',
		significance: 3 + Math.round(Math.random() * 7)
	}),
	(/** @type {string} */ time, /** @type {string} */ region) => ({
		instance_id: uuidv4(),
		record_id: 'r03',
		time,
		value: Math.round(140 + Math.random() * 100),
		unit: '$',
		country: 'AU',
		network: 'NEM',
		region,
		fuel_tech: 'gas',
		type: 'peak',
		description: `Highest total gas price in ${region}`,
		significance: 3 + Math.round(Math.random() * 7)
	}),
	(/** @type {string} */ time, /** @type {string} */ region) => ({
		instance_id: uuidv4(),
		record_id: 'r04',
		time,
		value: Math.round(100 + Math.random() * 30),
		unit: 'MW',
		country: 'AU',
		network: 'NEM',
		region,
		fuel_tech: 'wind',
		type: 'peak',
		description: `Highest total wind generation of all time in ${region}`,
		significance: 3 + Math.round(Math.random() * 7)
	}),
	(/** @type {string} */ time, /** @type {string} */ region) => ({
		instance_id: uuidv4(),
		record_id: 'r05',
		time,
		value: Math.round(8000 + Math.random() * 1000),
		unit: 'MW',
		country: 'AU',
		network: 'NEM',
		region,
		fuel_tech: 'coal',
		type: 'low',
		description: `Lowest coal capacity in ${region}`,
		significance: 3 + Math.round(Math.random() * 7)
	})
];

export const generator = () => {
	const regions = ['VIC', 'TAS', 'NSW', 'QLD', 'SA'];
	const now = new Date();
	const days = 3 + Math.round(Math.random() * 10);
	const records = [];

	for (let d = 0; d < days; d++) {
		// records per day
		const rpd = 10 + Math.round(Math.random() * 10);

		for (let r = 0; r < rpd; r++) {
			// records per type
			const rpt = 1 + Math.floor(Math.random() * 5);

			const recordGenerator =
				sampleRecordTemplates[Math.floor(Math.random() * sampleRecordTemplates.length)];
			const rr = regions[Math.floor(Math.random() * regions.length)];

			for (let t = 0; t < rpt; t++) {
				const randHour = ('0' + Math.floor(Math.random() * 24)).slice(-2);
				const randMin = ('0' + Math.floor(Math.random() * 12) * 5).slice(-2);
				const ts = format(now, `yyyy-MM-dd'T'${randHour}:${randMin}:00+11:00`);
				records.push(recordGenerator(ts, rr));
			}
		}

		now.setDate(now.getDate() - 1);
	}

	return records;
};
