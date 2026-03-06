export type TimeSeriesData = {
	time: number;
	date: Date;
	_max?: number;
	_min?: number;
	[key: string]: number | string | Date | null | undefined;
};

export type CategoryData = {
	category: string;
	_index: number;
	[key: string]: number | string | null | undefined;
};

export type ChartData = TimeSeriesData | CategoryData;

export type TimeSeriesGroupData = {
	time: number;
	date: Date;
	group: string;
	value: number | string;
};

export type TimeSeriesInstance = {
	data: TimeSeriesData[];
	maxY: number;
	minY: number;
	seriesColours: { [key: string]: string };
	seriesLabels: { [key: string]: string };
	seriesNames: string[];
	statsInterval: StatsInterval;
	statsDatasets: StatsData[];
	statsType: string;
};
