import { error } from '@sveltejs/kit';
import { addDays, addMonths, addYears, subDays, subMonths, subYears } from 'date-fns';
import { plainDateTime } from '$lib/utils/date-parser';
import { apiIntervalMap } from '../../../(main)/records/[id]/MiniTracker/helpers/config';

/**
 * @param {Date} date
 * @param {string} period
 */
function getDateRange(date, period) {
	if (period === 'day') {
		let dateStart = subDays(date, 48);
		let dateEnd = addDays(date, 16);
		return { dateStart, dateEnd, withTime: false };
	}

	if (period === 'month') {
		let dateStart = subMonths(date, 36);
		let dateEnd = addMonths(date, 12);
		return { dateStart, dateEnd, withTime: false };
	}

	if (period === 'quarter') {
		let dateStart = subMonths(date, 60);
		let dateEnd = addMonths(date, 24);
		return { dateStart, dateEnd, withTime: false };
	}

	if (period === 'year') {
		let dateStart = subYears(date, 15);
		let dateEnd = addYears(date, 5);
		return { dateStart, dateEnd, withTime: false };
	}

	let dateStart = subDays(date, 5);
	let dateEnd = addDays(date, 2);
	return { dateStart, dateEnd, withTime: true };
}

/**
 * @param {MilestoneRecord} record
 * @param {number | null} focusTime
 */
function getOEPath(record, focusTime) {
	if (!record) return null;
	let focusOn = focusTime ? new Date(focusTime) : record.date || new Date();
	let apiInterval = apiIntervalMap[record.period];
	let isIntervalPeriod = record.period === 'interval';
	let isWem = record.network_id === 'WEM';
	let timeZone = isWem ? '+08:00' : '+10:00';
	let isNetworkRegion = record.network_region;
	let fuelTechId = record.fueltech_id;
	let primaryGrouping = isNetworkRegion ? 'network_region' : 'network';
	let isDemand = fuelTechId === 'demand';
	let demandMetric = isIntervalPeriod ? 'demand' : 'demand_energy';
	let isFossilsOrRenewables = fuelTechId === 'fossils' || fuelTechId === 'renewables';
	let secondaryGroupingStr = fuelTechId
		? isFossilsOrRenewables
			? 'renewable'
			: 'fueltech_group'
		: undefined;

	let { dateStart, dateEnd, withTime } = getDateRange(focusOn, record.period);
	let dateStartFormatted = plainDateTime(dateStart, timeZone, withTime);
	let dateEndFormatted = plainDateTime(dateEnd, timeZone, withTime);

	let oePath = `/api/openelectricity?dataType=${isDemand ? 'market' : 'network'}&networkId=${record.network_id}&metric=${isDemand ? demandMetric : record.metric}&interval=${apiInterval}&dateStart=${dateStartFormatted}&dateEnd=${dateEndFormatted}&primaryGrouping=${primaryGrouping}`;

	if (secondaryGroupingStr) {
		oePath += `&secondaryGrouping=${secondaryGroupingStr}`;
	}

	if (fuelTechId && !isFossilsOrRenewables) {
		oePath += `&fueltechGroup=${fuelTechId}`;
	}

	if (isNetworkRegion) {
		oePath += `&networkRegion=${record.network_region}`;
	}

	return oePath;
}

/**
 * Fetch the tracker data around focusTime and convert it to a time series.
 * Returns undefined if the data is unavailable rather than throwing.
 * @param {typeof globalThis.fetch} fetch
 * @param {MilestoneRecord} record
 * @param {number} focusTime
 */
async function getTimeSeries(fetch, record, focusTime) {
	let oePath = getOEPath(record, focusTime);
	if (!oePath) return undefined;

	let trackerRes = await fetch(oePath);
	if (!trackerRes.ok) return undefined;

	let trackerData = await trackerRes.json();
	let results = trackerData.data?.[0]?.results;
	let result = results?.[0];
	let fuelTechId = record.fueltech_id;

	if (fuelTechId && result) {
		if (fuelTechId === 'fossils') {
			result = results.find((/** @type {any} */ d) => !d.columns.renewable);
		} else if (fuelTechId === 'renewables') {
			result = results.find((/** @type {any} */ d) => d.columns.renewable);
		}
	}

	if (!result?.data) return undefined;

	// convert result to a time series
	return result.data.map((/** @type {any} */ d) => {
		let date = new Date(d[0]);
		return {
			dateStr: d[0],
			date,
			time: date.getTime(),
			value: d[1]
		};
	});
}

export async function load({ params, url, fetch }) {
	let { searchParams } = url;
	let focusTimeStr = searchParams.get('focusTime') || '';

	let focusTime = parseInt(focusTimeStr);
	let id = params.id;

	if (!id) {
		error(404, {
			message: 'Record ID not found.'
		});
	}

	let res = await fetch(`/api/records/${id}?pageSize=1`);
	if (!res.ok) {
		error(502, {
			message: 'Unable to fetch record.'
		});
	}

	let jsonData = await res.json();
	if (!jsonData.data || jsonData.data.length === 0) {
		error(404, {
			message: 'Record not found.'
		});
	}

	let firstRecord = jsonData.data[0];
	let latestRecordTime = new Date(firstRecord.interval).getTime();

	if (!focusTimeStr || focusTimeStr === 'null' || isNaN(focusTime)) {
		focusTime = latestRecordTime;
	}

	let timeZone = firstRecord.network_id === 'WEM' ? '+08:00' : '+10:00';
	let period = firstRecord.period;
	let fuelTechId = firstRecord.fueltech_id;
	let metric = firstRecord.metric;

	let timeSeries = await getTimeSeries(fetch, firstRecord, focusTime);
	let focusRecord = timeSeries?.find((/** @type {any} */ d) => d.time === focusTime);

	// focusTime may not match any data point (e.g. revised data or a stale link) —
	// fall back to the latest record date so the page still renders
	if (!focusRecord && focusTime !== latestRecordTime) {
		focusTime = latestRecordTime;
		timeSeries = await getTimeSeries(fetch, firstRecord, focusTime);
		focusRecord = timeSeries?.find((/** @type {any} */ d) => d.time === focusTime);
	}

	// Map renewable_proportion to renewables for icon/color display
	let displayFuelTechId = metric === 'renewable_proportion' ? 'renewables' : fuelTechId;

	return {
		focusTime,
		record: firstRecord,
		timeSeries,
		timeZone,
		period,
		fuelTechId: displayFuelTechId,
		metric,
		focusRecord
	};
}
