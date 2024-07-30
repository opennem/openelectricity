export type ProcessedDataViz = {
	seriesData: TimeSeriesData[];
	seriesNames: string[];
	seriesColours: { [key: string]: string };
	seriesLabels: { [key: string]: string };
	nameOptions: { label: string; value: string }[];
	yDomain: number[];
	seriesLoadsIds?: string[];
	chartType?: 'area' | 'line';
};
