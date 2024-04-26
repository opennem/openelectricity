import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import DMSans from '$lib/fonts/DMSans-VariableFont_opsz,wght.ttf';
import SpaceGrotesk from '$lib/fonts/SpaceGrotesk-VariableFont_wght.ttf';
import NotoSans from '$lib/fonts/NotoSans-Regular.ttf';
import { read } from '$app/server';

const font1Data = read(NotoSans).arrayBuffer();
// const font2Data = read(SpaceGrotesk).arrayBuffer();

const width = 1200;
const height = 630;

/** @type {import('./$types').RequestHandler} */
export const GET = async () => {
	const html = {
		type: 'div',
		props: {
			children: 'hello world',
			style: { color: 'red' }
		}
	};

	const svg = await satori(html, {
		fonts: [
			{
				name: 'Noto Sans',
				data: await font1Data,
				style: 'normal'
			}
		],
		width,
		height
	});

	const resvg = new Resvg(svg, {
		fitTo: {
			mode: 'width',
			value: width
		}
	});

	const image = resvg.render();

	return new Response(image.asPng(), {
		headers: {
			'content-type': 'image/png'
		}
	});
};
