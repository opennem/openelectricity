import type { FuelTechCode } from './fuel_tech.types';

export type Slug = {
	current: string;
};
export type Author = {
	image: any;
	name: string;
	position: string;
};
export type Tag = {
	title: string;
	slug: Slug;
};

export type Article = {
	_id: string;
	title: string;
	content: any;
	slug: Slug;
	publish_date: string;
	cover: any;
	article_type: string;
	region: string;
	fueltech: FuelTechCode;
	summary: string;
	author: Author[];
	tags: Tag[];
};
