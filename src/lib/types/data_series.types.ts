export type DataSeries = {
	start: string;
	last: string;
	interval: string;
	data: (number | Float64Array | null | undefined)[];
};
