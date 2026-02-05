// Usage: import { whichBrowser, isSafari } from 'lib/utils/browser-detect';
// Description: Use this inside `onMount` to detect the browser and do something based on the browser type.

function whichBrowser() {
	if (isFirefox()) {
		return 'Firefox';
	} else if (isEdge()) {
		return 'Edge';
	} else if (isIE()) {
		return 'Internet Explorer';
	} else if (isOpera()) {
		return 'Opera';
	} else if (isVivaldi()) {
		return 'Vivalid';
	} else if (isChrome()) {
		return 'Chrome';
	} else if (isSafari()) {
		return 'Safari';
	} else {
		return 'Unknown';
	}
}

/** @param {string} keyword */
function agentHas(keyword) {
	return navigator.userAgent.toLowerCase().search(keyword.toLowerCase()) > -1;
}

function isIE() {
	return !!(/** @type {any} */ (document).documentMode);
}

function isSafari() {
	return (
		(!!(/** @type {any} */ (window).ApplePaySetupFeature) || !!(/** @type {any} */ (window).safari)) &&
		agentHas('Safari') &&
		!agentHas('Chrome') &&
		!agentHas('CriOS')
	);
}

function isChrome() {
	return agentHas('CriOS') || agentHas('Chrome') || !!(/** @type {any} */ (window).chrome);
}

function isFirefox() {
	return agentHas('Firefox') || agentHas('FxiOS') || agentHas('Focus');
}

function isEdge() {
	return agentHas('Edg');
}

function isOpera() {
	return agentHas('OPR');
}

function isVivaldi() {
	return agentHas('Vivaldi');
}

export { whichBrowser, isSafari };
