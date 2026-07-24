/**
 * Shell spike — fullscreen by default (matches /facilities): the root (main)
 * layout hides the global Nav/Footer chrome unless the URL opts out with
 * `?fullscreen=false`. Applies to every child route sharing the persistent map.
 */
export function load() {
	return { fullscreen: true };
}
