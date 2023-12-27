import { error } from '@sveltejs/kit';
import { Base64 } from 'js-base64';
import {
	GOOGLE_APPLICATION_CREDENTIALS_JSON,
	GOOGLE_SHEET_ID,
	GOOGLE_SHEET_TAB_ID
} from '$env/static/private';

// Explaination of this method here:
// https://hookdeck.com/blog/post/how-to-call-google-cloud-apis-from-cloudflare-workers
export async function POST({ fetch, request }) {
	const serviceAccount = JSON.parse(GOOGLE_APPLICATION_CREDENTIALS_JSON || '');
	const pem = serviceAccount.private_key.replace(/\n/g, '');
	const pemHeader = '-----BEGIN PRIVATE KEY-----';
	const pemFooter = '-----END PRIVATE KEY-----';

	const { email } = await request.json();

	if (!pem.startsWith(pemHeader) || !pem.endsWith(pemFooter)) {
		throw new Error('Invalid service account private key');
	}

	const pemContents = pem.substring(pemHeader.length, pem.length - pemFooter.length);
	const buffer = Base64.toUint8Array(pemContents);

	const algorithm = {
		name: 'RSASSA-PKCS1-v1_5',
		hash: {
			name: 'SHA-256'
		}
	};

	const extractable = false;

	/** @type {KeyUsage[]} */
	const keyUsages = ['sign'];

	const privateKey = await crypto.subtle.importKey(
		'pkcs8',
		buffer,
		algorithm,
		extractable,
		keyUsages
	);

	const header = Base64.encodeURI(
		JSON.stringify({
			alg: 'RS256',
			typ: 'JWT',
			kid: serviceAccount.private_key_id
		})
	);

	const iat = Math.floor(Date.now() / 1000);
	const exp = iat + 3600;

	const payload = Base64.encodeURI(
		JSON.stringify({
			iss: serviceAccount.client_email,
			sub: serviceAccount.client_email,
			aud: 'https://sheets.googleapis.com/',
			exp,
			iat
		})
	);

	const textEncoder = new TextEncoder();
	const inputArrayBuffer = textEncoder.encode(`${header}.${payload}`);

	const outputArrayBuffer = await crypto.subtle.sign(
		{ name: 'RSASSA-PKCS1-v1_5' },
		privateKey,
		inputArrayBuffer
	);

	const signature = Base64.fromUint8Array(new Uint8Array(outputArrayBuffer), true);

	const token = `${header}.${payload}.${signature}`;

	const data = {
		values: [[email, 'website']]
	};

	const response = await fetch(
		`https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEET_ID}/values/${GOOGLE_SHEET_TAB_ID}!A:A:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
		{
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`
			},
			body: JSON.stringify(data)
		}
	);

	if (response.ok) {
		const res = Response.json({ success: true, rowsInserted: data.values.length });
		return res;
	}

	throw error(404, 'Not found');
}
