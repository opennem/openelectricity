/**
 * Map dataset values into the time bucket, aligning by date offset rather than
 * raw array index. Each dataset's `start` date is compared to the bucket's start
 * to compute an offset so data lands at the correct time position.
 *
 * Note: this will mutate the bucket array
 * @param {{
 *   bucket: TimeSeriesData[],
 *   dataset: { [key: string]: any }[],
 *   dataProp: string,
 *   bucketStartTime: number,
 *   parseDate: (dateStr: string) => Date,
 *   startOfFn: Function
 * }} param0
 * @returns {TimeSeriesData[]}
 */
export default function ({ bucket, dataset, dataProp, bucketStartTime, parseDate, startOfFn }) {
	dataset.forEach((ds) => {
		const id = ds.id;
		const statsData = ds[dataProp];
		const data = statsData?.data;

		if (!data) return;

		// Calculate the offset: how many bucket positions between the bucket start
		// and this dataset's start date
		let offset = 0;
		if (statsData.start && bucket.length > 0) {
			const dsStartTime = startOfFn(parseDate(statsData.start)).getTime();

			if (dsStartTime > bucketStartTime) {
				offset = bucket.findIndex((b) => b.time >= dsStartTime);
				if (offset === -1) return; // dataset starts after bucket ends
			}
		}

		data.forEach(
			/**
			 * @param {number | Date | undefined} d
			 * @param {number} i
			 */
			(d, i) => {
				const idx = offset + i;
				if (bucket[idx]) bucket[idx][id] = d;
			}
		);
	});

	return bucket;
}
