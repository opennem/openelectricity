export type TimeSeriesData = {
	time: number;
	date: Date;
	_max?: number;
	_min?: number;
	[key: string]: number | Date | undefined;
};

export type TimeSeriesGroupData = {
	time: number;
	date: Date;
	group: string;
	value: number | string;
};
