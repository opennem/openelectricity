import { interpolate } from 'd3-interpolate';

// function to interpolate data from 30 to 5 minute interval
export default function (dataArray, original, target) {
	const ratio = original / target;
	const interpolatedData = [];
	for (let i = 0; i < dataArray.length; i++) {
		if (i === dataArray.length - 1) {
			interpolatedData.push(dataArray[i]);
		} else {
			const interpolator = interpolate(dataArray[i], dataArray[i + 1]);
			for (let j = 0; j < ratio; j++) {
				interpolatedData.push(interpolator(j / ratio));
			}
		}
	}
	return interpolatedData;
}
