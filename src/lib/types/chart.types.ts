export type TimeSeriesData = {
	time: number;
	date: Date;
	_max?: number;
	_min?: number;
	[key: string]: number | Date | undefined;
};
