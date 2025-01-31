export type Period = 'interval' | 'day' | '7d' | 'month' | 'quarter' | 'year';
export type ChartOptions = {
	title: string;
	prefix: string;
	displayPrefix: string;
	allowedPrefixes: string[];
	baseUnit: string;
};
