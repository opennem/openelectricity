export type ProcessedDataViz = {
	seriesData: TimeSeriesData[];
	seriesNames: string[];
	seriesColours: { [key: string]: string };
	seriesLabels: { [key: string]: string };
	nameOptions: { label: string; value: string }[];
	yDomain: Array<number | null>;
	seriesLoadsIds?: string[];
	chartType?: 'area' | 'line';
	prefix?: SiPrefix;
	displayPrefix?: SiPrefix;
	baseUnit?: string;
	allowedPrefixes?: SiPrefix[];
};
