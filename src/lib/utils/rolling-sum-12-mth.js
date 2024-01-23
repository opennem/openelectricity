import { addMonths, subMonths, isAfter } from 'date-fns';
import PerfTime from './perf-time.js';

const perfTime = new PerfTime();

export default function (data, keys) {
	perfTime.time();

	const cloneData = data.map((d) => {
		return {
			...d,
			date: new Date(d.date)
		};
	});

	for (let x = cloneData.length - 1; x >= 0; x--) {
		const d = cloneData[x];
		const last = subMonths(cloneData[x].date, 12);

		keys.forEach((k) => {
			const id = k;
			let sum = d[id] || 0;
			let index = x - 1;
			let hasNulls = false;

			if (index >= 0) {
				while (isAfter(cloneData[index].date, last)) {
					if (!cloneData[index][id] && cloneData[index][id] !== 0) {
						hasNulls = true;
					}

					sum += cloneData[index][id] || 0;

					index--;

					if (index < 0) {
						break;
					}
				}
			}

			cloneData[x][id] = hasNulls ? null : sum;
		});
	}

	// filter out incomplete rolling sums
	const firstDate = cloneData[0].date;
	const firstAvailable = addMonths(firstDate, 12);
	const updated = cloneData.filter((d) => isAfter(d.date, firstAvailable));

	perfTime.timeEnd('--- data.12month-rolling-sum');

	return updated;
}
