import { addMonths, subMonths, isAfter } from 'date-fns';
import PerfTime from './perf-time.js';

const perfTime = new PerfTime();

export default function (data, keys) {
	perfTime.time();
	for (let x = data.length - 1; x >= 0; x--) {
		const d = data[x];
		const last = subMonths(data[x].date, 12);

		keys.forEach((k) => {
			const id = k;
			let sum = d[id] || 0;
			let index = x - 1;
			let count = 1;
			let hasNulls = false;

			if (index >= 0) {
				while (isAfter(data[index].date, last)) {
					if (!data[index][id] && data[index][id] !== 0) {
						hasNulls = true;
					}

					sum += data[index][id] || 0;

					index--;
					count++;

					if (index < 0) {
						break;
					}
				}
			}

			data[x][id] = hasNulls ? null : sum;
		});
	}

	// filter out incomplete rolling sums
	const firstDate = data[0].date;
	const firstAvailable = addMonths(firstDate, 11);
	const updated = data.filter((d) => isAfter(d.date, firstAvailable));

	perfTime.timeEnd('--- data.12month-rolling-sum');

	return updated;
}
