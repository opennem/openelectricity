/** @type {Record<string, {label: string, intervals?: string[]}>} */
export const rangeIntervalMap = {
	'7d': {
		label: '7d',
		intervals: ['5m', '30m']
	}
	// monthly: {
	// 	label: 'Monthly',
	// 	intervals: ['1M', '1Q', '6M', '1Y']
	// },
	// '12-month-rolling': {
	// 	label: '12 mth rolling',
	// 	intervals: ['1M', '1Q', '6M']
	// },
	// yearly: {
	// 	label: 'Yearly'
	// }
};
