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

export async function load({ params, url, fetch }) {
	let { searchParams } = url;
	let focusTimeStr = searchParams.get('focusTime') || '';

	let focusTime = parseInt(focusTimeStr);
	let id = params.id;

	if (id) {
		let res = await fetch(`/api/records/${id}?pageSize=1`);
		let jsonData = await res.json();

		let trackerRes;
		let trackerData;
		let timeSeries;
		let timeZone;
		let period = 'interval';
		let fuelTechId;
		let metric;
		let focusRecord;

		// console.log('jsonData', jsonData);
		if (jsonData.data.length > 0) {
			let firstRecord = jsonData.data[0];
			if (!focusTimeStr || focusTimeStr === 'null') {
				focusTime = new Date(firstRecord.interval).getTime();
			}

			let oePath = getOEPath(firstRecord, focusTime);

			timeZone = firstRecord.network_id === 'WEM' ? '+08:00' : '+10:00';

			period = firstRecord.period;
			fuelTechId = firstRecord.fueltech_id;
			metric = firstRecord.metric;

			if (oePath) {
				trackerRes = await fetch(oePath);
				trackerData = await trackerRes.json();

				let data = trackerData.data;
				let results = data[0].results;
				let result = results[0];

				if (fuelTechId && result) {
					if (fuelTechId === 'fossils') {
						result = results.find((/** @type {any} */ d) => !d.columns.renewable);
					} else if (fuelTechId === 'renewables') {
						result = results.find((/** @type {any} */ d) => d.columns.renewable);
					}
				}

				// convert result to a time series
				timeSeries = result.data.map((/** @type {any} */ d) => {
					let date = new Date(d[0]);
					return {
						dateStr: d[0],
						date,
						time: date.getTime(),
						value: d[1]
					};
				});

				focusRecord = timeSeries.find((/** @type {any} */ d) => d.time === focusTime);
			}
		}

		// Map renewable_proportion to renewables for icon/color display
		let displayFuelTechId = metric === 'renewable_proportion' ? 'renewables' : fuelTechId;

		return {
			focusTime,
			record: jsonData.data[0],
			timeSeries,
			timeZone,
			period,
			fuelTechId: displayFuelTechId,
			metric,
			focusRecord
		};
	} else {
		error(404, {
			message: 'Record ID not found.'
		});
	}
}
