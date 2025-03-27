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
 * @param {string | null} focusDateTime
 */
function getOEPath(record, focusDateTime) {
	if (!record) return null;
	let focusOn = focusDateTime ? new Date(focusDateTime) : record.date || new Date();
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

export async function load({ params, url, fetch }) {
	const { searchParams } = url;
	const focusDateTime = searchParams.get('focusDateTime');

	let id = params.id;

	if (id) {
		const res = await fetch(`/api/records/${id}?pageSize=1`);
		const jsonData = await res.json();

		let trackerRes;
		let trackerData;
		let timeZone;
		let period = 'interval';
		let fuelTechId;
		let metric;

		// console.log('jsonData', jsonData);
		if (jsonData.data.length > 0) {
			let firstRecord = jsonData.data[0];
			let oePath = getOEPath(firstRecord, focusDateTime);

			timeZone = firstRecord.network_id === 'WEM' ? '+08:00' : '+10:00';

			period = firstRecord.period;
			fuelTechId = firstRecord.fueltech_id;
			metric = firstRecord.metric;

			console.log('oePath', oePath);

			if (oePath) {
				trackerRes = await fetch(oePath);
				trackerData = await trackerRes.json();
				console.log('trackerData', trackerData);
			}
		}

		return {
			focusDateTime,
			record: jsonData.data[0],
			trackerData,
			timeZone,
			period,
			fuelTechId,
			metric
		};
	} else {
		error(404, {
			message: 'Record ID not found.'
		});
	}
}
