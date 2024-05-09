/**
 *
 * @param {{ start: Date, last: Date, incrementer: Function | undefined, incrementValue: number }} param0
 * @returns {TimeSeriesData[]}
 */
export default function ({ start, last, incrementer, incrementValue }) {
	const bucket = [];
	let currentTime = start.getTime();
	let lastTime = last.getTime();

	// time bucket
	while (currentTime <= lastTime) {
		if (incrementer) {
			bucket.push({
				time: currentTime,
				date: new Date(currentTime)
			});
			currentTime = incrementer(currentTime, incrementValue).getTime();
		}
	}

	return bucket;
}
