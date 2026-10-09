import { OpenElectricityClient } from 'openelectricity';
import { PUBLIC_OE_API_KEY, PUBLIC_OE_API_URL } from '$env/static/public';

/**
 * The one OpenElectricity v4 API client for server code. Every OE-backed route,
 * loader and helper imports this rather than constructing its own, so the key,
 * base URL and client version are configured in a single place. Server-only
 * (`$lib/server`): the client carries the API key.
 */
export const oeClient = new OpenElectricityClient({
	apiKey: PUBLIC_OE_API_KEY,
	baseUrl: PUBLIC_OE_API_URL
});
