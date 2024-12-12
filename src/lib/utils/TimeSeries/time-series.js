/**
 * Note: this will mutate the bucket array
 * @param {{ bucket: TimeSeriesData[], dataset: { [key: string]: any }[], dataProp: string}} param0
 * @returns {TimeSeriesData[]}
 */
export default function ({ bucket, dataset, dataProp }) {
	dataset.forEach((ds) => {
		const id = ds.id;
		const data = ds[dataProp].data;

		if (!data) return bucket;
		data.forEach(
			/**
			 * @param {number | Date | undefined} d
			 * @param {number} i
			 */
			(d, i) => {
				bucket[i][id] = d;
			}
		);
	});

	return bucket;
}
