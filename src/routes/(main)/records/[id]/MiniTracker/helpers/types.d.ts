export type ChartOptions = {
	title: string;
	prefix: string;
	displayPrefix: string;
	allowedPrefixes: string[];
	baseUnit: string;
};

export type Record = {
	metric: string;
	period: Period;
	interval: string;
	fueltech_id: string;
};
